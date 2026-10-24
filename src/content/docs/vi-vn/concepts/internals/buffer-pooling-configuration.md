---
title: Pool bộ đệm
description: Pool bộ đệm là nền tảng của kiến trúc không cấp phát bộ nhớ của Nalix. BufferPoolManager bao bọc ArrayPool<byte>.Shared với khả năng phát hiện rò rỉ và theo dõi stack trace có thể cấu hình qua BufferOptions.
section: Concepts
---

Pool bộ đệm là nền tảng của kiến trúc không cấp phát bộ nhớ (zero-allocation) của Nalix. Bằng cách tái sử dụng các mảng `byte[]` có pool thông qua `BufferPoolManager` và `BufferLease`, Nalix loại bỏ hiện tượng GC Gen 0 liên tục và cung cấp tùy chọn phát hiện rò rỉ trong quá trình phát triển và staging.

---

## 1. Cách hoạt động

Nalix kết hợp `ArrayPool<byte>.Shared` của .NET với một lớp bao có pool và đếm tham chiếu (`BufferLease`), cùng một bộ theo dõi rò rỉ tùy chọn (`BufferPoolManager`):

- **`BufferPoolManager`**: Triển khai `IBufferPoolManager` trên `ArrayPool<byte>.Shared`, ghi nhận bộ đếm thuê/trả và theo dõi các buffer chưa được trả khi `BufferOptions.EnableBufferLeakDetection` được bật.
- **`BufferLease`**: Lớp bao nhẹ có đếm tham chiếu (`IBufferLease`), được thuê từ `ObjectPoolManager` để cắt lát, giữ tham chiếu và trả `byte[]` về pool một cách xác định khi `Dispose()`.
- **`BufferOptions`**: Điều khiển phát hiện rò rỉ (`EnableBufferLeakDetection`), thu thập stack trace (`EnableBufferLeakStackTrace`) và ngưỡng quá hạn (`SuspiciousThresholdSeconds`, mặc định `30` giây).

---

## 2. Cấu hình qua Hosting Builder

Bạn có thể cấu hình `BufferOptions` (section `[Buffer]` trong INI) hoặc đăng ký một `BufferPoolManager` tùy chỉnh trên `NetworkApplicationBuilder`:

### Thiết lập cơ bản

```csharp
using Nalix.Hosting;
using Nalix.Framework.Memory.Buffers;
using Nalix.Framework.Options;

var app = NetworkApplication.CreateBuilder()
    .Configure<BufferOptions>(options =>
    {
        options.EnableBufferLeakDetection = true;
        options.EnableBufferLeakStackTrace = false;
        options.SuspiciousThresholdSeconds = 30;
    })
    .Build();
```

---

## 3. Cấu hình qua file `.ini`

Trong môi trường production hoặc staging, hãy tinh chỉnh `BufferOptions` trong `assets/config.ini` dưới section `[Buffer]`:

```ini
[Buffer]
EnableBufferLeakDetection = false
EnableBufferLeakStackTrace = false
SuspiciousThresholdSeconds = 30
```

---

## 4. Dùng pool trong handler

Sau khi cấu hình, toàn bộ framework (Protocol, Serializer, Handler) tự động dùng pool này. Bạn cũng có thể dùng thủ công cho logic tùy chỉnh:

```csharp
[PacketOpcode(0x1001)]
public async ValueTask HandleLargeData(IPacketContext<MyPacket> context)
{
    // Thuê một buffer từ pool đã cấu hình
    using var lease = BufferLease.Rent(4096);

    // Thực hiện các thao tác không cấp phát bộ nhớ...
    int written = DoWork(lease.SpanFull);
    lease.CommitLength(written);

    await context.Connection.TCP.SendAsync(lease.Memory);
}
```

---

## 5. Theo dõi sức khỏe pool

Để đảm bảo buffer được trả về một cách xác định và không bị rò rỉ, hãy kiểm tra `BufferPoolManager.GenerateReport()`:

```csharp
// Lấy báo cáo chẩn đoán về các buffer đã thuê/trả và mọi rò rỉ quá hạn
string report = manager.GenerateReport();
Console.WriteLine(report);
```

### Các chỉ số cần theo dõi

| Chỉ số | Mô tả |
| :--- | :--- |
| **Total Rents / Returns** | Số lần thuê và trả `ArrayPool<byte>.Shared` tích lũy được `BufferPoolManager` ghi nhận. |
| **Outstanding Buffers** | Số buffer đang được thuê nhưng chưa được trả. |
| **Suspicious Leaks** | Các buffer bị giữ lâu hơn `BufferOptions.SuspiciousThresholdSeconds` (khi `EnableBufferLeakDetection = true`). |

---

## Thông tin liên quan

- [API quản lý buffer](../../api/environment/memory/buffer-management.md)
- [Đường dẫn nóng không cấp phát bộ nhớ](./zero-allocation.md)
- [Blueprint máy chủ](../../guides/getting-started/server-blueprint.md)
