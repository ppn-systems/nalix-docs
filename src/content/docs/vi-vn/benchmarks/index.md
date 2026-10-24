---
title: Benchmark hiệu năng
description: Nalix được thiết kế cho các ứng dụng thời gian thực với thông lượng cao và độ trễ thấp. Tài liệu này cung cấp báo cáo đầy đủ về các bộ benchmark của Nalix được chạy vào ngày 2026-10-01.
section: Benchmarks
---

Nalix được thiết kế cho các ứng dụng thời gian thực với thông lượng cao và độ trễ thấp. Tài liệu này cung cấp báo cáo đầy đủ về các bộ benchmark của Nalix được chạy vào ngày 2026-10-01.

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

Các benchmark được chạy trong môi trường sau:

- **OS**: Windows 11 (10.0.26300.9550)
- **CPU**: 13th Gen Intel Core i7-13620H (2.40GHz)
- **Lõi**: 10 vật lý, 16 luồng logic
- **Runtime**: .NET 10.0.12 (SDK 10.0.401, X64 RyuJIT x86-64-v3)
- **Môi trường**: Performance Power Plan, Server GC bật, Concurrent GC bật
- **Toolchain**: BenchmarkDotNet v0.15.8
