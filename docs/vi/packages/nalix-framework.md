# 📦 Nalix.Framework

Cấu hình, registry dịch vụ, scheduler và đồng bộ thời gian.

### 🔧 Registry
```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```

### 🔧 Cấu hình
```csharp
TransportOptions transport = ConfigurationManager.Instance.Get<TransportOptions>();
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
```

### 🔧 Scheduler
- `TaskManager` + `WorkerOptions` để lập lịch tác vụ nền.
