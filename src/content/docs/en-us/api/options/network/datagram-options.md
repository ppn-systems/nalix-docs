---
title: Datagram Options
description: DatagramOptions configures the datagram (NDP over UDP) listener of Nalix.Network, covering ticket lifetime, session limit, receive workers and socket buffer sizes. It replaces the removed DatagramGuardOptions.
section: API Reference
package: Nalix.Network
---

`DatagramOptions` (`public sealed partial class DatagramOptions : ConfigurationLoader, IValidatableConfiguration`, namespace `Nalix.Network.Options`) holds the settings of the [Datagram Listener](../../network/datagram-listener.md). The per-session settings (channels, idle timeout, message size, buffers) are in `DatagramEngineOptions` (`Nalix.Environment.Options`).

:::note[Page location]
`DatagramGuardOptions` and `DatagramGuard` (IPv4/IPv6 source windows, `FailOpenWhenFull`, `UdpReplayWindowSize`) no longer exist in the source. Per-source rate limiting is no longer done by a UDP-specific guard: an authenticated datagram session is admitted through `IConnectionGuard` when its first datagram authenticates.
:::

## Source Mapping

- `src/Nalix.Network/Options/DatagramOptions.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Core.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.SocketConfig.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`

## Options

| Property | Type | Default | Validation | Used for |
| :--- | :--- | ---: | :--- | :--- |
| `TicketLifetimeSeconds` | `int` | `10` | `[ValueRange(1, 300)]` | Seconds within which the first datagram of a ticket must arrive; also advertised to the client as `DatagramTicketInfo.ExpiresInSeconds`. |
| `MaxSessions` | `int` | `100_000` | `[ValueRange(1, int.MaxValue)]` | Largest number of established sessions plus pending tickets; `IssueTicket` throws `InvalidOperationException` beyond it. |
| `ReceiveWorkers` | `int` | `1` | `[ValueRange(1, 64)]` | Number of workers reading the UDP socket. |
| `SocketReceiveBufferSize` | `int` | `4194304` (4 MiB) | `[ValueRange(65_536, int.MaxValue)]` | UDP socket `ReceiveBufferSize`. |
| `SocketSendBufferSize` | `int` | `4194304` (4 MiB) | `[ValueRange(65_536, int.MaxValue)]` | UDP socket `SendBufferSize`. |

`Validate()` runs DataAnnotation validation (`this.ValidateDataAnnotations()`) and throws `ValidationException` when a constraint fails. `DatagramListener` validates both `DatagramOptions` and `DatagramEngineOptions` in its constructor.

## Configuration

The class is loaded through `ConfigurationManager.Instance.Get<DatagramOptions>()` and written into `server.ini` by the hosting bootstrap (`Bootstrap.cs`). Its INI section comment reads "Datagram listener (NDP over UDP) — tickets, session limit and socket buffers".

```csharp
using Nalix.Hosting;
using Nalix.Hosting.Protocols;
using Nalix.Network.Options;

NetworkApplication app = NetworkApplication.CreateBuilder()
    .Configure<DatagramOptions>(opt =>
    {
        opt.ReceiveWorkers = 4;
        opt.MaxSessions = 20_000;
    })
    .UseSecureConnections()
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .MapDatagram<DefaultProtocol>().OnPort(57207).Bind()
    .Build();
```

## Operational Guidance

- Raise `ReceiveWorkers` only when a single worker cannot drain the socket; each worker owns a pinned buffer of `DatagramEngine.MaxDatagramSize + 1` (1473) bytes.
- Keep `TicketLifetimeSeconds` short: a pending ticket keeps the session secret in memory until it is promoted, replaced or swept.
- `MaxSessions` counts pending tickets as well, so a client that requests tickets without using them can only hold one per stream connection (a new request replaces the old ticket).
- The shared socket policy (`EnableDualStack`, `DualMode`) comes from [Network Socket Options](./network-socket-options.md); the socket buffer sizes do **not**.

## Related APIs

- [Network Options](./options.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Network Socket Options](./network-socket-options.md)
- [Datagram Listener](../../network/datagram-listener.md)
