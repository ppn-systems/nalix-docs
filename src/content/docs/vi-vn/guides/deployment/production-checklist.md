---
title: Danh mục kiểm tra Production
description: Dùng danh mục này trước khi xem máy chủ Nalix của bạn đã sẵn sàng cho production.
section: Guides
---

Dùng danh mục này trước khi xem máy chủ Nalix của bạn đã sẵn sàng cho production.

Mục tiêu không phải là sự hoàn hảo. Mục tiêu là phát hiện các điểm lỗi sẽ xuất hiện khi lưu lượng thực bắt đầu đổ về.

Hãy xem đây là một cổng kiểm soát phát hành, không phải phần giới thiệu chung về framework.

## 1. Khởi động và cấu hình

Bắt đầu bằng việc xác nhận các kiểu tùy chọn quan trọng được nạp và kiểm tra hợp lệ khi khởi động:

- `NetworkSocketOptions`
- `DispatchOptions`
- `ConnectionQuotaOptions`
- `ConnectionGuardOptions`
- `ConnectionBanStoreOptions`
- `ConnectionBlacklistStoreOptions`
- `TrustedProxyOptions`
- `ConnectionHubOptions`
- `TimingWheelOptions`
- `NetworkCallbackOptions`

Nếu bạn bỏ qua việc kiểm tra trên các kiểu có hỗ trợ, các giá trị sai thường gây lỗi về sau và khó hiểu hơn.

## 2. Dịch vụ dùng chung

Đảm bảo các dịch vụ sau được đăng ký một lần và sớm:

- `ILogger`
- `PacketRegistry.Build()` được gọi sau khi assembly được nạp
- mọi dịch vụ ứng dụng mà handler của bạn phụ thuộc vào

Đồng thời đảm bảo máy chủ và client thống nhất với nhau về danh mục gói tin và các giả định của registry.

## 3. An toàn cho listener

Trước khi ra mắt, hãy kiểm tra:

- `TcpListenerBase` hoặc `UdpListenerBase` khởi động thành công
- `GenerateReport()` hoạt động
- cổng lắng nghe và backlog đúng
- `TimingWheelOptions.IdleTimeoutMs` (và `connection.ExcludeFromIdleTimeout` với các kết nối được miễn) khớp với kỳ vọng về hành vi nhàn rỗi thực tế
- nếu `ProxyProtocolOptions.Enabled` là `true`, thì `RequireTrustedProxy` cũng phải là `true` và IP của load balancer phải nằm trong `TrustedProxyOptions` — mặc định là `false`, cho phép bất kỳ client nào giả mạo IP để vượt qua ban và giới hạn tốc độ ([chi tiết](../../api/options/network/proxy-protocol-options.md#ghi-chú-bảo-mật))
- nếu `ForwardedHeadersOptions.Enabled` là `true`, reverse proxy phải ghi đè hoặc xóa các header `CF-Connecting-IP` / `X-Real-IP` / `X-Forwarded-For` do client gửi lên ([chi tiết](./reverse-proxy-tls.md))

## 4. An toàn cho dispatch

Xác nhận dispatcher:

- đăng ký đầy đủ mọi handler cần thiết
- đăng ký middleware theo đúng thứ tự dự kiến
- sử dụng xử lý lỗi tường minh
- có thể tạo `GenerateReport()`

Nếu dispatcher là trung tâm của ứng dụng, hãy coi việc thiếu xử lý lỗi là một lý do chặn phát hành.

## 5. Thiết kế handler

Rà soát handler về:

- `[PacketOpcode]` đúng
- kiểu gói tin đúng
- kiểu trả về phù hợp
- không có công việc chặn (blocking) tốn kém ẩn bên trong
- sử dụng tường minh `IPacketContext<TPacket>` trong handler, và chỉ thảo luận trực tiếp về `PacketContext<TPacket>` khi chi tiết nội bộ của runtime thực sự quan trọng

Nếu một handler thực hiện I/O chậm hoặc tính toán tốn kém, hãy quyết định nó có cần:

- metadata timeout
- giới hạn tốc độ
- giới hạn đồng thời

## 6. Kiểm soát throttling và lạm dụng

Trước khi đưa lên production, hãy chủ động quyết định bạn muốn dùng những thành phần nào sau đây:

- `ConnectionGuard`
- `TokenBucketLimiter`
- `PolicyRateLimiter`

Tối thiểu, hầu hết máy chủ công khai nên có:

- kiểm soát chấp nhận kết nối
- ít nhất một chiến lược bảo vệ tốc độ/đồng thời ở mức gói tin

## 7. Rà soát middleware

Xác nhận hành vi middleware dễ dự đoán:

- middleware inbound được sắp xếp đúng thứ tự
- hành vi outbound là có chủ đích
- các đường ngắt sớm (short-circuit) gửi phản hồi điều khiển hữu ích khi phù hợp
- metadata tùy chỉnh mà middleware sử dụng thực sự đã được đăng ký

Middleware tốt cho production nên:

- nhỏ gọn
- mang tính xác định (deterministic)
- quan sát được qua log

## 8. Pool và áp lực bộ nhớ

Dung lượng pool ở tầng mạng (accept context, socket args, receive context, timeout task, transport, connection) được suy ra nội bộ từ `ConnectionGuardOptions.MaxConnections`. Hãy đặt tùy chọn này bằng số kết nối đồng thời cao điểm dự kiến.

Một quy tắc kinh nghiệm hữu ích:

- `Capacity` nên phản ánh mức sử dụng cao điểm
- `Preallocate` nên phản ánh mức sử dụng ổn định khi đã khởi động

Quá thấp:

- nhiều cấp phát hơn
- áp lực GC cao hơn

Quá cao:

- chiếm bộ nhớ không cần thiết

## 9. Bảo vệ trước lũ callback

Nếu bạn dự kiến có lưu lượng từ internet, hãy rà soát:

- `MaxPendingNormalCallbacks`
- `MaxPendingPerIp`
- `CallbackWarningThreshold`

Các giá trị này bảo vệ đường callback trước hiện tượng lũ và đáng để đặt có chủ đích.

## 10. Khả năng quan sát

Trước khi đưa lên production, hãy đảm bảo bạn lấy được:

- báo cáo listener
- báo cáo protocol
- báo cáo connection hub
- báo cáo dispatch
- báo cáo limiter/gate khi cần thiết

Nếu việc gỡ lỗi cần đính kèm debugger chỉ để biết trạng thái cơ bản của hệ thống, thì khả năng quan sát vẫn còn quá yếu.

## 11. Kiểm tra riêng cho UDP

Nếu UDP được bật, hãy xác nhận:

- danh tính phiên được thiết lập trước khi tin tưởng lưu lượng UDP
- connection secret đã được khởi tạo
- các giả định về replay window là chấp nhận được
- `IsAuthenticated(...)` thực hiện đúng các kiểm tra
- việc loại bỏ gói chưa xác thực và gói thuộc phiên không xác định có thể quan sát được trong chẩn đoán

## 12. Diễn tập lỗi

Hãy chạy ít nhất các diễn tập sau một lần:

- opcode gói tin sai
- gói tin bị lỗi cấu trúc
- idle timeout
- limiter từ chối
- dispatcher thiếu handler
- xác thực UDP thất bại

Bạn không cần một môi trường chaos hoàn hảo. Bạn chỉ cần bằng chứng rằng chế độ lỗi có thể hiểu được.

## 13. Danh mục phát hành

Danh mục ngắn cuối cùng:

- mọi tùy chọn khởi động đều hợp lệ
- báo cáo được tạo mà không bị crash
- handler và middleware được đăng ký có chủ đích
- các kiểm soát lạm dụng đã được bật
- logging vẫn dùng được khi có lỗi
- các giá trị timeout được đặt có chủ đích
- đường khởi động và tắt máy chủ đã được kiểm thử

## Lượt kiểm tra hợp lệ mẫu

Chạy một smoke test ngắn trước khi phát hành:

```csharp
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
socket.Validate();

listener.Activate(ct);
Console.WriteLine(listener.GenerateReport());
Console.WriteLine(dispatch.GenerateReport());
Console.WriteLine(connectionHub.GenerateReport());

listener.Deactivate(ct);
```

`Activate(...)` và `Deactivate(...)` trên listener là các lời gọi vòng đời đồng bộ. Điểm vào bất đồng bộ dành cho host là `NetworkApplication.RunAsync(...)`.

## Ví dụ minh họa

Áp dụng danh mục vào thực tế: một handler với hợp đồng tường minh, giới hạn tốc độ và xử lý lỗi được nối qua hosting builder.

```csharp
// samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class HelloRequestPacket
    : PacketBase<HelloRequestPacket>, IFixedSizeSerializable, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7001;

    [SerializeOrder(0)]
    public byte Greeting { get; set; }
}
```

```csharp
// samples/HelloWorld/HelloWorld.Server/Program.cs, mở rộng với các yêu cầu production
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseLogger(logger)
    .MapHandlers(typeof(HelloHandlers))
    .ConfigureDispatchOptions(options =>
    {
        options
            .WithMiddleware(new RateLimitMiddleware())
            .WithErrorHandling((ex, opcode) =>
                logger.Error($"Unhandled error in opcode 0x{opcode:X4}", ex));
    })
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .Build();

await app.RunAsync(cts.Token);
```

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs`, `samples/HelloWorld/HelloWorld.Server/Program.cs`

Ở phía client, hãy đặt timeout tường minh cho mọi request thay vì dựa vào giá trị mặc định:

```csharp
// samples/HelloWorld/HelloWorld.Client/Program.cs
HelloResponsePacket response = await session.RequestAsync<HelloResponsePacket>(
    request,
    RequestOptions.Default.WithTimeout(5_000));
```

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Client/Program.cs`

Việc dọn dẹp tài nguyên của buffer lease được xử lý tự động khi bạn dùng `IPacketContext<T>` trong handler — bạn không cần tự dispose bất cứ thứ gì.

## Các trang nên đọc tiếp

- [Kiến trúc máy chủ mẫu](../getting-started/server-blueprint.md)
- [Hướng dẫn xử lý sự cố](./troubleshooting.md)
- [API Network Options](../../api/options/network/options.md)
