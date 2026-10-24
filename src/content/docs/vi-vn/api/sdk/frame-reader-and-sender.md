---
title: Frame Reader và Sender
description: Tham chiếu cho các frame reader và sender nội bộ của TCP, UDP và WebSocket trong Nalix.SDK.Transport.Internal — khung, phân mảnh, envelope MAC và bộ đếm sequence.
section: API Reference
package: Nalix.SDK
---

**Namespaces:** `Nalix.SDK.Transport.Internal`, `Nalix.Environment.Sequencing`  
**Assembly:** `Nalix.SDK`

Mỗi phiên cụ thể trong `Nalix.SDK` ủy thác I/O truyền tải mức thấp, phân mảnh, các biến đổi `FramePipeline` (nén LZ4 và mã hóa AEAD), và kiểm tra cửa sổ replay cho một cặp reader/sender nội bộ cùng một `SequenceCounter` không khóa.

:::warning[Cơ chế truyền tải nội bộ]
`TcpFrameReader`, `TcpFrameSender`, `UdpFrameReader`, `UdpFrameSender`, `WsFrameReader` và `WsFrameSender` là các kiểu `internal sealed`. Mã ứng dụng tương tác với chúng thông qua [TcpSession](./tcp-session.md), [UdpSession](./udp-session.md) và [WebSocketSession](./websocket-session.md).
:::

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/Internal/Tcp/TcpFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Tcp/TcpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameReader.cs`
- `src/Nalix.SDK/Transport/Internal/Ws/WsFrameSender.cs`
- `src/Nalix.Environment/Sequencing/SequenceCounter.cs`

## So sánh khung truyền tải

| Transport | Reader / Sender | Khung trên dây | Phân mảnh | Bảo vệ replay / sequence |
| :--- | :--- | :--- | :--- | :--- |
| **TCP** (`TcpSession`) | `TcpFrameReader` / `TcpFrameSender` | Tiền tố độ dài khung tổng `ushort` 2 byte little-endian (`HeaderSize = 2`) | Chia nhỏ `FragmentHeader` khi gửi (`>= MaxChunkSize`) / `FragmentAssembler` khi nhận | `SequenceCounter.IsValid(seq, TcpWindow)` (cửa sổ trượt `1024` bit) |
| **UDP** (`UdpSession`) | `UdpFrameReader` / `UdpFrameSender` | `[8B SessionToken (outbound)][Payload][4B XxHash32 MAC]` (`<= MaxUdpDatagramSize`) | Không có (chỉ kiểm tra MTU của một datagram) | `SequenceCounter.IsValid(seq, UdpWindow)` (cửa sổ trượt `512` bit) |
| **WebSocket** (`WebSocketSession`) | `WsFrameReader` / `WsFrameSender` | `WebSocketMessageType.Binary` (khung `EndOfMessage`) | `FragmentAssembler` khi nhận (khi gửi, thông điệp binary WebSocket hoàn chỉnh được gửi trực tiếp) | `SequenceCounter.IsValid(seq, TcpWindow)` (cửa sổ trượt `1024` bit) |

## Pipeline biến đổi gửi & nhận

```mermaid
flowchart LR
    subgraph Outbound["Outbound (Tcp/Udp/WsFrameSender)"]
        P1["Serialized BufferLease"] --> P2["FramePipeline.ProcessOutbound<br/>(LZ4 Compress -> AEAD Encrypt with SequenceCounter.Next())"]
        P2 --> P3["FragmentHeader Chunking (TCP if >= MaxChunkSize)<br/>or 8B Token + 4B XxHash32 MAC (UDP)"]
        P3 --> P4["Socket / ClientWebSocket Send"]
    end

    subgraph Inbound["Inbound (Tcp/Udp/WsFrameReader)"]
        R1["Socket / ClientWebSocket Receive"] --> R2["FragmentAssembler (TCP/WS)<br/>or 4B XxHash32 MAC Check (UDP)"]
        R2 --> R3["FramePipeline.ProcessInbound<br/>(AEAD Decrypt -> LZ4 Decompress)"]
        R3 --> R4["SequenceCounter.IsValid(seq, window)"]
        R4 --> R5["HandleReceiveMessage(IBufferLease)"]
    end
```

### Các bất biến nội bộ quan trọng

1. **Gửi đi được tuần tự hóa**: `TcpFrameSender` và `WsFrameSender` bảo vệ việc ghi socket bằng `SemaphoreSlim(1, 1)` (`_sendLock`), nên các lời gọi `SendAsync` đồng thời không bao giờ xen kẽ khung hoặc phần chia nhỏ trên stream.
2. **Nén rồi mới mã hóa (đối xứng)**: Khung gửi đi chạy `FramePipeline.ProcessOutbound` (nén payload có kích thước $\ge$ `CompressionOptions.MinSizeToCompress` trước khi mã hóa AEAD khi `encrypt == true`), còn khung nhận đi chạy `FramePipeline.ProcessInbound` (giải mã `PacketFlags.ENCRYPTED` trước khi giải nén `PacketFlags.COMPRESSED`).
3. **Cửa sổ replay của `SequenceCounter`**: Theo dõi số sequence truyền tải 32-bit nhúng trong các khung đã mã hóa và loại bỏ các gói trùng lặp hoặc nằm ngoài cửa sổ trước khi chúng tới `OnMessageReceived`.

## API liên quan

- [TCP Session](./tcp-session.md)
- [UDP Session](./udp-session.md)
- [WebSocket Session](./websocket-session.md)
- [Nén gói tin](../codec/frame-pipeline.md)
- [AEAD Ciphers](../security/aead-and-envelope.md)
