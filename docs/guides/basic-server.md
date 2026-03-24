# 🛠 Basic Server

Wire up logger, packet metadata, middleware, and a listener before adding business logic.

### 🔧 Server blueprint
Set up singletons, dispatch options, middleware, and handlers in the correct order so accept loops start safely.

**Responsibilities**
- Register `ILogger` + `IPacketRegistry` via `InstanceManager` before constructing middleware or listeners.
- Register metadata providers (`PacketMetadataProviders.Register`) so attributes used by handlers are available.
- Configure `PacketDispatchChannel` with middleware, logging, error handling, and handler factories.
- Start `PacketDispatchChannel` before calling `TcpListenerBase.Activate()` so the dispatch loop is ready.

**Key Components**
- `InstanceManager` – caches logger + packet registry for reuse.
- `PacketDispatchChannel` – configuration using `PacketDispatchOptions.WithMiddleware`, `.WithHandler`, `.WithLogging`, `.WithErrorHandling`.
- `AutoXProtocol` / `AutoXListener` – sample protocol/listener pair used in the examples.
- `PacketMetadataProviders` – register providers such as `PacketCustomAttributeProvider`.

**Flow**
- Register `ILogger` + `PacketRegistry` → register metadata providers → configure `PacketDispatchChannel` → create `AutoXListener` → `channel.Activate()` → `listener.Activate()`.

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(catalog);

PacketMetadataProviders.Register(new PacketCustomAttributeProvider());

PacketDispatchChannel channel = new(dispatchOptions =>
{
    dispatchOptions.WithMiddleware(new TimeoutMiddleware());
    dispatchOptions.WithMiddleware(new CustomMiddleware());
    dispatchOptions.WithLogging(InstanceManager.Instance.GetExistingInstance<ILogger>());
    dispatchOptions.WithErrorHandling((ex, opcode)
        => InstanceManager.Instance.GetExistingInstance<ILogger>()?
                                     .Error($"Error handling opcode={opcode}", ex));
    dispatchOptions.WithHandler(() => new PingHandlers());
});

AutoXProtocol protocol = new(channel);
AutoXListener listener = new(protocol);

channel.Activate();
listener.Activate();
Console.WriteLine(listener.GenerateReport());
```

!!! tip "Activate the channel first"
    Call `PacketDispatchChannel.Activate()` before `TcpListenerBase.Activate()` so the dispatcher’s worker loops exist before the listener accepts sockets.

### 🔧 Handler expectations
Handlers annotated with `[PacketController]` and `[PacketOpcode]` receive `PacketContext<TPacket>` for metadata, connections, and replies.

**Responsibilities**
- Keep handler classes stateless; store temporary state in `PacketContext<TPacket>.Items`.
- Use `PacketSender<TPacket>` (`context.Sender`) instead of writing directly to the `Connection` so encryption/compression flags match the handler metadata.
- Set `context.SkipOutbound = true` when a handler already handled cleaning up or you want to skip outbound middleware.

**Key Components**
- `PacketControllerAttribute` / `PacketOpcodeAttribute` – specify the handler class name, version, and opcode.
- `PacketContext<TPacket>` – exposes `Packet`, `Connection`, `Attributes`, `Sender`, and `SkipOutbound`.
- `PacketSender<TPacket>` – sends replies with the correct `CipherSuiteType` and handles pooling.

**Flow**
- Handler decorator scanned → `PacketDispatchChannel` builds `PacketContext` → handler runs → `PacketSender` replies → `PacketContext.Reset()` returns context to the pool.

```csharp
[PacketController(name: "ExampleController", version: "1.1")]
public class ExampleController
{
    public void HandleLogin(LoginPacket packet, IConnection connection)
    {
        // handle logic
    }

    public ValueTask ProcessData(DataPacket packet, IConnection connection, CancellationToken token)
    {
        return ValueTask.CompletedTask;
    }
}
```

!!! note "Clean up outbound"
    Set `context.SkipOutbound = true` from middleware or a handler when you have already handled cleanup or want to suppress outbound middleware execution.
