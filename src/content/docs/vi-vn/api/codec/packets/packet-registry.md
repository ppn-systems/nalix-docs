---
title: Registry gói tin
description: Danh mục opcode gói tin dùng chung trong process, được sinh bởi source generator, và bảng giải tuần tự hóa O(1) trong Nalix.Codec.DataFrames.PacketRegistry.
section: API Reference
package: Nalix.Codec
---

**Không gian tên:** `Nalix.Codec.DataFrames`  
**Assembly:** `Nalix.Codec`

`PacketRegistry` là một danh mục dùng chung trong process, an toàn đa luồng, ánh xạ opcode gói tin 16-bit (`ushort`) tới các delegate `PacketDeserializer` được sinh lúc biên dịch, lưu trong một mảng tra cứu O(1) (`PacketDeserializer?[65536]`).

## Ánh xạ mã nguồn

- `src/Nalix.Codec/DataFrames/PacketRegistry.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketRegistryGenerator.cs`

## Vòng đời cốt lõi

1. **Khởi tạo tĩnh & đăng ký lúc biên dịch (`[ModuleInitializer]`)**:
   - Constructor tĩnh của `PacketRegistry` đăng ký sẵn cả 11 frame giao thức tích hợp (`Control`, `Directive`, `TimeSync`, `SessionInit`, `SessionChallenge`, `SessionProof`, `SessionEstablished`, `SessionResume`, `SessionTofu`, `ProofOfWorkChallenge`, `ProofOfWorkProof`) và điền sẵn `s_runtimeFastDispatcher` tích hợp.
   - `PacketRegistryGenerator` tìm mọi lớp gói tin cụ thể triển khai `IPacket` và `IPacketDeserializer<TSelf>` (có `[Packet]` hoặc `IPacketStaticOpcode`) và sinh ra `PacketRegistryGenerated.Initialize()`, phương thức này gọi `PacketRegistry.RegisterGenerated<TPacket>(name, deserializer)` và `PacketRegistry.RegisterGenerated(PacketDispatch)`.
2. **Cấu hình pool (`PacketRegistry.Configure`)**:
   - `Configure(IObjectPoolManager? manager)` gắn `IObjectPoolManager` dùng chung cho `PacketBase<TSelf>.Create()` và thiết lập sẵn sức chứa pool (`128` mỗi loại) cho cả 11 frame giao thức tích hợp.
3. **Đóng băng bảng tra cứu (`PacketRegistry.Build`)**:
   - `Build()` tạo bảng `PacketDeserializer?[]` gồm 65,536 phần tử và ghép các bộ dispatch nhanh `PacketDispatch` đã đăng ký (`RegisterGenerated` hoạt động cả trước và sau `Build()`). `NetworkApplicationBuilder.Build()` và `TransportSession` tự động gọi `PacketRegistry.Build()`.

## Tham chiếu API công khai

| Thành viên | Chữ ký | Mô tả |
| --- | --- | --- |
| `IsBuilt` | `public static bool IsBuilt { get; }` | Trả về `true` sau khi `Build()` đã được gọi. |
| `DeserializerCount` | `public static int DeserializerCount { get; }` | Số lượng deserializer gói tin đã đăng ký và được đóng băng trong `Build()`. |
| `Configure` | `public static void Configure(IObjectPoolManager? manager)` | Đặt `IObjectPoolManager` dùng chung cho pooling `PacketBase<TSelf>` và cấu hình sức chứa pool cho các frame giao thức tích hợp. |
| `Build` | `public static void Build()` | Xây dựng và đóng băng bảng tra cứu opcode 65,536 phần tử một cách idempotent. |
| `RegisterGenerated` | `public static void RegisterGenerated(PacketDispatch dispatcher)` | Đăng ký một delegate `PacketDispatch` theo đường nhanh (`bool PacketDispatch(ushort opcode, ReadOnlySpan<byte> raw, out IPacket? packet)`). |
| `RegisterGenerated<TPacket>` | `public static void RegisterGenerated<TPacket>(string name, PacketDeserializer deserializer) where TPacket : IPacket, IPacketStaticOpcode` | Đăng ký deserializer gói tin cho `TPacket.StaticOpCode`. Ném `InternalErrorException` nếu opcode đã được gán cho một tên gói tin khác. |
| `IsKnownOpCode` | `public static bool IsKnownOpCode(ushort opcode)` | Trả về `true` nếu đã đăng ký deserializer cho `opcode` (yêu cầu đã gọi `Build()`). |
| `IsRegistered<TPacket>` | `public static bool IsRegistered<TPacket>() where TPacket : IPacket, IPacketStaticOpcode` | Trả về `true` nếu `TPacket.StaticOpCode` đã được đăng ký (yêu cầu đã gọi `Build()`). |
| `Deserialize` | `public static IPacket Deserialize(ReadOnlySpan<byte> raw)` | Giải tuần tự hóa `raw` hoặc ném `ArgumentException` (nếu `< 6` byte) / `InvalidOperationException` (nếu chưa build hoặc opcode chưa đăng ký). |
| `TryDeserialize` | `public static bool TryDeserialize(ReadOnlySpan<byte> raw, [NotNullWhen(true)] out IPacket? packet)` | Giải tuần tự hóa không ném ngoại lệ. Trả về `false` nếu `raw.Length < 6` (`PacketConstants.HeaderSize`) hoặc opcode không xác định. |

## Cách dùng

### 1. Khởi tạo độc lập

`NetworkApplicationBuilder` và `TransportSession` tự động gọi `PacketRegistry.Build()`. Trong các benchmark độc lập hoặc unit test, hãy gọi `Build()` một lần trước khi giải tuần tự hóa:

```csharp
using Nalix.Codec.DataFrames;
using Nalix.Framework.Memory.Objects;

// Tùy chọn: gắn ObjectPoolManager để PacketBase<T>.Deserialize lấy instance từ pool
PacketRegistry.Configure(new ObjectPoolManager());

// Đóng băng bảng tra cứu opcode O(1)
PacketRegistry.Build();
```

### 2. Giải tuần tự hóa gói tin

```csharp
using System;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.DataFrames;
using Nalix.Framework.Injection;

if (PacketRegistry.TryDeserialize(bufferLease.Span, out IPacket? packet))
{
    try
    {
        Console.WriteLine($"Decoded OpCode=0x{packet.Header.OpCode:X4}, Type={packet.GetType().Name}");
    }
    finally
    {
        // Giải phóng các instance PacketBase<TSelf> lấy từ pool để trả về đúng pool theo kiểu TSelf cụ thể
        (packet as IDisposable)?.Dispose();
    }
}
```

## API liên quan

- [Trình sinh Registry gói tin](../../analyzers/autogen/packet-registry-generator.md)
- [Mô hình Frame](./frame-model.md)
- [Frame tích hợp sẵn](./built-in-frames.md)
- [Hợp đồng gói tin](../../abstractions/packet-contracts.md)
- [Điều phối gói tin](../../runtime/routing/packet-dispatch.md)
