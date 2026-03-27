# Key Agreement

This page covers the asymmetric key-agreement surface in `Nalix.Framework.Security`.

## Source mapping

- `src/Nalix.Framework/Security/Asymmetric/X25519.cs`
- `src/Nalix.Framework/Security/Asymmetric/X25519.FieldElement.cs`

## Main type

- `X25519`

`X25519` is the current key-agreement primitive used by Nalix handshake flows.

## Basic usage

```csharp
var local = X25519.GenerateKeyPair();
var remote = X25519.GenerateKeyPair();

byte[] sharedSecret = X25519.Agreement(local.PrivateKey, remote.PublicKey);
```

## Current runtime behavior

- `GenerateKeyPair()` creates a random 32-byte private key and clamps it before deriving the public key
- `GenerateKeyFromPrivateKey(...)` lets you rebuild a key pair from stored private material
- `Agreement(...)` requires 32-byte inputs
- low-order points are rejected by the scalar multiplication path

## How it fits Nalix

In the SDK handshake flow:

```text
client private key + server public key
-> X25519 shared secret
-> hash / derivation
-> TransportOptions.Secret
```

This is the part that establishes the shared secret before transport encryption starts.

## Related APIs

- [Cryptography](./cryptography.md)
- [Hashing and MAC](./hashing-and-mac.md)
- [SDK Extensions](../sdk/tcp-session-extensions.md)
