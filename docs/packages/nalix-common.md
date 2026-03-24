# 📦 Nalix.Common

Shared contracts, packet metadata, and middleware primitives.

### 🧭 Core contracts
These contracts keep SDK and server code aligned.

**Responsibilities**
- Define packet and connection contracts.
- Provide handler attributes.

**Key Components**
- `IPacket`
- `IConnection`
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

### 🧩 Metadata and attributes
Metadata is built once and attached to each context.

**Responsibilities**
- Build metadata during handler registration.
- Expose attributes through `PacketContext`.

**Key Components**
- `PacketMetadataBuilder`
- `PacketContext<TPacket>`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```

### 🛠️ Middleware primitives
Middleware runs over packet contexts and can short-circuit outbound flows.

**Responsibilities**
- Run inbound/outbound middleware.
- Allow `SkipOutbound` when needed.

**Key Components**
- `IPacketMiddleware<TPacket>`
- `PacketContext<TPacket>`
- `PacketSender<TPacket>`

```csharp
public class CustomMiddleware : IPacketMiddleware<IPacket>
{
    public async ValueTask HandleAsync(
        PacketContext<IPacket> context,
        Func<CancellationToken, ValueTask> next)
    {
        await next(context.CancellationToken);
    }
}
```

### 🔐 Shared enums
Enums keep policies consistent across the stack.

**Responsibilities**
- Describe cipher and drop behavior.

**Key Components**
- `CipherSuiteType`
- `DropPolicy`
