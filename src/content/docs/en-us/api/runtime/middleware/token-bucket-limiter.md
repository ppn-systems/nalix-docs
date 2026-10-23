---
title: Token Bucket Limiter
description: Reference for Nalix.Runtime.Throttling.TokenBucketLimiter — sharded, fixed-point micro-token rate limiter with CPU-adaptive scaling and soft-to-hard lockout escalation.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Throttling`  
**Assembly:** `Nalix.Runtime`

`TokenBucketLimiter` (`[Injectable] public sealed partial class TokenBucketLimiter : IDisposable, IAsyncDisposable, IReportable`) is Nalix's high-precision, sharded token-bucket rate limiter. It powers both global per-endpoint throttling (`Evaluate(INetworkEndpoint)`) and handler-specific policy throttling (`Evaluate(INetworkEndpoint, in RateLimitPolicy)`).

## Source Mapping

- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Cleanup.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Report.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Types.cs`
- `src/Nalix.Runtime/Options/TokenBucketOptions.cs`

## Key Architectural Features

1. **Fixed-Point Micro-Token Arithmetic (`TokenScale`)**: Balances are tracked in integer micro-tokens (`1` whole token = `TokenScale` micro-tokens, default `100`) using `Stopwatch.GetTimestamp()` ticks, avoiding floating-point drift at high packet rates.
2. **Power-of-Two Sharding (`ShardCount = 256`)**: Endpoints are partitioned across `ShardCount` independent shards using an `XxHash32` / Murmur-style bitmask (`hash & (ShardCount - 1)`), eliminating global lock contention.
3. **CPU-Adaptive Refill Scaling (`AdaptiveThrottlingEnabled`)**: When `AdaptiveThrottlingEnabled` is `true` (default) and `ITaskManager` is registered, token refill rates automatically scale by `ITaskManager.ConcurrencyLimitRatio` (`0.0..1.0`) under high server CPU load.
4. **Soft Throttle $\rightarrow$ Hard Lockout Escalation**: When an endpoint exhausts its tokens, each denied request within `SoftViolationWindowSeconds` (`8s`) increments `SoftViolations`. Reaching `MaxSoftViolations` (`5`) locks out the endpoint for `HardLockoutSeconds` (`30s`).
5. **Pooled `EndpointState` & Bounded Cardinality**: `EndpointState` instances are pooled via `ObjectPoolManager.Shared`, capped at `MaxTrackedEndpoints` (`100_000`), and swept periodically by the recurring `"token.bucket"` cleanup job.

## Public API Reference

### Constructors & Static Fields

| Member | Signature | Description |
| :--- | :--- | :--- |
| `RecurringName` | `public static readonly string RecurringName = "token.bucket";` | Base name of the recurring stale-entry cleanup job scheduled in `ITaskManager`. |
| `TokenBucketLimiter()` | `public TokenBucketLimiter()` | Initializes the limiter using `ConfigurationManager.Instance.Get<TokenBucketOptions>()`. |
| `TokenBucketLimiter(TokenBucketOptions?)` | `public TokenBucketLimiter(TokenBucketOptions? options = null)` | Initializes the limiter with explicit `TokenBucketOptions` and validates it. |

### Evaluation & Diagnostics Methods

| Method | Signature | Description |
| :--- | :--- | :--- |
| `Evaluate` (global policy) | `public RateLimitDecision Evaluate(INetworkEndpoint key)` | Consumes `1` token for `key` using the limiter's configured `TokenBucketOptions`. |
| `Evaluate` (dynamic policy) | `public RateLimitDecision Evaluate(INetworkEndpoint key, in RateLimitPolicy policy)` | Consumes `1` token for `key` using a handler-specific `RateLimitPolicy` (used by `PolicyRateLimiter`). |
| `GenerateReport` | `public string GenerateReport()` | Returns a formatted diagnostic summary including `CapacityTokens`, `RefillPerSecond`, `TokenScale`, `Shards`, `TrackedEndpoints`, `PeakTrackedEndpoints`, `HardBlockedCount`, `SoftWarningCount`, and `TotalCleaned`. |
| `WriteReportData` | `public void WriteReportData(Utf8JsonWriter writer)` | Writes structured JSON diagnostic metrics. |
| `Dispose` / `DisposeAsync` | `public void Dispose()` / `public ValueTask DisposeAsync()` | Cancels the recurring cleanup job and marks the limiter disposed (subsequent `Evaluate` calls fail-close with `HardLockout`). |

### Nested Types (`RateLimitDecision`, `RateLimitReason`, `RateLimitPolicy`)

```csharp
public readonly struct RateLimitDecision
{
    public bool Allowed { get; init; }
    public int RetryAfterMs { get; init; }
    public ushort Credit { get; init; }
    public RateLimitReason Reason { get; init; }
}

public enum RateLimitReason : byte
{
    None = 0,
    SoftThrottle = 1,
    HardLockout = 2
}
```

## Usage Example

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Runtime.Options;
using Nalix.Runtime.Throttling;

using TokenBucketLimiter limiter = new(new TokenBucketOptions
{
    CapacityTokens = 64,
    RefillTokensPerSecond = 32.0,
    HardLockoutSeconds = 30,
    MaxSoftViolations = 5
});

TokenBucketLimiter.RateLimitDecision decision = limiter.Evaluate(connection.NetworkEndpoint);
if (!decision.Allowed)
{
    // Deny packet; advise client to retry after decision.RetryAfterMs
}
```

## Related APIs

- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Options](../../options/network/token-bucket-options.md)
- [Middleware Pipeline](./pipeline.md)
- [Connection Guard](../../network/connection/connection-guard.md)
