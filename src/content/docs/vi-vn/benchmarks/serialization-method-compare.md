---
title: So sánh phương thức tuần tự hóa
description: So sánh chi tiết theo phương thức cho SerializerComparisonBenchmarks, bao gồm các thư viện được so sánh, ánh xạ API, ảnh chụp hiệu năng và chỉ số chi tiết.
section: Benchmarks
---

So sánh chi tiết theo phương thức cho `SerializerComparisonBenchmarks`, bao gồm các thư viện được so sánh, ánh xạ API, ảnh chụp hiệu năng và chỉ số chi tiết.

## Thư viện và API được so sánh

| Thư viện | Phương thức benchmark | Chữ ký API rút gọn |
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

## Ảnh chụp hiệu năng

Tổng quan về các phương thức tuần tự hóa và giải tuần tự hóa nhanh nhất ở các quy mô payload khác nhau (16, 128 và 1024 phần tử).

| Số phần tử | Tuần tự hóa nhanh nhất | Giải tuần tự hóa nhanh nhất | Ghi chú |
| :--- | :--- | :--- | :--- |
| **16** | MemoryPack Span (27.62 ns) | **LiteSerializer (94.21 ns)** | LiteSerializer Span gần bằng với 32.68 ns. Giải tuần tự hóa MemoryPack là 95.42 ns. |
| **128** | MemoryPack Span (31.93 ns) | **MemoryPack (125.61 ns)** | LiteSerializer Span là 40.74 ns. Giải tuần tự hóa LiteSerializer là 129.40 ns. |
| **1024** | MemoryPack Span (63.95 ns) | **MemoryPack (520.13 ns)** | LiteSerializer Span là 66.77 ns. Giải tuần tự hóa LiteSerializer là 560.94 ns. |

---

## Kết quả chi tiết

So sánh đầy đủ các chỉ số của mọi thư viện và kích thước payload từ các báo cáo BenchmarkDotNet.

### Kết quả chi tiết (Số phần tử = 16)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
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

### Kết quả chi tiết (Số phần tử = 128)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
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

### Kết quả chi tiết (Số phần tử = 1024)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
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

## Điểm chính

- **LiteSerializer so với MemoryPack**: `LiteSerializer` và `MemoryPack` khá sát nhau. Ở 16 phần tử hai bên gần ngang bằng khi giải tuần tự hóa, còn ở 128 và 1024 phần tử `MemoryPack` nhanh hơn một chút:
    - **Giải tuần tự hóa**: 94.21 ns so với 95.42 ns với 16 phần tử; 129.40 ns so với 125.61 ns với 128 phần tử; 560.94 ns so với 520.13 ns với 1024 phần tử.
    - **Tuần tự hóa**: `LiteSerializer_Serialize_Span` không cấp phát heap (0 B) và chạy gần với `MemoryPack_Serialize_Span` (32.68 ns so với 27.62 ns ở 16; 40.74 ns so với 31.93 ns ở 128; 66.77 ns so với 63.95 ns ở 1024).
- **MessagePack và JSON**: `LiteSerializer` nhanh hơn đáng kể so với `MessagePack` (khoảng 2x–17x khi giải tuần tự hóa) và `System.Text.Json` (khoảng 7x–36x khi giải tuần tự hóa).
