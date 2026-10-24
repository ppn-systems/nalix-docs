---
title: Connection Extensions
description: Reference for ConnectionExtensions and ConnectionUserExtensions in Nalix.Runtime.Extensions — packet sending, control directives, zero-copy broadcasting, and user-group routing.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Extensions`  
**Assembly:** `Nalix.Runtime`

`ConnectionExtensions` (`public static partial class ConnectionExtensions`) and `ConnectionUserExtensions` (`public static class ConnectionUserExtensions`) provide high-level extension methods on `IConnection`, `IPacketSender`, `IConnectionBroadcaster`, and `IConnectionGroupRegistry` for sending typed packets, emitting control-plane `Directive` frames, broadcasting pre-compressed frames, and routing packets by `UserId`.

## Source Mapping

- `src/Nalix.Runtime/Extensions/ConnectionExtensions.cs`
- `src/Nalix.Runtime/Extensions/ConnectionExtensions.Broadcast.cs`
- `src/Nalix.Runtime/Extensions/ConnectionUserExtensions.cs`

## 1. Direct Connection & Directive Extensions (`ConnectionExtensions.cs`)

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

- **`connection.GetHub()`**: Retrieves the owning `IConnectionHub` stored under `ConnectionAttributes.OwnerHub` in `connection.Attributes` (or `null` if not registered).
- **`connection.SendAsync(packet, transport, enableEncrypt, ct)`**: Serializes `packet`, applies outbound compression (`CompressionOptions`) and encryption (`enableEncrypt`), and transmits over `connection.TCP` (for `TCP`/`WEBSOCKET`) or `connection.UDP` (throwing `InvalidOperationException` if `UDP` is `null`).
- **`sender.SendAsync(controlType, reason, action, options)`**: Rents a pooled `Directive` (`0x0008`) via `PacketFactory<Directive>.Acquire()`, initializes it with `ControlDirectiveOptions`, and sends it through `IPacketSender.SendAsync`.

## 2. Packet Broadcast & Group Multicast Extensions (`ConnectionExtensions.Broadcast.cs`)

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

- **Serialize & Compress Once, Encrypt Per Connection**: `BroadcastAsync`, `MulticastAsync`, and `MulticastExceptAsync` serialize `packet` into a single `BufferLease` (with `zeroOnDispose: enableEncrypt`) and pre-compress the payload once when `CompressionOptions.Enabled` and `payloadSize >= MinSizeToCompress`. Each target connection then encrypts the pre-compressed frame with its own `Secret` and `Algorithm`.

## 3. User-Mapped Routing Extensions (`ConnectionUserExtensions.cs`)

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

- Sets `connection.UserId = userId` and maps the connection into the internal group `"__user_:" + userId` inside `IConnectionGroupRegistry`.

## Usage Example

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Runtime.Extensions;

// 1. Send a control directive via context.Sender (IPacketSender)
await context.Sender.SendAsync(
    controlType: ControlType.NOTICE,
    reason: ProtocolReason.NONE,
    action: ProtocolAdvice.NONE,
    options: new ControlDirectiveOptions(
        Flags: ControlFlags.NONE,
        SequenceId: context.Packet.Header.SequenceId));

// 2. Send a packet directly on IConnection
await context.Connection.SendAsync(notificationPacket, NetworkTransport.TCP, enableEncrypt: true);
```

## Related APIs

- [Connection](./connection.md)
- [Connection Hub](./connection-hub.md)
- [Packet Sender](../../runtime/routing/packet-sender.md)
