---
title: Phạm vi đo thời gian
description: Trang này mô tả tiện ích đo thời gian đã trôi qua nhẹ trong Nalix.Environment.Time.
section: API Reference
package: Nalix.Environment
---

Trang này mô tả tiện ích đo thời gian đã trôi qua nhẹ trong `Nalix.Environment.Time`.

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Time/TimingScope.cs`

## Kiểu chính

- `TimingScope`

`TimingScope` là một readonly struct dùng để đo thời gian đã trôi qua bằng tick đơn điệu.

## Cách dùng cơ bản

```csharp
TimingScope scope = TimingScope.Start();

DoWork();

double elapsedMs = scope.GetElapsedMilliseconds();
Console.WriteLine(elapsedMs);
```

## Thành viên công khai

- `Start()`
- `GetElapsedMilliseconds()`
- `ElapsedTicks`

## API liên quan

- [Clock](./clock.md)
- [Trình quản lý tác vụ](../framework/task-manager.md)
