---
title: WebSocket Session
description: Reference for Nalix.SDK.Transport.WebSocketSession — client-side binary WebSocket transport session supporting ws:// and wss://, subprotocol negotiation, and Blazor WASM compatibility.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport`  
**Assembly:** `Nalix.SDK`

`WebSocketSession` (`public class WebSocketSession : TransportSession`) is the client-side binary WebSocket transport in `Nalix.SDK`, built on `ClientWebSocket`, `WsFrameSender`, and `WsFrameReader`. Unlike `TcpSession` and `UdpSession`, `WebSocketSession` is supported on browser/Blazor WASM targets (`SendAsync`) as well as desktop/mobile runtimes.

## Source Mapping

- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameSender.cs`
- `src/Nalix.SDK/Options/WebSocketTransportOptions.cs`

## Public API Reference

```csharp
namespace Nalix.SDK.Transport;

public class WebSocketSession : TransportSession
{
    public WebSocketSession(
        TransportOptions options,
        WebSocketTransportOptions? webSocketOptions = null,
        SessionState? state = null);

    public override TransportOptions Options { get; }
    public WebSocketTransportOptions WebSocketOptions { get; }
    public override bool IsConnected { get; }

    public override event EventHandler? OnConnected;
    public override event EventHandler<Exception>? OnDisconnected;
    public override event EventHandler<IBufferLease>? OnMessageReceived;
    public override event EventHandler<Exception>? OnError;
    public event Func<ReadOnlyMemory<byte>, Task>? OnMessageAsync;

    public override Task ConnectAsync(string? host = null, ushort? port = null, CancellationToken ct = default);
    public override Task DisconnectAsync();

    [UnsupportedOSPlatform("browser")]
    public void Send(ReadOnlySpan<byte> data, bool encrypt = true);

    public override Task SendAsync(IPacket packet, CancellationToken ct = default);
    public override Task SendAsync(IPacket packet, bool? encrypt = null, CancellationToken ct = default);
    public override Task SendAsync(ReadOnlyMemory<byte> payload, bool? encrypt = null, CancellationToken ct = default);
    public override void ResetSequenceCounters();
}
```

### Key Details

- **URI Construction & Subprotocol**: `ConnectAsync` builds `ws://{host}:{port}{path}` (or `wss://` when `WebSocketOptions.UseTls == true`), normalizes `WebSocketOptions.Path` (default `"/ws/"`), and registers `WebSocketOptions.SubProtocol` (default `"nalix.v1"`).
- **WASM-Safe Receive Loop**: `ConnectAsync` starts `_reader.ReceiveLoopAsync` directly as an async task rather than `TaskCreationOptions.LongRunning`, avoiding thread-pool deadlocks on single-threaded Blazor WebAssembly runtimes.
- **Full Handshake & Extension Compatibility**: Because `WebSocketSession` implements `ITransportSession`, all SDK extensions (`HandshakeAsync`, `ResumeSessionAsync`, `RequestAsync`, `TryRequestAsync`, `StreamAsync`, `CreateRpcClient<T>`) work identically over WebSocket.

## Usage Example

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;

TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57207,
    ConnectTimeoutMillis = 5_000
};

WebSocketTransportOptions wsOptions = new()
{
    Path = "/ws/",
    SubProtocol = "nalix.v1",
    UseTls = false
};

using WebSocketSession session = new(options, wsOptions);

session.OnConnected += (_, _) => Console.WriteLine("WebSocket connected.");
session.OnDisconnected += (_, ex) => Console.WriteLine($"Disconnected: {ex.Message}");

await session.ConnectAsync();
await session.HandshakeAsync();

ChatResponse reply = await session.RequestAsync<ChatResponse>(
    new ChatRequest { Text = "Hello over WebSocket!" },
    RequestOptions.Default.WithEncrypt());

await session.DisconnectAsync();
```

## Related APIs

- [Transport Session](./transport-session.md)
- [WebSocket Transport Options](../options/sdk/websocket-transport-options.md)
- [WebSocket Hosting Binding (Server)](../hosting/websocket-binding.md)
- [TCP Session](./tcp-session.md)
