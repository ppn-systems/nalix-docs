---
title: Tiện ích phiên
description: "Tham chiếu cho các tiện ích ITransportSession trong Nalix.SDK.Transport.Extensions — RequestAsync, TryRequestAsync, StreamAsync, RequestWithStreamAsync, SubscribeChannel, AsObservable, CreateRpcClient và RekeyAsync."
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Transport.Extensions`  
**Assembly:** `Nalix.SDK`

Mọi tiện ích yêu cầu, truyền luồng, phản ứng, RPC và bảo mật cấp cao trong `Nalix.SDK` đều được cài đặt dưới dạng extension method trên **`ITransportSession`**, nghĩa là chúng hoạt động giống hệt nhau trên [TcpSession](./tcp-session.md), [UdpSession](./udp-session.md) và [WebSocketSession](./websocket-session.md).

## Ánh xạ mã nguồn

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

## Tổng quan các nhóm tiện ích

| Lớp tiện ích | Phương thức chính | Mục đích |
| :--- | :--- | :--- |
| `RequestExtensions` | `RequestAsync<TResponse>`, `TryRequestAsync<TResponse>` | Yêu cầu/phản hồi có tương quan (khớp `SequenceId`) với thử lại khi hết thời gian chờ và `RequestOutcome<TResponse>` không ném ngoại lệ. |
| `StreamExtensions` | `StreamAsync<TResponse>`, `CollectStreamAsync`, `StreamIntoAsync` | Truyền luồng bất đồng bộ từ máy chủ tới client (`IAsyncEnumerable<TResponse>` với `TResponse : IPacketStreamable`) được tương quan theo `SequenceId` của yêu cầu. |
| `HeaderStreamExtensions` | `RequestWithStreamAsync<THeader, T1..T3>` | Gói tiêu đề ban đầu được ghép kênh, theo sau bởi 1, 2 hoặc 3 danh sách mục `IPacketStreamable` có kiểu (`(THeader Header, List<T1> Items1, ...)`). |
| `ChannelExtensions` | `SubscribeChannel<TEvent>` | Đưa gói tin đẩy từ máy chủ vào `ChannelReader<TEvent>` có giới hạn hoặc không giới hạn. |
| `ObservableExtensions` | `AsObservable<TEvent>` | Cung cấp gói tin đẩy từ máy chủ dưới dạng `IObservable<TEvent>` nóng. |
| `RpcExtensions` | `CreateRpcClient<T>`, `RegisterFactory` | Khởi tạo proxy client được sinh từ source cho các interface `[RpcService]` (`Nalix.Analyzers.CodeGen`). |
| `RekeyExtensions` | `RekeyAsync` | Thực hiện xoay khóa giữa phiên (`HandshakeX25519.DeriveRekeySecret`, `ControlType.SESSION_REKEY` / `SESSION_REKEY_ACK`) và đặt lại bộ đếm sequence. |
| `ControlExtensions` | `SendControlAsync`, `NewControl`, `AwaitPacketAsync`, `AwaitControlAsync` | Gửi và chờ các gói `Control` lấy từ pool (`ControlBuilder`). |
| [HandshakeExtensions](./handshake-extensions.md) | `HandshakeAsync` | Trao đổi khóa ECDH X25519 kép có xác thực, khám phá TOFU và tự động giải Proof-of-Work. |
| [ResumeExtensions](./resume-extensions.md) | `ResumeSessionAsync`, `ConnectWithResumeAsync`, `ConnectWithResumeDetailedAsync` | Tiếp tục phiên 0-RTT với bằng chứng sở hữu `HmacKeccak256` và quay về handshake khi cần. |
| [CipherExtensions](./cipher-extensions.md) | `UpdateCipherAsync` | Chuyển đổi `CipherSuiteType` đối xứng khi đang chạy (`ControlType.CIPHER_UPDATE` / `CIPHER_UPDATE_ACK`). |
| [PingExtensions / DisconnectExtensions / TimeSyncExtensions](./control-utilities.md) | `PingAsync`, `DisconnectGracefullyAsync`, `SyncTimeAsync` | Đo RTT, ngắt kết nối có điều phối (`ControlType.DISCONNECT`) và đồng bộ đồng hồ EMA. |
| [TransportSessionSubscriptions](./subscriptions.md) | `On<TPacket>`, `OnExact<TPacket>`, `On(predicate, handler)`, `Subscribe` | Đăng ký sự kiện gói tin có kiểu mạnh và có lọc theo predicate. |

## 1. Yêu cầu / phản hồi có tương quan (`RequestExtensions`)

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

- **Tương quan theo Sequence**: Nếu `request.SequenceId == 0`, `RequestAsync` gán số sequence không bằng 0 tiếp theo từ phiên (`client.NextSequenceId()`) và chờ `TResponse` có `SequenceId` khớp qua `PacketAwaiter.AwaitAsync`.
- **Tự động thử lại khi hết thời gian chờ**: Khi `options.RetryCount > 0`, `RequestAsync` thử lại ngay khi gặp `TimeoutException`, tối đa `options.RetryCount` lần bổ sung (mỗi lần chờ tối đa `options.TimeoutMs`).
- **`TryRequestAsync` không ném ngoại lệ**: Bắt `NetworkException` (trả về `RequestOutcomeKind.NotConnected` khi `!client.IsConnected`, hoặc `RequestOutcomeKind.Failed` trong trường hợp khác) và `TimeoutException` (trả về `RequestOutcomeKind.TimedOut`), đồng thời ném lại `OperationCanceledException` khi `ct` bị hủy.

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

## 2. Truyền luồng từ máy chủ tới client (`StreamExtensions` & `HeaderStreamExtensions`)

### Luồng bất đồng bộ một kiểu (`StreamExtensions`)

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

`StreamAsync<TResponse>` gửi `request`, trả về từng gói `TResponse` (`IPacketStreamable`) được tương quan khi nhận được, áp dụng bộ hẹn giờ không hoạt động theo từng chunk (`inactivityTimeoutMs`, tùy chọn), và kết thúc gọn gàng khi `packet.IsEndOfStream == true`.

### Ghép kênh tiêu đề và nhiều luồng (`HeaderStreamExtensions`)

`RequestWithStreamAsync` có 3 overload, trả về `Task<(THeader Header, List<T1> Items1)>`, `Task<(THeader Header, List<T1> Items1, List<T2> Items2)>` và `Task<(THeader Header, List<T1> Items1, List<T2> Items2, List<T3> Items3)>`. Mỗi overload chờ một gói tiêu đề `THeader` ban đầu và thu thập `1`, `2` hoặc `3` danh sách mục `IPacketStreamable` chạy đồng thời (được lọc bởi `isItem1Valid`, `isItem2Valid`, `isItem3Valid`) cho đến khi mỗi luồng đạt `IsEndOfStream == true`.

:::caution[Các hàm thu thập tin tưởng máy chủ để kết thúc luồng]
`CollectStreamAsync` và `RequestWithStreamAsync` giữ mọi mục trong bộ nhớ cho đến khi máy chủ gửi `IsEndOfStream`; không có giới hạn số lượng mục. Chỉ thời gian chờ của mỗi lần thử mới giới hạn chúng, vì vậy một máy chủ liên tục truyền dữ liệu có thể làm bộ nhớ của client tăng trong suốt thời gian chờ (ở mỗi lần thử), và với `timeoutMs = 0` thì không có giới hạn nào. Các mục được thu thập bởi một lần thử bị hết thời gian chờ sẽ không được dispose, nên các gói lấy từ pool của lần thử đó không được trả về pool.

Với các máy chủ bạn không hoàn toàn tin cậy, hãy giữ `timeoutMs` hữu hạn, hoặc tự đọc trực tiếp `StreamAsync<TResponse>` và dừng (rồi dispose) khi đã đọc đủ số mục bạn mong đợi.
:::

## 3. Đăng ký đẩy qua Channel và `IObservable<T>` (`ChannelExtensions` & `ObservableExtensions`)

```csharp
// 1. ChannelReader của System.Threading.Channels có hoặc không có giới hạn
ChannelReader<WorldStatePacket> reader = session.SubscribeChannel<WorldStatePacket>(
    boundedCapacity: 64,
    fullMode: BoundedChannelFullMode.DropOldest,
    ct: ct);

await foreach (WorldStatePacket update in reader.ReadAllAsync(ct))
{
    RenderWorld(update);
}

// 2. IObservable<TEvent> theo kiểu reactive
using IDisposable rxSub = session
    .AsObservable<ChatBroadcastPacket>()
    .Subscribe(pkt => Console.WriteLine($"{pkt.Sender}: {pkt.Message}"));
```

## 4. Proxy client RPC được sinh từ source (`RpcExtensions`, `RpcCall<T>`, `RpcStream<T>`)

Khi một interface `[RpcService]` dùng chung được biên dịch cùng `Nalix.Analyzers.Generators` (`RpcClientGenerator`), source generator sẽ sinh ra một triển khai `<Service>_RpcClient` và một `[ModuleInitializer]` gọi `RpcExtensions.RegisterFactory(typeof(T), session => new <Service>_RpcClient(session))`. `CreateRpcClient<T>` tìm factory đã đăng ký cho `session`:

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

## 5. Xoay khóa giữa phiên (`RekeyExtensions.RekeyAsync`)

```csharp
namespace Nalix.SDK.Transport.Extensions;

public static class RekeyExtensions
{
    public static ValueTask RekeyAsync(
        this ITransportSession session,
        CancellationToken ct = default);
}
```

`RekeyAsync` yêu cầu `session.State.Secret` đang hoạt động. Nó dẫn xuất khóa 32 byte mới qua `HandshakeX25519.DeriveRekeySecret(session.State.Secret.AsSpan())`, gửi khung `Control(ControlType.SESSION_REKEY, seqId, PacketFlags.SYSTEM, ProtocolReason.NONE)`, cập nhật `session.State.Secret = newKey` và gọi `session.ResetSequenceCounters()`, rồi chờ `Control(ControlType.SESSION_REKEY_ACK, SequenceId == seqId)` (khôi phục về `previousKey` nếu thất bại).

## API liên quan

- [Transport Session](./transport-session.md)
- [Handshake Extensions](./handshake-extensions.md)
- [Resume Extensions](./resume-extensions.md)
- [Cipher Extensions](./cipher-extensions.md)
- [Request Options & RequestOutcome&lt;T&gt;](../options/sdk/request-options.md)
