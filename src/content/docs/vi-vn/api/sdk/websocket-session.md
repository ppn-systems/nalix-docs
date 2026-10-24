---
title: WebSocket Session
description: "Tham chiếu cho Nalix.SDK.Transport.WebSocketSession — transport WebSocket nhị phân phía client hỗ trợ ws:// và wss://, thương lượng subprotocol và tương thích Blazor WASM."
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport`  
**Assembly:** `Nalix.SDK`

`WebSocketSession` (`public class WebSocketSession : TransportSession`) là transport WebSocket nhị phân phía client trong `Nalix.SDK`, được xây dựng trên `ClientWebSocket`, `WsFrameSender` và `WsFrameReader`. Khác với `TcpSession` và `UdpSession`, `WebSocketSession` được hỗ trợ trên các target trình duyệt/Blazor WASM (`SendAsync`) cũng như các runtime desktop/di động.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameSender.cs`
- `src/Nalix.SDK/Options/WebSocketTransportOptions.cs`

## Tham chiếu API công khai

```csharp
namespace Nalix.SDK.Transport;

public class WebSocketSession : TransportSession
{
    public WebSocketSession(
        TransportOptions options,
        WebSocketTransportOptions? webSocketOptions = null,
        SessionState? state = null);

    public override TransportOptions Options { get; }
    public WebSocketTransportOptions WebSocketOptions { get; }
    public override bool IsConnected { get; }

    public override event EventHandler? OnConnected;
    public override event EventHandler<Exception>? OnDisconnected;
    public override event EventHandler<IBufferLease>? OnMessageReceived;
    public override event EventHandler<Exception>? OnError;
    public event Func<ReadOnlyMemory<byte>, Task>? OnMessageAsync;

    public override Task ConnectAsync(string? host = null, ushort? port = null, CancellationToken ct = default);
    public override Task DisconnectAsync();

    [UnsupportedOSPlatform("browser")]
    public void Send(ReadOnlySpan<byte> data, bool encrypt = true);

    public override Task SendAsync(IPacket packet, CancellationToken ct = default);
    public override Task SendAsync(IPacket packet, bool? encrypt = null, CancellationToken ct = default);
    public override Task SendAsync(ReadOnlyMemory<byte> payload, bool? encrypt = null, CancellationToken ct = default);
    public override void ResetSequenceCounters();
}
```

### Chi tiết chính

- **Xây dựng URI và Subprotocol**: `ConnectAsync` tạo `ws://{host}:{port}{path}` (hoặc `wss://` khi `WebSocketOptions.UseTls == true`), chuẩn hóa `WebSocketOptions.Path` (mặc định `"/ws/"`), và đăng ký `WebSocketOptions.SubProtocol` (mặc định `"nalix.v1"`).
- **Vòng nhận an toàn cho WASM**: `ConnectAsync` khởi động `_reader.ReceiveLoopAsync` trực tiếp như một async task thay vì `TaskCreationOptions.LongRunning`, tránh deadlock thread pool trên runtime Blazor WebAssembly một luồng.
- **Tương thích đầy đủ với handshake và tiện ích mở rộng**: Vì `WebSocketSession` triển khai `ITransportSession`, mọi tiện ích SDK (`HandshakeAsync`, `ResumeSessionAsync`, `RequestAsync`, `TryRequestAsync`, `StreamAsync`, `CreateRpcClient<T>`) hoạt động y hệt trên WebSocket.

## Ví dụ sử dụng

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;

TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57207,
    ConnectTimeoutMillis = 5_000
};

WebSocketTransportOptions wsOptions = new()
{
    Path = "/ws/",
    SubProtocol = "nalix.v1",
    UseTls = false
};

using WebSocketSession session = new(options, wsOptions);

session.OnConnected += (_, _) => Console.WriteLine("WebSocket connected.");
session.OnDisconnected += (_, ex) => Console.WriteLine($"Disconnected: {ex.Message}");

await session.ConnectAsync();
await session.HandshakeAsync();

ChatResponse reply = await session.RequestAsync<ChatResponse>(
    new ChatRequest { Text = "Hello over WebSocket!" },
    RequestOptions.Default.WithEncrypt());

await session.DisconnectAsync();
```

## API liên quan

- [Transport Session](./transport-session.md)
- [WebSocket Transport Options](../options/sdk/websocket-transport-options.md)
- [WebSocket Hosting Binding (Server)](../hosting/websocket-binding.md)
- [TCP Session](./tcp-session.md)
