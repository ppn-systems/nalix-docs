---
title: Serialization Benchmarks
description: Nalix features a custom binary serialization engine, LiteSerializer, designed for maximum throughput and minimal allocation in high-performance network transport.
section: Benchmarks
---

Nalix features a custom binary serialization engine, `LiteSerializer`, designed for maximum throughput and minimal allocation in high-performance network transport.

## LiteSerializer Performance

Detailed micro-benchmarks of standard serialization operations, including unmanaged structs, custom formatters, inline span fills, and formatter resolving.

| Method | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Serialize_Unmanaged_Small** | **11.3692 ns** | 0.6061 ns | 0.8091 ns | 12.387 ns | 0.0055 | - | - | 56 B |
| **Serialize_Unmanaged_Large** | **60.9115 ns** | 9.5825 ns | 12.7924 ns | 76.527 ns | 0.0530 | - | - | 536 B |
| **Deserialize_Unmanaged_Small** | **4.0649 ns** | 0.1476 ns | 0.1970 ns | 4.438 ns | - | - | - | 0 B |
| **Deserialize_Unmanaged_Large** | **16.6168 ns** | 0.5510 ns | 0.6968 ns | 17.877 ns | - | - | - | 0 B |
| **Serialize_Formatter** | **64.0497 ns** | 1.6643 ns | 2.1641 ns | 66.875 ns | 0.0197 | - | - | 152 B |
| **Deserialize_Formatter** | **78.7231 ns** | 3.0755 ns | 4.1057 ns | 84.189 ns | 0.0286 | - | - | 296 B |
| **Fill_IntoSpan_Small** | **1.1024 ns** | 0.1480 ns | 0.1976 ns | 1.439 ns | - | - | - | 0 B |
| **Fill_IntoSpan_Large** | **5.5824 ns** | 0.2336 ns | 0.3037 ns | 6.181 ns | - | - | - | 0 B |
| **Resolve_Formatter** | **0.9033 ns** | 0.1041 ns | 0.1316 ns | 1.171 ns | - | - | - | 0 B |

### Why Nalix Serialization?

- **Zero-Allocation Deserialization**: Deserialization of unmanaged structures (`Deserialize_Unmanaged_Small` and `Deserialize_Unmanaged_Large`) is fully allocation-free (0 B) and runs in single-digit to low double-digit nanoseconds.
- **Fast Path Span Fills**: Copying primitive data directly into target spans (`Fill_IntoSpan_Small`) takes approximately **1 nanosecond** (~1.10 ns) with zero overhead.
- **Direct Memory Blitting**: For unmanaged structs, `LiteSerializer` uses low-level memory block copying via the `Unsafe` class, producing CPU instructions that operate at raw hardware limits.
- **Aggressive Inlining**: Key methods in the serialization path are decorated with aggressive compilation attributes, allowing RyuJIT to inline and optimize out method call overhead.
