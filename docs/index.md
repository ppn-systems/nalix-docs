# Nalix

Nalix is a high-performance real-time server framework for .NET with shared sockets, deterministic middleware, and secure transports.
Every package is scoped so you can compose only the bits your host, client, or tooling needs.

### 🔧 Framework Overview
A deterministic core stitches together configuration, dependency resolution, and networking so every host and SDK client observes the same timing, serialization, and logging policies.

**Responsibilities**
- Keep configuration, randomness, and logging singletons stable through `InstanceManager` and `ConfigurationManager`.
- Provide a thin SDK surface for clients (`IoTTcpSession`, `TcpSession`) that mirrors the production listener stack (`TcpListenerBase`, `AutoXListener`).
- Orchestrate packet dispatch, middleware, and handlers with `PacketDispatchChannel`, `PacketContext`, and `PacketSender` so packets carry metadata, encryption state, and connection context.

**Key Components**
- `InstanceManager` – caches loggers, registries, and schedulers with high-performance pooling.
- `ConfigurationManager` – watches `default.ini`, validates `TransportOptions`, `NetworkSocketOptions`, and other POCOs, and exposes them via `Get<T>()`.
- `PacketRegistryFactory` – scans assemblies and builds a lock-free catalog of `IPacket` deserializers used by both listeners and SDK clients.
- `PacketDispatchChannel` – compiles `[PacketController]` handlers, injects middleware, and streams packets through inbound/outbound/outbound-always stages.
- `IoTTcpSession` / `TcpListenerBase` – share transports, ciphers, and buffer pools so tests and production behave identically.

**Flow**
- Register global services (`ILogger`, `IPacketRegistry`) → build packets with `PacketRegistryFactory.CreateCatalog()` → configure middleware with `PacketDispatchChannel` → start `TcpListenerBase` + `IoTTcpSession`.

!!! tip "Keep registries in sync"
    Instantiate `PacketRegistryFactory` once and register the same catalog with both your listener and client via `InstanceManager.Instance.Register<IPacketRegistry>(packetRegistry)` so handler metadata, op codes, and cipher negotiations align.
