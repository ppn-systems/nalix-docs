---
title: Hợp đồng kết nối
description: Hợp đồng mạng trong Nalix.Abstractions.Networking gồm IConnection, IConnectionHub, IProtocol, IListener, IFrameProcessor, IOpCodeExtractor và ITransportSequencer.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Networking` (và `Nalix.Abstractions.Networking.Protocols`)  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Networking` định nghĩa các hợp đồng kết nối, hub, listener và protocol không phụ thuộc transport, được `Nalix.Network` triển khai và được `Nalix.Runtime` và `Nalix.Hosting` sử dụng.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/IConnection.cs`
- `src/Nalix.Abstractions/Networking/IConnection.ErrorTracked.cs`
- `src/Nalix.Abstractions/Networking/IConnection.Hub.cs`
- `src/Nalix.Abstractions/Networking/IConnection.Transmission.cs`
- `src/Nalix.Abstractions/Networking/IConnection.TrafficMetrics.cs`
- `src/Nalix.Abstractions/Networking/IConnectionEventArgs.cs`
- `src/Nalix.Abstractions/Networking/INetworkEndpoint.cs`
- `src/Nalix.Abstractions/Networking/IListener.cs`
- `src/Nalix.Abstractions/Networking/IFrameProcessor.cs`
- `src/Nalix.Abstractions/Networking/ITransportSequencer.cs`
- `src/Nalix.Abstractions/Networking/TransportFraming.cs`
- `src/Nalix.Abstractions/Networking/IProtocol.cs`
- `src/Nalix.Abstractions/Networking/Protocols/IOpCodeExtractor.cs`
- `src/Nalix.Abstractions/IBufferLease.cs`
- `src/Nalix.Abstractions/LeaseRef.cs`
- `src/Nalix.Abstractions/BufferLeaseExtensions.cs`

## `IConnection`

`public interface IConnection : IConnectionErrorTracked, IDisposable` biểu diễn một kết nối client đang hoạt động (TCP, WebSocket hoặc phiên datagram).

| Thành phần | Kiểu | Mô tả |
| --- | --- | --- |
| `ConnectionId` | `ulong` | Snowflake 64-bit duy nhất được gán cho kết nối. |
| `UserId` | `string?` | Mã định danh người dùng đã xác thực do ứng dụng gán (tùy chọn). |
| `NetworkEndpoint` | `INetworkEndpoint` | Endpoint của client từ xa (`string Address { get; }`). |
| `IsDisposed` | `bool` | `true` khi kết nối đã đóng và đã được dispose. |
| `UpTime` | `long` | Thời gian kết nối đã hoạt động, tính bằng mili giây. |
| `LastPingTime` | `long` | Độ trễ ping round-trip gần nhất, tính bằng mili giây. |
| `ExcludeFromIdleTimeout` | `bool` | Khi `true`, loại kết nối khỏi các lượt quét idle timeout của `TimingWheel`. |
| `Attributes` | `IObjectMap<AttributeKey, object>` | Kho metadata key-value theo từng kết nối, an toàn đa luồng. |
| `Level` | `PermissionLevel` | Mức ủy quyền hiện tại (`NONE`, `POW_VERIFIED`, `ESTABLISHED`, `USER`, v.v.). |
| `Algorithm` | `CipherSuiteType` | Bộ mật mã đối xứng/AEAD đã thương lượng (`Chacha20Poly1305`, `Salsa20Poly1305`, v.v.). |
| `Secret` | `Bytes32` | Khóa bí mật phiên 32 byte đã thương lượng (`Bytes32`, bị xóa khi đóng). |
| `PacketClassifier` | `IOpCodeExtractor` | Bộ phân loại dùng để trích opcode 16-bit từ khung đầu vào thô. |
| `Transport` | `IConnection.ITransport` | Transport của kết nối này: luồng TCP, WebSocket hoặc phiên datagram (`src/Nalix.Abstractions/Networking/IConnection.Transmission.cs`). Ép kiểu sang `IConnection.ISocketTransport` để truy cập socket, hoặc sang `IDatagramTransport` trên kết nối datagram. |
| `ErrorCount` | `int` | Kế thừa từ `IConnectionErrorTracked` — tổng số lỗi protocol/framing đã ghi nhận trên kết nối này. |
| `IncrementErrorCount()` | `void` | Tăng nguyên tử `ErrorCount` (được `ConnectionGuard` kiểm tra). |
| `OnCloseEvent` | `event EventHandler<IConnectionEventArgs>` | Được kích hoạt khi kết nối đóng. |
| `OnProcessEvent` | `event EventHandler<IConnectionEventArgs>` | Được kích hoạt khi khung đầu vào thô sẵn sàng cho `IProtocol.ProcessMessage`. |
| `OnPostProcessEvent` | `event EventHandler<IConnectionEventArgs>` | Được kích hoạt sau khi `IProtocol.PostProcessMessage` hoàn tất. |
| `Disconnect(string? reason = null)` | `void` | Đóng ngay lập tức và hủy đăng ký kết nối. |
| `UpdateIdleTimeout(int newTimeoutMs)` | `void` | Cập nhật động ngân sách idle timeout của kết nối này trong `TimingWheel`. |

### Hợp đồng transport lồng nhau (`IConnection.ITransport` & `IConnection.ISocketTransport`)

- **`IConnection.ITransport : ITransportSequencer`**:
  - `TransportFraming Framing { get; }` (`None`, `UInt16LengthPrefixed`, `VarIntLengthPrefixed`)
  - `void UseFraming(TransportFraming newFraming)`
  - `void Send(ReadOnlySpan<byte> message)`
  - `ValueTask SendAsync(ReadOnlyMemory<byte> message, CancellationToken cancellationToken = default)`
  - `void BeginReceive(CancellationToken cancellationToken = default)`
  - `ValueTask<IAsyncDisposable> AcquireSendLockAsync(CancellationToken cancellationToken = default)`
  - `ValueTask SendAsyncCore(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)`
  - `ValueTask SendAsyncCore(IBufferLease lease, CancellationToken cancellationToken = default)`
- **`IConnection.ISocketTransport : ITransport`**:
  - `Socket Socket { get; }`
  - `Task? ReceiveLoopTask { get; }`
  - `byte[]? StolenData { get; }`
  - `Socket Unwrap()`

## `IConnectionTrafficMetrics`

Được `Connection`, `WebSocketConnection` và `DatagramConnection` triển khai để cung cấp các bộ đếm lưu lượng nguyên tử:

| Thành phần | Kiểu | Mô tả |
| --- | --- | --- |
| `BytesSent` | `long` | Tổng số byte trên dây đã truyền qua kết nối này. |
| `BytesReceived` | `long` | Tổng số byte trên dây đã nhận qua kết nối này. |
| `PacketsDropped` | `long` | Tổng số gói tin bị loại do tràn hàng đợi hoặc giới hạn tốc độ. |
| `IncrementBytesSent(int bytes)` | `void` | Cộng nguyên tử `bytes` vào `BytesSent`. |
| `IncrementBytesReceived(int bytes)` | `void` | Cộng nguyên tử `bytes` vào `BytesReceived`. |
| `IncrementPacketsDropped()` | `void` | Tăng nguyên tử `PacketsDropped`. |

## `ConnectionSequenceState`

`public sealed class ConnectionSequenceState` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionSequenceState.cs`) là đối tượng giữ số thứ tự của từng kết nối, có pool, dùng cho việc tiếp tục phiên. Các thuộc tính (`uint`, get/set): `TcpSendSequence`, `TcpReceiveSequence`. `ResetForPool()` đặt cả hai về `0`. Các thuộc tính sequence `Udp*` đã bị loại bỏ.

## `ConnectionAttributes`

`public static class ConnectionAttributes` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionAttributes.cs`) chứa các giá trị `AttributeKey` đã biết được lưu trong `IConnection.Attributes`:

| Trường | Tên khóa | Mô tả |
| --- | --- | --- |
| `OwnerHub` | `nalix.owner_hub` | Connection hub sở hữu kết nối này. |
| `SequenceState` | `nalix.connection.sequence_state` | Trạng thái số thứ tự dùng chung (`ConnectionSequenceState`) được lưu trong vòng đời kết nối. |
| `RuntimeState` | `nalix.connection.runtime_state` | Trạng thái riêng của runtime được lưu trong vòng đời kết nối. |
| `HandshakeDeadlineExtension` | `nalix.connection.handshake_deadline_extension` | Phần gia hạn một lần, tính bằng mili giây (`int`), mà cổng proof-of-work cấp cho thời hạn trước khi xác thực. Lớp bắt tay đặt tối đa một lần cho mỗi kết nối; lớp transport giới hạn nó ở 60 giây. |

`AttributeKey` (`Nalix.Abstractions`, `src/Nalix.Abstractions/AttributeKey.cs`) được tạo bằng `public static AttributeKey FromName(string name)`, hàm này băm `name` thành khóa 64-bit ổn định (FNV-1a) và ném `ArgumentNullException` khi `name` là `null`. Tên chỉ được giữ lại để chẩn đoán trong bản build DEBUG.

## Hợp đồng datagram

Không gian tên `Nalix.Abstractions.Networking.Datagrams` (`src/Nalix.Abstractions/Networking/Datagrams/`). Phiên datagram là một phiên UDP có xác thực, được mở bằng ticket do một phiên stream (TCP hoặc WebSocket) đã thiết lập phát hành; xem `NetworkTransport.DATAGRAM` và `DeliveryMethod` trong [Các enumeration dùng chung](./enums.md).

### `IDatagramTransport`

`public interface IDatagramTransport : IConnection.ITransport` là transport của một phiên datagram. Các lượt gửi qua `IConnection.ITransport` dùng `DeliveryMethod.ReliableOrdered` trên kênh `0`. Mọi datagram đều được bảo vệ bởi AEAD của phiên và cửa sổ chống phát lại, nên các khung nhận được được coi là đã mã hóa trên dây và số thứ tự bên trong của chúng không được kiểm tra lại.

| Thành phần | Chữ ký | Mô tả |
| --- | --- | --- |
| `SendAsync` | `ValueTask SendAsync(ReadOnlyMemory<byte> message, DeliveryMethod method, byte channel, CancellationToken cancellationToken = default)` | Gửi một khung Nalix với phương thức chuyển trên một kênh; thông điệp được sao chép trước khi lời gọi trả về. |
| `WithDelivery` | `IConnection.ITransport WithDelivery(DeliveryMethod method, byte channel)` | Trả về một view được cache, trong đó các lượt gửi dùng `method` trên `channel`. Ném `ArgumentOutOfRangeException` nếu phương thức không hợp lệ hoặc kênh không nhỏ hơn số kênh của phiên. |

### `IDatagramTicketIssuer` và `DatagramTicketInfo`

`public interface IDatagramTicketIssuer` được datagram listener triển khai. `DatagramTicketInfo IssueTicket(IConnection streamConnection, Action<IConnection>? onAccepted = null)` phát hành ticket dùng một lần; secret, danh tính và mức quyền của kết nối stream được chụp lại (snapshot) tại thời điểm đó. `onAccepted` chạy trên kết nối datagram mới sau khi datagram đầu tiên của nó được xác thực, trước khi nó được đăng ký và điều phối.

`public readonly record struct DatagramTicketInfo` mang các giá trị của ticket:

| Trường | Kiểu | Mô tả |
| --- | --- | --- |
| `ConnectionId` | `ulong` | Mã định danh kết nối datagram (từ CSPRNG). |
| `Nonce` | `UInt128` | Nonce ticket 16 byte giúp khóa phiên luôn mới. |
| `Port` | `ushort` | Cổng UDP để gửi tới; host là host của phiên stream. |
| `ExpiresInSeconds` | `ushort` | Số giây mà datagram đầu tiên phải đến nơi. |
| `IdleTimeoutMs` | `int` | Idle timeout của phiên. |
| `MaxMessageSize` | `int` | Thông điệp lớn nhất mà mỗi bên chấp nhận. |
| `ChannelCount` | `byte` | Số kênh. |
| `ReceiveBufferBytes` | `long` | Tổng số byte máy chủ đệm cho việc sắp thứ tự và ghép lại. |
| `ChannelReceiveBufferBytes` | `long` | Số byte máy chủ đệm cho mỗi kênh. |

### `IDatagramProtection` và `IDatagramProtectionFactory`

`public interface IDatagramProtection : IDisposable` niêm phong và mở các datagram của một phiên bằng AEAD. Mỗi chiều có khóa độc lập, được cập nhật riêng và báo hiệu bằng bit key phase. Các triển khai không an toàn đa luồng, và một packet number chỉ được niêm phong tối đa một lần cho mỗi khóa.

| Thành phần | Mô tả |
| --- | --- |
| `int TagSize { get; }` | Kích thước tính bằng byte của tag xác thực gắn vào mọi payload đã niêm phong. |
| `bool SendKeyPhase { get; }` | Key phase của khóa gửi hiện tại; đảo mỗi lần `UpdateSendKey()`. |
| `void Seal(ulong packetNumber, ReadOnlySpan<byte> header, ReadOnlySpan<byte> plaintext, Span<byte> destination)` | Mã hóa `plaintext`, xác thực nó với `header` làm dữ liệu liên kết; `destination` nhận ciphertext cộng tag và không được chồng lấn với `plaintext`. |
| `bool TryOpen(ulong packetNumber, bool keyPhase, ReadOnlySpan<byte> header, ReadOnlySpan<byte> ciphertextAndTag, Span<byte> plaintext)` | Xác thực và giải mã một payload; trả về `true` khi payload xác thực hợp lệ. Payload có key phase khác được mở bằng khóa trước hoặc khóa kế tiếp. |
| `void UpdateSendKey()` | Thay khóa gửi bằng khóa kế tiếp trong lịch khóa. |
| `void DiscardPreviousReceiveKey()` | Xóa sạch khóa nhận trước đó. |

`public interface IDatagramProtectionFactory` tạo cơ chế bảo vệ của một phiên: `IDatagramProtection Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer)`. Bên gọi chịu trách nhiệm dispose kết quả. Triển khai mặc định là `ChaCha20Poly1305DatagramProtectionFactory` trong `Nalix.Codec` (xem [Nalix.Codec](../../packages/nalix-codec.md)).

## `IConnectionHub`

`public interface IConnectionHub : IReportable, IDisposable` là registry phân mảnh (sharded), an toàn đa luồng của tất cả kết nối máy chủ đang hoạt động:

| Thành phần | Chữ ký | Mô tả |
| --- | --- | --- |
| `Count` | `int Count { get; }` | Tổng số kết nối đang được đăng ký. |
| `ConnectionUnregistered` | `event Action<IConnection>?` | Được phát ra khi một kết nối bị gỡ khỏi hub. |
| `RegisterConnection` | `void RegisterConnection(IConnection connection)` | Đăng ký một kết nối vừa được chấp nhận. |
| `UnregisterConnection` | `void UnregisterConnection(IConnection connection)` | Gỡ một kết nối khỏi hub. |
| `GetConnection(ulong)` | `IConnection? GetConnection(ulong id)` | Tra cứu kết nối đang hoạt động theo `ConnectionId` 64-bit. |
| `GetConnection(ReadOnlySpan<byte>)` | `IConnection? GetConnection(ReadOnlySpan<byte> id)` | Tra cứu kết nối đang hoạt động theo span Snowflake little-endian 8 byte. |
| `ListConnections()` | `IReadOnlyCollection<IConnection> ListConnections()` | Trả về snapshot của tất cả kết nối đang hoạt động. |
| `ListConnections(INetworkEndpoint)` | `IReadOnlyCollection<IConnection> ListConnections(INetworkEndpoint endPoint)` | Trả về tất cả kết nối đang hoạt động khớp với `endPoint`. |

## `IProtocol` & các hợp đồng hỗ trợ pipeline

- **`IProtocol : IDisposable, IReportable`** (`Nalix.Abstractions.Networking`):
  - `bool KeepConnectionOpen { get; }`
  - `IFrameProcessor FrameProcessor { get; }`
  - `IOpCodeExtractor OpCodeExtractor { get; }`
  - `void OnAccept(IConnection connection, CancellationToken cancellationToken = default)`
  - `void ProcessMessage(object? sender, IConnectionEventArgs args)`
  - `void PostProcessMessage(object? sender, IConnectionEventArgs args)`
- **`IListener : IActivatable, IReportable`**:
  - `void Activate(CancellationToken cancellationToken = default)` (kế thừa từ `IActivatable`)
  - `void Deactivate(CancellationToken cancellationToken = default)` (kế thừa từ `IActivatable`)
- **`IFrameProcessor`**:
  - `bool SupportsInlineProcessing => false`
  - `void ProcessFrame(object? sender, IConnectionEventArgs args)`
  - `void OnFrameRejected(IConnection connection, ReadOnlySpan<byte> frame)` (triển khai mặc định không làm gì)
  - `OnFrameRejected` được gọi khi transport bỏ một frame đã nhận thay vì chuyển cho `ProcessFrame`, vì ngân sách frame đang chờ của kết nối hoặc của địa chỉ từ xa đã đầy (xem `NetworkCallbackOptions`). Phương thức này cho phép protocol phản hồi yêu cầu bị bỏ (ví dụ bằng lỗi giới hạn tốc độ có thể thử lại) thay vì để client chờ đến timeout. Nó chạy trên đường nhận trong lúc kết nối đang quá tải, nên không được chặn và không nên phản hồi mọi frame bị từ chối trong một đợt flood. `frame` là frame thô như đã nhận (header ở dạng văn bản thường, phần thân vẫn còn mã hóa hoặc nén) và chỉ hợp lệ trong suốt lời gọi.
- **`IOpCodeExtractor`**:
  - `ushort Extract(ReadOnlySpan<byte> payload)`
- **`ITransportSequencer`**:
  - `ISequenceCounter SendSequence { get; }`
  - `ISequenceCounter ReceiveSequence { get; }`
  - `uint CurrentSendSequence { get; }`
  - `uint CurrentReceiveSequence { get; }`
  - `uint NextSendSequence()`
  - `uint NextReceiveSequence()`

## `IBufferLease`, `LeaseRef` & `BufferLeaseExtensions`

`Nalix.Abstractions.IBufferLease` (`public interface IBufferLease : IDisposable`) là hợp đồng buffer pooled có đếm tham chiếu, dùng bởi `SendAsyncCore(IBufferLease, ...)` và đường nhận. Phần implementation là [BufferLease](../environment/memory/buffer-lease.md).

- `int Length { get; }`, `int Capacity { get; }`, `bool EncryptedOnWire { get; set; }`
- `Span<byte> Span { get; }`, `Span<byte> SpanFull { get; }`, `ReadOnlyMemory<byte> Memory { get; }`
- `int Generation => 0` — thay đổi mỗi khi tham chiếu cuối cùng tới lease được giải phóng. Instance lease được pool và tái sử dụng, nên bên giữ đã ghi lại giá trị này có thể biết lease nay thuộc chủ khác. Implementation không bao giờ tái sử dụng giữ mặc định `0`.
- `void Retain()`, `void CommitLength(int length)`, `bool ReleaseOwnership(out byte[]? buffer, out int start, out int length)`

`LeaseRef` (`public readonly ref struct LeaseRef`) là view chỉ đọc của một lease mà bên gọi vẫn sở hữu. Nó không có `Dispose`, và vì là `ref struct` nên không thể lưu vào field, bị lambda bắt hay giữ qua `await`.

| Thành viên | Mô tả |
| --- | --- |
| `LeaseRef(IBufferLease lease)` | Tạo view và ghi lại `lease.Generation`. Ném `ArgumentNullException` khi `lease` là `null`. |
| `bool IsDefault` | `true` với view mặc định, không trỏ tới lease nào. |
| `bool IsAlive` | `true` khi lease chưa được giải phóng kể từ lúc tạo view. Bản debug assert trên mỗi lần truy cập. |
| `int Length`, `bool EncryptedOnWire`, `ReadOnlySpan<byte> Span` | Chuyển tiếp từ lease; ném `InvalidOperationException` trên view mặc định. |
| `IBufferLease Retain()` | Lấy thêm một tham chiếu và trả về lease; bên gọi sở hữu nó và phải dispose đúng một lần. Ném `ObjectDisposedException` khi lease đã giải phóng buffer. |

`BufferLeaseExtensions.AsRef([Borrowed] this IBufferLease lease)` (`public static LeaseRef AsRef(...)`) tạo `LeaseRef` cho một lease.

## API liên quan

- [Triển khai Connection](../network/connection/connection.md)
- [Triển khai Connection Hub](../network/connection/connection-hub.md)
- [Connection Guard](../network/connection/connection-guard.md)
- [Triển khai Protocol](../network/protocol.md)
- [Hợp đồng phiên](./session-contracts.md)
