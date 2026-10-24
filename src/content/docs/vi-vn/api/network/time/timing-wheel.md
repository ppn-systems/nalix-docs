---
title: Timing Wheel
description: Tham chiếu cho Nalix.Network.Internal.Time.TimingWheel — hashed wheel timer với các bucket liên kết đôi và khóa striped, quản lý timeout nhàn rỗi kết nối với độ phức tạp O(1).
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Internal.Time`  
**Assembly:** `Nalix.Network`

`TimingWheel` (`[Injectable] internal sealed class TimingWheel : IActivatable`) là một **Hashed Wheel Timer** rất nhẹ, theo dõi các instance `IConnection` đã đăng ký và ngắt những kết nối có thời gian nhàn rỗi (`Clock.UnixMillisecondsNow() - conn.LastPingTime`) đạt tới `conn.IdleTimeoutMs` (mặc định `TimingWheelOptions.IdleTimeoutMs = 60,000` ms).

## Nguồn mã

- `src/Nalix.Network/Internal/Time/TimingWheel.cs`
- `src/Nalix.Network/Internal/Time/TimingWheelMetrics.cs`
- `src/Nalix.Network/Options/TimingWheelOptions.cs`

## Kiến trúc Hashed Wheel

```mermaid
flowchart TD
    subgraph Wheel["TimingWheelBucket[] (BucketCount = 512)"]
        B0["Bucket 0 (Doubly-Linked List + Lock)"]
        B1["Bucket 1 (Doubly-Linked List + Lock)"]
        BN["Bucket N - 1"]
    end

    subgraph Worker["Background PeriodicTimer Loop (TickDuration = 1000ms)"]
        Tick["Advance Tick & Catch-up Missed Ticks"]
        Drain["Process Current Bucket"]
        CheckVer{"task.Version == conn.TimeoutVersion?"}
        CheckRounds{"task.Rounds > 0?"}
        CheckIdle{"idleMs >= conn.IdleTimeoutMs?"}
        Disc["conn.Disconnect() + Return TimeoutTask"]
        Resched["Recompute Remaining Ticks & Re-enqueue"]
    end

    Tick --> Drain --> CheckVer
    CheckVer -->|No (Stale)| Pool["Return TimeoutTask to ObjectPool"]
    CheckVer -->|Yes| CheckRounds
    CheckRounds -->|Yes| Dec["task.Rounds-- (Stay in Bucket)"]
    CheckRounds -->|No| CheckIdle
    CheckIdle -->|Yes| Disc
    CheckIdle -->|No| Resched --> Wheel
```

## Cơ chế chính

### 1. Bucket liên kết đôi (`TimingWheelBucket`) và khóa striped theo kết nối

- Wheel cấp phát `BucketCount` (`512`) slot `TimingWheelBucket`. Khi `BucketCount` là lũy thừa của hai, chỉ số bucket được tính bằng bitmask (`(int)(targetTick & _mask)`).
- Mỗi bucket duy trì một danh sách liên kết đôi các nút `TimeoutTask` lấy từ pool, được bảo vệ bởi khóa monitor theo bucket (`lock (bucket)`), hỗ trợ thêm và xóa với độ phức tạp $O(1)$.
- Việc đăng ký và hủy đăng ký kết nối được đồng bộ theo từng kết nối bằng một mảng khóa striped có kích thước lũy thừa của hai (`_connectionLocks`), cùng với các thuộc tính `ITimeoutTrackedConnection.TimeoutVersion` và `TimeoutTask` trực tiếp trên `Connection` / `WebSocketConnection` / `PassthroughConnection`.

### 2. Phá tham chiếu ngay khi hủy

Khi một `Connection` bị dispose, `PerformDestructiveCleanup()` lập tức phá tham chiếu từ `TimeoutTask.Conn` (`task.Conn = null`), cho phép bộ thu gom rác thu hồi `Connection` ngay mà không phải chờ con trỏ wheel quay tới bucket đó.

### 3. Kích hoạt theo đếm tham chiếu (`Activate` / `Deactivate`)

Nhiều listener (`TcpListenerBase`, `WebSocketListenerBase`, `UdpPassthroughListener`) dùng chung `TimingWheel` singleton. `Activate` tăng `_activeListeners` và khởi động worker nền của `TaskManager` cho listener đầu tiên; `Deactivate` giảm `_activeListeners` và dừng/xả wheel khi listener cuối cùng tắt (chờ tối đa `TimingWheelOptions.WheelDrainTimeoutMs = 5000` ms).

## Cấu hình (`TimingWheelOptions`)

| Thuộc tính | Mặc định | Kiểm tra | Mô tả |
| :--- | ---: | :--- | :--- |
| `BucketCount` | `512` | `[ValueRange(1, int.MaxValue)]` | Số slot của wheel (giá trị lũy thừa của hai cho phép chỉ số bitmask). |
| `TickDuration` | `1000` | `[ValueRange(1, int.MaxValue)]` | Khoảng tick tính bằng mili-giây cho vòng `PeriodicTimer`. |
| `IdleTimeoutMs` | `60_000` | `[ValueRange(1, int.MaxValue)]` | Timeout nhàn rỗi mặc định của kết nối tính bằng mili-giây trước khi tự động ngắt. |
| `WheelDrainTimeoutMs` | `5000` | `[ValueRange(0, 60000)]` | Thời gian chờ xả tối đa khi tắt máy, tính bằng mili-giây. |

## API liên quan

- [Timing Wheel Options](../../options/network/timing-wheel-options.md)
- [Connection](../connection/connection.md)
- [TCP Listener](../tcp-listener.md)
