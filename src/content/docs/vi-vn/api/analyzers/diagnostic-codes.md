---
title: Mã chẩn đoán
description: Tài liệu tham chiếu đầy đủ của tất cả 75 mô tả chẩn đoán lúc biên dịch (NALIX001–NALIX107) do Nalix.Analyzers và Nalix.Analyzers.Generators phát ra.
section: API Reference
package: Nalix.Analyzers
---

Trang này liệt kê tất cả **75 mô tả chẩn đoán đang hoạt động** do `Nalix.Analyzers` (67 quy tắc trong `analyzers/Nalix.Analyzers/Diagnostics/DiagnosticDescriptors.cs`) và `Nalix.Analyzers.Generators` (8 quy tắc trong `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`) phát ra.

:::note[Các mã chẩn đoán đã bị loại bỏ]
`NALIX007`, `NALIX019`, `NALIX029`, `NALIX031`, `NALIX049` và `NALIX053` đã bị loại bỏ khi các đường dẫn `INetworkBufferMiddleware` và dispatch bằng reflection kiểu cũ được gỡ bỏ.
:::

## 1. Điều phối controller và đăng ký gói tin (`NALIX001`–`NALIX018`, `NALIX047`–`NALIX058`)

| ID | Tiêu đề | Mức độ | Danh mục | Code Fix | Mô tả |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX001` | Controller gói tin chứa PacketOpcode bị trùng | Cảnh báo | Usage | Không | Điều phối controller dựa vào opcode duy nhất trong mỗi controller. |
| `NALIX002` | Handler của controller gói tin nên khai báo PacketOpcode | Cảnh báo | Usage | Có | Các method controller khớp mẫu handler của Nalix nên khai báo `[PacketOpcode(...)]`. |
| `NALIX003` | Handler của controller gói tin có chữ ký không được hỗ trợ | Cảnh báo | Usage | Không | Tham số `0` phải là `IPacketContext<TPacket>`. Mọi tham số bổ sung (`1..N`) phải là kiểu tham chiếu được đánh dấu `[FromScope]` (xem `NALIX067`). |
| `NALIX004` | `PacketContext<T>` không khớp kiểu gói tin của dispatch | Cảnh báo | Usage | Không | `PacketContext<T>` nên dùng kiểu gói tin có thể gán cho `TPacket` của dispatcher. |
| `NALIX005` | Kiểu gói tin của handler controller đã đăng ký không khớp kiểu của dispatcher | Cảnh báo | Usage | Không | Các controller đăng ký trên `PacketDispatchOptions<TPacket>` phải xử lý kiểu gói tin tương thích. |
| `NALIX008` | Controller handler đã đăng ký thiếu PacketHandler | Cảnh báo | Usage | Có | Các kiểu đăng ký qua `WithHandler` hoặc `MapHandlers` phải khai báo `[PacketHandler]`. |
| `NALIX009` | Kiểu gói tin đã đăng ký thiếu Deserialize tĩnh | Cảnh báo | Usage | Có | Việc gắn kết với packet registry cần hỗ trợ `IPacketDeserializer<T>` / `Deserialize(ReadOnlySpan<byte>)` tĩnh. |
| `NALIX010` | `PacketBase<TSelf>` nên dùng lớp gói tin chứa nó | Cảnh báo | Usage | Có | `PacketBase<TSelf>` phải truyền lớp gói tin chứa làm `TSelf` (CRTP). |
| `NALIX011` | `IPacketDeserializer<T>` nên dùng lớp gói tin chứa nó | Cảnh báo | Usage | Có | Hợp đồng deserializer của gói tin phải nhắm tới lớp gói tin chứa nó. |
| `NALIX012` | Gói tin PacketBase nên khai báo Deserialize tĩnh | Cảnh báo | Usage | Có | Các kiểu gói tin `PacketBase<TSelf>` nên khai báo `public static new TSelf Deserialize(ReadOnlySpan<byte>)` có thể truy cập. |
| `NALIX017` | Chữ ký Deserialize của gói tin không hợp lệ | Cảnh báo | Usage | Không | `Deserialize` phải là `public static new {Packet} Deserialize(ReadOnlySpan<byte>)`. |
| `NALIX018` | Kiểu gói tin đã đăng ký phải là cụ thể | Cảnh báo | Usage | Không | Các mục packet registry phải là kiểu gói tin cụ thể, không abstract, không generic. |
| `NALIX047` | Số vòng lặp dispatch nằm ngoài khoảng hỗ trợ | Cảnh báo | Usage | Có | `WithDispatchLoopCount` yêu cầu giá trị trong khoảng `1..64` (hoặc `null` để tự động co giãn). |
| `NALIX048` | Kiểu trả về của handler controller gói tin không được hỗ trợ | Cảnh báo | Usage | Không | Các kiểu trả về được hỗ trợ là `void`, `Task`, `ValueTask`, `TResult`, `Task<TResult>`, `ValueTask<TResult>` và `IAsyncEnumerable<TElement>`. |
| `NALIX050` | PacketOpcode được khai báo trên kiểu không phải controller | Thông tin | Usage | Không | Các handler `[PacketOpcode]` phải được khai báo bên trong lớp controller `[PacketHandler]`. |
| `NALIX052` | Overload Deserialize của gói tin nên có `ReadOnlySpan<byte>` | Cảnh báo | Usage | Có | Việc phát hiện gói tin yêu cầu một overload `Deserialize(ReadOnlySpan<byte>)`. |
| `NALIX054` | Tên PacketHandler bị trùng | Thông tin | Usage | Không | Tên `[PacketHandler("...")]` trùng nhau làm giảm độ rõ ràng của định tuyến và chẩn đoán. |
| `NALIX055` | Ép kiểu thừa trên `PacketContext<T>.Packet` | Thông tin | Usage | Có | `context.Packet` đã có kiểu mạnh là `T`. |
| `NALIX056` | Đăng ký middleware dùng null | Cảnh báo | Usage | Có | Các method đăng ký middleware yêu cầu instance middleware khác null. |
| `NALIX058` | Method handler gói tin không nên là generic | Cảnh báo | Usage | Có | Method handler gói tin generic không thể gắn với một wire opcode cụ thể. |

## 2. Middleware và metadata định tuyến (`NALIX006`, `NALIX025`–`NALIX038`)

| ID | Tiêu đề | Mức độ | Danh mục | Code Fix | Mô tả |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX006` | Kiểu middleware đã đăng ký không khớp kiểu gói tin của dispatcher | Cảnh báo | Usage | Không | `IPacketMiddleware<TPacket>` phải khớp kiểu gói tin của dispatcher. |
| `NALIX025` | Packet metadata provider xóa Opcode | Cảnh báo | Routing | Không | Các implementation `IPacketMetadataProvider` tùy chỉnh không được đặt `builder.Opcode = null`. |
| `NALIX026` | Packet metadata provider ghi đè Opcode mà không có điều kiện bảo vệ | Thông tin | Routing | Không | Metadata provider nên bảo vệ phép gán bằng `builder.Opcode ??= ...` thay vì ghi đè vô điều kiện. |
| `NALIX030` | Middleware gói tin nên khai báo MiddlewareOrder | Thông tin | Middleware | Có | `[MiddlewareOrder(n)]` tường minh giúp thứ tự thực thi middleware có tính xác định. |
| `NALIX032` | Middleware Inbound bỏ qua AlwaysExecute | Thông tin | Middleware | Có | `MiddlewareStage.Inbound` bỏ qua `AlwaysExecute = true` (`AlwaysExecute` chỉ áp dụng cho `Outbound` và `Both`). |
| `NALIX033` | Middleware đã đăng ký dùng chung MiddlewareOrder với middleware khác trong cùng chuỗi | Thông tin | Middleware | Không | Các giá trị `[MiddlewareOrder]` trùng nhau trong một chuỗi pipeline làm giảm tính dự đoán được của thứ tự. |
| `NALIX035` | PacketOpcode nằm trong dải dành riêng | Cảnh báo | Usage | Không | Các opcode `0x0000..0x00FF` (`0..255`) được dành cho khung hệ thống/giao thức của Nalix. Dùng `>= 0x0100` cho gói tin ứng dụng. |
| `NALIX036` | PacketOpcode đã được dùng trong một controller khác | Cảnh báo | Usage | Không | Mọi handler đăng ký trên cùng một dispatcher phải có opcode duy nhất trên toàn cục. |
| `NALIX038` | OpCode trong tài liệu không khớp với attribute | Thông tin | Documentation | Không | Các comment XML nhắc tới một opcode nên khớp với giá trị của `[PacketOpcode]`. |

## 3. Bố cục tuần tự hóa (`NALIX013`–`NALIX022`, `NALIX034`, `NALIX046`, `NALIX051`)

| ID | Tiêu đề | Mức độ | Danh mục | Code Fix | Mô tả |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX013` | Thành viên tuần tự hóa tường minh nên khai báo SerializeOrder | Cảnh báo | Serialization | Có | Các kiểu có `[SerializePackable(SerializeLayout.Explicit)]` nên chú thích thành viên được tuần tự hóa bằng `[SerializeOrder(n)]` hoặc `[SerializeIgnore]`. |
| `NALIX014` | Giá trị SerializeOrder bị trùng | Cảnh báo | Serialization | Có | Các giá trị `[SerializeOrder]` phải duy nhất trên mọi thành viên được tuần tự hóa trong một chuỗi kiểu. |
| `NALIX015` | SerializeIgnore xung đột với SerializeOrder | Cảnh báo | Serialization | Có | Một thành viên không thể vừa có `[SerializeIgnore]` vừa có `[SerializeOrder]`. |
| `NALIX016` | SerializeDynamicSize không cần thiết trên thành viên kích thước cố định | Thông tin | Serialization | Không | `[SerializeDynamicSize]` chỉ có ý nghĩa với thành viên kích thước thay đổi (`string`, mảng, tập hợp). |
| `NALIX021` | SerializeOrder không nên là số âm | Cảnh báo | Serialization | Không | Chỉ số `[SerializeOrder]` phải `>= 0`. |
| `NALIX022` | `SerializeHeader(0)` là dành riêng trên kiểu PacketBase | Cảnh báo | Serialization | Không | Với các lớp con `PacketBase<TSelf>`, thứ tự `0` (`PacketHeaderOffset.Header`) đã bị `PacketBase.Header` chiếm. Bắt đầu các field của người dùng từ thứ tự `0` qua `[SerializeOrder(0)]` hoặc dùng offset header khác 0. |
| `NALIX034` | SerializeHeader xung đột với SerializeOrder | Cảnh báo | Serialization | Không | Không kết hợp `[SerializeHeader]` và `[SerializeOrder]` trên cùng một thành viên. |
| `NALIX046` | Khoảng cách SerializeOrder quá lớn | Thông tin | Serialization | Không | `[SerializeOrder]` là metadata thứ tự field tuần tự, không phải offset byte thô. Khoảng cách `> 16` sẽ kích hoạt gợi ý này. |
| `NALIX051` | Kiểu `IFixedSizeSerializable` chứa thành viên tuần tự hóa động | Cảnh báo | Serialization | Không | Các kiểu implement `IFixedSizeSerializable` không được chứa chuỗi, mảng hoặc tập hợp có độ dài thay đổi. |

## 4. Vòng đời, cấu hình, SDK và hosting (`NALIX020`, `NALIX023`–`NALIX028`, `NALIX037`, `NALIX039`–`NALIX045`, `NALIX057`)

| ID | Tiêu đề | Mức độ | Danh mục | Code Fix | Mô tả |
| --- | --- | :---: | --- | :---: | --- |
| `NALIX020` | `ResetForPool` của gói tin nên gọi `base.ResetForPool` | Cảnh báo | Lifecycle | Có | Các override `ResetForPool()` tùy chỉnh trên `PacketBase<TSelf>` phải gọi `base.ResetForPool()` để header và priority cơ sở được đặt lại. |
| `NALIX023` | Kiểu property cấu hình không được hỗ trợ | Cảnh báo | Configuration | Có | `ConfigurationLoader` hỗ trợ các property kiểu nguyên thủy, `decimal`, `string`, `Guid`, `TimeSpan`, `DateTime` và `enum`. |
| `NALIX024` | Property cấu hình không bind được | Thông tin | Configuration | Có | Các property `ConfigurationLoader` public không có setter public không thể bind từ file `.ini` và nên khai báo `[ConfiguredIgnore]`. |
| `NALIX027` | `RequestOptions.RetryCount` không nên là số âm | Cảnh báo | SDK | Không | `RequestOptions.RetryCount` phải `>= 0`. |
| `NALIX028` | `RequestOptions.TimeoutMs` không nên là số âm | Cảnh báo | SDK | Không | `RequestOptions.TimeoutMs` phải `>= 0` (`0` tắt timeout cho mỗi lần thử). |
| `NALIX037` | Có thể cấp phát bộ nhớ trong hot path | Thông tin | Performance | Không | Cảnh báo khi có `new byte[...]`, `.ToArray()` hoặc cấp phát do LINQ bên trong handler gói tin, middleware và method serializer. |
| `NALIX039` | Có thể rò rỉ `IBufferLease` | Cảnh báo | Usage | Không | Mọi `IBufferLease` đã thuê phải được dispose bằng `using`, được trả về, hoặc được chuyển giao trên mọi nhánh điều khiển. |
| `NALIX040` | `NetworkApplicationBuilder` nên cấu hình `BufferPoolManager` | Thông tin | Performance | Không | Gợi ý gọi `.UseBufferPoolManager(...)` khi xây dựng pipeline host tùy chỉnh. |
| `NALIX041` | `NetworkApplicationBuilder` nên cấu hình `ConnectionHub` | Thông tin | Usage | Không | Gợi ý gọi `.UseConnectionHub(...)` khi xây dựng pipeline host tùy chỉnh. |
| `NALIX042` | Kiểu handler của `NetworkApplicationBuilder` không thể khởi tạo | Cảnh báo | Usage | Không | Các kiểu controller truyền vào `MapHandlers` phải là lớp cụ thể, có thể khởi tạo. |
| `NALIX043` | Kiểu metadata provider của `NetworkApplicationBuilder` không thể khởi tạo | Cảnh báo | Usage | Không | Các kiểu metadata provider phải là lớp cụ thể, có thể khởi tạo. |
| `NALIX044` | `NetworkApplicationBuilder` nên cấu hình một binding TCP | Thông tin | Usage | Không | Cảnh báo khi `.Build()` được gọi mà không có binding listener transport nào. |
| `NALIX045` | `NetworkApplicationBuilder` nên cấu hình TCP trước UDP | Thông tin | Usage | Không | Các listener UDP đã xác thực dựa vào phiên được thiết lập qua TCP (`MapTcp` nên đi cùng `MapUdp`). |
| `NALIX057` | `RequestOptions` dùng timeout vô hạn với retry | Thông tin | SDK | Có | Đặt `TimeoutMs = 0` với `RetryCount > 0` làm cho các lần retry không bao giờ xảy ra vì lần thử đầu tiên chờ vô hạn. |

## 5. Chẩn đoán của Source Generator (`NALIX059`–`NALIX068`)

Được phát ra bởi `Nalix.Analyzers.Generators` (`analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`):

| ID | Tiêu đề | Mức độ | Danh mục | Generator | Mô tả |
| --- | --- | :---: | --- | --- | --- |
| `NALIX059` | Thiếu method `Create()` tĩnh | Lỗi | `Nalix.Codec.Serialization` | `SerializeFormatterGenerator` | Kiểu tham chiếu được đánh dấu `[GenerateFormatter]` phải khai báo method `Create()` tĩnh trả về một instance để pooling/deserialization (được `PacketBase<TSelf>` kế thừa tự động). |
| `NALIX060` | Lớp gói tin phải là partial | Lỗi | `Nalix.Codec.Serialization` | `PacketSchemaGenerator` | Các lớp kế thừa `PacketBase<TSelf>` phải khai báo `partial` để `PacketSchemaGenerator` có thể sinh `Length`, `ResetForPool()` và `Size`. |
| `NALIX063` | Không tìm thấy constructor có thể truy cập | Lỗi | `Nalix.Framework.Injection` | `InstanceGenerator` | Lớp `[Injectable]` không có constructor `public` hoặc `internal` nào mà source generator có thể gọi. |
| `NALIX064` | Constructor không rõ ràng trong lớp injectable | Lỗi | `Nalix.Framework.Injection` | `InstanceGenerator` | Lớp `[Injectable]` có nhiều constructor `public`/`internal` với cùng số tham số không phải cấu hình (`args.Length`) và các kiểu tham số không rời nhau. |
| `NALIX065` | Lớp con `SingletonBase` thiếu constructor không tham số có thể truy cập | Cảnh báo | `Nalix.Framework.Injection` | `InstanceGenerator` | Lớp con `SingletonBase<T>` không có constructor không tham số `public` hoặc `internal` (chỉ `protected` thì bộ khởi tạo được sinh ra không truy cập được). |
| `NALIX066` | Kiểu trả về không được hỗ trợ của method `[RpcService]` | Lỗi | `Nalix.SDK.Transport` | `RpcClientGenerator` | Method của interface `[RpcService]` phải trả về `ValueTask`, `ValueTask<T>`, `RpcCall<T>` hoặc `RpcStream<T>`. |
| `NALIX067` | Method handler bị loại khỏi bảng điều phối | Lỗi | `Nalix.Runtime.Dispatching` | `PacketHandlerGenerator` | Tham số `0` của handler `[PacketOpcode]` là `IPacketContext<TPacket>`; mọi tham số bổ sung (`1..N`) phải là kiểu tham chiếu được đánh dấu `[FromScope]`. |
| `NALIX068` | `StaticOpCode` của gói tin bị trùng | Lỗi | `Nalix.Codec.DataFrames` | `PacketRegistryGenerator` | Hai hoặc nhiều lớp gói tin trong compilation cùng khai báo một `StaticOpCode`. |

## 6. Chẩn đoán bảo mật, pooling, RPC, injection và vòng đời (`NALIX071`–`NALIX107`)

| ID | Tiêu đề | Mức độ | Danh mục | Phạm vi | Mô tả |
| --- | --- | :---: | --- | --- | --- |
| `NALIX071` | Dùng abstraction mật mã của Nalix thay vì `System.Security.Cryptography` | Cảnh báo | Security | Chỉ Core | Dùng trực tiếp mật mã của BCL trong các assembly Nalix Core sẽ bỏ qua việc rà soát bảo mật (`OsCsprng` và `CryptographicOperations.FixedTimeEquals` được đưa vào danh sách cho phép). |
| `NALIX072` | Dùng định dạng endpoint không cấp phát bộ nhớ trong hot path | Thông tin | Performance | Chỉ Core | `IPAddress.ToString()`, `INetworkEndpoint.Address` và `SocketEndpoint.Address` cấp phát chuỗi. Ưu tiên `TryFormatAddress` trên hot path. |
| `NALIX073` | `catch(Exception)` nên lọc qua `ExceptionClassifier.IsNonFatal()` | Cảnh báo | Correctness | Chỉ Core | Mệnh đề `catch` trống hoặc `catch (Exception)` trong các assembly Core phải lọc bằng `when (...)` hoặc ném lại, để các ngoại lệ fatal của runtime không bị nuốt. |
| `NALIX074` | Tránh định dạng chuỗi sớm trong ghi log chẩn đoán | Thông tin | Performance | Chỉ Core | Chuỗi nội suy, `string.Format` hoặc phép nối bên trong `new DiagnosticLog(...)` vẫn cấp phát bộ nhớ ngay cả khi chẩn đoán tắt. Hãy bảo vệ bằng `DiagnosticsEvents.Source.IsEnabled(...)`. |
| `NALIX075` | `PacketScope<T>` phải được dispose | Lỗi | Pooling | Mọi assembly | `PacketScope<T>` bao bọc một gói tin đã pool và phải được khai báo bằng `using` (`using PacketScope<T> scope = ...`) hoặc được dispose tường minh. |
| `NALIX076` | Packet context thoát khỏi phạm vi handler | Lỗi | Correctness | Mọi assembly | `IPacketContext<T>` và `context.Packet` được pool và trả về ngay khi handler kết thúc. Lưu chúng vào field, property, mảng/tập hợp, event, hoặc delegate của `Task.Run` / `ThreadPool` sẽ gây hỏng dữ liệu do dùng sau khi đã trả về. |
| `NALIX078` | Tránh reflection không giới hạn trong mã Nalix Core nhạy cảm với AOT | Cảnh báo | AOT | Chỉ Core | Đánh dấu `Assembly.GetTypes()`, `Expression.Compile()`, `MakeGenericType()`, `MethodInfo.Invoke()` và `Type.GetType(string)` trong các assembly Core. |
| `NALIX100` | Method `RpcService` có kiểu trả về không hợp lệ | Lỗi | Usage | Mọi assembly | Method trong interface `[RpcService]` phải trả về `ValueTask`, `ValueTask<T>`, `RpcCall<T>` hoặc `RpcStream<T>` (`Task` và `Task<T>` không được hỗ trợ). |
| `NALIX101` | Method `RpcService` có tham số không hợp lệ | Lỗi | Usage | Mọi assembly | Tham số `0` của method `[RpcService]` phải implement `IPacket`; các tham số sau đó chỉ có thể là `RequestOptions`, `Func<TResponse, bool>?`, `bool?` hoặc `CancellationToken`. |
| `NALIX102` | Interface `RpcService` chứa thành viên không phải method | Lỗi | Usage | Mọi assembly | Interface `[RpcService]` chỉ được khai báo method (không được có property, event hay indexer). |
| `NALIX103` | Interface `RpcService` thiếu attribute | Thông tin | Usage | Mọi assembly | Interface chứa method `[PacketOpcode]` phải được đánh dấu `[RpcService]` để `RpcClientGenerator` phát hiện được. |
| `NALIX104` | Field `[Inject]` không được là `readonly` | Lỗi | Usage | Mọi assembly | Field có chú thích `[Inject]` được điền giá trị bên trong method `InitializeDependencies()` được sinh ra và không thể là `readonly`. |
| `NALIX105` | Đã tắt analyzer Nalix: không resolve được symbol cần thiết | Cảnh báo | Usage | Mọi assembly | Được phát ra khi bắt đầu compilation nếu không resolve được một symbol Nalix Core bắt buộc từ các assembly được tham chiếu. |
| `NALIX106` | `StaticOpCode` của gói tin đã được gói tin khác dùng | Lỗi | Usage | Mọi assembly | Hai kiểu gói tin trong compilation khai báo cùng một giá trị `StaticOpCode`. |
| `NALIX107` | `ResetForPool` của gói tin không đặt lại thành viên có thể thay đổi | Cảnh báo | Lifecycle | Mọi assembly | Override `ResetForPool()` thủ công trên lớp gói tin bỏ sót việc đặt lại một field hoặc property có thể thay đổi mà không được đánh dấu `[SkipClean]`. |

---

## Ví dụ `NALIX076` (`PacketContextEscapeAnalyzer`)

`IPacketContext<TPacket>` và `context.Packet` được thuê từ `ObjectPoolManager` và tự động trả về khi `ValueTask` của handler hoàn thành.

### Mẫu an toàn

```csharp
[PacketOpcode(0x1001)]
public async ValueTask HandleEchoAsync(IPacketContext<EchoPacket> context)
{
    // Sao chép các field kiểu giá trị hoặc bất biến vào biến cục bộ nếu cần dùng sau
    string message = context.Packet.Message;
    uint seq = context.Packet.SequenceId;

    // Await trực tiếp một helper hoặc method Sender trong vòng đời handler là an toàn
    await context.Sender.ReplyAsync(new EchoPacket
    {
        SequenceId = seq,
        Message = message
    }).ConfigureAwait(false);
}
```

### Mẫu không an toàn bị `NALIX076` bắt

```csharp
private static IPacketContext<EchoPacket>? s_leakedContext;

[PacketOpcode(0x1001)]
public void HandleUnsafe(IPacketContext<EchoPacket> context)
{
    // ERROR NALIX076: Lưu context hoặc packet vào field/property
    s_leakedContext = context;

    // ERROR NALIX076: Nắm giữ context hoặc bí danh packet cục bộ trong Task.Run
    EchoPacket alias = context.Packet;
    _ = Task.Run(() => ProcessInBackground(alias));

    // ERROR NALIX076: Nắm giữ context trong event handler
    context.Connection.ConnectionClosed += (_, _) => Log(context.Packet);
}
```
