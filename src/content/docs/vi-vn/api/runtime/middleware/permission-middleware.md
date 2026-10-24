---
title: Permission Middleware
description: Tham chiếu cho Nalix.Runtime.Middleware.Standard.PermissionMiddleware — chốt cấp quyền inbound theo kiểu fail-closed, thực thi [PacketPermission].
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Middleware.Standard`  
**Assembly:** `Nalix.Runtime`

`PermissionMiddleware` (`[MiddlewareOrder(-50)] [MiddlewareStage(MiddlewareStage.Inbound)] public class PermissionMiddleware : IPacketMiddleware<IPacket>`) là chốt cấp quyền theo kiểu fail-closed tích hợp sẵn trong `Nalix.Runtime`. Nó chạy ở thứ tự `-50`, trước middleware giới hạn tốc độ và middleware thời gian chờ.

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Middleware/Standard/PermissionMiddleware.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketPermissionAttribute.cs`
- `src/Nalix.Abstractions/Security/PermissionLevel.cs`
- `src/Nalix.Runtime/Internal/RateLimiting/DirectiveGuard.cs`
- `src/Nalix.Codec/ProtocolFrames/Directive.cs`

## Quy tắc cấp quyền (`IsAuthorized`)

`PermissionMiddleware` áp dụng tư thế bảo mật **fail-closed** (`SEC-37`):

1. Nếu `context.Attributes.Permission` là `null` (method handler thiếu `[PacketPermission]`), yêu cầu bị **từ chối**.
2. Ngược lại, nó đánh giá `context.Attributes.Permission.Evaluation`:
   - **`PermissionEvaluation.MinimumLevel` (mặc định)**: Được phép khi `context.Connection.Level >= policy.Level`.
   - **`PermissionEvaluation.StrictMatch`**: Được phép khi `context.Connection.Level == policy.Level`.

:::important[Lưu ý về việc thực thi chính sách ở terminal handler]
Ngoài `PermissionMiddleware`, `PacketDispatchOptions<TPacket>.ExecuteTerminalHandler` cũng gọi `descriptor.CanExecute(context, out denyReason)` (kiểm tra `[PacketEncryption]` và `[PacketPermission]` khi attribute có mặt). Việc dùng `PermissionMiddleware` ở `Order = -50` bổ sung cơ chế thực thi **fail-closed** khi `[PacketPermission]` bị bỏ sót, và từ chối lưu lượng không được phép trước khi các middleware phía sau chạy.
:::

## Luồng thực thi

```mermaid
flowchart TD
    A["InvokeAsync(context, next)"] --> B{"context.Attributes.Permission is not null && IsAuthorized(...)?"}
    B -->|Yes| C["Forward to next(context.CancellationToken) (Zero-Alloc Sync Fast Path)"]
    B -->|No| D["context.Connection.IncrementErrorCount()"]
    D --> E{"DirectiveGuard.TryAcquire(InboundDirectiveUnauthorizedLastSentAtMs)?"}
    E -->|No (Suppressed)| F["Return without sending duplicate Directive"]
    E -->|Yes| G["Rent Directive via PacketFactory<Directive>.Acquire()"]
    G --> H["Initialize(FAIL, UNAUTHORIZED, NONE, seqId, NONE, 0, 0, arg2: OpCode)"]
    H --> I["await context.Sender.SendAsync(directive)"]
```

## Định dạng directive từ chối

Khi gói tin bị từ chối và `DirectiveGuard` cho phép gửi (dựa trên `RuntimeConnectionState.InboundDirectiveUnauthorizedLastSentAtMs` và `DirectiveGuardOptions.DefaultCooldownMs`), `PermissionMiddleware` lấy từ pool một `Directive` (`0x0008`, 21 byte) với:

| Trường | Giá trị |
| :--- | :--- |
| `Type` | `ControlType.FAIL` |
| `Reason` | `ProtocolReason.UNAUTHORIZED` |
| `Action` | `ProtocolAdvice.NONE` |
| `SequenceId` | `context.Packet.Header.SequenceId` |
| `Control` | `ControlFlags.NONE` |
| `Arg0` / `Arg1` | `0` |
| `Arg2` | `context.Packet.Header.OpCode` |

## Ví dụ sử dụng

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;
using Nalix.Runtime.Middleware.Standard;

// 1. Đăng ký PermissionMiddleware trong PacketDispatchOptions
builder.ConfigureDispatch(options =>
{
    options.WithMiddleware(new PermissionMiddleware());
});

// 2. Gắn [PacketPermission] cho các handler
[PacketHandler]
public sealed class AdminController
{
    [PacketOpcode(0x3001)]
    [PacketEncryption(true)]
    [PacketPermission(PermissionLevel.SYSTEM_ADMINISTRATOR, PermissionEvaluation.MinimumLevel)]
    public void ReloadConfig(IPacketContext<AdminReloadPacket> context)
    {
        // Chỉ các kết nối có Level >= SYSTEM_ADMINISTRATOR mới đến được đây
    }
}
```

## API liên quan

- [Middleware Pipeline](./pipeline.md)
- [Các mức quyền](../../security/permission-level.md)
- [Tùy chọn Directive Guard](../../options/network/directive-guard-options.md)
- [Khung tích hợp sẵn (Directive)](../../codec/packets/built-in-frames.md)
