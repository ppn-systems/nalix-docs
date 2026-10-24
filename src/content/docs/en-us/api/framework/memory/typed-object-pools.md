---
title: Typed Object Pools
description: Reference for Nalix.Framework.Memory.Objects.TypedObjectPool<T> — type-specific object pool adapter for hot-path renting and batch operations.
section: API Reference
package: Nalix.Framework
---

**Namespace:** `Nalix.Framework.Memory.Objects`  
**Assembly:** `Nalix.Framework`

`TypedObjectPool<T>` (`public sealed class TypedObjectPool<T> where T : IPoolable, new()`) is a type-specific adapter created via `ObjectPoolManager.GetTypedPool<T>()`. Caching a `TypedObjectPool<T>` reference in a `readonly` field provides a clean, strongly-typed API for single and batch rent/return operations while preserving all `ObjectPoolManager` metrics and leak diagnostics.

## Source Mapping

- `src/Nalix.Framework/Memory/Objects/TypedObjectPool.cs`
- `src/Nalix.Framework/Memory/Objects/ObjectPoolManager.cs`

## Public Methods

| Method | Signature | Description |
| :--- | :--- | :--- |
| `Get()` | `public T Get()` | Rents or creates an instance of `T` from the underlying `ObjectPoolManager` (or standalone `ObjectPool`). |
| `Return(T)` | `public void Return(T obj)` | Resets `obj` (`ResetForPool()`) and returns it to the pool. |
| `GetMultiple(int)` | `public List<T> GetMultiple(int count)` | Rents `count` instances into a `List<T>` (automatically returns already-rented items if an exception occurs mid-batch). |
| `ReturnMultiple` | `public int ReturnMultiple(IEnumerable<T> objects)` | Returns all items in `objects` to the pool and returns the count of returned instances. |
| `Prealloc(int)` | `public int Prealloc(int count)` | Preallocates `count` instances in the pool and returns the number of instances created. |
| `Clear()` | `public int Clear()` | Removes all currently pooled instances of `T` and returns the number of objects removed. |
| `GetInfo()` | `public Dictionary<string, object> GetInfo()` | Returns the diagnostic metrics dictionary for `T`'s pool (`ObjectPoolManager.GetTypeInfo<T>()`). |
| `SetMaxCapacity(int)` | `public void SetMaxCapacity(int maxCapacity)` | Updates the maximum retained capacity for `T`'s pool. |
| `Trim(int)` | `public int Trim(int percentage = 50)` | Trims the pool to keep `percentage` (`1..99`) of `MaxCapacity` (`0` performs no trim as a safety floor; `>= 100` keeps 100%) and returns the number of removed objects. |

## Usage Pattern

```csharp
using Nalix.Abstractions;
using Nalix.Framework.Memory.Objects;

public sealed class MyPacket : IPoolable
{
    public int Sequence { get; set; }
    public void ResetForPool() => this.Sequence = 0;
}

public sealed class PacketBatchProcessor
{
    private readonly TypedObjectPool<MyPacket> _packetPool =
        ObjectPoolManager.Shared.GetTypedPool<MyPacket>();

    public void ProcessSingle()
    {
        MyPacket packet = _packetPool.Get();
        try
        {
            packet.Sequence = 1;
        }
        finally
        {
            _packetPool.Return(packet);
        }
    }
}
```

## Related APIs

- [Object Pooling (ObjectPoolManager)](./object-pooling.md)
- [Object Map (ObjectMap<TKey, TValue>)](./object-map.md)
- [Buffer Management](../../environment/memory/buffer-management.md)
