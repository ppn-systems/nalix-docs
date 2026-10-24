---
title: Mở rộng Reader, Writer và Header
description: Trang này mô tả các API trợ giúp mức thấp xung quanh DataReader, DataWriter và truy cập header gói tin.
section: API Reference
package: Nalix.Codec
---

**Không gian tên:** `Nalix.Codec.Extensions`, `Nalix.Environment.Extensions`  
**Assembly:** `Nalix.Codec`, `Nalix.Environment`

Trang này mô tả các API trợ giúp mức thấp xung quanh `DataReader`, `DataWriter` và truy cập header gói tin.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Extensions/DataReaderExtensions.cs`
- `src/Nalix.Codec/Extensions/DataWriterExtensions.cs`
- `src/Nalix.Environment/Extensions/HeaderExtensions.cs`

## Các kiểu chính

- `DataReaderExtensions`
- `DataWriterExtensions`
- `HeaderExtensions`

## Thành viên công khai tổng quan

| Kiểu | Thành viên công khai |
|---|---|
| `DataReaderExtensions` | `ReadByte`, `ReadSByte`, `ReadInt16`, `ReadUInt16`, `ReadInt32`, `ReadUInt32`, `ReadInt64`, `ReadUInt64`, `ReadChar`, `ReadSingle`, `ReadDouble`, `ReadBoolean`, `ReadEnumByte`, `ReadEnumSByte`, `ReadEnumInt16`, `ReadEnumUInt16`, `ReadEnumInt32`, `ReadEnumUInt32`, `ReadBytes`, `ReadRemainingBytes`, `ReadUnmanaged`, `Remaining` |
| `DataWriterExtensions` | Các overload `Write`, `WriteEnum`, `WriteUnmanaged` cho giá trị nguyên thủy, span, enum (1/2/4 byte) và giá trị không quản lý |
| `HeaderExtensions` | Các overload `AsHeaderRef` cho `Span<byte>` và `ReadOnlySpan<byte>` |

## Khi nào dùng các hàm trợ giúp này

Dùng các API này khi bạn:

- tự triển khai tuần tự hóa gói tin
- kiểm tra header gói tin trước khi giải tuần tự hóa đầy đủ
- viết mã thông lượng cao cần tránh cấp phát thêm

Các hàm trợ giúp này nằm dưới luồng `LiteSerializer` và `PacketBase<TSelf>` thông thường.

## DataReaderExtensions

`DataReaderExtensions` bổ sung các hàm đọc nguyên thủy và enum trực tiếp lên `DataReader`.

Một số phương thức hữu ích:

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

`DataWriterExtensions` bổ sung các hàm ghi tương ứng cho giá trị nguyên thủy, enum, span và giá trị không quản lý.

Một số phương thức hữu ích:

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
- `WriteEnum<TEnum>(value)` (hỗ trợ kiểu enum nền 1, 2 và 4 byte; ném `NotSupportedException` với enum 8 byte)
- `WriteUnmanaged<T>(value)`

## HeaderExtensions

`HeaderExtensions` cung cấp truy cập header gói tin không sao chép trên các span byte thô, dùng `MemoryMarshal`.

Điều này hữu ích khi bạn muốn kiểm tra hoặc sửa đổi thông tin giao thức mà không sao chép hay cấp phát bộ nhớ.

Một số phương thức hữu ích:

- `AsHeaderRef()` — trả về một `ref PacketHeader` (hoặc `ref readonly PacketHeader`) trỏ trực tiếp vào span.

Truy cập từng trường thông qua tham chiếu `PacketHeader` trả về:

```csharp
ref readonly PacketHeader header = ref span.AsHeaderRef();
ushort opCode = header.OpCode;
PacketFlags flags = header.Flags;
PacketPriority priority = header.Priority;
ushort sequenceId = header.SequenceId;
```

## Cách dùng cơ bản

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
header.SequenceId = 123; // Thay đổi trực tiếp
```

## Ghi chú thiết kế

- `DataReaderExtensions` và `DataWriterExtensions` được đánh dấu là hàm trợ giúp ẩn trong editor, nhưng vẫn là một phần của bề mặt API công khai.
- `HeaderExtensions` hoạt động trực tiếp trên `Span<byte>` và `ReadOnlySpan<byte>`, và được thiết kế cho các hot path cần kiểm tra header nhanh.
- Các hàm trợ giúp này giả định bố cục header gói tin của Nalix và đọc little-endian tường minh để đảm bảo tính ổn định của giao thức.

### Lỗi thường gặp

- Dùng các hàm trợ giúp này khi `LiteSerializer` hoặc `PacketBase<TSelf>` đã cung cấp đúng cấu trúc bạn cần.
- Đọc trường header tại sai offset byte.
- Trộn lẫn giả định về endianness với bố cục wire cố định của Nalix.

## API liên quan

- [Tuần tự hóa](./serialization-basics.md)
- [Mô hình Frame](../packets/frame-model.md)
- [Registry gói tin](../packets/packet-registry.md)
