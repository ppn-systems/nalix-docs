---
title: WebSocket Options
description: The NetworkWebSocketOptions class represents configuration settings for the hosted server-side WebSocket listeners.
section: API Reference
package: Nalix.Network / Nalix.Runtime
---

The `NetworkWebSocketOptions` class represents configuration settings for the hosted server-side WebSocket listeners.

## Source Mapping

- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## Overview

These settings manage binding properties (port, host, path), subprotocol handshakes, channel queues, timeouts, and maximum payload constraints.

## Configuration Table

The options map to the `[NetworkWebSocket]` INI configuration section:

| Property | Type | Default Value | Validation | Description |
|----------|------|---------------|------------|-------------|
| `Port` | `ushort` | `57207` | `[ValueRange(1, 65535)]` | The local port number the WebSocket listener binds to. |
| `Path` | `string` | `"/ws/"` | — | The URL path prefix mapped to the WebSocket upgrade handler. |
| `Host` | `string` | `"*"` | — | The host address to bind to (e.g., `*` for all interfaces, `+`, or `localhost`). |
| `SubProtocol` | `string` | `"nalix.v1"` | — | The server-side subprotocol negotiated during WebSocket upgrade (`Sec-WebSocket-Protocol`). |
| `ServerVersion` | `string` | `"1.0.0"` | — | Custom server version string exposed via the `/version` HTTP endpoint. |
| `EnableDevOpsEndpoints` | `bool` | `true` | — | Enables native HTTP endpoints (`/healthz`, `/version`, `/metrics`) on the WebSocket listener port. |
| `HandshakeTimeoutMs` | `int` | `5000` (ms) | `[ValueRange(500, 30000)]` | Maximum time in milliseconds to wait for the HTTP upgrade handshake to complete before closing the socket. |
| `MaxUpgradeRequestSize` | `int` | `8192` (bytes) | `[ValueRange(1024, 65536)]` | Maximum size in bytes for the HTTP upgrade request headers. |
| `MaxMessageSize` | `int` | `1_048_576` (1 MB) | `[ValueRange(1, int.MaxValue)]` | The maximum permitted size of a single inbound WebSocket message payload in bytes. |
| `KeepAliveIntervalSeconds` | `int` | `30` (s) | `[ValueRange(0, 3600)]` | WebSocket protocol-level keep-alive ping interval in seconds (`0` disables). |
| `AllowedOrigins` | `string` | `""` (check disabled) | — | Comma-separated allowlist of browser origins (`scheme://host[:port]`) permitted to upgrade. Empty disables the check. |
| `AllowMissingOrigin` | `bool` | `true` | — | When an allowlist is set, whether an upgrade with **no** `Origin` header (native/non-browser clients) is accepted. Ignored when `AllowedOrigins` is empty. |

## Origin Enforcement (CSWSH protection)

Browsers attach an `Origin` header to every WebSocket upgrade, and any page the user visits can try to open a socket to your server (cross-site WebSocket hijacking). When `AllowedOrigins` is non-empty the listener checks `Origin` **before** the `101 Switching Protocols` response:

- The match is exact on scheme, host and port. Scheme and host compare case-insensitively, and a trailing `/` is ignored. `https://app.example.com` does **not** match `http://app.example.com`, `https://app.example.com:8443` or `https://evil.app.example.com`.
- There is no wildcard. `*` is not special; list every origin explicitly.
- A request without `Origin` is accepted only if `AllowMissingOrigin = true`. Native clients (the Nalix SDK, console/MAUI/Unity) send none. Set it to `false` for browser-only deployments.
- A rejected request gets `HTTP/1.1 403 Forbidden` and the socket is closed. No connection or session is created. The listener writes a `NW.ws:origin` warning diagnostic (`ws-origin-rejected`) with the origin and remote endpoint.

The default (`AllowedOrigins` empty) keeps the legacy accept-everything behaviour for backward compatibility. The listener writes a `ws-origin-check-disabled` warning at startup in that case. Set `AllowedOrigins` in any deployment that browsers can reach.

## Usage Example

### Mutating Options Programmatically

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<NetworkWebSocketOptions>(options =>
{
    options.Port = 8080;
    options.Path = "/socket";
    options.Host = "127.0.0.1";
    options.HandshakeTimeoutMs = 5000;
    options.MaxUpgradeRequestSize = 8192;
    options.MaxMessageSize = 2_097_152; // 2 MB
    options.KeepAliveIntervalSeconds = 30;
    options.AllowedOrigins = "https://app.example.com,https://admin.example.com";
    options.AllowMissingOrigin = false; // browser-only deployment
});
```

### INI Configuration Format

```ini
[NetworkWebSocket]
; Network WebSocket configuration — controls endpoint, subprotocol, and behavior
Port = 57207
Path = /ws/
Host = *
SubProtocol = nalix.v1
ServerVersion = 1.0.0
EnableDevOpsEndpoints = true
HandshakeTimeoutMs = 5000
MaxUpgradeRequestSize = 8192
MaxMessageSize = 1048576
KeepAliveIntervalSeconds = 30
AllowedOrigins =
AllowMissingOrigin = true
```

## Forwarded Headers Configuration (`ForwardedHeadersOptions`)

`ForwardedHeadersOptions` (`src/Nalix.Network/Options/ForwardedHeadersOptions.cs`) maps to the `[ForwardedHeaders]` INI section and configures L7 HTTP reverse-proxy client IP extraction (`CF-Connecting-IP`, `X-Forwarded-For`) in `WebSocketListenerBase`:

| Property | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `Enabled` | `bool` | `false` | Enables parsing `CF-Connecting-IP` and `X-Forwarded-For` HTTP upgrade headers to obtain the real client IP. |
| `RequireTrustedProxy` | `bool` | `false` | When `true`, only physical connections originating from IPs/CIDRs listed in [TrustedProxyOptions](./trusted-proxy-options.md) are allowed to forward client IPs via HTTP headers; untrusted peers sending forwarded headers are rejected. |

Header precedence is fixed: the first present of `CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For` wins, and that IP drives bans, per-IP limits and rate limiting.

:::caution[Spoofable headers]
The proxy must overwrite or clear these headers from clients — a client-sent `CF-Connecting-IP` outranks `X-Real-IP`. `X-Forwarded-For` is currently read from its **left-most** entry, which a client can forge when the proxy only appends (e.g. AWS ALB); have the proxy set `X-Real-IP`, and keep `RequireTrustedProxy = true`. See [Reverse Proxy & TLS](../../../guides/deployment/reverse-proxy-tls.md).
:::

## See Also

* [WebSocket Listener](../../network/websocket-listener.md)
* [WebSocket Connection](../../network/websocket-connection.md)
* [Trusted Proxy Options](./trusted-proxy-options.md)
