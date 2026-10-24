---
title: Tùy chỉnh tuần tự hóa
description: Hướng dẫn này chỉ cách đăng ký một serialization provider tùy chỉnh bằng Nalix.Codec.Serialization, IFormatter<T> và LiteSerializer.Register(...).
section: Guides
---

Hướng dẫn này chỉ cách đăng ký một serialization provider tùy chỉnh bằng `Nalix.Codec.Serialization`, `IFormatter<T>` và `LiteSerializer.Register(...)`.

## Khi nào nên dùng formatter tùy chỉnh

Hãy dùng formatter tùy chỉnh khi:

- bạn cần tương thích wire nghiêm ngặt với một protocol đã có
- bạn muốn thứ tự trường hoặc cách mã hóa gọn theo ý mình
- việc sinh formatter tự động không khớp với ngữ nghĩa của model
- model của bạn là bất biến và cần logic tái tạo tường minh

## Bước 1. Triển khai `IFormatter<T>`

```csharp
using Nalix.Environment.Memory;
using Nalix.Codec.Serialization;

public sealed class UserProfileFormatter : IFormatter<UserProfile>
{
    public void Serialize(ref DataWriter writer, in UserProfile value)
    {
        writer.WriteInt32(value.Id);
        writer.WriteString(value.Name);
        writer.WriteUInt16(value.Level);
    }

    public UserProfile Deserialize(ref DataReader reader)
    {
        return new UserProfile(
            id: reader.ReadInt32(),
            name: reader.ReadString(),
            level: reader.ReadUInt16());
    }
}
```

## Bước 2. Đăng ký khi khởi động

Đăng ký một lần trong quá trình khởi động ứng dụng, trước khi việc tuần tự hóa trên hot path bắt đầu.

```csharp
using Nalix.Codec.Serialization;

LiteSerializer.Register(new UserProfileFormatter());
```

Sau khi đăng ký, các lời gọi tuần tự hóa của Nalix cho `UserProfile` sẽ đi qua formatter của bạn:

```csharp
byte[] payload = LiteSerializer.Serialize(profile);
UserProfile restored = LiteSerializer.Deserialize<UserProfile>(payload, out int bytesRead);
```

## Ghi chú khi tích hợp

- Việc đăng ký có phạm vi toàn cục cho process hiện tại (dựa trên `FormatterProvider`).
- Hãy đăng ký sớm để tránh hành vi lẫn lộn trong các service chạy lâu dài.
- Giữ `Serialize`/`Deserialize` đối xứng và mang tính xác định.
- Ưu tiên logic ít cấp phát bộ nhớ bên trong các method của formatter.

## Danh mục kiểm tra

- kiểm thử round-trip: `model -> bytes -> model`
- xử lý đầu vào bị lỗi cấu trúc trong `Deserialize`
- chiến lược phiên bản nếu các trường thay đổi theo thời gian
- tương thích giữa các service nếu nhiều ứng dụng dùng chung một wire format

## Các trang liên quan

- [Cơ bản về tuần tự hóa](../../api/codec/serialization/serialization-basics.md)
- [Khái niệm tuần tự hóa](../../concepts/how-packets-work.md)
- [Vòng đời gói tin](../../concepts/internals/packet-lifecycle.md)
