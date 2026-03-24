# 📦 Nalix.Network

Vòng lặp listener, hub kết nối và dispatch.

### 🔧 Listener
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

### 🔧 Hub kết nối
- `ConnectionHub` quản lý kết nối và `ConnectionHubOptions` đặt giới hạn.

### 🔧 Metadata
```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```
