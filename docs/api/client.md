# 🔌 Client API

SDK-side contracts for connecting, sending handshakes, and running request flows.

### 🔌 Connect sessions
Clients connect with validated transport options.

**Responsibilities**
- Load options.
- Open the session.

**Key Components**
- `IoTTcpSession`
- `TransportOptions`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();

IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
```

### 🤝 Handshake exchange
Send a handshake to align secrets and protocol flags.

**Responsibilities**
- Create handshake data.
- Send it after connect.

**Key Components**
- `Handshake`
- `Csprng`

```csharp
Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔁 Request helpers
Use helpers that register awaiters before sending packets.

**Responsibilities**
- Ping the server.
- Send typed requests with retries.

**Key Components**
- `ControlExtensions.PingAsync`
- `RequestExtensions.RequestAsync`
- `RequestOptions`

```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

```csharp
RequestOptions options = RequestOptions.Default.WithTimeout(3000);
var (rtt, pong) = await ControlExtensions.PingAsync(
    client,
    opCode: 3,
    timeoutMs: options.TimeoutMs,
    syncClock: true,
    ct: CancellationToken.None);

Control request = client.NewControl(4, ControlType.CUSTOM).Build();
Control reply = await RequestExtensions.RequestAsync<Control>(client, request, options);
```

### 🔔 Events and leases
Subscribe to session events and dispose leases.

**Responsibilities**
- Handle message events.
- Dispose leases after use.

**Key Components**
- `IoTTcpSession.OnMessageReceived`
- `Lease<TPacket>`

```csharp
client.OnMessageReceived += (sender, lease) =>
{
    try
    {
        Console.WriteLine($"Packet {lease.Packet.SequenceId}");
    }
    finally
    {
        lease.Dispose();
    }
};
```
