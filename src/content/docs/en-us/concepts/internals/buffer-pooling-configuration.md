---
title: Buffer Pooling
description: Buffer pooling is the cornerstone of Nalix's zero-allocation architecture. BufferPoolManager wraps ArrayPool<byte>.Shared with configurable leak detection and stack-trace tracking via BufferOptions.
section: Concepts
---

Buffer pooling is the cornerstone of Nalix's zero-allocation architecture. By reusing pooled `byte[]` arrays through `BufferPoolManager` and `BufferLease`, Nalix eliminates Gen 0 GC churn and provides optional leak detection during development and staging.

---

## 1. How it Works

Nalix combines .NET's `ArrayPool<byte>.Shared` with a pooled reference-counted wrapper (`BufferLease`) and an optional leak tracker (`BufferPoolManager`):

- **`BufferPoolManager`**: Implements `IBufferPoolManager` over `ArrayPool<byte>.Shared`, recording rent/return counters and tracking unreturned buffers when `BufferOptions.EnableBufferLeakDetection` is enabled.
- **`BufferLease`**: The lightweight reference-counted shell (`IBufferLease`) rented from `ObjectPoolManager` to slice, retain, and deterministically return a `byte[]` buffer on `Dispose()`.
- **`BufferOptions`**: Controls leak detection (`EnableBufferLeakDetection`), stack-trace capture (`EnableBufferLeakStackTrace`), and the overdue threshold (`SuspiciousThresholdSeconds`, default `30` seconds).

---

## 2. Configuration via Hosting Builder

You can configure `BufferOptions` (`[Buffer]` INI section) or register a custom `BufferPoolManager` on `NetworkApplicationBuilder`:

### Basic Setup

```csharp
using Nalix.Hosting;
using Nalix.Framework.Memory.Buffers;
using Nalix.Framework.Options;

var app = NetworkApplication.CreateBuilder()
    .Configure<BufferOptions>(options =>
    {
        options.EnableBufferLeakDetection = true;
        options.EnableBufferLeakStackTrace = false;
        options.SuspiciousThresholdSeconds = 30;
    })
    .Build();
```

---

## 3. Configuration via `.ini` Files

In production or staging, tune `BufferOptions` in `assets/config.ini` under the `[Buffer]` section:

```ini
[Buffer]
EnableBufferLeakDetection = false
EnableBufferLeakStackTrace = false
SuspiciousThresholdSeconds = 30
```

---

## 4. Using the Pool in Handlers

Once configured, the entire framework (Protocols, Serializers, Handlers) uses this pool automatically. You can also use it manually for custom logic:

```csharp
[PacketOpcode(0x1001)]
public async ValueTask HandleLargeData(IPacketContext<MyPacket> context)
{
    // Rent a buffer from the configured pool
    using var lease = BufferLease.Rent(4096);
    
    // Perform zero-allocation operations...
    int written = DoWork(lease.SpanFull);
    lease.CommitLength(written);
    
    await context.Connection.TCP.SendAsync(lease.Memory);
}
```

---

## 5. Monitoring Pool Health

To ensure your buffers are returned deterministically without leaks, inspect `BufferPoolManager.GenerateReport()`:

```csharp
// Get a diagnostic report of rented/returned buffers and any overdue leaks
string report = manager.GenerateReport();
Console.WriteLine(report);
```

### Key Metrics to Watch:
| Metric | Description |
| :--- | :--- |
| **Total Rents / Returns** | Cumulative `ArrayPool<byte>.Shared` rent and return operations tracked by `BufferPoolManager`. |
| **Outstanding Buffers** | Number of currently rented buffers that have not yet been returned. |
| **Suspicious Leaks** | Buffers held longer than `BufferOptions.SuspiciousThresholdSeconds` (when `EnableBufferLeakDetection = true`). |

---

## Related Information

- [Buffer Management API](../../api/environment/memory/buffer-management.md)
- [Zero-Allocation Hot Path](./zero-allocation.md)
- [Server Blueprint](../../guides/getting-started/server-blueprint.md)
