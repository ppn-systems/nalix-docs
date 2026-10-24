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
| **Encrypt_Salsa20** | 64 | **331.0 ns** | 10.13 ns | 11.66 ns | 342.7 ns | 0 B |
| **Decrypt_Salsa20** | 64 | **260.2 ns** | 5.27 ns | 6.07 ns | 265.0 ns | 0 B |
| **Encrypt_Chacha20** | 64 | **343.4 ns** | 4.49 ns | 5.17 ns | 347.8 ns | 0 B |
| **Decrypt_Chacha20** | 64 | **260.1 ns** | 6.18 ns | 7.12 ns | 263.5 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 64 | **734.6 ns** | 27.18 ns | 31.30 ns | 752.7 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 64 | **712.0 ns** | 95.41 ns | 109.87 ns | 773.4 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 64 | **511.2 ns** | 5.81 ns | 6.69 ns | 520.5 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 64 | **484.0 ns** | 3.58 ns | 4.13 ns | 492.0 ns | 0 B |

### Hiệu năng cipher envelope (Payload Size = 1024)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_Salsa20** | 1024 | **1,895.6 ns** | 25.27 ns | 28.09 ns | 1,940.0 ns | 0 B |
| **Decrypt_Salsa20** | 1024 | **1,887.3 ns** | 21.79 ns | 25.09 ns | 1,928.4 ns | 0 B |
| **Encrypt_Chacha20** | 1024 | **1,127.3 ns** | 265.28 ns | 305.50 ns | 1,419.2 ns | 0 B |
| **Decrypt_Chacha20** | 1024 | **1,301.6 ns** | 59.30 ns | 68.29 ns | 1,334.3 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 1024 | **4,526.5 ns** | 64.45 ns | 74.22 ns | 4,583.9 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 1024 | **4,606.4 ns** | 12.49 ns | 14.39 ns | 4,623.0 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 1024 | **2,695.9 ns** | 59.62 ns | 68.66 ns | 2,743.3 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 1024 | **2,736.3 ns** | 60.69 ns | 69.89 ns | 2,788.0 ns | 0 B |

### Đằng sau thiết kế

- **Stream cipher hiệu quả trên phần mềm**: Salsa20 và ChaCha20 thực hiện mã hóa với tốc độ gần bằng phần cứng. Trạng thái được giữ trong bộ nhớ `stackalloc`, đảm bảo không cấp phát.
- **AEAD một lượt**: Các cipher kết hợp với Poly1305 thực hiện xác thực và giải mã trong một lượt duy nhất trên khối bộ nhớ, giảm thiểu cache miss.

---

## Giao thức Handshake

Chỉ số hiệu năng cho giai đoạn handshake mật mã, thiết lập danh tính phiên.

| Phương thức | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **ComputeMasterSecret** | **2.513 μs** | 0.1719 μs | 0.1980 μs | 2.614 μs | 0 B |
| **ComputeServerProof** | **2.194 μs** | 0.2906 μs | 0.3346 μs | 2.609 μs | 0 B |
| **ComputeClientProof** | **2.368 μs** | 0.3165 μs | 0.3645 μs | 2.654 μs | 0 B |
| **DeriveSessionKey** | **2.619 μs** | 0.0755 μs | 0.0869 μs | 2.675 μs | 0 B |

### Đằng sau thiết kế

- **Khóa không cấp phát**: Các phép tính khóa tốn kém, mỗi phép mất khoảng ~2–2,6 μs và chạy hoàn toàn không cấp phát (0 B), tách biệt các handshake mật mã khỏi tác động của garbage collection.

---

## Băm và mật mã

So sánh các thuật toán băm mật mã, cipher xác minh và dẫn xuất khóa.

### Hiệu năng băm (Payload Size = 64)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 64 | **605.3 ns** | 11.16 ns | 12.85 ns | 615.0 ns | 0 B |
| **HmacKeccak256_Compute** | 64 | **2,518.4 ns** | 45.27 ns | 52.13 ns | 2,553.1 ns | 0 B |
| **Poly1305_Compute** | 64 | **111.5 ns** | 0.95 ns | 1.09 ns | 112.3 ns | 0 B |
| **Pbkdf2_Hash** | 64 | **2,561,666.8 ns** | 43,716.23 ns | 50,343.68 ns | 2,609,432.4 ns | 312 B |
| **Pbkdf2_Verify** | 64 | **2,548,772.0 ns** | 39,314.36 ns | 45,274.48 ns | 2,590,398.3 ns | 256 B |

### Hiệu năng băm (Payload Size = 1024)

| Phương thức | PayloadSize | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 1024 | **4,862.0 ns** | 64.07 ns | 71.22 ns | 4,967.1 ns | 0 B |
| **HmacKeccak256_Compute** | 1024 | **6,591.5 ns** | 140.27 ns | 161.54 ns | 6,758.3 ns | 0 B |
| **Poly1305_Compute** | 1024 | **888.9 ns** | 57.31 ns | 66.00 ns | 940.5 ns | 0 B |
| **Pbkdf2_Hash** | 1024 | **2,545,073.2 ns** | 49,667.27 ns | 57,196.90 ns | 2,608,114.0 ns | 312 B |
| **Pbkdf2_Verify** | 1024 | **2,552,527.7 ns** | 49,817.62 ns | 57,370.04 ns | 2,601,772.5 ns | 256 B |

### Đằng sau thiết kế

- **Tối ưu Keccak**: Triển khai Keccak256 tự phát triển băm các cấu trúc nhỏ trong khoảng ~605 ns và cấu trúc 1 KB trong 4,86 μs mà không cấp phát bộ nhớ.
- **Chi phí PBKDF2 và cách ly**: PBKDF2 là hàm dẫn xuất khóa an toàn, được thiết kế cố ý tốn kém về mặt tính toán (khoảng ~2,5 ms mỗi thao tác). Do tính chất phụ thuộc CPU, các kiểm tra PBKDF2 được tách khỏi hot path mạng để tránh làm đói thread pool của listener.
