---
title: Snowflake
description: Reference for Nalix.Framework.Identifiers.Snowflake and SnowflakeOptions — 64-bit sortable distributed identifiers.
section: API Reference
package: Nalix.Framework
---

**Namespace:** `Nalix.Framework.Identifiers` (and `Nalix.Framework.Options`)  
**Assembly:** `Nalix.Framework`

`Snowflake` (`public readonly partial struct Snowflake : ISnowflake, IEquatable<Snowflake>, IComparable<Snowflake>, IEquatable<ISnowflake>`) is a compact 8-byte (64-bit) identifier used across Nalix for connection IDs (`IConnection.ConnectionId`), background worker IDs (`IWorkerHandle.Id`), and distributed entity keys.

## Source Mapping

- `src/Nalix.Abstractions/Identity/ISnowflake.cs`
- `src/Nalix.Abstractions/Identity/SnowflakeType.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.Equality.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.Serialization.cs`
- `src/Nalix.Framework/Options/SnowflakeOptions.cs`

## 64-Bit Layout

```text
 63          56 55                            24 23            10 9            0
+--------------+--------------------------------+----------------+--------------+
|  Type (8 b)  |   Value / Timestamp (32 bits)  | Sequence (14b) | Machine (10b)|
+--------------+--------------------------------+----------------+--------------+
```

$$\text{ID} = (\text{Type} \ll 56) \mid (\text{Timestamp} \ll 24) \mid (\text{Sequence} \ll 10) \mid \text{MachineId}$$

| Component | Property | Type | Bits | Bit Range | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Type** | `Type` | `SnowflakeType` | 8 bits | `56..63` | Entity classification (`System`, `Session`, `Account`, `Message`, etc.). |
| **Timestamp / Value** | `Value` | `uint` | 32 bits | `24..55` | Unix timestamp in seconds (`Clock.UnixSecondsNowUInt32()`) or custom 32-bit value. |
| **Sequence** | `Sequence` | `ushort` | 14 bits | `10..23` | Monotonic per-second counter (`0..16383`) preventing collisions within the same second. |
| **Machine ID** | `MachineId` | `ushort` | 10 bits | `0..9` | Node identifier (`0..1023`, defaulted from `SnowflakeOptions.MachineId`). |

## Constants, Properties & Constructors

| Member | Signature | Description |
| :--- | :--- | :--- |
| `Size` | `public const int Size = 8;` | Wire and memory size in bytes (`8`). |
| `Empty` | `public static readonly ISnowflake Empty;` | All-zero empty identifier (`_combined == 0`). |
| `IsEmpty` | `public bool IsEmpty { get; }` | Returns `true` when the underlying 64-bit value is `0`. |
| `Snowflake(ulong)` | `public Snowflake(ulong value)` | Initializes a `Snowflake` directly from a pre-composed 64-bit `ulong`. |

## Factory & Parsing Methods

| Method | Signature | Description |
| :--- | :--- | :--- |
| `NewId(SnowflakeType)` | `public static Snowflake NewId(SnowflakeType type)` | Generates a timestamp-based `Snowflake` using the configured `SnowflakeOptions.MachineId`. |
| `NewId(SnowflakeType, ushort)` | `public static Snowflake NewId(SnowflakeType type, ushort machineId = 1)` | Generates a timestamp-based `Snowflake` with an explicit 10-bit `machineId`. |
| `NewId(uint, ushort, SnowflakeType)` | `public static Snowflake NewId(uint value, ushort machineId, SnowflakeType type)` | Composes a `Snowflake` from an explicit 32-bit `value`, 10-bit `machineId`, and `type` (`Sequence = 0`). |
| `NewId(ulong)` | `public static Snowflake NewId(ulong value)` | Wraps a raw 64-bit `ulong` into a `Snowflake`. |
| `FromUInt64` | `public static Snowflake FromUInt64(ulong combined)` | Alias for `NewId(combined)`. |
| `FromBytes(ReadOnlySpan<byte>)` | `public static Snowflake FromBytes(ReadOnlySpan<byte> bytes)` | Reads an 8-byte little-endian span (throws `SerializationFailureException` if `bytes.Length != 8`). |
| `FromBytes(byte[])` | `public static Snowflake FromBytes(byte[] bytes)` | Reads an 8-byte little-endian array (throws `SerializationFailureException` if `null` or `Length != 8`). |
| `TryParse` | `public static bool TryParse(string? s, out Snowflake result)` | Parses a 16-character hexadecimal string produced by `ToString()`. |

## Serialization & Formatting Methods

| Method | Signature | Description |
| :--- | :--- | :--- |
| `ToUInt64()` | `public ulong ToUInt64()` | Returns the raw 64-bit combined `ulong`. |
| `ToByteArray()` | `public byte[] ToByteArray()` | Allocates and returns an 8-byte little-endian array. |
| `TryWriteBytes(Span<byte>, out int)` | `public bool TryWriteBytes(Span<byte> destination, out int bytesWritten)` | Writes 8 little-endian bytes into `destination` without allocation; returns `false` if `destination.Length < 8`. |
| `TryWriteBytes(Span<byte>)` | `public bool TryWriteBytes(Span<byte> destination)` | Writes 8 little-endian bytes into `destination`; returns `false` if `destination.Length < 8`. |
| `ToString()` | `public override string ToString()` | Returns the 16-character uppercase hexadecimal representation of the 8 little-endian bytes. |

## `SnowflakeOptions` (`Nalix.Framework.Options`)

Configured via `[Snowflake]` in `default.ini` or `builder.Configure<SnowflakeOptions>(...)`:

| Property | Type | Default | Validation | Description |
| :--- | :--- | :---: | :--- | :--- |
| `MachineId` | `ushort` | `1` | `[ValueRange(1, 1023)]` | 10-bit node identifier embedded in IDs generated by `Snowflake.NewId(SnowflakeType)`. |

## Usage Example

```csharp
using System;
using Nalix.Abstractions.Identity;
using Nalix.Framework.Identifiers;

// Generate a new session identifier using the configured MachineId
Snowflake sessionId = Snowflake.NewId(SnowflakeType.Session);

// Zero-allocation 8-byte wire serialization
Span<byte> wireBytes = stackalloc byte[Snowflake.Size];
sessionId.TryWriteBytes(wireBytes, out int written);

// Reconstruct from wire span
Snowflake restored = Snowflake.FromBytes(wireBytes);
ulong rawUInt64 = restored.ToUInt64();
```

## Related APIs

- [Common Enumerations (SnowflakeType)](../abstractions/enums.md)
- [Task Manager](./task-manager.md)
- [Connection Contracts (IConnection.ConnectionId)](../abstractions/connection-contracts.md)
