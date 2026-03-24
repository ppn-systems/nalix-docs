# Nalix.Common

Shared contracts, packet metadata, and middleware primitives.

### Core contracts
These contracts keep SDK and server code aligned.

**Responsibilities**
- Define packet and connection contracts.
- Provide handler attributes.

**Key Components**
- `IPacket`
- `IConnection`
- `PacketControllerAttribute`
- `PacketOpcodeAttribute`

### Quick example

```csharp
[PacketController("SamplePingHandlers")]
public class SamplePingHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```

### Metadata and attributes
Metadata is built once and attached to each context.

**Responsibilities**
- Build metadata during handler registration.
- Expose attributes through `PacketContext`.

**Key Components**
- `PacketMetadataBuilder`
- `PacketContext<TPacket>`

### Quick example

```csharp
PacketMetadataProviders.Register(new SampleTenantMetadataProvider());
```

### Middleware primitives
Middleware runs over packet contexts and can short-circuit outbound flows.

**Responsibilities**
- Run inbound/outbound middleware.
- Allow `SkipOutbound` when needed.

**Key Components**
- `IPacketMiddleware<TPacket>`
- `PacketContext<TPacket>`
- `PacketSender<TPacket>`

### Quick example

```csharp
public sealed class SamplePacketMiddleware : IPacketMiddleware<IPacket>
{
    public async Task InvokeAsync(
        PacketContext<IPacket> context,
        Func<CancellationToken, Task> next)
    {
        await next(context.CancellationToken);
    }
}
```

### Shared enums
Enums keep policies consistent across the stack.

**Responsibilities**
- Describe cipher and drop behavior.

**Key Components**
- `CipherSuiteType`
- `DropPolicy`
