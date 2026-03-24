# 🛠 Client Connection

Connect the SDK client, measure latency, and keep the handshake secret in sync with the listener.

### 🔧 Client connection flow
Register singletons, connect via `IoTTcpSession`, and send a `Handshake` so both sides share secrets.

**Responsibilities**
- Register `ILogger` and `IPacketRegistry` before creating the client so the transport resolves dependencies.
- Configure `TransportOptions` (address, port, cipher, reconnection) via `ConfigurationManager`.
- Use `Handshake`/`Csprng` to prove the client and listener share the same secret.

**Key Components**
- `IoTTcpSession` / `TcpSession` – validate options, manage heartbeats, and expose lifecycle events.
- `Handshake` – `PacketBase` used by examples to share 32-byte secrets and report `MagicNumber`.
- `ControlExtensions.PingAsync` – measure RTT and optionally sync clocks via `Clock.SynchronizeTime`.
- `RequestExtensions.RequestAsync<TRequest, TResponse>` – built-in request-response flow.

**Flow**
- Register `ILogger` + `IPacketRegistry` → set `TransportOptions` → `TcpSession.ConnectAsync(address, port)` → send `Handshake`.

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry packetRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(packetRegistry);

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;

Handshake handshake = new(0, Csprng.GetBytes(32));

TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
await client.SendAsync(handshake.Serialize());
```

### 🔧 Resilience and events
Listen for `OnMessageReceived`, `OnDisconnected`, and `OnReconnected` while honoring reconnection and event leases.

**Responsibilities**
- Handle pooled leases from `OnMessageReceived` and dispose them when finished.
- Use `OnDisconnected` / `OnReconnected` to alert your UI or retry logic.
- Respect `TransportOptions.ReconnectEnabled` / `ReconnectMaxAttempts` settings so clients automatically retry.

**Key Components**
- `IoTTcpSession.OnMessageReceived` – raises events with pooled `Lease<TPacket>` instances.
- `IoTTcpSession.OnDisconnected` / `OnReconnected` – notify when the transport loses or regains connectivity.
- `RequestExtensions` / `ControlExtensions` – keep RTT in sync and allow request-response flows with timeouts.

**Flow**
- Subscribe to events → dispose leases after processing (`lease.Dispose()`) → rely on `TransportOptions` for retries → call `RequestExtensions` or `ControlExtensions` once stable.

```csharp
client.OnMessageReceived += (sender, lease) =>
{
    try
    {
        Console.WriteLine($"Message {lease.Packet.SequenceId} received");
        // handle packet
    }
    finally
    {
        lease.Dispose();
    }
};
```

!!! note "Retry logic"
    `TransportOptions.ReconnectEnabled = true` plus `ReconnectMaxAttempts` let `IoTTcpSession` stay online. The override in `TransportOptions` defaults (retries unlimited) so manual logic rarely needs to change.
