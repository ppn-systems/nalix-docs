---
title: Tùy chọn WebSocket Transport
description: Tham chiếu cho Nalix.SDK.Options.WebSocketTransportOptions — đường dẫn endpoint, subprotocol, TLS (wss://) và kích thước thông điệp tối đa cho WebSocketSession.
section: API Reference
package: Nalix.SDK
---

**Không gian tên:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`WebSocketTransportOptions` (`public sealed partial class WebSocketTransportOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình các thiết lập riêng cho WebSocket của [WebSocketSession](../../sdk/websocket-session.md), đi cùng với [TransportOptions](./transport-options.md).

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Options/WebSocketTransportOptions.cs`
- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được tải từ mục `[WebSocketTransport]` trong `default.ini` hoặc truyền trực tiếp vào `new WebSocketSession(transportOptions, webSocketOptions)`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động khi chạy |
| :--- | :--- | ---: | :--- | :--- |
| `Path` | `string` | `"/ws/"` | — | Đường dẫn HTTP Upgrade tương đối (được chuẩn hóa để bắt đầu bằng `/`). |
| `SubProtocol` | `string` | `"nalix.v1"` | — | Subprotocol WebSocket được thêm vào `ClientWebSocket.Options.AddSubProtocol(...)` khi không phải khoảng trắng. |
| `UseTls` | `bool` | `false` | — | Chọn `wss://{host}:{port}{path}` khi `true`, hoặc `ws://{host}:{port}{path}` khi `false`. |
| `MaxMessageSize` | `int` | `1_048_576` (`1 MB`) | `[ValueRange(1, int.MaxValue)]` | Kích thước thông điệp WebSocket đến tối đa tính bằng byte được `WsFrameReader` chấp nhận trước khi ném `NetworkException`. |

`Validate()` chạy `this.ValidateDataAnnotations()` và ném `ValidationException` nếu `MaxMessageSize < 1`.

## Ví dụ sử dụng

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport;

TransportOptions transportOptions = new()
{
    Address = "ws.example.com",
    Port = 443,
    ConnectTimeoutMillis = 10_000
};

WebSocketTransportOptions wsOptions = new()
{
    Path = "/ws/",
    SubProtocol = "nalix.v1",
    UseTls = true,
    MaxMessageSize = 1_048_576
};

using WebSocketSession session = new(transportOptions, wsOptions);
```

### Cấu hình INI (`default.ini`)

```ini
[WebSocketTransport]
Path = /ws/
SubProtocol = nalix.v1
UseTls = false
MaxMessageSize = 1048576
```

## API liên quan

- [WebSocket Session](../../sdk/websocket-session.md)
- [Tùy chọn Transport](./transport-options.md)
- [WebSocket Hosting Binding (Server)](../../hosting/websocket-binding.md)
