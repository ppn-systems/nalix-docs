---
title: Securing Your Server
description: Nalix encrypts a connection through a handshake, not through configuration you write by hand — turn it on with one call and the framework negotiates a shared key per connection....
section: Guides
---

Nalix encrypts a connection through a handshake, not through configuration you write by hand — turn it on with one call and the framework negotiates a shared key per connection. This shows how to turn on encryption and run TCP, UDP, and WebSocket listeners side by side.

Full source: `samples/SecureMultiTransportHelloWorld`

## What you'll build

A server that requires a secure handshake before it processes any request, listening on TCP, UDP, and WebSocket at once.

## Turn on secure connections

```csharp
// samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server/Program.cs
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseLogger(logger)
    .UseSecureConnections()
    .UseSystemControl()
    .MapHandlers(typeof(HelloHandlers))
    .MapTcp<DefaultProtocol>().OnPort(TcpPort).Bind()
    .MapUdp<DefaultProtocol>().OnPort(UdpPort).Bind()
    .MapWebSocket<DefaultProtocol>().OnPort(WebSocketPort).WithPath("/ws").Bind()
    .Build();

await app.RunAsync(cts.Token);
```

`UseSecureConnections()` sets up the handshake handlers and generates a certificate automatically the first time you run the server, if one doesn't already exist. Every request is rejected until the client completes the handshake.

`UseSecureConnections()` also enables `UseSystemControl()` for you (calling both is harmless): the client's first handshake step — the TOFU `PUBLIC_KEY_REQUEST` answered with `SessionTofu` — is served by the system control handlers. Before this was automatic, forgetting `UseSystemControl()` made unpinned clients time out waiting for `SessionTofu`.

Full source: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server/Program.cs`

:::note[TCP and UDP share a port]
TCP and UDP listen on the same port because the server checks that a UDP packet's source address matches an already-connected TCP client. Using different ports for each doesn't break anything, but sharing one is the tested, recommended setup.
:::

## The client handshakes over TCP first

```csharp
// samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs
SessionState sharedState = new();

using TcpSession tcpSession = new(tcpOptions, sharedState);
await tcpSession.ConnectAsync(Host, TcpPort);

await tcpSession.HandshakeAsync();
Console.WriteLine($"SessionToken : {sharedState.SessionToken}");
Console.WriteLine($"Encryption   : {sharedState.EncryptionEnabled}");

HelloRequestPacket tcpRequest = new();
HelloResponsePacket tcpResponse = await tcpSession.RequestAsync<HelloResponsePacket>(
    tcpRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

`HandshakeAsync()` negotiates a shared secret and issues a session token. `SessionState` holds that token and secret so you can reuse it on a second transport.

Full source: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## UDP reuses the TCP session's identity

```csharp
using UdpSession udpSession = new(udpOptions, sharedState);
await udpSession.ConnectAsync(Host, UdpPort);

HelloRequestPacket udpRequest = new();
HelloResponsePacket udpResponse = await udpSession.RequestAsync<HelloResponsePacket>(
    udpRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

You must complete the TCP handshake before sending anything over UDP. UDP packets are authenticated using the session token and a message authentication code derived from the shared secret negotiated during the TCP handshake — without that handshake, the server has no way to verify a UDP packet came from your session.

Full source: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## WebSocket is independent

```csharp
using WebSocketSession wsSession = new(wsOptions, wsTransportOptions);
await wsSession.ConnectAsync(Host, WebSocketPort);

HelloRequestPacket wsRequest = new();
HelloResponsePacket wsResponse = await wsSession.RequestAsync<HelloResponsePacket>(
    wsRequest,
    RequestOptions.Default.WithTimeout(5_000));
```

WebSocket opens its own connection and does not share the TCP session's token or secret.

Full source: `samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client/Program.cs`

## Restricting who can call a handler

Declare permission, timeout, and rate-limit rules directly on a handler method:

```csharp
[PacketOpcode(0x2001)]
[PacketPermission(PermissionLevel.USER)]
[PacketTimeout(5000)]
[PacketRateLimit(requestsPerSecond: 10)]
public ValueTask<AccountResponse> GetProfile(IPacketContext<ProfileRequest> context)
{
    // Only runs if permission, timeout, and rate limit checks pass
}
```

These are enforced by built-in middleware before your handler body runs — see [Handlers and Middleware](../concepts/handlers-and-middleware.md).

## Require encryption on sensitive handlers

Encryption is opt-in per handler. After the handshake the server still accepts frames that arrive **unencrypted**, and it dispatches them to any handler that does not carry `[PacketEncryption(true)]`. Those plaintext frames also have no sequence number, so the anti-replay check does not apply to them.

Mark every handler that changes state or returns private data:

```csharp
[PacketOpcode(0x2002)]
[PacketEncryption(true)]
[PacketPermission(PermissionLevel.USER)]
public ValueTask<TransferResponse> Transfer(IPacketContext<TransferRequest> context)
{
    // Rejected with FORBIDDEN unless the frame arrived encrypted on the wire
}
```

Whether this matters depends on what sits in front of the server:

| Deployment | Plaintext frames injected by someone on the path |
| :--- | :--- |
| WebSocket or TCP behind TLS (`wss://`, a TLS-terminating proxy) | Not possible: TLS authenticates the whole byte stream |
| Raw TCP without TLS (as in the samples) | Possible for handlers without `[PacketEncryption(true)]` |
| UDP | Possible: TLS never covers UDP, so mark UDP handlers too |

If you do not terminate TLS in front of Nalix, treat `[PacketEncryption(true)]` as required on anything sensitive. See [Reverse Proxy and TLS](./deployment/reverse-proxy-tls.md).

## Run it

```bash
dotnet build samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.sln
```

Terminal 1 — start the server:

```bash
dotnet run --project samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Server
```

Terminal 2 — run the client:

```bash
dotnet run --project samples/SecureMultiTransportHelloWorld/SecureMultiTransportHelloWorld.Client
```

## What you should see

```text
Connected over TCP.
TCP handshake completed. Secure state is ready.
  SessionToken : 822530074371686401
  Encryption   : True
TCP replied: Hello from Nalix!

Sending UDP hello...
UDP replied: Hello from Nalix!
TCP connection is still alive: True

Connecting WebSocket...
WebSocket replied: Hello from Nalix!
```

:::note[Raw TCP WebSocket Listener]
`WebSocketListenerBase` inherits directly from `TcpListenerBase` and performs the RFC 6455 HTTP/1.1 Upgrade handshake over raw TCP sockets (`SocketUpgradeHelper`), so it does **not** use `HttpListener` and requires no administrator privileges on Windows or Linux.
:::

## Next steps

- [Handlers and Middleware](../concepts/handlers-and-middleware.md) — how permission/rate-limit attributes get enforced
- [Production Checklist](./deployment/production-checklist.md) — before you ship
- For the handshake protocol, encryption model, and session resume details: [Security Architecture](../concepts/internals/security-architecture.md) (Internals)
