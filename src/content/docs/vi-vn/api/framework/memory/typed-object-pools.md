---
title: Pool đối tượng theo kiểu
description: Tham chiếu cho Nalix.Framework.Memory.Objects.TypedObjectPool<T> — adapter pool đối tượng dành riêng cho từng kiểu, dùng để thuê và thao tác theo lô trên hot path.
section: API Reference
package: Nalix.Framework
---

**Không gian tên:** `Nalix.Framework.Memory.Objects`  
**Assembly:** `Nalix.Framework`

`TypedObjectPool<T>` (`public sealed class TypedObjectPool<T> where T : IPoolable, new()`) là adapter dành riêng cho một kiểu, được tạo qua `ObjectPoolManager.GetTypedPool<T>()`. Lưu tham chiếu `TypedObjectPool<T>` trong một trường `readonly` cho bạn một API có kiểu rõ ràng để thuê và trả đơn lẻ hoặc theo lô, đồng thời vẫn giữ nguyên mọi chỉ số của `ObjectPoolManager` và công cụ chẩn đoán rò rỉ.

## Ánh xạ mã nguồn

- `src/Nalix.Framework/Memory/Objects/TypedObjectPool.cs`
- `src/Nalix.Framework/Memory/Objects/ObjectPoolManager.cs`

## Các phương thức công khai

| Phương thức | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `Get()` | `public T Get()` | Thuê hoặc tạo một instance của `T` từ `ObjectPoolManager` bên dưới (hoặc `ObjectPool` độc lập). |
| `Return(T)` | `public void Return(T obj)` | Đặt lại `obj` (`ResetForPool()`) và trả nó về pool. |
| `GetMultiple(int)` | `public List<T> GetMultiple(int count)` | Thuê `count` instance vào một `List<T>` (tự động trả lại các mục đã thuê nếu có ngoại lệ giữa chừng). |
| `ReturnMultiple` | `public int ReturnMultiple(IEnumerable<T> objects)` | Trả mọi mục trong `objects` về pool và trả về số instance đã trả. |
| `Prealloc(int)` | `public int Prealloc(int count)` | Cấp phát trước `count` instance trong pool và trả về số instance đã tạo. |
| `Clear()` | `public int Clear()` | Xóa mọi instance `T` đang có trong pool và trả về số đối tượng đã xóa. |
| `GetInfo()` | `public Dictionary<string, object> GetInfo()` | Trả về từ điển chỉ số chẩn đoán của pool `T` (`ObjectPoolManager.GetTypeInfo<T>()`). |
| `SetMaxCapacity(int)` | `public void SetMaxCapacity(int maxCapacity)` | Cập nhật dung lượng giữ lại tối đa cho pool `T`. |
| `Trim(int)` | `public int Trim(int percentage = 50)` | Cắt tỉa pool để giữ lại `percentage` (`1..99`) của `MaxCapacity` (`0` không cắt gì, như một mức an toàn; `>= 100` giữ 100%) và trả về số đối tượng đã loại bỏ. |

## Mẫu sử dụng

```csharp
using Nalix.Abstractions;
using Nalix.Framework.Memory.Objects;

public sealed class MyPacket : IPoolable
{
    public int Sequence { get; set; }
    public void ResetForPool() => this.Sequence = 0;
}

public sealed class PacketBatchProcessor
{
    private readonly TypedObjectPool<MyPacket> _packetPool =
        ObjectPoolManager.Shared.GetTypedPool<MyPacket>();

    public void ProcessSingle()
    {
        MyPacket packet = _packetPool.Get();
        try
        {
            packet.Sequence = 1;
        }
        finally
        {
            _packetPool.Return(packet);
        }
    }
}
```

## API liên quan

- [Pool đối tượng (ObjectPoolManager)](./object-pooling.md)
- [Bản đồ đối tượng (ObjectMap<TKey, TValue>)](./object-map.md)
- [Quản lý bộ đệm](../../environment/memory/buffer-management.md)
