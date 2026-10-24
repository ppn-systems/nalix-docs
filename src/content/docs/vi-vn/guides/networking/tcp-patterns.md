---
title: Mẫu kết nối TCP
description: Khởi tạo thủ công TcpListenerBase và Protocol cho các kiến trúc máy chủ TCP mức thấp tùy chỉnh.
section: Guides
---

:::danger[Triển khai mức thấp]
Hướng dẫn này minh họa việc khởi tạo thủ công `TcpListenerBase` và `Protocol`. Dù mạnh mẽ, đường này bỏ qua cơ chế tự động khám phá tính năng và dependency injection do [Hosting Builder](../../quickstart.md) cung cấp.
Chỉ dùng cách này khi nhúng Nalix vào các engine có sẵn hoặc khi xây dựng các tầng transport chuyên biệt.
:::

Luồng thủ công này minh họa:

- `TcpListenerBase`
- `Protocol`
- `PacketDispatchChannel`
- một gói tin request
- một phản hồi được trả về từ handler

Mục tiêu là sự rõ ràng, không phải tính đầy đủ cho production.

Hãy dùng nó khi bạn muốn một mẫu TCP chuẩn trước khi thêm middleware, metadata hoặc hành vi client phức tạp hơn.

## Kịch bản

Client gửi một gói `Control`.

Server phản hồi bằng một gói `Control`.

## Chọn chiến lược khởi tạo

Trước khi bắt đầu, bạn cần quyết định cách khởi tạo máy chủ. Nalix cung cấp hai đường riêng biệt:

### 1. Hosting Builder cấp cao (Khuyến nghị)

Dùng `NetworkApplication.CreateBuilder()` để khởi động máy chủ.

- **Khi nào dùng**: 99% ứng dụng production.
- **Lợi ích**: Tự động khám phá handler, Dependency Injection, logging có sẵn, cấu hình middleware dễ dàng hơn và hỗ trợ nhiều listener protocol trong một ứng dụng.

### 2. Direct Transport Listener

Khởi tạo thủ công `TcpListenerBase` và `Protocol` (như ví dụ bên dưới).

- **Khi nào dùng**: Xây dựng thư viện transport chuyên biệt, kiểm thử mức thấp, hoặc nhúng Nalix vào kiến trúc máy chủ không chuẩn.
- **Lợi ích**: Kiểm soát tuyệt đối vòng đời listener; không có overhead từ tầng hosting.

---

## Thiết lập máy chủ (Đường Direct Transport)

### 1. Đăng ký dịch vụ dùng chung

```csharp
InstanceManager.Instance.Register<ILogger>(logger);
```

### 2. Tạo handler

```csharp
[PacketController("SamplePingHandlers")]
public sealed class SamplePingHandlers
{
    [PacketOpcode(0x1001)]
    public ValueTask<Control> HandleAsync(IPacketContext<Control> context)
    {
        context.Packet.Type = ControlType.PONG;
        return ValueTask.FromResult(context.Packet);
    }
}
```

### 3. Tạo dispatcher

```csharp
PacketDispatchChannel dispatch = new(options =>
{
    options.WithHandler(() => new SamplePingHandlers());
});

dispatch.Activate();
```

### 4. Tạo protocol

Lớp `Protocol` là phần keo nối listener thô với dispatcher thông điệp của bạn. Bạn phải cài đặt `FrameProcessor`, `OpCodeExtractor` và `ProcessMessage`, và có thể tùy chọn ghi đè các hook vòng đời để xử lý lỗi tùy chỉnh.

```csharp
public sealed class SampleProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    private readonly ILogger _logger;

    public SampleProtocol(PacketDispatchChannel dispatch, ILogger logger)
    {
        _dispatch = dispatch;
        _logger = logger;
    }

    public override IFrameProcessor FrameProcessor => DefaultFrameProcessor.Instance;
    public override IOpCodeExtractor OpCodeExtractor => DefaultOpCodeExtractor.Instance;

    public override void ProcessMessage(object? sender, IConnectionEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);

    protected override void OnConnectionError(IConnection connection, Exception ex)
    {
        _logger.Error("Transport error on connection {0}", ex, connection.ConnectionId);
    }

    protected override bool ValidateConnection(IConnection connection)
    {
        // Add custom IP blacklisting or state checks here
        return base.ValidateConnection(connection);
    }
}
```

### 5. Khởi động listener

Khi dùng trực tiếp tầng transport (ngoài Hosting builder), bạn phải đảm bảo mọi dịch vụ cần thiết đã được đăng ký trong `InstanceManager`. Đây là phiên bản thủ công tương đương với những gì `src/Nalix.Hosting/NetworkApplicationBuilder.cs` tự động nối cho bạn.

#### Các phụ thuộc bắt buộc (InstanceManager)

| Dịch vụ | Kiểu | Vai trò |
| :--- | :--- | :--- |
| `ILogger` | `ILogger` | Logging có cấu trúc |
| `IConnectionHub` | `IConnectionHub` | Theo dõi kết nối và thao tác theo lô |
| `IConnectionGuard` | `IConnectionGuard` | Bảo vệ giới hạn tốc độ/quota khi chấp nhận kết nối |
| `TaskManager` | `TaskManager` | Quản lý worker nền |
| `TimingWheel` | `TimingWheel` | Lập lịch timeout nhẹ |
| `ObjectPoolManager` | `ObjectPoolManager` | Quản lý buffer/context có thể tái sử dụng |

```csharp
// Setup dependencies
InstanceManager.Instance.Register<ILogger>(logger);
IConnectionHub hub = new ConnectionHub();
IConnectionGuard guard = new ConnectionGuard();
InstanceManager.Instance.Register<IConnectionHub>(hub);
InstanceManager.Instance.Register<IConnectionGuard>(guard);

// Initialize and Activate
SampleTcpListener listener = new(57206, new SampleProtocol(dispatch, logger), hub, guard);
listener.Activate();
```

## Luồng phía client

Client dùng `Nalix.SDK` để gửi một request có kiểu và chờ phản hồi gọn gàng, không cần quản lý vòng lặp thủ công:

```csharp
using Contracts;
using Nalix.SDK.Transport.Extensions;

// Orchestrated request/response in one line
Control response = await session.RequestAsync<Control>(
    new Control { Type = ControlType.PING },
    options: RequestOptions.Default.WithTimeout(3_000)
);

Console.WriteLine(response.Type); // PONG
```

## Luồng đầu cuối

1. Client gọi `session.RequestAsync<Control>(...)`, gán một `SequenceId` khác không.
2. `TcpListenerBase` chấp nhận socket, đóng khung payload inbound, chạy `FrameProcessor` và gọi `SampleProtocol.ProcessMessage(...)`.
3. `PacketDispatchChannel` giải tuần tự hóa `Control`, gọi `SamplePingHandlers.HandleAsync` và gửi `Control` trả về (`PONG`) qua kết nối.

## Biến thể: gửi thủ công từ handler

Thay vì trả về phản hồi, bạn có thể gửi thủ công:

```csharp
[PacketOpcode(0x1001)]
public async ValueTask Handle(IPacketContext<Control> context)
{
    await context.Sender.SendAsync(new Control { Type = ControlType.PONG }, context.CancellationToken);
}
```

:::warning[Thực hành tốt nhất quan trọng]
Luôn truyền `context.CancellationToken` vào bất kỳ lệnh `await SendAsync()` hoặc I/O nền nào bên trong handler. Method handler phải nhận đúng một tham số `IPacketContext<TPacket>` (thêm tham số `CancellationToken` thứ hai sẽ kích hoạt diagnostic analyzer `NAL013`).
:::

Dùng kiểu này khi:

- bạn muốn gửi nhiều phản hồi
- bạn cần kiểm soát chi tiết hơn thời điểm gửi
- bạn không muốn phụ thuộc vào việc xử lý kiểu trả về

## Điều client nên nhớ

- trả về `Control` là mô hình request/response thông thường đơn giản nhất
- `Protocol.ProcessMessage(...)` là điểm chuyển giao cấp thông điệp vào dispatch
- `src/Nalix.Network/Protocols/Protocol.PublicMethods.cs` cho thấy `OnAccept(...)` là nơi việc nhận TCP bắt đầu sau khi `ValidateConnection(...)` thành công
- **Listener** sở hữu đường frame thô trước khi `Protocol` nhìn thấy một thông điệp đã xử lý
- `PacketDispatchChannel` sở hữu middleware, giải tuần tự hóa, gọi handler và xử lý kết quả
- mẫu tương tự áp dụng cho kiểu gói tin tùy chỉnh nếu bạn thay `Control` bằng hợp đồng gói tin của riêng bạn

## Các trang nên đọc tiếp

- [Packet Dispatch](../../api/runtime/routing/packet-dispatch.md) — tham chiếu API dispatch
- [Handler Return Types](../../api/runtime/routing/handler-results.md) — các dạng kiểu trả về được hỗ trợ
- [TCP Listener](../../api/network/tcp-listener.md) — tham chiếu API listener
