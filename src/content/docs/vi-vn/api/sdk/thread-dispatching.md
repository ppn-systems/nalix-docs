---
title: Điều phối luồng
description: "Tham chiếu cho IThreadDispatcher và InlineDispatcher trong Nalix.SDK — chuyển callback về luồng UI và vòng lặp game để xử lý đăng ký gói tin."
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK`  
**Assembly:** `Nalix.SDK`

`IThreadDispatcher` trừu tượng hóa cách các callback từ luồng nhận mạng chạy nền được lên lịch sang luồng đích của ứng dụng (chẳng hạn vòng lặp chính của Unity, luồng chính của Godot, `Dispatcher` của WPF/WinUI hoặc `MainThread` của MAUI).

## Ánh xạ mã nguồn

- `src/Nalix.SDK/IThreadDispatcher.cs`
- `src/Nalix.SDK/InlineDispatcher.cs`

## Contract công khai

```csharp
namespace Nalix.SDK;

public interface IThreadDispatcher
{
    void Post(Action action);
}

public sealed class InlineDispatcher : IThreadDispatcher
{
    [Pure]
    [MethodImpl(MethodImplOptions.NoInlining)]
    public void Post(Action action) => action?.Invoke();
}
```

## Cách sử dụng `IThreadDispatcher`

- **`InlineDispatcher`**: Thực thi `action?.Invoke()` đồng bộ trên luồng gọi, không chuyển ngữ cảnh và không cấp phát hàng đợi.
- **Dispatcher tùy chỉnh cho UI / engine**: Khi xử lý gói tin qua [TransportSessionSubscriptions.On&lt;TPacket&gt;](./subscriptions.md) (đặt `disposeAfter: false` nếu truyền gói lấy từ pool sang luồng khác) hoặc `OnMessageReceived` (gọi `lease.Retain()` trước khi post và `lease.Dispose()` bên trong action được post), hãy gọi `dispatcher.Post(() => ...)` để đưa việc thay đổi trạng thái về luồng chính của engine.

## Triển khai `IThreadDispatcher` cho engine game và UI

### Unity (`SynchronizationContext` / hàng đợi luồng chính)

```csharp
using System;
using System.Collections.Concurrent;
using Nalix.SDK;
using UnityEngine;

public sealed class UnityMainThreadDispatcher : MonoBehaviour, IThreadDispatcher
{
    private readonly ConcurrentQueue<Action> _queue = new();

    public void Post(Action action)
    {
        if (action is not null)
        {
            _queue.Enqueue(action);
        }
    }

    private void Update()
    {
        while (_queue.TryDequeue(out Action? action))
        {
            action();
        }
    }
}
```

### .NET MAUI / WPF (`SynchronizationContext`)

```csharp
using System;
using System.Threading;
using Nalix.SDK;

public sealed class SyncContextDispatcher(SynchronizationContext context) : IThreadDispatcher
{
    public void Post(Action action) => context.Post(static state => ((Action)state!)(), action);
}
```

## API liên quan

- [Subscriptions (On&lt;TPacket&gt;, OnExact&lt;TPacket&gt;, Subscribe)](./subscriptions.md)
- [Transport Session](./transport-session.md)
