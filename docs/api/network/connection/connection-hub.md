# Connection Hub

`ConnectionHub` is the central in-memory registry for live `IConnection` instances in Nalix.Network. It shards connections across multiple dictionaries, supports broadcast and forced disconnect flows, and exposes runtime diagnostics.

!!! tip "Use the hub as the session registry"
    If your server needs lookups, broadcasts, or force-close behavior, keep that logic centered on `ConnectionHub` instead of scattering separate connection maps across the app.

## Hub model

```mermaid
flowchart LR
    A["RegisterConnection"] --> B["Shard by connection ID"]
    B --> C["Active connection maps"]
    C --> E["Broadcast / lookup / force close"]
    C --> F["GenerateReport"]
```

## Source mapping

- `src/Nalix.Network/Connections/Connection.Hub.cs`
- `src/Nalix.Network/Connections/Connection.Hub.Statistics.cs`
- `src/Nalix.Network/Connections/Connection.Hub.EventArgs.cs`
- `src/Nalix.Network/Configurations/ConnectionHubOptions.cs`

## Core design

- Connections are distributed across internal shards using the connection ID hash.
- Anonymous connections are also queued in FIFO order so `DROP_OLDEST` can evict them efficiently.
- `Statistics` returns a structured snapshot with connection count, drop policy, shard count, anonymous queue depth, evicted count, and rejected count.

## Main operations

| Method | Purpose |
|---|---|
| `RegisterConnection(connection)` | Adds a connection and subscribes the close event. |
| `UnregisterConnection(connection)` | Removes the connection and event subscription. |
| `GetConnection(id)` | Resolves an active connection. |
| `ListConnections()` | Returns a snapshot of active connections. |
| `BroadcastAsync(...)` | Sends to all active connections. |
| `BroadcastWhereAsync(...)` | Sends to matching connections only. |
| `ForceClose(endpoint)` | Disconnects all matching connections by address. |
| `CloseAllConnections(reason)` | Disconnects everything in parallel. |
| `GenerateReport()` | Returns a runtime summary string. |

## Capacity behavior

When `MaxConnections` is reached:

- `DROP_NEWEST` disconnects the incoming connection and increments rejected count.
- `DROP_OLDEST` searches the anonymous FIFO for an evictable connection and disconnects it.

In both cases the hub raises `CapacityLimitReached`.

## Broadcast behavior

- `BroadcastBatchSize > 0` enables batched `Task.WhenAll(...)` fan-out.
- Without batching, the hub partitions the connection list and processes partitions in parallel.
- `ParallelDisconnectDegree` controls bulk disconnect parallelism.

## Diagnostics

`GenerateReport()` includes:

- total and anonymous connection counts
- evicted and rejected counts
- shard count and anonymous queue depth
- configured max connection count and drop policy
- bytes sent and uptime aggregates
- per-status and per-algorithm summaries
- the first 15 active connections

## ConnectionHubStatistics

`ConnectionHubStatistics` is the structured snapshot returned by the hub for quick diagnostics and monitoring.

## Source mapping

- `src/Nalix.Network/Connections/Connection.Hub.Statistics.cs`

It exposes:

- `ConnectionCount`
- `MaxConnections`
- `DropPolicy`
- `ShardCount`
- `AnonymousQueueDepth`
- `EvictedConnections`
- `RejectedConnections`

Use this type when you need machine-readable hub state instead of the formatted `GenerateReport()` output.

## Basic usage

```csharp
hub.RegisterConnection(connection);
IConnection? sameConnection = hub.GetConnection(connection.ID);
await hub.BroadcastAsync(new PingResponse(), ct);
```

```csharp
ConnectionHubStatistics stats = hub.Statistics;
int liveConnections = stats.ConnectionCount;
int rejectedConnections = stats.RejectedConnections;
```

---

## Associating username with a connection (new pattern)

If you need to store the username for a connection, use the `Attributes` map on each `IConnection` instance:

```csharp
// Set username
connection.Attributes["username"] = "sample_user";

// Lookup username from connection
var username = connection.Attributes.TryGetValue("username", out var u) ? u as string : null;
```

> There is no built-in reverse mapping from username to connection;
> if you need to find a connection by username, perform a linear scan over the list of connections:
>
> ```csharp
> var userConn = hub.ListConnections()
>     .FirstOrDefault(c => c.Attributes.TryGetValue("username", out var u) && (u as string) == "my_user");
> ```

**Username can still be validated/truncated on assignment according to your business rules.**

## Related APIs

- [Connection](./connection.md)
- [Connection Events](./connection-events.md)
- [Connection Hub Options](./connection-hub-options.md)
- [Network Options](../options/options.md)
