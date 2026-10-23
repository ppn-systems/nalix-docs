---
title: Network Socket Options
description: Reference for Nalix.Network.Options.NetworkSocketOptions — shared TCP and UDP socket configuration including port, backlog, dual-stack IPv6, buffer size, accept parallelism, and UDP datagram limits.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`NetworkSocketOptions` (`public sealed partial class NetworkSocketOptions : ConfigurationLoader, IValidatableConfiguration`) configures the shared socket policy used by `TcpListenerBase`, `UdpListenerBase`, and `SocketUdpTransport`.

## Source Mapping

- `src/Nalix.Network/Options/NetworkSocketOptions.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.Core.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/TcpListener/TcpListener.ProcessChannel.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.Core.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.SocketConfig.cs`
- `src/Nalix.Network/Listeners/UdpListener/UdpListener.Receive.cs`
- `src/Nalix.Network/Internal/Transport/SocketUdpTransport.cs`

## Defaults and Validation

Loaded from the `[NetworkSocket]` section of `default.ini`:

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `Port` | `ushort` | `57206` | `[ValueRange(1, 65535)]`; setter throws `ArgumentOutOfRangeException` if `< 1` | Default TCP/UDP listening port when no explicit port is passed to the listener constructor. |
| `Backlog` | `int` | `512` | `[ValueRange(1, 65535)]` | Passed to `Socket.Listen(Backlog)` on TCP listeners. |
| `EnableTimeout` | `bool` | `true` | — | Enables registering/unregistering accepted TCP connections with the shared `TimingWheel`. |
| `EnableDualStack` | `bool` | `true` | — | Binds an IPv6 (`AddressFamily.InterNetworkV6`) listener socket (with automatic IPv4 fallback if unsupported). |
| `DualMode` | `bool` | `true` | — | Sets `Socket.DualMode = true` on IPv6 listener sockets so both IPv6 and IPv4-mapped connections are accepted on the same port. |
| `NoDelay` | `bool` | `true` | — | Sets `Socket.NoDelay = true` on accepted TCP sockets (disables Nagle's algorithm). |
| `MaxParallel` | `int` | `1` | `[ValueRange(1, 1024)]` | Number of concurrent SAEA TCP accept workers scheduled at listener activation (and multiplier for preallocating accept pools). |
| `MaxParallelUDP` | `int` | `1` | `[ValueRange(1, 1024)]` | Number of concurrent SAEA UDP receive worker loops scheduled at activation. |
| `BufferSize` | `int` | `65536` | `[ValueRange(2048, 10_485_760)]` | Applied to TCP listener `ReceiveBufferSize`, accepted TCP client `SendBufferSize`/`ReceiveBufferSize`, and UDP `SendBufferSize`/`ReceiveBufferSize`. |
| `KeepAlive` | `bool` | `true` | — | Enables TCP Keep-Alive probes (`TcpKeepAliveTime = 3s`, `TcpKeepAliveInterval = 1s`, `TcpKeepAliveRetryCount = 3`, with Windows `IOControlCode.KeepAliveValues` fallback). |
| `ReuseAddress` | `bool` | `true` | — | Sets `ExclusiveAddressUse = !ReuseAddress` and `SocketOptionName.ReuseAddress`. |
| `ReusePort` | `bool` | `true` | — | Attempts to enable `SO_REUSEPORT` (`SocketOptionName.ReuseUnicastPort`) where supported by the OS. |
| `TcpFastOpen` | `bool` | `true` | — | Attempts to enable `TCP_FASTOPEN` on the listening socket where supported by the OS. |
| `DispatchProcessorAffinity` | `int` | `-1` | — | 0-based CPU core index used to pin the TCP accept-channel consumer thread (`-1` leaves OS default scheduling). |
| `ProcessChannelCapacity` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Capacity of the bounded `Channel<AcceptConnectionResult>` between TCP accept workers and the initialization consumer. |
| `ProcessChannelDrainTimeout` | `int` | `5000` | `[ValueRange(0, 60000)]` | Maximum milliseconds to wait for the TCP accept process channel to drain gracefully during `Deactivate`. |
| `MaxUdpDatagramSize` | `int` | `1440` | `[ValueRange(64, 65507)]` | Maximum allowed size in bytes for a single inbound (`UdpListenerBase`) or outbound (`SocketUdpTransport`) UDP datagram. |

`Validate()` runs `this.ValidateDataAnnotations()` and throws `ValidationException` when any `[ValueRange]` constraint fails.

## TCP vs. UDP Socket Application

| Setting | Applied to `TcpListenerBase` | Applied to `UdpListenerBase` / `SocketUdpTransport` |
| :--- | :---: | :---: |
| `Port`, `EnableDualStack`, `DualMode`, `BufferSize`, `ReuseAddress`, `ReusePort` | Yes | Yes |
| `Backlog`, `NoDelay`, `KeepAlive`, `TcpFastOpen`, `EnableTimeout`, `MaxParallel`, `DispatchProcessorAffinity`, `ProcessChannelCapacity`, `ProcessChannelDrainTimeout` | Yes | No |
| `MaxParallelUDP`, `MaxUdpDatagramSize`, `DontFragment = true`, Windows `SIO_UDP_CONNRESET` suppression | No | Yes |

## Related APIs

- [TCP Listener](../../network/tcp-listener.md)
- [UDP Listener](../../network/udp-listener.md)
- [Connection Quota Options](./connection-quota-options.md)
- [Connection Guard Options](./connection-guard-options.md)
- [Timing Wheel Options](./timing-wheel-options.md)
