---
title: Mức quyền
description: PermissionLevel định nghĩa các mức thẩm quyền thô được dùng xuyên suốt hệ sinh thái Nalix để kiểm soát truy cập.
section: API Reference
package: Nalix.Codec / Nalix.Network
---

`PermissionLevel` định nghĩa các mức thẩm quyền thô được dùng xuyên suốt hệ sinh thái Nalix để kiểm soát truy cập.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Security/PermissionLevel.cs`

## Định nghĩa enum

| Giá trị | Tên | Mô tả |
| --- | --- | --- |
| `0` | `NONE` | Chưa được gán thẩm quyền nào. |
| `10` | `POW_VERIFIED` | Kết nối đã vượt qua thử thách Proof-of-Work nhưng chưa hoàn tất handshake. |
| `20` | `ESTABLISHED` | Phiên bảo mật đã được thiết lập. |
| `25` | `GUEST` | Quyền truy cập tối thiểu cho người dùng ẩn danh hoặc khách. |
| `50` | `READ_ONLY` | Quyền chỉ đọc. |
| `100` | `USER` | Người dùng chuẩn đã xác thực. |
| `175` | `SUPERVISOR` | Đặc quyền nâng cao trong phạm vi giới hạn. |
| `200` | `TENANT_ADMINISTRATOR` | Quyền quản trị một tenant hoặc tổ chức. |
| `225` | `SYSTEM_ADMINISTRATOR` | Quyền quản trị toàn hệ thống. |
| `255` | `OWNER` | Thẩm quyền cao nhất, kiểm soát không giới hạn. |

## Cách dùng trong thuộc tính

Thuộc tính `[PacketPermission]` dùng các mức này để thực thi bảo mật sớm trong pipeline.

```csharp
[PacketOpcode(0x1001)]
[PacketPermission(PermissionLevel.SYSTEM_ADMINISTRATOR)]
public void ResetServer(IPacketContext<Control> context)
{
    // Chỉ người dùng có Level >= SYSTEM_ADMINISTRATOR mới đến được đây
}
```

## API liên quan

- [Packet Attributes](../abstractions/packet-attributes.md)
- [Permission Middleware](../runtime/middleware/permission-middleware.md)
- [Connection Contracts](../abstractions/connection-contracts.md)
