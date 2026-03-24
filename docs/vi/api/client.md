# 🔌 API Client

Kết nối, handshake và request helper.

### 🔧 Kết nối
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
```

### 🔧 Handshake
```csharp
Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Request
```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);

RequestOptions opts = RequestOptions.Default.WithTimeout(3000);
var (rtt, pong) = await ControlExtensions.PingAsync(
    client,
    opCode: 3,
    timeoutMs: opts.TimeoutMs,
    syncClock: true,
    ct: CancellationToken.None);
```
