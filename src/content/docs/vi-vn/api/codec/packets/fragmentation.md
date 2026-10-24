---
title: Phân mảnh
description: Chia nhỏ payload lớn, header trên đường truyền và tái lắp ráp luồng có giới hạn trong Nalix.Environment.Fragments và Nalix.Environment.Options.
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Fragments`, `Nalix.Environment.Options`  
**Assembly:** `Nalix.Environment`

Trang này mô tả các thành phần nguyên thủy phân mảnh và tái lắp ráp gói tin trong `Nalix.Environment.Fragments` (`FragmentHeader`, `FragmentAssembler`, `FragmentAssemblyResult`, `FragmentStreamId`) và phần cấu hình của chúng trong `Nalix.Environment.Options.FragmentOptions`.

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Fragments/FragmentHeader.cs`
- `src/Nalix.Environment/Fragments/FragmentAssembler.cs`
- `src/Nalix.Environment/Fragments/FragmentAssemblyResult.cs`
- `src/Nalix.Environment/Fragments/FragmentStreamId.cs`
- `src/Nalix.Environment/Options/FragmentOptions.cs`

## Tổng quan các kiểu công khai

| Kiểu | Thành viên công khai |
| --- | --- |
| `FragmentHeader` | `Magic = 0xF0`, `WireSize = 8`, `StreamId` (`ushort`), `ChunkIndex` (`ushort`), `TotalChunks` (`ushort`), `IsLast` (`bool`), `WriteTo(Span<byte>)`, `ReadFrom(ReadOnlySpan<byte>)` |
| `FragmentAssembler` | `EvictInterval = 64` (`const`), `MaxOpenStreams` (`int`, mặc định `64`), `OpenStreamCount` (`int`), `StreamTimeoutMs` (`long`, mặc định `30_000`), `MaxStreamBytes` (`int`, mặc định `16 MB`), `IsFragmentedFrame(ReadOnlySpan<byte>, out FragmentHeader)`, `Add(FragmentHeader, ReadOnlySpan<byte>, out bool)`, `EvictExpired()` (`int`), `Clear()`, `Dispose()` |
| `FragmentAssemblyResult` | `Lease` (`BufferLease`), `Length` (`int`), `Span` (`ReadOnlySpan<byte>`), `Memory` (`ReadOnlyMemory<byte>`), `Dispose()` |
| `FragmentOptions` | `MaxPayloadSize = 16_777_216` (16 MB), `MaxChunkSize = 32_000`, `MaxReassemblyBytes = 16_777_216` (16 MB), `ReassemblyTimeoutMs = 30_000L`, `MinReceiveBufferSize = 4096`, `Validate()` |
| `FragmentStreamId` | `Next()` (`ushort`, vòng lặp trong khoảng `1..65535`, không bao giờ trả về `0`) |

## `FragmentHeader` (8 byte)

Mỗi khối được phân mảnh bắt đầu bằng một `FragmentHeader` little-endian 8 byte (`FragmentHeader.WireSize = 8`), ngay sau header gói tin bên ngoài:

| Offset | Kích thước | Trường | Mô tả |
| ---: | ---: | --- | --- |
| `0` | `1` byte | `Magic` | Hằng số `0xF0` nhận diện một khung đã phân mảnh. |
| `1` | `2` byte | `StreamId` | Định danh luồng 16-bit khác 0 (`FragmentStreamId.Next()`, little-endian). |
| `3` | `2` byte | `ChunkIndex` | Chỉ số khối bắt đầu từ 0 (`0..TotalChunks - 1`, little-endian). |
| `5` | `2` byte | `TotalChunks` | Tổng số khối trong luồng (`>= 2`, little-endian). |
| `7` | `1` byte | `Flags` | Bit `0` (`0x01`) biểu thị `IsLast`. |

```csharp
using Nalix.Environment.Fragments;

ushort streamId = FragmentStreamId.Next();
FragmentHeader header = new(streamId, chunkIndex: 0, totalChunks: 3, isLast: false);
header.WriteTo(buffer);
```

## `FragmentAssembler`

`FragmentAssembler` thu thập các khối của một vòng lặp nhận kết nối và trả về một `FragmentAssemblyResult` chứa `BufferLease` lấy từ pool khi khối cuối (`ChunkIndex == TotalChunks - 1`) đến nơi.

### Hành vi chính & giới hạn an toàn

- **Số luồng đồng thời có giới hạn**: Giới hạn số luồng đang xử lý trên mỗi kết nối qua `MaxOpenStreams` (mặc định `64`). Khi chạm giới hạn, các luồng đã hết hạn được loại bỏ trước; một luồng mới chỉ bị từ chối khi không luồng nào có thể bị loại bỏ.
- **Bộ nhớ có giới hạn cho mỗi luồng**: Từ chối/loại bỏ các luồng có tổng kích thước đã tái lắp ráp vượt quá `MaxStreamBytes` (`FragmentOptions.MaxReassemblyBytes`, mặc định `16 MB`). Khối đầu tiên lớn hơn `MaxStreamBytes` sẽ bị từ chối (`streamEvicted = true`).
- **Bắt buộc tuần tự khối**: Một luồng chỉ mở khi `ChunkIndex == 0`, và các khối tiếp theo phải đến đúng thứ tự (`ChunkIndex == expectedIndex`).
- **Loại bỏ khi hết thời gian**: `EvictExpired()` trả về số `int` các luồng đã bị loại bỏ vì cũ hơn `StreamTimeoutMs` (`FragmentOptions.ReassemblyTimeoutMs`, mặc định `30_000` ms) và giải phóng các lease lấy từ pool của chúng.

```csharp
using Nalix.Environment.Fragments;

if (FragmentAssembler.IsFragmentedFrame(payload, out FragmentHeader header))
{
    FragmentAssemblyResult? assembled = assembler.Add(
        header,
        payload[FragmentHeader.WireSize..],
        out bool streamEvicted);

    if (assembled is not null)
    {
        using (assembled.Value)
        {
            ReadOnlySpan<byte> fullMessage = assembled.Value.Span;
            // Xử lý payload đã tái lắp ráp
        }
    }
}
```

## `FragmentOptions` (`Nalix.Environment.Options`)

Được nạp từ mục `[Fragment]` của `server.ini` qua `ConfigurationManager.Instance.Get<FragmentOptions>()`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra | Mô tả |
| --- | --- | ---: | --- | --- |
| `MaxPayloadSize` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Tổng kích thước payload tối đa có thể được chia thành các mảnh. |
| `MaxChunkSize` | `int` | `32_000` | `[ValueRange(4096, 65000)]` | Số byte payload tối đa cho mỗi khối (`PacketConstants.HeaderSize + FragmentHeader.WireSize + MaxChunkSize` không được vượt quá `ushort.MaxValue`). |
| `MaxReassemblyBytes` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Số byte tái lắp ráp tối đa cho mỗi luồng (`MaxReassemblyBytes >= MaxPayloadSize`). |
| `ReassemblyTimeoutMs` | `long` | `30_000` | `[ValueRange(100, 3600000)]` | Số mili giây trước khi một luồng phân mảnh chưa hoàn tất bị loại bỏ. |
| `MinReceiveBufferSize` | `int` | `4096` | `[ValueRange(1024, int.MaxValue)]` | Kích thước tối thiểu của bộ đệm nhận, tính bằng byte. |

## API liên quan

- [Mô hình Frame](./frame-model.md)
- [Registry gói tin](./packet-registry.md)
- [Quản lý bộ đệm](../../environment/memory/buffer-management.md)
- [BufferLease](../../environment/memory/buffer-lease.md)
