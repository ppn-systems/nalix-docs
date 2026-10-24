---
title: AEAD và Envelope
description: Trang này trình bày các nguyên thủy mã hóa quan trọng nhất đối với việc bảo vệ transport và gói tin.
section: API Reference
package: Nalix.Codec / Nalix.Network
---

**Namespaces:** `Nalix.Codec.Security`, `Nalix.Codec.Security.Aead`, `Nalix.Codec.Security.Symmetric`, `Nalix.Codec.Security.Engine`  
**Assembly:** `Nalix.Codec`

Trang này trình bày các nguyên thủy mã hóa quan trọng nhất đối với việc bảo vệ transport và gói tin.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Security/Aead/ChaCha20Poly1305.cs`
- `src/Nalix.Codec/Security/Aead/Salsa20Poly1305.cs`
- `src/Nalix.Codec/Security/Engine/AeadEngine.cs`
- `src/Nalix.Codec/Security/Engine/SymmetricEngine.cs`
- `src/Nalix.Codec/Security/Symmetric/ChaCha20.cs`
- `src/Nalix.Codec/Security/Symmetric/Salsa20.cs`
- `src/Nalix.Codec/Security/EnvelopeCipher.cs`

## Các kiểu chính

- `ChaCha20Poly1305`
- `Salsa20Poly1305`
- `EnvelopeCipher`

## Nguyên thủy AEAD

`ChaCha20Poly1305` và `Salsa20Poly1305` là các triển khai tag tách rời (detached-tag).

Hiện tại chúng:

- nhận span trước, với các overload cấp phát bộ nhớ tối thiểu
- xác thực `AAD || pad16 || ciphertext || pad16 || lengths`
- xác minh tag trước khi trả về dữ liệu đã giải mã
- ràng buộc envelope của Nalix `header || nonce || userAAD` vào xác thực AEAD, nên việc giả mạo các trường sequence/header sẽ bị từ chối khi giải mã

## Quy tắc kích thước từ mã nguồn

| Kiểu | Kích thước khóa | Kích thước nonce | Kích thước tag |
| --- | ---: | ---: | ---: |
| `ChaCha20Poly1305` | `32` | `12` | `16` |
| `Salsa20Poly1305` | `16` hoặc `32` | `8` | `16` |

## EnvelopeCipher

`EnvelopeCipher` là lớp facade mã hóa cấp cao mà mã phía transport sử dụng.

Nó điều phối theo `CipherSuiteType` và ẩn việc bộ mật mã được chọn là:

- AEAD: `header || nonce || ciphertext || tag`
- stream/đối xứng: `header || nonce || ciphertext`

## Cách dùng cơ bản

```csharp
Span<byte> ciphertext = stackalloc byte[plaintext.Length + EnvelopeCipher.HeaderSize + 32];

EnvelopeCipher.Encrypt(
    key,
    plaintext,
    ciphertext,
    aad,
    seq: null,
    algorithm: CipherSuiteType.Chacha20Poly1305,
    out int written);
```

## API mã hóa và giải mã

`EnvelopeCipher` cung cấp cả overload 6 tham số (không có AAD tường minh) và 7 tham số (có `ReadOnlySpan<byte> aad`) cho `Encrypt`, `Decrypt` và `TryDecrypt`:

### API mã hóa

```csharp
public static void Encrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> plaintext,
    Span<byte> ciphertext,
    uint? seq,
    CipherSuiteType algorithm,
    out int written);

public static void Encrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> plaintext,
    Span<byte> ciphertext,
    ReadOnlySpan<byte> aad,
    uint? seq,
    CipherSuiteType algorithm,
    out int written);
```

### API giải mã có ném ngoại lệ

```csharp
public static void Decrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> envelope,
    Span<byte> plaintext,
    CipherSuiteType expectedAlgorithm,
    out int written, out uint seq);

public static void Decrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> envelope,
    Span<byte> plaintext,
    ReadOnlySpan<byte> aad,
    CipherSuiteType expectedAlgorithm,
    out int written, out uint seq);
```

Ném `CipherException` khi phân tích thất bại, không khớp thuật toán, hoặc xác thực thất bại.
Ném `ArgumentException` nếu bộ đệm plaintext đích quá nhỏ.

`Decrypt` nội bộ ủy quyền cho `TryDecrypt` và chuyển `CipherError` thành ngoại lệ.

### API giải mã không ném ngoại lệ

```csharp
public static bool TryDecrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> envelope,
    Span<byte> plaintext,
    CipherSuiteType expectedAlgorithm,
    out int written, out uint seq);

public static bool TryDecrypt(
    ReadOnlySpan<byte> key,
    ReadOnlySpan<byte> envelope,
    Span<byte> plaintext,
    ReadOnlySpan<byte> aad,
    CipherSuiteType expectedAlgorithm,
    out int written, out uint seq);
```

Trả về `false` khi có bất kỳ lỗi nào. Không ném ngoại lệ khi xác thực hoặc định dạng thất bại.

### Các giá trị CipherError

Enum `CipherError` nội bộ phân biệt các chế độ lỗi sau:

| Giá trị | Ý nghĩa |
| --- | --- |
| `EnvelopeTooShort` | Bộ đệm envelope quá ngắn, không chứa được header hợp lệ. |
| `InvalidHeader` | Magic hoặc phiên bản của header envelope không hợp lệ. |
| `InvalidNonceLength` | Độ dài nonce khai báo không khớp kích thước mong đợi của bộ mật mã. |
| `CiphertextTooShort` | Phần ciphertext ngắn hơn tag khai báo hoặc kích thước tối thiểu. |
| `InvalidTagLength` | Độ dài tag xác thực không hợp lệ đối với bộ mật mã. |
| `AlgorithmMismatch` | Thuật toán khai báo trong envelope không khớp với `expectedAlgorithm`. |
| `AuthenticationFailed` | Xác minh tag AEAD thất bại. |
| `UnsupportedAlgorithm` | Bộ mật mã không được nhận diện. |
| `DestinationTooSmall` | Bộ đệm plaintext đầu ra quá nhỏ cho payload đã giải mã. |

## Hành vi runtime hiện tại

- `GetNonceLength(...)` và `GetTagLength(...)` cung cấp kích thước phụ thuộc vào bộ mật mã
- `GetNonceLength(...)` và `GetTagLength(...)` ném `CipherException` với bộ mật mã không được hỗ trợ
- Các bộ AEAD được chuyển tới `AeadEngine`
- Các bộ không phải AEAD được chuyển tới `SymmetricEngine`
- Mã hóa AEAD tự sinh nonce ngẫu nhiên mới bên trong cho mỗi lần gọi
- Giải mã AEAD coi các thay đổi header của envelope, chẳng hạn thay đổi số sequence, là lỗi xác thực
- Phân tích envelope dùng `EnvelopeFormat.TryParseEnvelope()` nội bộ; `ParseEnvelope()` ném ngoại lệ cũng có sẵn nhưng `TryParseEnvelope` là đường chính

## API liên quan

- [Cryptography](./cryptography.md)
- [Hashing and MAC](./hashing-and-mac.md)
- [Transport Options](../options/sdk/transport-options.md)
- [UDP Security Guide](../../guides/networking/udp-security.md)
