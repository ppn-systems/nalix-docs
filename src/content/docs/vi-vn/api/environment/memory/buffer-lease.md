---
title: BufferLease
description: Tham chiếu cho Nalix.Environment.Memory.BufferLease và IBufferLease — các lát byte[] lấy từ pool, có bộ đếm tham chiếu, headroom cho transport và xóa dữ liệu mật mã.
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Memory`  
**Assembly:** `Nalix.Environment`

`BufferLease` (`public sealed class BufferLease : IBufferLease, IPoolable`) đại diện cho một lát `byte[]` được lấy từ pool, có quyền sở hữu và bộ đếm tham chiếu. Cả mảng `byte[]` bên dưới lẫn lớp vỏ `BufferLease` đều được tái sử dụng qua pool để xử lý thông điệp không cấp phát.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/IBufferLease.cs`
- `src/Nalix.Environment/Memory/BufferLease.cs`
- `src/Nalix.Environment/Options/MemoryOptions.cs`

## Kiến trúc pooling lớp vỏ

Để tránh cấp phát heap khi bao bọc các mảng byte đã thuê, `BufferLease` tái chế các instance lớp của chính nó qua một cache hai tầng không khóa, được cấu hình bởi `MemoryOptions`:
1. **Cache `[ThreadStatic]` L1 (`ThreadLocalLeaseCache`)**: Cache riêng cho từng thread (`MemoryOptions.BufferLeaseThreadLocalCacheMaxSlots`, mặc định `8` slot) cho các chu kỳ rent/dispose cùng thread không tranh chấp.
2. **Mảng dùng chung có phân mảnh L2 (`s_sharedPool`)**: Mảng dự phòng `Interlocked.Exchange` không khóa (`MemoryOptions.BufferLeaseSharedPoolSize`, mặc định `64` slot, hoặc `IObjectPoolManager` khi được cấu hình qua `BufferLease.Configure(IObjectPoolManager)`).

## Hằng số & cấu hình tĩnh

- `public static readonly int StackAllocThreshold;` — Ngưỡng giữa `stackalloc` và `BufferLease.Rent` (cố định ở `512` byte; không cấu hình được qua `MemoryOptions`).
- `public const int TransportHeadroom = sizeof(ushort);` (`2` byte) — Hằng số headroom, dành 2 byte ở đầu buffer đã thuê để TCP có thể thêm độ dài frame 2 byte mà không cần sao chép payload.
- `public static void Configure(IObjectPoolManager poolManager)` — Gắn pooling lớp vỏ `BufferLease` với một `IObjectPoolManager` bên ngoài.
- `BufferLease.ByteArrayPool` — Hàm trợ giúp tĩnh (`Rent(int)`, `Return(byte[], bool)`, `Configure(IBufferPoolManager)`) dựa trên `ArrayPool<byte>.Shared` hoặc một `IBufferPoolManager` đã cấu hình.

## Phương thức tạo

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `Rent(int, bool)` | `public static BufferLease Rent(int capacity, bool zeroOnDispose = false)` | Thuê một `byte[]` với `headroom: 0` và `Length = 0`. |
| `Rent(int, bool, int)` | `public static BufferLease Rent(int capacity, bool zeroOnDispose, int headroom)` | Thuê một `byte[]` với `headroom` tùy chỉnh (ví dụ `BufferLease.TransportHeadroom`) được dành trước `SpanFull`. |
| `CopyFrom` | `public static BufferLease CopyFrom(ReadOnlySpan<byte> src, bool zeroOnDispose = false)` | Thuê một buffer, sao chép `src` vào đó và đặt `Length = src.Length`. |
| `TakeOwnership` | `public static BufferLease TakeOwnership(byte[] buffer, int start, int length, bool zeroOnDispose = false)` | Nhận quyền sở hữu lát `[start .. start + length]` của một `byte[]` đã được thuê. |
| `FromRented` | `public static BufferLease FromRented(byte[] buffer, int length, bool zeroOnDispose = false)` | Nhận quyền sở hữu `buffer` bắt đầu từ offset `0` với `length` đã cam kết. |

## Thuộc tính & phương thức (`IBufferLease` & `BufferLease`)

| Thành viên | Kiểu / Chữ ký | Mô tả |
| --- | --- | --- |
| `Span` | `Span<byte>` | Span đọc/ghi trên payload đã cam kết (`_buffer.AsSpan(_start, Length)`). |
| `SpanFull` | `Span<byte>` | Span đọc/ghi trên toàn bộ dung lượng ghi được sau `Headroom` (`_buffer.AsSpan(_start, Capacity)`). |
| `Memory` | `ReadOnlyMemory<byte>` | Bộ nhớ chỉ đọc trên payload đã cam kết. |
| `Length` | `int` | Độ dài byte của payload đã cam kết. |
| `Capacity` | `int` | Tổng dung lượng ghi được từ `_start` đến cuối mảng. |
| `RawCapacity` | `int` | Tổng độ dài của `byte[]` bên dưới (bao gồm `Headroom`). |
| `Headroom` | `int` | Số byte dự trữ phía trước `_start` (`_start`). |
| `EncryptedOnWire` | `bool` | `true` nếu khung đến từ đường truyền đã được mã hóa (được truyền sang `IPacketContext.EncryptedOnWire`). |
| `IsReliable` | `bool` | `true` khi khung đến qua transport đáng tin cậy (`TCP` hoặc `WEBSOCKET`, được truyền sang `IPacketContext.IsReliable`). |
| `ZeroOnDispose` | `bool` | Khi `true`, xóa buffer bằng `MemorySecurity.ZeroMemory` trước khi trả về pool. |
| `CommitLength(int)` | `void CommitLength(int length)` | Đặt `Length` payload đã cam kết (`0 <= length <= Capacity`). |
| `TryGetSegmentWithHeader` | `bool TryGetSegmentWithHeader(int headerSize, out ArraySegment<byte> segment)` | Trả về một `ArraySegment<byte>` liền kề bắt đầu tại `_start - headerSize` khi `Headroom >= headerSize` (cho phép ghi tiền tố độ dài TCP không sao chép). |
| `Retain()` | `void Retain()` | Tăng bộ đếm tham chiếu một cách nguyên tử để dùng chung quyền sở hữu cho broadcast/fan-out. |
| `ReleaseOwnership` | `bool ReleaseOwnership(out byte[]? buffer, out int start, out int length)` | Tách `byte[]` bên dưới khi `refCount == 1`, để bên gọi chịu trách nhiệm trả nó về pool. |
| `Dispose()` | `void Dispose()` | Giảm bộ đếm tham chiếu; khi về `0`, trả `byte[]` và tái chế lớp vỏ `BufferLease`. |

## Ví dụ sử dụng

```csharp
using Nalix.Environment.Memory;

// Thuê lease 1024 byte với 2 byte TransportHeadroom, xóa plaintext nhạy cảm khi giải phóng
using BufferLease lease = BufferLease.Rent(
    capacity: 1024,
    zeroOnDispose: true,
    headroom: BufferLease.TransportHeadroom);

int written = packet.Serialize(lease.SpanFull);
lease.CommitLength(written);

// Đóng khung TCP không sao chép nhờ 2 byte TransportHeadroom
if (lease.TryGetSegmentWithHeader(headerSize: BufferLease.TransportHeadroom, out ArraySegment<byte> framedSegment))
{
    // Ghi độ dài little-endian 2 byte vào framedSegment[0..2] mà không sao chép payload
}
```

## API liên quan

- [Quản lý bộ đệm](./buffer-management.md)
- [DataReader](./data-reader.md)
- [DataWriter](./data-writer.md)
