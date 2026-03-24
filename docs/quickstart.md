# ⚡ Quick Start

Prove a listener and a client share the same catalog, middleware, and cipher state before you add business rules.

### 🔧 Server wiring
Wire a logging-backed dispatch channel, register packet metadata, and host it behind a `TcpListenerBase` derivative such as `AutoXListener`.

**Responsibilities**
- Register `ILogger` and `IPacketRegistry` so every dispatch option and middleware resolves the same instances.
- Register `PacketMetadataProviders` (for example `PacketCustomAttributeProvider`) so `[PacketController]` and `[PacketOpcode]` metadata can be captured.
- Configure middleware, error handling, and handlers on `PacketDispatchChannel` before you call `Activate()`.

**Key Components**
- `PacketDispatchChannel` – queue-based dispatcher that calls inbound/outbound/outbound-always middleware and compiled handlers.
- `AutoXProtocol` / `AutoXListener` – example protocol/listener that keeps connections in `ConnectionHub` and logs the bound listener via `TcpListenerBase.GenerateReport()`.
- `TimeoutMiddleware` / `CustomMiddleware` – sample middleware (`IPacketMiddleware<IPacket>`) that demonstrates throttling, metadata checks, and logging.
- `PingHandlers` – `[PacketController]` sample handlers that echo `Handshake` or control packets, showing how `PacketContext<TPacket>` exposes `context.Packet`, `context.Connection`, and `context.Sender`.

**Flow**
- Register `ILogger` + `IPacketRegistry` → register metadata providers → configure `PacketDispatchChannel` (middleware, handlers, logging) → activate channel + listener.

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
    dispatchOptions.WithErrorHandling((ex, opCode)
        => InstanceManager.Instance.GetExistingInstance<ILogger>()?
                                     .Error($"Error handling opcode={opCode}", ex));
    dispatchOptions.WithHandler(() => new PingHandlers());
});

AutoXProtocol protocol = new(channel);
AutoXListener listener = new(protocol);

channel.Activate();
listener.Activate();
Console.WriteLine(listener.GenerateReport());
Console.ReadLine();
```

!!! tip "Custom metadata"
    `PacketMetadataProviders.Register(...)` can run any `IPacketMetadataProvider` so middleware or handlers can inspect attributes via `PacketContext<TPacket>.Attributes.CustomAttributes`.

### 🔧 Client wiring
Use the SDK transports and `Handshake` frame from `Nalix.Shared` to open a connection and prove both sides share the same secret.

**Responsibilities**
- Register the same `ILogger`/`IPacketRegistry` instances as the listener.
- Tune `TransportOptions` (address, port, cipher, reconnection) before calling `IoTTcpSession.ConnectAsync`.
- Serialize a `Handshake` with `Csprng.GetBytes` so the listener can verify the shared secret.

**Key Components**
- `IoTTcpSession` – validates `TransportOptions`, manages heartbeats/reconnects, and exposes `OnMessageReceived`, `OnDisconnected`, and `OnReconnected`.
- `Handshake` – `PacketBase<Handshake>` frame with encryption flags and dynamic data used to start the session.
- `Csprng` – seeded RNG used to generate secrets for `Handshake`.
- `ControlExtensions` / `RequestExtensions` – helper extensions for ping/response flows once the socket is open.

**Flow**
- Register `ILogger`/`IPacketRegistry` → fetch `TransportOptions` → `IoTTcpSession.ConnectAsync(address, port)` → send `Handshake`.

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry clientRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(clientRegistry);

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;

Handshake handshake = new(0, Csprng.GetBytes(32));

TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
await client.SendAsync(handshake.Serialize());
```

!!! note "Use ping helpers"
    Call `await ControlExtensions.PingAsync(client, CancellationToken.None)` or `await RequestExtensions.RequestAsync<TRequest, TResponse>(...)` once the session is live to drive request-response flows with built-in timeouts and retries.
