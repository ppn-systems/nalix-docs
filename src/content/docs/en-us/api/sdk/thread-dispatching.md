---
title: Thread Dispatching
description: Reference for IThreadDispatcher and InlineDispatcher in Nalix.SDK — UI and game-loop thread marshalling for packet subscriptions.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK`  
**Assembly:** `Nalix.SDK`

`IThreadDispatcher` abstracts how callbacks from background network receive threads are scheduled onto an application's target thread (such as the Unity main loop, Godot main thread, WPF/WinUI `Dispatcher`, or MAUI `MainThread`).

## Source Mapping

- `src/Nalix.SDK/IThreadDispatcher.cs`
- `src/Nalix.SDK/InlineDispatcher.cs`

## Public Contracts

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

## How `IThreadDispatcher` Is Used

- **`InlineDispatcher`**: Executes `action?.Invoke()` synchronously on the calling thread without context switching or queue allocation.
- **Custom UI / Engine Dispatchers**: When handling packets via [TransportSessionSubscriptions.On&lt;TPacket&gt;](./subscriptions.md) (`disposeAfter: false` if passing a pooled packet across threads) or `OnMessageReceived` (calling `lease.Retain()` before posting and `lease.Dispose()` inside the posted action), invoke `dispatcher.Post(() => ...)` to marshal state mutations onto your engine's main thread.

## Implementing `IThreadDispatcher` for Game & UI Engines

### Unity (`SynchronizationContext` / Main Thread Queue)

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

## Related APIs

- [Subscriptions (On&lt;TPacket&gt;, OnExact&lt;TPacket&gt;, Subscribe)](./subscriptions.md)
- [Transport Session](./transport-session.md)
