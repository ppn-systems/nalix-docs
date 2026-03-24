# Nalix.Logging

`Nalix.Logging` delivers structured logs, targets, and distributor plumbing that every package resolves through `ILogger`.

### 🔧 Logging responsibilities
Bootstrapping logging early keeps middleware, listeners, and SDK clients consistent.

**Responsibilities**
- Provide the default `ILogger` implementation (`NLogix`) used across listeners, dispatchers, and SDK transports.
- Expose configuration (`NLogixOptions`, `FileLogOptions`) so teams can route logs to files, consoles, or sinks.
- Allow `ILoggerTarget` implementations to register with `ILogDistributor` so high-throughput scenarios stay batched and safe.

**Key Components**
- `NLogix` – high-performance logger (extends `NLogixEngine`) that exposes `ILogger`.
- `NLogix.Host` – host entry point that exposes `ILogger` for registration via `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance)`.
- `NLogixOptions` / `FileLogOptions` – configuration POCOs that control levels, timestamp formats, and file rotation.
- `ILogDistributor` / `ILoggerTarget` – distributor that fans log entries to registered targets.
- `NLogixEngine` – underlying engine publishing structured logs with sanitization and event IDs.

**Flow**
- Register `ILogger` early via `InstanceManager` → configure `NLogixOptions`/`FileLogOptions` → log from listeners, middleware, and SDK transports with the same `ILogger` instance.

### 🔧 Configuration & targets
`NLogixOptions` exposes a fluent API to set timestamp formats, register targets, and control concurrency limits.

**Responsibilities**
- Set the minimum log level, timestamp format, and metadata (process ID, machine name).
- Set the `ILogDistributor` (pipeline of `ILoggerTarget` values) and register targets before producing logs.
- Configure file targets, concurrency limits, and timestamp granularity via `FileLogOptions`.

**Key Components**
- `NLogixOptions.SetPublisher()` – sets the distributor used for publishing entries.
- `NLogixOptions.RegisterTarget()` – adds additional `ILoggerTarget` instances (console, file, remote).
- `FileLogOptions` – drives file rotation and path settings consumed by attached targets.
- `NLogixOptions.ConfigureFileOptions(...)` – exposes `FileLogOptions` for inline configuration while preserving thread safety.

**Flow**
- Build `NLogixOptions` → register targets via `RegisterTarget()` → call `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance)` → start logging via `ILogger`.

```csharp
public NLogixOptions RegisterTarget(ILoggerTarget target)
{
    System.ArgumentNullException.ThrowIfNull(target);
    System.ObjectDisposedException.ThrowIf(System.Threading.Interlocked
                                  .CompareExchange(ref _disposed, 0, 0) != 0, nameof(NLogixOptions));
    _ = Publisher?.RegisterTarget(target);
    return this;
}
```

!!! warning "Dispose after registration"
    Once you call `NLogixOptions.Dispose()`, the configured distributor is released. Do not reuse the disposed options instance to register additional targets.
