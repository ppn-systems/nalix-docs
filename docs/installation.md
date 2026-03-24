# Installation

Nalix ships as focused packages so you can keep the runtime surface small. Pick the building blocks you need and mount the shared configuration that every package reads.

### 🔧 Package Matrix
A lean installation pulls in only the packages needed for your scenario: SDK-only clients, listener-only hosts, or full-duplex services.

**Responsibilities**
- Keep the SDK surface (`Nalix.SDK`) focused on clients and helper transports while letting hosts reference only `Nalix.Network`, `Nalix.Common`, `Nalix.Logging`, and `Nalix.Framework`.
- Expose logging and packet metadata early so both listeners and SDK clients reuse the same `ILogger`, `IPacketRegistry`, and `PacketRegistryFactory` instances.
- Let middleware, networking, and configuration live in dedicated assemblies so CI pipelines can test each layer independently.

**Key Components**
- `Nalix.SDK` – `IoTTcpSession`, `TcpSession`, `RequestExtensions`, `TransportOptions`, and `ControlExtensions`.
- `Nalix.Network` – `TcpListenerBase`, `AutoXListener`, `PacketDispatchChannel`, `ConnectionHub`, `PacketDispatchOptions`, and `PacketSender`.
- `Nalix.Common` – `IPacket`, `IConnection`, `PacketControllerAttribute`, `PacketOpcodeAttribute`, and `MiddlewarePipeline<TPacket>`.
- `Nalix.Logging` – `NLogix`, `NLogixOptions`, `FileLogOptions`, and `NLogix.Host`.
- `Nalix.Framework` – `InstanceManager`, `ConfigurationManager`, `TaskManager`, `WorkerOptions`, and `TimeSynchronizer`.

**Flow**
- Choose the packages for your binary → register `ILogger`/`IPacketRegistry` via `InstanceManager.Instance.Register` → start `PacketDispatchChannel`/`TcpListenerBase` or `IoTTcpSession`.

### 🔧 Configuration surface
Nalix keys every behavior off the `ConfigurationManager`-backed POCOs in `default.ini`. Update the sections that matter for your role and let the watcher reload values in production.

**Responsibilities**
- Bundle every option class with sensible defaults so you can override only a few values per environment.
- Validate options early (`TransportOptions.Validate()`, `NetworkSocketOptions.Validate()`, `TaskManagerOptions.Validate()`, `ConnectionHubOptions.Validate()`).
- Keep logging, randomness, and threading consistent by reading the same watchers from both clients and listeners.

**Key Components**
- `TransportOptions` – reconnection policy, retries, heartbeat, compression thresholds, and `CipherSuiteType` choices.
- `NetworkSocketOptions` – listener port, backlog, buffer size, keep-alive, `ReuseAddress`, `ProcessChannelCapacity`, and thread-pool tuning.
- `ConnectionHubOptions` – shard count, `MaxConnections`, `DropPolicy`, `BroadcastBatchSize`, and cleanup behavior for `ConnectionHub`.
- `TaskManagerOptions` – concurrency limits, CPU thresholds, cleanup interval, and latency measurement for `TaskManager`.
- `NLogixOptions` – log level, timestamp format, `FileLogOptions`, and registered `ILoggerTarget` implementations.

**Flow**
- Drop `default.ini` next to the configuration directory → edit the sections you care about → restart the application so `ConfigurationManager` reloads the file.

```ini
[NetworkSocketOptions]
Port=57206
Backlog=512
BufferSize=4096
EnableTimeout=true
MaxParallel=5
ProcessChannelCapacity=128

[TransportOptions]
Address=127.0.0.1
Port=57206
ReconnectEnabled=true
ReconnectMaxAttempts=0
MaxPacketSize=65536
EnableCompression=true
Cipher=CHACHA20_POLY1305

[ConnectionHubOptions]
MaxConnections=-1
DropPolicy=DROP_NEWEST
ShardCount=8
BroadcastBatchSize=0

[TaskManagerOptions]
MaxWorkers=100
CleanupInterval=00:00:30
DynamicAdjustmentEnabled=true

[NLogixOptions]
MinLevel=Info
TimestampFormat=yyyy-MM-dd HH:mm:ss.fff
IncludeProcessId=true
GroupConcurrencyLimit=3
```

!!! warning "Logger must be registered first"
    `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance)` must run before `PacketDispatchChannel` or `TcpListenerBase` constructs so logging calls resolve and `PacketDispatchChannel` can attach the logger it logs through.

!!! note "Config watcher behavior"
    `ConfigurationManager` holds a watcher that debounces `FileSystemWatcher` events (300 ms) before calling `ReloadAll`. Call `SetConfigFilePath` if you move the file and expect the watcher to follow.
