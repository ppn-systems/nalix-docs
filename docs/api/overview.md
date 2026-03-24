# 🔌 API Overview

## Server surface

- `TcpListenerBase` sets up accept loops, configures `NetworkSocketOptions`, and hands each `IConnection` to an `IProtocol` implementation such as `AutoXProtocol`.
- `IProtocol` exposes hooks (`OnAccept`, `ProcessMessage`, `PostProcessMessage`, `ValidateConnection`) so you can plug custom validation, authorization, and dispatch.
- `PacketDispatchChannel` builds `PacketContext<IPacket>` objects, runs registered `IPacketMiddleware<TPacket>`, and resolves `[PacketController]` handlers via `PacketMetadataProviders`.
- `PacketDispatcherBase`, `PacketContext`, and `PacketSender` work together to retry, log, and respond to packets with the correct `CipherSuiteType` and `PermissionLevel`.

## Client surface

- `TcpSessionBase`/`IoTTcpSession` expose `ConnectAsync`, `SendAsync`, `OnMessageReceived`, `OnDisconnected`, and `OnReconnected` events; they rely on `TransportOptions` for heartbeats, reconnection, and ciphers.
- `RequestExtensions.RequestAsync<TRequest, TResponse>` sends a request packet and awaits a matching response, while `ControlExtensions.PingAsync` measures RTT and keeps clocks synchronized via `Clock.SynchronizeTime`.
- `TransportOptions` configures buffer sizes, compression flags, and encryption; `RequestOptions` adds fluent `WithTimeout`, `WithRetry`, and `WithEncrypt` helpers.

## Core contracts

- `IConnection` defines IDs, ping time, bytes transferred, secrets, and permission levels. `ConnectionHub` keeps sharded dictionaries for fast lookup and exposes `Statistics`.
- `IPacketMiddleware<TPacket>` and `MiddlewarePipeline<TPacket>` power both client and server middleware stages (inbound/outbound/outbound-always).
- `IConnectionHub`, `IListener`, `IProtocol`, and `INetworkEndpoint` connect the listener, dispatcher, and connection implementations so you can test each tier independently.
