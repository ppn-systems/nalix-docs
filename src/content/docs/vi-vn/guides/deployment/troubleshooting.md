---
title: Xử lý sự cố
description: Trang này tập hợp các lỗi cấu hình Nalix thường gặp nhất và những nơi nhanh nhất để kiểm tra trước.
section: Guides
---

Trang này tập hợp các lỗi cấu hình Nalix thường gặp nhất và những nơi nhanh nhất để kiểm tra trước.

Hãy dùng nó sau khi cấu trúc máy chủ cơ bản đã có và runtime vẫn chưa hoạt động như bạn mong đợi.

## 1. Máy chủ khởi động nhưng không có gói tin nào tới handler

**Triệu chứng**

- client kết nối được
- không có log handler xuất hiện
- không có phản hồi nào được gửi

**Kiểm tra trước**

- `PacketRegistry.Build()` được gọi sau khi mọi assembly gói tin đã được nạp
- class handler của bạn thực sự được đăng ký bằng `WithHandler(...)`
- các method handler có `[PacketOpcode(...)]` đúng
- **Listener** là điểm vào xử lý biến đổi frame thô (Pipeline), còn `ProcessMessage(...)` xử lý payload thông điệp đã làm sạch

**Cách sửa nhanh**

Hãy thử đúng mẫu sau trước:

```csharp
public override void ProcessMessage(object? sender, IConnectionEventArgs args)
    => _dispatch.HandlePacket(args.Lease, args.Connection);
```

## 2. Client kết nối rồi ngắt ngay lập tức

**Triệu chứng**

- kết nối TCP thành công
- kết nối đóng ngay sau lưu lượng đầu tiên

**Kiểm tra trước**

- `Protocol.ValidateConnection(...)`
- `Protocol.IsAccepting`
- log của listener về các lần `ConnectionGuard` từ chối
- middleware nào đó ngắt sớm trước khi tới handler

**Cách sửa nhanh**

- tạm thời đặt `ValidateConnection(...) => true`
- tắt từng middleware tùy chỉnh một
- kiểm tra `listener.GenerateReport()` và `protocol.GenerateReport()`

## 3. Kết nối nhàn rỗi bị đóng quá sớm

**Triệu chứng**

- kết nối chết sau một khoảng thời gian yên lặng

**Kiểm tra trước**

- `TimingWheelOptions.IdleTimeoutMs`
- `connection.ExcludeFromIdleTimeout`
- việc ứng dụng của bạn có cần các khoảng im lặng dài mà không có `TransportOptions.KeepAliveIntervalMillis` hay không

**Cách sửa nhanh**

- tăng `TimingWheelOptions.IdleTimeoutMs`
- hoặc đặt `connection.ExcludeFromIdleTimeout = true` cho các kết nối dịch vụ sống lâu

## 4. Một client ồn ào làm chậm toàn bộ hệ thống

**Triệu chứng**

- độ trễ tăng vọt
- hàng đợi chờ tăng dần
- nhiều gói tin bị từ chối từ cùng một endpoint

**Kiểm tra trước**

- `DispatchOptions`
- `ConnectionQuotaOptions`
- `ConnectionGuardOptions`
- `ConnectionGuard.GenerateReport()`
- `PacketDispatchChannel.GenerateReport()`

**Cách sửa nhanh**

- giới hạn kích thước hàng đợi trên mỗi kết nối
- giảm áp lực từ kết nối lạm dụng bằng `ConnectionGuard`
- thêm middleware giới hạn tốc độ ở mức gói tin

## 5. Middleware chạy, nhưng metadata tùy chỉnh bị thiếu

**Triệu chứng**

- `context.Attributes.GetCustomAttribute<T>()` trả về null

**Kiểm tra trước**

- method handler được gắn attribute tùy chỉnh
- class `[PacketController]` chứa handler được đăng ký bằng `MapHandlers<T>()`
- source generator `PacketHandlerGenerator` đã chạy thành công lúc build

Các attribute tùy chỉnh trên method handler được source generator thu thập lúc biên dịch và lưu trong `PacketMetadata.CustomAttributes`. Nếu generator không xử lý controller, attribute sẽ không có sẵn lúc chạy.

## 6. Gói UDP bị loại bỏ

**Triệu chứng**

- lưu lượng UDP đến được socket nhưng bị bỏ qua

**Kiểm tra trước**

- datagram có tiền tố session token 8 byte và payload
- session tồn tại trong `ConnectionHub`
- callback xác thực binding UDP trả về `true`
- connection secret đã được khởi tạo

**Cách sửa nhanh**

Bắt đầu với:

1. thiết lập session qua TCP
2. đảm bảo kết nối được lưu trong `ConnectionHub`
3. chỉ gửi datagram UDP sau khi thiết lập session hoàn tất, với tiền tố session token đã có mặt

## 7. Handler trả về nhưng không có phản hồi nào được gửi

**Triệu chứng**

- handler được gọi
- client không nhận được gì

**Kiểm tra**

- kiểu trả về có được các return handler của Nalix hỗ trợ không
- `context.Connection.TCP` có hợp lệ không
- bạn có đang trộn lẫn việc gửi thủ công với hành vi đường trả về kỳ vọng một cách sai không

**Cách sửa nhanh**

Với đường đơn giản nhất, hãy trả về `TPacket` hoặc `Task<TPacket>`.

Nếu bạn cần kiểm soát thủ công, dùng `IPacketContext<TPacket>` và gửi qua `context.Sender`.
Khuyến nghị này cũng áp dụng cho các handler gói tin tùy chỉnh, không chỉ bộ gói tin có sẵn.

## Các báo cáo runtime hữu ích nên gọi

Khi gỡ lỗi, những thứ sau thường cho tín hiệu nhanh nhất:

- `listener.GenerateReport()`
- `protocol.GenerateReport()`
- `connectionHub.GenerateReport()`
- `connectionGuard.GenerateReport()`
- `packetDispatchChannel.GenerateReport()`
- `tokenBucketLimiter.GenerateReport()`

## Các trang nên đọc tiếp

- [Hướng dẫn TCP Patterns](../networking/tcp-patterns.md)
- [Hướng dẫn Bảo mật UDP](../networking/udp-security.md)
- [Kiểu trả về của Handler](../../api/runtime/routing/handler-results.md)
