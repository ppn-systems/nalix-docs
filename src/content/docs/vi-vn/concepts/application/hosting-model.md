---
title: Mô hình hosting
description: Mô hình Hosting của Nalix là một lớp trừu tượng cấp cao, được thiết kế để quen thuộc với lập trình viên .NET. Nó cung cấp quy trình builder/build/run xoay quanh đăng ký gói tin, cấu hình dispatch c...
section: Concepts
---

Mô hình Hosting của Nalix là một lớp trừu tượng cấp cao, được thiết kế để quen thuộc với lập trình viên .NET. Nó cung cấp quy trình builder/build/run xoay quanh việc đăng ký gói tin, cấu hình dispatch và gắn listener.

## NetworkApplication

Trung tâm của mô hình hosting là `NetworkApplication`. Đây là điểm vào điều phối vòng đời của máy chủ, quản lý các listener, container DI và pipeline middleware.

### Mẫu Builder

Bạn cấu hình ứng dụng bằng `NetworkApplicationBuilder`. Cách này cho phép thiết lập theo kiểu fluent, dễ đọc:

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

var builder = NetworkApplication.CreateBuilder();

builder.UseSecureConnections("path/to/certificate.private")
       .Configure<NetworkSocketOptions>(options => options.Port = 8080)
       .MapHandlers<MyHandlers>()
       .MapTcp<MyProtocol>()
       .Bind();

var app = builder.Build();

await app.RunAsync();
```

## Vòng đời ứng dụng

Mô hình hosting quản lý bốn giai đoạn chính trong vòng đời của máy chủ:

1. **Bootstrap**: Tải cấu hình, đăng ký logger / pool / packet registry và khởi tạo định danh handshake.
2. **Startup**: Tạo bộ điều phối gói tin và mở các listener TCP hoặc UDP.
3. **Runtime**: Chấp nhận kết nối, dispatch gói tin và quản lý trạng thái phiên.
4. **Shutdown**: Dừng các listener và giải phóng tài nguyên runtime thông qua `NetworkApplication`.

Trong `Build()`, `NetworkApplicationBuilder` áp dụng mọi `Configure<TOptions>(...)` đã đăng ký, đảm bảo tồn tại một `IConnectionHub` và một buffer pool manager (tạo mặc định nếu bạn không gọi `UseConnectionHub`/`UseBufferPoolManager`), khởi tạo xử lý handshake, rồi mới tạo bộ điều phối và các listener — theo đúng thứ tự đó.

## Vì sao nên dùng mô hình Hosting?

Dù bạn có thể dùng trực tiếp các API cấp thấp của `Nalix.Network`, mô hình Hosting mang lại nhiều lợi ích có sẵn:

- **Thiết lập fluent**: Việc gắn listener, khám phá gói tin và cấu hình dispatch nằm chung trong một builder.
- **Cấu hình**: Các tùy chọn có kiểu mạnh được áp dụng qua `Configure<TOptions>(...)`.
- **Đăng ký tường minh**: Handler được đăng ký bằng `MapHandlers<THandler>()` để dispatch do source generator sinh ra.
- **Logging**: Ghi log tích hợp qua các abstraction `ILogger`.

## Chủ đề liên quan

- [Instance Manager](../../api/framework/instance-manager.md)
- [Middleware Pipeline](../internals/middleware-pipeline.md)
- [Hướng dẫn thiết lập máy chủ](../../guides/getting-started/server-blueprint.md)
