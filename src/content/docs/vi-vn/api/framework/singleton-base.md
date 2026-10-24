---
title: SingletonBase
description: Tham chiếu cho Nalix.Framework.Injection.DI.SingletonBase<T> và ReportRegistry — hạ tầng singleton generic an toàn đa luồng, tương thích Native AOT.
section: API Reference
package: Nalix.Framework
---

**Không gian tên:** `Nalix.Framework.Injection.DI` (và `Nalix.Framework`)  
**Assembly:** `Nalix.Framework`

`SingletonBase<T>` (`public abstract class SingletonBase<T> : IDisposable where T : class`) là lớp cơ sở singleton generic an toàn đa luồng, tương thích Native AOT, được các dịch vụ framework như `InstanceManager` và `ReportRegistry` sử dụng.

## Ánh xạ mã nguồn

- `src/Nalix.Framework/Injection/DI/SingletonBase.cs`
- `src/Nalix.Framework/Injection/DI/SingletonActivatorCache.cs`
- `src/Nalix.Framework/ReportRegistry.cs`
- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`

## Cách kích hoạt Native AOT hoạt động

Khác với các singleton generic truyền thống dựa vào `Activator.CreateInstance` hoặc `Expression.Compile` lúc chạy, `SingletonBase<T>` phân giải delegate constructor một lần cho mỗi kiểu generic đã đóng, từ `SingletonActivatorCache.GetRequired<T>()`:

1. Lúc biên dịch, `InstanceGenerator` tìm mọi lớp con không abstract của `SingletonBase<T>` (cũng như các class `[Injectable]`) và sinh ra một `[ModuleInitializer]` trong `InstanceActivators.g.cs`, đăng ký một lambda constructor trực tiếp (`static () => new MyService()`) vào `SingletonActivatorCache`.
2. Lúc chạy, `SingletonBase<T>` bọc factory đó trong một `Lazy<T>` được cấu hình với `LazyThreadSafetyMode.ExecutionAndPublication`.

## Các thành viên của `SingletonBase<T>`

| Thành phần | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `Instance` | `public static T Instance { get; }` | Trả về instance singleton, tạo nó ở lần truy cập đầu tiên qua `Lazy<T>`. |
| `IsCreated` | `public static bool IsCreated { get; }` | Trả về `true` nếu instance singleton đã được tạo, mà không buộc tạo. |
| `TryGetInstance` | `public static bool TryGetInstance([MaybeNullWhen(false)] out T instance)` | Trả về `true` và instance hiện có nếu đã được tạo; ngược lại trả về `false` mà không tạo. |
| `EnsureCreated` | `public static void EnsureCreated()` | Buộc tạo sớm instance singleton trong giai đoạn khởi động. |
| `Dispose()` | `public void Dispose()` | Dispose instance singleton (idempotent nhờ `Interlocked.Exchange` nguyên tử). |
| `Dispose(bool)` | `protected virtual void Dispose(bool disposing)` | Gọi `DisposeManaged()` đúng một lần khi `disposing` là `true`. |
| `DisposeManaged()` | `protected virtual void DisposeManaged()` | Ghi đè trong lớp con để giải phóng tài nguyên managed khi dispose. |

## Ví dụ sử dụng

```csharp
using Nalix.Framework.Injection.DI;

public sealed class MetricsAggregator : SingletonBase<MetricsAggregator>
{
    // Constructor internal hoặc public không tham số được ModuleInitializer của InstanceGenerator gọi
    internal MetricsAggregator()
    {
    }

    protected override void DisposeManaged()
    {
        // Dọn dẹp tài nguyên managed
    }
}

// Khởi động sớm khi ứng dụng bắt đầu
MetricsAggregator.EnsureCreated();

// Truy cập ở bất kỳ đâu
MetricsAggregator aggregator = MetricsAggregator.Instance;
```

## `ReportRegistry` (`Nalix.Framework.ReportRegistry`)

`ReportRegistry` (`public sealed class ReportRegistry : SingletonBase<ReportRegistry>, IReportable`) là registry chẩn đoán an toàn đa luồng, ánh xạ các cặp `(Enum Key, Type Type)` tới các instance thành phần `IReportable`. `InstanceManager` tự động đăng ký các dịch vụ `IReportable` `CoreTelemetryTarget` tích hợp sẵn (`ITaskManager`, `IConnectionHub`, `IBufferPoolManager`, `IObjectPoolManager`, `ISessionService`, v.v.) vào `ReportRegistry.Instance`. Các dịch vụ `IReportable` của ứng dụng tùy chỉnh nên gọi trực tiếp `ReportRegistry.Instance.Register(key, instance)`:

- `void Register<T>(Enum key, T instance) where T : class, IReportable` — Đăng ký `instance` dưới `(key, typeof(T))`, `(key, instance.GetType())`, và mọi interface `IReportable` mà nó triển khai.
- `T? Get<T>(Enum key) where T : class, IReportable` — Lấy thành phần reportable đã đăng ký theo enum key và kiểu.
- `bool Unregister<T>(Enum key) where T : class, IReportable` — Gỡ đăng ký cho `key` và `typeof(T)`.
- `void Clear()` — Xóa mọi đăng ký.
- `string GenerateReport()` / `void WriteReportData(Utf8JsonWriter writer)` / `void WriteReportData<T>(Utf8JsonWriter writer)` — Tổng hợp báo cáo dạng văn bản hoặc JSON có cấu trúc từ mọi thành phần đã đăng ký.

## API liên quan

- [Trình quản lý Instance (DI)](./instance-manager.md)
- [Instance Generator](../analyzers/autogen/instance-generator.md)
- [Trình quản lý tác vụ](./task-manager.md)
