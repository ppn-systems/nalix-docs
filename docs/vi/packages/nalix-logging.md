# 📦 Nalix.Logging

Logging cấu trúc và target dùng chung.

### 🔧 Khởi tạo
```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
```

### 🔧 Target
```csharp
NLogixOptions options = new();
ILoggerTarget target = /* custom target */;
options.RegisterTarget(target);
```
