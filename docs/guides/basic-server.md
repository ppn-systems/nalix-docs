# 🛠 Basic Server

Build a minimal listener with middleware and one handler.

### 🔧 Register services
Register logging and the packet catalog first.

**Responsibilities**
- Register `ILogger`.
- Register `IPacketRegistry`.

**Key Components**
- `InstanceManager`
- `PacketRegistryFactory`

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry registry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(registry);
```

### 🔧 Register metadata
Enable attribute-based metadata before adding handlers.

**Responsibilities**
- Register metadata providers.

**Key Components**
- `PacketMetadataProviders`
- `PacketCustomAttributeProvider`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```

### 🔧 Configure dispatcher
Attach middleware and handlers to the dispatch channel.

**Responsibilities**
- Add middleware.
- Add handler factories.

**Key Components**
- `PacketDispatchChannel`
- `PacketDispatchOptions`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithHandler(() => new HandshakeHandlers());
});
```

### 🔧 Start listener
Derive a protocol and listener, then activate both.

**Responsibilities**
- Activate channel first.
- Activate listener next.

**Key Components**
- `Protocol` (derived)
- `TcpListenerBase` (derived)

```csharp
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

channel.Activate();
listener.Activate();
```

### 🔧 Add a handler
Handlers respond using the connection context.

**Responsibilities**
- Handle op codes.
- Send replies via `IConnection`.

**Key Components**
- `[PacketController]`
- `[PacketOpcode]`
- `IConnection`

```csharp
[PacketController("HandshakeHandlers")]
public class HandshakeHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```
