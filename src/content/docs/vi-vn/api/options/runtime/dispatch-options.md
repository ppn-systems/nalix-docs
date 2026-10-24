---
title: DispatchOptions
description: Tham chiếu cho Nalix.Runtime.Options.DispatchOptions — giới hạn hàng đợi theo kết nối, chính sách loại bỏ khi tràn, trọng số ưu tiên round-robin có trọng số và kích thước bucket.
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`DispatchOptions` (`public sealed partial class DispatchOptions : ConfigurationLoader, IValidatableConfiguration`) kiểm soát dung lượng hộp thư theo từng kết nối, chính sách loại bỏ khi tràn, trọng số ưu tiên và kích thước bucket phân mảnh bên trong `DispatchChannel<TPacket>`.

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Options/DispatchOptions.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`

## Thuộc tính

Được tải từ mục `[Dispatch]` trong `default.ini` qua `ConfigurationManager.Instance.Get<DispatchOptions>()`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `MaxPerConnectionQueue` | `int` | `4096` | `[ValueRange(0, 1_048_576)]` | Số gói tin tối đa được xếp hàng cho một kết nối (`0` = không giới hạn, không khuyến nghị cho production). |
| `DropPolicy` | `DropPolicy` | `DropPolicy.DropNewest` | `[AllowedEnum]` | Chiến lược khi tràn, khi hàng đợi của kết nối đạt `MaxPerConnectionQueue` (`DropNewest`, `DropOldest`, `Coalesce` hoặc `Block`). |
| `BlockTimeout` | `TimeSpan` | `1000 ms` (`00:00:01`) | `>= TimeSpan.Zero` | Thời gian chờ tối đa cho các lệnh `Push` chặn khi `DropPolicy == DropPolicy.Block` (`PacketDispatchChannel.HandlePacket` dùng `noBlock: true`). |
| `PriorityWeights` | `string` | `"1,2,4,8,16"` | Đúng 5 giá trị `int` dương, phân tách bằng dấu phẩy | Ngân sách round-robin có trọng số cho `[NONE, LOW, MEDIUM, HIGH, URGENT]`. |
| `BucketCountMultiplier` | `int` | `64` | `[ValueRange(1, 1024)]` | Hệ số nhân áp dụng cho `Environment.ProcessorCount` để xác định kích thước mảng bucket băm trạng thái kết nối nội bộ. |
| `MinBucketCount` | `int` | `256` | `[ValueRange(1, 65536)]`, `<= MaxBucketCount` | Giới hạn dưới của số bucket băm trạng thái kết nối nội bộ (làm tròn lên thành lũy thừa của 2). |
| `MaxBucketCount` | `int` | `16384` | `[ValueRange(1, 1048576)]`, `>= MinBucketCount` | Giới hạn trên của số bucket băm trạng thái kết nối nội bộ (làm tròn lên thành lũy thừa của 2). |

## Quy tắc kiểm tra hợp lệ (`Validate()`)

`Validate()` chạy kiểm tra DataAnnotation (`[ValueRange]`, `[AllowedEnum]`) rồi áp dụng:

1. `MinBucketCount <= MaxBucketCount`.
2. `PriorityWeights` không rỗng và tách thành **đúng 5** số nguyên dương, tương ứng với `PacketPriority.NONE`, `LOW`, `MEDIUM`, `HIGH` và `URGENT`.
3. `BlockTimeout >= TimeSpan.Zero`.

## Ví dụ sử dụng

```csharp
using System;
using Nalix.Abstractions.Security;
using Nalix.Runtime.Options;

DispatchOptions options = new()
{
    MaxPerConnectionQueue = 1024,
    DropPolicy = DropPolicy.DropNewest,
    BlockTimeout = TimeSpan.FromMilliseconds(500),
    PriorityWeights = "1,2,4,8,16",
    MinBucketCount = 256,
    MaxBucketCount = 16384
};

options.Validate();
```

## API liên quan

- [Điều phối gói tin (PacketDispatchChannel)](../../runtime/routing/packet-dispatch.md)
- [Dispatch Channel và Router](../../runtime/routing/dispatch-channel-and-router.md)
- [Tùy chọn Packet Dispatch](./packet-dispatch-options.md)
