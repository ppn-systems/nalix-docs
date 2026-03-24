# 🚀 Getting Started

Start with configuration and shared services before opening any sockets.
This keeps listener and client behavior aligned.

### ✅ Environment checklist

Make sure the runtime and config files exist.

!!! tip "Prep flow"
    1) Verify .NET 10 SDK.  
    2) Drop `default.ini` into the config folder.  
    3) Open ports matching `NetworkSocketOptions.Port`.  
    4) Plan one shared `PacketRegistryFactory` for server + client.

**Responsibilities**

- Install .NET 10 SDK or later.
- Place `default.ini` in the Nalix config directory.
- Align ports with `NetworkSocketOptions.Port`.

**Key Components**

- `ConfigurationManager`
- `NetworkSocketOptions`

!!! note "Default config locations"
    Windows: `C:\ProgramData\Nalix\config\default.ini`  
    Linux: `~/.local/share/Nalix/config/default.ini`

### 📦 Install packages

Add only the packages you need.

**Responsibilities**

- Use `Nalix.SDK` for client-only apps.
- Add server-side packages when hosting a listener.

**Key Components**

- `Nalix.SDK`
- `Nalix.Network`
- `Nalix.Common`
- `Nalix.Logging`
- `Nalix.Framework`

```bash
dotnet add package Nalix.SDK
```

```bash
dotnet add package Nalix.Network
dotnet add package Nalix.Common
dotnet add package Nalix.Logging
dotnet add package Nalix.Framework
```

### ⚙️ Load configuration

Pull validated options before you create sessions.

**Responsibilities**

- Read options from `ConfigurationManager`.
- Validate before changing buffer or cipher settings.

**Key Components**

- `TransportOptions`
- `ConfigurationManager.Instance.Get<T>()`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Validate();
```

### 🛠️ Register shared services

Register the logger and packet catalog once.

**Responsibilities**

- Register `ILogger`.
- Register `IPacketRegistry`.

**Key Components**

- `InstanceManager`
- `PacketRegistryFactory`

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```

### 🤝 Verify a basic handshake

Send a `Handshake` to confirm client and listener agree on secrets.

**Responsibilities**

- Generate a secret.
- Serialize and send `Handshake`.

**Key Components**

- `Handshake`
- `Csprng`
- `TcpSession`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "127.0.0.1";
options.Port = 57206;
options.Secret = Csprng.GetBytes(32);

TcpSession client = new();
await client.ConnectAsync(options.Address, options.Port);
Handshake handshake = new(0, options.Secret);
await client.SendAsync(handshake.Serialize());
```
