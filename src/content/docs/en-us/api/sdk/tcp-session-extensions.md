---
title: Session Extensions
description: Reference for ITransportSession extensions in Nalix.SDK.Transport.Extensions — RequestAsync, TryRequestAsync, StreamAsync, RequestWithStreamAsync, SubscribeChannel, AsObservable, CreateRpcClient, and RekeyAsync.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport.Extensions`  
**Assembly:** `Nalix.SDK`

All high-level request, streaming, reactive, RPC, and security helpers in `Nalix.SDK` are implemented as extension methods on **`ITransportSession`**, meaning they work identically across [TcpSession](./tcp-session.md), [UdpSession](./udp-session.md), and [WebSocketSession](./websocket-session.md).

## Source Mapping

- `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/StreamExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/HeaderStreamExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ChannelExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ObservableExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/RpcExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/RekeyExtensions.cs`
- `src/Nalix.SDK/Transport/Extensions/ControlExtensions.cs`
- `src/Nalix.SDK/Options/RequestOptions.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`

## Extension Family Overview

| Extension Class | Key Methods | Purpose |
| :--- | :--- | :--- |
| `RequestExtensions` | `RequestAsync<TResponse>`, `TryRequestAsync<TResponse>` | Correlated request/response (`SequenceId` matching) with timeout retries and non-throwing `RequestOutcome<TResponse>`. |
| `StreamExtensions` | `StreamAsync<TResponse>`, `CollectStreamAsync`, `StreamIntoAsync` | Server-to-client async streaming (`IAsyncEnumerable<TResponse>` where `TResponse : IPacketStreamable`) correlated by request `SequenceId`. |
| `HeaderStreamExtensions` | `RequestWithStreamAsync<THeader, T1..T3>` | Multiplexed initial header packet followed by 1, 2, or 3 typed `IPacketStreamable` item lists (`(THeader Header, List<T1> Items1, ...)`). |
| `ChannelExtensions` | `SubscribeChannel<TEvent>` | Bridges server push packets into a bounded or unbounded `ChannelReader<TEvent>`. |
| `ObservableExtensions` | `AsObservable<TEvent>` | Exposes server push packets as a hot `IObservable<TEvent>`. |
| `RpcExtensions` | `CreateRpcClient<T>`, `RegisterFactory` | Instantiates a source-generated client proxy for `[RpcService]` interfaces (`Nalix.Analyzers.CodeGen`). |
| `RekeyExtensions` | `RekeyAsync` | Performs mid-session key rotation (`HandshakeX25519.DeriveRekeySecret`, `ControlType.SESSION_REKEY` / `SESSION_REKEY_ACK`) and resets sequence counters. |
| `ControlExtensions` | `SendControlAsync`, `NewControl`, `AwaitPacketAsync`, `AwaitControlAsync` | Sends and awaits pooled `Control` packets (`ControlBuilder`). |
| [HandshakeExtensions](./handshake-extensions.md) | `HandshakeAsync` | Authenticated dual-X25519 ECDH key exchange, TOFU discovery, and automatic Proof-of-Work solving. |
| [ResumeExtensions](./resume-extensions.md) | `ResumeSessionAsync`, `ConnectWithResumeAsync`, `ConnectWithResumeDetailedAsync` | 0-RTT session resumption with `HmacKeccak256` proof-of-possession and handshake fallback. |
| [CipherExtensions](./cipher-extensions.md) | `UpdateCipherAsync` | Live symmetric `CipherSuiteType` switching (`ControlType.CIPHER_UPDATE` / `CIPHER_UPDATE_ACK`). |
| [PingExtensions / DisconnectExtensions / TimeSyncExtensions](./control-utilities.md) | `PingAsync`, `DisconnectGracefullyAsync`, `SyncTimeAsync` | RTT measurement, graceful disconnect (`ControlType.DISCONNECT`), and EMA clock synchronization. |
| [TransportSessionSubscriptions](./subscriptions.md) | `On<TPacket>`, `OnExact<TPacket>`, `On(predicate, handler)`, `Subscribe` | Strongly-typed and predicate-filtered packet event subscriptions. |

## 1. Correlated Request / Response (`RequestExtensions`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class RequestExtensions
{
    public static ValueTask<TResponse> RequestAsync<TResponse>(
        this ITransportSession client,
        IPacket request,
        RequestOptions? options = null,
        Func<TResponse, bool>? predicate = null,
        CancellationToken ct = default)
        where TResponse : class, IPacket, IPacketStaticOpcode;

    public static ValueTask<RequestOutcome<TResponse>> TryRequestAsync<TResponse>(
        this ITransportSession client,
        IPacket request,
        RequestOptions? options = null,
        Func<TResponse, bool>? predicate = null,
        CancellationToken ct = default)
        where TResponse : class, IPacket, IPacketStaticOpcode;
}
```

- **Sequence Correlation**: If `request.SequenceId == 0`, `RequestAsync` stamps the next non-zero sequence number from the session (`client.NextSequenceId()`) and awaits `TResponse` matching `SequenceId` via `PacketAwaiter.AwaitAsync`.
- **Automatic Timeout Retry**: When `options.RetryCount > 0`, `RequestAsync` retries immediately upon `TimeoutException` up to `options.RetryCount` additional attempts (each attempt waits up to `options.TimeoutMs`).
- **Exception-Free `TryRequestAsync`**: Catches `NetworkException` (returning `RequestOutcomeKind.NotConnected` when `!client.IsConnected`, or `RequestOutcomeKind.Failed` otherwise) and `TimeoutException` (returning `RequestOutcomeKind.TimedOut`), while rethrowing `OperationCanceledException` when `ct` is canceled.

```csharp
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

RequestOutcome<InventoryResponse> outcome = await session.TryRequestAsync<InventoryResponse>(
    new GetInventoryPacket { CharacterId = 42 },
    RequestOptions.Default.WithTimeout(3_000).WithRetry(2).WithEncrypt());

if (outcome.Kind == RequestOutcomeKind.Ok)
{
    Console.WriteLine($"Loaded {outcome.Value!.Items.Count} items.");
}
else
{
    Console.WriteLine($"Request failed ({outcome.Kind}): {outcome.Error?.Message}");
}
```

## 2. Server-to-Client Streaming (`StreamExtensions` & `HeaderStreamExtensions`)

### Single-Type Async Stream (`StreamExtensions`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class StreamExtensions
{
    public static IAsyncEnumerable<TResponse> StreamAsync<TResponse>(
        this ITransportSession client,
        IPacket request,
        RequestOptions? options = null,
        [EnumeratorCancellation] CancellationToken ct = default,
        int inactivityTimeoutMs = 0)
        where TResponse : class, IPacket, IPacketStaticOpcode, IPacketStreamable;

    public static Task<List<TResponse>> CollectStreamAsync<TResponse>(
        this ITransportSession client,
        Func<IPacket> requestFactory,
        int timeoutMs = 9_000,
        int maxAttempts = 2,
        CancellationToken ct = default,
        RequestOptions? options = null)
        where TResponse : class, IPacket, IPacketStaticOpcode, IPacketStreamable;

    public static Task<List<TResponse>> CollectStreamAsync<TResponse, TKey>(
        this ITransportSession client,
        Func<IPacket> requestFactory,
        Func<TResponse, TKey> keySelector,
        int timeoutMs = 9_000,
        int maxAttempts = 2,
        CancellationToken ct = default,
        RequestOptions? options = null)
        where TResponse : class, IPacket, IPacketStaticOpcode, IPacketStreamable;

    public static Task StreamIntoAsync<TResponse, TKey>(
        this ITransportSession client,
        Func<IPacket> requestFactory,
        List<TResponse> target,
        Func<TResponse, TKey> keySelector,
        Action onBatch,
        int batchCount = 10,
        int batchMs = 100,
        int timeoutMs = 9_000,
        int maxAttempts = 2,
        CancellationToken ct = default,
        RequestOptions? options = null)
        where TResponse : class, IPacket, IPacketStaticOpcode, IPacketStreamable;
}
```

`StreamAsync<TResponse>` sends `request`, yields each correlated `TResponse` packet (`IPacketStreamable`) as it arrives, enforces an optional per-chunk inactivity timer (`inactivityTimeoutMs`), and terminates cleanly when `packet.IsEndOfStream == true`.

### Header + Multi-Stream Demultiplexing (`HeaderStreamExtensions`)

`RequestWithStreamAsync` has 3 overloads returning `Task<(THeader Header, List<T1> Items1)>`, `Task<(THeader Header, List<T1> Items1, List<T2> Items2)>`, and `Task<(THeader Header, List<T1> Items1, List<T2> Items2, List<T3> Items3)>`. Each overload awaits an initial `THeader` packet and collects `1`, `2`, or `3` concurrent `IPacketStreamable` item lists (filtered by `isItem1Valid`, `isItem2Valid`, `isItem3Valid`) until each stream reaches `IsEndOfStream == true`.

## 3. Push Subscriptions via Channels & `IObservable<T>` (`ChannelExtensions` & `ObservableExtensions`)

```csharp
// 1. Bounded or unbounded System.Threading.Channels reader
ChannelReader<WorldStatePacket> reader = session.SubscribeChannel<WorldStatePacket>(
    boundedCapacity: 64,
    fullMode: BoundedChannelFullMode.DropOldest,
    ct: ct);

await foreach (WorldStatePacket update in reader.ReadAllAsync(ct))
{
    RenderWorld(update);
}

// 2. Reactive IObservable<TEvent>
using IDisposable rxSub = session
    .AsObservable<ChatBroadcastPacket>()
    .Subscribe(pkt => Console.WriteLine($"{pkt.Sender}: {pkt.Message}"));
```

## 4. Source-Generated RPC Client Proxies (`RpcExtensions`, `RpcCall<T>`, `RpcStream<T>`)

When a shared `[RpcService]` interface is compiled with `Nalix.Analyzers.Generators` (`RpcClientGenerator`), the source generator emits a `<Service>_RpcClient` implementation and a `[ModuleInitializer]` that calls `RpcExtensions.RegisterFactory(typeof(T), session => new <Service>_RpcClient(session))`. `CreateRpcClient<T>` resolves the registered factory for `session`:

```csharp
namespace Nalix.SDK.Transport.Rpc;

public readonly struct RpcCall<TResponse>
    where TResponse : class, IPacket, IPacketStaticOpcode
{
    public RpcCall(ITransportSession session, IPacket request, RequestOptions? options = null);
    public ValueTask<TResponse> GetResponseAsync();
    public ValueTaskAwaiter<TResponse> GetAwaiter();
}

public readonly struct RpcStream<TResponse>
    where TResponse : class, IPacket, IPacketStaticOpcode, IPacketStreamable
{
    public RpcStream(ITransportSession session, IPacket request, RequestOptions? options = null);
    public IAsyncEnumerable<TResponse> GetStreamAsync();
    public IAsyncEnumerator<TResponse> GetAsyncEnumerator();
}
```

```csharp
using Nalix.SDK.Transport.Extensions;

IGameService rpc = session.CreateRpcClient<IGameService>();
PlayerProfile profile = await rpc.GetProfileAsync(new GetProfileRequest { PlayerId = 1001 });
```

## 5. Mid-Session Key Rotation (`RekeyExtensions.RekeyAsync`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class RekeyExtensions
{
    public static ValueTask RekeyAsync(
        this ITransportSession session,
        CancellationToken ct = default);
}
```

`RekeyAsync` requires an active `session.State.Secret`. It derives a new 32-byte key via `HandshakeX25519.DeriveRekeySecret(session.State.Secret.AsSpan())`, sends a `Control(ControlType.SESSION_REKEY, seqId, PacketFlags.SYSTEM, ProtocolReason.NONE)` frame, updates `session.State.Secret = newKey` and calls `session.ResetSequenceCounters()`, and awaits `Control(ControlType.SESSION_REKEY_ACK, SequenceId == seqId)` (rolling back to `previousKey` on failure).

## Related APIs

- [Transport Session](./transport-session.md)
- [Handshake Extensions](./handshake-extensions.md)
- [Resume Extensions](./resume-extensions.md)
- [Cipher Extensions](./cipher-extensions.md)
- [Request Options & RequestOutcome&lt;T&gt;](../options/sdk/request-options.md)
