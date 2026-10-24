---
title: Diagnostic Codes
description: Complete reference of all 75 compile-time diagnostic descriptors (NALIX001–NALIX107) emitted by Nalix.Analyzers and Nalix.Analyzers.Generators.
section: API Reference
package: Nalix.Analyzers
---

This page lists all **75 active diagnostic descriptors** emitted by `Nalix.Analyzers` (67 rules in `analyzers/Nalix.Analyzers/Diagnostics/DiagnosticDescriptors.cs`) and `Nalix.Analyzers.Generators` (8 rules in `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`).

:::note[Retired Diagnostic IDs]
`NALIX007`, `NALIX019`, `NALIX029`, `NALIX031`, `NALIX049`, and `NALIX053` were retired when `INetworkBufferMiddleware` and legacy reflection dispatch paths were removed.
:::

## 1. Controller Dispatch and Packet Registration (`NALIX001`–`NALIX018`, `NALIX047`–`NALIX058`)

| ID | Title | Severity | Category | Code Fix | Description |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX001` | Packet controller contains duplicate PacketOpcode | Warning | Usage | No | Controller dispatch relies on unique opcodes per controller. |
| `NALIX002` | Packet controller handler should declare PacketOpcode | Warning | Usage | Yes | Controller methods matching Nalix handler patterns should declare `[PacketOpcode(...)]`. |
| `NALIX003` | Packet controller handler has unsupported signature | Warning | Usage | No | Parameter `0` must be `IPacketContext<TPacket>`. Any additional parameters (`1..N`) must be reference types annotated with `[FromScope]` (see `NALIX067`). |
| `NALIX004` | `PacketContext<T>` does not match dispatch packet type | Warning | Usage | No | `PacketContext<T>` should use a packet type assignable to the dispatcher's `TPacket`. |
| `NALIX005` | Registered controller handler packet type does not match dispatcher type | Warning | Usage | No | Controllers registered on `PacketDispatchOptions<TPacket>` must handle compatible packet types. |
| `NALIX008` | Registered handler controller is missing PacketHandler | Warning | Usage | Yes | Types registered through `WithHandler` or `MapHandlers` must declare `[PacketHandler]`. |
| `NALIX009` | Registered packet type is missing static Deserialize | Warning | Usage | Yes | Packet registry binding expects `IPacketDeserializer<T>` / static `Deserialize(ReadOnlySpan<byte>)` support. |
| `NALIX010` | `PacketBase<TSelf>` should use the containing packet type | Warning | Usage | Yes | `PacketBase<TSelf>` must pass the containing packet class as `TSelf` (CRTP). |
| `NALIX011` | `IPacketDeserializer<T>` should use the containing packet type | Warning | Usage | Yes | Packet deserializer contracts must target the containing packet type. |
| `NALIX012` | PacketBase packet should expose static Deserialize | Warning | Usage | Yes | `PacketBase<TSelf>` packet types should expose an accessible `public static new TSelf Deserialize(ReadOnlySpan<byte>)`. |
| `NALIX017` | Packet Deserialize signature is invalid | Warning | Usage | No | `Deserialize` must be `public static new {Packet} Deserialize(ReadOnlySpan<byte>)`. |
| `NALIX018` | Registered packet type must be concrete | Warning | Usage | No | Packet registry entries must be concrete, non-abstract, non-generic packet types. |
| `NALIX047` | Dispatch loop count is out of supported range | Warning | Usage | Yes | `WithDispatchLoopCount` expects a value in `1..64` (or `null` for automatic scaling). |
| `NALIX048` | Packet controller handler return type is unsupported | Warning | Usage | No | Supported return types are `void`, `Task`, `ValueTask`, `TResult`, `Task<TResult>`, `ValueTask<TResult>`, and `IAsyncEnumerable<TElement>`. |
| `NALIX050` | PacketOpcode is declared on a non-controller type | Info | Usage | No | `[PacketOpcode]` handlers must be declared inside `[PacketHandler]` controller classes. |
| `NALIX052` | Packet Deserialize overload should include `ReadOnlySpan<byte>` | Warning | Usage | Yes | Packet discovery requires a `Deserialize(ReadOnlySpan<byte>)` overload. |
| `NALIX054` | PacketHandler name is duplicated | Info | Usage | No | Duplicate `[PacketHandler("...")]` names reduce routing and diagnostic clarity. |
| `NALIX055` | Redundant cast on `PacketContext<T>.Packet` | Info | Usage | Yes | `context.Packet` is already strongly typed as `T`. |
| `NALIX056` | Middleware registration uses null | Warning | Usage | Yes | Middleware registration methods require non-null middleware instances. |
| `NALIX058` | Packet handler method should not be generic | Warning | Usage | Yes | Generic packet handler methods cannot be bound to a concrete wire opcode. |

## 2. Middleware and Routing Metadata (`NALIX006`, `NALIX025`–`NALIX038`)

| ID | Title | Severity | Category | Code Fix | Description |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX006` | Registered middleware type does not match dispatcher packet type | Warning | Usage | No | `IPacketMiddleware<TPacket>` must match the dispatcher's packet type. |
| `NALIX025` | Packet metadata provider clears Opcode | Warning | Routing | No | Custom `IPacketMetadataProvider` implementations must not set `builder.Opcode = null`. |
| `NALIX026` | Packet metadata provider overwrites Opcode without guard | Info | Routing | No | Metadata providers should guard assignments with `builder.Opcode ??= ...` instead of overwriting unconditionally. |
| `NALIX030` | Packet middleware should declare MiddlewareOrder | Info | Middleware | Yes | Explicit `[MiddlewareOrder(n)]` makes middleware execution order deterministic. |
| `NALIX032` | Inbound middleware ignores AlwaysExecute | Info | Middleware | Yes | `MiddlewareStage.Inbound` ignores `AlwaysExecute = true` (`AlwaysExecute` only applies to `Outbound` and `Both`). |
| `NALIX033` | Registered middleware shares MiddlewareOrder with another middleware in the same chain | Info | Middleware | No | Duplicate `[MiddlewareOrder]` values in one pipeline chain reduce ordering predictability. |
| `NALIX035` | PacketOpcode is in reserved range | Warning | Usage | No | Opcodes `0x0000..0x00FF` (`0..255`) are reserved for Nalix system/protocol frames. Use `>= 0x0100` for application packets. |
| `NALIX036` | PacketOpcode is already used in a different controller | Warning | Usage | No | Every handler registered on the same dispatcher must have a globally unique opcode. |
| `NALIX038` | OpCode in documentation does not match attribute | Info | Documentation | No | XML doc comments mentioning an opcode should match the `[PacketOpcode]` attribute value. |

## 3. Serialization Layout (`NALIX013`–`NALIX022`, `NALIX034`, `NALIX046`, `NALIX051`)

| ID | Title | Severity | Category | Code Fix | Description |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX013` | Explicit serialization member should declare SerializeOrder | Warning | Serialization | Yes | Types with `[SerializePackable(SerializeLayout.Explicit)]` should annotate serialized members with `[SerializeOrder(n)]` or `[SerializeIgnore]`. |
| `NALIX014` | SerializeOrder value is duplicated | Warning | Serialization | Yes | `[SerializeOrder]` values must be unique across all serialized members of a type hierarchy. |
| `NALIX015` | SerializeIgnore conflicts with SerializeOrder | Warning | Serialization | Yes | A member cannot have both `[SerializeIgnore]` and `[SerializeOrder]`. |
| `NALIX016` | SerializeDynamicSize is unnecessary on fixed-size member | Info | Serialization | No | `[SerializeDynamicSize]` is only meaningful on variable-size members (`string`, arrays, collections). |
| `NALIX021` | SerializeOrder should not be negative | Warning | Serialization | No | `[SerializeOrder]` indices must be `>= 0`. |
| `NALIX022` | `SerializeHeader(0)` is reserved on PacketBase types | Warning | Serialization | No | On `PacketBase<TSelf>` subclasses, order `0` (`PacketHeaderOffset.Header`) is occupied by `PacketBase.Header`. Start user fields at order `0` via `[SerializeOrder(0)]` or non-zero header offsets. |
| `NALIX034` | SerializeHeader conflicts with SerializeOrder | Warning | Serialization | No | Do not combine `[SerializeHeader]` and `[SerializeOrder]` on the same member. |
| `NALIX046` | SerializeOrder gap is unusually large | Info | Serialization | No | `[SerializeOrder]` is sequential field ordering metadata, not a raw byte offset. Gaps `> 16` trigger this hint. |
| `NALIX051` | `IFixedSizeSerializable` type contains dynamic serialization member | Warning | Serialization | No | Types implementing `IFixedSizeSerializable` cannot contain variable-length strings, arrays, or collections. |

## 4. Lifecycle, Configuration, SDK, and Hosting (`NALIX020`, `NALIX023`–`NALIX028`, `NALIX037`, `NALIX039`–`NALIX045`, `NALIX057`)

| ID | Title | Severity | Category | Code Fix | Description |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX020` | Packet `ResetForPool` should call `base.ResetForPool` | Warning | Lifecycle | Yes | Custom `ResetForPool()` overrides on `PacketBase<TSelf>` must call `base.ResetForPool()` so the base header and priority are reset. |
| `NALIX023` | Configuration property type is not supported | Warning | Configuration | Yes | `ConfigurationLoader` supports primitives, `decimal`, `string`, `Guid`, `TimeSpan`, `DateTime`, and `enum` properties. |
| `NALIX024` | Configuration property is not bindable | Info | Configuration | Yes | Public `ConfigurationLoader` properties without a public setter cannot be bound from `.ini` files and should declare `[ConfiguredIgnore]`. |
| `NALIX027` | `RequestOptions.RetryCount` should not be negative | Warning | SDK | No | `RequestOptions.RetryCount` must be `>= 0`. |
| `NALIX028` | `RequestOptions.TimeoutMs` should not be negative | Warning | SDK | No | `RequestOptions.TimeoutMs` must be `>= 0` (`0` disables the per-attempt timeout). |
| `NALIX037` | Potential allocation in hot path | Info | Performance | No | Warns on `new byte[...]`, `.ToArray()`, or LINQ allocations inside packet handlers, middleware, and serializer methods. |
| `NALIX039` | Potential `IBufferLease` leak | Warning | Usage | No | Every rented `IBufferLease` must be disposed via `using`, returned, or transferred across all control paths. |
| `NALIX040` | `NetworkApplicationBuilder` should configure `BufferPoolManager` | Info | Performance | No | Suggests calling `.UseBufferPoolManager(...)` when building a custom host pipeline. |
| `NALIX041` | `NetworkApplicationBuilder` should configure `ConnectionHub` | Info | Usage | No | Suggests calling `.UseConnectionHub(...)` when building a custom host pipeline. |
| `NALIX042` | `NetworkApplicationBuilder` handler type is not constructible | Warning | Usage | No | Controller types passed to `MapHandlers` must be concrete, constructible classes. |
| `NALIX043` | `NetworkApplicationBuilder` metadata provider type is not constructible | Warning | Usage | No | Metadata provider types must be concrete, constructible classes. |
| `NALIX044` | `NetworkApplicationBuilder` should configure a TCP binding | Info | Usage | No | Warns when `.Build()` is called without any transport listener binding. |
| `NALIX045` | `NetworkApplicationBuilder` should configure TCP before UDP | Info | Usage | No | Authenticated UDP listeners rely on sessions established over TCP (`MapTcp` should accompany `MapUdp`). |
| `NALIX057` | `RequestOptions` uses infinite timeout with retries | Info | SDK | Yes | Setting `TimeoutMs = 0` with `RetryCount > 0` makes retries unreachable because the first attempt waits indefinitely. |

## 5. Source Generator Diagnostics (`NALIX059`–`NALIX068`)

Emitted by `Nalix.Analyzers.Generators` (`analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`):

| ID | Title | Severity | Category | Generator | Description |
| --- | --- | :---: | --- | --- | --- |
| `NALIX059` | Missing static `Create()` method | Error | `Nalix.Codec.Serialization` | `SerializeFormatterGenerator` | Reference type marked `[GenerateFormatter]` must declare a static `Create()` method returning an instance for pooling/deserialization (inherited automatically by `PacketBase<TSelf>` subclasses). |
| `NALIX060` | Packet class must be partial | Error | `Nalix.Codec.Serialization` | `PacketSchemaGenerator` | Classes inheriting from `PacketBase<TSelf>` must be declared `partial` so `PacketSchemaGenerator` can emit `Length`, `ResetForPool()`, and `Size`. |
| `NALIX063` | No accessible constructor found | Error | `Nalix.Framework.Injection` | `InstanceGenerator` | `[Injectable]` class has no `public` or `internal` constructor that the source generator can invoke. |
| `NALIX064` | Ambiguous constructors in injectable class | Error | `Nalix.Framework.Injection` | `InstanceGenerator` | `[Injectable]` class has multiple `public`/`internal` constructors with the same non-config parameter count (`args.Length`) and non-disjoint parameter types. |
| `NALIX065` | `SingletonBase` subclass missing accessible parameterless constructor | Warning | `Nalix.Framework.Injection` | `InstanceGenerator` | `SingletonBase<T>` subclass has no `public` or `internal` parameterless constructor (`protected` alone is not accessible to the generated initializer). |
| `NALIX066` | Unsupported `[RpcService]` method return type | Error | `Nalix.SDK.Transport` | `RpcClientGenerator` | `[RpcService]` interface methods must return `ValueTask`, `ValueTask<T>`, `RpcCall<T>`, or `RpcStream<T>`. |
| `NALIX067` | Handler method dropped from dispatch table | Error | `Nalix.Runtime.Dispatching` | `PacketHandlerGenerator` | Parameter `0` of a `[PacketOpcode]` handler is `IPacketContext<TPacket>`; any additional parameter (`1..N`) must be a reference type annotated with `[FromScope]`. |
| `NALIX068` | Duplicate packet `StaticOpCode` | Error | `Nalix.Codec.DataFrames` | `PacketRegistryGenerator` | Two or more packet classes in the compilation define the same `StaticOpCode`. |

## 6. Security, Pooling, RPC, Injection, and Lifecycle Diagnostics (`NALIX071`–`NALIX107`)

| ID | Title | Severity | Category | Scope | Description |
| --- | --- | :---: | --- | --- | --- |
| `NALIX071` | Use Nalix crypto abstractions instead of `System.Security.Cryptography` | Warning | Security | Core-only | Direct BCL crypto usage in Nalix Core assemblies bypasses security review (`OsCsprng` and `CryptographicOperations.FixedTimeEquals` are allowlisted). |
| `NALIX072` | Use zero-allocation endpoint formatting in hot paths | Info | Performance | Core-only | `IPAddress.ToString()`, `INetworkEndpoint.Address`, and `SocketEndpoint.Address` allocate strings. Prefer `TryFormatAddress` on hot paths. |
| `NALIX073` | Unguarded `catch(Exception)` | Warning | Correctness | Core-only | Bare `catch` or `catch (Exception)` clauses in Core assemblies must either filter via `when (...)` or rethrow so fatal runtime exceptions are not swallowed. |
| `NALIX074` | Avoid eager string formatting in diagnostic logging | Info | Performance | Core-only | Interpolated strings, `string.Format`, or concatenation inside `new DiagnosticLog(...)` allocate even when diagnostics are disabled. Guard with `DiagnosticsEvents.Source.IsEnabled(...)`. |
| `NALIX075` | `PacketScope<T>` must be disposed | Error | Pooling | All assemblies | `PacketScope<T>` wraps a pooled packet and must be declared with `using` (`using PacketScope<T> scope = ...`) or explicitly disposed. |
| `NALIX076` | Packet context escapes handler scope | Error | Correctness | All assemblies | `IPacketContext<T>` and `context.Packet` are pooled and returned immediately when the handler finishes. Capturing them in fields, properties, arrays/collections, events, or `Task.Run` / `ThreadPool` delegates causes use-after-return corruption. |
| `NALIX078` | Avoid unbounded reflection in AOT-sensitive Nalix Core code | Warning | AOT | Core-only | Flags `Assembly.GetTypes()`, `Expression.Compile()`, `MakeGenericType()`, `MethodInfo.Invoke()`, and `Type.GetType(string)` in Core assemblies. |
| `NALIX100` | `RpcService` method has invalid return type | Error | Usage | All assemblies | Methods in `[RpcService]` interfaces must return `ValueTask`, `ValueTask<T>`, `RpcCall<T>`, or `RpcStream<T>` (`Task` and `Task<T>` are not supported). |
| `NALIX101` | `RpcService` method has invalid parameters | Error | Usage | All assemblies | Parameter `0` of an `[RpcService]` method must implement `IPacket`; subsequent parameters may only be `RequestOptions`, `Func<TResponse, bool>?`, `bool?`, or `CancellationToken`. |
| `NALIX102` | `RpcService` interface contains non-method members | Error | Usage | All assemblies | `[RpcService]` interfaces can only declare methods (properties, events, and indexers are forbidden). |
| `NALIX103` | `RpcService` interface is missing attribute | Info | Usage | All assemblies | Interfaces containing `[PacketOpcode]` methods must be decorated with `[RpcService]` so `RpcClientGenerator` discovers them. |
| `NALIX104` | `[Inject]` field cannot be `readonly` | Error | Usage | All assemblies | Fields annotated with `[Inject]` are populated inside the generated `InitializeDependencies()` method and cannot be `readonly`. |
| `NALIX105` | Nalix analyzer disabled: required symbol could not be resolved | Warning | Usage | All assemblies | Emitted at compilation start if a required core Nalix symbol cannot be resolved from referenced assemblies. |
| `NALIX106` | Packet `StaticOpCode` is already used by another packet | Error | Usage | All assemblies | Two packet types in the compilation declare the same `StaticOpCode` value. |
| `NALIX107` | Packet `ResetForPool` does not reset mutable member | Warning | Lifecycle | All assemblies | A manual `ResetForPool()` override on a packet class omits resetting a mutable field or property that is not marked `[SkipClean]`. |

---

## `NALIX076` Examples (`PacketContextEscapeAnalyzer`)

`IPacketContext<TPacket>` and `context.Packet` are rented from `ObjectPoolManager` and automatically returned when the handler's `ValueTask` completes.

### Safe Patterns

```csharp
[PacketOpcode(0x1001)]
public async ValueTask HandleEchoAsync(IPacketContext<EchoPacket> context)
{
    // Copy value-type or immutable fields into local variables if needed later
    string message = context.Packet.Message;
    uint seq = context.Packet.SequenceId;

    // Directly awaiting a helper or Sender method within the handler lifetime is safe
    await context.Sender.ReplyAsync(new EchoPacket
    {
        SequenceId = seq,
        Message = message
    }).ConfigureAwait(false);
}
```

### Unsafe Patterns Caught by `NALIX076`

```csharp
private static IPacketContext<EchoPacket>? s_leakedContext;

[PacketOpcode(0x1001)]
public void HandleUnsafe(IPacketContext<EchoPacket> context)
{
    // ERROR NALIX076: Storing context or packet in a field/property
    s_leakedContext = context;

    // ERROR NALIX076: Capturing context or a local packet alias in Task.Run
    EchoPacket alias = context.Packet;
    _ = Task.Run(() => ProcessInBackground(alias));

    // ERROR NALIX076: Capturing context in an event handler
    context.Connection.ConnectionClosed += (_, _) => Log(context.Packet);
}
```
