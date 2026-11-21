---
title: Phân mảnh
description: Chia nhỏ payload lớn, header trên đường truyền và tái lắp ráp luồng có giới hạn trong Nalix.Environment.Fragments và Nalix.Environment.Options.
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Fragments`, `Nalix.Environment.Options`  
**Assembly:** `Nalix.Environment`

Trang này mô tả các thành phần nguyên thủy phân mảnh và tái lắp ráp gói tin trong `Nalix.Environment.Fragments` (`FragmentHeader`, `FragmentAssembler`, `FragmentAssemblyResult`, `FragmentStreamId`) và phần cấu hình của chúng trong `Nalix.Environment.Options.FragmentOptions`. Trang cũng mô tả `DatagramEngineOptions`, các thiết lập phiên datagram bao gồm giới hạn tái lắp ráp phân mảnh của một kết nối datagram.

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Fragments/FragmentHeader.cs`
- `src/Nalix.Environment/Fragments/FragmentAssembler.cs`
- `src/Nalix.Environment/Fragments/FragmentAssemblyResult.cs`
- `src/Nalix.Environment/Fragments/FragmentStreamId.cs`
- `src/Nalix.Environment/Options/FragmentOptions.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`

## Tổng quan các kiểu công khai

| Kiểu | Thành viên công khai |
| --- | --- |
| `FragmentHeader` | `readonly struct FragmentHeader(ushort streamId, ushort chunkIndex, ushort totalChunks, bool isLast) : IEquatable<FragmentHeader>`: `WireSize = 13` (`const`), `StreamId` (`ushort`), `ChunkIndex` (`ushort`), `TotalChunks` (`ushort`), `Flags` (`byte`), `IsLast` (`bool`), `WriteTo(Span<byte>)`, `ReadFrom(ReadOnlySpan<byte>)` (static), `Equals`, `==`, `!=` |
| `FragmentAssembler` | `EvictInterval = 64` (`const`), `MaxOpenStreams` (`int`, mặc định `64`), `OpenStreamCount` (`int`), `StreamTimeoutMs` (`long`, mặc định `30_000`), `MaxStreamBytes` (`int`, mặc định `16 MB`), `IsFragmentedFrame(ReadOnlySpan<byte>, out FragmentHeader)`, `Add(FragmentHeader, ReadOnlySpan<byte>, out bool)`, `EvictExpired()` (`int`), `Clear()`, `Dispose()` |
| `FragmentAssemblyResult` | `Lease` (`BufferLease`), `Length` (`int`), `Span` (`ReadOnlySpan<byte>`), `Memory` (`ReadOnlyMemory<byte>`), `Dispose()` |
| `FragmentOptions` | `MaxPayloadSize = 16_777_216` (16 MB), `MaxChunkSize = 32_000`, `MaxReassemblyBytes = 16_777_216` (16 MB), `ReassemblyTimeoutMs = 30_000L`, `MinReceiveBufferSize = 4096`, `Validate()` |
| `FragmentStreamId` | `Next()` (`ushort`, vòng lặp trong khoảng `1..65535`, không bao giờ trả về `0`) |
| `DatagramEngineOptions` | `MinimumMtu = 1200`, `MaxChannels = 64`, `ChannelCount`, `IdleTimeoutMs`, `MaxAckDelayMs`, `UnreliableExpiryMs`, `MaxMessageSize`, `ReceiveBufferBytes`, `ChannelReceiveBufferBytes`, `SendQueueBytesPerChannel`, `MaxOpenFragmentStreams`, `FragmentTimeoutMs`, `EnableMtuProbing`, `KeyUpdatePacketInterval`, `KeyUpdateIntervalMs`, `Validate()` |

## `FragmentHeader` (13 byte)

`FragmentHeader.WireSize = 13` gồm header gói tin 6 byte (`PacketConstants.HeaderSize`) cộng 7 byte metadata phân mảnh little-endian. `WriteTo` đặt về 0 toàn bộ 6 byte header gói tin và chỉ bật `PacketFlags.FRAGMENTED` trong byte cờ (offset `2`); bên nhận nhận diện một mảnh bằng cờ đó, không bao giờ dựa vào nội dung payload (`FragmentAssembler.IsFragmentedFrame`).

| Offset | Kích thước | Trường | Mô tả |
| ---: | ---: | --- | --- |
| `0` | `6` byte | Header gói tin | Toàn bộ bằng 0 trừ byte cờ, byte này mang `PacketFlags.FRAGMENTED` (`0x08`). |
| `6` | `2` byte | `StreamId` | Định danh luồng 16-bit khác 0 (`FragmentStreamId.Next()`, little-endian). |
| `8` | `2` byte | `ChunkIndex` | Chỉ số khối bắt đầu từ 0 (`0..TotalChunks - 1`, little-endian). |
| `10` | `2` byte | `TotalChunks` | Tổng số khối trong luồng (little-endian). |
| `12` | `1` byte | `Flags` | Bit `0` (`0x01`) biểu thị `IsLast`. |

`ReadFrom` ném `InvalidDataException` khi header gói tin không mang cờ `FRAGMENTED`.
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
| `MaxChunkSize` | `int` | `32_000` | `[ValueRange(4096, 65000)]` | Số byte payload tối đa cho mỗi khối (`PacketConstants.HeaderSize + FragmentHeader.WireSize + MaxChunkSize` không được vượt quá `ushort.MaxValue`; `MaxPayloadSize` cũng phải `>= MaxChunkSize` và tạo ra tối đa `65535` khối). |
| `MaxReassemblyBytes` | `int` | `16_777_216` (16 MB) | `[ValueRange(1, int.MaxValue)]` | Số byte tái lắp ráp tối đa cho mỗi luồng (`MaxReassemblyBytes >= MaxPayloadSize`). |
| `ReassemblyTimeoutMs` | `long` | `30_000` | `[ValueRange(100, 3600000)]` | Số mili giây trước khi một luồng phân mảnh chưa hoàn tất bị loại bỏ. |
| `MinReceiveBufferSize` | `int` | `4096` | `[ValueRange(1024, int.MaxValue)]` | Kích thước tối thiểu của bộ đệm nhận, tính bằng byte. |

## `DatagramEngineOptions` (`Nalix.Environment.Options`)

`public sealed partial class DatagramEngineOptions : ConfigurationLoader, IValidatableConfiguration` cấu hình engine phiên datagram (Nalix Datagram Protocol): kênh, thời gian chờ, ngân sách nhận, tái lắp ráp phân mảnh và cập nhật khóa (`src/Nalix.Environment/Options/DatagramEngineOptions.cs`). Hằng số: `MinimumMtu = 1200`, `MaxChannels = 64`.

| Thuộc tính | Kiểu | Mặc định | Kiểm tra | Mô tả |
| --- | --- | ---: | --- | --- |
| `ChannelCount` | `int` | `8` | `[ValueRange(1, 64)]` | Số kênh trên mỗi phiên. |
| `IdleTimeoutMs` | `int` | `15_000` | `[ValueRange(100, 3_600_000)]` | Thời gian chờ khi nhàn rỗi, tính bằng mili giây. |
| `MaxAckDelayMs` | `int` | `25` | `[ValueRange(1, 1_000)]` | Độ trễ xác nhận dài nhất, tính bằng mili giây. |
| `UnreliableExpiryMs` | `int` | `100` | `[ValueRange(1, 60_000)]` | Số mili giây một thông điệp không tin cậy trong hàng đợi có thể chờ trước khi bị bỏ. |
| `MaxMessageSize` | `int` | `1_048_576` | `[ValueRange(1, 64 MB)]` | Thông điệp lớn nhất, tính bằng byte. |
| `ReceiveBufferBytes` | `long` | `4_194_304` | `[ValueRange(1, long.MaxValue)]` | Số byte được đệm để sắp thứ tự và tái lắp ráp trên mỗi phiên, được thông báo cho bên kia. |
| `ChannelReceiveBufferBytes` | `long` | `2_097_152` | `[ValueRange(1, long.MaxValue)]` | Số byte được đệm trên mỗi kênh, được thông báo cho bên kia. |
| `SendQueueBytesPerChannel` | `long` | `4_194_304` | `[ValueRange(1, long.MaxValue)]` | Số byte có thể chờ trong hàng đợi gửi của một kênh. |
| `MaxOpenFragmentStreams` | `int` | `64` | `[ValueRange(1, 65_535)]` | Số thông điệp phân mảnh lớn nhất được tái lắp ráp cùng lúc. |
| `FragmentTimeoutMs` | `int` | `10_000` | `[ValueRange(100, 3_600_000)]` | Số mili giây một thông điệp phân mảnh chưa hoàn tất được giữ lại. |
| `EnableMtuProbing` | `bool` | `true` | — | Dò MTU của đường truyền trên 1200 byte. |
| `KeyUpdatePacketInterval` | `long` | `1 << 23` (`8_388_608`) | `[ValueRange(16, 1 << 40)]` | Số gói tin gửi bằng một khóa trước khi cập nhật khóa. |
| `KeyUpdateIntervalMs` | `long` | `3_600_000` | `[ValueRange(1_000, 7 days in ms)]` | Số mili giây một khóa được dùng trước khi cập nhật khóa. |

`Validate()` chạy các kiểm tra phạm vi và ném `ValidationException` trừ khi `ChannelReceiveBufferBytes >= MaxMessageSize + 65536`, `ReceiveBufferBytes >= ChannelReceiveBufferBytes` và `SendQueueBytesPerChannel >= MaxMessageSize`.

## API liên quan

- [Mô hình Frame](./frame-model.md)
- [Registry gói tin](./packet-registry.md)
- [Quản lý bộ đệm](../../environment/memory/buffer-management.md)
- [BufferLease](../../environment/memory/buffer-lease.md)
