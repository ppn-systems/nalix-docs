---
title: Packet Handlers
description: Packet handler là nơi chứa logic ứng dụng của bạn — mỗi opcode một method, được gọi tự động khi gói tin tương ứng đến.
section: Guides
---

Packet handler là nơi chứa logic ứng dụng của bạn — mỗi opcode một method, được gọi tự động khi gói tin tương ứng đến.

## Mẫu cơ bản: phản hồi trên cùng kết nối

```csharp
// samples/HelloWorld/HelloWorld.Server/HelloHandlers.cs
[PacketController("HelloWorld.Greetings")]
public static class HelloHandlers
{
    [PacketOpcode(0x7001)]
    public static async ValueTask HandleHelloAsync(IPacketContext<HelloRequestPacket> context)
    {
        using PacketScope<HelloResponsePacket> lease = PacketFactory<HelloResponsePacket>.Acquire();
        HelloResponsePacket response = lease.Value;
        response.Message = 1;

        await context.Sender.ReplyAsync(response).ConfigureAwait(false);
    }
}
```

`[PacketController("...")]` đánh dấu lớp (`[PacketHandler]` đã lỗi thời); `[PacketOpcode(0x7001)]` ánh xạ một method với một opcode. `IPacketContext<TPacket>` cung cấp gói tin đã giải tuần tự hóa và một `Sender` để phản hồi. Dùng `PacketFactory<T>.Acquire()` để lấy một instance có pool thay vì cấp phát mới — luôn bọc nó trong khối `using` để nó được trả về pool.

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Server/HelloHandlers.cs`

## Phát sóng thay vì phản hồi

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

Thay vì gọi `context.Sender.SendAsync(...)`, handler này lấy `IConnectionBroadcaster` và gửi gói tin đến mọi client đang kết nối.

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Server/ChatHandlers.cs`

## Đăng ký handler

Cả hai mẫu đều đăng ký lớp handler theo cùng một cách, trên server builder:

```csharp
NetworkApplication.CreateBuilder()
    .MapHandlers(typeof(HelloHandlers))
    // ...
    .Build();
```

## Bước tiếp theo

- [Máy chủ đầu tiên của bạn](../getting-started/your-first-server.md) — hướng dẫn đầy đủ HelloWorld
- [Xây dựng phòng chat](../build-a-chat-room.md) — hướng dẫn đầy đủ về phát sóng
- [Sử dụng Middleware](./middleware-usage.md) — chạy các kiểm tra chính sách trước khi handler của bạn chạy
