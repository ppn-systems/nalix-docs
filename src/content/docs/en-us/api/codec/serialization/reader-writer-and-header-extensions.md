---
title: Reader, Writer, and Header Extensions
description: This page covers the low-level helper APIs around DataReader, DataWriter, and packet header access.
section: API Reference
package: Nalix.Codec
---

**Namespaces:** `Nalix.Codec.Extensions`, `Nalix.Environment.Extensions`  
**Assemblies:** `Nalix.Codec`, `Nalix.Environment`

This page covers the low-level helper APIs around `DataReader`, `DataWriter`, and packet header access.

## Source mapping

- `src/Nalix.Codec/Extensions/DataReaderExtensions.cs`
- `src/Nalix.Codec/Extensions/DataWriterExtensions.cs`
- `src/Nalix.Environment/Extensions/HeaderExtensions.cs`

## Main types

- `DataReaderExtensions`
- `DataWriterExtensions`
- `HeaderExtensions`

## Public members at a glance

| Type | Public members |
|---|---|
| `DataReaderExtensions` | `ReadByte`, `ReadSByte`, `ReadInt16`, `ReadUInt16`, `ReadInt32`, `ReadUInt32`, `ReadInt64`, `ReadUInt64`, `ReadChar`, `ReadSingle`, `ReadDouble`, `ReadBoolean`, `ReadEnumByte`, `ReadEnumSByte`, `ReadEnumInt16`, `ReadEnumUInt16`, `ReadEnumInt32`, `ReadEnumUInt32`, `ReadBytes`, `ReadRemainingBytes`, `ReadUnmanaged`, `Remaining` |
| `DataWriterExtensions` | `Write`, `WriteEnum`, `WriteUnmanaged` overloads for primitive, span, enum (1/2/4-byte), and unmanaged values |
| `HeaderExtensions` | `AsHeaderRef` overloads for `Span<byte>` and `ReadOnlySpan<byte>` |

## When to use these helpers

Use these APIs when you are:

- implementing custom packet serialization by hand
- inspecting packet headers before full deserialization
- writing high-throughput code that should avoid extra allocations

These helpers sit below the usual `LiteSerializer` and `PacketBase<TSelf>` flow.

## DataReaderExtensions

`DataReaderExtensions` adds direct primitive and enum readers on top of `DataReader`.

Useful methods include:

- `ReadByte()`
- `ReadSByte()`
- `ReadInt16()`
- `ReadUInt16()`
- `ReadInt32()`
- `ReadUInt32()`
- `ReadInt64()`
- `ReadUInt64()`
- `ReadChar()`
- `ReadSingle()`
- `ReadDouble()`
- `ReadBoolean()`
- `ReadEnumByte<TEnum>()`
- `ReadEnumSByte<TEnum>()`
- `ReadEnumInt16<TEnum>()`
- `ReadEnumUInt16<TEnum>()`
- `ReadEnumInt32<TEnum>()`
- `ReadEnumUInt32<TEnum>()`
- `ReadBytes(count)`
- `ReadRemainingBytes()`
- `ReadUnmanaged<T>()`
- `Remaining()`

## DataWriterExtensions

`DataWriterExtensions` adds matching write helpers for primitive, enum, span, and unmanaged values.

Useful methods include:

- `Write(byte)`
- `Write(sbyte)`
- `Write(short)`
- `Write(ushort)`
- `Write(int)`
- `Write(uint)`
- `Write(long)`
- `Write(ulong)`
- `Write(char)`
- `Write(float)`
- `Write(double)`
- `Write(bool)`
- `Write(byte[])`
- `Write(ReadOnlySpan<byte>)`
- `WriteEnum<TEnum>(value)` (supports 1-, 2-, and 4-byte underlying enum types; throws `NotSupportedException` for 8-byte enums)
- `WriteUnmanaged<T>(value)`

## HeaderExtensions

`HeaderExtensions` provides zero-copy packet header access over raw byte spans using `MemoryMarshal`.

This is useful when you want to inspect or modify protocol information without copying or allocating.

Useful methods include:

- `AsHeaderRef()` — returns a `ref PacketHeader` (or `ref readonly PacketHeader`) pointing directly into the span.

Individual fields are accessed through the returned `PacketHeader` reference:

```csharp
ref readonly PacketHeader header = ref span.AsHeaderRef();
ushort opCode = header.OpCode;
PacketFlags flags = header.Flags;
PacketPriority priority = header.Priority;
ushort sequenceId = header.SequenceId;
```

## Basic usage

```csharp
DataWriter writer = new(256);
writer.Write((ushort)opcode);
writer.WriteEnum(priority);
writer.Write(payload);

DataReader reader = new(writer.WrittenSpan);
ushort decodedOpcode = reader.ReadUInt16();
PacketPriority decodedPriority = reader.ReadEnumByte<PacketPriority>();

ref PacketHeader header = ref span.AsHeaderRef();
ushort headerOpcode = header.OpCode;
header.SequenceId = 123; // Direct mutation
```

## Design notes

- `DataReaderExtensions` and `DataWriterExtensions` are marked as editor-hidden helpers, but they are still part of the public API surface.
- `HeaderExtensions` works directly on `Span<byte>` and `ReadOnlySpan<byte>` and is intended for hot paths that need fast header inspection.
- These helpers assume the Nalix packet header layout and explicit little-endian reads for protocol stability.

### Common pitfalls

- using these helpers when `LiteSerializer` or `PacketBase<TSelf>` already gives you the shape you want
- reading header fields from the wrong byte offset
- mixing endianness assumptions with the fixed Nalix wire layout

## Related APIs

- [Serialization](./serialization-basics.md)
- [Frame Model](../packets/frame-model.md)
- [Packet Registry](../packets/packet-registry.md)
