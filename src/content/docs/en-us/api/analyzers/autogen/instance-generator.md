---
title: Instance Generator
description: Incremental Roslyn source generator (InstanceGenerator) that emits compile-time constructor activation factories and service mappings for [Injectable] classes and SingletonBase<T> types.
section: API Reference
package: Nalix.Analyzers
---

`InstanceGenerator` (`analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`) is an incremental Roslyn source generator that emits compile-time constructor activation delegates and service mappings for `[Injectable]` classes and `SingletonBase<T>` subclasses.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## What It Does at Compile Time

1. **Discovers `[Injectable]` Services and `SingletonBase<T>` Subclasses**:
   - Scans every concrete class annotated with `[Injectable]` or `[Injectable(typeof(TService))]`.
   - Scans every concrete class inheriting from `SingletonBase<T>`.
2. **Validates & Compiles Accessible Constructors**:
   - For `[Injectable]` classes:
     - Collects all `public` and `internal` instance constructors. If none exist, reports error **`NALIX063`**.
     - Partitioning constructor parameters into `ConfigurationLoader` parameters (resolved automatically from `ConfigurationManager.Instance.Get<TConfig>()`) and caller-supplied runtime `object?[] args`, checks whether two constructors have the same non-config parameter count (`args.Length`) and overlapping parameter types. If so, reports error **`NALIX064`**.
     - Emits a `static args => switch (args.Length)` factory delegate supporting all accessible constructors.
   - For `SingletonBase<T>` classes:
     - Requires a `public` or `internal` parameterless constructor (`protected` alone is not accessible to the generated initializer); otherwise reports warning **`NALIX065`**.
3. **Emits `[ModuleInitializer]` Registration (`InstanceGenerated.Initialize()`)**:
   - Calls `InstanceManager.RegisterActivator<TImpl>(static args => ...)`
   - Calls `InstanceManager.RegisterServiceMapping<TService, TImpl>()` for each `[Injectable(typeof(TService))]` attribute
   - Calls `SingletonActivatorCache.Register<TSingleton>(static () => new TSingleton())` for `SingletonBase<T>` subclasses

## Example

```csharp
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Network.Options;

[Injectable(typeof(IMatchmakerService))]
public sealed class MatchmakerService : IMatchmakerService
{
    private readonly NetworkSocketOptions _socketOptions;
    private readonly ILogger? _logger;

    public MatchmakerService(NetworkSocketOptions socketOptions)
        : this(socketOptions, null)
    {
    }

    public MatchmakerService(NetworkSocketOptions socketOptions, ILogger? logger)
    {
        _socketOptions = socketOptions;
        _logger = logger;
    }
}
```

Generated initializer in `InstanceGenerated.g.cs`:

```csharp
[ModuleInitializer]
internal static void Initialize()
{
    InstanceManager.RegisterActivator<MatchmakerService>(static args =>
    {
        return args.Length switch
        {
            0 => new MatchmakerService(
                ConfigurationManager.Instance.Get<NetworkSocketOptions>()),
            1 => new MatchmakerService(
                ConfigurationManager.Instance.Get<NetworkSocketOptions>(),
                (ILogger)args[0]!),
            _ => throw new InvalidOperationException(
                $"No constructor on 'MatchmakerService' matches {args.Length} argument(s).")
        };
    });

    InstanceManager.RegisterServiceMapping<IMatchmakerService, MatchmakerService>();
}
```

## Diagnostics Emitted

| ID | Title | Severity | Cause |
| --- | --- | :---: | --- |
| `NALIX063` | No accessible constructor found | Error | `[Injectable]` class has no `public` or `internal` constructor. |
| `NALIX064` | Ambiguous constructors in injectable class | Error | `[Injectable]` class has multiple `public`/`internal` constructors with the same non-config parameter count and non-disjoint parameter types. |
| `NALIX065` | `SingletonBase` subclass missing accessible parameterless constructor | Warning | `SingletonBase<T>` subclass has no `public` or `internal` parameterless constructor. |

## Related APIs

- [Source Generators Overview](./index.md)
- [Instance Manager](../../framework/instance-manager.md)
- [SingletonBase](../../framework/singleton-base.md)
- [Dependency Injection Contracts](../../abstractions/injection.md)
