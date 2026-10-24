---
title: Bảo mật máy chủ
description: Nalix mã hóa kết nối thông qua bắt tay (handshake), không phải qua cấu hình bạn viết tay — bật bằng một lời gọi và framework sẽ thương lượng một khóa dùng chung cho mỗi kết nối....
section: Guides
---

Nalix mã hóa kết nối thông qua bắt tay (handshake), không phải qua cấu hình bạn viết tay — bật bằng một lời gọi và framework sẽ thương lượng một khóa dùng chung cho mỗi kết nối. Hướng dẫn này cho bạn biết cách bật mã hóa và chạy đồng thời các listener TCP, UDP và WebSocket.

Mã nguồn đầy đủ: `samples/SecureMultiTransportHelloWorld`

## Bạn sẽ xây dựng gì

Một máy chủ yêu cầu bắt tay an toàn trước khi xử lý bất kỳ yêu cầu nào, đồng thời lắng nghe trên TCP, UDP và WebSocket.

## Bật kết nối bảo mật

```csharp
// samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server/Program.cs
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseLogger(logger)
    .UseSecureConnections()
    .UseSystemControl()
    .MapHandlers(typeof(HelloHandlers))
    .MapTcp<DefaultProtocol>().OnPort(TcpPort).Bind()
    .MapUdp<DefaultProtocol>().OnPort(UdpPort).Bind()
    .MapWebSocket<DefaultProtocol>().OnPort(WebSocketPort).WithPath("/ws").Bind()
    .Build();

await app.RunAsync(cts.Token);
```

`UseSecureConnections()` thiết lập các handler bắt tay và tự động tạo chứng chỉ trong lần chạy máy chủ đầu tiên, nếu chưa có chứng chỉ nào. Mọi yêu cầu đều bị từ chối cho đến khi client hoàn thành bắt tay.

`UseSecureConnections()` cũng tự động bật `UseSystemControl()` cho bạn (gọi cả hai cũng không sao): bước bắt tay đầu tiên của client — `PUBLIC_KEY_REQUEST` kiểu TOFU được trả lời bằng `SessionTofu` — do các handler system control phục vụ. Trước khi việc này được tự động hóa, nếu quên `UseSystemControl()` thì các client không ghim khóa sẽ bị timeout khi chờ `SessionTofu`.

Mã nguồn đầy đủ: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server/Program.cs`

:::note[TCP và UDP dùng chung một cổng]
TCP và UDP lắng nghe trên cùng một cổng vì máy chủ kiểm tra địa chỉ nguồn của gói UDP có khớp với một client TCP đã kết nối hay không. Dùng các cổng khác nhau cho mỗi bên cũng không gây lỗi, nhưng dùng chung một cổng là cấu hình đã được kiểm thử và được khuyến nghị.
:::

## Client bắt tay qua TCP trước

```csharp
// samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs
SessionState sharedState = new();

using TcpSession tcpSession = new(tcpOptions, sharedState);
await tcpSession.ConnectAsync(Host, TcpPort);

await tcpSession.HandshakeAsync();
Console.WriteLine($"SessionToken : {sharedState.SessionToken}");
Console.WriteLine($"Encryption   : {sharedState.EncryptionEnabled}");

HelloRequestPacket tcpRequest = new();
HelloResponsePacket tcpResponse = await tcpSession.RequestAsync<HelloResponsePacket>(
    tcpRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

`HandshakeAsync()` thương lượng một bí mật dùng chung và cấp một token phiên. `SessionState` giữ token và bí mật đó để bạn có thể tái sử dụng chúng trên transport thứ hai.

Mã nguồn đầy đủ: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## UDP tái sử dụng danh tính phiên TCP

```csharp
using UdpSession udpSession = new(udpOptions, sharedState);
await udpSession.ConnectAsync(Host, UdpPort);

HelloRequestPacket udpRequest = new();
HelloResponsePacket udpResponse = await udpSession.RequestAsync<HelloResponsePacket>(
    udpRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

Bạn phải hoàn thành bắt tay TCP trước khi gửi bất cứ thứ gì qua UDP. Gói UDP được xác thực bằng token phiên và một mã xác thực thông điệp (MAC) được suy ra từ bí mật dùng chung đã thương lượng trong bắt tay TCP — nếu không có bắt tay đó, máy chủ không có cách nào xác minh gói UDP đến từ phiên của bạn.

Mã nguồn đầy đủ: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## WebSocket độc lập

```csharp
using WebSocketSession wsSession = new(wsOptions, wsTransportOptions);
await wsSession.ConnectAsync(Host, WebSocketPort);

HelloRequestPacket wsRequest = new();
HelloResponsePacket wsResponse = await wsSession.RequestAsync<HelloResponsePacket>(
    wsRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

WebSocket mở kết nối riêng và không dùng chung token hoặc bí mật của phiên TCP.

Mã nguồn đầy đủ: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## Giới hạn ai được gọi handler

Khai báo các quy tắc về quyền, timeout và giới hạn tốc độ trực tiếp trên method handler:

```csharp
[PacketOpcode(0x2001)]
[PacketPermission(PermissionLevel.USER)]
[PacketTimeout(5000)]
[PacketRateLimit(requestsPerSecond: 10)]
public ValueTask<AccountResponse> GetProfile(IPacketContext<ProfileRequest> context)
{
    // Chỉ chạy khi các kiểm tra quyền, timeout và giới hạn tốc độ đều đạt
}
```

Các quy tắc này được thực thi bởi middleware tích hợp trước khi thân handler của bạn chạy — xem [Handler và Middleware](../concepts/handlers-and-middleware.md).

## Bắt buộc mã hóa trên handler nhạy cảm

Mã hóa là tùy chọn theo từng handler. Sau bắt tay, máy chủ vẫn chấp nhận các frame đến ở dạng **không mã hóa** và chuyển chúng cho bất kỳ handler nào không mang `[PacketEncryption(true)]`. Các frame dạng plaintext này cũng không có số thứ tự, nên kiểm tra chống phát lại không áp dụng cho chúng.

Hãy đánh dấu mọi handler làm thay đổi trạng thái hoặc trả về dữ liệu riêng tư:

```csharp
[PacketOpcode(0x2002)]
[PacketEncryption(true)]
[PacketPermission(PermissionLevel.USER)]
public ValueTask<TransferResponse> Transfer(IPacketContext<TransferRequest> context)
{
    // Bị từ chối với FORBIDDEN trừ khi frame đến trên đường truyền ở dạng đã mã hóa
}
```

Điều này quan trọng hay không phụ thuộc vào thứ nằm trước máy chủ:

| Triển khai | Frame plaintext bị kẻ khác chèn vào trên đường truyền |
| :--- | :--- |
| WebSocket hoặc TCP phía sau TLS (`wss://`, một proxy kết thúc TLS) | Không thể: TLS xác thực toàn bộ luồng byte |
| TCP thô không có TLS (như trong các mẫu) | Có thể với các handler không có `[PacketEncryption(true)]` |
| UDP | Có thể: TLS không bao giờ bảo vệ UDP, nên hãy đánh dấu cả các handler UDP |

Các datagram UDP plaintext chỉ được kiểm tra chống phát lại dựa trên `SequenceId` 16 bit trong header, nên một datagram plaintext bị bắt có thể được chấp nhận lại khi bộ đếm này quay vòng (khoảng 65.536 gói sau đó). Datagram đã mã hóa cũng mang số thứ tự 32 bit có xác thực và không bị ảnh hưởng. Hãy đánh dấu các handler UDP bằng `[PacketEncryption(true)]`, hoặc đảm bảo chúng vẫn an toàn khi chạy hai lần với cùng một đầu vào.

Nếu bạn không kết thúc TLS trước Nalix, hãy coi `[PacketEncryption(true)]` là bắt buộc với mọi thứ nhạy cảm. Xem [Reverse Proxy và TLS](./deployment/reverse-proxy-tls.md).

## Chạy thử

```bash
dotnet build samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.sln
```

Terminal 1 — khởi động máy chủ:

```bash
dotnet run --project samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server
```

Terminal 2 — chạy client:

```bash
dotnet run --project samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client
```

## Kết quả mong đợi

```text
Connected over TCP.
TCP handshake completed. Secure state is ready.
  SessionToken : 822530074371686401
  Encryption   : True
TCP replied: Hello from Nalix!

Sending UDP hello...
UDP replied: Hello from Nalix!
TCP connection is still alive: True

Connecting WebSocket...
WebSocket replied: Hello from Nalix!
```

:::note[Bộ lắng nghe WebSocket trên TCP thô]
`WebSocketListenerBase` kế thừa trực tiếp từ `TcpListenerBase` và thực hiện bắt tay HTTP/1.1 Upgrade theo RFC 6455 trên socket TCP thô (`SocketUpgradeHelper`), nên nó **không** dùng `HttpListener` và không cần quyền quản trị trên Windows hoặc Linux.
:::

## Bước tiếp theo

- [Handler và Middleware](../concepts/handlers-and-middleware.md) — cách các attribute về quyền và giới hạn tốc độ được thực thi
- [Danh sách kiểm tra trước khi triển khai](./deployment/production-checklist.md) — trước khi đưa lên production
- Về giao thức bắt tay, mô hình mã hóa và chi tiết tiếp tục phiên: [Kiến trúc bảo mật](../concepts/internals/security-architecture.md) (Nội bộ)
