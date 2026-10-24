---
title: Thuộc tính gói tin
description: Thuộc tính khai báo định tuyến và chính sách trong Nalix.Abstractions.Networking.Packets và Nalix.Abstractions.Networking.Rpc, dùng trên controller, handler và packet yêu cầu.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Networking.Packets` (và `Nalix.Abstractions.Networking.Rpc`)  
**Assembly:** `Nalix.Abstractions`

Nalix dùng attribute để khai báo việc phát hiện controller, định tuyến opcode, ràng buộc transport, mức quyền, yêu cầu mã hóa, giới hạn tốc độ và timeout thực thi. Các attribute này được `PacketHandlerGenerator` biên dịch thành struct `PacketMetadata` không cấp phát bộ nhớ lúc build.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Packets/PacketHandlerAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketOpcodeAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketPermissionAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketRateLimitAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketEncryptionAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketTimeoutAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketTransportAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketIdempotentAttribute.cs`
- `src/Nalix.Abstractions/Networking/Rpc/RpcServiceAttribute.cs`

## Tham chiếu attribute

| Attribute | Phạm vi | Hàm dựng & thuộc tính | Mục đích |
| --- | --- | --- | --- |
| `[PacketHandler]` | Lớp | `PacketHandlerAttribute(string name = "None", bool isActive = true, string version = "1.0")`<br/>Thuộc tính: `Name`, `IsActive`, `Version` | Đánh dấu một lớp là controller gói tin được biên dịch bởi `PacketHandlerGenerator`. |
| `[PacketOpcode]` | Phương thức | `PacketOpcodeAttribute(ushort opCode)`<br/>`PacketOpcodeAttribute(object opcode)` (giá trị enum)<br/>Thuộc tính: `ushort OpCode { get; }` | Gắn một method handler với opcode gói tin 16-bit (`>= 0x0100` cho gói ứng dụng; `0x0000..0x00FF` dành riêng cho protocol hệ thống). |
| `[PacketPermission]` | Phương thức | `PacketPermissionAttribute(PermissionLevel level = PermissionLevel.USER)`<br/>`PacketPermissionAttribute(PermissionLevel level, PermissionEvaluation evaluation)`<br/>Thuộc tính: `PermissionLevel Level`, `PermissionEvaluation Evaluation` | Khai báo `connection.Level` yêu cầu (`MinimumLevel` mặc định, hoặc `StrictMatch`), được `PermissionMiddleware` thi hành. |
| `[PacketEncryption]` | Phương thức | `PacketEncryptionAttribute(bool isEncrypted = true, CipherSuiteType algorithmType = CipherSuiteType.Chacha20Poly1305)`<br/>Thuộc tính: `bool IsEncrypted`, `CipherSuiteType AlgorithmType` | Yêu cầu `context.EncryptedOnWire == true` (được `PacketEncryptionMiddleware` thi hành) và mã hóa các phản hồi gửi qua `context.Sender`. |
| `[PacketRateLimit]` | Phương thức | `PacketRateLimitAttribute(int requestsPerSecond, double burst = 1.0)`<br/>Thuộc tính: `int RequestsPerSecond`, `double Burst`<br/>Thuộc tính khởi tạo: `string? PolicyId`, `int HardLockoutSeconds = -1`, `int MaxSoftViolations = -1` | Gắn giới hạn token-bucket cho handler, được `RateLimitMiddleware` thi hành. |
| `[PacketTimeout]` | Phương thức | `PacketTimeoutAttribute(int timeoutMilliseconds)`<br/>Thuộc tính: `int TimeoutMilliseconds { get; }` | Đặt ngân sách timeout cho `CancellationToken` liên kết, tính bằng mili giây, được `TimeoutMiddleware` thi hành. |
| `[PacketTransport]` | Phương thức | `PacketTransportAttribute(NetworkTransport transport)`<br/>Thuộc tính: `NetworkTransport TransportType { get; }` | Giới hạn handler vào `NetworkTransport.TCP`, `UDP` hoặc `WEBSOCKET` (được `TransportMiddleware` thi hành) và định tuyến phản hồi của `context.Sender` qua transport đó. |
| `[PacketIdempotent]` | Lớp | `PacketIdempotentAttribute()` | Chỉ là metadata mang tính tài liệu, đánh dấu lớp gói tin là idempotent (an toàn cho chính sách retry phía client). |
| `[ReservedOpcodePermitted]` | Lớp, Phương thức | `ReservedOpcodePermittedAttribute()` (`Nalix.Abstractions`; không kế thừa, chỉ dùng một lần) | Đánh dấu một kiểu hoặc method được phép dùng opcode dành riêng (`0x0000..0x00FF`), vốn thường bị chặn ở mức ứng dụng. |
| `[RpcService]` | Interface | `RpcServiceAttribute()` | Đánh dấu một interface để `RpcClientGenerator` sinh extension client có kiểu lúc biên dịch. |

:::important[Khai báo và thi hành qua middleware]
Attribute điền vào `context.Attributes` (`PacketMetadata`). Khi bạn đăng ký handler qua `NetworkApplicationBuilder.MapHandlers<T>()` (hoặc `PacketDispatchOptions.WithHandler<T>()`), `PacketDispatchOptions` tự động nối `TransportMiddleware`, `PacketEncryptionMiddleware`, `PermissionMiddleware`, `RateLimitMiddleware` và `TimeoutMiddleware` khi bất kỳ handler đã đăng ký nào khai báo attribute tương ứng.
:::

## Ví dụ thực tế

```csharp
using System.Threading.Tasks;
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;

[PacketHandler("SecureChat", version: "1.2")]
public sealed class SecureChatController
{
    [PacketOpcode(0x3001)]
    [PacketPermission(PermissionLevel.USER, PermissionEvaluation.MinimumLevel)]
    [PacketRateLimit(requestsPerSecond: 10, burst: 3, PolicyId = "chat-send", HardLockoutSeconds = 30, MaxSoftViolations = 5)]
    [PacketEncryption(true, CipherSuiteType.Chacha20Poly1305)]
    [PacketTimeout(5000)]
    [PacketTransport(NetworkTransport.TCP)]
    public ValueTask HandleChatMessageAsync(IPacketContext<ChatMessagePacket> context)
    {
        return context.Sender.ReplyAsync(new ChatAckPacket { MessageId = context.Packet.MessageId });
    }
}
```

## API liên quan

- [Metadata gói tin](./packet-metadata.md)
- [Bộ sinh Packet Handler](../analyzers/autogen/packet-handler-generator.md)
- [Pipeline middleware lúc chạy](../runtime/middleware/index.md)
- [Packet Context](../runtime/routing/packet-context.md)
