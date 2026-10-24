---
title: Kiến trúc máy chủ mẫu
description: Trang này trình bày một cấu trúc được khuyến nghị cho máy chủ Nalix cấp production — bố cục, thứ tự khởi động và các tùy chọn bạn sẽ cần khi máy chủ lớn hơn một file duy nhất của phần bắt đầu nhanh.
section: Guides
---

Trang này trình bày một cấu trúc được khuyến nghị cho máy chủ Nalix cấp production — bố cục, thứ tự khởi động và các tùy chọn bạn sẽ cần khi máy chủ lớn hơn một file duy nhất của phần bắt đầu nhanh.

---

## Cấu trúc thư mục được khuyến nghị

```text
Server/
├── Bootstrap/           # Service & Dispatch wiring
├── Protocols/           # Transport protocol definitions
├── Handlers/            # Application logic (Controllers)
├── Middleware/          # Security & Policy filters
├── Metadata/            # Custom convention providers
└── Hosting/             # Entry point & Lifecycle management
```

---

## Điểm vào đơn giản nhất

Với hầu hết ứng dụng, hosting builder là tất cả những gì bạn cần — xem chuỗi `CreateBuilder()` cơ bản trong [Bắt đầu nhanh §3](../../quickstart.md#3-viết-máy-chủ). Nó tự động ghép nối cấu hình, dispatch và listener cho bạn. Phần còn lại của trang này bổ sung các vấn đề production nằm xung quanh chuỗi đó.

`DefaultProtocol` (từ `Nalix.Hosting.Protocols`) là một protocol có sẵn, chuyển tiếp mọi gói tin inbound thẳng tới dispatcher — bạn chỉ cần một class protocol tùy chỉnh nếu có logic ở tầng transport vượt ngoài việc đó.

---

## Các bước khởi động

### 1. Cấu hình & Kiểm tra hợp lệ

Nạp và kiểm tra hợp lệ các kiểu tùy chọn chuyên biệt trước khi khởi động runtime. Thất bại sớm tốt hơn một lỗi runtime trong vòng lặp worker.

```csharp
var socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
socket.Validate();

var dispatchOptions = ConfigurationManager.Instance.Get<DispatchOptions>();
dispatchOptions.Validate();

var connectionQuotas = ConfigurationManager.Instance.Get<ConnectionQuotaOptions>();
connectionQuotas.Validate();

var connectionGuard = ConfigurationManager.Instance.Get<ConnectionGuardOptions>();
connectionGuard.Validate();
```

Nếu bạn dùng hosting builder, `src/Nalix.Hosting/NetworkApplicationBuilder.cs` đã làm việc này cho mọi đăng ký `Configure<TOptions>(...)` bằng cách gọi `Validate()` khi kiểu tùy chọn có hỗ trợ nó.

### 2. Khởi tạo registry

Packet registry được xây dựng một lần khi khởi động. Việc này đóng băng danh mục gói tin đã phát hiện (qua source generator) và chuẩn bị nó cho việc giải tuần tự hóa hiệu năng cao. Hosting builder làm việc này tự động trong `app.Build()`; nếu bạn ghép nối thủ công, bạn sẽ tự gọi nó:

```csharp
Nalix.Codec.DataFrames.PacketRegistry.Build();
```

### 3. Thiết lập dispatch & middleware

Thêm middleware và handler tại một nơi tập trung, bằng `ConfigureDispatchOptions` trên builder:

```csharp
builder.ConfigureDispatchOptions(options =>
{
    options
        .WithMiddleware(new RateLimitMiddleware())
        .WithErrorHandling((ex, opcode) =>
        {
            Console.WriteLine($"Error in opcode 0x{opcode:X4}: {ex.Message}");
        });
});
```

:::tip[Tập trung cấu hình]
Giữ mọi `WithMiddleware` và việc đăng ký handler trong một vị trí bootstrap duy nhất. Rải chúng khắp codebase sẽ khiến thứ tự khởi động khó gỡ lỗi.
:::

### 4. Triển khai protocol

Giữ protocol tùy chỉnh mỏng — nó chỉ nên làm cầu nối từ frame thô sang dispatcher. `DefaultProtocol` đã làm đúng điều này:

```csharp
// src/Nalix.Hosting/Protocols/DefaultProtocol.cs (shape)
public sealed class DefaultProtocol : Protocol
{
    private readonly IPacketDispatch _dispatch;

    public DefaultProtocol(ILogger logger, IPacketDispatch dispatch)
    {
        _dispatch = dispatch;
        this.IsAccepting = true;
    }

    public override void ProcessMessage(object? sender, IConnectionEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);
}
```

Mã nguồn đầy đủ: `src/Nalix.Hosting/Protocols/DefaultProtocol.cs`

---

## Quản lý vòng đời

Thứ tự kích hoạt và tắt máy rất quan trọng — nó ngăn các kết nối bị bỏ lửng.

| Giai đoạn | Hành động | Chi tiết |
| --- | --- | --- |
| **Khởi động** | `dispatch.Activate()` | Làm nóng pipeline dispatch trước khi listener bắt đầu nhận lưu lượng. |
| **Khởi động** | `listener.Activate()` | Mở socket và bắt đầu chấp nhận kết nối. |
| **Tắt máy** | `listener.Deactivate()` | Ngừng chấp nhận kết nối và giải phóng tài nguyên transport trước tiên. |
| **Tắt máy** | `protocol.Dispose()` | Dispose protocol sau khi listener đã dừng. |
| **Tắt máy** | `dispatch.Deactivate()` | Dừng pipeline dispatch sau listener. |

Thứ tự này lấy trực tiếp từ `src/Nalix.Hosting/NetworkApplication.cs`, nơi `ActivateAsync()` kích hoạt dispatch rồi mới khởi động listener; `DeactivateAsync()` đảo ngược thứ tự đó và chờ các nhóm task `"net/*"` và `"time/*"` hoàn tất.

`RunAsync()` của hosting builder thực hiện tất cả việc này cho bạn — `app.RunAsync(cts.Token)` gọi `ActivateAsync()`, chờ cancellation, rồi gọi `DeactivateAsync()`.

---

## Bề mặt chẩn đoán

Mọi thành phần cốt lõi đều cài đặt `IReportable`, cho bạn cách kiểm tra tình trạng nội bộ mà không cần admin API:

- `GenerateReport()` — chuỗi dễ đọc cho log hoặc CLI.
- `WriteReportData(Utf8JsonWriter)` — đầu ra JSON cho API giám sát hoặc dashboard.

Có sẵn trên `IListener` (trạng thái transport và bộ đếm), `IProtocol` (bộ đếm phía protocol) và `IPacketDispatch` (trạng thái dispatch và áp lực channel). Ngay cả khi không có endpoint quản trị riêng, việc ghi log các báo cáo này định kỳ trong lúc lưu lượng cao vẫn đáng làm.

---

## Tự ghép nối thủ công (không dùng Hosting Builder)

:::warning[Chỉ dành cho nâng cao]
Chỉ dùng đường này khi bạn cần bỏ qua hoàn toàn tầng hosting — ví dụ, để xây dựng một thư viện transport chuyên biệt. Khi ghép nối thủ công, bạn phải tự nối pipeline dispatch, protocol và listener theo đúng thứ tự mà hosting builder dùng bên trong.
:::

```csharp
PacketDispatchChannel dispatch = new(options =>
{
    options.WithHandler(() => new HelloHandlers());
});

dispatch.Activate();
// ... construct and activate your listener with `dispatch` wired in ...
```

Xem [Ghép nối thủ công (không Hosting)](../../concepts/internals/minimal-server.md) để có hướng dẫn chi tiết mức thấp đầy đủ.

---

## Danh mục thực hành tốt nhất

- Định nghĩa các hợp đồng gói tin dùng chung trong project riêng, được cả server và client tham chiếu.
- Ghi log qua `ILogger`, không dùng `Console.WriteLine`, khi bạn đã rời giai đoạn bắt đầu nhanh.
- Kiểm tra hợp lệ mọi kiểu tùy chọn khi khởi động (xem [Cấu hình & Kiểm tra hợp lệ](#1-cấu-hình--kiểm-tra-hợp-lệ)).
- Giữ protocol tùy chỉnh mỏng — chuyển tiếp sang dispatcher, đừng nhúng logic ứng dụng vào đó.

## Các trang nên đọc tiếp

- [Danh mục kiểm tra Production](../deployment/production-checklist.md)
- [Tùy chỉnh Middleware](../extensibility/custom-middleware.md)
- [TCP Request/Response](../networking/tcp-patterns.md)
