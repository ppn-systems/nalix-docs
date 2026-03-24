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
    **Windows**  
    `C:\ProgramData\Nalix\config\default.ini`  

    **Linux / macOS**  
    `~/.local/share/Nalix/config/default.ini`

    **Docker / Container**  
    `/config/default.ini`

!!! info "Container behavior"
    When running inside a container, Nalix automatically uses:

    - `/config` for configuration  
    - `/data` for application data  
    - `/logs` for logs  

    unless overridden via environment variables.

!!! tip "Override via environment variables"
    You can override paths using:

    ```bash
    NALIX_CONFIG_PATH=/config
    NALIX_DATA_PATH=/data
    NALIX_LOGS_PATH=/logs
    NALIX_STORAGE_PATH=/storage
    NALIX_DB_PATH=/db
    ```

---

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


### 🐳 Example: Docker Compose

Run Nalix with mounted config and persistent storage.

```yaml
services:
  nalix:
    image: your-image
    ports:
      - "57206:57206"
    volumes:
      - ./config:/config
      - ./data:/data
      - ./logs:/logs
    environment:
      - NALIX_CONFIG_PATH=/config
      - NALIX_DATA_PATH=/data
      - NALIX_LOGS_PATH=/logs
```