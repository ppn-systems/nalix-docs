---
title: API phiên mức thấp
description: Hướng dẫn Client Session chính tập trung vào các quy trình cấp cao như đăng ký gói tin có kiểu mạnh và các helper kết nối lại. Trang này bao gồm bề mặt transport cấp thấp được cung cấp bởi TransportSession, TcpSession và UdpSession...
section: Concepts
---

:::warning[Chủ đề nâng cao]
Trang này mô tả các vòng lặp sự kiện buffer thô, giữ bộ nhớ thủ công và bỏ qua các cơ chế bảo vệ của framework. Hãy hết sức thận trọng.
:::

[Hướng dẫn Client Session](../../guides/networking/connecting-clients.md) chính tập trung vào các quy trình cấp cao như đăng ký gói tin có kiểu mạnh và các helper kết nối lại. Trang này bao gồm bề mặt transport cấp thấp được cung cấp bởi `TransportSession`, `TcpSession` và `UdpSession`.

## 1. Hook thông điệp thô (đường không cấp phát bộ nhớ)

Thay vì dùng `session.On<MyPacket>(...)`, vốn giải tuần tự hóa các lớp động dựa trên danh mục của framework và tiêu tốn bộ nhớ, bạn có thể đăng ký các handler bộ nhớ thô.

### Phân tích đồng bộ thuần túy (`OnMessageReceived`)

Bạn nhận được một `IBufferLease` cho mỗi khung đã giải mã. Trong triển khai SDK hiện tại, `TcpSession` gọi `OnMessageReceived` từ `HandleReceiveMessage(...)` sau khi `FrameReader` hoàn tất một khung, còn `UdpSession` gọi nó từ vòng lặp nhận sau khi các biến đổi đầu vào hoàn tất. Trong cả hai trường hợp, SDK giữ quyền sở hữu lease và tự động giải phóng nó khi đường gọi callback kết thúc, trừ khi bạn gọi `Retain()` tường minh.

```csharp
// CẢNH BÁO: KHÔNG thực thi các vòng lặp CPU nặng hoặc các await tác vụ chặn ở đây.
// Bạn sẽ chặn toàn bộ luồng mạng không nhận được các khung tiếp theo.
session.OnMessageReceived += (sender, lease) =>
{
    // Kiểm tra bộ nhớ bên dưới một cách an toàn mà không cần tạo lớp để GC thu gom
    ReadOnlySpan<byte> rawData = lease.Span;
    if (rawData[..2].SequenceEqual(MyMagicNumber)) {
        Console.WriteLine("Matched Magic Bytes");
    }

    // lease được giải phóng tự động TRỪ KHI bạn gọi lease.Retain() để giữ quyền sở hữu.
    // Nếu bạn retain nó, BẠN phải tự gọi `lease.Dispose()` sau đó để tránh rò rỉ bộ nhớ!
};
```

### Xếp hàng bất đồng bộ thuần túy (`OnMessageAsync`)

Cung cấp một pipeline nhận bất đồng bộ (`event Func<ReadOnlyMemory<byte>, Task>?` được khai báo trên các session cụ thể `TcpSession`, `UdpSession` và `WebSocketSession`). Pipeline này tự động giữ lease bên dưới (`lease.Retain()`) trong suốt thời gian của `Task` được trả về và giải phóng nó khi hoàn tất (`TcpSession` và `WebSocketSession` theo dõi việc hoàn tất qua continuation, còn `UdpSession` await trực tiếp handler trước khi đọc datagram tiếp theo). Lưu ý rằng `TransportOptions.AsyncQueueCapacity` hiện được dành riêng và chưa được sử dụng.

```csharp
session.OnMessageAsync += async (payload) =>
{
    // payload là một ReadOnlyMemory<byte> đã được tách khỏi hot path một cách an toàn
    await Database.StreamChangesAsync(payload);
};
```

## 2. Điều khiển handshake và khôi phục chi tiết

Khi điều phối kết nối thủ công bằng `ConnectAsync()`, điều quan trọng là phải hiểu sự khác biệt giữa việc thiết lập một **kết nối hoàn toàn mới** và việc khôi phục sau khi **mất mạng**:

- **Resume (`ResumeSessionAsync`)**: Chỉ dùng khi client bị ngắt kết nối nhưng vẫn giữ `SessionToken` và `Secret` đối xứng trong bộ nhớ. Cách này hoàn toàn bỏ qua các phép toán bất đối xứng.
- **Handshake (`HandshakeAsync`)**: Dùng để dẫn xuất một bộ khóa mật mã hoàn toàn mới. Chỉ cần thiết cho các phiên bảo mật mới hoàn toàn (hoặc khi máy chủ của bạn yêu cầu tường minh; với máy chủ cục bộ plaintext, bạn có thể bỏ qua cả hai).

```csharp
// 1. Thiết lập luồng TCP thô
await session.ConnectAsync();

// 2. Kiểm tra xem đây có phải là kết nối lại không (chúng ta vẫn còn trạng thái định danh cũ)
if (session.State.SessionToken != 0 && !session.State.Secret.IsZero)
{
    // Đường nhanh: Báo cho server biết chúng ta đã mất kết nối nhưng vẫn còn khóa.
    ProtocolReason resumeResult = await session.ResumeSessionAsync();

    if (resumeResult == ProtocolReason.NONE)
    {
        Console.WriteLine("Dropped session recovered. No handshake needed!");
        return; // Chúng ta có thể truyền dữ liệu an toàn ngay lập tức.
    }

    // Nếu resume thất bại (ví dụ server đã loại bỏ session), thường chúng ta
    // phải đóng socket, gọi lại ConnectAsync() và chuyển sang Handshake.
}

// 3. Kết nối hoàn toàn mới (hoặc phương án dự phòng)
// Thương lượng các khóa mã hóa hoàn toàn mới một cách động bằng X25519.
// LƯU Ý: Không cần thiết nếu server của bạn chạy thuần chế độ Dev không mã hóa, không có handler Handshake.
await session.HandshakeAsync();
```

## 3. Truyền buffer thô (bỏ qua tuần tự hóa)

Với các hệ thống như proxy hoặc relay, bạn không muốn giải tuần tự hóa một gói tin chỉ để tuần tự hóa lại nó. SDK của Nalix cung cấp một overload `SendAsync` nhận trực tiếp `ReadOnlyMemory<byte>`. Cách này bỏ qua `PacketRegistry` và ghi byte trực tiếp vào `FrameSender` bên dưới.

```csharp
byte[] precomputedLoginPacket = ComputeStaticLogin();

// Bỏ qua việc khởi tạo struct, boxing interface và tuần tự hóa hoàn toàn.
// Bộ nhớ được lấy, nén, mã hóa và gửi ngay lập tức.
await session.SendAsync(precomputedLoginPacket.AsMemory());
```

:::tip
Cách này cực kỳ hữu ích cho các máy chủ thông lượng cao cần gửi liên tục cùng một gói tĩnh (ví dụ tín hiệu ping, cập nhật trạng thái bản đồ) đến hàng nghìn client. Hãy tính toán các byte một lần, rồi truyền slice bộ nhớ vào `SendAsync()`.
:::

## 4. Ghi đè mã hóa thủ công (theo từng gói)

Mặc dù `session.State.EncryptionEnabled` quyết định việc thực thi mã hóa toàn cục trên `TransportSession`, vẫn có những tình huống cần một khung nội bộ cụ thể bỏ qua các quy tắc toàn cục (ví dụ gửi gói `SessionInit` trước khi các khóa mã hóa được hoàn tất).

Nếu bạn làm việc trực tiếp với `ITransportSession`, bạn có thể ghi đè mã hóa cho từng lần gửi:

```csharp
ITransportSession session = myTcpSession;

// Ví dụ: buộc gói tin này đi dưới dạng plaintext ngay cả khi
// session thường sẽ mã hóa payload.
await session.SendAsync(new SessionInit(), encrypt: false);
```

:::danger
Ghi đè thủ công cờ mã hóa trên các endpoint tùy chỉnh có thể làm hỏng nghiêm trọng kết nối nếu máy chủ nhận khung đó đang bắt buộc kiểm tra ciphertext thông qua middleware. Hãy hết sức thận trọng và đảm bảo cấu hình phía máy chủ chấp nhận các đợt plaintext.
:::

## Đường dẫn thông tin liên quan

- [Khởi tạo client cấp cao](../../guides/networking/connecting-clients.md)
- [Đường dẫn không cấp phát bộ nhớ](../../concepts/internals/zero-allocation.md)
- [Tổng quan Transport Session](../../api/sdk/transport-session.md)
