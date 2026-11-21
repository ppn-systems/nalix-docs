---
title: Connection Limiter
description: Architectural guide to ConnectionGuard — multi-tier per-IP, per-subnet, burst, and progressive-ban admission limiting in Nalix.Network, including how datagram sessions are admitted.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.RateLimiting`  
**Assembly:** `Nalix.Network`

`Nalix.Network.RateLimiting` provides the transport admission limiter:

1. [ConnectionGuard](./connection-guard.md) (`src/Nalix.Network/RateLimiting/Connection.Guard.cs`): Protects connection-oriented listeners (`TcpListenerBase`, `WebSocketListenerBase`, and `DatagramListener` for authenticated datagram sessions).

## Source Mapping

- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`
- `src/Nalix.Network/Options/ConnectionQuotaOptions.cs`
- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Receive.cs`

## 1. `ConnectionGuard` Defense Mechanisms

### Burst & Short-Lived Connection Penalties (`Connection.Guard.Slot.cs`)

- **Burst Detection**: If consecutive connection attempts from the same IP arrive within `MinConnectionIntervalMs` (`50` ms) at least `BurstThreshold` (`3`) times in a row, the endpoint enters burst mode and its effective `MaxConnectionsPerWindow` ceiling is divided by `BurstPenaltyDivisor` (`2`).
- **Short-Lived Connection Penalty**: When a connection closes within `ShortLivedThresholdMs` (`2000` ms) of opening, `OnConnectionClosed` injects an extra synthetic timestamp into the endpoint's rate window to penalize rapid connect/disconnect churn.
- **Load-Adaptive Tightening**: When `EnableAdaptiveMode` is `true` and global load exceeds `AdaptiveLoadThreshold` (`0.7`), per-IP concurrency limits are multiplied by `AdaptiveTighteningFactor` (`0.5`).

### Progressive IP Banning & Decay

When an endpoint exceeds its rate window:

- If `ConnectionGuardOptions.EnableProgressiveBanning` is `true` (default), consecutive violations escalate through `1m` $\rightarrow$ `5m` $\rightarrow$ `15m` $\rightarrow$ `1h` $\rightarrow$ `6h` $\rightarrow$ `24h`.
- Ban counts decay by `1` per `ConnectionBanStoreOptions.BanCountDecayWindow` (`7` days) of clean behavior and are persisted to `"banned_ips.bin"` by `NetworkBanRepository`.

### Zero-Allocation Subnet Tracking (`Connection.Guard.Subnet.cs`)

- Groups IPv4 endpoints by `/24` (`uint` key) and IPv6 endpoints by `/48` (`long` key) directly from `SocketEndpoint` raw bytes without `IPAddress` heap allocations.
- Enforces `MaxConnectionsPerSubnet` (`50`) and `MaxSubnetConnectionsPerWindow` (`100`).

### Bounded Endpoint Map (`MaxTrackedEndpoints = 50,000`)

- Caps tracked IP entries at `ConnectionQuotaOptions.MaxTrackedEndpoints` (`50,000`) and uses $O(1)$ Redis-style random sampling eviction when full, alongside the recurring `"conn.limit"` background cleanup job.

## 2. Datagram Sessions

`DatagramGuard` and `DatagramGuardOptions` (per-source UDP packet windows) were removed. `DatagramListener` instead admits each datagram session through `IConnectionGuard.TryAccept(remote)` when the first datagram of its ticket authenticates, holds the guard slot while the session lives, and calls `Release` when the session is disposed. A refused session is counted in `DatagramListener.DMetrics.TotalGuardRejections`. Unauthenticated datagrams never reach the guard. See [Datagram Listener](../datagram-listener.md).

## Configuration Summary

| Option Class | Key Settings | Reference |
| :--- | :--- | :--- |
| `ConnectionQuotaOptions` | `MaxConnectionsPerIpAddress = 10`, `MaxConnectionsPerWindow = 10`, `ConnectionRateWindow = 5s`, `MaxConnectionsPerSubnet = 50`, `ExemptLoopback = true`, `MaxTrackedEndpoints = 50,000` | [Connection Quota Options](../../options/network/connection-quota-options.md) |
| `ConnectionGuardOptions` | `MaxConnections = 2000`, `BanDuration = 5m`, `EnableProgressiveBanning = true`, `MaxErrorThreshold = 50`, `ErrorWindow = 1m`, `MaxPacketPerSecond = 128` | [Connection Guard Options](../../options/network/connection-guard-options.md) |
| `TrustedProxyOptions` | `StoreFileName = "trusted_proxies.txt"`, `MaxConnectionsPerTrustedProxy = 5000`, `MaxAttemptsPerTrustedProxyWindow = 2000` | [Trusted Proxy Options](../../options/network/trusted-proxy-options.md) |

## Related APIs

- [Connection Guard API Reference](./connection-guard.md)
- [Connection Hub](./connection-hub.md)
- [TCP Listener](../tcp-listener.md)
- [Datagram Listener](../datagram-listener.md)
