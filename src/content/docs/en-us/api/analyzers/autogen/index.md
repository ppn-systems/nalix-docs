---
title: Source Generators
description: Overview of all 7 Roslyn Incremental Source Generators in Nalix.Analyzers.Generators that power compile-time packet dispatch, DI activation, binary serialization, schema sizing, INI configuration, and typed RPC clients.
section: API Reference
package: Nalix.Analyzers
---

`Nalix.Analyzers.Generators` contains **7 Roslyn incremental source generators** (`IIncrementalGenerator`) bundled inside `Nalix.Abstractions`. By shifting handler compilation, dependency injection, packet sizing, binary serialization, and RPC client stubs to compile time, Nalix achieves zero runtime reflection and full NativeAOT / IL2CPP compatibility.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketRegistryGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/RpcClientGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## The 7 Source Generators

| Generator | Trigger | Emitted Output | Diagnostics |
| --- | --- | --- | --- |
| [**Packet Handler Generator** (PacketHandlerGenerator)](./packet-handler-generator.md) | `[PacketHandler]` class with `[PacketOpcode]` methods | `IPacketHandlerCompiler` implementation + `<Controller>_Inject.g.cs` (`InitializeDependencies()`) + `[ModuleInitializer]` registering with `PacketHandlerRegistry` | `NALIX067` |
| [**Instance Generator** (InstanceGenerator)](./instance-generator.md) | `[Injectable]` class or `SingletonBase<T>` subclass | `InstanceGenerated.Initialize()` (`[ModuleInitializer]`) calling `InstanceManager.RegisterActivator`, `RegisterServiceMapping`, and `SingletonActivatorCache.Register` | `NALIX063`, `NALIX064`, `NALIX065` |
| [**Serialization Generator** (SerializeFormatterGenerator)](./serialization-generator.md) | Class or struct with `[GenerateFormatter]` | `IFormatter<T>` + `IFillableFormatter<T>` implementation + `[ModuleInitializer]` registering with `FormatterProvider` | `NALIX059` |
| [**Packet Registry Generator** (PacketRegistryGenerator)](./packet-registry-generator.md) | Concrete `IPacket` class with `IPacketDeserializer<TSelf>` and `[Packet]` or `IPacketStaticOpcode` | `PacketRegistryGenerated.Initialize()` (`[ModuleInitializer]`) calling `PacketRegistry.RegisterGenerated<TPacket>` | `NALIX068` |
| [**Packet Schema Generator** (PacketSchemaGenerator)](./packet-schema-generator.md) | `partial` class inheriting `PacketBase<TSelf>` | `Length` override, `ResetForPool()` override, and `static int Size` (when implementing `IFixedSizeSerializable`) | `NALIX060` |
| [**Configuration Generator** (ConfigurationGenerator)](./configuration-generator.md) | `partial` class inheriting `ConfigurationLoader` | `CopyPropertiesTo`, `BindProperties`, and `ValidateDataAnnotations` overrides | — |
| [**RPC Client Generator** (RpcClientGenerator)](#rpc-client-generator-rpcclientgenerator) | Interface annotated with `[RpcService]` | `internal sealed class <Service>_RpcClient : <IService>` registered via `RpcExtensions.RegisterFactory` | `NALIX066` |

---

## RPC Client Generator (`RpcClientGenerator`)

`RpcClientGenerator` (`analyzers/Nalix.Analyzers.Generators/RpcClientGenerator.cs`) generates a concrete client proxy class (`internal sealed class <Service>_RpcClient : <IService>`) for every interface decorated with `[RpcService]` (`Nalix.Abstractions.Networking.Rpc`) and registers it in a `[ModuleInitializer]` (`<Service>_RpcClientInitializer.Initialize()`) via `RpcExtensions.RegisterFactory(typeof(IService), session => new <Service>_RpcClient(session))`.

### Supported Return Types

Each `[PacketOpcode(opCode)]` method in an `[RpcService]` interface is mapped based on its return type:

| Interface Method Return Type | Generated `ITransportSession` Call | Behavior |
| --- | --- | --- |
| `ValueTask` | `new ValueTask(_session.SendAsync(request, encrypt, ct))` | Fire-and-forget one-way packet send (`ValueTask`). |
| `Task` | `_session.SendAsync(request, encrypt, ct)` | Fire-and-forget one-way packet send (`Task`). |
| `ValueTask<TResponse>` | `_session.RequestAsync<TResponse>(request, options, ct: ct)` | Request-response awaiting a correlated `TResponse` packet (`ValueTask<TResponse>`). |
| `Task<TResponse>` | `_session.RequestAsync<TResponse>(request, options, ct: ct).AsTask()` | Request-response awaiting a correlated `TResponse` packet (`Task<TResponse>`). |
| `RpcCall<TResponse>` | `new RpcCall<TResponse>(_session, request, options)` | Structured awaitable RPC call handle (`GetResponseAsync()` / `GetAwaiter()`). |
| `RpcStream<TResponse>` | `new RpcStream<TResponse>(_session, request, options)` | Server-to-client streaming RPC handle (`GetStreamAsync()` / `GetAsyncEnumerator()`) where `TResponse : IPacketStreamable`. |

:::warning[`NALIX066` & `NALIX100`: Unsupported `[RpcService]` Return Type]
`[RpcService]` methods must return `ValueTask`, `Task`, `ValueTask<TResponse>`, `Task<TResponse>`, `RpcCall<TResponse>`, or `RpcStream<TResponse>`. Returning `void` or any other unsupported type reports **`NALIX066`** / **`NALIX100`** and emits a stub that throws `NotSupportedException`.
:::

### Example

```csharp
using System.Threading;
using System.Threading.Tasks;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Rpc;

[RpcService]
public interface IInventoryService
{
    [PacketOpcode(0x2001)]
    ValueTask<InventoryResponse> GetInventoryAsync(
        InventoryRequest request,
        CancellationToken ct = default);
}
```

At runtime, resolve the generated client proxy from any `ITransportSession` via `CreateRpcClient<TService>()`:

```csharp
using Nalix.SDK.Transport.Extensions;

IInventoryService inventory = session.CreateRpcClient<IInventoryService>();
InventoryResponse response = await inventory.GetInventoryAsync(
    new InventoryRequest { PlayerId = 42 },
    ct);
```

## Related APIs

- [Analyzers Overview](../index.md)
- [Diagnostic Codes](../diagnostic-codes.md)
- [Code Fixes Reference](../code-fixes.md)
- [Serialization Basics](../../codec/serialization/serialization-basics.md)
- [Packet Registry](../../codec/packets/packet-registry.md)
