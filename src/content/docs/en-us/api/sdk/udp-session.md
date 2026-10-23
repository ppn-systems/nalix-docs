---
title: UDP Session
description: Reference for Nalix.SDK.Transport.UdpSession — authenticated client-side UDP transport with 8-byte SessionToken prefix, 4-byte XxHash32 MAC tag trailer, and companion TCP port pinning.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport`  
**Assembly:** `Nalix.SDK`

`UdpSession` (`[UnsupportedOSPlatform("browser")] public class UdpSession : TransportSession`) is the client-side authenticated datagram transport in `Nalix.SDK`, built on `UdpFrameSender` and `UdpFrameReader`.

## Source Mapping

- `src/Nalix.SDK/Transport/UdpSession.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameReader.cs`
- `src/Nalix.Codec/Transforms/FramePipeline.cs`

## Authenticated Datagram Wire Format

### Outbound (Client $\rightarrow$ Server)

`UdpFrameSender` wraps each transformed packet in a **12-byte authentication envelope** (`8-byte SessionToken prefix` + `4-byte seeded XxHash32 MAC trailer`):

```text
+-----------------------------------+-----------------------------------+-----------------------------------+
|  SessionToken (8B, LE UInt64)     |  Transformed Packet Payload       |  UdpMacTag (4B, LE UInt32)        |
|  (_state.SessionToken)            |  (Compressed / AEAD Encrypted)    |  XxHash32(Secret, seed: Hash(0..N))|
+-----------------------------------+-----------------------------------+-----------------------------------+
  Bytes 0..7                          Bytes 8..(dataLen - 1)              Bytes dataLen..(dataLen + 3)
```

1. **Outbound Transformation**: Calls `FramePipeline.ProcessOutbound(...)` to apply LZ4 compression and AEAD encryption with the next 32-bit sequence number.
2. **MTU Guard**: Verifies `current.Length + 8 + 4 <= Options.MaxUdpDatagramSize` (default `1400` bytes); throws `NetworkException` if exceeded.
3. **Keyed MAC Computation**: Writes `SessionToken` (`8` bytes) + transformed payload (`current.Length` bytes), computes `uint payloadHash = XxHash32.Compute(finalLease.SpanFull[..dataLen])`, computes `uint computedTag = XxHash32.Compute(_state.Secret.AsSpan(), seed: payloadHash)`, and appends `computedTag` as the 4-byte little-endian trailer.

### Inbound (Server $\rightarrow$ Client)

`UdpFrameReader` validates every received datagram before dispatching:
1. Requires `!_state.Secret.IsZero` and `datagram.Length >= PacketHeader.Size + 4`.
2. Verifies the trailing 4-byte `XxHash32` MAC tag against `_state.Secret` and strips the 4-byte tag.
3. Runs `FramePipeline.ProcessInbound(...)` (AEAD decryption + LZ4 decompression) and checks the sequence number against `_sequence.IsValid(seq, s_sequenceOptions.UdpWindow)`.
4. Dispatches the verified payload to `DispatchPendingMessage`, `OnMessageReceived`, and `OnMessageAsync`.

## Public API Reference

```csharp
namespace Nalix.SDK.Transport;

[UnsupportedOSPlatform("browser")]
public class UdpSession : TransportSession
{
    public UdpSession(TransportOptions options, SessionState? state = null);

    public ulong SessionToken { get; set; }
    public override TransportOptions Options { get; }
    public override bool IsConnected { get; }

    public override event EventHandler? OnConnected;
    public override event EventHandler<Exception>? OnDisconnected;
    public override event EventHandler<IBufferLease>? OnMessageReceived;
    public override event EventHandler<Exception>? OnError;
    public event Func<ReadOnlyMemory<byte>, Task>? OnMessageAsync;

    public override Task ConnectAsync(string? host = null, ushort? port = null, CancellationToken ct = default);
    public override Task DisconnectAsync();
    public override Task SendAsync(IPacket packet, CancellationToken ct = default);
    public override Task SendAsync(IPacket packet, bool? encrypt = null, CancellationToken ct = default);
    public override Task SendAsync(ReadOnlyMemory<byte> payload, bool? encrypt = null, CancellationToken ct = default);
    public override void ResetSequenceCounters();
}
```

## Companion TCP + UDP Usage Pattern (Shared `SessionState`)

On the server, `UdpListenerBase` authenticates UDP datagrams against an active TCP connection in `IConnectionHub` (`SessionToken` + `Secret` + `LocalPort` endpoint pinning). Share `tcpSession.State` when constructing `UdpSession`:

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;

TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57206
};

// 1. Connect TCP and complete the X25519 handshake
//    This populates tcp.State.Secret, tcp.State.SessionToken, and tcp.State.LocalPort
using TcpSession tcp = new(options);
await tcp.ConnectAsync();
await tcp.HandshakeAsync();

// 2. Create companion UdpSession sharing tcp.State
//    UdpSession.ConnectAsync automatically binds to tcp.State.LocalPort (ReuseAddress = true)
using UdpSession udp = new(options, tcp.State);
udp.OnMessageReceived += (_, lease) =>
{
    Console.WriteLine($"Received authenticated UDP datagram ({lease.Length} bytes)");
};

await udp.ConnectAsync();
await udp.SendAsync(new PlayerInputPacket { X = 12.5f, Y = 4.0f });
```

## Related APIs

- [Transport Session](./transport-session.md)
- [TCP Session](./tcp-session.md)
- [UDP Listener (Server)](../network/udp-listener.md)
- [Transport Options](../options/sdk/transport-options.md)
