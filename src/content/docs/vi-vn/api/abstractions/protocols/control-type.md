---
title: Kiểu điều khiển
description: Tham chiếu enum ControlType trong Nalix.Abstractions.Networking.Protocols cho tín hiệu hệ thống, ping/pong, đồng bộ thời gian, yêu cầu PoW và xoay vòng cipher/khóa.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Networking.Protocols`  
**Assembly:** `Nalix.Abstractions`

`ControlType` (`byte`) xác định lệnh hệ thống được mang trong khung protocol `Control` (`ProtocolOpCode.SYSTEM_CONTROL = 0x0001`).

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Protocols/ControlType.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`

## Định nghĩa enum

| Hex | Tên | Mô tả |
| --- | --- | --- |
| `0x00` | `NONE` | Không chỉ định thông điệp điều khiển. |
| `0x01` | `PING` | Yêu cầu kiểm tra sự sống và đo độ trễ round-trip. |
| `0x02` | `PONG` | Phản hồi cho yêu cầu `PING`. |
| `0x04` | `DISCONNECT` | Thông báo ngắt kết nối có kiểm soát, mang `ProtocolReason`. |
| `0x05` | `ERROR` | Thông báo lỗi protocol, giới hạn tốc độ, quyền hoặc dispatch. |
| `0x09` | `RESUME` | Tiếp tục một phiên bị gián đoạn. |
| `0x0A` | `SHUTDOWN` | Yêu cầu hoặc thông báo máy chủ tắt có kiểm soát. |
| `0x0B` | `REDIRECT` | Chỉ dẫn client kết nối lại tới endpoint khác. |
| `0x0D` | `NOTICE` | Thông báo bảo trì hoặc vận hành mang tính thông tin. |
| `0x10` | `TIMEOUT` | Handler hoặc yêu cầu bị hết thời gian chờ trên máy chủ. |
| `0x11` | `FAIL` | Thất bại thao tác chung. |
| `0x12` | `TIMESYNCREQUEST` | Client yêu cầu thời gian máy chủ độ phân giải cao (`TimeSync`). |
| `0x13` | `TIMESYNCRESPONSE` | Phản hồi của máy chủ mang timestamp độ phân giải cao. |
| `0x14` | `CIPHER_UPDATE` | Yêu cầu chuyển `CipherSuiteType` đang hoạt động. |
| `0x15` | `CIPHER_UPDATE_ACK` | Xác nhận chuyển đổi bộ mật mã. |
| `0x16` | `PUBLIC_KEY_REQUEST` | Client yêu cầu khóa công khai tĩnh của máy chủ (TOFU). |
| `0x17` | `POW_REQUEST` | Client yêu cầu câu đố Proof-of-Work. |
| `0x18` | `SESSION_REKEY` | Yêu cầu xoay vòng khóa đối xứng của phiên. |
| `0x19` | `SESSION_REKEY_ACK` | Xác nhận hoàn tất xoay vòng khóa phiên. |
| `0xFE` | `RESERVED1` | Dành riêng cho mở rộng protocol trong tương lai. |
| `0xFF` | `RESERVED2` | Dành riêng cho mở rộng protocol trong tương lai. |

## Cách dùng

Khung `Control` được cấp phát qua pool bằng `PacketBase<Control>.Create()` và mặc định dùng `PacketFlags.SYSTEM`:

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Codec.ProtocolFrames;

Control ping = Control.Create();
ping.Initialize(ControlType.PING, sequenceId: 42, reason: ProtocolReason.NONE, flags: PacketFlags.SYSTEM);
```

## API liên quan

- [Khung protocol có sẵn](../../codec/packets/built-in-frames.md)
- [Các enumeration dùng chung](./../enums.md)
- [Tiện ích điều khiển phía client](../../sdk/control-utilities.md)
