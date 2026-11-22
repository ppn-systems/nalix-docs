---
title: Benchmark hiệu năng
description: Nalix được thiết kế cho các ứng dụng thời gian thực với thông lượng cao và độ trễ thấp. Tài liệu này cung cấp báo cáo đầy đủ về các bộ benchmark của Nalix được chạy vào ngày 2026-11-21.
section: Benchmarks
---

Nalix được thiết kế cho các ứng dụng thời gian thực với thông lượng cao và độ trễ thấp. Tài liệu này cung cấp báo cáo đầy đủ về các bộ benchmark của Nalix được chạy vào ngày 2026-11-21.

## Triết lý hiệu năng

Framework đạt được hiệu năng vượt trội nhờ một số nguyên tắc thiết kế cốt lõi:

- **Abstraction không khóa (Lock-Free)**: Giảm thiểu tranh chấp bằng các mẫu interlocked và thread-local.
- **Pipeline không cấp phát bộ nhớ**: Tái sử dụng bộ nhớ thông qua pooling tiên tiến cho việc truyền dữ liệu.
- **Metadata tính trước**: Tránh reflection và tra cứu chuỗi trên hot path.
- **Tối ưu theo phần cứng**: Tận dụng SIMD, inlining tích cực và bố cục `Span<T>` an toàn về bộ nhớ.

## Các nhóm benchmark

Xem chi tiết các chỉ số theo từng hệ thống con:

- [**Hạ tầng lõi**](infrastructure.md): Connection Hub, Session Store, Packet Registry và Throttling (Concurrency Gate, Token Bucket).
- [**Bộ nhớ và lưu trữ**](memory.md): Buffer Pooling và Object Pooling.
- [**Xử lý dữ liệu**](data-processing.md): LZ4, đóng khung và biến đổi pipeline.
- [**Bảo mật và mật mã**](security.md): Handshake, envelope cipher và hashing.
- [**Tuần tự hóa**](serialization.md): Chi tiết hiệu năng của LiteSerializer.
- [**So sánh phương thức tuần tự hóa**](serialization-method-compare.md): So sánh đầy đủ các phương thức (LiteSerializer, MemoryPack, MessagePack, System.Text.Json).
- [**So sánh mạng end-to-end**](network-comparison.md): Độ trễ, thông lượng và cấp phát bộ nhớ request/response thực tế trên loopback so với SignalR, gRPC và MagicOnion.

---

## Thông tin môi trường

Các benchmark được chạy trên các máy ảo đám mây cùng loại, mỗi bộ benchmark một máy, trong môi trường sau:

- **OS**: Ubuntu 24.04.5 LTS (Linux 6.18, máy khách KVM)
- **CPU**: Intel Xeon Processor @ 2.10–2.30 GHz
- **Lõi**: 4 vCPU (1 luồng mỗi lõi)
- **Runtime**: .NET 10.0.15 (target net10.0, X64 RyuJIT; build bằng SDK 10.0.404 hoặc 11.0.x)
- **Môi trường**: Server GC bật, Concurrent GC bật
- **Toolchain**: BenchmarkDotNet v0.15.8
