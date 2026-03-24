# 🚀 Getting Started

Nalix assumes a deterministic host and client stack that share logging, configuration, and packet metadata.
Follow these steps to prove out a connection before you layer in middleware or business logic.

### 🔧 Prepare the environment
Verify that the machine runs .NET 8 SDK or later and that `default.ini` exists so `ConfigurationManager` can load `TransportOptions`, `NetworkSocketOptions`, `TaskManagerOptions`, and `NLogixOptions`.

**Responsibilities**
- Make the configuration directory readable (`%ProgramData%\Nalix\config\default.ini` on Windows, `$XDG_DATA_HOME/Nalix/config/default.ini` or `~/.local/share/Nalix/config/default.ini` on Linux).
- Confirm your firewall and container network allow the listener port configured in `NetworkSocketOptions.Port`.
- Ensure a shared packet registry is available so both SDK clients and listeners agree on op codes and ciphers.

**Key Components**
- `ConfigurationManager` – binds `default.ini`, watches for updates, debounces events, and exposes every options POCO.
- `TransportOptions` / `NetworkSocketOptions` – surface retry, heartbeat, cipher, and buffer defaults that `TcpSessionBase` and `TcpListenerBase` read at startup.
- `TaskManagerOptions` – drives worker cleanup and dynamic concurrency for listeners and dispatchers.

**Flow**
- Install the .NET 8 SDK → copy the default configuration into the right data dir → confirm `default.ini` values before booting the SDK or listener.

!!! note "Default configuration paths"
    Windows: `C:\ProgramData\Nalix\config\default.ini`
    Linux: `~/.local/share/Nalix/config/default.ini` (set `XDG_DATA_HOME` if you need a custom base path).

### 🔧 Install the SDK
Add `Nalix.SDK` so you can build clients, register packets, and reuse the same transports as the listener without bringing in the entire host stack.

**Responsibilities**
- Bring in the SDK transport stack and localization helpers.
- Keep logging, diagnostics, and packet catalogs centralized so both sides read the same metadata.
- Keep the SDK light by referencing additional packages (`Nalix.Network`, `Nalix.Logging`, `Nalix.Common`, `Nalix.Framework`) only when you need them.

**Key Components**
- `Nalix.SDK` – exposes `IoTTcpSession`, `TcpSession`, `TransportOptions`, `RequestOptions`, `RequestExtensions`, and `ControlExtensions`.
- `Nalix.Logging` – `NLogix`, `NLogix.Host`, and `NLogixOptions` for structured logging.
- `Nalix.Shared` – `PacketRegistry`, `PacketRegistryFactory`, and `Handshake` frames shared between client and server.

**Flow**
- Run `dotnet add package Nalix.SDK` → restore → confirm `Nalix.Shared` assets are available to your project.

### 🔧 Bootstrap shared services
Register logging and packet metadata once and reuse the same catalog on both ends of the wire before you open sockets.

**Responsibilities**
- Register `ILogger` and `IPacketRegistry` in `InstanceManager` so transports, middleware, and background tasks all resolve the same instances.
- Tune `TransportOptions` from `ConfigurationManager.Instance.Get<TransportOptions>()` before calling `ConnectAsync`.
- Connect `IoTTcpSession`, send a `Handshake`, and keep the same `CipherSuiteType` as your listener.

**Key Components**
- `InstanceManager` – singleton cache that throws if `ILogger` or `IPacketRegistry` are missing while constructing dispatchers or listeners.
- `PacketRegistryFactory` – compilation state for every `IPacket` type you plan to serialize/deserialize.
- `IoTTcpSession` – validates `TransportOptions`, drives heartbeats, and exposes `OnMessageReceived`, `OnDisconnected`, and `OnReconnected`.
- `Handshake` / `Csprng` – fixed `Packet` that proves both ends share the same secret.

**Flow**
- Register `ILogger` → register `IPacketRegistry` → fetch `TransportOptions` → call `IoTTcpSession.ConnectAsync()` → send `Handshake`.

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry packetRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(packetRegistry);

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 12345;
options.Secret = Csprng.GetBytes(32);

IoTTcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);

Handshake handshake = new(opCode: 0, data: options.Secret);
await client.SendAsync(handshake.Serialize());
```

!!! warning "Register logger and registry first"
    `PacketDispatchChannel` throws `InvalidOperationException` if `IPacketRegistry` is not registered in `InstanceManager`, and listeners assume `ILogger` exists before `TcpListenerBase.Activate()` runs.

!!! note "Tune `TransportOptions` before connecting"
    Call `TransportOptions.Validate()` (triggered automatically when `IoTTcpSession` initializes) whenever you change `BufferSize`, `MaxPacketSize`, or cipher settings so you avoid `ValidationException` at connect time.
