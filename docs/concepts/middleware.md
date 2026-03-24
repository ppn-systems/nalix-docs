# 🧠 Middleware Pipeline

`MiddlewarePipeline<TPacket>` gives you deterministic stages, metadata access, and optional short-circuiting around each handler.

### 🔧 Middleware stages
The pipeline runs inbound middleware first, executes your handler, and then runs outbound and outbound-always stages.

**Responsibilities**
- Register middleware (`IPacketMiddleware<TPacket>`) once per dispatch channel so execution order is deterministic.
- Store middleware in immutable snapshots (`_inbound`, `_outbound`, `_outboundAlways`) so hot-path execution avoids locks.
- Allow middleware to short-circuit outbound stages via `PacketContext<TPacket>.SkipOutbound` and to clean up resources in outbound-always.

**Key Components**
- `MiddlewarePipeline<TPacket>` – internal, thread-safe pipeline used by `PacketDispatchChannel`.
- `IPacketMiddleware<TPacket>` – handler contract; implementations run inside `ExecuteAsync` with access to `PacketContext<TPacket>` and `Func<CancellationToken, Task>` delegates.
- `PacketContext<TPacket>` – pooled context with `Attributes`, `Connection`, `Packet`, `CancellationToken`, and `Sender`.
- `PacketDispatchOptions<TPacket>.WithMiddleware(...)` – surface that calls `_pipeline.Use(...)` so `PacketDispatchChannel` wires middleware at startup.

**Flow**
- `PacketDispatchChannel` receives a packet → `PacketContext<TPacket>` initializes → inbound middleware runs → handler executes → outbound-always runs → outbound runs (if `SkipOutbound` is false).

```csharp
public void ConfigureErrorHandling(
    bool continueOnError,
    Action<Exception, Type> errorHandler = null)
{
    lock (_lock)
    {
        _continueOnError = continueOnError;
        _errorHandler = errorHandler;
    }
}
```

### 🔧 Error handling & short-circuit
Configure how the pipeline responds to middleware exceptions and decide when to bypass outbound work entirely.

**Responsibilities**
- Control whether exceptions in middleware stop the pipeline or continue to the next stage via `continueOnError`.
- Capture exceptions with `errorHandler` for logging or metrics without disrupting the rest of the pipeline.
- Set `PacketContext<TPacket>.SkipOutbound = true` when you want to avoid running outbound middleware after a middleware short-circuit.

**Key Components**
- `IPacketMiddleware<TPacket>` implementations such as `TimeoutMiddleware` that throw when deadlines expire.
- `MiddlewarePipeline<TPacket>.ExecuteAsync` – snapshots middleware lists and calls `INVOKE_PIPELINE_ASYNC` for each stage.
- `PacketContext<TPacket>.Attributes` – metadata collected from `PacketMetadataBuilder` so middleware can read `[PacketCustomAttribute]` values.

**Flow**
- Middleware throws? `ConfigureErrorHandling` decides if the pipeline continues → `errorHandler` logs metadata → outbound-always runs even when cancelled.

!!! warning "Skip outbound when needed"
    Set `context.SkipOutbound = true` from inbound middleware if you need to drop a packet before outbound work runs; otherwise outbound middleware still executes by default.
