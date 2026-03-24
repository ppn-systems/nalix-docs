# 🧠 Thời gian thực

Kết nối, handshake và trao đổi gói tin.

### 🔧 Kết nối
```csharp
IoTTcpSession client = new();
await client.ConnectAsync("127.0.0.1", 57206);
```

### 🔧 Handshake
```csharp
Handshake handshake = new(0, Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

### 🔧 Handler phản hồi
```csharp
[PacketOpcode(1)]
public ValueTask HandlePing(Handshake packet, IConnection connection)
    => connection.SendAsync(packet);
```
