# ⚡ Quick Start

Spin up a listener and a client with the same catalog, middleware, and cipher settings.

### 🔧 Server setup
Create a dispatch channel, a protocol that forwards to the channel, and a listener derived from `TcpListenerBase`.

**Responsibilities**
- Register `ILogger` and `IPacketRegistry`.
- Configure middleware and handlers.
- Activate the channel and listener.

**Key Components**
- `PacketDispatchChannel`
- `Protocol` (derived)
- `TcpListenerBase` (derived)

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

### 🔧 Add middleware
Use middleware to guard packets and record telemetry.

**Responsibilities**
- Enforce timeouts.
- Inspect attributes and metadata.

**Key Components**
- `TimeoutMiddleware`
- `CustomMiddleware`
- `PacketContext<TPacket>`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithMiddleware(new CustomMiddleware());
});
```

### 🔧 Add handlers
Handlers use `[PacketController]` and `[PacketOpcode]`.

**Responsibilities**
- Group handlers by controller.
- Implement per-opcode methods.

**Key Components**
- `[PacketController]`
- `[PacketOpcode]`
- `PacketContext<TPacket>`

```csharp
[PacketController("HandshakeHandlers")]
public class HandshakeHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```

### 🔧 Client connect
Open a session and send a handshake.

**Responsibilities**
- Load `TransportOptions`.
- Send the `Handshake`.

**Key Components**
- `IoTTcpSession`
- `Handshake`
- `Csprng`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;

Handshake handshake = new(0, Csprng.GetBytes(32));

IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
await client.SendAsync(handshake.Serialize());
```

!!! tip "Ping helpers"
    Use `ControlExtensions.PingAsync` or `RequestExtensions.RequestAsync` to test request-response flows after the session is live.
