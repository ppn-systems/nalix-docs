---
title: Session Diagnostics
description: Client-side observability patterns for Nalix.SDK — monitoring connection lifecycle events, inbound frames, RequestOutcome diagnostics, and clock/RTT health.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK`, `Nalix.SDK.Transport`, `Nalix.SDK.Transport.Extensions`, `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`Nalix.SDK` surfaces transport lifecycle changes, frame errors, request outcomes, and latency metrics through `TransportSession` events (`OnConnected`, `OnReady`, `OnDisconnected`, `OnMessageReceived`, `OnError`), `NLogix` structured logging, non-throwing `RequestOutcome<TResponse>` results, the `DiagnosticsEvents` listener (`"SDK"`), and `SdkTelemetry` tracing/metrics (`Nalix.SDK` `ActivitySource` and `Meter`).

## Source Mapping

- `src/Nalix.SDK/Transport/TransportSession.cs`
- `src/Nalix.SDK/Transport/TcpSession.cs`
- `src/Nalix.SDK/Transport/DatagramSession.cs`
- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`
- `src/Nalix.SDK/TimeSyncCalculator.cs`
- `src/Nalix.SDK/DiagnosticsEvents.cs`
- `src/Nalix.SDK/SdkTelemetry.cs`

## 1. Subscribing to Session Lifecycle & Error Events

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
        // IMPORTANT: Do NOT call lease.Dispose() here!
        // TransportSession owns the borrowed IBufferLease and disposes it after OnMessageReceived returns.
        if (lease.Length >= 6)
        {
            ushort opCode = BinaryPrimitives.ReadUInt16LittleEndian(lease.Span.Slice(2, 2));
            Console.WriteLine($"[{name}] Inbound frame: {lease.Length} bytes, OpCode=0x{opCode:X4}");
        }
    };
}
```

:::warning[Never Dispose `IBufferLease` Inside `OnMessageReceived`]
`TransportSession` passes a borrowed `IBufferLease` to `OnMessageReceived` and disposes it automatically in a `finally` block as soon as the event handlers return. Disposing `lease` inside `OnMessageReceived` causes a double-return bug if multiple handlers are subscribed. Only call `lease.Retain()` (and later `lease.Dispose()`) if you pass the lease to another thread.
:::

## 2. Reconnect Lifecycle Hooks (`OnResumedAsync` & `OnReauthenticateAsync`)

When `TransportOptions.AutoReconnectEnabled = true`, `ReconnectSupervisor` recovers dropped connections in the background and invokes your hooks before signaling `OnReady`:

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

## 3. Structured Request Diagnostics (`TryRequestAsync`)

Use `TryRequestAsync<TResponse>` to inspect `RequestOutcome<TResponse>` (`Kind`: `Ok`, `NotConnected`, `TimedOut`, `Failed`) without catching exceptions on hot paths:

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

## 4. Diagnostic Events (`DiagnosticsEvents`)

`DiagnosticsEvents` (`public static class`, namespace `Nalix.SDK`) is the registry of event names the SDK writes to a `DiagnosticListener`. Every event carries a `Nalix.Abstractions.Diagnostics.DiagnosticLog` payload. Subscribe through `DiagnosticListener.AllListeners` and match `DiagnosticsEvents.ListenerName`.

| Member | Value | Description |
| :--- | :--- | :--- |
| `ListenerName` | `"SDK"` | Name of the `DiagnosticListener`. |
| `Source` | `DiagnosticListener` | Global source events are written to. |
| `Write<T>(string name, T payload)` | `void` | AOT-safe write of `payload` through `Source`. |

Event names are grouped in nested static classes (all `const string`, e.g. `DiagnosticsEvents.Session.Connected == "Session.Connected"`):

| Group | Events |
| :--- | :--- |
| `Session` (TCP, WebSocket and datagram sessions) | `Connecting`, `Connected`, `ConnectFailed`, `Disconnected`, `TransportError` |
| `Handshake` | `Started`, `ProofOfWorkRequested`, `TofuTrusted`, `TofuPersisted`, `TofuNotPersisted`, `ProofInvalid`, `Completed`, `Failed` |
| `Resumption` | `Resumed`, `Declined`, `Failed`, `ProofInvalid`, `Fallback` |
| `Reconnect` | `Scheduled`, `AttemptFailed`, `Succeeded`, `GaveUp` |
| `KeepAlive` | `Missed`, `Failed` |
| `Rekey` | `Started`, `Completed`, `Failed` |
| `Requests` | `Retrying`, `Failed`, `InboundFrameFailed` |
| `Frames` (high volume) | `Sent`, `Received`, `ReplayRejected` |
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

## 5. Tracing and Metrics (`SdkTelemetry`)

`SdkTelemetry` (`public static class`, namespace `Nalix.SDK`) names the client-side tracing and metrics sources. Nothing is recorded, and nothing is allocated, while no listener is attached.

| Member | Value |
| :--- | :--- |
| `ActivitySourceName` | `"Nalix.SDK"` |
| `MeterName` | `"Nalix.SDK"` |

| Signal | Kind | Details |
| :--- | :--- | :--- |
| `nalix.request` | Activity (client kind) | One per `RequestAsync` / `TryRequestAsync` call; tags `nalix.opcode`, `nalix.response.type`, `nalix.request.attempts`, `nalix.request.outcome` and, on failure, `error.type`. |
| `nalix.client.request.duration` | Histogram (`s`) | Request duration including every retry; tags `nalix.response.type`, `nalix.request.outcome` (`ok`, `timeout`, `not_connected`, `network_error`, `canceled`, `error`). |
| `nalix.client.request.retries` | Counter | Retries started after an attempt timed out; tag `nalix.response.type`. |
| `nalix.client.reconnect.attempts` | Counter | Automatic reconnect attempts; tag `nalix.reconnect.outcome` (`resumed`, `handshake`, `failed`). |

```csharp
// OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t.AddSource(SdkTelemetry.ActivitySourceName))
    .WithMetrics(m => m.AddMeter(SdkTelemetry.MeterName));
```

Trace context is not propagated to the server.

## Related APIs

- [Transport Session](./transport-session.md)
- [Session Extensions](./tcp-session-extensions.md)
- [Control Utilities (PingAsync, TimeSyncCalculator)](./control-utilities.md)
- [Request Options & RequestOutcome&lt;T&gt;](../options/sdk/request-options.md)
