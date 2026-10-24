---
title: DataReader
description: Nalix.Environment.Memory.DataReader là một ref struct hiệu năng cao, không cấp phát, dùng để đọc dữ liệu tuần tự hóa từ nhiều loại buffer.
section: API Reference
package: Nalix.Environment
---

`Nalix.Environment.Memory.DataReader` là một `ref struct` hiệu năng cao, không cấp phát, dùng để đọc dữ liệu tuần tự hóa từ nhiều loại buffer.

Lớp này cung cấp một lớp trừu tượng đọc thống nhất trên mảng được quản lý, con trỏ bộ nhớ không quản lý, span và memory, nhờ đó mã tuần tự hóa không cần nhiều overload.

## Nguồn dữ liệu được hỗ trợ

`DataReader` có thể được tạo từ bất kỳ kiểu bên dưới nào sau đây:

- `byte[]`: Mảng được quản lý.
- `ReadOnlySpan<byte>`: Span chỉ đọc.
- `ReadOnlyMemory<byte>`: Khối memory chỉ đọc.
- `byte*`: Con trỏ thô không quản lý.

## Thuộc tính chính & vòng đời

- `BytesRead` (`int`): Số byte đã được tiêu thụ/tiến qua từ buffer.
- `BytesRemaining` (`int`): Số byte còn lại có thể đọc.
- `IsFailed` (`bool`): Lấy hoặc đặt trạng thái cho biết thao tác đọc không ném ngoại lệ có gặp lỗi vượt biên hoặc sai định dạng hay không.
- `Dispose()` (`void`): Đặt lại trạng thái reader và giải phóng mọi handle bộ nhớ đã ghim.

## Đọc dữ liệu

`DataReader` được thiết kế để nhanh và có thể inline. Nó tránh giữ trạng thái phức tạp, chỉ dựa vào một tham chiếu tới buffer và một chỉ số vị trí.

### 1. GetSpanReference

```csharp
public readonly ref byte GetSpanReference(int sizeHint)
```

Lấy tham chiếu tới byte đầu tiên của span được yêu cầu, bảo đảm có ít nhất `sizeHint` byte sẵn sàng. Nếu `sizeHint` vượt quá `BytesRemaining`, một `SerializationFailureException` sẽ được ném ra.

Phương thức này cho phép đọc được tối ưu hóa cao, không sao chép, bằng `Unsafe.ReadUnaligned` hoặc các thao tác bộ nhớ tương tự.

### 2. Advance

```csharp
public void Advance(int count)
```

Tiến vị trí đọc nội bộ thêm `count` byte. Thường được gọi ngay sau khi đọc dữ liệu qua tham chiếu lấy từ `GetSpanReference`.

## Ví dụ sử dụng

```csharp
public bool ReadBoolean(ref DataReader reader)
{
    // 1. Lấy tham chiếu tới byte kế tiếp
    ref byte b = ref reader.GetSpanReference(sizeof(byte));
    
    // 2. Tiến vị trí của reader
    reader.Advance(sizeof(byte));
    
    // 3. Trả về giá trị đã phân tích
    return b != 0;
}
```

:::tip[Bản chất của struct]
Vì `DataReader` là một `ref struct`, nó phải được truyền bằng `ref` vào các phương thức cần tiêu thụ dữ liệu và tiến con trỏ. Nó không thể được lưu trên heap hoặc box.
:::

---

## Mã hóa VarInt LEB128 (`Nalix.Environment.Memory.Leb128`)

`Leb128` (`src/Nalix.Environment/Memory/Leb128.cs`) cung cấp mã hóa và giải mã số nguyên có độ dài thay đổi Little-Endian Base 128 (`LEB128`) không rẽ nhánh, có tăng tốc bằng con trỏ (`MaxByteCount = 5`), được dùng bởi `TransportFraming.VarIntLengthPrefixed` và các header giao thức:

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

- `GetByteCount` tính độ dài byte được mã hóa chính xác (`1..5`) với độ phức tạp $O(1)$, dùng `BitOperations.LeadingZeroCount`.
- `Write` và `WriteUnrolled` mã hóa `value` vào `buffer` và ném `ArgumentException` nếu `buffer.Length < GetByteCount(value)`.
- `TryRead` trả về `false` khi `buffer` kết thúc giữa chừng một chuỗi (để các bộ đọc khung stream có thể chờ thêm byte từ socket) và ném `FormatException` nếu một chuỗi vượt quá 5 byte (`OverlongLeb128`).
