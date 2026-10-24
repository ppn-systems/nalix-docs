---
title: Serialization Generator
description: Incremental Roslyn source generator (SerializeFormatterGenerator) sinh ra bộ tuần tự hóa nhị phân không dùng reflection IFormatter<T> và IFillableFormatter<T> cho các kiểu [GenerateFormatter].
section: API Reference
package: Nalix.Analyzers
---

`SerializeFormatterGenerator` (`analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`) là một incremental Roslyn source generator, sinh ra các implementation `IFormatter<T>` và `IFillableFormatter<T>` lúc biên dịch cho các lớp và struct được đánh dấu `[GenerateFormatter]`.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## Cách hoạt động

1. **Tìm và kiểm tra mục tiêu**:
   - Quét mọi lớp và struct được đánh dấu `[GenerateFormatter]` (được `PacketBase<TSelf>` kế thừa tự động).
   - Với kiểu tham chiếu (`class`), kiểm tra có tồn tại method `Create()` tĩnh có thể truy cập hay không (`PacketBase<TSelf>.Create()` tự động thỏa điều kiện này). Nếu một lớp `[GenerateFormatter]` tùy chỉnh không kế thừa `PacketBase<TSelf>` và cũng không có `static T Create()`, generator báo lỗi **`NALIX059`**.
2. **Bố cục và thứ tự thành viên**:
   - Kiểm tra `[SerializePackable(SerializeLayout.Explicit)]` so với `[SerializePackable(SerializeLayout.Sequential)]`.
   - Sắp xếp field và property trên toàn chuỗi kế thừa (bắt đầu với `PacketBase.Header` tại `[SerializeHeader(PacketHeaderOffset.Header)]` có thứ tự `0`).
   - Loại trừ các thành viên `[SerializeIgnore]`.
3. **Sinh formatter**:
   - Với kiểu tham chiếu (`class`), implement cả `IFormatter<T>` và `IFillableFormatter<T>`, thuê các instance pooled qua `T.Create()` trong `Deserialize(ref DataReader)` và điền dữ liệu tại chỗ qua `Fill(ref DataReader, T value)`.
   - Với kiểu giá trị (`struct`), chỉ implement `IFormatter<T>`.
4. **Đăng ký `[ModuleInitializer]` tự động**:
   - Sinh ra `GeneratedFormattersBootstrap.InitializeGeneratedFormatters()`, gọi:
     - `FormatterProvider.RegisterGenerated<T>(new T_Formatter())` (hoặc `FormatterProvider.RegisterComplex<T>(...)`)
     - `FormatterProvider.RegisterCollectionFormatters<TElement>()` cho mọi thành viên `TElement[]` hoặc `List<TElement>`
     - `FormatterProvider.RegisterDictionary<TKey, TValue>()` cho mọi thành viên `Dictionary<TKey, TValue>`
     - `FormatterProvider.RegisterTuple<T1, ...>()` cho mọi thành viên `ValueTuple<...>`

## Ví dụ

### 1. Định nghĩa gói tin nguồn

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

[Packet(0x1001)]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Sequential)]
public sealed partial class DynamicHintStringPacket : PacketBase<DynamicHintStringPacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x1001;

    [SerializeDynamicSize(64)]
    public string Message { get; set; } = string.Empty;
}
```

### 2. Mã formatter được sinh ra

```csharp
[StackTraceHidden]
[DebuggerStepThrough]
[SkipLocalsInit]
internal sealed class DynamicHintStringPacketFormatter :
    IFillableFormatter<DynamicHintStringPacket>,
    IFormatter<DynamicHintStringPacket>
{
    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public void Serialize(ref DataWriter writer, in DynamicHintStringPacket value)
    {
        ArgumentNullException.ThrowIfNull(value, "value");

        // PacketHeader 6 byte (Order 0) được ghi đầu tiên
        (ref writer).WriteUnmanaged(value.Header);

        IFormatter<string> formatter = FormatterProvider.Get<string>();
        string message = value.Message;
        formatter.Serialize(ref writer, in message);
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public DynamicHintStringPacket Deserialize(ref DataReader reader)
    {
        // Thuê một instance từ ObjectPoolManager qua PacketBase<TSelf>.Create()
        DynamicHintStringPacket instance = PacketBase<DynamicHintStringPacket>.Create();
        this.Fill(ref reader, instance);
        return instance;
    }

    [MethodImpl(MethodImplOptions.AggressiveInlining | MethodImplOptions.AggressiveOptimization)]
    public void Fill(ref DataReader reader, DynamicHintStringPacket value)
    {
        ArgumentNullException.ThrowIfNull(value, "value");

        value.Header = (ref reader).ReadUnmanaged<PacketHeader>();
        value.Message = FormatterProvider.Get<string>().Deserialize(ref reader);
    }
}
```

## Chẩn đoán được phát ra

| ID | Tiêu đề | Mức độ | Nguyên nhân |
| --- | --- | :---: | --- |
| `NALIX059` | Thiếu method `Create()` tĩnh | Lỗi | Một kiểu tham chiếu được đánh dấu `[GenerateFormatter]` không định nghĩa method factory `Create()` tĩnh. |

## API liên quan

- [Tổng quan Source Generator](./index.md)
- [Packet Schema Generator](./packet-schema-generator.md)
- [Serialization Basics](../../codec/serialization/serialization-basics.md)
- [Packet Serialization](../../codec/serialization/packet-serialization.md)
