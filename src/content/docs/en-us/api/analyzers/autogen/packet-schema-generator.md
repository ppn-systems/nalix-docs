---
title: Packet Schema Generator
description: Incremental Roslyn source generator (PacketSchemaGenerator) that computes compile-time wire sizes, dynamic Length properties, and ResetForPool() overrides for partial PacketBase<TSelf> classes.
section: API Reference
package: Nalix.Analyzers
---

`PacketSchemaGenerator` (`analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`) is an incremental Roslyn source generator that inspects every class inheriting from `PacketBase<TSelf>` and generates `Length` overrides, zero-allocation `ResetForPool()` implementations, and `public static int Size` (when implementing `IFixedSizeSerializable`).

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## What It Generates

For every `partial` class inheriting from `PacketBase<TSelf>`:

1. **`public override int Length { get; }`**:
   - Computes the exact serialized byte length of the packet (`PacketConstants.HeaderSize` = 6 bytes plus all serialized fields/properties across the inheritance hierarchy).
   - For dynamic members (`string`, `byte[]`, `T[]`, `List<T>`), adds a 4-byte length prefix (`4` bytes per dynamic member) plus `Encoding.UTF8.GetByteCount(...)` for strings or `count * elementSize` for collections.
2. **`public override void ResetForPool()`** (unless manually overridden by the user):
   - Calls `base.ResetForPool()`.
   - Resets `string` members to `string.Empty`, clears `List<T>` collections (`?.Clear()`), resets `ArraySegment<T>`/`Memory<T>`/`ReadOnlyMemory<T>` to `default`, calls `.ResetForPool()` on nested `IPoolable` members, and resets value types and arrays to `default`.
   - **Respects `[SkipClean]`**: Any field or property decorated with `[SkipClean]` is left untouched during `ResetForPool()`.
3. **`public static int Size => <totalFixedBytes>;`** (emitted when the packet implements `IFixedSizeSerializable`):
   - Provides the compile-time constant wire size required by `IFixedSizeSerializable.Size`.

:::warning[`NALIX060`: Packet Class Must Be `partial`]
If a class inherits from `PacketBase<TSelf>` without the `partial` keyword, `PacketSchemaGenerator` emits error **`NALIX060`** because it cannot emit `Length`, `ResetForPool()`, or `Size` into the class.
:::

## Example

### Source Packet Definition

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet(0x1005)]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class PlayerChatPacket : PacketBase<PlayerChatPacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x1005;

    [SerializeOrder(0)]
    public ulong PlayerId { get; set; }

    [SerializeOrder(1)]
    public string Message { get; set; } = string.Empty;

    [SkipClean]
    [SerializeIgnore]
    public int CachedChannelId { get; set; }
}
```

### Generated Companion (`PlayerChatPacket_Schema.g.cs`)

```csharp
public partial class PlayerChatPacket
{
    public override int Length
    {
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        get
        {
            int size = 14; // Header (6B) + PlayerId (8B)
            size += 4 + (this.Message is null ? 0 : System.Text.Encoding.UTF8.GetByteCount(this.Message));
            return size;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public override void ResetForPool()
    {
        base.ResetForPool();
        this.PlayerId = default;
        this.Message = string.Empty;
        // CachedChannelId is skipped because it is marked [SkipClean]
    }
}
```

## Diagnostic Emitted

| ID | Title | Severity | Cause |
| --- | --- | :---: | --- |
| `NALIX060` | Packet class must be partial | Error | A class inherits from `PacketBase<TSelf>` but is missing the `partial` modifier. |

## Related APIs

- [Source Generators Overview](./index.md)
- [Diagnostic Codes](../diagnostic-codes.md)
- [Frame Model (PacketBase<TSelf>)](../../codec/packets/frame-model.md)
- [Serialization Generator](./serialization-generator.md)
