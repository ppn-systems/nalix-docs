---
title: WebSocket Hosting Binding
description: API reference for MapWebSocket<TProtocol>() and IWebSocketBindingBuilder in Nalix.Hosting — hosting binary WebSocket endpoints and lightweight HTTP GET/POST routes.
section: API Reference
package: Nalix.Hosting
---

**Namespace:** `Nalix.Hosting`  
**Assembly:** `Nalix.Hosting`

`MapWebSocket<TProtocol>()` and `IWebSocketBindingBuilder` attach a binary WebSocket listener (`WebSocketServerListener`, inheriting from `WebSocketListenerBase`) to a `NetworkApplication` host alongside TCP and UDP bindings, and allow mapping lightweight single-buffer HTTP `GET` and `POST` routes on the same port.

## Source Mapping

- `src/Nalix.Hosting/INetworkApplicationBuilder.cs`
- `src/Nalix.Hosting/IWebSocketBindingBuilder.cs`
- `src/Nalix.Hosting/Internal/WebSocketBindingBuilder.cs`
- `src/Nalix.Hosting/Internal/WebSocketServerListener.cs`
- `src/Nalix.Network/Listeners/WebListener/WebSocketListener.Core.cs`
- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## API Reference

### `INetworkApplicationBuilder.MapWebSocket<TProtocol>()`

```csharp
namespace Nalix.Hosting;

public interface INetworkApplicationBuilder
{
    IWebSocketBindingBuilder MapWebSocket<
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)] TProtocol>()
        where TProtocol : class, IProtocol;
}
```

:::note[Obsolete Method Note]
`ListenWebSocket<TProtocol>()` is marked `[Obsolete("Use MapWebSocket<TProtocol>() instead.")]`. Always use `MapWebSocket<TProtocol>()` in new applications.
:::

### `IWebSocketBindingBuilder` Interface

```csharp
using System;
using Nalix.Abstractions.Networking;
using Nalix.Network.Listeners.Web;
using Nalix.Runtime.Dispatching;

namespace Nalix.Hosting;

public interface IWebSocketBindingBuilder
{
    IWebSocketBindingBuilder OnPort(ushort port);
    IWebSocketBindingBuilder WithPath(string path);
    IWebSocketBindingBuilder WithFactory(Func<IPacketDispatch, IProtocol> factory);
    IWebSocketBindingBuilder MapGet(string path, HttpRouteHandler handler);
    IWebSocketBindingBuilder MapPost(string path, HttpRouteHandler handler);
    INetworkApplicationBuilder Bind();
}
```

### Method Reference

| Method | Description |
| :--- | :--- |
| `OnPort(ushort port)` | Overrides `NetworkWebSocketOptions.Port` (default `57207`) for this WebSocket listener binding. |
| `WithPath(string path)` | Overrides `NetworkWebSocketOptions.Path` (default `"/ws/"`) for WebSocket upgrade requests (e.g., `"/realtime"`). |
| `WithFactory(Func<IPacketDispatch, IProtocol>)` | Supplies a custom factory delegate to construct the `IProtocol` instance. |
| `MapGet(string path, HttpRouteHandler handler)` | Maps a single-buffer HTTP `GET` route on the WebSocket listener port (can also override built-in DevOps endpoints such as `/healthz`, `/version`, or `/metrics`). |
| `MapPost(string path, HttpRouteHandler handler)` | Maps a single-buffer HTTP `POST` route on the WebSocket listener port (e.g., `/webhook`). |
| `Bind()` | Finalizes the WebSocket binding and returns the parent `INetworkApplicationBuilder`. |

## Usage Example

```csharp
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Nalix.Hosting;
using Nalix.Hosting.Protocols;
using Nalix.Network.Options;

public static class Program
{
    public static async Task Main(string[] args)
    {
        using ILoggerFactory loggerFactory = LoggerFactory.Create(b => b.AddConsole());
        ILogger logger = loggerFactory.CreateLogger("NalixWebSocketServer");

        await using NetworkApplication app = NetworkApplication.CreateBuilder()
            .UseLogger(logger)
            .Configure<NetworkWebSocketOptions>(options =>
            {
                options.Port = 57207;
                options.Path = "/ws/";
                options.SubProtocol = "nalix.v1";
                options.EnableHealthEndpoint = true;
                options.EnableMetricsEndpoint = true;
            })
            .UseSecureConnections()
            .MapHandlers<ChatController>()
            .MapWebSocket<DefaultProtocol>()
                .OnPort(57207)
                .WithPath("/ws/")
                .MapGet("/status", static ctx =>
                {
                    ctx.WriteJson(200, "{\"status\":\"online\"}");
                })
                .Bind()
            .Build();

        await app.RunAsync();
    }
}
```

## Related APIs

- [Network Application](./network-application.md)
- [Network Options (NetworkWebSocketOptions & ForwardedHeadersOptions)](../options/network/options.md)
- [WebSocket Session (Client SDK)](../sdk/websocket-session.md)
- [WebSocket Transport Options (Client SDK)](../options/sdk/websocket-transport-options.md)
