---
title: Connection Guard Options
description: Reference for Nalix.Network.Options.ConnectionGuardOptions — global connection ceiling, ban duration, progressive banning toggle, per-connection error threshold and window, and the packet-rate setting.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionGuardOptions` (`public sealed partial class ConnectionGuardOptions : ConfigurationLoader, IValidatableConfiguration`) configures global connection capacity, base ban duration, progressive banning escalation, DDoS log suppression, per-connection error disconnection (`SEC-54`, counted within `ErrorWindow`), and the `MaxPacketPerSecond` setting (`SEC-55`).

## Source Mapping

- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/Connections/WebSocketConnection.cs`
- `src/Nalix.Network/Connections/Connection.cs`
- `src/Nalix.Network/Internal/Initialization/NetworkPoolInitializer.cs`

## Defaults and Validation

Loaded from the `[ConnectionGuard]` section of `default.ini`:

| Property | Type | Default | Validation | Runtime Consumer |
| :--- | :--- | ---: | :--- | :--- |
| `MaxConnections` | `int` | `2_000` (`2000`) | `[ValueRange(1, int.MaxValue)]` | Global concurrent connection ceiling in `ConnectionGuard`, and baseline pool capacity in `NetworkPoolInitializer`. |
| `BanDuration` | `TimeSpan` | `00:05:00` (`5m`) | `[DurationRange("00:00:01", "1.00:00:00")]` | Static ban duration used when `EnableProgressiveBanning` is `false`. |
| `DDoSLogSuppressWindow` | `TimeSpan` | `00:00:20` (`20s`) | `[DurationRange("00:00:01", "01:00:00")]` | Per-endpoint suppression window for throttled reject/DDoS diagnostic logs (`ThrottledEventGate`). |
| `MaxErrorThreshold` | `int` | `50` | `[ValueRange(1, int.MaxValue)]` | Errors a connection may accumulate within `ErrorWindow` (`Connection.IncrementErrorCount()`, `DatagramConnection`, `WebSocketConnection`); reaching this threshold disconnects the client (`SEC-54`). |
| `ErrorWindow` | `TimeSpan` | `00:01:00` (`1m`) | `[DurationRange("00:00:01", "24:00:00")]` | Window over which a connection's errors are counted against `MaxErrorThreshold`; when it elapses the count restarts, so a long-lived connection with an occasional error is not disconnected cumulatively. |
| `MaxPacketPerSecond` | `int` | `128` | `[ValueRange(1, 10_000_000)]` | Maximum packets per second from a single connection (`SEC-55`). `DatagramGuard`, its former consumer, was removed; the current source has no reader of this property. |
| `EnableProgressiveBanning` | `bool` | `true` | — | Enables progressive ban escalation (`1m` $\rightarrow$ `5m` $\rightarrow$ `15m` $\rightarrow$ `1h` $\rightarrow$ `6h` $\rightarrow$ `24h`) on repeated rate-window violations. |

`Validate()` runs `this.ValidateDataAnnotations()` and throws `ValidationException` when constraints are violated.

:::note[Permanent IP Blacklists]
Permanent IP/CIDR blacklists are configured through [ConnectionBlacklistStoreOptions](./connection-blacklist-store-options.md) (`blacklist.txt`), and disk persistence for dynamic progressive bans is configured through [ConnectionBanStoreOptions](./connection-ban-store-options.md) (`banned_ips.bin`).
:::

## Progressive Banning Escalation Schedule

When an IP exceeds `ConnectionQuotaOptions.MaxConnectionsPerWindow` within `ConnectionRateWindow`:

1. If `EnableProgressiveBanning` is `true`, `ConnectionGuard` increments the endpoint's ban strike count (after applying any decay from `ConnectionBanStoreOptions.BanCountDecayWindow`) and selects the ban duration:
   - **1st violation**: `1` minute
   - **2nd violation**: `5` minutes
   - **3rd violation**: `15` minutes
   - **4th violation**: `1` hour
   - **5th violation**: `6` hours
   - **6th+ violation**: `24` hours
2. If `EnableProgressiveBanning` is `false`, `BanDuration` (`5` minutes by default) is used for every violation.

## Related APIs

- [Connection Guard](../../network/connection/connection-guard.md)
- [Connection Quota Options](./connection-quota-options.md)
- [Connection Ban Store Options](./connection-ban-store-options.md)
- [Connection Blacklist Store Options](./connection-blacklist-store-options.md)
- [Trusted Proxy Options](./trusted-proxy-options.md)
