---
title: Kết nối WebSocket
description: Lớp WebSocketConnection đại diện cho một kết nối WebSocket full-duplex đang hoạt động giữa máy chủ và client. Nó bao bọc kiểu System.Net.WebSockets.WebSocket chuẩn...
section: API Reference
package: Nalix.Network
---

Lớp `WebSocketConnection` đại diện cho một kết nối WebSocket full-duplex đang hoạt động giữa máy chủ và client. Nó bao bọc kiểu `System.Net.WebSockets.WebSocket` chuẩn và triển khai `IConnection` để thống nhất với các abstraction transport của Nalix.

## Tổng quan

`WebSocketConnection` tự triển khai transport WebSocket, đồng thời theo dõi các chỉ số kết nối, xử lý các chuyển trạng thái vòng đời, duy trì các thuộc tính trạng thái và lưu cache giới hạn tốc độ. Nó được thiết kế để hoạt động cùng registry kết nối toàn cục và hệ thống timing wheel.

### Tính năng chính
* **Abstraction kết nối thống nhất**: Triển khai `IConnection`, cho phép các pipeline giao thức và middleware điều phối hiện có xử lý kết nối WebSocket một cách trong suốt.
* **Tự làm transport**: `Transport` trả về chính kết nối (`IConnection.ITransport`, `TransportFraming.None`); không có các thành viên `TCP` / `UDP` riêng và không có adapter `WebSocketTransport`.
* **Pool ngữ cảnh không cấp phát bộ nhớ**: Sử dụng các pool nội bộ (`LocalPool<T>`) cho tham số sự kiện kết nối và ngữ cảnh xử lý nhằm giảm chi phí GC khi tải cao.
* **Đóng êm (graceful close)**: Khi máy chủ đóng một WebSocket vẫn còn gửi được, kết nối chạy bắt tay đóng của RFC 6455 thay vì ngắt TCP đột ngột (xem bên dưới).

## Nguồn mã

- `src/Nalix.Network/Connections/WebSocketConnection.cs`
- `src/Nalix.Network/Connections/WebSocketConnection.Transport.cs`
- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## Tham chiếu API

### Lớp WebSocketConnection

```csharp
namespace Nalix.Network.Connections;

public sealed partial class WebSocketConnection :
    IConnection,
    IConnectionErrorTracked,
    IConnectionTrafficMetrics,
    IPooledConnectContextPool,
    TimingWheel.ITimeoutTrackedConnection
```

#### Constructor

* `public WebSocketConnection(WebSocket webSocket, IOpCodeExtractor packetClassifier, EndPoint remoteEndPoint)`
  Khởi tạo một kết nối bao bọc `WebSocket` được chỉ định, với bộ phân loại gói tin và remote endpoint của client. Ném `ArgumentNullException` nếu có đối số `null`. Kết nối sở hữu socket này.

#### Thuộc tính

* `public bool IsDisposed { get; }`
  Trả về `true` nếu kết nối đã đóng và tài nguyên đã được giải phóng.

* `public ulong ConnectionId { get; }`
  Định danh duy nhất của kết nối này (`Snowflake.NewId(SnowflakeType.Session)`).

* `public string? UserId { get; set; }`
  Định danh người dùng của ứng dụng (tùy chọn).

* `public IConnection.ITransport Transport { get; }`
  Chính kết nối đóng vai trò transport. Ném `ObjectDisposedException` sau khi đã dispose.

* `public IOpCodeExtractor PacketClassifier { get; }`
  Bộ trích xuất opcode được gắn bởi protocol của listener.

* `public INetworkEndpoint NetworkEndpoint { get; }`
  Remote endpoint của client (bản chụp `SocketEndpoint`).

* `public IObjectMap<AttributeKey, object> Attributes { get; }`
  Bộ chứa metadata dạng khóa-giá trị được pool, gắn với vòng đời của kết nối.

* `public ConcurrentDictionary<ushort, object> RateLimitCache { get; }`
  Cache theo route/theo directive được các middleware giới hạn tốc độ sử dụng.

* `public int ErrorCount { get; }`, `public long PacketsDropped { get; }`, `public int PendingPackets { get; }`
  Bộ đếm lỗi, gói tin bị loại và callback đang chờ.

* `public long UpTime { get; }`
  Thời gian hoạt động của kết nối tính bằng mili giây.

* `public long BytesSent { get; }` / `public long BytesReceived { get; }`
  Số byte trên đường truyền được đếm cho kết nối.

* `public long LastPingTime { get; }`
  Dấu thời gian của khung nhận được gần nhất, tính bằng mili giây.

* `public PermissionLevel Level { get; set; }` (mặc định `NONE`), `public CipherSuiteType Algorithm { get; set; }` (mặc định `Chacha20Poly1305`), `public Bytes32 Secret { get; set; }`
  Mức phân quyền, bộ mật mã đã thỏa thuận và khóa bí mật của phiên.

* `public int IdleTimeoutMs { get; set; }`, `public bool ExcludeFromIdleTimeout { get; set; }`
  Thời gian chờ nhàn rỗi (khởi tạo từ `TimingWheelOptions.IdleTimeoutMs`) và việc miễn trừ khỏi cơ chế thu dọn kết nối nhàn rỗi.

#### Sự kiện

* `public event EventHandler<IConnectionEventArgs> ConnectionClosed`
  Được kích hoạt khi kết nối bị đóng.

* `public event EventHandler<IConnectionEventArgs> MessageProcessing`
  Được kích hoạt khi một thông điệp hoàn chỉnh được đọc và cần định tuyến/xử lý.

* `public event EventHandler<IConnectionEventArgs> MessageProcessed`
  Được kích hoạt sau khi một thông điệp được gửi (dùng để cập nhật thống kê hoặc xử lý sau khi gửi).

#### Phương thức công khai

* `public void Disconnect(string? reason = null)`
  Dispose kết nối một cách idempotent; khung đóng được gửi khi socket vẫn còn gửi được.

* `public void IncrementErrorCount()`
  Đếm một lỗi trong `ConnectionGuardOptions.ErrorWindow`; khi đạt `ConnectionGuardOptions.MaxErrorThreshold` thì kết nối bị ngắt.

* `public void IncrementBytesSent(int bytes)`, `public void IncrementBytesReceived(int bytes)`, `public void IncrementPacketsDropped()`
  Các bộ đếm lưu lượng.

* `public void UpdateIdleTimeout(int newTimeoutMs)`
  Cập nhật `IdleTimeoutMs` (`> 0`, nếu không sẽ ném `ArgumentOutOfRangeException`) và đăng ký lại kết nối vào `TimingWheel`.

* `public void Dispose()`
  Giải phóng các stream bên dưới, các lock và trả các lớp ngữ cảnh tham số đã pool về pool.

## Chi tiết transport nội bộ

Về phía ứng dụng, giao tiếp WebSocket không có khung (frameless) vì bản thân giao thức WebSocket đã cung cấp ranh giới khung.

* **Không hỗ trợ thao tác đồng bộ**: `IConnection.ITransport.Send(ReadOnlySpan<byte>)` ném `NotSupportedException`. Hãy dùng `SendAsync`. Việc gửi trên kết nối đã dispose hoặc có socket không ở trạng thái `Open` sẽ hoàn tất mà không gửi gì.
* **Buffer của receive loop**: Receive loop dùng một buffer được thuê có kích thước khớp với `FragmentOptions.MaxChunkSize`. Các thông điệp lớn hơn chuyển sang đường chậm, gom payload vào một mảng được thuê và tăng dần theo nhu cầu tới tối đa `NetworkWebSocketOptions.MaxMessageSize` rồi mới kích hoạt `MessageProcessing`. Các lần nhận dùng overload `Memory<byte>` của `WebSocket.ReceiveAsync`, nên mỗi lần nhận không cấp phát đối tượng kết quả.

### Bắt tay đóng

Khi kết nối bị dispose và `WebSocket` đang ở trạng thái `Open` hoặc `CloseReceived`, kết nối ghi một khung đóng dưới khóa gửi (để không bị giữ lại sau một lô đang corked), chờ khung đóng của phía bên kia trong khi receive loop vẫn đang đọc, rồi mới giải phóng socket. Toàn bộ bắt tay bị giới hạn trong 2 giây; phía bên kia không phản hồi sẽ bị ngắt.

| Nguyên nhân | Trạng thái đóng |
| :--- | :--- |
| Đóng mặc định | `NormalClosure` (1000), lý do `"Connection closed"` |
| Thông điệp lớn hơn `NetworkWebSocketOptions.MaxMessageSize` | `MessageTooBig` (1009), lý do `"Message exceeds the maximum size"`; sau đó kết nối đọc và bỏ qua dữ liệu cho tới khi nhận được khung đóng của phía bên kia, để các byte chưa đọc không biến việc đóng thành reset |
| `WebSocketListenerBase.Deactivate` | `EndpointUnavailable` (1001) cho mọi kết nối đang sống, trước khi việc hủy của listener ngắt các socket |

## Xem thêm

* [Trình lắng nghe WebSocket](websocket-listener.md)
* [Registry kết nối](connection/connection-hub.md)
* [Timing Wheel](time/timing-wheel.md)
