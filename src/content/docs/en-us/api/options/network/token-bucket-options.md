---
title: Token Bucket Options
description: Reference for Nalix.Runtime.Options.TokenBucketOptions — burst capacity, refill rate, sharding, CPU-adaptive throttling, and soft/hard lockout settings for TokenBucketLimiter.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`TokenBucketOptions` (`public sealed partial class TokenBucketOptions : ConfigurationLoader, IValidatableConfiguration`) configures the sharded, fixed-point micro-token rate limiter [TokenBucketLimiter](../../runtime/middleware/token-bucket-limiter.md) and provides fallback defaults for [PolicyRateLimiter](../../runtime/middleware/policy-rate-limiter.md).

## Source Mapping

- `src/Nalix.Runtime/Options/TokenBucketOptions.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`
- `src/Nalix.Runtime/Throttling/PolicyRateLimiter.cs`

## Properties

Loaded from the `[TokenBucket]` section of `default.ini` via `ConfigurationManager.Instance.Get<TokenBucketOptions>()`:

| Property | Type | Default | Validation | Description |
| :--- | :--- | :---: | :--- | :--- |
| `CapacityTokens` | `int` | `64` | `[ValueRange(1, int.MaxValue)]` | Maximum burst capacity in whole tokens per endpoint. |
| `RefillTokensPerSecond` | `double` | `32.0` | `[ValueRange(0.001, double.MaxValue)]` | Sustained token refill rate per second. |
| `HardLockoutSeconds` | `int` | `30` | `[ValueRange(0, int.MaxValue)]` | Duration in seconds an endpoint is hard-blocked after reaching `MaxSoftViolations` (`0` = disabled). |
| `StaleEntrySeconds` | `int` | `180` | `[ValueRange(1, int.MaxValue)]` | Idle seconds before an endpoint entry becomes eligible for background eviction. |
| `CleanupIntervalSeconds` | `int` | `45` | `[ValueRange(1, int.MaxValue)]` | Interval in seconds for the `"token.bucket"` recurring cleanup job in `ITaskManager`. |
| `TokenScale` | `int` | `100` | `[ValueRange(1, 1_000_000)]` | Fixed-point micro-tokens per whole token (`CapacityTokens * (long)TokenScale` must fit in `long`). |
| `ShardCount` | `int` | `256` | `[ValueRange(1, int.MaxValue)]`, power of 2 | Number of concurrent map shards (`(ShardCount & (ShardCount - 1)) == 0`). |
| `SoftViolationWindowSeconds` | `int` | `8` | `[ValueRange(1, int.MaxValue)]` | Sliding window in seconds for accumulating consecutive soft-throttle violations. |
| `MaxSoftViolations` | `int` | `5` | `[ValueRange(1, int.MaxValue)]` | Soft violations within `SoftViolationWindowSeconds` required to escalate to `HardLockout`. |
| `CooldownResetSec` | `int` | `10` | `[ValueRange(1, int.MaxValue)]` | Configured cooldown reset duration in seconds. |
| `MaxTrackedEndpoints` | `int` | `100_000` | `[ValueRange(0, int.MaxValue)]` | Maximum simultaneously tracked endpoints across all shards (`0` = unlimited). |
| `AdaptiveThrottlingEnabled` | `bool` | `true` | — | Scales token refill rate by `ITaskManager.ConcurrencyLimitRatio` when server CPU load is high. |
| `InitialTokens` | `int` | `-1` | `<= CapacityTokens` | Starting token balance for newly seen endpoints (`< 0` = full `CapacityTokens`, `0` = empty cold-start, `> 0` = explicit token count). |
| `MaxEvictionCapacity` | `int` | `8192` | `[ValueRange(64, 65536)]` | Initial candidate-list capacity used during over-limit cleanup sweeps. |
| `MinReportCapacity` | `int` | `256` | `[ValueRange(64, 8192)]` | Minimum initial list capacity used when generating `IReportable` snapshots. |

## Validation Rules (`Validate()`)

`Validate()` runs DataAnnotation attribute checks and enforces:

1. `ShardCount > 0` and `(ShardCount & (ShardCount - 1)) == 0` (must be a power of two).
2. `CapacityTokens * (long)TokenScale <= long.MaxValue`.
3. `InitialTokens <= CapacityTokens`.

## Related APIs

- [Token Bucket Limiter](../../runtime/middleware/token-bucket-limiter.md)
- [Policy Rate Limiter](../../runtime/middleware/policy-rate-limiter.md)
- [Directive Guard Options](./directive-guard-options.md)
