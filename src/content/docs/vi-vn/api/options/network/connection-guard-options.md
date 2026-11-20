---
title: Tùy chọn Connection Guard
description: Tài liệu tham chiếu cho Nalix.Network.Options.ConnectionGuardOptions — trần kết nối toàn cục, thời gian cấm, bật/tắt cấm lũy tiến, ngưỡng lỗi và cửa sổ lỗi cho mỗi kết nối, cùng thiết lập tốc độ gói.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionGuardOptions` (`public sealed partial class ConnectionGuardOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình sức chứa kết nối toàn cục, thời gian cấm cơ bản, cơ chế leo thang cấm lũy tiến, ẩn log khi bị tấn công DDoS, ngắt kết nối khi một kết nối vượt ngưỡng lỗi (`SEC-54`, đếm trong `ErrorWindow`), và thiết lập `MaxPacketPerSecond` (`SEC-55`).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/Connections/WebSocketConnection.cs`
- `src/Nalix.Network/Connections/Connection.cs`
- `src/Nalix.Network/Internal/Initialization/NetworkPoolInitializer.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được nạp từ mục `[ConnectionGuard]` của `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Thành phần lúc chạy sử dụng |
| :--- | :--- | ---: | :--- | :--- |
| `MaxConnections` | `int` | `2_000` (`2000`) | `[ValueRange(1, int.MaxValue)]` | Trần số kết nối đồng thời toàn cục trong `ConnectionGuard`, và dung lượng pool cơ sở trong `NetworkPoolInitializer`. |
| `BanDuration` | `TimeSpan` | `00:05:00` (`5m`) | `[DurationRange("00:00:01", "1.00:00:00")]` | Thời gian cấm tĩnh, dùng khi `EnableProgressiveBanning` là `false`. |
| `DDoSLogSuppressWindow` | `TimeSpan` | `00:00:20` (`20s`) | `[DurationRange("00:00:01", "01:00:00")]` | Cửa sổ ẩn log theo từng endpoint đối với log chẩn đoán từ chối/DDoS đã được giới hạn tần suất (`ThrottledEventGate`). |
| `MaxErrorThreshold` | `int` | `50` | `[ValueRange(1, int.MaxValue)]` | Số lỗi một kết nối có thể tích lũy trong `ErrorWindow` (`Connection.IncrementErrorCount()`, `DatagramConnection`, `WebSocketConnection`); khi đạt ngưỡng này, client bị ngắt (`SEC-54`). |
| `ErrorWindow` | `TimeSpan` | `00:01:00` (`1m`) | `[DurationRange("00:00:01", "24:00:00")]` | Cửa sổ dùng để đếm lỗi của một kết nối so với `MaxErrorThreshold`; khi hết cửa sổ, bộ đếm bắt đầu lại, nên một kết nối sống lâu thỉnh thoảng có lỗi sẽ không bị ngắt do dồn tích. |
| `MaxPacketPerSecond` | `int` | `128` | `[ValueRange(1, 10_000_000)]` | Số gói tối đa mỗi giây từ một kết nối (`SEC-55`). `DatagramGuard`, nơi từng dùng thiết lập này, đã bị gỡ; mã nguồn hiện tại không có nơi nào đọc thuộc tính này. |
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
