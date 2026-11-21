---
title: Client Sessions
description: "This guide walks through creating, configuring, and connecting a client session using Nalix.SDK. It focuses on the actual SDK surface in the current source tree: TransportOption..."
section: Guides
---

This guide walks through creating, configuring, and connecting a client session using `Nalix.SDK`. It focuses on the actual SDK surface in the current source tree: `TransportOptions`, `TcpSession`, `DatagramSession`, and the transport extension methods built on top of them.

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
    BufferSize = 65536        // Socket send/receive buffer size (default 64 KB)
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

## 4. Create and Connect a Datagram (UDP) Session (Auxiliary Channel)

:::note[TCP is Primary, UDP is Auxiliary]
In the Nalix architecture, **TCP (or WebSocket) is typically the primary, stateful connection**. The `DatagramSession` acts as an auxiliary channel for high-frequency data (NDP over UDP). It is created from an established stream session whose handshake is complete, and it derives its own keys from that session's secret.
:::

`DatagramSession` takes the stream session in its constructor. `ConnectAsync()` requests a ticket over that stream session, opens the UDP socket and waits until the server has authenticated the first datagram; the host defaults to the stream session's address and the port to the one in the ticket.

```csharp
using System;
using System.Threading.Tasks;
using Nalix.Abstractions.Networking.Datagrams;
using Nalix.SDK.Transport;

async Task ConnectDatagramAsync(TcpSession tcpSession)
{
    // The TCP session must have completed HandshakeAsync() first.
    using DatagramSession udp = new(tcpSession);

    udp.OnConnected += (_, _) => Console.WriteLine("Datagram session established.");
    udp.OnDisconnected += (_, ex) => Console.WriteLine($"Datagram Disconnected: {ex?.Message}");
    udp.OnError += (_, ex) => Console.WriteLine($"Datagram Error: {ex.Message}");

    await udp.ConnectAsync();

    // Every datagram is sealed with ChaCha20-Poly1305 by the session itself.
    // await udp.SendAsync(new PlayerMovementPacket { X = 1, Y = 2, Z = 5 });
    // await udp.SendAsync(packet, DeliveryMethod.ReliableOrdered, channel: 0);

    await Task.Delay(-1);
}
```

:::danger[Datagram Size]
A single datagram is at most `DatagramEngine.MaxDatagramSize` (`1472` bytes). Larger messages are fragmented by the engine up to the ticket's `MaxMessageSize` (server default `1048576`). A refused ticket or a session that is not established before the ticket expires surfaces as a `NetworkException`.
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
- [UDP Session Guidelines](../../api/sdk/datagram-session.md)
- [Extensive Transport Options Documentation](../../api/options/sdk/transport-options.md)
