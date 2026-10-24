---
title: Snowflake
description: Tham chiếu cho Nalix.Framework.Identifiers.Snowflake và SnowflakeOptions — định danh phân tán 64-bit có thể sắp xếp.
section: API Reference
package: Nalix.Framework
---

**Không gian tên:** `Nalix.Framework.Identifiers` (và `Nalix.Framework.Options`)  
**Assembly:** `Nalix.Framework`

`Snowflake` (`public readonly partial struct Snowflake : ISnowflake, IEquatable<Snowflake>, IComparable<Snowflake>, IEquatable<ISnowflake>`) là định danh gọn 8 byte (64-bit) được dùng xuyên suốt Nalix cho ID kết nối (`IConnection.ConnectionId`), ID worker nền (`IWorkerHandle.Id`), và khóa thực thể phân tán.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Identity/ISnowflake.cs`
- `src/Nalix.Abstractions/Identity/SnowflakeType.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.Equality.cs`
- `src/Nalix.Framework/Identifiers/Snowflake.Serialization.cs`
- `src/Nalix.Framework/Options/SnowflakeOptions.cs`

## Bố cục 64-bit

```text
 63          56 55                            24 23            10 9            0
+--------------+--------------------------------+----------------+--------------+
|  Type (8 b)  |   Value / Timestamp (32 bits)  | Sequence (14b) | Machine (10b)|
+--------------+--------------------------------+----------------+--------------+
```

$$\text{ID} = (\text{Type} \ll 56) \mid (\text{Timestamp} \ll 24) \mid (\text{Sequence} \ll 10) \mid \text{MachineId}$$

| Thành phần | Thuộc tính | Kiểu | Số bit | Dải bit | Mô tả |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Type** | `Type` | `SnowflakeType` | 8 bit | `56..63` | Phân loại thực thể (`System`, `Session`, `Account`, `Message`, v.v.). |
| **Timestamp / Value** | `Value` | `uint` | 32 bit | `24..55` | Unix timestamp tính bằng giây (`Clock.UnixSecondsNowUInt32()`) hoặc giá trị 32-bit tùy chỉnh. |
| **Sequence** | `Sequence` | `ushort` | 14 bit | `10..23` | Bộ đếm đơn điệu theo từng giây (`0..16383`), tránh va chạm trong cùng một giây. |
| **Machine ID** | `MachineId` | `ushort` | 10 bit | `0..9` | Định danh node (`0..1023`, lấy mặc định từ `SnowflakeOptions.MachineId`). |

## Hằng số, thuộc tính & constructor

| Thành phần | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `Size` | `public const int Size = 8;` | Kích thước khi truyền trên mạng và trong bộ nhớ, tính bằng byte (`8`). |
| `Empty` | `public static readonly ISnowflake Empty;` | Định danh rỗng toàn bit 0 (`_combined == 0`). |
| `IsEmpty` | `public bool IsEmpty { get; }` | Trả về `true` khi giá trị 64-bit bên dưới bằng `0`. |
| `Snowflake(ulong)` | `public Snowflake(ulong value)` | Khởi tạo `Snowflake` trực tiếp từ một `ulong` 64-bit đã ghép sẵn. |

## Các phương thức tạo & phân tích

| Phương thức | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `NewId(SnowflakeType)` | `public static Snowflake NewId(SnowflakeType type)` | Tạo `Snowflake` dựa trên timestamp, dùng `SnowflakeOptions.MachineId` đã cấu hình. |
| `NewId(SnowflakeType, ushort)` | `public static Snowflake NewId(SnowflakeType type, ushort machineId = 1)` | Tạo `Snowflake` dựa trên timestamp với `machineId` 10-bit tường minh. |
| `NewId(uint, ushort, SnowflakeType)` | `public static Snowflake NewId(uint value, ushort machineId, SnowflakeType type)` | Ghép `Snowflake` từ `value` 32-bit tường minh, `machineId` 10-bit và `type` (`Sequence = 0`). |
| `NewId(ulong)` | `public static Snowflake NewId(ulong value)` | Bọc một `ulong` 64-bit thô thành `Snowflake`. |
| `FromUInt64` | `public static Snowflake FromUInt64(ulong combined)` | Bí danh của `NewId(combined)`. |
| `FromBytes(ReadOnlySpan<byte>)` | `public static Snowflake FromBytes(ReadOnlySpan<byte> bytes)` | Đọc span 8 byte theo thứ tự little-endian (ném `SerializationFailureException` nếu `bytes.Length != 8`). |
| `FromBytes(byte[])` | `public static Snowflake FromBytes(byte[] bytes)` | Đọc mảng 8 byte theo thứ tự little-endian (ném `SerializationFailureException` nếu `null` hoặc `Length != 8`). |
| `TryParse` | `public static bool TryParse(string? s, out Snowflake result)` | Phân tích chuỗi hexadecimal 16 ký tự do `ToString()` tạo ra. |

## Các phương thức tuần tự hóa & định dạng

| Phương thức | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `ToUInt64()` | `public ulong ToUInt64()` | Trả về `ulong` 64-bit đã ghép thô. |
| `ToByteArray()` | `public byte[] ToByteArray()` | Cấp phát và trả về mảng 8 byte theo thứ tự little-endian. |
| `TryWriteBytes(Span<byte>, out int)` | `public bool TryWriteBytes(Span<byte> destination, out int bytesWritten)` | Ghi 8 byte little-endian vào `destination` mà không cấp phát; trả về `false` nếu `destination.Length < 8`. |
| `TryWriteBytes(Span<byte>)` | `public bool TryWriteBytes(Span<byte> destination)` | Ghi 8 byte little-endian vào `destination`; trả về `false` nếu `destination.Length < 8`. |
| `ToString()` | `public override string ToString()` | Trả về biểu diễn hexadecimal 16 ký tự viết hoa của 8 byte little-endian. |

## `SnowflakeOptions` (`Nalix.Framework.Options`)

Được cấu hình qua `[Snowflake]` trong `default.ini` hoặc `builder.Configure<SnowflakeOptions>(...)`:

| Thuộc tính | Kiểu | Mặc định | Ràng buộc | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `MachineId` | `ushort` | `1` | `[ValueRange(1, 1023)]` | Định danh node 10-bit được nhúng vào các ID do `Snowflake.NewId(SnowflakeType)` tạo ra. |

## Ví dụ sử dụng

```csharp
using System;
using Nalix.Abstractions.Identity;
using Nalix.Framework.Identifiers;

// Tạo định danh phiên mới bằng MachineId đã cấu hình
Snowflake sessionId = Snowflake.NewId(SnowflakeType.Session);

// Tuần tự hóa 8 byte lên dây, không cấp phát bộ nhớ
Span<byte> wireBytes = stackalloc byte[Snowflake.Size];
sessionId.TryWriteBytes(wireBytes, out int written);

// Khôi phục từ span trên dây
Snowflake restored = Snowflake.FromBytes(wireBytes);
ulong rawUInt64 = restored.ToUInt64();
```

## API liên quan

- [Enum dùng chung (SnowflakeType)](../abstractions/enums.md)
- [Trình quản lý tác vụ](./task-manager.md)
- [Hợp đồng kết nối (IConnection.ConnectionId)](../abstractions/connection-contracts.md)
