---
title: Cơ bản về tuần tự hóa
description: Điểm vào tuần tự hóa nhị phân không dùng reflection (LiteSerializer), registry formatter (FormatterProvider) và SerializationOptions trong Nalix.Codec.Serialization.
section: API Reference
package: Nalix.Codec
---

**Không gian tên:** `Nalix.Codec.Serialization`, `Nalix.Codec.Options`  
**Assembly:** `Nalix.Codec`

`Nalix.Codec.Serialization` cung cấp bộ tuần tự hóa nhị phân không dùng reflection (`LiteSerializer`), registry formatter an toàn với AOT (`FormatterProvider`), và các hợp đồng `IFormatter<T>` / `IFillableFormatter<T>` được dùng xuyên suốt mọi gói tin và mô hình của Nalix.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Serialization/IFormatter.cs`
- `src/Nalix.Codec/Serialization/IFillableFormatter.cs`
- `src/Nalix.Codec/Serialization/FormatterProvider.cs`
- `src/Nalix.Codec/Serialization/LiteSerializer.cs`
- `src/Nalix.Codec/Options/SerializationOptions.cs`
- `src/Nalix.Codec/Serialization/Formatters/Collections/*.cs`
- `src/Nalix.Codec/Serialization/Formatters/Primitives/*.cs`
- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`

## Kiểu chính

- `LiteSerializer`
- `FormatterProvider`
- `IFormatter<T>` & `IFillableFormatter<T>`
- `SerializationOptions`

## `LiteSerializer`

`LiteSerializer` là điểm vào tuần tự hóa tĩnh chính. Các kiểu không quản lý (`int`, `float`, `PacketHeader`, `Bytes32`, v.v.) đi qua đường bộ nhớ không căn chỉnh nhanh (`Unsafe.WriteUnaligned` / `Unsafe.ReadUnaligned`), còn kiểu phức tạp và collection được chuyển qua `FormatterProvider` thông qua cache generic tĩnh (`RootFormatterCache<T>`).

### Các overload công khai

| Thao tác | Chữ ký | Ghi chú |
|---|---|---|
| **Tuần tự hóa thành `byte[]`** | `byte[] Serialize<T>(in T value)` | Cấp phát một `byte[]` đúng kích thước cho kiểu không quản lý và kiểu `IFixedSizeSerializable`, hoặc dùng `DataWriter(2048)` lấy từ pool cho kiểu độ dài thay đổi. |
| **Tuần tự hóa vào buffer do bên gọi cung cấp** | `int Serialize<T>(in T value, byte[] buffer)`<br/>`int Serialize<T>(in T value, Span<byte> buffer)` | Ghi trực tiếp vào `buffer` và trả về số byte đã ghi. `DataWriter` dùng span không bao giờ cấp phát; ném ngoại lệ nếu `buffer` quá nhỏ. |
| **Giải tuần tự hóa vào `ref T`** | `int Deserialize<T>(byte[] buffer, ref T value)`<br/>`int Deserialize<T>(ReadOnlyMemory<byte> buffer, ref T value)`<br/>`int Deserialize<T>(ReadOnlySpan<byte> buffer, ref T value)` | Trả về số byte đã đọc. Khi `value` khác null và formatter triển khai `IFillableFormatter<T>`, điền `value` tại chỗ qua `Fill`. |
| **Giải tuần tự hóa tạo instance mới** | `T Deserialize<T>(byte[] buffer, out int bytesRead)`<br/>`T Deserialize<T>(ReadOnlyMemory<byte> buffer, out int bytesRead)`<br/>`T Deserialize<T>(ReadOnlySpan<byte> buffer, out int bytesRead)` | Giải tuần tự hóa và trả về `T` (với `PacketBase<TSelf>`, lấy một instance từ object pool qua `Create()`) và xuất `bytesRead`. |
| **`Fill` tại chỗ** | `int Fill<T>(byte[] buffer, ref T value)`<br/>`int Fill<T>(ReadOnlyMemory<byte> buffer, ref T value)`<br/>`int Fill<T>(ReadOnlySpan<byte> buffer, ref T value)` | Bắt buộc có `IFillableFormatter<T>` và `value` khác null, khôi phục `value` tại chỗ mà không cấp phát. |
| **Đăng ký formatter tùy chỉnh** | `void Register<T>(IFormatter<T> formatter)` | Ủy quyền cho `FormatterProvider.Register<T>(formatter)`. |

### Ví dụ

```csharp
using System;
using Nalix.Codec.Serialization;

byte[] bytes = LiteSerializer.Serialize(model);
MyModel clone = LiteSerializer.Deserialize<MyModel>(bytes, out int bytesRead);

Span<byte> scratch = stackalloc byte[256];
int written = LiteSerializer.Serialize(model, scratch);
```

## `FormatterProvider`

`FormatterProvider` là registry formatter toàn cục an toàn với AOT. Constructor tĩnh của nó đăng ký sẵn formatter cho mọi kiểu không quản lý tích hợp (`char`, `byte`, `sbyte`, `short`, `int`, `long`, `ushort`, `uint`, `ulong`, `float`, `double`, `bool`, `decimal`, `Guid`, `DateOnly`, `DateTime`, `TimeSpan`, `TimeOnly`, `DateTimeOffset`), chuỗi, giá trị nullable, mảng, list, queue, stack, hash set, `Memory<T>`, `ReadOnlyMemory<T>`, và các tổ hợp `Dictionary<K, V>` và `ValueTuple` thường gặp.

### Phương thức công khai của `FormatterProvider`

| Phương thức | Chữ ký | Mục đích |
| --- | --- | --- |
| `Get<T>` | `public static IFormatter<T> Get<T>()` | Phân giải formatter đã cache, được sinh bởi source generator, enum hoặc formatter phức tạp cho `T` (ném `SerializationFailureException` nếu chưa đăng ký). |
| `GetComplex<T>` | `public static IFormatter<T> GetComplex<T>()` | Phân giải formatter struct hoặc lớp phức tạp đã đăng ký từ `ComplexTypeCache<T>`. |
| `Register<T>` | `public static void Register<T>(IFormatter<T> formatter)` | Đăng ký một `IFormatter<T>` tùy chỉnh vào `FormatterCache<T>.Instance`. |
| `RegisterComplex<T>` | `public static void RegisterComplex<T>(IFormatter<T> formatter)` | Đăng ký formatter struct hoặc lớp phức tạp qua `Interlocked.CompareExchange` (ai ghi trước thì thắng). |
| `RegisterGenerated<T>` | `public static void RegisterGenerated<T>(IFormatter<T> formatter)` | Được gọi bởi mã `[ModuleInitializer]` do `SerializeFormatterGenerator` sinh ra. |
| `RegisterAllFormatters<T>` | `public static void RegisterAllFormatters<T>() where T : unmanaged` | Đăng ký trước `UnmanagedFormatter<T>`, `ArrayFormatter<T>`, `NullableFormatter<T>`, `NullableArrayFormatter<T>`, `ListFormatter<T>`, `QueueFormatter<T>`, `StackFormatter<T>`, `HashSetFormatter<T>`, `MemoryFormatter<T>`, `ReadOnlyMemoryFormatter<T>`, và `DictionaryFormatter<string/int/long, T>()` cho một struct hoặc enum không quản lý tùy chỉnh. |
| `RegisterCollectionFormatters<T>` | `public static void RegisterCollectionFormatters<T>() where T : class` | Đăng ký trước `ReferenceListFormatter<T>` (`List<T>`) và `ReferenceArrayFormatter<T>` (`T[]`) cho một kiểu tham chiếu. |
| `RegisterDictionary<TKey, TValue>` | `public static void RegisterDictionary<TKey, TValue>() where TKey : notnull` | Đăng ký trước `DictionaryFormatter<TKey, TValue>()`. |
| `RegisterTuple<...>` | `public static void RegisterTuple<T1, T2>()` (số đối 2..5) | Đăng ký trước `ValueTupleFormatter<...>` cho số đối từ 2 đến 5. |

## Hợp đồng formatter (`IFormatter<T>` & `IFillableFormatter<T>`)

```csharp
using Nalix.Environment.Memory;

namespace Nalix.Codec.Serialization;

public interface IFormatter<T>
{
    void Serialize(ref DataWriter writer, in T value);
    T Deserialize(ref DataReader reader);
}

public interface IFillableFormatter<T> : IFormatter<T>
{
    void Fill(ref DataReader reader, T value);
}
```

## `SerializationOptions` (`Nalix.Codec.Options`)

Được nạp từ mục `[Serialization]` của `server.ini` qua `ConfigurationManager.Instance.Get<SerializationOptions>()`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra | Mô tả |
| --- | --- | ---: | --- | --- |
| `MaxArrayLength` | `int` | `1_048_576` (1M) | `[ValueRange(1, int.MaxValue)]` | Số phần tử tối đa được phép cho mảng và collection khi giải tuần tự hóa. |
| `MaxStringLength` | `int` | `1_048_576` (1M) | `[ValueRange(1, int.MaxValue)]` | Độ dài tối đa tính theo byte UTF-8 cho chuỗi khi giải tuần tự hóa. |
| `MaxDeserializationDepth` | `int` | `256` | `[ValueRange(1, int.MaxValue)]` | Độ sâu lồng nhau tối đa của đối tượng/collection khi giải tuần tự hóa. |

## Quy tắc mã hóa & ràng buộc bảo vệ

| Dạng | Mã hóa trên đường truyền | Ràng buộc bảo vệ |
|---|---|---|
| **Giá trị không quản lý** | Byte little-endian / không căn chỉnh thô (`sizeof(T)`). | Bộ đọc yêu cầu còn ít nhất `sizeof(T)` byte. |
| **Mảng / Collection** | Số phần tử `int` 4 byte (`SerializerBounds.Null = -1` cho `null`, `0` cho rỗng) theo sau là các phần tử. | Số phần tử không được vượt quá `SerializationOptions.MaxArrayLength`. |
| **`string`** | Độ dài byte UTF-8 `int` 4 byte (`SerializerBounds.Null = -1` cho `null`, `0` cho `""`) theo sau là các byte UTF-8. | Độ dài byte không được vượt quá `SerializationOptions.MaxStringLength`. |
| **`enum`** | Mã hóa thành kiểu số nguyên nền (`byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong`) qua `EnumFormatter<T>`. | Không boxing nhờ `Unsafe.As`. |

## API liên quan

- [Tuần tự hóa gói tin](./packet-serialization.md)
- [Trình sinh tuần tự hóa](../../analyzers/autogen/serialization-generator.md)
- [Thuộc tính tuần tự hóa](../../abstractions/serialization-attributes.md)
- [Packet hoạt động như thế nào](../../../concepts/how-packets-work.md)
- [Hướng dẫn Custom Serialization Providers](../../../guides/extensibility/serialization-providers.md)
