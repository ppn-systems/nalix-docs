# 📦 Nalix.Network

Listener loops, connection hubs, and dispatch glue live here.

### 🔧 Listener runtime
Listeners derive from `TcpListenerBase` and push frames to the dispatcher.

**Responsibilities**
- Accept sockets.
- Register connections.
- Forward buffers into `PacketDispatchChannel`.

**Key Components**
- `TcpListenerBase`
- `ConnectionHub`
- `PacketDispatchChannel`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithHandler(() => new HandshakeHandlers());
});

sealed class DemoProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    public DemoProtocol(PacketDispatchChannel dispatch) => _dispatch = dispatch;
    public override void ProcessMessage(object sender, IConnectEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);
}

sealed class DemoListener : TcpListenerBase
{
    public DemoListener(ushort port, IProtocol protocol) : base(port, protocol) { }
}

DemoProtocol protocol = new(channel);
DemoListener listener = new(57206, protocol);
listener.Activate();
```

### 🔧 Connection tracking
Connection hubs store active connections and enforce limits.

**Responsibilities**
- Track active connections.
- Enforce connection policies.

**Key Components**
- `ConnectionHub`
- `ConnectionHubOptions`

```csharp
ConnectionHubOptions hubOptions = ConfigurationManager.Instance.Get<ConnectionHubOptions>();
```

### 🔧 Protocol contracts
Protocols translate raw buffers into packets and dispatch them.

**Responsibilities**
- Implement protocol parsing.
- Call `PacketDispatchChannel.HandlePacket`.

**Key Components**
- `IProtocol`
- `Protocol` (derive and call `PacketDispatchChannel.HandlePacket`)
- `PacketDispatchChannel`

```csharp
sealed class DemoProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    public DemoProtocol(PacketDispatchChannel dispatch) => _dispatch = dispatch;
    public override void ProcessMessage(object sender, IConnectEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);
}
```

### 🔧 Metadata providers
Metadata providers enable attribute-driven behavior.

**Responsibilities**
- Register providers.
- Expose attributes to middleware and handlers.

**Key Components**
- `PacketMetadataProviders`
- `PacketCustomAttributeProvider`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```
