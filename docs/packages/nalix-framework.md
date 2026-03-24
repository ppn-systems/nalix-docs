# Nalix.Framework

`Nalix.Framework` supplies configuration management, dependency injection, scheduling, and time synchronization for every host and SDK consumer.

### 🔧 Framework responsibilities
Keep singletons, configuration, and workers aligned so runtime code observes the same clocks, loggers, and schedulers.

**Responsibilities**
- Provide `InstanceManager` so only one `ILogger`, `IPacketRegistry`, `TaskManager`, and `TimeSynchronizer` exist per process.
- Bind and watch `default.ini` via `ConfigurationManager`, then reload options safely whenever the file changes.
- Schedule background work with `TaskManager`, `WorkerOptions`, and `Snowflake` IDs while respecting CPU thresholds and dynamic concurrency.

**Key Components**
- `InstanceManager` – caches instances by `RuntimeTypeHandle` and exposes `GetOrCreateInstance<T>()`, `Register<T>()`, and `GetExistingInstance<T>()`.
- `ConfigurationManager` – thread-safe singleton that debounces file-watcher events, validates options, and exposes `SetConfigFilePath()` and `Get<T>()`.
- `TaskManager` – schedules workers, monitors CPU, exposes `ScheduleWorker()`, `CancelWorker()`, and tracks errors.
- `TimeSynchronizer` & `Clock` – keep system clocks aligned for ping responses and telemetry.
- `Snowflake` – unique 64-bit IDs assigned to listeners, workers, and connections.

**Flow**
- Register `InstanceManager` services → `ConfigurationManager` loads `default.ini` → `TaskManager` schedules workers → logging and networking share the same scheduler and clock.

### 🔧 Configuration & scheduling
`ConfigurationManager` uses locks and semaphores so reloading or moving the config file is safe, while `TaskManager` gates concurrency with `_globalConcurrencyGate`.

**Responsibilities**
- Use `SetConfigFilePath` to point to a custom INI file and optionally reload already-initialized containers.
- Gate concurrent reloads via `_reloadGate` so hot updates do not race.
- Let `TaskManager.ScheduleWorker` await `_globalConcurrencyGate` before spawning worker tasks.

**Key Components**
- `ConfigurationManager.SetConfigFilePath()` – validates new paths, flushes old files, reloads containers, and updates the file watcher.
- `TaskManager.ScheduleWorker()` – acquires `_globalConcurrencyGate`, assigns a `Snowflake`, creates `WorkerState`, and starts the work via `Task.Run`.
- `WorkerOptions` – exposes tags, retention, cancellation, and group concurrency limits consumed by `TaskManager`.
- `RecurringState` – manages scheduled recurring tasks and their error counts.

**Flow**
- Call `SetConfigFilePath()` → watcher reloads `IniConfig` → `ConfigurationLoader` POCOs reload → `TaskManager` picks up new `TaskManagerOptions`/`WorkerOptions`.

```csharp
[System.Runtime.CompilerServices.MethodImpl(
    System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
public System.Boolean SetConfigFilePath(System.String newConfigFilePath, System.Boolean autoReload = true)
{
    if (System.String.IsNullOrWhiteSpace(newConfigFilePath))
    {
        throw new System.ArgumentException(
            "Configuration file path cannot be null or whitespace.",
            nameof(newConfigFilePath));
    }

    System.String normalizedPath = System.IO.Path.GetFullPath(newConfigFilePath);
    VALIDATE_CONFIG_PATH(normalizedPath);

    if (!_reloadGate.Wait(System.TimeSpan.FromSeconds(5)))
    {
        return false;
    }

    try
    {
        _configLock.EnterWriteLock();
        try
        {
            if (System.String.Equals(_configFilePath, normalizedPath, System.StringComparison.OrdinalIgnoreCase))
            {
                return false; // no-op
            }

            if (_iniFile.IsValueCreated)
            {
                _iniFile.Value.Flush();
            }

            _configFilePath = normalizedPath;
            _iniFile = CREATE_LAZY_INI_CONFIG(_configFilePath);
        }
        finally
        {
            _configLock.ExitWriteLock();
        }
    }
    finally
    {
        _reloadGate.Release();
    }

    return true;
}
```

!!! note "Gate worker concurrency"
    `TaskManager.ScheduleWorker()` calls `_globalConcurrencyGate.Wait()` before adding a worker. That gate enforces `TaskManagerOptions.MaxWorkers`, so make sure the gate is not starved when scheduling many short-lived tasks.
