---
title: Nalix.Analyzers Code Fixes
description: Reference for all 16 Roslyn CodeFixProvider implementations in Nalix.Analyzers.CodeFixes and the 20 active diagnostic rules they resolve automatically.
section: API Reference
package: Nalix.Analyzers
---

`Nalix.Analyzers.CodeFixes` provides **16 Roslyn `CodeFixProvider` classes** that automate common mechanical fixes for **20 active diagnostic IDs** (plus retired `NALIX031`) emitted by `Nalix.Analyzers`.

## Source Mapping

All providers live under `analyzers/Nalix.Analyzers.CodeFixes/`:

| Provider Class | Fixed Diagnostics | Code Fix Action Title | Transformation |
| --- | --- | --- | --- |
| `PacketOpcodeCodeFixProvider` | `NALIX002` | `Add [PacketOpcode]` | Adds `[PacketOpcode(0x0000)]` to a handler method inside a `[PacketHandler]` controller. |
| `PacketHandlerCodeFixProvider` | `NALIX008` | `Add [PacketHandler]` | Adds `[PacketHandler]` to the containing controller class. |
| `PacketRegistryDeserializerCodeFixProvider` | `NALIX009` | `Implement IPacketDeserializer<T>` | Adds `IPacketDeserializer<ClassName>` to the base list and generates `public static new ClassName Deserialize(ReadOnlySpan<byte> buffer) => PacketBase<ClassName>.Deserialize(buffer);`. |
| `PacketSelfTypeCodeFixProvider` | `NALIX010`, `NALIX011` | `Use '{ClassName}' as type argument` | Replaces the wrong generic type argument in `PacketBase<TSelf>` or `IPacketDeserializer<T>` with the containing class name. |
| `PacketDeserializeCodeFixProvider` | `NALIX012`, `NALIX052` | `Generate valid static Deserialize method` | Adds or updates `Deserialize` to `public static new ClassName Deserialize(ReadOnlySpan<byte> buffer) => PacketBase<ClassName>.Deserialize(buffer);`. |
| `SerializeOrderMissingCodeFixProvider` | `NALIX013` | `Add [SerializeOrder]` / `Add [SerializeIgnore]` | Offers two actions: adds `[SerializeOrder(nextOrder)]` (using `maxOrder + 1` on the type) or adds `[SerializeIgnore]`. |
| `DuplicateSerializeOrderCodeFixProvider` | `NALIX014` | `Use next available SerializeOrder` | Updates the duplicate `[SerializeOrder]` argument to `maxOrder + 1`. |
| `SerializationConflictCodeFixProvider` | `NALIX015` | `Remove [SerializeOrder]` / `Remove [SerializeIgnore]` | Offers two actions to remove either `[SerializeOrder]` or `[SerializeIgnore]` when both are present on the same member. |
| `ResetForPoolCodeFixProvider` | `NALIX020` | `Call base.ResetForPool()` | Inserts `base.ResetForPool();` as the first statement of the `ResetForPool()` override (converting expression-bodied methods to block bodies if needed). |
| `ConfigurationIgnoreCodeFixProvider` | `NALIX023`, `NALIX024` | `Add [ConfiguredIgnore]` | Adds `[ConfiguredIgnore]` to unsupported (`NALIX023`) or non-bindable (`NALIX024`) properties on `ConfigurationLoader` subclasses. |
| `MiddlewareCodeFixProvider` | `NALIX030`, `NALIX032` | `Add [MiddlewareOrder(0)]` (`NALIX030`) / `Remove AlwaysExecute` (`NALIX032`) | Adds `[MiddlewareOrder(0)]` to a middleware class (`NALIX030`) or removes `AlwaysExecute = true` on `MiddlewareStage.Inbound` (`NALIX032`, plus retired `NALIX031`). |
| `DispatchLoopCountCodeFixProvider` | `NALIX047` | `Clamp dispatch loop count to 1..64` | Clamps out-of-range integer literals passed to `WithDispatchLoopCount(...)` into the valid `1..64` range (`< 1` becomes `1`, `> 64` becomes `64`). |
| `RedundantPacketCastCodeFixProvider` | `NALIX055` | `Remove redundant Packet cast` | Replaces `(MyPacket)context.Packet` or `context.Packet as MyPacket` with `context.Packet`. |
| `NullMiddlewareCodeFixProvider` | `NALIX056` | `Remove null middleware registration` | Removes the `.WithMiddleware(null)` / `.WithErrorHandlingMiddleware(null)` invocation from the fluent builder chain. |
| `RequestOptionsConsistencyCodeFixProvider` | `NALIX057` | `Set TimeoutMs to 5000` / `Disable retries` | Resolves infinite-timeout + retry conflicts (`NALIX057`) by either setting `TimeoutMs = 5000` or setting `RetryCount = 0`. |
| `GenericPacketHandlerCodeFixProvider` | `NALIX058` | `Remove [PacketOpcode]` | Removes `[PacketOpcode]` from generic methods that cannot be bound as packet handlers. |

## When Diagnostics Do Not Have a Code Fix

Diagnostics that require an explicit architectural or security decision intentionally do not provide an automated code fix:

- **Duplicate opcodes (`NALIX001`, `NALIX036`, `NALIX068`, `NALIX106`) and reserved opcodes (`NALIX035`)**: Opcode numbers are wire-protocol contracts shared between client and server; picking a random opcode automatically would break wire compatibility.
- **Handler signature & scope violations (`NALIX003`, `NALIX067`, `NALIX076`)**: Require deciding whether to resolve a service via `[FromScope]` or copy data before offloading work.
- **RPC contract & resource rules (`NALIX039`, `NALIX075`, `NALIX100`–`NALIX104`, `NALIX107`)**: Require choosing the right RPC return/parameter contract, removing `readonly` from `[Inject]` fields, or resetting mutable fields in `ResetForPool()`.

## Related APIs

- [Analyzers Overview](./index.md)
- [Diagnostic Codes](./diagnostic-codes.md)
- [Source Generators](./autogen/index.md)
- [Serialization Attributes](../abstractions/serialization-attributes.md)
