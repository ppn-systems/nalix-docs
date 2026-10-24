---
title: Mô hình Frame
description: Các lớp gói tin cơ sở (FrameBase, PacketBase<TSelf>) và các hàm hỗ trợ biến đổi payload có khung (FrameTransformer, FrameCipher, FrameCompression) trong Nalix.Codec.
section: API Reference
package: Nalix.Codec
---

**Không gian tên:** `Nalix.Codec.DataFrames`, `Nalix.Codec.Transforms`  
**Assembly:** `Nalix.Codec`

Trang này mô tả các lớp cơ sở `Nalix.Codec.DataFrames` (`FrameBase`, `PacketBase<TSelf>`) và các hàm hỗ trợ trong `Nalix.Codec.Transforms` (`FrameTransformer`, `FrameCipher`, `FrameCompression`).

## Ánh xạ mã nguồn

- `src/Nalix.Codec/DataFrames/FrameBase.cs`
- `src/Nalix.Codec/DataFrames/PacketBase.cs`
- `src/Nalix.Codec/Transforms/FrameTransformer.cs`
- `src/Nalix.Codec/Transforms/FrameCipher.cs`
- `src/Nalix.Codec/Transforms/FrameCompression.cs`

## Tổng quan các kiểu công khai

| Kiểu | Thành viên công khai |
| --- | --- |
| `FrameBase` | `Header` (`PacketHeader`), `OpCode` (`ushort`), `Flags` (`PacketFlags`), `Priority` (`PacketPriority`), `SequenceId` (`ushort`), `Length` (`int`), `Serialize()`, `Serialize(Span<byte>)`, `ResetForPool()` (`abstract`) |
| `PacketBase<TSelf>` | Kế thừa `FrameBase`; triển khai `IPacketDeserializer<TSelf>`, `IPoolable`, `IDisposable`; thêm `Create()`, `Deserialize(ReadOnlySpan<byte>)`, `OnRent()`, `ResetForPool()` (`virtual`), `Dispose()`, `ToString()` |
| `PacketFactory<TPacket>` | `Acquire()` (`PacketScope<TPacket>`), `AcquireBatch(int count)` (`PacketBatchScope<TPacket>`) |
| `PacketSchema<TSelf>` | `static int StaticSize { get; set; }` — kích thước tĩnh tối thiểu của header gói tin và các trường có kích thước cố định (`Nalix.Codec.DataFrames`); `PacketBase<TSelf>.Deserialize` kiểm tra độ dài buffer đầu vào với giá trị này. Ràng buộc: `TSelf : PacketBase<TSelf>, IPacketStaticOpcode, new()` |
| `EnumExtensions` | `Nalix.Codec.Extensions`: `AddFlag<TEnum>(this TEnum, TEnum mask)` và `RemoveFlag<TEnum>(this TEnum, TEnum mask)` cho các kiểu `unmanaged, Enum` có kích thước 1, 2, 4 hoặc 8 byte (OR / AND-NOT theo bit; kích thước khác sẽ ném `NotSupportedException`; bản DEBUG ném `ArgumentException` khi enum thiếu `[Flags]`) |
| `ValueTaskExtensions` | `Nalix.Codec.Extensions`: `ValueTask DisposeOnCompletionAsync<TPacket>(this ValueTask pending, PacketScope<TPacket> lease)` — giải phóng `PacketScope` khi `pending` hoàn tất (đồng bộ nếu đã hoàn tất thành công, nếu không thì trong khối `finally` sau khi await) |
| `FrameTransformer` | `Offset = 6`, `GetMaxCiphertextSize`, `GetPlaintextLength`, `TryGetPlaintextLength`, `GetMaxCompressedSize`, `GetDecompressedLength`, `TryGetDecompressedLength`, `Encrypt`, `Decrypt`, `TryDecrypt`, `Compress`, `Decompress`, `TryDecompress` |
| `FrameCipher` | `EncryptFrame`, `DecryptFrame`, `TryDecryptFrame` |
| `FrameCompression` | `CompressFrame`, `DecompressFrame`, `TryDecompressFrame` |

## `FrameBase`

`FrameBase` (`Nalix.Codec.DataFrames.FrameBase`) là lớp trừu tượng cơ sở, triển khai `IPacket` và `IPacketHeader`.

- **`Header`** (`[SerializeHeader(0)]`): Struct `PacketHeader` 6 byte (`OpCode`, `Flags`, `Priority`, `SequenceId`).
- **Thuộc tính facade**: `OpCode`, `Flags`, `Priority` và `SequenceId` đọc và thay đổi trực tiếp `Header`.
- **`Length`**: Thuộc tính `int` trừu tượng, trả về tổng số byte sau khi tuần tự hóa của gói tin (bao gồm header 6 byte).
- **`Serialize()` / `Serialize(Span<byte> buffer)`**: Tuần tự hóa gói tin vào một `byte[]` mới cấp phát hoặc vào `Span<byte>` do bên gọi cung cấp, trả về số byte đã ghi.
- **`ResetForPool()`**: Phương thức trừu tượng được `PacketBase<TSelf>` triển khai (và các override do source generator sinh ra mở rộng) để đặt lại trạng thái gói tin trước khi trả về object pool.

## `PacketBase<TSelf>`

`PacketBase<TSelf>` (`where TSelf : PacketBase<TSelf>, IPacketStaticOpcode, new()`) được gắn `[Packet]` (`Inherited = true`) và triển khai `IPacketDeserializer<TSelf>`, `IPoolable` và `IDisposable`:

- **Sinh mã lúc biên dịch**:
  - Kế thừa `PacketBase<TSelf>` sẽ kế thừa `[Packet]`; các lớp con thêm `[GenerateFormatter]` và `[SerializePackable(...)]` để kích hoạt [PacketSchemaGenerator](../../analyzers/autogen/packet-schema-generator.md) (sinh `Length`, `ResetForPool()` và `Size`), [SerializeFormatterGenerator](../../analyzers/autogen/serialization-generator.md) (sinh `IFormatter<TSelf>` và `IFillableFormatter<TSelf>`), và [PacketRegistryGenerator](../../analyzers/autogen/packet-registry-generator.md).
  - Các lớp con **bắt buộc** khai báo `partial` (được thực thi bởi lỗi **`NALIX060`**).
- **`static TSelf Create()`**: Lấy một instance từ pool qua `PacketRegistry.Manager` (`IObjectPoolManager`), gọi `OnRent()`, hoặc dùng `new TSelf()` nếu không có.
- **`static TSelf Deserialize(ReadOnlySpan<byte> buffer)`**: Lấy một instance `TSelf` từ pool qua `Create()` và điền dữ liệu tại chỗ qua `LiteSerializer.TryDeserialize(buffer, ref packet, out int bytesRead)`. Nếu giải tuần tự hóa thất bại, sẽ giải phóng `packet` và trả về `null!`.
- **`virtual void ResetForPool()`**: Đặt lại `Flags = PacketFlags.NONE`, `Priority = PacketPriority.NONE`, `SequenceId = 0` và `OpCode = TSelf.StaticOpCode`.
- **`void Dispose()`**: Trả instance về `PacketRegistry.Manager` (`IObjectPoolManager`) dưới khóa `TSelf` nếu nó được lấy từ pool.
- **`override string ToString()`**: Trả về tóm tắt ngắn gọn về kiểu gói tin và các trường header.

### Cách dùng cơ bản

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

## `FrameTransformer`, `FrameCipher` và `FrameCompression`

Cả ba lớp biến đổi đều giữ nguyên header `PacketHeader` 6 byte (`0..FrameTransformer.Offset`, với `FrameTransformer.Offset == 6`) và chỉ thao tác trên vùng payload (`span[6..]`).

### `FrameCipher`

- `IBufferLease EncryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, uint? seq, CipherSuiteType suite)` — Lấy một lease đích từ pool với `BufferLease.TransportHeadroom`, mã hóa payload của `src` qua `FrameTransformer.Encrypt`, đặt `PacketFlags.ENCRYPTED` trong header đích và trả về lease mới.
- `IBufferLease DecryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)` — Hàm giải mã ném ngoại lệ khi lỗi. Lấy một lease đích `zeroOnDispose: true`, giải mã và xác thực payload, đặt `dest.EncryptedOnWire = true`, xóa `PacketFlags.ENCRYPTED` khỏi header đích và trả về `dest`.
- `bool TryDecryptFrame([Borrowed] IBufferLease src, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq, [NotNullWhen(true)] out IBufferLease? dest)` — Hàm giải mã không ném ngoại lệ, được `FramePipeline.TryProcessInbound` sử dụng.

### `FrameCompression`

- `IBufferLease CompressFrame([Borrowed] IBufferLease src)` — Lấy một lease đích với `BufferLease.TransportHeadroom`, nén payload bằng LZ4 và đặt `PacketFlags.COMPRESSED` trong header đích.
- `IBufferLease DecompressFrame([Borrowed] IBufferLease src)` — Hàm giải nén LZ4 ném ngoại lệ khi lỗi; xóa `PacketFlags.COMPRESSED` trên lease trả về và đặt `zeroOnDispose: src.EncryptedOnWire`.
- `bool TryDecompressFrame([Borrowed] IBufferLease src, [NotNullWhen(true)] out IBufferLease? dest)` — Hàm giải nén LZ4 không ném ngoại lệ.

### `FrameTransformer`

Các phương thức biến đổi payload và định kích thước mức thấp, thao tác trên các lease `src` và `dest` do bên gọi cung cấp:

- **Định kích thước**:
  - `int GetMaxCiphertextSize(CipherSuiteType type, int plaintextSize)`
  - `int GetPlaintextLength(ReadOnlySpan<byte> envelope)` / `bool TryGetPlaintextLength(ReadOnlySpan<byte> envelope, out int length)`
  - `int GetMaxCompressedSize(int plaintextSize)`
  - `int GetDecompressedLength(ReadOnlySpan<byte> src)` / `bool TryGetDecompressedLength(ReadOnlySpan<byte> src, out int length)`
- **Biến đổi payload**:
  - `void Encrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, uint? seq, CipherSuiteType suite)`
  - `void Decrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)`
  - `bool TryDecrypt([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest, ReadOnlySpan<byte> key, CipherSuiteType expectedAlgorithm, out uint seq)`
  - `void Compress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`
  - `void Decompress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`
  - `bool TryDecompress([Borrowed] IBufferLease src, [Borrowed] IBufferLease dest)`

## API liên quan

- [Pipeline Frame](../frame-pipeline.md)
- [Registry gói tin](./packet-registry.md)
- [Frame tích hợp sẵn](./built-in-frames.md)
- [Phân mảnh](./fragmentation.md)
- [Cơ bản về tuần tự hóa](../serialization/serialization-basics.md)
