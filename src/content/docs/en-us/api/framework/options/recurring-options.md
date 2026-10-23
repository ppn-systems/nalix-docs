---
title: RecurringOptions
description: Reference for Nalix.Framework.Options.RecurringOptions — startup jitter, non-reentrant execution, per-run timeout, and exponential backoff configuration for TaskManager recurring jobs.
section: API Reference
package: Nalix.Framework
---

**Namespace:** `Nalix.Framework.Options`  
**Assembly:** `Nalix.Framework`

`RecurringOptions` (`public sealed class RecurringOptions : IRecurringOptions`) configures non-reentrant execution, startup jitter, per-run timeout, and failure exponential backoff for recurring jobs scheduled via `TaskManager.ScheduleRecurring`.

## Source Mapping

- `src/Nalix.Abstractions/Concurrency/IRecurringOptions.cs`
- `src/Nalix.Framework/Options/RecurringOptions.cs`
- `src/Nalix.Framework/Tasks/TaskManager.PrivateMethods.cs`

## Properties

| Property | Type | Access | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `Tag` | `string?` | `get; set;` | `null` | Optional diagnostic tag identifying the recurring job in logs and reports. |
| `NonReentrant` | `bool` | `get; set;` | `true` | When `true`, prevents overlapping runs of the same recurring job if a previous run is still executing when the next tick fires. |
| `Jitter` | `TimeSpan?` | `get; set;` | `TimeSpan.FromMilliseconds(250)` | Optional random startup delay (`<= TimeSpan.Zero` or `null` disables jitter) sampled via `Csprng` to prevent thundering-herd wakeups. |
| `ExecutionTimeout` | `TimeSpan?` | `get; set;` | `null` | Optional maximum duration for a single invocation; cancels the run's linked `CancellationToken` if exceeded. |
| `FailuresBeforeBackoff` | `int` | `get; set;` | `1` | Number of consecutive unhandled exceptions before exponential backoff begins. |
| `BackoffCap` | `TimeSpan` | `get; set;` | `TimeSpan.FromSeconds(15)` | Upper bound on the exponential backoff delay applied after consecutive failures. |

## Failure Backoff & Jitter Mechanics

When a recurring job throws an unhandled exception (`ConsecutiveFailures >= FailuresBeforeBackoff`), `TaskManager` computes the retry delay as:

1. **Exponential Growth**: Multiplies `TaskManagerOptions.BackoffBaseInterval` (default `1s`) by $2^{\min(\text{ConsecutiveFailures} - \text{FailuresBeforeBackoff},\; \text{BackoffMaxPower})}$ (where `BackoffMaxPower` defaults to `5`, i.e., up to $32\times$).
2. **Cap Enforcement**: Clamps the computed delay to `RecurringOptions.BackoffCap` (default `15s`).
3. **Full CSPRNG Jitter**: Samples the actual sleep duration uniformly between `0` and the capped delay using `Csprng.GetInt32(0, maxDelayMs + 1)`.

## Usage Example

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
using Nalix.Abstractions.Concurrency;
using Nalix.Framework.Injection;
using Nalix.Framework.Options;

ITaskManager taskManager = InstanceManager.Instance.GetOrCreateInstance<ITaskManager>();

IRecurringHandle handle = taskManager.ScheduleRecurring(
    name: "session.cleanup",
    interval: TimeSpan.FromSeconds(30),
    work: async ct =>
    {
        await Task.Delay(10, ct);
    },
    options: new RecurringOptions
    {
        Tag = "maintenance",
        NonReentrant = true,
        Jitter = TimeSpan.FromMilliseconds(250),
        ExecutionTimeout = TimeSpan.FromSeconds(10),
        FailuresBeforeBackoff = 2,
        BackoffCap = TimeSpan.FromSeconds(30)
    });
```

## Related APIs

- [Task Manager](../task-manager.md)
- [WorkerOptions](./worker-options.md)
- [Concurrency Contracts (IRecurringOptions, IRecurringHandle)](../../abstractions/concurrency-contracts.md)
