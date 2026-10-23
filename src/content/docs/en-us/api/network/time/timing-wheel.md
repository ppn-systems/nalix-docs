---
title: Timing Wheel
description: Reference for Nalix.Network.Internal.Time.TimingWheel — hashed wheel timer with doubly-linked buckets and striped locks for O(1) idle connection timeout management.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Internal.Time`  
**Assembly:** `Nalix.Network`

`TimingWheel` (`[Injectable] internal sealed class TimingWheel : IActivatable`) is an ultra-lightweight **Hashed Wheel Timer** that monitors registered `IConnection` instances and disconnects connections whose idle duration (`Clock.UnixMillisecondsNow() - conn.LastPingTime`) reaches `conn.IdleTimeoutMs` (default `TimingWheelOptions.IdleTimeoutMs = 60,000` ms).

## Source Mapping

- `src/Nalix.Network/Internal/Time/TimingWheel.cs`
- `src/Nalix.Network/Internal/Time/TimingWheelMetrics.cs`
- `src/Nalix.Network/Options/TimingWheelOptions.cs`

## Hashed Wheel Architecture

```mermaid
flowchart TD
    subgraph Wheel["TimingWheelBucket[] (BucketCount = 512)"]
        B0["Bucket 0 (Doubly-Linked List + Lock)"]
        B1["Bucket 1 (Doubly-Linked List + Lock)"]
        BN["Bucket N - 1"]
    end

    subgraph Worker["Background PeriodicTimer Loop (TickDuration = 1000ms)"]
        Tick["Advance Tick & Catch-up Missed Ticks"]
        Drain["Process Current Bucket"]
        CheckVer{"task.Version == conn.TimeoutVersion?"}
        CheckRounds{"task.Rounds > 0?"}
        CheckIdle{"idleMs >= conn.IdleTimeoutMs?"}
        Disc["conn.Disconnect() + Return TimeoutTask"]
        Resched["Recompute Remaining Ticks & Re-enqueue"]
    end

    Tick --> Drain --> CheckVer
    CheckVer -->|No (Stale)| Pool["Return TimeoutTask to ObjectPool"]
    CheckVer -->|Yes| CheckRounds
    CheckRounds -->|Yes| Dec["task.Rounds-- (Stay in Bucket)"]
    CheckRounds -->|No| CheckIdle
    CheckIdle -->|Yes| Disc
    CheckIdle -->|No| Resched --> Wheel
```

## Key Internal Mechanisms

### 1. Doubly-Linked Buckets (`TimingWheelBucket`) & Striped Connection Locks

- The wheel allocates `BucketCount` (`512`) `TimingWheelBucket` slots. When `BucketCount` is a power of two, bucket indices are computed via bitmask (`(int)(targetTick & _mask)`).
- Each bucket maintains a doubly-linked list of pooled `TimeoutTask` nodes guarded by a per-bucket monitor lock (`lock (bucket)`), supporting $O(1)$ insertion and removal.
- Connection registration and unregistration synchronize per connection using a power-of-two striped lock array (`_connectionLocks`) plus `ITimeoutTrackedConnection.TimeoutVersion` and `TimeoutTask` properties directly on `Connection` / `WebSocketConnection` / `PassthroughConnection`.

### 2. Instant Reference Breaking on Disposal

When a `Connection` is disposed, `PerformDestructiveCleanup()` immediately breaks the reference from `TimeoutTask.Conn` (`task.Conn = null`), allowing the garbage collector to reclaim the `Connection` immediately without waiting for the wheel pointer to rotate to that bucket.

### 3. Reference-Counted Activation (`Activate` / `Deactivate`)

Multiple listeners (`TcpListenerBase`, `WebSocketListenerBase`, `UdpPassthroughListener`) share the singleton `TimingWheel`. `Activate` increments `_activeListeners` and starts the background `TaskManager` worker on the first listener; `Deactivate` decrements `_activeListeners` and stops/drains the wheel when the last listener shuts down (waiting up to `TimingWheelOptions.WheelDrainTimeoutMs = 5000` ms).

## Configuration (`TimingWheelOptions`)

| Property | Default | Validation | Description |
| :--- | ---: | :--- | :--- |
| `BucketCount` | `512` | `[ValueRange(1, int.MaxValue)]` | Number of wheel slots (power-of-two values enable bitmask indexing). |
| `TickDuration` | `1000` | `[ValueRange(1, int.MaxValue)]` | Tick interval in milliseconds for the `PeriodicTimer` loop. |
| `IdleTimeoutMs` | `60_000` | `[ValueRange(1, int.MaxValue)]` | Default connection idle timeout in milliseconds before auto-disconnect. |
| `WheelDrainTimeoutMs` | `5000` | `[ValueRange(0, 60000)]` | Maximum graceful drain wait in milliseconds during shutdown. |

## Related APIs

- [Timing Wheel Options](../../options/network/timing-wheel-options.md)
- [Connection](../connection/connection.md)
- [TCP Listener](../tcp-listener.md)
