# 🔌 Shared Contracts

Interfaces and attributes that both listener and SDK rely on.

### 📦 Packets and connections
Common interfaces define how packets and connections behave.

**Responsibilities**
- Represent packets with opcodes and headers.
- Expose connection metadata and send APIs.

**Key Components**
- `IPacket`
- `IConnection`
- `IPacketRegistry`

```csharp
IPacketRegistry catalog = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register(catalog);
```

### 🧭 Handler discovery
Attributes mark controller classes and opcode methods.

**Responsibilities**
- Annotate controllers.
- Annotate opcode handlers.

**Key Components**
- `PacketControllerAttribute`
- `PacketOpcodeAttribute`

```csharp
[PacketController("HandshakeHandlers")]
public class HandshakeHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```

### 🛠️ Context and sender
Packet contexts carry metadata through middleware and handlers.

**Responsibilities**
- Initialize contexts with packet, connection, and metadata.
- Use `PacketSender` for replies.

**Key Components**
- `PacketContext<TPacket>`
- `PacketSender<TPacket>`

```csharp
PacketContext<IPacket> context = new();
context.Initialize(packet, connection, metadata);
```

### 🧠 Metadata providers
Providers enrich metadata for middleware and handlers.

**Responsibilities**
- Register providers before activation.
- Expose custom attributes.

**Key Components**
- `PacketMetadataProviders`
- `PacketCustomAttributeProvider`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```
