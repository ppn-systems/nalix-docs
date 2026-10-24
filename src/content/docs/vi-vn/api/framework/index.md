---
title: Tham chiếu API Nalix.Framework
description: Tham chiếu cho Nalix.Framework — tiêm phụ thuộc lúc biên dịch (InstanceManager, SingletonBase), lập lịch tác vụ nền (TaskManager), định danh Snowflake 64-bit, và pool đối tượng/bộ đệm.
section: API Reference
package: Nalix.Framework
---

`Nalix.Framework` cung cấp các dịch vụ runtime **Cấp 2** cho hệ sinh thái Nalix, bao gồm tiêm phụ thuộc tương thích Native AOT, quản lý worker nền và tác vụ định kỳ, định danh Snowflake 64-bit, và các trình quản lý bộ nhớ/đối tượng có pool.

## Tiêm phụ thuộc & chẩn đoán (`Nalix.Framework.Injection`)

- [**Trình quản lý Instance (DI)**](./instance-manager.md) — Registry dịch vụ không khóa (lock-free) với cache L1 `[ThreadStatic]` MRU 2 slot, activator `[Injectable]` lúc biên dịch, constructor injection tham lam (`CreateInstanceWithInjection`), và `Lockdown()` sau khi khởi động.
- [**SingletonBase\<T\>**](./singleton-base.md) — Lớp cơ sở singleton generic an toàn đa luồng, dựa trên `Lazy<T>` và các factory `SingletonActivatorCache` lúc biên dịch (`ReportRegistry`, `PacketRegistryFactory`, v.v.).
- **`ReportRegistry` & `ReportExtensions`** (`Nalix.Framework`, `Nalix.Framework.Extensions`) — Registry báo cáo chẩn đoán an toàn đa luồng (`ReportRegistry.Instance.Register<T>(CoreTelemetryTarget, instance)`, `Get<T>(key)`, `GenerateReport()`, `WriteReportData(Utf8JsonWriter)`, và `IReportable.WriteReportData(Utf8JsonWriter)`).
- **`DiagnosticsEvents` & `DiagnosticListenerFactory`** (`Nalix.Environment`, `Nalix.Codec`, `Nalix.Framework`, `Nalix.Network`, `Nalix.Runtime`) — Nguồn `DiagnosticListener` theo từng assembly (`"Environment"`, `"Codec"`, `"Framework"`, `"Network"`, `"Runtime"`) phát ra payload `DiagnosticLog(Tag, Message, Exception)` có cấu trúc (kèm adapter No-Op an toàn cho trình duyệt trên WebAssembly).

## Tác vụ nền & định danh

- [**Trình quản lý tác vụ**](./task-manager.md) — Bộ lập lịch worker nền và tác vụ định kỳ nhiều cổng (`ITaskManager`), tự điều chỉnh số luồng đồng thời theo tải CPU (`TaskManagerOptions`).
- [**WorkerOptions**](./options/worker-options.md) — Độ ưu tiên theo từng worker, giới hạn đồng thời theo nhóm, thời gian giữ lại, độ ưu tiên luồng HĐH, và gắn worker vào lõi CPU (CPU core affinity).
- [**RecurringOptions**](./options/recurring-options.md) — Chạy không tái nhập (non-reentrant), jitter khi khởi động, timeout cho mỗi lần chạy, và cấu hình exponential backoff cho tác vụ định kỳ.
- [**Snowflake**](./snowflake.md) — Định danh 64-bit có thể sắp xếp (`Type` + `Value` 32-bit là giây Unix + `Sequence` 14-bit + `MachineId` 10-bit) và `SnowflakeOptions`.

## Bộ nhớ & pool đối tượng (`Nalix.Framework.Memory`)

- [**Pool đối tượng (ObjectPoolManager)**](./memory/object-pooling.md) — Trình quản lý pool đối tượng đánh chỉ mục theo kiểu (`IObjectPoolManager`), `ObjectPoolOptions`, kiểm tra sức khỏe, cắt tỉa nền, và phát hiện rò rỉ bằng GC sentinel.
- [**Pool đối tượng theo kiểu (TypedObjectPool<T>)**](./memory/typed-object-pools.md) — Facade pool dành riêng cho từng kiểu, loại bỏ chi phí generic dispatch trên hot path.
- [**Bản đồ đối tượng (ObjectMap<TKey, TValue>)**](./memory/object-map.md) — Dictionary an toàn đa luồng có pool (`IObjectMap<TKey, TValue>`), được hỗ trợ bởi `ConcurrentDictionary<TKey, TValue>` và `ObjectPoolManager.Shared`.
- [**Quản lý bộ đệm (BufferPoolManager & BufferOptions)**](../environment/memory/buffer-management.md) — Trình quản lý pool mảng byte (`IBufferPoolManager`) với telemetry thuê/trả và theo dõi rò rỉ `BufferSentinel`.

## Gói liên quan

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Environment](../environment/index.md)
- [Nalix.Codec](../codec/index.md)
- [Nalix.Runtime](../runtime/index.md)
- [Nalix.Network](../network/index.md)
