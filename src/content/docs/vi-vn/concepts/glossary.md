---
title: Thuật ngữ
description: Trang này định nghĩa các thuật ngữ cốt lõi của Nalix xuất hiện trong toàn bộ tài liệu. Hãy dùng trang này như tài liệu tra cứu nhanh khi các trang API trở nên nhiều chi tiết triển khai.
section: Concepts
---

Trang này định nghĩa các thuật ngữ cốt lõi của Nalix xuất hiện trong toàn bộ tài liệu. Hãy dùng trang này như tài liệu tra cứu nhanh khi các trang API trở nên nhiều chi tiết triển khai.

---

## BufferLease

Một bộ đệm byte lấy từ `BufferPoolManager`. Phải được dispose sau khi dùng để trả bộ đệm về pool. Được dùng xuyên suốt hot path để tránh cấp phát `byte[]`.

## Connection

`Connection` là đối tượng phiên lúc chạy cho một client từ xa. Nó giữ:

- Connection ID
- Endpoint từ xa
- Bộ điều hợp transport TCP/UDP
- Mức quyền
- Trạng thái cipher và secret
- Bộ đếm lúc chạy (số byte đã gửi, thời gian hoạt động, độ trễ ping, số lỗi)

## ConnectionHub

`ConnectionHub` là registry trong bộ nhớ của các kết nối đang hoạt động. Hãy dùng nó để:

- Tra cứu kết nối theo ID hoặc tên người dùng
- Ngắt kết nối bắt buộc
- Phát sóng hàng loạt
- Báo cáo ở mức kết nối qua `GenerateReport()`

## Điều phối (dispatch)

Trong tài liệu, "dispatch" thường có nghĩa là `PacketDispatchChannel` cùng các tùy chọn và runtime liên quan. Đây là thành phần:

- Xếp hàng công việc đến qua các worker được phân mảnh (sharded)
- Giải tuần tự hóa gói tin qua packet registry
- Chạy chuỗi middleware
- Gọi handler
- Xử lý các kiểu trả về được hỗ trợ

## InstanceManager

Registry dịch vụ lúc chạy được dùng trong toàn bộ stack Nalix. Đây là mẫu service-locator được tối ưu để phân giải không cấp phát bộ nhớ. Nó không phải một DI container truyền thống — được thiết kế để đạt hiệu năng trên hot path của tầng mạng.

## Nhà cung cấp metadata

Metadata của handler (`PacketMetadata`) hiện được phân giải tại thời điểm biên dịch bởi source generator `PacketHandlerGenerator`, đọc các attribute trên method handler. Các custom attribute trên method handler được lưu trong `PacketMetadata.CustomAttributes` và có thể đọc từ middleware qua `context.Attributes.GetCustomAttribute<T>()`.

## Middleware

Logic được chèn trước hoặc bao quanh việc thực thi handler, sử dụng **`MiddlewarePipeline`**. Nó hoạt động trên `IPacketContext<TPacket>` sau khi gói tin được giải tuần tự hóa, với quyền truy cập đầy đủ vào gói tin và metadata của handler.

## PacketBase\<T\>

Lớp cơ sở cho mọi gói tin của Nalix. Cung cấp quản lý system header (opcode, flags, priority, sequence id) và hỗ trợ pooling qua `ResetForPool()`. Các instance PacketBase được tái sử dụng qua object pool để tránh cấp phát theo từng gói tin.

## PacketContext

`PacketContext<TPacket>` là đối tượng runtime cụ thể, có pool, cho mỗi yêu cầu, nằm sau `IPacketContext<TPacket>`. Nó cung cấp quyền truy cập vào:

- Gói tin đã giải tuần tự hóa
- Kết nối hiện tại
- Metadata gói tin đã phân giải (attribute)
- Cancellation token
- Một sender có pool để phản hồi thủ công

## Registry gói tin

Một danh mục bộ giải tuần tự hóa gói tin dùng chung trong toàn process. Nó được điền tự động bởi **Source Generator** và được hoàn tất qua `PacketRegistry.Build()`. Cung cấp tra cứu O(1) theo OpCode bằng một bảng chỉ mục trực tiếp.

## PacketBase<T>.Create()

Mẫu factory tĩnh dùng để thuê một gói tin từ object pool. Instance trả về được bọc trong khối `using` và tự động trả về pool khi dispose.

## Protocol

`Protocol` là cầu nối giữa một kết nối đang hoạt động và pipeline dispatch. Trên thực tế, nó:

- Chấp nhận hoặc từ chối kết nối mới qua `ValidateConnection()`
- Khởi động các vòng lặp nhận
- Chuyển các khung thông điệp đến vào dispatch qua `ProcessMessage()`
- Quyết định kết nối có được giữ mở sau khi xử lý hay không

## Bộ xử lý giá trị trả về

Invoker do source generator sinh ra chuyển kiểu trả về của handler thành một hành động gửi. Các kiểu trả về được hỗ trợ gồm:

- `TPacket` / `Task<TPacket>` / `ValueTask<TPacket>`
- `byte[]` / `Memory<byte>` / `ReadOnlyMemory<byte>`
- `void` / `Task` / `ValueTask` (không có phản hồi)

## Snowflake

Một định danh phân tán 64-bit được tùy chỉnh, dùng để theo dõi tác vụ nội bộ và liên kết gói tin. Sử dụng dấu thời gian Unix tính bằng giây 32-bit, sequence 14-bit (16.384 ID mỗi giây trên mỗi node) và machine ID 10-bit (1.024 node).

## TCP so với UDP

| Transport | Dùng khi |
| :--- | :--- |
| **TCP** | Request/response đáng tin cậy, có thứ tự. Là mặc định và điểm bắt đầu được khuyến nghị. |
| **UDP** | Datagram độ trễ thấp, chấp nhận được việc mất gói. Yêu cầu định danh phiên và xác thực được thiết lập trước. |

## TimingWheel

Bộ lập lịch timeout khi nhàn rỗi được tầng mạng sử dụng. Quản lý timeout kết nối với độ phức tạp lập lịch O(1). Phát hiện và đóng các kết nối đã chết hoặc không hoạt động một cách hiệu quả.

---

## Trang nên đọc tiếp

- [Kiến trúc](./internals/architecture.md) — Tổng quan thành phần theo lớp
- [Middleware](./internals/middleware-pipeline.md) — Middleware Pipeline và chính sách handler
