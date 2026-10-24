---
title: Hợp đồng gói tin
description: Hợp đồng cốt lõi cho packet, context, sender và deserializer trong Nalix.Abstractions.Networking.Packets, dùng chung cho package server và client.
section: API Reference
package: Nalix.Abstractions
---

`Nalix.Abstractions.Networking.Packets` định nghĩa các hợp đồng gói tin trên dây, handler context, sender và deserializer, dùng chung cho `Nalix.Codec`, `Nalix.Runtime`, `Nalix.Network` và `Nalix.SDK`.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Packets/IPacket.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketHeader.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketStaticOpcode.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketContext.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketDeserializer.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketSender.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketDeserializer.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketTimestamped.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketReasoned.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketValidatable.cs`
- `src/Nalix.Abstractions/Networking/Packets/IPacketStreamable.cs`
- `src/Nalix.Abstractions/Primitives/Bytes32.cs`

## Các kiểu chính

### `IPacket`

`public interface IPacket` là hợp đồng cơ sở cho mọi gói tin trên dây (`PacketBase<TSelf>` trong `Nalix.Codec` triển khai `IPacket`, `IPacketHeader` và `IPoolable`):

| Thành phần | Kiểu | Mô tả |
| --- | --- | --- |
| `Header` | `PacketHeader` | Header 6 byte trên dây (`OpCode`, `Flags`, `Priority`, `SequenceId`). |
| `Length` | `int` | Tổng độ dài byte sau khi tuần tự hóa của gói tin (bao gồm header 6 byte). |
| `Serialize()` | `byte[]` | Tuần tự hóa gói tin vào một mảng byte mới được cấp phát. |
| `Serialize(Span<byte> buffer)` | `int` | Tuần tự hóa không cấp phát bộ nhớ trực tiếp vào `buffer`, trả về số byte đã ghi. |

### `IPacketContext<TPacket>`

`public interface IPacketContext<TPacket> : IPoolable where TPacket : IPacket` biểu diễn context dispatch có pool cho mỗi gói tin, được truyền làm tham số `0` cho mọi handler `[PacketOpcode]`:

| Thuộc tính | Kiểu | Mô tả |
| --- | --- | --- |
| `Packet` | `TPacket` | Gói tin yêu cầu đã được giải tuần tự hóa. |
| `Connection` | `IConnection` | Kết nối client đã gửi gói tin. |
| `Attributes` | `PacketMetadata` | Attribute handler lúc biên dịch (`PacketOpcode`, `Timeout`, `Permission`, `Encryption`, `RateLimit`, `Transport`). |
| `Sender` | `IPacketSender` | Sender gửi gói tin đi, nhận biết metadata và được gắn với context này. |
| `Scope` | `IPacketScope` | Phạm vi service theo từng gói tin, dùng để resolve các tham số handler `[FromScope]`. |
| `EncryptedOnWire` | `bool` | `true` nếu khung đầu vào đến ở dạng mã hóa trên dây trước khi `FrameCipher.DecryptFrame` gỡ `PacketFlags.ENCRYPTED`. |
| `IsReliable` | `bool` | `true` khi gói tin đến qua transport đáng tin cậy (`TCP` hoặc `WEBSOCKET`). |
| `SkipOutbound` | `bool` | Khi đặt `true`, bỏ qua việc thực thi middleware đầu ra cho context này. |
| `CancellationToken` | `CancellationToken` | Cancellation token chi phối việc thực thi handler (bao gồm ngân sách của `TimeoutMiddleware`). |

### `IPacketSender`

`public interface IPacketSender : IPoolable` cung cấp các helper phản hồi nhận biết metadata bên trong handler và middleware:

| Phương thức | Chữ ký | Mô tả |
| --- | --- | --- |
| `Initialize<TPacket>` | `void Initialize<TPacket>(IPacketContext<TPacket> context) where TPacket : IPacket` | Gắn sender có pool với `IPacketContext<TPacket>` đang hoạt động. |
| `SendAsync` | `ValueTask SendAsync(IPacket packet, CancellationToken ct = default)` | Gửi `packet` tới `context.Connection`, tự động áp dụng metadata `[PacketEncryption]` và `[PacketTransport]` từ handler. |
| `SendAsync` (mã hóa tường minh) | `ValueTask SendAsync(IPacket packet, bool forceEncrypt, CancellationToken ct = default)` | Gửi `packet` và ghi đè tường minh việc mã hóa (`forceEncrypt`). |
| `ReplyAsync` | `ValueTask ReplyAsync(IPacket response, CancellationToken ct = default)` | Tự động gán `response.SequenceId = context.Packet.SequenceId` trước khi gửi để `session.RequestAsync<T>()` ghép đúng phản hồi. |

### Các hợp đồng và primitive hỗ trợ

- **`IPacketStaticOpcode`**: `public static abstract ushort StaticOpCode { get; }` — gắn một lớp gói tin với opcode 16-bit lúc biên dịch cho `PacketRegistryGenerator`.
- **`IPacketDeserializer<out TPacket>`**: `public static abstract TPacket Deserialize(ReadOnlySpan<byte> buffer)` — factory static không dùng reflection, được `PacketBase<TSelf>` triển khai.
- **`PacketDeserializer`**: `public delegate IPacket PacketDeserializer(ReadOnlySpan<byte> raw)` — delegate được lưu trong `PacketRegistry`.
- **`IPacketTimestamped`**: Cung cấp `long Timestamp { get; set; }` và `long MonoTicks { get; set; }` cho gói tin đo độ trễ và đồng bộ thời gian.
- **`IPacketReasoned`**: Cung cấp `ProtocolReason Reason { get; }` cho gói tin điều khiển và chẩn đoán.
- **`IPacketValidatable`**: Cung cấp `bool Validate([NotNullWhen(false)] out string? failureReason)` để kiểm tra cấu trúc gói tin.
- **`IPacketStreamable`** & **`IPacketStreamTerminator`**: Hợp đồng cho gói tin streaming từ máy chủ đến client (`bool IsEndOfStream { get; set; }` trên `IPacketStreamable`, và `bool IsTerminator { get; }` trên `IPacketStreamTerminator`).
- **`Bytes32`** (`Nalix.Abstractions.Primitives`): Kiểu giá trị cố định 32 byte (`Bytes32.Size = 32`), cấp phát trên stack (`[StructLayout(LayoutKind.Explicit)]` với 4 trường `ulong`, triển khai `IEquatable<Bytes32>` và `IFixedSizeSerializable`), dùng cho khóa X25519, nonce, digest Keccak-256 và bằng chứng HMAC (`Bytes32.Zero`, `IsZero`, `CopyFrom`, `WriteTo`, `TryWriteTo`, `AsSpan`, `ToByteArray()`, `Parse(string hex)`, `Wipe(ref Bytes32)`).

## Ranh giới trách nhiệm

- **`Nalix.Abstractions`**: Interface, attribute, header và primitive giá trị không phụ thuộc.
- **`Nalix.Codec`**: Mô hình khung `PacketBase<TSelf>` cụ thể, `PacketRegistry` và `LiteSerializer` nhị phân.
- **`Nalix.Runtime`**: `PacketContext<TPacket>` có pool, `PacketSender` và `PacketDispatchChannel`.
- **`Nalix.SDK`**: Phiên client (`TcpSession`, `UdpSession`, `WebSocketSession`) dùng cùng các hợp đồng gói tin.

## API liên quan

- [Mô hình khung (PacketBase<TSelf>)](../codec/packets/frame-model.md)
- [Registry gói tin](../codec/packets/packet-registry.md)
- [Packet Context lúc chạy](../runtime/routing/packet-context.md)
- [Packet Sender lúc chạy](../runtime/routing/packet-sender.md)
