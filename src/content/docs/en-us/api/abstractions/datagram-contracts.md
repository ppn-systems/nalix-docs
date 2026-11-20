---
title: Datagram Contracts
description: Datagram session contracts in Nalix.Abstractions.Networking.Datagrams including IDatagramTransport, IDatagramTicketIssuer, DatagramTicketInfo, IDatagramProtection, IDatagramProtectionFactory, DeliveryMethod, and PacketDeliveryAttribute.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Networking.Datagrams` (and `Nalix.Abstractions.Networking.Packets` for `PacketDeliveryAttribute`)  
**Assembly:** `Nalix.Abstractions`

A datagram session is an authenticated UDP session opened with a ticket issued over an established stream (TCP or WebSocket) connection. These contracts define how the session sends messages, how tickets are issued, how every datagram is sealed, and how a handler chooses the delivery method of its replies. They are implemented by `Nalix.Network` and `Nalix.Codec` and consumed by `Nalix.Runtime`.

## Source Mapping

- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramTransport.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramTicketIssuer.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramProtection.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramProtectionFactory.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/DeliveryMethod.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketDeliveryAttribute.cs`

## `DeliveryMethod`

`public enum DeliveryMethod : byte` (`DeliveryMethod.cs:10`) describes how a message sent over a datagram session is delivered. Ordering and sequencing are per channel. Stream transports (TCP, WebSocket) deliver every method reliably and in order (`DeliveryMethod.cs:7-9`).

| Member | Value | Meaning |
| --- | --- | --- |
| `Unreliable` | `0` | Delivered at most once, in any order; never retransmitted (`DeliveryMethod.cs:12-15`). |
| `UnreliableSequenced` | `1` | Delivered at most once; a message older than the newest one already delivered on its channel is dropped. Never retransmitted (`DeliveryMethod.cs:17-21`). |
| `ReliableUnordered` | `2` | Delivered exactly once, in any order (`DeliveryMethod.cs:23-26`). |
| `ReliableOrdered` | `3` | Delivered exactly once, in send order within its channel (`DeliveryMethod.cs:28-31`). |
| `ReliableSequenced` | `4` | The newest message of the channel is guaranteed to arrive; older ones may be skipped. Only the newest message is retransmitted (`DeliveryMethod.cs:33-37`). |

## `IDatagramTransport`

`public interface IDatagramTransport : IConnection.ITransport` (`IDatagramTransport.cs:192`) is the transport of a datagram session; it is what `IConnection.Transport` returns on a datagram connection (see [Connection Contracts](./connection-contracts.md)).

Sends through the plain `IConnection.ITransport` members use `DeliveryMethod.ReliableOrdered` on channel `0` (`IDatagramTransport.cs:184-187`). Every datagram is protected by the session AEAD and replay window, so frames received on this transport are treated as encrypted on the wire and their inner sequence numbers are not checked again (`IDatagramTransport.cs:188-191`).

| Member | Signature | Description |
| --- | --- | --- |
| `SendAsync` | `ValueTask SendAsync(ReadOnlyMemory<byte> message, DeliveryMethod method, byte channel, CancellationToken cancellationToken = default)` | Sends a Nalix frame with a delivery method on a channel. The message is copied before the call returns; the returned task completes once the message is queued (`IDatagramTransport.cs:194-202`). |
| `WithDelivery` | `IConnection.ITransport WithDelivery(DeliveryMethod method, byte channel)` | Returns a view of this transport whose sends use `method` on `channel`. Views are cached, so repeated calls do not allocate. Throws `ArgumentOutOfRangeException` if the method is unknown or the channel is not below the session's channel count (`IDatagramTransport.cs:204-212`). |

## `IDatagramTicketIssuer`

`public interface IDatagramTicketIssuer` (`IDatagramTicketIssuer.cs:138`) is implemented by the datagram listener and issues session tickets for established stream connections (`IDatagramTicketIssuer.cs:135-137`).

```csharp
DatagramTicketInfo IssueTicket(IConnection streamConnection, Action<IConnection>? onAccepted = null);
```

- `streamConnection`: the established TCP or WebSocket connection.
- `onAccepted`: runs on the new datagram connection once its first datagram has authenticated, before it is registered and dispatched (for example to copy runtime state).
- Returns the ticket to send to the client.

The ticket is single-use. The stream connection's secret, identity and permission level are snapshotted when it is issued; later changes to the stream connection do not affect the datagram session (`IDatagramTicketIssuer.cs:140-150`).

## `DatagramTicketInfo`

`public readonly record struct DatagramTicketInfo(...)` (`IDatagramTicketIssuer.cs:165-174`) carries the values of a ticket:

| Field | Type | Description |
| --- | --- | --- |
| `ConnectionId` | `ulong` | Datagram connection identifier (from the CSPRNG). |
| `Nonce` | `UInt128` | 16-byte ticket nonce that makes the session keys fresh. |
| `Port` | `ushort` | UDP port to send to; the host is the stream session's host. |
| `ExpiresInSeconds` | `ushort` | Seconds within which the first datagram must arrive. |
| `IdleTimeoutMs` | `int` | Idle timeout of the session. |
| `MaxMessageSize` | `int` | Largest message either side accepts. |
| `ChannelCount` | `byte` | Number of channels. |
| `ReceiveBufferBytes` | `long` | Total bytes the server buffers for ordering and reassembly. |
| `ChannelReceiveBufferBytes` | `long` | Bytes the server buffers per channel. |

Field meanings come from the `<param>` documentation at `IDatagramTicketIssuer.cs:156-164`.

## `IDatagramProtection`

`public interface IDatagramProtection : IDisposable` (`IDatagramProtection.cs:54`) seals and opens the datagrams of one session with an AEAD. The keys of each direction are independent; each direction updates its own key and signals it with the key phase bit (`IDatagramProtection.cs:46-49`).

Implementations are not thread-safe; the datagram session serializes calls. A packet number is sealed at most once per key: the caller never reuses one (`IDatagramProtection.cs:50-53`).

| Member | Signature | Description |
| --- | --- | --- |
| `TagSize` | `int TagSize { get; }` | Size in bytes of the authentication tag appended to every sealed payload (`:59`). |
| `SendKeyPhase` | `bool SendKeyPhase { get; }` | Key phase of the current send key; flips on every `UpdateSendKey()` (`:64`). |
| `Seal` | `void Seal(ulong packetNumber, ReadOnlySpan<byte> header, ReadOnlySpan<byte> plaintext, Span<byte> destination)` | Encrypts `plaintext` and authenticates it together with `header` (associated data). `packetNumber` selects the nonce. `destination` receives the ciphertext followed by the tag, needs at least `plaintext.Length + TagSize` bytes, and must not overlap `plaintext` (`:66-76`). |
| `TryOpen` | `bool TryOpen(ulong packetNumber, bool keyPhase, ReadOnlySpan<byte> header, ReadOnlySpan<byte> ciphertextAndTag, Span<byte> plaintext)` | Authenticates and decrypts a received payload; returns `true` when it is authentic. A payload with the other key phase is opened with the previous key when it is older than the current phase, otherwise with the next key; when the next key succeeds it becomes the current receive key. `plaintext` needs at least `ciphertextAndTag.Length - TagSize` bytes and must not overlap `ciphertextAndTag` (`:78-92`). |
| `UpdateSendKey` | `void UpdateSendKey()` | Replaces the send key with the next one in the key schedule and flips `SendKeyPhase` (`:94-97`). |
| `DiscardPreviousReceiveKey` | `void DiscardPreviousReceiveKey()` | Wipes the previous receive key, after late packets of the old phase can no longer arrive (`:99-102`). |

(Line numbers in the table are in `IDatagramProtection.cs`.)

## `IDatagramProtectionFactory`

`public interface IDatagramProtectionFactory` (`IDatagramProtectionFactory.cs:13`) creates the `IDatagramProtection` of a session from the stream session secret and the ticket values, so the transport layer can seal datagrams without referencing the crypto code (`IDatagramProtectionFactory.cs:9-12`).

```csharp
IDatagramProtection Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer);
```

- `sessionSecret`: the stream session secret at the time the ticket was issued.
- `connectionId`: the datagram connection identifier from the ticket.
- `ticketNonce`: the 16-byte ticket nonce.
- `isServer`: `true` for the server side, which sends with the server-to-client key.
- The caller disposes the returned protection (`IDatagramProtectionFactory.cs:15-23`).

The default implementation is `ChaCha20Poly1305DatagramProtectionFactory` in `Nalix.Codec` (`src/Nalix.Codec/Security/Datagram/ChaCha20Poly1305DatagramProtectionFactory.cs`, L13); the hosting builder passes its `Instance` to the datagram listener (`src/Nalix.Hosting/NetworkApplicationBuilder.cs`, L427). See [Nalix.Codec](../../packages/nalix-codec.md).

## `PacketDeliveryAttribute`

`public sealed class PacketDeliveryAttribute(DeliveryMethod method, byte channel = 0) : Attribute` (`PacketDeliveryAttribute.cs:17`, namespace `Nalix.Abstractions.Networking.Packets`) selects the delivery method and channel of the packets a handler sends on a datagram connection. It targets methods only, is not repeatable, and is not inherited (`PacketDeliveryAttribute.cs:16`).

| Member | Type | Description |
| --- | --- | --- |
| `Method` | `DeliveryMethod` | The delivery method (`:22`). |
| `Channel` | `byte` | The channel; defaults to `0` in the constructor (`:27`, `:17`). |

Without the attribute, datagram sends use `DeliveryMethod.ReliableOrdered` on channel `0`. Stream connections ignore it and always deliver reliably and in order (`PacketDeliveryAttribute.cs:10-13`).

At send time `PacketSender` reads the attribute from the handler metadata: on an `IDatagramTransport` it calls `WithDelivery(delivery.Method, delivery.Channel)`, otherwise it uses the connection's transport unchanged (`src/Nalix.Runtime/Dispatching/PacketSender.cs`, L254-265). Frames sent on a datagram transport are not encrypted again by the packet layer, because the session AEAD already protects them (`PacketSender.cs:248-251`).

## Example

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Datagrams;
using Nalix.Abstractions.Networking.Packets;

// Handler method: replies are sent unreliably, keeping only the newest, on channel 2.
[PacketDelivery(DeliveryMethod.UnreliableSequenced, channel: 2)]
public ValueTask<PositionPacket> OnMove(IPacketContext<MovePacket> context) { /* ... */ }

// Issuing a ticket over an established TCP/WebSocket connection.
static DatagramTicketInfo Open(IDatagramTicketIssuer issuer, IConnection tcp)
    => issuer.IssueTicket(tcp, onAccepted: datagram => { /* copy runtime state */ });

// Sending directly on a datagram connection.
static async ValueTask Send(IConnection datagramConnection, ReadOnlyMemory<byte> frame)
{
    if (datagramConnection.Transport is IDatagramTransport transport)
    {
        await transport.SendAsync(frame, DeliveryMethod.ReliableSequenced, channel: 1);
    }
}
```

`PositionPacket`, `MovePacket` and `IPacketContext<T>` in the first snippet are illustrative application types.

## Related APIs

- [Connection Contracts](./connection-contracts.md)
- [Common Enumerations](./enums.md)
- [Packet Attributes](./packet-attributes.md)
- [Session Contracts](./session-contracts.md)
