# ⚡ Khởi động nhanh

Dựng listener và client dùng chung catalog và middleware.

### 🔧 Server
```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry registry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(registry);

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

### 🔧 Client
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);

Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Ping
```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```
