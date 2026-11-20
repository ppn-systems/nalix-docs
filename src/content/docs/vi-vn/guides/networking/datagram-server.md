---
title: Máy chủ UDP
description: Hướng dẫn này chỉ cách host datagram listener của Nalix (NDP qua UDP) bằng MapDatagram và những gì cần cấu hình trước tiên.
section: Guides
---

Hướng dẫn này chỉ cách host datagram listener (`DatagramListener`, Nalix Datagram Protocol qua UDP) và những gì cần cấu hình trước tiên.

Hãy dùng nó khi bạn đã quyết định UDP là transport phù hợp, nhưng muốn có cấu trúc máy chủ tối thiểu và an toàn nhất trước khi bổ sung thêm logic game hoặc telemetry.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Core.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.Receive.cs`
- `src/Nalix.Network/Listeners/Datagram/DatagramListener.PublicMethods.cs`
- `src/Nalix.Network/Options/DatagramOptions.cs`
- `src/Nalix.Environment/Options/DatagramEngineOptions.cs`
- `src/Nalix.Hosting/NetworkApplicationBuilder.cs`
- `src/Nalix.Runtime/Handlers/DatagramTicketHandlers.cs`

## Khi nào UDP phù hợp

Hãy chọn UDP khi bạn quan tâm nhiều hơn đến:

- độ trễ thấp
- khả năng chịu mất gói
- datagram nhẹ
- telemetry, đồng bộ trạng thái, khám phá dịch vụ, hoặc các giao thức thời gian thực tùy chỉnh

Hãy chọn TCP khi bạn cần các luồng byte có thứ tự và đáng tin cậy theo mặc định. Một phiên datagram cũng có thể gửi đáng tin cậy: mỗi thông điệp được gửi với một `DeliveryMethod` (`Unreliable`, `UnreliableSequenced`, `ReliableUnordered`, `ReliableOrdered`, `ReliableSequenced`) trên một trong các kênh của phiên.

## Hình dạng tối thiểu

```csharp
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseSecureConnections()
    .MapHandlers(typeof(MyHandlers))
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .MapDatagram<DefaultProtocol>().OnPort(57206).Bind()
    .Build();

await app.RunAsync(cts.Token);
```

`MapDatagram<TProtocol>()` tạo một `DatagramListener` và tự ánh xạ các ticket handler (`DatagramTicketHandlers`) cho bạn. Nó chỉ có thể gọi một lần cho mỗi ứng dụng, vì ticket được cấp bởi một listener duy nhất; lần gọi thứ hai sẽ ném `InvalidOperationException`. Không có lớp con nào cần viết và không có hook `IsAuthenticated(...)`: xác thực là một phần của protocol (xem [Bảo mật UDP](./datagram-security.md)).

Một phiên datagram luôn được tạo từ một phiên TCP hoặc WebSocket đã thiết lập. Client xin một ticket qua stream đó (handshake phải hoàn tất), rồi mở một socket UDP và gửi datagram đầu tiên trong thời hạn của ticket.

:::note
Một phiên datagram sao chép người dùng, mức quyền và secret của kết nối stream khi ticket được cấp, rồi sống độc lập: ngắt kết nối stream không đóng nó. Để kick một người dùng, hãy ngắt luôn các instance `DatagramConnection` có `StreamConnectionId` trùng khớp.
:::

## Những gì bạn cần quyết định

### 1. Kịch bản phiên

Dùng kết nối stream để thiết lập danh tính (handshake, đăng nhập, quyền) và phiên datagram để truyền lưu lượng nhanh. Kết nối datagram kế thừa handshake đã hoàn tất của kết nối stream.

### 2. Phương thức phân phối cho từng handler

Một handler có thể khai báo cách các phản hồi của nó được truyền trên phiên datagram bằng `PacketDeliveryAttribute` (`DeliveryMethod method, byte channel = 0`). Nếu không có attribute, transport của chính phiên được dùng nguyên trạng.

### 3. Tinh chỉnh lúc chạy

`DatagramOptions` (listener, trong `Nalix.Network.Options`):

| Thuộc tính | Mặc định | Ý nghĩa |
| :--- | :--- | :--- |
| `TicketLifetimeSeconds` | `10` | Số giây mà datagram đầu tiên của một ticket phải đến (1-300) |
| `MaxSessions` | `100000` | Số phiên cộng ticket đang chờ tối đa |
| `ReceiveWorkers` | `1` | Số worker nhận đọc socket UDP (1-64) |
| `SocketReceiveBufferSize` | `4194304` | Bộ đệm nhận của socket UDP, tính bằng byte |
| `SocketSendBufferSize` | `4194304` | Bộ đệm gửi của socket UDP, tính bằng byte |

`DatagramEngineOptions` (theo từng phiên, trong `Nalix.Environment.Options`) gồm `ChannelCount` (mặc định `8`, tối đa `64`), `IdleTimeoutMs` (`15000`), `MaxAckDelayMs` (`25`), `UnreliableExpiryMs` (`100`), `MaxMessageSize` (`1048576`), `EnableMtuProbing` (`true`) cùng ngân sách bộ đệm nhận/gửi và các khoảng cập nhật khóa. `DatagramEngineOptions.Validate()` từ chối các ngân sách không đủ chứa một thông điệp có kích thước tối đa.

Việc cho phép theo từng IP do `ConnectionGuard` mà host truyền cho listener xử lý: nó được hỏi khi một phiên được nâng cấp, và mỗi lần từ chối được đếm trong `TotalGuardRejections`.

## Thứ tự khởi động khuyến nghị

1. Khởi tạo các manager lõi (`ObjectPoolManager`, `BufferPoolManager`)
2. Kiểm tra hợp lệ các tùy chọn
3. Đăng ký logger và xây dựng `PacketRegistry`
4. Xây dựng dispatch channel (`PacketDispatchChannel`)
5. Xây dựng protocol handler
6. Xây dựng `DatagramListener` (hosting builder làm việc này cho `MapDatagram`)
7. Kích hoạt dispatch, sau đó kích hoạt listener

Cách này giúp thiết lập transport và thiết lập ứng dụng luôn đồng bộ với nhau.

## Chẩn đoán có sẵn

`DatagramListener.Metrics` (`DMetrics`) và `GenerateReport()` theo dõi:

- số datagram và số byte nhận được (`DatagramsReceived`, `BytesReceived`)
- các datagram bị loại vì sai định dạng (`DroppedMalformed`)
- các datagram bị loại vì connection id không xác định (`DroppedUnknown`)
- các datagram bị loại vì chưa xác thực (`DroppedUnauthenticated`)
- ticket đã cấp và đã hết hạn (`TicketsIssued`, `TicketsExpired`)
- phiên được chấp nhận, lần guard từ chối và lỗi (`TotalAccepted`, `TotalGuardRejections`, `TotalErrors`)

`SessionCount` và `PendingTicketCount` cho thấy bảng phiên và bảng ticket đang hoạt động.

## Mẫu thông dụng

```text
receive datagram (at most DatagramEngine.MaxDatagramSize = 1472 bytes)
  -> read the connection id from the cleartext datagram header
  -> known session  -> authenticate and decrypt it in the session's engine
  -> pending ticket -> authenticate the first datagram, then promote it to a session
  -> unknown id     -> drop (DroppedUnknown)
  -> failed check   -> drop (DroppedUnauthenticated)
  -> accepted session -> hand the message to the protocol and dispatch
```

## Những điều đội thường bỏ sót

- UDP không tạo ra một mô hình danh tính thứ hai: ticket được cấp qua một stream session đã xác thực
- các lần loại bỏ do chưa xác thực và do không xác định cần hiển thị trong chẩn đoán
- datagram lớn nhất là `DatagramEngine.MaxDatagramSize` (`1472` byte); thông điệp lớn hơn được engine phân mảnh, tối đa đến `MaxMessageSize`
- mỗi datagram được niêm phong bằng ChaCha20-Poly1305, nên các frame không bị mã hóa lần thứ hai

## API liên quan

- [Bộ lắng nghe UDP](../../api/network/datagram-listener.md)
- [Phiên UDP](../../api/sdk/datagram-session.md)
- [Giao thức](../../api/network/protocol.md)
- [Luồng xác thực UDP](./datagram-security.md)
- [Kiến trúc bảo mật](../../concepts/internals/security-architecture.md)
