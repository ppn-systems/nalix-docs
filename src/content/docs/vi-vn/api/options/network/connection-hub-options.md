---
title: Tùy chọn Connection Hub
description: Tài liệu tham chiếu cho Nalix.Network.Options.ConnectionHubOptions — số lượng shard, gom lô broadcast, mức song song khi ngắt kết nối hàng loạt và chẩn đoán độ trễ cho ConnectionHub.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionHubOptions` (`public sealed partial class ConnectionHubOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình số shard của `ConnectionRegistry`, mức song song khi ngắt kết nối hàng loạt, gom lô broadcast kiểu cũ, và đo độ trễ cho [ConnectionHub](../../network/connection/connection-hub.md).

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionHubOptions.cs`
- `src/Nalix.Network/Connections/ConnectionHub.cs`
- `src/Nalix.Network/Connections/ConnectionHub.Broadcast.cs`
- `src/Nalix.Network/Internal/Connections/ConnectionRegistry.cs`

## Giá trị mặc định và kiểm tra hợp lệ

Được nạp từ mục `[ConnectionHub]` của `default.ini`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Thành phần lúc chạy sử dụng |
| :--- | :--- | ---: | :--- | :--- |
| `ParallelDisconnectDegree` | `int` | `-1` | `[ValueRange(-1, int.MaxValue)]`; `0` ném `ArgumentOutOfRangeException` | Truyền vào `ParallelOptions.MaxDegreeOfParallelism` khi `ConnectionHub.Dispose()` ngắt tất cả kết nối đang hoạt động (`-1` dùng mức song song mặc định của `ThreadPool`). |
| `BroadcastBatchSize` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Điều khiển kích thước lô cho `BroadcastAsync(ReadOnlyMemory<byte>, ...)` kiểu cũ dựa trên buffer (`0` chờ tất cả lượt gửi trong một lô duy nhất). |
| `ShardCount` | `int` | `Math.Max(1, Environment.ProcessorCount)` | `[ValueRange(1, int.MaxValue)]` | Số shard `ConcurrentDictionary<ulong, IConnection>` nội bộ trong `ConnectionRegistry`. |
| `IsEnableLatency` | `bool` | `true` | — | Bật log đo thời gian `TimingScope` (`PERF.NW.*`) khi gọi `RegisterConnection` và `UnregisterConnection`, và khi `BroadcastAsync`, nếu chẩn đoán mức `Information` được bật. |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném rõ ràng `ArgumentOutOfRangeException` nếu `ParallelDisconnectDegree == 0`.

## Sharding và luồng đăng ký

```mermaid
flowchart TD
    A["RegisterConnection(connection)"] --> B{"_disposed?"}
    B -->|Yes| X["Throw ObjectDisposedException"]
    B -->|No| C["Subscribe connection.ConnectionClosed + Set OwnerHub Attribute"]
    C --> D["ConnectionRegistry.TryAdd(connection.ConnectionId, connection)"]
    D --> E{"Added to Shard?"}
    E -->|No (Duplicate)| F["Unsubscribe + Throw InternalErrorException"]
    E -->|Yes| G["Indexed in Shard & Endpoint Map"]
```

- `ConnectionRegistry` băm các ID kết nối kiểu `ulong` bằng bộ hoàn thiện `MIX64` 64-bit.
- Khi `ShardCount` là lũy thừa của 2, việc chọn shard dùng phép AND bit (`hash & _shardMask`); ngược lại dùng phép chia lấy dư (`hash % _shardCount`).

## API liên quan

- [Connection Hub](../../network/connection/connection-hub.md)
- [Connection Extensions](../../network/connection/connection-extensions.md)
- [Tùy chọn mạng](./options.md)
