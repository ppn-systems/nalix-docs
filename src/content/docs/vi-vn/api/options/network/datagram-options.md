---
title: Tùy chọn Datagram
description: DatagramOptions cấu hình listener datagram (NDP qua UDP) của Nalix.Network, gồm thời hạn ticket, giới hạn phiên, số worker nhận và kích thước bộ đệm socket. Nó thay thế DatagramGuardOptions đã bị gỡ.
section: API Reference
package: Nalix.Network
---

`DatagramOptions` (`public sealed partial class DatagramOptions : ConfigurationLoader, IValidatableConfiguration`, không gian tên `Nalix.Network.Options`) chứa các thiết lập của [Datagram Listener](../../network/datagram-listener.md). Các thiết lập theo từng phiên (kênh, thời gian chờ nhàn rỗi, kích thước thông điệp, bộ đệm) nằm trong `DatagramEngineOptions` (`Nalix.Environment.Options`).

:::note[Vị trí trang]
`DatagramGuardOptions` và `DatagramGuard` (cửa sổ nguồn IPv4/IPv6, `FailOpenWhenFull`, `UdpReplayWindowSize`) không còn tồn tại trong mã nguồn. Việc giới hạn tốc độ theo từng nguồn không còn do một guard riêng cho UDP đảm nhiệm: một phiên datagram đã xác thực được chấp nhận qua `IConnectionGuard` khi datagram đầu tiên của nó được xác thực.
:::

## Nguồn mã

- `src/Nalix.Network/Options/DatagramOptions.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Core.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.SocketConfig.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`

## Tùy chọn

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Dùng cho |
| :--- | :--- | ---: | :--- | :--- |
| `TicketLifetimeSeconds` | `int` | `10` | `[ValueRange(1, 300)]` | Số giây mà datagram đầu tiên của một ticket phải đến nơi; cũng được báo cho client dưới dạng `DatagramTicketInfo.ExpiresInSeconds`. |
| `MaxSessions` | `int` | `100_000` | `[ValueRange(1, int.MaxValue)]` | Tổng số phiên đã thiết lập cộng với ticket đang chờ tối đa; vượt mức này `IssueTicket` ném `InvalidOperationException`. |
| `ReceiveWorkers` | `int` | `1` | `[ValueRange(1, 64)]` | Số worker đọc socket UDP. |
| `SocketReceiveBufferSize` | `int` | `4194304` (4 MiB) | `[ValueRange(65_536, int.MaxValue)]` | `ReceiveBufferSize` của socket UDP. |
| `SocketSendBufferSize` | `int` | `4194304` (4 MiB) | `[ValueRange(65_536, int.MaxValue)]` | `SendBufferSize` của socket UDP. |

`Validate()` chạy kiểm tra DataAnnotation (`this.ValidateDataAnnotations()`) và ném `ValidationException` khi vi phạm ràng buộc. `DatagramListener` kiểm tra hợp lệ cả `DatagramOptions` lẫn `DatagramEngineOptions` trong constructor.

## Cấu hình

Lớp này được nạp qua `ConfigurationManager.Instance.Get<DatagramOptions>()` và được bootstrap của hosting (`Bootstrap.cs`) ghi vào `server.ini`. Chú thích của mục INI là "Datagram listener (NDP over UDP) — tickets, session limit and socket buffers".

```csharp
using Nalix.Hosting;
using Nalix.Hosting.Protocols;
using Nalix.Network.Options;

NetworkApplication app = NetworkApplication.CreateBuilder()
    .Configure<DatagramOptions>(opt =>
    {
        opt.ReceiveWorkers = 4;
        opt.MaxSessions = 20_000;
    })
    .UseSecureConnections()
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .MapDatagram<DefaultProtocol>().OnPort(57207).Bind()
    .Build();
```

## Hướng dẫn vận hành

- Chỉ tăng `ReceiveWorkers` khi một worker không đủ sức rút cạn socket; mỗi worker sở hữu một buffer được ghim có kích thước `DatagramEngine.MaxDatagramSize + 1` (1473) byte.
- Giữ `TicketLifetimeSeconds` ngắn: một ticket đang chờ giữ khóa bí mật của phiên trong bộ nhớ cho tới khi được nâng cấp, bị thay thế hoặc bị quét.
- `MaxSessions` cũng tính cả ticket đang chờ, nên một client yêu cầu ticket mà không dùng chỉ có thể giữ một ticket cho mỗi stream connection (yêu cầu mới thay thế ticket cũ).
- Chính sách socket dùng chung (`EnableDualStack`, `DualMode`) lấy từ [Tùy chọn Network Socket](./network-socket-options.md); kích thước bộ đệm socket thì **không**.

## API liên quan

- [Tùy chọn mạng](./options.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Network Socket](./network-socket-options.md)
- [Datagram Listener](../../network/datagram-listener.md)
