---
title: Máy chủ đầu tiên
description: Trang này xem xét mẫu HelloWorld từng phần một để bạn hiểu mỗi phần làm gì, chứ không chỉ biết cách sao chép nó.
section: Start Here
---

Trang này xem xét mẫu HelloWorld từng phần một để bạn hiểu mỗi phần làm gì, chứ không chỉ biết cách sao chép nó.

Mã nguồn đầy đủ: `samples/HelloWorld`

## Các thành phần

Một ứng dụng Nalix tối thiểu gồm ba project:

- **Contracts** — các kiểu gói tin mà cả server và client cùng dùng
- **Server** — chạy listener và handler
- **Client** — kết nối và gửi request

```text
HelloWorld/
├── HelloWorld.Contracts/   # Shared packet definitions
├── HelloWorld.Server/      # Server application
├── HelloWorld.Client/      # Client application
└── HelloWorld.sln
```

Mã nguồn đầy đủ: `samples/HelloWorld/README.md`

> Trang này giải thích đoạn mã được trình bày trong [Bắt đầu nhanh](../../quickstart.md). Hãy mở song song — mỗi phần bên dưới chỉ tới đoạn mã mà nó giải thích.

## Gói tin là các class thường có attribute

Xem định nghĩa gói tin trong [Bắt đầu nhanh §2](../../quickstart.md#2-định-nghĩa-các-gói-tin).

`[GenerateFormatter]` yêu cầu source generator Roslyn của Nalix sinh ra một bộ tuần tự hóa nhị phân không dùng reflection và một `[ModuleInitializer]` (`PacketRegistryGenerator`) tự động đăng ký gói tin vào `PacketRegistry` khi khởi động. `StaticOpCode` (`IPacketStaticOpcode`) là số 16-bit xác định kiểu gói tin này trên wire; hãy chọn một giá trị `>= 0x0100` (như `0x7001`) không trùng với gói tin nào khác trong project (`0x0000..0x00FF` được dành cho các frame hệ thống có sẵn, được analyzer `NALIX035` ép buộc). `PacketBase<TSelf>` cung cấp header wire 6 byte (`OpCode`, `Flags`, `Priority`, `SequenceId`) tại `[SerializeOrder(0..3)]`, nên các thuộc tính payload bắt đầu từ `PacketHeaderOffset.Region` (`4`) trở lên.

## Handler phản hồi cho từng opcode

Xem handler trong [Bắt đầu nhanh §3](../../quickstart.md#3-viết-máy-chủ).

`context.Sender.SendAsync(...)` gửi phản hồi trở lại trên cùng kết nối đã gửi request. `PacketFactory<T>.Acquire()` trả về cho bạn một instance gói tin lấy từ pool thay vì cấp phát mới mỗi lần — bạn không cần lo nghĩ gì thêm ngoài việc bọc nó trong khối `using`.

## Máy chủ là một chuỗi builder

Xem chuỗi builder trong [Bắt đầu nhanh §3](../../quickstart.md#3-viết-máy-chủ).

`MapHandlers` đăng ký class handler của bạn. `MapTcp<DefaultProtocol>().OnPort(...).Bind()` mở một TCP listener dùng protocol tích hợp sẵn — bạn chỉ cần protocol tùy chỉnh khi làm việc gì đó khác thường với frame thô. `RunAsync` chặn cho tới khi cancellation token được kích hoạt (ở đây là khi nhấn Ctrl+C).

## Client gửi và chờ phản hồi có kiểu

Xem client trong [Bắt đầu nhanh §4](../../quickstart.md#4-viết-client).

`RequestAsync<TResponse>` đăng ký nhận phản hồi trước khi gửi request, nên phản hồi nhanh không bao giờ bị bỏ lỡ. Nếu không có gì trả về trong thời gian chờ, nó sẽ ném ngoại lệ.

## Các vấn đề thường gặp

**Client không kết nối được.** Hãy đảm bảo máy chủ đang chạy trước khi khởi động client, và không có tiến trình nào khác đang lắng nghe trên cổng đó.

**Không tìm thấy handler gói tin lúc chạy.** Hãy đảm bảo assembly `HelloWorld.Contracts` thực sự được nạp và được tham chiếu — module initializer của nó đăng ký gói tin tự động khi assembly được nạp.

## Bước tiếp theo

- [Xây dựng phòng Chat](../build-a-chat-room.md) — thêm broadcast tới mọi client đang kết nối
- [Cách gói tin hoạt động](../../concepts/how-packets-work.md) — các attribute của gói tin đi sâu hơn
- [Handler và Middleware](../../concepts/handlers-and-middleware.md) — những gì chạy trước handler của bạn
