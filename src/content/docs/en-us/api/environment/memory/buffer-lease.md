---
title: BufferLease
description: Reference for Nalix.Environment.Memory.BufferLease and IBufferLease — reference-counted pooled byte[] slices with transport headroom and cryptographic scrubbing.
section: API Reference
package: Nalix.Environment
---

**Namespace:** `Nalix.Environment.Memory`  
**Assembly:** `Nalix.Environment`

`BufferLease` (`public sealed class BufferLease : IBufferLease, IPoolable`) represents an owned, reference-counted slice of a rented `byte[]` array. Both the underlying `byte[]` and the `BufferLease` wrapper shell itself are pooled for zero-allocation message processing.

## Source Mapping

- `src/Nalix.Abstractions/IBufferLease.cs`
- `src/Nalix.Environment/Memory/BufferLease.cs`
- `src/Nalix.Environment/Options/MemoryOptions.cs`

## Shell Pooling Architecture

To avoid heap allocations when wrapping rented byte arrays, `BufferLease` recycles its own class instances through a two-tier lock-free cache configured via `MemoryOptions`:
1. **L1 `[ThreadStatic]` Cache (`ThreadLocalLeaseCache`)**: Per-thread cache (`MemoryOptions.BufferLeaseThreadLocalCacheMaxSlots`, default `8` slots) for zero-contention same-thread rent/dispose cycles.
2. **L2 Striped Shared Array (`s_sharedPool`)**: Lock-free `Interlocked.Exchange` array fallback (`MemoryOptions.BufferLeaseSharedPoolSize`, default `64` slots, or `IObjectPoolManager` when configured via `BufferLease.Configure(IObjectPoolManager)`).

## Constants & Static Configuration

- `public static readonly int StackAllocThreshold;` — Cutoff between `stackalloc` and `BufferLease.Rent` (loaded from `MemoryOptions.DataWriterStackAllocThreshold`, default `512` bytes).
- `public const int TransportHeadroom = sizeof(ushort);` (`2` bytes) — Headroom constant for reserving 2 bytes at the start of rented buffers so TCP can prepend the 2-byte frame length without copying the payload.
- `public static void Configure(IObjectPoolManager poolManager)` — Binds `BufferLease` shell pooling to an external `IObjectPoolManager`.
- `BufferLease.ByteArrayPool` — Static helper (`Rent(int)`, `Return(byte[], bool)`, `Configure(IBufferPoolManager)`) backed by `ArrayPool<byte>.Shared` or a configured `IBufferPoolManager`.

## Factory Methods

| Method | Signature | Description |
| --- | --- | --- |
| `Rent(int, bool)` | `public static BufferLease Rent(int capacity, bool zeroOnDispose = false)` | Rents a `byte[]` with `headroom: 0` and `Length = 0`. |
| `Rent(int, bool, int)` | `public static BufferLease Rent(int capacity, bool zeroOnDispose, int headroom)` | Rents a `byte[]` with custom `headroom` bytes (such as `BufferLease.TransportHeadroom`) reserved before `SpanFull`. |
| `CopyFrom` | `public static BufferLease CopyFrom(ReadOnlySpan<byte> src, bool zeroOnDispose = false)` | Rents a buffer, copies `src` into it, and commits `Length = src.Length`. |
| `TakeOwnership` | `public static BufferLease TakeOwnership(byte[] buffer, int start, int length, bool zeroOnDispose = false)` | Takes ownership of a `[start .. start + length]` slice of an already-rented `byte[]`. |
| `FromRented` | `public static BufferLease FromRented(byte[] buffer, int length, bool zeroOnDispose = false)` | Takes ownership of `buffer` starting at offset `0` with committed `length`. |

## Properties & Methods (`IBufferLease` & `BufferLease`)

| Member | Type / Signature | Description |
| --- | --- | --- |
| `Span` | `Span<byte>` | Read/write span over the committed payload (`_buffer.AsSpan(_start, Length)`). |
| `SpanFull` | `Span<byte>` | Read/write span over the entire writable capacity after `Headroom` (`_buffer.AsSpan(_start, Capacity)`). |
| `Memory` | `ReadOnlyMemory<byte>` | Read-only memory over the committed payload. |
| `Length` | `int` | Committed payload byte length. |
| `Capacity` | `int` | Total writable capacity from `_start` to the end of the array. |
| `RawCapacity` | `int` | Total length of the underlying `byte[]` (including `Headroom`). |
| `Headroom` | `int` | Number of reserved prefix bytes before `_start` (`_start`). |
| `EncryptedOnWire` | `bool` | `true` if the frame arrived encrypted on the wire (propagated to `IPacketContext.EncryptedOnWire`). |
| `IsReliable` | `bool` | `true` when the frame arrived over a reliable transport (`TCP` or `WEBSOCKET`, propagated to `IPacketContext.IsReliable`). |
| `ZeroOnDispose` | `bool` | When `true`, scrubs the buffer with `MemorySecurity.ZeroMemory` before returning it to the pool. |
| `CommitLength(int)` | `void CommitLength(int length)` | Sets the committed payload `Length` (`0 <= length <= Capacity`). |
| `TryGetSegmentWithHeader` | `bool TryGetSegmentWithHeader(int headerSize, out ArraySegment<byte> segment)` | Returns a contiguous `ArraySegment<byte>` starting at `_start - headerSize` when `Headroom >= headerSize` (enabling zero-copy TCP length-prefix writes). |
| `Retain()` | `void Retain()` | Atomically increments the reference count for shared broadcast/fan-out ownership. |
| `ReleaseOwnership` | `bool ReleaseOwnership(out byte[]? buffer, out int start, out int length)` | Detaches the underlying `byte[]` when `refCount == 1` so the caller assumes responsibility for returning it. |
| `Dispose()` | `void Dispose()` | Decrements the reference count; when it reaches `0`, returns the `byte[]` and recycles the `BufferLease` shell. |

## Usage Example

```csharp
using Nalix.Environment.Memory;

// Rent a 1024-byte lease with 2-byte TransportHeadroom that scrubs sensitive plaintext on disposal
using BufferLease lease = BufferLease.Rent(
    capacity: 1024,
    zeroOnDispose: true,
    headroom: BufferLease.TransportHeadroom);

int written = packet.Serialize(lease.SpanFull);
lease.CommitLength(written);

// Zero-copy TCP framing using the 2-byte TransportHeadroom
if (lease.TryGetSegmentWithHeader(headerSize: BufferLease.TransportHeadroom, out ArraySegment<byte> framedSegment))
{
    // Write 2-byte little-endian length into framedSegment[0..2] without copying payload
}
```

## Related APIs

- [Buffer Management](./buffer-management.md)
- [DataReader](./data-reader.md)
- [DataWriter](./data-writer.md)
