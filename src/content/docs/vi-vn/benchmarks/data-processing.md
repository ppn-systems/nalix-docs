---
title: Benchmark xử lý và đóng khung dữ liệu
description: Chỉ số hiệu năng chi tiết cho các pipeline xử lý và biến đổi dữ liệu của Nalix, bao gồm nén LZ4 và các biến đổi đóng khung.
section: Benchmarks
---

Chỉ số hiệu năng chi tiết cho các pipeline xử lý và biến đổi dữ liệu của Nalix, bao gồm nén LZ4 và các biến đổi đóng khung.

## Pipeline xử lý khung

Pipeline khung xử lý toàn bộ quá trình tuần tự hóa đi ra (nén + mã hóa) và giải tuần tự hóa đi vào (giải mã + giải nén), từ đầu đến cuối.

### Hiệu năng pipeline (Payload Size = 64)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Gen0 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **ProcessOutbound_CompressOnly** | 64 | **206.2 ns** | 2.12 ns | 2.44 ns | 210.4 ns | - | 0 B |
| **ProcessOutbound_EncryptOnly** | 64 | **672.0 ns** | 15.22 ns | 19.79 ns | 710.6 ns | 0.0200 | 208 B |
| **ProcessOutbound_Full** | 64 | **813.9 ns** | 21.55 ns | 28.77 ns | 872.1 ns | 0.0792 | 208 B |
| **ProcessInbound_DecompressOnly** | 64 | **211.8 ns** | 5.49 ns | 7.14 ns | 223.0 ns | - | 0 B |
| **ProcessInbound_DecryptOnly** | 64 | **1,106.5 ns** | 25.56 ns | 33.24 ns | 1,158.9 ns | 0.0401 | 416 B |
| **ProcessInbound_Full** | 64 | **1,230.6 ns** | 21.07 ns | 27.39 ns | 1,275.6 ns | 0.0706 | 544 B |

### Hiệu năng pipeline (Payload Size = 512)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Gen0 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **ProcessOutbound_CompressOnly** | 512 | **504.0 ns** | 8.26 ns | 10.45 ns | 522.5 ns | - | 0 B |
| **ProcessOutbound_EncryptOnly** | 512 | **1,176.2 ns** | 31.58 ns | 42.16 ns | 1,226.7 ns | 0.1202 | 889 B |
| **ProcessOutbound_Full** | 512 | **1,692.8 ns** | 51.91 ns | 69.30 ns | 1,805.3 ns | 0.4177 | 1104 B |
| **ProcessInbound_DecompressOnly** | 512 | **504.0 ns** | 3.34 ns | 3.71 ns | 507.9 ns | - | 0 B |
| **ProcessInbound_DecryptOnly** | 512 | **1,966.5 ns** | 43.33 ns | 56.34 ns | 2,071.3 ns | 0.2327 | 0 B |
| **ProcessInbound_Full** | 512 | **2,637.7 ns** | 44.13 ns | 55.82 ns | 2,717.7 ns | 0.3128 | 3232 B |

### Hiệu năng pipeline (Payload Size = 4096)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **ProcessOutbound_CompressOnly** | 4096 | **1,404.7 ns** | 34.71 ns | 46.34 ns | 1,482.6 ns | - | - | 0 B |
| **ProcessOutbound_EncryptOnly** | 4096 | **3,045.8 ns** | 77.88 ns | 98.50 ns | 3,248.4 ns | 1.1787 | 0.0648 | 8272 B |
| **ProcessOutbound_Full** | 4096 | **4,826.1 ns** | 168.30 ns | 224.67 ns | 5,194.6 ns | 1.6479 | 0.0458 | 8272 B |
| **ProcessInbound_DecompressOnly** | 4096 | **1,438.0 ns** | 46.12 ns | 61.57 ns | 1,553.2 ns | - | - | 0 B |
| **ProcessInbound_DecryptOnly** | 4096 | **6,103.1 ns** | 170.91 ns | 203.45 ns | 6,384.2 ns | 2.3422 | 0.1297 | 16544 B |
| **ProcessInbound_Full** | 4096 | **8,057.2 ns** | 173.10 ns | 225.08 ns | 8,378.9 ns | 2.5635 | 0.0916 | 24736 B |

### Đằng sau thiết kế

- **Tỷ lệ tuyến tính**: Độ trễ tăng có thể dự đoán được theo kích thước payload.
- **Pipeline xử lý liên tục**: Xử lý đi ra truyền dữ liệu trực tiếp, cho phép đóng khung từ dưới micro giây đến vài micro giây với các kích thước payload phổ biến (ví dụ 1.69 μs cho payload 512B).

---

## Biến đổi khung

Các transformer riêng lẻ trong pipeline xử lý việc nén/giải nén và mã hóa/giải mã.

### Hiệu năng transformer (Payload Size = 64)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_AEAD_ChaCha20Poly1305** | 64 | **920.1 ns** | 17.94 ns | 23.95 ns | 955.2 ns | 0 B |
| **Decrypt_AEAD_ChaCha20Poly1305** | 64 | **1,306.3 ns** | 25.91 ns | 33.70 ns | 1,374.0 ns | 0 B |
| **Encrypt_AEAD_Salsa20Poly1305** | 64 | **1,070.4 ns** | 24.21 ns | 31.48 ns | 1,135.0 ns | 0 B |
| **Decrypt_AEAD_Salsa20Poly1305** | 64 | **1,687.9 ns** | 19.85 ns | 25.10 ns | 1,718.9 ns | 0 B |
| **Encrypt_Symmetric_ChaCha20** | 64 | **761.3 ns** | 15.40 ns | 20.02 ns | 789.5 ns | 0 B |
| **Decrypt_Symmetric_ChaCha20** | 64 | **967.1 ns** | 14.06 ns | 17.78 ns | 987.8 ns | 0 B |
| **Encrypt_Symmetric_Salsa20** | 64 | **819.7 ns** | 15.82 ns | 20.01 ns | 845.8 ns | 0 B |
| **Decrypt_Symmetric_Salsa20** | 64 | **1,073.9 ns** | 13.98 ns | 18.17 ns | 1,099.9 ns | 0 B |
| **Compress_LZ4** | 64 | **211.7 ns** | 4.95 ns | 6.44 ns | 220.6 ns | 0 B |
| **Decompress_LZ4** | 64 | **267.9 ns** | 6.71 ns | 8.72 ns | 282.7 ns | 0 B |

### Hiệu năng transformer (Payload Size = 1024)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_AEAD_ChaCha20Poly1305** | 1024 | **1,452.2 ns** | 30.35 ns | 40.52 ns | 1,523.7 ns | 0 B |
| **Decrypt_AEAD_ChaCha20Poly1305** | 1024 | **2,502.0 ns** | 45.39 ns | 59.02 ns | 2,577.4 ns | 0 B |
| **Encrypt_AEAD_Salsa20Poly1305** | 1024 | **3,452.0 ns** | 90.85 ns | 121.28 ns | 3,652.4 ns | 0 B |
| **Decrypt_AEAD_Salsa20Poly1305** | 1024 | **6,177.8 ns** | 115.40 ns | 145.95 ns | 6,458.9 ns | 0 B |
| **Encrypt_Symmetric_ChaCha20** | 1024 | **941.5 ns** | 20.76 ns | 26.99 ns | 988.0 ns | 0 B |
| **Decrypt_Symmetric_ChaCha20** | 1024 | **1,322.9 ns** | 23.55 ns | 31.44 ns | 1,376.9 ns | 0 B |
| **Encrypt_Symmetric_Salsa20** | 1024 | **2,947.5 ns** | 58.25 ns | 75.75 ns | 3,049.2 ns | 0 B |
| **Decrypt_Symmetric_Salsa20** | 1024 | **5,347.0 ns** | 62.29 ns | 76.50 ns | 5,413.4 ns | 0 B |
| **Compress_LZ4** | 1024 | **755.9 ns** | 18.30 ns | 23.14 ns | 802.8 ns | 0 B |
| **Decompress_LZ4** | 1024 | **834.2 ns** | 16.95 ns | 20.17 ns | 870.3 ns | 0 B |

### Vì sao xử lý dữ liệu của Nalix?

- **Biến đổi không cấp phát**: Thay vì tạo các mảng rác trung gian, mã hóa và nén hoạt động trực tiếp trên các bộ đệm thuê từ `BufferPoolManager` bằng `Span<byte>`, nên các thao tác transformer không tiêu tốn byte heap nào (0 B).
- **Tốc độ thân thiện với phần cứng**: Mã hóa đối xứng 1 KB dữ liệu mất khoảng 940 ns với ChaCha20 và khoảng 2.9 μs với Salsa20.
- **Nén LZ4 nội tuyến**: Nén LZ4 tích hợp sẵn kết hợp liền mạch với pipeline bộ đệm, thực hiện nén 1 KB trong khoảng 756 ns và nén 64 B trong dưới 212 ns.
