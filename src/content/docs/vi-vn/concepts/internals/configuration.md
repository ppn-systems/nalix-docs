---
title: Hệ thống cấu hình
description: Trang này giải thích cách cấu hình trở thành một máy chủ Nalix đang chạy. Nội dung bao gồm trình tự khởi tạo khi khởi động, xác thực tùy chọn, đăng ký service và mối quan hệ giữa cấu hình, dispatch và transport...
section: Concepts
---

Trang này giải thích cách cấu hình trở thành một máy chủ Nalix đang chạy. Nội dung bao gồm trình tự khởi tạo khi khởi động, xác thực tùy chọn, đăng ký service và mối quan hệ giữa cấu hình, dispatch và transport.

## Đường dẫn mã nguồn

- `src/Nalix.Environment/Configuration/ConfigurationManager.cs`
- `src/Nalix.Hosting/Bootstrap.cs`
- `src/Nalix.Hosting/NetworkApplicationBuilder.cs`

## Tóm tắt nhanh

Quá trình khởi động Nalix tuân theo một trình tự xác định nghiêm ngặt để đảm bảo hạ tầng dùng chung đã sẵn sàng trước khi lưu lượng bắt đầu chạy.

### Khởi tạo nhận biết môi trường

Cấu hình Nalix xoay quanh `ConfigurationManager` và file INI đang hoạt động nằm dưới `Directories.ConfigurationDirectory`. Đường dẫn file chính xác có thể thay đổi bằng `SetConfigFilePath(...)`, và cài đặt hiện tại giới hạn đường dẫn này nằm trong thư mục cấu hình.

```mermaid
flowchart LR
    A["Configuration Files"] --> B["ConfigurationManager"]
    B --> C["Options Objects"]
    C --> D["Validation Gate"]
    D --> E["InstanceManager"]
    E --> F["Dispatch Channel"]
    F --> G["Protocol & Layer"]
    G --> H["Network Listeners"]
```

:::tip[Vì sao thứ tự quan trọng]
Hầu hết các thành phần mạng đều giả định rằng các tùy chọn đã được xác thực và các service dùng chung (như `ILogger`) đã tồn tại trong `InstanceManager`. Hãy phân giải sớm để thất bại nhanh.
:::

---

## Các trụ cột cấu hình

### ConfigurationManager

`ConfigurationManager` là điểm truy cập trung tâm cho các giá trị cấu hình và việc gắn kết tùy chọn. Nó xử lý việc tải từ các nguồn, gắn kết vào các lớp có kiểu mạnh và lưu cache các instance đã phân giải.

### Lớp tùy chọn

Nalix dùng các kiểu tùy chọn nhỏ, chuyên biệt thay vì một đối tượng "Settings" nguyên khối. Cách này giữ các mối quan tâm lúc chạy (như timing wheel so với giới hạn socket) tách biệt nhau.

| Tùy chọn | Mục đích |
| :--- | :--- |
| `NetworkSocketOptions` | Kích thước buffer, cổng và thuộc tính IP |
| `DispatchOptions` | Giới hạn hàng đợi theo từng kết nối, chính sách bỏ gói và thời gian chờ khi bị chặn |
| `ConnectionQuotaOptions` | Giới hạn số kết nối đồng thời và tốc độ theo từng IP |
| `ConnectionGuardOptions` | Trần kết nối toàn cục, ngưỡng lỗi, tốc độ gói tin và cấm tăng dần |
| `TimingWheelOptions` | Lập lịch timeout O(1) cho các kết nối nhàn rỗi |

:::tip[Thói quen xác thực]
Hãy gọi `Validate()` trên các kiểu tùy chọn có cung cấp phương thức này. Dùng tầng cấu hình để thất bại sớm thay vì phát hiện giá trị sai trong lúc có lưu lượng thực.
:::

---

## Registry lúc chạy

### InstanceManager (DI)

`InstanceManager` là registry lúc chạy cho các service dùng chung. Nó không phải dependency injection phức tạp; nó là một service locator nhanh, an toàn đa luồng, được thiết kế cho các hot path mạng.

- **Logger**: Đầu ra chẩn đoán tập trung.
- **Packet Registry**: "Danh mục" ánh xạ opcode sang kiểu.
- **Helper tùy chỉnh**: Cầu nối cơ sở dữ liệu dùng chung hoặc trình quản lý trạng thái game.

:::important[Tính sẵn sàng của service]
Khi `NetworkApplication.ActivateAsync()` đã được gọi, `InstanceManager` nên được coi là **đã đóng băng**. Thay đổi các service chính khi đang có lưu lượng có thể dẫn đến trạng thái handler không nhất quán.
:::

---

## Tầng vận chuyển (Transport Shell)

Sau khi cấu hình và các service dùng chung đã sẵn sàng, các tầng dispatch và transport mới được khởi tạo.

- **Dispatch**: Nơi ứng dụng "trở nên thực sự". Nó giữ middleware và handler.
- **Listener**: Lớp vỏ nhị phân. Nó sở hữu việc chấp nhận socket, các worker nhận và `FramePipeline` (AEAD).
- **Protocol**: Cầu nối nhận các thông điệp "sạch" từ listener và định tuyến chúng vào dispatch.

### Mẫu khởi động an toàn

Với đa số đội ngũ, cách nối này là mặc định an toàn nhất:

1. **Bind và Validate** các tùy chọn.
2. **Đăng ký** Logger và Packet Registry.
3. Xây dựng **Dispatch** (Middleware + Handler).
4. Xây dựng **Protocol** và **Listener**.
5. **Activate** Dispatch, sau đó khởi động **Listener**.

---

## Trang nên đọc tiếp

- [Blueprint máy chủ](../../guides/getting-started/server-blueprint.md)
- [Danh sách kiểm tra production](../../guides/deployment/production-checklist.md)
- [API cấu hình](../../api/environment/configuration.md)
