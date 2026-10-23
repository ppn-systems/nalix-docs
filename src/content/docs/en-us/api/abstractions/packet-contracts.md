---
title: Packet Contracts
description: Core packet, context, sender, and deserializer contracts in Nalix.Abstractions.Networking.Packets shared by server and client packages.
section: API Reference
package: Nalix.Abstractions
---

`Nalix.Abstractions.Networking.Packets` defines the wire packet, handler context, sender, and deserializer contracts shared across `Nalix.Codec`, `Nalix.Runtime`, `Nalix.Network`, and `Nalix.SDK`.

## Source Mapping

- `src/Nalix.Abstractions/Networking/Packets/IPacket.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketHeader.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketStaticOpcode.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketContext.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketDeserializer.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketSender.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketDeserializer.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketTimestamped.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketReasoned.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketValidatable.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketStreamable.cs`
- `src/Nalix.Abstractions/Primitives/Bytes32.cs`

## Main Types

### `IPacket`

`public interface IPacket` is the base contract for every wire packet (`PacketBase<TSelf>` in `Nalix.Codec` implements `IPacket`, `IPacketHeader`, and `IPoolable`):

| Member | Type | Description |
| --- | --- | --- |
| `Header` | `PacketHeader` | 6-byte wire header (`OpCode`, `Flags`, `Priority`, `SequenceId`). |
| `Length` | `int` | Total serialized byte length of the packet (including the 6-byte header). |
| `Serialize()` | `byte[]` | Serializes the packet into a newly allocated byte array. |
| `Serialize(Span<byte> buffer)` | `int` | Zero-allocation serialization directly into `buffer`, returning the number of bytes written. |

### `IPacketContext<TPacket>`

`public interface IPacketContext<TPacket> : IPoolable where TPacket : IPacket` represents the pooled per-packet dispatch context passed as parameter `0` to every `[PacketOpcode]` handler:

| Property | Type | Description |
| --- | --- | --- |
| `Packet` | `TPacket` | The deserialized request packet. |
| `Connection` | `IConnection` | The client connection that sent the packet. |
| `Attributes` | `PacketMetadata` | Compile-time handler attributes (`PacketOpcode`, `Timeout`, `Permission`, `Encryption`, `RateLimit`, `Transport`). |
| `Sender` | `IPacketSender` | Metadata-aware outbound packet sender bound to this context. |
| `Scope` | `IPacketScope` | Per-packet service scope used to resolve `[FromScope]` handler parameters. |
| `EncryptedOnWire` | `bool` | `true` if the inbound frame arrived encrypted on the wire before `FrameCipher.DecryptFrame` stripped `PacketFlags.ENCRYPTED`. |
| `IsReliable` | `bool` | `true` when the packet arrived over a reliable transport (`TCP` or `WEBSOCKET`). |
| `SkipOutbound` | `bool` | When set to `true`, skips outbound middleware execution for this context. |
| `CancellationToken` | `CancellationToken` | Cancellation token governing the handler execution (including `TimeoutMiddleware` budgets). |

### `IPacketSender`

`public interface IPacketSender : IPoolable` provides metadata-aware response helpers inside handlers and middleware:

| Method | Signature | Description |
| --- | --- | --- |
| `Initialize<TPacket>` | `void Initialize<TPacket>(IPacketContext<TPacket> context) where TPacket : IPacket` | Binds the pooled sender to the active `IPacketContext<TPacket>`. |
| `SendAsync` | `ValueTask SendAsync(IPacket packet, CancellationToken ct = default)` | Sends `packet` to `context.Connection`, automatically applying `[PacketEncryption]` and `[PacketTransport]` metadata from the handler. |
| `SendAsync` (explicit encryption) | `ValueTask SendAsync(IPacket packet, bool forceEncrypt, CancellationToken ct = default)` | Sends `packet` while explicitly overriding encryption (`forceEncrypt`). |
| `ReplyAsync` | `ValueTask ReplyAsync(IPacket response, CancellationToken ct = default)` | Automatically stamps `response.SequenceId = context.Packet.SequenceId` before sending so `session.RequestAsync<T>()` correlates the reply. |

### Supporting Packet & Primitive Contracts

- **`IPacketStaticOpcode`**: `public static abstract ushort StaticOpCode { get; }` — binds a packet class to its compile-time 16-bit opcode for `PacketRegistryGenerator`.
- **`IPacketDeserializer<out TPacket>`**: `public static abstract TPacket Deserialize(ReadOnlySpan<byte> buffer)` — zero-reflection static factory implemented by `PacketBase<TSelf>`.
- **`PacketDeserializer`**: `public delegate IPacket PacketDeserializer(ReadOnlySpan<byte> raw)` — delegate stored in `PacketRegistry`.
- **`IPacketTimestamped`**: Exposes `long Timestamp { get; set; }` and `long MonoTicks { get; set; }` for latency and time-sync packets.
- **`IPacketReasoned`**: Exposes `ProtocolReason Reason { get; }` for control and diagnostic packets.
- **`IPacketValidatable`**: Exposes `bool Validate([NotNullWhen(false)] out string? failureReason)` for structural packet validation.
- **`IPacketStreamable`** & **`IPacketStreamTerminator`**: Contracts for server-to-client streaming packets (`bool IsEndOfStream { get; set; }` on `IPacketStreamable`, and `bool IsTerminator { get; }` on `IPacketStreamTerminator`).
- **`Bytes32`** (`Nalix.Abstractions.Primitives`): Fixed 32-byte (`Bytes32.Size = 32`) stack-allocated value type (`[StructLayout(LayoutKind.Explicit)]` with 4 × `ulong` fields, implementing `IEquatable<Bytes32>` and `IFixedSizeSerializable`) used for X25519 keys, nonces, Keccak-256 digests, and HMAC proofs (`Bytes32.Zero`, `IsZero`, `CopyFrom`, `WriteTo`, `TryWriteTo`, `AsSpan`, `ToByteArray()`, `Parse(string hex)`, `Wipe(ref Bytes32)`).

## Responsibility Boundaries

- **`Nalix.Abstractions`**: Interfaces, attributes, headers, and zero-dependency value primitives.
- **`Nalix.Codec`**: Concrete `PacketBase<TSelf>` frame model, `PacketRegistry`, and binary `LiteSerializer`.
- **`Nalix.Runtime`**: Pooled `PacketContext<TPacket>`, `PacketSender`, and `PacketDispatchChannel`.
- **`Nalix.SDK`**: Client sessions (`TcpSession`, `UdpSession`, `WebSocketSession`) consuming the same packet contracts.

## Related APIs

- [Frame Model (PacketBase<TSelf>)](../codec/packets/frame-model.md)
- [Packet Registry](../codec/packets/packet-registry.md)
- [Runtime Packet Context](../runtime/routing/packet-context.md)
- [Runtime Packet Sender](../runtime/routing/packet-sender.md)
