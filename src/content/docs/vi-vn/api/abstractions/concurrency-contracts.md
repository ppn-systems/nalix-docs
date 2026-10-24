---
title: Hợp đồng đồng thời
description: Hợp đồng worker nền và tác vụ định kỳ trong Nalix.Abstractions.Concurrency, gồm ITaskManager, IWorker, WorkerAttribute, IWorkerHandle, IWorkerContext và IRecurringHandle.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Concurrency`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Concurrency` định nghĩa các hợp đồng để lên lịch, giám sát và hủy các worker chạy lâu cùng công việc định kỳ do `TaskManager` trong `Nalix.Framework.Tasks` quản lý.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Concurrency/ITaskManager.cs`
- `src/Nalix.Abstractions/Concurrency/IWorker.cs`
- `src/Nalix.Abstractions/Concurrency/WorkerAttribute.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerHandle.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerContext.cs`
- `src/Nalix.Abstractions/Concurrency/IRecurringHandle.cs`
- `src/Nalix.Abstractions/Concurrency/IWorkerOptions.cs`
- `src/Nalix.Abstractions/Concurrency/IRecurringOptions.cs`

## Tổng quan thành phần công khai

| Kiểu | Thành phần công khai |
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

Bạn có thể lên lịch công việc nền bằng delegate, hoặc bằng cách triển khai `IWorker` và gắn attribute `[Worker(name, group)]` lên class:

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

Lên lịch và hủy qua `ITaskManager`:

```csharp
IWorkerHandle handle = taskManager.ScheduleWorker(new SessionCleanupWorker());
// Hủy theo Snowflake ID của worker:
taskManager.CancelWorker(handle.Id);
```

## `IWorkerContext`

Được truyền vào mỗi lần thực thi worker để tác vụ báo cáo trạng thái còn hoạt động (`Beat()`) và tiến độ (`Advance(delta, note)`):

- `ISnowflake Id { get; }` — Snowflake identifier duy nhất của lần chạy worker.
- `string Name { get; }` — Tên worker.
- `string Group { get; }` — Tên nhóm worker.
- `bool IsCancellationRequested { get; }` — Phản ánh việc hủy từ `CancelWorker`, `CancelGroup` hoặc `ExecutionTimeout`.
- `void Beat()` — Cập nhật `LastHeartbeatUtc`.
- `void Advance(long delta, string? note = null)` — Tăng `Progress` (`long`) và cập nhật `LastNote`.

## API liên quan

- [Trình quản lý tác vụ (Nalix.Framework.Tasks)](../framework/task-manager.md)
- [Tùy chọn worker](../framework/options/worker-options.md)
- [Tùy chọn định kỳ](../framework/options/recurring-options.md)
