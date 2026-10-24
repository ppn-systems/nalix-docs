---
title: So sánh mạng đầu cuối
description: Benchmark độ trễ, thông lượng, CPU và cấp phát bộ nhớ đầu cuối qua socket, so sánh TCP, WebSocket và AEAD của Nalix với SignalR, gRPC và MagicOnion.
section: Benchmarks
---

Trang này báo cáo các phép đo **đầu cuối, qua socket thực tế** của Nalix so với các stack realtime khác trên .NET, tất cả chạy trên cùng một máy với cùng một harness trong một phiên. Khác với các micro-benchmark ở các phần khác trong mục này, mọi con số ở đây đều bao gồm ngăn xếp TCP của kernel, đóng khung, dispatch, tuần tự hóa, thread pool và thư viện client.

:::warning[Đọc kỹ các lưu ý]
Các số liệu này được đo trên một container Linux đám mây 4 vCPU qua loopback, nơi bộ sinh tải và các máy chủ tranh chấp cùng 4 lõi. Giá trị tuyệt đối thấp hơn nhiều so với trên phần cứng bare-metal có card mạng chuyên dụng. Hãy dùng chúng để *so sánh các stack với nhau*, không dùng làm số liệu sức chứa tuyệt đối.
:::

## Tóm tắt

:::note[Cả 12 thư viện được đo trong một phiên]
Cả 12 framework và baseline dưới đây được đo cùng nhau vào ngày 2026-10-02 trong một phiên liên tục duy nhất trên .NET 10.0.401 SDK, trên container Linux 4 vCPU. Mọi so sánh đều phản ánh kết quả đối đầu trực tiếp trong cùng điều kiện phần cứng và hệ điều hành.
:::

- **Độ trễ một client:** Nalix TCP có p50 thấp nhất trong số các framework đầy đủ. Ở 32 B, p50 là 52,2 µs với Nalix TCP, 55,5 µs với Nalix WebSocket và 57,6 µs với Nalix AEAD, so với 68,4 µs của gRPC duplex, 74,2 µs của MagicOnion hub, 76,3 µs của SignalR và 106,4 µs của gRPC unary. Ở 1 KB, Nalix TCP đạt 53,6 µs so với 69,2 µs của gRPC duplex, 79,4 µs của MagicOnion hub và 83,5 µs của SignalR. Baseline socket thô viết tay (30,9 µs / 24,0 µs) và echo WebSocket Kestrel thô (45,0 µs / 48,5 µs) nhanh hơn.
- **Thông lượng với 64 client:**
  - Ở 32 B: gRPC duplex 77,6k ops/s, Nalix TCP 74,8k, SignalR 71,9k, Nalix WebSocket 69,1k, MagicOnion hub 67,5k, Nalix TCP AEAD 63,3k, gRPC unary 58,1k, MagicOnion unary 55,7k.
  - Ở 1 KB: SignalR 70,7k ops/s, gRPC duplex 68,4k, Nalix WebSocket 61,4k, Nalix TCP 60,8k, MagicOnion hub 58,2k, gRPC unary 56,9k, MagicOnion unary 54,8k, Nalix TCP AEAD 53,3k. Trên máy 4 lõi này, mọi framework đều bị giới hạn bởi CPU và nằm trong khoảng khoảng 10–15% so với nhau ở mức đồng thời cao.
- **Thông lượng với 1 và 16 client:** Nalix TCP đứng đầu với 1 client ở cả hai kích thước (18,1k ở 32 B, 16,1k ở 1 KB). Với 16 client và 32 B, Nalix WebSocket (64,5k) và Nalix TCP (62,9k) ngang với gRPC duplex (62,9k) và vượt SignalR (61,2k).
- **CPU máy chủ trên mỗi tin nhắn:** Nalix TCP đo được 29,3 µs với 64 client và 32 B, so với 21,8 µs của SignalR và 21,9 µs của gRPC duplex, nên máy chủ của nó tốn CPU hơn; phía client lại rẻ hơn (19,2 µs CPU/op phía client so với 24,2 µs của SignalR).
- **Cấp phát phía máy chủ:** 56 B mỗi tin nhắn ở 32 B với Nalix TCP và Nalix AEAD, thấp nhất trong số các framework đầy đủ (MagicOnion hub 200 B, gRPC duplex 264 B, SignalR 672 B). Chỉ baseline echo WebSocket Kestrel thô là cấp phát ít hơn (0 B). Ở 1 KB, Nalix TCP cấp phát 1.048 B so với 1.192 B của MagicOnion hub, 1.256 B của gRPC duplex và 1.664 B của SignalR.
- **Mã hóa:** Nalix AEAD (X25519 + ChaCha20-Poly1305) thắng gRPC qua TLS về độ trễ một client (p50 32 B: 57,6 µs so với 100,4 µs của gRPC duplex TLS; ở 1 KB: 74,6 µs so với 103,8 µs), về thông lượng 64 client (63,3k so với 57,8k ops/s ở 32 B; 53,3k so với 49,5k ở 1 KB) và về cấp phát phía máy chủ (56 B so với 812 B ở 32 B; 1.048 B so với 1.801 B ở 1 KB).

## Môi trường

| Mục | Giá trị |
|:--|:--|
| CPU | Intel Xeon Processor @ 2.10 GHz (4 vCPU, 1 luồng mỗi lõi) |
| Bộ nhớ | 16 GB |
| OS | Ubuntu 24.04.4 LTS (Linux 6.18, máy ảo đám mây container) |
| Runtime | .NET 10.0.x runtime (SDK 10.0.401), Release, x64 RyuJIT, TieredPGO bật |
| GC | Server GC + Concurrent GC cho **mọi** tiến trình (từ `benchmarks/Directory.Build.props`) |
| Nalix | mã nguồn tại `master` (`Version.props` 14.2.16), tham chiếu project |
| ASP.NET Core / SignalR | 10.0.12 (`Microsoft.AspNetCore.SignalR.Client`, `.Protocols.MessagePack` → MessagePack 2.5.302) |
| gRPC | `Grpc.AspNetCore` 2.84.0, `Grpc.Net.Client` 2.84.0, Google.Protobuf 3.35.1 |
| MagicOnion | `MagicOnion.Server` / `.Client` 7.11.0 (MessagePack 3.1.7) |
| Ngày | 2026-10-02 (Cả 12 thư viện được đo trong một phiên) |
| Trạng thái máy | Container nhàn rỗi trước khi chạy; một phiên liên tục thực thi cả 12 thư viện |

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
- **Độ trễ:** Một client, gọi tuần tự. 20.000 lần khởi động làm nóng, sau đó **100.000 lần gọi có đo thời gian**. Mỗi lần gọi được đo bằng `Stopwatch` và các mẫu được sắp xếp để đọc chính xác các phân vị.
- **Thông lượng:** N ∈ {1, 16, 64} client theo **vòng lặp đóng** (mỗi client giữ một yêu cầu đang bay). Sau 2 s làm nóng, các yêu cầu được đếm trong cửa sổ 8 s.
- **Lần chạy:** 3 lần chạy cho mỗi ô. Các bảng hiển thị **median** của các lần chạy, và `±x%` bằng một nửa độ trải (max − min)/median.
- Máy chủ ASP.NET Core dùng `WebApplication.CreateBuilder`, xóa logging và đặt mức tối thiểu là Warning, Kestrel chỉ bind trên loopback. Không đối thủ nào được tinh chỉnh vượt quá cấu hình mặc định được tài liệu hóa. Với Nalix cũng vậy: không tinh chỉnh gì cả (loopback được miễn hạn mức kết nối mặc định theo IP kể từ #365).
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
| raw-tcp | 39.4 | 30.9 | 66.0 | 119.2 | 540.3 | ±11.0% | 144 |
| kestrel-ws | 50.4 | 45.0 | 79.9 | 132.8 | 564.4 | ±2.8% | 0 |
| nalix-tcp | 59.1 | 52.2 | 84.0 | 154.9 | 691.9 | ±2.8% | 56 |
| nalix-ws | 63.3 | 55.5 | 89.0 | 159.6 | 654.5 | ±2.7% | 192 |
| nalix-tcp-aead | 64.3 | 57.6 | 91.0 | 154.3 | 666.4 | ±3.3% | 56 |
| signalr-ws-msgpack | 82.3 | 76.3 | 116.1 | 190.8 | 720.1 | ±5.8% | 680 |
| grpc-unary | 121.1 | 106.4 | 170.5 | 353.5 | 1215.7 | ±4.1% | 969 |
| grpc-duplex | 74.1 | 68.4 | 101.3 | 167.3 | 743.1 | ±3.9% | 264 |
| grpc-unary-tls | 168.4 | 150.5 | 236.5 | 490.8 | 1841.2 | ±4.7% | 1037 |
| grpc-duplex-tls | 110.5 | 100.4 | 155.2 | 282.6 | 1108.5 | ±3.6% | 328 |
| magiconion-unary | 123.5 | 110.2 | 175.8 | 379.6 | 1257.9 | ±2.6% | 1433 |
| magiconion-hub | 79.3 | 74.2 | 109.1 | 173.8 | 784.5 | ±8.3% | 200 |

### Độ trễ — payload 1024 B, 1 client, request/response tuần tự

| Thư viện | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | độ trải giữa các lần chạy (p50) | cấp phát máy chủ/op (B) |
|:--|--:|--:|--:|--:|--:|--:|--:|
| raw-tcp | 33.5 | 24.0 | 57.6 | 107.4 | 424.1 | ±12.0% | 144 |
| kestrel-ws | 53.2 | 48.5 | 84.3 | 144.5 | 459.3 | ±2.7% | 0 |
| nalix-tcp | 61.2 | 53.6 | 86.8 | 150.9 | 760.0 | ±6.6% | 1048 |
| nalix-ws | 71.6 | 63.4 | 99.5 | 199.0 | 893.5 | ±3.0% | 1184 |
| nalix-tcp-aead | 84.7 | 74.6 | 117.2 | 230.9 | 971.6 | ±5.4% | 1048 |
| signalr-ws-msgpack | 93.9 | 83.5 | 132.2 | 255.3 | 1197.6 | ±4.7% | 1672 |
| grpc-unary | 120.8 | 106.7 | 165.1 | 318.9 | 1475.8 | ±2.9% | 1961 |
| grpc-duplex | 76.8 | 69.2 | 105.0 | 180.6 | 925.1 | ±3.4% | 1256 |
| grpc-unary-tls | 182.8 | 161.4 | 255.7 | 520.0 | 1783.2 | ±1.9% | 2028 |
| grpc-duplex-tls | 114.6 | 103.8 | 157.7 | 292.9 | 1142.2 | ±1.9% | 1300 |
| magiconion-unary | 135.0 | 120.7 | 189.7 | 383.9 | 1599.5 | ±4.9% | 3737 |
| magiconion-hub | 85.3 | 79.4 | 114.9 | 192.2 | 1068.4 | ±0.8% | 1192 |

### Thông lượng — payload 32 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 24,865 (±8%) | 107,698 (±5%) | 126,234 (±4%) |
| kestrel-ws | 19,602 (±3%) | 91,628 (±2%) | 106,659 (±0%) |
| nalix-tcp | 18,121 (±3%) | 62,919 (±6%) | 74,791 (±2%) |
| nalix-ws | 16,109 (±2%) | 64,458 (±5%) | 69,135 (±5%) |
| nalix-tcp-aead | 14,177 (±4%) | 54,470 (±3%) | 63,309 (±4%) |
| signalr-ws-msgpack | 11,345 (±3%) | 61,223 (±1%) | 71,871 (±4%) |
| grpc-unary | 8,691 (±4%) | 48,197 (±6%) | 58,059 (±5%) |
| grpc-duplex | 13,658 (±7%) | 62,926 (±3%) | 77,648 (±3%) |
| grpc-unary-tls | 6,217 (±13%) | 35,028 (±2%) | 43,455 (±4%) |
| grpc-duplex-tls | 9,066 (±5%) | 43,856 (±3%) | 57,791 (±5%) |
| magiconion-unary | 7,658 (±3%) | 46,330 (±3%) | 55,721 (±2%) |
| magiconion-hub | 12,155 (±3%) | 46,144 (±13%) | 67,501 (±2%) |

#### Chi phí mỗi tin nhắn với 64 client — 32 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 143 | 13.9 | 14.0 | 287 | 57/0/0 |
| kestrel-ws | 0 | 17.0 | 17.4 | 152 | 0/0/0 |
| nalix-tcp | 56 | 29.3 | 19.2 | 887 | 1/0/0 |
| nalix-ws | 192 | 27.1 | 22.6 | 888 | 40/0/0 |
| nalix-tcp-aead | 56 | 34.2 | 22.9 | 887 | 0/0/0 |
| signalr-ws-msgpack | 672 | 21.8 | 24.2 | 1553 | 92/0/0 |
| grpc-unary | 968 | 27.9 | 32.8 | 6737 | 80/0/0 |
| grpc-duplex | 264 | 21.9 | 22.7 | 2320 | 61/0/0 |
| grpc-unary-tls | 1515 | 37.6 | 41.5 | 6737 | 74/0/0 |
| grpc-duplex-tls | 812 | 30.4 | 29.7 | 2322 | 112/0/0 |
| magiconion-unary | 1432 | 28.5 | 33.3 | 7401 | 117/0/0 |
| magiconion-hub | 200 | 26.3 | 25.1 | 2238 | 41/0/0 |

### Thông lượng — payload 1024 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 27,356 (±3%) | 120,792 (±3%) | 128,443 (±8%) |
| kestrel-ws | 19,322 (±5%) | 88,303 (±2%) | 107,871 (±3%) |
| nalix-tcp | 16,051 (±3%) | 55,120 (±5%) | 60,776 (±6%) |
| nalix-ws | 13,946 (±3%) | 52,886 (±5%) | 61,438 (±3%) |
| nalix-tcp-aead | 12,546 (±2%) | 45,315 (±2%) | 53,345 (±3%) |
| signalr-ws-msgpack | 11,720 (±5%) | 59,726 (±3%) | 70,651 (±4%) |
| grpc-unary | 8,162 (±1%) | 45,147 (±5%) | 56,864 (±5%) |
| grpc-duplex | 13,243 (±7%) | 62,125 (±4%) | 68,418 (±3%) |
| grpc-unary-tls | 5,684 (±5%) | 31,342 (±3%) | 43,000 (±4%) |
| grpc-duplex-tls | 9,055 (±3%) | 42,611 (±4%) | 49,542 (±5%) |
| magiconion-unary | 7,661 (±5%) | 43,613 (±1%) | 54,752 (±2%) |
| magiconion-hub | 11,189 (±1%) | 51,115 (±4%) | 58,182 (±1%) |

#### Chi phí mỗi tin nhắn với 64 client — 1024 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 144 | 14.4 | 13.8 | 287 | 54/0/0 |
| kestrel-ws | 0 | 17.1 | 17.4 | 152 | 0/0/0 |
| nalix-tcp | 1048 | 34.1 | 23.2 | 1878 | 215/0/0 |
| nalix-ws | 1184 | 30.4 | 24.1 | 1879 | 232/0/0 |
| nalix-tcp-aead | 1048 | 39.7 | 28.1 | 1879 | 184/0/0 |
| signalr-ws-msgpack | 1664 | 22.0 | 24.1 | 2546 | 341/0/0 |
| grpc-unary | 1960 | 28.4 | 32.8 | 7729 | 164/0/0 |
| grpc-duplex | 1256 | 23.7 | 24.0 | 3335 | 280/0/0 |
| grpc-unary-tls | 2504 | 38.9 | 42.4 | 7729 | 150/0/0 |
| grpc-duplex-tls | 1801 | 34.7 | 33.7 | 3344 | 202/0/0 |
| magiconion-unary | 3736 | 29.9 | 34.0 | 9707 | 256/0/0 |
| magiconion-hub | 1192 | 30.0 | 28.2 | 3261 | 201/0/0 |

## Ai thắng ở đâu

| Kịch bản | Framework tốt nhất (không tính baseline thô) | Vị trí của Nalix |
|:--|:--|:--|
| Độ trễ, 32 B, 1 client | **Nalix TCP** (p50 52,2 µs) | Thứ 1. Nalix WS 55,5 µs, Nalix AEAD 57,6 µs, gRPC duplex 68,4 µs, MagicOnion hub 74,2 µs, SignalR 76,3 µs |
| Độ trễ, 1 KB, 1 client | **Nalix TCP** (p50 53,6 µs) | Thứ 1. Nalix WS 63,4 µs, gRPC duplex 69,2 µs, Nalix AEAD 74,6 µs, MagicOnion hub 79,4 µs, SignalR 83,5 µs |
| Độ trễ, có mã hóa | **Nalix AEAD** ở cả hai kích thước (57,6 µs so với gRPC duplex TLS 100,4 µs ở 32 B; 74,6 µs so với 103,8 µs ở 1 KB) | Thứ 1 ở cả hai kích thước |
| Thông lượng, 1 client, 32 B | **Nalix TCP** (18,1k) | Thứ 1 (Nalix WS 16,1k, Nalix AEAD 14,2k, gRPC duplex 13,7k) |
| Thông lượng, 16 client, 32 B | **Nalix WS** 64,5k / **Nalix TCP** 62,9k / gRPC duplex 62,9k | Thứ 1 (trong nhiễu của lần chạy so với gRPC duplex; SignalR 61,2k) |
| Thông lượng, 16 client, 1 KB | **gRPC duplex** 62,1k | Thứ 3 (SignalR 59,7k, Nalix TCP 55,1k) |
| Thông lượng, 64 client, 32 B | **gRPC duplex** 77,6k | Thứ 2 (Nalix TCP 74,8k, SignalR 71,9k, Nalix WS 69,1k) |
| Thông lượng, 64 client, 1 KB | **SignalR** 70,7k | Thứ 3–4 (gRPC duplex 68,4k, Nalix WS 61,4k, Nalix TCP 60,8k) |
| Thông lượng, có mã hóa, 64 client | **Nalix AEAD** (63,3k ở 32 B, 53,3k ở 1 KB) | Thứ 1 (gRPC duplex TLS 57,8k / 49,5k) |
| Cấp phát máy chủ/tin nhắn | **Nalix TCP / AEAD** 56 B ở 32 B | Thứ 1 trong các framework (chỉ echo WebSocket Kestrel thô, 0 B, thấp hơn) |
| CPU máy chủ/tin nhắn, 64 client, 32 B | **SignalR** 21,8 µs / gRPC duplex 21,9 µs | Nalix TCP 29,3 µs, đứng sau cả hai và MagicOnion hub (26,3 µs) |

## Lưu ý

- **Loopback và máy chủ nhỏ dùng chung.** 4 vCPU vừa chạy bộ sinh tải vừa chạy máy chủ, nên các số liệu ở mức đồng thời cao bị giới hạn bởi CPU, và các chênh lệch vài phần trăm nằm trong nhiễu giữa các lần chạy (xem các cột ±). Sức chứa tuyệt đối trên bare-metal với card mạng chuyên dụng sẽ khác.
- **Thư viện client cũng được tính.** Độ trễ và thông lượng bao gồm client của mỗi stack (Nalix SDK, `HubConnection`, `Grpc.Net.Client`, client động của MagicOnion).
- **Vòng lặp đóng với một yêu cầu đang bay mỗi client.** Chưa đo pipelining hay push từ máy chủ kiểu fire-and-forget.
- **Cấp phát của toàn bộ tiến trình.** Các số liệu của máy chủ bao gồm công việc nền (timer, task manager), phân bố trên tất cả các tin nhắn.
- **So sánh mã hóa không cùng điều kiện.** TLS 1.3 (AES-GCM qua OpenSSL, được tăng tốc phần cứng) bảo vệ toàn bộ stream, trong khi Nalix mã hóa từng gói bằng ChaCha20-Poly1305 được quản lý sau handshake X25519, và không cần chứng chỉ.
