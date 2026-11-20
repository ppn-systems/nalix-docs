---
title: Request Options và RequestOutcome
description: Tham chiếu cho RequestOptions, RequestOutcome<T> và RequestOutcomeKind trong Nalix.SDK.Options — timeout, retry và ghi đè mã hóa cho từng yêu cầu, cùng các kết quả không ném ngoại lệ.
section: API Reference
package: Nalix.SDK
---

**Không gian tên:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`RequestOptions` (`public sealed record RequestOptions`) cấu hình timeout, retry, thời hạn tổng, độ trễ retry và hành vi mã hóa khung cho từng lệnh gọi `RequestAsync<TResponse>`, `TryRequestAsync<TResponse>`, `StreamAsync`, `RequestWithStreamAsync` và `CreateRpcClient<T>`. `RequestOutcome<T>` (`public readonly struct RequestOutcome<T>`) và `RequestOutcomeKind` biểu diễn kết quả không ném ngoại lệ được trả về bởi `TryRequestAsync<TResponse>`.

## Ánh xạ mã nguồn

- `src/Nalix.SDK/Options/RequestOptions.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`
- `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`
- `src/Nalix.SDK/Options/TransportOptions.cs`

## 1. Tham chiếu `RequestOptions`

```csharp
namespace Nalix.SDK.Options;

public sealed record RequestOptions
{
    public const int DefaultTimeoutMs = 5_000;
    public static RequestOptions Default { get; } = new();

    public int TimeoutMs { get; init; } = DefaultTimeoutMs;
    public int RetryCount { get; init; }
    public int DeadlineMs { get; init; }
    public int RetryDelayMs { get; init; }
    public bool? Encrypt { get; init; }

    public void Validate();

    public RequestOptions WithTimeout(int ms);
    public RequestOptions WithRetry(int count);
    public RequestOptions WithDeadline(int ms);
    public RequestOptions WithRetryDelay(int ms);
    public RequestOptions WithEncrypt(bool? encrypt = true);
}
```

### Thuộc tính và giá trị mặc định

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Tác động khi chạy |
| :--- | :--- | ---: | :--- | :--- |
| `TimeoutMs` | `int` | `5_000` (`5s`) | `>= 0` (`ArgumentOutOfRangeException`) | Số mili giây chờ phản hồi cho mỗi lần thử (`0` chờ vô thời hạn). |
| `RetryCount` | `int` | `0` | `>= 0` (`ArgumentOutOfRangeException`) | Số lần thử bổ sung ngay sau một `TimeoutException` (`0` = một lần thử duy nhất; tổng ngân sách tối đa là `TimeoutMs * (RetryCount + 1)`). |
| `DeadlineMs` | `int` | `0` (không có) | `>= 0` (`ArgumentOutOfRangeException`) | Tổng ngân sách tính bằng mili giây cho toàn bộ lệnh gọi: chờ kết nối lại, mọi lần thử và mọi độ trễ retry. Mỗi lần thử chờ tối đa `min(TimeoutMs, time left)`; không có lần thử nào bắt đầu khi ngân sách đã hết. |
| `RetryDelayMs` | `int` | `0` (ngay lập tức) | `>= 0` (`ArgumentOutOfRangeException`) | Độ trễ cơ sở tính bằng mili giây trước một lần retry. Tăng gấp đôi sau mỗi lần retry tiếp theo với jitter ±20% và không bao giờ vượt quá `DeadlineMs`. |
| `Encrypt` | `bool?` | `null` | — | `true` luôn mã hóa (yêu cầu bắt tay đã hoàn tất); `false` không bao giờ mã hóa (ví dụ khi transport được bọc trong TLS); `null` theo `TransportOptions.EncryptRequestsByDefault` (khi giá trị đó là `true` thì yêu cầu theo trạng thái mã hóa của phiên, nếu không thì không được mã hóa). Áp dụng cho mọi `ITransportSession` (`TcpSession`, `DatagramSession` hoặc `WebSocketSession`); `DatagramSession` bỏ qua tùy chọn này vì mọi datagram đều đã được niêm phong. |

:::warning[Tính idempotent và Retry]
Cấu hình `RetryCount > 0` chỉ an toàn cho các yêu cầu **idempotent** (được đánh dấu bằng `[PacketIdempotent]`). Việc client hết thời gian chờ không chứng minh được rằng server chưa nhận hoặc chưa thực thi lần thử trước đó.
:::

:::note[Ngữ nghĩa retry]
Chỉ `TimeoutException` mới kích hoạt retry; kết nối bị rớt hoặc lỗi gửi được ném ra ngay. Khi phiên chưa kết nối nhưng `AutoReconnectEnabled` được bật (hoặc một lần kết nối lại đang chạy), yêu cầu trước tiên chờ `ReconnectSupervisor` sẵn sàng trong phần ngân sách còn lại của lần thử (nếu không sẽ ném `NetworkException`).
:::

## 2. Tham chiếu `RequestOutcome<T>` và `RequestOutcomeKind`

```csharp
namespace Nalix.SDK.Options;

public enum RequestOutcomeKind
{
    Ok,
    NotConnected,
    TimedOut,
    Failed
}

public readonly struct RequestOutcome<T>
{
    public RequestOutcomeKind Kind { get; }
    public T? Value { get; }
    public Exception? Error { get; }

    public static RequestOutcome<T> Ok(T value);
    public static RequestOutcome<T> Fail(RequestOutcomeKind kind, Exception error);
}
```

| `RequestOutcomeKind` | `Value` | `Error` | Điều kiện kích hoạt trong `TryRequestAsync<T>` |
| :--- | :--- | :--- | :--- |
| `Ok` | Instance phản hồi `T` | `null` | Gói tin `TResponse` tương ứng đã đến và vượt qua `predicate` tùy chọn (nếu có). |
| `NotConnected` | `default` | `NetworkException` | Phiên đã bị ngắt (`!client.IsConnected`) khi yêu cầu thất bại. |
| `TimedOut` | `default` | `TimeoutException` | Tất cả `RetryCount + 1` lần thử đều hết thời gian chờ mà không có phản hồi khớp. |
| `Failed` | `default` | `NetworkException` | Việc gửi khung hoặc thao tác giao thức thất bại trong khi vẫn đang kết nối. |

## Ví dụ sử dụng

```csharp
using System;
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

RequestOptions options = RequestOptions.Default
    .WithTimeout(3_000)
    .WithRetry(2)
    .WithRetryDelay(200)
    .WithDeadline(10_000)
    .WithEncrypt();

RequestOutcome<PingReplyPacket> result = await session.TryRequestAsync<PingReplyPacket>(
    new PingRequestPacket(),
    options);

if (result.Kind == RequestOutcomeKind.Ok)
{
    Console.WriteLine($"Reply received: {result.Value}");
}
else
{
    Console.WriteLine($"Failed ({result.Kind}): {result.Error?.Message}");
}
```

## API liên quan

- [Session Extensions (RequestAsync, TryRequestAsync)](../../sdk/tcp-session-extensions.md)
- [Tùy chọn Transport](./transport-options.md)
- [Tùy chọn WebSocket Transport](./websocket-transport-options.md)
