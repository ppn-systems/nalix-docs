# Nalix.SDK API Overview

`Nalix.SDK` is the client transport layer for Nalix-based TCP applications. The current source tree centers on reliable TCP sessions plus helper extensions for control packets, requests, directives, and handshakes.

## Source mapping

- `src/Nalix.SDK/Transport/TcpSessionBase.cs`
- `src/Nalix.SDK/Transport/TcpSession.cs`
- `src/Nalix.SDK/Transport/IoTTcpSession.cs`
- `src/Nalix.SDK/Configuration/TransportOptions.cs`
- `src/Nalix.SDK/Configuration/RequestOptions.cs`
- `src/Nalix.SDK/Transport/Extensions/ControlExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/HandshakeExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/DirectiveClientExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/TcpSessionSubscriptions.cs`

## Module summary

| Component | Description |
| --- | --- |
| `TcpSessionBase`, `TcpSession`, `IoTTcpSession` | Shared TCP transport base plus two client implementations. |
| `TransportOptions` | Client transport configuration loaded through `ConfigurationManager`. |
| `RequestOptions` | Timeout, retry, and encryption controls for `RequestAsync`. |
| `Transport.Extensions` | Control, directive, handshake, request, and subscription helpers. |
| `L10N` | Optional localization helpers such as `Localizer` and `MultiLocalizer`. |

## Quick start

Checklist:

- register an `IPacketRegistry`
- load or construct `TransportOptions`
- create `TcpSession` or `IoTTcpSession`
- hook events you need
- connect, send, await responses, disconnect

```csharp
InstanceManager.Instance.Register<IPacketRegistry>(catalog);

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();

var client = new TcpSession();
client.OnConnected += (_, _) => { };
client.OnDisconnected += (_, ex) => { };

await client.ConnectAsync(options.Address, options.Port);
await client.SendAsync(myPacket);
await client.DisconnectAsync();
client.Dispose();
```

## What changed in the current runtime

Compared with older docs/examples, the current SDK shape is:

- TCP-focused in the public source tree
- reconnect-aware through `TransportOptions`
- request-safe through `PACKET_AWAITER`-backed helpers
- able to perform handshake and directive flows without hand-written boilerplate

Use the detail pages next:

- [TCP Session](./tcp-session.md)
- [TCP Session Extensions](./tcp-session-extensions.md)

## Related APIs

- [TCP Session](./tcp-session.md)
- [TCP Session Extensions](./tcp-session-extensions.md)
- [Subscriptions](./subscriptions.md)
- [Transport Options](./transport-options.md)
- [Request Options](./request-options.md)
