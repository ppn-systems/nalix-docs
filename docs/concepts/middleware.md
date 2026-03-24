# 🧠 Middleware Pipeline

Nalix keeps the networking pipeline explicit. `MiddlewarePipeline<TPacket>` splits execution into three ordered phases:

1. **Inbound** – runs before your handler and can mutate headers, authenticate, or drop packets (e.g., `TimeoutMiddleware`, `CustomMiddleware`).
2. **Outbound** – runs after the handler completes, in reverse registration order, and is ideal for metrics or fan-out logic.
3. **OutboundAlways** – invoked even when the handler throws or a cancellation token fires, perfect for cleanup and connection auditing.

The pipeline is thread-safe and builds immutable snapshots (`_inbound`, `_outbound`, `_outboundAlways`) to avoid locking during hot-path execution. `ConfigureErrorHandling` lets you decide if `continueOnError` keeps running or if `errorHandler` should log exceptions per middleware type.

Middleware implements `IPacketMiddleware<TPacket>` and can short-circuit a request by calling `context.SkipOutbound`. `INetworkBufferMiddleware` works on raw buffer slices when efficiency is critical.

!!! tip
    Register middleware through `PacketDispatchChannel` once at startup. The channel exposes `dispatchOptions.WithMiddleware(...)` so you keep middleware registration close to command/handler wiring.
