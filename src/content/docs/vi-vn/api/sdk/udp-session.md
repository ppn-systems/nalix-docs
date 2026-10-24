---
title: UDP Session
description: "Tham chiếu cho Nalix.SDK.Transport.UdpSession — transport UDP phía client có xác thực, với tiền tố SessionToken 8 byte, đuôi MAC XxHash32 4 byte và ghim cổng của TCP đi kèm."
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport`  
**Assembly:** `Nalix.SDK`

`UdpSession` (`[UnsupportedOSPlatform("browser")] public class UdpSession : TransportSession`) là transport datagram có xác thực phía client trong `Nalix.SDK`, được xây dựng trên `UdpFrameSender` và `UdpFrameReader`.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Transport/UdpSession.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameSender.cs`
- `src/Nalix.SDK/Transport/Internal/Udp/UdpFrameReader.cs`
- `src/Nalix.Codec/Transforms/FramePipeline.cs`

## Định dạng datagram có xác thực trên dây

### Chiều gửi (Client $\rightarrow$ Server)

`UdpFrameSender` bọc mỗi gói đã được biến đổi trong một **phong bì xác thực 12 byte** (`8-byte SessionToken prefix` + `4-byte seeded XxHash32 MAC trailer`):

```text
+-----------------------------------+-----------------------------------+-----------------------------------+
|  SessionToken (8B, LE UInt64)     |  Transformed Packet Payload       |  UdpMacTag (4B, LE UInt32)        |
|  (_state.SessionToken)            |  (Compressed / AEAD Encrypted)    |  XxHash32(Secret, seed: Hash(0..N))|
+-----------------------------------+-----------------------------------+-----------------------------------+
  Bytes 0..7                          Bytes 8..(dataLen - 1)              Bytes dataLen..(dataLen + 3)
```

1. **Biến đổi chiều gửi**: Gọi `FramePipeline.ProcessOutbound(...)` để áp dụng nén LZ4 và mã hóa AEAD với số sequence 32-bit tiếp theo.
2. **Chốt MTU**: Kiểm tra `current.Length + 8 + 4 <= Options.MaxUdpDatagramSize` (mặc định `1400` byte); ném `NetworkException` nếu vượt quá.
3. **Tính MAC có khóa**: Ghi `SessionToken` (`8` byte) + payload đã biến đổi (`current.Length` byte), tính `uint payloadHash = XxHash32.Compute(finalLease.SpanFull[..dataLen])`, tính `uint computedTag = XxHash32.Compute(_state.Secret.AsSpan(), seed: payloadHash)`, rồi gắn `computedTag` làm đuôi 4 byte little-endian.

### Chiều nhận (Server $\rightarrow$ Client)

`UdpFrameReader` xác thực mọi datagram nhận được trước khi chuyển tiếp:
1. Yêu cầu `!_state.Secret.IsZero` và `datagram.Length >= PacketHeader.Size + 4`.
2. Xác minh đuôi MAC `XxHash32` 4 byte với `_state.Secret` và loại bỏ đuôi 4 byte đó.
3. Chạy `FramePipeline.ProcessInbound(...)` (giải mã AEAD + giải nén LZ4) và kiểm tra số sequence với `_sequence.IsValid(seq, s_sequenceOptions.UdpWindow)`.
4. Chuyển payload đã xác minh tới `DispatchPendingMessage`, `OnMessageReceived` và `OnMessageAsync`.

## Tham chiếu API công khai

```csharp
namespace Nalix.SDK.Transport;

[UnsupportedOSPlatform("browser")]
public class UdpSession : TransportSession
{
    public UdpSession(TransportOptions options, SessionState? state = null);

    public ulong SessionToken { get; set; }
    public override TransportOptions Options { get; }
    public override bool IsConnected { get; }

    public override event EventHandler? OnConnected;
    public override event EventHandler<Exception>? OnDisconnected;
    public override event EventHandler<IBufferLease>? OnMessageReceived;
    public override event EventHandler<Exception>? OnError;
    public event Func<ReadOnlyMemory<byte>, Task>? OnMessageAsync;

    public override Task ConnectAsync(string? host = null, ushort? port = null, CancellationToken ct = default);
    public override Task DisconnectAsync();
    public override Task SendAsync(IPacket packet, CancellationToken ct = default);
    public override Task SendAsync(IPacket packet, bool? encrypt = null, CancellationToken ct = default);
    public override Task SendAsync(ReadOnlyMemory<byte> payload, bool? encrypt = null, CancellationToken ct = default);
    public override void ResetSequenceCounters();
}
```

## Mô hình ghép đôi TCP + UDP (chia sẻ `SessionState`)

Trên máy chủ, `UdpListenerBase` xác thực datagram UDP dựa trên kết nối TCP đang hoạt động trong `IConnectionHub` (`SessionToken` + `Secret` + ghim endpoint theo `LocalPort`). Hãy truyền `tcpSession.State` khi tạo `UdpSession`:

```csharp
using System;
using System.Threading.Tasks;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;

TransportOptions options = new()
{
    Address = "127.0.0.1",
    Port = 57206
};

// 1. Kết nối TCP và hoàn tất handshake X25519
//    Bước này điền tcp.State.Secret, tcp.State.SessionToken và tcp.State.LocalPort
using TcpSession tcp = new(options);
await tcp.ConnectAsync();
await tcp.HandshakeAsync();

// 2. Tạo UdpSession đi kèm, chia sẻ tcp.State
//    UdpSession.ConnectAsync tự động bind vào tcp.State.LocalPort (ReuseAddress = true)
using UdpSession udp = new(options, tcp.State);
udp.OnMessageReceived += (_, lease) =>
{
    Console.WriteLine($"Received authenticated UDP datagram ({lease.Length} bytes)");
};

await udp.ConnectAsync();
await udp.SendAsync(new PlayerInputPacket { X = 12.5f, Y = 4.0f });
```

## API liên quan

- [Transport Session](./transport-session.md)
- [TCP Session](./tcp-session.md)
- [UDP Listener (Server)](../network/udp-listener.md)
- [Transport Options](../options/sdk/transport-options.md)
