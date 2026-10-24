---
title: Trusted Proxy Options
description: Reference for Nalix.Network.Options.TrustedProxyOptions — trusted reverse proxy and CDN allowlist file and elevated connection rate ceilings for ConnectionGuard.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`TrustedProxyOptions` (`public sealed partial class TrustedProxyOptions : ConfigurationLoader, IValidatableConfiguration`) configures the trusted reverse proxy / CDN IP and CIDR allowlist (`"trusted_proxies.txt"`) and elevated connection quotas used by `ConnectionGuard`, `TcpListenerBase` (PROXY Protocol), and `WebSocketListenerBase` (`ForwardedHeadersOptions`).

## Source Mapping

- `src/Nalix.Network/Options/TrustedProxyOptions.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`

## Defaults and Validation

Loaded from the `[TrustedProxy]` section of `default.ini`:

| Property | Type | Default | Validation | Runtime Consumer |
| :--- | :--- | ---: | :--- | :--- |
| `StoreFileName` | `string` | `"trusted_proxies.txt"` | — | File name in `Directories.ConfigurationDirectory` containing line-separated trusted proxy IPs or CIDR ranges (supports `#` comments and hot-reload). |
| `MaxTrustedProxies` | `int` | `100_000` | `[ValueRange(10, 1_000_000)]` | Maximum number of trusted proxy IP/CIDR entries loaded from disk. |
| `MaxConnectionsPerTrustedProxy` | `int` | `5000` | `[ValueRange(1, 100_000)]` | Concurrent connection ceiling permitted from a single trusted proxy IP. |
| `MaxAttemptsPerTrustedProxyWindow` | `int` | `2000` | `[ValueRange(1, 10_000_000)]` | Maximum connection attempts permitted from a single trusted proxy IP within `ConnectionQuotaOptions.ConnectionRateWindow`. |

`Validate()` runs `this.ValidateDataAnnotations()` and throws `ValidationException` when constraints are violated.

## Runtime Behavior

When an incoming connection's source IP matches `NetworkAccessList.IsTrustedProxy`:

1. **`ConnectionGuard` Admission**: Uses `MaxConnectionsPerTrustedProxy` (`5000`) and `MaxAttemptsPerTrustedProxyWindow` (`2000`) instead of the standard per-IP limits (`10`), and never applies progressive IP bans (`BanEndpoint` also ignores trusted proxy IPs).
2. **PROXY Protocol & Forwarded Headers**: When `ProxyProtocolOptions.RequireTrustedProxy` or `ForwardedHeadersOptions.RequireTrustedProxy` is `true`, only physical peers matching `TrustedProxyOptions` are allowed to supply a real client IP header.

## Related APIs

- [Connection Guard](../../network/connection/connection-guard.md)
- [Connection Quota Options](./connection-quota-options.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Network Options](./options.md)
