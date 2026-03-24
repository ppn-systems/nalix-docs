# 🚀 Installation

Install only the packages you need and keep configuration in `default.ini`.

### 🔧 Client install
Use the SDK when you only need client transport and helpers.

**Responsibilities**
- Add the SDK package.
- Keep shared packet assemblies referenced.

**Key Components**
- `Nalix.SDK`
- `PacketRegistryFactory`

```bash
dotnet add package Nalix.SDK
```

### 🔧 Server install
Add hosting packages when you build a listener or gateway.

**Responsibilities**
- Add networking and framework packages.
- Include logging if you want built-in sinks.

**Key Components**
- `Nalix.Network`
- `Nalix.Framework`
- `Nalix.Logging`
- `Nalix.Common`

```bash
dotnet add package Nalix.Network
dotnet add package Nalix.Framework
dotnet add package Nalix.Logging
dotnet add package Nalix.Common
```

### 🔧 Configure options
Create `default.ini` and place it in the Nalix config directory.

**Responsibilities**
- Define ports and cipher options.
- Align client and server settings.

**Key Components**
- `NetworkSocketOptions`
- `TransportOptions`

```ini
[NetworkSocketOptions]
Port=57206
Backlog=512

[TransportOptions]
ConnectTimeoutMillis=7000
MaxPacketSize=65536
```

### 🔧 Validate options at startup
Run validation before opening sockets.

**Responsibilities**
- Load the options.
- Validate and adjust if needed.

**Key Components**
- `ConfigurationManager`
- `TransportOptions.Validate()`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Validate();
```
