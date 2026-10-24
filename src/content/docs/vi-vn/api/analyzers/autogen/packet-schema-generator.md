---
title: Packet Schema Generator
description: Incremental Roslyn source generator (PacketSchemaGenerator) tính kích thước wire lúc biên dịch, sinh thuộc tính Length động và các override ResetForPool() cho các lớp partial PacketBase<TSelf>.
section: API Reference
package: Nalix.Analyzers
---

`PacketSchemaGenerator` (`analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`) là một incremental Roslyn source generator, kiểm tra mọi lớp kế thừa `PacketBase<TSelf>` và sinh ra các override `Length`, các implementation `ResetForPool()` không cấp phát bộ nhớ, và `public static int Size` (khi lớp implement `IFixedSizeSerializable`).

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## Những gì được sinh ra

Với mọi lớp `partial` kế thừa `PacketBase<TSelf>`:

1. **`public override int Length { get; }`**:
   - Tính độ dài byte tuần tự hóa chính xác của gói tin (`PacketConstants.HeaderSize` = 6 byte cộng với mọi field/property được tuần tự hóa trên toàn bộ chuỗi kế thừa).
   - Với các thành viên động (`string`, `byte[]`, `T[]`, `List<T>`), thêm tiền tố độ dài 4 byte (`4` byte cho mỗi thành viên động) cộng với `Encoding.UTF8.GetByteCount(...)` với chuỗi, hoặc `count * elementSize` với tập hợp.
2. **`public override void ResetForPool()`** (trừ khi người dùng đã override thủ công):
   - Gọi `base.ResetForPool()`.
   - Đặt lại thành viên `string` về `string.Empty`, xóa tập hợp `List<T>` (`?.Clear()`), đặt lại `ArraySegment<T>`/`Memory<T>`/`ReadOnlyMemory<T>` về `default`, gọi `.ResetForPool()` trên các thành viên lồng nhau kiểu `IPoolable`, và đặt lại kiểu giá trị và mảng về `default`.
   - **Tôn trọng `[SkipClean]`**: Mọi field hoặc property được đánh dấu `[SkipClean]` sẽ không bị thay đổi trong `ResetForPool()`.
3. **`public static int Size => <totalFixedBytes>;`** (được sinh ra khi gói tin implement `IFixedSizeSerializable`):
   - Cung cấp hằng số kích thước wire lúc biên dịch mà `IFixedSizeSerializable.Size` yêu cầu.

:::warning[`NALIX060`: Lớp gói tin phải là `partial`]
Nếu một lớp kế thừa `PacketBase<TSelf>` mà thiếu từ khóa `partial`, `PacketSchemaGenerator` phát ra lỗi **`NALIX060`** vì nó không thể chèn `Length`, `ResetForPool()` hoặc `Size` vào lớp đó.
:::

## Ví dụ

### Định nghĩa gói tin nguồn

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet(0x1005)]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class PlayerChatPacket : PacketBase<PlayerChatPacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x1005;

    [SerializeOrder(0)]
    public ulong PlayerId { get; set; }

    [SerializeOrder(1)]
    public string Message { get; set; } = string.Empty;

    [SkipClean]
    [SerializeIgnore]
    public int CachedChannelId { get; set; }
}
```

### Phần bổ sung được sinh ra (`PlayerChatPacket_Schema.g.cs`)

```csharp
public partial class PlayerChatPacket
{
    public override int Length
    {
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        get
        {
            int size = 14; // Header (6B) + PlayerId (8B)
            size += 4 + (this.Message is null ? 0 : System.Text.Encoding.UTF8.GetByteCount(this.Message));
            return size;
        }
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public override void ResetForPool()
    {
        base.ResetForPool();
        this.PlayerId = default;
        this.Message = string.Empty;
        // CachedChannelId được bỏ qua vì được đánh dấu [SkipClean]
    }
}
```

## Chẩn đoán được phát ra

| ID | Tiêu đề | Mức độ | Nguyên nhân |
| --- | --- | :---: | --- |
| `NALIX060` | Lớp gói tin phải là partial | Lỗi | Một lớp kế thừa `PacketBase<TSelf>` nhưng thiếu modifier `partial`. |

## API liên quan

- [Tổng quan Source Generator](./index.md)
- [Chẩn đoán (Diagnostic Codes)](../diagnostic-codes.md)
- [Frame Model (PacketBase<TSelf>)](../../codec/packets/frame-model.md)
- [Serialization Generator](./serialization-generator.md)
