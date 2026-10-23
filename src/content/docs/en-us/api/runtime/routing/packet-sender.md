---
title: Packet Sender
description: Reference for Nalix.Runtime.Dispatching.PacketSender — metadata-aware outbound packet serializer, compressor, encryptor, and transport router.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Dispatching`  
**Assembly:** `Nalix.Runtime`

`PacketSender` (`public sealed class PacketSender : IPacketSender`) is the default runtime implementation of `IPacketSender` bound to each pooled `PacketContext<TPacket>` and exposed via `context.Sender`.

## Source Mapping

- `src/Nalix.Abstractions/Networking/Packets/IPacketSender.cs`
- `src/Nalix.Runtime/Dispatching/PacketSender.cs`
- `src/Nalix.Runtime/Extensions/ConnectionExtensions.cs`

## How `PacketSender` Routes & Transforms Outbound Packets

When `SendAsync` or `ReplyAsync` is called:

1. **Transport Selection (`GetTransport`)**:
   - If the handler has `[PacketTransport(NetworkTransport.UDP)]`, selects `connection.UDP` (throwing `InvalidOperationException` if the UDP companion transport is not initialized).
   - If `[PacketTransport]` specifies `TCP` or `WEBSOCKET`, selects `connection.TCP`.
   - If `[PacketTransport]` is absent, replies on `connection.UDP` when the inbound request arrived over UDP (`!context.IsReliable && connection.UDP is not null`), or `connection.TCP` otherwise.
2. **Encryption Decision**:
   - `SendAsync(packet, ct)` uses `needEncrypt = context.Attributes.Encryption?.IsEncrypted ?? false` (from `[PacketEncryption]`).
   - `SendAsync(packet, forceEncrypt, ct)` overrides the attribute policy with `forceEncrypt`.
3. **Serialization & Frame Transformation**:
   - Serializes `packet` into a pooled `BufferLease` via `PacketPipeline.Serialize(packet, zeroOnDispose: needEncrypt)`.
   - Calls `PacketPipeline.ProcessAndSendAsync` with `CompressionOptions.Enabled` and `CompressionOptions.MinSizeToCompress`, applying LZ4 compression (if beneficial) and AEAD/symmetric encryption before sending on the selected transport.
   - Disposes the `BufferLease` deterministically on both synchronous and asynchronous completion paths.

## Public Methods (`IPacketSender`)

| Method | Signature | Description |
| :--- | :--- | :--- |
| `ReplyAsync` | `public ValueTask ReplyAsync(IPacket response, CancellationToken ct = default)` | Copies the inbound request's `SequenceId` onto `response.Header.SequenceId` (for client `RequestAsync` / `StreamAsync` correlation) and calls `SendAsync(response, ct)`. |
| `SendAsync` (default policy) | `public ValueTask SendAsync(IPacket packet, CancellationToken ct = default)` | Serializes and sends `packet` using the handler's `[PacketEncryption]` and `[PacketTransport]` metadata without altering `packet.Header.SequenceId`. |
| `SendAsync` (explicit encryption) | `public ValueTask SendAsync(IPacket packet, bool forceEncrypt, CancellationToken ct = default)` | Serializes and sends `packet` with an explicit `forceEncrypt` override. |
| `Initialize<TPacket>` | `public void Initialize<TPacket>(IPacketContext<TPacket> context) where TPacket : IPacket` | Binds the sender to `context` (invoked automatically by `PacketContext<TPacket>.Initialize`). |
| `ResetForPool` | `public void ResetForPool()` | Clears connection, metadata, token, and sequence state when `PacketContext<TPacket>` returns to the pool. |

## Usage Example

```csharp
using System.Threading.Tasks;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;

[PacketOpcode(0x1010)]
[PacketEncryption(true)]
public async ValueTask HandleOrder(IPacketContext<OrderRequestPacket> context)
{
    using PacketScope<OrderAckPacket> lease = PacketFactory<OrderAckPacket>.Acquire();
    OrderAckPacket ack = lease.Value;
    ack.Initialize(orderId: 9001);

    // ReplyAsync automatically stamps ack.Header.SequenceId = context.Packet.Header.SequenceId
    await context.Sender.ReplyAsync(ack, context.CancellationToken);
}
```

## Related APIs

- [Packet Context (PacketContext<TPacket>)](./packet-context.md)
- [Handler Return Types](./handler-results.md)
- [Frame Pipeline](../../codec/frame-pipeline.md)
- [Compression Options](../../options/network/compression-options.md)
