---
title: Packet Attributes
description: Declarative routing and policy attributes in Nalix.Abstractions.Networking.Packets and Nalix.Abstractions.Networking.Rpc used on packet controllers, handlers, and request packets.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Networking.Packets` (and `Nalix.Abstractions.Networking.Rpc`)  
**Assembly:** `Nalix.Abstractions`

Nalix uses attributes to declare controller discovery, opcode routing, transport constraints, permission levels, encryption requirements, rate limits, and execution timeouts. These attributes are compiled into a zero-allocation `PacketMetadata` struct at build time by `PacketHandlerGenerator`.

## Source Mapping

- `src/Nalix.Abstractions/Networking/Packets/PacketHandlerAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketOpcodeAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketPermissionAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketRateLimitAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketEncryptionAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketTimeoutAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketTransportAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketIdempotentAttribute.cs`
- `src/Nalix.Abstractions/Networking/Rpc/RpcServiceAttribute.cs`

## Attribute Reference

| Attribute | Target | Constructors & Properties | Purpose |
| --- | --- | --- | --- |
| `[PacketHandler]` | Class | `PacketHandlerAttribute(string name = "None", bool isActive = true, string version = "1.0")`<br/>Properties: `Name`, `IsActive`, `Version` | Marks a class as a packet controller compiled by `PacketHandlerGenerator`. |
| `[PacketOpcode]` | Method | `PacketOpcodeAttribute(ushort opCode)`<br/>`PacketOpcodeAttribute(object opcode)` (enum value)<br/>Property: `ushort OpCode { get; }` | Binds a handler method to a 16-bit packet opcode (`>= 0x0100` for application packets; `0x0000..0x00FF` are reserved for system protocols). |
| `[PacketPermission]` | Method | `PacketPermissionAttribute(PermissionLevel level = PermissionLevel.USER)`<br/>`PacketPermissionAttribute(PermissionLevel level, PermissionEvaluation evaluation)`<br/>Properties: `PermissionLevel Level`, `PermissionEvaluation Evaluation` | Declares required `connection.Level` (`MinimumLevel` by default, or `StrictMatch`), enforced by `PermissionMiddleware`. |
| `[PacketEncryption]` | Method | `PacketEncryptionAttribute(bool isEncrypted = true, CipherSuiteType algorithmType = CipherSuiteType.Chacha20Poly1305)`<br/>Properties: `bool IsEncrypted`, `CipherSuiteType AlgorithmType` | Requires `context.EncryptedOnWire == true` (enforced by `PacketEncryptionMiddleware`) and encrypts responses sent via `context.Sender`. |
| `[PacketRateLimit]` | Method | `PacketRateLimitAttribute(int requestsPerSecond, double burst = 1.0)`<br/>Property: `int RequestsPerSecond`, `double Burst`<br/>Init properties: `string? PolicyId`, `int HardLockoutSeconds = -1`, `int MaxSoftViolations = -1` | Attaches a token-bucket rate limit to the handler, enforced by `RateLimitMiddleware`. |
| `[PacketTimeout]` | Method | `PacketTimeoutAttribute(int timeoutMilliseconds)`<br/>Property: `int TimeoutMilliseconds { get; }` | Sets a linked `CancellationToken` timeout budget in milliseconds, enforced by `TimeoutMiddleware`. |
| `[PacketTransport]` | Method | `PacketTransportAttribute(NetworkTransport transport)`<br/>Property: `NetworkTransport TransportType { get; }` | Restricts the handler to `NetworkTransport.TCP`, `UDP`, or `WEBSOCKET` (enforced by `TransportMiddleware`) and routes `context.Sender` replies over that transport. |
| `[PacketIdempotent]` | Class | `PacketIdempotentAttribute()` | Documentation-only metadata marking a packet class as idempotent (safe for client-side retry policies). |
| `[RpcService]` | Interface | `RpcServiceAttribute()` | Marks an interface for compile-time typed client extension generation by `RpcClientGenerator`. |

:::important[Declaration vs. Middleware Enforcement]
Attributes populate `context.Attributes` (`PacketMetadata`). When you register handlers via `NetworkApplicationBuilder.MapHandlers<T>()` (or `PacketDispatchOptions.WithHandler<T>()`), `PacketDispatchOptions` automatically wires `TransportMiddleware`, `PacketEncryptionMiddleware`, `PermissionMiddleware`, `RateLimitMiddleware`, and `TimeoutMiddleware` whenever any registered handler declares the corresponding attribute.
:::

## Practical Example

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

## Related APIs

- [Packet Metadata](./packet-metadata.md)
- [Packet Handler Generator](../analyzers/autogen/packet-handler-generator.md)
- [Runtime Middleware Pipeline](../runtime/middleware/index.md)
- [Packet Context](../runtime/routing/packet-context.md)
