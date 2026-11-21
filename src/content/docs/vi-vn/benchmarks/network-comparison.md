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
Cả 12 framework và baseline dưới đây, cùng hai lần chạy chẩn đoán của Nalix, được đo vào ngày 2026-11-21 trên cùng một máy ảo Linux 4 vCPU, chia thành hai đợt chạy liền nhau (đợt đầu gồm `nalix-tcp`, `nalix-ws` và `nalix-tcp-aead`, đợt sau là các thư viện còn lại), trên runtime .NET 10.0.15. Mọi so sánh đều phản ánh kết quả đối đầu trực tiếp trong cùng điều kiện phần cứng và hệ điều hành.
:::

- **Độ trễ một client:** Nalix TCP có p50 thấp nhất trong số các framework đầy đủ. Ở 32 B, p50 là 60.0 µs với Nalix TCP, 67.7 µs với Nalix WebSocket và 72.7 µs với Nalix AEAD, so với 77.4 µs của gRPC duplex, 93.8 µs của MagicOnion hub, 96.5 µs của SignalR và 115.1 µs của gRPC unary. Ở 1 KB, Nalix TCP đạt 66.2 µs so với 84.7 µs của gRPC duplex, 96.8 µs của SignalR và 98.2 µs của MagicOnion hub. Baseline socket thô viết tay (29.0 µs / 27.0 µs) và echo WebSocket Kestrel thô (55.7 µs / 60.1 µs) nhanh hơn.
- **Thông lượng với 64 client:**
  - Ở 32 B: Nalix TCP 85.3k ops/s, Nalix WebSocket 74.8k, Nalix TCP AEAD 72.6k, SignalR 67.7k, gRPC duplex 64.9k, MagicOnion hub 59.8k, gRPC unary 51.2k, MagicOnion unary 50.4k.
  - Ở 1 KB: Nalix TCP 65.7k ops/s, SignalR 63.1k, gRPC duplex 60.9k, Nalix TCP AEAD 57.2k, Nalix WebSocket 56.1k, MagicOnion hub 50.9k, gRPC unary 49.1k, MagicOnion unary 44.2k. Trên máy 4 lõi này, mọi framework đều bị giới hạn bởi CPU; ở 1 KB, ba framework dẫn đầu chênh nhau khoảng 8%.
- **Thông lượng với 1 và 16 client:** Nalix TCP đứng đầu với 1 client ở cả hai kích thước (14.7k ở 32 B, 13.4k ở 1 KB). Với 16 client và 32 B, Nalix TCP (69.0k) và Nalix WebSocket (65.7k) dẫn trước gRPC duplex (59.5k) và SignalR (57.4k); với 16 client và 1 KB, Nalix TCP (54.7k), Nalix WebSocket (54.6k) và gRPC duplex (54.4k) ngang nhau.
- **CPU máy chủ trên mỗi tin nhắn:** Nalix TCP đo được 27.2 µs với 64 client và 32 B, so với 25.0 µs của SignalR và 27.7 µs của gRPC duplex (Nalix WebSocket 26.5 µs), nên máy chủ SignalR tốn ít CPU nhất trong các framework đầy đủ; phía client của Nalix lại rẻ hơn (17.5 µs CPU/op phía client so với 25.7 µs của SignalR).
- **Cấp phát phía máy chủ:** 56 B mỗi tin nhắn ở 32 B với Nalix TCP, Nalix WebSocket và Nalix AEAD, thấp nhất trong số các framework đầy đủ (MagicOnion hub 200 B, gRPC duplex 264 B, SignalR 672 B). Chỉ baseline echo WebSocket Kestrel thô là cấp phát ít hơn (0 B). Ở 1 KB, Nalix TCP cấp phát 1,048 B so với 1,192 B của MagicOnion hub, 1,256 B của gRPC duplex và 1,664 B của SignalR.
- **Mã hóa:** Nalix AEAD (X25519 + ChaCha20-Poly1305) thắng gRPC qua TLS về độ trễ một client (p50 ở 32 B: 72.7 µs so với 116.7 µs của gRPC duplex TLS; ở 1 KB: 90.6 µs so với 119.5 µs), về thông lượng 64 client (72.6k so với 50.9k ops/s ở 32 B; 57.2k so với 42.2k ở 1 KB) và về cấp phát phía máy chủ (56 B so với 813 B ở 32 B; 1,048 B so với 1,802 B ở 1 KB).

## Môi trường

| Mục | Giá trị |
|:--|:--|
| CPU | Intel Xeon Processor @ 2.10 GHz (4 vCPU, 1 luồng mỗi lõi) |
| Bộ nhớ | 16 GB |
| OS | Ubuntu 24.04.5 LTS (Linux 6.18, máy ảo đám mây container) |
| Runtime | .NET 10.0.15 runtime (SDK 11.0.100-rc.3), Release, x64 RyuJIT, TieredPGO bật |
| GC | Server GC + Concurrent GC cho **mọi** tiến trình (từ `benchmarks/Directory.Build.props`) |
| Nalix | mã nguồn tại `master` (`Version.props` 14.3.10), tham chiếu project |
| ASP.NET Core / SignalR | 10.0.13 (`Microsoft.AspNetCore.SignalR.Client`, `.Protocols.MessagePack` → MessagePack 2.5.303) |
| gRPC | `Grpc.AspNetCore` 2.84.0, `Grpc.Net.Client` 2.84.0, Google.Protobuf 3.35.1 |
| MagicOnion | `MagicOnion.Server` / `.Client` 7.11.0 (MessagePack 3.1.12) |
| Ngày | 2026-11-21 (mọi thư viện được đo trên một máy, hai đợt chạy liền nhau) |
| Trạng thái máy | Máy ảo nhàn rỗi trước khi chạy; không có tải nào khác trong các đợt chạy |

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
| raw-tcp | 42.0 | 29.0 | 85.0 | 121.3 | 423.6 | ±10.6% | 144 |
| kestrel-ws | 59.2 | 55.7 | 89.7 | 141.0 | 477.7 | ±1.5% | 0 |
| nalix-tcp | 66.2 | 60.0 | 92.6 | 153.4 | 552.1 | ±1.6% | 56 |
| nalix-ws | 74.1 | 67.7 | 105.6 | 173.5 | 605.1 | ±0.9% | 56 |
| nalix-tcp-aead | 80.9 | 72.7 | 117.5 | 187.3 | 611.0 | ±6.0% | 56 |
| signalr-ws-msgpack | 105.6 | 96.5 | 153.9 | 265.4 | 968.8 | ±4.3% | 680 |
| grpc-unary | 130.3 | 115.1 | 189.1 | 377.0 | 1302.4 | ±1.7% | 970 |
| grpc-duplex | 83.5 | 77.4 | 114.1 | 181.0 | 845.1 | ±0.8% | 264 |
| grpc-unary-tls | 216.6 | 191.0 | 345.3 | 620.5 | 1548.0 | ±2.1% | 1033 |
| grpc-duplex-tls | 127.1 | 116.7 | 185.9 | 314.5 | 1043.8 | ±2.0% | 315 |
| magiconion-unary | 149.6 | 133.2 | 225.0 | 441.1 | 1295.9 | ±2.0% | 1433 |
| magiconion-hub | 99.7 | 93.8 | 134.9 | 221.9 | 917.6 | ±2.5% | 201 |

### Độ trễ — payload 1024 B, 1 client, request/response tuần tự

| Thư viện | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | độ trải giữa các lần chạy (p50) | cấp phát máy chủ/op (B) |
|:--|--:|--:|--:|--:|--:|--:|--:|
| raw-tcp | 40.0 | 27.0 | 77.4 | 121.2 | 350.7 | ±7.0% | 144 |
| kestrel-ws | 62.1 | 60.1 | 92.8 | 142.2 | 344.6 | ±3.8% | 0 |
| nalix-tcp | 74.8 | 66.2 | 105.3 | 179.1 | 765.5 | ±1.1% | 1048 |
| nalix-ws | 88.2 | 78.7 | 124.2 | 226.9 | 858.4 | ±3.4% | 1048 |
| nalix-tcp-aead | 97.4 | 90.6 | 138.2 | 223.1 | 786.0 | ±4.2% | 1048 |
| signalr-ws-msgpack | 105.0 | 96.8 | 148.8 | 265.3 | 1053.4 | ±1.4% | 1672 |
| grpc-unary | 136.1 | 122.5 | 195.2 | 373.5 | 1331.8 | ±0.7% | 1962 |
| grpc-duplex | 92.4 | 84.7 | 127.4 | 206.9 | 1077.0 | ±0.8% | 1256 |
| grpc-unary-tls | 213.3 | 192.5 | 335.4 | 577.8 | 1908.3 | ±2.3% | 2008 |
| grpc-duplex-tls | 131.7 | 119.5 | 188.3 | 344.9 | 1219.3 | ±1.6% | 1313 |
| magiconion-unary | 153.7 | 139.4 | 217.9 | 440.1 | 1232.4 | ±2.4% | 3738 |
| magiconion-hub | 106.8 | 98.2 | 151.7 | 254.2 | 1278.4 | ±3.5% | 1192 |

### Thông lượng — payload 32 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 24,294 (±8%) | 113,135 (±2%) | 135,743 (±2%) |
| kestrel-ws | 16,458 (±5%) | 87,355 (±2%) | 108,808 (±1%) |
| nalix-tcp | 14,677 (±1%) | 69,010 (±2%) | 85,258 (±2%) |
| nalix-ws | 13,622 (±4%) | 65,655 (±2%) | 74,799 (±2%) |
| nalix-tcp-aead | 13,591 (±5%) | 55,251 (±3%) | 72,631 (±3%) |
| signalr-ws-msgpack | 8,729 (±9%) | 57,419 (±0%) | 67,717 (±1%) |
| grpc-unary | 7,581 (±4%) | 44,166 (±2%) | 51,176 (±2%) |
| grpc-duplex | 12,044 (±3%) | 59,486 (±4%) | 64,936 (±2%) |
| grpc-unary-tls | 4,766 (±5%) | 31,396 (±4%) | 41,890 (±1%) |
| grpc-duplex-tls | 7,834 (±4%) | 41,610 (±3%) | 50,934 (±3%) |
| magiconion-unary | 6,586 (±2%) | 39,196 (±1%) | 50,395 (±1%) |
| magiconion-hub | 10,289 (±2%) | 48,542 (±2%) | 59,796 (±1%) |

#### Chi phí mỗi tin nhắn với 64 client — 32 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 144 | 13.5 | 13.2 | 287 | 24/0/0 |
| kestrel-ws | 0 | 17.4 | 16.8 | 152 | 0/0/0 |
| nalix-tcp | 56 | 27.2 | 17.5 | 232 | 2/0/0 |
| nalix-ws | 56 | 26.5 | 21.9 | 368 | 1/0/0 |
| nalix-tcp-aead | 56 | 31.1 | 20.5 | 232 | 1/0/0 |
| signalr-ws-msgpack | 672 | 25.0 | 25.7 | 1553 | 141/0/0 |
| grpc-unary | 968 | 32.7 | 36.6 | 6736 | 82/0/0 |
| grpc-duplex | 264 | 27.7 | 26.4 | 2320 | 50/0/0 |
| grpc-unary-tls | 1496 | 43.8 | 44.2 | 6737 | 90/0/0 |
| grpc-duplex-tls | 813 | 37.6 | 33.8 | 2325 | 56/0/0 |
| magiconion-unary | 1432 | 35.8 | 37.1 | 7401 | 108/0/0 |
| magiconion-hub | 200 | 33.5 | 28.6 | 2239 | 37/0/0 |

### Thông lượng — payload 1024 B, N client vòng lặp đóng (ops/s, median của các lần chạy)

| Thư viện | 1 client | 16 client | 64 client |
|:--|--:|--:|--:|
| raw-tcp | 25,055 (±0%) | 114,572 (±2%) | 133,681 (±2%) |
| kestrel-ws | 17,150 (±1%) | 85,159 (±4%) | 103,883 (±2%) |
| nalix-tcp | 13,412 (±3%) | 54,665 (±6%) | 65,652 (±4%) |
| nalix-ws | 11,736 (±3%) | 54,574 (±4%) | 56,129 (±2%) |
| nalix-tcp-aead | 9,820 (±4%) | 47,103 (±2%) | 57,189 (±3%) |
| signalr-ws-msgpack | 9,110 (±1%) | 51,022 (±1%) | 63,087 (±4%) |
| grpc-unary | 7,615 (±2%) | 41,387 (±3%) | 49,102 (±3%) |
| grpc-duplex | 10,743 (±4%) | 54,447 (±1%) | 60,948 (±1%) |
| grpc-unary-tls | 4,601 (±3%) | 29,386 (±3%) | 36,961 (±3%) |
| grpc-duplex-tls | 7,816 (±4%) | 35,278 (±3%) | 42,167 (±2%) |
| magiconion-unary | 6,759 (±5%) | 38,324 (±1%) | 44,226 (±2%) |
| magiconion-hub | 9,715 (±3%) | 42,317 (±1%) | 50,862 (±4%) |

#### Chi phí mỗi tin nhắn với 64 client — 1024 B

| Thư viện | cấp phát máy chủ/op (B) | CPU máy chủ/op (µs) | CPU client/op (µs) | cấp phát client/op (B) | Gen0/1/2 máy chủ mỗi lần chạy |
|:--|--:|--:|--:|--:|--:|
| raw-tcp | 144 | 13.5 | 13.5 | 287 | 58/0/0 |
| kestrel-ws | 0 | 18.4 | 17.8 | 152 | 0/0/0 |
| nalix-tcp | 1048 | 32.5 | 22.0 | 1224 | 233/0/0 |
| nalix-ws | 1048 | 32.5 | 28.0 | 1360 | 198/0/0 |
| nalix-tcp-aead | 1048 | 36.3 | 25.8 | 1224 | 203/0/0 |
| signalr-ws-msgpack | 1664 | 27.2 | 27.3 | 2545 | 218/0/0 |
| grpc-unary | 1961 | 35.6 | 37.9 | 7729 | 151/0/0 |
| grpc-duplex | 1256 | 29.7 | 27.5 | 3345 | 237/0/0 |
| grpc-unary-tls | 2501 | 48.8 | 50.2 | 7729 | 131/0/0 |
| grpc-duplex-tls | 1802 | 43.1 | 38.4 | 3346 | 190/0/0 |
| magiconion-unary | 3737 | 39.3 | 40.7 | 9705 | 193/0/0 |
| magiconion-hub | 1192 | 37.3 | 31.8 | 3262 | 180/0/0 |

## Ai thắng ở đâu

| Kịch bản | Framework tốt nhất (không tính baseline thô) | Vị trí của Nalix |
|:--|:--|:--|
| Độ trễ, 32 B, 1 client | **Nalix TCP** (p50 60.0 µs) | Thứ 1. Nalix WS 67.7 µs, Nalix AEAD 72.7 µs, gRPC duplex 77.4 µs, MagicOnion hub 93.8 µs, SignalR 96.5 µs |
| Độ trễ, 1 KB, 1 client | **Nalix TCP** (p50 66.2 µs) | Thứ 1. Nalix WS 78.7 µs, gRPC duplex 84.7 µs, Nalix AEAD 90.6 µs, SignalR 96.8 µs, MagicOnion hub 98.2 µs |
| Độ trễ, có mã hóa | **Nalix AEAD** ở cả hai kích thước (72.7 µs so với gRPC duplex TLS 116.7 µs ở 32 B; 90.6 µs so với 119.5 µs ở 1 KB) | Thứ 1 ở cả hai kích thước |
| Thông lượng, 1 client, 32 B | **Nalix TCP** (14.7k) | Thứ 1 (Nalix WS 13.6k, Nalix AEAD 13.6k, gRPC duplex 12.0k) |
| Thông lượng, 16 client, 32 B | **Nalix TCP** 69.0k | Thứ 1 (Nalix WS 65.7k, gRPC duplex 59.5k, SignalR 57.4k) |
| Thông lượng, 16 client, 1 KB | **Nalix TCP** 54.7k / Nalix WS 54.6k / gRPC duplex 54.4k | Thứ 1 (trong nhiễu của lần chạy so với gRPC duplex; SignalR 51.0k) |
| Thông lượng, 64 client, 32 B | **Nalix TCP** 85.3k | Thứ 1 (Nalix WS 74.8k, SignalR 67.7k, gRPC duplex 64.9k) |
| Thông lượng, 64 client, 1 KB | **Nalix TCP** 65.7k | Thứ 1 (SignalR 63.1k, gRPC duplex 60.9k, Nalix WS 56.1k) |
| Thông lượng, có mã hóa, 64 client | **Nalix AEAD** (72.6k ở 32 B, 57.2k ở 1 KB) | Thứ 1 (gRPC duplex TLS 50.9k / 42.2k) |
| Cấp phát máy chủ/tin nhắn | **Nalix TCP / WS / AEAD** 56 B ở 32 B | Thứ 1 trong các framework (chỉ echo WebSocket Kestrel thô, 0 B, thấp hơn) |
| CPU máy chủ/tin nhắn, 64 client, 32 B | **SignalR** 25.0 µs | Nalix WS 26.5 µs và Nalix TCP 27.2 µs, ngang gRPC duplex (27.7 µs), vượt MagicOnion hub (33.5 µs) |

## Lưu ý

- **Loopback và máy chủ nhỏ dùng chung.** 4 vCPU vừa chạy bộ sinh tải vừa chạy máy chủ, nên các số liệu ở mức đồng thời cao bị giới hạn bởi CPU, và các chênh lệch vài phần trăm nằm trong nhiễu giữa các lần chạy (xem các cột ±). Sức chứa tuyệt đối trên bare-metal với card mạng chuyên dụng sẽ khác.
- **Thư viện client cũng được tính.** Độ trễ và thông lượng bao gồm client của mỗi stack (Nalix SDK, `HubConnection`, `Grpc.Net.Client`, client động của MagicOnion).
- **Vòng lặp đóng với một yêu cầu đang bay mỗi client.** Chưa đo pipelining hay push từ máy chủ kiểu fire-and-forget.
- **Cấp phát của toàn bộ tiến trình.** Các số liệu của máy chủ bao gồm công việc nền (timer, task manager), phân bố trên tất cả các tin nhắn.
- **So sánh mã hóa không cùng điều kiện.** TLS 1.3 (AES-GCM qua OpenSSL, được tăng tốc phần cứng) bảo vệ toàn bộ stream, trong khi Nalix mã hóa từng gói bằng ChaCha20-Poly1305 được quản lý sau handshake X25519, và không cần chứng chỉ.
