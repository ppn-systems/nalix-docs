---
title: Nalix.Runtime.Middleware
description: Overview of the packet middleware pipeline, execution stages, and built-in security/throttling middleware in Nalix.Runtime.Middleware.
section: API Reference
package: Nalix.Runtime
---

**Namespaces:** `Nalix.Runtime.Middleware`, `Nalix.Runtime.Middleware.Standard`, `Nalix.Runtime.Throttling`  
**Assembly:** `Nalix.Runtime`

Runtime middleware forms the packet execution pipeline between `PacketContext<TPacket>` initialization and `[PacketHandler]` invocation. It enforces fail-closed permissions, per-policy and per-endpoint rate limiting, handler timeouts, and outbound post-processing.

## Source Mapping

- `src/Nalix.Abstractions/Middleware/IPacketMiddleware.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareOrderAttribute.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareStageAttribute.cs`
- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.cs`
- `src/Nalix.Runtime/Middleware/Standard/PermissionMiddleware.cs`
- `src/Nalix.Runtime/Middleware/Standard/RateLimitMiddleware.cs`
- `src/Nalix.Runtime/Middleware/Standard/TimeoutMiddleware.cs`
- `src/Nalix.Runtime/Throttling/PolicyRateLimiter.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`

## Execution Lifecycle

```mermaid
flowchart TD
    Start(["ExecuteAsync(context, dispatch, descriptor, ct)"]) --> Inbound["Inbound Middleware (Ascending Order)"]
    Inbound -->|Calls next(ct)| Handler["ExecuteTerminalHandler (CanExecute + Invoker)"]
    Inbound -->|Short-circuits (no next)| End(["Pipeline Returns"])
    Handler --> Always["OutboundAlways Middleware (Descending Order)"]
    Always --> Decision{"!context.SkipOutbound && !ct.IsCancellationRequested?"}
    Decision -->|Yes| Outbound["Outbound Middleware (Descending Order)"]
    Decision -->|No| End
    Outbound --> End
```

## Middleware Stages (`MiddlewareStage`)

| Stage | Attribute Declaration | Sort Order | Triggered When |
| :--- | :--- | :---: | :--- |
| `Inbound` | `[MiddlewareStage(MiddlewareStage.Inbound)]` (default) | Ascending `Order` | Before the packet handler runs. Short-circuiting skips the handler and all outbound stages. |
| `OutboundAlways` | `[MiddlewareStage(MiddlewareStage.Outbound, AlwaysExecute = true)]` | Descending `Order` | Always runs after the handler returns or cancels via `OperationCanceledException`. |
| `Outbound` | `[MiddlewareStage(MiddlewareStage.Outbound)]` | Descending `Order` | Runs after `OutboundAlways` only when `!context.SkipOutbound` and `!token.IsCancellationRequested`. |
| `Both` | `[MiddlewareStage(MiddlewareStage.Both)]` | Ascending (`Inbound`) & Descending (`Outbound` / `OutboundAlways`) | Registers the same middleware instance in both inbound and outbound lists. |

## Built-in Standard Middleware (`Nalix.Runtime.Middleware.Standard`)

| Middleware | Order | Stage | Runtime Behavior |
| :--- | ---: | :--- | :--- |
| [PermissionMiddleware](./permission-middleware.md) | `-50` | `Inbound` | Fail-closed `[PacketPermission]` check (`MinimumLevel` or `StrictMatch`). Emits `Directive(FAIL, UNAUTHORIZED)` gated by `DirectiveGuard`. |
| `RateLimitMiddleware` | `50` | `Inbound` | Evaluates [PolicyRateLimiter](./policy-rate-limiter.md) when `[PacketRateLimit]` is present, or global [TokenBucketLimiter](./token-bucket-limiter.md) otherwise. Emits `Directive(FAIL, RATE_LIMITED, RETRY)`. |
| [TimeoutMiddleware](./timeout-middleware.md) | `75` | `Inbound` | Enforces `[PacketTimeout(ms)]` using pooled `PooledCancellationTokenSource` instances. Emits `Directive(TIMEOUT, TIMEOUT, RETRY)`. |

## Related APIs

- [Middleware Pipeline](./pipeline.md)
- [Permission Middleware](./permission-middleware.md)
- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Limiter](./token-bucket-limiter.md)
- [Timeout Middleware](./timeout-middleware.md)
- [Packet Dispatch Options](../../options/runtime/packet-dispatch-options.md)
