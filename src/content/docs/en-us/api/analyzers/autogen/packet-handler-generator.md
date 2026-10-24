---
title: Packet Handler Generator
description: Incremental Roslyn source generator (PacketHandlerGenerator) that compiles [PacketHandler] controllers into zero-reflection dispatch delegates and injects [Inject] and [FromScope] dependencies.
section: API Reference
package: Nalix.Analyzers
---

`PacketHandlerGenerator` (`analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`) is an incremental Roslyn source generator that compiles classes annotated with `[PacketHandler]` into zero-reflection `IPacketHandlerCompiler` implementations registered via `[ModuleInitializer]`.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## What It Does at Compile Time

1. **Controller Discovery**: Finds all concrete classes decorated with `[PacketHandler]` and inspects their `[PacketOpcode]` methods.
2. **Constructor & `[Inject]` Wiring**:
   - Selects the accessible (`public` or `internal`) constructor with the most parameters to instantiate the controller, resolving `ConfigurationLoader` parameters via `ConfigurationManager.Instance.Get<TParam>()` and service parameters via `InstanceManager.Instance.GetExistingInstance<TParam>()` (falling back to the parameter's default value or throwing `InvalidOperationException` if required).
   - If the controller declares fields or properties marked with `[Inject]` (which requires the controller class to be declared `partial`), emits `<Controller>_Inject.g.cs` containing `private void InitializeDependencies()` and invokes it inside the generated factory.
3. **Metadata Compilation**: Reads `[PacketOpcode]`, `[PacketTimeout]`, `[PacketPermission]`, `[PacketEncryption]`, `[PacketRateLimit]`, and `[PacketConcurrencyLimit]` on each handler method (with controller-level fallback) and constructs a `PacketMetadata` descriptor via `PacketMetadataBuilder`.
4. **Delegate Compilation**: Emits a strongly-typed invoker lambda that casts `IPacketContext<TPacket>` to `IPacketContext<TConcretePacket>`, resolves any `[FromScope]` parameters via `ctx.Scope.GetRequiredService<TParam>()` (or `ctx.Scope.GetService<TParam>()` when the parameter type is nullable `TParam?`), and invokes the handler without reflection or boxing.
5. **Module Initializer Registration**: Emits `PacketHandlersGenerated.Initialize()` (`[ModuleInitializer]`) calling `PacketHandlerRegistry.Register(typeof(TController), new TController_PacketHandlerCompiler())`.

## Supported Handler Signatures

Every `[PacketOpcode]` handler method must follow this parameter contract:

| Parameter Position | Required Type / Attribute | How It Is Supplied |
| --- | --- | --- |
| **Parameter `0`** (Required) | `IPacketContext<TPacket>` (where `TPacket : IPacket`) | Passed directly from the pooled runtime dispatch context (`context.Packet`, `context.Connection`, `context.Sender`, `context.Scope`, `context.CancellationToken`). |
| **Parameters `1..N`** (Optional) | Reference type `TService` (or `TService?`) annotated with `[FromScope]` | Non-nullable `TService` is resolved via `context.Scope.GetRequiredService<TService>()`; nullable `TService?` is resolved via `context.Scope.GetService<TService>()`. |

:::warning[Legacy `(TPacket packet, IConnection connection)` Signatures Removed]
Handler methods must always take `IPacketContext<TPacket>` as their first parameter. Methods with legacy signatures emit **`NALIX003`**, and extra parameters that are missing `[FromScope]` or are value types emit **`NALIX067`** and are dropped from the generated dispatch table.
:::

### Supported Return Types

- `void`
- `Task`
- `ValueTask`
- `TResult` (for example, returning a response `IPacket`, `string`, or `byte[]`)
- `Task<TResult>`
- `ValueTask<TResult>`
- `IAsyncEnumerable<TElement>` (server-to-client streaming responses)

## Example

```csharp
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;

[PacketHandler("AuthController")]
public sealed partial class AuthController
{
    [Inject]
    private ILogger? _logger;

    [PacketOpcode(0x1001)]
    [PacketPermission(PermissionLevel.NONE)]
    [PacketEncryption(true)]
    public ValueTask HandleLoginAsync(
        IPacketContext<LoginRequest> context,
        [FromScope] IUserSessionTracker tracker)
    {
        _logger?.LogInformation("Login from {Id}", context.Connection.ConnectionId);
        tracker.Track(context.Connection.ConnectionId);
        return context.Sender.ReplyAsync(new LoginResponse { Success = true });
    }
}
```

## Diagnostics Emitted

| ID | Title | Severity | Cause |
| --- | --- | :---: | --- |
| `NALIX003` | Packet controller handler has unsupported signature | Warning | Parameter `0` is missing or is not `IPacketContext<TPacket>`. |
| `NALIX067` | Handler method dropped from dispatch table | Error | A parameter at index `>= 1` is missing `[FromScope]` or is not a reference type. |
| `NALIX104` | `[Inject]` field cannot be `readonly` | Error | A field marked `[Inject]` is declared `readonly`. |

## Related APIs

- [Source Generators Overview](./index.md)
- [Diagnostic Codes](../diagnostic-codes.md)
- [Packet Attributes](../../abstractions/packet-attributes.md)
- [Dependency Injection Contracts](../../abstractions/injection.md)
