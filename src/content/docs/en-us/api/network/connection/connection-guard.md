---
title: Connection Guard
description: Reference for Nalix.Network.RateLimiting.ConnectionGuard — per-IP, per-subnet, and global connection admission limiter with progressive banning and adaptive Proof-of-Work scaling.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.RateLimiting`  
**Assembly:** `Nalix.Network`

`ConnectionGuard` (`[Injectable] public sealed partial class ConnectionGuard : IConnectionGuard, IProofOfWorkPolicy`) gatekeeps incoming TCP, WebSocket, and passthrough UDP connections before a `Connection` object is allocated. It enforces permanent IP/CIDR blacklists, global connection ceilings, trusted-proxy quotas, per-IP and per-subnet (`/24` IPv4, `/48` IPv6) concurrency and sliding-window rate limits, progressive disk-persisted IP bans, and EWMA/capacity-driven adaptive Proof-of-Work (`IProofOfWorkPolicy`).

## Source Mapping

- `src/Nalix.Abstractions/Networking/IConnection.Guard.cs`
- `src/Nalix.Abstractions/Security/IProofOfWorkPolicy.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Report.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Types.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/Internal/Security/NetworkBanRepository.cs`

## Admission Pipeline

```mermaid
flowchart TD
    Req(["TryAccept(IPEndPoint / SocketEndpoint)"]) --> Inv{"Null or 0.0.0.0 / ::?"}
    Inv -->|Yes| Rej["Reject"]
    Inv -->|No| Blk{"NetworkAccessList.IsBlacklisted?"}
    Blk -->|Yes| Rej
    Blk -->|No| Glob{"_globalConnections < MaxConnections?"}
    Glob -->|No| Rej
    Glob -->|Yes| Loop{"ExemptLoopback && Loopback IP?"}
    Loop -->|Yes| Acc["Accept Connection"]
    Loop -->|No| Proxy{"NetworkAccessList.IsTrustedProxy?"}
    Proxy -->|Yes| ProxyCap{"Within TrustedProxyOptions Caps?"}
    ProxyCap -->|Yes| Acc
    ProxyCap -->|No| Rollback["Decrement Global + Reject"]
    Proxy -->|No| BanCheck{"Currently Banned?"}
    BanCheck -->|Yes| Rollback
    BanCheck -->|No| RateCheck{"Within Per-IP Concurrent & Window Limits?"}
    RateCheck -->|No (Rate Violation)| ProgBan["Apply Progressive Ban + Persist"] --> Rollback
    RateCheck -->|No (Concurrent Cap)| Rollback
    RateCheck -->|Yes| SubCheck{"Within /24 or /48 Subnet Caps?"}
    SubCheck -->|No| RollbackSlot["Release IP Slot + Decrement Global + Reject"]
    SubCheck -->|Yes| Acc
```

## Public API Reference

```csharp
namespace Nalix.Network.RateLimiting;

[Injectable]
[Injectable(typeof(IConnectionGuard))]
[Injectable(typeof(IProofOfWorkPolicy))]
public sealed partial class ConnectionGuard : IConnectionGuard, IProofOfWorkPolicy
{
    public static readonly string RecurringName = "conn.limit";

    public ConnectionGuard();
    public ConnectionGuard(ConnectionQuotaOptions? config = null);

    public byte CurrentDifficulty { get; }
    public bool IsUnderAttack { get; }

    public bool TryAccept(IPEndPoint endPoint);
    public bool IsTrustedProxy(IPEndPoint? endPoint);
    public void Release(IPEndPoint endPoint);
    public void BanEndpoint(IPAddress address, TimeSpan duration);
    public void OnConnectionClosed(object? sender, IConnectionEventArgs args);

    public string GenerateReport();
    public void WriteReportData(Utf8JsonWriter writer);
    public void Dispose();
    public ValueTask DisposeAsync();
}
```

### Key Members

| Member | Description |
| :--- | :--- |
| `CurrentDifficulty` | Computes current Proof-of-Work leading-zero-bit difficulty (`AdaptivePowMinDifficulty` to `AdaptivePowMaxDifficulty`) from the product of EWMA connection-rate scaling (`AdaptivePowStartRate..AdaptivePowMaxRate`) and capacity scaling (`CapacityPoWThreshold..1.0`). |
| `IsUnderAttack` | `true` when `CurrentDifficulty > AdaptivePowMinDifficulty` (triggers `POW_REQUIRED` challenges during handshakes). |
| `TryAccept(IPEndPoint)` | Reserves global, per-IP, and per-subnet slots for `endPoint`. Returns `false` if rejected or banned. |
| `IsTrustedProxy(IPEndPoint?)` | Returns `true` when `endPoint` matches a configured trusted reverse proxy IP or CIDR range in `NetworkAccessList`. |
| `Release(IPEndPoint)` | Decrements global, per-IP, and per-subnet counters without an `IConnection` (used when socket setup fails after `TryAccept` succeeded). |
| `BanEndpoint(IPAddress, TimeSpan)` | Manually bans `address` for `duration` (unless `address` is a trusted proxy) and marks `NetworkBanRepository` dirty for disk persistence. |
| `OnConnectionClosed` | Event handler subscribed to `connection.ConnectionClosed` to release per-IP, per-subnet, and global slots and apply short-lived connection penalties (`ShortLivedThresholdMs`). |

## Internal Persistence & Access Control Components

- **`NetworkAccessList`**: Loads permanent IP/CIDR blacklists (`ConnectionBlacklistStoreOptions.StoreFileName`, default `"blacklist.txt"`) and trusted proxy IPs/CIDRs (`TrustedProxyOptions.StoreFileName`, default `"trusted_proxies.txt"`), supporting hot-reload via `FileSystemWatcher`.
- **`NetworkBanRepository`**: Periodically flushes active progressive bans to disk (`ConnectionBanStoreOptions.StoreFileName`, default `"banned_ips.bin"`, every `AutoSaveInterval = 5m`) and restores them on server startup, decaying ban counts over `BanCountDecayWindow` (`7d`).

## Related APIs

- [Connection Limiter Overview](./connection-limiter.md)
- [Connection Quota Options](../../options/network/connection-quota-options.md)
- [Connection Guard Options](../../options/network/connection-guard-options.md)
- [Trusted Proxy Options](../../options/network/trusted-proxy-options.md)
- [Connection Ban Store Options](../../options/network/connection-ban-store-options.md)
- [Connection Blacklist Store Options](../../options/network/connection-blacklist-store-options.md)
