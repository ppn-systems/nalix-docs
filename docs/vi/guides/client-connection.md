# 🛠 Kết nối client

Kết nối, handshake, ping và request.

### 🔧 Chuẩn bị options
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;
```

### 🔧 Kết nối + handshake
```csharp
TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);

Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Ping
```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

### 🔧 Request
```csharp
Control ctrl = client.NewControl(3, ControlType.PING).WithSeq(42).Build();
Control reply = await RequestExtensions.RequestAsync<Control>(
    client,
    ctrl,
    RequestOptions.Default,
    p => p.Type == ControlType.PONG);
```
