---
title: Thời gian chờ kết nối rỗi
description: Nalix cung cấp sẵn một cơ chế tự động phát hiện và ngắt các kết nối client không hoạt động trong một khoảng thời gian xác định. Điều này rất quan trọng để giải phóng tài nguyên và bảo vệ khỏi tình trạng cạn kiệt kết nối kéo dài (các kiểu tấn công kiểu Slowloris)...
section: Guides
---

Nalix cung cấp sẵn một cơ chế tự động phát hiện và ngắt các kết nối client không hoạt động trong một khoảng thời gian xác định. Điều này rất quan trọng để giải phóng tài nguyên và bảo vệ khỏi tình trạng cạn kiệt kết nối kéo dài (các kiểu tấn công kiểu Slowloris).

---

## 1. Cơ chế Timing Wheel

Thay vì dùng một `Timer` riêng cho mỗi kết nối (tốn kém và gây áp lực GC), Nalix dùng **Hashed Timing Wheel**.

### Cách hoạt động
1. Các kết nối được đặt vào các "bucket" trên một bánh xe ảo.
2. Một worker nền duy nhất "tick" qua các bucket này theo một khoảng thời gian cố định.
3. Chỉ những kết nối trong bucket hiện tại mới được kiểm tra xem có nhàn rỗi không.

Nhờ vậy, ngay cả với **hơn 100,000 kết nối đồng thời**, chi phí CPU vẫn ổn định và ở mức tối thiểu.

---

## 2. Cấu hình

Thời gian chờ kết nối rỗi được quản lý qua `TimingWheelOptions` (section INI `[TimingWheel]`). Từng kết nối riêng lẻ có thể không tham gia việc loại bỏ do nhàn rỗi trong lúc chạy bằng cách đặt `connection.ExcludeFromIdleTimeout = true`.

### Cách 1: File cấu hình (INI)

`ConfigurationManager` nạp `TimingWheelOptions` từ section `[TimingWheel]` trong `assets/config.ini`:

```ini
[TimingWheel]
; The duration in milliseconds before an idle connection is closed (minimum 1000)
IdleTimeoutMs = 60000

; The precision of the idle check in milliseconds (10 to 60000)
TickDuration = 1000

; Number of buckets in the wheel (16 to 1024; rounded up to power of two)
BucketCount = 512
```

---

## 3. Cách 2: Fluent Builder (C#)

Nếu bạn muốn cấu hình máy chủ bằng code, hãy dùng `ConfigurationManager.Instance.Get<TimingWheelOptions>()` hoặc cấu hình listener trước khi gọi `Build()`:

```csharp
using Nalix.Environment.Configuration;
using Nalix.Hosting;
using Nalix.Network.Options;

TimingWheelOptions wheelOptions = ConfigurationManager.Instance.Get<TimingWheelOptions>();
wheelOptions.IdleTimeoutMs = 30_000; // Disconnect after 30 seconds of silence
wheelOptions.TickDuration = 1000;    // Check once per second

var host = NetworkApplication.CreateBuilder()
    .MapTcp<MyProtocol>().Bind()
    .Build();

await host.RunAsync();
```

Để miễn một kết nối sống lâu cụ thể (chẳng hạn bộ giám sát sức khỏe nội bộ hoặc cầu nối giữa các máy chủ) khỏi việc bị loại bỏ do timeout nhàn rỗi:

```csharp
connection.ExcludeFromIdleTimeout = true;
```

---

## 4. Xác minh việc ngắt kết nối do nhàn rỗi

Khi timing wheel ngắt một client, nó sẽ ghi log ở mức `Debug` hoặc `Info` (tùy theo cấu hình logging của bạn).

**Ví dụ log đầu ra:**
```text
[DEBUG] [NW.TimingWheel] timeout remote=192.168.1.50 idle=30005ms
[INFO]  [NW.TcpListenerBase] close=192.168.1.50
```

### Mẹo: TCP Keep-Alive
Idle timeout phát hiện sự im lặng ở **tầng ứng dụng**. Để phát hiện các socket chết ở **tầng mạng** (khi client bị crash mà không đóng kết nối), hãy đảm bảo `KeepAlive` cũng được bật trong `NetworkSocketOptions`.

---

## Thông tin liên quan

- [Tham chiếu API Timing Wheel](../../api/network/time/timing-wheel.md)
- [Network Socket Options](../../api/options/network/network-socket-options.md)
- [Danh mục kiểm tra Production](../deployment/production-checklist.md)
