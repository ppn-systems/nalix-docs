---
title: Mô hình mã hóa
description: Nalix ưu tiên bảo mật bằng cách bắt buộc sử dụng các thuật toán mật mã hiện đại, theo tiêu chuẩn công nghiệp cho mọi truyền tải dữ liệu. Framework xử lý sẵn độ phức tạp của AEAD (Authenticated Encryption with Associated Data), quản lý nonce và đồng bộ trạng thái cipher...
section: Concepts
---

Nalix ưu tiên bảo mật bằng cách bắt buộc sử dụng các thuật toán mật mã hiện đại, theo tiêu chuẩn công nghiệp cho mọi truyền tải dữ liệu. Framework xử lý sẵn độ phức tạp của AEAD (Authenticated Encryption with Associated Data), quản lý nonce và đồng bộ trạng thái cipher ngay từ đầu.

## Đường dẫn mã nguồn

- `src/Nalix.Codec/Security/EnvelopeCipher.cs`
- `src/Nalix.Codec/Security/Engine/AeadEngine.cs`
- `src/Nalix.Codec/Security/Engine/SymmetricEngine.cs`
- `src/Nalix.Abstractions/Security/CipherSuiteType.cs`

## Cipher chính: ChaCha20-Poly1305

Mặc định, Nalix dùng **ChaCha20-Poly1305**. Bộ cipher này được chọn vì nhiều lý do chính:

- **Hiệu năng**: Cực nhanh trên CPU hiện đại, kể cả những CPU không có tăng tốc phần cứng chuyên dụng (không giống AES-GCM).
- **Bảo mật**: Có biên an toàn cao và chống được nhiều kiểu tấn công kênh kề (side-channel) phổ biến.
- **Hỗ trợ AEAD**: Tự động cung cấp kiểm tra tính toàn vẹn. Nếu chỉ một bit của gói tin bị thay đổi trên đường truyền, quá trình giải mã sẽ thất bại.

### Chế độ plaintext tùy chọn

Tầng codec hiện cung cấp trường hợp `CipherSuiteType.None` trong cây mã nguồn. Hãy xem đây là chế độ plaintext/không có envelope tường minh, chỉ dành cho các môi trường được kiểm soát.

## Quản lý nonce

Quản lý nonce đúng cách là yếu tố then chốt đối với bảo mật của mọi stream cipher. Nalix quản lý vật liệu nonce một cách nội bộ bên trong các tầng envelope và frame:

- **Tạo nonce mới**: `src/Nalix.Codec/Security/EnvelopeCipher.cs` sinh một nonce ngẫu nhiên mới cho mỗi lần mã hóa envelope.
- **Đánh số thứ tự envelope**: Metadata thứ tự được mang trong header của envelope và được các engine mật mã bên dưới sử dụng theo suite đã chọn.

1. **Mức transport**: Cấu trúc framing và metadata envelope được giữ nguyên để transport có thể xử lý thông điệp đúng cách.

2. **Mã hóa payload**: Payload của gói tin được mã hóa bằng khóa phiên được dẫn xuất trong quá trình [Handshake](./handshake-protocol.md).

3. **Thẻ toàn vẹn**: Các suite AEAD nối thêm một thẻ xác thực **16 byte** như một phần của định dạng envelope.

## Mã hóa có chọn lọc

Nalix cho phép nhà phát triển quyết định gói tin nào cần mã hóa thông qua thuộc tính. Điều này hữu ích để tối ưu hiệu năng (ví dụ: các cập nhật di chuyển không nhạy cảm trong game).

```csharp
using Nalix.Abstractions.Networking.Packets;

public sealed class GameHandlers
{
    [PacketEncryption(false)]
    public ValueTask HandleHeartbeat(IPacketContext<HeartbeatPacket> ctx) { ... }

    [PacketEncryption(true)]
    public ValueTask HandlePrivateMessage(IPacketContext<PrivateMessage> ctx) { ... }
}
```

### Ghi đè động

Ngoài các thuộc tính tĩnh, **Nalix SDK** cho phép kiểm soát mã hóa theo từng lần gọi bằng tham số `encrypt` trong các phương thức `SendAsync`.

```csharp
// Ghi đè chính sách mặc định/thuộc tính cho lần gọi cụ thể này
await session.SendAsync(myPacket, encrypt: false);
```

:::warning[Bảo mật trước hết]
Mặc định, các phiên bảo mật đã được thiết lập được kỳ vọng sẽ gửi lưu lượng đã mã hóa.
Chỉ nên tắt mã hóa (qua thuộc tính hoặc tham số) đối với dữ liệu tần suất cao, không nhạy cảm, khi chi phí AEAD trở thành nút thắt.
:::

## Tính đúng đắn toán học

Các triển khai mật mã của Nalix được thiết kế để đạt cả hiệu năng tối đa lẫn độ đúng tuyệt đối. Để đảm bảo an toàn, các nguyên thủy của chúng tôi trải qua **kiểm thử tương tác** nghiêm ngặt với thư viện tiêu chuẩn công nghiệp [BouncyCastle](https://www.bouncycastle.org/).

[Bộ kiểm thử mật mã đã xác minh](../../api/security/cryptography.md) của chúng tôi xác nhận tính tương đương với:

- **Poly1305**: Số học modular 130-bit tuân thủ RFC 8439.
- **X25519**: Montgomery ladder và bit clamping tuân thủ RFC 7748.
- **Trình xử lý AEAD**: Xây dựng transcript đúng cho dữ liệu liên kết (AAD) và padding.

Điều này đảm bảo dữ liệu được Nalix mã hóa có thể được giải mã bởi bất kỳ thư viện nào tuân thủ tiêu chuẩn, và các phép toán cơ bản không mắc các lỗi giảm trường (field-reduction) thường gặp.

## Chủ đề liên quan

- [Giao thức handshake](./handshake-protocol.md)
- [Tiếp tục session](./session-resumption.md)
- [Đường dẫn nóng không cấp phát bộ nhớ](../internals/zero-allocation.md)
