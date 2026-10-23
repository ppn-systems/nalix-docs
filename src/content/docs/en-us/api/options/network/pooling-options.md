---
title: Pooling Options
description: How Nalix.Network derives ObjectPoolManager capacities and preallocations from ConnectionGuardOptions.MaxConnections and NetworkSocketOptions.MaxParallel via NetworkPoolInitializer.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Internal.Initialization`  
**Assembly:** `Nalix.Network`

:::note[Internal Pool Sizing]
Neither `Nalix.Network` nor `Nalix.Runtime` exposes a public `PoolingOptions` class. Network-layer pool capacities and preallocations are derived automatically by `NetworkPoolInitializer` from [ConnectionGuardOptions.MaxConnections](./connection-guard-options.md) and [NetworkSocketOptions.MaxParallel](./network-socket-options.md) during server startup.
:::

## Source Mapping

- `src/Nalix.Network/Internal/Initialization/NetworkPoolInitializer.cs`
- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/Options/NetworkSocketOptions.cs`

## How Network Pools Are Sized

`NetworkPoolInitializer` configures [ObjectPoolManager](../../framework/memory/object-pooling.md) capacities and preallocations in three phases:

1. **Static Constructor (`static NetworkPoolInitializer()`)**: Reads `ConnectionGuardOptions.MaxConnections` (default `2000`) and `NetworkSocketOptions.MaxParallel` (default `1`), executes all `SetMaxCapacity<T>` registrations across all network pool types, and preallocates `PooledAcceptContext` (`MaxParallel`), `PooledSocketAsyncEventArgs` (`MaxParallel * 4`), `TimingWheel.TimeoutTask` (`128`), `ConnectionBacking` (`128`), `ConnectionEventArgs` (`256`), and `PooledConnectEventContext` (`256`).
2. **TCP Initialization (`NetworkPoolInitializer.InitializeTcp()`)**: Invoked by `static Connection()` (zero parameters) to preallocate `SocketConnection` (`128`), `SocketUdpTransport` (`64`), `SocketTcpTransport` (`128`), `ProxyHeaderContext` (`128`), and `PooledSocketReceiveContext` (`128`).
3. **WebSocket Initialization (`NetworkPoolInitializer.InitializeWebSocket()`)**: Invoked by `static WebSocketConnection()` to preallocate `WebSocketTransport` (`128`).

### Pool Capacity and Preallocation Matrix

| Pooled Type | Max Capacity Formula (`SetMaxCapacity` in `.cctor`) | Preallocated Instances | Preallocated By |
| :--- | :--- | :--- | :--- |
| `SocketConnection` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `ConnectionBacking` | `MaxConnections` (`2000`) | `128` | Static constructor |
| `SocketTcpTransport` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `SocketUdpTransport` | `MaxConnections` (`2000`) | `64` | `InitializeTcp()` |
| `WebSocketTransport` | `MaxConnections` (`2000`) | `128` | `InitializeWebSocket()` |
| `ProxyHeaderContext` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `TimingWheel.TimeoutTask` | `MaxConnections` (`2000`) | `128` | Static constructor |
| `PooledSocketReceiveContext` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `ConnectionEventArgs` | `(MaxConnections * 2) + 1024` (`5024`) | `256` | Static constructor |
| `PooledConnectEventContext` | `(MaxConnections * 2) + 1024` (`5024`) | `256` | Static constructor |
| `PooledAcceptContext` | `(MaxParallel * 2) + 32` (`34`) | `MaxParallel` (`1`) | Static constructor |
| `PooledSocketAsyncEventArgs` | `MaxParallel + MaxConnections` (`2001`) | `MaxParallel * 4` (`4`) | Static constructor |

## Tuning Network Pool Capacities

To scale pool retention for higher concurrency ceilings, configure `ConnectionGuardOptions` and `NetworkSocketOptions` before building the host:

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<ConnectionGuardOptions>(options =>
{
    options.MaxConnections = 10_000;
});

builder.Configure<NetworkSocketOptions>(options =>
{
    options.MaxParallel = 16;
});
```

## Related APIs

- [Object Pool Manager](../../framework/memory/object-pooling.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Network Socket Options](./network-socket-options.md)
- [Network Callback Options](./network-callback-options.md)
- [TCP Listener](../../network/tcp-listener.md)
