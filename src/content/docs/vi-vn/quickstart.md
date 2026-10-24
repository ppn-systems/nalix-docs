---
title: Bắt đầu nhanh
description: "Hướng dẫn này giúp bạn chạy mẫu HelloWorld: một máy chủ phản hồi một yêu cầu. Bạn sẽ xây dựng một hợp đồng gói tin dùng chung, một máy chủ và một client, rồi chạy chúng và xem phản hồi."
section: Start Here
---

Hướng dẫn này giúp bạn chạy mẫu HelloWorld: một máy chủ phản hồi một yêu cầu. Bạn sẽ xây dựng một hợp đồng gói tin dùng chung, một máy chủ và một client, rồi chạy chúng và xem phản hồi.

Mã nguồn đầy đủ: `samples/HelloWorld`

## Bạn cần gì

- .NET 10 SDK

## Cách nhanh nhất — chạy trong 30 giây

Clone repo và chạy mẫu có sẵn trong hai terminal:

```bash
git clone https://github.com/ppn-systems/nalix.git
cd nalix

# Terminal 1 — start the server
dotnet run --project samples/HelloWorld/HelloWorld.Server

# Terminal 2 — run the client
dotnet run --project samples/HelloWorld/HelloWorld.Client
```

Đó là toàn bộ mẫu HelloWorld — máy chủ và client, yêu cầu và phản hồi. Phần còn lại của trang này giải thích bên trong mẫu để bạn có thể tự xây dựng ứng dụng của mình.

## 1. Tạo các project

> Bỏ qua bước này nếu bạn đã clone repo — bạn đã có `samples/HelloWorld`. Phần này chỉ dành cho trường hợp bắt đầu từ đầu.

Tạo một solution với ba project và cài các package Nalix từ NuGet:

```bash
mkdir HelloWorld && cd HelloWorld
dotnet new sln

# Shared packet contracts
dotnet new classlib -n HelloWorld.Contracts
dotnet add HelloWorld.Contracts package Nalix.Abstractions
dotnet add HelloWorld.Contracts package Nalix.Codec

# Server
dotnet new console -n HelloWorld.Server
dotnet add HelloWorld.Server reference HelloWorld.Contracts
dotnet add HelloWorld.Server package Nalix.Hosting

# Client
dotnet new console -n HelloWorld.Client
dotnet add HelloWorld.Client reference HelloWorld.Contracts
dotnet add HelloWorld.Client package Nalix.SDK

dotnet sln add HelloWorld.Contracts HelloWorld.Server HelloWorld.Client
```

## 2. Định nghĩa các gói tin

Tạo một project contract dùng chung chứa các kiểu gói tin yêu cầu và phản hồi. Cả hai đều dùng `[Packet]` để đăng ký và `[GenerateFormatter]` để sinh bộ tuần tự hóa nhị phân tại thời điểm biên dịch.

```csharp
// samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

namespace HelloWorld.Contracts;

[Packet]
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

```csharp
// samples/HelloWorld/HelloWorld.Contracts/HelloResponsePacket.cs
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Serialization;
using Nalix.Codec.DataFrames;

namespace HelloWorld.Contracts;

[Packet]
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class HelloResponsePacket
    : PacketBase<HelloResponsePacket>,
      IFixedSizeSerializable,
      IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7002;

    [SerializeOrder(0)]
    public byte Message { get; set; }

    public HelloResponsePacket() => this.Message = 0;
}
```

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Contracts/HelloRequestPacket.cs`, `samples/HelloWorld/HelloWorld.Contracts/HelloResponsePacket.cs`

## 3. Viết máy chủ

Handler là một static class được đánh dấu `[PacketHandler]`. Mỗi method cần phản hồi một gói tin sẽ được đánh dấu `[PacketOpcode(...)]` với opcode mà nó xử lý.

```csharp
// samples/HelloWorld/HelloWorld.Server/HelloHandlers.cs
using HelloWorld.Contracts;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;

namespace HelloWorld.Server;

[PacketHandler("HelloWorld.Greetings")]
public static class HelloHandlers
{
    [PacketOpcode(0x7001)]
    public static async ValueTask HandleHelloAsync(IPacketContext<HelloRequestPacket> context)
    {
        ArgumentNullException.ThrowIfNull(context);

        using PacketScope<HelloResponsePacket> lease = PacketFactory<HelloResponsePacket>.Acquire();
        HelloResponsePacket response = lease.Value;
        response.Message = 1; // "Hello from Nalix!"

        await context.Sender.ReplyAsync(response).ConfigureAwait(false);
    }
}
```

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Server/HelloHandlers.cs`

Sau đó khởi động máy chủ bằng hosting builder:

```csharp
// samples/HelloWorld/HelloWorld.Server/Program.cs
using Nalix.Hosting;
using Nalix.Hosting.Protocols;

await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseLogger(logger)
    .MapHandlers(typeof(HelloHandlers))
    .MapTcp<DefaultProtocol>().OnPort(57206).Bind()
    .Build();

await app.RunAsync(cts.Token);
```

> `logger` là một `ILogger` (ví dụ từ `LoggerFactory.Create(...)`) và `cts` là một `CancellationTokenSource` — xem mã nguồn đầy đủ để biết cách thiết lập.

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Server/Program.cs`

## 4. Viết client

Client kết nối, gửi một yêu cầu rồi chờ phản hồi có kiểu dữ liệu xác định.

```csharp
// samples/HelloWorld/HelloWorld.Client/Program.cs
using HelloWorld.Contracts;
using Nalix.SDK.Options;
using Nalix.SDK.Transport;
using Nalix.SDK.Transport.Extensions;

TransportOptions options = new() { Address = "127.0.0.1", Port = 57206 };

using TcpSession session = new(options);
await session.ConnectAsync();

HelloRequestPacket request = new();
HelloResponsePacket response = await session.RequestAsync<HelloResponsePacket>(
    request,
    RequestOptions.Default.WithTimeout(5_000));

string message = response.Message switch
{
    1 => "Hello from Nalix!",
    _ => $"Unknown (Message={response.Message})",
};

Console.WriteLine($"Server replied: {message}");

await session.DisconnectAsync();
```

Mã nguồn đầy đủ: `samples/HelloWorld/HelloWorld.Client/Program.cs`

## Chạy thử

```bash
dotnet build
```

Mở hai terminal.

Terminal 1 — khởi động máy chủ:

```bash
dotnet run --project HelloWorld.Server
```

Terminal 2 — chạy client:

```bash
dotnet run --project HelloWorld.Client
```

(Nếu bạn chạy mẫu từ repository Nalix, hãy dùng `dotnet run --project samples/HelloWorld/HelloWorld.Server` và `.../HelloWorld.Client` thay thế.)

## Bạn sẽ thấy gì

Máy chủ:

```text
HelloWorld server is running on 127.0.0.1:57206.
Press Ctrl+C to stop.
```

Client:

```text
Connected to 127.0.0.1:57206.
Server replied: Hello from Nalix!
```

Nhấn Ctrl+C trong terminal của máy chủ để dừng nó.

:::note[Cổng đã được sử dụng]
Có thể một tiến trình khác đang lắng nghe trên cổng 57206. Hãy dừng tiến trình đó, hoặc đổi cổng trong `Program.cs` của máy chủ và trong `TransportOptions` của client.
:::

## Bước tiếp theo

- [Máy chủ đầu tiên của bạn](./guides/getting-started/your-first-server.md) — xem kỹ hơn những gì đang diễn ra trong mẫu này
- [Xây dựng phòng chat](./guides/build-a-chat-room.md) — thêm tính năng đẩy tin nhắn từ máy chủ đến client
- [Gói tin hoạt động như thế nào](./concepts/how-packets-work.md) — giải thích các attribute của gói tin
