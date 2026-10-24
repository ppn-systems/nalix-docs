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

`public interface IConnection : IConnectionErrorTracked, IDisposable` represents an active client connection (TCP, UDP, or WebSocket).

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
| `IsUdpCreated` | `bool` | `true` once the connection has an active UDP transport binding. |
| `PacketClassifier` | `IOpCodeExtractor` | Classifier used to extract 16-bit opcodes from raw inbound frames. |
| `TCP` | `IConnection.ITransport` | Stream/TCP (or WebSocket) transport interface. |
| `UDP` | `IConnection.ITransport?` | Datagram/UDP transport interface (`null` until UDP is bound). |
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

Implemented by `Connection`, `WebSocketConnection`, and `PassthroughConnection` to expose atomic traffic counters:

| Member | Type | Description |
| --- | --- | --- |
| `BytesSent` | `long` | Total wire bytes transmitted on this connection. |
| `BytesReceived` | `long` | Total wire bytes received on this connection. |
| `PacketsDropped` | `long` | Total packets dropped due to queue overflow or rate limiting. |
| `IncrementBytesSent(int bytes)` | `void` | Atomically adds `bytes` to `BytesSent`. |
| `IncrementBytesReceived(int bytes)` | `void` | Atomically adds `bytes` to `BytesReceived`. |
| `IncrementPacketsDropped()` | `void` | Atomically increments `PacketsDropped`. |

## `ConnectionSequenceState`

`public sealed class ConnectionSequenceState` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionSequenceState.cs`) is a pooled holder of per-connection sequence numbers used for session resume. Properties (`uint`, get/set): `TcpSendSequence`, `TcpReceiveSequence`, `UdpSendSequence`, `UdpReceiveSequence`. `ResetForPool()` sets all four to `0`.

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
