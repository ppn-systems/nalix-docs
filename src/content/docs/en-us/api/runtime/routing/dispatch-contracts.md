---
title: Dispatch Contracts
description: Reference for IPacketDispatch, IDispatchChannel<TPacket>, and IDispatchSession in Nalix.Runtime.Dispatching.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Dispatching`  
**Assembly:** `Nalix.Runtime`

This page covers the public dispatch contracts in `Nalix.Runtime.Dispatching`: `IPacketDispatch`, `IDispatchChannel<TPacket>`, and `IDispatchSession`.

## Source Mapping

- `src/Nalix.Runtime/Dispatching/IPacketDispatch.cs`
- `src/Nalix.Runtime/Dispatching/IDispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`

## 1. `IPacketDispatch`

```csharp
namespace Nalix.Runtime.Dispatching;

public interface IPacketDispatch : IActivatable, IReportable
{
    void HandlePacket(IBufferLease lease, IConnection connection);
}
```

`IPacketDispatch` is the entry-point interface between network listeners (`Nalix.Network`) and the runtime execution layer (`Nalix.Runtime`):

- **`void HandlePacket(IBufferLease lease, IConnection connection)`**: Accepts an inbound decrypted/decompressed frame `lease` from `connection`. The implementation (`PacketDispatchChannel`) calls `lease.Retain()` before enqueuing so the transport caller can safely dispose its own lease reference immediately upon return.
- **`IActivatable`**: Exposes `Activate(CancellationToken)` and `Deactivate(CancellationToken)` to start and stop background dispatch worker loops.
- **`IReportable`**: Exposes `GenerateReport()` and `WriteReportData(Utf8JsonWriter)` for runtime telemetry.

## 2. `IDispatchChannel<TPacket>` and `IDispatchSession`

```csharp
namespace Nalix.Runtime.Dispatching;

public interface IDispatchSession : IDisposable
{
    IConnection Connection { get; }
    bool TryDequeue([NotNullWhen(true)] out IBufferLease raw);
}

public interface IDispatchChannel<TPacket> where TPacket : IPacket
{
    long TotalPackets { get; }
    void Push(IConnection connection, IBufferLease raw);
    bool TryClaim([NotNullWhen(true)] out IDispatchSession session);
}
```

### Why `IDispatchSession` Exists (Actor-Mailbox Model)

Instead of allowing multiple worker threads to dequeue packets from the same connection concurrently (which would reorder packets from the same client), `IDispatchChannel<TPacket>` uses an **actor-mailbox claim model**:

1. A worker calls `TryClaim(out IDispatchSession session)` to acquire exclusive processing rights over one ready connection's mailbox.
2. While holding `session`, no other worker can claim that connection. The worker drains up to `_maxDrainPerWake` packets in priority order (`URGENT` $\rightarrow$ `NONE`) via `session.TryDequeue(out IBufferLease raw)`.
3. Disposing `session` (`session.Dispose()`) releases the claim and automatically re-queues the connection into the ready ring if pending packets remain.

## Related APIs

- [Packet Dispatch (PacketDispatchChannel)](./packet-dispatch.md)
- [Dispatch Channel and Router](./dispatch-channel-and-router.md)
- [Packet Context](./packet-context.md)
- [Dispatch Options](../../options/runtime/dispatch-options.md)
