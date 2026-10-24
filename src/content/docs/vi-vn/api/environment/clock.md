---
title: Clock
description: Trang này mô tả các tiện ích thời gian công khai trong Nalix.Environment.
section: API Reference
package: Nalix.Environment
---

Trang này mô tả các tiện ích thời gian công khai trong `Nalix.Environment`.

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Time/Clock.cs`
- `src/Nalix.Environment/Time/Clock.Unix.cs`

## Đây là gì

`Clock` là tiện ích thời gian dùng chung, phục vụ đo thời gian đơn điệu, truy cập thời gian UTC và chuyển đổi Unix time.

## Cách dùng cơ bản

```csharp
DateTime now = Clock.NowUtc();
long mono = Clock.MonoTicksNow();
double ms = Clock.MonoTicksToMilliseconds(mono);
```

## Thành viên công khai

### Thuộc tính

| Thành viên | Kiểu | Mô tả |
|--------|------|-------------|
| `TicksPerSecond` | `long` | Tần số của bộ đếm thời gian độ phân giải cao, tính bằng tick mỗi giây |
| `EpochMilliseconds` | `long` | Epoch tùy chỉnh (Unix ms) dùng để sinh ID (2025-01-01 UTC) |

### Phương thức

| Phương thức | Kiểu trả về | Mô tả |
|--------|-------------|-------------|
| `NowUtc()` | `DateTime` | Thời gian UTC hiện tại, được dựng lại từ stopwatch đơn điệu |
| `UnixMillisecondsNow()` | `long` | Unix timestamp hiện tại tính bằng mili giây |
| `UnixSecondsNow()` | `long` | Unix timestamp hiện tại tính bằng giây |
| `UnixSecondsNowUInt32()` | `uint` | Unix timestamp hiện tại tính bằng giây dưới dạng uint32 (an toàn đến khoảng năm 2106) |
| `UnixMicrosecondsNow()` | `long` | Unix timestamp hiện tại tính bằng micro giây |
| `UnixTicksNow()` | `long` | Unix timestamp hiện tại tính bằng tick |
| `UnixTime()` | `TimeSpan` | Unix time hiện tại dưới dạng TimeSpan |
| `EpochMillisecondsNow()` | `long` | Số mili giây kể từ epoch tùy chỉnh 2025-01-01 |
| `ClampUnixMilliseconds(long, long, long)` | `long` | Giới hạn giá trị Unix timestamp tính bằng mili giây `value` vào khoảng `[min, max]` |
| `MonoTicksNow()` | `long` | Số tick đơn điệu hiện tại (dùng để đo độ trễ/RTT) |
| `MonoTicksToMilliseconds(long)` | `double` | Chuyển độ chênh lệch tick đơn điệu thành mili giây |

## Ví dụ

```csharp
long ms = Clock.UnixMillisecondsNow();
long mono = Clock.MonoTicksNow();

// Đo thời gian đã trôi qua
long start = Clock.MonoTicksNow();
// ... công việc ...
double elapsedMs = Clock.MonoTicksToMilliseconds(Clock.MonoTicksNow() - start);

// ID theo epoch tùy chỉnh
long id = Clock.EpochMillisecondsNow();
```

## API liên quan

- [Phạm vi đo thời gian](./timing-scope.md)
- [Time Synchronizer](../network/time/time-synchronizer.md)
