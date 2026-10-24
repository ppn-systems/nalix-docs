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
| **16** | MemoryPack Span (24,92 ns) | **LiteSerializer (69,28 ns)** | LiteSerializer Span gần bằng với 29,10 ns. Giải tuần tự hóa MemoryPack là 75,13 ns. |
| **128** | MemoryPack Span (28,65 ns) | **LiteSerializer (115,40 ns)** | LiteSerializer Span gần bằng với 31,85 ns. Giải tuần tự hóa MemoryPack là 118,78 ns. |
| **1024** | MemoryPack Span (54,11 ns) | **LiteSerializer (423,75 ns)** | LiteSerializer Span gần bằng với 57,31 ns. Giải tuần tự hóa MemoryPack là 448,05 ns. |

---

## Kết quả chi tiết

So sánh đầy đủ các chỉ số của mọi thư viện và kích thước payload từ các báo cáo BenchmarkDotNet.

### Kết quả chi tiết (Số phần tử = 16)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **63,19 ns** | 1,319 ns | 1,760 ns | 65,44 ns | 0,0057 | - | - | 216 B |
| **LiteSerializer_Serialize_Span** | **29,10 ns** | 0,350 ns | 0,467 ns | 29,85 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **54,13 ns** | 0,466 ns | 0,622 ns | 54,97 ns | 0,0058 | - | - | 216 B |
| **MemoryPack_Serialize_Span** | **24,92 ns** | 0,235 ns | 0,313 ns | 25,42 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **89,78 ns** | 0,686 ns | 0,916 ns | 91,29 ns | 0,0044 | - | - | 168 B |
| **SystemTextJson_Serialize** | **251,25 ns** | 2,910 ns | 3,885 ns | 257,10 ns | 0,0143 | - | - | 536 B |
| **LiteSerializer_Deserialize** | **69,28 ns** | 3,914 ns | 5,224 ns | 76,09 ns | 0,0108 | - | - | 408 B |
| **MemoryPack_Deserialize** | **75,13 ns** | 4,133 ns | 5,518 ns | 80,58 ns | 0,0117 | - | - | 440 B |
| **MessagePack_Deserialize** | **162,24 ns** | 1,204 ns | 1,566 ns | 164,84 ns | 0,0117 | - | - | 440 B |
| **SystemTextJson_Deserialize** | **508,44 ns** | 5,618 ns | 7,500 ns | 520,34 ns | 0,0267 | - | - | 1008 B |

### Kết quả chi tiết (Số phần tử = 128)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **120,74 ns** | 1,404 ns | 1,825 ns | 123,45 ns | 0,0176 | - | - | 664 B |
| **LiteSerializer_Serialize_Span** | **31,85 ns** | 0,314 ns | 0,409 ns | 32,65 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **101,30 ns** | 5,116 ns | 6,830 ns | 107,10 ns | 0,0178 | - | - | 664 B |
| **MemoryPack_Serialize_Span** | **28,65 ns** | 0,239 ns | 0,311 ns | 29,24 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **380,82 ns** | 2,692 ns | 3,501 ns | 386,04 ns | 0,0134 | - | - | 504 B |
| **SystemTextJson_Serialize** | **785,81 ns** | 6,164 ns | 8,229 ns | 800,89 ns | 0,0277 | - | - | 1056 B |
| **LiteSerializer_Deserialize** | **115,40 ns** | 6,307 ns | 8,419 ns | 124,23 ns | 0,0229 | - | - | 856 B |
| **MemoryPack_Deserialize** | **118,78 ns** | 2,049 ns | 2,516 ns | 121,88 ns | 0,0237 | - | - | 888 B |
| **MessagePack_Deserialize** | **934,29 ns** | 5,249 ns | 7,007 ns | 945,56 ns | 0,0229 | - | - | 888 B |
| **SystemTextJson_Deserialize** | **2.112,12 ns** | 18,254 ns | 24,369 ns | 2.152,67 ns | 0,0496 | - | - | 1976 B |

### Kết quả chi tiết (Số phần tử = 1024)

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **LiteSerializer_Serialize** | **538,97 ns** | 5,757 ns | 7,686 ns | 549,54 ns | 0,1163 | - | - | 4280 B |
| **LiteSerializer_Serialize_Span** | **57,31 ns** | 0,456 ns | 0,609 ns | 58,36 ns | - | - | - | 0 B |
| **MemoryPack_Serialize** | **406,91 ns** | 23,217 ns | 30,994 ns | 431,30 ns | 0,1116 | - | - | 4248 B |
| **MemoryPack_Serialize_Span** | **54,11 ns** | 0,367 ns | 0,489 ns | 54,86 ns | - | - | - | 0 B |
| **MessagePack_Serialize** | **2.536,02 ns** | 18,638 ns | 24,881 ns | 2.573,17 ns | 0,0839 | - | - | 3192 B |
| **SystemTextJson_Serialize** | **5.184,75 ns** | 42,813 ns | 57,153 ns | 5.269,06 ns | 0,1602 | - | - | 5968 B |
| **LiteSerializer_Deserialize** | **423,75 ns** | 9,611 ns | 12,830 ns | 446,78 ns | 0,1206 | - | 0,0005 | 4440 B |
| **MemoryPack_Deserialize** | **448,05 ns** | 16,775 ns | 21,812 ns | 484,71 ns | 0,1206 | - | - | 4472 B |
| **MessagePack_Deserialize** | **7.083,24 ns** | 45,454 ns | 60,680 ns | 7.172,78 ns | 0,1144 | - | - | 4472 B |
| **SystemTextJson_Deserialize** | **15.276,89 ns** | 115,989 ns | 154,842 ns | 15.524,26 ns | 0,2441 | - | - | 9216 B |

---

## Điểm chính

- **LiteSerializer so với MemoryPack**: `LiteSerializer` cực kỳ nhanh và dẫn trước `MemoryPack` ở giải tuần tự hóa trên mọi kích thước payload được kiểm tra:
    - **Giải tuần tự hóa**: `LiteSerializer` vượt MemoryPack ở mọi quy mô (69,28 ns so với 75,13 ns với 16 phần tử; 115,40 ns so với 118,78 ns với 128 phần tử; 423,75 ns so với 448,05 ns với 1024 phần tử).
    - **Tuần tự hóa**: `LiteSerializer_Serialize_Span` không cấp phát heap (0 B) và chạy gần như tương đương `MemoryPack_Serialize_Span` (29,10 ns so với 24,92 ns ở 16; 31,85 ns so với 28,65 ns ở 128; 57,31 ns so với 54,11 ns ở 1024).
- **MessagePack và JSON**: `LiteSerializer` vượt trội đáng kể so với `MessagePack` (nhanh hơn 3x–16x) và `System.Text.Json` (nhanh hơn 8x–36x), đồng thời giảm mạnh việc cấp phát bộ nhớ.
