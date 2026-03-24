# 📦 Nalix.SDK

Client transport, helpers, and localization live here.

### 🔧 What it provides
Use the SDK to open sessions and run request-response flows.

**Responsibilities**
- Provide client sessions.
- Validate transport options.
- Offer helper extensions for common flows.

**Key Components**
- `IoTTcpSession`
- `TcpSession`
- `TransportOptions`
- `ControlExtensions`
- `RequestExtensions`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;

IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
```

### 🔧 Request helpers
Helpers register awaiters before sending packets.

**Responsibilities**
- Ping the remote endpoint.
- Send a request with a typed response.

**Key Components**
- `ControlExtensions`
- `RequestExtensions`
- `RequestOptions`

```csharp
await ControlExtensions.PingAsync(client, CancellationToken.None);
```

```csharp
Control ctrl = client.NewControl(3, ControlType.PING).WithSeq(7).Build();
Control response = await RequestExtensions.RequestAsync<Control>(
    client,
    ctrl,
    RequestOptions.Default,
    p => p.Type == ControlType.PONG);
```

### 🔧 Localization utilities
Localization and format helpers stay aligned with runtime configuration.

**Responsibilities**
- Load localized strings.
- Apply consistent formats.

**Key Components**
- `Localizer`
- `MultiLocalizer`
- `Formats`

```csharp
string message = Localizer.Get("errors.network.timeout");
string plural = MultiLocalizer.GetPlural("users.online", 3);
```
