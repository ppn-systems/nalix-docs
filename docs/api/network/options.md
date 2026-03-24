# Network Options Reference

Condensed guide to the main configuration objects used by Nalix.Network. Load them via `ConfigurationManager` and validate before activation.

## NetworkSocketOptions
- `Port`, `Address`, `Backlog`, `MaxParallelAccepts`
- `EnableTimeout`, `KeepAlive`, `DualMode`, `ReuseAddress`
- Buffer sizes for send/receive

## PoolingOptions
- Controls pool sizes for `SocketAsyncEventArgs`, buffers, and context objects.
- Tune `MaxPoolSize`, `Preallocated`, `SegmentSize` for high connection churn.

## DispatchOptions
- `MiddlewareLimit`, `HandlerLimit`, `Timeout`
- `WorkerGroup` tags for task scheduling
- Hooks for metrics/reporting

## ConnectionLimitOptions
- Global caps: `MaxConnections`, `MaxConnectionsPerIP`
- Burst/penalty controls for abusive clients

## TimingWheelOptions
- Idle timeout wheel for automatic disconnects.
- `TickDuration`, `SlotCount`, `MaxTimeout` control resolution and memory use.

## TokenBucketOptions / PolicyRateLimiterOptions / ConcurrencyGateOptions
- Throttling primitives used by middleware:
  - Token bucket: `Capacity`, `RefillPerSecond`.
  - Policy rate: per-rule burst + sustain windows.
  - Concurrency gate: `MaxConcurrent`, optional queue length.

## How to apply
```csharp
NetworkSocketOptions sock = ConfigurationManager.Instance.Get<NetworkSocketOptions>();
sock.Validate();

PoolingOptions pools = ConfigurationManager.Instance.Get<PoolingOptions>();
DispatchOptions dispatch = ConfigurationManager.Instance.Get<DispatchOptions>();
```

Start with defaults, measure, then adjust `MaxParallelAccepts`, buffer sizes, and throttling limits based on real traffic.
