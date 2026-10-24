---
title: Phiên kết nối Client
description: "Hướng dẫn này trình bày cách tạo, cấu hình và kết nối một phiên client bằng Nalix.SDK. Nó tập trung vào bề mặt SDK thực tế trong cây mã nguồn hiện tại: TransportOptions, TcpSession, UdpSession và các extension method của transport được xây dựng trên chúng..."
section: Guides
---

Hướng dẫn này trình bày cách tạo, cấu hình và kết nối một phiên client bằng `Nalix.SDK`. Nó tập trung vào bề mặt SDK thực tế trong cây mã nguồn hiện tại: `TransportOptions`, `TcpSession`, `UdpSession` và các extension method của transport được xây dựng trên chúng.

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
// Ensure your client references the shared contracts assembly so its [ModuleInitializer] runs.
// ConnectAsync() automatically calls PacketRegistry.Build() on first connect,
// or you can build it explicitly at startup:
PacketRegistry.Build();
```

## 2. Cấu hình Transport Options

`TransportOptions` quyết định các mẫu backoff khi kết nối lại, kích thước bộ đệm socket, khoảng keepalive và việc chọn cipher. Bạn có thể lấy các giá trị này trực tiếp từ `ConfigurationManager` hoặc tự khởi tạo.

```csharp
using Nalix.SDK.Options;
using Nalix.Environment.Configuration;

// OPTION A: Load automatically from the environment's configuration files (Recommended)
// This binds values from your INI definitions and natively supports hot-reloading.
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();

// OPTION B: Manual Initialization
TransportOptions manualOptions = new()
{
    // Connectivity
    Address = "127.0.0.1",
    Port = 57206,
    ConnectTimeoutMillis = 30000,
    
    // Auto-reconnect configuration (ReconnectSupervisor)
    AutoReconnectEnabled = true,
    ReconnectBaseDelayMillis = 500,
    ReconnectMaxDelayMillis = 30000,
    ReconnectMaxAttempts = 0, // 0 = infinite retries
    
    // Performance tuning
    NoDelay = true,           // Disable Nagle's algorithm (highly recommended for Games/Real-time)
    BufferSize = 65536,       // Socket send/receive buffer size (default 64 KB)
    MaxUdpDatagramSize = 1400 // UDP limit including 8-byte SessionToken and 4-byte XxHash32 MAC
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
    // The 'using' declaration ensures sockets and background loops are safely tracked
    using TcpSession session = new(options);

    // 1. Bind Lifecycle Events
    session.OnConnected += (_, _) => 
    {
        Console.WriteLine("TCP Connected successfully.");
    };

    session.OnDisconnected += (_, ex) => 
    {
        // ex contains underlying SocketExceptions or NetworkExceptions
        Console.WriteLine($"TCP Disconnected. Reason: {ex.Message}");
    };

    session.OnError += (_, ex) => 
    {
        Console.WriteLine($"TCP Error observed: {ex.Message}");
    };

    // 2. Bind Message Handlers (Strongly-Typed)
    // The framework will automatically read the byte stream, deserialize the packet,
    // and invoke your callback strictly when the matching type is observed.
    session.On<MyResponsePacket>(packet => 
    {
        Console.WriteLine($"Received strongly-typed data: {packet.StatusMessage}");
    });

    // 3. Connect, try resume, then fall back to handshake when needed
    // `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs` connects first,
    // attempts resume only when ResumeEnabled + SessionToken + Secret are present,
    // and reconnects before falling back to HandshakeAsync when configured to do so.
    Console.WriteLine("Connecting to server...");
    bool resumed = await session.ConnectWithResumeAsync();
    Console.WriteLine(resumed ? "Session resumed." : "Fresh handshake completed.");
    
    // At this point, `session.State` contains `EncryptionEnabled = true`,
    // `Secret` (32-byte key), and the 8-byte `SessionToken` assigned by the server.
    // ---------------------------------------------------------

    // 4. Ship Payloads
    // session.SendAsync(...) handles packing, compression, encryption, and dispatch over the wire.
    // await session.SendAsync(new MyCustomPacket());
    
    // Prevent context from tearing down
    await Task.Delay(-1); 
}
```

:::tip[Tùy chọn cho trường hợp hiệu năng đặc biệt]
Extension `On<T>` được thiết kế để tối đa hóa tốc độ phát triển. Nếu bạn cần kiểm soát ở mức thấp hơn, xem [Hướng dẫn Session APIs](../../concepts/internals/low-level-session-apis.md) để biết các luồng `OnMessageReceived` thô.
:::

:::note[Khuyến nghị về hiệu năng]
Mặc dù SDK phần lớn không phụ thuộc nền tảng, các socket option chuyên biệt như `TCP_NODELAY` được bật mặc định cho khối lượng công việc game.
:::

## 4. Tạo và kết nối một UDP Session (Kênh phụ)

:::note[TCP là chính, UDP là kênh phụ]
Trong kiến trúc Nalix, **TCP thường là kết nối có trạng thái chính**. `UdpSession` đóng vai trò kênh phụ cho dữ liệu tần suất cao, không đáng tin cậy. Trong luồng bảo mật phổ biến, UDP session chia sẻ `SessionState` (`SessionToken` và `Secret`) được thiết lập bởi handshake hoặc đường resume của TCP.
:::

`UdpSession` tuân theo cùng hợp đồng transport cơ sở, nhưng xử lý datagram thay vì các luồng TCP có khung. Truyền `tcpSession.State` vào constructor của `UdpSession` để cả hai session cùng dùng `SessionToken` và `Secret` 32 byte đã được thương lượng.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Transport;

async Task ConnectUdpStandardAsync(TcpSession tcpSession)
{
    // Pass `tcpSession.State` so UdpSession shares the negotiated SessionToken and Secret
    using UdpSession udp = new(options, tcpSession.State);

    udp.OnConnected += (_, _) => Console.WriteLine("UDP socket bound and active.");
    udp.OnDisconnected += (_, ex) => Console.WriteLine($"UDP Disconnected: {ex?.Message}");
    udp.OnError += (_, ex) => Console.WriteLine($"UDP Error: {ex.Message}");

    // Connect to setup targeted UDP Socket (binding against Server IP and Port)
    await udp.ConnectAsync();

    // UDP internally wraps outbound datagrams with the 8-byte SessionToken and 4-byte XxHash32 MAC.
    // await udp.SendAsync(new PlayerMovementPacket { X = 1, Y = 2, Z = 5 });
    
    await Task.Delay(-1);
}
```

:::danger[Ràng buộc kích thước datagram UDP]
Payload UDP cộng với lớp bọc 12 byte (tiền tố `SessionToken` `8`-byte + trailer MAC `XxHash32` `4`-byte) không được vượt quá `TransportOptions.MaxUdpDatagramSize` (mặc định `1400` byte). Dữ liệu lớn phải được đi qua giao thức TCP. Vi phạm MTU sẽ gây ra lỗi `NetworkException` cục bộ.
:::

:::note
`SessionState.Secret` dùng primitive `Bytes32` trong mã nguồn SDK hiện tại.
:::

## 5. Các extension chung của SDK

Để giúp bạn bắt đầu nhanh và xử lý các tác vụ mạng nâng cao một cách gọn gàng, dưới đây là một số extension có sẵn có thể gọi trực tiếp trên bất kỳ instance session nào:

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

// 1. Network Latency Check (Ping)
// Measures round-trip time (RTT) safely across the protocol
double rttMs = await session.PingAsync();
Console.WriteLine($"Current Latency: {rttMs}ms");

// 2. Time Synchronization
// Re-aligns the client's internal clock offsets against the core server's clock
var sync = await session.SyncTimeAsync();
Console.WriteLine($"RTT={sync.RttMs}ms Adjusted={sync.AdjustedMs}ms");

// 3. Request-Response Mechanics (RPC via Packets)
// Send a request packet and cleanly await a strongly-typed response 
var response = await session.RequestAsync<MyResponsePacket>(
    request: new MyRequestPacket { UserId = 123 },
    options: RequestOptions.Default.WithTimeout(3000), // timeout within 3s
    predicate: p => p.IsSuccess // Optional: Filter exactly which response to accept
);
```

## 6. Keep-Alive tự động (Heartbeat)

`TransportSession` có sẵn một vòng lặp keepalive chạy nền bất cứ khi nào `options.KeepAliveIntervalMillis > 0` (`KeepAliveTimeoutMillis = 5000`, `KeepAliveMissThreshold = 3`):

```csharp
TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57206,
    KeepAliveIntervalMillis = 15_000, // Probe every 15 seconds automatically
    KeepAliveTimeoutMillis = 5_000,   // Wait up to 5 seconds for PONG
    KeepAliveMissThreshold = 3        // Fault & trigger ReconnectSupervisor after 3 missed PONGs
};
```

Nếu bạn muốn tự chạy một vòng heartbeat ở tầng ứng dụng (với `KeepAliveIntervalMillis = 0`), bạn có thể gọi `session.PingAsync()` theo bộ hẹn giờ hoặc một task nền.

## 7. Dọn dẹp an toàn

Luôn thực thi việc gỡ bỏ kỹ lưỡng khi hủy vòng đời kết nối. Việc này thu gọn các cấu trúc vòng lặp bất đồng bộ một cách an toàn và giải phóng ngay các lease bộ nhớ.

```csharp
// Inform sockets to shut down and unmanaged handlers to cease executing
await session.DisconnectAsync();

// Reclaim buffers and class instances
session.Dispose();
```

## Đường dẫn thông tin liên quan

- [API nâng cao mức thấp](../../concepts/internals/low-level-session-apis.md)
- [Tổng quan SDK](../../api/sdk/index.md)
- [Hướng dẫn Transport Session](../../api/sdk/transport-session.md)
- [Hướng dẫn TCP Session](../../api/sdk/tcp-session.md)
- [Hướng dẫn UDP Session](../../api/sdk/udp-session.md)
- [Tài liệu Transport Options đầy đủ](../../api/options/sdk/transport-options.md)
