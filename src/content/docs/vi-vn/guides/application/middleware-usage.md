---
title: Sử dụng Middleware
description: Dùng hướng dẫn này khi bạn cần triển khai chính sách yêu cầu, thực thi bảo mật hoặc khả năng quan sát trong ứng dụng Nalix của mình.
section: Guides
---

Dùng hướng dẫn này khi bạn cần triển khai chính sách yêu cầu, thực thi bảo mật hoặc khả năng quan sát trong ứng dụng Nalix của mình.

## Khái niệm cốt lõi

Trong Nalix, middleware được tổ chức trong **`MiddlewarePipeline`**. Pipeline này hoạt động trên các gói tin đã giải tuần tự hóa (`IPacketContext<TPacket>`), cho phép bạn đưa ra quyết định dựa trên cả dữ liệu gói tin lẫn metadata đã phân giải của handler. Một frame đến được giải tuần tự hóa thành gói tin, đi qua `MiddlewarePipeline`, rồi mới được chuyển đến handler của bạn.

## Khi nào dùng Middleware

Dùng middleware khi bạn cần thực thi logic áp dụng cho nhiều loại gói tin hoặc nhiều handler khác nhau.

Các trường hợp điển hình:

- **Kiểm tra quyền**: Chặn yêu cầu dựa trên trạng thái kết nối hoặc mức xác thực.
- **Quy tắc timeout**: Hủy việc thực thi handler nếu chạy quá lâu.
- **Giới hạn tốc độ**: Giới hạn yêu cầu để chống spam.
- **Giới hạn đồng thời**: Ngăn quá nhiều lần thực thi đồng thời của các handler nặng.
- **Kiểm toán và theo dõi**: Ghi log chi tiết yêu cầu phục vụ gỡ lỗi hoặc tuân thủ.

## Thứ tự xây dựng an toàn

Với đa số dự án, middleware thường phát triển gọn gàng theo thứ tự sau:

1. Bắt đầu với một middleware đơn giản (ví dụ ghi log).
2. Chỉ thêm chính sách dựa trên metadata (dùng Attribute) khi các quy tắc lặp lại xuất hiện ở nhiều handler khác nhau.
3. Giữ middleware tập trung — ưu tiên nhiều middleware cụ thể hơn là một middleware "thần thánh" khổng lồ.

## Ví dụ: Đăng ký Middleware

```csharp
PacketDispatchChannel dispatch = new(options =>
{
    options.WithMiddleware(new PermissionMiddleware())
           .WithMiddleware(new SampleAuditMiddleware<IPacket>())
           .WithHandler(() => new SamplePingHandlers());
});
```

## Xử lý mức thấp (không qua Middleware)

Nếu bạn cần thực hiện các hành động trên byte thô (như giải mã hoặc biến đổi tùy chỉnh) trước khi chúng trở thành gói tin, logic này được xử lý bởi **`Protocol`** và **`FramePipeline`** trong tầng transport, chứ không phải `MiddlewarePipeline`.

## Lỗi thường gặp

- Đặt quá nhiều chính sách không liên quan vào một middleware.
- Thêm metadata tùy chỉnh khi chưa chứng minh được là cần thiết.
- Quên rằng thứ tự thực thi middleware được sắp xếp tăng dần theo `[MiddlewareOrder(int)]` (mặc định `0`, giữ nguyên thứ tự đăng ký khi bằng nhau), và được đảo ngược ở chiều đi ra khi bật `ExecuteOnOutbound`.

## Các mẫu mặc định tốt

Với lưu lượng công khai, một thiết lập khởi đầu tốt là:

- `ConnectionGuard` ở tầng transport để kiểm soát cho phép kết nối sớm.
- `PermissionMiddleware` để bảo đảm chỉ client được ủy quyền mới tới được handler.
- `RateLimitMiddleware` để bảo vệ tài nguyên.

## Đọc tiếp

- [Hướng dẫn Custom Middleware](../extensibility/custom-middleware.md)
- [Custom Metadata Providers](../extensibility/metadata-providers.md)
- [Handlers and Middleware](../../concepts/handlers-and-middleware.md)
- [Middleware Pipeline API](../../api/runtime/middleware/pipeline.md)
