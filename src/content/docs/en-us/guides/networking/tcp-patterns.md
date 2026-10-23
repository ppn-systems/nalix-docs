---
title: TCP Patterns Guide
description: "This manual flow demonstrates:"
section: Guides
---

:::danger[Low-Level Implementation]
This guide demonstrates the manual instantiation of `TcpListenerBase` and `Protocol`. While powerful, this path bypasses the automatic feature discovery and dependency injection provided by the [Hosting Builder](../../quickstart.md).
Use this only when embedding Nalix into existing engines or when building specialized transport layers.
:::

This manual flow demonstrates:

- `TcpListenerBase`
- `Protocol`
- `PacketDispatchChannel`
- a request packet
- a response returned from a handler

The goal is clarity, not production completeness.

Use it when you want one canonical TCP sample before adding middleware, metadata, or more complex client behavior.

## Scenario

Client sends a `Control` packet.

Server replies with a `Control` packet.

## Choosing Your Initialization Strategy

Before starting, you must decide how to initialize your server. Nalix provides two distinct paths:

### 1. High-Level Hosting Builder (Recommended)

Use `NetworkApplication.CreateBuilder()` to bootstrap your server.

- **When to use**: 99% of production applications.
- **Benefits**: Automatic handler discovery, Dependency Injection, built-in logging, easier middleware configuration, and support for multi-protocol listeners in a single application.

### 2. Direct Transport Listener

Manually instantiate `TcpListenerBase` and `Protocol` (as shown in the example below).

- **When to use**: Building specialized transport libraries, low-level testing, or embedding Nalix into a non-standard server architecture.
- **Benefits**: Absolute control over the listener lifecycle; zero overhead from the hosting layer.

---

## Server setup (Direct Transport Path)

### 1. Register shared services

```csharp
InstanceManager.Instance.Register<ILogger>(logger);
```

### 2. Create handler

```csharp
[PacketController("SamplePingHandlers")]
public sealed class SamplePingHandlers
{
    [PacketOpcode(0x1001)]
    public ValueTask<Control> HandleAsync(IPacketContext<Control> context)
    {
        context.Packet.Type = ControlType.PONG;
        return ValueTask.FromResult(context.Packet);
    }
}
```

### 3. Create dispatcher

```csharp
PacketDispatchChannel dispatch = new(options =>
{
    options.WithHandler(() => new SamplePingHandlers());
});

dispatch.Activate();
```

### 4. Create protocol

The `Protocol` class is the glue between the raw listener and your message dispatcher. You must implement `FrameProcessor`, `OpCodeExtractor`, and `ProcessMessage`, and can optionally override lifecycle hooks for custom error handling.

```csharp
public sealed class SampleProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    private readonly ILogger _logger;

    public SampleProtocol(PacketDispatchChannel dispatch, ILogger logger)
    {
        _dispatch = dispatch;
        _logger = logger;
    }

    public override IFrameProcessor FrameProcessor => DefaultFrameProcessor.Instance;
    public override IOpCodeExtractor OpCodeExtractor => DefaultOpCodeExtractor.Instance;

    public override void ProcessMessage(object? sender, IConnectionEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);

    protected override void OnConnectionError(IConnection connection, Exception ex)
    {
        _logger.Error("Transport error on connection {0}", ex, connection.ConnectionId);
    }

    protected override bool ValidateConnection(IConnection connection)
    {
        // Add custom IP blacklisting or state checks here
        return base.ValidateConnection(connection);
    }
}
```

### 5. Start listener

When using the transport layer directly (outside of the Hosting builder), you must ensure that all required services are registered in the `InstanceManager`. This is the manual equivalent of what `src/Nalix.Hosting/NetworkApplicationBuilder.cs` wires for you automatically.

#### Required Dependencies (InstanceManager)

| Service | Type | Role |
| :--- | :--- | :--- |
| `ILogger` | `ILogger` | Structured logging |
| `IConnectionHub` | `IConnectionHub` | Connection tracking and batch operations |
| `IConnectionGuard` | `IConnectionGuard` | Admission rate/quota guard |
| `TaskManager` | `TaskManager` | Background worker management |
| `TimingWheel` | `TimingWheel` | Lightweight timeout scheduling |
| `ObjectPoolManager` | `ObjectPoolManager` | Recyclable buffer/context management |

```csharp
// Setup dependencies
InstanceManager.Instance.Register<ILogger>(logger);
IConnectionHub hub = new ConnectionHub();
IConnectionGuard guard = new ConnectionGuard();
InstanceManager.Instance.Register<IConnectionHub>(hub);
InstanceManager.Instance.Register<IConnectionGuard>(guard);

// Initialize and Activate
SampleTcpListener listener = new(57206, new SampleProtocol(dispatch, logger), hub, guard);
listener.Activate();
```

## Client flow

The client uses the `Nalix.SDK` to send a typed request and cleanly await the response without manual loop management:

```csharp
using Contracts;
using Nalix.SDK.Transport.Extensions;

// Orchestrated request/response in one line
Control response = await session.RequestAsync<Control>(
    new Control { Type = ControlType.PING },
    options: RequestOptions.Default.WithTimeout(3_000)
);

Console.WriteLine(response.Type); // PONG
```

## End-to-end flow

1. Client calls `session.RequestAsync<Control>(...)`, assigning a non-zero `SequenceId`.
2. `TcpListenerBase` accepts the socket, frames the inbound payload, runs `FrameProcessor`, and calls `SampleProtocol.ProcessMessage(...)`.
3. `PacketDispatchChannel` deserializes `Control`, invokes `SamplePingHandlers.HandleAsync`, and sends the returned `Control` (`PONG`) back over the connection.

## Variant: send manually from handler

Instead of returning a response, you can send manually:

```csharp
[PacketOpcode(0x1001)]
public async ValueTask Handle(IPacketContext<Control> context)
{
    await context.Sender.SendAsync(new Control { Type = ControlType.PONG }, context.CancellationToken);
}
```

:::warning[Critical Best Practice]
Always pass `context.CancellationToken` to any `await SendAsync()` or background I/O calls inside your handler. Handler methods must take a single `IPacketContext<TPacket>` parameter (adding a second `CancellationToken` parameter triggers analyzer diagnostic `NAL013`).
:::

Use this style when:

- you want multiple replies
- you need finer control over send timing
- you do not want to rely on return-type handling

## What clients should remember

- returning `Control` is the simplest normal request/response model
- `Protocol.ProcessMessage(...)` is the message-level handoff into dispatch
- `src/Nalix.Network/Protocols/Protocol.PublicMethods.cs` shows that `OnAccept(...)` is where TCP receive starts after `ValidateConnection(...)` passes
- the **Listener** owns the raw frame path before `Protocol` sees a processed message
- `PacketDispatchChannel` owns middleware, deserialization, handler invocation, and result handling
- the same pattern works for custom packet types if you swap `Control` for your own packet contract

## Recommended Next Pages

- [Packet Dispatch](../../api/runtime/routing/packet-dispatch.md) — Dispatch API reference
- [Handler Return Types](../../api/runtime/routing/handler-results.md) — Supported return shapes
- [TCP Listener](../../api/network/tcp-listener.md) — Listener API reference
