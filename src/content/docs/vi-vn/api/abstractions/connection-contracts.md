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

## `IConnection`

`public interface IConnection : IConnectionErrorTracked, IDisposable` biểu diễn một kết nối client đang hoạt động (TCP, UDP hoặc WebSocket).

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
| `IsUdpCreated` | `bool` | `true` khi kết nối đã có binding transport UDP đang hoạt động. |
| `PacketClassifier` | `IOpCodeExtractor` | Bộ phân loại dùng để trích opcode 16-bit từ khung đầu vào thô. |
| `TCP` | `IConnection.ITransport` | Giao diện transport Stream/TCP (hoặc WebSocket). |
| `UDP` | `IConnection.ITransport?` | Giao diện transport Datagram/UDP (`null` cho đến khi UDP được gắn). |
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

Được `Connection`, `WebSocketConnection` và `PassthroughConnection` triển khai để cung cấp các bộ đếm lưu lượng nguyên tử:

| Thành phần | Kiểu | Mô tả |
| --- | --- | --- |
| `BytesSent` | `long` | Tổng số byte trên dây đã truyền qua kết nối này. |
| `BytesReceived` | `long` | Tổng số byte trên dây đã nhận qua kết nối này. |
| `PacketsDropped` | `long` | Tổng số gói tin bị loại do tràn hàng đợi hoặc giới hạn tốc độ. |
| `IncrementBytesSent(int bytes)` | `void` | Cộng nguyên tử `bytes` vào `BytesSent`. |
| `IncrementBytesReceived(int bytes)` | `void` | Cộng nguyên tử `bytes` vào `BytesReceived`. |
| `IncrementPacketsDropped()` | `void` | Tăng nguyên tử `PacketsDropped`. |

## `ConnectionSequenceState`

`public sealed class ConnectionSequenceState` (`Nalix.Abstractions.Networking`, `src/Nalix.Abstractions/Networking/ConnectionSequenceState.cs`) là đối tượng giữ số thứ tự của từng kết nối, có pool, dùng cho việc tiếp tục phiên. Các thuộc tính (`uint`, get/set): `TcpSendSequence`, `TcpReceiveSequence`, `UdpSendSequence`, `UdpReceiveSequence`. `ResetForPool()` đặt cả bốn về `0`.

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
- **`IOpCodeExtractor`**:
  - `ushort Extract(ReadOnlySpan<byte> payload)`
- **`ITransportSequencer`**:
  - `ISequenceCounter SendSequence { get; }`
  - `ISequenceCounter ReceiveSequence { get; }`
  - `uint CurrentSendSequence { get; }`
  - `uint CurrentReceiveSequence { get; }`
  - `uint NextSendSequence()`
  - `uint NextReceiveSequence()`

## API liên quan

- [Triển khai Connection](../network/connection/connection.md)
- [Triển khai Connection Hub](../network/connection/connection-hub.md)
- [Connection Guard](../network/connection/connection-guard.md)
- [Triển khai Protocol](../network/protocol.md)
- [Hợp đồng phiên](./session-contracts.md)
