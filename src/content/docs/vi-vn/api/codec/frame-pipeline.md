---
title: Frame Pipeline
description: Điều phối biến đổi khung vào và ra ở mức cao (nén LZ4 và mã hóa AEAD/đối xứng) trong Nalix.Codec.Transforms.FramePipeline.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.Transforms`  
**Assembly:** `Nalix.Codec`

`FramePipeline` thống nhất việc thực thi các biến đổi mật mã (`EnvelopeCipher`) và nén (`LZ4Codec`) cho khung vào và khung ra, giữ nguyên `PacketHeader` 6 byte (`FrameTransformer.Offset = 6`) trong khi biến đổi vùng payload (`DATA_REGION`).

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Transforms/FramePipeline.cs`
- `src/Nalix.Codec/Transforms/FrameCipher.cs`
- `src/Nalix.Codec/Transforms/FrameCompression.cs`
- `src/Nalix.Codec/Transforms/FrameTransformer.cs`

## Thứ tự trên wire chuẩn

- **Outbound (`ProcessOutbound`)**: Nén trước (`PacketFlags.COMPRESSED`) $\rightarrow$ Mã hóa sau (`PacketFlags.ENCRYPTED`).
- **Inbound (`TryProcessInbound` / `ProcessInbound`)**: Giải mã trước $\rightarrow$ Giải nén sau.

## API công khai

| Method | Chữ ký | Mô tả |
| --- | --- | --- |
| `TryProcessInbound` | `public static bool TryProcessInbound([Borrowed] ref IBufferLease current, ReadOnlySpan<byte> secret, CipherSuiteType algorithm, out uint? seq)` | Pipeline inbound không ném ngoại lệ. Giải mã và/hoặc giải nén `current` tại chỗ (thay `current` bằng một `BufferLease` mới thuê nếu có biến đổi). Trả về `false` nếu giải mã, xác thực hoặc giải nén thất bại. |
| `ProcessInbound` | `public static void ProcessInbound([Borrowed] ref IBufferLease current, ReadOnlySpan<byte> secret, CipherSuiteType algorithm, out uint? seq)` | Pipeline inbound có ném ngoại lệ. Ném `ArgumentNullException` (nếu `current` là `null`) hoặc `CipherException` (khi giải mã, xác thực hoặc giải nén thất bại). |
| `ProcessOutbound` | `public static void ProcessOutbound([Borrowed] ref IBufferLease current, bool enableCompress, int minSizeToCompress, bool enableEncrypt, ReadOnlySpan<byte> secret, uint? seq, CipherSuiteType algorithm)` | Áp dụng nén LZ4 outbound (khi `payloadSize >= minSizeToCompress` và nén tiết kiệm được $\ge 12.5\%$) và mã hóa envelope. Ném `ArgumentNullException`, `CipherException` (bao gồm trường hợp `seq.HasValue` là `false` khi bật mã hóa, được kiểm tra trước khi nén khi `doCompress && enableEncrypt`), `LZ4Exception` hoặc `InternalErrorException`. |

## Bất biến lúc chạy và bảo mật chính

1. **Ngưỡng tiết kiệm tối thiểu 12.5% (`IsCompressionWorthwhile`)**:
   - Nén outbound chỉ được giữ lại khi `compressedLength <= originalLength - (originalLength >> 3)` (nhỏ hơn ít nhất 12.5%). Nếu payload không thể nén, `FramePipeline` gửi payload thô mà không đặt `PacketFlags.COMPRESSED`.
2. **Đường dẫn hợp nhất chỉ cấp phát một lần**:
   - **Outbound (`ProcessOutboundFused`)**: Khi cả nén và mã hóa đều bật, kiểm tra `seq.HasValue` ngay từ đầu, thuê **một** `BufferLease` duy nhất (dành sẵn `BufferLease.TransportHeadroom`) với vùng đuôi tạm, nén vào vùng đuôi, mã hóa vào vùng chính, xóa vùng đuôi tạm, rồi commit độ dài cuối cùng.
   - **Inbound (`TryProcessInboundFused`)**: Khi khung có cả `PacketFlags.ENCRYPTED` và `PacketFlags.COMPRESSED`, giải mã vào một mảng tạm đã pool (được xóa trong `finally`), kiểm tra header LZ4 qua `FrameTransformer.TryGetDecompressedLength` với `Math.Min(CompressionOptions.MaxDecompressedSize, LZ4CompressionConstants.MaxBlockSize)` (giới hạn `256 KB`), và giải nén trực tiếp vào `BufferLease` cuối cùng.
3. **Xóa dữ liệu plaintext & theo dõi `EncryptedOnWire`**:
   - Khi `ProcessOutbound` mã hóa một `BufferLease` plaintext, nó đặt `plaintextLease.ZeroOnDispose = true` để plaintext nguồn được xóa khi trả về pool.
   - Khi `TryProcessInbound` / `FrameCipher` giải mã một khung inbound, lease plaintext tạo ra có **`EncryptedOnWire = true`** và **`ZeroOnDispose = true`**, đồng thời các bit tạm `PacketFlags.ENCRYPTED` và `PacketFlags.COMPRESSED` bị xóa khỏi `header.Flags`. Các handler phía sau và `[PacketEncryption(true)]` kiểm tra `lease.EncryptedOnWire` (`context.IsEncrypted`).
4. **Quyền sở hữu khi hoán đổi tham chiếu được mượn**:
   - `FramePipeline` thay đổi `ref IBufferLease current` bằng cách trỏ tham chiếu sang lease đã biến đổi mới và dispose mọi lease trung gian do nó tạo ra, nhưng **không bao giờ** dispose lease `current` gốc của bên gọi (để bên gọi quản lý vòng đời lease gốc một cách xác định).

## Ví dụ sử dụng

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;
using Nalix.Codec.Transforms;

// Outbound: nén payload >= 512 byte và mã hóa bằng ChaCha20-Poly1305
IBufferLease originalOut = OutboundLease;
IBufferLease currentOut = originalOut;
FramePipeline.ProcessOutbound(
    ref currentOut,
    enableCompress: true,
    minSizeToCompress: 512,
    enableEncrypt: true,
    secret: sessionSecret,
    seq: nextOutboundSeq,
    algorithm: CipherSuiteType.Chacha20Poly1305);

// Inbound: giải mã + giải nén không ném ngoại lệ trong vòng lặp nhận mạng
IBufferLease originalIn = InboundLease;
IBufferLease currentIn = originalIn;
if (FramePipeline.TryProcessInbound(
    ref currentIn,
    secret: sessionSecret,
    algorithm: CipherSuiteType.Chacha20Poly1305,
    out uint? envelopeSeq))
{
    // currentIn giờ chứa byte gói tin đã giải mã/giải nén (EncryptedOnWire == true)
}
```

## API liên quan

- [Frame Model](./packets/frame-model.md)
- [AEAD và Envelope](../security/aead-and-envelope.md)
- [Nén LZ4](./lz4.md)
- [BufferLease](../environment/memory/buffer-lease.md)
- [Sequencing](../environment/sequencing.md)
