---
title: Handler và Middleware
description: Handler là phương thức chạy logic ứng dụng của bạn cho một loại gói tin. Middleware chạy trước handler, nhờ vậy bạn có thể áp dụng cùng một chính sách (quyền, giới hạn tốc độ, ghi log...
section: Concepts
---

Handler là phương thức chạy logic ứng dụng của bạn cho một loại gói tin. Middleware chạy trước handler, nhờ vậy bạn có thể áp dụng cùng một chính sách (quyền, giới hạn tốc độ, ghi log) trên nhiều handler mà không phải lặp lại.

## Handler

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

`[PacketController("...")]` đánh dấu lớp (`[PacketHandler]` đã lỗi thời); `[PacketOpcode(0x7001)]` ánh xạ một phương thức tới một opcode. Đăng ký lớp một lần trên builder của máy chủ với `.MapHandlers(typeof(HelloHandlers))`.

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Server/HelloHandlers.cs`

## Middleware chạy trước

Middleware nằm giữa bước giải tuần tự hóa và handler của bạn. Hãy dùng nó cho những việc áp dụng trên nhiều handler thay vì chỉ một:

- Kiểm tra quyền
- Giới hạn tốc độ hoặc thời gian chờ
- Ghi log kiểm toán

```csharp
PacketDispatchChannel dispatch = new(options =>
{
    options.WithMiddleware(new PermissionMiddleware())
           .WithMiddleware(new RateLimitMiddleware())
           .WithHandler(() => new HelloHandlers());
});
```

Thứ tự middleware được quyết định bởi thuộc tính (`MiddlewareOrderAttribute`), không phải thứ tự đăng ký — nếu bạn cần một thứ tự cụ thể, hãy đặt nó một cách tường minh thay vì dựa vào thứ tự bạn đã đăng ký.

## Bước tiếp theo

- [Triển khai Packet Handler](../guides/application/packet-handlers.md) — hướng dẫn chi tiết với cả hai mẫu
- [Hướng dẫn sử dụng Middleware](../guides/application/middleware-usage.md) — khi nào và cách thêm middleware của riêng bạn
- Để xem thứ tự thực thi đầy đủ, cách phân giải metadata và các lỗi thường gặp: [Chi tiết Middleware Pipeline](./internals/middleware-pipeline.md) (Internals)
