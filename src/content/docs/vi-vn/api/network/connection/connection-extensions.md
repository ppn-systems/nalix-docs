---
title: Mở rộng kết nối
description: Tham chiếu cho ConnectionExtensions và ConnectionUserExtensions trong Nalix.Runtime.Extensions — gửi gói tin, directive điều khiển, broadcast zero-copy và định tuyến theo nhóm người dùng.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Extensions`  
**Assembly:** `Nalix.Runtime`

`ConnectionExtensions` (`public static partial class ConnectionExtensions`) và `ConnectionUserExtensions` (`public static class ConnectionUserExtensions`) cung cấp các phương thức mở rộng mức cao trên `IConnection`, `IPacketSender`, `IConnectionBroadcaster` và `IConnectionGroupRegistry` để gửi gói tin có kiểu, phát các khung `Directive` của mặt điều khiển, broadcast các khung đã nén sẵn, và định tuyến gói tin theo `UserId`.

## Nguồn mã

- `src/Nalix.Runtime/Extensions/ConnectionExtensions.cs`
- `src/Nalix.Runtime/Extensions/ConnectionExtensions.Broadcast.cs`
- `src/Nalix.Runtime/Extensions/ConnectionUserExtensions.cs`

## 1. Mở rộng kết nối trực tiếp và Directive (`ConnectionExtensions.cs`)

```csharp
namespace Nalix.Runtime.Extensions;

public static partial class ConnectionExtensions
{
    public static IConnectionHub? GetHub(this IConnection connection);

    public static ValueTask SendAsync<TPacket>(
        this IConnection connection,
        TPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken ct = default)
        where TPacket : IPacket;

    public static Task SendAsync(
        this IPacketSender sender,
        ControlType controlType,
        ProtocolReason reason,
        ProtocolAdvice action,
        ControlDirectiveOptions options = default);
}

public readonly record struct ControlDirectiveOptions(
    ControlFlags Flags = ControlFlags.NONE,
    ushort SequenceId = 0,
    uint Arg0 = 0,
    uint Arg1 = 0,
    ushort Arg2 = 0);
```

- **`connection.GetHub()`**: Lấy `IConnectionHub` sở hữu kết nối, được lưu dưới `ConnectionAttributes.OwnerHub` trong `connection.Attributes` (hoặc `null` nếu chưa đăng ký).
- **`connection.SendAsync(packet, transport, enableEncrypt, ct)`**: Tuần tự hóa `packet`, áp dụng nén đi (`CompressionOptions`) và mã hóa (`enableEncrypt`), rồi truyền qua `connection.TCP` (cho `TCP`/`WEBSOCKET`) hoặc `connection.UDP` (ném `InvalidOperationException` nếu `UDP` là `null`).
- **`sender.SendAsync(controlType, reason, action, options)`**: Thuê một `Directive` (`0x0008`) từ pool qua `PacketFactory<Directive>.Acquire()`, khởi tạo với `ControlDirectiveOptions`, và gửi qua `IPacketSender.SendAsync`.

## 2. Mở rộng broadcast gói tin và multicast theo nhóm (`ConnectionExtensions.Broadcast.cs`)

```csharp
public static partial class ConnectionExtensions
{
    public static Task BroadcastAsync(
        this IConnectionBroadcaster hub,
        IPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken cancellationToken = default);

    public static Task MulticastAsync(
        this IConnectionBroadcaster hub,
        IConnectionGroupRegistry groupProvider,
        string groupName,
        IPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken cancellationToken = default);

    public static Task MulticastExceptAsync(
        this IConnectionBroadcaster hub,
        IConnectionGroupRegistry groupProvider,
        string groupName,
        IConnection excludedConnection,
        IPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken cancellationToken = default);
}
```

- **Tuần tự hóa và nén một lần, mã hóa theo từng kết nối**: `BroadcastAsync`, `MulticastAsync` và `MulticastExceptAsync` tuần tự hóa `packet` thành một `BufferLease` duy nhất (với `zeroOnDispose: enableEncrypt`) và nén trước payload một lần khi `CompressionOptions.Enabled` và `payloadSize >= MinSizeToCompress`. Sau đó mỗi kết nối đích mã hóa khung đã nén sẵn bằng `Secret` và `Algorithm` riêng của nó.

## 3. Mở rộng định tuyến theo người dùng (`ConnectionUserExtensions.cs`)

```csharp
public static class ConnectionUserExtensions
{
    public static Task MapToUserAsync(
        this IConnectionGroupRegistry registry,
        string userId,
        IConnection connection,
        CancellationToken cancellationToken = default);

    public static Task UnmapUserAsync(
        this IConnectionGroupRegistry registry,
        string userId,
        IConnection connection,
        CancellationToken cancellationToken = default);

    public static Task SendToUserAsync(
        this IConnectionBroadcaster hub,
        IConnectionGroupRegistry registry,
        string userId,
        IPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken cancellationToken = default);

    public static Task SendToUserExceptAsync(
        this IConnectionBroadcaster hub,
        IConnectionGroupRegistry registry,
        string userId,
        IConnection excludedConnection,
        IPacket packet,
        NetworkTransport transport = NetworkTransport.TCP,
        bool enableEncrypt = true,
        CancellationToken cancellationToken = default);
}
```

- Đặt `connection.UserId = userId` và ánh xạ kết nối vào nhóm nội bộ `"__user_:" + userId` trong `IConnectionGroupRegistry`.

## Ví dụ sử dụng

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Runtime.Extensions;

// 1. Gửi control directive qua context.Sender (IPacketSender)
await context.Sender.SendAsync(
    controlType: ControlType.NOTICE,
    reason: ProtocolReason.NONE,
    action: ProtocolAdvice.NONE,
    options: new ControlDirectiveOptions(
        Flags: ControlFlags.NONE,
        SequenceId: context.Packet.Header.SequenceId));

// 2. Gửi gói tin trực tiếp qua IConnection
await context.Connection.SendAsync(notificationPacket, NetworkTransport.TCP, enableEncrypt: true);
```

## API liên quan

- [Connection](./connection.md)
- [Connection Hub](./connection-hub.md)
- [Packet Sender](../../runtime/routing/packet-sender.md)
