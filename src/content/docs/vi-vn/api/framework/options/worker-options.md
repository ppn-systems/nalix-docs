---
title: WorkerOptions
description: Tham chiếu cho Nalix.Framework.Options.WorkerOptions — độ ưu tiên theo worker, giới hạn đồng thời theo nhóm, thời gian giữ lại, độ ưu tiên luồng HĐH và ghim lõi CPU.
section: API Reference
package: Nalix.Framework
---

**Không gian tên:** `Nalix.Framework.Options`  
**Assembly:** `Nalix.Framework`

`WorkerOptions` (`public sealed class WorkerOptions : IWorkerOptions`) cấu hình độ ưu tiên lập lịch theo worker, kiểm soát đồng thời theo nhóm, thời gian giữ lại sau khi hoàn thành, độ ưu tiên luồng HĐH và gắn lõi CPU trong `TaskManager.ScheduleWorker`.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Concurrency/IWorkerOptions.cs`
- `src/Nalix.Framework/Options/WorkerOptions.cs`
- `src/Nalix.Framework/Tasks/TaskManager.Affinity.cs`

## Thuộc tính công khai

| Thuộc tính | Kiểu | Truy cập | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `Tag` | `string?` | `get; set;` | `null` | Thẻ chẩn đoán tùy chọn để nhóm hoặc lọc worker trong báo cáo. |
| `MachineId` | `ushort` | `get; set;` | `1` | Machine ID 10-bit được nhúng vào định danh `ISnowflake` của worker. |
| `IdType` | `SnowflakeType` | `get; set;` | `SnowflakeType.System` | `SnowflakeType` được nhúng vào định danh `ISnowflake` của worker. |
| `Priority` | `WorkerPriority` | `get; set;` | `WorkerPriority.NORMAL` | Độ ưu tiên hàng đợi (`LOW`, `NORMAL`, `HIGH`, `URGENT`) khi chờ một slot đồng thời. |
| `ExecutionTimeout` | `TimeSpan?` | `get;` | `null` | Ngân sách timeout thực thi tùy chọn (đọc qua `IWorkerOptions.ExecutionTimeout`). |
| `RetainFor` | `TimeSpan?` | `get; set;` | `2 min` (`TimeSpan.FromMinutes(2)`) | Thời gian các worker đã kết thúc còn nằm trong `TaskManager` để kiểm tra chẩn đoán (`null` hoặc `TimeSpan.Zero` sẽ xóa ngay khi hoàn thành). |
| `GroupConcurrencyLimit` | `int?` | `get; set;` | `null` | Số worker đồng thời tối đa được phép trong `group` của worker (tùy chọn). |
| `TryAcquireSlotImmediately` | `bool` | `get; set;` | `false` | Khi `true`, hủy worker ngay nếu không có slot nhóm/toàn cục, thay vì xếp hàng chờ. |
| `CancellationToken` | `CancellationToken` | `get; set;` | `CancellationToken.None` | Token hủy bên ngoài, được liên kết vào `CancellationTokenSource` nội bộ của worker. |
| `OnCompleted` | `Action<IWorkerHandle>?` | `get; set;` | `null` | Callback được gọi khi worker kết thúc mà không ném ngoại lệ. |
| `OnFailed` | `Action<IWorkerHandle, Exception>?` | `get; set;` | `null` | Callback được gọi khi worker lỗi do ngoại lệ không được xử lý. |
| `OSPriority` | `ThreadPriority?` | `get; set;` | `null` | Độ ưu tiên luồng HĐH tùy chọn. Khi được đặt, `TaskManager` chạy worker trên một luồng riêng thay vì `ThreadPool`. |
| `ProcessorAffinity` | `int?` | `get; set;` | `null` | Chỉ số lõi CPU tùy chọn (bắt đầu từ 0) để gắn luồng (áp dụng trên Windows và Linux khi `OSPriority` cũng được đặt). |

## Ví dụ sử dụng

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

## API liên quan

- [Trình quản lý tác vụ](../task-manager.md)
- [RecurringOptions](./recurring-options.md)
- [Hợp đồng Concurrency (IWorkerOptions, WorkerAttribute)](../../abstractions/concurrency-contracts.md)
