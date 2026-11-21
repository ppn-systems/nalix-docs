---
title: Security & Cryptography Benchmarks
description: Detailed performance metrics for the Nalix security primitives, including encryption ciphers, handshake computation, and hashing algorithms.
section: Benchmarks
---

Detailed performance metrics for the Nalix security primitives, including encryption ciphers, handshake computation, and hashing algorithms.

## Envelope Cipher Suites

Comparison of stream ciphers (Salsa20 and ChaCha20) and AEAD suites (Salsa20-Poly1305 and ChaCha20-Poly1305) over 64 B and 1024 B payloads. All operations are run on zero-allocation spans.

### Envelope Cipher Performance (Payload Size = 64)

| Method | PayloadSize | Mean | Error | StdDev | P95 | Allocated |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_Salsa20** | 64 | **588.3 ns** | 73.14 ns | 97.64 ns | 708.5 ns | 0 B |
| **Decrypt_Salsa20** | 64 | **252.7 ns** | 31.55 ns | 42.12 ns | 319.8 ns | 0 B |
| **Encrypt_Chacha20** | 64 | **513.7 ns** | 65.85 ns | 87.90 ns | 629.6 ns | 0 B |
| **Decrypt_Chacha20** | 64 | **169.0 ns** | 12.69 ns | 16.05 ns | 188.6 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 64 | **977.9 ns** | 86.71 ns | 115.76 ns | 1,144.1 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 64 | **714.1 ns** | 77.70 ns | 103.73 ns | 890.6 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 64 | **748.1 ns** | 65.59 ns | 87.57 ns | 866.7 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 64 | **446.2 ns** | 48.14 ns | 62.59 ns | 583.5 ns | 0 B |

### Envelope Cipher Performance (Payload Size = 1024)

| Method | PayloadSize | Mean | Error | StdDev | P95 | Allocated |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Encrypt_Salsa20** | 1024 | **3,385.9 ns** | 355.80 ns | 474.98 ns | 4,034.4 ns | 0 B |
| **Decrypt_Salsa20** | 1024 | **3,075.0 ns** | 573.61 ns | 765.75 ns | 4,157.7 ns | 0 B |
| **Encrypt_Chacha20** | 1024 | **678.1 ns** | 46.30 ns | 55.12 ns | 751.1 ns | 0 B |
| **Decrypt_Chacha20** | 1024 | **399.4 ns** | 39.21 ns | 52.35 ns | 446.6 ns | 0 B |
| **Encrypt_Salsa20Poly1305** | 1024 | **4,176.2 ns** | 304.89 ns | 407.03 ns | 4,780.6 ns | 0 B |
| **Decrypt_Salsa20Poly1305** | 1024 | **4,227.9 ns** | 275.44 ns | 367.71 ns | 4,841.2 ns | 0 B |
| **Encrypt_Chacha20Poly1305** | 1024 | **1,441.0 ns** | 121.24 ns | 161.85 ns | 1,692.3 ns | 0 B |
| **Decrypt_Chacha20Poly1305** | 1024 | **1,166.5 ns** | 56.97 ns | 76.05 ns | 1,271.1 ns | 0 B |

### Behind the design

- **Software-Efficient Stream Ciphers**: Salsa20 and ChaCha20 perform encryption at near-hardware speeds. The state is maintained in `stackalloc` memory, ensuring zero allocations.
- **One-Pass AEAD**: The combined ciphers with Poly1305 perform authentication and decryption in a single pass over the memory block, minimizing cache misses.

---

## Handshake Protocol

Performance metrics for the cryptographic handshake phase, establishing session identity.

| Method | Mean | Error | StdDev | P95 | Allocated |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **ComputeMasterSecret** | **2.918 μs** | 0.2469 μs | 0.3297 μs | 3.552 μs | 0 B |
| **ComputeServerProof** | **3.292 μs** | 0.4606 μs | 0.6149 μs | 4.428 μs | 0 B |
| **ComputeClientProof** | **2.901 μs** | 0.4179 μs | 0.5579 μs | 3.752 μs | 0 B |
| **DeriveSessionKey** | **2.879 μs** | 0.4037 μs | 0.5106 μs | 3.697 μs | 0 B |

### Behind the design

- **Zero-Allocation Keys**: High-cost key computations take ~2.9–3.3 μs each and run completely allocation-free (0 B), isolating cryptographic handshakes from garbage collection impacts.

---

## Hashing & Cryptography

Comparison of cryptographic hashing, verification ciphers, and key derivation algorithms.

### Hashing Performance (Payload Size = 64)

| Method | PayloadSize | Mean | Error | StdDev | P95 | Allocated |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 64 | **675.5 ns** | 71.22 ns | 95.07 ns | 837.0 ns | 0 B |
| **HmacKeccak256_Compute** | 64 | **2,836.7 ns** | 210.90 ns | 259.01 ns | 3,182.6 ns | 0 B |
| **Poly1305_Compute** | 64 | **71.0 ns** | 5.55 ns | 6.81 ns | 78.7 ns | 0 B |
| **Pbkdf2_Hash** | 64 | **2,650,795.5 ns** | 218,451.87 ns | 276,271.69 ns | 2,994,214.9 ns | 312 B |
| **Pbkdf2_Verify** | 64 | **2,920,965.7 ns** | 252,600.65 ns | 337,214.64 ns | 3,474,893.1 ns | 256 B |

### Hashing Performance (Payload Size = 1024)

| Method | PayloadSize | Mean | Error | StdDev | P95 | Allocated |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| **Keccak256_Hash** | 1024 | **5,586.2 ns** | 472.52 ns | 630.80 ns | 6,534.3 ns | 0 B |
| **HmacKeccak256_Compute** | 1024 | **7,710.3 ns** | 529.03 ns | 669.05 ns | 8,758.1 ns | 0 B |
| **Poly1305_Compute** | 1024 | **316.1 ns** | 35.37 ns | 45.99 ns | 385.5 ns | 0 B |
| **Pbkdf2_Hash** | 1024 | **3,296,815.4 ns** | 373,614.61 ns | 485,804.57 ns | 4,050,756.4 ns | 312 B |
| **Pbkdf2_Verify** | 1024 | **3,384,668.5 ns** | 455,898.78 ns | 608,611.83 ns | 4,131,682.3 ns | 256 B |

### Behind the design

- **Keccak Optimization**: Our custom Keccak256 implementation hashes small structures in ~675 ns and 1KB structures in 5.59 μs without allocating memory.
- **PBKDF2 Overhead & Isolation**: PBKDF2 is a secure key derivation function designed to be intentionally computationally expensive (taking ~2.7–3.4 ms per operation). Due to its CPU-bound nature, PBKDF2 checks are isolated from the networking hot path to prevent starvation of the listener thread pool.
