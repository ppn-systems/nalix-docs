# Connection Limiter

`ConnectionLimiter` protects the TCP accept path by enforcing per-endpoint connection caps and rate windows.

## Source mapping

- `src/Nalix.Network/Throttling/ConnectionLimiter.cs`

## What it does

- tracks state per remote endpoint
- enforces concurrent connection caps
- enforces connection-attempt windows
- applies temporary bans
- schedules recurring cleanup

## Basic usage

```csharp
ConnectionLimitOptions options = ConfigurationManager.Instance.Get<ConnectionLimitOptions>();
options.Validate();

ConnectionLimiter limiter = new(options);

if (!limiter.IsConnectionAllowed(remoteEndPoint))
{
    return;
}
```

## Important integration detail

Always wire connection close events back into the limiter:

```csharp
connection.OnCloseEvent += limiter.OnConnectionClosed;
```

If you skip this, active connection counts can stay artificially high for an endpoint.

## Diagnostics

`GenerateReport()` includes:

- tracked endpoint count
- concurrent connection count
- rejection totals
- cleanup totals
- top endpoints by load

## Related APIs

- [TCP Listener](../network/runtime/tcp-listener.md)
- [Connection Hub](../network/connection/connection-hub.md)
