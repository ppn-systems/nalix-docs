---
title: Packet Sender
description: Tham chiếu cho Nalix.Runtime.Dispatching.PacketSender — bộ tuần tự hóa, nén, mã hóa và định tuyến transport cho gói tin đi ra, nhận biết metadata.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Dispatching`  
**Assembly:** `Nalix.Runtime`

`PacketSender` (`public sealed class PacketSender : IPacketSender`) là triển khai runtime mặc định của `IPacketSender`, gắn với mỗi `PacketContext<TPacket>` có pool và được cung cấp qua `context.Sender`.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Packets/IPacketSender.cs`
- `src/Nalix.Runtime/Dispatching/PacketSender.cs`
- `src/Nalix.Runtime/Extensions/ConnectionExtensions.cs`

## Cách `PacketSender` định tuyến và biến đổi gói tin đi ra

Khi `SendAsync` hoặc `ReplyAsync` được gọi:

1. **Chọn transport (`GetTransport`)**:
   - Nếu handler có `[PacketTransport(NetworkTransport.UDP)]`, chọn `connection.UDP` (ném `InvalidOperationException` nếu transport UDP đi kèm chưa được khởi tạo).
   - Nếu `[PacketTransport]` chỉ định `TCP` hoặc `WEBSOCKET`, chọn `connection.TCP`.
   - Nếu không có `[PacketTransport]`, phản hồi trên `connection.UDP` khi yêu cầu đến qua UDP (`!context.IsReliable && connection.UDP is not null`), ngược lại dùng `connection.TCP`.
2. **Quyết định mã hóa**:
   - `SendAsync(packet, ct)` dùng `needEncrypt = context.Attributes.Encryption?.IsEncrypted ?? false` (từ `[PacketEncryption]`).
   - `SendAsync(packet, forceEncrypt, ct)` ghi đè chính sách của attribute bằng `forceEncrypt`.
3. **Tuần tự hóa & biến đổi khung**:
   - Tuần tự hóa `packet` vào một `BufferLease` có pool qua `PacketPipeline.Serialize(packet, zeroOnDispose: needEncrypt)`.
   - Gọi `PacketPipeline.ProcessAndSendAsync` với `CompressionOptions.Enabled` và `CompressionOptions.MinSizeToCompress`, áp dụng nén LZ4 (khi có lợi) và mã hóa AEAD/đối xứng trước khi gửi trên transport đã chọn.
   - Dispose `BufferLease` một cách xác định trên cả đường hoàn tất đồng bộ lẫn bất đồng bộ.

## Phương thức công khai (`IPacketSender`)

| Phương thức | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `ReplyAsync` | `public ValueTask ReplyAsync(IPacket response, CancellationToken ct = default)` | Sao chép `SequenceId` của yêu cầu đến sang `response.Header.SequenceId` (để client `RequestAsync` / `StreamAsync` ghép cặp) rồi gọi `SendAsync(response, ct)`. |
| `SendAsync` (policy mặc định) | `public ValueTask SendAsync(IPacket packet, CancellationToken ct = default)` | Tuần tự hóa và gửi `packet` theo metadata `[PacketEncryption]` và `[PacketTransport]` của handler, không thay đổi `packet.Header.SequenceId`. |
| `SendAsync` (mã hóa tường minh) | `public ValueTask SendAsync(IPacket packet, bool forceEncrypt, CancellationToken ct = default)` | Tuần tự hóa và gửi `packet` với ghi đè `forceEncrypt` tường minh. |
| `Initialize<TPacket>` | `public void Initialize<TPacket>(IPacketContext<TPacket> context) where TPacket : IPacket` | Gắn sender với `context` (được `PacketContext<TPacket>.Initialize` gọi tự động). |
| `ResetForPool` | `public void ResetForPool()` | Xóa trạng thái kết nối, metadata, token và sequence khi `PacketContext<TPacket>` được trả về pool. |

## Ví dụ sử dụng

```csharp
using System.Threading.Tasks;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;

[PacketOpcode(0x1010)]
[PacketEncryption(true)]
public async ValueTask HandleOrder(IPacketContext<OrderRequestPacket> context)
{
    using PacketScope<OrderAckPacket> lease = PacketFactory<OrderAckPacket>.Acquire();
    OrderAckPacket ack = lease.Value;
    ack.Initialize(orderId: 9001);

    // ReplyAsync tự động gán ack.Header.SequenceId = context.Packet.Header.SequenceId
    await context.Sender.ReplyAsync(ack, context.CancellationToken);
}
```

## API liên quan

- [Packet Context (PacketContext<TPacket>)](./packet-context.md)
- [Kiểu trả về của Handler](./handler-results.md)
- [Frame Pipeline](../../codec/frame-pipeline.md)
- [Compression Options](../../options/network/compression-options.md)
