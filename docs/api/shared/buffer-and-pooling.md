# Buffer and Pooling

This page covers the shared lease and pooling APIs used across networking and dispatch code.

## Source mapping

- `src/Nalix.Common/Shared/IBufferLease.cs`
- `src/Nalix.Shared/Memory/Buffers/BufferLease.cs`
- `src/Nalix.Shared/Memory/Pools/ObjectPool.cs`
- `src/Nalix.Shared/Memory/Objects/ObjectPoolManager.cs`
- `src/Nalix.Shared/Memory/Objects/TypedObjectPoolAdapter.cs`

## Main types

- `IBufferLease`
- `BufferLease`
- `ObjectPool`
- `ObjectPoolManager`
- `TypedObjectPoolAdapter<T>`

## IBufferLease and BufferLease

`IBufferLease` is the shared contract. `BufferLease` is the main concrete implementation used by listeners, dispatch, and SDK receive paths.

## Basic usage

```csharp
using BufferLease lease = BufferLease.Rent(1024);

payload.CopyTo(lease.SpanFull);
lease.CommitLength(payload.Length);

ReadOnlyMemory<byte> memory = lease.Memory;
```

### Public methods that matter

- `Retain()`
- `CommitLength(length)`
- `ReleaseOwnership(out buffer, out start, out length)`
- `Dispose()`
- `Rent(capacity, zeroOnDispose)`
- `CopyFrom(span, zeroOnDispose)`
- `FromRented(buffer, length, zeroOnDispose)`
- `TakeOwnership(buffer, start, length, zeroOnDispose)`

## ObjectPool

`ObjectPool` is the low-level reusable object store for `IPoolable` instances.

## Basic usage

```csharp
MyPoolable item = ObjectPool.Default.Get<MyPoolable>();
ObjectPool.Default.Return(item);
```

Useful public methods:

- `Get<T>()`
- `Return<T>(obj)`
- `Prealloc<T>(count)`
- `SetMaxCapacity<T>(maxCapacity)`
- `GetTypeInfo<T>()`
- `GetStatistics()`
- `Clear()`
- `ClearType<T>()`
- `Trim(percentage)`
- `GetMultiple<T>(count)`
- `ReturnMultiple<T>(objects)`

## ObjectPoolManager

`ObjectPoolManager` is the higher-level manager with reporting, health checks, typed adapters, and multi-pool statistics.

## Example

```csharp
var adapter = objectPoolManager.GetTypedPool<MyPoolable>();

MyPoolable item = adapter.Get();
adapter.Return(item);

string report = objectPoolManager.GenerateReport();
```

Useful public methods:

- `Get<T>()`
- `Return<T>(obj)`
- `GetTypedPool<T>()`
- `Prealloc<T>(count)`
- `SetMaxCapacity<T>(maxCapacity)`
- `GetTypeInfo<T>()`
- `ClearPool<T>()`
- `ClearAllPools()`
- `TrimAllPools(percentage)`
- `PerformHealthCheck()`
- `ResetStatistics()`
- `ScheduleRegularTrimming(interval, percentage, ct)`
- `GenerateReport()`
- `GetDetailedStatistics()`

## Related APIs

- [Packet Dispatch](../routing/packet-dispatch.md)
- [Packet Context](../routing/packet-context.md)
- [Packet Registry](./packet-registry.md)
- [Pooling Options](../network/pooling-options.md)
