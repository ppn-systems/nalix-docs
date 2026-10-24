---
title: Serialization Attributes
description: Binary layout and formatter attributes in Nalix.Abstractions.Serialization including [Packet], [GenerateFormatter], [SerializePackable], [SerializeOrder], [SerializeIgnore], [SerializeHeader], [SerializeDynamicSize], IFixedSizeSerializable, and SerializerBounds.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Serialization` (and `Nalix.Abstractions.Networking.Packets`)  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Serialization` defines the compile-time attributes, layout enums, size contracts, and boundary constants used by `SerializeFormatterGenerator`, `PacketSchemaGenerator`, and `LiteSerializer`.

## Source Mapping

- `src/Nalix.Abstractions/Serialization/GenerateFormatterAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializePackableAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeOrderAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeIgnoreAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeHeaderAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeDynamicSizeAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeLayout.cs`
- `src/Nalix.Abstractions/Serialization/SerializerBounds.cs`
- `src/Nalix.Abstractions/Serialization/IFixedSizeSerializable.cs`

## Attributes & Contracts Reference

| Type | Target | Constructors & Members | Purpose |
| --- | --- | --- | --- |
| `[Packet]` (`PacketAttribute`) | Class, Struct, Interface | `PacketAttribute()` | Marks a `PacketBase<TSelf>` class (implements `IPacketStaticOpcode`) for discovery by `PacketRegistryGenerator`. |
| `[GenerateFormatter]` | Class, Struct | `GenerateFormatterAttribute()` | Instructs `SerializeFormatterGenerator` to emit an `IFormatter<T>` (and `IFillableFormatter<T>` for classes) at compile time. Target must be `partial` (`NALIX059`). |
| `[SerializePackable]` | Class, Struct, Interface | `SerializePackableAttribute(SerializeLayout layout = SerializeLayout.Auto)`<br/>Property: `SerializeLayout SerializeLayout` | Declares the member ordering mode (`Auto`, `Sequential`, or `Explicit`). |
| `[SerializeOrder]` | Field, Property | `SerializeOrderAttribute(int order)`<br/>`SerializeOrderAttribute(PacketHeaderOffset offset)`<br/>Property: `int Order` | Assigns the non-negative serialization sequence index (`0, 1, 2...`) when using `SerializeLayout.Explicit`. |
| `[SerializeIgnore]` | Field, Property | `SerializeIgnoreAttribute()` | Excludes a field or property from binary serialization. Cannot be combined with `[SerializeOrder]` (`NALIX015`). |
| `[SerializeHeader]` | Field, Property | `SerializeHeaderAttribute(int order)`<br/>`SerializeHeaderAttribute(PacketHeaderOffset offset)`<br/>Property: `int Order` | Marks a base header field (`PacketHeaderOffset.Region = 6` reserves bytes `0..5` on `PacketBase<TSelf>`, enforced by `NALIX022`). |
| `[SerializeDynamicSize]` | Field, Property | `SerializeDynamicSizeAttribute(int size = 20)`<br/>Property: `int Size` | Provides a buffer-sizing hint for variable-length strings, arrays, or collections. |
| `IFixedSizeSerializable` | Interface | `static abstract int Size { get; }` | Contract for fixed-size structs/packets whose wire size is known at compile time (cannot contain dynamic members per `NALIX051`). |
| `SerializerBounds` | Static class | `Null = -1`<br/>`MaxArray = 1_048_576`<br/>`MaxString = 1_048_576`<br/>`NullArrayMarker => [255, 255, 255, 255]` (`ReadOnlySpan<byte>`)<br/>`EmptyArrayMarker => [0, 0, 0, 0]` (`ReadOnlySpan<byte>`) | Wire markers and hard safety caps for array and string deserialization. |

## Example

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class TransformUpdatePacket : PacketBase<TransformUpdatePacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x2001;

    [SerializeOrder(0)]
    public ulong EntityId { get; set; }

    [SerializeOrder(1)]
    public float X { get; set; }

    [SerializeOrder(2)]
    public float Y { get; set; }

    [SkipClean]
    [SerializeIgnore]
    public long LocalTimestampTicks { get; set; }
}
```

## Related APIs

- [Serialization Generator](../analyzers/autogen/serialization-generator.md)
- [Packet Schema Generator](../analyzers/autogen/packet-schema-generator.md)
- [Serialization Basics](../codec/serialization/serialization-basics.md)
- [Diagnostic Codes (NALIX013–NALIX022, NALIX051, NALIX059)](../analyzers/diagnostic-codes.md)
