---
title: Tùy chỉnh bộ định tuyến
description: Hướng dẫn này cung cấp các chỉ dẫn có thể thực hiện để triển khai một bộ định tuyến gói tin tùy chỉnh, tận dụng hệ thống dispatch nhận biết shard của Nalix để duy trì xử lý tuần tự nghiêm ngặt cho các kết nối có liên quan về logic (ví dụ User, Room hoặc GameSession)...
section: Guides
---

Hướng dẫn này cung cấp các chỉ dẫn có thể thực hiện để triển khai một bộ định tuyến gói tin tùy chỉnh, tận dụng hệ thống dispatch nhận biết shard của Nalix để duy trì xử lý tuần tự nghiêm ngặt cho các kết nối có liên quan về logic (ví dụ User, Room hoặc GameSession).

## 1. Khái niệm cốt lõi: Nhận biết Shard

Nalix dùng **Hashed Connection Affinity**. `DispatchChannel<T>` (nội bộ của `PacketDispatchChannel`) gán mỗi instance `IConnection` vào một shard nội bộ cụ thể (vòng lặp worker) bằng `RuntimeHelpers.GetHashCode(connection)`.

Để đảm bảo các kết nối vật lý khác nhau (ví dụ một người chơi kết nối từ cả điện thoại và máy tính bảng) được xử lý tuần tự bởi cùng một worker, bạn phải dùng một **Shared Shard Proxy**.

## 2. Bước 1: Triển khai Shard Proxy

Shard Proxy là một lớp bao quanh `IConnection`, cung cấp danh tính đối tượng ổn định cho dispatcher trong khi ủy quyền việc gửi dữ liệu trở lại socket vật lý.

:::important[Danh tính đối tượng là chìa khóa]
Dispatcher dùng **Reference Identity** của đối tượng `IConnection`. Bạn **phải** trả về đúng cùng một instance proxy cho mọi kết nối thuộc cùng một shard.
:::

```csharp
using System;
using Nalix.Abstractions;
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Abstractions.Primitives;
using Nalix.Abstractions.Security;

public sealed class UserShardProxy : IConnection
{
    private readonly IConnection _physical;
    public long UserID { get; }

    public UserShardProxy(long userId, IConnection physical)
    {
        UserID = userId;
        _physical = physical;
    }

    // --- IDENTITY MEMBERS ---
    public ulong ConnectionId => _physical.ConnectionId;
    public string? UserId { get => _physical.UserId; set => _physical.UserId = value; }
    public INetworkEndpoint NetworkEndpoint => _physical.NetworkEndpoint;
    public bool IsDisposed => _physical.IsDisposed;

    // --- TRANSMISSION DELEGATION ---
    public IConnection.ITransport TCP => _physical.TCP;
    public IConnection.ITransport? UDP => _physical.UDP;
    public bool IsUdpCreated => _physical.IsUdpCreated;
    public IOpCodeExtractor PacketClassifier => _physical.PacketClassifier;

    // --- STATE DELEGATION ---
    public IObjectMap<AttributeKey, object> Attributes => _physical.Attributes;
    public PermissionLevel Level { get => _physical.Level; set => _physical.Level = value; }
    public CipherSuiteType Algorithm { get => _physical.Algorithm; set => _physical.Algorithm = value; }
    public Bytes32 Secret { get => _physical.Secret; set => _physical.Secret = value; }
    public bool ExcludeFromIdleTimeout { get => _physical.ExcludeFromIdleTimeout; set => _physical.ExcludeFromIdleTimeout = value; }

    // --- METRICS ---
    public long UpTime => _physical.UpTime;
    public long BytesSent => _physical.BytesSent;
    public long BytesReceived => _physical.BytesReceived;
    public long PacketsDropped => _physical.PacketsDropped;
    public long LastPingTime => _physical.LastPingTime;
    public int ErrorCount => _physical.ErrorCount;

    public void UpdateIdleTimeout(int newTimeoutMs) => _physical.UpdateIdleTimeout(newTimeoutMs);
    public void IncrementBytesSent(int count) => _physical.IncrementBytesSent(count);
    public void IncrementBytesReceived(int count) => _physical.IncrementBytesReceived(count);
    public void IncrementPacketsDropped() => _physical.IncrementPacketsDropped();
    public void IncrementErrorCount() => _physical.IncrementErrorCount();

    // --- LIFECYCLE ---
    public void Disconnect(string? reason = null) => _physical.Disconnect(reason);
    public void Dispose() => _physical.Dispose();

    // --- EVENT DELEGATION ---
    public event EventHandler<IConnectionEventArgs>? ConnectionClosed { add => _physical.ConnectionClosed += value; remove => _physical.ConnectionClosed -= value; }
    public event EventHandler<IConnectionEventArgs>? MessageProcessing { add => _physical.MessageProcessing += value; remove => _physical.MessageProcessing -= value; }
    public event EventHandler<IConnectionEventArgs>? MessageProcessed { add => _physical.MessageProcessed += value; remove => _physical.MessageProcessed -= value; }
}
```

## 3. Bước 2: Triển khai Router Middleware

Triển khai interface `IPacketDispatch` để chặn các gói tin đến và phân giải Shard Proxy trước khi chuyển chúng sang channel dispatch chuẩn.

```csharp
using System.Threading;
using Nalix.Abstractions;
using Nalix.Abstractions.Networking;
using Nalix.Runtime.Dispatching;

public sealed class UserBasedRouter : IPacketDispatch
{
    private static readonly AttributeKey UserIdKey = new("UserID");
    private readonly IPacketDispatch _inner; // The default PacketDispatchChannel

    public UserBasedRouter(IPacketDispatch inner)
    {
        _inner = inner;
    }

    public void HandlePacket(IBufferLease? packet, IConnection connection)
    {
        // 1. Resolve logical identity (e.g., UserID stored in connection attributes)
        if (connection.Attributes.TryGetValue(UserIdKey, out object? raw) && raw is long userId)
        {
            // 2. Retrieve the shared proxy instance from your session manager.
            // MUST return the same instance for the same UserID.
            IConnection shardKey = GlobalSessionManager.GetOrCreateUserProxy(userId, connection);

            // 3. Hand-off to the internal shard-aware channel using the proxy as the key.
            _inner.HandlePacket(packet, shardKey);
        }
        else
        {
            // Fallback to standard connection-based sharding for unauthenticated packets.
            _inner.HandlePacket(packet, connection);
        }
    }

    // Delegate lifecycle to inner dispatcher
    public void Activate(CancellationToken ct = default) => _inner.Activate(ct);
    public void Deactivate(CancellationToken ct = default) => _inner.Deactivate(ct);
}
```

## 4. Bước 3: Đăng ký Router

Đưa router tùy chỉnh vào protocol trong quá trình khởi tạo ứng dụng.

```csharp
var builder = NetworkApplication.CreateBuilder();

// The builder provides the default PacketDispatchChannel (shard-aware engine)
// as the 'dispatch' argument in the MapTcp/MapUdp factory.
builder.MapTcp<GameProtocol>().WithFactory(dispatch => 
{
    // Wrap the default shard engine with our custom UserBasedRouter
    var userRouter = new UserBasedRouter(dispatch);
    
    return new GameProtocol(userRouter);
}).Bind();

var app = builder.Build();
await app.RunAsync();
```

## Tham số cấu hình

Hành vi của hệ thống nhận biết shard chịu ảnh hưởng bởi `DispatchOptions`. Hãy đảm bảo các giá trị này được điều chỉnh để xử lý tải dự kiến trên mỗi shard:

| Tùy chọn | Khuyến nghị |
| --- | --- |
| `MaxPerConnectionQueue` | Giới hạn số gói tin có thể xếp hàng cho một shard (instance `UserShardProxy`) trước khi `DropPolicy` (`DropNewest`, `DropOldest`, `Coalesce` hoặc `Block`) được kích hoạt. Mặc định là `4096` (đặt `0` để không giới hạn, hoặc một ngưỡng chặt hơn như `256` khi chạy production). |
| `DropPolicy` | Chọn `DropOldest` cho các cập nhật trạng thái thời gian thực, hoặc `Block` (kèm `BlockTimeout`) khi backpressure nên làm chậm bên đọc. |

## Vì sao cách này hoạt động

Bằng cách truyền **instance Proxy** vào `HandlePacket`, `DispatchChannel<T>` dùng danh tính của proxy đó để chọn bucket. Điều này nhóm hiệu quả tất cả các kết nối vật lý được ánh xạ tới proxy đó vào một hàng đợi tuần tự duy nhất, đảm bảo các cập nhật trạng thái người dùng luôn có thứ tự, bất kể gói tin đến từ thiết bị nào.

## API liên quan

- [IPacketDispatch](../../api/runtime/routing/packet-dispatch.md)
- [Dispatch Options](../../api/options/runtime/dispatch-options.md)
- [IConnection](../../api/abstractions/connection-contracts.md)
