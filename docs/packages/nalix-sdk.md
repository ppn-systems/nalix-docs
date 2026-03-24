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

## Request helpers

`RequestExtensions.RequestAsync<TRequest, TResponse>` combines the subscribe/send/await cycle so you never miss a response. The method registers the predicate before sending, applies timeout+retry semantics, and delegates the race-free wait to `PACKET_AWAITER`.

```csharp
public static System.Threading.Tasks.Task<TResponse> RequestAsync<TRequest, TResponse>(
    this IClientConnection client,
    TRequest request,
    System.Func<TResponse, System.Boolean> predicate,
    System.Int32 timeoutMs = 5000,
    System.Threading.CancellationToken ct = default)
    where TRequest : class, IPacket
    where TResponse : class, IPacket
{
    System.ArgumentNullException.ThrowIfNull(client);
    System.ArgumentNullException.ThrowIfNull(request);
    System.ArgumentNullException.ThrowIfNull(predicate);

    if (!client.IsConnected)
    {
        throw new System.InvalidOperationException("Client is not connected.");
    }

    return PACKET_AWAITER.AwaitAsync(
        client,
        predicate,
        timeoutMs,
        sendAsync: token => client.SendAsync(request, token),
        ct);
}
```

!!! tip
    The snippet above is directly from `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`, so you can follow the source if you need to customize the awaiter or add new overloads.

## Localization

- `Localizer` loads PO catalogs and exposes `Get`, `GetParticular`, `GetPlural`, and `GetParticularPlural` so you can resolve contextualized strings.
- `MultiLocalizer` composes multiple `Localizer` instances to build fallback chains.
- `Formats` helpers parse timestamps, numbers, and enumerations using localized culture settings.

Always register `ILogger` and `IPacketRegistry` before constructing sessions. The SDK resolves those dependencies through `InstanceManager` (see `example/Nalix.SDK.Examples`).
