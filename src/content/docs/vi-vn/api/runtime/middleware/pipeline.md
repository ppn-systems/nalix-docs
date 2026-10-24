---
title: Middleware Pipeline
description: Tham chiếu cho MiddlewarePipeline<TPacket>, PipelineMetrics và PerMiddlewareMetrics trong Nalix.Runtime.Middleware.
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Middleware`  
**Assembly:** `Nalix.Runtime`

`MiddlewarePipeline<TPacket>` (`internal sealed class MiddlewarePipeline<TPacket> where TPacket : IPacket`) điều phối việc thực thi `IPacketMiddleware<TPacket>` theo chiều inbound và outbound quanh các terminal handler của gói tin. Nó dùng các mảng `PipelineSnapshot` bất biến, một pool runner cục bộ `PooledPipelineContext` 32 slot theo bitmask, và gọi terminal có kiểu trực tiếp, nên không cấp phát closure cho mỗi gói tin.

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.cs`
- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.Types.cs`
- `src/Nalix.Abstractions/Middleware/IPacketMiddleware.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareOrderAttribute.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareStageAttribute.cs`

## Contract middleware (`IPacketMiddleware<TPacket>`)

```csharp
namespace Nalix.Abstractions.Middleware;

public interface IPacketMiddleware<TPacket> where TPacket : IPacket
{
    ValueTask InvokeAsync(
        IPacketContext<TPacket> context,
        Func<CancellationToken, ValueTask> next);
}
```

- Gọi `await next(token)` để chuyển sang middleware tiếp theo hoặc sang terminal handler.
- Trả về mà không gọi `next` sẽ short-circuit pipeline (handler và các giai đoạn outbound không chạy).

## Đăng ký và thứ tự (`Use`)

Được cấu hình qua `PacketDispatchOptions<TPacket>.WithMiddleware(middleware)`:

1. Ném `ArgumentNullException` nếu `middleware` là `null`.
2. Ném `InternalErrorException` nếu cùng một instance middleware được đăng ký hai lần.
3. Đọc `[MiddlewareOrder(int)]` (mặc định `0`) và `[MiddlewareStage(MiddlewareStage, AlwaysExecute = bool)]` (mặc định `MiddlewareStage.Inbound`, `AlwaysExecute = false`), cache metadata theo `Type`.
4. Sắp xếp các danh sách theo giai đoạn và xuất một `PipelineSnapshot` bất biến mới:
   - **Inbound**: sắp xếp theo `Order` **tăng dần** (`a.Order.CompareTo(b.Order)`).
   - **OutboundAlways**: sắp xếp theo `Order` **giảm dần** (`b.Order.CompareTo(a.Order)`).
   - **Outbound**: sắp xếp theo `Order` **giảm dần** (`b.Order.CompareTo(a.Order)`).

| Middleware tích hợp sẵn | Giai đoạn | `Order` | Mục đích |
| :--- | :--- | ---: | :--- |
| `PermissionMiddleware` | `Inbound` | `-50` | Kiểm tra cấp quyền `[PacketPermission]` theo kiểu fail-closed. |
| `RateLimitMiddleware` | `Inbound` | `50` | Kiểm tra `[PacketRateLimit]` (`PolicyRateLimiter`) hoặc `TokenBucketLimiter` theo endpoint. |
| `TimeoutMiddleware` | `Inbound` | `75` | Lớp bọc hủy theo `[PacketTimeout]` cho từng handler. |

## Vòng đời thực thi và runner lấy từ pool

```mermaid
flowchart TD
    A["ExecuteAsync(context, dispatch, descriptor, ct)"] --> B{"snapshot.IsEmpty?"}
    B -->|Yes| C["dispatch.ExecuteTerminalHandler(descriptor, context, ct)"]
    B -->|No| D["Acquire PooledPipelineContext (32-slot local bitmask pool or ObjectPoolManager)"]
    D --> E["Stage 1: Inbound (ascending Order)"]
    E -->|Calls next(inboundCt)| F["CREATE_EXECUTION_TOKEN(inboundCt, rootCt) + ExecuteTerminalHandler"]
    E -->|Short-circuits| K["Return PooledPipelineContext"]
    F --> G["Stage 2: OutboundAlways (descending Order, runs even if handler threw OperationCanceledException)"]
    G --> H{"!context.SkipOutbound && !token.IsCancellationRequested?"}
    H -->|Yes| I["Stage 3: Outbound (descending Order)"]
    H -->|No| J["Re-throw OperationCanceledException if handler cancelled"]
    I --> J
    J --> K
```

### Truyền hủy giữa handler và `OutboundAlways`

Khi terminal handler ném `OperationCanceledException` (ví dụ khi `TimeoutMiddleware` hủy `inboundCt`):

1. `EXECUTE_HANDLER_FULL_ASYNC` bắt tạm thời `OperationCanceledException`.
2. Chạy toàn bộ middleware `OutboundAlways` để logic audit và dọn dẹp vẫn được thực thi.
3. Ném lại `OperationCanceledException` sau khi `OutboundAlways` hoàn tất, để `TimeoutMiddleware` phía trên có thể nhận biết timeout và gửi `Directive(TIMEOUT)`.

## Xử lý lỗi (`ConfigureErrorHandling`)

Được cấu hình qua `PacketDispatchOptions<TPacket>.WithErrorHandlingMiddleware(bool continueOnError, Action<Exception, Type>? errorHandler = null)`:

- **`continueOnError = false` (mặc định)**: Các ngoại lệ không nghiêm trọng của middleware làm tăng `TotalErrors` và được truyền lên người gọi, kết thúc pipeline.
- **`continueOnError = true`**: Gọi `errorHandler(ex, middlewareType)` rồi gọi `next(token)` để tiếp tục thực thi pipeline.

## Cấu trúc telemetry (`PipelineMetrics` và `PerMiddlewareMetrics`)

Được cung cấp qua `PacketDispatchOptions<TPacket>.Metrics` và `PacketDispatchOptions<TPacket>.MiddlewareMetrics`:

- **`PipelineMetrics`**: `ActiveExecutions` (`long`), `TotalExecutions` (`long`), `TotalExecutionTicks` (`long`), `MaxExecutionTicks` (`long`), `TotalErrors` (`long`), `AverageExecutionTime` (`TimeSpan`).
- **`PerMiddlewareMetrics`**: `MiddlewareType` (`Type`), `TotalExecutions` (`long`), `TotalExecutionTicks` (`long`), `MaxExecutionTicks` (`long`), `TotalErrors` (`long`).

## API liên quan

- [Permission Middleware](./permission-middleware.md)
- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Limiter](./token-bucket-limiter.md)
- [Timeout Middleware](./timeout-middleware.md)
- [Tùy chọn Packet Dispatch](../../options/runtime/packet-dispatch-options.md)
