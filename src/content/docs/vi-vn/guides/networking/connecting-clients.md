---
title: Phiên kết nối Client
description: "Hướng dẫn này trình bày cách tạo, cấu hình và kết nối một phiên client bằng Nalix.SDK. Nó tập trung vào bề mặt SDK thực tế trong cây mã nguồn hiện tại: TransportOptions, TcpSession, DatagramSession và các extension method của transport được xây dựng trên chúng..."
section: Guides
---

Hướng dẫn này trình bày cách tạo, cấu hình và kết nối một phiên client bằng `Nalix.SDK`. Nó tập trung vào bề mặt SDK thực tế trong cây mã nguồn hiện tại: `TransportOptions`, `TcpSession`, `DatagramSession` và các extension method của transport được xây dựng trên chúng.

Nếu bạn chưa làm, hãy bắt đầu với [Máy chủ đầu tiên](../getting-started/your-first-server.md) — trang đó đề cập đến đường `session.RequestAsync<T>()` đơn giản hơn mà hướng dẫn này xây dựng trên đó.

:::danger[Cảnh báo bảo mật]
Không bao giờ để lộ khóa `Secret` hoặc các snowflake `SessionToken` trong log văn bản rõ hoặc giao diện debug. Đây là vật liệu mật mã nhạy cảm.
:::

:::warning[Lỗi cấu hình thường gặp (lỗi Handshake)]
Nếu bạn định dùng `session.HandshakeAsync()`, **KHÔNG** tự đặt `session.State.EncryptionEnabled = true` hoặc gán sẵn `session.State.Secret` cố định! Giai đoạn handshake ban đầu chạy ở dạng văn bản rõ để thương lượng an toàn một khóa động bằng X25519. Nếu bạn bật mã hóa thủ công ngay từ đầu, SDK sẽ mã hóa gói `SessionInit`, máy chủ sẽ không giải mã được và kết nối sẽ bị ngắt ngay lập tức. `HandshakeAsync()` tự động và an toàn bật `session.State.EncryptionEnabled` và gán `session.State.Secret` cho bạn khi thành công.
:::

## 1. Danh mục gói tin dùng chung

Client và server **phải** tham chiếu cùng một project chứa các contract gói tin dùng chung. Khi `TransportSession.ConnectAsync()` chạy, nó tự động gọi `PacketRegistry.Build()` nếu chưa có `PacketRegistry` nào được đăng ký, sử dụng `[ModuleInitializer]` được sinh ra lúc biên dịch bởi `PacketRegistryGenerator`:

```csharp
// Đảm bảo client của bạn tham chiếu assembly hợp đồng dùng chung để [ModuleInitializer] của nó chạy.
// ConnectAsync() tự động gọi PacketRegistry.Build() ở lần kết nối đầu tiên,
// hoặc bạn có thể build tường minh khi khởi động:
PacketRegistry.Build();
```

## 2. Cấu hình Transport Options

`TransportOptions` quyết định các mẫu backoff khi kết nối lại, kích thước bộ đệm socket, khoảng keepalive và việc chọn cipher. Bạn có thể lấy các giá trị này trực tiếp từ `ConfigurationManager` hoặc tự khởi tạo.

```csharp
using Nalix.SDK.Options;
using Nalix.Environment.Configuration;

// CÁCH A: Tự động nạp từ các tệp cấu hình của môi trường (Khuyến nghị)
// Cách này gắn giá trị từ các định nghĩa INI của bạn và hỗ trợ sẵn hot-reload.
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();

// CÁCH B: Khởi tạo thủ công
TransportOptions manualOptions = new()
{
    // Connectivity
    Address = "127.0.0.1",
    Port = 57206,
    ConnectTimeoutMillis = 30000,
    
    // Cấu hình tự động kết nối lại (ReconnectSupervisor)
    AutoReconnectEnabled = true,
    ReconnectBaseDelayMillis = 500,
    ReconnectMaxDelayMillis = 30000,
    ReconnectMaxAttempts = 0, // 0 = thử lại vô hạn
    
    // Tinh chỉnh hiệu năng
    NoDelay = true,           // Tắt thuật toán Nagle (rất khuyến nghị cho game/thời gian thực)
    BufferSize = 65536        // Kích thước bộ đệm gửi/nhận của socket (mặc định 64 KB)
};
```

## 3. Tạo và kết nối một TCP Session

`TcpSession` dùng `TransportOptions` đã cấu hình để thiết lập các luồng TCP. Trên thực tế, bạn thường sẽ đăng ký các sự kiện trước khi gọi `ConnectAsync()` để không bỏ lỡ các tín hiệu kết nối hoặc lỗi xảy ra sớm.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;
using Nalix.Framework.Memory.Buffers;

async Task ConnectTcpStandardAsync()
{
    // Khai báo 'using' đảm bảo socket và các vòng lặp nền được theo dõi an toàn
    using TcpSession session = new(options);

    // 1. Gắn các sự kiện vòng đời
    session.OnConnected += (_, _) => 
    {
        Console.WriteLine("TCP Connected successfully.");
    };

    session.OnDisconnected += (_, ex) => 
    {
        // ex chứa các SocketException hoặc NetworkException bên dưới
        Console.WriteLine($"TCP Disconnected. Reason: {ex.Message}");
    };

    session.OnError += (_, ex) => 
    {
        Console.WriteLine($"TCP Error observed: {ex.Message}");
    };

    // 2. Gắn các handler thông điệp (kiểu mạnh)
    // Framework sẽ tự động đọc luồng byte, giải tuần tự hóa gói tin,
    // và chỉ gọi callback của bạn khi gặp đúng kiểu tương ứng.
    session.On<MyResponsePacket>(packet => 
    {
        Console.WriteLine($"Received strongly-typed data: {packet.StatusMessage}");
    });

    // 3. Kết nối, thử resume, rồi quay về handshake khi cần
    // `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs` kết nối trước,
    // chỉ thử resume khi có đủ ResumeEnabled + SessionToken + Secret,
    // và kết nối lại trước khi quay về HandshakeAsync khi được cấu hình như vậy.
    Console.WriteLine("Connecting to server...");
    bool resumed = await session.ConnectWithResumeAsync();
    Console.WriteLine(resumed ? "Session resumed." : "Fresh handshake completed.");
    
    // Đến đây, `session.State` chứa `EncryptionEnabled = true`,
    // `Secret` (khóa 32 byte) và `SessionToken` 8 byte do máy chủ cấp.
    // ---------------------------------------------------------

    // 4. Gửi payload
    // session.SendAsync(...) lo việc đóng gói, nén, mã hóa và gửi qua đường truyền.
    // await session.SendAsync(new MyCustomPacket());
    
    // Giữ cho ngữ cảnh không bị hủy
    await Task.Delay(-1); 
}
```

:::tip[Tùy chọn cho trường hợp hiệu năng đặc biệt]
Extension `On<T>` được thiết kế để tối đa hóa tốc độ phát triển. Nếu bạn cần kiểm soát ở mức thấp hơn, xem [Hướng dẫn Session APIs](../../concepts/internals/low-level-session-apis.md) để biết các luồng `OnMessageReceived` thô.
:::

:::note[Khuyến nghị về hiệu năng]
Mặc dù SDK phần lớn không phụ thuộc nền tảng, các socket option chuyên biệt như `TCP_NODELAY` được bật mặc định cho khối lượng công việc game.
:::

## 4. Tạo và kết nối một Datagram (UDP) Session (Kênh phụ)

:::note[TCP là chính, UDP là kênh phụ]
Trong kiến trúc Nalix, **TCP (hoặc WebSocket) thường là kết nối có trạng thái chính**. `DatagramSession` đóng vai trò kênh phụ cho dữ liệu tần suất cao (NDP qua UDP). Nó được tạo từ một stream session đã thiết lập và hoàn tất handshake, rồi tự dẫn xuất khóa riêng từ secret của session đó.
:::

`DatagramSession` nhận stream session trong constructor. `ConnectAsync()` yêu cầu một ticket qua stream session đó, mở socket UDP và chờ đến khi máy chủ xác thực datagram đầu tiên; host mặc định là địa chỉ của stream session và cổng lấy từ ticket.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.Abstractions.Networking.Datagrams;
using Nalix.SDK.Transport;

async Task ConnectDatagramAsync(TcpSession tcpSession)
{
    // Phiên TCP phải hoàn tất HandshakeAsync() trước.
    using DatagramSession udp = new(tcpSession);

    udp.OnConnected += (_, _) => Console.WriteLine("Datagram session established.");
    udp.OnDisconnected += (_, ex) => Console.WriteLine($"Datagram Disconnected: {ex?.Message}");
    udp.OnError += (_, ex) => Console.WriteLine($"Datagram Error: {ex.Message}");

    await udp.ConnectAsync();

    // Mỗi datagram được chính phiên niêm phong bằng ChaCha20-Poly1305.
    // await udp.SendAsync(new PlayerMovementPacket { X = 1, Y = 2, Z = 5 });
    // await udp.SendAsync(packet, DeliveryMethod.ReliableOrdered, channel: 0);

    await Task.Delay(-1);
}
```

:::danger[Kích thước datagram]
Một datagram dài tối đa `DatagramEngine.MaxDatagramSize` (`1472` byte). Thông điệp lớn hơn được engine phân mảnh, tối đa đến `MaxMessageSize` của ticket (mặc định của máy chủ là `1048576`). Ticket bị từ chối hoặc session không được thiết lập trước khi ticket hết hạn sẽ gây ra `NetworkException`.
:::

:::note
`SessionState.Secret` dùng primitive `Bytes32` trong mã nguồn SDK hiện tại.
:::

## 5. Các extension chung của SDK

Để giúp bạn bắt đầu nhanh và xử lý các tác vụ mạng nâng cao một cách gọn gàng, dưới đây là một số extension có sẵn có thể gọi trực tiếp trên bất kỳ instance session nào:

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

// 1. Kiểm tra độ trễ mạng (Ping)
// Đo thời gian khứ hồi (RTT) một cách an toàn qua giao thức
double rttMs = await session.PingAsync();
Console.WriteLine($"Current Latency: {rttMs}ms");

// 2. Đồng bộ thời gian
// Căn chỉnh lại độ lệch đồng hồ nội bộ của client theo đồng hồ của máy chủ lõi
var sync = await session.SyncTimeAsync();
Console.WriteLine($"RTT={sync.RttMs}ms Adjusted={sync.AdjustedMs}ms");

// 3. Cơ chế yêu cầu-phản hồi (RPC qua gói tin)
// Gửi gói tin yêu cầu và chờ phản hồi kiểu mạnh một cách gọn gàng 
var response = await session.RequestAsync<MyResponsePacket>(
    request: new MyRequestPacket { UserId = 123 },
    options: RequestOptions.Default.WithTimeout(3000), // thời gian chờ 3 giây
    predicate: p => p.IsSuccess // Tùy chọn: lọc chính xác phản hồi nào được chấp nhận
);
```

## 6. Keep-Alive tự động (Heartbeat)

`TransportSession` có sẵn một vòng lặp keepalive chạy nền bất cứ khi nào `options.KeepAliveIntervalMillis > 0` (`KeepAliveTimeoutMillis = 5000`, `KeepAliveMissThreshold = 3`):

```csharp
TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57206,
    KeepAliveIntervalMillis = 15_000, // Tự động thăm dò mỗi 15 giây
    KeepAliveTimeoutMillis = 5_000,   // Chờ tối đa 5 giây để nhận PONG
    KeepAliveMissThreshold = 3        // Báo lỗi và kích hoạt ReconnectSupervisor sau 3 lần lỡ PONG
};
```

Nếu bạn muốn tự chạy một vòng heartbeat ở tầng ứng dụng (với `KeepAliveIntervalMillis = 0`), bạn có thể gọi `session.PingAsync()` theo bộ hẹn giờ hoặc một task nền.

## 7. Dọn dẹp an toàn

Luôn thực thi việc gỡ bỏ kỹ lưỡng khi hủy vòng đời kết nối. Việc này thu gọn các cấu trúc vòng lặp bất đồng bộ một cách an toàn và giải phóng ngay các lease bộ nhớ.

```csharp
// Báo cho socket tắt và các handler không được quản lý dừng thực thi
await session.DisconnectAsync();

// Thu hồi bộ đệm và các đối tượng lớp
session.Dispose();
```

## Đường dẫn thông tin liên quan

- [API nâng cao mức thấp](../../concepts/internals/low-level-session-apis.md)
- [Tổng quan SDK](../../api/sdk/index.md)
- [Hướng dẫn Transport Session](../../api/sdk/transport-session.md)
- [Hướng dẫn TCP Session](../../api/sdk/tcp-session.md)
- [Hướng dẫn UDP Session](../../api/sdk/datagram-session.md)
- [Tài liệu Transport Options đầy đủ](../../api/options/sdk/transport-options.md)
