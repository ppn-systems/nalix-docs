---
title: Dispatch Channel và Router
description: Tham chiếu cho PacketDispatcherBase<TPacket> và hàng đợi nội bộ DispatchChannel<TPacket> dạng actor-mailbox trong Nalix.Runtime.
section: API Reference
package: Nalix.Runtime
---

**Namespaces:** `Nalix.Runtime.Dispatching`, `Nalix.Runtime.Internal.Routing`  
**Assembly:** `Nalix.Runtime`

Trang này mô tả `PacketDispatcherBase<TPacket>` (lớp cơ sở trừu tượng cho các dispatcher gói tin) và `DispatchChannel<TPacket>` (hàng đợi actor-mailbox theo từng kết nối, có ưu tiên, được `PacketDispatchChannel` sử dụng).

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Dispatching/PacketDispatcherBase.cs`
- `src/Nalix.Runtime/Dispatching/PacketDispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`
- `src/Nalix.Runtime/Internal/Routing/WorkerWakeSignal.cs`

## 1. `PacketDispatcherBase<TPacket>`

```csharp
namespace Nalix.Runtime.Dispatching;

public abstract class PacketDispatcherBase<TPacket> where TPacket : IPacket
{
    protected PacketDispatchOptions<TPacket> Options { get; }

    protected PacketDispatcherBase(PacketDispatchOptions<TPacket> options);
    protected PacketDispatcherBase(Action<PacketDispatchOptions<TPacket>>? configure = null);
}
```

- Giữ instance `PacketDispatchOptions<TPacket>` đã cấu hình (`Options`) cho các lớp con như `PacketDispatchChannel`.
- Ném `ArgumentNullException` nếu `options` là `null`.

## 2. `DispatchChannel<TPacket>` (`internal sealed`)

`DispatchChannel<TPacket>` (`internal sealed class DispatchChannel<TPacket> : IDispatchChannel<TPacket>, IDisposable where TPacket : IPacket`) triển khai hàng đợi ưu tiên round-robin có trọng số, cô lập theo từng kết nối, làm nền cho `PacketDispatchChannel`.

### Thành phần chính

| Thành phần | Phạm vi truy cập | Kiểu / Chữ ký | Mô tả |
| :--- | :---: | :--- | :--- |
| `TotalPackets` | `public` | `long` | Số gói tin hiện đang xếp hàng trên tất cả kết nối. |
| `PeakPackets` | `public` | `long` | Mức cao nhất của số gói tin xếp hàng từ khi khởi động. |
| `HasPacket` | `public` | `bool` | Trả về `true` khi `TotalPackets > 0`. |
| `Push` | `public` | `void Push(IConnection connection, IBufferLease raw)` | Đưa `raw` vào hàng đợi của `connection` (sẽ chặn khi `DropPolicy == DropPolicy.Block`). |
| `TryClaim` | `public` | `bool TryClaim([NotNullWhen(true)] out IDispatchSession session)` | Giành quyền xử lý độc quyền đối với mailbox của kết nối sẵn sàng tiếp theo, theo ngân sách ưu tiên round-robin có trọng số. |
| `PushCore` | `internal` | `bool PushCore(IConnection connection, IBufferLease raw, out bool readyEmitted, bool noBlock = false)` | Đường đưa vào hàng đợi không chặn, được `PacketDispatchChannel.HandlePacket` dùng; đặt `readyEmitted = true` khi kết nối chuyển sang trạng thái sẵn sàng. |
| `TotalConnections` | `public` | `int` | Số trạng thái kết nối đang hoạt động được theo dõi trong bảng bucket đã phân mảnh. |
| `ReadyConnections` | `public` | `int` | Số kết nối đang chờ trong các hàng đợi sẵn sàng. |
| `TotalEvicted` | `public` | `long` | Tổng số gói tin bị loại bỏ do `DropOldest` hoặc `Coalesce`. |

### Điểm nổi bật về kiến trúc

1. **Tra cứu trạng thái phân mảnh, không khóa**: Mailbox của kết nối (`ConnectionState`) được lưu trong các bucket băm có kích thước lũy thừa của hai (`_stateBuckets`, kích thước lấy từ `Environment.ProcessorCount * BucketCountMultiplier` và giới hạn trong `[MinBucketCount, MaxBucketCount]`). Việc tìm mailbox của một kết nối đã có trên hot path gửi gói tin là không khóa; các ô tombstone được tái sử dụng tại chỗ khi kết nối ngắt.
2. **5 mức ưu tiên với round-robin có trọng số (`PriorityWeights`)**: Mỗi trạng thái kết nối duy trì 5 hàng đợi ưu tiên (từ `PacketPriority.NONE = 0` đến `PacketPriority.URGENT = 4`). Các kết nối sẵn sàng được lấy ra theo các trọng số có thể cấu hình (mặc định `"1,2,4,8,16"`), đảm bảo gói `URGENT` được phục vụ thường xuyên hơn `NONE` $16\times$ mà không làm đói các mức thấp hơn.
3. **Giới hạn hàng đợi theo từng kết nối (`MaxPerConnectionQueue`)**: Giới hạn backlog của mỗi kết nối (mặc định `4096`) và áp dụng `DropPolicy.DropNewest`, `DropOldest`, `Coalesce` hoặc `Block`.
4. **Tự động dọn dẹp khi ngắt kết nối**: Đăng ký `IConnectionHub.ConnectionUnregistered` để các instance `IBufferLease` đang xếp hàng của một client đã ngắt kết nối được rút hết và dispose tự động.

## API liên quan

- [Dispatch Contracts](./dispatch-contracts.md)
- [Packet Dispatch (PacketDispatchChannel)](./packet-dispatch.md)
- [Dispatch Options](../../options/runtime/dispatch-options.md)
- [Packet Dispatch Options](../../options/runtime/packet-dispatch-options.md)
