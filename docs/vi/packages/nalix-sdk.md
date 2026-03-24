# 📦 Nalix.SDK

SDK cung cấp transport client, helper và localization.

### 🔧 Kết nối
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
```

### 🔧 Ping & request
```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

```csharp
Control ctrl = client.NewControl(3, ControlType.PING).WithSeq(7).Build();
Control reply = await RequestExtensions.RequestAsync<Control>(
    client,
    ctrl,
    RequestOptions.Default,
    p => p.Type == ControlType.PONG);
```

### 🔧 Đa ngôn ngữ
```csharp
string text = Localizer.Get("errors.network.timeout");
```
