# 🔌 API Overview

Nalix exposes server, client, and shared contracts so listeners and SDKs stay deterministic.

### 🔧 Server APIs
Listeners rely on `TcpListenerBase`, `ConnectionHub`, and `PacketDispatchChannel` to accept sockets and run middleware + handlers.

**Responsibilities**
- Accept sockets with `TcpListenerBase` and tune them using `NetworkSocketOptions`.
- Register connections in `ConnectionHub`, enforce `DropPolicy`, and emit `ConnectionHubEventArgs`.
- Route received data through `PacketDispatchChannel`, `PacketContext`, and compiled handlers.

**Key Components**
- `TcpListenerBase` – host that consumes `IProtocol`, schedules accept workers via `TaskManager`, and invokes `GenerateReport()`.
- `PacketDispatchChannel` – queue dispatcher configured with `PacketDispatchOptions` that calls `WithMiddleware`, `WithHandler`, and `WithLogging`.
- `PacketDispatchOptions<TPacket>` – methods such as `WithMiddleware`, `WithHandler`, and `WithErrorHandling` control how packets progress.
- `IProtocol` – interface for custom protocols (see `AutoXProtocol`) with hooks `OnAccept`, `ProcessMessage`, and `ValidateConnection`.
- `PacketContext<TPacket>` + `PacketSender<TPacket>` – pooled helpers passed to middleware and handlers for replies.

**Flow**
- `TcpListenerBase` accepts → `ConnectionHub.RegisterConnection` stores the connection → `Protocol.ProcessMessage` calls `PacketDispatchChannel.HandlePacket(...)` → middleware/handlers execute → replies send via `PacketSender`.

```csharp
public void HandlePacket(
    [System.Diagnostics.CodeAnalysis.MaybeNull] IBufferLease lease,
    [System.Diagnostics.CodeAnalysis.NotNull] IConnection connection)
{
    Logging?.Debug($"[{nameof(PacketDispatchChannel)}:{nameof(HandlePacket)}] empty-payload ep={connection.NetworkEndpoint}");
    lease?.Dispose();
}
```

### 🔧 Client APIs
SDK transports reuse the same `TransportOptions`, `Handshake`, and request helpers so clients behave like listeners.

**Responsibilities**
- Validate `TransportOptions` and `RequestOptions` before `IoTTcpSession.ConnectAsync`.
- Surface `OnMessageReceived`, `OnDisconnected`, and `OnReconnected` events with pooled leases.
- Offer helpers (`ControlExtensions`, `RequestExtensions`) for ping/pong and request-response flows.

**Key Components**
- `TcpSessionBase` / `IoTTcpSession` – enforce options, manage heartbeats, and serialize packets with pooling.
- `TransportOptions` – controls address, port, buffer size, compression, and `CipherSuiteType`.
- `Handshake` – `PacketBase` used by SDK examples to share secrets (`Csprng.GetBytes(32)`).
- `RequestExtensions` / `ControlExtensions` – extensions that register predicates, send packets, and optionally call `Clock.SynchronizeTime`.

**Flow**
- Register `ILogger`/`IPacketRegistry` → configure `TransportOptions` → call `IoTTcpSession.ConnectAsync()` → `ControlExtensions.PingAsync()` or `RequestExtensions.RequestAsync()` for latency/response flows.

### 🔧 Shared contracts
Shared interfaces and metadata keep middleware, listeners, and SDK clients aligned.

**Responsibilities**
- Define `IPacket`, `IConnection`, and handler attributes so `PacketDispatchChannel` can discover and execute methods.
- Provide metadata (`PacketMetadata`, `PacketMetadataBuilder`) via `PacketMetadataProviders`.
- Offer pooled contexts and senders to keep middleware zero-allocation.

**Key Components**
- `IPacket` / `IConnection` – fundamental wire contracts with IDs, permission levels, and encryption secrets.
- `PacketControllerAttribute` / `PacketOpcodeAttribute` – markers discovered by `PacketDispatchOptions.WithHandler`.
- `PacketMetadataProviders` – register `IPacketMetadataProvider` to add custom attributes (see `PacketCustomAttributeProvider`).
- `PacketContext<TPacket>` – pooled object with `Initialize(...)`, `SkipOutbound`, and `Sender`.
- `PacketSender<TPacket>` – ensures replies honor the handler’s cipher/compression metadata.

**Flow**
- Handler method decorated with `[PacketController]` & `[PacketOpcode]` → `PacketMetadataProviders` populate metadata → `PacketContext` initializes → handler executes → `PacketSender` replies.

!!! warning "Register metadata + logger"
    Every dispatcher requires `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance)` and `IPacketRegistry` before `PacketDispatchChannel` starts; otherwise `PacketDispatchChannel` throws `InvalidOperationException`.
