---
title: WebSocket Connection
description: The WebSocketConnection class represents an active, full-duplex WebSocket connection between the server and a client. It wraps the standard System.Net.WebSockets.WebSocket type...
section: API Reference
package: Nalix.Network
---

The `WebSocketConnection` class represents an active, full-duplex WebSocket connection between the server and a client. It wraps the standard `System.Net.WebSockets.WebSocket` type and implements `IConnection` to unify it with the Nalix transport abstractions.

## Overview

A `WebSocketConnection` implements the WebSocket transport itself while tracking connection metrics, handling lifecycle transitions, maintaining state attributes, and caching rate limits. It is designed to work in conjunction with the global connection registry and timing wheel systems.

### Key Features
* **Unified Connection Abstraction**: Implements `IConnection` allowing existing protocol pipelines and dispatch middleware to process WebSocket connections transparently.
* **Self-Transport**: `Transport` returns the connection itself (`IConnection.ITransport`, `TransportFraming.None`); there are no separate `TCP` / `UDP` members and no `WebSocketTransport` adapter.
* **Zero-Allocation Context Pooling**: Utilizes internal pools (`LocalPool<T>`) for connection event arguments and processing contexts to optimize GC overhead under load.
* **Graceful Close**: A server-side close of a WebSocket that can still send runs the RFC 6455 closing handshake instead of a bare TCP drop (see below).

## Source Mapping

- `src/Nalix.Network/Connections/WebSocketConnection.cs`
- `src/Nalix.Network/Connections/WebSocketConnection.Transport.cs`
- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## API Reference

### WebSocketConnection Class

```csharp
namespace Nalix.Network.Connections;

public sealed partial class WebSocketConnection :
    IConnection,
    IConnectionErrorTracked,
    IConnectionTrafficMetrics,
    IPooledConnectContextPool,
    TimingWheel.ITimeoutTrackedConnection
```

#### Constructors

* `public WebSocketConnection(WebSocket webSocket, IOpCodeExtractor packetClassifier, EndPoint remoteEndPoint)`
  Initializes a connection wrapping the specified `WebSocket` with the packet classifier and the client's remote endpoint. Throws `ArgumentNullException` for a `null` argument. The connection takes ownership of the socket.

#### Properties

* `public bool IsDisposed { get; }`
  Returns `true` if the connection has been closed and resources are released.

* `public ulong ConnectionId { get; }`
  Unique identifier of this connection (`Snowflake.NewId(SnowflakeType.Session)`).

* `public string? UserId { get; set; }`
  Optional application user identifier.

* `public IConnection.ITransport Transport { get; }`
  The connection itself as transport. Throws `ObjectDisposedException` after disposal.

* `public IOpCodeExtractor PacketClassifier { get; }`
  Opcode extractor bound by the listener's protocol.

* `public INetworkEndpoint NetworkEndpoint { get; }`
  Client remote endpoint (`SocketEndpoint` snapshot).

* `public IObjectMap<AttributeKey, object> Attributes { get; }`
  Pooled key-value metadata container bound to the lifetime of the connection.

* `public ConcurrentDictionary<ushort, object> RateLimitCache { get; }`
  Per-route/per-directive cache used by rate limiting middlewares.

* `public int ErrorCount { get; }`, `public long PacketsDropped { get; }`, `public int PendingPackets { get; }`
  Error, dropped-packet and pending-callback counters.

* `public long UpTime { get; }`
  Uptime of the connection in milliseconds.

* `public long BytesSent { get; }` / `public long BytesReceived { get; }`
  Wire bytes counted for the connection.

* `public long LastPingTime { get; }`
  Timestamp of the last received frame in milliseconds.

* `public PermissionLevel Level { get; set; }` (default `NONE`), `public CipherSuiteType Algorithm { get; set; }` (default `Chacha20Poly1305`), `public Bytes32 Secret { get; set; }`
  Authorization level, negotiated cipher suite and session secret.

* `public int IdleTimeoutMs { get; set; }`, `public bool ExcludeFromIdleTimeout { get; set; }`
  Idle timeout (initialized from `TimingWheelOptions.IdleTimeoutMs`) and idle-reaping exemption.

#### Events

* `public event EventHandler<IConnectionEventArgs> ConnectionClosed`
  Raised when the connection is closed.

* `public event EventHandler<IConnectionEventArgs> MessageProcessing`
  Raised when a complete message is read and needs routing/handling.

* `public event EventHandler<IConnectionEventArgs> MessageProcessed`
  Raised after a message was sent (used for statistics or post-send updates).

#### Public Methods

* `public void Disconnect(string? reason = null)`
  Idempotently disposes the connection; the close frame is sent while the socket can still send.

* `public void IncrementErrorCount()`
  Counts an error within `ConnectionGuardOptions.ErrorWindow`; reaching `ConnectionGuardOptions.MaxErrorThreshold` disconnects the connection.

* `public void IncrementBytesSent(int bytes)`, `public void IncrementBytesReceived(int bytes)`, `public void IncrementPacketsDropped()`
  Traffic counters.

* `public void UpdateIdleTimeout(int newTimeoutMs)`
  Updates `IdleTimeoutMs` (`> 0`, otherwise `ArgumentOutOfRangeException`) and re-registers the connection in the `TimingWheel`.

* `public void Dispose()`
  Disposes underlying streams, locks, and returns pooled argument context classes.

## Internal Transport Details

WebSocket communication is frameless from the application's perspective, as the WebSocket protocol itself provides frame borders.

* **Synchronous Operations Unsupported**: `IConnection.ITransport.Send(ReadOnlySpan<byte>)` throws `NotSupportedException`. Use `SendAsync`. A send on a connection that is disposed or whose socket is not `Open` completes without sending.
* **Receive Loop Buffer**: The receive loop uses a rented buffer matching `FragmentOptions.MaxChunkSize`. Larger messages switch to a slow path that assembles the payload into a rented array, growing on demand up to `NetworkWebSocketOptions.MaxMessageSize` before `MessageProcessing` is raised.

### Closing Handshake

When the connection is disposed and the `WebSocket` is `Open` or `CloseReceived`, it writes a close frame under the send lock (so it is not held behind a corked batch), waits for the peer's close frame while the receive loop is still reading, then releases the socket. The whole handshake is bounded at 2 seconds; a peer that does not answer is dropped.

| Cause | Close status |
| :--- | :--- |
| Default close | `NormalClosure` (1000), reason `"Connection closed"` |
| A message larger than `NetworkWebSocketOptions.MaxMessageSize` | `MessageTooBig` (1009), reason `"Message exceeds the maximum size"`; the connection then reads and discards until the peer's close frame arrives so unread bytes do not turn the close into a reset |
| `WebSocketListenerBase.Deactivate` | `EndpointUnavailable` (1001) for every live connection, before the listener's cancellation aborts the sockets |

## See Also

* [WebSocket Listener](websocket-listener.md)
* [Connection Registry](connection/connection-hub.md)
* [Timing Wheel](time/timing-wheel.md)
