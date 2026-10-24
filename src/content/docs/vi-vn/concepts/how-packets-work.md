---
title: Gói tin hoạt động như thế nào
description: Gói tin là một lớp C# thuần với các thuộc tính cho Nalix biết cách đưa nó lên đường truyền và đọc lại từ đường truyền. Bạn viết lớp này một lần, trong một dự án dùng chung cho máy chủ và client,...
section: Concepts
---

Gói tin là một lớp C# thuần với các thuộc tính cho Nalix biết cách đưa nó lên đường truyền và đọc lại từ đường truyền. Bạn viết lớp này một lần, trong một dự án dùng chung cho máy chủ và client, và cả hai phía đều dùng cùng một định nghĩa.

## Các thuộc tính

```csharp
// samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class HelloRequestPacket
    : PacketBase<HelloRequestPacket>,
      IFixedSizeSerializable,
      IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7001;

    [SerializeOrder(0)]
    public byte Greeting { get; set; }

    public HelloRequestPacket() => this.Greeting = 1;
}
```

- `[GenerateFormatter]` sinh ra bộ đọc/ghi nhị phân cho lớp này lúc biên dịch và đăng ký gói tin vào `PacketRegistry` thông qua `[ModuleInitializer]` — bạn không bao giờ phải viết tay mã tuần tự hóa. (Lưu ý: `[Packet]` đã lỗi thời (`NAL001`) và không còn bắt buộc.)
- `StaticOpCode` (`IPacketStaticOpcode`) là số 16-bit xác định loại gói tin này trên đường truyền. Hãy chọn một giá trị bất kỳ không trùng với gói tin khác trong dự án của bạn.
- `[SerializeOrder(n)]` cố định vị trí của mỗi trường trong luồng byte, bắt đầu từ 0. Sau khi một gói tin đã được phát hành, đừng sắp xếp lại hay xóa các giá trị `SerializeOrder` hiện có — hãy thêm trường mới với số lớn hơn.

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs`

## Trường có độ dài thay đổi

Các trường có kích thước cố định như `byte` và `int` đủ cho những gói tin đơn giản, nhưng tin nhắn chat, tên người dùng và các dữ liệu tự do khác cần chuỗi có độ dài thay đổi:

```csharp
// samples/ChatRoom/ChatRoom.Contracts/ChatMessagePacket.cs
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class ChatMessagePacket : PacketBase<ChatMessagePacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7101;

    [SerializeOrder(0)]
    public string Username { get; set; } = string.Empty;

    [SerializeOrder(1)]
    public string Message { get; set; } = string.Empty;

    public ChatMessagePacket() { }
}
```

Mã nguồn đầy đủ: `samples/ChatRoom/ChatRoom.Contracts/ChatMessagePacket.cs`

## Đăng ký diễn ra tự động

Bạn không cần gọi bất cứ thứ gì để đăng ký một loại gói tin. Khi assembly chứa nó được nạp (thông qua module initializer được sinh ra cùng với `[GenerateFormatter]`), gói tin sẽ tự động được đăng ký. Nếu runtime không tìm thấy handler, nguyên nhân phổ biến nhất là assembly chứa gói tin chưa bao giờ được nạp hoặc chưa được tham chiếu — xem [Các vấn đề thường gặp](../guides/getting-started/your-first-server.md#các-vấn-đề-thường-gặp).

## Bước tiếp theo

- [Máy chủ đầu tiên của bạn](../guides/getting-started/your-first-server.md) — xem một gói tin được dùng từ đầu đến cuối
- [Triển khai Packet Handler](../guides/application/packet-handlers.md) — phản hồi một gói tin khi nó đến
- Nếu bạn muốn xem đầy đủ định dạng đường truyền, quy tắc mã hóa và chi tiết phiên bản: [Đặc tả nhị phân](./internals/binary-spec.md) (Internals)
