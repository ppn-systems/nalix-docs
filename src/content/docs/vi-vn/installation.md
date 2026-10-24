---
title: Cài đặt
description: Trang này hướng dẫn cách chọn đúng các package Nalix cho project của bạn và kiểm tra môi trường có đáp ứng các yêu cầu tiên quyết hay không.
section: Start Here
---

Trang này hướng dẫn cách chọn đúng các package Nalix cho project của bạn và kiểm tra môi trường có đáp ứng các yêu cầu tiên quyết hay không.

## Yêu cầu tiên quyết

| Yêu cầu | Tối thiểu |
|---|---|
| **.NET SDK** | 10.0 trở lên ([tải về](https://dotnet.microsoft.com/download)) |
| **Phiên bản ngôn ngữ C#** | 14 (mặc định với .NET 10) |
| **IDE** | Visual Studio 2026, JetBrains Rider 2025.3+, hoặc VS Code với C# Dev Kit |

## Chọn bộ package

Chỉ cài các package cần thiết cho vai trò của bạn. Mọi package đều có sẵn trên [NuGet](https://www.nuget.org/packages?q=Nalix).

### Máy chủ (hosted — khuyến nghị)

Mô hình máy chủ hosted cung cấp một builder kiểu fluent và vòng đời được quản lý sẵn. Đây là điểm bắt đầu được khuyến nghị cho các project mới.

```bash
dotnet add package Nalix.Hosting
```

`Nalix.Hosting` tham chiếu bắc cầu đến `Nalix.Network`, `Nalix.Runtime`, `Nalix.Framework`, `Nalix.Codec`, `Nalix.Environment` và `Nalix.Abstractions`.

### Máy chủ (kết nối thủ công)

Nếu bạn cần toàn quyền kiểm soát thứ tự khởi động mà không dùng hosting builder:

```bash
dotnet add package Nalix.Network
dotnet add package Nalix.Runtime
dotnet add package Nalix.Framework
dotnet add package Nalix.Codec
dotnet add package Nalix.Environment
dotnet add package Nalix.Abstractions
```

### Client

```bash
dotnet add package Nalix.SDK
```

`Nalix.SDK` tham chiếu bắc cầu đến `Nalix.Codec`, `Nalix.Environment` và `Nalix.Abstractions`.

### Contract dùng chung

Nếu định nghĩa gói tin của bạn nằm trong một assembly riêng:

```bash
dotnet add package Nalix.Abstractions
dotnet add package Nalix.Codec
```

### Tóm tắt

| Tình huống | Package |
| :--- | :--- |
| Máy chủ hosted | `Nalix.Hosting` |
| Máy chủ thủ công | `Nalix.Network`, `Nalix.Runtime`, `Nalix.Framework`, `Nalix.Codec`, `Nalix.Environment`, `Nalix.Abstractions` |
| Client | `Nalix.SDK` |
| Contract dùng chung | `Nalix.Abstractions`, `Nalix.Codec` |
| Toàn bộ stack | Bộ máy chủ + bộ client, dùng chung một assembly contract |

## Giải pháp nhiều project

Nếu bạn tách contract, máy chủ và client thành các project riêng (xem [Bắt đầu nhanh](./quickstart.md) để biết cách tổ chức), hãy ghim phiên bản package Nalix một lần trong `Directory.Build.props` ở thư mục gốc thay vì lặp lại ở từng project. Cách này giúp tránh việc máy chủ và client lệch phiên bản:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <NalixVersion>$(VersionFromYourReleasePlan)</NalixVersion>
  </PropertyGroup>
</Project>
```

Khi nâng cấp, hãy tăng `NalixVersion`, xóa `obj`/`bin` nếu các contract được sinh mã nguồn đã thay đổi, rồi chạy `dotnet build` để xác nhận mọi project đã đồng bộ.

## Tệp cấu hình

Khi dùng `Nalix.Hosting`, `Bootstrap.Initialize()` đặt `NALIX_BASE_PATH` thành `AppContext.BaseDirectory` và tự động tạo `data/config/server.ini` ở lần chạy đầu tiên (`ConfigurationManager.Instance` độc lập sẽ mặc định là `default.ini` trong `Directories.ConfigurationDirectory`). Tiêu đề section tự động bỏ hậu tố `Options` khỏi tên class `ConfigurationLoader`:

```ini
[NetworkSocket]
Port=57206
Backlog=512

[Dispatch]
MaxPerConnectionQueue=4096
DropPolicy=DropNewest
BlockTimeout=00:00:01

[Transport]
Address=127.0.0.1
Port=57206
ConnectTimeoutMillis=30000
BufferSize=65536
```

:::note[Mở rộng vòng lặp dispatch]
Số lượng worker loop được cấu hình trên `PacketDispatchOptions<TPacket>` (`Nalix.Runtime.Routing`) trong code bằng `WithDispatchLoopCount(...)`.
Dùng `WithDispatchLoopCount(null)` để giữ hành vi tự động mở rộng.
Lưu ý: `PacketDispatchOptions<TPacket>` (cấu hình handler/middleware) là một kiểu khác với `DispatchOptions` (giới hạn hàng đợi và chính sách loại bỏ).
:::

## Kiểm tra tùy chọn khi khởi động

Khi lấy một class tùy chọn qua `ConfigurationManager.Instance.Get<TOptions>()`, Nalix tự động gọi `Validate()` nếu `TOptions` triển khai `IValidatableConfiguration` (như `NetworkSocketOptions`, `PoolingOptions`, `TokenBucketOptions` và `HostingOptions`) và chạy các kiểm tra data-annotation do source generator sinh ra (`[ValueRange]`, `[Length]`, `[Required]`):

```csharp
using Nalix.SDK.Options;
using Nalix.Network.Options;
using Nalix.Environment.Configuration;

// Server: loads [NetworkSocket] and automatically validates IValidatableConfiguration
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();

// Client: loads [Transport] and validates [ValueRange] / [Length] annotations
TransportOptions transport = ConfigurationManager.Instance.Get<TransportOptions>();
```

## Đọc tiếp theo

- [Bắt đầu nhanh](./quickstart.md) — xây dựng cặp client/máy chủ đầu tiên của bạn
- [Tổng quan về package](./packages/index.md) — mỗi package cung cấp gì và 5 cấp phụ thuộc xếp chồng lên nhau như thế nào
- [Hướng dẫn khái niệm cấu hình](./concepts/configuration.md) — cách ràng buộc `.ini` và hot-reload hoạt động ra sao
