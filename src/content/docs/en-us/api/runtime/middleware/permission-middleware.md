---
title: Permission Middleware
description: Reference for Nalix.Runtime.Middleware.Standard.PermissionMiddleware — fail-closed inbound authorization guard enforcing [PacketPermission].
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Middleware.Standard`  
**Assembly:** `Nalix.Runtime`

`PermissionMiddleware` (`[MiddlewareOrder(-50)] [MiddlewareStage(MiddlewareStage.Inbound)] public class PermissionMiddleware : IPacketMiddleware<IPacket>`) is the built-in fail-closed authorization gate in `Nalix.Runtime`. It runs at order `-50` before rate-limiting and timeout middleware.

## Source Mapping

- `src/Nalix.Runtime/Middleware/Standard/PermissionMiddleware.cs`
- `src/Nalix.Abstractions/Networking/Packets/PacketPermissionAttribute.cs`
- `src/Nalix.Abstractions/Security/PermissionLevel.cs`
- `src/Nalix.Runtime/Internal/RateLimiting/DirectiveGuard.cs`
- `src/Nalix.Codec/ProtocolFrames/Directive.cs`

## Authorization Rule (`IsAuthorized`)

`PermissionMiddleware` uses a **fail-closed** security posture (`SEC-37`):

1. If `context.Attributes.Permission` is `null` (the handler method is missing `[PacketPermission]`), the request is **denied**.
2. Otherwise, it evaluates `context.Attributes.Permission.Evaluation`:
   - **`PermissionEvaluation.MinimumLevel` (default)**: Allowed when `context.Connection.Level >= policy.Level`.
   - **`PermissionEvaluation.StrictMatch`**: Allowed when `context.Connection.Level == policy.Level`.

:::important[Note on Terminal Handler Policy Enforcement]
In addition to `PermissionMiddleware`, `PacketDispatchOptions<TPacket>.ExecuteTerminalHandler` also checks `descriptor.CanExecute(context, out denyReason)` (which validates `[PacketEncryption]` and `[PacketPermission]` when the attribute is present). Using `PermissionMiddleware` at `Order = -50` adds **fail-closed** enforcement when `[PacketPermission]` is omitted and rejects unauthorized traffic before downstream middleware runs.
:::

## Execution Flow

```mermaid
flowchart TD
    A["InvokeAsync(context, next)"] --> B{"context.Attributes.Permission is not null && IsAuthorized(...)?"}
    B -->|Yes| C["Forward to next(context.CancellationToken) (Zero-Alloc Sync Fast Path)"]
    B -->|No| D["context.Connection.IncrementErrorCount()"]
    D --> E{"DirectiveGuard.TryAcquire(InboundDirectiveUnauthorizedLastSentAtMs)?"}
    E -->|No (Suppressed)| F["Return without sending duplicate Directive"]
    E -->|Yes| G["Rent Directive via PacketFactory<Directive>.Acquire()"]
    G --> H["Initialize(FAIL, UNAUTHORIZED, NONE, seqId, NONE, 0, 0, arg2: OpCode)"]
    H --> I["await context.Sender.SendAsync(directive)"]
```

## Denial Directive Format

When a packet is denied and `DirectiveGuard` permits sending (based on `RuntimeConnectionState.InboundDirectiveUnauthorizedLastSentAtMs` and `DirectiveGuardOptions.DefaultCooldownMs`), `PermissionMiddleware` rents a pooled `Directive` (`0x0008`, 21 bytes) with:

| Field | Value |
| :--- | :--- |
| `Type` | `ControlType.FAIL` |
| `Reason` | `ProtocolReason.UNAUTHORIZED` |
| `Action` | `ProtocolAdvice.NONE` |
| `SequenceId` | `context.Packet.Header.SequenceId` |
| `Control` | `ControlFlags.NONE` |
| `Arg0` / `Arg1` | `0` |
| `Arg2` | `context.Packet.Header.OpCode` |

## Usage Example

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;
using Nalix.Runtime.Middleware.Standard;

// 1. Register PermissionMiddleware in PacketDispatchOptions
builder.ConfigureDispatch(options =>
{
    options.WithMiddleware(new PermissionMiddleware());
});

// 2. Annotate handlers with [PacketPermission]
[PacketHandler]
public sealed class AdminController
{
    [PacketOpcode(0x3001)]
    [PacketEncryption(true)]
    [PacketPermission(PermissionLevel.SYSTEM_ADMINISTRATOR, PermissionEvaluation.MinimumLevel)]
    public void ReloadConfig(IPacketContext<AdminReloadPacket> context)
    {
        // Only connections with Level >= SYSTEM_ADMINISTRATOR reach here
    }
}
```

## Related APIs

- [Middleware Pipeline](./pipeline.md)
- [Permission Levels](../../security/permission-level.md)
- [Directive Guard Options](../../options/network/directive-guard-options.md)
- [Built-in Frames (Directive)](../../codec/packets/built-in-frames.md)
