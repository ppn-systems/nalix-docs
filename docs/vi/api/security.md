# 🔌 Bảo mật & chính sách

Chọn cipher, backpressure và timeout.

### 🔧 Cipher
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Algorithm = CipherSuiteType.CHACHA20_POLY1305;
```

### 🔧 Drop policy
```csharp
ConnectionHubOptions hub = ConfigurationManager.Instance.Get<ConnectionHubOptions>();
hub.DropPolicy = DropPolicy.DROP_OLDEST;
```

### 🔧 Timeout
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.ConnectTimeoutMillis = 7000;
```
