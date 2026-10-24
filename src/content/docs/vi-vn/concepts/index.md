---
title: Tổng quan khái niệm
description: Các trang này giải thích những ý tưởng đằng sau Nalix bằng ngôn ngữ đơn giản — gói tin là gì, một yêu cầu đến được mã của bạn như thế nào, và những gì được mã hóa mặc định. Bạn không cần đọc hết trước khi bắt đầu...
section: Concepts
---

Các trang này giải thích những ý tưởng đằng sau Nalix bằng ngôn ngữ đơn giản — gói tin là gì, một yêu cầu đến được mã của bạn như thế nào, và những gì được mã hóa mặc định. Bạn không cần đọc hết trước khi bắt đầu; [Bắt đầu nhanh](../quickstart.md) sẽ giúp bạn chạy được trước.

- [Gói tin hoạt động như thế nào](./how-packets-work.md) — định nghĩa và chia sẻ các kiểu gói tin
- [Handler và Middleware](./handlers-and-middleware.md) — logic của bạn chạy ở đâu và chính sách được áp dụng ra sao
- [Cấu hình](./configuration.md) — tải và kiểm tra các tùy chọn
- [Thuật ngữ](./glossary.md) — các thuật ngữ dùng xuyên suốt tài liệu

Mã hóa được trình bày như một phần của [Bảo vệ máy chủ](../guides/securing-your-server.md) — Nalix mã hóa kết nối thông qua handshake, không phải thông qua cấu hình bạn tự viết tay.

## Đi sâu hơn

[Internals](./internals/index.md) trình bày các định dạng đường truyền, giao thức handshake, quản lý pool bộ nhớ và sharding — mọi thứ về cách Nalix hoạt động bên trong. Bạn không cần nó để xây dựng ứng dụng với Nalix.
