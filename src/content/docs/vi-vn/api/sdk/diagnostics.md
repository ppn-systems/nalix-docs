---
title: Chẩn đoán phiên
description: Các mẫu quan sát phía client cho Nalix.SDK — theo dõi vòng đời kết nối, khung đến, chẩn đoán RequestOutcome và tình trạng clock/RTT.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK.Transport`, `Nalix.SDK.Transport.Extensions`, `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`Nalix.SDK` đưa ra các thay đổi vòng đời transport, lỗi khung, kết quả yêu cầu và chỉ số độ trễ thông qua các sự kiện của `TransportSession` (`OnConnected`, `OnReady`, `OnDisconnected`, `OnMessageReceived`, `OnError`), ghi log có cấu trúc `NLogix`, và các kết quả `RequestOutcome<TResponse>` không ném exception.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/TransportSession.cs`
- `src/Nalix.SDK/Transport/TcpSession.cs`
- `src/Nalix.SDK/Transport/UdpSession.cs`
- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`
- `src/Nalix.SDK/TimeSyncCalculator.cs`

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

## API liên quan

- [Transport Session](./transport-session.md)
- [Session Extensions](./tcp-session-extensions.md)
- [Tiện ích điều khiển (PingAsync, TimeSyncCalculator)](./control-utilities.md)
- [Request Options & RequestOutcome&lt;T&gt;](../options/sdk/request-options.md)
