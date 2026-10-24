---
title: Tùy chọn Transport
description: Tham chiếu cho Nalix.SDK.Options.TransportOptions — kết nối endpoint phía client, tinh chỉnh socket, lựa chọn bộ mã AEAD, ghim khóa TOFU, tiếp tục phiên 0-RTT, tự động kết nối lại và cấu hình keepalive.
section: API Reference
package: Nalix.SDK
---

**Không gian tên:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`TransportOptions` (`public sealed partial class TransportOptions : ConfigurationLoader`) cấu hình kết nối phía client, bộ đệm socket, bộ mã AEAD, nén LZ4, ghim khóa máy chủ X25519 / Trust-On-First-Use (TOFU), tiếp tục phiên 0-RTT, backoff của `ReconnectSupervisor`, dò keepalive và đồng bộ đồng hồ trên [TcpSession](../../sdk/tcp-session.md), [UdpSession](../../sdk/udp-session.md) và [WebSocketSession](../../sdk/websocket-session.md).

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Options/TransportOptions.cs`
- `src/Nalix.SDK/Transport/TransportSession.cs`
- `src/Nalix.SDK/Transport/Internal/ReconnectSupervisor.cs`
- `src/Nalix.SDK/Transport/Extensions/HandshakeExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs`

## Tham chiếu thuộc tính đầy đủ

Được tải từ mục `[Transport]` trong `default.ini` qua `ConfigurationManager.Instance.Get<TransportOptions>()` hoặc khởi tạo trực tiếp bằng `new TransportOptions()`:

### 1. Endpoint và tinh chỉnh socket

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]` | Cổng server mặc định được `ConnectAsync()` dùng khi không truyền ghi đè cổng. |
| `Address` | `string` | `"127.0.0.1"` | `[Length(1)]` | Địa chỉ IP hoặc hostname server mặc định được `ConnectAsync()` dùng. |
| `ConnectTimeoutMillis` | `int` | `30000` (`30s`) | `[ValueRange(0, int.MaxValue)]` | Thời gian chờ tính bằng mili giây cho mỗi lần thử kết nối socket/WebSocket (`0` = không giới hạn). |
| `NoDelay` | `bool` | `true` | — | Điều khiển `Socket.NoDelay` (`TCP_NODELAY`) trên `TcpSession`. |
| `BufferSize` | `int` | `65536` (`64 KB`) | `[ValueRange(2048, 1048576)]` | Kích thước bộ đệm gửi và nhận socket tính bằng byte (`2 KB..1 MB`). |
| `MaxUdpDatagramSize` | `int` | `1400` | `[ValueRange(64, 65507)]` | Kích thước datagram UDP tối đa tính bằng byte (bao gồm `SessionToken` 8 byte và trailer MAC `XxHash32` 4 byte). |
| `AsyncQueueCapacity` | `int` | `1024` | `[ValueRange(1, 65536)]` | `[Reserved]` Dung lượng hàng đợi xử lý thông điệp bất đồng bộ (hiện chưa được sử dụng). |

### 2. Mã hóa, nén và danh tính server (TOFU / Ghim khóa)

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | ---: | :--- | :--- |
| `Algorithm` | `CipherSuiteType` | `CipherSuiteType.Chacha20Poly1305` | — | Bộ mã đối xứng dùng để mã hóa khung sau `HandshakeAsync`. |
| `CompressionEnabled` | `bool` | `true` | — | Bật nén LZ4 tự động cho các khung gửi đi đạt `CompressionThreshold`. |
| `CompressionThreshold` | `int` | `512` | — | Kích thước payload tối thiểu tính bằng byte trước khi áp dụng nén LZ4 cho khung gửi đi. |
| `ServerPublicKey` | `string?` | `null` | — | Khóa công khai X25519 tĩnh 32 byte của server dạng hex, dùng để xác thực chống MitM trong `HandshakeAsync`. |
| `AllowTofu` | `bool` | `true` | — | Cho phép khám phá Trust-On-First-Use (`PUBLIC_KEY_REQUEST` $\rightarrow$ `SessionTofu`) khi `ServerPublicKey` là null hoặc rỗng. |
| `PersistTofuKey` | `bool` | `false` | — | Khi `true`, lưu `ServerPublicKey` lấy qua TOFU vào kho cấu hình sau một lần bắt tay đã được xác minh. |

### 3. Tiếp tục phiên 0-RTT và tự động kết nối lại (`ReconnectSupervisor`)

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | ---: | :--- | :--- |
| `ResumeEnabled` | `bool` | `true` | — | Thử `ResumeSessionAsync` 0-RTT trước khi quay về bắt tay mới trong `ConnectWithResumeAsync` hoặc khi tự động kết nối lại. |
| `ResumeTimeoutMillis` | `int` | `3000` (`3s`) | `[ValueRange(100, int.MaxValue)]` | Thời gian chờ tính bằng mili giây cho các yêu cầu tiếp tục phiên. |
| `ResumeFallbackToHandshake` | `bool` | `true` | — | Tự động chuyển sang `HandshakeAsync` khi `ResumeSessionAsync` trả về `ProtocolReason` khác `NONE`. |
| `AutoReconnectEnabled` | `bool` | `false` | — | Bật tự động kết nối lại ở nền qua `ReconnectSupervisor` khi kết nối bị rớt bất ngờ. |
| `ReconnectBaseDelayMillis` | `int` | `500` | `[ValueRange(1, int.MaxValue)]` | Độ trễ ban đầu tính bằng mili giây trước lần thử kết nối lại đầu tiên. |
| `ReconnectMaxDelayMillis` | `int` | `30000` (`30s`) | `[ValueRange(1, int.MaxValue)]` | Giới hạn độ trễ tối đa tính bằng mili giây cho backoff lũy thừa khi kết nối lại. |
| `ReconnectMaxAttempts` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Số lần thử kết nối lại liên tiếp tối đa trước khi bỏ cuộc (`0` = không giới hạn). |

### 4. Dò keepalive và đồng bộ đồng hồ

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | ---: | :--- | :--- |
| `KeepAliveIntervalMillis` | `int` | `0` (tắt) | `[ValueRange(0, int.MaxValue)]` | Khoảng thời gian `PingAsync` định kỳ tính bằng mili giây (`0` tắt dò keepalive). |
| `KeepAliveTimeoutMillis` | `int` | `5000` (`5s`) | `[ValueRange(100, int.MaxValue)]` | Thời gian chờ tính bằng mili giây cho mỗi phản hồi `PONG` keepalive. |
| `KeepAliveMissThreshold` | `int` | `3` | `[ValueRange(1, int.MaxValue)]` | Số phản hồi `PONG` keepalive bị bỏ lỡ liên tiếp trước khi socket bị đánh dấu lỗi và chuyển cho `ReconnectSupervisor`. |
| `TimeSyncEnabled` | `bool` | `true` | — | Cho phép `SyncTimeAsync` đồng bộ đồng hồ client với thời gian server. |
| `TimeOffsetMs` | `double` | `0` | — | Độ lệch thời gian hiện tại tính bằng mili giây được áp dụng bởi đồng bộ đồng hồ. |

## Ví dụ cấu hình

### Cấu hình bằng code

```csharp
using Nalix.Abstractions.Security;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;

TransportOptions options = new()
{
    Address = "game.example.com",
    Port = 57206,
    ConnectTimeoutMillis = 10_000,
    Algorithm = CipherSuiteType.Chacha20Poly1305,
    AllowTofu = true,
    AutoReconnectEnabled = true,
    ReconnectBaseDelayMillis = 500,
    ReconnectMaxDelayMillis = 15_000,
    KeepAliveIntervalMillis = 15_000,
    KeepAliveTimeoutMillis = 5_000,
    KeepAliveMissThreshold = 3
};

using TcpSession session = new(options);
```

### Cấu hình INI (`default.ini`)

```ini
[Transport]
Port = 57206
Address = 127.0.0.1
ConnectTimeoutMillis = 30000
NoDelay = true
BufferSize = 65536
Algorithm = Chacha20Poly1305
CompressionEnabled = true
CompressionThreshold = 512
MaxUdpDatagramSize = 1400
AllowTofu = true
PersistTofuKey = false
ResumeEnabled = true
ResumeTimeoutMillis = 3000
ResumeFallbackToHandshake = true
AutoReconnectEnabled = false
ReconnectBaseDelayMillis = 500
ReconnectMaxDelayMillis = 30000
ReconnectMaxAttempts = 0
KeepAliveIntervalMillis = 0
KeepAliveTimeoutMillis = 5000
KeepAliveMissThreshold = 3
TimeSyncEnabled = true
```

## API liên quan

- [Transport Session](../../sdk/transport-session.md)
- [Tùy chọn WebSocket Transport](./websocket-transport-options.md)
- [Request Options](./request-options.md)
- [Handshake Extensions](../../sdk/handshake-extensions.md)
- [Resume Extensions](../../sdk/resume-extensions.md)
