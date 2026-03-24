# Nalix.Framework

`Nalix.Framework` is the shared infrastructure layer: configuration binding, dependency injection, time synchronization, and scheduled work. It keeps the runtime deterministic and reusable so the `Nalix.Network` listener and `Nalix.SDK` client layers stay lightweight.

## Highlights

- `InstanceManager` acts as a trimmed dependency container optimized for real-time services. It caches activated instances, tracks disposables, and exposes `IsTheOnlyInstance` via a named mutex so you can guard singleton scenarios.
- `ConfigurationManager` binds POCOs such as `TransportOptions`, `NetworkSocketOptions`, `TaskManagerOptions`, and `WorkerOptions` from INI and environment sources, then validates them for correctness.
- `TaskManager` schedules both worker tasks and recurring jobs. It enforces the global concurrency limit (`SemaphoreSlim`), tracks execution metrics, and exposes `ScheduleWorker`/`ScheduleRecurring` for background work.
- `TimeSynchronizer` updates the global clock used by `ControlExtensions.PingAsync`, while `Snowflake`/`Identifiers` generate unique IDs for connections, workers, and packets.

### Common usage

```csharp
InstanceManager.Instance.GetOrCreateInstance<TaskManager>();
ConfigurationManager.Instance.Get<TransportOptions>().Validate();
```

Use `WorkerOptions` to decorate scheduled jobs (timeouts, retention, group caps) and rely on `RecurringOptions` when you need timed work aligned with the global clock.
