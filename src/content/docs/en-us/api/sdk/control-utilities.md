---
title: Control Utilities
description: Reference for PingExtensions, DisconnectExtensions, TimeSyncExtensions, ControlExtensions, and TimeSyncCalculator in Nalix.SDK.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK`, `Nalix.SDK.Transport.Extensions`  
**Assembly:** `Nalix.SDK`

`Nalix.SDK` provides built-in control-plane extensions on `ITransportSession` for round-trip latency measurement (`PingAsync`), graceful disconnect notification (`DisconnectGracefullyAsync`), NTP-style clock synchronization (`SyncTimeAsync` + `TimeSyncCalculator`), and raw control packet transmission (`SendControlAsync`).

## Source Mapping

- `src/Nalix.SDK/Transport/Extensions/PingExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/DisconnectExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/TimeSyncExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ControlExtensions.cs`
- `src/Nalix.SDK/TimeSyncCalculator.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`
- `src/Nalix.Codec/ProtocolFrames/TimeSync.cs`

## Public API Reference

### 1. `PingExtensions` (`PingAsync`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class PingExtensions
{
    public static ValueTask<double> PingAsync(
        this ITransportSession session,
        int timeoutMs = 5000,
        CancellationToken ct = default);
}
```

- Sends a `TimeSync` packet (`session.NewTimeSync(ControlType.PING).WithSeq(seq).Build()`) and awaits a matching `TimeSync` (`Type == ControlType.PONG && SequenceId == seq`).
- Computes the round-trip time (RTT) in milliseconds using `Stopwatch.GetElapsedTime(startTicks).TotalMilliseconds`.
- Used automatically by `TransportSession` when `TransportOptions.KeepAliveIntervalMillis > 0`.

### 2. `DisconnectExtensions` (`DisconnectGracefullyAsync`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class DisconnectExtensions
{
    public static ValueTask DisconnectGracefullyAsync(
        this ITransportSession session,
        ProtocolReason reason = ProtocolReason.NONE,
        bool closeLocalConnection = true,
        CancellationToken ct = default);
}
```

- Sends a `Control` packet (`ControlType.DISCONNECT`, `Reason = reason`) using `session.NewControl(ControlType.DISCONNECT).WithReason(reason)`, swallowing send exceptions if the socket is already closed, and calls `await session.DisconnectAsync()` when `closeLocalConnection == true`.

### 3. `TimeSyncExtensions` (`SyncTimeAsync`) & `TimeSyncCalculator`

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class TimeSyncExtensions
{
    public static TimeSyncBuilder NewTimeSync(
        this ITransportSession _,
        ControlType type);

    public static ValueTask<(double RttMs, double AdjustedMs)> SyncTimeAsync(
        this ITransportSession session,
        int timeoutMs = 5000,
        CancellationToken ct = default);
}
```

```csharp
namespace Nalix.SDK;

public static class TimeSyncCalculator
{
    public static double CalculateOffsetMs(
        long serverUnixMs,
        double rttMs = 0,
        double maxAllowedDriftMs = 1_000.0,
        double maxHardAdjustMs = 10_000.0);
}
```

- **Clock Offset Formula**:
  - `SyncTimeAsync` sends `TimeSync(ControlType.TIMESYNCREQUEST)` and awaits `TimeSync(ControlType.TIMESYNCRESPONSE)`.
  - Calls `TimeSyncCalculator.CalculateOffsetMs(pong.Timestamp, rttMs)` to compute the clamped clock offset.
  - When `session.Options.TimeSyncEnabled` is `true`, updates `session.Options.TimeOffsetMs` using an Exponential Moving Average (`(TimeOffsetMs * 0.9) + (offset * 0.1)`, or direct assignment on first sync) and returns `(RttMs, AdjustedMs: session.Options.TimeOffsetMs)`.

### 4. `ControlExtensions` (`NewControl`, `SendControlAsync`, `AwaitControlAsync`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class ControlExtensions
{
    public static ControlBuilder NewControl(
        this ITransportSession _,
        ControlType type);

    public static ValueTask SendControlAsync(
        this ITransportSession client,
        ControlType type,
        Action<Control>? configure = null,
        CancellationToken ct = default);

    public static ValueTask<TPkt> AwaitPacketAsync<TPkt>(
        this ITransportSession client,
        Func<TPkt, bool> predicate,
        int timeoutMs,
        CancellationToken ct = default)
        where TPkt : class, IPacket, IPacketStaticOpcode;

    public static ValueTask<Control> AwaitControlAsync(
        this ITransportSession client,
        Func<Control, bool> predicate,
        int timeoutMs,
        CancellationToken ct = default);
}
```

`SendControlAsync` rents a pooled `Control` packet from `ObjectPoolManager`, initializes it with `type` (and optional `configure` callback), sends it over `client`, and returns the `Control` packet to the pool in a `finally` block.

## Usage Example

```csharp
using System;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.SDK.Transport.Extensions;

// 1. Measure round-trip latency
double rttMs = await session.PingAsync();
Console.WriteLine($"Ping RTT: {rttMs:F2} ms");

// 2. Synchronize client clock with server using EMA filtering
(double rtt, double adjustedOffsetMs) = await session.SyncTimeAsync();
Console.WriteLine($"RTT: {rtt:F2} ms, Smoothed Offset: {adjustedOffsetMs:F2} ms");

// 3. Notify server and close connection cleanly
await session.DisconnectGracefullyAsync(ProtocolReason.NONE);
```

## Related APIs

- [Transport Session](./transport-session.md)
- [Session Extensions](./tcp-session-extensions.md)
- [Protocol String Extensions](./protocol-string-extensions.md)
