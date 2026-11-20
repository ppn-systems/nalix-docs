---
title: UDP Server
description: This guide shows how to host the Nalix datagram (NDP over UDP) listener with MapDatagram and what to configure first.
section: Guides
---

This guide shows how to host the datagram listener (`DatagramListener`, the Nalix Datagram Protocol over UDP) and what to configure first.

Use it when you have already decided UDP is the right transport, but want the safest minimal server shape before layering in more game or telemetry logic.

## Source Mapping

- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Core.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Receive.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.PublicMethods.cs`
- `src/Nalix.Network/Options/DatagramOptions.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`
- `src/Nalix.Hosting/NetworkApplicationBuilder.cs`
- `src/Nalix.Runtime/Handlers/DatagramTicketHandlers.cs`

## When UDP makes sense

Choose UDP when you care more about:

- low latency
- tolerance for packet loss
- lightweight datagrams
- telemetry, state sync, discovery, or custom real-time protocols

Choose TCP when you need ordered, reliable byte streams by default. A datagram session can also send reliably: each message is sent with a `DeliveryMethod` (`Unreliable`, `UnreliableSequenced`, `ReliableUnordered`, `ReliableOrdered`, `ReliableSequenced`) on one of the session's channels.

## Minimal shape

```csharp
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseSecureConnections()
    .MapHandlers(typeof(MyHandlers))
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .MapDatagram<DefaultProtocol>().OnPort(57206).Bind()
    .Build();

await app.RunAsync(cts.Token);
```

`MapDatagram<TProtocol>()` creates a `DatagramListener` and maps the ticket handlers (`DatagramTicketHandlers`) for you. It can be called once per application, because tickets are issued by a single listener; a second call throws `InvalidOperationException`. There is no subclass to write and no `IsAuthenticated(...)` hook: authentication is part of the protocol (see [UDP Security](./udp-security.md)).

A datagram session is always created from an established TCP or WebSocket session. The client asks for a ticket over that stream (the handshake must be complete), then opens a UDP socket and sends its first datagram within the ticket lifetime.

:::note
A datagram session copies the user, permission level and secret of its stream connection when the ticket is issued and then lives on its own: disconnecting the stream connection does not close it. To kick a user, also disconnect the `DatagramConnection` instances whose `StreamConnectionId` matches.
:::

## What you must decide

### 1. Session story

Use the stream connection to establish identity (handshake, login, permissions) and the datagram session to carry fast traffic. The datagram connection inherits the completed handshake of its stream connection.

### 2. Delivery method per handler

A handler can declare how its responses travel on a datagram session with `PacketDeliveryAttribute` (`DeliveryMethod method, byte channel = 0`). Without the attribute the session's own transport is used as is.

### 3. Runtime tuning

`DatagramOptions` (listener, in `Nalix.Network.Options`):

| Property | Default | Meaning |
| :--- | :--- | :--- |
| `TicketLifetimeSeconds` | `10` | Seconds within which the first datagram of a ticket must arrive (1-300) |
| `MaxSessions` | `100000` | Largest number of sessions plus pending tickets |
| `ReceiveWorkers` | `1` | Receive workers reading the UDP socket (1-64) |
| `SocketReceiveBufferSize` | `4194304` | UDP socket receive buffer, bytes |
| `SocketSendBufferSize` | `4194304` | UDP socket send buffer, bytes |

`DatagramEngineOptions` (per session, in `Nalix.Environment.Options`) includes `ChannelCount` (default `8`, max `64`), `IdleTimeoutMs` (`15000`), `MaxAckDelayMs` (`25`), `UnreliableExpiryMs` (`100`), `MaxMessageSize` (`1048576`), `EnableMtuProbing` (`true`) and the receive/send buffer budgets and key-update intervals. `DatagramEngineOptions.Validate()` rejects budgets that cannot hold one maximum-size message.

Per-IP admission is handled by the `ConnectionGuard` the host passes to the listener: it is consulted when a session is promoted, and a rejection is counted in `TotalGuardRejections`.

## Recommended startup order

1. Initialize core managers (`ObjectPoolManager`, `BufferPoolManager`)
2. Validate options
3. Register logger and build `PacketRegistry`
4. Build the dispatch channel (`PacketDispatchChannel`)
5. Build the protocol handler
6. Build `DatagramListener` (the hosting builder does this for `MapDatagram`)
7. Activate dispatch, then activate the listener

That keeps transport setup and application setup aligned.

## Diagnostics you get for free

`DatagramListener.Metrics` (`DMetrics`) and `GenerateReport()` track:

- datagrams and bytes received (`DatagramsReceived`, `BytesReceived`)
- malformed drops (`DroppedMalformed`)
- unknown connection-id drops (`DroppedUnknown`)
- unauthenticated drops (`DroppedUnauthenticated`)
- tickets issued and expired (`TicketsIssued`, `TicketsExpired`)
- accepted sessions, guard rejections and errors (`TotalAccepted`, `TotalGuardRejections`, `TotalErrors`)

`SessionCount` and `PendingTicketCount` show the live session and ticket tables.

## Common pattern

```text
receive datagram (at most DatagramEngine.MaxDatagramSize = 1472 bytes)
  -> read the connection id from the cleartext datagram header
  -> known session  -> authenticate and decrypt it in the session's engine
  -> pending ticket -> authenticate the first datagram, then promote it to a session
  -> unknown id     -> drop (DroppedUnknown)
  -> failed check   -> drop (DroppedUnauthenticated)
  -> accepted session -> hand the message to the protocol and dispatch
```

## What teams often miss

- UDP does not invent a second identity model: the ticket is issued over an authenticated stream session
- unauthenticated and unknown drops should be visible in diagnostics
- the largest datagram is `DatagramEngine.MaxDatagramSize` (`1472` bytes); larger messages are fragmented by the engine up to `MaxMessageSize`
- every datagram is sealed with ChaCha20-Poly1305, so frames are not encrypted a second time

## Related APIs

- [UDP Listener](../../api/network/udp-listener.md)
- [UDP Session](../../api/sdk/udp-session.md)
- [Protocol](../../api/network/protocol.md)
- [UDP Auth Flow](./udp-security.md)
- [Security Architecture](../../concepts/internals/security-architecture.md)
