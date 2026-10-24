---
title: Nalix.Runtime.Middleware
description: Tổng quan về pipeline middleware gói tin, các giai đoạn thực thi và middleware bảo mật/điều tiết tích hợp sẵn trong Nalix.Runtime.Middleware.
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Middleware`, `Nalix.Runtime.Middleware.Standard`, `Nalix.Runtime.Throttling`  
**Assembly:** `Nalix.Runtime`

Middleware runtime tạo thành pipeline thực thi gói tin, nằm giữa bước khởi tạo `PacketContext<TPacket>` và bước gọi `[PacketHandler]`. Nó áp dụng kiểm soát quyền theo kiểu fail-closed, giới hạn tốc độ theo chính sách và theo endpoint, thời gian chờ cho handler và xử lý hậu kỳ phía outbound.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Middleware/IPacketMiddleware.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareOrderAttribute.cs`
- `src/Nalix.Abstractions/Middleware/MiddlewareStageAttribute.cs`
- `src/Nalix.Runtime/Middleware/MiddlewarePipeline.cs`
- `src/Nalix.Runtime/Middleware/Standard/PermissionMiddleware.cs`
- `src/Nalix.Runtime/Middleware/Standard/RateLimitMiddleware.cs`
- `src/Nalix.Runtime/Middleware/Standard/TimeoutMiddleware.cs`
- `src/Nalix.Runtime/Throttling/PolicyRateLimiter.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`

## Vòng đời thực thi

```mermaid
flowchart TD
    Start(["ExecuteAsync(context, dispatch, descriptor, ct)"]) --> Inbound["Inbound Middleware (Ascending Order)"]
    Inbound -->|Calls next(ct)| Handler["ExecuteTerminalHandler (CanExecute + Invoker)"]
    Inbound -->|Short-circuits (no next)| End(["Pipeline Returns"])
    Handler --> Always["OutboundAlways Middleware (Descending Order)"]
    Always --> Decision{"!context.SkipOutbound && !ct.IsCancellationRequested?"}
    Decision -->|Yes| Outbound["Outbound Middleware (Descending Order)"]
    Decision -->|No| End
    Outbound --> End
```

## Các giai đoạn middleware (`MiddlewareStage`)

| Giai đoạn | Khai báo attribute | Thứ tự sắp xếp | Thời điểm kích hoạt |
| :--- | :--- | :---: | :--- |
| `Inbound` | `[MiddlewareStage(MiddlewareStage.Inbound)]` (mặc định) | `Order` tăng dần | Trước khi handler chạy. Việc short-circuit bỏ qua handler và toàn bộ các giai đoạn outbound. |
| `OutboundAlways` | `[MiddlewareStage(MiddlewareStage.Outbound, AlwaysExecute = true)]` | `Order` giảm dần | Luôn chạy sau khi handler trả về hoặc bị hủy qua `OperationCanceledException`. |
| `Outbound` | `[MiddlewareStage(MiddlewareStage.Outbound)]` | `Order` giảm dần | Chạy sau `OutboundAlways` chỉ khi `!context.SkipOutbound` và `!token.IsCancellationRequested`. |
| `Both` | `[MiddlewareStage(MiddlewareStage.Both)]` | Tăng dần (`Inbound`) và giảm dần (`Outbound` / `OutboundAlways`) | Đăng ký cùng một instance middleware vào cả danh sách inbound lẫn outbound. |

## Middleware chuẩn tích hợp sẵn (`Nalix.Runtime.Middleware.Standard`)

| Middleware | Order | Giai đoạn | Hành vi khi chạy |
| :--- | ---: | :--- | :--- |
| [PermissionMiddleware](./permission-middleware.md) | `-50` | `Inbound` | Kiểm tra `[PacketPermission]` theo kiểu fail-closed (`MinimumLevel` hoặc `StrictMatch`). Phát `Directive(FAIL, UNAUTHORIZED)` được kiểm soát bởi `DirectiveGuard`. |
| `RateLimitMiddleware` | `50` | `Inbound` | Đánh giá [PolicyRateLimiter](./policy-rate-limiter.md) khi có `[PacketRateLimit]`, hoặc [TokenBucketLimiter](./token-bucket-limiter.md) toàn cục khi không có. Phát `Directive(FAIL, RATE_LIMITED, RETRY)`. |
| [TimeoutMiddleware](./timeout-middleware.md) | `75` | `Inbound` | Áp dụng `[PacketTimeout(ms)]` bằng các `PooledCancellationTokenSource` lấy từ pool. Phát `Directive(TIMEOUT, TIMEOUT, RETRY)`. |

## API liên quan

- [Middleware Pipeline](./pipeline.md)
- [Permission Middleware](./permission-middleware.md)
- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Limiter](./token-bucket-limiter.md)
- [Timeout Middleware](./timeout-middleware.md)
- [Tùy chọn Packet Dispatch](../../options/runtime/packet-dispatch-options.md)
