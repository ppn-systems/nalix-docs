---
title: Rekey phiên
description: Rekey phiên cho phép xoay vòng khóa đối xứng giữa phiên để ngăn bộ đếm sequence bị tràn và giới hạn khoảng thời gian khóa bị phơi lộ của các kết nối tồn tại lâu dài.
section: API Reference
package: Nalix.Codec / Nalix.Network
---

Rekey phiên cho phép xoay vòng khóa đối xứng giữa phiên để ngăn bộ đếm sequence bị tràn và giới hạn khoảng thời gian khóa bị phơi lộ của các kết nối tồn tại lâu dài.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/Extensions/RekeyExtensions.cs` — Extension của SDK phía client
- `src/Nalix.Runtime/Handlers/SystemControlHandlers.cs` — Handler control phía máy chủ

## Cách hoạt động

### Luồng xoay vòng khóa

```mermaid
sequenceDiagram
    participant C as Client (SDK)
    participant S as Server (Runtime)

    C->>C: Derive new key: newKey = HandshakeX25519.DeriveRekeySecret(currentSecret)
    C->>S: Control (Type = SESSION_REKEY, SequenceId = seq, encrypted under K_n)
    C->>C: Switch session.State.Secret = newKey (K_{n+1}) and reset sequence counters
    S->>S: Validate handshake, connection.Secret = HandshakeX25519.DeriveRekeySecret(connection.Secret) (K_{n+1})
    S->>S: Reset send+receive sequence counters
    S->>C: Control (Type = SESSION_REKEY_ACK, SequenceId = seq, encrypted under K_{n+1})
```

### Khi nào nên rekey

- **Tràn bộ đếm sequence**: Bộ đếm sequence 16-bit sẽ quay vòng sau 65,535 khung. Rekey sẽ đặt lại chúng.
- **Giảm khoảng thời gian bị lộ**: Xoay vòng khóa giới hạn lượng dữ liệu được mã hóa dưới một khóa duy nhất.
- **Phiên tồn tại lâu dài**: Máy chủ game, kết nối IoT và bảng điều khiển liên tục nên rekey định kỳ.

### Sử dụng phía client

SDK cung cấp `RekeyAsync()` trên `TransportSession`:

```csharp
using Nalix.SDK.Transport;

// Rekey sau mỗi 50,000 gói tin hoặc theo bộ hẹn giờ
await session.RekeyAsync();
```

Extension method này thực hiện các bước sau:

1. Dẫn xuất khóa phiên mới (`K_{n+1}`) từ bí mật hiện tại (`K_n`) bằng HKDF.
2. Gửi một gói `Control` với `Type = SESSION_REKEY`, được mã hóa bằng `K_n`.
3. Chuyển `session.State.Secret` sang `K_{n+1}` và đặt lại bộ đếm sequence cục bộ để giải mã được `SESSION_REKEY_ACK` của máy chủ (được mã hóa bằng `K_{n+1}`). Trên TCP và WebSocket, việc chuyển khóa chạy dưới send lock ngay sau khi yêu cầu được ghi (`SendThenSwitchAsync`), nên không có khung nào được mã hóa bằng khóa cũ có thể đi theo yêu cầu trên đường truyền.
4. Chờ `SESSION_REKEY_ACK` từ máy chủ (được đối chiếu theo `SequenceId`), trong vòng `Options.ConnectTimeoutMillis` (`5000` ms khi giá trị đó là `0`).

Nếu yêu cầu chưa rời đi, không có gì thay đổi. Nếu nó đã được ghi trên transport có thứ tự (TCP, WebSocket) và chỉ có phản hồi xác nhận bị trễ hoặc mất, khóa mới vẫn được giữ, vì máy chủ chuyển khóa ngay khi đọc yêu cầu. Trên transport không có thứ tự, khóa trước đó được khôi phục.

### Hành vi phía máy chủ

Handler `SystemControlHandlers.HandleSessionRekey` thực hiện:

1. Xác nhận handshake đã được thiết lập (`connection.GetRuntimeState().HandshakeEstablished`) và gói control đến ở dạng đã mã hóa (`context.EncryptedOnWire`).
2. Tính thế hệ khóa tiếp theo: `connection.Secret = HandshakeX25519.DeriveRekeySecret(connection.Secret)`.
3. Đặt lại bộ đếm sequence gửi và nhận của transport kết nối (`connection.Transport.SendSequence.Reset()` / `ReceiveSequence.Reset()`).
4. Phản hồi bằng `Control(SESSION_REKEY_ACK)` với cùng `SequenceId` để đối chiếu.

### Gói giao thức

| Gói | OpCode | Chiều | Trường |
| --- | --- | --- | --- |
| `Control` | `SYSTEM_CONTROL` | Client → Server | `Type = SESSION_REKEY`, `SequenceId` |
| `Control` | `SYSTEM_CONTROL` | Server → Client | `Type = SESSION_REKEY_ACK`, `SequenceId` khớp với yêu cầu |

## Ghi chú bảo mật

- Gói control được truyền dưới dạng mã hóa (`[PacketEncryption(true)]` trên kết nối) — nó đi qua cipher phiên hiện tại.
- Cả hai bên đều dẫn xuất khóa mới bằng HKDF-Expand với nhãn tĩnh `nalix-session/rekey`. Không có khóa nào được gửi trực tiếp trên đường truyền, nhờ đó rekey phiên có tính bảo mật thuận tiến (perfect forward secrecy).
- Rekey là tính năng của kết nối dạng luồng: `HandleSessionRekey` trả về mà không làm gì khi `context.Connection.Transport` là `IDatagramTransport`. `DatagramSession` tự dẫn xuất khóa từ bí mật của luồng lúc kết nối và tự chạy việc cập nhật khóa riêng.
- Nếu handshake chưa được thiết lập, kết nối sẽ bị ngắt ngay lập tức.
- Việc đặt lại bộ đếm sequence ngăn các khung cũ hoặc bị phát lại từ chu kỳ khóa trước được chấp nhận.

## API liên quan

- [Khôi phục phiên](./session-resume.md)
- [Giao thức Handshake](./handshake.md)
- [AEAD và Envelope](./aead-and-envelope.md)
