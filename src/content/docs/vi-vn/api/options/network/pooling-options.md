---
title: Tùy chọn pooling
description: Cách Nalix.Network suy ra dung lượng và số lượng cấp phát trước của ObjectPoolManager từ ConnectionGuardOptions.MaxConnections và NetworkSocketOptions.MaxParallel thông qua NetworkPoolInitializer.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Internal.Initialization`  
**Assembly:** `Nalix.Network`

:::note[Kích thước pool nội bộ]
Cả `Nalix.Network` và `Nalix.Runtime` đều không cung cấp lớp `PoolingOptions` công khai. Dung lượng và số lượng cấp phát trước của pool tầng mạng được `NetworkPoolInitializer` tự động suy ra từ [ConnectionGuardOptions.MaxConnections](./connection-guard-options.md) và [NetworkSocketOptions.MaxParallel](./network-socket-options.md) trong quá trình khởi động máy chủ.
:::

## Ánh xạ mã nguồn

- `src/Nalix.Network/Internal/Initialization/NetworkPoolInitializer.cs`
- `src/Nalix.Network/Options/ConnectionGuardOptions.cs`
- `src/Nalix.Network/Options/NetworkSocketOptions.cs`

## Cách kích thước pool mạng

`NetworkPoolInitializer` cấu hình dung lượng và số lượng cấp phát trước của [ObjectPoolManager](../../framework/memory/object-pooling.md) qua ba giai đoạn:

1. **Static constructor (`static NetworkPoolInitializer()`)**: Đọc `ConnectionGuardOptions.MaxConnections` (mặc định `2000`) và `NetworkSocketOptions.MaxParallel` (mặc định `1`), thực hiện tất cả các đăng ký `SetMaxCapacity<T>` cho mọi kiểu pool mạng, và cấp phát trước `PooledAcceptContext` (`MaxParallel`), `PooledSocketAsyncEventArgs` (`MaxParallel * 4`), `TimingWheel.TimeoutTask` (`128`), `ConnectionBacking` (`128`), `ConnectionEventArgs` (`256`) và `PooledConnectEventContext` (`256`).
2. **Khởi tạo TCP (`NetworkPoolInitializer.InitializeTcp()`)**: Được `static Connection()` gọi (không tham số) để cấp phát trước `SocketConnection` (`128`), `SocketUdpTransport` (`64`), `SocketTcpTransport` (`128`), `ProxyHeaderContext` (`128`) và `PooledSocketReceiveContext` (`128`).
3. **Khởi tạo WebSocket (`NetworkPoolInitializer.InitializeWebSocket()`)**: Được `static WebSocketConnection()` gọi để cấp phát trước `WebSocketTransport` (`128`).

### Ma trận dung lượng và cấp phát trước

| Kiểu được pool | Công thức dung lượng tối đa (`SetMaxCapacity` trong `.cctor`) | Số instance cấp phát trước | Cấp phát bởi |
| :--- | :--- | :--- | :--- |
| `SocketConnection` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `ConnectionBacking` | `MaxConnections` (`2000`) | `128` | Static constructor |
| `SocketTcpTransport` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `SocketUdpTransport` | `MaxConnections` (`2000`) | `64` | `InitializeTcp()` |
| `WebSocketTransport` | `MaxConnections` (`2000`) | `128` | `InitializeWebSocket()` |
| `ProxyHeaderContext` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `TimingWheel.TimeoutTask` | `MaxConnections` (`2000`) | `128` | Static constructor |
| `PooledSocketReceiveContext` | `MaxConnections` (`2000`) | `128` | `InitializeTcp()` |
| `ConnectionEventArgs` | `(MaxConnections * 2) + 1024` (`5024`) | `256` | Static constructor |
| `PooledConnectEventContext` | `(MaxConnections * 2) + 1024` (`5024`) | `256` | Static constructor |
| `PooledAcceptContext` | `(MaxParallel * 2) + 32` (`34`) | `MaxParallel` (`1`) | Static constructor |
| `PooledSocketAsyncEventArgs` | `MaxParallel + MaxConnections` (`2001`) | `MaxParallel * 4` (`4`) | Static constructor |

## Điều chỉnh dung lượng pool mạng

Để tăng khả năng giữ pool với trần đồng thời cao hơn, hãy cấu hình `ConnectionGuardOptions` và `NetworkSocketOptions` trước khi xây dựng host:

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<ConnectionGuardOptions>(options =>
{
    options.MaxConnections = 10_000;
});

builder.Configure<NetworkSocketOptions>(options =>
{
    options.MaxParallel = 16;
});
```

## API liên quan

- [Object Pool Manager](../../framework/memory/object-pooling.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn Network Socket](./network-socket-options.md)
- [Tùy chọn Network Callback](./network-callback-options.md)
- [TCP Listener](../../network/tcp-listener.md)
