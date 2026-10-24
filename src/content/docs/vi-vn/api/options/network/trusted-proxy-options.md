---
title: Tùy chọn Trusted Proxy
description: Tham chiếu cho Nalix.Network.Options.TrustedProxyOptions — tệp danh sách cho phép reverse proxy và CDN đáng tin cậy, cùng giới hạn tốc độ kết nối nâng cao cho ConnectionGuard.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`TrustedProxyOptions` (`public sealed partial class TrustedProxyOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình danh sách cho phép IP và CIDR của reverse proxy / CDN đáng tin cậy (`"trusted_proxies.txt"`) cùng các hạn mức kết nối nâng cao được dùng bởi `ConnectionGuard`, `TcpListenerBase` (PROXY Protocol) và `WebSocketListenerBase` (`ForwardedHeadersOptions`).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/TrustedProxyOptions.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được tải từ mục `[TrustedProxy]` trong `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Thành phần sử dụng khi chạy |
| :--- | :--- | ---: | :--- | :--- |
| `StoreFileName` | `string` | `"trusted_proxies.txt"` | — | Tên tệp trong `Directories.ConfigurationDirectory` chứa danh sách IP hoặc dải CIDR của proxy đáng tin cậy, mỗi dòng một mục (hỗ trợ chú thích `#` và tự động nạp lại khi thay đổi). |
| `MaxTrustedProxies` | `int` | `100_000` | `[ValueRange(10, 1_000_000)]` | Số lượng tối đa các mục IP/CIDR của proxy đáng tin cậy được nạp từ đĩa. |
| `MaxConnectionsPerTrustedProxy` | `int` | `5000` | `[ValueRange(1, 100_000)]` | Giới hạn kết nối đồng thời cho phép từ một IP proxy đáng tin cậy. |
| `MaxAttemptsPerTrustedProxyWindow` | `int` | `2000` | `[ValueRange(1, 10_000_000)]` | Số lần thử kết nối tối đa cho phép từ một IP proxy đáng tin cậy trong `ConnectionQuotaOptions.ConnectionRateWindow`. |

`Validate()` chạy `this.ValidateDataAnnotations()` và ném `ValidationException` khi vi phạm ràng buộc.

## Hành vi khi chạy

Khi IP nguồn của kết nối đến khớp với `NetworkAccessList.IsTrustedProxy`:

1. **Tiếp nhận kết nối của `ConnectionGuard`**: Dùng `MaxConnectionsPerTrustedProxy` (`5000`) và `MaxAttemptsPerTrustedProxyWindow` (`2000`) thay cho giới hạn theo IP tiêu chuẩn (`10`), và không bao giờ áp dụng cấm IP lũy tiến (`BanEndpoint` cũng bỏ qua IP proxy đáng tin cậy).
2. **PROXY Protocol & Forwarded Headers**: Khi `ProxyProtocolOptions.RequireTrustedProxy` hoặc `ForwardedHeadersOptions.RequireTrustedProxy` là `true`, chỉ các peer vật lý khớp với `TrustedProxyOptions` mới được phép cung cấp header IP client thật.

## API liên quan

- [Connection Guard](../../network/connection/connection-guard.md)
- [Tùy chọn Connection Quota](./connection-quota-options.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn mạng](./options.md)
