---
title: Tùy chỉnh Middleware
description: Hướng dẫn này chỉ cách triển khai các quy tắc phân quyền tùy chỉnh để xác thực session token xuyên suốt pipeline inbound của Nalix.
section: Guides
---

Hướng dẫn này chỉ cách triển khai các quy tắc phân quyền tùy chỉnh để xác thực session token xuyên suốt pipeline inbound của Nalix.

## Tổng quan triển khai

Triển khai middleware tùy chỉnh là tạo một class cài đặt `IPacketMiddleware<TPacket>`. Với middleware bảo mật có mục đích chung, bạn thường nên nhắm tới `IPacket`, interface cơ sở cho mọi gói tin.

## Bước 1. Triển khai middleware gói tin để kiểm tra session

Middleware sau kiểm tra session token hợp lệ trong thuộc tính của kết nối và xác minh quyền dựa trên metadata của gói tin.

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;
using Nalix.Abstractions.Middleware;
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Sessions;
using Nalix.Abstractions.Primitives;
using Nalix.Framework.Injection;

[MiddlewareOrder(-60)]
[MiddlewareStage(MiddlewareStage.Inbound)]
public sealed class SessionAuthorizationMiddleware : IPacketMiddleware<IPacket>
{
    public async ValueTask InvokeAsync(
        IPacketContext<IPacket> context,
        Func<CancellationToken, ValueTask> next)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(next);

        // 1) Permission gate from packet metadata.
        if (context.Attributes.Permission is not null &&
            context.Connection.Level < context.Attributes.Permission.Level)
        {
            context.Connection.Disconnect("Permission denied.");
            return;
        }

        // 2) Session establishment gate: verify that the connection has successfully
        // completed its handshake or resumption.
        if (!context.Connection.GetRuntimeState().HandshakeEstablished)
        {
            context.Connection.Disconnect("Session not established.");
            return;
        }

        await next(context.CancellationToken).ConfigureAwait(false);
    }
}
```

## Bước 2. Đăng ký middleware trong host dispatch

Middleware được đăng ký theo kiểu fluent khi thiết lập máy chủ, bằng phương thức `ConfigureDispatchOptions`.

```csharp
using Nalix.Hosting;

using NetworkApplication app = NetworkApplication.CreateBuilder()
    .ConfigureDispatchOptions(options =>
    {
        _ = options.WithMiddleware(new SessionAuthorizationMiddleware());
    })
    .MapTcp<MyProtocol>().Bind()
    .Build();
```

## Bước 3. Thêm metadata gói tin cho handler

Từ giờ middleware sẽ tự động thực thi quyền dựa trên các attribute gắn trên method handler của bạn.

```csharp
[PacketController("SecureHandlers")]
public sealed class SecureHandlers
{
    [PacketOpcode(0x1201)]
    [PacketPermission(PermissionLevel.USER)]
    public ValueTask HandleAsync(IPacketContext<MyPacket> context)
    {
        // Business logic execution
        return ValueTask.CompletedTask;
    }
}
```

## Tóm tắt luồng xử lý

1. Frame inbound được giải mã/giải nén và tuần tự hóa thành `IPacketContext<IPacket>`.
2. `SessionAuthorizationMiddleware` chạy tại `[MiddlewareOrder(-60)]` trên `MiddlewareStage.Inbound`.
3. Nếu `Level` của kết nối thấp hơn `[PacketPermission]` hoặc `GetRuntimeState().HandshakeEstablished` là `false`, kết nối sẽ bị ngắt trước khi tới controller.
4. Ngược lại, `await next(context.CancellationToken)` gọi phần còn lại của pipeline và handler trong `[PacketController]`.

## Các trang liên quan

- [Middleware Pipeline](../../api/runtime/middleware/pipeline.md)
- [Packet Dispatch](../../api/runtime/routing/packet-dispatch.md)
