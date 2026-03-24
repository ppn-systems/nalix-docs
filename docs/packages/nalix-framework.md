# 📦 Nalix.Framework

Configuration, service registry, scheduling, and time synchronization.

### 🔧 Instance management
Use a single registry for shared services.

**Responsibilities**
- Register services once.
- Retrieve existing instances safely.

**Key Components**
- `InstanceManager`
- `ILogger`
- `IPacketRegistry`

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```

### 🔧 Configuration management
Configuration is loaded from `default.ini`.

**Responsibilities**
- Load options on startup.
- Share options across packages.

**Key Components**
- `ConfigurationManager`
- `TransportOptions`
- `NetworkSocketOptions`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
```

### 🔧 Scheduling and workers
Task scheduling is centralized to keep background work consistent.

**Responsibilities**
- Schedule workers with consistent limits.
- Track worker state.

**Key Components**
- `TaskManager`
- `WorkerOptions`

```csharp
TaskManager manager = InstanceManager.Instance.GetOrCreateInstance<TaskManager>();
WorkerOptions worker = new();
```

### 🔧 Time and IDs
Nalix includes time synchronization and ID generation utilities.

**Responsibilities**
- Keep time in sync for telemetry.
- Generate consistent IDs.

**Key Components**
- `TimeSynchronizer`
- `Clock`
- `Snowflake`
