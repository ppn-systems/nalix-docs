---
title: Thuộc tính injection
description: Thuộc tính dependency injection lúc biên dịch và hợp đồng resolve theo phạm vi trong Nalix.Abstractions.Injection ([Injectable], [Inject], [FromScope], IPacketScope).
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Injection`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Injection` định nghĩa các attribute và hợp đồng container theo phạm vi, được `InstanceGenerator` và `PacketHandlerGenerator` dùng để nối dependency lúc biên dịch mà không cần reflection.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Injection/InjectableAttribute.cs`
- `src/Nalix.Abstractions/Injection/InjectAttribute.cs`
- `src/Nalix.Abstractions/Injection/FromScopeAttribute.cs`
- `src/Nalix.Abstractions/Injection/IPacketScope.cs`

## Tham chiếu kiểu

### 1. `[Injectable]` (`InjectableAttribute`)

Đánh dấu một class cụ thể để `InstanceGenerator` sinh activator lúc biên dịch.

- **Phạm vi áp dụng:** `AttributeTargets.Class` (`AllowMultiple = true`, `Inherited = false`)
- **Hàm dựng:**
  - `InjectableAttribute()` — Đăng ký activator cho class cụ thể.
  - `InjectableAttribute(Type serviceType)` — Đồng thời ánh xạ `serviceType` (một interface hoặc lớp cơ sở) tới class cụ thể qua `InstanceManager.RegisterServiceMapping<TService, TImpl>()` (`ArgumentNullException.ThrowIfNull(serviceType)`).
- **Thuộc tính:** `Type? ServiceType { get; }`

### 2. `[Inject]` (`InjectAttribute`)

Đánh dấu một trường hoặc thuộc tính để `PacketHandlerGenerator` tự động inject dependency lúc biên dịch:

- **Phạm vi áp dụng:** `AttributeTargets.Field | AttributeTargets.Property` (`AllowMultiple = false`, `Inherited = false`)
- **Hành vi:** Trên một lớp controller `partial` có `[PacketHandler]`, `PacketHandlerGenerator` sinh `<Controller>_Inject.g.cs` với `internal static void __InitializeDependencies()`, resolve từng thành viên `[Inject]` từ `InstanceManager.Instance.GetExistingInstance<T>()!`.
- **Ràng buộc:** Trường `[Inject]` không được là `readonly` (được `NALIX104` kiểm tra), và thuộc tính phải có setter có thể truy cập.

### 3. `[FromScope]` (`FromScopeAttribute`) & `IPacketScope`

Dùng cho dependency injection theo phạm vi từng gói tin bên trong các method handler `[PacketOpcode]`:

- **Phạm vi áp dụng của `[FromScope]`:** `AttributeTargets.Parameter` (`AllowMultiple = false`, `Inherited = false`)
- Mọi tham số có chỉ số `>= 1` trên method handler `[PacketOpcode]` phải là kiểu tham chiếu được đánh dấu `[FromScope]` (được `NALIX067` kiểm tra).
- **`IPacketScope : IDisposable, IAsyncDisposable`**:
  - `IConnection Connection { get; }` — Kết nối sở hữu gói tin đang được xử lý trong phạm vi này.
  - `T GetRequiredService<T>() where T : class` — Resolve một service bắt buộc từ phạm vi gói tin hiện tại (được `PacketHandlerGenerator` dùng cho tham số `[FromScope] T` không nullable; ném `InvalidOperationException` nếu chưa đăng ký).
  - `T? GetService<T>() where T : class` — Resolve một service tùy chọn từ phạm vi gói tin hiện tại (được `PacketHandlerGenerator` dùng cho tham số `[FromScope] T?` nullable; trả về `null` nếu chưa đăng ký).
  - `T GetOrAdd<T>(Func<T> factory) where T : class` — Lấy hoặc tạo một giá trị được cache trong suốt vòng đời của phạm vi gói tin này, khóa theo `typeof(T)`.
  - `T GetOrAdd<T>(object key, Func<T> factory) where T : class` — Lấy hoặc tạo một giá trị được cache trong suốt vòng đời của phạm vi gói tin này, khóa theo `key`.
  - `void RegisterForDisposal(IDisposable disposable)` — Đăng ký một instance `IDisposable` để được dispose khi phạm vi gói tin hoàn tất.
  - `void RegisterForDisposal(IAsyncDisposable asyncDisposable)` — Đăng ký một instance `IAsyncDisposable` để được dispose bất đồng bộ khi phạm vi gói tin hoàn tất.

## Ví dụ

```csharp
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;

[Injectable(typeof(IAuditService))]
public sealed class AuditService : IAuditService
{
    private readonly ILogger? _logger;

    public AuditService(ILogger? logger = null) => _logger = logger;

    public void Record(ulong connectionId) => _logger?.LogInformation("Audited {Id}", connectionId);
}

[PacketHandler("AuditController")]
public sealed partial class AuditController
{
    [Inject]
    private IAuditService? _audit;

    [PacketOpcode(0x1010)]
    public void HandleAction(
        IPacketContext<ActionPacket> context,
        [FromScope] IRequestTraceScope traceScope)
    {
        _audit?.Record(context.Connection.ConnectionId);
        traceScope.MarkCompleted();
    }
}
```

## API liên quan

- [Bộ sinh Instance](../analyzers/autogen/instance-generator.md)
- [Bộ sinh Packet Handler](../analyzers/autogen/packet-handler-generator.md)
- [Trình quản lý Instance](../framework/instance-manager.md)
- [Trình xây dựng ứng dụng mạng (RegisterScoped)](../hosting/network-application.md)
