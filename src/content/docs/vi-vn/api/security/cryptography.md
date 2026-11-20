---
title: Mật mã học
description: Tổng quan về các nguyên thủy mật mã, bộ mã hóa envelope AEAD, handshake X25519, Proof-of-Work và các API băm trong Nalix.Codec.Security.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.Security` (và các namespace con `Asymmetric`, `Aead`, `Symmetric`, `Hashing`, `Engine`)  
**Assembly:** `Nalix.Codec`

`Nalix.Codec.Security` cung cấp các engine mật mã không cấp phát bộ nhớ và các nguyên thủy giao thức dùng cho mã hóa transport, thỏa thuận khóa X25519, tiếp tục phiên và thử thách Proof-of-Work chống DDoS.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Security/Asymmetric/X25519.cs`
- `src/Nalix.Codec/Security/Hashing/Keccak256.cs`
- `src/Nalix.Codec/Security/HkdfKeccak256.cs`
- `src/Nalix.Codec/Security/Datagram/DatagramKeySchedule.cs`
- `src/Nalix.Codec/Security/Datagram/ChaCha20Poly1305DatagramProtection.cs`
- `src/Nalix.Codec/Security/Hashing/HmacKeccak256.cs`
- `src/Nalix.Codec/Security/Hashing/Poly1305.cs`
- `src/Nalix.Codec/Security/Hashing/Pbkdf2.cs`
- `src/Nalix.Codec/Security/Symmetric/ChaCha20.cs`
- `src/Nalix.Codec/Security/Symmetric/Salsa20.cs`
- `src/Nalix.Codec/Security/Aead/ChaCha20Poly1305.cs`
- `src/Nalix.Codec/Security/Aead/Salsa20Poly1305.cs`
- `src/Nalix.Codec/Security/Engine/AeadEngine.cs`
- `src/Nalix.Codec/Security/Engine/SymmetricEngine.cs`
- `src/Nalix.Codec/Security/EnvelopeCipher.cs`
- `src/Nalix.Codec/Security/HandshakeX25519.cs`
- `src/Nalix.Codec/Security/ProofOfWork.cs`
- `src/Nalix.Codec/Security/ProofOfWorkSolver.cs`
- `src/Nalix.Codec/Options/SecurityOptions.cs`

## Bản đồ chủ đề bảo mật

| Chủ đề | Kiểu chính | Đọc tiếp |
| --- | --- | --- |
| **Băm và MAC** | `Keccak256` (and its nested `Sponge`), `HmacKeccak256`, `HkdfKeccak256`, `Poly1305`, `Pbkdf2`, `SecurityOptions` | [Băm và MAC](./hashing-and-mac.md) |
| **AEAD và mã hóa Envelope** | `EnvelopeCipher`, `AeadEngine`, `SymmetricEngine`, `ChaCha20Poly1305`, `Salsa20Poly1305`, `ChaCha20`, `Salsa20` | [AEAD và Envelope](./aead-and-envelope.md) |
| **Giao thức handshake X25519** | `X25519`, `HandshakeX25519`, `HandshakeHandlers`, `HandshakeExtensions` | [Giao thức Handshake](./handshake.md) |
| **Bảo vệ datagram (NDP)** | `DatagramKeySchedule`, `ChaCha20Poly1305DatagramProtection`, `ChaCha20Poly1305DatagramProtectionFactory` | [Datagram Session](../sdk/datagram-session.md) |
| **Proof-of-Work (chống DDoS)** | `ProofOfWork`, `ProofOfWorkSolver`, `IProofOfWorkPolicy`, `ProofOfWorkHandlers` | [Proof-of-Work](./proof-of-work.md) |
| **Tiếp tục phiên** | `SessionResume`, `SessionHandlers`, `SessionService`, `ResumeExtensions` | [Tiếp tục phiên](./session-resume.md) |
| **Rekey phiên và xoay bộ mật mã** | `HandshakeX25519.DeriveRekeySecret`, `SystemControlHandlers`, `RekeyExtensions`, `CipherExtensions` | [Rekey phiên](./session-rekey.md) |
| **Mức quyền** | `PermissionLevel`, `PermissionEvaluation`, `PacketPermissionAttribute` | [Mức quyền](./permission-level.md) |

## Hướng dẫn nhanh

- Dùng **`X25519`** (`Nalix.Codec.Security.Asymmetric.X25519`) và **`HandshakeX25519`** cho thỏa thuận khóa kiểu Noise với khóa ephemeral + khóa tĩnh.
- Dùng **`Keccak256.HashDataToFixed(ReadOnlySpan<byte>)`** khi bạn cần một digest `Bytes32` không cấp phát bộ nhớ trên stack; dùng `Keccak256.Sponge` để băm tăng dần.
- Dùng **`HkdfKeccak256.Extract` / `Expand`** (HKDF trên `HmacKeccak256`, đầu ra 32 byte) để dẫn xuất khóa từ một shared secret; handshake, rekey và lịch khóa datagram đều dùng nó.
- Dùng **`EnvelopeCipher`** (`Encrypt`, `Decrypt`, `TryDecrypt`; `public static class`) để mã hóa và xác thực khung ở phía transport.
- Dùng **`Pbkdf2`** (cấu hình qua `SecurityOptions.Pbkdf2Iterations` hoặc `Pbkdf2.Iterations`: `150_000` ở Release / `10_000` ở Debug) để băm mật khẩu/thông tin xác thực.
- Dùng **`Csprng`** (`Nalix.Environment.Random.Csprng`) để lấy byte ngẫu nhiên an toàn về mật mã, nonce và lấy mẫu số nguyên không thiên lệch.

## Lịch khóa datagram

Các phiên datagram (NDP) không dùng lại cách mã hóa khung của stream. `DatagramKeySchedule` (`public static class`, `src/Nalix.Codec/Security/Datagram/DatagramKeySchedule.cs`) dẫn xuất secret theo từng chiều từ secret của phiên stream bằng `HkdfKeccak256`:

- `static void DeriveDirectionSecrets(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, out Bytes32 clientToServer, out Bytes32 serverToClient)` — nonce của ticket phải có `TicketNonceSize` (`16`) byte; các nhãn là `nalix-dgram/v1`, `nalix-dgram/c2s`, `nalix-dgram/s2c`.
- `static Bytes32 DeriveKey(Bytes32 secret)`, `static void DeriveIv(Bytes32 secret, Span<byte> iv)` (`IvSize = 12`), `static void BuildNonce(ReadOnlySpan<byte> iv, ulong packetNumber, Span<byte> nonce)` và `static Bytes32 DeriveNextSecret(Bytes32 secret)` (cập nhật khóa, nhãn `nalix-dgram/ku`).

`ChaCha20Poly1305DatagramProtection` (`sealed class`, triển khai `IDatagramProtection`) niêm phong và mở datagram bằng các khóa đó: `Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer)`, `Seal(packetNumber, header, plaintext, destination)`, `TryOpen(packetNumber, keyPhase, header, ciphertextAndTag, plaintext)`, `UpdateSendKey()`, `DiscardPreviousReceiveKey()`, `SendKeyPhase` và `TagSize`. `ChaCha20Poly1305DatagramProtectionFactory.Instance` triển khai `IDatagramProtectionFactory`. Xem [Datagram Session](../sdk/datagram-session.md).

## Ví dụ nhanh

```csharp
using Nalix.Abstractions.Primitives;
using Nalix.Codec.Security.Asymmetric;
using Nalix.Codec.Security.Hashing;
using Nalix.Environment.Random;

// 1. Sinh cặp khóa X25519 (trả về struct X25519.X25519KeyPair với PrivateKey, PublicKey và Wipe())
X25519.X25519KeyPair keyPair = X25519.GenerateKeyPair();
Bytes32 publicKey = keyPair.PublicKey;
keyPair.Wipe();

// 2. Băm Keccak-256 không cấp phát bộ nhớ thành Bytes32
Bytes32 digest = Keccak256.HashDataToFixed(payload);

// 3. Băm thông tin xác thực bằng PBKDF2 + kiểm tra theo thời gian hằng số
string encodedCredential = Pbkdf2.Encoded.Hash("my-secret-password");
bool isValid = Pbkdf2.Encoded.Verify("my-secret-password", encodedCredential);

// 4. Nonce CSPRNG và lấy mẫu số nguyên không thiên lệch
byte[] nonce = Csprng.CreateNonce(12);
int shardIndex = Csprng.GetInt32(0, 8);
```

## API liên quan

- [Băm và MAC](./hashing-and-mac.md)
- [AEAD và Envelope](./aead-and-envelope.md)
- [Giao thức Handshake](./handshake.md)
- [Random (Csprng)](../environment/random.md)
- [UDP Security Guide](../../guides/networking/datagram-security.md)
