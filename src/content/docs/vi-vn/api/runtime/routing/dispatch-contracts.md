---
title: Dispatch Contracts
description: Tham chiếu cho IPacketDispatch, IDispatchChannel<TPacket> và IDispatchSession trong Nalix.Runtime.Dispatching.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Dispatching`  
**Assembly:** `Nalix.Runtime`

Trang này đề cập các contract dispatch công khai trong `Nalix.Runtime.Dispatching`: `IPacketDispatch`, `IDispatchChannel<TPacket>` và `IDispatchSession`.

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Dispatching/IPacketDispatch.cs`
- `src/Nalix.Runtime/Dispatching/IDispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`

## 1. `IPacketDispatch`

```csharp
namespace Nalix.Runtime.Dispatching;

public interface IPacketDispatch : IActivatable, IReportable
{
    void HandlePacket(IBufferLease lease, IConnection connection);
}
```

`IPacketDispatch` là interface điểm vào giữa các listener mạng (`Nalix.Network`) và tầng thực thi lúc chạy (`Nalix.Runtime`):

- **`void HandlePacket(IBufferLease lease, IConnection connection)`**: Nhận một khung `lease` đã giải mã/giải nén từ `connection`. Triển khai (`PacketDispatchChannel`) gọi `lease.Retain()` trước khi đưa vào hàng đợi, nên bên gọi transport có thể dispose tham chiếu lease của chính nó ngay khi hàm trả về.
- **`IActivatable`**: Cung cấp `Activate(CancellationToken)` và `Deactivate(CancellationToken)` để bắt đầu và dừng các vòng lặp worker dispatch chạy nền.
- **`IReportable`**: Cung cấp `GenerateReport()` và `WriteReportData(Utf8JsonWriter)` cho telemetry lúc chạy.

## 2. `IDispatchChannel<TPacket>` và `IDispatchSession`

```csharp
namespace Nalix.Runtime.Dispatching;

public interface IDispatchSession : IDisposable
{
    IConnection Connection { get; }
    bool TryDequeue([NotNullWhen(true)] out IBufferLease raw);
}

public interface IDispatchChannel<TPacket> where TPacket : IPacket
{
    long TotalPackets { get; }
    void Push(IConnection connection, IBufferLease raw);
    bool TryClaim([NotNullWhen(true)] out IDispatchSession session);
}
```

### Vì sao cần `IDispatchSession` (mô hình actor-mailbox)

Nếu cho phép nhiều luồng worker cùng lấy gói tin từ một kết nối, thứ tự gói tin của client đó có thể bị đảo lộn. Vì vậy `IDispatchChannel<TPacket>` dùng **mô hình claim actor-mailbox**:

1. Một worker gọi `TryClaim(out IDispatchSession session)` để giành quyền xử lý độc quyền đối với mailbox của một kết nối đã sẵn sàng.
2. Khi đang giữ `session`, không worker nào khác có thể claim kết nối đó. Worker rút tối đa `_maxDrainPerWake` gói tin theo thứ tự ưu tiên (`URGENT` $\rightarrow$ `NONE`) qua `session.TryDequeue(out IBufferLease raw)`.
3. Dispose `session` (`session.Dispose()`) sẽ giải phóng claim và tự động đưa lại kết nối vào vòng sẵn sàng nếu vẫn còn gói tin đang chờ.

## API liên quan

- [Packet Dispatch (PacketDispatchChannel)](./packet-dispatch.md)
- [Dispatch Channel và Router](./dispatch-channel-and-router.md)
- [Packet Context](./packet-context.md)
- [Dispatch Options](../../options/runtime/dispatch-options.md)
