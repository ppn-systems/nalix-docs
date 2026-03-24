# Nalix.SDK

`Nalix.SDK` is the developer-facing kit that configures logging, localization, dependency injection, and the client-side transport stack. It wires global singletons through `InstanceManager`, exposes `ControlExtensions`/`RequestExtensions` for request-response flows, and surfaces `TransportOptions`/`RequestOptions` builders so clients can tune reconnection, encryption, and retries.

## Highlights

- `IoTTcpSession` inherits from `TcpSessionBase` and is the default client implementation: it validates `TransportOptions`, serializes packets with pooling, tracks bytes sent/received, and auto-reconnects while serializing `ConnectAsync` calls with `_connectLock`.
- `ControlExtensions` adds helpers for `PING`/`PONG`, fluent control frame builders, and `AwaitPacketAsync<TPkt>` so you can send a control and wait for a matching reply safely.
- `RequestExtensions.RequestAsync<TRequest, TResponse>` guarantees no race conditions by registering `PACKET_AWAITER` before sending and only retries on timeouts.
- `TransportOptions` and `RequestOptions` are validated (e.g., `TransportOptions.Validate` enforces buffer sizes) and supply fluent setters (`WithRetry`, `WithEncrypt`).
- Localization support via `Localizer`, `MultiLocalizer`, and PO file parsers keeps user-facing text consistent across clients and servers.

## Client example

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry packetRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(packetRegistry);

IoTTcpSession client = new();
await client.ConnectAsync("127.0.0.1", 12345);
Handshake handshake = new(opCode: 0, secret: Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

This example mirrors `example/Nalix.SDK.Examples`: normalize the registry, register the logger, then use the SDK transports to open a socket and send a serialized `Handshake` frame.

## Localization

- `Localizer` loads PO catalogs and exposes `Get`, `GetParticular`, `GetPlural`, and `GetParticularPlural` so you can resolve contextualized strings.
- `MultiLocalizer` composes multiple `Localizer` instances to build fallback chains.
- `Formats` helpers parse timestamps, numbers, and enumerations using localized culture settings.

Always register `ILogger` and `IPacketRegistry` before constructing sessions. The SDK resolves those dependencies through `InstanceManager` (see `example/Nalix.SDK.Examples`).
