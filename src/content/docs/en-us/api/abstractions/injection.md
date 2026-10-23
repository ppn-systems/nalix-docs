---
title: Injection Attributes
description: Compile-time dependency injection attributes and scoped resolution contracts in Nalix.Abstractions.Injection ([Injectable], [Inject], [FromScope], IPacketScope).
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Injection`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Injection` defines the attributes and scoped container contract used by `InstanceGenerator` and `PacketHandlerGenerator` to wire dependencies at compile time without reflection.

## Source Mapping

- `src/Nalix.Abstractions/Injection/InjectableAttribute.cs`
- `src/Nalix.Abstractions/Injection/InjectAttribute.cs`
- `src/Nalix.Abstractions/Injection/FromScopeAttribute.cs`
- `src/Nalix.Abstractions/Injection/IPacketScope.cs`

## Types Reference

### 1. `[Injectable]` (`InjectableAttribute`)

Marks a concrete class for compile-time activator generation by `InstanceGenerator`.

- **Targets:** `AttributeTargets.Class` (`AllowMultiple = true`, `Inherited = false`)
- **Constructors:**
  - `InjectableAttribute()` — Registers the activator for the concrete class.
  - `InjectableAttribute(Type serviceType)` — Also maps `serviceType` (an interface or base class) to the concrete class via `InstanceManager.RegisterServiceMapping<TService, TImpl>()` (`ArgumentNullException.ThrowIfNull(serviceType)`).
- **Property:** `Type? ServiceType { get; }`

### 2. `[Inject]` (`InjectAttribute`)

Marks a field or property for automatic compile-time dependency injection by `PacketHandlerGenerator`:

- **Targets:** `AttributeTargets.Field | AttributeTargets.Property` (`AllowMultiple = false`, `Inherited = false`)
- **Behavior:** On a `partial` `[PacketHandler]` controller class, `PacketHandlerGenerator` emits `<Controller>_Inject.g.cs` with `internal static void __InitializeDependencies()`, resolving each `[Inject]` member from `InstanceManager.Instance.GetExistingInstance<T>()!`.
- **Restrictions:** `[Inject]` fields cannot be `readonly` (enforced by `NALIX104`), and properties must have an accessible setter.

### 3. `[FromScope]` (`FromScopeAttribute`) & `IPacketScope`

Used for per-packet scoped dependency injection inside `[PacketOpcode]` handler methods:

- **`[FromScope]` Target:** `AttributeTargets.Parameter` (`AllowMultiple = false`, `Inherited = false`)
- Every parameter at index `>= 1` on a `[PacketOpcode]` handler method must be a reference type decorated with `[FromScope]` (enforced by `NALIX067`).
- **`IPacketScope : IDisposable, IAsyncDisposable`**:
  - `IConnection Connection { get; }` — The connection that owns the packet currently being processed in this scope.
  - `T GetRequiredService<T>() where T : class` — Resolves a required service from the current packet scope (used by `PacketHandlerGenerator` for non-nullable `[FromScope] T` parameters; throws `InvalidOperationException` if not registered).
  - `T? GetService<T>() where T : class` — Resolves an optional service from the current packet scope (used by `PacketHandlerGenerator` for nullable `[FromScope] T?` parameters; returns `null` if not registered).
  - `T GetOrAdd<T>(Func<T> factory) where T : class` — Gets or creates a value cached for the lifetime of this packet scope, keyed by `typeof(T)`.
  - `T GetOrAdd<T>(object key, Func<T> factory) where T : class` — Gets or creates a value cached for the lifetime of this packet scope, keyed by `key`.
  - `void RegisterForDisposal(IDisposable disposable)` — Registers an `IDisposable` instance to be disposed when the packet scope completes.
  - `void RegisterForDisposal(IAsyncDisposable asyncDisposable)` — Registers an `IAsyncDisposable` instance to be disposed asynchronously when the packet scope completes.

## Example

```csharp
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;

[Injectable(typeof(IAuditService))]
public sealed class AuditService : IAuditService
{
    private readonly ILogger? _logger;

    public AuditService(ILogger? logger = null) => _logger = logger;

    public void Record(ulong connectionId) => _logger?.LogInformation("Audited {Id}", connectionId);
}

[PacketHandler("AuditController")]
public sealed partial class AuditController
{
    [Inject]
    private IAuditService? _audit;

    [PacketOpcode(0x1010)]
    public void HandleAction(
        IPacketContext<ActionPacket> context,
        [FromScope] IRequestTraceScope traceScope)
    {
        _audit?.Record(context.Connection.ConnectionId);
        traceScope.MarkCompleted();
    }
}
```

## Related APIs

- [Instance Generator](../analyzers/autogen/instance-generator.md)
- [Packet Handler Generator](../analyzers/autogen/packet-handler-generator.md)
- [Instance Manager](../framework/instance-manager.md)
- [Network Application Builder (RegisterScoped)](../hosting/network-application.md)
