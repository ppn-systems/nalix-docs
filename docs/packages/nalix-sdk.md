# Nalix.SDK

`Nalix.SDK` packages the client transport stack, localized strings, and helper extensions so SDK consumers mirror the host transports.

### 🔧 SDK responsibilities
Expose a client-focused API, validate transport configuration, and keep logging + packet catalogs centralized.

**Responsibilities**
- Provide `IoTTcpSession` / `TcpSession` as the default client connection that enforces `TransportOptions`.
- Surface helper extensions (`ControlExtensions`, `RequestExtensions`) to simplify ping, request-response, and race-free awaits.
- Keep localization (`Localizer`, `MultiLocalizer`, `Formats`) in sync across clients and servers.

**Key Components**
- `IoTTcpSession` / `TcpSession` – implement `IClientConnection`, validate `TransportOptions`, and manage reconnect/heartbeat loops.
- `TransportOptions` – controls address, port, buffer size, compression, `CipherSuiteType`, reconnection delays, and `Csprng` secrets.
- `RequestOptions` – fluent setters (`WithRetry`, `WithTimeout`, `WithEncrypt`) used by `RequestExtensions`.
- `PacketRegistryFactory` – shared catalog builder for SDKs and listeners so metadata and op codes align.
- `ControlExtensions` / `RequestExtensions` – extension methods that simplify common flows.

**Flow**
- Register `ILogger`/`IPacketRegistry` → tune `TransportOptions` via `ConfigurationManager.Instance.Get<TransportOptions>()` → call `IoTTcpSession.ConnectAsync()` → use `ControlExtensions`/`RequestExtensions`.

### 🔧 Request helpers
`RequestExtensions.RequestAsync<TRequest, TResponse>` registers a predicate before writing the packet so the awaiter never races with the response.

**Responsibilities**
- Register listeners (`PACKET_AWAITER`) before sending so replies are caught even when they arrive immediately.
- Retry only when timeouts occur, not on fatal errors.
- Throw early if the client disconnects.

**Key Components**
- `RequestExtensions` – extension methods on `IClientConnection`.
- `PACKET_AWAITER` – shared awaiter that correlates responses via predicates.
- `ControlExtensions` – query helpers such as `PingAsync` and `SynchronizeTimeAsync`.

**Flow**
- Call `RequestAsync` → the method registers your predicate → it sends the request → `PACKET_AWAITER` resolves or times out.

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

!!! tip "Trace the awaiter"
    The snippet above is copied from `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`. Follow that file when you add overloads or adjust predicate matching.

### 🔧 Localization & transports
Localization flows share the same options and clocks as the networking stack.

**Responsibilities**
- Load PO catalogs via `Localizer` and compose fallback chains with `MultiLocalizer`.
- Expose transport configuration via POCOs with validation before sockets start.

**Key Components**
- `Localizer`, `MultiLocalizer`, and `Formats` – textual helpers that parse timestamps or enumerations.
- `TransportOptions.Validate()` – ensures buffer sizes, packet limits, and reconnection delays stay in range.
- `RequestOptions` – builder used by `RequestExtensions` for retries and encryption toggles.
- `Handshake` – `PacketBase` used by SDK examples to prove the client and listener share the same secret.

**Flow**
- Customize PO files / config → call `Localizer.Get()`/`GetPlural()` → validate `TransportOptions` → reuse same catalog with the listener.
