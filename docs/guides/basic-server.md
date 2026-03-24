# 🛠 Basic Server

## Build the listener

1. Register shared services before creating the listener, for example `ILogger` and `IPacketRegistry` via `InstanceManager`.
2. Register `PacketMetadataProviders` so `[PacketController]` and `[PacketOpcode]` attributes are recognized.
3. Configure a `PacketDispatchChannel` with middleware, logging, and your handler class.
4. Create an `AutoXProtocol` (or your own `Protocol` subclass) that consumes the dispatch channel.
5. Instantiate a `TcpListenerBase` derivative (e.g., `AutoXListener`) and call `Activate()` once the middleware is ready.

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
PacketDispatchChannel channel = new(dispatchOptions =>
{
    dispatchOptions.WithMiddleware(new TimeoutMiddleware());
    dispatchOptions.WithHandler(() => new PingHandlers());
    dispatchOptions.WithLogging(InstanceManager.Instance.GetExistingInstance<ILogger>());
});

AutoXProtocol protocol = new(channel);
AutoXListener listener = new(protocol);

channel.Activate();
listener.Activate();
Console.WriteLine(listener.GenerateReport());
```

## Add handlers

Create handler classes decorated with `[PacketController]` and `[PacketOpcode]` so the dispatch channel can locate them. The handler receives a `PacketContext<IPacket>`, allowing you to access `context.Packet`, `context.Connection`, and `context.Sender` for replies. The example `PingHandlers` echoes PING controls and demonstrates error handling with `Connection.SendAsync`.

!!! tip
    Keep handlers stateless. Store ephemeral connection state in `PacketContext.Items` (a dictionary backed by `PacketContext`), and rely on `ConnectionHub` statistics if you need to monitor global load.
