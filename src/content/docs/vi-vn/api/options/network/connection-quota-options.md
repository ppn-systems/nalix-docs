---
title: Tùy chọn Connection Quota
description: Tài liệu tham chiếu cho Nalix.Network.Options.ConnectionQuotaOptions — giới hạn kết nối theo IP và theo subnet, cửa sổ tốc độ trượt, hình phạt khi bùng phát và cấu hình Proof-of-Work thích ứng cho ConnectionGuard.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionQuotaOptions` (`public sealed partial class ConnectionQuotaOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình giới hạn số kết nối đồng thời theo IP và theo subnet, cửa sổ tốc độ, hình phạt cho kết nối bùng phát hoặc tồn tại ngắn, giới hạn kích thước bản đồ endpoint, và việc tăng/giảm độ khó Proof-of-Work thích ứng do [ConnectionGuard](../../network/connection/connection-guard.md) áp dụng.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionQuotaOptions.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`

## Tham chiếu đầy đủ các thuộc tính

Được nạp từ mục `[ConnectionQuota]` của `default.ini`:

### 1. Giới hạn theo IP, theo subnet và bản đồ endpoint

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động lúc chạy |
| :--- | :--- | ---: | :--- | :--- |
| `MaxConnectionsPerIpAddress` | `int` | `10` | `[ValueRange(1, 10_000)]` | Số kết nối đang hoạt động đồng thời tối đa cho phép từ một địa chỉ IP phía xa. |
| `ExemptLoopback` | `bool` | `true` | — | Miễn giới hạn theo IP/subnet, cửa sổ tốc độ và tự động cấm đối với client loopback (`127.0.0.0/8`, `::1`, `::ffff:127.x.x.x`) (`ConnectionGuardOptions.MaxConnections` vẫn được áp dụng). |
| `MaxTrackedEndpoints` | `int` | `50_000` | `[ValueRange(-1, 10_000_000)]` | Trần cứng số mục IP được theo dõi trong `ConnectionGuard` (`-1` = không giới hạn; khi đầy sẽ loại bỏ theo lấy mẫu ngẫu nhiên $O(1)$). |
| `MaxConnectionsPerWindow` | `int` | `10` | `[ValueRange(1, 10_000_000)]` | Số lần thử kết nối tối đa từ một IP trong `ConnectionRateWindow` trước khi kích hoạt cấm. |
| `ConnectionRateWindow` | `TimeSpan` | `00:00:05` (`5s`) | `[DurationRange("00:00:01", "00:10:00")]` | Độ dài cửa sổ trượt dùng để đếm số lần thử kết nối gần đây theo IP và theo subnet. |
| `MaxConnectionsPerSubnet` | `int` | `50` | `[ValueRange(1, 100_000)]` | Số kết nối đồng thời tối đa cho phép từ một subnet `/24` (IPv4) hoặc `/48` (IPv6). |
| `MaxSubnetConnectionsPerWindow` | `int` | `100` | `[ValueRange(1, 10_000_000)]` | Số lần thử kết nối tối đa từ một subnet `/24` hoặc `/48` trong `ConnectionRateWindow`. |
| `CleanupInterval` | `TimeSpan` | `00:01:00` (`1m`) | `[DurationRange("00:00:01", "01:00:00")]` | Chu kỳ của tác vụ dọn dẹp định kỳ `"conn.limit"`, dùng để xóa các mục endpoint không hoạt động. |
| `InactivityThreshold` | `TimeSpan` | `00:05:00` (`5m`) | `[DurationRange("00:00:01", "1.00:00:00")]` | Thời gian rảnh sau đó một mục endpoint không còn kết nối sẽ đủ điều kiện để dọn dẹp. |
| `MaxCleanupKeysPerRun` | `int` | `0` | `[ValueRange(0, 10_000_000)]` | Số khóa endpoint tối đa được quét trong mỗi chu kỳ dọn dẹp (`0` tự động co giãn theo một tỷ lệ phần trăm số mục đang theo dõi). |
| `DailyResetTimeOffset` | `TimeSpan` | `00:00:00` | `[DurationRange("-14:00:00", "14:00:00")]` | Độ lệch UTC dùng để xác định thời điểm bắt đầu ngày khi đặt lại giới hạn kết nối hằng ngày. |

### 2. Phát hiện kết nối bùng phát và tồn tại ngắn

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động lúc chạy |
| :--- | :--- | ---: | :--- | :--- |
| `MinConnectionIntervalMs` | `int` | `50` | `[ValueRange(0, 10_000)]` | Khoảng cách tối thiểu tính bằng ms giữa các kết nối từ cùng một IP; các kết nối đến nhanh hơn sẽ tăng bộ đếm kết nối nhanh. |
| `BurstThreshold` | `int` | `3` | `[ValueRange(2, 100)]` | Số kết nối nhanh liên tiếp cần có để kích hoạt chế độ bùng phát cho một IP. |
| `BurstPenaltyDivisor` | `int` | `2` | `[ValueRange(1, 10)]` | Số chia áp dụng cho `MaxConnectionsPerWindow` khi một IP ở chế độ bùng phát (`2` làm giảm một nửa giới hạn tốc độ). |
| `ShortLivedThresholdMs` | `int` | `2000` | `[ValueRange(0, 60_000)]` | Các kết nối đóng trong khoảng thời gian này (ms) sẽ chèn thêm một dấu thời gian phạt vào cửa sổ tốc độ của endpoint. |

### 3. Thắt chặt thích ứng và Proof-of-Work (`IProofOfWorkPolicy`)

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động lúc chạy |
| :--- | :--- | ---: | :--- | :--- |
| `EnableAdaptiveMode` | `bool` | `false` | — | Bật việc thắt chặt giới hạn theo IP và tăng/giảm độ khó Proof-of-Work động theo tải. |
| `AdaptiveLoadThreshold` | `double` | `0.7` | `[ValueRange(0.1, 0.99)]` | Tỷ lệ tải kết nối toàn cục (`_globalConnections / MaxConnections`) kích hoạt việc thắt chặt giới hạn theo IP. |
| `AdaptiveTighteningFactor` | `double` | `0.5` | `[ValueRange(0.1, 1.0)]` | Hệ số nhân áp dụng cho `MaxConnectionsPerIpAddress` khi đang thắt chặt thích ứng. |
| `AdaptivePowMinDifficulty` | `byte` | `12` | `[ValueRange(0, 32)]` | Độ khó Proof-of-Work cơ sở tính theo số bit 0 đứng đầu, được trả về khi không bị tấn công (hoặc khi `EnableAdaptiveMode` là `false`). |
| `AdaptivePowMaxDifficulty` | `byte` | `24` | `[ValueRange(0, 32)]` | Độ khó Proof-of-Work tối đa khi chịu tải flood toàn phần. |
| `AdaptivePowStartRate` | `int` | `10` | `[ValueRange(1, 1_000_000)]` | Tốc độ kết nối EWMA (lần thử/giây) mà từ đó độ khó PoW bắt đầu tăng trên `AdaptivePowMinDifficulty`. |
| `AdaptivePowMaxRate` | `int` | `100` | `[ValueRange(10, 10_000_000)]` | Tốc độ kết nối EWMA (lần thử/giây) mà tại đó tỷ lệ theo tốc độ của PoW đạt `1.0`. |
| `EnableCapacityBasedPoW` | `bool` | `true` | — | Kết hợp tỷ lệ theo tốc độ với tỷ lệ theo sức chứa máy chủ (`finalScale = rateScale * capacityScale`). |
| `CapacityPoWThreshold` | `double` | `0.5` | `[ValueRange(0.0, 1.0)]` | Hệ số tải kết nối toàn cục (`0.5` = 50% của `MaxConnections`) mà dưới ngưỡng này `capacityScale` vẫn bằng `0.0`. |

## API liên quan

- [Connection Guard](../../network/connection/connection-guard.md)
- [Connection Limiter](../../network/connection/connection-limiter.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Trusted Proxy](./trusted-proxy-options.md)
