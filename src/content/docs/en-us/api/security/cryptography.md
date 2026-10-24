---
title: Cryptography
description: Overview of the cryptographic primitives, AEAD envelope cipher, X25519 handshake, Proof-of-Work, and hashing APIs in Nalix.Codec.Security.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.Security` (and sub-namespaces `Asymmetric`, `Aead`, `Symmetric`, `Hashing`, `Engine`)  
**Assembly:** `Nalix.Codec`

`Nalix.Codec.Security` provides the zero-allocation cryptographic engines and protocol primitives used for transport encryption, X25519 key agreement, session resumption, and Proof-of-Work anti-DDoS challenges.

## Source Mapping

- `src/Nalix.Codec/Security/Asymmetric/X25519.cs`
- `src/Nalix.Codec/Security/Asymmetric/Ed25519.cs`
- `src/Nalix.Codec/Security/Hashing/Keccak256.cs`
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

## Security Topics Map

| Topic | Main Types | Read Next |
| --- | --- | --- |
| **Hashing and MAC** | `Keccak256`, `HmacKeccak256`, `Poly1305`, `Pbkdf2`, `SecurityOptions` | [Hashing and MAC](./hashing-and-mac.md) |
| **AEAD and Envelope Encryption** | `EnvelopeCipher`, `AeadEngine`, `SymmetricEngine`, `ChaCha20Poly1305`, `Salsa20Poly1305`, `ChaCha20`, `Salsa20` | [AEAD and Envelope](./aead-and-envelope.md) |
| **X25519 Handshake Protocol** | `X25519`, `HandshakeX25519`, `HandshakeHandlers`, `HandshakeExtensions` | [Handshake Protocol](./handshake.md) |
| **Proof-of-Work (Anti-DDoS)** | `ProofOfWork`, `ProofOfWorkSolver`, `IProofOfWorkPolicy`, `ProofOfWorkHandlers` | [Proof-of-Work](./proof-of-work.md) |
| **Session Resumption** | `SessionResume`, `SessionHandlers`, `SessionService`, `ResumeExtensions` | [Session Resumption](./session-resume.md) |
| **Session Rekey & Cipher Rotation** | `HandshakeX25519.DeriveRekeySecret`, `SystemControlHandlers`, `RekeyExtensions`, `CipherExtensions` | [Session Rekey](./session-rekey.md) |
| **Permission Levels** | `PermissionLevel`, `PermissionEvaluation`, `PacketPermissionAttribute` | [Permission Levels](./permission-level.md) |

## Quick Guidance

- Use **`X25519`** (`Nalix.Codec.Security.Asymmetric.X25519`), **`Ed25519`** (`GetPublicKey`, `Sign`, `Verify`), and **`HandshakeX25519`** for Noise-style ephemeral + static key agreement and digital signatures.
- Use **`Keccak256.HashDataToFixed(ReadOnlySpan<byte>)`** when you want a zero-allocation `Bytes32` digest on the stack.
- Use **`EnvelopeCipher`** (`Encrypt`, `Decrypt`, `TryDecrypt`) for transport-facing frame encryption and authentication.
- Use **`Pbkdf2`** (configured via `SecurityOptions.Pbkdf2Iterations` or `Pbkdf2.Iterations`: `150_000` Release / `10_000` Debug) for password/credential hashing.
- Use **`Csprng`** (`Nalix.Environment.Random.Csprng`) for cryptographically secure random bytes, nonces, and unbiased integer sampling.

## Quick Example

```csharp
using Nalix.Abstractions.Primitives;
using Nalix.Codec.Security.Asymmetric;
using Nalix.Codec.Security.Hashing;
using Nalix.Environment.Random;

// 1. X25519 key pair generation (returns X25519.X25519KeyPair struct with PrivateKey, PublicKey, and Wipe())
X25519.X25519KeyPair keyPair = X25519.GenerateKeyPair();
Bytes32 publicKey = keyPair.PublicKey;
keyPair.Wipe();

// 2. Zero-allocation Keccak-256 hash into Bytes32
Bytes32 digest = Keccak256.HashDataToFixed(payload);

// 3. PBKDF2 credential hash + constant-time verification
string encodedCredential = Pbkdf2.Encoded.Hash("my-secret-password");
bool isValid = Pbkdf2.Encoded.Verify("my-secret-password", encodedCredential);

// 4. CSPRNG nonce and unbiased integer sampling
byte[] nonce = Csprng.CreateNonce(12);
int shardIndex = Csprng.GetInt32(0, 8);
```

## Related APIs

- [Hashing and MAC](./hashing-and-mac.md)
- [AEAD and Envelope](./aead-and-envelope.md)
- [Handshake Protocol](./handshake.md)
- [Random (Csprng)](../environment/random.md)
- [UDP Security Guide](../../guides/networking/udp-security.md)
