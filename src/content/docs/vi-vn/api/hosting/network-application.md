---
title: Ứng dụng mạng
description: Tham chiếu API cho NetworkApplication, INetworkApplicationBuilder, IProtocolBindingBuilder, DefaultProtocol và NetworkApplicationBuilderExtensions trong Nalix.Hosting.
section: API Reference
package: Nalix.Hosting
---

**Không gian tên:** `Nalix.Hosting`, `Nalix.Hosting.Protocols`  
**Assembly:** `Nalix.Hosting`

`Nalix.Hosting` cung cấp một builder fluent theo phong cách Microsoft (`INetworkApplicationBuilder` / `NetworkApplicationBuilder`) và host máy chủ (`NetworkApplication`), điều phối việc nạp cấu hình, đăng ký phụ thuộc, nối handler packet lúc biên dịch, và vòng đời listener đa transport (TCP, datagram (NDP qua UDP) và WebSocket), cùng các listener tùy chỉnh được thêm bằng `AddListener`.

## Ánh xạ mã nguồn

- `src/Nalix.Hosting/NetworkApplication.cs`
- `src/Nalix.Hosting/INetworkApplicationBuilder.cs`
- `src/Nalix.Hosting/NetworkApplicationBuilder.cs`
- `src/Nalix.Hosting/NetworkApplicationBuilder.Extensions.cs`
- `src/Nalix.Hosting/IProtocolBindingBuilder.cs`
- `src/Nalix.Hosting/IWebSocketBindingBuilder.cs`
- `src/Nalix.Hosting/Protocols/DefaultProtocol.cs`
- `src/Nalix.Hosting/Protocols/DefaultFrameProcessor.cs`
- `src/Nalix.Hosting/Protocols/DefaultOpCodeExtractor.cs`
- `src/Nalix.Runtime/Handlers/DatagramTicketHandlers.cs`

## Luồng khởi động & vòng đời

```mermaid
flowchart LR
    subgraph Phase1["1. Fluent Configuration"]
        CB["NetworkApplication.CreateBuilder()"] --> Opts["Configure<TOptions>() / UseLogger()"]
        Opts --> Feat["UseSecureConnections() / UseSessions() / UseGroups()"]
        Feat --> Map["MapHandlers<THandler>() / RegisterScoped<T>()"]
        Map --> Bind["MapTcp<T>() / MapDatagram<T>() / MapWebSocket<T>().Bind()"]
    end

    subgraph Phase2["2. Build()"]
        Bind --> Bld["Build()"]
        Bld --> RegPkt["RegisterPacketRegistry() + ApplyOptions()"]
        RegPkt --> Factories["Capture Dispatch & Listener Factories"]
    end

    subgraph Phase3["3. ActivateAsync() / RunAsync()"]
        Factories --> Prep["Register Logger, Hub, Guard, BufferPool, ObjectPool"]
        Prep --> Disp["Create & Activate IPacketDispatch"]
        Disp --> Listen["Construct & Activate TCP / Datagram / WebSocket / custom Listeners"]
    end
```

## Tham chiếu `NetworkApplication`

```csharp
public sealed class NetworkApplication : IActivatableAsync, IAsyncDisposable
{
    public static NetworkApplicationBuilder CreateBuilder();
    public static NetworkApplication CreateMinimal(ushort? port = null);

    public Task RunAsync(CancellationToken cancellationToken = default);
    public Task ActivateAsync(CancellationToken cancellationToken = default);
    public Task DeactivateAsync(CancellationToken cancellationToken = default);
    public ValueTask DisposeAsync();
    public void Dispose();
}
```

### Chi tiết phương thức

| Phương thức | Mô tả |
| :--- | :--- |
| `CreateBuilder()` | Tạo một `NetworkApplicationBuilder` mới, được khởi tạo với `HostingBuilderContext` rỗng. |
| `CreateMinimal(ushort? port = null)` | Tạo một `NetworkApplication` sẵn sàng chạy, được gắn với `MapTcp<DefaultProtocol>()` trên `port` (hoặc `NetworkSocketOptions.Port` khi `null`). Lưu ý: việc quét assembly lúc chạy bị bỏ qua để đảm bảo an toàn cho Native AOT; handler được phân giải qua `PacketHandlerRegistry` lúc biên dịch hoặc `MapHandlers<T>()`. |
| `ActivateAsync(CancellationToken)` | Lấy cổng khóa vòng đời, gọi `PrepareCallbacks` (đăng ký `ILogger`, `IConnectionHub`, `IConnectionGuard`, `IBufferPoolManager`, và `IObjectPoolManager`), tạo và kích hoạt `IPacketDispatch`, khởi tạo từng listener đã gắn (`TcpServerListener`, `DatagramListener`, `WebSocketServerListener`, cùng mọi listener được thêm qua `AddListener`), đăng ký chúng vào `ReportRegistry`, và kích hoạt chúng. Hoàn tác phần đã kích hoạt nếu có lỗi. |
| `RunAsync(CancellationToken)` | Gọi `ActivateAsync(cancellationToken)`, chờ `Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken)`, và đảm bảo `DeactivateAsync(CancellationToken.None)` được gọi trong khối `finally`. |
| `DeactivateAsync(CancellationToken)` | Hủy kích hoạt và dispose mọi listener theo thứ tự ngược với lúc đăng ký, dispose mọi protocol theo thứ tự ngược, hủy kích hoạt `IPacketDispatch`, và chờ `TaskManager.WaitGroupAsync("net/*", ct)` cùng `WaitGroupAsync("time/*", ct)` để không worker nền nào bị rò rỉ qua các lần khởi động lại. |
| `DisposeAsync()` / `Dispose()` | Gọi `DeactivateAsync(CancellationToken.None)` một cách idempotent và dispose `SemaphoreSlim` gate nội bộ. |

---

## Tham chiếu `INetworkApplicationBuilder`

### Các phương thức builder cốt lõi

| Phương thức | Mô tả |
| :--- | :--- |
| `Configure<TOptions>(Action<TOptions>)` | Xếp hàng một bộ biến đổi cấu hình cho `TOptions : ConfigurationLoader, new()`. Trong `Build()`, lấy `ConfigurationManager.Instance.Get<TOptions>()`, chạy delegate, gọi `Validate()` nếu `TOptions` triển khai `IValidatableConfiguration`, và đánh dấu kiểu tùy chọn này là đã cấu hình thủ công. |
| `ConfigureDispatchOptions(Action<PacketDispatchOptions<IPacket>>)` | Đăng ký callback để cấu hình middleware, rate limiter, các stage xử lý kết quả handler, hoặc xử lý lỗi tùy chỉnh trên [PacketDispatchOptions&lt;IPacket&gt;](../options/runtime/packet-dispatch-options.md). |
| `ConfigureDispatch(Func<Action<PacketDispatchOptions<IPacket>>, IPacketDispatch>)` | Thay thế `PacketDispatchChannel` mặc định bằng một triển khai `IPacketDispatch` tùy chỉnh (ví dụ `PacketRouter` đồng bộ). |
| `UseLogger(ILogger)` | Đăng ký `logger` ngay vào `InstanceManager` và gắn listener sự kiện `DiagnosticChannel` nội bộ. |
| `UseConnectionHub(IConnectionHub)` | Đăng ký `IConnectionHub` tùy chỉnh (và `IConnectionBroadcaster` nếu được triển khai). Khi bỏ qua, một `ConnectionHub` mặc định được tạo trong `ActivateAsync`. |
| `UseConnectionGuard(IConnectionGuard)` | Đăng ký `IConnectionGuard` tùy chỉnh (và `IProofOfWorkPolicy` nếu được triển khai). Khi bỏ qua, một `ConnectionGuard` mặc định được tạo trong `ActivateAsync`. |
| `UseBufferPoolManager(IBufferPoolManager)` | Đăng ký `IBufferPoolManager` tùy chỉnh và gắn `BufferLease.ByteArrayPool`. |
| `UseObjectPoolManager(IObjectPoolManager)` | Đăng ký `IObjectPoolManager` tùy chỉnh và cấu hình `BufferLease`, `PacketRegistry`, và `ObjectPoolManager`. |
| `RegisterScoped<TService>(Func<IPacketScope, TService>)` | Đăng ký factory dịch vụ theo phạm vi từng packet (`where TService : class`) trong `ScopedServiceRegistry.Instance`, dành cho các tham số handler `[FromScope]`. |
| `ScopedServiceRegistry.TryGetFactory(Type, out Func<IPacketScope, object>?)` | Phương thức public của `ScopedServiceRegistry` (không thuộc builder): tìm factory đã đăng ký cho một kiểu dịch vụ; trả về `true` cùng factory nếu tìm thấy, ngược lại trả về `false` và `null`. `PacketScope` dùng nó để phân giải các dịch vụ `[FromScope]`. |
| `MapHandlers<THandler>()` | Kiểm tra và đăng ký một class `[PacketController]`, được tạo qua `InstanceManager.Instance.CreateInstanceWithInjection(typeof(THandler))`. |
| `MapHandlers<THandler>(Func<THandler>)` | Kiểm tra và đăng ký một class `[PacketController]`, được tạo qua một delegate factory tường minh. |
| `MapHandlers(Type)` | Kiểm tra và đăng ký trực tiếp một kiểu `[PacketController]` (hỗ trợ các class handler tĩnh). |
| `MapTcp<TProtocol>()` | Bắt đầu một binding listener TCP fluent (`IProtocolBindingBuilder`) cho `TProtocol : class, IProtocol`. |
| `MapDatagram<TProtocol>()` | Bắt đầu một binding listener datagram (NDP qua UDP) fluent (`IProtocolBindingBuilder`) cho `TProtocol : class, IProtocol`. Đồng thời ánh xạ `DatagramTicketHandlers`, qua đó client yêu cầu ticket trên một phiên TCP hoặc WebSocket đã thiết lập. Ném `InvalidOperationException` khi được gọi nhiều hơn một lần: ticket chỉ được cấp bởi một listener duy nhất. |
| `AddListener(Func<IListener>)` | Thêm một listener được tạo khi kích hoạt và được kích hoạt/hủy kích hoạt cùng các listener protocol, dành cho các phần mở rộng chạy socket riêng (ví dụ một UDP relay thô). |
| `MapWebSocket<TProtocol>()` | Bắt đầu một binding listener WebSocket fluent ([IWebSocketBindingBuilder](./websocket-binding.md)) cho `TProtocol : class, IProtocol`. |
| `Build()` | Áp dụng các tùy chọn, đăng ký registry packet lúc biên dịch, và trả về một `NetworkApplication` đã được cấu hình. |

:::warning[Các phương thức binding đã lỗi thời]
`ListenTcp<TProtocol>()` và `ListenWebSocket<TProtocol>()` được đánh dấu `[Obsolete]` trong `INetworkApplicationBuilder`. Trong mã mới, luôn dùng `MapTcp<TProtocol>()` và `MapWebSocket<TProtocol>()`. `ListenUdp<TProtocol>()` và `MapUdp<TProtocol>()` không còn tồn tại; hãy dùng `MapDatagram<TProtocol>()`.
:::

:::note[Phiên datagram tồn tại lâu hơn kết nối stream của nó]
Một phiên datagram sao chép người dùng, mức quyền và secret của kết nối stream khi ticket được cấp, rồi tồn tại độc lập: ngắt kết nối stream không đóng nó. Để đuổi một người dùng, hãy ngắt thêm các instance `DatagramConnection` có `StreamConnectionId` khớp (`INetworkApplicationBuilder.cs`, phần remarks của `MapDatagram`).
:::

---

## Phương thức mở rộng tính năng (`NetworkApplicationBuilderExtensions`)

`Nalix.Hosting` cung cấp các phương thức mở rộng tùy chọn (opt-in) trên `INetworkApplicationBuilder` cho các hệ thống con runtime tích hợp sẵn:

| Phương thức mở rộng | Handler & dịch vụ được đăng ký |
| :--- | :--- |
| `UseTimeSync()` | Đăng ký `SystemTimeSyncHandlers` (`ControlType.TIMESYNCREQUEST`). |
| `UseSystemControl()` | Đăng ký idempotent `SystemControlHandlers` (`PING`, `DISCONNECT`, `CIPHER_UPDATE`, `PUBLIC_KEY_REQUEST`, v.v.). |
| `UseSecureConnections(string? certificatePath = null)` | Đăng ký `FileCertificateStore` làm `ICertificateStore` (nếu chưa có), đăng ký idempotent `HandshakeHandlers`, `ProofOfWorkHandlers`, và `SystemControlHandlers`, và khởi tạo chứng chỉ máy chủ X25519 tĩnh (`HandshakeHandlers.SetCertificatePath(certificatePath)` hoặc `HandshakeHandlers.Initialize()`). |
| `UseSessions()` | Đăng ký `SessionHandlers` và gọi `ServiceRegistrar.RegisterSessions()` để đăng ký `ISessionService` (`SessionService`) và `SessionPersistenceObserver`. |
| `UseGroups()` | Gọi `ServiceRegistrar.RegisterGroups()` để đăng ký `IConnectionGroupRegistry` (`InMemoryGroupStore`) và `GroupMembershipObserver`. |
| `UseSessionService(SessionService)` | Đăng ký một instance `SessionService` tùy chỉnh làm `ISessionService`. |
| `UseSessionStore(ISessionStore)` | Đăng ký một `ISessionStore` lưu trữ tùy chỉnh (ví dụ Redis) cho `SessionService`. |
| `UseSessionFactory(ISessionFactory)` | Đăng ký một `ISessionFactory` tùy chỉnh cho `SessionService`. |

---

## Tham chiếu `IProtocolBindingBuilder` (TCP & Datagram)

`MapTcp<TProtocol>()` và `MapDatagram<TProtocol>()` trả về một `IProtocolBindingBuilder`:

```csharp
public interface IProtocolBindingBuilder
{
    IProtocolBindingBuilder OnPort(ushort port);
    IProtocolBindingBuilder WithFactory(Func<IPacketDispatch, IProtocol> factory);
    INetworkApplicationBuilder Bind();
}
```

| Phương thức | Mô tả |
| :--- | :--- |
| `OnPort(ushort port)` | Đặt cổng lắng nghe, ghi đè giá trị mặc định từ `NetworkSocketOptions`. Với binding datagram không gọi `OnPort`, listener được tạo với cổng `0` (`registration.BindingBuilder.Port ?? 0`), nên hệ điều hành chọn một cổng trống; cổng được chọn sẽ được báo cho client trong ticket (`DatagramListener.Port`). |
| `WithFactory(Func<IPacketDispatch, IProtocol>)` | Cung cấp factory tùy chỉnh để khởi tạo `TProtocol`. Khi bỏ qua, `NetworkApplicationBuilder` tự động phân giải các constructor khớp với `(ILogger, IPacketDispatch)`, `(IPacketDispatch, ILogger)`, `(IPacketDispatch)`, hoặc `()`. |
| `Bind()` | Hoàn tất binding và trả về `INetworkApplicationBuilder` cha. |

`WithMode(OperatingMode)` và `WithAuthentication(...)` đã bị gỡ cùng với các listener UDP; listener datagram luôn xác thực từng datagram bằng cơ chế bảo vệ AEAD do `ChaCha20Poly1305DatagramProtectionFactory` tạo ra và cho phép phiên vào qua `IConnectionGuard`.

---

## Tham chiếu `DefaultProtocol`

Với các ứng dụng đẩy mọi khung trực tiếp vào `IPacketDispatch` mà không cần máy trạng thái ở tầng protocol riêng, `Nalix.Hosting.Protocols.DefaultProtocol` giúp bạn không cần tự viết một lớp con `Protocol`:

```csharp
[Injectable]
public sealed class DefaultProtocol : Protocol
{
    public DefaultProtocol(ILogger logger, IPacketDispatch dispatch);
    public override IFrameProcessor FrameProcessor { get; }
    public override IOpCodeExtractor OpCodeExtractor { get; }
    public override void ProcessMessage(object? sender, IConnectionEventArgs args);
}
```

- Đặt `IsAccepting = true` và `KeepConnectionOpen = true` khi khởi tạo.
- Dùng `DefaultFrameProcessor` và `DefaultOpCodeExtractor` (đọc `payload.AsHeaderRef().OpCode` từ `PacketHeader`).
- Chuyển trực tiếp `args.Lease` và `args.Connection` cho `_dispatch.HandlePacket(args.Lease, args.Connection)`.

---

## Ví dụ sử dụng thực tế

```csharp
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Nalix.Hosting;
using Nalix.Hosting.Protocols;
using Nalix.Network.Options;
using Nalix.Runtime.Middleware;

public static class Program
{
    public static async Task Main(string[] args)
    {
        using ILoggerFactory loggerFactory = LoggerFactory.Create(b => b.AddConsole());
        ILogger logger = loggerFactory.CreateLogger("GameServer");

        await using NetworkApplication app = NetworkApplication.CreateBuilder()
            .UseLogger(logger)
            .Configure<NetworkSocketOptions>(opt =>
            {
                opt.Port = 57206;
                opt.EnableDualStack = true;
            })
            .UseSecureConnections()
            .UseSessions()
            .UseGroups()
            .UseTimeSync()
            .ConfigureDispatchOptions(dispatch =>
            {
                dispatch.WithMiddleware(new TokenBucketMiddleware());
            })
            .MapHandlers<PlayerController>()
            .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
            .MapDatagram<DefaultProtocol>().OnPort(57207).Bind()
            .Build();

        using CancellationTokenSource cts = new();
        Console.CancelKeyPress += (_, e) =>
        {
            e.Cancel = true;
            cts.Cancel();
        };

        await app.RunAsync(cts.Token);
    }
}
```

## API liên quan

- [Ràng buộc WebSocket Hosting](./websocket-binding.md)
- [Tùy chọn Hosting](../options/hosting/hosting-options.md)
- [Protocol](../network/protocol.md)
- [TCP Listener](../network/tcp-listener.md)
- [Datagram Listener](../network/datagram-listener.md)
- [Packet Dispatch Channel & Router](../runtime/routing/dispatch-channel-and-router.md)
- [Tùy chọn Packet Dispatch](../options/runtime/packet-dispatch-options.md)
