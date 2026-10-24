---
title: Connection Quota Options
description: Reference for Nalix.Network.Options.ConnectionQuotaOptions — per-IP and per-subnet connection caps, sliding rate windows, burst penalties, and adaptive Proof-of-Work configuration for ConnectionGuard.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionQuotaOptions` (`public sealed partial class ConnectionQuotaOptions : ConfigurationLoader, IValidatableConfiguration`) configures per-IP and per-subnet concurrency caps, rate windows, burst/short-lived connection penalties, endpoint map bounds, and adaptive Proof-of-Work scaling enforced by [ConnectionGuard](../../network/connection/connection-guard.md).

## Source Mapping

- `src/Nalix.Network/Options/ConnectionQuotaOptions.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`

## Complete Property Reference

Loaded from the `[ConnectionQuota]` section of `default.ini`:

### 1. Per-IP, Per-Subnet & Map Bounds

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `MaxConnectionsPerIpAddress` | `int` | `10` | `[ValueRange(1, 10_000)]` | Maximum concurrent active connections permitted from a single remote IP address. |
| `ExemptLoopback` | `bool` | `true` | — | Exempts loopback clients (`127.0.0.0/8`, `::1`, `::ffff:127.x.x.x`) from per-IP/subnet quotas, rate windows, and auto-bans (`ConnectionGuardOptions.MaxConnections` still applies). |
| `MaxTrackedEndpoints` | `int` | `50_000` | `[ValueRange(-1, 10_000_000)]` | Hard cap on tracked IP entries in `ConnectionGuard` (`-1` = unlimited; uses $O(1)$ random-sampling eviction when full). |
| `MaxConnectionsPerWindow` | `int` | `10` | `[ValueRange(1, 10_000_000)]` | Maximum connection attempts allowed from a single IP within `ConnectionRateWindow` before triggering a ban. |
| `ConnectionRateWindow` | `TimeSpan` | `00:00:05` (`5s`) | `[DurationRange("00:00:01", "00:10:00")]` | Sliding window duration used to count recent connection attempts per IP and per subnet. |
| `MaxConnectionsPerSubnet` | `int` | `50` | `[ValueRange(1, 100_000)]` | Maximum concurrent connections allowed from a single `/24` (IPv4) or `/48` (IPv6) subnet. |
| `MaxSubnetConnectionsPerWindow` | `int` | `100` | `[ValueRange(1, 10_000_000)]` | Maximum connection attempts allowed from a `/24` or `/48` subnet within `ConnectionRateWindow`. |
| `CleanupInterval` | `TimeSpan` | `00:01:00` (`1m`) | `[DurationRange("00:00:01", "01:00:00")]` | Interval of the recurring `"conn.limit"` cleanup job that purges inactive endpoint entries. |
| `InactivityThreshold` | `TimeSpan` | `00:05:00` (`5m`) | `[DurationRange("00:00:01", "1.00:00:00")]` | Idle duration after which a zero-connection endpoint entry becomes eligible for cleanup. |
| `MaxCleanupKeysPerRun` | `int` | `0` | `[ValueRange(0, 10_000_000)]` | Maximum endpoint keys scanned per cleanup cycle (`0` auto-scales to a percentage of tracked entries). |
| `DailyResetTimeOffset` | `TimeSpan` | `00:00:00` | `[DurationRange("-14:00:00", "14:00:00")]` | UTC offset used to determine start-of-day for daily connection-limit resets. |

### 2. Burst & Short-Lived Connection Detection

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `MinConnectionIntervalMs` | `int` | `50` | `[ValueRange(0, 10_000)]` | Minimum interval in ms between connections from the same IP; faster arrivals increment the rapid-connection counter. |
| `BurstThreshold` | `int` | `3` | `[ValueRange(2, 100)]` | Consecutive rapid connections required to activate burst mode for an IP. |
| `BurstPenaltyDivisor` | `int` | `2` | `[ValueRange(1, 10)]` | Divisor applied to `MaxConnectionsPerWindow` while an IP is in burst mode (`2` halves the rate limit). |
| `ShortLivedThresholdMs` | `int` | `2000` | `[ValueRange(0, 60_000)]` | Connections closing within this threshold (ms) inject an extra penalty timestamp into the endpoint's rate window. |

### 3. Adaptive Tightening & Proof-of-Work (`IProofOfWorkPolicy`)

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `EnableAdaptiveMode` | `bool` | `false` | — | Enables load-adaptive per-IP limit tightening and dynamic Proof-of-Work difficulty scaling. |
| `AdaptiveLoadThreshold` | `double` | `0.7` | `[ValueRange(0.1, 0.99)]` | Global connection load ratio (`_globalConnections / MaxConnections`) that triggers adaptive per-IP tightening. |
| `AdaptiveTighteningFactor` | `double` | `0.5` | `[ValueRange(0.1, 1.0)]` | Multiplier applied to `MaxConnectionsPerIpAddress` when adaptive tightening is active. |
| `AdaptivePowMinDifficulty` | `byte` | `12` | `[ValueRange(0, 32)]` | Baseline Proof-of-Work leading-zero-bit difficulty returned when not under attack (or when `EnableAdaptiveMode` is `false`). |
| `AdaptivePowMaxDifficulty` | `byte` | `24` | `[ValueRange(0, 32)]` | Maximum Proof-of-Work difficulty under full flood load. |
| `AdaptivePowStartRate` | `int` | `10` | `[ValueRange(1, 1_000_000)]` | EWMA connection rate (attempts/sec) at which PoW difficulty starts scaling above `AdaptivePowMinDifficulty`. |
| `AdaptivePowMaxRate` | `int` | `100` | `[ValueRange(10, 10_000_000)]` | EWMA connection rate (attempts/sec) at which rate-based PoW scaling reaches `1.0`. |
| `EnableCapacityBasedPoW` | `bool` | `true` | — | Combines rate-based scaling with server capacity scaling (`finalScale = rateScale * capacityScale`). |
| `CapacityPoWThreshold` | `double` | `0.5` | `[ValueRange(0.0, 1.0)]` | Global connection load factor (`0.5` = 50% of `MaxConnections`) below which `capacityScale` remains `0.0`. |

## Related APIs

- [Connection Guard](../../network/connection/connection-guard.md)
- [Connection Limiter](../../network/connection/connection-limiter.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Trusted Proxy Options](./trusted-proxy-options.md)
