---
title: Ngẫu nhiên
description: Sinh số ngẫu nhiên mật mã mạnh trong Nalix.Environment.Random thông qua Csprng và OsCsprng.
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Random`  
**Assembly:** `Nalix.Environment`

`Csprng` cung cấp khả năng sinh số ngẫu nhiên mật mã mạnh, an toàn đa luồng, được hỗ trợ trực tiếp bởi CSPRNG của hệ điều hành (`OsCsprng`).

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Random/Csprng.cs`
- `src/Nalix.Environment/Random/OsCsprng.cs`

## Backend entropy theo nền tảng (`OsCsprng`)

`OsCsprng.Fill(Span<byte>)` gọi trực tiếp các nguyên thủy entropy gốc của hệ điều hành mà không cấp phát trung gian:

- **Windows:** `BCryptGenRandom` (`bcrypt.dll`, `BCRYPT_USE_SYSTEM_PREFERRED_RNG`)
- **Linux / Android:** syscall `getrandom` (`libc`), dự phòng bằng `/dev/urandom`
- **macOS / iOS / tvOS:** `SecRandomCopyBytes` (`Security.framework`), dự phòng bằng `/dev/urandom`
- **POSIX khác:** `/dev/urandom` (được quản lý qua một file descriptor bền vững, có thể đóng khi ứng dụng tắt qua `OsCsprng.Shutdown()`)

:::important[Bất biến bảo mật fail-closed]
Trong quá trình khởi tạo tĩnh, `Csprng` thăm dò `OsCsprng.Fill` với một buffer kiểm tra 16 byte và xác minh đầu ra không toàn 0x00 hoặc toàn 0xFF. Nếu CSPRNG của hệ điều hành không khả dụng hoặc lỗi, `Csprng` ném `CipherException` ngay lập tức — nó **không bao giờ** lùi về một PRNG không mật mã có thể đoán trước được.
:::

## Thành viên công khai của `Csprng`

| Thành viên | Chữ ký | Mô tả |
| --- | --- | --- |
| `MaxByteArrayLength` | `public const int MaxByteArrayLength = SerializerBounds.MaxArray;` (`1_048_576`) | Độ dài mảng byte tối đa được chấp nhận bởi các hàm trợ giúp có cấp phát và trả về mảng. |
| `Fill` | `public static void Fill(Span<byte> data)` | Điền `data` tại chỗ bằng byte ngẫu nhiên mật mã mạnh (không cấp phát). |
| `GetBytes` | `public static byte[] GetBytes(int length)` | Cấp phát và trả về một `byte[length]` đã được điền byte ngẫu nhiên (`0 <= length <= MaxByteArrayLength`). |
| `CreateNonce` | `public static byte[] CreateNonce(int length = 12)` | Cấp phát và trả về một nonce ngẫu nhiên (mặc định 12 byte cho ChaCha20-Poly1305). |
| `NextBytes(byte[])` | `public static void NextBytes(byte[] buffer)` | Điền `buffer` tại chỗ bằng byte ngẫu nhiên. |
| `NextBytes(Span<byte>)` | `public static void NextBytes(Span<byte> buffer)` | Điền `buffer` tại chỗ bằng byte ngẫu nhiên. |
| `GetInt32(int, int)` | `public static int GetInt32(int minValue, int maxValue)` | Trả về một `int` ngẫu nhiên không thiên lệch trong `[minValue, maxValue)` bằng lấy mẫu từ chối theo mặt nạ bit. |
| `GetInt32(int)` | `public static int GetInt32(int maxValue)` | Dạng rút gọn của `GetInt32(0, maxValue)`. |
| `NextUInt32` | `public static uint NextUInt32()` | Trả về một số nguyên không dấu 32-bit ngẫu nhiên mật mã. |
| `NextUInt64` | `public static ulong NextUInt64()` | Trả về một số nguyên không dấu 64-bit ngẫu nhiên mật mã. |
| `NextDouble` | `public static double NextDouble()` | Trả về một `double` ngẫu nhiên trong `[0.0, 1.0)` với 53 bit độ chính xác mật mã. |

## Ví dụ sử dụng

```csharp
using System;
using Nalix.Environment.Random;

// Nonce 12 byte không cấp phát, nằm trên stack
Span<byte> nonce = stackalloc byte[12];
Csprng.Fill(nonce);

// Cổng ephemeral ngẫu nhiên không thiên lệch trong dải động [49152, 65535)
int ephemeralPort = Csprng.GetInt32(49152, 65535);

// Thách thức handshake 32 byte
byte[] challenge = Csprng.GetBytes(32);
```

## API liên quan

- [AEAD & Envelope Encryption](../security/aead-and-envelope.md)
- [Giao thức Handshake (X25519)](../security/handshake.md)
- [Clock](./clock.md)
