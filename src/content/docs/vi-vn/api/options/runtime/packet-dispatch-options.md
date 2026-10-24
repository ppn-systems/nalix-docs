---
title: Tùy chọn Packet Dispatch
description: Tham chiếu cho Nalix.Runtime.Routing.PacketDispatchOptions<TPacket> và Nalix.Runtime.Options.PacketDrainOptions — đăng ký handler, gắn middleware và cấu hình vòng lặp worker.
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Routing`, `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`PacketDispatchOptions<TPacket>` (`public sealed partial class PacketDispatchOptions<TPacket> : IPacketHandlerBuilder<TPacket> where TPacket : IPacket`) cấu hình bảng tra cứu handler $O(1)$ gồm 65,536 slot, `MiddlewarePipeline<TPacket>`, các hook xử lý lỗi và `PacketDrainOptions` cho `PacketDispatchChannel`.

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.PublicMethods.cs`
- `src/Nalix.Runtime/Dispatching/Options/PacketDispatchOptions.Execution.cs`
- `src/Nalix.Runtime/Options/PacketDrainOptions.cs`

## Thuộc tính công khai của `PacketDispatchOptions<TPacket>`

| Thuộc tính | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `Drain` | `PacketDrainOptions` | Số vòng lặp worker, ghim lõi CPU và ngân sách xả gói tin cho mỗi lần đánh thức. |
| `Metrics` | `PipelineMetrics` | Số liệu thực thi tổng hợp (`ActiveExecutions`, `TotalExecutions`, `TotalExecutionTicks`, `MaxExecutionTicks`, `TotalErrors`, `AverageExecutionTime`). |
| `MiddlewareMetrics` | `ReadOnlySpan<PerMiddlewareMetrics>` | Bộ đếm thực thi và lỗi cho từng middleware. |

## `PacketDrainOptions` (`Nalix.Runtime.Options`)

Được tải từ `[PacketDrain]` trong `default.ini` hoặc cấu hình qua `options.Drain`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `Count` | `int` | `0` (tự động) | `[ValueRange(0, 1024)]` | Số vòng lặp worker dispatch tường minh (`0` dùng `Math.Clamp(Environment.ProcessorCount, MinDispatchLoops, MaxDispatchLoops)`). |
| `MaxDrainPerWakeMultiplier` | `int` | `5` | `[ValueRange(1, 10000)]` | Hệ số nhân áp dụng cho `Environment.ProcessorCount` để tính ngân sách xả gói tin cho mỗi lần đánh thức. |
| `MinDrainPerWake` | `int` | `64` | `[ValueRange(1, 1000000)]`, `<= MaxDrainPerWake` | Số gói tin tối thiểu được xả từ một phiên kết nối đã chiếm giữ trong mỗi lần đánh thức. |
| `MaxDrainPerWake` | `int` | `2048` | `[ValueRange(1, 1000000)]`, `>= MinDrainPerWake` | Số gói tin tối đa được xả từ một phiên kết nối đã chiếm giữ trong mỗi lần đánh thức. |
| `MinDispatchLoops` | `int` | `1` | `[ValueRange(1, 1024)]`, `<= MaxDispatchLoops` | Số vòng lặp worker tối thiểu khi `Count == 0`. |
| `MaxDispatchLoops` | `int` | `64` | `[ValueRange(1, 1024)]`, `>= MinDispatchLoops` | Số vòng lặp worker tối đa khi `Count == 0`. |
| `DispatchProcessorAffinities` | `string` | `""` | Các chỉ số lõi CPU phân tách bằng dấu phẩy | Chỉ số lõi CPU tùy chọn (ví dụ `"0,2,4,6"`). Khi không rỗng, tạo một luồng OS riêng cho mỗi lõi được liệt kê, ghim qua `ProcessorAffinity`. |
| `VirtualOpCodeOffset` | `ushort` | `0x1000` (`4096`) | `[ValueRange(0, 65535)]` | Độ lệch cộng thêm bởi bộ phân loại giao thức bên ngoài khi ánh xạ ID gói tin lạ sang opcode của Nalix. |

## Phương thức cấu hình fluent (`PacketDispatchOptions<TPacket>`)

| Phương thức | Chữ ký | Hành vi |
| :--- | :--- | :--- |
| `WithHandler<TController>()` | `public PacketDispatchOptions<TPacket> WithHandler<TController>() where TController : class` | Tạo `TController` qua `InstanceManager.Instance.CreateInstanceWithInjection<TController>()` (phân giải các phụ thuộc của constructor từ `InstanceManager`) và đăng ký các handler `[PacketOpcode]` do source generator sinh ra. |
| `WithHandler<TController>(instance)` | `public PacketDispatchOptions<TPacket> WithHandler<TController>(TController instance) where TController : class` | Đăng ký handler bằng một instance singleton `TController` có sẵn. |
| `WithHandler<TController>(factory)` | `public PacketDispatchOptions<TPacket> WithHandler<TController>(Func<TController> factory) where TController : class` | Đăng ký handler bằng một delegate factory tùy chỉnh. Ném `InternalErrorException` nếu `TController` thiếu `[PacketHandler]` hoặc có opcode bị đăng ký trùng. |
| `WithHandler(Type)` / `WithHandler(Type, Func<object>)` | `public PacketDispatchOptions<TPacket> WithHandler(Type controllerType, ...)` | Các overload đăng ký controller không generic (hữu ích cho các lớp handler `static`). |
| `WithMiddleware` | `public PacketDispatchOptions<TPacket> WithMiddleware(IPacketMiddleware<TPacket> middleware)` | Đăng ký một instance `IPacketMiddleware<TPacket>` vào pipeline. |
| `WithDispatchLoopCount` | `public PacketDispatchOptions<TPacket> WithDispatchLoopCount(int? loopCount)` | Đặt `Drain.Count` (`1..64`, hoặc `null` để tự động tính theo CPU; ném `ArgumentOutOfRangeException` nếu nằm ngoài `1..64`). |
| `WithErrorHandling` | `public PacketDispatchOptions<TPacket> WithErrorHandling(Action<Exception, ushort> errorHandler)` | Đăng ký callback được gọi với `(exception, opCode)` khi handler ném ngoại lệ không phải teardown, trước khi gửi phản hồi `Directive(FAIL)` tự động. |
| `WithErrorHandlingMiddleware` | `public PacketDispatchOptions<TPacket> WithErrorHandlingMiddleware(bool continueOnError, Action<Exception, Type>? errorHandler = null)` | Cấu hình việc `MiddlewarePipeline<TPacket>` tiếp tục hay hủy khi một middleware ném lỗi. |

## Ví dụ sử dụng

```csharp
using Nalix.Runtime.Dispatching;
using Nalix.Runtime.Middleware.Standard;

PacketDispatchChannel channel = new(options =>
{
    options.WithDispatchLoopCount(null)
           .WithErrorHandling((ex, opCode) =>
           {
               // Ghi lại telemetry ngoại lệ của handler
           })
           .WithMiddleware(new PermissionMiddleware())
           .WithMiddleware(new RateLimitMiddleware())
           .WithMiddleware(new TimeoutMiddleware())
           .WithHandler<AuthController>()
           .WithHandler<ChatController>();
});
```

## API liên quan

- [Điều phối gói tin (PacketDispatchChannel)](../../runtime/routing/packet-dispatch.md)
- [Middleware Pipeline](../../runtime/middleware/pipeline.md)
- [Tùy chọn Dispatch](./dispatch-options.md)
- [Packet Handler Generator](../../analyzers/autogen/packet-handler-generator.md)
