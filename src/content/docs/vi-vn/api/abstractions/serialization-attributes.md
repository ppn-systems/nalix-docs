---
title: Thuộc tính tuần tự hóa
description: Attribute bố cục nhị phân và formatter trong Nalix.Abstractions.Serialization, gồm [Packet], [GenerateFormatter], [SerializePackable], [SerializeOrder], [SerializeIgnore], [SerializeHeader], [SerializeDynamicSize], IFixedSizeSerializable và SerializerBounds.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Serialization` (và `Nalix.Abstractions.Networking.Packets`)  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Serialization` định nghĩa các attribute lúc biên dịch, enum bố cục, hợp đồng kích thước và hằng số biên, được `SerializeFormatterGenerator`, `PacketSchemaGenerator` và `LiteSerializer` sử dụng.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Serialization/GenerateFormatterAttribute.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializePackableAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeOrderAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeIgnoreAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeHeaderAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeDynamicSizeAttribute.cs`
- `src/Nalix.Abstractions/Serialization/SerializeLayout.cs`
- `src/Nalix.Abstractions/Serialization/SerializerBounds.cs`
- `src/Nalix.Abstractions/Serialization/IFixedSizeSerializable.cs`

## Tham chiếu attribute & hợp đồng

| Kiểu | Phạm vi | Hàm dựng & thành phần | Mục đích |
| --- | --- | --- | --- |
| `[Packet]` (`PacketAttribute`) | Lớp, Struct, Interface | `PacketAttribute()` | Đánh dấu một lớp `PacketBase<TSelf>` (triển khai `IPacketStaticOpcode`) để `PacketRegistryGenerator` phát hiện. |
| `[GenerateFormatter]` | Lớp, Struct | `GenerateFormatterAttribute()` | Yêu cầu `SerializeFormatterGenerator` sinh `IFormatter<T>` (và `IFillableFormatter<T>` cho lớp) lúc biên dịch. Kiểu đích phải là `partial` (`NALIX059`). |
| `[SerializePackable]` | Lớp, Struct, Interface | `SerializePackableAttribute(SerializeLayout layout = SerializeLayout.Auto)`<br/>Thuộc tính: `SerializeLayout SerializeLayout` | Khai báo chế độ thứ tự thành viên (`Auto`, `Sequential` hoặc `Explicit`). |
| `[SerializeOrder]` | Trường, Thuộc tính | `SerializeOrderAttribute(int order)`<br/>`SerializeOrderAttribute(PacketHeaderOffset offset)`<br/>Thuộc tính: `int Order` | Gán chỉ số thứ tự tuần tự hóa không âm (`0, 1, 2...`) khi dùng `SerializeLayout.Explicit`. |
| `[SerializeIgnore]` | Trường, Thuộc tính | `SerializeIgnoreAttribute()` | Loại một trường hoặc thuộc tính khỏi tuần tự hóa nhị phân. Không thể kết hợp với `[SerializeOrder]` (`NALIX015`). |
| `[SerializeHeader]` | Trường, Thuộc tính | `SerializeHeaderAttribute(int order)`<br/>`SerializeHeaderAttribute(PacketHeaderOffset offset)`<br/>Thuộc tính: `int Order` | Đánh dấu một trường header cơ sở (`PacketHeaderOffset.Region = 6` dành riêng byte `0..5` trên `PacketBase<TSelf>`, được `NALIX022` kiểm tra). |
| `[SerializeDynamicSize]` | Trường, Thuộc tính | `SerializeDynamicSizeAttribute(int size = 20)`<br/>Thuộc tính: `int Size` | Cung cấp gợi ý kích thước buffer cho chuỗi, mảng hoặc collection có độ dài thay đổi. |
| `IFixedSizeSerializable` | Interface | `static abstract int Size { get; }` | Hợp đồng cho struct/gói tin có kích thước cố định, kích thước trên dây được biết lúc biên dịch (không được chứa thành viên động theo `NALIX051`). |
| `SerializerBounds` | Lớp static | `Null = -1`<br/>`MaxArray = 1_048_576`<br/>`MaxString = 1_048_576`<br/>`NullArrayMarker => [255, 255, 255, 255]` (`ReadOnlySpan<byte>`)<br/>`EmptyArrayMarker => [0, 0, 0, 0]` (`ReadOnlySpan<byte>`) | Marker trên dây và giới hạn an toàn cứng cho giải tuần tự hóa mảng và chuỗi. |

## Ví dụ

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class TransformUpdatePacket : PacketBase<TransformUpdatePacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x2001;

    [SerializeOrder(0)]
    public ulong EntityId { get; set; }

    [SerializeOrder(1)]
    public float X { get; set; }

    [SerializeOrder(2)]
    public float Y { get; set; }

    [SkipClean]
    [SerializeIgnore]
    public long LocalTimestampTicks { get; set; }
}
```

## API liên quan

- [Bộ sinh tuần tự hóa](../analyzers/autogen/serialization-generator.md)
- [Bộ sinh Packet Schema](../analyzers/autogen/packet-schema-generator.md)
- [Cơ bản về tuần tự hóa](../codec/serialization/serialization-basics.md)
- [Mã chẩn đoán (NALIX013–NALIX022, NALIX051, NALIX059)](../analyzers/diagnostic-codes.md)
