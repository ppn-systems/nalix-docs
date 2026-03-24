# Nalix.Network

`Nalix.Network` exposes the server runtime: listeners, connection management, routing, middleware, and protocol hooks. It builds on `Nalix.Common` primitives to accept sockets, policy-check them, and drive `PacketContext` through `PacketDispatchChannel` so your handlers run on a predictable, thread-safe path.

## Highlights

- `TcpListenerBase` configures pools, `NetworkSocketOptions`, connection limits, and a dedicated process channel before passing each `IConnection` to your `Protocol` implementation.
- `PacketDispatchChannel` wires `PacketMetadataProviders`, inbound/outbound middleware, logging, and error handling, producing `PacketContext<IPacket>` that handler methods consume.
- `ConnectionHub` shards active connections, exposes `Statistics`, raises `CapacityLimitReached` events, and publishes `ConnectionUnregistered` so you can free resources.
- `MiddlewarePipeline<TPacket>` runs `IPacketMiddleware` through inbound → handler → outbound → outbound-always stages, with `INetworkBufferMiddleware` for buffer-level instrumentation.
- Routing helpers (`PacketDispatcherBase`, `PacketDispatcherChannel`, `PacketTransmitter`) keep metadata, channel options, and throttling in sync while maintaining the connection lifecycle.

## Listener flow

`TcpListenerBase.ProcessConnection` finalizes accepts by invoking your `IProtocol` and recording diagnostics, which is why every handler runs on a fully-configured `IConnection`.

```csharp
protected void ProcessConnection(IConnection connection)
{
    try
    {
        _protocol.OnAccept(connection, _cancellationToken);
        _metrics.RECORD_ACCEPTED();
        s_logger?.Trace($"[NW.{nameof(TcpListenerBase)}:{nameof(ProcessConnection)}] new={connection?.NetworkEndpoint}");
    }
    catch (System.Exception ex)
    {
        s_logger?.Error($"[NW.{nameof(TcpListenerBase)}:{nameof(ProcessConnection)}] process-error={connection?.NetworkEndpoint}", ex);
        connection.Close();
    }
}
```

!!! tip
    The snippet above is taken verbatim from `src/Nalix.Network/Listeners/TcpListener/TcpListener.Handle.cs`, so you can trace how connections move from sockets into your protocol.

### Server wiring example

```csharp
PacketDispatchChannel channel = new(dispatchOptions =>
{
    dispatchOptions.WithMiddleware(new TimeoutMiddleware());
    dispatchOptions.WithHandler(() => new PingHandlers());
    dispatchOptions.WithLogging(InstanceManager.Instance.GetExistingInstance<ILogger>());
});

AutoXProtocol protocol = new(channel);
AutoXListener listener = new(protocol);

channel.Activate();
listener.Activate();
```

The listener is a lightweight subclass of `TcpListenerBase` (`AutoXListener`) that plugs an `IProtocol` such as `AutoXProtocol`. The protocol registers handlers via `PacketDispatchChannel` and records connections in `ConnectionHub`.

Always register `IPacketRegistry` and `ILogger` before activating channels or listeners to ensure metadata-driven handlers resolve correctly.
