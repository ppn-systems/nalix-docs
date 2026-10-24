---
title: DataReader
description: Nalix.Environment.Memory.DataReader is a high-performance, allocation-free ref struct used for reading serialized data from various buffer types.
section: API Reference
package: Nalix.Environment
---

`Nalix.Environment.Memory.DataReader` is a high-performance, allocation-free `ref struct` used for reading serialized data from various buffer types. 

It provides a unified reading abstraction over managed arrays, unmanaged memory pointers, spans, and memories, avoiding the need for multiple overloads in serialization code.

## Supported Data Sources

`DataReader` can be constructed around any of the following underlying types:

- `byte[]`: Managed arrays.
- `ReadOnlySpan<byte>`: Read-only spans.
- `ReadOnlyMemory<byte>`: Read-only memory chunks.
- `byte*`: Unmanaged raw pointers.

## Key Properties & Lifecycle

- `BytesRead` (`int`): The number of bytes that have been consumed/advanced from the buffer.
- `BytesRemaining` (`int`): The number of bytes still available to be read.
- `IsFailed` (`bool`): Gets or sets whether a non-throwing read operation encountered a bounds or format error.
- `Dispose()` (`void`): Resets the reader state and releases any pinned memory handle.

## Reading Data

`DataReader` is designed to be fast and inlineable. It avoids maintaining complex state, relying simply on a reference to the buffer and a position index.

### 1. GetSpanReference

```csharp
public readonly ref byte GetSpanReference(int sizeHint)
```

Retrieves a reference to the first byte in the requested span, ensuring that at least `sizeHint` bytes are available. If `sizeHint` exceeds `BytesRemaining`, a `SerializationFailureException` is thrown.

This method allows for highly optimized, zero-copy reading using `Unsafe.ReadUnaligned` or similar memory operations.

### 2. Advance

```csharp
public void Advance(int count)
```

Advances the internal read position by `count` bytes. This is typically called immediately after reading data via the reference obtained from `GetSpanReference`.

## Example Usage

```csharp
public bool ReadBoolean(ref DataReader reader)
{
    // 1. Get reference to the next byte
    ref byte b = ref reader.GetSpanReference(sizeof(byte));
    
    // 2. Advance the reader position
    reader.Advance(sizeof(byte));
    
    // 3. Return the parsed value
    return b != 0;
}
```

:::tip[Struct Nature]
Because `DataReader` is a `ref struct`, it must be passed by `ref` to methods that need to consume data and advance the cursor. It cannot be stored on the heap or boxed.
:::

---

## LEB128 VarInt Encoding (`Nalix.Environment.Memory.Leb128`)

`Leb128` (`src/Nalix.Environment/Memory/Leb128.cs`) provides branch-free, pointer-accelerated Little-Endian Base 128 (`LEB128`) variable-length integer encoding and decoding (`MaxByteCount = 5`) used by `TransportFraming.VarInt` and protocol headers:

```csharp
namespace Nalix.Environment.Memory;

public static class Leb128
{
    public const int MaxByteCount = 5;

    public static int GetByteCount(uint value);
    public static int GetByteCount(int value);

    public static int Write(Span<byte> buffer, uint value);
    public static int Write(Span<byte> buffer, int value);
    public static int WriteUnrolled(Span<byte> buffer, uint value);

    public static bool TryRead(ReadOnlySpan<byte> buffer, out uint value, out int bytesRead);
    public static bool TryRead(ReadOnlySpan<byte> buffer, out int value, out int bytesRead);
}
```

- `GetByteCount` computes the exact encoded byte length (`1..5`) in $O(1)$ using `BitOperations.LeadingZeroCount`.
- `Write` and `WriteUnrolled` encode `value` into `buffer` and throw `ArgumentException` if `buffer.Length < GetByteCount(value)`.
- `TryRead` returns `false` when `buffer` ends mid-sequence (allowing stream framing readers to wait for more socket bytes) and throws `FormatException` if a sequence exceeds 5 bytes (`OverlongLeb128`).
