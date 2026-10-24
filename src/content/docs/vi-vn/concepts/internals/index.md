---
title: Nội bộ
description: Bạn không cần phần này để sử dụng Nalix. Chỉ đọc nếu bạn muốn biết framework hoạt động bên trong như thế nào.
section: Concepts
---

Bạn không cần phần này để sử dụng Nalix. Chỉ đọc nếu bạn muốn biết framework hoạt động bên trong như thế nào.

Nội dung ở đây đều chính xác và được cập nhật thường xuyên, nhưng đi sâu hơn mức hầu hết mọi người cần: định dạng wire, handshake bảo mật, sharding, pool bộ nhớ và các đảm bảo mà runtime thực hiện nội bộ. Nếu bạn chỉ muốn xây dựng một máy chủ hoặc client, hãy bắt đầu với [Bắt đầu nhanh](../../quickstart.md) và các trang [Khái niệm](../index.md) chính.

## Nội dung chính

- **Các thành phần kết hợp với nhau như thế nào**: [Kiến trúc](architecture.md), [Vòng đời gói tin](packet-lifecycle.md), [Pipeline middleware](middleware-pipeline.md), [Nội bộ cấu hình](configuration.md), [Động cơ thời gian thực](real-time-engine.md)
- **Định dạng wire và lỗi**: [Đặc tả nhị phân](binary-spec.md), [Lỗi và chẩn đoán](errors-and-diagnostics.md)
- **Bảo mật chuyên sâu**: [Kiến trúc bảo mật](security-architecture.md), [Mô hình mã hóa](encryption-model.md), [Giao thức handshake](handshake-protocol.md), [Tiếp tục session](session-resumption.md)
- **Hiệu năng và mở rộng**: [Sharding và đồng thời](sharding.md), [Đường dẫn không cấp phát bộ nhớ](zero-allocation.md), [Tối ưu hiệu năng](performance-optimizations.md)
- **Quản lý bộ nhớ**: [Sử dụng BufferLease](buffer-lease-utilization.md), [Cấu hình pool bộ đệm](buffer-pooling-configuration.md)
- **Độ tin cậy và đảm bảo**: [Đảm bảo và xử lý lỗi](guarantees-and-failure-handling.md), [Đánh đổi thiết kế](design-tradeoffs.md)
- **Hướng dẫn nâng cao**: [Cấu hình máy chủ thủ công (không dùng Hosting)](minimal-server.md), [API phiên mức thấp](low-level-session-apis.md)
