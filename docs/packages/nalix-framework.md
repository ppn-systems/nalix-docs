# Nalix.Framework

`Nalix.Framework` provides shared runtime services for configuration, instance registration, scheduling, IDs, and time helpers.

## What belongs here

- `ConfigurationManager` for loading and reloading typed options from INI files
- `InstanceManager` for registering or creating shared singleton-like services
- `TaskManager` for background workers and recurring jobs
- `Snowflake` for generated IDs
- `Clock` and `TimingScope` for monotonic timing and lightweight latency measurement

## Configuration

`ConfigurationManager` is the entry point for typed options. It loads `ConfigurationLoader` classes, caches them, and can hot-reload when the watched INI file changes.

### Quick example

```csharp
ConnectionHubOptions hub = ConfigurationManager.Instance.Get<ConnectionHubOptions>();
TaskManagerOptions taskOptions = ConfigurationManager.Instance.Get<TaskManagerOptions>();
```

Use it when you want one shared config source across packages.

## Instance registration

`InstanceManager` is the common registry used across the stack. It can register existing instances or lazily create new ones.

### Quick example

```csharp
InstanceManager.Instance.Register<ILogger>(logger);

TaskManager taskManager = InstanceManager.Instance.GetOrCreateInstance<TaskManager>();
IPacketRegistry registry = InstanceManager.Instance.GetOrCreateInstance<PacketRegistryFactory>()
                                                   .CreateCatalog();
```

This is the normal place to publish infrastructure such as loggers, packet registries, and shared services.

## Background work

`TaskManager` is not just a timer helper. It manages:

- named workers
- recurring jobs
- cancellation by ID or group
- group concurrency limits
- execution reporting

### Quick example

```csharp
TaskManager manager = InstanceManager.Instance.GetOrCreateInstance<TaskManager>();

manager.ScheduleRecurring(
    "session.cleanup",
    System.TimeSpan.FromSeconds(30),
    async ct => await CleanupExpiredSessionsAsync(ct));
```

For long-running server processes, this is the preferred place for cleanup loops and maintenance work.

## Time and IDs

Use:

- `Clock` when you need monotonic timestamps or Unix time
- `TimingScope` when you need cheap elapsed-time measurement
- `Snowflake` when you need compact sortable IDs

`TimeSynchronizer` is part of `Nalix.Network`, not `Nalix.Framework`.

## When to add this package

- Add it on the server when you use `ConfigurationManager`, `InstanceManager`, or `TaskManager`.
- Add it on the client only if you want the same config and service-registration model there too.

## Key API pages

- [Configuration and DI](../api/framework/configuration.md)
- [Task Manager](../api/framework/task-manager.md)
- [Clock](../api/framework/clock.md)
- [Timing Scope](../api/framework/timing-scope.md)
- [Snowflake](../api/framework/snowflake.md)
