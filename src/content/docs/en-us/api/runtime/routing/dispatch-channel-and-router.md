---
title: Dispatch Channel and Router
description: Reference for PacketDispatcherBase<TPacket> and the internal DispatchChannel<TPacket> actor-mailbox queue in Nalix.Runtime.
section: API Reference
package: Nalix.Runtime
---

**Namespaces:** `Nalix.Runtime.Dispatching`, `Nalix.Runtime.Internal.Routing`  
**Assembly:** `Nalix.Runtime`

This page documents `PacketDispatcherBase<TPacket>` (the abstract base class for packet dispatchers) and `DispatchChannel<TPacket>` (the priority-aware, per-connection actor-mailbox queue used by `PacketDispatchChannel`).

## Source Mapping

- `src/Nalix.Runtime/Dispatching/PacketDispatcherBase.cs`
- `src/Nalix.Runtime/Dispatching/PacketDispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/WorkerWakeSignal.cs`

## 1. `PacketDispatcherBase<TPacket>`

```csharp
namespace Nalix.Runtime.Dispatching;

public abstract class PacketDispatcherBase<TPacket> where TPacket : IPacket
{
    protected PacketDispatchOptions<TPacket> Options { get; }

    protected PacketDispatcherBase(PacketDispatchOptions<TPacket> options);
    protected PacketDispatcherBase(Action<PacketDispatchOptions<TPacket>>? configure = null);
}
```

- Holds the configured `PacketDispatchOptions<TPacket>` instance (`Options`) for subclasses such as `PacketDispatchChannel`.
- Throws `ArgumentNullException` if `options` is `null`.

## 2. `DispatchChannel<TPacket>` (`internal sealed`)

`DispatchChannel<TPacket>` (`internal sealed class DispatchChannel<TPacket> : IDispatchChannel<TPacket>, IDisposable where TPacket : IPacket`) implements the connection-isolated, weighted round-robin priority queue backing `PacketDispatchChannel`.

### Key Members

| Member | Visibility | Type / Signature | Description |
| :--- | :---: | :--- | :--- |
| `TotalPackets` | `public` | `long` | Current number of packets queued across all connections. |
| `PeakPackets` | `public` | `long` | High-water mark of queued packets observed since startup. |
| `HasPacket` | `public` | `bool` | Returns `true` when `TotalPackets > 0`. |
| `Push` | `public` | `void Push(IConnection connection, IBufferLease raw)` | Enqueues `raw` under `connection` (blocking when `DropPolicy == DropPolicy.Block`). |
| `TryClaim` | `public` | `bool TryClaim([NotNullWhen(true)] out IDispatchSession session)` | Claims exclusive processing rights over the next ready connection's mailbox using weighted round-robin priority budgets. |
| `PushCore` | `internal` | `bool PushCore(IConnection connection, IBufferLease raw, out bool readyEmitted, bool noBlock = false)` | Non-blocking enqueue path used by `PacketDispatchChannel.HandlePacket`; sets `readyEmitted = true` when the connection transitions to ready. |
| `TotalConnections` | `public` | `int` | Number of active connection states currently tracked in the sharded bucket table. |
| `ReadyConnections` | `public` | `int` | Number of connections currently waiting in the ready queues. |
| `TotalEvicted` | `public` | `long` | Total number of packets evicted due to `DropOldest` or `Coalesce`. |

### Architectural Highlights

1. **Sharded Lock-Free State Lookup**: Connection mailboxes (`ConnectionState`) are stored in power-of-two hash buckets (`_stateBuckets`, sized from `Environment.ProcessorCount * BucketCountMultiplier` clamped to `[MinBucketCount, MaxBucketCount]`). Looking up an existing connection's mailbox on the packet hot path is lock-free; tombstone slots are recycled in place when connections disconnect.
2. **5 Priority Levels with Weighted Round-Robin (`PriorityWeights`)**: Each connection state maintains 5 priority queues (`PacketPriority.NONE = 0` through `PacketPriority.URGENT = 4`). Ready connections are dequeued across priorities using configurable weights (default `"1,2,4,8,16"`), ensuring `URGENT` packets are served $16\times$ more frequently than `NONE` without starving lower priorities.
3. **Per-Connection Queue Bounds (`MaxPerConnectionQueue`)**: Bounds each connection's backlog (default `4096`) and applies `DropPolicy.DropNewest`, `DropOldest`, `Coalesce`, or `Block`.
4. **Automatic Disconnect Cleanup**: Subscribes to `IConnectionHub.ConnectionUnregistered` so queued `IBufferLease` instances for a disconnected client are drained and disposed automatically.

## Related APIs

- [Dispatch Contracts](./dispatch-contracts.md)
- [Packet Dispatch (PacketDispatchChannel)](./packet-dispatch.md)
- [Dispatch Options](../../options/runtime/dispatch-options.md)
- [Packet Dispatch Options](../../options/runtime/packet-dispatch-options.md)
