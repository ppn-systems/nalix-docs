---
title: Connection Hub Options
description: Reference for Nalix.Network.Options.ConnectionHubOptions — shard count, broadcast batching, bulk disconnect parallelism, and latency diagnostics for ConnectionHub.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionHubOptions` (`public sealed partial class ConnectionHubOptions : ConfigurationLoader, IValidatableConfiguration`) configures `ConnectionRegistry` shard count, bulk disconnect parallelism, legacy broadcast batching, and latency measurement for [ConnectionHub](../../network/connection/connection-hub.md).

## Source Mapping

- `src/Nalix.Network/Options/ConnectionHubOptions.cs`
- `src/Nalix.Network/Connections/ConnectionHub.cs`
- `src/Nalix.Network/Connections/ConnectionHub.Broadcast.cs`
- `src/Nalix.Network/Internal/Connections/ConnectionRegistry.cs`

## Defaults and Validation

Loaded from the `[ConnectionHub]` section of `default.ini`:

| Property | Type | Default | Validation | Runtime Consumer |
| :--- | :--- | ---: | :--- | :--- |
| `ParallelDisconnectDegree` | `int` | `-1` | `[ValueRange(-1, int.MaxValue)]`; `0` throws `ArgumentOutOfRangeException` | Passed to `ParallelOptions.MaxDegreeOfParallelism` when `ConnectionHub.Dispose()` disconnects all active connections (`-1` uses `ThreadPool` default parallelism). |
| `BroadcastBatchSize` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Controls batch size for legacy buffer-based `BroadcastAsync(ReadOnlyMemory<byte>, ...)` (`0` awaits all sends in a single batch). |
| `ShardCount` | `int` | `Math.Max(1, Environment.ProcessorCount)` | `[ValueRange(1, int.MaxValue)]` | Number of internal `ConcurrentDictionary<ulong, IConnection>` shards in `ConnectionRegistry`. |
| `IsEnableLatency` | `bool` | `true` | — | Enables `TimingScope` latency logs (`PERF.NW.*`) on `RegisterConnection`, `UnregisterConnection`, and `BroadcastAsync` when `Information` diagnostics are enabled. |

`Validate()` runs `this.ValidateDataAnnotations()` and explicitly throws `ArgumentOutOfRangeException` if `ParallelDisconnectDegree == 0`.

## Sharding & Registration Flow

```mermaid
flowchart TD
    A["RegisterConnection(connection)"] --> B{"_disposed?"}
    B -->|Yes| X["Throw ObjectDisposedException"]
    B -->|No| C["Subscribe connection.ConnectionClosed + Set OwnerHub Attribute"]
    C --> D["ConnectionRegistry.TryAdd(connection.ConnectionId, connection)"]
    D --> E{"Added to Shard?"}
    E -->|No (Duplicate)| F["Unsubscribe + Throw InternalErrorException"]
    E -->|Yes| G["Indexed in Shard & Endpoint Map"]
```

- `ConnectionRegistry` hashes `ulong` connection IDs with a 64-bit `MIX64` finalizer.
- When `ShardCount` is a power of two, shard selection uses a bitwise mask (`hash & _shardMask`); otherwise it uses modulo (`hash % _shardCount`).

## Related APIs

- [Connection Hub](../../network/connection/connection-hub.md)
- [Connection Extensions](../../network/connection/connection-extensions.md)
- [Network Options](./options.md)
