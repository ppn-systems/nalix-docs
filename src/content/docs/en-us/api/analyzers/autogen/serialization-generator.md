---
title: Serialization Generator
description: Incremental Roslyn source generator (SerializeFormatterGenerator) that emits zero-reflection IFormatter<T> and IFillableFormatter<T> binary serializers for [GenerateFormatter] types.
section: API Reference
package: Nalix.Analyzers
---

`SerializeFormatterGenerator` (`analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`) is an incremental Roslyn source generator that emits `IFormatter<T>` and `IFillableFormatter<T>` implementations at compile time for classes and structs annotated with `[GenerateFormatter]`.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## How It Works

1. **Target Discovery & Validation**:
   - Scans all classes and structs marked with `[GenerateFormatter]` (inherited automatically by `PacketBase<TSelf>` subclasses).
   - For reference types (`class`), verifies that an accessible static `Create()` method exists (`PacketBase<TSelf>.Create()` satisfies this automatically). If a custom `[GenerateFormatter]` class does not inherit `PacketBase<TSelf>` and lacks `static T Create()`, the generator reports error **`NALIX059`**.
2. **Layout & Member Ordering**:
   - Inspects `[SerializePackable(SerializeLayout.Explicit)]` vs. `[SerializePackable(SerializeLayout.Sequential)]`.
   - Orders fields and properties across the inheritance hierarchy (starting with `PacketBase.Header` at `[SerializeHeader(PacketHeaderOffset.Header)]` order `0`).
   - Excludes `[SerializeIgnore]` members.
3. **Formatter Generation**:
   - For reference types (`class`), implements both `IFormatter<T>` and `IFillableFormatter<T>`, renting pooled instances via `T.Create()` during `Deserialize(ref DataReader)` and populating them in-place via `Fill(ref DataReader, T value)`.
   - For value types (`struct`), implements `IFormatter<T>`.
4. **Automatic `[ModuleInitializer]` Registration**:
   - Emits `GeneratedFormattersBootstrap.InitializeGeneratedFormatters()` which calls:
     - `FormatterProvider.RegisterGenerated<T>(new T_Formatter())` (or `FormatterProvider.RegisterComplex<T>(...)`)
     - `FormatterProvider.RegisterCollectionFormatters<TElement>()` for any `TElement[]` or `List<TElement>` member
     - `FormatterProvider.RegisterDictionary<TKey, TValue>()` for any `Dictionary<TKey, TValue>` member
     - `FormatterProvider.RegisterTuple<T1, ...>()` for any `ValueTuple<...>` member

## Example

### 1. Source Packet Definition

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet(0x1001)]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Sequential)]
public sealed partial class DynamicHintStringPacket : PacketBase<DynamicHintStringPacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x1001;

    [SerializeDynamicSize(64)]
    public string Message { get; set; } = string.Empty;
}
```

### 2. Generated Formatter Code

```csharp
[StackTraceHidden]
[DebuggerStepThrough]
[SkipLocalsInit]
internal sealed class DynamicHintStringPacketFormatter :
    IFillableFormatter<DynamicHintStringPacket>,
    IFormatter<DynamicHintStringPacket>
{
    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public void Serialize(ref DataWriter writer, in DynamicHintStringPacket value)
    {
        ArgumentNullException.ThrowIfNull(value, "value");

        // 6-byte PacketHeader (Order 0) is written first
        (ref writer).WriteUnmanaged(value.Header);

        IFormatter<string> formatter = FormatterProvider.Get<string>();
        string message = value.Message;
        formatter.Serialize(ref writer, in message);
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public DynamicHintStringPacket Deserialize(ref DataReader reader)
    {
        // Rents an instance from ObjectPoolManager via PacketBase<TSelf>.Create()
        DynamicHintStringPacket instance = PacketBase<DynamicHintStringPacket>.Create();
        this.Fill(ref reader, instance);
        return instance;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public void Fill(ref DataReader reader, DynamicHintStringPacket value)
    {
        ArgumentNullException.ThrowIfNull(value, "value");

        value.Header = (ref reader).ReadUnmanaged<PacketHeader>();
        value.Message = FormatterProvider.Get<string>().Deserialize(ref reader);
    }
}
```

## Diagnostic Emitted

| ID | Title | Severity | Cause |
| --- | --- | :---: | --- |
| `NALIX059` | Missing static `Create()` method | Error | A reference type marked `[GenerateFormatter]` does not define a static `Create()` factory method. |

## Related APIs

- [Source Generators Overview](./index.md)
- [Packet Schema Generator](./packet-schema-generator.md)
- [Serialization Basics](../../codec/serialization/serialization-basics.md)
- [Packet Serialization](../../codec/serialization/packet-serialization.md)
