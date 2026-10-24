---
title: Connection Blacklist Store Options
description: Configuration reference for ConnectionBlacklistStoreOptions in Nalix.Network — permanent IP and CIDR subnet blocklists loaded from disk.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionBlacklistStoreOptions` configures the permanent IP and CIDR subnet blocklist (`NetworkAccessList`) checked by [ConnectionGuard](../../network/connection/connection-guard.md) before accepting incoming connections.

## Source Mapping

- `src/Nalix.Network/Options/ConnectionBlacklistStoreOptions.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`

## Defaults and Validation

| Property | Type | Default | Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `Enabled` | `bool` | `true` | None | Enables or disables loading and checking the permanent IP/CIDR blocklist file. |
| `StoreFileName` | `string` | `"blacklist.txt"` | None | Text file name inside `Directories.ConfigurationDirectory` containing blocked IP addresses or CIDR ranges (one per line). |
| `MaxBlacklistedIps` | `int` | `100_000` | `[ValueRange(10, 1_000_000)]` | Maximum number of blacklist entries loaded into memory (`10..1,000,000`). |

`Validate()` runs `this.ValidateDataAnnotations()` and throws `ValidationException` when constraints are violated.

## Configuration Examples

### Programmatic Configuration

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<ConnectionBlacklistStoreOptions>(options =>
{
    options.Enabled = true;
    options.StoreFileName = "blacklist.txt";
    options.MaxBlacklistedIps = 200_000;
});
```

### INI Configuration (`default.ini`)

```ini
[ConnectionBlacklistStore]
Enabled = true
StoreFileName = blacklist.txt
MaxBlacklistedIps = 100000
```

### Blacklist File Format (`blacklist.txt`)

Place `blacklist.txt` in `Directories.ConfigurationDirectory` with one IPv4/IPv6 address or CIDR subnet per line (`#` comments are ignored):

```text
# Block a single IPv4 address
192.0.2.44

# Block IPv4 and IPv6 CIDR subnets
198.51.100.0/24
2001:db8:dead::/48
```

## Related APIs

- [Connection Guard](../../network/connection/connection-guard.md)
- [Connection Ban Store Options](./connection-ban-store-options.md)
- [Trusted Proxy Options](./trusted-proxy-options.md)
- [Network Options](./options.md)
