# ⚡ Quick Start

Provision an in-process listener and a matching client using the same packet catalog so both sides share metadata, encryption, and timing helpers.

## Server example

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry packetRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(packetRegistry);

PacketMetadataProviders.Register(new PacketCustomAttributeProvider());

PacketDispatchChannel channel = new(dispatchOptions =>
{
    dispatchOptions.WithMiddleware(new TimeoutMiddleware());
    dispatchOptions.WithMiddleware(new CustomMiddleware());
    dispatchOptions.WithLogging(InstanceManager.Instance.GetExistingInstance<ILogger>());
    dispatchOptions.WithErrorHandling((ex, cmd)
        => InstanceManager.Instance.GetExistingInstance<ILogger>()?
                                     .Error($"Error handling command: {cmd}", ex));
    dispatchOptions.WithHandler(() => new PingHandlers());
});

AutoXProtocol protocol = new(channel);
AutoXListener listener = new(protocol);

channel.Activate();
listener.Activate();
Console.WriteLine(listener.GenerateReport());
Console.ReadLine();
```

This setup mirrors the provided network example: a custom protocol (`AutoXProtocol`) feeds `PacketDispatchChannel`, which applies middleware and attribute-driven handlers before responding to clients.

## Client example

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry clientRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(clientRegistry);

IoTTcpSession client = new();
await client.ConnectAsync("127.0.0.1", 12345);

Handshake handshake = new(opCode: 0, secret: Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

Monitor the listener console for incoming packets and use `ControlExtensions.PingAsync` on the client if you need RTT measurements.
