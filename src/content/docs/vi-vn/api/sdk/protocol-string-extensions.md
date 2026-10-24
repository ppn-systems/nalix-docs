---
title: Protocol String Extensions
description: Tham chiếu cho ProtocolStringExtensions.ToDisplayString trong Nalix.SDK.Extensions — mô tả dễ đọc cho ProtocolReason và ProtocolAdvice.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Extensions`  
**Assembly:** `Nalix.SDK`

`ProtocolStringExtensions` cung cấp các chuỗi hiển thị ánh xạ bằng switch, không cấp phát bộ nhớ (`ToDisplayString()`), cho mọi giá trị enum `ProtocolReason` và `ProtocolAdvice` được mang trong các gói `Directive` và `Control` của server.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Extensions/ProtocolStringExtensions.cs`
- `src/Nalix.Abstractions/Networking/Protocols/ProtocolReason.cs`
- `src/Nalix.Abstractions/Networking/Protocols/ProtocolAdvice.cs`
- `src/Nalix.Codec/ProtocolFrames/Directive.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`

## Chữ ký công khai

```csharp
namespace Nalix.SDK.Extensions;

public static class ProtocolStringExtensions
{
    public static string ToDisplayString(this ProtocolReason reason);
    public static string ToDisplayString(this ProtocolAdvice advice);
}
```

## Ánh xạ tiêu biểu

### `ProtocolReason.ToDisplayString()`

| Nhóm enum | Giá trị tiêu biểu | Chuỗi hiển thị trả về |
| :--- | :--- | :--- |
| **Khung & giao thức** | `MALFORMED_PACKET`, `CHECKSUM_FAILED`, `UNSUPPORTED_PACKET` | `"Malformed packet."`, `"Invalid checksum."`, `"Unsupported packet."` |
| **Xác thực & phiên** | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `ACCOUNT_LOCKED`, `SESSION_EXPIRED`, `SESSION_NOT_FOUND` | `"Authentication required."`, `"Session expired."`, `"Session invalid."`, `"Account locked."`, `"Session expired."`, `"Session not found."` |
| **Giới hạn tốc độ & hạn mức** | `RATE_LIMITED`, `POW_REQUIRED`, `CONNECTION_LIMIT` | `"Too many requests."`, `"Proof of Work required."`, `"Too many connections."` |
| **Mật mã** | `CRYPTO_UNSUPPORTED`, `DECRYPTION_FAILED`, `KEY_ROTATION_REQUIRED` | `"Unsupported cryptography."`, `"Decryption failed."`, `"Key rotation required."` |

### `ProtocolAdvice.ToDisplayString()`

| Giá trị `ProtocolAdvice` | Chuỗi hiển thị trả về |
| :--- | :--- |
| `NONE` | `"No action required."` |
| `RETRY` | `"Please try again."` |
| `BACKOFF_RETRY` | `"Please wait and try again."` |
| `DO_NOT_RETRY` | `"Cannot retry automatically."` |
| `REAUTHENTICATE` | `"Sign in again required."` |
| `SLOW_DOWN` | `"Please slow down."` |
| `RECONNECT` | `"Please reconnect."` |
| `FIX_AND_RETRY` | `"Fix the issue and try again."` |
| `_` (mặc định) | `"Unknown action."` |

## Ví dụ sử dụng

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

## API liên quan

- [Subscriptions (On&lt;TPacket&gt;)](./subscriptions.md)
- [Tiện ích điều khiển](./control-utilities.md)
- [Gói Control & Directive](../codec/packets/built-in-frames.md)
