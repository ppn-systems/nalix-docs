# 🛠 Client Connection

## Create a client

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry clientRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(clientRegistry);

IoTTcpSession client = new();
await client.ConnectAsync("127.0.0.1", 12345);
```

`IoTTcpSession` validates `TransportOptions`, wires `PacketRegistry`, and exposes `OnMessageReceived`/`OnDisconnected`/`OnReconnected`. Use `RequestExtensions.RequestAsync` and `ControlExtensions.PingAsync` to simplify request-response flows or latency checks.

## Message handling

```csharp
client.OnMessageReceived += (sender, lease) =>
{
    try
    {
        Console.WriteLine($"Message {lease.Packet.SequenceId} received");
        // Handle the packet; lease will be disposed automatically after the handler returns
    }
    finally
    {
        lease.Dispose();
    }
};
```

You can also register typed handlers by subclassing `PacketController` classes and using the same `PacketDispatchChannel` logic on the server side to keep serialization in sync.

## Resilience

- `TransportOptions.ReconnectEnabled` enables automatic reconnects; `IoTTcpSession.OnReconnected` notifies you when the link returns.
- `RequestOptions.WithRetry` lets you issue idempotent requests with tight `TimeoutMs` windows. Retries are only triggered on `TimeoutException` so fatal errors bubble immediately.

!!! note
    Register `ILogger` and `IPacketRegistry` before any session is created. The SDK resolves them from `InstanceManager`, so pumping `ConnectAsync` before registration causes `InvalidOperationException`.
