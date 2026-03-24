# Nalix.Network

`Nalix.Network` owns listener loops, connection tracking, middleware dispatch, and protocol glue so every host stays deterministic.

### 🔧 Networking responsibilities
Accept sockets, apply socket tuning, and hand packets to the dispatcher while connection hubs enforce limits.

**Responsibilities**
- Run `TcpListenerBase` accept loops via `TaskManager` workers and the `TimingWheel` when `NetworkSocketOptions.EnableTimeout` is true.
- Store every connection inside `ConnectionHub`, evict anonymous connections, and expose `Statistics` and events for monitoring.
- Feed inbound packets into `PacketDispatchChannel`, which compiles `[PacketController]` handlers, runs middleware, and replies with `PacketSender<TPacket>`.

**Key Components**
- `TcpListenerBase` – abstract listener that uses `NetworkSocketOptions`, `TaskManager`, and `PacketDispatchChannel`.
- `ConnectionHub` – sharded dictionaries with `MaxConnections`, `DropPolicy`, and `ParallelDisconnectDegree` configured via `ConnectionHubOptions`.
- `PacketDispatchChannel` – queue dispatcher started via `Activate()` that owns `PacketDispatchOptions`.
- `PacketDispatchOptions<TPacket>` – configuration object with methods such as `WithMiddleware`, `WithHandler`, `WithLogging`, and `WithErrorHandling`.
- `PacketSender<TPacket>` – auto-applies the handler’s encryption/compression metadata to replies.

**Flow**
- `TcpListenerBase` accepts → `ConnectionHub.RegisterConnection` stores the connection → `PacketDispatchChannel.HandlePacket` enqueues the packet → middleware runs → handler executes → `PacketSender` replies.

```csharp
public PacketDispatchOptions<TPacket> WithMiddleware([System.Diagnostics.CodeAnalysis.NotNull] IPacketMiddleware<TPacket> middleware)
{
    System.ArgumentNullException.ThrowIfNull(middleware);

    this.Logging?.Debug($"[NW.{nameof(PacketDispatchOptions<>)}:{nameof(WithMiddleware)}] middleware-added type={middleware.GetType().Name}");

    _pipeline.Use(middleware);

    return this;
}
```

### 🔧 Protocol contracts
Protocols and metadata providers keep the dispatcher, handlers, and middleware in sync.

**Responsibilities**
- Implement `IProtocol` to plug into `TcpListenerBase` (for example `AutoXProtocol`) to validate connections, log events, and call `PacketDispatchChannel`.
- Register `PacketMetadataProviders` so handler attributes (e.g., `PacketCustomAttribute`) populate `PacketMetadataBuilder`.
- Pool `PacketContext<TPacket>` instances so `Packet`, `Connection`, `PacketMetadata`, and `PacketSender` stay on-stack.

**Key Components**
- `AutoXProtocol` – sample `Protocol` that logs accept events and calls `s_Dispatch.HandlePacket`.
- `PacketMetadataProviders` – static registry for `IPacketMetadataProvider` implementations.
- `PacketContext<TPacket>` – pooled context with `Initialize`/`Reset` methods that load metadata and a `PacketSender<TPacket>`.
- `PacketDispatchChannel.HandlePacket(IBufferLease, IConnection)` – core entry point used by protocols and listeners.

**Flow**
- `Protocol.ProcessMessage` receives a lease → call `PacketDispatchChannel.HandlePacket(lease, connection)` → dispatcher builds `PacketContext` → middleware/handler executes → lease disposed.

```csharp
internal void Initialize(
    [System.Diagnostics.CodeAnalysis.MaybeNull] TPacket packet,
    [System.Diagnostics.CodeAnalysis.MaybeNull] IConnection connection,
    [System.Diagnostics.CodeAnalysis.MaybeNull] PacketMetadata descriptor,
    [System.Diagnostics.CodeAnalysis.MaybeNull] System.Threading.CancellationToken token = default)
{
    _ = System.Threading.Interlocked.Exchange(
        ref _state,
        (System.Int32)PacketContextState.IN_USE);

    this.Packet = packet;
    this.Connection = connection;
    this.Attributes = descriptor;
    this.CancellationToken = token;
    this.Sender = s_object.Get<PacketSender<TPacket>>();
    if (this.Sender is null)
    {
        throw new System.InvalidOperationException($"[{nameof(PacketContext<TPacket>)}] object pool returned null {nameof(PacketSender<TPacket>)}");
    }

    _isInitialized = true;
}
```

!!! note "Metadata provider"
    `PacketMetadataProviders.Register()` can accept any `IPacketMetadataProvider` (example: `PacketCustomAttributeProvider`) so middleware or handlers can inspect custom attributes via `PacketContext<TPacket>.Attributes.CustomAttributes`.
