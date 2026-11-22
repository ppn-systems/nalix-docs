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
All 12 frameworks and baselines below, plus the two diagnostic Nalix runs, were measured on 2026-11-21 on the same 4-vCPU Linux VM in two back-to-back batches (`nalix-tcp`, `nalix-ws` and `nalix-tcp-aead` first, then the rest), under the .NET 10.0.15 runtime. Every comparison reflects head-to-head results under identical hardware and OS conditions.
:::

- **Single-client latency:** Nalix TCP has the lowest p50 of the full frameworks. At 32 B the p50 is 60.0 µs for Nalix TCP, 67.7 µs for Nalix WebSocket and 72.7 µs for Nalix AEAD, against 77.4 µs for gRPC duplex, 93.8 µs for the MagicOnion hub, 96.5 µs for SignalR and 115.1 µs for gRPC unary. At 1 KB, Nalix TCP achieves 66.2 µs against 84.7 µs for gRPC duplex, 96.8 µs for SignalR and 98.2 µs for the MagicOnion hub. The hand-written raw-socket baseline (29.0 µs / 27.0 µs) and the raw Kestrel WebSocket echo (55.7 µs / 60.1 µs) are faster.
- **Throughput with 64 clients:**
  - At 32 B: Nalix TCP 85.3k ops/s, Nalix WebSocket 74.8k, Nalix TCP AEAD 72.6k, SignalR 67.7k, gRPC duplex 64.9k, MagicOnion hub 59.8k, gRPC unary 51.2k, MagicOnion unary 50.4k.
  - At 1 KB: Nalix TCP 65.7k ops/s, SignalR 63.1k, gRPC duplex 60.9k, Nalix TCP AEAD 57.2k, Nalix WebSocket 56.1k, MagicOnion hub 50.9k, gRPC unary 49.1k, MagicOnion unary 44.2k. Under this 4-core machine all frameworks are CPU-bound; at 1 KB the top three sit within about 8% of each other.
- **Throughput with 1 and 16 clients:** Nalix TCP is first at 1 client for both sizes (14.7k at 32 B, 13.4k at 1 KB). At 16 clients and 32 B, Nalix TCP (69.0k) and Nalix WebSocket (65.7k) lead gRPC duplex (59.5k) and SignalR (57.4k); at 16 clients and 1 KB, Nalix TCP (54.7k), Nalix WebSocket (54.6k) and gRPC duplex (54.4k) are level.
- **Server CPU per message:** Nalix TCP measures 27.2 µs at 64 clients and 32 B against 25.0 µs for SignalR and 27.7 µs for gRPC duplex (Nalix WebSocket 26.5 µs), so SignalR's server is the cheapest of the full frameworks; the Nalix client is cheaper (17.5 µs client CPU/op vs 25.7 µs for SignalR).
- **Server allocations:** 56 B per message at 32 B for Nalix TCP, Nalix WebSocket and Nalix AEAD, the lowest of the full frameworks (MagicOnion hub 200 B, gRPC duplex 264 B, SignalR 672 B). Only the raw Kestrel WebSocket baseline allocates less (0 B). At 1 KB Nalix TCP allocates 1,048 B vs 1,192 B for the MagicOnion hub, 1,256 B for gRPC duplex and 1,664 B for SignalR.
- **Encryption:** Nalix AEAD (X25519 + ChaCha20-Poly1305) wins against gRPC over TLS on single-client latency (32 B p50 72.7 µs vs 116.7 µs for gRPC duplex TLS; at 1 KB 90.6 µs vs 119.5 µs), on 64-client throughput (72.6k vs 50.9k ops/s at 32 B; 57.2k vs 42.2k at 1 KB) and on server allocations (56 B vs 813 B at 32 B; 1,048 B vs 1,802 B at 1 KB).

## Environment

| Item | Value |
|:--|:--|
| CPU | Intel Xeon Processor @ 2.10 GHz (4 vCPU, 1 thread per core) |
| Memory | 16 GB |
| OS | Ubuntu 24.04.5 LTS (Linux 6.18, cloud VM container) |
| Runtime | .NET 10.0.15 runtime (SDK 11.0.100-rc.3), Release, x64 RyuJIT, TieredPGO on |
| GC | Server GC + Concurrent GC for **every** process (from `benchmarks/Directory.Build.props`) |
| Nalix | source at `master` (`Version.props` 14.3.10), project references |
| ASP.NET Core / SignalR | 10.0.13 (`Microsoft.AspNetCore.SignalR.Client`, `.Protocols.MessagePack` → MessagePack 2.5.303) |
| gRPC | `Grpc.AspNetCore` 2.84.0, `Grpc.Net.Client` 2.84.0, Google.Protobuf 3.35.1 |
| MagicOnion | `MagicOnion.Server` / `.Client` 7.11.0 (MessagePack 3.1.12) |
| Date | 2026-11-21 (all libraries measured on one machine, two back-to-back batches) |
| Machine state | Idle VM before the run; no other workload during the batches |

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

### Latency — 1024 B payload, 1 client, sequential request/response

| Library | mean (µs) | p50 (µs) | p90 (µs) | p99 (µs) | p99.9 (µs) | run spread (p50) | server alloc/op (B) |
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

### Throughput — 32 B payload, N clients closed-loop (ops/s, median of runs)

| Library | 1 client | 16 clients | 64 clients |
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

#### Cost per message at 64 clients — 32 B

| Library | server alloc/op (B) | server CPU/op (µs) | client CPU/op (µs) | client alloc/op (B) | server Gen0/1/2 per run |
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

### Throughput — 1024 B payload, N clients closed-loop (ops/s, median of runs)

| Library | 1 client | 16 clients | 64 clients |
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

#### Cost per message at 64 clients — 1024 B

| Library | server alloc/op (B) | server CPU/op (µs) | client CPU/op (µs) | client alloc/op (B) | server Gen0/1/2 per run |
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

## Who wins where

| Scenario | Best framework (excluding raw baselines) | Nalix position |
|:--|:--|:--|
| Latency, 32 B, 1 client | **Nalix TCP** (p50 60.0 µs) | 1st. Nalix WS 67.7 µs, Nalix AEAD 72.7 µs, gRPC duplex 77.4 µs, MagicOnion hub 93.8 µs, SignalR 96.5 µs |
| Latency, 1 KB, 1 client | **Nalix TCP** (p50 66.2 µs) | 1st. Nalix WS 78.7 µs, gRPC duplex 84.7 µs, Nalix AEAD 90.6 µs, SignalR 96.8 µs, MagicOnion hub 98.2 µs |
| Latency, encrypted | **Nalix AEAD** at both sizes (72.7 µs vs gRPC duplex TLS 116.7 µs at 32 B; 90.6 µs vs 119.5 µs at 1 KB) | 1st at both sizes |
| Throughput, 1 client, 32 B | **Nalix TCP** (14.7k) | 1st (Nalix WS 13.6k, Nalix AEAD 13.6k, gRPC duplex 12.0k) |
| Throughput, 16 clients, 32 B | **Nalix TCP** 69.0k | 1st (Nalix WS 65.7k, gRPC duplex 59.5k, SignalR 57.4k) |
| Throughput, 16 clients, 1 KB | **Nalix TCP** 54.7k / Nalix WS 54.6k / gRPC duplex 54.4k | 1st (within run noise of gRPC duplex; SignalR 51.0k) |
| Throughput, 64 clients, 32 B | **Nalix TCP** 85.3k | 1st (Nalix WS 74.8k, SignalR 67.7k, gRPC duplex 64.9k) |
| Throughput, 64 clients, 1 KB | **Nalix TCP** 65.7k | 1st (SignalR 63.1k, gRPC duplex 60.9k, Nalix WS 56.1k) |
| Throughput, encrypted, 64 clients | **Nalix AEAD** (72.6k at 32 B, 57.2k at 1 KB) | 1st (gRPC duplex TLS 50.9k / 42.2k) |
| Server allocations/msg | **Nalix TCP / WS / AEAD** 56 B at 32 B | 1st of the frameworks (only raw Kestrel WebSocket, 0 B, is lower) |
| Server CPU/msg, 64 clients, 32 B | **SignalR** 25.0 µs | Nalix WS 26.5 µs and Nalix TCP 27.2 µs, level with gRPC duplex (27.7 µs), ahead of MagicOnion hub (33.5 µs) |

## Caveats

- **Loopback and a small shared host.** The 4 vCPUs run both the load generator and the server, so high-concurrency numbers are CPU-bound and differences of a few percent are within run-to-run noise (see the ± columns); absolute capacity on bare metal with dedicated network hardware will differ.
- **The client library counts.** Latency and throughput include each stack's client (Nalix SDK, `HubConnection`, `Grpc.Net.Client`, MagicOnion's dynamic client).
- **Closed loop with one request in flight per client.** Pipelined or fire-and-forget server push was not measured.
- **Whole-process allocations.** The server numbers include background work (timers, task manager), spread across all messages.
- **The encrypted comparison is not like-for-like.** TLS 1.3 (AES-GCM via OpenSSL, hardware-accelerated) protects the whole stream, while Nalix encrypts per packet with a managed ChaCha20-Poly1305 after an X25519 handshake, and needs no certificate.
