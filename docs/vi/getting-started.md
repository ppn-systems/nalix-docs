# 🚀 Bắt đầu

Chuẩn bị cấu hình và dịch vụ chung trước khi mở socket.

### 🔧 Kiểm tra môi trường
- .NET 8+.
- Tệp `default.ini` trong thư mục cấu hình.
- Port khớp `NetworkSocketOptions.Port`.

### 🔧 Cài gói
- Client: `Nalix.SDK`.
- Server: thêm `Nalix.Network`, `Nalix.Framework`, `Nalix.Logging`, `Nalix.Common`.

```bash
dotnet add package Nalix.SDK
```

### 🔧 Tải cấu hình
```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Validate();
```

### 🔧 Đăng ký dịch vụ chung
```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```
