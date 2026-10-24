---
title: Máy chủ UDP
description: Hướng dẫn này cho bạn biết khi nào nên dùng UdpListenerBase và bạn cần triển khai những gì trước tiên.
section: Guides
---

Hướng dẫn này cho bạn biết khi nào nên dùng `UdpListenerBase` và bạn cần triển khai những gì trước tiên.

Hãy dùng nó khi bạn đã quyết định UDP là transport phù hợp, nhưng muốn có cấu trúc máy chủ tối thiểu và an toàn nhất trước khi bổ sung thêm logic game hoặc telemetry.

## Khi nào UDP phù hợp

Hãy chọn UDP khi bạn quan tâm nhiều hơn đến:

- độ trễ thấp
- khả năng chịu mất gói
- datagram nhẹ
- telemetry, đồng bộ trạng thái, khám phá dịch vụ, hoặc các giao thức thời gian thực tùy chỉnh

Hãy chọn TCP khi bạn cần các luồng byte có thứ tự và đáng tin cậy theo mặc định.

## Hình dạng tối thiểu

```csharp
public sealed class SampleUdpListener : UdpListenerBase
{
    public SampleUdpListener(ushort port, IProtocol protocol, IConnectionHub hub)
        : base(port, protocol, hub) { }

    public override bool IsAuthenticated(IConnection connection, EndPoint remoteEndPoint, ReadOnlySpan<byte> payload)
        => true;
}
```

Các hàm khởi tạo hiện tại của `UdpListenerBase` yêu cầu `IConnectionHub` quản lý
bản đồ phiên dùng cho việc phân giải token UDP. Hosting builder sẽ tự cấu hình điều này
cho bạn; các máy chủ low-level thủ công phải truyền nó một cách tường minh.

Đó là bề mặt tối thiểu, nhưng một máy chủ UDP thực tế vẫn cần có cách quản lý phiên, cách xác thực và cách chẩn đoán.

## Những gì bạn cần quyết định

### 1. Xác thực

`IsAuthenticated(...)` là điểm móc (hook) chính sách UDP ở tầng ứng dụng đầu tiên, sau khi
runtime đã phân giải kết nối từ token phiên 8 byte.

Hãy dùng nó để:

- kiểm tra danh tính nguồn
- từ chối các datagram giả mạo hoặc sai định dạng
- chặn lưu lượng cho đến khi biết token bắt tay hoặc bí mật phiên

:::tip
Nếu bạn dùng `NetworkApplication` (tầng Hosting), bạn không cần kế thừa `UdpListenerBase` chỉ để xác thực. Hãy cung cấp một predicate khi cấu hình builder, trước `Build()`:
```csharp
using var app = NetworkApplication.CreateBuilder()
    .MapTcp<MyProtocol>().OnPort(57206).Bind()
    .MapUdp<MyProtocol>().OnPort(57206).WithAuthentication((connection, endpoint, payload) =>
        connection.Level >= PermissionLevel.USER).Bind()
    .Build();
```
:::

### 2. Hành vi giao thức

Hãy quyết định giao thức của bạn sẽ:

- xử lý datagram trực tiếp
- chuyển các thông điệp đã giải mã vào logic game hoặc ứng dụng của riêng bạn
- chia sẻ một số ngữ nghĩa với giao thức TCP của bạn

Với đa số đội, mô hình dễ nhất là:

- dùng TCP để thiết lập trạng thái phiên
- dùng UDP để truyền các datagram nhanh đã xác thực
- giữ cả hai đường đi gắn với cùng một `ConnectionHub`

Runtime hiện tại mong đợi các datagram UDP tham chiếu tới một kết nối đã có trong `ConnectionHub`, mang tiền tố token phiên 8 byte, và kết thúc bằng thẻ xác thực `XxHash32` 4 byte được kiểm tra với `connection.Secret`.

### 3. Tinh chỉnh lúc chạy

Hãy bắt đầu với:

- `NetworkSocketOptions.Port`
- `NetworkSocketOptions.BufferSize`
- `NetworkSocketOptions.MaxParallelUDP`
- `NetworkSocketOptions.MaxUdpDatagramSize` (mặc định `1440` byte)

Cũng hãy chủ động cấu hình `DatagramGuardOptions` (`MaxPacketPerSecond`, `IPv4Windows`, `IPv6Windows`) và hành vi timeout khi nhàn rỗi (`TimingWheelOptions`) cho triển khai của bạn.

## Thứ tự khởi động khuyến nghị

Thứ tự khởi động an toàn nhất là:

1. Khởi tạo các manager lõi (`ObjectPoolManager`, `BufferPoolManager`)
2. Kiểm tra hợp lệ các tùy chọn socket và dispatch
3. Đăng ký logger và xây dựng `PacketRegistry`
4. Xây dựng dispatch channel (`PacketDispatchChannel`)
5. Xây dựng protocol handler
6. Xây dựng `UdpListenerBase`
7. Kích hoạt dispatch, sau đó kích hoạt listener

Cách này giúp thiết lập transport và thiết lập ứng dụng luôn đồng bộ với nhau.

## Chẩn đoán có sẵn

`UdpListenerBase.GenerateReport()` đã theo dõi sẵn:

- số gói và số byte nhận được
- các gói bị loại vì quá ngắn (`DroppedShort`)
- các gói bị loại vì chưa xác thực (`DroppedUnauth`)
- các gói bị loại vì token phiên không xác định (`DroppedUnknown`)
- các gói bị loại vì vượt giới hạn tốc độ hoặc quá kích thước (`DroppedRateLimited`, `DroppedOversize`)
- lỗi nhận (`ReceiveErrors`)

## Mẫu thông dụng

Để dễ hình dung cho phía client, mô hình tư duy đơn giản nhất là:

```text
receive datagram (minimum 18 bytes: 8B SessionToken + 6B PacketHeader + 4B XxHash32 MAC)
  -> rate-limit by remote IP (DatagramGuard)
  -> copy socket buffer into a BufferLease (lease.IsReliable = false)
  -> require 8-byte SessionToken prefix and at least 6-byte PacketHeader
  -> resolve the connection through IConnectionHub
  -> verify non-zero connection.Secret and 4-byte trailing XxHash32 MAC tag
  -> strip 4-byte MAC tag and verify pinned endpoint (IsPinnedEndpointMatch)
  -> check the UDP replay window sequence (UdpReplayWindow.TryCheck)
  -> run IsAuthenticated(...) or the Hosting WithAuthentication predicate
  -> bind UDP transport and dispatch payload to the protocol
```

## Những điều đội thường bỏ sót

- UDP không nên tạo ra một mô hình danh tính thứ hai tách biệt khỏi phiên TCP
- các lần loại bỏ do chưa xác thực cần hiển thị trong chẩn đoán
- `IsAuthenticated(...)` nên luôn nhanh và có tính xác định
- bố cục datagram là `[8-byte SessionToken][Payload][4-byte XxHash32 MAC]` (tối thiểu **18 byte**: `SessionTokenSize (8) + PacketHeader.Size (6) + UdpMacTagSize (4)`)
- Payload bắt đầu bằng định dạng `PacketHeader` 6 byte chuẩn của Nalix (`[OpCode(2), Flags(1), Priority(1), SequenceId(2)]`) hoặc bằng một cờ transform `FramePipeline` 1 byte, theo sau là payload đã transform

## API liên quan

- [Bộ lắng nghe UDP](../../api/network/udp-listener.md)
- [Phiên UDP](../../api/sdk/udp-session.md)
- [Giao thức](../../api/network/protocol.md)
- [Luồng xác thực UDP](./udp-security.md)
- [Kiến trúc bảo mật](../../concepts/internals/security-architecture.md)
