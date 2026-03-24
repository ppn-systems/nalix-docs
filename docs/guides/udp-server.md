# UDP Server Guide

This guide shows when to use `UdpListenerBase` and what to implement first.

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
    public SampleUdpListener(IProtocol protocol) : base(protocol) { }

    protected override bool IsAuthenticated(IConnection connection, in UdpReceiveResult result)
        => true;
}
```

## What you must decide

### 1. Authentication

`IsAuthenticated(...)` is the first important decision point.

Use it to:

- validate source identity
- reject spoofed or malformed datagrams
- gate traffic until a handshake token or session secret is known

### 2. Protocol behavior

Decide whether your protocol:

- handles datagrams directly
- forwards decoded messages into your own game or app logic
- shares some semantics with your TCP protocol

### 3. Runtime tuning

Start with:

- `NetworkSocketOptions.Port`
- `NetworkSocketOptions.BufferSize`
- `NetworkSocketOptions.MaxGroupConcurrency`

## Diagnostics you get for free

`UdpListenerBase.GenerateReport()` already tracks:

- received packets and bytes
- short packet drops
- unauthenticated drops
- unknown packet drops
- receive errors
- last time sync and drift

## Common pattern

For client-friendly docs, the easiest mental model is:

```text
receive datagram
  -> authenticate
  -> protocol handling
  -> optional diagnostics / time sync logic
```

## Related APIs

- [UDP Listener](../api/network/udp-listener.md)
- [Protocol](../api/network/protocol.md)
