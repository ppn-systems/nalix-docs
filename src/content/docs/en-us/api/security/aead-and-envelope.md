---
title: AEAD and Envelope
description: This page covers the encryption primitives that matter most to transport and packet protection.
section: API Reference
package: Nalix.Codec / Nalix.Network
---

**Namespaces:** `Nalix.Codec.Security`, `Nalix.Codec.Security.Aead`, `Nalix.Codec.Security.Symmetric`, `Nalix.Codec.Security.Engine`  
**Assembly:** `Nalix.Codec`

This page covers the encryption primitives that matter most to transport and packet protection.

## Source mapping

- `src/Nalix.Codec/Security/Aead/ChaCha20Poly1305.cs`
- `src/Nalix.Codec/Security/Aead/Salsa20Poly1305.cs`
- `src/Nalix.Codec/Security/Engine/AeadEngine.cs`
- `src/Nalix.Codec/Security/Engine/SymmetricEngine.cs`
- `src/Nalix.Codec/Security/Symmetric/ChaCha20.cs`
- `src/Nalix.Codec/Security/Symmetric/Salsa20.cs`
- `src/Nalix.Codec/Security/EnvelopeCipher.cs`

## Main types

- `ChaCha20Poly1305`
- `Salsa20Poly1305`
- `EnvelopeCipher`

## AEAD primitives

`ChaCha20Poly1305` and `Salsa20Poly1305` are detached-tag implementations.

They currently:

- take spans first, with minimal-allocation overloads
- authenticate `AAD || pad16 || ciphertext || pad16 || lengths`
- verify the tag before returning decrypted data
- bind the Nalix envelope `header || nonce || userAAD` into AEAD authentication, so tampering with sequence/header fields is rejected during decrypt

## Size rules from source

| Type | Key size | Nonce size | Tag size |
| --- | ---: | ---: | ---: |
| `ChaCha20Poly1305` | `32` | `12` | `16` |
| `Salsa20Poly1305` | `16` or `32` | `8` | `16` |

## EnvelopeCipher

`EnvelopeCipher` is the high-level encryption facade used by transport-facing code.

It dispatches by `CipherSuiteType` and hides whether the selected suite is:

- AEAD: `header || nonce || ciphertext || tag`
- stream/symmetric: `header || nonce || ciphertext`

## Basic usage

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

## Encryption & Decryption APIs

`EnvelopeCipher` exposes both 6-parameter (no explicit AAD) and 7-parameter (with `ReadOnlySpan<byte> aad`) overloads for `Encrypt`, `Decrypt`, and `TryDecrypt`:

### Encryption API

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

### Throwing Decryption API

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

Throws `CipherException` on parse failure, algorithm mismatch, or authentication failure.
Throws `ArgumentException` if the destination plaintext buffer is too small.

`Decrypt` delegates internally to `TryDecrypt` and translates `CipherError` into exceptions.

### Non-throwing Decryption API

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

Returns `false` on any failure. Does not throw on authentication or formatting failures.

### CipherError values

The internal `CipherError` enum distinguishes the following failure modes:

| Value | Meaning |
| --- | --- |
| `EnvelopeTooShort` | The envelope buffer is too short to contain a valid header. |
| `InvalidHeader` | The envelope header magic or version is invalid. |
| `InvalidNonceLength` | The declared nonce length does not match the expected size for the cipher suite. |
| `CiphertextTooShort` | The ciphertext portion is shorter than the declared tag or minimum size. |
| `InvalidTagLength` | The authentication tag length is invalid for the cipher suite. |
| `AlgorithmMismatch` | The algorithm declared in the envelope does not match `expectedAlgorithm`. |
| `AuthenticationFailed` | AEAD tag verification failed. |
| `UnsupportedAlgorithm` | The cipher suite is not recognized. |
| `DestinationTooSmall` | The plaintext output buffer is too small for the decrypted payload. |

## Current runtime behavior

- `GetNonceLength(...)` and `GetTagLength(...)` expose suite-dependent sizing
- `GetNonceLength(...)` and `GetTagLength(...)` throw `CipherException` for unsupported cipher suites
- AEAD suites route into `AeadEngine`
- non-AEAD suites route into `SymmetricEngine`
- AEAD encryption generates a fresh random nonce internally per call
- AEAD decryption treats envelope header mutations such as sequence-number changes as authentication failures
- Envelope parsing uses `EnvelopeFormat.TryParseEnvelope()` internally; the throwing `ParseEnvelope()` is also available but `TryParseEnvelope` is the primary path

## Related APIs

- [Cryptography](./cryptography.md)
- [Hashing and MAC](./hashing-and-mac.md)
- [Transport Options](../options/sdk/transport-options.md)
- [UDP Security Guide](../../guides/networking/udp-security.md)
