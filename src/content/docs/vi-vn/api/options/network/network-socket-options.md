---
title: Tùy chọn Network Socket
description: Tài liệu tham chiếu cho Nalix.Network.Options.NetworkSocketOptions — cấu hình socket TCP và UDP dùng chung, gồm cổng, backlog, dual-stack IPv6, kích thước buffer, mức song song khi accept và giới hạn datagram UDP.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`NetworkSocketOptions` (`public sealed partial class NetworkSocketOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình chính sách socket dùng chung của `TcpListenerBase`, `UdpListenerBase` và `SocketUdpTransport`.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/NetworkSocketOptions.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.Core.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProcessChannel.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.Core.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.Receive.cs`
- `src/Nalix.Network/Internal/Transport/SocketUdpTransport.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được nạp từ mục `[NetworkSocket]` của `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động lúc chạy |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]`; setter ném `ArgumentOutOfRangeException` nếu `< 1` | Cổng lắng nghe TCP/UDP mặc định khi không truyền cổng tường minh vào constructor của listener. |
| `Backlog` | `int` | `512` | `[ValueRange(1, 65535)]` | Truyền vào `Socket.Listen(Backlog)` trên listener TCP. |
| `EnableTimeout` | `bool` | `true` | — | Bật đăng ký/hủy đăng ký các kết nối TCP đã chấp nhận với `TimingWheel` dùng chung. |
| `EnableDualStack` | `bool` | `true` | — | Gắn socket listener IPv6 (`AddressFamily.InterNetworkV6`), có tự động dự phòng sang IPv4 nếu không được hỗ trợ. |
| `DualMode` | `bool` | `true` | — | Đặt `Socket.DualMode = true` trên socket listener IPv6 để chấp nhận cả kết nối IPv6 và IPv4-mapped trên cùng một cổng. |
| `NoDelay` | `bool` | `true` | — | Đặt `Socket.NoDelay = true` trên socket TCP đã chấp nhận (tắt thuật toán Nagle). |
| `MaxParallel` | `int` | `1` | `[ValueRange(1, 1024)]` | Số worker chấp nhận TCP SAEA chạy đồng thời được lên lịch khi kích hoạt listener (và là hệ số nhân để cấp phát trước pool chấp nhận). |
| `MaxParallelUDP` | `int` | `1` | `[ValueRange(1, 1024)]` | Số vòng lặp worker nhận UDP SAEA chạy đồng thời được lên lịch khi kích hoạt. |
| `BufferSize` | `int` | `65536` | `[ValueRange(2048, 10_485_760)]` | Áp dụng cho `ReceiveBufferSize` của listener TCP, `SendBufferSize`/`ReceiveBufferSize` của client TCP đã chấp nhận, và `SendBufferSize`/`ReceiveBufferSize` của UDP. |
| `KeepAlive` | `bool` | `true` | — | Bật gói thăm dò TCP Keep-Alive (`TcpKeepAliveTime = 3s`, `TcpKeepAliveInterval = 1s`, `TcpKeepAliveRetryCount = 3`, với phương án dự phòng `IOControlCode.KeepAliveValues` trên Windows). |
| `ReuseAddress` | `bool` | `true` | — | Đặt `ExclusiveAddressUse = !ReuseAddress` và `SocketOptionName.ReuseAddress`. |
| `ReusePort` | `bool` | `true` | — | Cố gắng bật `SO_REUSEPORT` (`SocketOptionName.ReuseUnicastPort`) khi hệ điều hành hỗ trợ. |
| `TcpFastOpen` | `bool` | `true` | — | Cố gắng bật `TCP_FASTOPEN` trên socket lắng nghe khi hệ điều hành hỗ trợ. |
| `DispatchProcessorAffinity` | `int` | `-1` | — | Chỉ số nhân CPU bắt đầu từ 0, dùng để ghim luồng consumer của kênh chấp nhận TCP (`-1` để hệ điều hành tự lập lịch). |
| `ProcessChannelCapacity` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Dung lượng của `Channel<AcceptConnectionResult>` có giới hạn giữa các worker chấp nhận TCP và consumer khởi tạo. |
| `ProcessChannelDrainTimeout` | `int` | `5000` | `[ValueRange(0, 60000)]` | Thời gian tối đa tính bằng mili giây để chờ kênh xử lý chấp nhận TCP được xả hết một cách êm thuận trong `Deactivate`. |
| `MaxUdpDatagramSize` | `int` | `1440` | `[ValueRange(64, 65507)]` | Kích thước tối đa tính bằng byte của một datagram UDP đến (`UdpListenerBase`) hoặc đi (`SocketUdpTransport`). |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném `ValidationException` khi bất kỳ ràng buộc `[ValueRange]` nào không thỏa.

## Áp dụng cho TCP và UDP

| Thiết lập | Áp dụng cho `TcpListenerBase` | Áp dụng cho `UdpListenerBase` / `SocketUdpTransport` |
| :--- | :---: | :---: |
| `Port`, `EnableDualStack`, `DualMode`, `BufferSize`, `ReuseAddress`, `ReusePort` | Có | Có |
| `Backlog`, `NoDelay`, `KeepAlive`, `TcpFastOpen`, `EnableTimeout`, `MaxParallel`, `DispatchProcessorAffinity`, `ProcessChannelCapacity`, `ProcessChannelDrainTimeout` | Có | Không |
| `MaxParallelUDP`, `MaxUdpDatagramSize`, `DontFragment = true`, chặn `SIO_UDP_CONNRESET` trên Windows | Không | Có |

## API liên quan

- [TCP Listener](../../network/tcp-listener.md)
- [UDP Listener](../../network/udp-listener.md)
- [Tùy chọn Connection Quota](./connection-quota-options.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Timing Wheel](./timing-wheel-options.md)
