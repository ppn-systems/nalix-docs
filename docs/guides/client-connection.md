# 🛠 Client Connection

Connect, handshake, and run a simple request flow.

### 🔧 Prepare options
Load options before creating the session.

**Responsibilities**
- Read `TransportOptions`.
- Set address and port.

**Key Components**
- `TransportOptions`
- `ConfigurationManager`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;
```

### 🔧 Connect and handshake
Open a session and send the shared secret.

**Responsibilities**
- Connect the session.
- Send `Handshake`.

**Key Components**
- `TcpSession`
- `Handshake`
- `Csprng`

```csharp
TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);

Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Ping the server
Use control helpers to verify latency.

**Responsibilities**
- Send a ping request.
- Confirm the channel is stable.

**Key Components**
- `ControlExtensions`

```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

### 🔧 Request-response
Send a request and wait for a typed response.

**Responsibilities**
- Send a request packet.
- Await the response.

**Key Components**
- `RequestExtensions`

```csharp
Control ctrl = client.NewControl(3, ControlType.PING).WithSeq(42).Build();
Control response = await RequestExtensions.RequestAsync<Control>(
    client,
    ctrl,
    RequestOptions.Default,
    p => p.Type == ControlType.PONG);
```
