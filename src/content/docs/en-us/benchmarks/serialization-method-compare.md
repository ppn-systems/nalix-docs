---
title: Serialization Method Comparison
description: Detailed method-level comparison for SerializerComparisonBenchmarks, including compared libraries, API mapping, performance snapshots, and detailed metrics.
section: Benchmarks
---

Detailed method-level comparison for `SerializerComparisonBenchmarks`, including compared libraries, API mapping, performance snapshots, and detailed metrics.

## Compared Libraries & APIs

| Library | Benchmark Method | Simplified API Signature |
| :--- | :--- | :--- |
| **LiteSerializer** | `LiteSerializer_Serialize` | `LiteSerializer.Serialize(payload)` |
| **LiteSerializer** | `LiteSerializer_Serialize_Span` | `LiteSerializer.Serialize(payload, span)` |
| **LiteSerializer** | `LiteSerializer_Deserialize` | `LiteSerializer.Deserialize<BenchPayload>(bytes)` |
| **MemoryPack** | `MemoryPack_Serialize` | `MemoryPackSerializer.Serialize(payload)` |
| **MemoryPack** | `MemoryPack_Serialize_Span` | `MemoryPackSerializer.Serialize(writer, payload)` |
| **MemoryPack** | `MemoryPack_Deserialize` | `MemoryPackSerializer.Deserialize<BenchPayload>(bytes)` |
| **MessagePack** | `MessagePack_Serialize` | `MessagePackSerializer.Serialize(payload)` |
| **MessagePack** | `MessagePack_Deserialize` | `MessagePackSerializer.Deserialize<BenchPayload>(bytes)` |
| **System.Text.Json** | `SystemTextJson_Serialize` | `JsonSerializer.SerializeToUtf8Bytes(payload)` |
| **System.Text.Json** | `SystemTextJson_Deserialize` | `JsonSerializer.Deserialize<BenchPayload>(bytes)` |

---

## Performance Snapshot

Overview of the fastest serialization and deserialization methods at different payload scales (16, 128, and 1024 items).

| Item Count | Fastest Serialize | Fastest Deserialize | Notes |
| :--- | :--- | :--- | :--- |
| **16** | MemoryPack Span (27.62 ns) | **LiteSerializer (94.21 ns)** | LiteSerializer Span is close at 32.68 ns. MemoryPack deserialization is 95.42 ns. |
| **128** | MemoryPack Span (31.93 ns) | **MemoryPack (125.61 ns)** | LiteSerializer Span is 40.74 ns. LiteSerializer deserialization is 129.40 ns. |
| **1024** | MemoryPack Span (63.95 ns) | **MemoryPack (520.13 ns)** | LiteSerializer Span is 66.77 ns. LiteSerializer deserialization is 560.94 ns. |

---

## Detailed Results

Full metrics comparison across all libraries and payload sizes from the BenchmarkDotNet reports.

### Detailed Results (Item Count = 16)

| Method | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **82.66 ns** | 3.635 ns | 4.852 ns | 89.34 ns | 0.0209 | - | - | 216 B |
| **LiteSerializer_Serialize_Span** | **32.68 ns** | 0.993 ns | 1.219 ns | 35.41 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **68.29 ns** | 3.336 ns | 4.097 ns | 73.86 ns | 0.0210 | - | - | 216 B |
| **MemoryPack_Serialize_Span** | **27.62 ns** | 0.212 ns | 0.260 ns | 27.95 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **128.23 ns** | 6.661 ns | 8.892 ns | 144.26 ns | 0.0162 | - | - | 168 B |
| **SystemTextJson_Serialize** | **328.40 ns** | 13.418 ns | 15.974 ns | 345.63 ns | 0.0606 | 0.0005 | 0.0005 | - |
| **LiteSerializer_Deserialize** | **94.21 ns** | 9.788 ns | 13.067 ns | 113.90 ns | 0.0398 | - | - | 408 B |
| **MemoryPack_Deserialize** | **95.42 ns** | 8.377 ns | 11.183 ns | 117.35 ns | 0.0423 | - | - | 440 B |
| **MessagePack_Deserialize** | **221.21 ns** | 10.596 ns | 13.013 ns | 250.02 ns | 0.0427 | - | - | 440 B |
| **SystemTextJson_Deserialize** | **673.13 ns** | 27.196 ns | 36.306 ns | 725.86 ns | 0.0963 | - | - | 1008 B |

### Detailed Results (Item Count = 128)

| Method | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **131.85 ns** | 5.044 ns | 6.733 ns | 142.19 ns | 0.0651 | - | - | 664 B |
| **LiteSerializer_Serialize_Span** | **40.74 ns** | 4.379 ns | 5.694 ns | 50.44 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **136.24 ns** | 9.738 ns | 12.662 ns | 153.69 ns | 0.0656 | - | - | 664 B |
| **MemoryPack_Serialize_Span** | **31.93 ns** | 1.204 ns | 1.566 ns | 34.62 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **589.64 ns** | 35.849 ns | 45.338 ns | 670.62 ns | 0.0515 | 0.0019 | 0.0019 | 504 B |
| **SystemTextJson_Serialize** | **1,053.47 ns** | 20.530 ns | 26.695 ns | 1,098.57 ns | 0.1011 | - | - | 1056 B |
| **LiteSerializer_Deserialize** | **129.40 ns** | 5.980 ns | 7.983 ns | 140.65 ns | 0.0834 | - | - | 856 B |
| **MemoryPack_Deserialize** | **125.61 ns** | 5.380 ns | 7.182 ns | 137.86 ns | 0.0861 | - | - | 888 B |
| **MessagePack_Deserialize** | **1,253.77 ns** | 15.724 ns | 19.885 ns | 1,285.08 ns | 0.1011 | 0.0038 | 0.0038 | 756 B |
| **SystemTextJson_Deserialize** | **2,803.45 ns** | 61.531 ns | 80.008 ns | 2,936.14 ns | 0.1945 | - | - | 1976 B |

### Detailed Results (Item Count = 1024)

| Method | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **635.32 ns** | 59.771 ns | 79.793 ns | 742.61 ns | 0.4320 | - | - | 4280 B |
| **LiteSerializer_Serialize_Span** | **66.77 ns** | 2.590 ns | 3.368 ns | 72.72 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **596.89 ns** | 59.851 ns | 79.900 ns | 704.40 ns | 0.4148 | - | - | 4248 B |
| **MemoryPack_Serialize_Span** | **63.95 ns** | 2.338 ns | 2.872 ns | 70.28 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **3,441.28 ns** | 76.391 ns | 96.610 ns | 3,577.63 ns | 0.6256 | - | - | 3192 B |
| **SystemTextJson_Serialize** | **6,857.65 ns** | 198.419 ns | 264.884 ns | 7,280.58 ns | 1.0834 | 0.0153 | 0.0153 | 5467 B |
| **LiteSerializer_Deserialize** | **560.94 ns** | 49.466 ns | 66.036 ns | 637.99 ns | 0.4473 | 0.0029 | - | 4440 B |
| **MemoryPack_Deserialize** | **520.13 ns** | 42.213 ns | 54.889 ns | 611.51 ns | 0.4473 | 0.0029 | - | 4472 B |
| **MessagePack_Deserialize** | **9,787.84 ns** | 176.575 ns | 229.597 ns | 10,096.09 ns | 0.5798 | - | - | 4472 B |
| **SystemTextJson_Deserialize** | **20,289.59 ns** | 606.374 ns | 809.492 ns | 21,641.24 ns | 0.9766 | 0.0305 | 0.0305 | - |

---

## Key Takeaways

- **LiteSerializer vs. MemoryPack**: `LiteSerializer` and `MemoryPack` are close. They are roughly level at 16 items, while `MemoryPack` is slightly faster in deserialization at 128 and 1024 items:
    - **Deserialization**: 94.21 ns vs 95.42 ns for 16 items; 129.40 ns vs 125.61 ns for 128 items; 560.94 ns vs 520.13 ns for 1024 items.
    - **Serialization**: `LiteSerializer_Serialize_Span` delivers zero heap allocation (0 B) and runs close to `MemoryPack_Serialize_Span` (32.68 ns vs 27.62 ns at 16; 40.74 ns vs 31.93 ns at 128; 66.77 ns vs 63.95 ns at 1024).
- **MessagePack & JSON**: `LiteSerializer` is substantially faster than `MessagePack` (about 2x-17x in deserialization) and `System.Text.Json` (about 7x-36x in deserialization).
