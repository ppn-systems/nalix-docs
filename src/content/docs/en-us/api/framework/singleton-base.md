---
title: SingletonBase
description: Reference for Nalix.Framework.Injection.DI.SingletonBase<T> and ReportRegistry — thread-safe, Native AOT-compatible generic singleton infrastructure.
section: API Reference
package: Nalix.Framework
---

**Namespace:** `Nalix.Framework.Injection.DI` (and `Nalix.Framework`)  
**Assembly:** `Nalix.Framework`

`SingletonBase<T>` (`public abstract class SingletonBase<T> : IDisposable where T : class`) is the thread-safe, Native AOT-compatible generic singleton base class used by framework services such as `InstanceManager` and `ReportRegistry`.

## Source Mapping

- `src/Nalix.Framework/Injection/DI/SingletonBase.cs`
- `src/Nalix.Framework/Injection/DI/SingletonActivatorCache.cs`
- `src/Nalix.Framework/ReportRegistry.cs`
- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`

## How Native AOT Activation Works

Unlike traditional generic singletons that rely on `Activator.CreateInstance` or `Expression.Compile` at runtime, `SingletonBase<T>` resolves its constructor delegate once per closed generic type from `SingletonActivatorCache.GetRequired<T>()`:

1. At compile time, `InstanceGenerator` discovers every non-abstract subclass of `SingletonBase<T>` (as well as `[Injectable]` classes) and emits a `[ModuleInitializer]` in `InstanceActivators.g.cs` that registers a direct constructor lambda (`static () => new MyService()`) into `SingletonActivatorCache`.
2. At runtime, `SingletonBase<T>` wraps that factory in a `Lazy<T>` configured with `LazyThreadSafetyMode.ExecutionAndPublication`.

## `SingletonBase<T>` Members

| Member | Signature | Description |
| :--- | :--- | :--- |
| `Instance` | `public static T Instance { get; }` | Returns the singleton instance, creating it on first access via `Lazy<T>`. |
| `IsCreated` | `public static bool IsCreated { get; }` | Returns `true` if the singleton instance has already been created without forcing creation. |
| `TryGetInstance` | `public static bool TryGetInstance([MaybeNullWhen(false)] out T instance)` | Returns `true` and the existing instance if already created; otherwise `false` without creating it. |
| `EnsureCreated` | `public static void EnsureCreated()` | Forces eager creation of the singleton instance during application warm-up. |
| `Dispose()` | `public void Dispose()` | Disposes the singleton instance (idempotent via atomic `Interlocked.Exchange`). |
| `Dispose(bool)` | `protected virtual void Dispose(bool disposing)` | Calls `DisposeManaged()` once when `disposing` is `true`. |
| `DisposeManaged()` | `protected virtual void DisposeManaged()` | Override in subclasses to release managed resources on disposal. |

## Usage Example

```csharp
using Nalix.Framework.Injection.DI;

public sealed class MetricsAggregator : SingletonBase<MetricsAggregator>
{
    // Internal or public parameterless constructor is called by InstanceGenerator's ModuleInitializer
    internal MetricsAggregator()
    {
    }

    protected override void DisposeManaged()
    {
        // Clean up managed resources
    }
}

// Warm up at startup
MetricsAggregator.EnsureCreated();

// Access anywhere
MetricsAggregator aggregator = MetricsAggregator.Instance;
```

## `ReportRegistry` (`Nalix.Framework.ReportRegistry`)

`ReportRegistry` (`public sealed class ReportRegistry : SingletonBase<ReportRegistry>, IReportable`) is a thread-safe diagnostic registry mapping `(Enum Key, Type Type)` pairs to `IReportable` component instances. `InstanceManager` automatically registers built-in `CoreTelemetryTarget` `IReportable` services (`ITaskManager`, `IConnectionHub`, `IBufferPoolManager`, `IObjectPoolManager`, `ISessionService`, etc.) into `ReportRegistry.Instance`; custom application `IReportable` services should call `ReportRegistry.Instance.Register(key, instance)` directly:

- `void Register<T>(Enum key, T instance) where T : class, IReportable` — Registers `instance` under `(key, typeof(T))`, `(key, instance.GetType())`, and all implemented `IReportable` interfaces.
- `T? Get<T>(Enum key) where T : class, IReportable` — Retrieves a registered reportable component by enum key and type.
- `bool Unregister<T>(Enum key) where T : class, IReportable` — Removes the registration for `key` and `typeof(T)`.
- `void Clear()` — Clears all registrations.
- `string GenerateReport()` / `void WriteReportData(Utf8JsonWriter writer)` / `void WriteReportData<T>(Utf8JsonWriter writer)` — Aggregates text or structured JSON reports across registered components.

## Related APIs

- [Instance Manager (DI)](./instance-manager.md)
- [Instance Generator](../analyzers/autogen/instance-generator.md)
- [Task Manager](./task-manager.md)
