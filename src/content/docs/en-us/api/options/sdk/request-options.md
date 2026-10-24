---
title: Request Options & RequestOutcome
description: Reference for RequestOptions, RequestOutcome<T>, and RequestOutcomeKind in Nalix.SDK.Options — per-request timeout, retry, encryption overrides, and non-throwing outcomes.
section: API Reference
package: Nalix.SDK
---

**Namespace:** `Nalix.SDK.Options`  
**Assembly:** `Nalix.SDK`

`RequestOptions` (`public sealed record RequestOptions`) configures per-call timeout, retry, and frame encryption behavior for `RequestAsync<TResponse>`, `TryRequestAsync<TResponse>`, `StreamAsync`, `RequestWithStreamAsync`, and `CreateRpcClient<T>`. `RequestOutcome<T>` (`public readonly struct RequestOutcome<T>`) and `RequestOutcomeKind` represent the non-throwing result returned by `TryRequestAsync<TResponse>`.

## Source Mapping

- `src/Nalix.SDK/Options/RequestOptions.cs`
- `src/Nalix.SDK/Options/RequestOutcome.cs`
- `src/Nalix.SDK/Transport/Extensions/RequestExtensions.cs`

## 1. `RequestOptions` Reference

```csharp
namespace Nalix.SDK.Options;

public sealed record RequestOptions
{
    public const int DefaultTimeoutMs = 5_000;
    public static RequestOptions Default { get; } = new();

    public int TimeoutMs { get; init; } = DefaultTimeoutMs;
    public int RetryCount { get; init; }
    public bool Encrypt { get; init; }

    public void Validate();

    public RequestOptions WithTimeout(int ms);
    public RequestOptions WithRetry(int count);
    public RequestOptions WithEncrypt(bool encrypt = true);
}
```

### Properties & Defaults

| Property | Type | Default | Validation | Runtime Effect |
| :--- | :--- | ---: | :--- | :--- |
| `TimeoutMs` | `int` | `5_000` (`5s`) | `>= 0` (`ArgumentOutOfRangeException`) | Milliseconds to wait for a response on each attempt (`0` waits indefinitely). |
| `RetryCount` | `int` | `0` | `>= 0` (`ArgumentOutOfRangeException`) | Number of additional attempts immediately following a `TimeoutException` (`0` = single attempt; total budget is at most `TimeoutMs * (RetryCount + 1)`). |
| `Encrypt` | `bool` | `false` | — | When `true`, forces outbound frame encryption (`client.SendAsync(request, encrypt: true, ct)`) across any `ITransportSession` (`TcpSession`, `UdpSession`, or `WebSocketSession`). |

:::warning[Idempotency & Retries]
Configuring `RetryCount > 0` is safe only for **idempotent** requests (annotated with `[PacketIdempotent]`). A client-side timeout does not prove the server did not receive or execute the previous attempt.
:::

## 2. `RequestOutcome<T>` & `RequestOutcomeKind` Reference

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

| `RequestOutcomeKind` | `Value` | `Error` | Trigger Condition in `TryRequestAsync<T>` |
| :--- | :--- | :--- | :--- |
| `Ok` | Response instance `T` | `null` | Correlated `TResponse` packet arrived and passed optional `predicate`. |
| `NotConnected` | `default` | `NetworkException` | Session was disconnected (`!client.IsConnected`) when the request failed. |
| `TimedOut` | `default` | `TimeoutException` | All `RetryCount + 1` attempts timed out without a matching response. |
| `Failed` | `default` | `NetworkException` | Frame transmission or protocol operation failed while connected. |

## Usage Example

```csharp
using System;
using Nalix.SDK.Options;
using Nalix.SDK.Transport.Extensions;

RequestOptions options = RequestOptions.Default
    .WithTimeout(3_000)
    .WithRetry(2)
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

## Related APIs

- [Session Extensions (RequestAsync, TryRequestAsync)](../../sdk/tcp-session-extensions.md)
- [Transport Options](./transport-options.md)
- [WebSocket Transport Options](./websocket-transport-options.md)
