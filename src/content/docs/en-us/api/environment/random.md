---
title: Random
description: Cryptographically strong random number generation in Nalix.Environment.Random via the Csprng and OsCsprng utilities.
section: API Reference
package: Nalix.Environment
---

**Namespace:** `Nalix.Environment.Random`  
**Assembly:** `Nalix.Environment`

`Csprng` provides thread-safe, cryptographically strong random number generation backed directly by the operating system's CSPRNG (`OsCsprng`).

## Source Mapping

- `src/Nalix.Environment/Random/Csprng.cs`
- `src/Nalix.Environment/Random/OsCsprng.cs`

## Platform Entropy Backends (`OsCsprng`)

`OsCsprng.Fill(Span<byte>)` invokes native OS entropy primitives directly without intermediate allocations:

- **Windows:** `BCryptGenRandom` (`bcrypt.dll`, `BCRYPT_USE_SYSTEM_PREFERRED_RNG`)
- **Linux / Android:** `getrandom` syscall (`libc`) with `/dev/urandom` fallback
- **macOS / iOS / tvOS:** `SecRandomCopyBytes` (`Security.framework`) with `/dev/urandom` fallback
- **Other POSIX:** `/dev/urandom` (managed via a persistent file descriptor that can be closed on application shutdown via `OsCsprng.Shutdown()`)

:::important[Fail-Closed Security Invariant]
During static initialization, `Csprng` probes `OsCsprng.Fill` with a 16-byte test buffer and verifies that the output is not all-0x00 or all-0xFF. If the OS CSPRNG is unavailable or fails, `Csprng` throws `CipherException` immediately — it **never** falls back to a predictable non-cryptographic PRNG.
:::

## `Csprng` Public Members

| Member | Signature | Description |
| --- | --- | --- |
| `MaxByteArrayLength` | `public const int MaxByteArrayLength = SerializerBounds.MaxArray;` (`1_048_576`) | Maximum byte array length accepted by allocation-returning helpers. |
| `Fill` | `public static void Fill(Span<byte> data)` | Fills `data` in-place with cryptographically strong random bytes (zero allocations). |
| `GetBytes` | `public static byte[] GetBytes(int length)` | Allocates and returns a `byte[length]` filled with random bytes (`0 <= length <= MaxByteArrayLength`). |
| `CreateNonce` | `public static byte[] CreateNonce(int length = 12)` | Allocates and returns a random nonce (defaults to 12 bytes for ChaCha20-Poly1305). |
| `NextBytes(byte[])` | `public static void NextBytes(byte[] buffer)` | Fills `buffer` in-place with random bytes. |
| `NextBytes(Span<byte>)` | `public static void NextBytes(Span<byte> buffer)` | Fills `buffer` in-place with random bytes. |
| `GetInt32(int, int)` | `public static int GetInt32(int minValue, int maxValue)` | Returns an unbiased random `int` in `[minValue, maxValue)` using bitmask rejection sampling. |
| `GetInt32(int)` | `public static int GetInt32(int maxValue)` | Shortcut for `GetInt32(0, maxValue)`. |
| `NextUInt32` | `public static uint NextUInt32()` | Returns a cryptographically random 32-bit unsigned integer. |
| `NextUInt64` | `public static ulong NextUInt64()` | Returns a cryptographically random 64-bit unsigned integer. |
| `NextDouble` | `public static double NextDouble()` | Returns a random `double` in `[0.0, 1.0)` with 53 bits of cryptographic precision. |

## Usage Example

```csharp
using System;
using Nalix.Environment.Random;

// Zero-allocation 12-byte nonce on the stack
Span<byte> nonce = stackalloc byte[12];
Csprng.Fill(nonce);

// Unbiased random port in dynamic range [49152, 65535)
int ephemeralPort = Csprng.GetInt32(49152, 65535);

// 32-byte handshake challenge
byte[] challenge = Csprng.GetBytes(32);
```

## Related APIs

- [AEAD & Envelope Encryption](../security/aead-and-envelope.md)
- [Handshake Protocol (X25519)](../security/handshake.md)
- [Clock](./clock.md)
