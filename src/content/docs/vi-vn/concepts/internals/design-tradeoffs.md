---
title: Đánh đổi thiết kế
description: Nalix được xây dựng cho truyền thông mạng hiệu năng cao, thời gian thực. Để đạt mục tiêu này, framework đã phải chấp nhận nhiều đánh đổi có chủ đích, ưu tiên **hiệu quả runtime** và **khả năng dự đoán** hơn **sự tiện lợi khi phát triển**...
section: Concepts
---

:::warning[Chủ đề nâng cao]
Trang này giải thích các quyết định kiến trúc đằng sau Nalix. Hiểu rõ các đánh đổi này sẽ giúp bạn quyết định Nalix có phù hợp với dự án của mình hay không.
:::

Nalix được xây dựng cho truyền thông mạng hiệu năng cao, thời gian thực. Để đạt mục tiêu này, framework đã phải chấp nhận nhiều đánh đổi có chủ đích, ưu tiên **hiệu quả runtime** và **khả năng dự đoán** hơn **sự tiện lợi khi phát triển**.

## 1. Hiệu năng hơn sự tiện lợi

Nalix được thiết kế để xử lý hàng triệu gói tin mỗi giây với áp lực GC tối thiểu.

- **Đánh đổi:** Chúng tôi dùng pool buffer tường minh (`BufferLease`) và pool đối tượng cho các context trên hot path.
- **Ưu điểm:** Độ trễ cực thấp, mức sử dụng bộ nhớ ổn định khi tải nặng và thông lượng cao.
- **Nhược điểm:** Nhà phát triển phải kỷ luật trong việc giải phóng tài nguyên (dùng khối `finally` hoặc `using`) để tránh cạn pool.

---

## 2. Tường minh hơn ngầm định

Nalix tránh các "phép màu" và hiệu ứng phụ ẩn thường gặp ở các framework tầng cao.

- **Đánh đổi:** Chúng tôi dùng `InstanceManager` tường minh (Service Locator) thay vì dependency injection tiêu chuẩn để phân giải trên hot path. Chúng tôi cũng yêu cầu đăng ký tường minh các opcode và handler.
- **Ưu điểm:** Thứ tự thực thi có thể đoán trước, không dùng reflection trên hot path và dễ gỡ lỗi "phần đấu nối".
- **Nhược điểm:** Nhiều mã thiết lập ban đầu (boilerplate) hơn so với các framework dùng quét tự động hoặc DI nặng reflection.

---

## 3. Các tầng module hóa thay vì tích hợp nguyên khối

Nalix được chia thành các package chuyên biệt (`Abstractions`, `Environment`, `Codec`, `Framework`, `Runtime`, `Network`).

- **Đánh đổi:** Bạn phải quản lý phụ thuộc giữa các tầng một cách tường minh.
- **Ưu điểm:** Binary client gọn nhẹ hơn, có thể thay transport (TCP sang UDP) mà không đụng đến logic nghiệp vụ, và ranh giới mối quan tâm rõ ràng.
- **Nhược điểm:** Đường cong học tập hơi dốc hơn để hiểu package nào sở hữu chức năng nào.

---

## 4. Hiệu quả nhị phân hơn khả năng đọc của con người

Chúng tôi dùng định dạng nhị phân tùy chỉnh thay vì JSON hay Protobuf cho triển khai `IPacket` mặc định.

- **Đánh đổi:** Gói tin về cơ bản là các mảng byte được ánh xạ vào thuộc tính.
- **Ưu điểm:** Số chu kỳ CPU dành cho tuần tự hóa tối thiểu, kích thước khung trên đường truyền nhỏ hơn.
- **Nhược điểm:** Gói tin không thể đọc trực tiếp nếu không có công cụ chuyên dụng hoặc logging phù hợp, và phải tự quản lý bố cục nhị phân (`[SerializeOrder]`).

## Ma trận quyết định tóm tắt

| Bạn nên chọn Nalix nếu... | Bạn có thể muốn công cụ khác nếu... |
| :--- | :--- |
| Bạn cần độ trễ dưới mili giây. | Bạn đang xây dựng một REST API tiêu chuẩn. |
| Bạn muốn đường dữ liệu không cấp phát bộ nhớ. | Tốc độ phát triển quan trọng hơn hiệu quả CPU. |
| Bạn cần kiểm soát chi tiết việc sharding. | Bạn muốn một giải pháp "cắm là chạy" với cấu hình tối thiểu. |
| Client và server của bạn phải dùng chung contract. | Bạn chỉ kiểm soát một phía của kết nối. |

## Kiến trúc liên quan

- [Tổng quan kiến trúc](./architecture.md): Thiết kế hệ thống theo tầng.
- [Tối ưu hiệu năng](./performance-optimizations.md): Chi tiết về các đường không cấp phát bộ nhớ.
