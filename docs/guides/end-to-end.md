# End-to-End Sample (Server + Client)

Spin up a minimal Nalix server and a matching client to verify handshake, ping/pong, and a custom packet handler.

## Server: Program.cs
```csharp
using Nalix.Framework.Configuration;
using Nalix.Framework.Injection;
using Nalix.Logging;
using Nalix.Network.Listeners;
using Nalix.Network.Protocol;
using Nalix.Network.Routing;
using Nalix.Shared;
using Nalix.Shared.Packets;

// Load options
TransportOptions transport = ConfigurationManager.Instance.Get<TransportOptions>();
transport.Address = "0.0.0.0";
transport.Port = 57206;

// Register shared services
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);

// Build dispatch channel + handler
PacketDispatchChannel channel = new(options =>
{
    options.WithHandler(() => new DemoHandlers());
});
channel.Activate();

// Wire protocol + listener
DemoProtocol protocol = new(channel);
TcpListenerBase listener = new(transport.Port, protocol);
listener.Activate();

Console.WriteLine("Server running on port 57206. Press ENTER to exit.");
Console.ReadLine();
listener.Deactivate();

[PacketController("DemoHandlers")]
public class DemoHandlers
{
    [PacketOpcode(1)]
    public ValueTask Echo(Text256 msg, IConnection connection)
        => connection.SendAsync(msg);
}

sealed class DemoProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    public DemoProtocol(PacketDispatchChannel dispatch) => _dispatch = dispatch;
    public override void ProcessMessage(object sender, IConnectEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);
}
```

## Client: Program.cs
```csharp
using Nalix.Framework.Configuration;
using Nalix.Logging;
using Nalix.SDK;
using Nalix.Shared;
using Nalix.Shared.Packets;

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;

InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);

IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);

// Handshake
Handshake hs = new(0, Csprng.GetBytes(32));
await client.SendAsync(hs.Serialize());

// Ping
await ControlExtensions.PingAsync(client, CancellationToken.None);

// Echo roundtrip
Text256 hello = new("hello nalix");
await client.SendAsync(hello.Serialize());
```

## Expected output
- Server log: listener running, dispatch activated, packets handled without errors.
- Client: handshake success, ping/pong returns, echo receives same payload.

## Tips
- Use one shared `PacketRegistryFactory` on both ends.
- Validate `TransportOptions` before activation.
- Keep `InstanceManager` registrations singletons; avoid per-request creation.
