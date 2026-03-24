# Nalix

Nalix is a high-performance real-time server framework for .NET.
It keeps server and client stacks aligned so packets, middleware, and ciphers behave the same everywhere.

### 🔧 Framework at a glance
Nalix centers on shared configuration, shared packet catalogs, and a deterministic dispatch pipeline.

**Responsibilities**
- Keep configuration and logging singletons stable through `ConfigurationManager` and `InstanceManager`.
- Build one packet catalog with `PacketRegistryFactory` and reuse it across listeners and clients.
- Route packets through middleware and handlers via `PacketDispatchChannel`.

**Key Components**
- `ConfigurationManager` – loads and validates options from `default.ini`.
- `InstanceManager` – caches shared services like `ILogger` and `IPacketRegistry`.
- `PacketRegistryFactory` – builds the packet catalog used by both listener and SDK.
- `PacketDispatchChannel` – executes middleware and handlers in a fixed order.

**Flow**
- Load options -> register shared services -> build packet catalog -> activate channel + listener.

### 🔧 Shared runtime services
Register services once so every part of the stack uses the same instances.

**Responsibilities**
- Register `ILogger` for consistent logging.
- Register the packet catalog so middleware and handlers resolve metadata.

**Key Components**
- `InstanceManager.Instance.Register<T>()` – service registration.
- `PacketRegistryFactory.CreateCatalog()` – catalog factory.

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```

### 🔧 Packet catalog
The catalog binds op codes to packet types and deserializers.

**Responsibilities**
- Build catalog once.
- Reuse the same catalog in listeners and clients.

**Key Components**
- `PacketRegistryFactory`
- `IPacketRegistry`

```csharp
PacketRegistryFactory factory = new();
IPacketRegistry registry = factory.CreateCatalog();
InstanceManager.Instance.Register(registry);
```

!!! tip "Keep catalogs aligned"
    Always reuse the same catalog instance in both the listener and SDK to keep op codes and metadata consistent.

### 🔧 Dispatch pipeline
The channel compiles handlers and applies middleware to every packet.

**Responsibilities**
- Attach middleware.
- Register handler groups.
- Activate the channel before the listener.

**Key Components**
- `PacketDispatchChannel`
- `PacketDispatchOptions`
- `[PacketController]`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithHandler(() => new HandshakeHandlers());
});

channel.Activate();
```
