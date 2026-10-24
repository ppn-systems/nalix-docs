---
title: RecurringOptions
description: Tham chiếu cho Nalix.Framework.Options.RecurringOptions — cấu hình jitter khi khởi động, chạy không tái nhập, timeout mỗi lần chạy và exponential backoff cho tác vụ định kỳ của TaskManager.
section: API Reference
package: Nalix.Framework
---

**Không gian tên:** `Nalix.Framework.Options`  
**Assembly:** `Nalix.Framework`

`RecurringOptions` (`public sealed class RecurringOptions : IRecurringOptions`) cấu hình chạy không tái nhập, jitter khi khởi động, timeout mỗi lần chạy và exponential backoff khi lỗi cho các tác vụ định kỳ được lập lịch qua `TaskManager.ScheduleRecurring`.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Concurrency/IRecurringOptions.cs`
- `src/Nalix.Framework/Options/RecurringOptions.cs`
- `src/Nalix.Framework/Tasks/TaskManager.PrivateMethods.cs`

## Thuộc tính

| Thuộc tính | Kiểu | Truy cập | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `Tag` | `string?` | `get; set;` | `null` | Thẻ chẩn đoán tùy chọn để nhận diện tác vụ định kỳ trong log và báo cáo. |
| `NonReentrant` | `bool` | `get; set;` | `true` | Khi `true`, ngăn các lần chạy chồng lên nhau của cùng tác vụ định kỳ nếu lần chạy trước vẫn đang thực thi khi tick tiếp theo đến. |
| `Jitter` | `TimeSpan?` | `get; set;` | `TimeSpan.FromMilliseconds(250)` | Độ trễ ngẫu nhiên tùy chọn khi khởi động (`<= TimeSpan.Zero` hoặc `null` sẽ tắt jitter), lấy mẫu qua `Csprng` để tránh hiện tượng đánh thức đồng loạt (thundering herd). |
| `ExecutionTimeout` | `TimeSpan?` | `get; set;` | `null` | Thời lượng tối đa tùy chọn cho một lần gọi; hủy `CancellationToken` liên kết của lần chạy nếu vượt quá. |
| `FailuresBeforeBackoff` | `int` | `get; set;` | `1` | Số ngoại lệ không được xử lý liên tiếp trước khi bắt đầu exponential backoff. |
| `BackoffCap` | `TimeSpan` | `get; set;` | `TimeSpan.FromSeconds(15)` | Giới hạn trên cho độ trễ exponential backoff áp dụng sau các lỗi liên tiếp. |

## Cơ chế backoff khi lỗi & jitter

Khi một tác vụ định kỳ ném ngoại lệ không được xử lý (`ConsecutiveFailures >= FailuresBeforeBackoff`), `TaskManager` tính độ trễ thử lại như sau:

1. **Tăng theo cấp số nhân**: Nhân `TaskManagerOptions.BackoffBaseInterval` (mặc định `1s`) với $2^{\min(\text{ConsecutiveFailures} - \text{FailuresBeforeBackoff},\; \text{BackoffMaxPower})}$ (trong đó `BackoffMaxPower` mặc định là `5`, tức tối đa $32\times$).
2. **Áp dụng giới hạn trên**: Kẹp độ trễ đã tính về `RecurringOptions.BackoffCap` (mặc định `15s`).
3. **Jitter CSPRNG đầy đủ**: Lấy mẫu thời gian ngủ thực tế đều trong khoảng từ `0` đến độ trễ đã kẹp, bằng `Csprng.GetInt32(0, maxDelayMs + 1)`.

## Ví dụ sử dụng

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

## API liên quan

- [Trình quản lý tác vụ](../task-manager.md)
- [WorkerOptions](./worker-options.md)
- [Hợp đồng Concurrency (IRecurringOptions, IRecurringHandle)](../../abstractions/concurrency-contracts.md)
