# Nalix.Common

`Nalix.Common` hosts the shared primitives for every listener and client: connection contracts, packet metadata, security enums, middleware scaffolding, and concurrency helpers. Other packages layer on top of this foundation so they can focus on policy instead of serialization.

## Highlights

- `IConnection` defines the minimal surface for connection lifecycle, bytes sent/received, secrets, cipher (`CipherSuiteType`), and permission (`PermissionLevel`). Servers close and dispose connections through this interface, while listeners propagate events such as `OnProcessEvent` and `OnCloseEvent`.
- `PacketContext<TPacket>` and `PacketDispatchChannel` share metadata about the sender, the connection, and the ability to respond through `PacketSender`.
- Middleware helpers (`INetworkBufferMiddleware`, `IPacketMiddleware<TPacket>`, `MiddlewarePipeline<TPacket>`) keep per-packet sidecars in `PacketContext<TPacket>` and respect inbound/outbound/outbound-always semantics.
- Networking contracts (`IProtocol`, `IListener`, `IConnectionHub`) ensure each package can plug in custom logic (protocols, listeners, connection hubs) without re-implementing low-level sockets.
- Security enums (`CipherSuiteType`, `PermissionLevel`, `ProtocolAdvice`) live here so every package uses the same vocabulary when encrypting, authorizing, and erroring.

### Connection observer example

```csharp
connection.OnCloseEvent += (sender, args) =>
{
    InstanceManager.Instance.GetExistingInstance<ILogger>()?.Info($"Client {args.Connection.ID} closed");
};
```

Use `TimingWheel` for idle timeout tracking and `MiddlewarePipeline<TPacket>` when manipulating buffers before `PacketDispatchChannel` reaches your handlers.
