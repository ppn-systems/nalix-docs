---
title: So sánh mạng đầu cuối
description: Benchmark độ trễ, thông lượng, CPU và cấp phát bộ nhớ đầu cuối qua socket, so sánh TCP, WebSocket và AEAD của Nalix với SignalR, gRPC và MagicOnion.
section: Benchmarks
---

Trang này báo cáo các phép đo **đầu cuối, qua socket thực tế** của Nalix so với các stack realtime khác trên .NET, tất cả chạy trên cùng một máy với cùng một harness. Khác với các micro-benchmark ở các phần khác trong mục này, mọi con số ở đây đều bao gồm ngăn xếp TCP của kernel, đóng khung, dispatch, tuần tự hóa, thread pool và thư viện client.

:::warning[Đọc kỹ các lưu ý]
Các số liệu này được đo trên một container Linux đám mây 4 vCPU qua loopback, nơi bộ sinh tải và các máy chủ tranh chấp cùng 4 lõi. Giá trị tuyệt đối thấp hơn nhiều so với trên phần cứng bare-metal có card mạng chuyên dụng. Hãy dùng chúng để *so sánh các stack với nhau*, không dùng làm số liệu sức chứa tuyệt đối.
:::

## Tóm tắt

:::note[Cả 12 thư viện được đo trên một máy]
Cả 12 framework và baseline dưới đây, cùng hai lần chạy chẩn đoán của Nalix, được đo vào ngày 2026-11-22 trên cùng một máy ảo Linux 4 vCPU trong một lượt chạy liên tục, trên runtime .NET 10.0.15 và với cấu hình Nalix mặc định mới tạo. Mọi so sánh đều phản ánh kết quả đối đầu trực tiếp trong cùng điều kiện phần cứng và hệ điều hành.
:::

- **Độ trễ một client:** Nalix TCP có p50 thấp nhất trong số các framework đầy đủ. Ở 32 B, p50 là 56.7 µs với Nalix TCP, 58.4 µs với Nalix AEAD và 64.5 µs với Nalix WebSocket, so với 70.4 µs của gRPC duplex, 79.8 µs của SignalR, 81.3 µs của MagicOnion hub và 99.6 µs của gRPC unary. Ở 1 KB, Nalix TCP đạt 58.1 µs so với 78.6 µs của SignalR, 79.2 µs của gRPC duplex và 97.7 µs của MagicOnion hub. Baseline socket thô viết tay (28.5 µs / 22.7 µs) và echo WebSocket Kestrel thô (50.7 µs / 56.8 µs) nhanh hơn.
- **Thông lượng với 64 client:**
  - Ở 32 B: Nalix TCP 97.0k ops/s, Nalix WebSocket 91.6k, Nalix TCP AEAD 86.5k, SignalR 79.5k, gRPC duplex 75.7k, MagicOnion hub 72.2k, gRPC unary 63.0k, MagicOnion unary 58.4k.
  - Ở 1 KB: Nalix TCP 86.2k ops/s, Nalix WebSocket 76.9k, SignalR 69.3k, Nalix TCP AEAD 66.9k, gRPC duplex 63.4k, MagicOnion hub 58.9k, gRPC unary 56.1k, MagicOnion unary 53.8k. Trên máy 4 lõi này, mọi framework đều bị giới hạn bởi CPU.
- **Thông lượng với 1 và 16 client:** Nalix TCP đứng đầu với 1 client ở cả hai kích thước (17.1k ở 32 B, 16.5k ở 1 KB). Với 16 client và 32 B, Nalix TCP (80.8k) và Nalix WebSocket (78.4k) dẫn trước SignalR (69.1k) và gRPC duplex (64.2k); với 16 client và 1 KB, Nalix WebSocket (70.5k) và Nalix TCP (69.4k) dẫn trước SignalR (63.7k) và gRPC duplex (62.1k).
- **Dispatcher inline (dòng chẩn đoán):** với `InlinePacketDispatcher`, vốn chuyển thẳng mỗi gói vào một work item của thread pool thay vì đi qua dispatch channel, Nalix TCP đạt 135.9k ops/s ở 32 B và 92.9k ở 1 KB với 64 client, với 15.0 µs CPU máy chủ mỗi tin nhắn, ngang với echo WebSocket Kestrel thô (133.7k). Đây là tùy chọn bật thêm, phù hợp với handler ngắn và không chặn.
- **CPU máy chủ trên mỗi tin nhắn:** với 64 client và 32 B, Nalix WebSocket (20.9 µs) và SignalR (21.0 µs) tốn ít CPU nhất trong các framework đầy đủ, rẻ hơn Nalix TCP (23.4 µs) và gRPC duplex (24.9 µs); phía client của Nalix cũng rẻ hơn (16.0 µs CPU/op phía client so với 21.6 µs của SignalR).
- **Cấp phát phía máy chủ:** 56 B mỗi tin nhắn ở 32 B với Nalix TCP, Nalix WebSocket và Nalix AEAD, thấp nhất trong số các framework đầy đủ (MagicOnion hub 200 B, gRPC duplex 264 B, SignalR 672 B). Chỉ baseline echo WebSocket Kestrel thô là cấp phát ít hơn (0 B). Ở 1 KB, Nalix TCP cấp phát 1,048 B so với 1,192 B của MagicOnion hub, 1,256 B của gRPC duplex và 1,664 B của SignalR.
- **Mã hóa:** Nalix AEAD (X25519 + ChaCha20-Poly1305) thắng gRPC qua TLS về độ trễ một client (p50 ở 32 B: 58.4 µs so với 105.2 µs của gRPC duplex TLS; ở 1 KB: 76.4 µs so với 114.5 µs), về thông lượng 64 client (86.5k so với 51.8k ops/s ở 32 B; 66.9k so với 49.3k ở 1 KB) và về cấp phát phía máy chủ (56 B so với 809 B ở 32 B; 1,048 B so với 1,795 B ở 1 KB).

## Môi trường

| Mục | Giá trị |
|:--|:--|
| CPU | Intel Xeon Processor @ 2.10 GHz (4 vCPU, 1 luồng mỗi lõi) |
| Bộ nhớ | 16 GB |
| OS | Ubuntu 24.04.5 LTS (Linux 6.18, máy ảo đám mây container) |
| Runtime | .NET 10.0.15 runtime (SDK 11.0.100-rc.3), Release, x64 RyuJIT, TieredPGO bật |
| GC | Server GC + Concurrent GC cho **mọi** tiến trình (từ `benchmarks/Directory.Build.props`) |
| Nalix | mã nguồn tại `master` (`ebb42388`, `Version.props` 14.3.10), tham chiếu project, cấu hình mặc định mới tạo |
| ASP.NET Core / SignalR | 10.0.13 (`Microsoft.AspNetCore.SignalR.Client`, `.Protocols.MessagePack` → MessagePack 2.5.303) |
| gRPC | `Grpc.AspNetCore` 2.84.0, `Grpc.Net.Client` 2.84.0, Google.Protobuf 3.35.1 |
| MagicOnion | `MagicOnion.Server` / `.Client` 7.11.0 (MessagePack 3.1.12) |
| Ngày | 2026-11-22 (mọi thư viện được đo trên một máy trong một lượt chạy) |
| Trạng thái máy | Máy ảo nhàn rỗi trước khi chạy; không có tải nào khác trong lượt chạy |

## Phương pháp

Harness: `benchmarks/Nalix.Comparison.Benchmarks` (runner `benchmarks/run-comparison.ps1` / `run-comparison.sh`). MagicOnion nằm trong một chương trình thực thi riêng, `benchmarks/Nalix.Comparison.MagicOnion`, vì nó cần MessagePack v3 trong khi giao thức MessagePack của SignalR được xây dựng với v2. Cả hai chương trình đều dùng chung một file mã nguồn harness.

- **Topology:** Driver khởi động **máy chủ của thư viện như một tiến trình con riêng** trên `127.0.0.1`, sau đó chạy các client bên trong tiến trình driver. Tiến trình máy chủ tự báo cáo `GC.GetTotalAllocatedBytes(precise: true)`, số lần thu gom Gen0/1/2 và thời gian CPU của tiến trình giữa các lệnh `reset` và `report` gửi qua stdin. Vì vậy, các số liệu cấp phát và CPU chỉ thuộc về máy chủ, và bao phủ **toàn bộ tiến trình** (gồm luồng I/O, timer và các tác vụ nền).
- **Khối lượng công việc:** Echo. Client gửi một payload byte không rõ nội dung dài **32 B** hoặc **1024 B**, và máy chủ trả lại đúng các byte đó trong một tin nhắn phản hồi. Mỗi thư viện dùng API request/response theo cách thông dụng nhất của nó:

| Nhãn | Chạy gì |
|:--|:--|
| `raw-tcp` | Baseline: echo `Socket` viết tay với tiền tố độ dài 4 byte. Không có framework. |
| `kestrel-ws` | Baseline: echo nhị phân `UseWebSockets` của ASP.NET Core, client `ClientWebSocket`. |
| `nalix-tcp` | Nalix `MapTcp<DefaultProtocol>` với một `[PacketController]` echo bằng phản hồi lấy từ pool (`PacketFactory<T>.Acquire()` + `context.Sender.SendAsync`). Client dùng `TcpSession.RequestAsync<T>`. **Tùy chọn mặc định**. |
| `nalix-ws` | Giống trên nhưng qua `MapWebSocket`, với client `WebSocketSession`. |
| `nalix-tcp-aead` | `UseSecureConnections()` + `UseSystemControl()`. Client chạy `HandshakeAsync()` (X25519), sau đó các yêu cầu được gửi với `WithEncrypt()` và handler có `[PacketEncryption(true)]`, nên cả hai chiều đều dùng ChaCha20-Poly1305. |
| `signalr-ws-msgpack` | Hub SignalR `byte[] Echo(byte[])`, chỉ dùng transport WebSockets, `SkipNegotiation`, giao thức MessagePack, `InvokeAsync<byte[]>`. |
| `grpc-unary` / `grpc-unary-tls` | Unary `rpc Unary(EchoMessage) returns (EchoMessage)` với trường `bytes`, qua h2c hoặc HTTP/2+TLS (ECDSA P-256 tự ký). |
| `grpc-duplex` / `grpc-duplex-tls` | Một luồng hai chiều dài hạn cho mỗi client, với một lần ghi và một lần đọc cho mỗi thao tác. |
| `magiconion-unary` / `magiconion-hub` | `IService<T>` `UnaryResult<byte[]>`, hoặc một phương thức `StreamingHub` trả về `ValueTask<byte[]>`, qua h2c. |

- **Mỗi client sở hữu kết nối riêng** (với gRPC và MagicOnion là `GrpcChannel` / `SocketsHttpHandler` riêng), nên "N client" nghĩa là N kết nối TCP với mọi thư viện.
- **Độ trễ:** Một client, gọi tuần tự. 20 000 lần khởi động làm nóng, sau đó **100 000 lần gọi có đo thời gian**. Mỗi lần gọi được đo bằng `Stopwatch` và các mẫu được sắp xếp để đọc chính xác các phân vị.
- **Thông lượng:** N ∈ {1, 16, 64} client theo **vòng lặp đóng** (mỗi client giữ một yêu cầu đang bay). Sau 2 s làm nóng, các yêu cầu được đếm trong cửa sổ 8 s.
- **Lần chạy:** 3 lần chạy cho mỗi ô. Các bảng hiển thị **median** của các lần chạy, và `±x%` bằng một nửa độ trải (max − min)/median.
- Máy chủ ASP.NET Core dùng `WebApplication.CreateBuilder`, xóa logging và đặt mức tối thiểu là Warning, Kestrel chỉ bind trên loopback. Không đối thủ nào được tinh chỉnh vượt quá cấu hình mặc định được tài liệu hóa. Với Nalix cũng vậy, trừ hai mặc định chống lạm dụng vốn sẽ làm hỏng phép thử tải qua loopback: harness nâng hạn mức kết nối theo IP và đặt `TimingWheelOptions.HandshakeTimeoutMs` về 0, vì các chế độ plaintext không bao giờ handshake và nếu không sẽ bị đóng 15 giây sau khi accept.
- Dữ liệu thô (JSON lines, mỗi dòng một lần chạy) nằm trong [data/network-comparison-results.jsonl](data/network-comparison-results.jsonl). Các bảng bên dưới được tạo từ dữ liệu này bởi `benchmarks/Nalix.Comparison.Benchmarks/aggregate.py`. File này cũng chứa hai lần chạy chẩn đoán của Nalix (`nalix-tcp-nocomp`, `nalix-tcp-inline`) không thuộc các bảng.

Tái tạo bằng:

```bash
benchmarks/run-comparison.sh        # Linux/macOS
```

```powershell
.\benchmarks\run-comparison.ps1    # Windows
```

## Kết quả

### Độ trễ — payload 32 B, 1 client, request/response tuần tự

| Thư viện | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | độ trải giữa các lần chạy (p50) | cấp phát máy chủ/op (B) |
|:--|--:|--:|--:|--:|--:|--:|--:|
| raw-tcp | 43.8 | 28.5 | 89.3 | 118.4 | 245.1 | ±30.6% | 144 |
| kestrel-ws | 51.0 | 50.7 | 80.8 | 109.8 | 204.8 | ±5.1% | 0 |
| nalix-tcp | 60.0 | 56.7 | 83.9 | 120.0 | 272.4 | ±1.4% | 56 |
| nalix-ws | 68.5 | 64.5 | 98.3 | 137.5 | 247.4 | ±4.1% | 56 |
| nalix-tcp-aead | 63.8 | 58.4 | 94.2 | 137.3 | 253.3 | ±6.5% | 56 |
| signalr-ws-msgpack | 83.5 | 79.8 | 118.0 | 175.7 | 611.0 | ±3.3% | 680 |
| grpc-unary | 108.3 | 99.6 | 158.3 | 262.9 | 949.3 | ±3.9% | 969 |
| grpc-duplex | 74.1 | 70.4 | 103.1 | 145.0 | 665.7 | ±2.9% | 264 |
| grpc-unary-tls | 203.6 | 184.2 | 327.0 | 518.2 | 1228.4 | ±6.6% | 1050 |
| grpc-duplex-tls | 116.6 | 105.2 | 181.3 | 289.1 | 731.8 | ±2.0% | 315 |
| magiconion-unary | 126.5 | 115.1 | 181.2 | 308.7 | 975.5 | ±3.6% | 1434 |
| magiconion-hub | 87.1 | 81.3 | 123.4 | 197.3 | 657.0 | ±4.8% | 200 |

### Độ trễ — payload 1024 B, 1 client, request/response tuần tự

| Thư viện | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | độ trải giữa các lần chạy (p50) | cấp phát máy chủ/op (B) |
|:--|--:|--:|--:|--:|--:|--:|--:|
| raw-tcp | 41.1 | 22.7 | 88.4 | 115.8 | 235.9 | ±3.4% | 144 |
| kestrel-ws | 59.0 | 56.8 | 89.5 | 128.1 | 222.4 | ±9.8% | 0 |
| nalix-tcp | 61.4 | 58.1 | 84.7 | 122.9 | 262.3 | ±1.5% | 1048 |
| nalix-ws | 77.8 | 70.5 | 112.5 | 182.1 | 567.4 | ±2.9% | 1048 |
| nalix-tcp-aead | 79.7 | 76.4 | 112.3 | 168.7 | 610.3 | ±4.3% | 1048 |
| signalr-ws-msgpack | 83.6 | 78.6 | 118.6 | 184.9 | 837.2 | ±3.6% | 1672 |
| grpc-unary | 118.0 | 107.9 | 169.6 | 278.6 | 932.2 | ±2.8% | 1961 |
| grpc-duplex | 86.0 | 79.2 | 121.7 | 180.3 | 902.1 | ±2.4% | 1256 |
| grpc-unary-tls | 231.0 | 207.9 | 368.9 | 548.0 | 1745.3 | ±3.5% | 2042 |
| grpc-duplex-tls | 126.7 | 114.5 | 189.9 | 304.0 | 1031.2 | ±3.1% | 1309 |
| magiconion-unary | 138.7 | 127.5 | 202.3 | 330.9 | 1302.7 | ±4.2% | 3738 |
| magiconion-hub | 106.2 | 97.7 | 150.4 | 246.0 | 845.2 | ±7.6% | 1192 |

### Thông lượng — payload 32 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 26,730 (±2%) | 134,610 (±5%) | 157,643 (±4%) |
| kestrel-ws | 19,894 (±2%) | 100,142 (±5%) | 133,650 (±2%) |
| nalix-tcp | 17,102 (±1%) | 80,793 (±0%) | 97,029 (±6%) |
| nalix-ws | 13,942 (±2%) | 78,438 (±3%) | 91,565 (±6%) |
| nalix-tcp-aead | 14,606 (±1%) | 68,165 (±3%) | 86,507 (±1%) |
| signalr-ws-msgpack | 12,255 (±6%) | 69,063 (±3%) | 79,533 (±6%) |
| grpc-unary | 9,094 (±2%) | 51,649 (±5%) | 63,040 (±3%) |
| grpc-duplex | 13,201 (±1%) | 64,219 (±5%) | 75,682 (±8%) |
| grpc-unary-tls | 3,797 (±15%) | 31,006 (±4%) | 44,629 (±6%) |
| grpc-duplex-tls | 8,266 (±4%) | 44,685 (±3%) | 51,805 (±5%) |
| magiconion-unary | 7,878 (±7%) | 44,380 (±4%) | 58,445 (±3%) |
| magiconion-hub | 11,381 (±4%) | 52,894 (±6%) | 72,165 (±5%) |

#### Chi phí mỗi tin nhắn với 64 client — 32 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 144 | 11.8 | 11.7 | 287 | 30/0/0 |
| kestrel-ws | 0 | 14.1 | 14.0 | 152 | 0/0/0 |
| nalix-tcp | 56 | 23.4 | 16.0 | 232 | 2/0/0 |
| nalix-ws | 56 | 20.9 | 19.5 | 368 | 1/0/0 |
| nalix-tcp-aead | 56 | 26.1 | 17.8 | 232 | 2/0/0 |
| signalr-ws-msgpack | 672 | 21.0 | 21.6 | 1553 | 98/0/0 |
| grpc-unary | 968 | 28.4 | 30.8 | 6737 | 84/0/0 |
| grpc-duplex | 264 | 24.9 | 23.0 | 2322 | 16/0/0 |
| grpc-unary-tls | 1504 | 39.5 | 41.0 | 6737 | 98/0/0 |
| grpc-duplex-tls | 809 | 36.2 | 31.7 | 2325 | 100/0/0 |
| magiconion-unary | 1432 | 30.3 | 33.1 | 7401 | 113/0/0 |
| magiconion-hub | 200 | 26.5 | 22.9 | 2238 | 41/0/0 |

### Thông lượng — payload 1024 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 25,466 (±5%) | 137,966 (±1%) | 161,416 (±2%) |
| kestrel-ws | 18,763 (±3%) | 101,379 (±6%) | 122,799 (±3%) |
| nalix-tcp | 16,494 (±2%) | 69,411 (±2%) | 86,232 (±5%) |
| nalix-ws | 13,729 (±5%) | 70,497 (±4%) | 76,881 (±5%) |
| nalix-tcp-aead | 12,117 (±11%) | 57,584 (±3%) | 66,910 (±2%) |
| signalr-ws-msgpack | 11,003 (±9%) | 63,661 (±3%) | 69,339 (±8%) |
| grpc-unary | 8,965 (±3%) | 48,783 (±2%) | 56,136 (±8%) |
| grpc-duplex | 12,616 (±0%) | 62,085 (±1%) | 63,399 (±9%) |
| grpc-unary-tls | 4,031 (±3%) | 31,508 (±4%) | 38,628 (±4%) |
| grpc-duplex-tls | 8,474 (±16%) | 41,096 (±6%) | 49,251 (±5%) |
| magiconion-unary | 7,034 (±7%) | 44,222 (±5%) | 53,808 (±1%) |
| magiconion-hub | 9,483 (±8%) | 48,275 (±5%) | 58,927 (±3%) |

#### Chi phí mỗi tin nhắn với 64 client — 1024 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 144 | 11.7 | 11.6 | 287 | 70/0/0 |
| kestrel-ws | 0 | 15.7 | 15.3 | 152 | 0/0/0 |
| nalix-tcp | 1048 | 24.6 | 17.0 | 1224 | 307/0/0 |
| nalix-ws | 1048 | 23.6 | 21.7 | 1360 | 201/0/0 |
| nalix-tcp-aead | 1048 | 31.3 | 22.2 | 1224 | 237/0/0 |
| signalr-ws-msgpack | 1664 | 24.7 | 24.5 | 2546 | 185/0/0 |
| grpc-unary | 1960 | 31.3 | 34.0 | 7729 | 136/0/0 |
| grpc-duplex | 1256 | 28.3 | 25.5 | 3340 | 252/0/0 |
| grpc-unary-tls | 2500 | 45.7 | 46.0 | 7729 | 124/0/0 |
| grpc-duplex-tls | 1795 | 37.4 | 33.5 | 3345 | 156/0/0 |
| magiconion-unary | 3736 | 33.5 | 35.4 | 9705 | 250/1/0 |
| magiconion-hub | 1192 | 31.7 | 27.3 | 3262 | 221/0/0 |

## Ai thắng ở đâu

| Kịch bản | Framework tốt nhất (không tính baseline thô) | Vị trí của Nalix |
|:--|:--|:--|
| Độ trễ, 32 B, 1 client | **Nalix TCP** (p50 56.7 µs) | Thứ 1. Nalix AEAD 58.4 µs, Nalix WS 64.5 µs, gRPC duplex 70.4 µs, SignalR 79.8 µs, MagicOnion hub 81.3 µs |
| Độ trễ, 1 KB, 1 client | **Nalix TCP** (p50 58.1 µs) | Thứ 1. Nalix WS 70.5 µs, Nalix AEAD 76.4 µs, SignalR 78.6 µs, gRPC duplex 79.2 µs, MagicOnion hub 97.7 µs |
| Độ trễ, có mã hóa | **Nalix AEAD** ở cả hai kích thước (58.4 µs so với gRPC duplex TLS 105.2 µs ở 32 B; 76.4 µs so với 114.5 µs ở 1 KB) | Thứ 1 ở cả hai kích thước |
| Thông lượng, 1 client, 32 B | **Nalix TCP** (17.1k) | Thứ 1 (Nalix AEAD 14.6k, Nalix WS 13.9k, gRPC duplex 13.2k) |
| Thông lượng, 16 client, 32 B | **Nalix TCP** 80.8k | Thứ 1 (Nalix WS 78.4k, SignalR 69.1k, gRPC duplex 64.2k) |
| Thông lượng, 16 client, 1 KB | **Nalix WS** 70.5k / Nalix TCP 69.4k | Thứ 1 (SignalR 63.7k, gRPC duplex 62.1k) |
| Thông lượng, 64 client, 32 B | **Nalix TCP** 97.0k | Thứ 1 (Nalix WS 91.6k, SignalR 79.5k, gRPC duplex 75.7k) |
| Thông lượng, 64 client, 1 KB | **Nalix TCP** 86.2k | Thứ 1 (Nalix WS 76.9k, SignalR 69.3k, gRPC duplex 63.4k) |
| Thông lượng, có mã hóa, 64 client | **Nalix AEAD** (86.5k ở 32 B, 66.9k ở 1 KB) | Thứ 1 (gRPC duplex TLS 51.8k / 49.3k) |
| Cấp phát máy chủ/tin nhắn | **Nalix TCP / WS / AEAD** 56 B ở 32 B | Thứ 1 trong các framework (chỉ echo WebSocket Kestrel thô, 0 B, thấp hơn) |
| CPU máy chủ/tin nhắn, 64 client, 32 B | **Nalix WS** 20.9 µs / SignalR 21.0 µs | Nalix WS ngang SignalR; Nalix TCP 23.4 µs, vượt gRPC duplex (24.9 µs) và MagicOnion hub (26.5 µs) |

## Lưu ý

- **Loopback và máy chủ nhỏ dùng chung.** 4 vCPU vừa chạy bộ sinh tải vừa chạy máy chủ, nên các số liệu ở mức đồng thời cao bị giới hạn bởi CPU, và các chênh lệch vài phần trăm nằm trong nhiễu giữa các lần chạy (xem các cột ±). Sức chứa tuyệt đối trên bare-metal với card mạng chuyên dụng sẽ khác.
- **Thư viện client cũng được tính.** Độ trễ và thông lượng bao gồm client của mỗi stack (Nalix SDK, `HubConnection`, `Grpc.Net.Client`, client động của MagicOnion).
- **Vòng lặp đóng với một yêu cầu đang bay mỗi client.** Chưa đo pipelining hay push từ máy chủ kiểu fire-and-forget.
- **Cấp phát của toàn bộ tiến trình.** Các số liệu của máy chủ bao gồm công việc nền (timer, task manager), phân bố trên tất cả các tin nhắn.
- **So sánh mã hóa không cùng điều kiện.** TLS 1.3 (AES-GCM qua OpenSSL, được tăng tốc phần cứng) bảo vệ toàn bộ stream, trong khi Nalix mã hóa từng gói bằng ChaCha20-Poly1305 được quản lý sau handshake X25519, và không cần chứng chỉ.
