---
title: Hosting Options
description: Configuration reference for HostingOptions and Bootstrap initialization in Nalix.Hosting — startup diagnostics, ThreadPool minimums, global exception handling, and 1ms Windows timer precision.
section: API Reference
package: Nalix.Hosting
---

**Namespace:** `Nalix.Hosting.Options`  
**Assembly:** `Nalix.Hosting`

`HostingOptions` configures server bootstrap behavior (`Bootstrap.Initialize()`), console startup diagnostics, .NET `ThreadPool` minimum thread floors, global unhandled exception logging, and Windows 1ms timer resolution (`timeBeginPeriod(1)`).

## Source Mapping

- `src/Nalix.Hosting/Options/HostingOptions.cs`
- `src/Nalix.Hosting/Bootstrap.cs`
- `src/Nalix.Hosting/Internal/DiagnosticChannel.cs`

## Bootstrap Lifecycle (`Bootstrap.Initialize()`)

`Nalix.Hosting` invokes `Bootstrap.Initialize()` automatically via a `[ModuleInitializer]` when the assembly is loaded:

1. **Dedicated Server Config Path**: Calls `ConfigurationManager.Instance.SetConfigFilePath(Path.Combine(Directories.ConfigurationDirectory, "server.ini"))` so server settings are isolated in `server.ini` (avoiding collisions with client `default.ini`).
2. **Option Materialization**: Touches all framework, codec, network, runtime, and hosting option classes via `ConfigurationManager.Instance.Get<TOptions>()` and calls `ConfigurationManager.Instance.Flush()` so a complete `server.ini` template is written to disk.
3. **ThreadPool Tuning**: Applies `MinWorkerThreads` and/or `MinCompletionPortThreads` via `ThreadPool.SetMinThreads(...)` when either property is `> 0`.
4. **Global Exception Handlers**: When `EnableGlobalExceptionHandling` is `true`, subscribes to `AppDomain.CurrentDomain.UnhandledException` (logging critical failures and flushing `ConfigurationManager` if terminating) and `TaskScheduler.UnobservedTaskException` (logging and calling `e.SetObserved()`).
5. **High-Precision Windows Timer**: When `EnableHighPrecisionTimer` is `true` on Windows, calls `winmm.dll` `timeBeginPeriod(1)` to raise OS timer resolution to `1 ms`.
6. **Interactive Startup Banner**: When `Environment.UserInteractive && !DisableStartupBanner`, prints the Nalix startup banner, runtime metadata (`Version`, `PID`, `OS`, `Arch`, `Runtime`, `Config`, `GC Mode`, `Timer`, `Processors`, `Local IP`, `Public IP` from `NALIX_PUBLIC_IP`), and emits a warning if Workstation GC is active instead of Server GC.

## Properties and Defaults

| Property | Type | Default | Validation | Description |
| :--- | :--- | ---: | :--- | :--- |
| `DisableConsoleClear` | `bool` | `false` | None | If `true`, prevents `Console.Clear()` before printing the startup banner (also skipped automatically when console output is redirected). |
| `DisableStartupBanner` | `bool` | `false` | None | If `true`, suppresses the ASCII banner and `[INIT]` diagnostic table on startup. |
| `MinWorkerThreads` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Minimum `ThreadPool` worker threads (`0` keeps the OS/.NET default; recommended: `ProcessorCount * 2`). |
| `MinCompletionPortThreads` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Minimum `ThreadPool` I/O completion port (IOCP) threads (`0` keeps the OS/.NET default). |
| `EnableGlobalExceptionHandling` | `bool` | `true` | None | Registers `UnhandledException` and `UnobservedTaskException` handlers during bootstrap. |
| `EnableHighPrecisionTimer` | `bool` | `true` | None | Calls `timeBeginPeriod(1)` on Windows for 1ms timer resolution (automatically paired with `timeEndPeriod(1)` on process exit). |

`Validate()` executes `this.ValidateDataAnnotations()`.

## Process Exit Cleanup (`Bootstrap.OnProcessExit`)

`Bootstrap` subscribes to `Console.CancelKeyPress` and `AppDomain.CurrentDomain.ProcessExit`. On process shutdown it:
1. Cancels all running background workers via `InstanceManager.Instance.GetExistingInstance<TaskManager>()?.CancelAllWorkers()`.
2. Flushes pending configuration changes via `ConfigurationManager.Instance.Flush()`.
3. Disposes `InstanceManager.Instance` (which disposes registered services such as `ConnectionGuard`, flushing the progressive ban database to disk).
4. Calls `timeEndPeriod(1)` on Windows if `timeBeginPeriod(1)` was enabled.
5. Disposes the `DiagnosticChannel`.

## INI Configuration (`server.ini`)

```ini
[Hosting]
; Hosting configuration — controls startup diagnostics, console behavior, and lifecycle settings
DisableConsoleClear = false
DisableStartupBanner = false
MinWorkerThreads = 0
MinCompletionPortThreads = 0
EnableGlobalExceptionHandling = true
EnableHighPrecisionTimer = true
```

## Related APIs

- [Network Application](../../hosting/network-application.md)
- [Configuration System](../../environment/configuration.md)
- [Task Manager](../../framework/task-manager.md)
