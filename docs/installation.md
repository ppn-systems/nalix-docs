# Installation

## Runtime components

| Package | Responsibility | Key types |
| --- | --- | --- |
| `Nalix.SDK` | Client helpers, localization, and shared transport configuration for both SDK consumers and host builders. | `IoTTcpSession`, `TcpSessionBase`, `TransportOptions`, `RequestOptions`, `ControlExtensions`, `RequestExtensions`, `Localizer`, `MultiLocalizer` |
| `Nalix.Network` | Core listener loop, protocol dispatch, connection tracking, and middleware pipeline shared by every server application. | `TcpListenerBase`, `Protocol`, `PacketDispatchChannel`, `ConnectionHub`, `ConnectionLimiter`, `NetworkSocketOptions`, `PacketMetadataProviders` |
| `Nalix.Common` | Low-level networking primitives, packet definitions, security enums, and concurrency helpers reused across SDK and listener logic. | `IConnection`, `IPacket`, `PacketContext`, `CipherSuiteType`, `PermissionLevel`, `TimingWheel`, `MiddlewarePipeline<TPacket>` |
| `Nalix.Logging` | Structured logging, sinks, and telemetry distributors that plug into `ILogger` or the hosted logger relay. | `NLogix`, `NLogixOptions`, `NLogixEngine`, `NLogixDistributor` |
| `Nalix.Framework` | Application plumbing: singleton management, configuration binding, scheduled workers, and time synchronization. | `InstanceManager`, `ConfigurationManager`, `TaskManager`, `WorkerOptions`, `TimeSynchronizer`, `Snowflake` |

## Configuration highlights

- `TransportOptions` (SDK) drives client socket tuning, reconnection, heartbeat, compression, and default ciphers. The values are validated by `TransportOptions.Validate()` before any session starts.
- `NetworkSocketOptions` (Network) governs listener buffer pools, timeouts, backlogs, and whether the OS thread pool is tuned at start-up. These values are read in `TcpListenerBase` static constructor.
- `TaskManagerOptions` (Framework) configures worker pool size, cleanup intervals, and dynamic scaling. `TaskManager` reads them during bootstrap and enforces concurrency via `SemaphoreSlim` gates.
- `NLogixOptions` (Logging) controls sink registration, level overrides, and log sanitization before `NLogixEngine` publishes entries.
- `PacketMetadataProviders.Register(...)` (Network) adds attribute-driven handler discovery so that `PacketController` classes like `PingHandlers` are wired into `PacketDispatchChannel`.

### Sample defaults (`default.ini`)

```ini
[NetworkSocketOptions]
Port=12345
Backlog=1024
BufferSize=8192
EnableTimeout=true

[TransportOptions]
Address=127.0.0.1
Port=12345
ReconnectEnabled=true
Cipher=CHACHA20_POLY1305

[TaskManagerOptions]
MaxWorkers=32
CleanupInterval=00:00:30
```

!!! warning "Logger must be registered first"
    `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);` must run before any listener constructs to prevent `NullReferenceException` when the listener logs diagnostics or when middleware chains call `InstanceManager` to resolve the logger.
