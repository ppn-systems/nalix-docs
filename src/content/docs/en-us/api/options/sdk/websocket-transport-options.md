---
title: WebSocket Transport Options
description: Reference for Nalix.SDK.Options.WebSocketTransportOptions — endpoint path, subprotocol, TLS (wss://), and maximum message size for WebSocketSession.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`WebSocketTransportOptions` (`public sealed partial class WebSocketTransportOptions : ConfigurationLoader, IValidatableConfiguration`) configures WebSocket-specific settings for [WebSocketSession](../../sdk/websocket-session.md) alongside [TransportOptions](./transport-options.md).

## Source Mapping

- `src/Nalix.SDK/Options/WebSocketTransportOptions.cs`
- `src/Nalix.SDK/Transport/WebSocketSession.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`

## Defaults and Validation

Loaded from the `[WebSocketTransport]` section of `default.ini` or passed directly to `new WebSocketSession(transportOptions, webSocketOptions)`:

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `Path` | `string` | `"/ws/"` | — | Relative HTTP Upgrade request path (normalized to start with `/`). |
| `SubProtocol` | `string` | `"nalix.v1"` | — | WebSocket subprotocol added to `ClientWebSocket.Options.AddSubProtocol(...)` when non-whitespace. |
| `UseTls` | `bool` | `false` | — | Selects `wss://{host}:{port}{path}` when `true`, or `ws://{host}:{port}{path}` when `false`. |
| `MaxMessageSize` | `int` | `1_048_576` (`1 MB`) | `[ValueRange(1, int.MaxValue)]` | Maximum inbound WebSocket message size in bytes accepted by `WsFrameReader` before throwing `NetworkException`. |

`Validate()` executes `this.ValidateDataAnnotations()` and throws `ValidationException` if `MaxMessageSize < 1`.

## Usage Example

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport;

TransportOptions transportOptions = new()
{
    Address = "ws.example.com",
    Port = 443,
    ConnectTimeoutMillis = 10_000
};

WebSocketTransportOptions wsOptions = new()
{
    Path = "/ws/",
    SubProtocol = "nalix.v1",
    UseTls = true,
    MaxMessageSize = 1_048_576
};

using WebSocketSession session = new(transportOptions, wsOptions);
```

### INI Configuration (`default.ini`)

```ini
[WebSocketTransport]
Path = /ws/
SubProtocol = nalix.v1
UseTls = false
MaxMessageSize = 1048576
```

## Related APIs

- [WebSocket Session](../../sdk/websocket-session.md)
- [Transport Options](./transport-options.md)
- [WebSocket Hosting Binding (Server)](../../hosting/websocket-binding.md)
