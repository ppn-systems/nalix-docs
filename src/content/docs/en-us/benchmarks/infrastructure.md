---
title: Core Infrastructure Benchmarks
description: Detailed performance metrics for the Nalix core runtime, including connection management, session storage, packet registration, and concurrency gates.
section: Benchmarks
---

Detailed performance metrics for the Nalix core runtime, including connection management, session storage, packet registration, and concurrency gates.

## Connection Hub

The `ConnectionHub` acts as the central registry for active socket connections.

| Method | Mean | Error | StdDev | Allocated |
| :--- | ---: | ---: | ---: | ---: |
| **GetConnection** | **3.633 ns** | 0.2432 ns | 0.3247 ns | 0 B |
| **RegisterAndUnregister** | 269.944 ns | 8.3769 ns | 8.9631 ns | 0 B |

:::note
`RegisterAndUnregister` was skipped in this run due to execution issues. It is currently under review for optimization.
:::

### Behind the design

- **Lock-Free Indexing**: The connection hub relies on high-performance concurrent collections and index arrays to handle concurrent registrations without global locks.
- **Fast Get Route**: Looking up a session by its long identifier takes less than 4 nanoseconds (~3.6 ns), ensuring that session retrieval is not a bottleneck in the inbound message loop.

---

## Connection Guard

The `ConnectionGuard` manages connection rate-limiting and connection-level IP blacklisting.

| Method | Mean | Error | StdDev | Allocated |
| :--- | ---: | ---: | ---: | ---: |
| **TryAccept_Allowed** | **66.53 ns** | 2.010 ns | 2.614 ns | 0 B |
| **TryAccept_Blacklisted** | **234.27 ns** | 8.412 ns | 11.230 ns | 0 B |

### Behind the design

- **IP-Based Blacklist Fast Path**: Blacklisted IPs are checked immediately using an optimized trie-like structure or hashset with absolutely zero allocations.
- **Quota Validation**: Accepting a connection requires checking current concurrency limits and sliding-window request limits, executing in ~67 ns with zero heap allocations.

---

## Session Store

The `SessionStore` maintains high-performance local user sessions.

| Method | Mean | Error | StdDev | Allocated |
| :--- | ---: | ---: | ---: | ---: |
| **StoreAndConsume** | **281.0 ns** | 7.89 ns | 10.26 ns | 48 B |

### Behind the design

- **Thread-Safe Session Maps**: Uses lock-free lookup maps allowing simultaneous read operations. Adding and consuming session metadata is optimized for cache-friendly layouts.

---

## Packet Registry

The `PacketRegistry` maps payload identifiers to concrete handler contracts.

| Method | Mean | Error | StdDev | Allocated |
| :--- | ---: | ---: | ---: | ---: |
| **TryDeserialize** | **5.700 ns** | 0.1906 ns | 0.2478 ns | 0 B |

### Behind the design

- **Zero-Allocation Deserialization Mapping**: Mapping an incoming packet type identifier to its deserialization logic is fully pre-compiled and cached. A resolution path executes in about 5.7 ns with true zero heap allocation (0 B).

---

## Dispatch Ready Queue

`DispatchChannel<TPacket>` hands a "connection has a packet ready" notification from the socket-completion callback to a dispatch worker once per message. That hand-off used `System.Threading.Channels.Channel<T>` (`SingleReader = false, SingleWriter = false`), even though the code only ever calls `TryWrite`/`TryRead` and never the async `ReadAsync`/`WaitToReadAsync` surface Channels exists to serve. Under that configuration, `Channel<T>` still takes a monitor lock on both write and read to keep its (unused) waiting-reader bookkeeping correct. It was replaced with a plain lock-free `ConcurrentQueue<T>`, which gives the same `TryWrite`/`TryRead`-shaped API without paying for machinery nothing calls.

| Method | Mean | Ratio | Allocated |
| :--- | ---: | ---: | ---: |
| **Channel\<T\> write+read, single thread** | 1.49 μs | 1.00 | 0 B |
| **ConcurrentQueue\<T\> write+read, single thread** | **0.47 μs** | **0.32** | 0 B |
| **Channel\<T\> write+read, producer/consumer threads** | 341.28 ns / op | 1.00 | 0 B |
| **ConcurrentQueue\<T\> write+read, producer/consumer threads** | **74.93 ns / op** | **0.22** | 1 B |

End-to-end, exercising `DispatchChannel<IPacket>.Push` → `TryClaim` → `TryDequeue` → `Release` directly (the real per-message path):

| Scenario | Before | After | Change |
| :--- | ---: | ---: | ---: |
| Single connection, no contention | 325.2 ns | **286.0 ns** | −12% |
| 64 connections pushed concurrently, drained | 68.75 μs | **60.11 μs** | −12.6% |

:::note
This is a real per-message win at the dispatch layer, but the dispatch channel is one of several hops in the full request path (OS socket round trip dominates end-to-end server CPU/op). Re-running the full echo comparison in [network-comparison.md](network-comparison.md) with only this change showed no difference outside normal run-to-run noise on this shared container — the improvement is real but too small a slice of total CPU/op to be visible at that scale.
:::

### Behind the design

- **No feature paid for, no feature used**: swapping the backing structure removed a lock acquisition on every enqueue/dequeue without changing behavior — the ready-queue never relied on `Channel<T>`'s blocking-reader semantics.
- **Numbers above vary run to run** by up to ~20% on this shared 4-vCPU container; the *ratio* between the two implementations is the stable signal, not the absolute nanosecond figures.

---

## Concurrency Gate & Throttling

Nalix uses a token bucket limiter and concurrency gates to prevent server overload and protect the hot-path.

### Token Bucket Limiter

| Method | Mean | Error | StdDev | P95 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Evaluate** | **120.1 ns** | 3.55 ns | 4.61 ns | 127.8 ns | 0 B |

### Policy Rate Limiter

| Method | Mean | Error | StdDev | P95 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Evaluate** | **149.2 ns** | 2.84 ns | 3.59 ns | 152.9 ns | 0 B |

### Optimization Strategy

- **Atomic CAS (Compare-And-Swap) Loops**: Throttling decisions are made using lock-free interlocked structures to perform atomic operations in nanoseconds.
- **Zero-Allocation Evaluation**: The `TokenBucket` evaluation runs without object allocation (0 B) in ~120 ns, allowing rate-limiting checks directly on high-frequency packets.
