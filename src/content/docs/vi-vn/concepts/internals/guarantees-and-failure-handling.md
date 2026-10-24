---
title: Đảm bảo & xử lý lỗi
description: Khi xây dựng các hệ thống mạng có đồng thời cao, bạn cần biết chính xác nền tảng đảm bảo điều gì, điều gì xảy ra khi có sự cố và điều gì thuộc về logic ứng dụng của bạn...
section: Concepts
---

:::warning[Chủ đề nâng cao]
Trang này mô tả các contract cấp thấp, mô hình độ tin cậy và hành vi khi lỗi của runtime Nalix. Nếu bạn mới bắt đầu, hãy đọc [Kiến trúc](./architecture.md) và [Bắt đầu nhanh](../../quickstart.md) trước.
:::

Khi xây dựng các hệ thống mạng có đồng thời cao, bạn cần biết chính xác nền tảng đảm bảo điều gì, điều gì xảy ra khi có sự cố và điều gì thuộc về logic ứng dụng của bạn. Trang này trình bày cả ba nội dung đó.

## Đường dẫn mã nguồn

- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`
- `src/Nalix.Runtime/Dispatching/PacketDispatchChannel.cs`
- `src/Nalix.Runtime/Dispatching/PacketDispatcherBase.cs`
- `src/Nalix.Abstractions/Networking/IConnection.ErrorTracked.cs`
- `tests/Nalix.Framework.Tests/Memory/BufferPoolTests.cs`

## Runtime đảm bảo điều gì

### Xử lý kết nối tuần tự

Các gói tin đến từ **cùng một kết nối** được xử lý nghiêm ngặt theo đúng thứ tự.

- **Thứ tự FIFO**: Nếu Gói A đến trước Gói B trên Kết nối 1, handler của Gói A chạy trước handler của Gói B.
- **Loại trừ lẫn nhau**: Không có hai handler nào cho cùng một kết nối được thực thi đồng thời. Bạn không cần `lock` hay đồng bộ hóa nào khác để truy cập trạng thái riêng của kết nối bên trong handler.
- **Phạm vi**: Đảm bảo này áp dụng theo từng kết nối, trong một instance máy chủ. Nalix **không** đảm bảo thứ tự giữa các kết nối khác nhau; Kết nối A và Kết nối B được xử lý song song bởi các worker nền khác nhau.

:::note[Chi tiết triển khai]
Đạt được trong `DispatchChannel.cs` thông qua một máy trạng thái `readyFlag` nội bộ. Khi một worker lấy một kết nối từ hàng đợi sẵn sàng, nó "khóa" trạng thái sẵn sàng của kết nối đó cho đến khi gói tin hiện tại xử lý xong.
:::

### Thứ tự thực thi middleware

Pipeline middleware thực thi theo thứ tự được xác định bởi thuộc tính `[MiddlewareOrder]`: tăng dần cho inbound, giảm dần cho outbound. Thứ tự đăng ký chỉ là thứ yếu so với thứ tự đã khai báo. Bất kỳ middleware nào cũng có thể kết thúc request sớm bằng cách trả về gói `Directive` (ví dụ `FAIL` hoặc `UNAUTHORIZED`).

### Bất biến an toàn đa luồng

- **Dispatch an toàn đa luồng**: `PacketDispatchChannel` hỗ trợ đẩy gói tin đồng thời từ nhiều vòng lặp I/O mà không cần khóa bên ngoài.
- **An toàn registry**: `PacketRegistry` và `InstanceManager` an toàn đa luồng khi phân giải sau khi đã khởi tạo.

:::note[Chi tiết triển khai]
Nalix dùng các ring buffer MPMC (Multi-Producer Multi-Consumer) không khóa và các bộ đếm nguyên tử để đạt thông lượng cao mà không có tranh chấp mutex toàn cục.
:::

### Hợp đồng định tuyến phản hồi

Phản hồi được trả về từ handler luôn được định tuyến về đúng kết nối đã gửi request. Mỗi `PacketContext<TPacket>` được gắn với instance `IConnection` đang sống trong suốt vòng đời dispatch. Việc trả về `IPacket` hoặc `ValueTask<IPacket>` từ handler sẽ tự động serialize và gửi lại cho kết nối được ánh xạ.

### Những điều không được đảm bảo (giới hạn tường minh)

- **Giao hàng ít nhất một lần**: Với transport UDP, Nalix hoạt động theo kiểu cố gắng tốt nhất (best-effort). Nếu bạn cần giao hàng đáng tin cậy, phải tự triển khai ở tầng ứng dụng hoặc tầng giao thức.
- **Thứ tự toàn cục**: Không có đồng hồ toàn cục hay đảm bảo thứ tự nào giữa các gói tin từ các client khác nhau.
- **Tự động thử lại**: Nếu một handler ném ngoại lệ, Nalix ghi log và loại bỏ gói tin. Nó **không** tự động thực thi lại.

## Mô hình độ tin cậy

Mô hình độ tin cậy dựa trên ba trụ cột: thực thi xác định, cô lập lỗi và kỷ luật tài nguyên.

### Thực thi xác định

Tính gắn kết theo kết nối (hàng đợi theo từng kết nối) và thứ tự pipeline cố định (bảo mật, giới hạn tốc độ và logic được áp dụng một cách xác định theo cấu hình khởi động của bạn) loại bỏ các race ẩn thường gặp trong mạng đa luồng. Các handler thực chất chạy đơn luồng trên mỗi kết nối. Bạn có thể mở rộng tới hàng triệu kết nối trên nhiều luồng worker mà vẫn giữ được mô hình tư duy đơn giản cho logic nghiệp vụ.

### Cô lập lỗi

Runtime coi mã người dùng là tiềm ẩn bất ổn. Một ngoại lệ trong một handler không bao giờ dừng các vòng lặp worker nền hay ảnh hưởng đến các client khác. Mọi lỗi được theo dõi qua `IConnection.ErrorCount` (interface `IConnectionErrorTracked`); các tầng runtime và middleware có thể dùng tín hiệu này để nhận diện và tự động ngắt các client "độc hại". Một lỗi trong handler hoặc một gói tin bị hỏng sẽ không làm sập máy chủ của bạn.

### Kỷ luật tài nguyên

Nalix dùng `try-finally` nội bộ để đảm bảo mọi byte bộ nhớ thuê từ pool đều được trả lại, kể cả khi handler bị lỗi hoặc kết nối bị ngắt giữa chừng. Hàng đợi có giới hạn và chính sách drop/block mang lại backpressure tường minh thay vì tăng trưởng không giới hạn. Miễn là bạn giải phóng các đối tượng mà bạn thuê thủ công, Nalix có thể chạy hàng tháng mà không bị rò rỉ bộ nhớ hay các đợt tăng độ trễ do GC.

## Điều gì xảy ra khi có lỗi

### Cô lập lỗi trong thực tế

- **Ngoại lệ của handler**: Được bắt bởi `PacketDispatcherBase`. Request bị hủy, nhưng worker thread vẫn khỏe và tiếp tục xử lý gói tin kế tiếp trong hàng đợi.
- **Lỗi trong pipeline**: Nếu một middleware ném ngoại lệ, phần còn lại của pipeline bị bỏ qua chỉ cho gói tin đó.

Hành vi quan sát được: một log mức `Error` được phát ra qua `ILogger` đã cấu hình; `IConnection.ErrorCount` được tăng nguyên tử qua `connection.IncrementErrorCount()`; máy chủ cố gửi một gói `Directive` với `ControlType.FAIL` và `Reason = INTERNAL_ERROR` đến client.

### Xử lý dữ liệu đến bị lỗi

Dữ liệu đến bị hỏng được chặn ở giai đoạn sớm nhất có thể:

- **Lệch OpCode**: Một opcode chưa được đăng ký trong `PacketRegistry` khiến khung bị loại bỏ, kèm một log `Warning`.
- **Hỏng dữ liệu nhị phân**: Một lần giải tuần tự hóa thất bại (lật bit, thiếu trường) được bắt nội bộ dưới dạng `SerializationFailureException`.

Hành vi quan sát được: client nhận một `Directive` với `Reason = REQUEST_INVALID`.

### Hủy vòng đời (timeout và ngắt kết nối)

Nalix dùng việc lan truyền `CancellationToken` để tài nguyên không bị giữ bởi các request đã bị bỏ rơi.

- **Client ngắt kết nối**: Trạng thái `IConnection` được đánh dấu là không hoạt động. `PacketDispatchChannel` tự động làm rỗng hàng đợi gói tin đang chờ của kết nối đó và hủy mọi handler đang thực thi thông qua `PacketContext.CancellationToken`.
- **Timeout thực thi**: Nếu `TimeoutMiddleware` có mặt, nó sẽ hủy token của request sau thời lượng đã cấu hình.

:::note[Chi tiết triển khai]
`DispatchChannel.cs` lắng nghe sự kiện `ConnectionUnregistered` từ `IConnectionHub` để kích hoạt dọn dẹp tức thì các hàng đợi theo từng kết nối.
:::

### Kỷ luật tài nguyên khi lỗi

Bất kể thành công hay thất bại, việc dọn dẹp luôn được đảm bảo: mọi `BufferLease` đều được giải phóng qua một khối `try-finally` trong vòng lặp dispatch, ngăn rò rỉ trong `BufferPoolManager`; các đối tượng `PacketContext` được tái chế về pool nội bộ sau khi handler thực thi, bất kể kết quả.

### Tóm tắt tác động

| Sự kiện | Tác động lên máy chủ | Tác động lên client | Khả năng quan sát |
| :--- | :--- | :--- | :--- |
| Ngoại lệ của handler | Worker tiếp tục; error count++ | Nhận directive FAIL | `ILogger` (Error) |
| Gói tin bị hỏng | Loại bỏ gói tin; error count++ | Nhận directive INVALID | `ILogger` (Warning) |
| Ngắt kết nối | Hàng đợi được làm rỗng; handler bị hủy | Kết nối bị đóng | Sự kiện `IConnectionHub` |
| Giải tuần tự hóa thất bại | Loại bỏ khung; error count++ | Nhận directive INVALID | `ILogger` (Error) |

## Nhật ký kiểm tra kỹ thuật

| Thành phần | Tham chiếu mã nguồn | Trách nhiệm |
|:---|:---|:---|
| Dispatch Channel | `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs` | Thứ tự, gắn kết, dọn dẹp khi kết nối bị hủy đăng ký |
| Worker Loop | `src/Nalix.Runtime/Dispatching/PacketDispatchChannel.cs` | Cô lập lỗi và dọn dẹp buffer |
| ErrorHandler | `src/Nalix.Runtime/Dispatching/PacketDispatcherBase.cs` | Bọc ngoại lệ handler, gửi tín hiệu FAIL/INVALID cho client |
| Pools | `tests/Nalix.Framework.Tests/Memory/BufferPoolTests.cs` | Tính toàn vẹn của buffer |
| Contract `ErrorCount` | `src/Nalix.Abstractions/Networking/IConnection.ErrorTracked.cs` | Tín hiệu lỗi theo từng kết nối |

Nếu yêu cầu production của bạn đòi hỏi độ trễ dưới mili giây, thứ tự gói tin đảm bảo theo từng kết nối và khả năng chịu lỗi trước lỗi của handler, thì đây chính là mô hình mà Nalix được xây dựng xoay quanh.
