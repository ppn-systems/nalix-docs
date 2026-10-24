---
title: Client Sessions
description: "This guide walks through creating, configuring, and connecting a client session using Nalix.SDK. It focuses on the actual SDK surface in the current source tree: TransportOption..."
section: Guides
---

This guide walks through creating, configuring, and connecting a client session using `Nalix.SDK`. It focuses on the actual SDK surface in the current source tree: `TransportOptions`, `TcpSession`, `UdpSession`, and the transport extension methods built on top of them.

If you haven't yet, start with [Your First Server](../getting-started/your-first-server.md) — it covers the simpler `session.RequestAsync<T>()` path this guide builds on.

:::danger[Security Warning]
Never expose the `Secret` key or the `SessionToken` snowflakes in clear-text logs or debug UIs. These are sensitive cryptographic materials.
:::

:::warning[Common Configuration Pitfall (Handshake Errors)]
If you plan to use `session.HandshakeAsync()`, **DO NOT** manually set `session.State.EncryptionEnabled = true` or set a hardcoded `session.State.Secret` beforehand! The initial handshake phase runs in plaintext to securely negotiate a dynamic key using X25519. If you manually enable encryption out of the gate, the SDK will encrypt the `SessionInit` packet, the server will fail to decrypt it, and the connection will immediately drop. `HandshakeAsync()` safely and automatically enables `session.State.EncryptionEnabled` and assigns `session.State.Secret` for you upon success.
:::

## 1. Shared Packet Catalog

The client and server **must** reference the same shared packet contracts project. When `TransportSession.ConnectAsync()` runs, it automatically invokes `PacketRegistry.Build()` if no `PacketRegistry` is registered yet, using the compile-time `[ModuleInitializer]` emitted by `PacketRegistryGenerator`:

```csharp
// Ensure your client references the shared contracts assembly so its [ModuleInitializer] runs.
// ConnectAsync() automatically calls PacketRegistry.Build() on first connect,
// or you can build it explicitly at startup:
PacketRegistry.Build();
```

## 2. Configure Transport Options

The `TransportOptions` govern connection backoff patterns, socket buffer sizing, keepalive intervals, and cipher selection. You can fetch these directly from `ConfigurationManager` or manually construct them.

```csharp
using Nalix.SDK.Options;
using Nalix.Environment.Configuration;

// OPTION A: Load automatically from the environment's configuration files (Recommended)
// This binds values from your INI definitions and natively supports hot-reloading.
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();

// OPTION B: Manual Initialization
TransportOptions manualOptions = new()
{
    // Connectivity
    Address = "127.0.0.1",
    Port = 57206,
    ConnectTimeoutMillis = 30000,
    
    // Auto-reconnect configuration (ReconnectSupervisor)
    AutoReconnectEnabled = true,
    ReconnectBaseDelayMillis = 500,
    ReconnectMaxDelayMillis = 30000,
    ReconnectMaxAttempts = 0, // 0 = infinite retries
    
    // Performance tuning
    NoDelay = true,           // Disable Nagle's algorithm (highly recommended for Games/Real-time)
    BufferSize = 65536,       // Socket send/receive buffer size (default 64 KB)
    MaxUdpDatagramSize = 1400 // UDP limit including 8-byte SessionToken and 4-byte XxHash32 MAC
};
```

## 3. Create and Connect a TCP Session

A `TcpSession` uses the configured `TransportOptions` to establish TCP streams. In practice, you will usually register events before calling `ConnectAsync()` so you do not miss early connection or error signals.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;
using Nalix.Framework.Memory.Buffers;

async Task ConnectTcpStandardAsync()
{
    // The 'using' declaration ensures sockets and background loops are safely tracked
    using TcpSession session = new(options);

    // 1. Bind Lifecycle Events
    session.OnConnected += (_, _) => 
    {
        Console.WriteLine("TCP Connected successfully.");
    };

    session.OnDisconnected += (_, ex) => 
    {
        // ex contains underlying SocketExceptions or NetworkExceptions
        Console.WriteLine($"TCP Disconnected. Reason: {ex.Message}");
    };

    session.OnError += (_, ex) => 
    {
        Console.WriteLine($"TCP Error observed: {ex.Message}");
    };

    // 2. Bind Message Handlers (Strongly-Typed)
    // The framework will automatically read the byte stream, deserialize the packet,
    // and invoke your callback strictly when the matching type is observed.
    session.On<MyResponsePacket>(packet => 
    {
        Console.WriteLine($"Received strongly-typed data: {packet.StatusMessage}");
    });

    // 3. Connect, try resume, then fall back to handshake when needed
    // `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs` connects first,
    // attempts resume only when ResumeEnabled + SessionToken + Secret are present,
    // and reconnects before falling back to HandshakeAsync when configured to do so.
    Console.WriteLine("Connecting to server...");
    bool resumed = await session.ConnectWithResumeAsync();
    Console.WriteLine(resumed ? "Session resumed." : "Fresh handshake completed.");
    
    // At this point, `session.State` contains `EncryptionEnabled = true`,
    // `Secret` (32-byte key), and the 8-byte `SessionToken` assigned by the server.
    // ---------------------------------------------------------

    // 4. Ship Payloads
    // session.SendAsync(...) handles packing, compression, encryption, and dispatch over the wire.
    // await session.SendAsync(new MyCustomPacket());
    
    // Prevent context from tearing down
    await Task.Delay(-1); 
}
```

:::tip[Performance Edge-case Options]
The `On<T>` extension is designed for highest developer velocity. If you need lower-level control, see our [Session APIs Guide](../../concepts/internals/low-level-session-apis.md) for raw `OnMessageReceived` flows.
:::

:::note[Performance Recommendation]
While the SDK is mostly platform-agnostic, specialized socket options like `TCP_NODELAY` are enabled by default for gaming workloads.
:::

## 4. Create and Connect a UDP Session (Auxiliary Channel)

:::note[TCP is Primary, UDP is Auxiliary]
In the Nalix architecture, **TCP is typically the primary, stateful connection**. The `UdpSession` acts as an auxiliary channel for high-frequency, unreliable data. In the common secured flow, the UDP session shares the `SessionState` (`SessionToken` and `Secret`) established by the TCP handshake or resume path.
:::

`UdpSession` follows the same base transport contract, but handles datagrams instead of framed TCP streams. Pass `tcpSession.State` into the `UdpSession` constructor so both sessions share the negotiated `SessionToken` and 32-byte `Secret`.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Transport;

async Task ConnectUdpStandardAsync(TcpSession tcpSession)
{
    // Pass `tcpSession.State` so UdpSession shares the negotiated SessionToken and Secret
    using UdpSession udp = new(options, tcpSession.State);

    udp.OnConnected += (_, _) => Console.WriteLine("UDP socket bound and active.");
    udp.OnDisconnected += (_, ex) => Console.WriteLine($"UDP Disconnected: {ex?.Message}");
    udp.OnError += (_, ex) => Console.WriteLine($"UDP Error: {ex.Message}");

    // Connect to setup targeted UDP Socket (binding against Server IP and Port)
    await udp.ConnectAsync();

    // UDP internally wraps outbound datagrams with the 8-byte SessionToken and 4-byte XxHash32 MAC.
    // await udp.SendAsync(new PlayerMovementPacket { X = 1, Y = 2, Z = 5 });
    
    await Task.Delay(-1);
}
```

:::danger[UDP Datagram Size Constraint]
UDP payloads plus the 12-byte wrapper (`8`-byte `SessionToken` prefix + `4`-byte `XxHash32` MAC trailer) cannot exceed `TransportOptions.MaxUdpDatagramSize` (Default `1400` bytes). Large chunks of data must be routed through TCP protocols. Violating the MTU triggers local `NetworkException` halts.
:::

:::note
`SessionState.Secret` uses the `Bytes32` primitive in the current SDK source.
:::

## 5. Common SDK Extensions

To help you get started quickly and handle advanced networking tasks gracefully, here are some built-in extensions that can be executed directly on any session instance:

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

// 1. Network Latency Check (Ping)
// Measures round-trip time (RTT) safely across the protocol
double rttMs = await session.PingAsync();
Console.WriteLine($"Current Latency: {rttMs}ms");

// 2. Time Synchronization
// Re-aligns the client's internal clock offsets against the core server's clock
var sync = await session.SyncTimeAsync();
Console.WriteLine($"RTT={sync.RttMs}ms Adjusted={sync.AdjustedMs}ms");

// 3. Request-Response Mechanics (RPC via Packets)
// Send a request packet and cleanly await a strongly-typed response 
var response = await session.RequestAsync<MyResponsePacket>(
    request: new MyRequestPacket { UserId = 123 },
    options: RequestOptions.Default.WithTimeout(3000), // timeout within 3s
    predicate: p => p.IsSuccess // Optional: Filter exactly which response to accept
);
```

## 6. Automatic Keep-Alive (Heartbeat)

`TransportSession` includes a built-in background keepalive loop whenever `options.KeepAliveIntervalMillis > 0` (`KeepAliveTimeoutMillis = 5000`, `KeepAliveMissThreshold = 3`):

```csharp
TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57206,
    KeepAliveIntervalMillis = 15_000, // Probe every 15 seconds automatically
    KeepAliveTimeoutMillis = 5_000,   // Wait up to 5 seconds for PONG
    KeepAliveMissThreshold = 3        // Fault & trigger ReconnectSupervisor after 3 missed PONGs
};
```

If you prefer to run a custom application-level heartbeat loop manually (with `KeepAliveIntervalMillis = 0`), you can call `session.PingAsync()` on a timer or background task.

## 7. Graceful Cleanup

Always enforce rigorous teardowns if destroying connection lifetimes. This collapses the asynchronous looping structures safely and reclaims memory leases instantly.

```csharp
// Inform sockets to shut down and unmanaged handlers to cease executing
await session.DisconnectAsync();

// Reclaim buffers and class instances
session.Dispose();
```

## Related Information Paths

- [Low-Level Advanced APIs](../../concepts/internals/low-level-session-apis.md)
- [SDK Overview](../../api/sdk/index.md)
- [Transport Session Guidelines](../../api/sdk/transport-session.md)
- [TCP Session Guidelines](../../api/sdk/tcp-session.md)
- [UDP Session Guidelines](../../api/sdk/udp-session.md)
- [Extensive Transport Options Documentation](../../api/options/sdk/transport-options.md)
