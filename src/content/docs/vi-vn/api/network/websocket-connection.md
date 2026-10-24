---
title: Kết nối WebSocket
description: Lớp WebSocketConnection đại diện cho một kết nối WebSocket full-duplex đang hoạt động giữa máy chủ và client. Nó bao bọc kiểu System.Net.WebSockets.WebSocket chuẩn...
section: API Reference
package: Nalix.Network
---

Lớp `WebSocketConnection` đại diện cho một kết nối WebSocket full-duplex đang hoạt động giữa máy chủ và client. Nó bao bọc kiểu `System.Net.WebSockets.WebSocket` chuẩn và triển khai `IConnection` để thống nhất với các abstraction transport của Nalix.

## Tổng quan

`WebSocketConnection` cung cấp một triển khai adapter stream transport đáng tin cậy (`WebSocketTransport`), đồng thời theo dõi các chỉ số kết nối, xử lý các chuyển trạng thái vòng đời, duy trì các thuộc tính trạng thái và lưu cache giới hạn tốc độ. Nó được thiết kế để hoạt động cùng registry kết nối toàn cục và hệ thống timing wheel.

### Tính năng chính
* **Abstraction kết nối thống nhất**: Triển khai `IConnection`, cho phép các pipeline giao thức và middleware điều phối hiện có xử lý kết nối WebSocket một cách trong suốt.
* **Tích hợp transport TCP**: Thuộc tính `.TCP` ánh xạ tới `WebSocketTransport` tùy chỉnh, bao bọc khung WebSocket chuẩn.
* **Không hỗ trợ UDP**: Gọi `.UDP` sẽ ném `NotSupportedException`.
* **Pool ngữ cảnh không cấp phát bộ nhớ**: Sử dụng các pool nội bộ (`LocalPool<T>`) cho tham số sự kiện kết nối và ngữ cảnh xử lý nhằm giảm chi phí GC khi tải cao.

## Tham chiếu API

### Lớp WebSocketConnection

```csharp
namespace Nalix.Network.Connections;

public sealed class WebSocketConnection :
    IConnection,
    IConnectionErrorTracked,
    TimingWheel.ITimeoutTrackedConnection,
    IPooledConnectContextPool
```

#### Constructor

* `public WebSocketConnection(WebSocket webSocket, IOpCodeExtractor packetClassifier, EndPoint remoteEndPoint, ILogger? logger = null)`
  Khởi tạo một kết nối bao bọc instance `WebSocket` được chỉ định, với bộ phân loại gói tin và ánh xạ tới remote IP endpoint được cung cấp.

#### Thuộc tính

* `public bool IsDisposed { get; }`
  Trả về `true` nếu kết nối đã đóng và tài nguyên đã được giải phóng.

* `public bool IsUdpCreated { get => false; }`
  Trả về `false` vì UDP không được hỗ trợ trên WebSocket.

* `public ulong ID { get; }`
  Lấy định danh duy nhất được gán cho phiên kết nối này (được suy ra từ Snowflake).

* `public IConnection.ITransport TCP { get; }`
  Lấy adapter `WebSocketTransport` để gửi và nhận các khung stream nhị phân.

* `public IConnection.ITransport UDP { get; }`
  Ném `NotSupportedException`.

* `public INetworkEndpoint NetworkEndpoint { get; }`
  Lấy cấu trúc địa chỉ IP và cổng đại diện cho remote endpoint của client.

* `public IObjectMap<string, object> Attributes { get; }`
  Bộ chứa metadata dạng khóa-giá trị tùy chỉnh, gắn với vòng đời của kết nối.

* `public ConcurrentDictionary<ushort, object> RateLimitCache { get; }`
  Cache theo route/theo directive được các middleware giới hạn tốc độ sử dụng.

* `public int ErrorCount { get; }`
  Lấy tổng số lỗi giao thức hoặc lỗi kiểm tra hợp lệ gặp phải trên kết nối này.

* `public long UpTime { get; }`
  Thời gian hoạt động của kết nối tính bằng mili giây.

* `public long BytesSent { get; }`
  Tổng số byte đã ghi vào stream của kết nối.

* `public long BytesReceived { get; }`
  Tổng số byte đã đọc từ stream của kết nối.

* `public long LastPingTime { get; set; }`
  Dấu thời gian của heartbeat giao thức nhận được gần nhất, tính bằng mili giây.

* `public PermissionLevel Level { get; set; }`
  Mức phân quyền được gán cho kết nối này (ví dụ: người dùng thường, quản trị viên).

* `public CipherSuiteType Algorithm { get; set; }`
  Phép biến đổi mật mã hiện đang dùng cho các khung được bảo mật.

* `public Bytes32 Secret { get; set; }`
  Khóa đối xứng dùng chung được thỏa thuận trong quá trình handshake của kết nối.

#### Sự kiện

* `public event EventHandler<IConnectionEventArgs> OnCloseEvent`
  Được kích hoạt khi kết nối bị ngắt hoặc bị đóng một cách tường minh.

* `public event EventHandler<IConnectionEventArgs> OnProcessEvent`
  Được kích hoạt khi một khung thông điệp hoàn chỉnh được đọc và cần định tuyến/xử lý.

* `public event EventHandler<IConnectionEventArgs> OnPostProcessEvent`
  Được kích hoạt sau khi xử lý hoàn tất (dùng để cập nhật thống kê hoặc sau khi gửi).

#### Phương thức công khai

* `public void Disconnect(string? reason = null)`
  Đóng kết nối WebSocket một cách an toàn và kích hoạt dọn dẹp.

* `public void IncrementErrorCount()`
  Tăng bộ đếm lỗi của kết nối. Nếu giá trị vượt ngưỡng tối đa, kết nối sẽ tự động bị hủy.

* `public void Dispose()`
  Giải phóng các stream bên dưới, các lock và trả các lớp ngữ cảnh tham số đã pool về pool.

## Chi tiết transport nội bộ

Về phía ứng dụng, giao tiếp WebSocket không có khung (frameless) vì bản thân giao thức WebSocket đã cung cấp ranh giới khung.

* **Không hỗ trợ thao tác đồng bộ**: Các phương thức đồng bộ `Send(IPacket)` và `Send(ReadOnlySpan<byte>)` ném `NotSupportedException`. Bạn phải dùng các phương thức bất đồng bộ tương ứng (`SendAsync`).
* **Buffer của receive loop**: Receive loop dùng một buffer được thuê có kích thước khớp với `FragmentOptions.MaxChunkSize`. Với các khung lớn hơn kích thước này, nó chuyển sang đường chậm (`HANDLE_LARGE_MESSAGE_ASYNC`), gom payload vào một mảng được thuê với giới hạn `NetworkWebSocketOptions.MaxMessageSize`, rồi mới kích hoạt `OnProcessEvent`.

## Xem thêm

* [Trình lắng nghe WebSocket](websocket-listener.md)
* [Registry kết nối](connection/connection-hub.md)
* [Timing Wheel](time/timing-wheel.md)
