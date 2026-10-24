---
title: Tổng quan Hướng dẫn
description: Các hướng dẫn này đi qua những mẫu thực tế, chạy được ngay — hãy bắt đầu với mẫu gần nhất với thứ bạn đang xây dựng.
section: Guides
---

Các hướng dẫn này đi qua những mẫu thực tế, chạy được ngay — hãy bắt đầu với mẫu gần nhất với thứ bạn đang xây dựng.

## Bắt đầu tại đây

- [Xây dựng phòng Chat](./build-a-chat-room.md) — phát tin nhắn tới mọi client đang kết nối
- [Bảo mật máy chủ](./securing-your-server.md) — bật mã hóa và chạy TCP, UDP, WebSocket cùng lúc
- [Hướng dẫn Blazor WebAssembly (WASM)](./blazor-wasm.md) — kết nối client trình duyệt qua WebSocket bằng `WebSocketSession`

## Logic ứng dụng

- [Triển khai Handler gói tin](./application/packet-handlers.md) — viết logic nghiệp vụ và quản lý opcode
- [Hướng dẫn sử dụng Middleware](./application/middleware-usage.md) — áp dụng chính sách cho các handler

## Mạng

- [Hướng dẫn Phiên kết nối Client](./networking/connecting-clients.md) — kết nối phiên TCP/UDP bằng `Nalix.SDK`
- [Hướng dẫn Máy chủ UDP](./networking/udp-server.md) — xây dựng dịch vụ datagram độ trễ thấp
- [Hướng dẫn Mẫu kết nối TCP](./networking/tcp-patterns.md) — request/response và ghép nối listener thủ công
- [Hướng dẫn Bảo mật UDP](./networking/udp-security.md) — bàn giao phiên an toàn cho UDP
- [Cấu hình thời gian chờ kết nối rỗi](./networking/idle-timeout-configuration.md) — tinh chỉnh timeout kết nối

## Mở rộng

- [Hướng dẫn Tùy chỉnh Middleware](./extensibility/custom-middleware.md) — xây dựng các thành phần pipeline của riêng bạn
- [Tùy chỉnh Metadata Provider](./extensibility/metadata-providers.md) — dùng attribute để điều khiển hành vi tùy chỉnh
- [Tùy chỉnh bộ định tuyến gói tin](./extensibility/custom-packet-router.md) — định tuyến gói tin ngoài dispatcher mặc định
- [Tùy chỉnh Serialization Provider](./extensibility/serialization-providers.md) — đăng ký formatter tùy chỉnh

## Tài liệu tham khảo cho phần bắt đầu

- [Kiến trúc máy chủ mẫu](./getting-started/server-blueprint.md) — một trình tự khởi động chuẩn và mẫu điểm xuất phát

## Triển khai & vận hành

- [Danh mục kiểm tra Production](./deployment/production-checklist.md) — cổng kiểm soát trước khi phát hành, kèm ví dụ minh họa
- [Reverse Proxy & TLS Termination](./deployment/reverse-proxy-tls.md) — cấu hình HAProxy, Nginx, Cloudflare và PROXY Protocol v2
- [Hướng dẫn xử lý sự cố](./deployment/troubleshooting.md) — các vấn đề thường gặp và nơi nên kiểm tra trước
