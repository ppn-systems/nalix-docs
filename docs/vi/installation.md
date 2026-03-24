# 🚀 Cài đặt

Chọn gói đúng nhu cầu và giữ cấu hình trong `default.ini`.

### 🔧 Client
```bash
dotnet add package Nalix.SDK
```

### 🔧 Server
```bash
dotnet add package Nalix.Network
dotnet add package Nalix.Framework
dotnet add package Nalix.Logging
dotnet add package Nalix.Common
```

### 🔧 Tệp cấu hình
```ini
[NetworkSocketOptions]
Port=57206

[TransportOptions]
ConnectTimeoutMillis=7000
MaxPacketSize=65536
```
