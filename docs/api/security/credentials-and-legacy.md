# Credentials and Legacy

This page covers credential hashing helpers plus the legacy signing surface still present in source.

## Source mapping

- `src/Nalix.Framework/Security/Credentials/PBKDF2.cs`
- `src/Nalix.Framework/Security/Credentials/PBKDF2_I.cs`
- `src/Nalix.Framework/Security/Asymmetric/Ed25519.cs`

## Pbkdf2

The public credential helper in source is `Pbkdf2`.

## Basic usage

```csharp
Pbkdf2.Hash("secret", out byte[] salt, out byte[] hash);

bool valid = Pbkdf2.Verify("secret", salt, hash);
```

`Pbkdf2.Encoded` also packs `version + salt + hash` into a Base64 string for storage.

## Current runtime behavior

- default key size is `32`
- default salt size is `32`
- default iteration count is `310_000`
- verification uses fixed-time comparison

## Ed25519 status

`Ed25519` still exists in source, but it is marked obsolete.

Treat it as legacy surface, not the primary recommendation for new Nalix protocol work.

The current networking and handshake flow does not depend on it.

## Related APIs

- [Cryptography](./cryptography.md)
- [Key Agreement](./key-agreement.md)
