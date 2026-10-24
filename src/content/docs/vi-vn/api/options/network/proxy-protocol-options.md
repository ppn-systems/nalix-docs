---
title: Tùy chọn Proxy Protocol
description: ProxyProtocolOptions cấu hình việc phân tích header PROXY Protocol v1/v2 để lấy IP client thật khi máy chủ nằm sau bộ cân bằng tải (HAProxy, AWS NLB, v.v.).
section: API Reference
package: Nalix.Network / Nalix.Runtime
---

`ProxyProtocolOptions` cấu hình việc phân tích header PROXY Protocol v1/v2 để lấy IP client thật khi máy chủ nằm sau bộ cân bằng tải (HAProxy, AWS NLB, v.v.).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ProxyProtocolOptions.cs`
- `src/Nalix.Network/Internal/Protocol/ProxyProtocolParser.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProxyProtocol.cs`

## Giá trị mặc định và kiểm tra hợp lệ

| Thuộc tính | Mặc định | Phạm vi hợp lệ | Mô tả |
| --- | ---: | --- | --- |
| `Enabled` | `false` | Boolean | Bật phân tích header PROXY Protocol v1/v2 để lấy IP client thật. |
| `RequireTrustedProxy` | `false` | Boolean | Chỉ chấp nhận header PROXY từ các IP có trong danh sách Trusted Proxies; loại bỏ mọi nguồn khác. |
| `HeaderTimeoutMs` | `2000` | `100..30000` | Thời gian tối đa tính bằng mili giây để chờ header PROXY sau khi TCP accept. |
| `MaxPendingProxyConnections` | `1024` | `1..100_000` | Số kết nối đồng thời tối đa đang chờ header PROXY (chống DDoS). |

`Validate()` chạy kiểm tra DataAnnotation.

## Khi nào nên bật

Bật `ProxyProtocolOptions.Enabled` khi máy chủ được triển khai sau một bộ cân bằng tải TCP có chèn header PROXY. Nếu không, `ConnectionGuard` và giới hạn tốc độ sẽ thấy IP của bộ cân bằng tải thay vì IP client thật.

Các tình huống thường gặp:

- HAProxy ở chế độ TCP
- AWS Network Load Balancer (NLB)
- nginx được cấu hình với `proxy_protocol on`
- Bất kỳ proxy nào gửi header PROXY v1 (văn bản) hoặc v2 (nhị phân)

## Cách hoạt động

1. Sau khi TCP accept, listener đọc những byte đầu tiên của kết nối.
2. Nếu các byte khớp với header PROXY v1 (`PROXY TCP4 ...`) hoặc v2 (magic nhị phân `\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A`), parser trích xuất IP và cổng client thật.
3. Nếu `RequireTrustedProxy` là `true`, IP remote của kết nối được kiểm tra với danh sách Trusted Proxies trước khi chấp nhận header PROXY.
4. Nếu không có header PROXY nào đến trong `HeaderTimeoutMs`, kết nối bị hủy.
5. IP đã trích xuất thay thế remote endpoint của socket cho mọi kiểm soát truy cập, giới hạn tốc độ và theo dõi kết nối ở các thành phần phía sau.

## Ghi chú bảo mật

- `MaxPendingProxyConnections` ngăn việc cạn kiệt bộ nhớ do tấn công slow-loris, khi kẻ tấn công giữ kết nối mở mà không gửi header PROXY.
- Parser kiểm tra độ dài header v2 và từ chối các header bị lỗi hoặc quá kích thước.

:::caution[`RequireTrustedProxy` mặc định là `false`]
Khi `Enabled = true` và `RequireTrustedProxy = false` (mặc định), bất kỳ client nào kết nối trực tiếp đều có thể gửi header `PROXY TCP4 <any-ip> ...` của riêng mình. Địa chỉ giả mạo sẽ thay thế địa chỉ thật ở mọi thành phần phía sau: các lệnh cấm và giới hạn theo IP của `ConnectionGuard`, giới hạn tốc độ và theo dõi kết nối đều đếm IP giả, nên một client bị cấm có thể kết nối lại dưới danh nghĩa người khác, hoặc dựng tình huống để cấm một IP khác.

Mỗi khi bật PROXY protocol, hãy đặt đồng thời `RequireTrustedProxy = true` và liệt kê địa chỉ của bộ cân bằng tải trong `TrustedProxyOptions`. Chỉ để `false` khi không có client nào có thể tới listener ngoài bộ cân bằng tải đó (ví dụ: subnet riêng hoặc tường lửa chỉ cho phép bộ cân bằng tải).
:::

## API liên quan

- [Tùy chọn Trusted Proxy](./trusted-proxy-options.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Connection Quota](./connection-quota-options.md)
- [Tùy chọn mạng](./options.md)
