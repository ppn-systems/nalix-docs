# 🧠 Architecture

Nalix separates configuration, packet metadata, dispatch, and transport into clear layers.

### 🧭 High-level layout
Each layer has a single job so shared behavior stays deterministic.

!!! tip "Flow"
    Config → Registry → Dispatch → Middleware → Handlers → Sender.

**Responsibilities**
- Load configuration and logging once.
- Build packet metadata and registry.
- Dispatch packets through middleware and handlers.

**Key Components**
- `ConfigurationManager`
- `InstanceManager`
- `PacketRegistryFactory`
- `PacketDispatchChannel`

```mermaid
flowchart LR
    Config["ConfigurationManager"] --> Registry["PacketRegistryFactory"]
    Registry --> Channel["PacketDispatchChannel"]
    Channel --> Middleware["IPacketMiddleware<IPacket>"]
    Middleware --> Handlers["[PacketController] handlers"]
    Handlers --> Sender["PacketSender"]
```

### ⚙️ Configuration layer
Configuration is loaded once and shared everywhere.

**Responsibilities**
- Read `default.ini`.
- Validate options.

**Key Components**
- `ConfigurationManager`
- `TransportOptions`
- `NetworkSocketOptions`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Validate();
```

### 🧩 Metadata and registry layer
Metadata providers build the catalog used by dispatch and serialization.

**Responsibilities**
- Register metadata providers.
- Build and register the catalog.

**Key Components**
- `PacketMetadataProviders`
- `PacketCustomAttributeProvider`
- `PacketRegistryFactory`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
IPacketRegistry registry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(registry);
```

### 🔁 Dispatch layer
Dispatch is deterministic and middleware-driven.

**Responsibilities**
- Compile handlers once.
- Execute middleware in order.

**Key Components**
- `PacketDispatchChannel`
- `PacketDispatchOptions`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithHandler(() => new HandshakeHandlers());
});
```
