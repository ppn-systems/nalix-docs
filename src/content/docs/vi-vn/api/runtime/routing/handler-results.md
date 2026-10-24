---
title: Kiểu trả về của Handler
description: Tham chiếu cho mọi chữ ký kiểu tham số và kiểu trả về của handler do PacketHandlerGenerator biên dịch và PacketDispatchOptions<TPacket> thực thi.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Routing`  
**Assembly:** `Nalix.Runtime`

Tại thời điểm biên dịch, [PacketHandlerGenerator](../../analyzers/autogen/packet-handler-generator.md) kiểm tra mọi method `[PacketOpcode]` nằm trong một controller `[PacketHandler]` và sinh ra một delegate invoker không dùng reflection (`Func<object?, PacketContext<TPacket>, ValueTask<object?>>`). Khi chạy, `PacketDispatchOptions<TPacket>` chuyển giá trị trả về qua `PacketSender`.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.Execution.cs`

## Kiểu trả về được hỗ trợ

| Kiểu trả về | `SkipOutbound` | Hành vi lúc chạy |
| :--- | :---: | :--- |
| `void` | `true` | Thực thi đồng bộ; không gửi phản hồi tự động. |
| `Task` / `ValueTask` | `true` | Chờ hoàn thành; không gửi phản hồi tự động. |
| `TResponse` (với `TResponse : IPacket`) | `false` | Gửi `response` qua `context.Sender.ReplyAsync` (khi `response.Header.SequenceId == 0`) hoặc `context.Sender.SendAsync` (khi `SequenceId != 0`), sau đó dispose `response` nếu nó là một instance `IDisposable` khác biệt. |
| `Task<TResponse>` / `ValueTask<TResponse>` | `false` | Chờ kết quả, rồi gửi và dispose `TResponse` như trên. |
| `byte[]` / `Memory<byte>` / `ReadOnlyMemory<byte>` (hoặc `Task<...>` / `ValueTask<...>`) | `false` | Gửi trực tiếp các byte thô qua `context.Connection.TCP` (nếu reliable hoặc UDP là `null`) hoặc `context.Connection.UDP`. |
| `IAsyncEnumerable<TResponse>` (với `TResponse : IPacket`) | `false` | Stream từng gói tin được yield qua `context.Sender.ReplyAsync(item, ct)`. Dùng look-ahead một phần tử để đặt `IPacketStreamable.IsEndOfStream = true` trên gói tin cuối trước khi gửi, và dispose mỗi gói tin `IDisposable` sau khi gửi. |

## Các dạng tham số handler được hỗ trợ

`PacketHandlerGenerator` áp dụng các quy tắc tham số nghiêm ngặt tại thời điểm biên dịch cho method `[PacketOpcode]`:

1. **Tham số đầu tiên (`index == 0`)**:
   - Phải là `IPacketContext<TPacket>` hoặc `PacketContext<TPacket>` (với `TPacket : IPacket`).
   - Chữ ký cũ `(TPacket packet, IConnection connection)` bị từ chối với chẩn đoán **`NALIX003`**.
2. **Tham số phạm vi bổ sung (`index >= 1`)**:
   - Mọi tham số phía sau phải là kiểu tham chiếu được đánh dấu `[FromScope]` (nếu không sẽ bị từ chối với **`NALIX067`**).
   - `[FromScope] TScoped` không nullable được phân giải qua `context.Scope.GetRequiredService<TScoped>()`.
   - `[FromScope] TScoped?` nullable được phân giải qua `context.Scope.GetService<TScoped>()`.
   - Các service có phạm vi được dispose tự động khi `PacketContext<TPacket>` được trả về pool.
3. **Dependency của controller và hủy**:
   - Các service singleton được inject qua tham số constructor hoặc các field/property `[Inject]` của controller (không qua tham số method handler).
   - Cancellation token của yêu cầu được truy cập qua `context.CancellationToken`.

## Ví dụ

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;

[PacketHandler]
public sealed class InventoryController
{
    // 1. Trả về gói tin đồng bộ (tự gán SequenceId của yêu cầu qua ReplyAsync)
    [PacketOpcode(0x2001)]
    public InventoryReply GetQuickSummary(IPacketContext<InventoryQuery> context)
    {
        InventoryReply reply = InventoryReply.Create();
        reply.TotalItems = 42;
        return reply;
    }

    // 2. ValueTask bất đồng bộ với service có phạm vi [FromScope] cho từng gói tin
    [PacketOpcode(0x2002)]
    public async ValueTask HandleUpdateAsync(
        IPacketContext<InventoryUpdate> context,
        [FromScope] AuditUnitOfWork unitOfWork)
    {
        await unitOfWork.RecordAsync(context.Packet, context.CancellationToken);
    }

    // 3. Streaming từ server tới client (IAsyncEnumerable<TResponse> với TResponse : IPacketStreamable)
    [PacketOpcode(0x2003)]
    public async IAsyncEnumerable<InventoryChunkPacket> StreamInventoryAsync(
        IPacketContext<InventoryStreamRequest> context)
    {
        for (int page = 0; page < 3; page++)
        {
            context.CancellationToken.ThrowIfCancellationRequested();
            await Task.Yield();
            InventoryChunkPacket chunk = InventoryChunkPacket.Create();
            chunk.PageIndex = page;
            // Runtime tự đặt chunk.IsEndOfStream = true trên phần tử cuối cùng
            // và dispose chunk sau khi ReplyAsync hoàn tất.
            yield return chunk;
        }
    }
}
```

## API liên quan

- [Packet Handler Generator](../../analyzers/autogen/packet-handler-generator.md)
- [Packet Context (PacketContext<TPacket>)](./packet-context.md)
- [Packet Sender (PacketSender)](./packet-sender.md)
- [Session Extensions](../../sdk/tcp-session-extensions.md)
