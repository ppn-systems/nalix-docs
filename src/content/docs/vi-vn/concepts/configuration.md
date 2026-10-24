---
title: Cấu hình
description: Nalix tải cài đặt từ file INI thông qua ConfigurationManager, và tự động tạo file đó lần đầu tiên bạn chạy dự án nếu nó chưa tồn tại.
section: Concepts
---

Nalix tải cài đặt từ file INI thông qua `ConfigurationManager`, và tự động tạo file đó lần đầu tiên bạn chạy dự án nếu nó chưa tồn tại.

```csharp
using Nalix.SDK.Options;
using Nalix.Network.Options;
using Nalix.Environment.Configuration;

// Máy chủ
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
socket.Validate();

// Client
TransportOptions transport = ConfigurationManager.Instance.Get<TransportOptions>();
```

Mã nguồn đầy đủ: `docs/installation.md` mô tả bố cục `server.ini` mặc định và mọi nhóm tùy chọn.

## Kiểm tra hợp lệ trước khi mở socket

Gọi `Validate()` trên các kiểu tùy chọn có cung cấp phương thức này, trước khi bạn bắt đầu lắng nghe hoặc kết nối. Một giá trị sai được phát hiện lúc khởi động sẽ dễ gỡ lỗi hơn nhiều so với một giá trị bị phát hiện giữa lúc đang có lưu lượng.

## Các nhóm tùy chọn thường dùng

| Tùy chọn | Mục đích |
| :--- | :--- |
| `NetworkSocketOptions` | Kích thước bộ đệm, cổng và thuộc tính IP |
| `DispatchOptions` | Giới hạn hàng đợi theo từng kết nối và chính sách loại bỏ |
| `ConnectionGuardOptions` | Trần số kết nối, ngưỡng lỗi và cấm truy cập theo mức tăng dần |
| `TransportOptions` | Địa chỉ kết nối phía client, thời gian chờ và hành vi kết nối lại |

## Bước tiếp theo

- [Cài đặt](../installation.md) — tham chiếu đầy đủ về `server.ini` và cách chọn gói
- [Checklist trước khi triển khai](../guides/deployment/production-checklist.md) — những tùy chọn nên kiểm tra kỹ trước khi đưa vào sản phẩm
- Để xem trình tự khởi động đầy đủ và cách kết nối `InstanceManager`: [Chi tiết nội bộ về cấu hình](./internals/configuration.md) (Internals)
