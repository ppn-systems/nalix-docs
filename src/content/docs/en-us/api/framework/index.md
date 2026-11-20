---
title: Nalix.Framework API Reference
description: Reference for Nalix.Framework — compile-time dependency injection (InstanceManager, SingletonBase), background task scheduling (TaskManager), 64-bit Snowflake identifiers, and object/buffer pooling.
section: API Reference
package: Nalix.Framework
---

`Nalix.Framework` provides the **Level 2** runtime services for the Nalix ecosystem, including Native AOT-safe dependency injection, background worker and recurring job management, 64-bit Snowflake identifiers, and pooled memory/object managers.

## Dependency Injection & Diagnostics (`Nalix.Framework.Injection`)

- [**Instance Manager (DI)**](./instance-manager.md) — Lock-free service registry with 2-slot MRU `[ThreadStatic]` L1 caching, compile-time `[Injectable]` activators, greedy constructor injection (`CreateInstanceWithInjection`), and post-startup `Lockdown()`.
- [**SingletonBase\<T\>**](./singleton-base.md) — Thread-safe generic singleton base backed by `Lazy<T>` and compile-time `SingletonActivatorCache` factories (`ReportRegistry`, `PacketRegistryFactory`, etc.).
- **`ReportRegistry` & `ReportExtensions`** (`Nalix.Framework`, `Nalix.Framework.Extensions`) — Thread-safe diagnostic report registry (`ReportRegistry.Instance.Register<T>(CoreTelemetryTarget, instance)`, `Get<T>(key)`, `GenerateReport()`, `WriteReportData(Utf8JsonWriter)`, and `IReportable.WriteReportData(Utf8JsonWriter)`).
- **`ReportExtensions` helpers** (`Nalix.Framework.Extensions`, `src/Nalix.Framework/Extensions/ReportExtensions.cs`) — Formatting helpers for dashboards: `string FormatCompact(this long value)` and `string FormatCompact(this int value)` (`1.2k`, `3.5M`, `2G`; values below 1000 print as-is), `string FormatGroup(long current, long total, bool compact = false)` (`"15 / 1024"`), `string FormatTypeName(string name, int maxLength = 24)` (pads to `maxLength`, or truncates with `...`; throws `ArgumentNullException` for `null`), `string FormatTimeSpan(this TimeSpan value)` (`250ms`, `1.5s`, `10m`, `2h`, `1.5d`), and `string SaveReportToFile(this IReportable @this, string prefix = "null")` (writes `GenerateReport()` to `<DataDirectory>/reports/<prefix>-report-<yyyyMMdd-HHmm>.txt` and returns the full path; file-system errors propagate).
- **`DiagnosticsEvents` & `DiagnosticListenerFactory`** (`Nalix.Environment`, `Nalix.Codec`, `Nalix.Framework`, `Nalix.Network`, `Nalix.Runtime`) — Per-assembly `DiagnosticListener` sources (`"Environment"`, `"Codec"`, `"Framework"`, `"Network"`, `"Runtime"`) emitting structured `DiagnosticLog(Tag, Message, Exception)` payloads (with a browser-safe No-Op adapter on WebAssembly).

## Background Tasks & Identifiers

- [**Task Manager**](./task-manager.md) — Multi-gate background worker and recurring job scheduler (`ITaskManager`) with CPU-aware dynamic concurrency scaling (`TaskManagerOptions`).
- [**WorkerOptions**](./options/worker-options.md) — Per-worker priority, group concurrency limits, retention, OS thread priority, and CPU core affinity.
- [**RecurringOptions**](./options/recurring-options.md) — Non-reentrant execution, startup jitter, per-run timeout, and exponential backoff settings for recurring jobs.
- [**Snowflake**](./snowflake.md) — 64-bit sortable identifier (`Type` + 32-bit Unix seconds `Value` + 14-bit `Sequence` + 10-bit `MachineId`) and `SnowflakeOptions`.

## Memory & Object Pooling (`Nalix.Framework.Memory`)

- [**Object Pooling (ObjectPoolManager)**](./memory/object-pooling.md) — Type-indexed object pool manager (`IObjectPoolManager`), `ObjectPoolOptions`, health checks, background trimming, and GC sentinel leak detection.
- [**Typed Object Pools (TypedObjectPool<T>)**](./memory/typed-object-pools.md) — Type-specific pool facade eliminating generic dispatch overhead on hot paths.
- [**Object Map (ObjectMap<TKey, TValue>)**](./memory/object-map.md) — Pooled thread-safe dictionary (`IObjectMap<TKey, TValue>`) backed by `ConcurrentDictionary<TKey, TValue>` and `ObjectPoolManager.Shared`.
- [**Buffer Management (BufferPoolManager & BufferOptions)**](../environment/memory/buffer-management.md) — Byte array pool manager (`IBufferPoolManager`) with rent/return telemetry and `BufferSentinel` leak tracking.

## Related Packages

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Environment](../environment/index.md)
- [Nalix.Codec](../codec/index.md)
- [Nalix.Runtime](../runtime/index.md)
- [Nalix.Network](../network/index.md)
