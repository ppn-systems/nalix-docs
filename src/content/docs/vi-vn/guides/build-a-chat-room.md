---
title: Xây dựng phòng chat
description: "Hướng dẫn này tiếp nối Máy chủ đầu tiên của bạn bằng cách thêm tính năng đẩy từ server sang client: server phát mọi tin nhắn đến tất cả client đang kết nối."
section: Guides
---

Hướng dẫn này tiếp nối [Máy chủ đầu tiên của bạn](./getting-started/your-first-server.md) bằng cách thêm tính năng đẩy từ server sang client: server phát mọi tin nhắn đến tất cả client đang kết nối.

Mã nguồn đầy đủ: `samples/ChatRoom`

## Bạn sẽ xây dựng gì

Một server nhận tin nhắn chat từ một client và phát lại cho tất cả client đang kết nối — kể cả khi nhiều client cùng gõ một lúc.

## Gói tin

Khác với gói tin cố định kích thước của HelloWorld, gói tin này mang chuỗi có độ dài thay đổi.

```csharp
// samples/ChatRoom/ChatRoom.Contracts/ChatMessagePacket.cs
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class ChatMessagePacket : PacketBase<ChatMessagePacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7101;

    [SerializeOrder(0)]
    public string Username { get; set; } = string.Empty;

    [SerializeOrder(1)]
    public string Message { get; set; } = string.Empty;

    public ChatMessagePacket() { }
}
```

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Contracts/ChatMessagePacket.cs`

## Handler phát sóng thay vì phản hồi

```csharp
// samples/ChatRoom/ChatRoom.Server/ChatHandlers.cs
[PacketController("ChatRoom.Chat")]
public static class ChatHandlers
{
    [PacketOpcode(0x7101)]
    public static async ValueTask HandleChatAsync(IPacketContext<ChatMessagePacket> context)
    {
        ArgumentNullException.ThrowIfNull(context);

        IConnectionBroadcaster? hub = InstanceManager.Instance
            .GetExistingInstance<IConnectionBroadcaster>();

        if (hub is null)
        {
            return;
        }

        await hub.BroadcastAsync(context.Packet).ConfigureAwait(false);
    }
}
```

`IConnectionBroadcaster` được hosting builder tự động đăng ký. `BroadcastAsync` tuần tự hóa gói tin một lần và gửi đến mọi client đang kết nối, áp dụng cài đặt nén và mã hóa riêng của từng kết nối.

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Server/ChatHandlers.cs`

:::note[Người gửi cũng nhận lại tin nhắn của chính mình]
`BroadcastAsync` gửi đến mọi client đang kết nối, bao gồm cả client đã gửi tin nhắn. Mẫu này không lọc người gửi ra — client có thể phân biệt tin nhắn của mình bằng cách kiểm tra trường `Username`. Việc lọc người gửi sẽ cần xây dựng danh sách kết nối loại trừ kết nối hiện tại, phần này vượt quá phạm vi của hướng dẫn này.
:::

## Cấu hình server giống với HelloWorld

Phần khởi tạo giống hệt [Bắt đầu nhanh §3](../quickstart.md#3-viết-máy-chủ) — chỉ cần thay `ChatHandlers` và cổng chat. Không cần thêm cấu hình riêng cho phát sóng trên builder; broadcaster được phân giải bên trong handler.

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Server/Program.cs`

## Client đăng ký nhận tin nhắn được đẩy

Khác với lời gọi request/response, client không hỏi về tin nhắn chat — nó đăng ký một lần và được gọi lại mỗi khi có tin nhắn đến.

```csharp
// samples/ChatRoom/ChatRoom.Client/Program.cs
TcpSession session = new(options);

IDisposable subscription = session.On<ChatMessagePacket>(packet =>
{
    Console.WriteLine($"{packet.Username}: {packet.Message}");
});

await session.ConnectAsync(Host, Port);

// later, to send a message:
ChatMessagePacket packet = new() { Username = username, Message = line.Trim() };
await session.SendAsync(packet, CancellationToken.None).ConfigureAwait(false);
```

Hãy đăng ký `On<TPacket>()` trước khi kết nối, để không bao giờ bỏ lỡ tin nhắn đến ngay sau khi kết nối mở. Khi xong, hãy dispose subscription và ngắt kết nối phiên.

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Client/Program.cs`

## Chạy thử

```bash
dotnet build samples/ChatRoom/ChatRoom.sln
```

Mở ba terminal.

Terminal 1 — khởi động server:

```bash
dotnet run --project samples/ChatRoom/ChatRoom.Server
```

Terminal 2 và 3 — khởi động hai client:

```bash
dotnet run --project samples/ChatRoom/ChatRoom.Client
```

Mỗi client sẽ yêu cầu bạn nhập tên người dùng.

## Kết quả mong đợi

Gõ một tin nhắn trong terminal của một client:

```text
hello everyone
```

Cả hai terminal client sẽ hiển thị:

```text
alice: hello everyone
```

Gõ `/exit` trong một client để ngắt kết nối nó. Nhấn Ctrl+C trong terminal server để dừng server.

## Bước tiếp theo

- [Bảo vệ máy chủ của bạn](./securing-your-server.md) — thêm mã hóa và hỗ trợ UDP/WebSocket cùng với TCP
- [Triển khai Packet Handlers](./application/packet-handlers.md) — thêm về cách viết logic handler
