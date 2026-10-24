---
title: Tham chiếu API
description: Tài liệu API của Nalix được tổ chức theo ranh giới gói — từ hợp đồng (Nalix.Abstractions) và nguyên thủy (Nalix.Environment, Nalix.Codec) đến thực thi máy chủ (Nalix.Runtime, Nalix.Network, Nalix.Hosting) và phiên client (Nalix.SDK).
section: API Reference
---

Tài liệu API của Nalix được tổ chức theo ranh giới gói và trách nhiệm runtime, để bạn có thể đi từ hợp đồng (`Nalix.Abstractions`) đến thực thi (`Nalix.Runtime`, `Nalix.Network`) rồi đến transport phía client (`Nalix.SDK`) mà không trộn lẫn các mối quan tâm.

## Bắt đầu từ đâu

Nếu bạn đang tìm các interface và class cốt lõi điều khiển Nalix:

- **Hợp đồng packet & attribute** — [API chung](./abstractions/index.md)
- **Handler, định tuyến & metadata** — [Định tuyến Runtime](./runtime/routing/index.md)
- **Pipeline middleware** — [Middleware Runtime](./runtime/middleware/index.md)
- **Transport TCP/UDP & protocol** — [API Network](./network/index.md)
- **Phiên client & request** — [API SDK](./sdk/index.md)

:::warning[Quan trọng]
Đa số người dùng KHÔNG nên bắt đầu bằng việc đọc tài liệu tham chiếu API.  
Nếu bạn mới, hãy làm theo [Lộ trình khuyến nghị](../index.md#bắt-đầu-tại-đây)  
hoặc xem trước các [Hướng dẫn](../guides/index.md).
:::

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions`
- `src/Nalix.Environment`
- `src/Nalix.Codec`
- `src/Nalix.Framework`
- `src/Nalix.Runtime`
- `src/Nalix.Network`
- `src/Nalix.Hosting`
- `src/Nalix.SDK`
- `analyzers/Nalix.Analyzers`
- `analyzers/Nalix.Analyzers.CodeFixes`
- `analyzers/Nalix.Analyzers.Generators`

## Vì sao có cấu trúc này

Nalix được chia thành các gói tập trung với lớp phân tầng rõ ràng:

- `Nalix.Abstractions` định nghĩa các contract và attribute dùng chung.
- `Nalix.Environment` cung cấp các kiểu bộ nhớ nền tảng, cấu hình và nguyên thủy môi trường.
- `Nalix.Codec` xử lý tuần tự hóa, các frame tích hợp sẵn và biến đổi dữ liệu.
- `Nalix.Framework` cung cấp các dịch vụ runtime tái sử dụng, quản lý instance và tác vụ.
- `Nalix.Runtime` biến packet thành quá trình thực thi handler và cung cấp các thành phần middleware/throttling tái sử dụng.
- `Nalix.Network` quản lý listener, kết nối, protocol và session store.
- `Nalix.Hosting` thêm phần ghép nối kiểu host/builder lên trên runtime + network.
- `Nalix.SDK` cung cấp session transport và API mở rộng phía client.

Nhờ vậy, phần nội tại của runtime máy chủ, vòng đời transport và API client có thể phát triển độc lập với nhau.

## Ma trận trách nhiệm của gói

| Gói | Trách nhiệm chính | Dùng khi | Tránh dùng khi |
| --- | --- | --- | --- |
| `Nalix.Abstractions` | Interface/enum/attribute lõi | Bạn cần contract dùng chung giữa các gói | Bạn cần hành vi runtime cụ thể |
| `Nalix.Environment` | Bộ nhớ, Cấu hình, IO, Clock | Bạn cần các nguyên thủy bộ nhớ không cấp phát | Bạn chỉ cần mạng ở mức cao |
| `Nalix.Codec` | Tuần tự hóa, Frame, Biến đổi | Bạn cần đóng/mở gói dữ liệu hoặc đăng ký packet | Bạn chỉ cần vòng đời transport |
| `Nalix.Framework` | Dịch vụ runtime và định danh | Bạn cần quản lý instance hoặc lập lịch tác vụ | Bạn chỉ cần transport client thuần túy |
| `Nalix.Runtime` | Điều phối packet và middleware | Bạn đang xây dựng pipeline thực thi handler | Bạn chỉ cần các primitive listener socket |
| `Nalix.Network` | Connection + listener + protocol | Bạn đang triển khai vòng lặp transport của máy chủ | Bạn chỉ cần transport client thuần túy |
| `Nalix.Hosting` | Ghép nối khởi động kiểu host | Bạn muốn khởi tạo máy chủ theo builder | Bạn thích tự ghép nối thủ công |
| `Nalix.SDK` | Transport và session client | Bạn xây dựng client Nalix | Bạn triển khai listener máy chủ |

## Lộ trình API theo tiến độ

1. Bắt đầu với [Contract dùng chung](./abstractions/packet-contracts.md) và các abstraction về connection/session.
2. Tìm hiểu luồng xử lý packet trong [API Runtime](./runtime/index.md).
3. Chuyển sang vòng đời transport trong [API Network](./network/protocol.md).
4. Với client, tiếp tục với [API SDK](./sdk/index.md).
5. Với ghép nối khởi động cho môi trường production, dùng [API Hosting](./hosting/network-application.md).

## Sơ đồ kiến trúc gợi ý

- Chuỗi dispatch: `IBufferLease -> PacketRegistry -> PacketContext<TPacket> / IPacketContext<TPacket> -> handler`.
- Phân tầng máy chủ: Listener (`Nalix.Network`) nằm trên dispatch runtime (`Nalix.Runtime`) và contract dùng chung (`Nalix.Abstractions`).
- Vòng đời handshake phía client-server dùng `Nalix.SDK.Transport.Extensions` + handler runtime.

## Trang liên quan

- [Tổng quan gói](../packages/index.md)
- [Kiến trúc nội tại](../concepts/internals/architecture.md)
- [Vòng đời packet](../concepts/internals/packet-lifecycle.md)
