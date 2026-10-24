---
title: Tùy chỉnh Metadata Provider
description: Nalix phân giải metadata của handler (opcode, timeout, permission, encryption, rate limit, concurrency limit, transport preference) tại thời điểm biên dịch bằng source generator PacketHandlerGenerator...
section: Guides
---

:::danger[Ngừng hỗ trợ]
Mô hình mở rộng metadata provider lúc chạy (`IPacketMetadataProvider`,
`PacketMetadataBuilder`, `PacketMetadataProviders`) đã bị xóa. Metadata của handler
giờ được phân giải tại **thời điểm biên dịch** bởi source generator `PacketHandlerGenerator`.
Phần hướng dẫn bên dưới trình bày cách tiếp cận hiện tại.
:::

## Mô hình hiện tại: Metadata sinh từ source

Nalix phân giải metadata của handler (opcode, timeout, permission, encryption, rate limit,
concurrency limit, transport preference) tại thời điểm biên dịch bằng source generator `PacketHandlerGenerator`.
Generator đọc các attribute trên method handler của bạn và tạo trực tiếp một struct `PacketMetadata`
— không cần builder hay đăng ký provider lúc chạy.

### Cách hoạt động

1. Bạn gắn chú thích lên method handler bằng các attribute có sẵn (`[PacketOpcode]`,
   `[PacketPermission]`, `[PacketEncryption]`, v.v.).
2. `PacketHandlerGenerator` quét mọi class `[PacketController]` tại thời điểm biên dịch.
3. Với mỗi method handler, generator sinh ra mã khởi tạo một instance `PacketMetadata`
   từ các attribute đã khai báo.
4. Khi chạy, `PacketHandlerRegistry` đăng ký các handler được sinh ra mà không dùng reflection.

### Dùng attribute tùy chỉnh với middleware

Bạn vẫn có thể định nghĩa attribute tùy chỉnh và đọc chúng từ middleware qua
`PacketContext.Attributes.GetCustomAttribute<T>()`. Struct `PacketMetadata` lưu các
attribute tùy chỉnh trong dictionary `CustomAttributes` của nó.

```csharp
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class PacketTenantAttribute : Attribute
{
    public string Tenant { get; }

    public PacketTenantAttribute(string tenant) => Tenant = tenant;
}
```

Gắn attribute lên một method handler:

```csharp
[PacketController("SampleInvoiceHandlers")]
public sealed class SampleInvoiceHandlers
{
    [PacketOpcode(0x2201)]
    [PacketTenant("billing")]
    public ValueTask<string> GetInvoice(IPacketContext<InvoicePacket> request)
        => ValueTask.FromResult("invoice");
}
```

Đọc attribute tùy chỉnh trong middleware:

```csharp
[MiddlewareOrder(-10)]
[MiddlewareStage(MiddlewareStage.Inbound)]
public sealed class TenantGuardMiddleware<TPacket> : IPacketMiddleware<TPacket>
    where TPacket : IPacket
{
    public async ValueTask InvokeAsync(
        IPacketContext<TPacket> context,
        Func<CancellationToken, ValueTask> next)
    {
        PacketTenantAttribute? tenant =
            context.Attributes.GetCustomAttribute<PacketTenantAttribute>();

        if (tenant is null)
        {
            await next(context.CancellationToken);
            return;
        }

        // Replace with your own tenant resolution logic
        bool allowed = context.Connection.Level >= PermissionLevel.USER;

        if (!allowed)
        {
            using var lease = PacketFactory<Directive>.Acquire();
            lease.Value.Initialize(
                ControlType.FAIL,
                ProtocolReason.UNAUTHORIZED, ProtocolAdvice.REAUTHENTICATE,
                sequenceId: context.Packet.Header.SequenceId);
            await context.Sender.SendAsync(lease.Value);
            return;
        }

        await next(context.CancellationToken);
    }
}
```

## Mô hình tư duy

- **Thu thập tại thời điểm biên dịch**: `PacketHandlerGenerator` kiểm tra mọi attribute trên các method của `[PacketController]` và nhúng chúng vào `PacketMetadata.CustomAttributes` (`FrozenDictionary<Type, Attribute>`).
- **Tra cứu không dùng reflection**: Middleware đọc custom attribute với độ phức tạp $O(1)$ qua `context.Attributes.GetCustomAttribute<T>()`, không cần `MethodInfo.GetCustomAttributes()`.

## Các trang liên quan

- [Packet Metadata API](../../api/abstractions/packet-metadata.md)
- [Hướng dẫn Tùy chỉnh Middleware](./custom-middleware.md)
