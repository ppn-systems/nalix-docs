---
title: End-to-End Network Comparison
description: End-to-end over-the-socket latency, throughput, CPU, and allocation benchmarks comparing Nalix TCP, WebSocket, and AEAD against SignalR, gRPC, and MagicOnion.
section: Benchmarks
---

This page reports **real end-to-end, over-the-socket** measurements of Nalix against other .NET realtime
stacks, all run on the same machine with the same harness. Unlike the micro-benchmarks elsewhere in this
section, every number here includes the kernel TCP stack, framing, dispatch, serialization, the thread pool
and the client library.

:::warning[Read the caveats]
These numbers come from a 4-vCPU cloud Linux container over loopback, where the load generator and the servers compete for the same 4 cores. Absolute values are much lower than on bare metal with dedicated network hardware. Use them to *compare the stacks with each other*, not as absolute capacity figures.
:::

## Summary

:::note[All 12 libraries measured on one machine]
All 12 frameworks and baselines below, plus the two diagnostic Nalix runs, were measured on 2026-11-22 on the same 4-vCPU Linux VM in one uninterrupted pass, under the .NET 10.0.15 runtime and with a fresh (default) Nalix configuration. Every comparison reflects head-to-head results under identical hardware and OS conditions.
:::

- **Single-client latency:** Nalix TCP has the lowest p50 of the full frameworks. At 32 B the p50 is 56.7 µs for Nalix TCP, 58.4 µs for Nalix AEAD and 64.5 µs for Nalix WebSocket, against 70.4 µs for gRPC duplex, 79.8 µs for SignalR, 81.3 µs for the MagicOnion hub and 99.6 µs for gRPC unary. At 1 KB, Nalix TCP achieves 58.1 µs against 78.6 µs for SignalR, 79.2 µs for gRPC duplex and 97.7 µs for the MagicOnion hub. The hand-written raw-socket baseline (28.5 µs / 22.7 µs) and the raw Kestrel WebSocket echo (50.7 µs / 56.8 µs) are faster.
- **Throughput with 64 clients:**
  - At 32 B: Nalix TCP 97.0k ops/s, Nalix WebSocket 91.6k, Nalix TCP AEAD 86.5k, SignalR 79.5k, gRPC duplex 75.7k, MagicOnion hub 72.2k, gRPC unary 63.0k, MagicOnion unary 58.4k.
  - At 1 KB: Nalix TCP 86.2k ops/s, Nalix WebSocket 76.9k, SignalR 69.3k, Nalix TCP AEAD 66.9k, gRPC duplex 63.4k, MagicOnion hub 58.9k, gRPC unary 56.1k, MagicOnion unary 53.8k. Under this 4-core machine all frameworks are CPU-bound.
- **Throughput with 1 and 16 clients:** Nalix TCP is first at 1 client for both sizes (17.1k at 32 B, 16.5k at 1 KB). At 16 clients and 32 B, Nalix TCP (80.8k) and Nalix WebSocket (78.4k) lead SignalR (69.1k) and gRPC duplex (64.2k); at 16 clients and 1 KB, Nalix WebSocket (70.5k) and Nalix TCP (69.4k) lead SignalR (63.7k) and gRPC duplex (62.1k).
- **Inline dispatcher (diagnostic row):** with `InlinePacketDispatcher`, which hands each packet straight to a thread-pool work item instead of the dispatch channel, Nalix TCP reaches 135.9k ops/s at 32 B and 92.9k at 1 KB with 64 clients, at 15.0 µs of server CPU per message, on par with the raw Kestrel WebSocket echo (133.7k). It is opt-in and suits short handlers that do not block.
- **Server CPU per message:** at 64 clients and 32 B, Nalix WebSocket (20.9 µs) and SignalR (21.0 µs) are the cheapest of the full frameworks, ahead of Nalix TCP (23.4 µs) and gRPC duplex (24.9 µs); the Nalix client is also cheaper (16.0 µs client CPU/op vs 21.6 µs for SignalR).
- **Server allocations:** 56 B per message at 32 B for Nalix TCP, Nalix WebSocket and Nalix AEAD, the lowest of the full frameworks (MagicOnion hub 200 B, gRPC duplex 264 B, SignalR 672 B). Only the raw Kestrel WebSocket baseline allocates less (0 B). At 1 KB Nalix TCP allocates 1,048 B vs 1,192 B for the MagicOnion hub, 1,256 B for gRPC duplex and 1,664 B for SignalR.
- **Encryption:** Nalix AEAD (X25519 + ChaCha20-Poly1305) wins against gRPC over TLS on single-client latency (32 B p50 58.4 µs vs 105.2 µs for gRPC duplex TLS; at 1 KB 76.4 µs vs 114.5 µs), on 64-client throughput (86.5k vs 51.8k ops/s at 32 B; 66.9k vs 49.3k at 1 KB) and on server allocations (56 B vs 809 B at 32 B; 1,048 B vs 1,795 B at 1 KB).

## Environment

| Item | Value |
|:--|:--|
| CPU | Intel Xeon Processor @ 2.10 GHz (4 vCPU, 1 thread per core) |
| Memory | 16 GB |
| OS | Ubuntu 24.04.5 LTS (Linux 6.18, cloud VM container) |
| Runtime | .NET 10.0.15 runtime (SDK 11.0.100-rc.3), Release, x64 RyuJIT, TieredPGO on |
| GC | Server GC + Concurrent GC for **every** process (from `benchmarks/Directory.Build.props`) |
| Nalix | source at `master` (`ebb42388`, `Version.props` 14.3.10), project references, fresh default configuration |
| ASP.NET Core / SignalR | 10.0.13 (`Microsoft.AspNetCore.SignalR.Client`, `.Protocols.MessagePack` → MessagePack 2.5.303) |
| gRPC | `Grpc.AspNetCore` 2.84.0, `Grpc.Net.Client` 2.84.0, Google.Protobuf 3.35.1 |
| MagicOnion | `MagicOnion.Server` / `.Client` 7.11.0 (MessagePack 3.1.12) |
| Date | 2026-11-22 (all libraries measured on one machine in one pass) |
| Machine state | Idle VM before the run; no other workload during the run |

## Methodology

Harness: `benchmarks/Nalix.Comparison.Benchmarks` (runner `benchmarks/run-comparison.ps1` / `run-comparison.sh`). MagicOnion is in a
separate executable, `benchmarks/Nalix.Comparison.MagicOnion`, because it needs MessagePack v3 while the SignalR
MessagePack protocol is built against v2. Both executables share the same harness source file.

- **Topology:** the driver starts the library's **server as a separate child process** on `127.0.0.1`,
  then runs the clients inside the driver process. The server process reports its own
  `GC.GetTotalAllocatedBytes(precise: true)`, Gen0/1/2 collection counts and process CPU time between
  `reset` and `report` commands sent over stdin. So the allocation and CPU numbers are server-only, and they cover the
  **whole process** (I/O threads, timers and background tasks included).
- **Workload:** echo. The client sends an opaque byte payload of **32 B** or **1024 B**, and the server returns the same
  bytes in a response message. Each library uses its idiomatic request/response API:

| Label | What runs |
|:--|:--|
| `raw-tcp` | Baseline: hand-written `Socket` echo with a 4-byte length prefix. No framework. |
| `kestrel-ws` | Baseline: ASP.NET Core `UseWebSockets` binary echo, `ClientWebSocket` client. |
| `nalix-tcp` | Nalix `MapTcp<DefaultProtocol>` with a `[PacketController]` that echoes via a pooled response (`PacketFactory<T>.Acquire()` + `context.Sender.SendAsync`). The client uses `TcpSession.RequestAsync<T>`. **Default options**. |
| `nalix-ws` | Same as above over `MapWebSocket`, with a `WebSocketSession` client. |
| `nalix-tcp-aead` | `UseSecureConnections()` + `UseSystemControl()`. The client runs `HandshakeAsync()` (X25519), then requests go out with `WithEncrypt()` and the handler has `[PacketEncryption(true)]`, so both directions are ChaCha20-Poly1305. |
| `signalr-ws-msgpack` | SignalR hub `byte[] Echo(byte[])`, WebSockets transport only, `SkipNegotiation`, MessagePack protocol, `InvokeAsync<byte[]>`. |
| `grpc-unary` / `grpc-unary-tls` | Unary `rpc Unary(EchoMessage) returns (EchoMessage)` with a `bytes` field, over h2c or HTTP/2+TLS (self-signed ECDSA P-256). |
| `grpc-duplex` / `grpc-duplex-tls` | One long-lived bidirectional stream per client, with one write and one read per operation. |
| `magiconion-unary` / `magiconion-hub` | `IService<T>` `UnaryResult<byte[]>`, or a `StreamingHub` method returning `ValueTask<byte[]>`, over h2c. |

- **Every client owns its own connection** (for gRPC and MagicOnion, its own `GrpcChannel` / `SocketsHttpHandler`), so
  "N clients" means N TCP connections for every library.
- **Latency:** one client, sequential calls. 20 000 warm-up calls, then **100 000 timed calls**. Every call is timed
  with `Stopwatch` and the samples are sorted to read exact percentiles.
- **Throughput:** N ∈ {1, 16, 64} clients in a **closed loop** (each client keeps one request in flight). After 2 s of warm-up,
  requests are counted over an 8 s window.
- **Runs:** 3 runs of each cell. The tables show the **median** of the runs, and `±x%` is half of the (max − min)/median spread.
- ASP.NET Core servers use `WebApplication.CreateBuilder`, with logging cleared and the minimum level set to Warning, and Kestrel bound only to loopback. No
  competitor was tuned beyond its documented default setup. The same goes for Nalix, except for two anti-abuse defaults that would break a loopback load test: the harness raises the per-IP connection quota and sets `TimingWheelOptions.HandshakeTimeoutMs` to 0, because the plaintext modes never handshake and would otherwise be closed 15 s after accept.
- Raw data (JSON lines, one row per run) is in
  [data/network-comparison-results.jsonl](data/network-comparison-results.jsonl). The tables below are produced from it by
  `benchmarks/Nalix.Comparison.Benchmarks/aggregate.py`. The file also holds two diagnostic Nalix runs (`nalix-tcp-nocomp`, `nalix-tcp-inline`) that are not part of the tables.

Reproduce with:

```bash
benchmarks/run-comparison.sh        # Linux/macOS
```

```powershell
.\benchmarks\run-comparison.ps1    # Windows
```

## Results

### Latency — 32 B payload, 1 client, sequential request/response

| Library | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | run spread (p50) | server alloc/op (B) |
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

### Latency — 1024 B payload, 1 client, sequential request/response

| Library | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | run spread (p50) | server alloc/op (B) |
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

### Throughput — 32 B payload, N clients closed-loop (ops/s, median of runs)

| Library | 1 client | 16 clients | 64 clients |
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

#### Cost per message at 64 clients — 32 B

| Library | server alloc/op (B) | server CPU/op (µs) | client CPU/op (µs) | client alloc/op (B) | server Gen0/1/2 per run |
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

### Throughput — 1024 B payload, N clients closed-loop (ops/s, median of runs)

| Library | 1 client | 16 clients | 64 clients |
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

#### Cost per message at 64 clients — 1024 B

| Library | server alloc/op (B) | server CPU/op (µs) | client CPU/op (µs) | client alloc/op (B) | server Gen0/1/2 per run |
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

## Who wins where

| Scenario | Best framework (excluding raw baselines) | Nalix position |
|:--|:--|:--|
| Latency, 32 B, 1 client | **Nalix TCP** (p50 56.7 µs) | 1st. Nalix AEAD 58.4 µs, Nalix WS 64.5 µs, gRPC duplex 70.4 µs, SignalR 79.8 µs, MagicOnion hub 81.3 µs |
| Latency, 1 KB, 1 client | **Nalix TCP** (p50 58.1 µs) | 1st. Nalix WS 70.5 µs, Nalix AEAD 76.4 µs, SignalR 78.6 µs, gRPC duplex 79.2 µs, MagicOnion hub 97.7 µs |
| Latency, encrypted | **Nalix AEAD** at both sizes (58.4 µs vs gRPC duplex TLS 105.2 µs at 32 B; 76.4 µs vs 114.5 µs at 1 KB) | 1st at both sizes |
| Throughput, 1 client, 32 B | **Nalix TCP** (17.1k) | 1st (Nalix AEAD 14.6k, Nalix WS 13.9k, gRPC duplex 13.2k) |
| Throughput, 16 clients, 32 B | **Nalix TCP** 80.8k | 1st (Nalix WS 78.4k, SignalR 69.1k, gRPC duplex 64.2k) |
| Throughput, 16 clients, 1 KB | **Nalix WS** 70.5k / Nalix TCP 69.4k | 1st (SignalR 63.7k, gRPC duplex 62.1k) |
| Throughput, 64 clients, 32 B | **Nalix TCP** 97.0k | 1st (Nalix WS 91.6k, SignalR 79.5k, gRPC duplex 75.7k) |
| Throughput, 64 clients, 1 KB | **Nalix TCP** 86.2k | 1st (Nalix WS 76.9k, SignalR 69.3k, gRPC duplex 63.4k) |
| Throughput, encrypted, 64 clients | **Nalix AEAD** (86.5k at 32 B, 66.9k at 1 KB) | 1st (gRPC duplex TLS 51.8k / 49.3k) |
| Server allocations/msg | **Nalix TCP / WS / AEAD** 56 B at 32 B | 1st of the frameworks (only raw Kestrel WebSocket, 0 B, is lower) |
| Server CPU/msg, 64 clients, 32 B | **Nalix WS** 20.9 µs / SignalR 21.0 µs | Nalix WS level with SignalR; Nalix TCP 23.4 µs, ahead of gRPC duplex (24.9 µs) and MagicOnion hub (26.5 µs) |

## Caveats

- **Loopback and a small shared host.** The 4 vCPUs run both the load generator and the server, so high-concurrency numbers are CPU-bound and differences of a few percent are within run-to-run noise (see the ± columns); absolute capacity on bare metal with dedicated network hardware will differ.
- **The client library counts.** Latency and throughput include each stack's client (Nalix SDK, `HubConnection`, `Grpc.Net.Client`, MagicOnion's dynamic client).
- **Closed loop with one request in flight per client.** Pipelined or fire-and-forget server push was not measured.
- **Whole-process allocations.** The server numbers include background work (timers, task manager), spread across all messages.
- **The encrypted comparison is not like-for-like.** TLS 1.3 (AES-GCM via OpenSSL, hardware-accelerated) protects the whole stream, while Nalix encrypts per packet with a managed ChaCha20-Poly1305 after an X25519 handshake, and needs no certificate.
