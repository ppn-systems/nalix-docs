# Nalix.Logging

`Nalix.Logging` provides a structured `ILogger` implementation plus configuration that ties logging directly into the Nalix diagnostics and lifecycle.

## Highlights

- `NLogix` inherits from `NLogixEngine` and exposes `ILogger` methods that sanitize log messages (`SanitizeLogMessage`) and call `Publish` on the engine layer.
- `NLogix.Host.Instance` is the default logger used in the SDK/Network examples; registering it via `InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance)` ensures every package can log without reconfiguring.
- `NLogixOptions` controls sink registration, JSON formatting, and level overrides. Extend the options during bootstrap to route logs to console, file, or custom distributors.
- `NLogixDistributor` and `NLogixEngine` handle batching, background flushes, and safe exception handling so logging stays reliable even under heavy load.

### Registration example

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
```

You only need to register the logger once before listeners or sessions start. The engine automatically integrates with configuration (via `NLogixOptions`) and exposes extension points in `Nalix.Logging.Extensions` for custom sinks.
