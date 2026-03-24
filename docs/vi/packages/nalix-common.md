# 📦 Nalix.Common

Hợp đồng chung cho packet, kết nối và metadata.

### 🔧 Hợp đồng
- `IPacket`, `IConnection`
- `PacketControllerAttribute`, `PacketOpcodeAttribute`

### 🔧 Middleware
```csharp
public class CustomMiddleware : IPacketMiddleware<IPacket>
{
    public async ValueTask HandleAsync(PacketContext<IPacket> context, Func<CancellationToken, ValueTask> next)
    {
        await next(context.CancellationToken);
    }
}
```

### 🔧 Enum
- `CipherSuiteType`
- `DropPolicy`
