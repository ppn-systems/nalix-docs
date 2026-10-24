---
title: Packet Registry
description: Process-wide source-generated packet opcode catalog and O(1) deserialization table in Nalix.Codec.DataFrames.PacketRegistry.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.DataFrames`  
**Assembly:** `Nalix.Codec`

`PacketRegistry` is a process-wide, thread-safe catalog that maps 16-bit packet opcodes (`ushort`) to compile-time generated `PacketDeserializer` delegates in an $O(1)$ lookup array (`PacketDeserializer?[65536]`).

## Source Mapping

- `src/Nalix.Codec/DataFrames/PacketRegistry.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketRegistryGenerator.cs`

## Core Lifecycle

1. **Static Construction & Compile-Time Registration (`[ModuleInitializer]`)**:
   - The `PacketRegistry` static constructor immediately pre-registers all 11 built-in protocol frames (`Control`, `Directive`, `TimeSync`, `SessionInit`, `SessionChallenge`, `SessionProof`, `SessionEstablished`, `SessionResume`, `SessionTofu`, `ProofOfWorkChallenge`, `ProofOfWorkProof`) and populates the built-in `s_runtimeFastDispatcher`.
   - `PacketRegistryGenerator` discovers all concrete packet classes implementing `IPacket` and `IPacketDeserializer<TSelf>` (with `[Packet]` or `IPacketStaticOpcode`) and emits `PacketRegistryGenerated.Initialize()`, which calls `PacketRegistry.RegisterGenerated<TPacket>(name, deserializer)` and `PacketRegistry.RegisterGenerated(PacketDispatch)`.
2. **Pool Configuration (`PacketRegistry.Configure`)**:
   - `Configure(IObjectPoolManager? manager)` binds the shared `IObjectPoolManager` used by `PacketBase<TSelf>.Create()` and pre-configures pool capacities (`128` each) for all 11 built-in protocol frames.
3. **Freezing the Lookup Table (`PacketRegistry.Build`)**:
   - `Build()` materializes the 65,536-entry `PacketDeserializer?[]` table and composes any registered `PacketDispatch` fast dispatchers (`RegisterGenerated` works both before and after `Build()`). `NetworkApplicationBuilder.Build()` and `TransportSession` call `PacketRegistry.Build()` automatically.

## Public API Reference

| Member | Signature | Description |
| --- | --- | --- |
| `IsBuilt` | `public static bool IsBuilt { get; }` | Returns `true` after `Build()` has been called. |
| `DeserializerCount` | `public static int DeserializerCount { get; }` | Number of registered packet deserializers frozen during `Build()`. |
| `Configure` | `public static void Configure(IObjectPoolManager? manager)` | Sets the shared `IObjectPoolManager` for `PacketBase<TSelf>` pooling and configures pool capacities for built-in protocol frames. |
| `Build` | `public static void Build()` | Idempotently builds and freezes the 65,536-entry opcode lookup table. |
| `RegisterGenerated` | `public static void RegisterGenerated(PacketDispatch dispatcher)` | Registers a fast-path `PacketDispatch` delegate (`bool PacketDispatch(ushort opcode, ReadOnlySpan<byte> raw, out IPacket? packet)`). |
| `RegisterGenerated<TPacket>` | `public static void RegisterGenerated<TPacket>(string name, PacketDeserializer deserializer) where TPacket : IPacket, IPacketStaticOpcode` | Registers a packet deserializer for `TPacket.StaticOpCode`. Throws `InternalErrorException` if a different packet name is already bound to the same opcode. |
| `IsKnownOpCode` | `public static bool IsKnownOpCode(ushort opcode)` | Returns `true` if a deserializer is registered for `opcode` (requires `Build()`). |
| `IsRegistered<TPacket>` | `public static bool IsRegistered<TPacket>() where TPacket : IPacket, IPacketStaticOpcode` | Returns `true` if `TPacket.StaticOpCode` is registered (requires `Build()`). |
| `Deserialize` | `public static IPacket Deserialize(ReadOnlySpan<byte> raw)` | Deserializes `raw` or throws `ArgumentException` (if `< 6` bytes) / `InvalidOperationException` (if not built or opcode is unregistered). |
| `TryDeserialize` | `public static bool TryDeserialize(ReadOnlySpan<byte> raw, [NotNullWhen(true)] out IPacket? packet)` | Non-throwing deserialization. Returns `false` if `raw.Length < 6` (`PacketConstants.HeaderSize`) or if the opcode is unknown. |

## Usage

### 1. Standalone Initialization

`NetworkApplicationBuilder` and `TransportSession` call `PacketRegistry.Build()` automatically. In standalone benchmarks or unit tests, call `Build()` once before deserializing:

```csharp
using Nalix.Codec.DataFrames;
using Nalix.Framework.Memory.Objects;

// Optional: attach ObjectPoolManager so PacketBase<T>.Deserialize rents from the pool
PacketRegistry.Configure(new ObjectPoolManager());

// Freeze the O(1) opcode lookup table
PacketRegistry.Build();
```

### 2. Deserializing Packets

```csharp
using System;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.DataFrames;
using Nalix.Framework.Injection;

if (PacketRegistry.TryDeserialize(bufferLease.Span, out IPacket? packet))
{
    try
    {
        Console.WriteLine($"Decoded OpCode=0x{packet.Header.OpCode:X4}, Type={packet.GetType().Name}");
    }
    finally
    {
        // Dispose pooled PacketBase<TSelf> instances to return them under their concrete TSelf pool key
        (packet as IDisposable)?.Dispose();
    }
}
```

## Related APIs

- [Packet Registry Generator](../../analyzers/autogen/packet-registry-generator.md)
- [Frame Model](./frame-model.md)
- [Built-in Frames](./built-in-frames.md)
- [Packet Contracts](../../abstractions/packet-contracts.md)
- [Packet Dispatch](../../runtime/routing/packet-dispatch.md)
