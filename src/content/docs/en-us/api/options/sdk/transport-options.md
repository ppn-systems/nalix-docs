---
title: Transport Options
description: Reference for Nalix.SDK.Options.TransportOptions — client endpoint connectivity, socket tuning, AEAD cipher selection, TOFU/pinned keys, 0-RTT resume, auto-reconnect, and keepalive settings.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`TransportOptions` (`public sealed partial class TransportOptions : ConfigurationLoader`) configures client-side connectivity, socket buffers, AEAD cipher suite, LZ4 compression, X25519 server key pinning / Trust-On-First-Use (TOFU), 0-RTT session resumption, `ReconnectSupervisor` backoff, keepalive probing, and clock synchronization across [TcpSession](../../sdk/tcp-session.md), [UdpSession](../../sdk/udp-session.md), and [WebSocketSession](../../sdk/websocket-session.md).

## Source Mapping

- `src/Nalix.SDK/Options/TransportOptions.cs`
- `src/Nalix.SDK/Transport/TransportSession.cs`
- `src/Nalix.SDK/Transport/Internal/ReconnectSupervisor.cs`
- `src/Nalix.SDK/Transport/Extensions/HandshakeExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs`

## Complete Property Reference

Loaded from the `[Transport]` section of `default.ini` via `ConfigurationManager.Instance.Get<TransportOptions>()` or constructed directly with `new TransportOptions()`:

### 1. Endpoint & Socket Tuning

| Property | Type | Default | Validation | Description |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]` | Default server port used by `ConnectAsync()` when no port override is passed. |
| `Address` | `string` | `"127.0.0.1"` | `[Length(1)]` | Default server IP address or hostname used by `ConnectAsync()`. |
| `ConnectTimeoutMillis` | `int` | `30000` (`30s`) | `[ValueRange(0, int.MaxValue)]` | Timeout in milliseconds for socket/WebSocket connect attempts (`0` = no timeout). |
| `NoDelay` | `bool` | `true` | — | Controls `Socket.NoDelay` (`TCP_NODELAY`) on `TcpSession`. |
| `BufferSize` | `int` | `65536` (`64 KB`) | `[ValueRange(2048, 1048576)]` | Socket send and receive buffer size in bytes (`2 KB..1 MB`). |
| `MaxUdpDatagramSize` | `int` | `1400` | `[ValueRange(64, 65507)]` | Maximum allowed UDP datagram size in bytes (including the 8-byte `SessionToken` and 4-byte `XxHash32` MAC trailer). |
| `AsyncQueueCapacity` | `int` | `1024` | `[ValueRange(1, 65536)]` | `[Reserved]` Asynchronous message processing queue capacity (currently not consumed). |

### 2. Encryption, Compression & Server Identity (TOFU / Pinning)

| Property | Type | Default | Validation | Description |
| :--- | :--- | ---: | :--- | :--- |
| `Algorithm` | `CipherSuiteType` | `CipherSuiteType.Chacha20Poly1305` | — | Symmetric cipher suite used when encrypting frames after `HandshakeAsync`. |
| `CompressionEnabled` | `bool` | `true` | — | Enables automatic LZ4 compression on outbound frames meeting `CompressionThreshold`. |
| `CompressionThreshold` | `int` | `512` | — | Minimum payload size in bytes before outbound LZ4 compression is applied. |
| `ServerPublicKey` | `string?` | `null` | — | Hex-encoded 32-byte static X25519 server identity public key for MitM-proof authentication during `HandshakeAsync`. |
| `AllowTofu` | `bool` | `true` | — | Allows Trust-On-First-Use (`PUBLIC_KEY_REQUEST` $\rightarrow$ `SessionTofu`) discovery when `ServerPublicKey` is null or empty. |
| `PersistTofuKey` | `bool` | `false` | — | When `true`, persists a TOFU-fetched `ServerPublicKey` to configuration storage after a verified handshake. |

### 3. 0-RTT Session Resumption & Auto-Reconnect (`ReconnectSupervisor`)

| Property | Type | Default | Validation | Description |
| :--- | :--- | ---: | :--- | :--- |
| `ResumeEnabled` | `bool` | `true` | — | Attempts 0-RTT `ResumeSessionAsync` before falling back to a fresh handshake during `ConnectWithResumeAsync` / auto-reconnect. |
| `ResumeTimeoutMillis` | `int` | `3000` (`3s`) | `[ValueRange(100, int.MaxValue)]` | Timeout in milliseconds for session resume requests. |
| `ResumeFallbackToHandshake` | `bool` | `true` | — | Automatically falls back to `HandshakeAsync` when `ResumeSessionAsync` returns a non-`NONE` `ProtocolReason`. |
| `AutoReconnectEnabled` | `bool` | `false` | — | Enables automatic background reconnection via `ReconnectSupervisor` when a connection drops unexpectedly. |
| `ReconnectBaseDelayMillis` | `int` | `500` | `[ValueRange(1, int.MaxValue)]` | Initial delay in milliseconds before the first reconnect attempt. |
| `ReconnectMaxDelayMillis` | `int` | `30000` (`30s`) | `[ValueRange(1, int.MaxValue)]` | Maximum delay cap in milliseconds for exponential reconnect backoff. |
| `ReconnectMaxAttempts` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Maximum consecutive reconnect attempts before giving up (`0` = unlimited). |

### 4. Keepalive Probing & Clock Synchronization

| Property | Type | Default | Validation | Description |
| :--- | :--- | ---: | :--- | :--- |
| `KeepAliveIntervalMillis` | `int` | `0` (disabled) | `[ValueRange(0, int.MaxValue)]` | Periodic `PingAsync` interval in milliseconds (`0` disables keepalive probing). |
| `KeepAliveTimeoutMillis` | `int` | `5000` (`5s`) | `[ValueRange(100, int.MaxValue)]` | Timeout in milliseconds for each keepalive `PONG` reply. |
| `KeepAliveMissThreshold` | `int` | `3` | `[ValueRange(1, int.MaxValue)]` | Consecutive missed keepalive `PONG` responses before the socket is faulted and handed to `ReconnectSupervisor`. |
| `TimeSyncEnabled` | `bool` | `true` | — | Allows `SyncTimeAsync` to synchronize the client clock with server time. |
| `TimeOffsetMs` | `double` | `0` | — | Current time offset in milliseconds applied by clock synchronization. |

## Configuration Examples

### Programmatic Configuration

```csharp
using Nalix.Abstractions.Security;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;

TransportOptions options = new()
{
    Address = "game.example.com",
    Port = 57206,
    ConnectTimeoutMillis = 10_000,
    Algorithm = CipherSuiteType.Chacha20Poly1305,
    AllowTofu = true,
    AutoReconnectEnabled = true,
    ReconnectBaseDelayMillis = 500,
    ReconnectMaxDelayMillis = 15_000,
    KeepAliveIntervalMillis = 15_000,
    KeepAliveTimeoutMillis = 5_000,
    KeepAliveMissThreshold = 3
};

using TcpSession session = new(options);
```

### INI Configuration (`default.ini`)

```ini
[Transport]
Port = 57206
Address = 127.0.0.1
ConnectTimeoutMillis = 30000
NoDelay = true
BufferSize = 65536
Algorithm = Chacha20Poly1305
CompressionEnabled = true
CompressionThreshold = 512
MaxUdpDatagramSize = 1400
AllowTofu = true
PersistTofuKey = false
ResumeEnabled = true
ResumeTimeoutMillis = 3000
ResumeFallbackToHandshake = true
AutoReconnectEnabled = false
ReconnectBaseDelayMillis = 500
ReconnectMaxDelayMillis = 30000
ReconnectMaxAttempts = 0
KeepAliveIntervalMillis = 0
KeepAliveTimeoutMillis = 5000
KeepAliveMissThreshold = 3
TimeSyncEnabled = true
```

## Related APIs

- [Transport Session](../../sdk/transport-session.md)
- [WebSocket Transport Options](./websocket-transport-options.md)
- [Request Options](./request-options.md)
- [Handshake Extensions](../../sdk/handshake-extensions.md)
- [Resume Extensions](../../sdk/resume-extensions.md)
