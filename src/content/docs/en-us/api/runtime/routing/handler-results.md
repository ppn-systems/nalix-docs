---
title: Handler Return Types
description: Reference for all handler parameter and return type signatures compiled by PacketHandlerGenerator and executed by PacketDispatchOptions<TPacket>.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Routing`  
**Assembly:** `Nalix.Runtime`

At compile time, [PacketHandlerGenerator](../../analyzers/autogen/packet-handler-generator.md) inspects every `[PacketOpcode]` method inside a `[PacketHandler]` controller and emits a reflection-free invoker delegate (`Func<object?, PacketContext<TPacket>, ValueTask<object?>>`). At runtime, `PacketDispatchOptions<TPacket>` dispatches the returned value through `PacketSender`.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.Execution.cs`

## Supported Return Types

| Return Type | `SkipOutbound` | Runtime Behavior |
| :--- | :---: | :--- |
| `void` | `true` | Executes synchronously; sends no automatic response. |
| `Task` / `ValueTask` | `true` | Awaits completion; sends no automatic response. |
| `TResponse` (where `TResponse : IPacket`) | `false` | Sends `response` via `context.Sender.ReplyAsync` (when `response.Header.SequenceId == 0`) or `context.Sender.SendAsync` (when `SequenceId != 0`), then disposes `response` if it is a distinct `IDisposable` instance. |
| `Task<TResponse>` / `ValueTask<TResponse>` | `false` | Awaits the result, then sends and disposes `TResponse` as above. |
| `byte[]` / `Memory<byte>` / `ReadOnlyMemory<byte>` (or `Task<...>` / `ValueTask<...>`) | `false` | Sends the raw bytes directly on `context.Connection.TCP` (if reliable or UDP is `null`) or `context.Connection.UDP`. |
| `IAsyncEnumerable<TResponse>` (where `TResponse : IPacket`) | `false` | Streams each yielded packet via `context.Sender.ReplyAsync(item, ct)`. Uses a one-item look-ahead to set `IPacketStreamable.IsEndOfStream = true` on the final yielded packet before sending, and disposes each yielded `IDisposable` packet after sending. |

## Supported Handler Parameter Shapes

`PacketHandlerGenerator` enforces strict compile-time parameter rules for `[PacketOpcode]` handler methods:

1. **First Parameter (`index == 0`)**:
   - Must be `IPacketContext<TPacket>` or `PacketContext<TPacket>` (where `TPacket : IPacket`).
   - Legacy `(TPacket packet, IConnection connection)` signatures are rejected with diagnostic **`NALIX003`**.
2. **Additional Scoped Parameters (`index >= 1`)**:
   - Every trailing parameter must be a **reference type** decorated with `[FromScope]` (otherwise rejected with **`NALIX067`**).
   - Non-nullable `[FromScope] TScoped` resolves via `context.Scope.GetRequiredService<TScoped>()`.
   - Nullable `[FromScope] TScoped?` resolves via `context.Scope.GetService<TScoped>()`.
   - Scoped services are disposed automatically when `PacketContext<TPacket>` returns to the pool.
3. **Controller Dependencies & Cancellation**:
   - Singleton services are injected via constructor parameters or `[Inject]` controller fields/properties (not handler method parameters).
   - The request's cancellation token is accessed via `context.CancellationToken`.

## Examples

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;

[PacketHandler]
public sealed class InventoryController
{
    // 1. Synchronous packet return (auto-stamped with request SequenceId via ReplyAsync)
    [PacketOpcode(0x2001)]
    public InventoryReply GetQuickSummary(IPacketContext<InventoryQuery> context)
    {
        InventoryReply reply = InventoryReply.Create();
        reply.TotalItems = 42;
        return reply;
    }

    // 2. Async ValueTask with [FromScope] per-packet scoped service
    [PacketOpcode(0x2002)]
    public async ValueTask HandleUpdateAsync(
        IPacketContext<InventoryUpdate> context,
        [FromScope] AuditUnitOfWork unitOfWork)
    {
        await unitOfWork.RecordAsync(context.Packet, context.CancellationToken);
    }

    // 3. Server-to-client streaming (IAsyncEnumerable<TResponse> where TResponse : IPacketStreamable)
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
            // The runtime automatically sets chunk.IsEndOfStream = true on the last yielded item
            // and disposes chunk after ReplyAsync completes.
            yield return chunk;
        }
    }
}
```

## Related APIs

- [Packet Handler Generator](../../analyzers/autogen/packet-handler-generator.md)
- [Packet Context (PacketContext<TPacket>)](./packet-context.md)
- [Packet Sender (PacketSender)](./packet-sender.md)
- [Session Extensions](../../sdk/tcp-session-extensions.md)
