---
title: Tùy chọn WebSocket
description: Lớp NetworkWebSocketOptions biểu diễn các cấu hình cho listener WebSocket phía server được host.
section: API Reference
package: Nalix.Network / Nalix.Runtime
---

Lớp `NetworkWebSocketOptions` biểu diễn các cấu hình cho listener WebSocket phía server được host.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## Tổng quan

Các thiết lập này quản lý thuộc tính bind (port, host, path), bắt tay subprotocol, hàng đợi kênh, thời gian chờ và giới hạn kích thước payload tối đa.

## Bảng cấu hình

Các tùy chọn này ánh xạ tới mục `[NetworkWebSocket]` trong cấu hình INI:

| Thuộc tính | Kiểu | Giá trị mặc định | Kiểm tra hợp lệ | Mô tả |
|----------|------|---------------|------------|-------------|
| `Port` | `ushort` | `57207` | `[ValueRange(1, 65535)]` | Cổng cục bộ mà listener WebSocket bind vào. |
| `Path` | `string` | `"/ws/"` | — | Tiền tố đường dẫn URL được ánh xạ tới handler nâng cấp WebSocket. |
| `Host` | `string` | `"*"` | — | Địa chỉ host để bind (ví dụ `*` cho mọi giao diện, `+`, hoặc `localhost`). |
| `SubProtocol` | `string` | `"nalix.v1"` | — | Subprotocol phía server được thương lượng khi nâng cấp WebSocket (`Sec-WebSocket-Protocol`). |
| `ServerVersion` | `string` | `"1.0.0"` | — | Chuỗi phiên bản server tùy chỉnh được hiển thị qua endpoint HTTP `/version`. |
| `EnableDevOpsEndpoints` | `bool` | `true` | — | Bật các endpoint HTTP gốc (`/healthz`, `/version`, `/metrics`) trên cổng của listener WebSocket. |
| `HandshakeTimeoutMs` | `int` | `5000` (ms) | `[ValueRange(500, 30000)]` | Thời gian tối đa tính bằng mili giây để chờ quá trình bắt tay nâng cấp HTTP hoàn tất trước khi đóng socket. |
| `MaxUpgradeRequestSize` | `int` | `8192` (byte) | `[ValueRange(1024, 65536)]` | Kích thước tối đa tính bằng byte cho các header của yêu cầu nâng cấp HTTP. |
| `MaxMessageSize` | `int` | `1_048_576` (1 MB) | `[ValueRange(1, int.MaxValue)]` | Kích thước tối đa cho phép của payload một thông điệp WebSocket đến, tính bằng byte. |
| `KeepAliveIntervalSeconds` | `int` | `30` (s) | `[ValueRange(0, 3600)]` | Khoảng thời gian ping keep-alive ở mức giao thức WebSocket tính bằng giây (`0` tắt). |
| `AllowedOrigins` | `string` | `""` (tắt kiểm tra) | — | Danh sách cho phép các origin trình duyệt (`scheme://host[:port]`), phân tách bằng dấu phẩy, được phép nâng cấp. Rỗng nghĩa là tắt kiểm tra. |
| `AllowMissingOrigin` | `bool` | `true` | — | Khi có danh sách cho phép, có chấp nhận yêu cầu nâng cấp **không có** header `Origin` (client native/không phải trình duyệt) hay không. Bị bỏ qua khi `AllowedOrigins` rỗng. |

## Thực thi Origin (bảo vệ CSWSH)

Trình duyệt gắn header `Origin` vào mọi yêu cầu nâng cấp WebSocket, và bất kỳ trang nào người dùng truy cập đều có thể thử mở socket tới server của bạn (cross-site WebSocket hijacking). Khi `AllowedOrigins` không rỗng, listener kiểm tra `Origin` **trước** phản hồi `101 Switching Protocols`:

- Khớp chính xác về scheme, host và port. Scheme và host được so sánh không phân biệt hoa thường, và dấu `/` ở cuối bị bỏ qua. `https://app.example.com` **không** khớp với `http://app.example.com`, `https://app.example.com:8443` hay `https://evil.app.example.com`.
- Không có ký tự đại diện. `*` không có ý nghĩa đặc biệt; hãy liệt kê tường minh từng origin.
- Yêu cầu không có `Origin` chỉ được chấp nhận khi `AllowMissingOrigin = true`. Client native (SDK Nalix, console/MAUI/Unity) không gửi header này. Hãy đặt thành `false` cho các triển khai chỉ dành cho trình duyệt.
- Yêu cầu bị từ chối nhận `HTTP/1.1 403 Forbidden` và socket bị đóng. Không có kết nối hay phiên nào được tạo. Listener ghi cảnh báo chẩn đoán `NW.ws:origin` (`ws-origin-rejected`) kèm origin và endpoint từ xa.

Mặc định (`AllowedOrigins` rỗng) giữ hành vi chấp nhận tất cả như cũ để tương thích ngược. Listener ghi cảnh báo `ws-origin-check-disabled` khi khởi động trong trường hợp đó. Hãy đặt `AllowedOrigins` trong mọi triển khai mà trình duyệt có thể truy cập được.

## Ví dụ sử dụng

### Thay đổi tùy chọn bằng code

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<NetworkWebSocketOptions>(options =>
{
    options.Port = 8080;
    options.Path = "/socket";
    options.Host = "127.0.0.1";
    options.HandshakeTimeoutMs = 5000;
    options.MaxUpgradeRequestSize = 8192;
    options.MaxMessageSize = 2_097_152; // 2 MB
    options.KeepAliveIntervalSeconds = 30;
    options.AllowedOrigins = "https://app.example.com,https://admin.example.com";
    options.AllowMissingOrigin = false; // triển khai chỉ dành cho trình duyệt
});
```

### Định dạng cấu hình INI

```ini
[NetworkWebSocket]
; Network WebSocket configuration — controls endpoint, subprotocol, and behavior
Port = 57207
Path = /ws/
Host = *
SubProtocol = nalix.v1
ServerVersion = 1.0.0
EnableDevOpsEndpoints = true
HandshakeTimeoutMs = 5000
MaxUpgradeRequestSize = 8192
MaxMessageSize = 1048576
KeepAliveIntervalSeconds = 30
AllowedOrigins =
AllowMissingOrigin = true
```

## Cấu hình Forwarded Headers (`ForwardedHeadersOptions`)

`ForwardedHeadersOptions` (`src/Nalix.Network/Options/ForwardedHeadersOptions.cs`) ánh xạ tới mục `[ForwardedHeaders]` trong INI và cấu hình việc lấy IP client từ reverse proxy HTTP tầng L7 (`CF-Connecting-IP`, `X-Forwarded-For`) trong `WebSocketListenerBase`:

| Thuộc tính | Kiểu | Giá trị mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `Enabled` | `bool` | `false` | Bật phân tích các header nâng cấp HTTP `CF-Connecting-IP` và `X-Forwarded-For` để lấy IP client thật. |
| `RequireTrustedProxy` | `bool` | `false` | Khi `true`, chỉ các kết nối vật lý đến từ IP/CIDR được liệt kê trong [TrustedProxyOptions](./trusted-proxy-options.md) mới được phép chuyển tiếp IP client qua header HTTP; các peer không đáng tin gửi forwarded headers sẽ bị từ chối. |
| `ClientIpHeader` | `ForwardedClientIpHeader` | `Auto` | Chọn header mang IP client: `Auto`, `CfConnectingIp`, `XRealIp` hoặc `XForwardedFor`. Giá trị khác `Auto` chỉ đọc đúng header đó và bỏ qua các header còn lại. |

Với `ClientIpHeader = Auto` (mặc định), header đầu tiên có mặt trong `CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For` sẽ được dùng (không dự phòng sang header ưu tiên thấp hơn), và IP đó quyết định việc cấm, giới hạn theo IP và giới hạn tốc độ.

:::caution[Header có thể bị giả mạo]
Proxy phải ghi đè hoặc xóa các header này khỏi client — một `CF-Connecting-IP` do client gửi sẽ có ưu tiên hơn `X-Real-IP`. `X-Forwarded-For` được duyệt từ phải sang trái và entry đầu tiên không phải proxy đáng tin cậy sẽ được dùng (nếu mọi entry đều đáng tin cậy thì dùng entry bên trái nhất), nên hãy liệt kê các proxy của bạn trong [TrustedProxyOptions](./trusted-proxy-options.md); bạn cũng có thể cố định `ClientIpHeader` thành đúng header mà proxy của bạn đặt, và giữ `RequireTrustedProxy = true`. Xem [Reverse Proxy và TLS](../../../guides/deployment/reverse-proxy-tls.md).
:::

## Xem thêm

* [WebSocket Listener](../../network/websocket-listener.md)
* [WebSocket Connection](../../network/websocket-connection.md)
* [Tùy chọn Trusted Proxy](./trusted-proxy-options.md)
