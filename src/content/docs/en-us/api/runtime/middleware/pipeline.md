---
title: Middleware Pipeline
description: Reference for MiddlewarePipeline<TPacket>, PipelineMetrics, and PerMiddlewareMetrics in Nalix.Runtime.Middleware.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Middleware`  
**Assembly:** `Nalix.Runtime`

`MiddlewarePipeline<TPacket>` (`internal sealed class MiddlewarePipeline<TPacket> where TPacket : IPacket`) orchestrates inbound and outbound `IPacketMiddleware<TPacket>` execution around terminal packet handlers. It uses immutable `PipelineSnapshot` arrays, a 32-slot bitmask local runner pool (`PooledPipelineContext`), and direct typed terminal invocation so zero per-packet closures are allocated.

## Source Mapping

- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.cs`
- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.Types.cs`
- `src/Nalix.Abstractions/Middleware/IPacketMiddleware.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareOrderAttribute.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareStageAttribute.cs`

## Middleware Contract (`IPacketMiddleware<TPacket>`)

```csharp
namespace Nalix.Abstractions.Middleware;

public interface IPacketMiddleware<TPacket> where TPacket : IPacket
{
    ValueTask InvokeAsync(
        IPacketContext<TPacket> context,
        Func<CancellationToken, ValueTask> next);
}
```

- Calling `await next(token)` advances to the next middleware or transitions to the terminal handler.
- Returning without calling `next` short-circuits the pipeline (the handler and outbound stages do not run).

## Registration & Ordering (`Use`)

Configured via `PacketDispatchOptions<TPacket>.WithMiddleware(middleware)`:

1. Throws `ArgumentNullException` if `middleware` is `null`.
2. Throws `InternalErrorException` if the exact same middleware instance is registered twice.
3. Reads `[MiddlewareOrder(int)]` (default `0`) and `[MiddlewareStage(MiddlewareStage, AlwaysExecute = bool)]` (default `MiddlewareStage.Inbound`, `AlwaysExecute = false`), caching the metadata per `Type`.
4. Sorts stage lists and publishes a new immutable `PipelineSnapshot`:
   - **Inbound**: sorted by **ascending** `Order` (`a.Order.CompareTo(b.Order)`).
   - **OutboundAlways**: sorted by **descending** `Order` (`b.Order.CompareTo(a.Order)`).
   - **Outbound**: sorted by **descending** `Order` (`b.Order.CompareTo(a.Order)`).

| Built-in Middleware | Stage | `Order` | Purpose |
| :--- | :--- | ---: | :--- |
| `PermissionMiddleware` | `Inbound` | `-50` | Fail-closed `[PacketPermission]` authorization check. |
| `RateLimitMiddleware` | `Inbound` | `50` | `[PacketRateLimit]` (`PolicyRateLimiter`) or endpoint `TokenBucketLimiter` check. |
| `TimeoutMiddleware` | `Inbound` | `75` | Per-handler `[PacketTimeout]` cancellation wrapper. |

## Execution Flow & Pooled Runner Lifecycle

```mermaid
flowchart TD
    A["ExecuteAsync(context, dispatch, descriptor, ct)"] --> B{"snapshot.IsEmpty?"}
    B -->|Yes| C["dispatch.ExecuteTerminalHandler(descriptor, context, ct)"]
    B -->|No| D["Acquire PooledPipelineContext (32-slot local bitmask pool or ObjectPoolManager)"]
    D --> E["Stage 1: Inbound (ascending Order)"]
    E -->|Calls next(inboundCt)| F["CREATE_EXECUTION_TOKEN(inboundCt, rootCt) + ExecuteTerminalHandler"]
    E -->|Short-circuits| K["Return PooledPipelineContext"]
    F --> G["Stage 2: OutboundAlways (descending Order, runs even if handler threw OperationCanceledException)"]
    G --> H{"!context.SkipOutbound && !token.IsCancellationRequested?"}
    H -->|Yes| I["Stage 3: Outbound (descending Order)"]
    H -->|No| J["Re-throw OperationCanceledException if handler cancelled"]
    I --> J
    J --> K
```

### Cancellation Propagation Between Handler and `OutboundAlways`

When the terminal handler throws `OperationCanceledException` (for example, when `TimeoutMiddleware` cancels `inboundCt`):

1. `EXECUTE_HANDLER_FULL_ASYNC` catches the `OperationCanceledException` temporarily.
2. Runs all `OutboundAlways` middleware so audit/cleanup logic still executes.
3. Re-throws the `OperationCanceledException` after `OutboundAlways` completes so upstream `TimeoutMiddleware` can observe the timeout and send `Directive(TIMEOUT)`.

## Error Handling (`ConfigureErrorHandling`)

Configured via `PacketDispatchOptions<TPacket>.WithErrorHandlingMiddleware(bool continueOnError, Action<Exception, Type>? errorHandler = null)`:

- **`continueOnError = false` (default)**: Non-fatal middleware exceptions increment `TotalErrors` and propagate to the caller, terminating the pipeline.
- **`continueOnError = true`**: Invokes `errorHandler(ex, middlewareType)` and calls `next(token)` to continue pipeline execution.

## Telemetry Structs (`PipelineMetrics` & `PerMiddlewareMetrics`)

Exposed via `PacketDispatchOptions<TPacket>.Metrics` and `PacketDispatchOptions<TPacket>.MiddlewareMetrics`:

- **`PipelineMetrics`**: `ActiveExecutions` (`long`), `TotalExecutions` (`long`), `TotalExecutionTicks` (`long`), `MaxExecutionTicks` (`long`), `TotalErrors` (`long`), `AverageExecutionTime` (`TimeSpan`).
- **`PerMiddlewareMetrics`**: `MiddlewareType` (`Type`), `TotalExecutions` (`long`), `TotalExecutionTicks` (`long`), `MaxExecutionTicks` (`long`), `TotalErrors` (`long`).

## Related APIs

- [Permission Middleware](./permission-middleware.md)
- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Limiter](./token-bucket-limiter.md)
- [Timeout Middleware](./timeout-middleware.md)
- [Packet Dispatch Options](../../options/runtime/packet-dispatch-options.md)
