# 🔌 Hợp đồng dùng chung

Giao diện và attribute cho cả server và client.

### 🔧 Packet & Connection
- `IPacket`
- `IConnection`
- `IPacketRegistry`

### 🔧 Handler
```csharp
[PacketController("HandshakeHandlers")]
public class HandshakeHandlers
{
    [PacketOpcode(1)]
    public ValueTask HandlePing(Handshake packet, IConnection connection)
        => connection.SendAsync(packet);
}
```

### 🔧 Context
- `PacketContext<TPacket>`
- `PacketSender<TPacket>`
