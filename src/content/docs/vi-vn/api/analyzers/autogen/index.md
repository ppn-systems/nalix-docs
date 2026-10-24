---
title: Bộ sinh mã nguồn
description: Tổng quan về 7 bộ sinh mã nguồn Roslyn incremental trong Nalix.Analyzers.Generators, phục vụ dispatch gói tin lúc biên dịch, kích hoạt DI, tuần tự hóa nhị phân, đo kích thước schema, cấu hình INI và client RPC có kiểu.
section: API Reference
package: Nalix.Analyzers
---

`Nalix.Analyzers.Generators` chứa **7 bộ sinh mã nguồn Roslyn incremental** (`IIncrementalGenerator`), được đóng gói bên trong `Nalix.Abstractions`. Bằng cách chuyển việc biên dịch handler, dependency injection, đo kích thước gói tin, tuần tự hóa nhị phân và stub client RPC sang thời điểm biên dịch, Nalix đạt được việc không dùng reflection lúc chạy và tương thích đầy đủ với NativeAOT / IL2CPP.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/PacketHandlerGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/SerializeFormatterGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketRegistryGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/PacketSchemaGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/RpcClientGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## 7 bộ sinh mã nguồn

| Bộ sinh | Điều kiện kích hoạt | Đầu ra được sinh | Chẩn đoán |
| --- | --- | --- | --- |
| [**Bộ sinh Packet Handler** (PacketHandlerGenerator)](./packet-handler-generator.md) | Lớp `[PacketHandler]` có các method `[PacketOpcode]` | Triển khai `IPacketHandlerCompiler` + `<Controller>_Inject.g.cs` (`InitializeDependencies()`) + `[ModuleInitializer]` đăng ký với `PacketHandlerRegistry` | `NALIX067` |
| [**Bộ sinh Instance** (InstanceGenerator)](./instance-generator.md) | Lớp `[Injectable]` hoặc lớp con của `SingletonBase<T>` | `InstanceGenerated.Initialize()` (`[ModuleInitializer]`) gọi `InstanceManager.RegisterActivator`, `RegisterServiceMapping` và `SingletonActivatorCache.Register` | `NALIX063`, `NALIX064`, `NALIX065` |
| [**Bộ sinh tuần tự hóa** (SerializeFormatterGenerator)](./serialization-generator.md) | Lớp hoặc struct có `[GenerateFormatter]` | Triển khai `IFormatter<T>` + `IFillableFormatter<T>` + `[ModuleInitializer]` đăng ký với `FormatterProvider` | `NALIX059` |
| [**Bộ sinh Packet Registry** (PacketRegistryGenerator)](./packet-registry-generator.md) | Lớp `IPacket` cụ thể có `IPacketDeserializer<TSelf>` và `[Packet]` hoặc `IPacketStaticOpcode` | `PacketRegistryGenerated.Initialize()` (`[ModuleInitializer]`) gọi `PacketRegistry.RegisterGenerated<TPacket>` | `NALIX068` |
| [**Bộ sinh Packet Schema** (PacketSchemaGenerator)](./packet-schema-generator.md) | Lớp `partial` kế thừa `PacketBase<TSelf>` | Override `Length`, override `ResetForPool()` và `static int Size` (khi triển khai `IFixedSizeSerializable`) | `NALIX060` |
| [**Bộ sinh cấu hình** (ConfigurationGenerator)](./configuration-generator.md) | Lớp `partial` kế thừa `ConfigurationLoader` | Override `CopyPropertiesTo`, `BindProperties` và `ValidateDataAnnotations` | — |
| [**Bộ sinh RPC Client** (RpcClientGenerator)](#bộ-sinh-rpc-client-rpcclientgenerator) | Interface được chú thích `[RpcService]` | `internal sealed class <Service>_RpcClient : <IService>` đăng ký qua `RpcExtensions.RegisterFactory` | `NALIX066` |

---

## Bộ sinh RPC Client (`RpcClientGenerator`)

`RpcClientGenerator` (`analyzers/Nalix.Analyzers.Generators/RpcClientGenerator.cs`) sinh một lớp proxy client cụ thể (`internal sealed class <Service>_RpcClient : <IService>`) cho mỗi interface được đánh dấu `[RpcService]` (`Nalix.Abstractions.Networking.Rpc`), và đăng ký nó trong một `[ModuleInitializer]` (`<Service>_RpcClientInitializer.Initialize()`) qua `RpcExtensions.RegisterFactory(typeof(IService), session => new <Service>_RpcClient(session))`.

### Kiểu trả về được hỗ trợ

Mỗi method `[PacketOpcode(opCode)]` trong interface `[RpcService]` được ánh xạ dựa trên kiểu trả về của nó:

| Kiểu trả về của method interface | Lệnh `ITransportSession` được sinh | Hành vi |
| --- | --- | --- |
| `ValueTask` | `new ValueTask(_session.SendAsync(request, encrypt, ct))` | Gửi gói một chiều, không chờ phản hồi (`ValueTask`). |
| `Task` | `_session.SendAsync(request, encrypt, ct)` | Gửi gói một chiều, không chờ phản hồi (`Task`). |
| `ValueTask<TResponse>` | `_session.RequestAsync<TResponse>(request, options, ct: ct)` | Yêu cầu-phản hồi, chờ một `TResponse` đã được ghép tương ứng (`ValueTask<TResponse>`). |
| `Task<TResponse>` | `_session.RequestAsync<TResponse>(request, options, ct: ct).AsTask()` | Yêu cầu-phản hồi, chờ một `TResponse` đã được ghép tương ứng (`Task<TResponse>`). |
| `RpcCall<TResponse>` | `new RpcCall<TResponse>(_session, request, options)` | Handle lệnh gọi RPC có cấu trúc, có thể await (`GetResponseAsync()` / `GetAwaiter()`). |
| `RpcStream<TResponse>` | `new RpcStream<TResponse>(_session, request, options)` | Handle RPC streaming từ máy chủ đến client (`GetStreamAsync()` / `GetAsyncEnumerator()`), trong đó `TResponse : IPacketStreamable`. |

:::warning[`NALIX066` & `NALIX100`: Kiểu trả về `[RpcService]` không được hỗ trợ]
Method `[RpcService]` phải trả về `ValueTask`, `Task`, `ValueTask<TResponse>`, `Task<TResponse>`, `RpcCall<TResponse>` hoặc `RpcStream<TResponse>`. Trả về `void` hoặc kiểu không được hỗ trợ khác sẽ báo **`NALIX066`** / **`NALIX100`** và sinh ra stub ném `NotSupportedException`.
:::

### Ví dụ

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

Khi chạy, lấy proxy client được sinh từ bất kỳ `ITransportSession` nào qua `CreateRpcClient<TService>()`:

```csharp
using Nalix.SDK.Transport.Extensions;

IInventoryService inventory = session.CreateRpcClient<IInventoryService>();
InventoryResponse response = await inventory.GetInventoryAsync(
    new InventoryRequest { PlayerId = 42 },
    ct);
```

## API liên quan

- [Tổng quan Analyzers](../index.md)
- [Mã chẩn đoán](../diagnostic-codes.md)
- [Tham chiếu code fix](../code-fixes.md)
- [Cơ bản về tuần tự hóa](../../codec/serialization/serialization-basics.md)
- [Registry gói tin](../../codec/packets/packet-registry.md)
