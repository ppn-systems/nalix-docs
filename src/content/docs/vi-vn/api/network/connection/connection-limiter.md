---
title: Connection Limiter
description: Hướng dẫn kiến trúc về ConnectionGuard — giới hạn chấp nhận nhiều tầng theo IP, theo subnet, theo burst và cấm lũy tiến trong Nalix.Network, gồm cả cách chấp nhận các phiên datagram.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.RateLimiting`  
**Assembly:** `Nalix.Network`

`Nalix.Network.RateLimiting` cung cấp bộ giới hạn chấp nhận cho tầng transport:

1. [ConnectionGuard](./connection-guard.md) (`src/Nalix.Network/RateLimiting/Connection.Guard.cs`): Bảo vệ các listener hướng kết nối (`TcpListenerBase`, `WebSocketListenerBase` và `DatagramListener` cho các phiên datagram đã xác thực).

## Nguồn mã

- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`
- `src/Nalix.Network/Options/ConnectionQuotaOptions.cs`
- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Receive.cs`

## 1. Cơ chế phòng thủ của `ConnectionGuard`

### Hình phạt burst và kết nối ngắn hạn (`Connection.Guard.Slot.cs`)

- **Phát hiện burst**: Nếu các lần thử kết nối liên tiếp từ cùng một IP đến trong vòng `MinConnectionIntervalMs` (`50` ms) ít nhất `BurstThreshold` (`3`) lần liên tiếp, endpoint đó chuyển sang chế độ burst và trần `MaxConnectionsPerWindow` hiệu lực của nó bị chia cho `BurstPenaltyDivisor` (`2`).
- **Hình phạt kết nối ngắn hạn**: Khi một kết nối đóng trong vòng `ShortLivedThresholdMs` (`2000` ms) kể từ lúc mở, `OnConnectionClosed` chèn thêm một timestamp tổng hợp vào cửa sổ tốc độ của endpoint để phạt việc kết nối/ngắt kết nối liên tục.
- **Siết chặt theo tải**: Khi `EnableAdaptiveMode` là `true` và tải toàn cục vượt `AdaptiveLoadThreshold` (`0.7`), giới hạn đồng thời theo IP được nhân với `AdaptiveTighteningFactor` (`0.5`).

### Cấm IP lũy tiến và giảm dần

Khi một endpoint vượt quá cửa sổ tốc độ của nó:

- Nếu `ConnectionGuardOptions.EnableProgressiveBanning` là `true` (mặc định), các lần vi phạm liên tiếp sẽ leo thang qua `1m` $\rightarrow$ `5m` $\rightarrow$ `15m` $\rightarrow$ `1h` $\rightarrow$ `6h` $\rightarrow$ `24h`.
- Số lần cấm giảm `1` cho mỗi `ConnectionBanStoreOptions.BanCountDecayWindow` (`7` ngày) hành vi sạch và được lưu vào `"banned_ips.bin"` bởi `NetworkBanRepository`.

### Theo dõi subnet không cấp phát bộ nhớ (`Connection.Guard.Subnet.cs`)

- Nhóm endpoint IPv4 theo `/24` (khóa `uint`) và endpoint IPv6 theo `/48` (khóa `long`) trực tiếp từ byte thô của `SocketEndpoint` mà không cấp phát heap cho `IPAddress`.
- Thực thi `MaxConnectionsPerSubnet` (`50`) và `MaxSubnetConnectionsPerWindow` (`100`).

### Bản đồ endpoint có giới hạn (`MaxTrackedEndpoints = 50,000`)

- Giới hạn số mục IP theo dõi ở `ConnectionQuotaOptions.MaxTrackedEndpoints` (`50,000`) và dùng cơ chế loại bỏ ngẫu nhiên lấy mẫu $O(1)$ kiểu Redis khi đầy, cùng với tác vụ dọn dẹp nền định kỳ `"conn.limit"`.

## 2. Phiên datagram

`DatagramGuard` và `DatagramGuardOptions` (cửa sổ gói UDP theo nguồn) đã bị gỡ bỏ. Thay vào đó, `DatagramListener` chấp nhận từng phiên datagram qua `IConnectionGuard.TryAccept(remote)` khi datagram đầu tiên của ticket được xác thực, giữ slot của guard trong suốt vòng đời phiên, và gọi `Release` khi phiên bị dispose. Một phiên bị từ chối được đếm trong `DatagramListener.DMetrics.TotalGuardRejections`. Các datagram chưa xác thực không bao giờ đến guard. Xem [Datagram Listener](../datagram-listener.md).

## Tóm tắt cấu hình

| Lớp tùy chọn | Thiết lập chính | Tham chiếu |
| :--- | :--- | :--- |
| `ConnectionQuotaOptions` | `MaxConnectionsPerIpAddress = 10`, `MaxConnectionsPerWindow = 10`, `ConnectionRateWindow = 5s`, `MaxConnectionsPerSubnet = 50`, `ExemptLoopback = true`, `MaxTrackedEndpoints = 50,000` | [Connection Quota Options](../../options/network/connection-quota-options.md) |
| `ConnectionGuardOptions` | `MaxConnections = 2000`, `BanDuration = 5m`, `EnableProgressiveBanning = true`, `MaxErrorThreshold = 50`, `ErrorWindow = 1m`, `MaxPacketPerSecond = 128` | [Connection Guard Options](../../options/network/connection-guard-options.md) |
| `TrustedProxyOptions` | `StoreFileName = "trusted_proxies.txt"`, `MaxConnectionsPerTrustedProxy = 5000`, `MaxAttemptsPerTrustedProxyWindow = 2000` | [Trusted Proxy Options](../../options/network/trusted-proxy-options.md) |

## API liên quan

- [Connection Guard API Reference](./connection-guard.md)
- [Connection Hub](./connection-hub.md)
- [TCP Listener](../tcp-listener.md)
- [Datagram Listener](../datagram-listener.md)
