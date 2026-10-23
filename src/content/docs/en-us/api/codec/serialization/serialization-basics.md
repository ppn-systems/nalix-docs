---
title: Serialization Basics
description: Zero-reflection binary serialization entry point (LiteSerializer), formatter registry (FormatterProvider), and SerializationOptions in Nalix.Codec.Serialization.
section: API Reference
package: Nalix.Codec
---

**Namespaces:** `Nalix.Codec.Serialization`, `Nalix.Codec.Options`  
**Assembly:** `Nalix.Codec`

`Nalix.Codec.Serialization` provides the zero-reflection binary serializer (`LiteSerializer`), the AOT-safe formatter registry (`FormatterProvider`), and the `IFormatter<T>` / `IFillableFormatter<T>` contracts used across all Nalix packets and models.

## Source Mapping

- `src/Nalix.Codec/Serialization/IFormatter.cs`
- `src/Nalix.Codec/Serialization/IFillableFormatter.cs`
- `src/Nalix.Codec/Serialization/FormatterProvider.cs`
- `src/Nalix.Codec/Serialization/LiteSerializer.cs`
- `src/Nalix.Codec/Options/SerializationOptions.cs`
- `src/Nalix.Codec/Serialization/Formatters/Collections/*.cs`
- `src/Nalix.Codec/Serialization/Formatters/Primitives/*.cs`
- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`

## Main Types

- `LiteSerializer`
- `FormatterProvider`
- `IFormatter<T>` & `IFillableFormatter<T>`
- `SerializationOptions`

## `LiteSerializer`

`LiteSerializer` is the primary static serialization entry point. Unmanaged types (`int`, `float`, `PacketHeader`, `Bytes32`, etc.) take a fast unaligned memory path (`Unsafe.WriteUnaligned` / `Unsafe.ReadUnaligned`), while complex types and collections dispatch through `FormatterProvider` via a static generic cache (`RootFormatterCache<T>`).

### Public Overloads

| Operation | Signatures | Notes |
|---|---|---|
| **Serialize to `byte[]`** | `byte[] Serialize<T>(in T value)` | Allocates an exact-sized `byte[]` for unmanaged and `IFixedSizeSerializable` types, or uses a pooled `DataWriter(2048)` for variable-length types. |
| **Serialize into caller buffer** | `int Serialize<T>(in T value, byte[] buffer)`<br/>`int Serialize<T>(in T value, Span<byte> buffer)` | Writes directly into `buffer` and returns bytes written. Span-backed `DataWriter` never allocates; throws if `buffer` is too small. |
| **Deserialize into `ref T`** | `int Deserialize<T>(byte[] buffer, ref T value)`<br/>`int Deserialize<T>(ReadOnlyMemory<byte> buffer, ref T value)`<br/>`int Deserialize<T>(ReadOnlySpan<byte> buffer, ref T value)` | Returns bytes read. When `value` is non-null and the formatter implements `IFillableFormatter<T>`, populates `value` in place via `Fill`. |
| **Deserialize new instance** | `T Deserialize<T>(byte[] buffer, out int bytesRead)`<br/>`T Deserialize<T>(ReadOnlyMemory<byte> buffer, out int bytesRead)`<br/>`T Deserialize<T>(ReadOnlySpan<byte> buffer, out int bytesRead)` | Deserializes and returns `T` (for `PacketBase<TSelf>`, rents an instance from the object pool via `Create()`) and outputs `bytesRead`. |
| **In-place `Fill`** | `int Fill<T>(byte[] buffer, ref T value)`<br/>`int Fill<T>(ReadOnlyMemory<byte> buffer, ref T value)`<br/>`int Fill<T>(ReadOnlySpan<byte> buffer, ref T value)` | Explicitly requires an `IFillableFormatter<T>` and a non-null `value`, rehydrating `value` in place without allocating. |
| **Register custom formatter** | `void Register<T>(IFormatter<T> formatter)` | Delegates to `FormatterProvider.Register<T>(formatter)`. |

### Example

```csharp
using System;
using Nalix.Codec.Serialization;

byte[] bytes = LiteSerializer.Serialize(model);
MyModel clone = LiteSerializer.Deserialize<MyModel>(bytes, out int bytesRead);

Span<byte> scratch = stackalloc byte[256];
int written = LiteSerializer.Serialize(model, scratch);
```

## `FormatterProvider`

`FormatterProvider` is the AOT-safe global formatter registry. Its static constructor pre-registers formatters for all built-in unmanaged types (`char`, `byte`, `sbyte`, `short`, `int`, `long`, `ushort`, `uint`, `ulong`, `float`, `double`, `bool`, `decimal`, `Guid`, `DateOnly`, `DateTime`, `TimeSpan`, `TimeOnly`, `DateTimeOffset`), strings, nullable values, arrays, lists, queues, stacks, hash sets, `Memory<T>`, `ReadOnlyMemory<T>`, and common `Dictionary<K, V>` and `ValueTuple` combinations.

### Public Methods on `FormatterProvider`

| Method | Signature | Purpose |
| --- | --- | --- |
| `Get<T>` | `public static IFormatter<T> Get<T>()` | Resolves the cached, source-generated, enum, or complex formatter for `T` (throws `SerializationFailureException` if unregistered). |
| `GetComplex<T>` | `public static IFormatter<T> GetComplex<T>()` | Resolves the registered complex struct or class formatter from `ComplexTypeCache<T>`. |
| `Register<T>` | `public static void Register<T>(IFormatter<T> formatter)` | Registers a custom `IFormatter<T>` in `FormatterCache<T>.Instance`. |
| `RegisterComplex<T>` | `public static void RegisterComplex<T>(IFormatter<T> formatter)` | Registers a complex struct or class formatter via `Interlocked.CompareExchange` (first writer wins). |
| `RegisterGenerated<T>` | `public static void RegisterGenerated<T>(IFormatter<T> formatter)` | Called by `[ModuleInitializer]` code emitted by `SerializeFormatterGenerator`. |
| `RegisterAllFormatters<T>` | `public static void RegisterAllFormatters<T>() where T : unmanaged` | Pre-registers `UnmanagedFormatter<T>`, `ArrayFormatter<T>`, `NullableFormatter<T>`, `NullableArrayFormatter<T>`, `ListFormatter<T>`, `QueueFormatter<T>`, `StackFormatter<T>`, `HashSetFormatter<T>`, `MemoryFormatter<T>`, `ReadOnlyMemoryFormatter<T>`, and `DictionaryFormatter<string/int/long, T>()` for a custom unmanaged struct or enum. |
| `RegisterCollectionFormatters<T>` | `public static void RegisterCollectionFormatters<T>() where T : class` | Pre-registers `ReferenceListFormatter<T>` (`List<T>`) and `ReferenceArrayFormatter<T>` (`T[]`) for a reference type. |
| `RegisterDictionary<TKey, TValue>` | `public static void RegisterDictionary<TKey, TValue>() where TKey : notnull` | Pre-registers `DictionaryFormatter<TKey, TValue>()`. |
| `RegisterTuple<...>` | `public static void RegisterTuple<T1, T2>()` (arities 2..5) | Pre-registers `ValueTupleFormatter<...>` for arities 2 through 5. |

## Formatter Contracts (`IFormatter<T>` & `IFillableFormatter<T>`)

```csharp
using Nalix.Environment.Memory;

namespace Nalix.Codec.Serialization;

public interface IFormatter<T>
{
    void Serialize(ref DataWriter writer, in T value);
    T Deserialize(ref DataReader reader);
}

public interface IFillableFormatter<T> : IFormatter<T>
{
    void Fill(ref DataReader reader, T value);
}
```

## `SerializationOptions` (`Nalix.Codec.Options`)

Loaded from the `[Serialization]` section of `server.ini` via `ConfigurationManager.Instance.Get<SerializationOptions>()`:

| Property | Type | Default | Validation | Description |
| --- | --- | ---: | --- | --- |
| `MaxArrayLength` | `int` | `1_048_576` (1M) | `[ValueRange(1, int.MaxValue)]` | Maximum allowed element count for arrays and collections during deserialization. |
| `MaxStringLength` | `int` | `1_048_576` (1M) | `[ValueRange(1, int.MaxValue)]` | Maximum allowed UTF-8 byte length for strings during deserialization. |
| `MaxDeserializationDepth` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Maximum nested object/collection depth during deserialization. |

## Encoding Rules & Guardrails

| Shape | Wire Encoding | Guardrail |
|---|---|---|
| **Unmanaged value** | Raw little-endian / unaligned bytes (`sizeof(T)`). | Reader requires at least `sizeof(T)` remaining bytes. |
| **Array / Collection** | 4-byte `int` element count (`SerializerBounds.Null = -1` for `null`, `0` for empty) followed by elements. | Count must not exceed `SerializationOptions.MaxArrayLength`. |
| **`string`** | 4-byte `int` UTF-8 byte length (`SerializerBounds.Null = -1` for `null`, `0` for `""`) followed by UTF-8 bytes. | Byte length must not exceed `SerializationOptions.MaxStringLength`. |
| **`enum`** | Encoded as its underlying integral type (`byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong`) via `EnumFormatter<T>`. | Zero boxing via `Unsafe.As`. |

## Related APIs

- [Packet Serialization](./packet-serialization.md)
- [Serialization Generator](../../analyzers/autogen/serialization-generator.md)
- [Serialization Attributes](../../abstractions/serialization-attributes.md)
- [How Packets Work](../../../concepts/how-packets-work.md)
- [Custom Serialization Providers Guide](../../../guides/extensibility/serialization-providers.md)
