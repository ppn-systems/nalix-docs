---
title: Hashing and MAC
description: Keccak-256, HMAC-Keccak-256, HKDF-Keccak-256, Poly1305 MAC, PBKDF2 credential hashing, and SecurityOptions in Nalix.Codec.Security.Hashing.
section: API Reference
package: Nalix.Codec
---

**Namespaces:** `Nalix.Codec.Security.Hashing`, `Nalix.Codec.Options`  
**Assembly:** `Nalix.Codec`

This page covers the hashing, message-authentication, and password-derivation primitives in `Nalix.Codec.Security.Hashing` along with `SecurityOptions`.

## Source Mapping

- `src/Nalix.Codec/Security/Hashing/Keccak256.cs`
- `src/Nalix.Codec/Security/HkdfKeccak256.cs`
- `src/Nalix.Codec/Security/Hashing/HmacKeccak256.cs`
- `src/Nalix.Codec/Security/Hashing/Poly1305.cs`
- `src/Nalix.Codec/Security/Hashing/Pbkdf2.cs`
- `src/Nalix.Codec/Options/SecurityOptions.cs`

## 1. `Keccak256`

`Keccak256` implements the **original Keccak-256 sponge** (rate = 136 bytes, capacity = 512 bits, output = 32 bytes, domain padding byte = `0x01`) with SIMD-accelerated fast paths (AVX-512, AVX2, AdvSimd, SSE2) and zero heap allocations on span/struct paths.

:::important[Keccak-256 vs. FIPS SHA3-256]
`Keccak256` uses the original Keccak domain padding byte (`0x01`), matching Ethereum/Web3 `Keccak-256`—not FIPS 202 `SHA3-256` (which uses `0x06`).
:::

### Public Static Members

- `string AlgorithmName => "Keccak-256"`
- `Bytes32 HashDataToFixed(ReadOnlySpan<byte> data)` — Zero-allocation one-shot hash returning a 32-byte `Bytes32` value type.
- `void HashData(ReadOnlySpan<byte> data, Span<byte> output)` — Zero-allocation hash writing 32 bytes into `output` (throws `ArgumentException` if `output.Length < 32`).
- `bool TryHashData(ReadOnlySpan<byte> data, Span<byte> output)` — Non-throwing span overload; returns `false` if `output.Length < 32`.
- `byte[] HashData(ReadOnlySpan<byte> data)` — Allocates and returns a 32-byte `byte[]`.
- `Keccak256.Sponge` (nested `public struct`, `[EditorBrowsable(Never)]`) — Stack-allocated incremental sponge (200-byte state plus a 136-byte buffer) for inputs larger than one rate block. Obtain it with `new Keccak256.Sponge()`; `void Absorb(scoped ReadOnlySpan<byte> data)` feeds data in any chunk size and `void PadAndSqueeze(scoped Span<byte> output)` applies the Keccak padding and writes the 32-byte digest. `Pbkdf2` uses it internally for its inner and outer hash.

```csharp
using System;
using Nalix.Abstractions.Primitives;
using Nalix.Codec.Security.Hashing;

// Incremental hashing of a large stream
Keccak256.Sponge sponge = new();
sponge.Absorb(chunk1);
sponge.Absorb(chunk2);
Span<byte> digest = stackalloc byte[32];
sponge.PadAndSqueeze(digest);

// Zero-allocation fixed 32-byte struct
Bytes32 fixedDigest = Keccak256.HashDataToFixed(payload);

// Zero-allocation stack span
Span<byte> buffer = stackalloc byte[32];
Keccak256.HashData(payload, buffer);
```

---

## 2. `HmacKeccak256`

`HmacKeccak256` implements RFC 2104 HMAC over `Keccak256` (rate/block size = `136` bytes, output = `32` bytes), wiping all intermediate key pads on the stack before returning.

### Public Static Member

- `void Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> data, Span<byte> output)` — Computes the 32-byte HMAC tag into `output` (throws `ArgumentException` if `output.Length < 32`).

```csharp
using System;
using Nalix.Codec.Security.Hashing;
using Nalix.Codec.Security.Primitives;

Span<byte> mac = stackalloc byte[32];
HmacKeccak256.Compute(key, data, mac);

bool authentic = BitwiseOperations.FixedTimeEquals(mac, expectedMac);
```

---

## 2b. `HkdfKeccak256`

`HkdfKeccak256` (`public static class`, namespace `Nalix.Codec.Security`, `src/Nalix.Codec/Security/HkdfKeccak256.cs`) is HKDF (RFC 5869) over `HmacKeccak256` with a 32-byte output. It is the key derivation used by the X25519 handshake (`HandshakeX25519`), the session rekey, and the datagram key schedule (`DatagramKeySchedule`).

### Public Static Members

- `const int MaxInfoLength = 256` — The largest `info` accepted by `Expand`, in bytes.
- `Bytes32 Extract(ReadOnlySpan<byte> salt, ReadOnlySpan<byte> ikm)` — HKDF-Extract: `PRK = HMAC(salt, IKM)`; `salt` may be empty.
- `Bytes32 Expand(Bytes32 prk, ReadOnlySpan<byte> info)` — HKDF-Expand for one 32-byte block: `OKM = HMAC(PRK, info || 0x01)`. Wipes its own copy of `prk` and throws `ArgumentOutOfRangeException` when `info.Length > MaxInfoLength`.

```csharp
using System.Text;
using Nalix.Abstractions.Primitives;
using Nalix.Codec.Security;

Bytes32 prk = HkdfKeccak256.Extract(salt: default, ikm: sharedSecret);
Bytes32 key = HkdfKeccak256.Expand(prk, "my-app/key"u8);
```

---

## 3. `Poly1305`

`Poly1305` (`public ref struct Poly1305`) is a zero-allocation RFC 8439 one-time authenticator (`KeySize = 32`, `TagSize = 16`) used by `ChaCha20Poly1305` and `Salsa20Poly1305`.

### Public Members

- `const byte KeySize = 32`
- `const byte TagSize = 16`
- **One-shot static methods**:
  - `static void Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message, Span<byte> destination)`
  - `static byte[] Compute(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message)`
  - `static byte[] Compute(byte[] key, byte[] message)`
  - `static bool Verify(ReadOnlySpan<byte> key, ReadOnlySpan<byte> message, ReadOnlySpan<byte> tag)`
- **Incremental `ref struct` methods**:
  - `Poly1305(ReadOnlySpan<byte> key)`
  - `void Update(ReadOnlySpan<byte> data)`
  - `void FinalizeTag(Span<byte> tag)` / `byte[] FinalizeTag()`
  - `void ComputeTag(ReadOnlySpan<byte> message, Span<byte> destination)`
  - `void ComputeTagIncremental(ReadOnlySpan<byte> message, Span<byte> destination)` — Convenience: `Update(message)` followed by `FinalizeTag(destination)`.
  - `void Clear()` — Securely zeroes internal limbs and key state.

---

## 4. `Pbkdf2` & `SecurityOptions`

`Pbkdf2` provides password-based key derivation (`KeySize = 32`, `SaltSize = 32`, `Iterations = 150_000` in Release / `10_000` in Debug) backed by `HmacKeccak256`. `Pbkdf2.Encoded` encodes credentials as a 65-byte binary payload (`[Version (1B = 2)] || [Salt (32B)] || [Hash (32B)]`) formatted in Base64.

### `SecurityOptions` (`Nalix.Codec.Options`)

Loaded from `[Security]` in `server.ini` via `ConfigurationManager.Instance.Get<SecurityOptions>()`:

| Property | Type | Default | Validation | Description |
| --- | --- | ---: | --- | --- |
| `Pbkdf2Iterations` | `int` | `310_000` | `[ValueRange(1000, 10_000_000)]` | Default PBKDF2 iteration count used by `Pbkdf2.Hash` and `Pbkdf2.Encoded.Hash`. |

### Basic Usage

```csharp
using Nalix.Codec.Security.Hashing;

// Raw salt + 32-byte key derivation
Pbkdf2.Hash("secret-password", out byte[] salt, out byte[] hash);
bool validRaw = Pbkdf2.Verify("secret-password", salt, hash);

// Self-contained versioned Base64 string (stores iterations + salt + hash)
string encoded = Pbkdf2.Encoded.Hash("secret-password");
bool validEncoded = Pbkdf2.Encoded.Verify("secret-password", encoded);
```

## 5. Constant-Time & Memory Security Primitives (`Nalix.Codec.Security.Primitives`)

- **`BitwiseOperations`** (`src/Nalix.Codec/Security/Primitives/BitwiseOperations.cs`):
  - `public static bool FixedTimeEquals(ReadOnlySpan<byte> left, ReadOnlySpan<byte> right)` — Constant-time byte comparison (`[MethodImpl(NoInlining | NoOptimization)]`) preventing timing side-channel attacks.
  - `public static bool IsZero(ReadOnlySpan<byte> value)` — Constant-time all-zero check for keys and secrets.
- **`MemorySecurity`** (`src/Nalix.Codec/Security/Primitives/MemorySecurity.cs`):
  - `public static void ZeroMemory(byte[] buffer)` and `public static void ZeroMemory(Span<byte> buffer)` — Overwrites sensitive buffers by calling `Span<byte>.Clear()` inside a method marked `NoInlining | NoOptimization`, so the JIT cannot dead-store-eliminate key wiping.

## 6. Protocol & Framing Hash Primitives (`Nalix.Environment.Hashing`)

`Nalix.Environment.Hashing` provides non-cryptographic and RFC framing hash utilities:

- **`XxHash32`** (`src/Nalix.Environment/Hashing/XxHash32.cs`):
  - `public static uint Compute(ReadOnlySpan<byte> data, uint seed = 0)` — Vector128 SIMD-accelerated 32-bit xxHash used for fast, non-cryptographic bucket sharding (for example the per-endpoint shards of `TokenBucketLimiter` / `PolicyRateLimiter`) and `FragmentHeader.GetHashCode()`. It is not used to authenticate datagrams: NDP datagrams are sealed with ChaCha20-Poly1305.
  - `public static int Compute(ulong hi, ulong lo, bool isIPv6)` — Zero-allocation positive 32-bit hash for socket endpoint keys.
- **`Sha1`** (`src/Nalix.Environment/Hashing/Sha1.cs`):
  - `public const int HashSize = 20;`
  - `public static void HashData(ReadOnlySpan<byte> data, Span<byte> destination)` / `public static bool TryHashData(ReadOnlySpan<byte> data, Span<byte> destination)` / `public static byte[] HashData(ReadOnlySpan<byte> data)` — Zero-allocation managed RFC 3174 SHA-1 implementation used strictly for RFC 6455 §4.2.2 `Sec-WebSocket-Accept` header derivation.

## Related APIs

- [Cryptography Overview](./cryptography.md)
- [AEAD and Envelope](./aead-and-envelope.md)
- [Handshake Protocol](./handshake.md)
