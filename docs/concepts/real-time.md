# 🧠 Real-time Engine

Nalix keeps real-time state consistent by pairing a deterministic listener with lightweight SDK helpers so every metric, packet, and cipher option matches.

### 🔧 Real-time orchestration
The listener accepts sockets, wires them through connection hubs, and hands packets to `PacketDispatchChannel` which runs middleware, handlers, and `PacketSender`.

**Responsibilities**
- Accept sockets via `TcpListenerBase`, tune the OS socket using `NetworkSocketOptions`, and push each connection into `ConnectionHub`.
- Track usernames, reject connections when `ConnectionHubOptions.MaxConnections` or `DropPolicy` limits trigger, and expose `ConnectionHub.Statistics` for telemetry.
- Run middleware stages (`MiddlewarePipeline<TPacket>`) and attribute-driven handlers inside `PacketDispatchChannel`, feeding `PacketContext<TPacket>` and `PacketSender<TPacket>` to keep encryption consistent.

**Key Components**
- `TcpListenerBase` – listener that uses `TaskManager` workers, `TimingWheel` timeouts, and `PacketDispatchChannel` to process frames.
- `ConnectionHub` – sharded dictionaries, evicted-connection queue, and `ConnectionUnregistered` events that keep `Connection` lifetimes deterministic.
- `PacketDispatchChannel` – queue-based dispatcher that compiles handlers, enables logging, and offers `WithMiddleware`, `WithHandler`, and `WithErrorHandling`.
- `PacketContext<TPacket>` / `PacketSender<TPacket>` – pooled objects that expose `Packet`, `Connection`, `PacketMetadata`, and an auto-encrypted sender to reply with the correct `CipherSuiteType`.

**Flow**
- `TcpListenerBase` accepts → `ConnectionHub.RegisterConnection` stores the connection → `PacketDispatchChannel.HandlePacket` builds a `PacketContext` → middleware runs → handler executes → `PacketSender` replies.

### 🔧 Client feedback
`IoTTcpSession` mirrors the listener stack so developers can reuse the same `Handshake`, `PacketRegistry`, and `ControlExtensions`.

**Responsibilities**
- Validate `TransportOptions` (connect/reconnect, buffer, cipher) before `IoTTcpSession.ConnectAsync`.
- Raise `OnMessageReceived`, `OnDisconnected`, and `OnReconnected` events while honoring heartbeats and reconnection policies.
- Offer helper extensions (`ControlExtensions.PingAsync`, `RequestExtensions.RequestAsync`) that keep clocks aligned via `Clock.SynchronizeTime`.

**Key Components**
- `IoTTcpSession` / `TcpSession` – enforce `TransportOptions`, send encrypted packets, and manage pooled leases.
- `Handshake` / `Csprng` – prove both ends share secrets and transport meta before business packets flow.
- `ControlExtensions` – ping helpers that also call `Clock.SynchronizeTime` when the remote peer replies.
- `RequestExtensions.RequestAsync<TRequest, TResponse>` – registers predicates, sends the packet, and awaits matching responses via the shared `PACKET_AWAITER`.

**Flow**
- Register `ILogger` + `IPacketRegistry` → load `TransportOptions` → `IoTTcpSession.ConnectAsync()` → `ControlExtensions.PingAsync()` or `RequestExtensions.RequestAsync()` for RTT / request-response.

!!! note "Handler context"
    `[PacketController]` and `[PacketOpcode]` handlers run with a pooled `PacketContext<TPacket>` that exposes `context.Packet`, `context.Connection`, and `context.Sender`. Use `context.Sender.SendAsync` so replies respect the handler's cipher, compression, and permission metadata.
