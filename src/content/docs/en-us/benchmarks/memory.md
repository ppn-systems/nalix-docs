---
title: Memory & Storage Benchmarks
description: Nalix uses a highly optimized memory management subsystem designed to eliminate Garbage Collection (GC) pauses in high-throughput workloads.
section: Benchmarks
---

Nalix uses a highly optimized memory management subsystem designed to eliminate Garbage Collection (GC) pauses in high-throughput workloads.

## Buffer Pooling & Leases

Comparison of memory acquisition strategies across various sizes (64 B, 1 KB, and 16 KB).

### Buffer Allocation Metrics (Size = 64)

| Method | Mean | Error | StdDev | P95 | Ratio | Allocated | Alloc Ratio |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **16.578 ns** | 0.7459 ns | 0.9958 ns | 18.244 ns | 1.00 | 88 B | 1.00 |
| **ArrayPool_Shared** | **9.110 ns** | 0.2700 ns | 0.3415 ns | 9.604 ns | 0.55 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **35.959 ns** | 1.9918 ns | 2.5189 ns | 41.332 ns | 2.18 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **64.282 ns** | 3.8836 ns | 5.1845 ns | 73.644 ns | 3.89 | 0 B | 0.00 |

### Buffer Allocation Metrics (Size = 1024)

| Method | Mean | Error | StdDev | P95 | Ratio | Allocated | Alloc Ratio |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **121.806 ns** | 3.6228 ns | 4.8364 ns | 129.286 ns | 1.00 | 1048 B | 1.00 |
| **ArrayPool_Shared** | **9.500 ns** | 0.7683 ns | 0.9435 ns | 11.607 ns | 0.08 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **40.596 ns** | 2.5648 ns | 3.1498 ns | 46.851 ns | 0.33 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **60.421 ns** | 2.0328 ns | 2.6433 ns | 65.717 ns | 0.50 | 0 B | 0.00 |

### Buffer Allocation Metrics (Size = 16384)

| Method | Mean | Error | StdDev | P95 | Ratio | Allocated | Alloc Ratio |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **1,760.521 ns** | 92.5375 ns | 123.5349 ns | 1,968.484 ns | 1.005 | 16408 B | 1.00 |
| **ArrayPool_Shared** | **8.679 ns** | 0.3308 ns | 0.3810 ns | 9.197 ns | 0.005 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **38.340 ns** | 3.1783 ns | 4.2430 ns | 46.787 ns | 0.022 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **61.450 ns** | 3.6315 ns | 4.4598 ns | 70.845 ns | 0.035 | 0 B | 0.00 |

### Why Nalix Memory?

- **Pooled Array Rental (`BufferPoolManager`)**: `BufferPoolManager` wraps `ArrayPool<byte>.Shared` with atomic rent/return counters and optional leak-detection diagnostics (`BufferOptions.EnableBufferLeakDetection`), delivering 0 B allocation across all payload sizes.
- **Reference-Counted Lease Safety (`BufferLease`)**: `BufferLease` provides a pooled, reference-counted (`Retain()` / `Dispose()`) rental wrapper (`IBufferLease`) that keeps rent/dispose cycles allocation-free (0 B) while preventing premature buffer returns across async boundaries.

---

## Object Pooling

Memory metrics for reusing class instances via object pools.

| Method | Mean | Error | StdDev | P95 | Ratio | Allocated | Alloc Ratio |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **10.61 ns** | 0.420 ns | 0.561 ns | 11.57 ns | 1.00 | 32 B | 1.00 |
| **RentAndReturn_ObjectPool** | **80.44 ns** | 3.108 ns | 3.700 ns | 87.16 ns | 7.60 | 0 B | 0.00 |

### Behind the design

- **Object Reusability**: Reusing instances of complex structures (like session states, packet envelopes, and processing contexts) prevents Gen 0 GC thrashing.
- **Hybrid Fast-Path Architecture**:
    - **Thread-Local Cache**: First-level lock-free lookup caches object instances in thread-local storage (`ThreadLocalCache<T>`) for ultra-low latency reuse on the same thread.
    - **Type-Indexed Buckets**: When thread-local slots are empty or full, retrieval falls back to an array-backed lookup using compiled type IDs (`PoolType<T>.Id`) to bypass slow hashing or generic dictionary lookups.
- **Reset Logic**: To prevent state pollution across rentals, pooled objects implement a reset interface (`IPoolable`) that automatically wipes data and prepares the instance for reuse upon its return to the pool.
