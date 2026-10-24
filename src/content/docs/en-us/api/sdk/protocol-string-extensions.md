---
title: Protocol String Extensions
description: Reference for ProtocolStringExtensions.ToDisplayString in Nalix.SDK.Extensions — human-readable descriptions for ProtocolReason and ProtocolAdvice.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Extensions`  
**Assembly:** `Nalix.SDK`

`ProtocolStringExtensions` provides zero-allocation switch-mapped display strings (`ToDisplayString()`) for all `ProtocolReason` and `ProtocolAdvice` enum values carried by server `Directive` and `Control` packets.

## Source Mapping

- `src/Nalix.SDK/Extensions/ProtocolStringExtensions.cs`
- `src/Nalix.Abstractions/Networking/Protocols/ProtocolReason.cs`
- `src/Nalix.Abstractions/Networking/Protocols/ProtocolAdvice.cs`
- `src/Nalix.Codec/ProtocolFrames/Directive.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`

## Public Signatures

```csharp
namespace Nalix.SDK.Extensions;

public static class ProtocolStringExtensions
{
    public static string ToDisplayString(this ProtocolReason reason);
    public static string ToDisplayString(this ProtocolAdvice advice);
}
```

## Representative Mappings

### `ProtocolReason.ToDisplayString()`

| Enum Category | Representative Values | Returned Display String |
| :--- | :--- | :--- |
| **Framing & Protocol** | `MALFORMED_PACKET`, `CHECKSUM_FAILED`, `UNSUPPORTED_PACKET` | `"Malformed packet."`, `"Invalid checksum."`, `"Unsupported packet."` |
| **Authentication & Session** | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_LOCKED`, `SESSION_EXPIRED`, `SESSION_NOT_FOUND` | `"Authentication required."`, `"Session expired."`, `"Session invalid."`, `"Account locked."`, `"Session expired."`, `"Session not found."` |
| **Rate Limiting & Quotas** | `RATE_LIMITED`, `POW_REQUIRED`, `CONNECTION_LIMIT` | `"Too many requests."`, `"Proof of Work required."`, `"Too many connections."` |
| **Cryptography** | `CRYPTO_UNSUPPORTED`, `DECRYPTION_FAILED`, `KEY_ROTATION_REQUIRED` | `"Unsupported cryptography."`, `"Decryption failed."`, `"Key rotation required."` |

### `ProtocolAdvice.ToDisplayString()`

| `ProtocolAdvice` Value | Returned Display String |
| :--- | :--- |
| `NONE` | `"No action required."` |
| `RETRY` | `"Please try again."` |
| `BACKOFF_RETRY` | `"Please wait and try again."` |
| `DO_NOT_RETRY` | `"Cannot retry automatically."` |
| `REAUTHENTICATE` | `"Sign in again required."` |
| `SLOW_DOWN` | `"Please slow down."` |
| `RECONNECT` | `"Please reconnect."` |
| `FIX_AND_RETRY` | `"Fix the issue and try again."` |
| `_` (fallback) | `"Unknown action."` |

## Usage Example

```csharp
using System;
using Nalix.Codec.ProtocolFrames;
using Nalix.SDK.Extensions;
using Nalix.SDK.Transport.Extensions;

session.On<Directive>(directive =>
{
    string reasonText = directive.Reason.ToDisplayString();
    string adviceText = directive.Advice.ToDisplayString();

    Console.WriteLine($"Server Directive [{directive.Type}]: {reasonText} {adviceText}");
});
```

## Related APIs

- [Subscriptions (On&lt;TPacket&gt;)](./subscriptions.md)
- [Control Utilities](./control-utilities.md)
- [Control & Directive Packets](../codec/packets/built-in-frames.md)
