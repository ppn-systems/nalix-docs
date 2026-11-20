---
title: Connection Contracts
description: Networking contracts in Nalix.Abstractions.Networking including IConnection, IConnectionHub, IProtocol, IListener, IFrameProcessor, IOpCodeExtractor, and ITransportSequencer.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Networking` (and `Nalix.Abstractions.Networking.Protocols`)  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Networking` defines the transport-agnostic connection, hub, listener, and protocol contracts implemented by `Nalix.Network` and consumed by `Nalix.Runtime` and `Nalix.Hosting`.

## Source Mapping

- `src/Nalix.Abstractions/Networking/IConnection.cs`
- `src/Nalix.Abstractions/Networking/IConnection.ErrorTracked.cs`
- `src/Nalix.Abstractions/Networking/IConnection.Hub.cs`
- `src/Nalix.Abstractions/Networking/IConnection.Transmission.cs`
- `src/Nalix.Abstractions/Networking/IConnection.TrafficMetrics.cs`
- `src/Nalix.Abstractions/Networking/IConnectionEventArgs.cs`
- `src/Nalix.Abstractions/Networking/INetworkEndpoint.cs`
- `src/Nalix.Abstractions/Networking/IListener.cs`
- `src/Nalix.Abstractions/Networking/IFrameProcessor.cs`
- `src/Nalix.Abstractions/Networking/ITransportSequencer.cs`
- `src/Nalix.Abstractions/Networking/TransportFraming.cs`
- `src/Nalix.Abstractions/Networking/IProtocol.cs`
- `src/Nalix.Abstractions/Networking/Protocols/IOpCodeExtractor.cs`

## `IConnection`

`public interface IConnection : IConnectionErrorTracked, IDisposable` represents an active client connection (TCP, WebSocket, or datagram session).

| Member | Type | Description |
| --- | --- | --- |
| `ConnectionId` | `ulong` | Unique 64-bit Snowflake identifier assigned to the connection. |
| `UserId` | `string?` | Optional application-assigned authenticated user identifier. |
| `NetworkEndpoint` | `INetworkEndpoint` | Remote client endpoint (`string Address { get; }`). |
| `IsDisposed` | `bool` | `true` once the connection has been closed and disposed. |
| `UpTime` | `long` | Elapsed connection uptime in milliseconds. |
| `LastPingTime` | `long` | Most recent round-trip ping latency in milliseconds. |
| `ExcludeFromIdleTimeout` | `bool` | When `true`, exempts the connection from `TimingWheel` idle timeout sweeps. |
| `Attributes` | `IObjectMap<AttributeKey, object>` | Thread-safe per-connection key-value metadata store. |
| `Level` | `PermissionLevel` | Current authorization level (`NONE`, `POW_VERIFIED`, `ESTABLISHED`, `USER`, etc.). |
| `Algorithm` | `CipherSuiteType` | Negotiated symmetric/AEAD cipher suite (`Chacha20Poly1305`, `Salsa20Poly1305`, etc.). |
| `Secret` | `Bytes32` | Negotiated 32-byte session secret key (`Bytes32`, wiped on close). |
| `PacketClassifier` | `IOpCodeExtractor` | Classifier used to extract 16-bit opcodes from raw inbound frames. |
| `Transport` | `IConnection.ITransport` | The transport of this connection: the TCP stream, the WebSocket, or the datagram session (`src/Nalix.Abstractions/Networking/IConnection.Transmission.cs`). Cast to `IConnection.ISocketTransport` for socket access, or to `IDatagramTransport` on a datagram connection. |
| `ErrorCount` | `int` | Inherited from `IConnectionErrorTracked` — total protocol/framing errors recorded on this connection. |
| `IncrementErrorCount()` | `void` | Atomically increments `ErrorCount` (checked by `ConnectionGuard`). |
| `OnCloseEvent` | `event EventHandler<IConnectionEventArgs>` | Fired when the connection closes. |
| `OnProcessEvent` | `event EventHandler<IConnectionEventArgs>` | Fired when a raw inbound frame is ready for `IProtocol.ProcessMessage`. |
| `OnPostProcessEvent` | `event EventHandler<IConnectionEventArgs>` | Fired after `IProtocol.PostProcessMessage` completes. |
| `Disconnect(string? reason = null)` | `void` | Immediately closes and unregisters the connection. |
| `UpdateIdleTimeout(int newTimeoutMs)` | `void` | Dynamically updates the idle timeout budget for this connection in `TimingWheel`. |

### Nested Transport Contracts (`IConnection.ITransport` & `IConnection.ISocketTransport`)

- **`IConnection.ITransport : ITransportSequencer`**:
  - `TransportFraming Framing { get; }` (`None`, `UInt16LengthPrefixed`, `VarIntLengthPrefixed`)
  - `void UseFraming(TransportFraming newFraming)`
  - `void Send(ReadOnlySpan<byte> message)`
  - `ValueTask SendAsync(ReadOnlyMemory<byte> message, CancellationToken cancellationToken = default)`
  - `void BeginReceive(CancellationToken cancellationToken = default)`
  - `ValueTask<IAsyncDisposable> AcquireSendLockAsync(CancellationToken cancellationToken = default)`
  - `ValueTask SendAsyncCore(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)`
  - `ValueTask SendAsyncCore(IBufferLease lease, CancellationToken cancellationToken = default)`
- **`IConnection.ISocketTransport : ITransport`**:
  - `Socket Socket { get; }`
  - `Task? ReceiveLoopTask { get; }`
  - `byte[]? StolenData { get; }`
  - `Socket Unwrap()`

## `IConnectionTrafficMetrics`

Implemented by `Connection`, `WebSocketConnection`, and `DatagramConnection` to expose atomic traffic counters:

| Member | Type | Description |
| --- | --- | --- |
| `BytesSent` | `long` | Total wire bytes transmitted on this connection. |
| `BytesReceived` | `long` | Total wire bytes received on this connection. |
| `PacketsDropped` | `long` | Total packets dropped due to queue overflow or rate limiting. |
| `IncrementBytesSent(int bytes)` | `void` | Atomically adds `bytes` to `BytesSent`. |
| `IncrementBytesReceived(int bytes)` | `void` | Atomically adds `bytes` to `BytesReceived`. |
| `IncrementPacketsDropped()` | `void` | Atomically increments `PacketsDropped`. |

## `ConnectionSequenceState`

`public sealed class ConnectionSequenceState` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionSequenceState.cs`) is a pooled holder of per-connection sequence numbers used for session resume. Properties (`uint`, get/set): `TcpSendSequence`, `TcpReceiveSequence`. `ResetForPool()` sets both to `0`. The `Udp*` sequence properties are removed.

## `ConnectionAttributes`

`public static class ConnectionAttributes` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionAttributes.cs`) holds the well-known `AttributeKey` values stored in `IConnection.Attributes`:

| Field | Key name | Description |
| --- | --- | --- |
| `OwnerHub` | `nalix.owner_hub` | The connection hub that owns this connection. |
| `SequenceState` | `nalix.connection.sequence_state` | The shared sequence-number state (`ConnectionSequenceState`) stored during the connection lifecycle. |
| `RuntimeState` | `nalix.connection.runtime_state` | Runtime-specific state stored during the connection lifecycle. |
| `HandshakeDeadlineExtension` | `nalix.connection.handshake_deadline_extension` | One-time extension in milliseconds (`int`) that the proof-of-work gate grants to the pre-authentication deadline. Set at most once per connection by the handshake layer; the transport layer clamps it to 60 seconds. |

## Datagram Contracts

Namespace `Nalix.Abstractions.Networking.Datagrams` (`src/Nalix.Abstractions/Networking/Datagrams/`). A datagram session is an authenticated UDP session opened with a ticket issued over an established stream (TCP or WebSocket) session; see `NetworkTransport.DATAGRAM` and `DeliveryMethod` in [Common Enumerations](./enums.md).

### `IDatagramTransport`

`public interface IDatagramTransport : IConnection.ITransport` is the transport of a datagram session. Sends through `IConnection.ITransport` use `DeliveryMethod.ReliableOrdered` on channel `0`. Every datagram is protected by the session AEAD and replay window, so received frames are treated as encrypted on the wire and their inner sequence numbers are not checked again.

| Member | Signature | Description |
| --- | --- | --- |
| `SendAsync` | `ValueTask SendAsync(ReadOnlyMemory<byte> message, DeliveryMethod method, byte channel, CancellationToken cancellationToken = default)` | Sends a Nalix frame with a delivery method on a channel; the message is copied before the call returns. |
| `WithDelivery` | `IConnection.ITransport WithDelivery(DeliveryMethod method, byte channel)` | Returns a cached view whose sends use `method` on `channel`. Throws `ArgumentOutOfRangeException` if the method is unknown or the channel is not below the session's channel count. |

### `IDatagramTicketIssuer` and `DatagramTicketInfo`

`public interface IDatagramTicketIssuer` is implemented by the datagram listener. `DatagramTicketInfo IssueTicket(IConnection streamConnection, Action<IConnection>? onAccepted = null)` issues a single-use ticket; the stream connection's secret, identity and permission level are snapshotted at that moment. `onAccepted` runs on the new datagram connection once its first datagram authenticated, before it is registered and dispatched.

`public readonly record struct DatagramTicketInfo` carries the ticket values:

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

### `IDatagramProtection` and `IDatagramProtectionFactory`

`public interface IDatagramProtection : IDisposable` seals and opens the datagrams of one session with an AEAD. Each direction has an independent key, updated separately and signaled with the key phase bit. Implementations are not thread-safe, and a packet number is sealed at most once per key.

| Member | Description |
| --- | --- |
| `int TagSize { get; }` | Size in bytes of the authentication tag appended to every sealed payload. |
| `bool SendKeyPhase { get; }` | Key phase of the current send key; flips on every `UpdateSendKey()`. |
| `void Seal(ulong packetNumber, ReadOnlySpan<byte> header, ReadOnlySpan<byte> plaintext, Span<byte> destination)` | Encrypts `plaintext`, authenticating it with `header` as associated data; `destination` receives ciphertext plus tag and must not overlap `plaintext`. |
| `bool TryOpen(ulong packetNumber, bool keyPhase, ReadOnlySpan<byte> header, ReadOnlySpan<byte> ciphertextAndTag, Span<byte> plaintext)` | Authenticates and decrypts a payload; returns `true` when it is authentic. A payload with the other key phase is opened with the previous or next key. |
| `void UpdateSendKey()` | Replaces the send key with the next one in the key schedule. |
| `void DiscardPreviousReceiveKey()` | Wipes the previous receive key. |

`public interface IDatagramProtectionFactory` creates the protection of a session: `IDatagramProtection Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer)`. The caller disposes the result. The default implementation is `ChaCha20Poly1305DatagramProtectionFactory` in `Nalix.Codec` (see [Nalix.Codec](../../packages/nalix-codec.md)).

## `IConnectionHub`

`public interface IConnectionHub : IReportable, IDisposable` is the sharded, thread-safe registry of all active server connections:

| Member | Signature | Description |
| --- | --- | --- |
| `Count` | `int Count { get; }` | Total number of currently registered connections. |
| `ConnectionUnregistered` | `event Action<IConnection>?` | Raised when a connection is removed from the hub. |
| `RegisterConnection` | `void RegisterConnection(IConnection connection)` | Registers a newly accepted connection. |
| `UnregisterConnection` | `void UnregisterConnection(IConnection connection)` | Removes a connection from the hub. |
| `GetConnection(ulong)` | `IConnection? GetConnection(ulong id)` | Looks up an active connection by its 64-bit `ConnectionId`. |
| `GetConnection(ReadOnlySpan<byte>)` | `IConnection? GetConnection(ReadOnlySpan<byte> id)` | Looks up an active connection by its 8-byte little-endian Snowflake span. |
| `ListConnections()` | `IReadOnlyCollection<IConnection> ListConnections()` | Returns a snapshot of all active connections. |
| `ListConnections(INetworkEndpoint)` | `IReadOnlyCollection<IConnection> ListConnections(INetworkEndpoint endPoint)` | Returns all active connections matching `endPoint`. |

## `IProtocol` & Supporting Pipeline Contracts

- **`IProtocol : IDisposable, IReportable`** (`Nalix.Abstractions.Networking`):
  - `bool KeepConnectionOpen { get; }`
  - `IFrameProcessor FrameProcessor { get; }`
  - `IOpCodeExtractor OpCodeExtractor { get; }`
  - `void OnAccept(IConnection connection, CancellationToken cancellationToken = default)`
  - `void ProcessMessage(object? sender, IConnectionEventArgs args)`
  - `void PostProcessMessage(object? sender, IConnectionEventArgs args)`
- **`IListener : IActivatable, IReportable`**:
  - `void Activate(CancellationToken cancellationToken = default)` (inherited from `IActivatable`)
  - `void Deactivate(CancellationToken cancellationToken = default)` (inherited from `IActivatable`)
- **`IFrameProcessor`**:
  - `bool SupportsInlineProcessing => false`
  - `void ProcessFrame(object? sender, IConnectionEventArgs args)`
- **`IOpCodeExtractor`**:
  - `ushort Extract(ReadOnlySpan<byte> payload)`
- **`ITransportSequencer`**:
  - `ISequenceCounter SendSequence { get; }`
  - `ISequenceCounter ReceiveSequence { get; }`
  - `uint CurrentSendSequence { get; }`
  - `uint CurrentReceiveSequence { get; }`
  - `uint NextSendSequence()`
  - `uint NextReceiveSequence()`

## Related APIs

- [Connection Implementation](../network/connection/connection.md)
- [Connection Hub Implementation](../network/connection/connection-hub.md)
- [Connection Guard](../network/connection/connection-guard.md)
- [Protocol Implementation](../network/protocol.md)
- [Session Contracts](./session-contracts.md)
