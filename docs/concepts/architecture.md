# 🧠 Architecture

Nalix's layers share contracts so a client, listener, logger, and scheduler all race through the same serialization, configuration, and middleware code paths.

### 🔧 Layered contracts
Each assembly owns a pillar: configuration & DI, networking, middleware, logging, or orchestration.

**Responsibilities**
- Keep configuration in `default.ini` so `ConfigurationManager` hands deterministic options to every package.
- Serialize packets once via `PacketRegistryFactory` and share the catalog through `InstanceManager`.
- Let `PacketDispatchChannel` run middleware, compile `[PacketController]` handlers, and return responses with `PacketSender`.

**Key Components**
- `ConfigurationManager` – binds options, debounces file watchers, and exposes `Get<T>()` for `TransportOptions`, `NetworkSocketOptions`, `TaskManagerOptions`, and `NLogixOptions`.
- `InstanceManager` – caches singletons (`ILogger`, `IPacketRegistry`, `TaskManager`, `TimeSynchronizer`) with low-allocation activators.
- `PacketRegistryFactory` – scans assemblies for `IPacket`/`PacketDeserializer` pairs and builds a fast catalog.
- `PacketDispatchChannel` / `MiddlewarePipeline<TPacket>` – run inbound/outbound/outbound-always middleware and compiled handlers such as `PingHandlers`.
- `IoTTcpSession` / `TcpListenerBase` – share the same buffers, ciphers, and diagnostics so clients and listeners behave identically.

**Flow**
- Load `default.ini` → register shared services (`ILogger`, `IPacketRegistry`) → configure middleware + handlers → start `TcpListenerBase` and `IoTTcpSession`.

### 🔧 Execution stack
The runtime fanout is `InstanceManager` → `TaskManager` → listener/dispatcher/handlers.

**Responsibilities**
- Keep a single `TaskManager` so listener accept loops, dispatch loops, and recurring jobs share the same concurrency limits.
- Route every accepted socket into `ConnectionHub` so `ConnectionLimiter`, `DropPolicy`, and username lookup are centralized.
- Synchronize time across connections with `TimeSynchronizer` and `Clock.UnixMillisecondsNow`.

**Key Components**
- `TaskManager` – schedules worker tasks, monitors CPU thresholds, enforces `MaxWorkers`, and exposes `ScheduleWorker()`/`CancelWorker()`.
- `ConnectionHub` – shards connections, evicts anonymous clients when `MaxConnections` or `DropPolicy` triggers, and exposes `Statistics`.
- `TimeSynchronizer` – keeps clocks aligned so `ControlExtensions.PingAsync` can expose RTT and optionally call `Clock.SynchronizeTime`.
- `PacketContext<TPacket>` – pooled context that carries `Packet`, `IConnection`, `PacketMetadata`, and a pooled `PacketSender<TPacket>`.

**Flow**
- `PacketDispatchChannel` queues packets → `PacketContext` initializes with metadata → middleware runs → compiled handler executes → `PacketSender` applies the right `CipherSuiteType`.

!!! tip "Use the examples"
    Open `example/Nalix.Network.Examples/Program.cs` and `example/Nalix.SDK.Examples/Program.cs` to see how they register the logger, catalog, metadata provider, and listener/client in a single `Main` entry point.
