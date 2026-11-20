---
title: Chẩn đoán phiên
description: Các mẫu quan sát phía client cho Nalix.SDK — theo dõi vòng đời kết nối, khung đến, chẩn đoán RequestOutcome và tình trạng clock/RTT.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK`, `Nalix.SDK.Transport`, `Nalix.SDK.Transport.Extensions`, `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`Nalix.SDK` đưa ra các thay đổi vòng đời transport, lỗi khung, kết quả yêu cầu và chỉ số độ trễ thông qua các sự kiện của `TransportSession` (`OnConnected`, `OnReady`, `OnDisconnected`, `OnMessageReceived`, `OnError`), ghi log có cấu trúc `NLogix`, các kết quả `RequestOutcome<TResponse>` không ném exception, bộ lắng nghe `DiagnosticsEvents` (`"SDK"`), và `SdkTelemetry` cho tracing/metrics (`ActivitySource` và `Meter` `Nalix.SDK`).

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/TransportSession.cs`
- `src/Nalix.SDK/Transport/TcpSession.cs`
- `src/Nalix.SDK/Transport/DatagramSession.cs`
- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`
- `src/Nalix.SDK/TimeSyncCalculator.cs`
- `src/Nalix.SDK/DiagnosticsEvents.cs`
- `src/Nalix.SDK/SdkTelemetry.cs`

## 1. Đăng ký sự kiện vòng đời & lỗi của phiên

```csharp
using System;
using System.Buffers.Binary;
using Nalix.Abstractions.Memory;
using Nalix.SDK.Transport;

public static void AttachDiagnostics(TransportSession session, string name)
{
    session.OnConnected += (_, _) =>
        Console.WriteLine($"[{name}] Socket connected (LocalPort={session.State.LocalPort}).");

    session.OnReady += (_, _) =>
        Console.WriteLine($"[{name}] Session ready (Encrypted={session.State.EncryptionEnabled}, Token=0x{session.State.SessionToken:X16}).");

    session.OnDisconnected += (_, ex) =>
        Console.WriteLine($"[{name}] Disconnected: {ex?.Message ?? "Clean close"}");

    session.OnError += (_, ex) =>
        Console.Error.WriteLine($"[{name}] Transport error: {ex.GetType().Name}: {ex.Message}");

    session.OnMessageReceived += (_, lease) =>
    {
        // QUAN TRỌNG: KHÔNG gọi lease.Dispose() ở đây!
        // TransportSession sở hữu IBufferLease được mượn và tự dispose sau khi các event handler trả về.
        if (lease.Length >= 6)
        {
            ushort opCode = BinaryPrimitives.ReadUInt16LittleEndian(lease.Span.Slice(2, 2));
            Console.WriteLine($"[{name}] Inbound frame: {lease.Length} bytes, OpCode=0x{opCode:X4}");
        }
    };
}
```

:::warning[Không bao giờ dispose `IBufferLease` bên trong `OnMessageReceived`]
`TransportSession` truyền một `IBufferLease` được mượn vào `OnMessageReceived` và tự động dispose nó trong khối `finally` ngay khi các event handler trả về. Dispose `lease` bên trong `OnMessageReceived` gây lỗi trả về hai lần khi có nhiều handler được đăng ký. Chỉ gọi `lease.Retain()` (và sau đó `lease.Dispose()`) nếu bạn chuyển lease sang một luồng khác.
:::

## 2. Các hook kết nối lại (`OnResumedAsync` & `OnReauthenticateAsync`)

Khi `TransportOptions.AutoReconnectEnabled = true`, `ReconnectSupervisor` khôi phục các kết nối bị rớt ở chế độ nền và gọi các hook của bạn trước khi báo `OnReady`:

```csharp
session.OnResumedAsync = async ct =>
{
    Console.WriteLine("0-RTT session resumed! Server state and attributes are still intact.");
    await Task.CompletedTask;
};

session.OnReauthenticateAsync = async ct =>
{
    Console.WriteLine("Previous session expired; fresh X25519 handshake completed. Re-sending login...");
    await session.RequestAsync<LoginResponse>(new LoginPacket { Token = savedJwt }, ct: ct);
};
```

## 3. Chẩn đoán yêu cầu có cấu trúc (`TryRequestAsync`)

Dùng `TryRequestAsync<TResponse>` để kiểm tra `RequestOutcome<TResponse>` (`Kind`: `Ok`, `NotConnected`, `TimedOut`, `Failed`) mà không cần bắt exception trên hot path:

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

RequestOutcome<MatchmakeResponse> outcome = await session.TryRequestAsync<MatchmakeResponse>(
    new MatchmakeRequest { Mode = "Ranked" },
    RequestOptions.Default.WithTimeout(3_000).WithRetry(1));

switch (outcome.Kind)
{
    case RequestOutcomeKind.Ok:
        Console.WriteLine($"Matched into lobby {outcome.Value.LobbyId}");
        break;
    case RequestOutcomeKind.NotConnected:
        Console.WriteLine("Cannot send request: session is offline.");
        break;
    case RequestOutcomeKind.TimedOut:
        Console.WriteLine("Server did not respond within timeout budget.");
        break;
    case RequestOutcomeKind.Failed:
        Console.WriteLine($"Protocol or serialization failure: {outcome.Error?.Message}");
        break;
}
```

## 4. Sự kiện chẩn đoán (`DiagnosticsEvents`)

`DiagnosticsEvents` (`public static class`, namespace `Nalix.SDK`) là bảng đăng ký tên các sự kiện mà SDK ghi vào một `DiagnosticListener`. Mỗi sự kiện mang payload `Nalix.Abstractions.Diagnostics.DiagnosticLog`. Hãy đăng ký qua `DiagnosticListener.AllListeners` và so khớp với `DiagnosticsEvents.ListenerName`.

| Thành viên | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `ListenerName` | `"SDK"` | Tên của `DiagnosticListener`. |
| `Source` | `DiagnosticListener` | Nguồn toàn cục mà các sự kiện được ghi vào. |
| `Write<T>(string name, T payload)` | `void` | Ghi `payload` qua `Source`, an toàn với AOT. |

Tên sự kiện được nhóm trong các lớp static lồng nhau (tất cả là `const string`, ví dụ `DiagnosticsEvents.Session.Connected == "Session.Connected"`):

| Nhóm | Sự kiện |
| :--- | :--- |
| `Session` (phiên TCP, WebSocket và datagram) | `Connecting`, `Connected`, `ConnectFailed`, `Disconnected`, `TransportError` |
| `Handshake` | `Started`, `ProofOfWorkRequested`, `TofuTrusted`, `TofuPersisted`, `TofuNotPersisted`, `ProofInvalid`, `Completed`, `Failed` |
| `Resumption` | `Resumed`, `Declined`, `Failed`, `ProofInvalid`, `Fallback` |
| `Reconnect` | `Scheduled`, `AttemptFailed`, `Succeeded`, `GaveUp` |
| `KeepAlive` | `Missed`, `Failed` |
| `Rekey` | `Started`, `Completed`, `Failed` |
| `Requests` | `Retrying`, `Failed`, `InboundFrameFailed` |
| `Frames` (khối lượng lớn) | `Sent`, `Received`, `ReplayRejected` |
| `Subscriptions` | `HandlerFailed`, `HandlerCanceled`, `UnexpectedPacket`, `DisposeFailed` |

```csharp
using System;
using System.Collections.Generic;
using System.Diagnostics;
using Nalix.SDK;

public sealed class SdkObserver : IObserver<DiagnosticListener>, IObserver<KeyValuePair<string, object?>>
{
    public void OnNext(DiagnosticListener listener)
    {
        if (listener.Name == DiagnosticsEvents.ListenerName)
        {
            _ = listener.Subscribe(this);
        }
    }

    public void OnNext(KeyValuePair<string, object?> evt)
    {
        if (evt.Key == DiagnosticsEvents.Reconnect.GaveUp)
        {
            Console.Error.WriteLine("Automatic reconnect gave up.");
        }
    }

    public void OnCompleted() { }
    public void OnError(Exception error) { }
}

// DiagnosticListener.AllListeners.Subscribe(new SdkObserver());
```

## 5. Tracing và metrics (`SdkTelemetry`)

`SdkTelemetry` (`public static class`, namespace `Nalix.SDK`) đặt tên cho các nguồn tracing và metrics phía client. Khi chưa gắn listener nào, không có gì được ghi lại và không có gì được cấp phát.

| Thành viên | Giá trị |
| :--- | :--- |
| `ActivitySourceName` | `"Nalix.SDK"` |
| `MeterName` | `"Nalix.SDK"` |

| Tín hiệu | Loại | Chi tiết |
| :--- | :--- | :--- |
| `nalix.request` | Activity (loại client) | Một activity cho mỗi lần gọi `RequestAsync` / `TryRequestAsync`; có các tag `nalix.opcode`, `nalix.response.type`, `nalix.request.attempts`, `nalix.request.outcome` và, khi thất bại, `error.type`. |
| `nalix.client.request.duration` | Histogram (`s`) | Thời lượng yêu cầu gồm cả mọi lần thử lại; có các tag `nalix.response.type`, `nalix.request.outcome` (`ok`, `timeout`, `not_connected`, `network_error`, `canceled`, `error`). |
| `nalix.client.request.retries` | Counter | Số lần thử lại được bắt đầu sau khi một lần thử hết thời gian chờ; tag `nalix.response.type`. |
| `nalix.client.reconnect.attempts` | Counter | Số lần thử kết nối lại tự động; tag `nalix.reconnect.outcome` (`resumed`, `handshake`, `failed`). |

```csharp
// OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddSource(SdkTelemetry.ActivitySourceName))
    .WithMetrics(m => m.AddMeter(SdkTelemetry.MeterName));
```

Ngữ cảnh trace không được truyền sang máy chủ.

## API liên quan

- [Transport Session](./transport-session.md)
- [Session Extensions](./tcp-session-extensions.md)
- [Tiện ích điều khiển (PingAsync, TimeSyncCalculator)](./control-utilities.md)
- [Request Options & RequestOutcome&lt;T&gt;](../options/sdk/request-options.md)
