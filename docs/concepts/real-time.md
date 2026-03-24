# 🧠 Real-time Engine

Nalix uses shared sessions and packet catalogs to keep traffic consistent across clients and servers.

### 🔧 Connection lifecycle
Connections go from handshake to steady-state messaging.

**Responsibilities**
- Connect a session.
- Send a `Handshake`.
- Keep sockets alive.

**Key Components**
- `IoTTcpSession`
- `TcpSession`
- `Handshake`

**Flow**
- Connect -> send `Handshake` -> start request/response flows.

```csharp
IoTTcpSession client = new();
await client.ConnectAsync("127.0.0.1", 57206);
Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Message delivery
Handlers send replies using the same connection context.

**Responsibilities**
- Read the packet and connection.
- Send a reply through `IConnection`.

**Key Components**
- `PacketContext<TPacket>`
- `IConnection`

```csharp
[PacketOpcode(1)]
public ValueTask HandlePing(Handshake packet, IConnection connection)
    => connection.SendAsync(packet);
```

### 🔧 Request-response helpers
The SDK provides helpers for ping and request flows.

**Responsibilities**
- Ping the remote side.
- Send requests with typed responses.

**Key Components**
- `ControlExtensions`
- `RequestExtensions`

```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

```csharp
Control ctrl = client.NewControl(3, ControlType.PING).WithSeq(123).Build();
Control pong = await RequestExtensions.RequestAsync<Control>(
    client,
    ctrl,
    RequestOptions.Default,
    p => p.Type == ControlType.PONG);
```
