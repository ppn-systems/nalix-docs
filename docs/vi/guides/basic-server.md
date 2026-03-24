# 🛠 Server cơ bản

Đăng ký logger, catalog, middleware và listener.

### 🔧 Đăng ký dịch vụ
```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry registry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(registry);
```

### 🔧 Metadata
```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```

### 🔧 Dispatcher + Listener
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
channel.Activate();
listener.Activate();
```

### 🔧 Handler
```csharp
[PacketController("HandshakeHandlers")]
public class HandshakeHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```
