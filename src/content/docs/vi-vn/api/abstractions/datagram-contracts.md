---
title: Datagram Contracts
description: Các contract phiên datagram trong Nalix.Abstractions.Networking.Datagrams, gồm IDatagramTransport, IDatagramTicketIssuer, DatagramTicketInfo, IDatagramProtection, IDatagramProtectionFactory, DeliveryMethod và PacketDeliveryAttribute.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Networking.Datagrams` (và `Nalix.Abstractions.Networking.Packets` cho `PacketDeliveryAttribute`)  
**Assembly:** `Nalix.Abstractions`

Phiên datagram là một phiên UDP đã xác thực, được mở bằng ticket do một kết nối stream (TCP hoặc WebSocket) đã thiết lập cấp. Các contract này định nghĩa cách phiên gửi thông điệp, cách cấp ticket, cách niêm phong từng datagram và cách một handler chọn phương thức phân phối cho các phản hồi của nó. Chúng được `Nalix.Network` và `Nalix.Codec` triển khai, và được `Nalix.Runtime` sử dụng.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramTransport.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramTicketIssuer.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramProtection.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/IDatagramProtectionFactory.cs`
- `src/Nalix.Abstractions/Networking/Datagrams/DeliveryMethod.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketDeliveryAttribute.cs`

## `DeliveryMethod`

`public enum DeliveryMethod : byte` (`DeliveryMethod.cs:10`) mô tả cách một thông điệp gửi qua phiên datagram được phân phối. Thứ tự và việc đánh số thứ tự được tính theo từng kênh. Các transport dạng stream (TCP, WebSocket) phân phối mọi phương thức một cách tin cậy và theo đúng thứ tự (`DeliveryMethod.cs:7-9`).

| Thành viên | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `Unreliable` | `0` | Được phân phối tối đa một lần, theo thứ tự bất kỳ; không bao giờ gửi lại (`DeliveryMethod.cs:12-15`). |
| `UnreliableSequenced` | `1` | Được phân phối tối đa một lần; thông điệp cũ hơn thông điệp mới nhất đã được phân phối trên cùng kênh sẽ bị loại bỏ. Không bao giờ gửi lại (`DeliveryMethod.cs:17-21`). |
| `ReliableUnordered` | `2` | Được phân phối đúng một lần, theo thứ tự bất kỳ (`DeliveryMethod.cs:23-26`). |
| `ReliableOrdered` | `3` | Được phân phối đúng một lần, theo thứ tự gửi trong cùng kênh (`DeliveryMethod.cs:28-31`). |
| `ReliableSequenced` | `4` | Thông điệp mới nhất của kênh được đảm bảo đến nơi; các thông điệp cũ hơn có thể bị bỏ qua. Chỉ thông điệp mới nhất được gửi lại (`DeliveryMethod.cs:33-37`). |

## `IDatagramTransport`

`public interface IDatagramTransport : IConnection.ITransport` (`IDatagramTransport.cs:192`) là transport của một phiên datagram; đây là giá trị `IConnection.Transport` trả về trên kết nối datagram (xem [Connection Contracts](./connection-contracts.md)).

Các lần gửi qua các thành viên `IConnection.ITransport` thông thường dùng `DeliveryMethod.ReliableOrdered` trên kênh `0` (`IDatagramTransport.cs:184-187`). Mọi datagram đều được bảo vệ bởi AEAD của phiên và cửa sổ chống phát lại, nên các frame nhận được trên transport này được coi là đã mã hóa trên đường truyền và số thứ tự bên trong chúng không được kiểm tra lại (`IDatagramTransport.cs:188-191`).

| Thành viên | Chữ ký | Mô tả |
| --- | --- | --- |
| `SendAsync` | `ValueTask SendAsync(ReadOnlyMemory<byte> message, DeliveryMethod method, byte channel, CancellationToken cancellationToken = default)` | Gửi một frame Nalix với một phương thức phân phối trên một kênh. Thông điệp được sao chép trước khi lệnh gọi trả về; task trả về hoàn tất khi thông điệp đã được đưa vào hàng đợi (`IDatagramTransport.cs:194-202`). |
| `WithDelivery` | `IConnection.ITransport WithDelivery(DeliveryMethod method, byte channel)` | Trả về một view của transport này mà các lần gửi dùng `method` trên `channel`. Các view được lưu đệm, nên gọi lặp lại không cấp phát. Ném `ArgumentOutOfRangeException` nếu phương thức không hợp lệ hoặc kênh không nhỏ hơn số kênh của phiên (`IDatagramTransport.cs:204-212`). |

## `IDatagramTicketIssuer`

`public interface IDatagramTicketIssuer` (`IDatagramTicketIssuer.cs:138`) được datagram listener triển khai và cấp ticket phiên cho các kết nối stream đã thiết lập (`IDatagramTicketIssuer.cs:135-137`).

```csharp
DatagramTicketInfo IssueTicket(IConnection streamConnection, Action<IConnection>? onAccepted = null);
```

- `streamConnection`: kết nối TCP hoặc WebSocket đã thiết lập.
- `onAccepted`: chạy trên kết nối datagram mới sau khi datagram đầu tiên của nó được xác thực, trước khi nó được đăng ký và điều phối (ví dụ để sao chép trạng thái runtime).
- Trả về ticket để gửi cho client.

Ticket chỉ dùng được một lần. Secret, danh tính và mức quyền của kết nối stream được chụp lại khi ticket được cấp; các thay đổi sau đó của kết nối stream không ảnh hưởng đến phiên datagram (`IDatagramTicketIssuer.cs:140-150`).

## `DatagramTicketInfo`

`public readonly record struct DatagramTicketInfo(...)` (`IDatagramTicketIssuer.cs:165-174`) chứa các giá trị của một ticket:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `ConnectionId` | `ulong` | Định danh kết nối datagram (từ CSPRNG). |
| `Nonce` | `UInt128` | Nonce ticket 16 byte giúp khóa phiên luôn mới. |
| `Port` | `ushort` | Cổng UDP để gửi tới; host là host của phiên stream. |
| `ExpiresInSeconds` | `ushort` | Số giây mà datagram đầu tiên phải đến nơi. |
| `IdleTimeoutMs` | `int` | Thời gian chờ nhàn rỗi của phiên. |
| `MaxMessageSize` | `int` | Thông điệp lớn nhất mà mỗi bên chấp nhận. |
| `ChannelCount` | `byte` | Số lượng kênh. |
| `ReceiveBufferBytes` | `long` | Tổng số byte máy chủ đệm cho việc sắp xếp thứ tự và ghép lại. |
| `ChannelReceiveBufferBytes` | `long` | Số byte máy chủ đệm cho mỗi kênh. |

Ý nghĩa của các trường lấy từ tài liệu `<param>` tại `IDatagramTicketIssuer.cs:156-164`.

## `IDatagramProtection`

`public interface IDatagramProtection : IDisposable` (`IDatagramProtection.cs:54`) niêm phong và mở các datagram của một phiên bằng AEAD. Khóa của mỗi chiều là độc lập; mỗi chiều tự cập nhật khóa của mình và báo hiệu bằng bit key phase (`IDatagramProtection.cs:46-49`).

Các bản triển khai không an toàn đa luồng; phiên datagram tuần tự hóa các lệnh gọi. Một số gói tin được niêm phong tối đa một lần cho mỗi khóa: bên gọi không bao giờ dùng lại số đó (`IDatagramProtection.cs:50-53`).

| Thành viên | Chữ ký | Mô tả |
| --- | --- | --- |
| `TagSize` | `int TagSize { get; }` | Kích thước tính bằng byte của thẻ xác thực nối vào mọi payload đã niêm phong (`:59`). |
| `SendKeyPhase` | `bool SendKeyPhase { get; }` | Key phase của khóa gửi hiện tại; đảo giá trị mỗi lần `UpdateSendKey()` (`:64`). |
| `Seal` | `void Seal(ulong packetNumber, ReadOnlySpan<byte> header, ReadOnlySpan<byte> plaintext, Span<byte> destination)` | Mã hóa `plaintext` và xác thực nó cùng với `header` (dữ liệu liên kết). `packetNumber` chọn nonce. `destination` nhận bản mã theo sau là thẻ xác thực, cần ít nhất `plaintext.Length + TagSize` byte, và không được chồng lấn với `plaintext` (`:66-76`). |
| `TryOpen` | `bool TryOpen(ulong packetNumber, bool keyPhase, ReadOnlySpan<byte> header, ReadOnlySpan<byte> ciphertextAndTag, Span<byte> plaintext)` | Xác thực và giải mã một payload nhận được; trả về `true` khi payload là xác thực. Payload có key phase khác được mở bằng khóa trước đó nếu nó cũ hơn phase hiện tại, ngược lại dùng khóa kế tiếp; khi khóa kế tiếp thành công, nó trở thành khóa nhận hiện tại. `plaintext` cần ít nhất `ciphertextAndTag.Length - TagSize` byte và không được chồng lấn với `ciphertextAndTag` (`:78-92`). |
| `UpdateSendKey` | `void UpdateSendKey()` | Thay khóa gửi bằng khóa kế tiếp trong lịch khóa và đảo `SendKeyPhase` (`:94-97`). |
| `DiscardPreviousReceiveKey` | `void DiscardPreviousReceiveKey()` | Xóa sạch khóa nhận trước đó, sau khi các gói tin đến muộn của phase cũ không thể đến nữa (`:99-102`). |

(Số dòng trong bảng thuộc về `IDatagramProtection.cs`.)

## `IDatagramProtectionFactory`

`public interface IDatagramProtectionFactory` (`IDatagramProtectionFactory.cs:13`) tạo `IDatagramProtection` của một phiên từ secret của phiên stream và các giá trị của ticket, để tầng transport có thể niêm phong datagram mà không cần tham chiếu đến mã mật mã (`IDatagramProtectionFactory.cs:9-12`).

```csharp
IDatagramProtection Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer);
```

- `sessionSecret`: secret của phiên stream tại thời điểm ticket được cấp.
- `connectionId`: định danh kết nối datagram lấy từ ticket.
- `ticketNonce`: nonce ticket 16 byte.
- `isServer`: `true` cho phía máy chủ, phía này gửi bằng khóa máy chủ-tới-client.
- Bên gọi giải phóng (dispose) protection được trả về (`IDatagramProtectionFactory.cs:15-23`).

Bản triển khai mặc định là `ChaCha20Poly1305DatagramProtectionFactory` trong `Nalix.Codec` (`src/Nalix.Codec/Security/Datagram/ChaCha20Poly1305DatagramProtectionFactory.cs`, L13); hosting builder truyền `Instance` của nó cho datagram listener (`src/Nalix.Hosting/NetworkApplicationBuilder.cs`, L427). Xem [Nalix.Codec](../../packages/nalix-codec.md).

## `PacketDeliveryAttribute`

`public sealed class PacketDeliveryAttribute(DeliveryMethod method, byte channel = 0) : Attribute` (`PacketDeliveryAttribute.cs:17`, không gian tên `Nalix.Abstractions.Networking.Packets`) chọn phương thức phân phối và kênh cho các gói tin mà một handler gửi trên kết nối datagram. Nó chỉ áp dụng cho phương thức, không lặp lại được và không được kế thừa (`PacketDeliveryAttribute.cs:16`).

| Thành viên | Kiểu | Mô tả |
| --- | --- | --- |
| `Method` | `DeliveryMethod` | Phương thức phân phối (`:22`). |
| `Channel` | `byte` | Kênh; mặc định là `0` trong constructor (`:27`, `:17`). |

Khi không có attribute, các lần gửi datagram dùng `DeliveryMethod.ReliableOrdered` trên kênh `0`. Các kết nối stream bỏ qua nó và luôn phân phối tin cậy và theo đúng thứ tự (`PacketDeliveryAttribute.cs:10-13`).

Khi gửi, `PacketSender` đọc attribute từ metadata của handler: trên một `IDatagramTransport` nó gọi `WithDelivery(delivery.Method, delivery.Channel)`, còn không thì dùng nguyên transport của kết nối (`src/Nalix.Runtime/Dispatching/PacketSender.cs`, L254-265). Các frame gửi trên transport datagram không được tầng gói tin mã hóa lại, vì AEAD của phiên đã bảo vệ chúng (`PacketSender.cs:248-251`).

## Ví dụ

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Datagrams;
using Nalix.Abstractions.Networking.Packets;

// Phương thức handler: phản hồi được gửi không tin cậy, chỉ giữ bản mới nhất, trên kênh 2.
[PacketDelivery(DeliveryMethod.UnreliableSequenced, channel: 2)]
public ValueTask<PositionPacket> OnMove(IPacketContext<MovePacket> context) { /* ... */ }

// Cấp ticket qua kết nối TCP/WebSocket đã thiết lập.
static DatagramTicketInfo Open(IDatagramTicketIssuer issuer, IConnection tcp)
    => issuer.IssueTicket(tcp, onAccepted: datagram => { /* sao chép trạng thái runtime */ });

// Gửi trực tiếp trên kết nối datagram.
static async ValueTask Send(IConnection datagramConnection, ReadOnlyMemory<byte> frame)
{
    if (datagramConnection.Transport is IDatagramTransport transport)
    {
        await transport.SendAsync(frame, DeliveryMethod.ReliableSequenced, channel: 1);
    }
}
```

`PositionPacket`, `MovePacket` và `IPacketContext<T>` trong đoạn mã đầu tiên là các kiểu minh họa của ứng dụng.

## API liên quan

- [Connection Contracts](./connection-contracts.md)
- [Common Enumerations](./enums.md)
- [Packet Attributes](./packet-attributes.md)
- [Session Contracts](./session-contracts.md)
