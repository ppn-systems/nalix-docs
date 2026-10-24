---
title: UDP Server
description: This guide shows when to use UdpListenerBase and what to implement first.
section: Guides
---

This guide shows when to use `UdpListenerBase` and what to implement first.

Use it when you have already decided UDP is the right transport, but want the safest minimal server shape before layering in more game or telemetry logic.

## When UDP makes sense

Choose UDP when you care more about:

- low latency
- tolerance for packet loss
- lightweight datagrams
- telemetry, state sync, discovery, or custom real-time protocols

Choose TCP when you need ordered, reliable byte streams by default.

## Minimal shape

```csharp
public sealed class SampleUdpListener : UdpListenerBase
{
    public SampleUdpListener(ushort port, IProtocol protocol, IConnectionHub hub)
        : base(port, protocol, hub) { }

    public override bool IsAuthenticated(IConnection connection, EndPoint remoteEndPoint, ReadOnlySpan<byte> payload)
        => true;
}
```

Current `UdpListenerBase` constructors require the `IConnectionHub` that owns the
session map used by UDP token resolution. The hosting builder wires this for you;
manual low-level servers must pass it explicitly.

That is the minimum surface, but a real UDP server still needs a session story, an authentication story, and a diagnostics story.

## What you must decide

### 1. Authentication

`IsAuthenticated(...)` is the first application-level UDP policy hook after the
runtime has resolved the connection from the 8-byte session token.

Use it to:

- validate source identity
- reject spoofed or malformed datagrams
- gate traffic until a handshake token or session secret is known

:::tip
If you are using `NetworkApplication` (Hosting layer), you don't need to subclass `UdpListenerBase` just for authentication. Provide a predicate while configuring the builder, before `Build()`:
```csharp
using var app = NetworkApplication.CreateBuilder()
    .MapTcp<MyProtocol>().OnPort(57206).Bind()
    .MapUdp<MyProtocol>().OnPort(57206).WithAuthentication((connection, endpoint, payload) =>
        connection.Level >= PermissionLevel.USER).Bind()
    .Build();
```
:::

### 2. Protocol behavior

Decide whether your protocol:

- handles datagrams directly
- forwards decoded messages into your own game or app logic
- shares some semantics with your TCP protocol

For most teams, the easiest model is:

- use TCP to establish session state
- use UDP to carry fast authenticated datagrams
- keep both paths tied to the same `ConnectionHub`

The current runtime expects UDP datagrams to reference an existing `ConnectionHub` connection, carry an 8-byte session token prefix, and end with a 4-byte `XxHash32` authentication tag validated against `connection.Secret`.

### 3. Runtime tuning

Start with:

- `NetworkSocketOptions.Port`
- `NetworkSocketOptions.BufferSize`
- `NetworkSocketOptions.MaxParallelUDP`
- `NetworkSocketOptions.MaxUdpDatagramSize` (default `1440` bytes)

Also decide intentionally how you configure `DatagramGuardOptions` (`MaxPacketPerSecond`, `IPv4Windows`, `IPv6Windows`) and idle timeout behavior (`TimingWheelOptions`) for this deployment.

## Recommended startup order

The safest startup order is:

1. Initialize core managers (`ObjectPoolManager`, `BufferPoolManager`)
2. Validate socket and dispatch options
3. Register logger and build `PacketRegistry`
4. Build dispatch channel (`PacketDispatchChannel`)
5. Build protocol handler
6. Build `UdpListenerBase`
7. Activate dispatch, then activate the listener

That keeps transport setup and application setup aligned.

## Diagnostics you get for free

`UdpListenerBase.GenerateReport()` already tracks:

- received packets and bytes
- short packet drops (`DroppedShort`)
- unauthenticated drops (`DroppedUnauth`)
- unknown session token drops (`DroppedUnknown`)
- rate-limited and oversize drops (`DroppedRateLimited`, `DroppedOversize`)
- receive errors (`ReceiveErrors`)

## Common pattern

For client-friendly docs, the easiest mental model is:

```text
receive datagram (minimum 18 bytes: 8B SessionToken + 6B PacketHeader + 4B XxHash32 MAC)
  -> rate-limit by remote IP (DatagramGuard)
  -> copy socket buffer into a BufferLease (lease.IsReliable = false)
  -> require 8-byte SessionToken prefix and at least 6-byte PacketHeader
  -> resolve the connection through IConnectionHub
  -> verify non-zero connection.Secret and 4-byte trailing XxHash32 MAC tag
  -> strip 4-byte MAC tag and verify pinned endpoint (IsPinnedEndpointMatch)
  -> check the UDP replay window sequence (UdpReplayWindow.TryCheck)
  -> run IsAuthenticated(...) or the Hosting WithAuthentication predicate
  -> bind UDP transport and dispatch payload to the protocol
```

## What teams often miss

- UDP should not invent a second identity model separate from TCP sessions
- unauthenticated drops should be visible in diagnostics
- `IsAuthenticated(...)` should stay fast and deterministic
- the datagram layout is `[8-byte SessionToken][Payload][4-byte XxHash32 MAC]` (minimum **18 bytes**: `SessionTokenSize (8) + PacketHeader.Size (6) + UdpMacTagSize (4)`)
- Payload starts with the standard 6-byte Nalix `PacketHeader` format (`[OpCode(2), Flags(1), Priority(1), SequenceId(2)]`) or a 1-byte `FramePipeline` transform flag followed by the transformed payload

## Related APIs

- [UDP Listener](../../api/network/udp-listener.md)
- [UDP Session](../../api/sdk/udp-session.md)
- [Protocol](../../api/network/protocol.md)
- [UDP Auth Flow](./udp-security.md)
- [Security Architecture](../../concepts/internals/security-architecture.md)
