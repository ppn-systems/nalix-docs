---
title: Proxy Protocol Options
description: ProxyProtocolOptions configures PROXY Protocol v1/v2 header parsing for extracting the real client IP when the server sits behind a load balancer (HAProxy, AWS NLB, etc.).
section: API Reference
package: Nalix.Network / Nalix.Runtime
---

`ProxyProtocolOptions` configures PROXY Protocol v1/v2 header parsing for extracting the real client IP when the server sits behind a load balancer (HAProxy, AWS NLB, etc.).

## Source Mapping

- `src/Nalix.Network/Options/ProxyProtocolOptions.cs`
- `src/Nalix.Network/Internal/Protocol/ProxyProtocolParser.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProxyProtocol.cs`

## Defaults and Validation

| Property | Default | Valid range | Description |
| --- | ---: | --- | --- |
| `Enabled` | `false` | Boolean | Enable Proxy Protocol v1/v2 header parsing to obtain the real client IP. |
| `RequireTrustedProxy` | `false` | Boolean | Only accept PROXY headers from IPs in the Trusted Proxies list; drop all others. |
| `HeaderTimeoutMs` | `2000` | `100..30000` | Maximum milliseconds to wait for the PROXY header after TCP accept. |
| `MaxPendingProxyConnections` | `1024` | `1..100_000` | Maximum concurrent connections waiting for a PROXY header (anti-DDoS). |

`Validate()` runs DataAnnotation validation.

## When to Enable

Enable `ProxyProtocolOptions.Enabled` when the server is deployed behind a TCP load balancer that injects a PROXY header. Without this, `ConnectionGuard` and rate limiting will see the load balancer's IP instead of the real client IP.

Common scenarios:

- HAProxy in TCP mode
- AWS Network Load Balancer (NLB)
- nginx configured with `proxy_protocol on`
- Any proxy that sends a PROXY v1 (text) or v2 (binary) header

## How It Works

1. After TCP accept, the listener reads the first bytes of the connection.
2. If the bytes match a PROXY v1 (`PROXY TCP4 ...`) or v2 (binary magic `\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A`) header, the parser extracts the real client IP and port.
3. If `RequireTrustedProxy` is `true`, the connection's remote IP is checked against the Trusted Proxies list before the PROXY header is accepted.
4. If no PROXY header arrives within `HeaderTimeoutMs`, the connection is dropped.
5. The extracted IP replaces the socket's remote endpoint for all downstream admission control, rate limiting, and connection tracking.

## Security Notes

- `MaxPendingProxyConnections` prevents memory exhaustion from slow-loris attacks that hold connections open without sending a PROXY header.
- The parser validates v2 header lengths and rejects malformed or oversized headers.

:::caution[`RequireTrustedProxy` defaults to `false`]
With `Enabled = true` and the default `RequireTrustedProxy = false`, any client that connects directly can send its own `PROXY TCP4 <any-ip> ...` header. The forged address then replaces the real one everywhere downstream: `ConnectionGuard` bans and per-IP limits, rate limiting, and connection tracking all count the fake IP, so a banned client can reconnect as someone else or frame another IP for a ban.

Whenever you enable PROXY protocol, also set `RequireTrustedProxy = true` and list your load balancer's addresses in `TrustedProxyOptions`. Leave it `false` only if no client can reach the listener except through that load balancer (for example, a private subnet or a firewall that allows only the load balancer).
:::

## Related APIs

- [Trusted Proxy Options](./trusted-proxy-options.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Connection Quota Options](./connection-quota-options.md)
- [Network Options](./options.md)
