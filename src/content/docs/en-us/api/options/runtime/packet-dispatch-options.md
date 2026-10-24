---
title: Packet Dispatch Options
description: Reference for Nalix.Runtime.Routing.PacketDispatchOptions<TPacket> and Nalix.Runtime.Options.PacketDrainOptions — handler registration, middleware wiring, and worker loop configuration.
section: API Reference
package: Nalix.Runtime
---

**Namespaces:** `Nalix.Runtime.Routing`, `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`PacketDispatchOptions<TPacket>` (`public sealed partial class PacketDispatchOptions<TPacket> : IPacketHandlerBuilder<TPacket> where TPacket : IPacket`) configures the 65,536-slot $O(1)$ handler lookup table, `MiddlewarePipeline<TPacket>`, error hooks, and `PacketDrainOptions` for `PacketDispatchChannel`.

## Source Mapping

- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.PublicMethods.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.Execution.cs`
- `src/Nalix.Runtime/Options/PacketDrainOptions.cs`

## Public Properties on `PacketDispatchOptions<TPacket>`

| Property | Type | Description |
| :--- | :--- | :--- |
| `Drain` | `PacketDrainOptions` | Worker loop count, CPU core affinity, and per-wake drain budget settings. |
| `Metrics` | `PipelineMetrics` | Aggregated execution metrics (`ActiveExecutions`, `TotalExecutions`, `TotalExecutionTicks`, `MaxExecutionTicks`, `TotalErrors`, `AverageExecutionTime`). |
| `MiddlewareMetrics` | `ReadOnlySpan<PerMiddlewareMetrics>` | Per-middleware execution and error counters. |

## `PacketDrainOptions` (`Nalix.Runtime.Options`)

Loaded from `[PacketDrain]` in `default.ini` or configured via `options.Drain`:

| Property | Type | Default | Validation | Description |
| :--- | :--- | :---: | :--- | :--- |
| `Count` | `int` | `0` (auto) | `[ValueRange(0, 1024)]` | Explicit number of dispatch worker loops (`0` uses `Math.Clamp(Environment.ProcessorCount, MinDispatchLoops, MaxDispatchLoops)`). |
| `MaxDrainPerWakeMultiplier` | `int` | `5` | `[ValueRange(1, 10000)]` | Multiplier applied to `Environment.ProcessorCount` to compute the per-wake packet drain budget. |
| `MinDrainPerWake` | `int` | `64` | `[ValueRange(1, 1000000)]`, `<= MaxDrainPerWake` | Minimum packets drained from a claimed connection session per wake. |
| `MaxDrainPerWake` | `int` | `2048` | `[ValueRange(1, 1000000)]`, `>= MinDrainPerWake` | Maximum packets drained from a claimed connection session per wake. |
| `MinDispatchLoops` | `int` | `1` | `[ValueRange(1, 1024)]`, `<= MaxDispatchLoops` | Minimum worker loops when `Count == 0`. |
| `MaxDispatchLoops` | `int` | `64` | `[ValueRange(1, 1024)]`, `>= MinDispatchLoops` | Maximum worker loops when `Count == 0`. |
| `DispatchProcessorAffinities` | `string` | `""` | Comma-separated core indices | Optional CPU core indices (e.g. `"0,2,4,6"`). When non-empty, spawns one dedicated OS thread per listed core pinned via `ProcessorAffinity`. |
| `VirtualOpCodeOffset` | `ushort` | `0x1000` (`4096`) | `[ValueRange(0, 65535)]` | Offset added by external protocol classifiers when mapping foreign packet IDs into Nalix opcodes. |

## Fluent Configuration Methods (`PacketDispatchOptions<TPacket>`)

| Method | Signature | Behavior |
| :--- | :--- | :--- |
| `WithHandler<TController>()` | `public PacketDispatchOptions<TPacket> WithHandler<TController>() where TController : class` | Instantiates `TController` via `InstanceManager.Instance.CreateInstanceWithInjection<TController>()` (resolving constructor dependencies from `InstanceManager`) and registers its source-generated `[PacketOpcode]` handlers. |
| `WithHandler<TController>(instance)` | `public PacketDispatchOptions<TPacket> WithHandler<TController>(TController instance) where TController : class` | Registers handlers using an existing `TController` singleton instance. |
| `WithHandler<TController>(factory)` | `public PacketDispatchOptions<TPacket> WithHandler<TController>(Func<TController> factory) where TController : class` | Registers handlers using a custom factory delegate. Throws `InternalErrorException` if `TController` is missing `[PacketHandler]` or duplicate opcodes are registered. |
| `WithHandler(Type)` / `WithHandler(Type, Func<object>)` | `public PacketDispatchOptions<TPacket> WithHandler(Type controllerType, ...)` | Non-generic controller registration overloads (useful for `static` handler classes). |
| `WithMiddleware` | `public PacketDispatchOptions<TPacket> WithMiddleware(IPacketMiddleware<TPacket> middleware)` | Registers an `IPacketMiddleware<TPacket>` instance in the pipeline. |
| `WithDispatchLoopCount` | `public PacketDispatchOptions<TPacket> WithDispatchLoopCount(int? loopCount)` | Sets `Drain.Count` (`1..64`, or `null` for automatic CPU-based sizing; throws `ArgumentOutOfRangeException` if outside `1..64`). |
| `WithErrorHandling` | `public PacketDispatchOptions<TPacket> WithErrorHandling(Action<Exception, ushort> errorHandler)` | Registers a callback invoked with `(exception, opCode)` when a handler throws a non-teardown exception before the automatic `Directive(FAIL)` reply is sent. |
| `WithErrorHandlingMiddleware` | `public PacketDispatchOptions<TPacket> WithErrorHandlingMiddleware(bool continueOnError, Action<Exception, Type>? errorHandler = null)` | Configures whether `MiddlewarePipeline<TPacket>` continues or aborts when a middleware throws. |

## Usage Example

```csharp
using Nalix.Runtime.Dispatching;
using Nalix.Runtime.Middleware.Standard;

PacketDispatchChannel channel = new(options =>
{
    options.WithDispatchLoopCount(null)
           .WithErrorHandling((ex, opCode) =>
           {
               // Record handler exception telemetry
           })
           .WithMiddleware(new PermissionMiddleware())
           .WithMiddleware(new RateLimitMiddleware())
           .WithMiddleware(new TimeoutMiddleware())
           .WithHandler<AuthController>()
           .WithHandler<ChatController>();
});
```

## Related APIs

- [Packet Dispatch (PacketDispatchChannel)](../../runtime/routing/packet-dispatch.md)
- [Middleware Pipeline](../../runtime/middleware/pipeline.md)
- [Dispatch Options](./dispatch-options.md)
- [Packet Handler Generator](../../analyzers/autogen/packet-handler-generator.md)
