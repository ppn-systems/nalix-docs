# 📦 Nalix.Logging

Structured logging, log targets, and a shared `ILogger` implementation.

### 🔧 Logging bootstrap
Register the logger once to keep all subsystems consistent.

**Responsibilities**
- Provide a shared `ILogger`.
- Keep the same logger instance across SDK and listener code.

**Key Components**
- `NLogix`
- `NLogix.Host`
- `ILogger`

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
```

### 🔧 Options and targets
Options describe log level, formatting, and targets.

**Responsibilities**
- Configure log output.
- Register custom targets.

**Key Components**
- `NLogixOptions`
- `FileLogOptions`
- `ILoggerTarget`

```csharp
NLogixOptions options = new();
ILoggerTarget target = /* your target */;
options.RegisterTarget(target);
```

!!! warning "Dispose with care"
    Dispose log options only after all targets are registered and stable.
