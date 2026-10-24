---
title: Packet Pooling
description: Nalix.Codec.Pooling cung cấp các helper pooling riêng cho gói tin để tái sử dụng các instance gói tin.
section: API Reference
package: Nalix.Runtime
---

`Nalix.Codec.Pooling` cung cấp các helper pooling riêng cho gói tin để tái sử dụng các instance gói tin.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/Pooling/PacketFactory.cs`
- `src/Nalix.Codec/Pooling/PacketScope.cs`

## Kiểu chính

- `PacketFactory<TPacket>`
- `PacketScope<TPacket>`

## Thành phần công khai tổng quan

| Kiểu | Thành phần công khai |
|---|---|
| `PacketScope<TPacket>` | `Value`, `IsValid`, `Dispose()`, `implicit operator TPacket(PacketScope<TPacket>)` |
| `PacketFactory<TPacket>` | `Acquire()` |

## PacketScope<`TPacket`>

`PacketScope<TPacket>` là một readonly struct không cấp phát bộ nhớ, đảm bảo gói tin đã thuê được trả về pool khi dispose.

Khi dispose scope, gói tin sẽ được trả về pool gốc của nó.

Nhờ vậy, kiểu này phù hợp khi bạn cần một đối tượng gói tin có vòng đời ngắn mà không phải tự trả lại thủ công.

### Ghi chú thực tế

- scope chỉ bọc đúng một instance gói tin
- gói tin được trả lại khi scope bị dispose
- dùng `using` hoặc `using var` để việc trả về pool vẫn xảy ra ngay cả khi code phía sau ném exception

## PacketFactory<`TPacket`>

`PacketFactory<TPacket>` là API pool tĩnh dành cho một kiểu gói tin cụ thể.

Nó cung cấp:

- `Acquire()` — thuê một gói tin và bọc nó trong `PacketScope<TPacket>`

### Ghi chú thực tế

- `Acquire()` là lựa chọn an toàn nhất — scope trả về sẽ tự động trả gói tin khi dispose
- để warm-up khi khởi động hoặc reset pool, hãy dùng trực tiếp `ObjectPoolManager.Prealloc<T>()` và `ObjectPoolManager.ClearPool<T>()`

### Các lỗi thường gặp

- quên dispose scope
- dùng tham chiếu gói tin sau khi scope đã bị dispose
- giữ tham chiếu tới gói tin đã pool sau khi nó đã được trả về

## Cách dùng cơ bản

```csharp
using PacketScope<Control> scope = PacketFactory<Control>.Acquire();
Control packet = scope.Value;
packet.Type = ControlType.PING;
```

## Chọn cách nào

| Nhu cầu | Bắt đầu với |
| --- | --- |
| Tự động trả về pool | `PacketScope<TPacket>` qua `PacketFactory<T>.Acquire()` |
| Warm-up khi khởi động | `ObjectPoolManager.Prealloc<T>(count)` |
| Reset hoặc hủy pool | `ObjectPoolManager.ClearPool<T>()` |

## API liên quan

- [Frame Model](../../codec/packets/frame-model.md)
- [Built-in Frames](../../codec/packets/built-in-frames.md)
- [Packet Registry](../../codec/packets/packet-registry.md)
