---
title: Nalix
description: Nalix là framework mạng TCP và UDP thời gian thực cho .NET 10. Bạn định nghĩa kiểu gói tin một lần, chia sẻ chúng giữa máy chủ và client, còn Nalix lo phần transport, định tuyến và bảo mật cho bạn....
section: Overview
---

<p align="center">
  <img src="assets/nalix.png" alt="Nalix Logo" width="200"/>
</p>

<p align="center">
  <a href="https://www.nuget.org/packages?q=Nalix"><img src="https://img.shields.io/nuget/v/Nalix.Network.svg?style=flat-square&label=NuGet" alt="NuGet version"/></a>
  <a href="https://github.com/ppn-systems/nalix/stargazers"><img src="https://img.shields.io/github/stars/ppn-systems/nalix.svg?style=flat-square&color=yellow" alt="GitHub stars"/></a>
  <a href="https://github.com/ppn-systems/nalix/blob/master/LICENSE"><img src="https://img.shields.io/github/license/ppn-systems/nalix.svg?style=flat-square&color=blue" alt="License"/></a>
</p>

Nalix là framework mạng TCP và UDP thời gian thực cho .NET 10. Bạn định nghĩa kiểu gói tin một lần, chia sẻ chúng giữa máy chủ và client, còn Nalix lo phần transport, định tuyến và bảo mật cho bạn.

[Bắt đầu](./quickstart.md) · [Xem các gói](./packages/index.md)

## Bạn nhận được gì

- **Một định nghĩa gói tin, dùng chung ở mọi nơi.** Định nghĩa kiểu gói tin một lần trong một dự án dùng chung; cả máy chủ và client đều dùng cùng một lớp.
- **Bộ dựng máy chủ kiểu fluent.** Cấu hình listener, handler và bảo mật bằng vài lời gọi nối tiếp, rồi gọi `RunAsync()`.
- **Client hoạt động ngay.** Kết nối, gửi yêu cầu và chờ phản hồi có kiểu — không cần tự đóng khung hay ghép cặp thủ công.

:::tip[Thử ngay]
[Bắt đầu nhanh](./quickstart.md) xây dựng một cặp client/server hoàn chỉnh chỉ trong vài phút.
:::

## Bắt đầu tại đây

- [Bắt đầu nhanh](./quickstart.md) — xây dựng và chạy một máy chủ request/response
- [Cài đặt](./installation.md) — chọn đúng gói cho dự án của bạn
- [Máy chủ đầu tiên của bạn](./guides/getting-started/your-first-server.md) — tìm hiểu kỹ hơn từng thành phần

## Hướng dẫn

- [Xây dựng phòng chat](./guides/build-a-chat-room.md) — phát tin nhắn tới mọi client đang kết nối
- [Bảo mật máy chủ](./guides/securing-your-server.md) — bật mã hóa và nhiều transport
- [Tổng quan hướng dẫn](./guides/index.md) — danh sách đầy đủ

## Khái niệm

- [Gói tin hoạt động như thế nào](./concepts/how-packets-work.md)
- [Handler và Middleware](./concepts/handlers-and-middleware.md)
- [Cấu hình](./concepts/configuration.md)
- [Thuật ngữ](./concepts/glossary.md)

Nếu bạn muốn biết Nalix hoạt động bên trong như thế nào — định dạng truyền tải, sharding, memory pooling — hãy xem [Nội bộ](./concepts/internals/index.md). Bạn không cần đến nó để xây dựng với Nalix.

## Các gói cốt lõi

| Gói | Mục đích |
| :--- | :--- |
| [**Nalix.Hosting**](./packages/nalix-hosting.md) | Bộ dựng kiểu fluent (`NetworkApplication.CreateBuilder()`) và vòng đời ứng dụng để khởi tạo máy chủ |
| [**Nalix.Network**](./packages/nalix-network.md) | Listener TCP, UDP và WebSocket, kết nối, connection hub và bảo vệ transport |
| [**Nalix.Runtime**](./packages/nalix-runtime.md) | Điều phối gói tin đa luồng (`PacketDispatchChannel`), chuỗi middleware và dịch vụ phiên |
| [**Nalix.SDK**](./packages/nalix-sdk.md) | Phiên transport phía client (`TcpSession`, `UdpSession`), bắt tay và ghép cặp request/response |
| [**Nalix.Codec**](./packages/nalix-codec.md) | Tuần tự hóa nhị phân lúc biên dịch (`LiteSerializer`), nén LZ4, mã hóa AEAD và `PacketRegistry` |
| [**Nalix.Framework**](./packages/nalix-framework.md) | Dependency injection (`InstanceManager`), worker nền (`TaskManager`), ID `Snowflake`, và pool đối tượng/bộ đệm |
| [**Nalix.Environment**](./packages/nalix-environment.md) | Bộ nhớ không cấp phát (`BufferLease`, `DataReader`, `DataWriter`), cấu hình INI, `Clock`, `TimingScope` và `Csprng` |
| [**Nalix.Abstractions**](./packages/nalix-abstractions.md) | Contract không phụ thuộc (`IPacket`, `IConnection`, `IBufferLease`), attribute gói tin và metadata kiểm tra hợp lệ |

Để xem toàn bộ sơ đồ gói, hãy xem [Tổng quan các gói](./packages/index.md).

---

*Nalix được phát triển bởi [PPN Systems](https://github.com/ppn-systems). Được cấp phép theo Apache 2.0.*
