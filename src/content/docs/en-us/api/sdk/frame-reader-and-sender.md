---
title: Frame Reader and Sender
description: Reference for internal TCP, UDP, and WebSocket frame readers and senders in Nalix.SDK.Transport.Internal — framing, fragmentation, MAC envelopes, and sequence counters.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK.Transport.Internal`, `Nalix.Environment.Sequencing`  
**Assembly:** `Nalix.SDK`

Each concrete session in `Nalix.SDK` delegates low-level wire I/O, fragmentation, `FramePipeline` transforms (LZ4 compression and AEAD encryption), and replay window validation to an internal reader/sender pair plus a lock-free `SequenceCounter`.

:::warning[Internal Transport Machinery]
`TcpFrameReader`, `TcpFrameSender`, `UdpFrameReader`, `UdpFrameSender`, `WsFrameReader`, and `WsFrameSender` are `internal sealed` types. Application code interacts with them through [TcpSession](./tcp-session.md), [UdpSession](./udp-session.md), and [WebSocketSession](./websocket-session.md).
:::

## Source Mapping

- `src/Nalix.SDK/Transport/Internal/Tcp/TcpFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Tcp/TcpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameSender.cs`
- `src/Nalix.Environment/Sequencing/SequenceCounter.cs`

## Transport Framing Comparison

| Transport | Reader / Sender | Wire Framing | Fragmentation | Replay / Sequence Protection |
| :--- | :--- | :--- | :--- | :--- |
| **TCP** (`TcpSession`) | `TcpFrameReader` / `TcpFrameSender` | 2-byte little-endian `ushort` total frame length prefix (`HeaderSize = 2`) | Outbound `FragmentHeader` chunking (`>= MaxChunkSize`) / Inbound `FragmentAssembler` | `SequenceCounter.IsValid(seq, TcpWindow)` (`1024`-bit sliding window) |
| **UDP** (`UdpSession`) | `UdpFrameReader` / `UdpFrameSender` | `[8B SessionToken (outbound)][Payload][4B XxHash32 MAC]` (`<= MaxUdpDatagramSize`) | None (single datagram MTU guard) | `SequenceCounter.IsValid(seq, UdpWindow)` (`512`-bit sliding window) |
| **WebSocket** (`WebSocketSession`) | `WsFrameReader` / `WsFrameSender` | `WebSocketMessageType.Binary` (`EndOfMessage` frames) | Inbound `FragmentAssembler` (outbound sends complete binary WebSocket messages directly) | `SequenceCounter.IsValid(seq, TcpWindow)` (`1024`-bit sliding window) |

## Outbound & Inbound Transform Pipeline

```mermaid
flowchart LR
    subgraph Outbound["Outbound (Tcp/Udp/WsFrameSender)"]
        P1["Serialized BufferLease"] --> P2["FramePipeline.ProcessOutbound<br/>(LZ4 Compress -> AEAD Encrypt with SequenceCounter.Next())"]
        P2 --> P3["FragmentHeader Chunking (TCP if >= MaxChunkSize)<br/>or 8B Token + 4B XxHash32 MAC (UDP)"]
        P3 --> P4["Socket / ClientWebSocket Send"]
    end

    subgraph Inbound["Inbound (Tcp/Udp/WsFrameReader)"]
        R1["Socket / ClientWebSocket Receive"] --> R2["FragmentAssembler (TCP/WS)<br/>or 4B XxHash32 MAC Check (UDP)"]
        R2 --> R3["FramePipeline.ProcessInbound<br/>(AEAD Decrypt -> LZ4 Decompress)"]
        R3 --> R4["SequenceCounter.IsValid(seq, window)"]
        R4 --> R5["HandleReceiveMessage(IBufferLease)"]
    end
```

### Key Internal Invariants

1. **Serialized Outbound Sends**: `TcpFrameSender` and `WsFrameSender` guard socket writes with a `SemaphoreSlim(1, 1)` (`_sendLock`) so concurrent `SendAsync` callers never interleave frames or fragment chunks on the stream.
2. **Symmetric Compress-then-Encrypt**: Outbound frames run `FramePipeline.ProcessOutbound` (compressing payloads $\ge$ `CompressionOptions.MinSizeToCompress` before AEAD encryption when `encrypt == true`), while inbound frames run `FramePipeline.ProcessInbound` (decrypting `PacketFlags.ENCRYPTED` before decompressing `PacketFlags.COMPRESSED`).
3. **`SequenceCounter` Replay Window**: Tracks the 32-bit transport sequence number embedded in encrypted frames and rejects duplicate or out-of-window packets before they reach `OnMessageReceived`.

## Related APIs

- [TCP Session](./tcp-session.md)
- [UDP Session](./udp-session.md)
- [WebSocket Session](./websocket-session.md)
- [Packet Compression](../codec/frame-pipeline.md)
- [AEAD Ciphers](../security/aead-and-envelope.md)
