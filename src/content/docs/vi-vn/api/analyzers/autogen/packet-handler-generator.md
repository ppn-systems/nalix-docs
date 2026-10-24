---
title: Packet Handler Generator
description: Incremental Roslyn source generator (PacketHandlerGenerator) biên dịch các controller [PacketHandler] thành delegate điều phối không dùng reflection và tiêm các phụ thuộc [Inject] và [FromScope].
section: API Reference
package: Nalix.Analyzers
---

`PacketHandlerGenerator` (`analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`) là một incremental Roslyn source generator, biên dịch các lớp được đánh dấu `[PacketHandler]` thành các implementation `IPacketHandlerCompiler` không dùng reflection, được đăng ký qua `[ModuleInitializer]`.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## Việc generator làm lúc biên dịch

1. **Tìm controller**: Tìm mọi lớp cụ thể được đánh dấu `[PacketHandler]` và kiểm tra các method `[PacketOpcode]` của chúng.
2. **Nối constructor và `[Inject]`**:
   - Chọn constructor có thể truy cập (`public` hoặc `internal`) với nhiều tham số nhất để khởi tạo controller. Tham số `ConfigurationLoader` được lấy qua `ConfigurationManager.Instance.Get<TParam>()`, còn tham số service được lấy qua `InstanceManager.Instance.GetExistingInstance<TParam>()` (nếu không có thì dùng giá trị mặc định của tham số, hoặc ném `InvalidOperationException` nếu tham số là bắt buộc).
   - Nếu controller khai báo field hoặc property có đánh dấu `[Inject]` (yêu cầu lớp controller được khai báo `partial`), generator sinh ra `<Controller>_Inject.g.cs` chứa `private void InitializeDependencies()` và gọi nó bên trong factory được sinh ra.
3. **Biên dịch metadata**: Đọc `[PacketOpcode]`, `[PacketTimeout]`, `[PacketPermission]`, `[PacketEncryption]`, `[PacketRateLimit]` và `[PacketConcurrencyLimit]` trên mỗi method handler (với giá trị dự phòng ở mức controller), rồi tạo một descriptor `PacketMetadata` qua `PacketMetadataBuilder`.
4. **Biên dịch delegate**: Sinh ra một lambda invoker có kiểu mạnh, ép `IPacketContext<TPacket>` sang `IPacketContext<TConcretePacket>`, lấy các tham số `[FromScope]` qua `ctx.Scope.GetRequiredService<TParam>()` (hoặc `ctx.Scope.GetService<TParam>()` khi kiểu tham số là `TParam?` nullable), rồi gọi handler mà không dùng reflection hay boxing.
5. **Đăng ký Module Initializer**: Sinh ra `PacketHandlersGenerated.Initialize()` (`[ModuleInitializer]`) gọi `PacketHandlerRegistry.Register(typeof(TController), new TController_PacketHandlerCompiler())`.

## Chữ ký handler được hỗ trợ

Mọi method `[PacketOpcode]` phải tuân theo hợp đồng tham số sau:

| Vị trí tham số | Kiểu / Attribute bắt buộc | Cách cung cấp |
| --- | --- | --- |
| **Tham số `0`** (bắt buộc) | `IPacketContext<TPacket>` (với `TPacket : IPacket`) | Được truyền trực tiếp từ context điều phối pooled lúc chạy (`context.Packet`, `context.Connection`, `context.Sender`, `context.Scope`, `context.CancellationToken`). |
| **Tham số `1..N`** (tùy chọn) | Kiểu tham chiếu `TService` (hoặc `TService?`) được đánh dấu `[FromScope]` | `TService` không nullable được lấy qua `context.Scope.GetRequiredService<TService>()`; `TService?` nullable được lấy qua `context.Scope.GetService<TService>()`. |

:::warning[Đã loại bỏ chữ ký cũ `(TPacket packet, IConnection connection)`]
Tham số đầu tiên của method handler luôn phải là `IPacketContext<TPacket>`. Method dùng chữ ký cũ sẽ phát ra **`NALIX003`**, còn các tham số thừa thiếu `[FromScope]` hoặc là kiểu giá trị sẽ phát ra **`NALIX067`** và bị loại khỏi bảng điều phối được sinh ra.
:::

### Kiểu trả về được hỗ trợ

- `void`
- `Task`
- `ValueTask`
- `TResult` (ví dụ trả về một `IPacket` phản hồi, `string` hoặc `byte[]`)
- `Task<TResult>`
- `ValueTask<TResult>`
- `IAsyncEnumerable<TElement>` (phản hồi streaming từ server tới client)

Nội bộ, generator phân loại kiểu trả về của mỗi handler thành enum công khai `Nalix.Analyzers.Generators.HandlerReturnKind` (`Void`, `NonGenericValueTask`, `GenericValueTask`, `NonGenericTask`, `GenericTask`, `AsyncEnumerable`, `SyncValue`), hiển thị qua `HandlerMethodModel.ReturnKind`, và sinh ra một thân điều phối khác cho mỗi loại. Đây là chi tiết cài đặt nội bộ của generator, không phải API để bạn gọi.

## Ví dụ

```csharp
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;

[PacketHandler("AuthController")]
public sealed partial class AuthController
{
    [Inject]
    private ILogger? _logger;

    [PacketOpcode(0x1001)]
    [PacketPermission(PermissionLevel.NONE)]
    [PacketEncryption(true)]
    public ValueTask HandleLoginAsync(
        IPacketContext<LoginRequest> context,
        [FromScope] IUserSessionTracker tracker)
    {
        _logger?.LogInformation("Login from {Id}", context.Connection.ConnectionId);
        tracker.Track(context.Connection.ConnectionId);
        return context.Sender.ReplyAsync(new LoginResponse { Success = true });
    }
}
```

## Chẩn đoán được phát ra

| ID | Tiêu đề | Mức độ | Nguyên nhân |
| --- | --- | :---: | --- |
| `NALIX003` | Method handler của controller gói tin có chữ ký không được hỗ trợ | Cảnh báo | Tham số `0` bị thiếu hoặc không phải `IPacketContext<TPacket>`. |
| `NALIX067` | Method handler bị loại khỏi bảng điều phối | Lỗi | Tham số ở chỉ số `>= 1` bị thiếu `[FromScope]` hoặc không phải kiểu tham chiếu. |
| `NALIX104` | Field `[Inject]` không được là `readonly` | Lỗi | Field được đánh dấu `[Inject]` được khai báo `readonly`. |

## API liên quan

- [Tổng quan Source Generator](./index.md)
- [Chẩn đoán (Diagnostic Codes)](../diagnostic-codes.md)
- [Packet Attributes](../../abstractions/packet-attributes.md)
- [Hợp đồng Dependency Injection](../../abstractions/injection.md)
