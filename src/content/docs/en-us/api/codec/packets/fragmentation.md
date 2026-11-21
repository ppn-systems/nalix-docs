---
title: Fragmentation
description: Large-payload chunking, wire headers, and bounded stream reassembly in Nalix.Environment.Fragments and Nalix.Environment.Options.
section: API Reference
package: Nalix.Environment
---

**Namespaces:** `Nalix.Environment.Fragments`, `Nalix.Environment.Options`  
**Assembly:** `Nalix.Environment`

This page covers the packet fragmentation and reassembly primitives in `Nalix.Environment.Fragments` (`FragmentHeader`, `FragmentAssembler`, `FragmentAssemblyResult`, `FragmentStreamId`) and their configuration in `Nalix.Environment.Options.FragmentOptions`. It also documents `DatagramEngineOptions`, the datagram-session settings that include the fragment reassembly limits of a datagram connection.

## Source Mapping

- `src/Nalix.Environment/Fragments/FragmentHeader.cs`
- `src/Nalix.Environment/Fragments/FragmentAssembler.cs`
- `src/Nalix.Environment/Fragments/FragmentAssemblyResult.cs`
- `src/Nalix.Environment/Fragments/FragmentStreamId.cs`
- `src/Nalix.Environment/Options/FragmentOptions.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`

## Public Types at a Glance

| Type | Public Members |
| --- | --- |
| `FragmentHeader` | `readonly struct FragmentHeader(ushort streamId, ushort chunkIndex, ushort totalChunks, bool isLast) : IEquatable<FragmentHeader>`: `WireSize = 13` (`const`), `StreamId` (`ushort`), `ChunkIndex` (`ushort`), `TotalChunks` (`ushort`), `Flags` (`byte`), `IsLast` (`bool`), `WriteTo(Span<byte>)`, `ReadFrom(ReadOnlySpan<byte>)` (static), `Equals`, `==`, `!=` |
| `FragmentAssembler` | `EvictInterval = 64` (`const`), `MaxOpenStreams` (`int`, default `64`), `OpenStreamCount` (`int`), `StreamTimeoutMs` (`long`, default `30_000`), `MaxStreamBytes` (`int`, default `16 MB`), `IsFragmentedFrame(ReadOnlySpan<byte>, out FragmentHeader)`, `Add(FragmentHeader, ReadOnlySpan<byte>, out bool)`, `EvictExpired()` (`int`), `Clear()`, `Dispose()` |
| `FragmentAssemblyResult` | `Lease` (`BufferLease`), `Length` (`int`), `Span` (`ReadOnlySpan<byte>`), `Memory` (`ReadOnlyMemory<byte>`), `Dispose()` |
| `FragmentOptions` | `MaxPayloadSize = 16_777_216` (16 MB), `MaxChunkSize = 32_000`, `MaxReassemblyBytes = 16_777_216` (16 MB), `ReassemblyTimeoutMs = 30_000L`, `MinReceiveBufferSize = 4096`, `Validate()` |
| `FragmentStreamId` | `Next()` (`ushort`, wraps `1..65535`, never returns `0`) |
| `DatagramEngineOptions` | `MinimumMtu = 1200`, `MaxChannels = 64`, `ChannelCount`, `IdleTimeoutMs`, `MaxAckDelayMs`, `UnreliableExpiryMs`, `MaxMessageSize`, `ReceiveBufferBytes`, `ChannelReceiveBufferBytes`, `SendQueueBytesPerChannel`, `MaxOpenFragmentStreams`, `FragmentTimeoutMs`, `EnableMtuProbing`, `KeyUpdatePacketInterval`, `KeyUpdateIntervalMs`, `Validate()` |

## `FragmentHeader` (13 Bytes)

`FragmentHeader.WireSize = 13` is the 6-byte packet header (`PacketConstants.HeaderSize`) plus 7 bytes of little-endian fragment metadata. `WriteTo` zeroes the 6 packet-header bytes and sets only `PacketFlags.FRAGMENTED` in the flags byte (offset `2`); the receiver detects a fragment by that flag, never by payload content (`FragmentAssembler.IsFragmentedFrame`).

| Offset | Size | Field | Description |
| ---: | ---: | --- | --- |
| `0` | `6` bytes | Packet header | Zeroed except the flags byte, which carries `PacketFlags.FRAGMENTED` (`0x08`). |
| `6` | `2` bytes | `StreamId` | Non-zero 16-bit stream identifier (`FragmentStreamId.Next()`, little-endian). |
| `8` | `2` bytes | `ChunkIndex` | Zero-based chunk index (`0..TotalChunks - 1`, little-endian). |
| `10` | `2` bytes | `TotalChunks` | Total chunks in the stream (little-endian). |
| `12` | `1` byte | `Flags` | Bit `0` (`0x01`) indicates `IsLast`. |

`ReadFrom` throws `InvalidDataException` when the packet header does not carry `FRAGMENTED`.
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
| `MaxChunkSize` | `int` | `32_000` | `[ValueRange(4096, 65000)]` | Maximum payload bytes per chunk (`PacketConstants.HeaderSize + FragmentHeader.WireSize + MaxChunkSize` must not exceed `ushort.MaxValue`; `MaxPayloadSize` must also be `>= MaxChunkSize` and produce at most `65535` chunks). |
| `MaxReassemblyBytes` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Maximum reassembly bytes allowed per stream (`MaxReassemblyBytes >= MaxPayloadSize`). |
| `ReassemblyTimeoutMs` | `long` | `30_000` | `[ValueRange(100, 3600000)]` | Milliseconds before an incomplete fragment stream is evicted. |
| `MinReceiveBufferSize` | `int` | `4096` | `[ValueRange(1024, int.MaxValue)]` | Minimum receive buffer size in bytes. |

## `DatagramEngineOptions` (`Nalix.Environment.Options`)

`public sealed partial class DatagramEngineOptions : ConfigurationLoader, IValidatableConfiguration` configures the datagram session engine (Nalix Datagram Protocol): channels, timeouts, receive budgets, fragment reassembly and key update (`src/Nalix.Environment/Options/DatagramEngineOptions.cs`). Constants: `MinimumMtu = 1200`, `MaxChannels = 64`.

| Property | Type | Default | Validation | Description |
| --- | --- | ---: | --- | --- |
| `ChannelCount` | `int` | `8` | `[ValueRange(1, 64)]` | Channels per session. |
| `IdleTimeoutMs` | `int` | `15_000` | `[ValueRange(100, 3_600_000)]` | Idle timeout in milliseconds. |
| `MaxAckDelayMs` | `int` | `25` | `[ValueRange(1, 1_000)]` | Longest acknowledgement delay in milliseconds. |
| `UnreliableExpiryMs` | `int` | `100` | `[ValueRange(1, 60_000)]` | Milliseconds a queued unreliable message may wait before it is dropped. |
| `MaxMessageSize` | `int` | `1_048_576` | `[ValueRange(1, 64 MB)]` | Largest message in bytes. |
| `ReceiveBufferBytes` | `long` | `4_194_304` | `[ValueRange(1, long.MaxValue)]` | Bytes buffered for ordering and reassembly per session, advertised to the peer. |
| `ChannelReceiveBufferBytes` | `long` | `2_097_152` | `[ValueRange(1, long.MaxValue)]` | Bytes buffered per channel, advertised to the peer. |
| `SendQueueBytesPerChannel` | `long` | `4_194_304` | `[ValueRange(1, long.MaxValue)]` | Bytes that may wait in the send queue of one channel. |
| `MaxOpenFragmentStreams` | `int` | `64` | `[ValueRange(1, 65_535)]` | Largest number of fragmented messages reassembled at once. |
| `FragmentTimeoutMs` | `int` | `10_000` | `[ValueRange(100, 3_600_000)]` | Milliseconds an incomplete fragmented message is kept. |
| `EnableMtuProbing` | `bool` | `true` | — | Probe the path MTU above 1200 bytes. |
| `KeyUpdatePacketInterval` | `long` | `1 << 23` (`8_388_608`) | `[ValueRange(16, 1 << 40)]` | Packets sent with one key before a key update. |
| `KeyUpdateIntervalMs` | `long` | `3_600_000` | `[ValueRange(1_000, 7 days in ms)]` | Milliseconds one key is used before a key update. |

`Validate()` runs the range checks and throws `ValidationException` unless `ChannelReceiveBufferBytes >= MaxMessageSize + 65536`, `ReceiveBufferBytes >= ChannelReceiveBufferBytes`, and `SendQueueBytesPerChannel >= MaxMessageSize`.

## Related APIs

- [Frame Model](./frame-model.md)
- [Packet Registry](./packet-registry.md)
- [Buffer Management](../../environment/memory/buffer-management.md)
- [BufferLease](../../environment/memory/buffer-lease.md)
