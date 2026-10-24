---
title: Đặc tả tuần tự hóa nhị phân của Nalix
description: Tài liệu này định nghĩa định dạng wire được framework Nalix dùng để tuần tự hóa gói tin. Nó dành cho các nhà phát triển triển khai SDK Nalix bằng ngôn ngữ khác C# (ví dụ Rust, Go, TypeScript)...
section: Concepts
---

Tài liệu này định nghĩa định dạng wire được framework Nalix dùng để tuần tự hóa gói tin. Nó dành cho các nhà phát triển triển khai SDK Nalix bằng ngôn ngữ khác C# (ví dụ Rust, Go, TypeScript).

---

## 1. Nguyên tắc cốt lõi

- **Thứ tự byte**: Luôn dùng **Little-Endian** cho mọi kiểu số.
- **Căn lề**: Không có padding hay căn lề giữa các trường. Dữ liệu được đóng gói sát nhau.
- **Giá trị sentinel**:
  - `Null` được biểu diễn bằng `-1` (0xFFFFFFFF) trong các tiền tố độ dài.
  - `Empty` được biểu diễn bằng `0` (0x00000000).
- **Giới hạn**: Độ dài tối đa mặc định cho chuỗi/mảng là **1,048,576 byte (1 MB)**.

---

## 2. Kiểu nguyên thủy có kích thước cố định

Mọi kiểu nguyên thủy có kích thước cố định đều được ghi đúng từng bit theo biểu diễn chuẩn của chúng.

| Kiểu | Byte | Mô tả |
| :--- | :--- | :--- |
| `bool` | 1 | `0x00` = false, `0x01` = true. |
| `byte` / `sbyte` | 1 | Số nguyên 8-bit không dấu/có dấu. |
| `short` / `ushort` | 2 | Số nguyên 16-bit có dấu/không dấu. |
| `int` / `uint` | 4 | Số nguyên 32-bit có dấu/không dấu. |
| `long` / `ulong` | 8 | Số nguyên 64-bit có dấu/không dấu. |
| `float` | 4 | Số thực dấu phẩy động 32-bit (IEEE 754). |
| `double` | 8 | Số thực dấu phẩy động 64-bit (IEEE 754). |
| `char` | 2 | Đơn vị mã UTF-16. |
| `Snowflake` | 8 | Định danh duy nhất 64-bit (tách từ ulong). |
| `Enum` | Tùy loại | Kiểu số nguyên nền (ví dụ `int32`, `byte`). |

### Kiểu nguyên thủy 16 byte đặc biệt

| Kiểu | Byte | Bố cục |
| :--- | :--- | :--- |
| `Guid` | 16 | Nội bộ .NET: `[Data1:int32][Data2:int16][Data3:int16][Data4:8 bytes]`. |
| `decimal` | 16 | Bốn số nguyên 32-bit: `[lo][mid][hi][flags]`. |
| `DateTimeOffset` | 16 | `[DateTime:8 bytes][OffsetTicks:8 bytes]`. |

---

## 3. Kiểu chuyên biệt

### Value Tuple

`ValueTuple<T1, T2, ...>` và tuple C# `(a, b)` được tuần tự hóa thành chuỗi các thành phần của nó, không có header hay metadata.

- **Định dạng**: `[Element 0][Element 1]...[Element N]`

### Memory<`T`> và ReadOnlyMemory<`T`>

Chỉ hỗ trợ các kiểu phần tử unmanaged cho tuần tự hóa bộ nhớ trực tiếp.

- **Định dạng**: `[Count:int32][RawBytes...]`
- **Tối ưu**: Đây là phép "blit" trực tiếp của vùng đệm bộ nhớ.

### Ngày và giờ

Các kiểu thời gian được tuần tự hóa thành số nguyên 64-bit có dấu biểu diễn **Ticks** (1 tick = 100ns kể từ 0001-01-01).

| Kiểu | Byte | Mô tả |
| :--- | :--- | :--- |
| `DateTime` | 8 | Tổng số tick. |
| `TimeSpan` | 8 | Khoảng thời gian tính bằng tick. |
| `DateOnly` | 4 | Số ngày kể từ epoch (Int32). |
| `TimeOnly` | 8 | Số tick kể từ nửa đêm (Int64). |

---

## 4. Chuỗi và blob

Được mã hóa thành chuỗi UTF-8 có tiền tố độ dài.

| Trường | Kiểu | Mô tả |
| :--- | :--- | :--- |
| **Length** | `int32` | Số byte UTF-8. `-1` cho null, `0` cho chuỗi rỗng. |
| **Bytes** | `byte[]` | Phần payload UTF-8 thô. |

---

## 5. Cơ chế nullable

Nalix dùng **cờ hiện diện 1 byte** để xử lý dữ liệu tùy chọn cho các kiểu không có giá trị sentinel sẵn có.

### Kiểu giá trị nullable (`T?`)

- **Định dạng**: `[Presence:byte][Value:T]`
  - `0x00`: Null.
  - `0x01`: Có giá trị (theo sau là dữ liệu của `T`).

### Kiểu tham chiếu nullable (trường của lớp)

Khi một thành viên của lớp là kiểu tham chiếu (ví dụ `public MyClass? Item { get; set; }`):

- **Định dạng**: `[Presence:byte][ObjectData...]`
  - `0x00`: Tham chiếu null.
  - `0x01`: Instance có mặt (theo sau là dữ liệu tuần tự hóa đệ quy của đối tượng).

---

## 6. Collection

### Bố cục chuẩn

Array, List, HashSet, Stack và Queue đều theo một mẫu thống nhất:

- **Định dạng**: `[Count:int32][Element 0][Element 1]...`
- **Thứ tự**:
  - `Stack<T>`: Từ đỉnh xuống đáy (theo thứ tự duyệt).
  - `Queue<T>`: Thứ tự FIFO.

### Tối ưu hiệu năng: Blitting

Nếu kiểu phần tử `T` là **Unmanaged** hoặc **Enum**, Nalix dùng đường "Fast-Path" (blit):

- Toàn bộ mảng/list được ghi thành một khối bộ nhớ duy nhất sau `Count`.

### Dictionary

- **Định dạng**: `[Count:int32][Key 0][Value 0][Key 1][Value 1]...`

---

## 7. Bố cục kiểu phức tạp

### Bố cục tự động (`[SerializePackable]`)

Các trường được sắp xếp tại thời điểm biên dịch/warmup để giảm khoảng trống bộ nhớ. Parser phải tái tạo đúng thứ tự này:

1. **Header**: Các trường có `[SerializeHeader(Order)]`. Sắp xếp theo `Order` tăng dần.
2. **Thân**: Các trường còn lại, sắp xếp theo **kích thước kiểu (giảm dần)**.
   - *Kiểu nguyên thủy*: Kích thước cố định (1, 2, 4, 8, 16).
   - *Kiểu tham chiếu*: Tính là 8 byte (kích thước con trỏ).
   - *Enum*: Kích thước của kiểu nền.
3. **Tiêu chí phụ**: Nếu kích thước bằng nhau, dùng **thứ tự khai báo** (khám phá tuần tự từ lớp dẫn xuất đến lớp cơ sở).

### Bố cục tường minh (`SerializeLayout.Explicit`)

Các trường được ghi nghiêm ngặt theo thứ tự tăng dần của giá trị thuộc tính `[SerializeOrder(Order)]`.

---

## 8. Hướng dẫn triển khai cho nhà phát triển SDK

| Ngôn ngữ | Khuyến nghị |
| :--- | :--- |
| **Rust** | Dùng `zerocopy` cho các kiểu nguyên thủy và `std::io::Cursor` cho stream. |
| **Go** | Dùng `encoding/binary.LittleEndian`. |
| **C++** | Dùng `memcpy` cho các collection blittable sau khi đảm bảo chuyển đổi `Endianness`. |
| **JS/TS** | Dùng `DataView` hoặc `Buffer` để cắt lát thủ công. |
