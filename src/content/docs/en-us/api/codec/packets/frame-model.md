---
title: Frame Model
description: Base packet classes (FrameBase, PacketBase<TSelf>) and framed payload transform helpers (FrameTransformer, FrameCipher, FrameCompression) in Nalix.Codec.
section: API Reference
package: Nalix.Codec
---

**Namespaces:** `Nalix.Codec.DataFrames`, `Nalix.Codec.Transforms`  
**Assembly:** `Nalix.Codec`

This page covers the core `Nalix.Codec.DataFrames` base classes (`FrameBase`, `PacketBase<TSelf>`) and the `Nalix.Codec.Transforms` helpers (`FrameTransformer`, `FrameCipher`, `FrameCompression`).

## Source Mapping

- `src/Nalix.Codec/DataFrames/FrameBase.cs`
- `src/Nalix.Codec/DataFrames/PacketBase.cs`
- `src/Nalix.Codec/Transforms/FrameTransformer.cs`
- `src/Nalix.Codec/Transforms/FrameCipher.cs`
- `src/Nalix.Codec/Transforms/FrameCompression.cs`

## Public Types at a Glance

| Type | Public Members |
| --- | --- |
| `FrameBase` | `Header` (`PacketHeader`), `OpCode` (`ushort`), `Flags` (`PacketFlags`), `Priority` (`PacketPriority`), `SequenceId` (`ushort`), `Length` (`int`), `Serialize()`, `Serialize(Span<byte>)`, `ResetForPool()` (`abstract`) |
| `PacketBase<TSelf>` | Inherits `FrameBase`; implements `IPacketDeserializer<TSelf>`, `IPoolable`, `IDisposable`; adds `Create()`, `Deserialize(ReadOnlySpan<byte>)`, `OnRent()`, `ResetForPool()` (`virtual`), `Dispose()`, `ToString()` |
| `PacketFactory<TPacket>` | `Acquire()` (`PacketScope<TPacket>`), `AcquireBatch(int count)` (`PacketBatchScope<TPacket>`) |
| `PacketSchema<TSelf>` | `static int StaticSize { get; set; }` — minimum static size of the packet header and fixed-size fields (`Nalix.Codec.DataFrames`); `PacketBase<TSelf>.Deserialize` checks the input buffer length against it. Constraint: `TSelf : PacketBase<TSelf>, IPacketStaticOpcode, new()` |
| `EnumExtensions` | `Nalix.Codec.Extensions`: `AddFlag<TEnum>(this TEnum, TEnum mask)` and `RemoveFlag<TEnum>(this TEnum, TEnum mask)` for `unmanaged, Enum` types of 1, 2, 4 or 8 bytes (bitwise OR / AND-NOT; other sizes throw `NotSupportedException`; DEBUG builds throw `ArgumentException` when the enum lacks `[Flags]`) |
| `ValueTaskExtensions` | `Nalix.Codec.Extensions`: `ValueTask DisposeOnCompletionAsync<TPacket>(this ValueTask pending, PacketScope<TPacket> lease)` — disposes the `PacketScope` once `pending` completes (synchronously when already completed successfully, otherwise in a `finally` after awaiting) |
| `FrameTransformer` | `Offset = 6`, `GetMaxCiphertextSize`, `GetPlaintextLength`, `TryGetPlaintextLength`, `GetMaxCompressedSize`, `GetDecompressedLength`, `TryGetDecompressedLength`, `Encrypt`, `Decrypt`, `TryDecrypt`, `Compress`, `Decompress`, `TryDecompress` |
| `FrameCipher` | `EncryptFrame`, `DecryptFrame`, `TryDecryptFrame` |
| `FrameCompression` | `CompressFrame`, `DecompressFrame`, `TryDecompressFrame` |

## `FrameBase`

`FrameBase` (`Nalix.Codec.DataFrames.FrameBase`) is the abstract base class implementing `IPacket` and `IPacketHeader`.

- **`Header`** (`[SerializeHeader(0)]`): The 6-byte `PacketHeader` struct (`OpCode`, `Flags`, `Priority`, `SequenceId`).
- **Facade properties**: `OpCode`, `Flags`, `Priority`, and `SequenceId` read and mutate `Header` directly.
- **`Length`**: Abstract `int` property returning the total serialized byte size of the packet (including the 6-byte header).
- **`Serialize()` / `Serialize(Span<byte> buffer)`**: Serializes the packet into a newly allocated `byte[]` or into a caller-provided `Span<byte>` returning bytes written.
- **`ResetForPool()`**: Abstract method implemented by `PacketBase<TSelf>` (and extended by source-generated overrides) to reset packet state before returning to the object pool.

## `PacketBase<TSelf>`

`PacketBase<TSelf>` (`where TSelf : PacketBase<TSelf>, IPacketStaticOpcode, new()`) is decorated with `[Packet]` (`Inherited = true`) and implements `IPacketDeserializer<TSelf>`, `IPoolable`, and `IDisposable`:

- **Compile-time code generation**:
  - Inheriting from `PacketBase<TSelf>` inherits `[Packet]`; subclasses add `[GenerateFormatter]` and `[SerializePackable(...)]` to trigger [PacketSchemaGenerator](../../analyzers/autogen/packet-schema-generator.md) (which generates `Length`, `ResetForPool()`, and `Size`), [SerializeFormatterGenerator](../../analyzers/autogen/serialization-generator.md) (which generates `IFormatter<TSelf>` and `IFillableFormatter<TSelf>`), and [PacketRegistryGenerator](../../analyzers/autogen/packet-registry-generator.md).
  - Subclasses **must** be declared `partial` (enforced by error **`NALIX060`**).
- **`static TSelf Create()`**: Rents a pooled instance from `PacketRegistry.Manager` (`IObjectPoolManager`), calls `OnRent()`, or falls back to `new TSelf()`.
- **`static TSelf Deserialize(ReadOnlySpan<byte> buffer)`**: Rents a pooled `TSelf` instance via `Create()` and populates it in place via `LiteSerializer.TryDeserialize(buffer, ref packet, out int bytesRead)`. If deserialization fails, disposes `packet` and returns `null!`.
- **`virtual void ResetForPool()`**: Resets `Flags = PacketFlags.NONE`, `Priority = PacketPriority.NONE`, `SequenceId = 0`, and `OpCode = TSelf.StaticOpCode`.
- **`void Dispose()`**: Returns the packet instance to `PacketRegistry.Manager` (`IObjectPoolManager`) under `TSelf` if it was rented from the pool.
- **`override string ToString()`**: Returns a concise summary of the packet type and header fields.

### Basic Usage

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class ChatMessage : PacketBase<ChatMessage>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x1001;

    [SerializeDynamicSize(256)]
    [SerializeOrder(0)]
    public string Content { get; set; } = string.Empty;

    public void Initialize(string content) => this.Content = content ?? string.Empty;
}
```

## `FrameTransformer`, `FrameCipher`, and `FrameCompression`

All three transform classes preserve the 6-byte `PacketHeader` (`0..FrameTransformer.Offset`, where `FrameTransformer.Offset == 6`) and operate exclusively on the payload region (`span[6..]`).

### `FrameCipher`

- `IBufferLease EncryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, uint? seq, CipherSuiteType suite)` — Rents a destination lease with `BufferLease.TransportHeadroom`, encrypts `src` payload via `FrameTransformer.Encrypt`, sets `PacketFlags.ENCRYPTED` in the destination header, and returns the new lease.
- `IBufferLease DecryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)` — Throwing decrypt helper. Rents a `zeroOnDispose: true` destination lease, decrypts and authenticates the payload, sets `dest.EncryptedOnWire = true`, clears `PacketFlags.ENCRYPTED` from the destination header, and returns `dest`.
- `bool TryDecryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq, [NotNullWhen(true)] out IBufferLease? dest)` — Non-throwing decrypt helper used by `FramePipeline.TryProcessInbound`.

### `FrameCompression`

- `IBufferLease CompressFrame([Borrowed] IBufferLease src)` — Rents a destination lease with `BufferLease.TransportHeadroom`, LZ4-compresses the payload, and sets `PacketFlags.COMPRESSED` in the destination header.
- `IBufferLease DecompressFrame([Borrowed] IBufferLease src)` — Throwing LZ4 decompress helper; clears `PacketFlags.COMPRESSED` on the returned lease and sets `zeroOnDispose: src.EncryptedOnWire`.
- `bool TryDecompressFrame([Borrowed] IBufferLease src, [NotNullWhen(true)] out IBufferLease? dest)` — Non-throwing LZ4 decompress helper.

### `FrameTransformer`

Low-level payload transform and sizing methods operating on caller-supplied `src` and `dest` leases:

- **Sizing**:
  - `int GetMaxCiphertextSize(CipherSuiteType type, int plaintextSize)`
  - `int GetPlaintextLength(ReadOnlySpan<byte> envelope)` / `bool TryGetPlaintextLength(ReadOnlySpan<byte> envelope, out int length)`
  - `int GetMaxCompressedSize(int plaintextSize)`
  - `int GetDecompressedLength(ReadOnlySpan<byte> src)` / `bool TryGetDecompressedLength(ReadOnlySpan<byte> src, out int length)`
- **Payload Transforms**:
  - `void Encrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, uint? seq, CipherSuiteType suite)`
  - `void Decrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)`
  - `bool TryDecrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)`
  - `void Compress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`
  - `void Decompress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`
  - `bool TryDecompress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`

## Related APIs

- [Frame Pipeline](../frame-pipeline.md)
- [Packet Registry](./packet-registry.md)
- [Built-in Frames](./built-in-frames.md)
- [Fragmentation](./fragmentation.md)
- [Serialization Basics](../serialization/serialization-basics.md)
