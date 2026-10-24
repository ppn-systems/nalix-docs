---
title: DataWriter
description: Nalix.Environment.Memory.DataWriter là một bộ đệm ghi có thể thay đổi, mở rộng được và hiệu năng cao, được triển khai dưới dạng ref struct. Nó được thiết kế riêng để xử lý tuần tự hóa thông lượng cao...
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Memory`  
**Assembly:** `Nalix.Environment`

`Nalix.Environment.Memory.DataWriter` là một bộ đệm ghi có thể thay đổi, mở rộng được và hiệu năng cao, được triển khai dưới dạng `ref struct`. Nó được thiết kế riêng để xử lý tuần tự hóa thông lượng cao với chi phí tối thiểu.

## Chế độ buffer

`DataWriter` có thể hoạt động theo hai chế độ khác nhau, tùy theo cách nó được tạo:

1. **Chế độ thuê từ pool (Rented Mode)**: Tạo bằng `new DataWriter(int size)` (cấp phát ít nhất `32` byte qua `Math.Max(size, 32)`). Writer nội bộ thuê một `byte[]` từ `BufferLease.ByteArrayPool`. Ở chế độ này, writer có thể `Expand()` động tới `MemoryOptions.MaxWriterCapacity` (`128 MiB`, tức `134_217_728` byte theo mặc định; vượt quá sẽ ném `SerializationFailureException`). Gọi `Dispose()` sẽ trả mảng đã thuê về pool.
2. **Chế độ cố định (Fixed Mode)**: Tạo bằng `new DataWriter(byte[] buffer)` hoặc `new DataWriter(Span<byte> span)`. Writer bọc một buffer bên ngoài có kích thước cố định. Ở chế độ này, gọi `Expand()` khi không đủ chỗ sẽ ném `InternalErrorException`, và `Dispose()` không thực hiện thao tác pooling nào.

## Thuộc tính chính

- `WrittenCount`: Số byte đã được cam kết thành công vào buffer.
- `FreeBuffer`: Một `Span<byte>` đại diện cho phần còn trống chưa ghi của buffer.

## Ghi dữ liệu

### 1. Expand (đảm bảo dung lượng)

```csharp
public void Expand(int minimumSize)
```

Bảo đảm có ít nhất `minimumSize` byte sẵn sàng trong `FreeBuffer`. Nếu đang ở Rented Mode và dung lượng không đủ, nó sẽ thuê một buffer mới (thường gấp đôi kích thước hiện tại) và sao chép các byte đã ghi sang mảng mới.

### 2. GetFreeBufferReference

```csharp
public readonly ref byte GetFreeBufferReference()
```

Trả về tham chiếu tới byte đầu tiên của vùng trống. Luôn gọi `Expand()` trước khi lấy tham chiếu này để bảo đảm an toàn.

### 3. Advance

```csharp
public void Advance(int count)
```

Tiến con trỏ ghi thêm `count` byte, tức là cam kết chúng vào `WrittenCount`. Ném `ArgumentOutOfRangeException` nếu `count` không dương hoặc vượt quá `FreeBuffer`.

### 4. Write

`DataWriter` cung cấp các hàm ghi trực tiếp tự động mở rộng khi cần (ở Rented Mode):

- `Write<T>(T value) where T : unmanaged`: Ghi trực tiếp một giá trị không quản lý bất kỳ, mở rộng nếu cần.
- `Write(ReadOnlySpan<byte> value)`: Ghi một span byte, mở rộng nếu cần.
- `Write(byte[] value)`: Ghi một mảng byte, mở rộng nếu cần.

Đây là các hàm bao quanh tiện lợi cho `Expand` + `GetFreeBufferReference` + `Advance`.

## Hoàn tất

- `ToArray()`: Sao chép dữ liệu đã cam kết sang một `byte[]` mới, kích thước vừa khít. Cấp phát một mảng mới.
- `Dispose()`: Xóa trạng thái và, nếu đang ở Rented Mode, trả mảng bên dưới về pool.

## Ví dụ sử dụng

```csharp
public void WriteInt32(ref DataWriter writer, int value)
{
    // 1. Bảo đảm có đủ chỗ trống
    writer.Expand(sizeof(int));
    
    // 2. Ghi trực tiếp vào tham chiếu của buffer
    Unsafe.WriteUnaligned(ref writer.GetFreeBufferReference(), value);
    
    // 3. Tiến con trỏ
    writer.Advance(sizeof(int));
}
```

:::warning[Giải phóng tài nguyên]
Luôn dùng khối `using` hoặc gọi `Dispose()` thủ công trên `DataWriter` khi hoạt động ở Rented Mode để tránh rò rỉ bộ nhớ do mảng pool không được trả về.
:::
