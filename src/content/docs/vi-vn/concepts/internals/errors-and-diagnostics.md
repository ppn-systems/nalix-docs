---
title: Lỗi & chẩn đoán
description: Nalix dùng một hệ thống tín hiệu có cấu trúc để truyền các lỗi lúc chạy và vi phạm giao thức về cho client. Lỗi được báo cáo bằng các gói tín hiệu chuyên biệt (Directive, Handshake hoặc SessionResume) tùy theo vị trí lỗi trong pipeline xử lý...
section: Concepts
---

Nalix dùng một hệ thống tín hiệu có cấu trúc để truyền các lỗi lúc chạy và vi phạm giao thức về cho client. Lỗi được báo cáo bằng các gói tín hiệu chuyên biệt (`Directive`, `Handshake` hoặc `SessionResume`) tùy theo vị trí xảy ra lỗi trong pipeline xử lý.

## 1. Báo hiệu Directive

Gói `Directive` là cơ chế chính để báo cáo lỗi trong quá trình điều phối gói tin và thực thi middleware. Đây là một trong các kiểu gói tín hiệu có sẵn mà runtime dùng khi lỗi xảy ra sau khi luồng gói tin thông thường đã bắt đầu.

### Lỗi điều phối lúc chạy

Khi một gói tin không thực thi được ở mức dispatch, runtime có thể ánh xạ lỗi thành một phản hồi `Directive` tùy theo đường dẫn handler và kiểu lỗi.

| Nguồn kích hoạt | Lý do giao thức | Gợi ý | Cờ |
| :--- | :--- | :--- | :--- |
| Kiểu runtime của gói tin không khớp | `REQUEST_INVALID` | `FIX_AND_RETRY` | `NONE` |
| `descriptor.CanExecute == false` | `RATE_LIMITED` | `RETRY` | `IS_TRANSIENT` |
| `OperationCanceledException` | `TIMEOUT` | `RETRY` | `IS_TRANSIENT` |
| `ValidationException` / `ArgumentException` | `REQUEST_INVALID` | `FIX_AND_RETRY` | `NONE` |
| `UnauthorizedAccessException` | `UNAUTHORIZED` | `NONE` | `NONE` |
| `CipherException` | `DECRYPTION_FAILED` | `REAUTHENTICATE` | `NONE` |
| `NotSupportedException` | `OPERATION_UNSUPPORTED` | `NONE` | `NONE` |
| `SocketError.TimedOut` | `TIMEOUT` | `RETRY` | `IS_TRANSIENT` |
| `SocketError.ConnectionReset` | `CONNECTION_RESET` | `RETRY` | `IS_TRANSIENT` |
| `SocketError.ConnectionRefused` | `CONNECTION_REFUSED` | `RETRY` | `IS_TRANSIENT` |
| `SocketError.ConnectionAborted` | `REMOTE_CLOSED` | `RETRY` | `IS_TRANSIENT` |
| `SocketError.Shutdown` | `LOCAL_CLOSED` | `NONE` | `NONE` |
| Lỗi socket DNS | `DNS_FAILURE` | `RETRY` | `IS_TRANSIENT` |
| `SocketError.MessageSize` | `MESSAGE_TOO_LARGE` | `FIX_AND_RETRY` | `NONE` |
| Ngoại lệ dự phòng/không xác định | `INTERNAL_ERROR` | `NONE` | `NONE` |

:::note[Logic chặn thông báo]
Các ngoại lệ liên quan đến việc đóng như `OperationCanceledException` (khi máy chủ tắt) hoặc `ObjectDisposedException` được cố ý chặn ở đường gửi đi nếu kết nối đang đóng, nhằm tránh báo lỗi dư thừa.
:::

---

## 2. Lỗi middleware

Middleware có thể chặn gói tin và trả về directive lỗi trước khi logic handler được thực thi. Cơ chế này dùng để áp dụng chính sách về bảo mật, hiệu năng và độ ổn định.

### PermissionMiddleware

Nếu client cố gửi một opcode mà họ không được phép dùng:

- **Lý do:** `UNAUTHORIZED`
- **Metadata:** `arg2` chứa giá trị opcode bị từ chối.

### RateLimitMiddleware

Nếu client vượt quá lưu lượng được cấp cho một opcode cụ thể hoặc cho toàn bộ kết nối:

- **Lý do:** `RATE_LIMITED`
- **Gợi ý:** `RETRY`
- **Cờ:** `IS_TRANSIENT`
- **Metadata:**
 -`arg0`: Opcode đích
 -`arg1`: `RetryAfterMs` (số mili giây cần chờ)
 -`arg2`: Số credit còn lại (nếu có)

### TimeoutMiddleware

Nếu một handler mất nhiều thời gian hơn thời lượng thực thi tối đa đã cấu hình:

- **Kiểu:** `TIMEOUT`
- **Lý do:** `TIMEOUT`
- **Gợi ý:** `RETRY`
- **Cờ:** `IS_TRANSIENT`
- **Metadata:** `arg0` chứa thời lượng timeout (chia 100 khi lưu trữ).

---

## 3. Lỗi ở tầng giao thức

Một số lỗi xảy ra trong quá trình thiết lập kết nối ban đầu (Handshake) hoặc khôi phục session (Session Resume). Các lỗi này dùng kiểu gói tương ứng để báo hiệu thất bại trước khi máy chủ đóng kết nối.

### Từ chối handshake

Lỗi trong quá trình handshake dùng gói `Handshake` với `Stage = ERROR`.

| Lý do | Ý nghĩa |
| :--- | :--- |
| `STATE_VIOLATION` | Client cố thực hiện handshake trên một kết nối đã được xác thực. |
| `UNEXPECTED_MESSAGE` | Nhận gói handshake không đúng thứ tự với giai đoạn hiện tại. |
| `MALFORMED_PACKET` | Gói handshake không thể phân tích (dữ liệu bị hỏng nhị phân). |
| `DECRYPTION_FAILED` | Không giải mã được bằng chứng hoặc payload mật mã. |
| `SIGNATURE_INVALID` | Xác minh chữ ký handshake thất bại. |
| `CHECKSUM_FAILED` | Kiểm tra toàn vẹn của khung handshake thất bại. |

### Từ chối khôi phục session

Lỗi trong quá trình tiếp tục session dùng gói `SessionResume` với `Stage = RESPONSE`.

| Lý do | Ý nghĩa |
| :--- | :--- |
| `SERVICE_UNAVAILABLE` | Tính năng tiếp tục session bị tắt hoặc kho lưu trạng thái không khả dụng. |
| `STATE_VIOLATION` | Chuyển trạng thái không hợp lệ khi tiếp tục (ví dụ tiếp tục một session không tồn tại). |
| `TOKEN_REVOKED` | Token tiếp tục đã bị thu hồi rõ ràng. |
| `SESSION_EXPIRED` | Trạng thái session đã hết hạn và không thể khôi phục. |

---

## 5. Ngoại lệ transport không cấp phát bộ nhớ

Để giảm áp lực GC trong các sự kiện mạng có tần suất cao (kể cả khi lỗi), Nalix dùng tiện ích `Throw` (một lớp `internal` trong `Nalix.Network.Internal`) để cung cấp các instance ngoại lệ được cache, không cấp phát bộ nhớ cho các tình huống transport phổ biến.

### Ngoại lệ được cache

Ngoại lệ .NET thông thường thu thập toàn bộ stack trace khi được khởi tạo, đây là một chi phí lớn về cấp phát và CPU. `Throw` ghi đè hành vi này cho các kiểu nội bộ của nó:

- **Ghi đè `StackTrace`**: Các instance được cache trả về một chuỗi tĩnh ("at Nalix.Network.Internal.Transport (Cached Exception)") thay vì thực hiện việc quét stack.
- **Tái sử dụng tĩnh**: Các instance như `Throw.GetConnectionReset()` và `Throw.GetSendFailed()` được cấp phát trước và tái sử dụng cho mọi kết nối. Lưu ý rằng `Throw` là `internal`, các ngoại lệ được cache này do tầng transport của framework sử dụng, không được lộ ra mã ứng dụng.

### Ánh xạ lỗi socket

Phương thức `Throw.GetSocketError(SocketError)` cung cấp cách tra cứu nhanh cho các mã `SocketError` phổ biến, trả về các instance `SocketException` đã cache cho:

- `ConnectionReset`
- `ConnectionAborted`
- `OperationAborted`
- `Shutdown`
- `MessageSize`
- `ProtocolNotSupported`

Nhờ vậy, ngay cả khi hệ điều hành báo lỗi kết nối, runtime của Nalix vẫn không cấp phát bộ nhớ.

---

## 4. Hằng số kỹ thuật

- **Chuẩn hóa OpCode:** Gói `Directive` luôn dùng `OpCode = ProtocolOpCode.SYSTEM_CONTROL` (0x0001).
- **Logic ánh xạ:** Việc ánh xạ từ ngoại lệ sang lý do là một phần của đường thực thi dispatch lúc chạy.
- **Cờ gợi ý:**
 -`RETRY`: Gợi ý client nên thử lại yêu cầu.
 -`FIX_AND_RETRY`: Gợi ý yêu cầu bị sai định dạng và cần sửa lại.
 -`REAUTHENTICATE`: Gợi ý ngữ cảnh bảo mật đã mất (ví dụ việc xoay khóa session thất bại).

## Các bước tiếp theo nên đọc

- [Hệ thống gói tin](../how-packets-work.md): Tuần tự hóa và định dạng wire
- [Vòng đời gói tin](./packet-lifecycle.md): Đường đi của request từ socket đến handler
- [Middleware](../internals/middleware-pipeline.md): Middleware buffer so với middleware gói tin
- [Mô hình bảo mật](./security-architecture.md): Xác thực và mã hóa
