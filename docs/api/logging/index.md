# Logging

`Nalix.Logging` provides the built-in logger implementation used across the Nalix stack.

## Source mapping

- `src/Nalix.Logging/NLogix.cs`
- `src/Nalix.Logging/NLogix.Host.cs`
- `src/Nalix.Logging/NLogix.Extensions.cs`
- `src/Nalix.Logging/Engine/NLogixDistributor.cs`

## Main types

- `NLogix`
- `NLogix.Host`
- `NLogixOptions`
- `ILoggerTarget`

## What it does

- implements `ILogger`
- supports multiple targets
- allows programmatic configuration
- works well as the shared logger registered through `InstanceManager`

## Basic usage

```csharp
NLogix logger = NLogix.Host.Instance;

logger.Info("server-started");
logger.Warn("slow-handler");
logger.Error("dispatch-failed");
```

## Custom setup

```csharp
NLogix logger = new(cfg =>
{
    cfg.SetMinimumLevel(LogLevel.Debug)
       .RegisterTarget(new BatchConsoleLogTarget())
       .RegisterTarget(new BatchFileLogTarget());
});
```

## Typical integration

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
```

This is the usual pattern for server startup so listeners, dispatch, and framework services use the same logger instance.

## Notes

- keep one shared logger for the process when possible
- prefer registering targets during startup, not mid-flight
- use `NLogix.Host.Instance` unless you have a good reason to own a separate logger graph

## Related APIs

- [Configuration and DI](../framework/runtime/configuration.md)
- [Nalix.Logging](../../packages/nalix-logging.md)
