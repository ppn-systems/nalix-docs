---
title: Tiện ích điều khiển
description: Tham chiếu cho PingExtensions, DisconnectExtensions, TimeSyncExtensions, ControlExtensions và TimeSyncCalculator trong Nalix.SDK.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK`, `Nalix.SDK.Transport.Extensions`  
**Assembly:** `Nalix.SDK`

`Nalix.SDK` cung cấp các extension mặt phẳng điều khiển tích hợp sẵn trên `ITransportSession`: đo độ trễ khứ hồi (`PingAsync`), thông báo ngắt kết nối êm (`DisconnectGracefullyAsync`), đồng bộ đồng hồ kiểu NTP (`SyncTimeAsync` + `TimeSyncCalculator`), và gửi gói điều khiển thô (`SendControlAsync`).

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/Extensions/PingExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/DisconnectExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/TimeSyncExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ControlExtensions.cs`
- `src/Nalix.SDK/TimeSyncCalculator.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`
- `src/Nalix.Codec/ProtocolFrames/TimeSync.cs`

## Tham chiếu API công khai

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

- Gửi một gói `TimeSync` (`session.NewTimeSync(ControlType.PING).WithSeq(seq).Build()`) và chờ một `TimeSync` khớp (`Type == ControlType.PONG && SequenceId == seq`).
- Tính độ trễ khứ hồi (RTT) theo mili giây bằng `Stopwatch.GetElapsedTime(startTicks).TotalMilliseconds`.
- Được `TransportSession` tự động dùng khi `TransportOptions.KeepAliveIntervalMillis > 0`.

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

- Gửi một gói `Control` (`ControlType.DISCONNECT`, `Reason = reason`) qua `session.NewControl(ControlType.DISCONNECT).WithReason(reason)`, bỏ qua các exception khi gửi nếu socket đã đóng, và gọi `await session.DisconnectAsync()` khi `closeLocalConnection == true`.

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

- **Công thức độ lệch đồng hồ**:
  - `SyncTimeAsync` gửi `TimeSync(ControlType.TIMESYNCREQUEST)` và chờ `TimeSync(ControlType.TIMESYNCRESPONSE)`.
  - Gọi `TimeSyncCalculator.CalculateOffsetMs(pong.Timestamp, rttMs)` để tính độ lệch đồng hồ đã được giới hạn.
  - Khi `session.Options.TimeSyncEnabled` là `true`, cập nhật `session.Options.TimeOffsetMs` bằng Trung bình động lũy tiến (EMA) (`(TimeOffsetMs * 0.9) + (offset * 0.1)`, hoặc gán trực tiếp ở lần đồng bộ đầu tiên) và trả về `(RttMs, AdjustedMs: session.Options.TimeOffsetMs)`.

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

`SendControlAsync` thuê một gói `Control` có pool từ `ObjectPoolManager`, khởi tạo với `type` (và callback `configure` tùy chọn), gửi qua `client`, rồi trả gói `Control` về pool trong khối `finally`.

## Ví dụ sử dụng

```csharp
using System;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.SDK.Transport.Extensions;

// 1. Đo độ trễ khứ hồi
double rttMs = await session.PingAsync();
Console.WriteLine($"Ping RTT: {rttMs:F2} ms");

// 2. Đồng bộ đồng hồ client với server bằng lọc EMA
(double rtt, double adjustedOffsetMs) = await session.SyncTimeAsync();
Console.WriteLine($"RTT: {rtt:F2} ms, Smoothed Offset: {adjustedOffsetMs:F2} ms");

// 3. Thông báo server và đóng kết nối một cách êm thấm
await session.DisconnectGracefullyAsync(ProtocolReason.NONE);
```

## API liên quan

- [Transport Session](./transport-session.md)
- [Session Extensions](./tcp-session-extensions.md)
- [Protocol String Extensions](./protocol-string-extensions.md)
