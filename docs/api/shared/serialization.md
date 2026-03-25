# Serialization Helpers

This page covers the public serialization surface in `Nalix.Shared.Serialization`.

## Source mapping

- `src/Nalix.Shared/Serialization/IFormatter.cs`
- `src/Nalix.Shared/Serialization/FormatterProvider.cs`
- `src/Nalix.Shared/Serialization/LiteSerializer.cs`
- `src/Nalix.Shared/Serialization/Formatters/Primitives/*`
- `src/Nalix.Shared/Serialization/Formatters/Collections/*`
- `src/Nalix.Shared/Serialization/Formatters/Automatic/*`

## Main types

- `IFormatter<T>`
- `FormatterProvider`
- `LiteSerializer`

## What it does

This layer provides:

- primitive and collection formatters
- automatic object and struct formatters
- a provider that resolves the right formatter
- a lightweight serializer entry point

## Basic usage

```csharp
byte[] bytes = LiteSerializer.Serialize(model);
MyModel clone = LiteSerializer.Deserialize<MyModel>(bytes);
```

## FormatterProvider

`FormatterProvider` is the registry/resolution layer for formatters.

Use it when you need lower-level control than `LiteSerializer`.

## Example

```csharp
var formatter = FormatterProvider.GetFormatter<MyModel>();
```

## Related APIs

- [Packet Registry](./packet-registry.md)
- [Built-in Frames](./built-in-frames.md)
