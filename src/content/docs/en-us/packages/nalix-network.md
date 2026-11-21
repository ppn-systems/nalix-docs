---
title: Nalix.Network
description: Level 3 server transport package providing TCP, datagram (NDP over UDP), and WebSocket listeners, socket connections, ConnectionHub, ConnectionGuard, and timing-wheel idle management.
section: Packages
package: Nalix.Network
---

`Nalix.Network` is the **Level 3** server transport layer. It provides high-performance TCP, datagram (NDP over UDP), and WebSocket listeners, framed socket receive/send loops, connection admission control (`ConnectionGuard`), active connection tracking (`ConnectionHub`), proxy-protocol/forwarded-header parsing, and timing-wheel idle eviction.

:::note[For most projects, start with `Nalix.Hosting`]
`Nalix.Hosting` wraps `Nalix.Network` with a fluent builder (`MapTcp<TProtocol>()`, `MapDatagram<TProtocol>()`, `MapWebSocket<TProtocol>()`) that manages listener and protocol lifecycles automatically. Use `Nalix.Network` directly when building a custom server host.
:::

## Where It Fits

```mermaid
flowchart LR
    A["TcpListenerBase / DatagramListener / WebSocketListenerBase"] --> B["ConnectionGuard & ConnectionHub"]
    B --> C["Protocol (IProtocol)"]
    C --> D["IPacketDispatch (Nalix.Runtime)"]
```

## Core Components

### 1. Transport Listeners (`Nalix.Network.Listeners`)

| Listener | Transport | Description |
| :--- | :--- | :--- |
| `TcpListenerBase` | TCP | High-throughput socket listener using pooled `SocketAsyncEventArgs`, framed length-prefix receive loops, and optional PROXY protocol / forwarded headers support. |
| `DatagramListener` | UDP (NDP) | Sealed datagram listener (`Nalix.Network.Listeners.Datagram`) that issues tickets to established TCP/WebSocket connections and routes AEAD-protected datagrams to `DatagramConnection` sessions, admitted through `IConnectionGuard`. It replaces the removed `UdpListenerBase` / `UdpPassthroughListener`. |
| `WebSocketListenerBase` | WebSocket | RFC 6455 WebSocket listener supporting path routing, subprotocol negotiation, and binary frame streaming. |

All listeners implement `IListener` (which combines `IActivatable` and `IReportable`):

- `Activate(CancellationToken)` / `Deactivate(CancellationToken)`
- `GenerateReport()` / `WriteReportData(Utf8JsonWriter)` for live diagnostics

### 2. Protocol Bridge (`Protocol`)

The `Protocol` abstract class (`Nalix.Network.Protocols.Protocol`) bridges raw transport connections to your packet dispatcher:

- **Frame processor & opcode extractor** — Exposes `abstract IFrameProcessor FrameProcessor { get; }` and `abstract IOpCodeExtractor OpCodeExtractor { get; }` (implemented by `DefaultProtocol` in `Nalix.Hosting`, or by your own `Protocol` subclass).
- **Connection acceptance** — `ValidateConnection(IConnection)` gates newly accepted connections before registration.
- **Post-accept lifecycle** — `OnAccept(IConnection, CancellationToken)` runs after admission and hub registration.
- **Message processing** — `ProcessMessage(object? sender, IConnectionEventArgs args)` forwards framed `IBufferLease` payloads to `IPacketDispatch.HandlePacket(...)`.
- **Dynamic acceptance toggle** — `IsAccepting` and `SetConnectionAcceptance(bool)` atomically enable or pause new connection acceptance without tearing down active sockets.
- **Inline post-processing** — `virtual bool SupportsInlinePostProcessing` (default `false`) lets a protocol whose `OnPostProcess` is trivial have the transport run it on the send-completion thread instead of the thread pool.

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Network.Protocols;

public sealed class GameProtocol : Protocol
{
    private readonly IPacketDispatch _dispatch;

    public GameProtocol(IPacketDispatch dispatch)
    {
        _dispatch = dispatch;
        this.IsAccepting = true;
        this.KeepConnectionOpen = true;
    }

    public override IFrameProcessor FrameProcessor => /* your IFrameProcessor */;
    public override IOpCodeExtractor OpCodeExtractor => /* your IOpCodeExtractor */;

    public override void ProcessMessage(object? sender, IConnectionEventArgs args)
        => _dispatch.HandlePacket(args.Lease!, args.Connection);

    protected override bool ValidateConnection(IConnection connection)
        => true;
}
```

### 3. Connections, Hub & Admission Guard

- **`Connection`, `WebSocketConnection` & `DatagramConnection`** — Concrete `IConnection` implementations for TCP, WebSocket and datagram (NDP) sessions. Each is its own `IConnection.ITransport` (`connection.Transport`); `Connection` sits on the internal framed `SocketConnection`.
- **`ConnectionHub`** — Sharded in-memory registry of active connections supporting lookup by `ISnowflake` ID, broadcast helpers, and diagnostic snapshots.
- **`ConnectionGuard`** — Multi-tier admission and abuse guard enforcing global connection ceilings, per-IP concurrent connection quotas, slowloris/error thresholds, and persistent bans (configured through `ConnectionBanStoreOptions` and `ConnectionBlacklistStoreOptions`).
- **`TimingWheel`** — Hierarchical O(1) timer wheel that evicts idle connections without per-connection timer allocations.

## Configuration Options (`Nalix.Network.Options`)

| Options Class | Controls |
| :--- | :--- |
| `NetworkSocketOptions` | Port, IPv4/IPv6 dual-mode, backlog, `NoDelay`, buffer sizes, and socket tuning |
| `NetworkWebSocketOptions` | WebSocket bind path, handshake timeout, max frame size, and subprotocols |
| `ConnectionQuotaOptions` | Per-IP concurrent connection limits and connection accept rate limits |
| `ConnectionGuardOptions` | Global connection ceiling, error score thresholds, and progressive ban durations |
| `ConnectionBanStoreOptions` | File persistence and retention policies for dynamic IP bans |
| `ConnectionBlacklistStoreOptions` | Static/dynamic IP and CIDR blacklist file policies |
| `ConnectionHubOptions` | Sharding and capacity settings for `ConnectionHub` |
| `DatagramOptions` | Datagram listener ticket lifetime, session limit, receive workers, and socket buffers |
| `TimingWheelOptions` | Tick resolution, wheel slots, and idle connection timeout thresholds |
| `NetworkCallbackOptions` | Concurrency and flood protection thresholds for connection event callbacks |
| `TrustedProxyOptions` | Trusted proxy CIDR ranges for real client IP resolution |
| `ForwardedHeadersOptions` | `X-Forwarded-For` parsing policies |
| `ProxyProtocolOptions` | HAProxy PROXY protocol v1/v2 header parsing |

## Key API Pages

- [Protocol](../api/network/protocol.md)
- [TCP Listener](../api/network/tcp-listener.md)
- [Datagram Listener](../api/network/datagram-listener.md)
- [Datagram Options](../api/options/network/datagram-options.md)
- [WebSocket Listener](../api/network/websocket-listener.md)
- [Connection](../api/network/connection/connection.md)
- [Connection Guard](../api/network/connection/connection-guard.md)
- [Connection Hub](../api/network/connection/connection-hub.md)
- [WebSocket Connection](../api/network/websocket-connection.md)
- [Network Options](../api/options/network/options.md)
