---
title: Tùy chọn Network Socket
description: Tài liệu tham chiếu cho Nalix.Network.Options.NetworkSocketOptions — cấu hình socket của listener TCP, gồm cổng, backlog, dual-stack IPv6, kích thước bộ đệm và mức song song khi accept.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`NetworkSocketOptions` (`public sealed partial class NetworkSocketOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình chính sách socket được `TcpListenerBase` sử dụng. `DatagramListener` chỉ đọc `EnableDualStack` và `DualMode` từ đây; bộ đệm và worker của nó được cấu hình bởi [DatagramOptions](./datagram-options.md).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/NetworkSocketOptions.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.Core.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProcessChannel.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.SocketConfig.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được nạp từ mục `[NetworkSocket]` của `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động lúc chạy |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]`; setter ném `ArgumentOutOfRangeException` nếu `< 1` | Cổng lắng nghe mặc định khi không truyền cổng tường minh vào constructor của listener (`IniComment` mô tả đây là cổng TCP). |
| `Backlog` | `int` | `512` | `[ValueRange(1, 65535)]` | Truyền vào `Socket.Listen(Backlog)` trên listener TCP. |
| `EnableTimeout` | `bool` | `true` | — | Bật đăng ký/hủy đăng ký các kết nối TCP đã chấp nhận với `TimingWheel` dùng chung. |
| `EnableDualStack` | `bool` | `true` | — | Gắn socket listener IPv6 (`AddressFamily.InterNetworkV6`), có tự động dự phòng sang IPv4 nếu không được hỗ trợ. |
| `DualMode` | `bool` | `true` | — | Đặt `Socket.DualMode = true` trên socket listener IPv6 để chấp nhận cả kết nối IPv6 và IPv4-mapped trên cùng một cổng. |
| `NoDelay` | `bool` | `true` | — | Đặt `Socket.NoDelay = true` trên socket TCP đã chấp nhận (tắt thuật toán Nagle). |
| `MaxParallel` | `int` | `1` | `[ValueRange(1, 1024)]` | Số worker chấp nhận TCP SAEA chạy đồng thời được lên lịch khi kích hoạt listener (và là hệ số nhân để cấp phát trước pool chấp nhận). |
| `BufferSize` | `int` | `65536` | `[ValueRange(2048, 10_485_760)]` | Áp dụng cho `SendBufferSize` và `ReceiveBufferSize` của socket listener TCP (socket đã chấp nhận kế thừa). Datagram listener không dùng giá trị này; xem `DatagramOptions.SocketReceiveBufferSize` / `SocketSendBufferSize`. |
| `KeepAlive` | `bool` | `true` | — | Bật gói thăm dò TCP Keep-Alive (`TcpKeepAliveTime = 120`, `TcpKeepAliveInterval = 30`, `TcpKeepAliveRetryCount = 5`, với phương án dự phòng `IOControlCode.KeepAliveValues` trên Windows là 120 s / 30 s). |
| `ReuseAddress` | `bool` | `true` | — | Chỉ TCP: đặt `ExclusiveAddressUse = OperatingSystem.IsWindows() || !ReuseAddress` và `SocketOptionName.ReuseAddress` (chỉ áp dụng trên hệ không phải Windows). Datagram listener không bao giờ đặt `SO_REUSEADDR`. |
| `ReusePort` | `bool` | `false` | — | Cố gắng bật `SO_REUSEPORT` trên socket listener TCP; chỉ thử trên Linux (`TcpListener.SocketConfig.cs`). Có thể cho phép một tiến trình cục bộ khác của cùng người dùng dùng chung cổng. |
| `TcpFastOpen` | `bool` | `true` | — | Cố gắng bật `TCP_FASTOPEN` (`SocketOptionName.FastOpen`) trên socket lắng nghe khi hệ điều hành hỗ trợ. |
| `DispatchProcessorAffinity` | `int` | `-1` | — | Chỉ số nhân CPU bắt đầu từ 0, dùng để ghim luồng consumer của kênh chấp nhận TCP (`-1` để hệ điều hành tự lập lịch). |
| `ProcessChannelCapacity` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Dung lượng của `Channel<AcceptConnectionResult>` có giới hạn giữa các worker chấp nhận TCP và consumer khởi tạo. |
| `ProcessChannelDrainTimeout` | `int` | `5000` | `[ValueRange(0, 60000)]` | Thời gian tối đa tính bằng mili giây để chờ kênh xử lý chấp nhận TCP được xả hết một cách êm thuận trong `Deactivate`. |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném `ValidationException` khi bất kỳ ràng buộc `[ValueRange]` nào không thỏa.

## Áp dụng cho TCP và Datagram

| Thiết lập | Áp dụng cho `TcpListenerBase` | Áp dụng cho `DatagramListener` |
| :--- | :---: | :---: |
| `EnableDualStack`, `DualMode` | Có | Có |
| `Port` | Có (cổng mặc định) | Không (cổng được truyền vào constructor; `MapDatagram` không có `OnPort` dùng `0`) |
| `Backlog`, `NoDelay`, `KeepAlive`, `TcpFastOpen`, `EnableTimeout`, `MaxParallel`, `BufferSize`, `ReuseAddress`, `ReusePort`, `DispatchProcessorAffinity`, `ProcessChannelCapacity`, `ProcessChannelDrainTimeout` | Có | Không |

`MaxParallelUDP` và `MaxUdpDatagramSize` đã bị loại bỏ. Giới hạn kích thước datagram là `DatagramEngine.MaxDatagramSize` (`1472`) và các worker nhận là `DatagramOptions.ReceiveWorkers`.

## API liên quan

- [TCP Listener](../../network/tcp-listener.md)
- [Datagram Listener](../../network/datagram-listener.md)
- [Tùy chọn Datagram](./datagram-options.md)
- [Tùy chọn Connection Quota](./connection-quota-options.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Timing Wheel](./timing-wheel-options.md)
