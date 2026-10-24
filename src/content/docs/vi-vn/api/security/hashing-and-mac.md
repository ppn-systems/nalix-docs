---
title: Băm và MAC
description: Keccak-256, HMAC-Keccak-256, MAC Poly1305, băm thông tin xác thực PBKDF2 và SecurityOptions trong Nalix.Codec.Security.Hashing.
section: API Reference
package: Nalix.Codec
---

**Namespaces:** `Nalix.Codec.Security.Hashing`, `Nalix.Codec.Options`  
**Assembly:** `Nalix.Codec`

Trang này trình bày các nguyên thủy băm, xác thực thông điệp và dẫn xuất mật khẩu trong `Nalix.Codec.Security.Hashing`, cùng với `SecurityOptions`.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Security/Hashing/Keccak256.cs`
- `src/Nalix.Codec/Security/Hashing/HmacKeccak256.cs`
- `src/Nalix.Codec/Security/Hashing/Poly1305.cs`
- `src/Nalix.Codec/Security/Hashing/Pbkdf2.cs`
- `src/Nalix.Codec/Options/SecurityOptions.cs`

## 1. `Keccak256`

`Keccak256` triển khai **sponge Keccak-256 gốc** (rate = 136 byte, capacity = 512 bit, đầu ra = 32 byte, byte đệm miền = `0x01`) với các đường tăng tốc SIMD (AVX-512, AVX2, AdvSimd, SSE2) và không cấp phát heap trên các đường dùng span/struct.

:::important[Keccak-256 so với SHA3-256 theo FIPS]
`Keccak256` dùng byte đệm miền Keccak gốc (`0x01`), khớp với `Keccak-256` của Ethereum/Web3 — không phải `SHA3-256` theo FIPS 202 (dùng `0x06`).
:::

### Thành viên tĩnh công khai

- `string AlgorithmName => "Keccak-256"`
- `Bytes32 HashDataToFixed(ReadOnlySpan<byte> data)` — Băm một lần, không cấp phát bộ nhớ, trả về giá trị kiểu `Bytes32` 32 byte.
- `void HashData(ReadOnlySpan<byte> data, Span<byte> output)` — Băm không cấp phát bộ nhớ, ghi 32 byte vào `output` (ném `ArgumentException` nếu `output.Length < 32`).
- `bool TryHashData(ReadOnlySpan<byte> data, Span<byte> output)` — Overload span không ném ngoại lệ; trả về `false` nếu `output.Length < 32`.
- `byte[] HashData(ReadOnlySpan<byte> data)` — Cấp phát và trả về `byte[]` 32 byte.

```csharp
using System;
using Nalix.Abstractions.Primitives;
using Nalix.Codec.Security.Hashing;

// Struct cố định 32 byte, không cấp phát bộ nhớ
Bytes32 fixedDigest = Keccak256.HashDataToFixed(payload);

// Span trên stack, không cấp phát bộ nhớ
Span<byte> buffer = stackalloc byte[32];
Keccak256.HashData(payload, buffer);
```

---

## 2. `HmacKeccak256`

`HmacKeccak256` triển khai HMAC theo RFC 2104 trên `Keccak256` (rate/kích thước khối = `136` byte, đầu ra = `Keccak256.HashSize` = `32` byte), và xóa sạch mọi pad khóa trung gian trên stack trước khi trả về.

### Thành viên tĩnh công khai

- `void Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> data, Span<byte> output)` — Tính thẻ HMAC 32 byte vào `output` (ném `ArgumentException` nếu `output.Length < Keccak256.HashSize`).

```csharp
using System;
using Nalix.Codec.Security.Hashing;
using Nalix.Codec.Security.Primitives;

Span<byte> mac = stackalloc byte[Keccak256.HashSize];
HmacKeccak256.Compute(key, data, mac);

bool authentic = BitwiseOperations.FixedTimeEquals(mac, expectedMac);
```

---

## 3. `Poly1305`

`Poly1305` (`public ref struct Poly1305`) là bộ xác thực một lần theo RFC 8439, không cấp phát bộ nhớ (`KeySize = 32`, `TagSize = 16`), được `ChaCha20Poly1305` và `Salsa20Poly1305` sử dụng.

### Thành viên công khai

- `const byte KeySize = 32`
- `const byte TagSize = 16`
- **Phương thức tĩnh một lần**:
  - `static void Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message, Span<byte> destination)`
  - `static byte[] Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message)`
  - `static byte[] Compute(byte[] key, byte[] message)`
  - `static bool Verify(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message, ReadOnlySpan<byte> tag)`
- **Phương thức `ref struct` gia tăng**:
  - `Poly1305(ReadOnlySpan<byte> key)`
  - `void Update(ReadOnlySpan<byte> data)`
  - `void FinalizeTag(Span<byte> tag)` / `byte[] FinalizeTag()`
  - `void ComputeTag(ReadOnlySpan<byte> message, Span<byte> destination)`
  - `void Clear()` — Xóa an toàn các limb nội bộ và trạng thái khóa.

---

## 4. `Pbkdf2` & `SecurityOptions`

`Pbkdf2` cung cấp dẫn xuất khóa từ mật khẩu (`KeySize = 32`, `SaltSize = 32`, `Iterations = 150_000` ở Release / `10_000` ở Debug) dựa trên `HmacKeccak256`. `Pbkdf2.Encoded` mã hóa thông tin xác thực thành payload nhị phân 65 byte (`[Version (1B = 2)] || [Salt (32B)] || [Hash (32B)]`) được định dạng bằng Base64.

### `SecurityOptions` (`Nalix.Codec.Options`)

Được nạp từ `[Security]` trong `server.ini` qua `ConfigurationManager.Instance.Get<SecurityOptions>()`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra | Mô tả |
| --- | --- | ---: | --- | --- |
| `Pbkdf2Iterations` | `int` | `310_000` | `[ValueRange(1000, 10_000_000)]` | Số vòng lặp PBKDF2 mặc định được `Pbkdf2.Hash` và `Pbkdf2.Encoded.Hash` sử dụng. |

### Cách dùng cơ bản

```csharp
using Nalix.Codec.Security.Hashing;

// Salt thô + dẫn xuất khóa 32 byte
Pbkdf2.Hash("secret-password", out byte[] salt, out byte[] hash);
bool validRaw = Pbkdf2.Verify("secret-password", salt, hash);

// Chuỗi Base64 có phiên bản, tự chứa (lưu số vòng lặp + salt + hash)
string encoded = Pbkdf2.Encoded.Hash("secret-password");
bool validEncoded = Pbkdf2.Encoded.Verify("secret-password", encoded);
```

## 5. Nguyên thủy bảo mật hằng số thời gian và bộ nhớ (`Nalix.Codec.Security.Primitives`)

- **`BitwiseOperations`** (`src/Nalix.Codec/Security/Primitives/BitwiseOperations.cs`):
  - `public static bool FixedTimeEquals(ReadOnlySpan<byte> left, ReadOnlySpan<byte> right)` — So sánh byte theo thời gian hằng số (`[MethodImpl(NoInlining | NoOptimization)]`), chống tấn công kênh kề qua thời gian.
  - `public static bool IsZero(ReadOnlySpan<byte> value)` — Kiểm tra toàn bộ bằng 0 theo thời gian hằng số, dùng cho khóa và bí mật.
- **`MemorySecurity`** (`src/Nalix.Codec/Security/Primitives/MemorySecurity.cs`):
  - `public static void ZeroMemory(byte[] buffer)` và `public static void ZeroMemory(Span<byte> buffer)` — Ghi đè bộ đệm nhạy cảm bằng `Volatile.Write(..., 0)` để JIT không loại bỏ việc xóa khóa như ghi thừa.

## 6. Nguyên thủy băm cho giao thức và khung (`Nalix.Environment.Hashing`)

`Nalix.Environment.Hashing` cung cấp các tiện ích băm không mật mã và băm theo RFC cho khung dữ liệu:

- **`XxHash32`** (`src/Nalix.Environment/Hashing/XxHash32.cs`):
  - `public static uint Compute(ReadOnlySpan<byte> data, uint seed = 0)` — xxHash 32-bit tăng tốc SIMD Vector128, dùng cho thẻ xác thực datagram UDP (`XxHash32.Compute(connection.Secret.AsSpan(), seed: XxHash32.Compute(datagram))`) và phân mảnh bucket nhanh.
  - `public static int Compute(ulong hi, ulong lo, bool isIPv6)` — Băm 32-bit dương không cấp phát bộ nhớ, dùng làm khóa endpoint socket.
- **`Sha1`** (`src/Nalix.Environment/Hashing/Sha1.cs`):
  - `public const int HashSize = 20;`
  - `public static void HashData(ReadOnlySpan<byte> data, Span<byte> destination)` / `public static bool TryHashData(ReadOnlySpan<byte> data, Span<byte> destination)` / `public static byte[] HashData(ReadOnlySpan<byte> data)` — Triển khai SHA-1 theo RFC 3174 được quản lý, không cấp phát bộ nhớ, chỉ dùng để dẫn xuất header `Sec-WebSocket-Accept` theo RFC 6455 §4.2.2.

## API liên quan

- [Tổng quan Mật mã học](./cryptography.md)
- [AEAD và Envelope](./aead-and-envelope.md)
- [Giao thức Handshake](./handshake.md)
