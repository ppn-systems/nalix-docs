---
title: Fragmentation
description: Large-payload chunking, wire headers, and bounded stream reassembly in Nalix.Environment.Fragments and Nalix.Environment.Options.
section: API Reference
package: Nalix.Environment
---

**Namespaces:** `Nalix.Environment.Fragments`, `Nalix.Environment.Options`  
**Assembly:** `Nalix.Environment`

This page covers the packet fragmentation and reassembly primitives in `Nalix.Environment.Fragments` (`FragmentHeader`, `FragmentAssembler`, `FragmentAssemblyResult`, `FragmentStreamId`) and their configuration in `Nalix.Environment.Options.FragmentOptions`.

## Source Mapping

- `src/Nalix.Environment/Fragments/FragmentHeader.cs`
- `src/Nalix.Environment/Fragments/FragmentAssembler.cs`
- `src/Nalix.Environment/Fragments/FragmentAssemblyResult.cs`
- `src/Nalix.Environment/Fragments/FragmentStreamId.cs`
- `src/Nalix.Environment/Options/FragmentOptions.cs`

## Public Types at a Glance

| Type | Public Members |
| --- | --- |
| `FragmentHeader` | `Magic = 0xF0`, `WireSize = 8`, `StreamId` (`ushort`), `ChunkIndex` (`ushort`), `TotalChunks` (`ushort`), `IsLast` (`bool`), `WriteTo(Span<byte>)`, `ReadFrom(ReadOnlySpan<byte>)` |
| `FragmentAssembler` | `EvictInterval = 64` (`const`), `MaxOpenStreams` (`int`, default `64`), `OpenStreamCount` (`int`), `StreamTimeoutMs` (`long`, default `30_000`), `MaxStreamBytes` (`int`, default `16 MB`), `IsFragmentedFrame(ReadOnlySpan<byte>, out FragmentHeader)`, `Add(FragmentHeader, ReadOnlySpan<byte>, out bool)`, `EvictExpired()` (`int`), `Clear()`, `Dispose()` |
| `FragmentAssemblyResult` | `Lease` (`BufferLease`), `Length` (`int`), `Span` (`ReadOnlySpan<byte>`), `Memory` (`ReadOnlyMemory<byte>`), `Dispose()` |
| `FragmentOptions` | `MaxPayloadSize = 16_777_216` (16 MB), `MaxChunkSize = 32_000`, `MaxReassemblyBytes = 16_777_216` (16 MB), `ReassemblyTimeoutMs = 30_000L`, `MinReceiveBufferSize = 4096`, `Validate()` |
| `FragmentStreamId` | `Next()` (`ushort`, wraps `1..65535`, never returns `0`) |

## `FragmentHeader` (8 Bytes)

Every fragmented chunk begins with an 8-byte little-endian `FragmentHeader` (`FragmentHeader.WireSize = 8`) immediately after the outer packet header:

| Offset | Size | Field | Description |
| ---: | ---: | --- | --- |
| `0` | `1` byte | `Magic` | Constant `0xF0` identifying a fragmented frame. |
| `1` | `2` bytes | `StreamId` | Non-zero 16-bit stream identifier (`FragmentStreamId.Next()`, little-endian). |
| `3` | `2` bytes | `ChunkIndex` | Zero-based chunk index (`0..TotalChunks - 1`, little-endian). |
| `5` | `2` bytes | `TotalChunks` | Total chunks in the stream (`>= 2`, little-endian). |
| `7` | `1` byte | `Flags` | Bit `0` (`0x01`) indicates `IsLast`. |

```csharp
using Nalix.Environment.Fragments;

ushort streamId = FragmentStreamId.Next();
FragmentHeader header = new(streamId, chunkIndex: 0, totalChunks: 3, isLast: false);
header.WriteTo(buffer);
```

## `FragmentAssembler`

`FragmentAssembler` collects chunks for a single connection's receive loop and yields a `FragmentAssemblyResult` containing a pooled `BufferLease` once the final chunk (`ChunkIndex == TotalChunks - 1`) arrives.

### Key Behavior & Safety Limits

- **Bounded Concurrent Streams**: Caps concurrent in-flight streams per connection via `MaxOpenStreams` (default `64`). When the limit is reached, expired streams are evicted first; a new stream is rejected only if none could be evicted.
- **Bounded Per-Stream Memory**: Rejects/evicts streams whose total reassembled size exceeds `MaxStreamBytes` (`FragmentOptions.MaxReassemblyBytes`, default `16 MB`). A first chunk larger than `MaxStreamBytes` is rejected (`streamEvicted = true`).
- **Sequential Chunk Enforcement**: A stream only opens on `ChunkIndex == 0`, and subsequent chunks must arrive in order (`ChunkIndex == expectedIndex`).
- **Timeout Eviction**: `EvictExpired()` returns the `int` count of evicted streams older than `StreamTimeoutMs` (`FragmentOptions.ReassemblyTimeoutMs`, default `30_000` ms) and releases their pooled leases.

```csharp
using Nalix.Environment.Fragments;

if (FragmentAssembler.IsFragmentedFrame(payload, out FragmentHeader header))
{
    FragmentAssemblyResult? assembled = assembler.Add(
        header,
        payload[FragmentHeader.WireSize..],
        out bool streamEvicted);

    if (assembled is not null)
    {
        using (assembled.Value)
        {
            ReadOnlySpan<byte> fullMessage = assembled.Value.Span;
            // Process the reassembled payload
        }
    }
}
```

## `FragmentOptions` (`Nalix.Environment.Options`)

Loaded from the `[Fragment]` section of `server.ini` via `ConfigurationManager.Instance.Get<FragmentOptions>()`:

| Property | Type | Default | Validation | Description |
| --- | --- | ---: | --- | --- |
| `MaxPayloadSize` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Maximum total payload size that may be split into fragments. |
| `MaxChunkSize` | `int` | `32_000` | `[ValueRange(4096, 65000)]` | Maximum payload bytes per chunk (`PacketConstants.HeaderSize + FragmentHeader.WireSize + MaxChunkSize` must not exceed `ushort.MaxValue`). |
| `MaxReassemblyBytes` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Maximum reassembly bytes allowed per stream (`MaxReassemblyBytes >= MaxPayloadSize`). |
| `ReassemblyTimeoutMs` | `long` | `30_000` | `[ValueRange(100, 3600000)]` | Milliseconds before an incomplete fragment stream is evicted. |
| `MinReceiveBufferSize` | `int` | `4096` | `[ValueRange(1024, int.MaxValue)]` | Minimum receive buffer size in bytes. |

## Related APIs

- [Frame Model](./frame-model.md)
- [Packet Registry](./packet-registry.md)
- [Buffer Management](../../environment/memory/buffer-management.md)
- [BufferLease](../../environment/memory/buffer-lease.md)
