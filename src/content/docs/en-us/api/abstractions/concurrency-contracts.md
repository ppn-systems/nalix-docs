---
title: Concurrency Contracts
description: Background worker and recurring task contracts in Nalix.Abstractions.Concurrency including ITaskManager, IWorker, WorkerAttribute, IWorkerHandle, IWorkerContext, and IRecurringHandle.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Concurrency`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Concurrency` defines the contracts for scheduling, monitoring, and cancelling long-running workers and recurring jobs managed by `TaskManager` in `Nalix.Framework.Tasks`.

## Source Mapping

- `src/Nalix.Abstractions/Concurrency/ITaskManager.cs`
- `src/Nalix.Abstractions/Concurrency/IWorker.cs`
- `src/Nalix.Abstractions/Concurrency/WorkerAttribute.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerHandle.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerContext.cs`
- `src/Nalix.Abstractions/Concurrency/IRecurringHandle.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerOptions.cs`
- `src/Nalix.Abstractions/Concurrency/IRecurringOptions.cs`

## Public Members at a Glance

| Type | Public Members |
| --- | --- |
| `ITaskManager` | `Title`, `ConcurrencyLimitRatio`, `ScheduleWorker(...)`, `ScheduleWorker<TState>(...)`, `ScheduleWorker(IWorker)`, `ScheduleRecurring(...)`, `RunOnceAsync(...)`, `CancelAllWorkers()`, `CancelWorker(ISnowflake)`, `CancelGroup(string)`, `CancelRecurring(string)`, `GetWorkers(...)`, `TryGetWorker(...)`, `GetRecurring()`, `TryGetRecurring(...)`, `WaitGroupAsync(...)` |
| `IWorker` | `ValueTask ExecuteAsync(IWorkerContext context, CancellationToken cancellationToken = default)` |
| `WorkerAttribute` | `WorkerAttribute(string name, string group)`, `Name`, `Group`, `Tag`, `int Priority`, `IdType`, `RetainForMs`, `GroupConcurrencyLimit`, `Enabled`, `ProcessorAffinity` |
| `IWorkerContext` | `ISnowflake Id`, `string Name`, `string Group`, `bool IsCancellationRequested`, `void Beat()`, `void Advance(long delta, string? note = null)` |
| `IWorkerHandle : IDisposable` | `ISnowflake Id`, `string Name`, `string Group`, `long TotalRuns`, `long Progress`, `string? LastNote`, `IWorkerOptions Options`, `bool IsRunning`, `DateTimeOffset StartedUtc`, `DateTimeOffset? LastHeartbeatUtc` |
| `IRecurringHandle : IDisposable` | `string Name`, `long TotalRuns`, `bool IsRunning`, `bool IsPaused`, `TimeSpan Interval`, `IRecurringOptions Options`, `int ConsecutiveFailures`, `DateTimeOffset? LastRunUtc`, `DateTimeOffset? NextRunUtc` |
| `IWorkerOptions` | `Tag`, `MachineId`, `IdType`, `Priority`, `OnCompleted`, `OnFailed`, `ExecutionTimeout`, `RetainFor`, `GroupConcurrencyLimit`, `TryAcquireSlotImmediately`, `CancellationToken`, `OSPriority`, `ProcessorAffinity` |
| `IRecurringOptions` | `Tag`, `Jitter`, `BackoffCap`, `ExecutionTimeout`, `NonReentrant`, `FailuresBeforeBackoff` |

## `ITaskManager` & `IWorker`

You can schedule background work either with a delegate or by implementing `IWorker` and decorating the class with `[Worker(name, group)]`:

```csharp
using System.Threading;
using System.Threading.Tasks;
using Nalix.Abstractions.Concurrency;

[Worker("session.cleanup", "maintenance", Priority = (int)WorkerPriority.LOW, GroupConcurrencyLimit = 1)]
public sealed class SessionCleanupWorker : IWorker
{
    public async ValueTask ExecuteAsync(IWorkerContext context, CancellationToken cancellationToken = default)
    {
        context.Beat();
        context.Advance(100, "Cleanup completed");
        await ValueTask.CompletedTask;
    }
}
```

Scheduling and cancelling via `ITaskManager`:

```csharp
IWorkerHandle handle = taskManager.ScheduleWorker(new SessionCleanupWorker());
// Cancel by worker Snowflake ID:
taskManager.CancelWorker(handle.Id);
```

## `IWorkerContext`

Passed into every worker execution so the task can report liveness (`Beat()`) and progress (`Advance(delta, note)`):

- `ISnowflake Id { get; }` — Unique Snowflake identifier of the worker run.
- `string Name { get; }` — Worker name.
- `string Group { get; }` — Worker group name.
- `bool IsCancellationRequested { get; }` — Reflects cancellation from `CancelWorker`, `CancelGroup`, or `ExecutionTimeout`.
- `void Beat()` — Updates `LastHeartbeatUtc`.
- `void Advance(long delta, string? note = null)` — Increments `Progress` (`long`) and updates `LastNote`.

## Related APIs

- [Task Manager (Nalix.Framework.Tasks)](../framework/task-manager.md)
- [Worker Options](../framework/options/worker-options.md)
- [Recurring Options](../framework/options/recurring-options.md)
