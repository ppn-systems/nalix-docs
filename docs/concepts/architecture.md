# 🧠 Architecture

Nalix is composed of discrete layers that communicate through well-defined contracts: configuration, networking, middleware, logging, and orchestration. Each layer is packaged so teams can keep builds small and only reference the assemblies they need.

- **Platform plumbing** – `InstanceManager` resolves shared singletons (`ILogger`, `PacketRegistry`, `TaskManager`, `TimeSynchronizer`) so every package accesses a consistent clock, scheduler, and dependency graph.
- **Configuration** – `ConfigurationManager` binds `TransportOptions`, `NetworkSocketOptions`, `TaskManagerOptions`, and other POCOs, then validates them before the host or client starts.
- **Networking core** – `TcpListenerBase` accepts sockets, applies socket tuning from `NetworkSocketOptions`, wires `ConnectionLimiter`/`TimingWheel`, and turns each accept into a `Connection` that triggers an `IProtocol` implementation such as `AutoXProtocol`.
- **Middleware & dispatch** – `PacketDispatchChannel` runs each `PacketContext` through `MiddlewarePipeline<TPacket>` (inbound, outbound, outbound-always) and finally executes attribute-safe handlers like `PingHandlers`.
- **Client layer** – `TcpSessionBase`/`IoTTcpSession` expose connection events, send `IPacket` frames with compression/encryption, and surface helpers such as `RequestExtensions` and `ControlExtensions` for ping/pong and request-response workloads.

!!! tip "Start with the examples"
    The `example/Nalix.Network.Examples` and `example/Nalix.SDK.Examples` projects demonstrate this architecture end-to-end. Use them as a template for new listeners, protocols, and clients so you don’t miss critical wiring (logger registration, packet metadata, and connection hub tracking).
