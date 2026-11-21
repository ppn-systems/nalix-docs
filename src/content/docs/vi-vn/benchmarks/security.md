---
title: Benchmark bảo mật và mật mã
description: Chỉ số hiệu năng chi tiết cho các nguyên thủy bảo mật của Nalix, bao gồm cipher mã hóa, tính toán handshake và thuật toán băm.
section: Benchmarks
---

Chỉ số hiệu năng chi tiết cho các nguyên thủy bảo mật của Nalix, bao gồm cipher mã hóa, tính toán handshake và thuật toán băm.

## Bộ cipher envelope

So sánh các stream cipher (Salsa20 và ChaCha20) và các bộ AEAD (Salsa20-Poly1305 và ChaCha20-Poly1305) trên payload 64 B và 1024 B. Mọi thao tác đều chạy trên span không cấp phát bộ nhớ.

### Hiệu năng cipher envelope (Payload Size = 64)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_Salsa20** | 64 | **588.3 ns** | 73.14 ns | 97.64 ns | 708.5 ns | 0 B |
| **Decrypt_Salsa20** | 64 | **252.7 ns** | 31.55 ns | 42.12 ns | 319.8 ns | 0 B |
| **Encrypt_Chacha20** | 64 | **513.7 ns** | 65.85 ns | 87.90 ns | 629.6 ns | 0 B |
| **Decrypt_Chacha20** | 64 | **169.0 ns** | 12.69 ns | 16.05 ns | 188.6 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 64 | **977.9 ns** | 86.71 ns | 115.76 ns | 1,144.1 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 64 | **714.1 ns** | 77.70 ns | 103.73 ns | 890.6 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 64 | **748.1 ns** | 65.59 ns | 87.57 ns | 866.7 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 64 | **446.2 ns** | 48.14 ns | 62.59 ns | 583.5 ns | 0 B |

### Hiệu năng cipher envelope (Payload Size = 1024)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_Salsa20** | 1024 | **3,385.9 ns** | 355.80 ns | 474.98 ns | 4,034.4 ns | 0 B |
| **Decrypt_Salsa20** | 1024 | **3,075.0 ns** | 573.61 ns | 765.75 ns | 4,157.7 ns | 0 B |
| **Encrypt_Chacha20** | 1024 | **678.1 ns** | 46.30 ns | 55.12 ns | 751.1 ns | 0 B |
| **Decrypt_Chacha20** | 1024 | **399.4 ns** | 39.21 ns | 52.35 ns | 446.6 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 1024 | **4,176.2 ns** | 304.89 ns | 407.03 ns | 4,780.6 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 1024 | **4,227.9 ns** | 275.44 ns | 367.71 ns | 4,841.2 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 1024 | **1,441.0 ns** | 121.24 ns | 161.85 ns | 1,692.3 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 1024 | **1,166.5 ns** | 56.97 ns | 76.05 ns | 1,271.1 ns | 0 B |

### Đằng sau thiết kế

- **Stream cipher hiệu quả trên phần mềm**: Salsa20 và ChaCha20 thực hiện mã hóa với tốc độ gần bằng phần cứng. Trạng thái được giữ trong bộ nhớ `stackalloc`, đảm bảo không cấp phát.
- **AEAD một lượt**: Các cipher kết hợp với Poly1305 thực hiện xác thực và giải mã trong một lượt duy nhất trên khối bộ nhớ, giảm thiểu cache miss.

---

## Giao thức Handshake

Chỉ số hiệu năng cho giai đoạn handshake mật mã, thiết lập danh tính phiên.

| Phương thức | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **ComputeMasterSecret** | **2.918 μs** | 0.2469 μs | 0.3297 μs | 3.552 μs | 0 B |
| **ComputeServerProof** | **3.292 μs** | 0.4606 μs | 0.6149 μs | 4.428 μs | 0 B |
| **ComputeClientProof** | **2.901 μs** | 0.4179 μs | 0.5579 μs | 3.752 μs | 0 B |
| **DeriveSessionKey** | **2.879 μs** | 0.4037 μs | 0.5106 μs | 3.697 μs | 0 B |

### Đằng sau thiết kế

- **Khóa không cấp phát**: Các phép tính khóa tốn kém, mỗi phép mất khoảng ~2.9–3.3 μs và chạy hoàn toàn không cấp phát (0 B), tách biệt các handshake mật mã khỏi tác động của garbage collection.

---

## Băm và mật mã

So sánh các thuật toán băm mật mã, cipher xác minh và dẫn xuất khóa.

### Hiệu năng băm (Payload Size = 64)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 64 | **675.5 ns** | 71.22 ns | 95.07 ns | 837.0 ns | 0 B |
| **HmacKeccak256_Compute** | 64 | **2,836.7 ns** | 210.90 ns | 259.01 ns | 3,182.6 ns | 0 B |
| **Poly1305_Compute** | 64 | **71.0 ns** | 5.55 ns | 6.81 ns | 78.7 ns | 0 B |
| **Pbkdf2_Hash** | 64 | **2,650,795.5 ns** | 218,451.87 ns | 276,271.69 ns | 2,994,214.9 ns | 312 B |
| **Pbkdf2_Verify** | 64 | **2,920,965.7 ns** | 252,600.65 ns | 337,214.64 ns | 3,474,893.1 ns | 256 B |

### Hiệu năng băm (Payload Size = 1024)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 1024 | **5,586.2 ns** | 472.52 ns | 630.80 ns | 6,534.3 ns | 0 B |
| **HmacKeccak256_Compute** | 1024 | **7,710.3 ns** | 529.03 ns | 669.05 ns | 8,758.1 ns | 0 B |
| **Poly1305_Compute** | 1024 | **316.1 ns** | 35.37 ns | 45.99 ns | 385.5 ns | 0 B |
| **Pbkdf2_Hash** | 1024 | **3,296,815.4 ns** | 373,614.61 ns | 485,804.57 ns | 4,050,756.4 ns | 312 B |
| **Pbkdf2_Verify** | 1024 | **3,384,668.5 ns** | 455,898.78 ns | 608,611.83 ns | 4,131,682.3 ns | 256 B |

### Đằng sau thiết kế

- **Tối ưu Keccak**: Triển khai Keccak256 tự phát triển băm các cấu trúc nhỏ trong khoảng ~675 ns và cấu trúc 1 KB trong 5.59 μs mà không cấp phát bộ nhớ.
- **Chi phí PBKDF2 và cách ly**: PBKDF2 là hàm dẫn xuất khóa an toàn, được thiết kế cố ý tốn kém về mặt tính toán (khoảng ~2.7–3.4 ms mỗi thao tác). Do tính chất phụ thuộc CPU, các kiểm tra PBKDF2 được tách khỏi hot path mạng để tránh làm đói thread pool của listener.
