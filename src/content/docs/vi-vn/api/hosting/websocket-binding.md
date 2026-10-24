---
title: Ràng buộc WebSocket Hosting
description: Tham chiếu API cho MapWebSocket<TProtocol>() và IWebSocketBindingBuilder trong Nalix.Hosting — host các endpoint WebSocket nhị phân và các route HTTP GET/POST nhẹ.
section: API Reference
package: Nalix.Hosting
---

**Không gian tên:** `Nalix.Hosting`  
**Assembly:** `Nalix.Hosting`

`MapWebSocket<TProtocol>()` và `IWebSocketBindingBuilder` gắn một listener WebSocket nhị phân (`WebSocketServerListener`, kế thừa từ `WebSocketListenerBase`) vào host `NetworkApplication` cùng các binding TCP và UDP, đồng thời cho phép ánh xạ các route HTTP `GET` và `POST` nhẹ với bộ đệm đơn trên cùng cổng.

## Ánh xạ mã nguồn

- `src/Nalix.Hosting/INetworkApplicationBuilder.cs`
- `src/Nalix.Hosting/IWebSocketBindingBuilder.cs`
- `src/Nalix.Hosting/Internal/WebSocketBindingBuilder.cs`
- `src/Nalix.Hosting/Internal/WebSocketServerListener.cs`
- `src/Nalix.Network/Listeners/WebListener/WebSocketListener.Core.cs`
- `src/Nalix.Network/Options/NetworkWebSocketOptions.cs`

## Tham chiếu API

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

:::note[Ghi chú về phương thức đã lỗi thời]
`ListenWebSocket<TProtocol>()` được đánh dấu `[Obsolete("Use MapWebSocket<TProtocol>() instead.")]`. Trong ứng dụng mới, luôn dùng `MapWebSocket<TProtocol>()`.
:::

### Interface `IWebSocketBindingBuilder`

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

### Tham chiếu phương thức

| Phương thức | Mô tả |
| :--- | :--- |
| `OnPort(ushort port)` | Ghi đè `NetworkWebSocketOptions.Port` (mặc định `57207`) cho binding listener WebSocket này. |
| `WithPath(string path)` | Ghi đè `NetworkWebSocketOptions.Path` (mặc định `"/ws/"`) cho các yêu cầu nâng cấp WebSocket (ví dụ `"/realtime"`). |
| `WithFactory(Func<IPacketDispatch, IProtocol>)` | Cung cấp delegate factory tùy chỉnh để tạo instance `IProtocol`. |
| `MapGet(string path, HttpRouteHandler handler)` | Ánh xạ một route HTTP `GET` với bộ đệm đơn trên cổng listener WebSocket (cũng có thể ghi đè các endpoint DevOps tích hợp sẵn như `/healthz`, `/version`, hoặc `/metrics`). |
| `MapPost(string path, HttpRouteHandler handler)` | Ánh xạ một route HTTP `POST` với bộ đệm đơn trên cổng listener WebSocket (ví dụ `/webhook`). |
| `Bind()` | Hoàn tất binding WebSocket và trả về `INetworkApplicationBuilder` cha. |

## Ví dụ sử dụng

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

## API liên quan

- [Ứng dụng mạng](./network-application.md)
- [Tùy chọn mạng (NetworkWebSocketOptions & ForwardedHeadersOptions)](../options/network/options.md)
- [WebSocket Session (Client SDK)](../sdk/websocket-session.md)
- [Tùy chọn transport WebSocket (Client SDK)](../options/sdk/websocket-transport-options.md)
