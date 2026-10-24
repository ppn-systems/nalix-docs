---
title: Socket Connection
description: Reference for Nalix.Network.Internal.Transport.SocketConnection — internal SAEA framed TCP receive/send engine supporting UInt16 length-prefixed and VarInt framing, fragmentation, and Layer 1 throttling.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Internal.Transport`  
**Assembly:** `Nalix.Network`

`SocketConnection` (`internal sealed partial class SocketConnection : IDisposable, IPoolable`) is the internal framed TCP transport engine backing `Connection.TCP` (`SocketTcpTransport`). It uses pooled `PooledSocketReceiveContext` (`SocketAsyncEventArgs`) instances, `BufferLease` byte-array pools, and multi-mode framing to sustain 10,000+ concurrent connections with zero per-packet heap allocations.

:::warning[Internal Implementation Type]
`SocketConnection` is `internal sealed` and is not directly referenced by application code. Application code interacts with TCP sockets through `IConnection` and `connection.TCP` (`IConnection.ITransport`).
:::

## Source Mapping

- `src/Nalix.Network/Internal/Transport/SocketConnection.cs`
- `src/Nalix.Network/Internal/Transport/SocketConnection.Framing.cs`
- `src/Nalix.Network/Internal/Transport/SocketConnection.Receive.VarInt.cs`
- `src/Nalix.Network/Internal/Transport/SocketConnection.Send.cs`
- `src/Nalix.Network/Internal/Transport/SocketConnection.Send.VarInt.cs`
- `src/Nalix.Network/Internal/Transport/SocketTcpTransport.cs`
- `src/Nalix.Network/Options/NetworkCallbackOptions.cs`
- `src/Nalix.Network/Options/VarIntFramingOptions.cs`

## Architectural Receive & Send Pipeline

```mermaid
flowchart TD
    subgraph RxPipeline["Inbound Receive Loop (PooledSocketReceiveContext)"]
        Sock["TCP Socket"] --> Framing{"TransportFraming Mode?"}
        Framing -->|UInt16LengthPrefixed| Len16["Read 2-Byte LE Length Header"]
        Framing -->|VarIntLengthPrefixed| VarInt["Read 1-to-5-Byte VarInt Length (MaxPayloadSize = 128 KB)"]
        Framing -->|None| Raw["Deliver Raw Chunk"]
        Len16 --> Frag
        VarInt --> Frag
        Raw --> Frag
        Frag{"FragmentHeader Present?"}
        Frag -->|Yes| Assem["FragmentAssembler (<= MaxPerConnectionOpenFragmentStreams)"]
        Frag -->|No| Owner["Connection.OnFrameReceived(lease)"]
        Assem -->|Reassembled| Owner
        Owner --> Inline{"AsyncCallback.CanRunInline(MessageProcessing)?"}
        Inline -->|Yes| RunInline["AsyncCallback.InvokeInline (Zero-Queue Fast Path)"]
        Inline -->|No| Gate{"PendingProcessCallbacks <= MaxPerConnectionPendingPackets?"}
        Gate -->|"No (Overflow)"| Overflow{"OverflowPolicy?"}
        Overflow -->|DropPacket| Drop["IncrementPacketsDropped + Drop Frame"]
        Overflow -->|Disconnect| Disc["Disconnect Connection"]
        Gate -->|Yes| Dispatch["AsyncCallback.Invoke(CallbackLane.Process)"]
    end
```

## Key Technical Responsibilities

### 1. Multi-Mode Transport Framing (`TransportFraming`)

Configured via `connection.TCP.UseFraming(this.Framing)` during `Protocol.OnAccept` (locked once `BeginReceive` starts):

| Mode | Wire Prefix | Max Frame Size | Source File |
| :--- | :--- | :--- | :--- |
| `TransportFraming.UInt16LengthPrefixed` (default) | 2-byte little-endian `ushort` total frame length | `65,535` bytes (larger payloads use `FragmentStream`) | `SocketConnection.Framing.cs` |
| `TransportFraming.VarIntLengthPrefixed` | 1-to-5-byte LEB128 VarInt payload length | `VarIntFramingOptions.MaxPayloadSize` (`131,072` bytes / 128 KB) | `SocketConnection.Receive.VarInt.cs`, `SocketConnection.Send.VarInt.cs` |
| `TransportFraming.None` | Unframed stream chunks | Bounded by receive buffer | `SocketConnection.cs` |

### 2. Layer 1 Per-Connection Throttle & `OverflowPolicy` (`Connection.OnFrameReceived`)

When `SocketConnection.PROCESS_FRAME_FROM_BUFFER` completes a frame (or reassembles all chunks via `FragmentAssembler`), it calls `_connectionOwner?.OnFrameReceived(lease)` on the owning `Connection`:

- **Inline Fast Path (`AsyncCallback.CanRunInline`)**: If `MessageProcessing` has a single subscriber bound to an `IFrameProcessor` with `SupportsInlineProcessing == true`, `Connection.OnFrameReceived` executes `AsyncCallback.InvokeInline(...)` synchronously on the receive completion thread without queuing.
- **Per-Connection Throttle**: Otherwise, `Connection.OnFrameReceived` increments `backing.PendingProcessCallbacks` and checks `NetworkCallbackOptions.MaxPerConnectionPendingPackets` (default `16`):
  - When `OverflowPolicy == NetworkOverflowPolicy.DropPacket` (default): increments `PacketsDropped`, rolls back `PendingProcessCallbacks`, disposes the lease, and discards the frame before it touches the `ThreadPool`.
  - When `OverflowPolicy == NetworkOverflowPolicy.Disconnect`: rolls back the counter, disposes the lease, and immediately calls `Disconnect()` on the flooding peer.
  - When within budget: acquires a pooled `ConnectionEventArgs` and dispatches via `AsyncCallback.Invoke(..., CallbackLane.Process, releasePendingPacketOnCompletion: true)`.

### 3. Automatic Fragmentation & Reassembly (`FragmentAssembler`)

- **Outbound**: Payloads exceeding `FragmentOptions.MaxChunkSize` are split across multiple frames prefixed with a `FragmentHeader`.
- **Inbound**: `SocketConnection` reassembles fragmented streams via `FragmentAssembler`, enforcing `NetworkCallbackOptions.MaxPerConnectionOpenFragmentStreams` (default `4`) and evicting expired partial streams on each receive cycle.

### 4. Pre-Read Buffer Injection (`InjectPreReadBytes`)

When `TcpListenerBase` or `WebSocketListenerBase` reads initial bytes during PROXY Protocol v1/v2 or HTTP Upgrade parsing, any trailing payload bytes already read from the socket are injected into `SocketConnection` via `InjectPreReadBytes(ReadOnlySpan<byte>)` so they are processed before the next OS socket read.

## Related APIs

- [Connection](./connection/connection.md)
- [Connection Events](./connection/connection-events.md)
- [Protocol](./protocol.md)
- [Network Callback Options](../options/network/network-callback-options.md)
