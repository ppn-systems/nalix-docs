---
title: Idle Connection Timeout
description: Nalix provides a built-in mechanism to automatically detect and disconnect client connections that have been inactive for a specified duration. This is critical for reclaiming r...
section: Guides
---

Nalix provides a built-in mechanism to automatically detect and disconnect client connections that have been inactive for a specified duration. This is critical for reclaiming resources and protecting against persistent connection exhaustion (Slowloris-style attacks).

---

## 1. The Timing Wheel Mechanism

Instead of using a separate `Timer` for every connection (which is expensive and causes GC pressure), Nalix uses a **Hashed Timing Wheel**.

### How it Works
1. Connections are placed into "buckets" on a virtual wheel.
2. A single background worker "ticks" through these buckets at a fixed interval.
3. Only connections in the current bucket are checked for idleness.

This ensures that even with **100,000+ concurrent connections**, the CPU overhead remains constant and minimal.

---

## 2. Configuration

Idle timeout is managed via `TimingWheelOptions` (`[TimingWheel]` INI section). Individual connections can opt out of idle eviction at runtime by setting `connection.ExcludeFromIdleTimeout = true`.

### Method 1: Configuration Files (INI)

`ConfigurationManager` loads `TimingWheelOptions` from the `[TimingWheel]` section in `assets/config.ini`:

```ini
[TimingWheel]
; The duration in milliseconds before an idle connection is closed (minimum 1000)
IdleTimeoutMs = 60000

; The precision of the idle check in milliseconds (10 to 60000)
TickDuration = 1000

; Number of buckets in the wheel (16 to 1024; rounded up to power of two)
BucketCount = 512
```

---

## 3. Method 2: Fluent Builder (C#)

If you prefer to configure the server in code, use `ConfigurationManager.Instance.Get<TimingWheelOptions>()` or configure your listener before `Build()`:

```csharp
using Nalix.Environment.Configuration;
using Nalix.Hosting;
using Nalix.Network.Options;

TimingWheelOptions wheelOptions = ConfigurationManager.Instance.Get<TimingWheelOptions>();
wheelOptions.IdleTimeoutMs = 30_000; // Disconnect after 30 seconds of silence
wheelOptions.TickDuration = 1000;    // Check once per second

var host = NetworkApplication.CreateBuilder()
    .MapTcp<MyProtocol>().Bind()
    .Build();

await host.RunAsync();
```

To exempt a specific long-lived connection (such as an internal health monitor or inter-server bridge) from idle timeout eviction:

```csharp
connection.ExcludeFromIdleTimeout = true;
```

---

## 4. Verifying Idle Disconnection

When the timing wheel disconnects a client, it emits a `Debug` or `Info` level log (depending on your logging configuration).

**Example Log Output:**
```text
[DEBUG] [NW.TimingWheel] timeout remote=192.168.1.50 idle=30005ms
[INFO]  [NW.TcpListenerBase] close=192.168.1.50
```

### Pro-Tip: TCP Keep-Alive
Idle timeout detects **application-level** silence. To detect **network-level** dead sockets (where the client crashed without closing the connection), also ensure `KeepAlive` is enabled in `NetworkSocketOptions`.

---

## Related Information

- [Timing Wheel API Reference](../../api/network/time/timing-wheel.md)
- [Network Socket Options](../../api/options/network/network-socket-options.md)
- [Production Checklist](../deployment/production-checklist.md)
