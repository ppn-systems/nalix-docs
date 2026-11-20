---
title: Network Socket Options
description: Reference for Nalix.Network.Options.NetworkSocketOptions — TCP listener socket configuration including port, backlog, dual-stack IPv6, buffer size, and accept parallelism.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`NetworkSocketOptions` (`public sealed partial class NetworkSocketOptions : ConfigurationLoader, IValidatableConfiguration`) configures the socket policy used by `TcpListenerBase`. `DatagramListener` reads only `EnableDualStack` and `DualMode` from it; its buffers and workers are configured by [DatagramOptions](./datagram-guard-options.md).

## Source Mapping

- `src/Nalix.Network/Options/NetworkSocketOptions.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.Core.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProcessChannel.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.SocketConfig.cs`

## Defaults and Validation

Loaded from the `[NetworkSocket]` section of `default.ini`:

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]`; setter throws `ArgumentOutOfRangeException` if `< 1` | Default listening port when no explicit port is passed to the listener constructor (the `IniComment` describes it as the TCP port). |
| `Backlog` | `int` | `512` | `[ValueRange(1, 65535)]` | Passed to `Socket.Listen(Backlog)` on TCP listeners. |
| `EnableTimeout` | `bool` | `true` | — | Enables registering/unregistering accepted TCP connections with the shared `TimingWheel`. |
| `EnableDualStack` | `bool` | `true` | — | Binds an IPv6 (`AddressFamily.InterNetworkV6`) listener socket (with automatic IPv4 fallback if unsupported). |
| `DualMode` | `bool` | `true` | — | Sets `Socket.DualMode = true` on IPv6 listener sockets so both IPv6 and IPv4-mapped connections are accepted on the same port. |
| `NoDelay` | `bool` | `true` | — | Sets `Socket.NoDelay = true` on accepted TCP sockets (disables Nagle's algorithm). |
| `MaxParallel` | `int` | `1` | `[ValueRange(1, 1024)]` | Number of concurrent SAEA TCP accept workers scheduled at listener activation (and multiplier for preallocating accept pools). |
| `BufferSize` | `int` | `65536` | `[ValueRange(2048, 10_485_760)]` | Applied to the TCP listener socket's `SendBufferSize` and `ReceiveBufferSize` (inherited by accepted sockets). The datagram listener does not use it; see `DatagramOptions.SocketReceiveBufferSize` / `SocketSendBufferSize`. |
| `KeepAlive` | `bool` | `true` | — | Enables TCP Keep-Alive probes (`TcpKeepAliveTime = 120`, `TcpKeepAliveInterval = 30`, `TcpKeepAliveRetryCount = 5`, with a Windows `IOControlCode.KeepAliveValues` fallback of 120 s / 30 s). |
| `ReuseAddress` | `bool` | `true` | — | TCP only: sets `ExclusiveAddressUse = OperatingSystem.IsWindows() || !ReuseAddress` and `SocketOptionName.ReuseAddress` (applied on non-Windows only). The datagram listener never sets `SO_REUSEADDR`. |
| `ReusePort` | `bool` | `false` | — | Attempts to enable `SO_REUSEPORT` on the TCP listener socket; only attempted on Linux (`TcpListener.SocketConfig.cs`). Can let another local process of the same user share the port. |
| `TcpFastOpen` | `bool` | `true` | — | Attempts to enable `TCP_FASTOPEN` (`SocketOptionName.FastOpen`) on the listening socket where supported by the OS. |
| `DispatchProcessorAffinity` | `int` | `-1` | — | 0-based CPU core index used to pin the TCP accept-channel consumer thread (`-1` leaves OS default scheduling). |
| `ProcessChannelCapacity` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Capacity of the bounded `Channel<AcceptConnectionResult>` between TCP accept workers and the initialization consumer. |
| `ProcessChannelDrainTimeout` | `int` | `5000` | `[ValueRange(0, 60000)]` | Maximum milliseconds to wait for the TCP accept process channel to drain gracefully during `Deactivate`. |

`Validate()` runs `this.ValidateDataAnnotations()` and throws `ValidationException` when any `[ValueRange]` constraint fails.

## TCP vs. Datagram Socket Application

| Setting | Applied to `TcpListenerBase` | Applied to `DatagramListener` |
| :--- | :---: | :---: |
| `EnableDualStack`, `DualMode` | Yes | Yes |
| `Port` | Yes (default port) | No (the port is passed to the constructor; `MapDatagram` without `OnPort` uses `0`) |
| `Backlog`, `NoDelay`, `KeepAlive`, `TcpFastOpen`, `EnableTimeout`, `MaxParallel`, `BufferSize`, `ReuseAddress`, `ReusePort`, `DispatchProcessorAffinity`, `ProcessChannelCapacity`, `ProcessChannelDrainTimeout` | Yes | No |

`MaxParallelUDP` and `MaxUdpDatagramSize` were removed. The datagram size cap is `DatagramEngine.MaxDatagramSize` (`1472`) and the receive workers are `DatagramOptions.ReceiveWorkers`.

## Related APIs

- [TCP Listener](../../network/tcp-listener.md)
- [Datagram Listener](../../network/udp-listener.md)
- [Datagram Options](./datagram-guard-options.md)
- [Connection Quota Options](./connection-quota-options.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Timing Wheel Options](./timing-wheel-options.md)
