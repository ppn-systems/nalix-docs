---
title: Tùy chọn Connection Guard
description: Tài liệu tham chiếu cho Nalix.Network.Options.ConnectionGuardOptions — trần kết nối toàn cục, thời gian cấm, bật/tắt cấm lũy tiến, ngưỡng lỗi cho mỗi kết nối và giới hạn tốc độ gói UDP.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionGuardOptions` (`public sealed partial class ConnectionGuardOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình sức chứa kết nối toàn cục, thời gian cấm cơ bản, cơ chế leo thang cấm lũy tiến, ẩn log khi bị tấn công DDoS, ngắt kết nối khi một kết nối vượt ngưỡng lỗi (`SEC-54`), và giới hạn tốc độ gói UDP theo từng endpoint (`SEC-55`).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Datagram.Guard.cs`
- `src/Nalix.Network/Connections/Connection.cs`
- `src/Nalix.Network/Internal/Initialization/NetworkPoolInitializer.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được nạp từ mục `[ConnectionGuard]` của `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Thành phần lúc chạy sử dụng |
| :--- | :--- | ---: | :--- | :--- |
| `MaxConnections` | `int` | `2_000` (`2000`) | `[ValueRange(1, int.MaxValue)]` | Trần số kết nối đồng thời toàn cục trong `ConnectionGuard`, và dung lượng pool cơ sở trong `NetworkPoolInitializer`. |
| `BanDuration` | `TimeSpan` | `00:05:00` (`5m`) | `[DurationRange("00:00:01", "1.00:00:00")]` | Thời gian cấm tĩnh, dùng khi `EnableProgressiveBanning` là `false`. |
| `DDoSLogSuppressWindow` | `TimeSpan` | `00:00:20` (`20s`) | `[DurationRange("00:00:01", "01:00:00")]` | Cửa sổ ẩn log theo từng endpoint đối với log chẩn đoán từ chối/DDoS đã được giới hạn tần suất (`ThrottledEventGate`). |
| `MaxErrorThreshold` | `int` | `50` | `[ValueRange(1, int.MaxValue)]` | Giới hạn lỗi tích lũy trên mỗi kết nối (`Connection.IncrementErrorCount()`); khi đạt ngưỡng này, client bị ngắt ngay lập tức (`SEC-54`). |
| `MaxPacketPerSecond` | `int` | `128` | `[ValueRange(1, 10_000_000)]` | Ngân sách số gói mỗi giây theo từng IP do `DatagramGuard` áp dụng trên listener UDP (`SEC-55`). |
| `EnableProgressiveBanning` | `bool` | `true` | — | Bật leo thang cấm lũy tiến (`1m` $\rightarrow$ `5m` $\rightarrow$ `15m` $\rightarrow$ `1h` $\rightarrow$ `6h` $\rightarrow$ `24h`) khi vi phạm cửa sổ tốc độ lặp lại. |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném `ValidationException` khi vi phạm ràng buộc.

:::note[Danh sách chặn IP cố định]
Danh sách chặn IP/CIDR cố định được cấu hình qua [ConnectionBlacklistStoreOptions](./connection-blacklist-store-options.md) (`blacklist.txt`), còn việc lưu bền vững các lệnh cấm động được cấu hình qua [ConnectionBanStoreOptions](./connection-ban-store-options.md) (`banned_ips.bin`).
:::

## Lịch leo thang cấm lũy tiến

Khi một IP vượt quá `ConnectionQuotaOptions.MaxConnectionsPerWindow` trong `ConnectionRateWindow`:

1. Nếu `EnableProgressiveBanning` là `true`, `ConnectionGuard` tăng số lần cấm của endpoint (sau khi áp dụng mọi suy giảm từ `ConnectionBanStoreOptions.BanCountDecayWindow`) và chọn thời gian cấm:
   - **Vi phạm lần 1**: `1` phút
   - **Vi phạm lần 2**: `5` phút
   - **Vi phạm lần 3**: `15` phút
   - **Vi phạm lần 4**: `1` giờ
   - **Vi phạm lần 5**: `6` giờ
   - **Vi phạm lần 6 trở lên**: `24` giờ
2. Nếu `EnableProgressiveBanning` là `false`, `BanDuration` (mặc định `5` phút) được dùng cho mọi lần vi phạm.

## API liên quan

- [Connection Guard](../../network/connection/connection-guard.md)
- [Tùy chọn Connection Quota](./connection-quota-options.md)
- [Tùy chọn kho cấm kết nối](./connection-ban-store-options.md)
- [Tùy chọn kho danh sách chặn kết nối](./connection-blacklist-store-options.md)
- [Tùy chọn Trusted Proxy](./trusted-proxy-options.md)
