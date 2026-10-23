---
title: WorkerOptions
description: Reference for Nalix.Framework.Options.WorkerOptions — per-worker priority, group concurrency limits, retention, OS thread priority, and CPU core affinity.
section: API Reference
package: Nalix.Framework
---

**Namespace:** `Nalix.Framework.Options`  
**Assembly:** `Nalix.Framework`

`WorkerOptions` (`public sealed class WorkerOptions : IWorkerOptions`) configures per-worker scheduling priority, group concurrency gating, post-completion retention, OS thread priority, and CPU core affinity in `TaskManager.ScheduleWorker`.

## Source Mapping

- `src/Nalix.Abstractions/Concurrency/IWorkerOptions.cs`
- `src/Nalix.Framework/Options/WorkerOptions.cs`
- `src/Nalix.Framework/Tasks/TaskManager.Affinity.cs`

## Public Properties

| Property | Type | Access | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `Tag` | `string?` | `get; set;` | `null` | Optional diagnostic tag for grouping or filtering the worker in reports. |
| `MachineId` | `ushort` | `get; set;` | `1` | 10-bit machine ID embedded in the worker's `ISnowflake` identifier. |
| `IdType` | `SnowflakeType` | `get; set;` | `SnowflakeType.System` | `SnowflakeType` embedded in the worker's `ISnowflake` identifier. |
| `Priority` | `WorkerPriority` | `get; set;` | `WorkerPriority.NORMAL` | Queue priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`) when waiting for a concurrency slot. |
| `ExecutionTimeout` | `TimeSpan?` | `get;` | `null` | Optional execution timeout budget (read via `IWorkerOptions.ExecutionTimeout`). |
| `RetainFor` | `TimeSpan?` | `get; set;` | `2 min` (`TimeSpan.FromMinutes(2)`) | Duration finished workers remain in `TaskManager` for diagnostic inspection (`null` or `TimeSpan.Zero` removes immediately on completion). |
| `GroupConcurrencyLimit` | `int?` | `get; set;` | `null` | Optional maximum concurrent workers allowed in the worker's `group`. |
| `TryAcquireSlotImmediately` | `bool` | `get; set;` | `false` | When `true`, cancels the worker immediately if a group/global slot is not available instead of queuing. |
| `CancellationToken` | `CancellationToken` | `get; set;` | `CancellationToken.None` | External cancellation token linked into the worker's internal `CancellationTokenSource`. |
| `OnCompleted` | `Action<IWorkerHandle>?` | `get; set;` | `null` | Callback invoked when the worker finishes without throwing an exception. |
| `OnFailed` | `Action<IWorkerHandle, Exception>?` | `get; set;` | `null` | Callback invoked when the worker faults with an unhandled exception. |
| `OSPriority` | `ThreadPriority?` | `get; set;` | `null` | Optional OS thread priority. When set, `TaskManager` runs the worker on a dedicated thread instead of the `ThreadPool`. |
| `ProcessorAffinity` | `int?` | `get; set;` | `null` | Optional 0-based CPU core index for thread affinity (applied on Windows and Linux when `OSPriority` is also set). |

## Usage Example

```csharp
using System;
using System.Threading;
using Nalix.Abstractions.Concurrency;
using Nalix.Abstractions.Identity;
using Nalix.Framework.Options;

WorkerOptions options = new()
{
    Tag = "wal-flush",
    MachineId = 1,
    IdType = SnowflakeType.System,
    Priority = WorkerPriority.HIGH,
    GroupConcurrencyLimit = 1,
    TryAcquireSlotImmediately = false,
    RetainFor = TimeSpan.FromMinutes(5),
    OSPriority = ThreadPriority.AboveNormal,
    ProcessorAffinity = 0
};
```

## Related APIs

- [Task Manager](../task-manager.md)
- [RecurringOptions](./recurring-options.md)
- [Concurrency Contracts (IWorkerOptions, WorkerAttribute)](../../abstractions/concurrency-contracts.md)
