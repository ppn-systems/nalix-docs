---
title: Các enumeration dùng chung
description: Tham chiếu đầy đủ, đồng bộ với mã nguồn, cho mọi enumeration trong Nalix.Abstractions: mạng, điều khiển protocol, bảo mật, định danh, tuần tự hóa, middleware và đồng thời.
section: API Reference
package: Nalix.Abstractions
---

**Assembly:** `Nalix.Abstractions`  
**Các không gian tên:** `Nalix.Abstractions.Networking`, `Nalix.Abstractions.Networking.Protocols`, `Nalix.Abstractions.Networking.Packets`, `Nalix.Abstractions.Security`, `Nalix.Abstractions.Identity`, `Nalix.Abstractions.Serialization`, `Nalix.Abstractions.Middleware`, `Nalix.Abstractions.Concurrency`

Trang này cung cấp tham chiếu đầy đủ, đã kiểm chứng với mã nguồn, cho mọi enumeration trong `Nalix.Abstractions`.

---

## 1. Mạng, transport & khung gói tin

### `NetworkTransport` (`byte`)

Xác định giao thức transport mạng (`src/Nalix.Abstractions/Networking/NetworkTransport.cs`):

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `TCP` | `0` | Giao thức điều khiển truyền tải (luồng đáng tin cậy). |
| `UDP` | `1` | Giao thức datagram người dùng (datagram độ trễ thấp). |
| `WEBSOCKET` | `2` | WebSocket qua TCP (luồng có khung theo RFC 6455). |

### `TransportFraming` (`byte`)

Chọn chế độ đóng khung luồng trên `IConnection.ITransport` và `Protocol.Framing` (`src/Nalix.Abstractions/Networking/TransportFraming.cs`):

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `None` | `0` | Luồng thô không có khung (dùng cho passthrough hoặc socket trước khi nâng cấp). |
| `UInt16LengthPrefixed` | `1` | Tiền tố độ dài `ushort` little-endian 2 byte (mặc định cho TCP của Nalix). |
| `VarIntLengthPrefixed` | `2` | Tiền tố số nguyên có độ dài thay đổi LEB128 (được điều khiển bởi `VarIntFramingOptions`). |

### `OperatingMode` (`byte`)

Cấu hình chế độ hoạt động của listener trong `IProtocolBindingBuilder.WithMode(...)`:

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `Server` | `0` | Chế độ máy chủ Nalix tiêu chuẩn có xác thực theo phiên (`UdpServerListener`). |
| `Passthrough` | `1` | Chế độ datagram không trạng thái, không kết nối (`UdpPassthroughListener` + `PassthroughConnection`). |

### `ProtocolOpCode` (`ushort`)

Các opcode hệ thống và protocol được dành riêng (`0x0000..0x00FF`, `src/Nalix.Abstractions/Networking/Protocols/ProtocolOpCode.cs`). Gói ứng dụng phải dùng `>= 0x0100` (được `NALIX035` kiểm tra).

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `SESSION_INIT` | `0x0000` | Client bắt đầu bắt tay X25519 với khóa công khai tạm thời và nonce. |
| `SYSTEM_CONTROL` | `0x0001` | Khung điều khiển hệ thống (`Control`: `PING`, `PONG`, `DISCONNECT`, `ERROR`, v.v.). |
| `SESSION_SIGNAL` | `0x0002` | Luồng tiếp tục phiên (`SessionResume`: yêu cầu, xác nhận hoặc từ chối). |
| `SESSION_PROOF` | `0x0003` | Client chứng minh sở hữu khóa phiên đã dẫn xuất qua hash transcript. |
| `SYSTEM_TIMESYNC` | `0x0004` | Khung đồng bộ đồng hồ độ phân giải cao (`TimeSync`). |
| `SESSION_TOFU` | `0x0005` | Khung định danh X25519 tĩnh Trust-On-First-Use (`SessionTofu`). |
| `SESSION_CHALLENGE` | `0x0006` | Phản hồi bắt tay của máy chủ, mang khóa công khai tạm thời, nonce và chữ ký của máy chủ. |
| `SESSION_ESTABLISHED` | `0x0007` | Máy chủ xác nhận phiên đã mã hóa được thiết lập (`SessionEstablished`). |
| `SYSTEM_DIRECTIVE` | `0x0008` | Khung chỉ thị lúc chạy từ máy chủ đến client (`Directive`: throttle, redirect, notice). |
| `SESSION_REKEY` | `0x0009` | Khung xoay vòng khóa đối xứng giữa chừng phiên. |
| `POW_CHALLENGE` | `0x000A` | Câu đố Proof-of-Work do máy chủ phát hành (`ProofOfWorkChallenge`). |
| `POW_PROOF` | `0x000B` | Lời giải Proof-of-Work do client gửi (`ProofOfWorkProof`). |
| `TUNNEL_REQUEST` | `0x00F3` | Gói yêu cầu tunnel. |
| `TUNNEL_PROVIDE_ACK` | `0x00F4` | Xác nhận cung cấp tunnel. |
| `TUNNEL_CONNECT_ACK` | `0x00F5` | Xác nhận yêu cầu kết nối tunnel. |
| `TUNNEL_READY` | `0x00F6` | Thông báo tunnel đã sẵn sàng. |
| `TUNNEL_PROVIDE` | `0x00F7` | Gói metadata cung cấp tunnel. |
| `TUNNEL_CONNECT` | `0x00F8` | Yêu cầu kết nối tunnel logic. |
| `TRAVERSAL_REFLECTOR_INIT` | `0x00F9` | Khởi tạo reflector NAT traversal. |
| `TRAVERSAL_REFLECTOR_ALLOCATED` | `0x00FA` | Phản hồi cấp phát endpoint của reflector NAT traversal. |
| `TRAVERSAL_PEER_SIGNAL` | `0x00FB` | Gói báo hiệu ứng viên của peer. |
| `TRAVERSAL_NAT_PROBE_ACK` | `0x00FC` | Xác nhận probe khả năng tiếp cận NAT. |
| `TRAVERSAL_NAT_PROBE` | `0x00FD` | Probe kiểm tra khả năng tiếp cận peer trực tiếp. |
| `RUNTIME_OBSERVATION` | `0x00FE` | Gói telemetry quan sát lúc chạy. |
| `OBSERVABILITY_ACCESS` | `0x00FF` | Gói cấp quyền truy cập observability. |

### `PacketFlags` (`[Flags] byte`)

Các cờ bit được lưu tại offset byte `2` (`PacketHeaderOffset.Flags = 2`) của `PacketHeader` 6 byte (`src/Nalix.Abstractions/Networking/Packets/PacketFlags.cs`):

| Thành phần | Giá trị | Trạng thái | Mô tả |
| :--- | :--- | :---: | :--- |
| `NONE` | `0x00` | Đang dùng | Khung ứng dụng không nén, không mã hóa, không phân mảnh. |
| `COMPRESSED` | `1 << 1` (`0x02`) | Đang dùng | Payload được nén bằng `LZ4Codec`. |
| `ENCRYPTED` | `1 << 2` (`0x04`) | Đang dùng | Payload được bọc trong envelope AEAD/đối xứng `EnvelopeCipher`. |
| `FRAGMENTED` | `1 << 3` (`0x08`) | Đang dùng | Payload mang một đoạn `FragmentHeader` 8 byte. |
| `RELIABLE` | `1 << 4` (`0x10`) | `[Obsolete]` | Cờ độ tin cậy kiểu cũ — độ tin cậy transport được xác định bởi `NetworkTransport`. |
| `UNRELIABLE` | `1 << 5` (`0x20`) | `[Obsolete]` | Cờ không đáng tin cậy kiểu cũ — hãy dùng `NetworkTransport.UDP`. |
| `ACKNOWLEDGED` | `1 << 6` (`0x40`) | `[Obsolete]` | Cờ xác nhận kiểu cũ. |
| `SYSTEM` | `1 << 7` (`0x80`) | Đang dùng | Khung protocol cấp hệ thống (`Control`, `Directive`, `TimeSync`, bắt tay). |

### `PacketPriority` (`byte`)

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `NONE` | `0x00` | Mức ưu tiên tiêu chuẩn. |
| `LOW` | `0x01` | Ưu tiên nền thấp hơn bình thường. |
| `MEDIUM` | `0x02` | Mức ưu tiên trung bình. |
| `HIGH` | `0x03` | Ưu tiên cao (mặc định cho `Control` và `Directive` sau khi reset pool). |
| `URGENT` | `0x04` | Mức ưu tiên cao nhất (`TimeSync`). |

### `PacketHeaderOffset` (`int`)

Xác định offset byte của `PacketHeader` 6 byte và điểm bắt đầu các trường payload ứng dụng (`src/Nalix.Abstractions/Networking/Packets/PacketHeaderOffset.cs`):

| Thành phần | Giá trị | Kiểu | Mô tả |
| :--- | :--- | :--- | :--- |
| `OpCode` | `0` | `ushort` | Offset trên dây `0`: `OpCode` little-endian 2 byte. |
| `Flags` | `2` | `PacketFlags` | Offset trên dây `2`: `PacketFlags` 1 byte. |
| `Priority` | `3` | `PacketPriority` | Offset trên dây `3`: `PacketPriority` 1 byte. |
| `SequenceId` | `4` | `ushort` | Offset trên dây `4`: `SequenceId` little-endian 2 byte. |
| `Region` | `6` | — | Kết thúc header 6 byte (`PacketConstants.HeaderSize = 6`). |
| `MaxValue` | `255` | — | Giá trị offset header tối đa cho phép. |

---

## 2. Điều khiển & tín hiệu protocol

### `ControlType` (`byte`)

Xác định lệnh điều khiển được mang bởi khung `Control` (`src/Nalix.Abstractions/Networking/Protocols/ControlType.cs`):

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `NONE` | `0x00` | Không chỉ định thông điệp điều khiển. |
| `PING` | `0x01` | Yêu cầu kiểm tra sự sống và đo RTT. |
| `PONG` | `0x02` | Phản hồi kiểm tra sự sống, lặp lại sequence và timestamp của `PING`. |
| `DISCONNECT` | `0x04` | Thông báo ngắt kết nối có kiểm soát, mang `ProtocolReason`. |
| `ERROR` | `0x05` | Thông báo lỗi protocol hoặc dispatch. |
| `RESUME` | `0x09` | Tín hiệu tiếp tục phiên. |
| `SHUTDOWN` | `0x0A` | Thông báo máy chủ tắt có kiểm soát. |
| `REDIRECT` | `0x0B` | Chỉ dẫn chuyển endpoint. |
| `NOTICE` | `0x0D` | Thông báo bảo trì hoặc trạng thái mang tính thông tin. |
| `TIMEOUT` | `0x10` | Thông báo handler hoặc yêu cầu đã hết thời gian chờ. |
| `FAIL` | `0x11` | Thất bại thao tác chung. |
| `TIMESYNCREQUEST` | `0x12` | Client yêu cầu đồng bộ đồng hồ máy chủ. |
| `TIMESYNCRESPONSE` | `0x13` | Phản hồi của máy chủ mang timestamp độ phân giải cao. |
| `CIPHER_UPDATE` | `0x14` | Yêu cầu chuyển `CipherSuiteType` đang hoạt động. |
| `CIPHER_UPDATE_ACK` | `0x15` | Xác nhận chuyển đổi `CIPHER_UPDATE`. |
| `PUBLIC_KEY_REQUEST` | `0x16` | Client yêu cầu khóa công khai tĩnh của máy chủ (TOFU). |
| `POW_REQUEST` | `0x17` | Client yêu cầu câu đố Proof-of-Work. |
| `SESSION_REKEY` | `0x18` | Yêu cầu xoay vòng bí mật mã hóa của phiên. |
| `SESSION_REKEY_ACK` | `0x19` | Xác nhận hoàn tất xoay vòng khóa phiên. |
| `RESERVED1` | `0xFE` | Dành riêng cho mở rộng protocol trong tương lai. |
| `RESERVED2` | `0xFF` | Dành riêng cho mở rộng protocol trong tương lai. |

### `ControlFlags` (`[Flags] byte`)

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `NONE` | `0x00` | Không đặt cờ nào. |
| `IS_TRANSIENT` | `1 << 0` | Điều kiện mang tính tạm thời và an toàn để thử lại. |
| `IS_AUTHRELATED` | `1 << 1` | Điều kiện liên quan đến xác thực hoặc ủy quyền. |
| `HAS_REDIRECT` | `1 << 2` | Có metadata đích chuyển hướng. |
| `SLOW_DOWN` | `1 << 3` | Client nên giảm tốc độ gửi đi. |

### `ProtocolAdvice` (`byte`)

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `NONE` | `0` | Không cần hành động cụ thể. |
| `RETRY` | `1` | An toàn để thử lại ngay. |
| `BACKOFF_RETRY` | `2` | Thử lại với backoff lũy thừa. |
| `DO_NOT_RETRY` | `3` | Lỗi vĩnh viễn; không tự động thử lại. |
| `REAUTHENTICATE` | `4` | Thực hiện lại bắt tay hoặc xác thực. |
| `SLOW_DOWN` | `5` | Giảm tốc độ yêu cầu. |
| `RECONNECT` | `6` | Kết nối lại với máy chủ hoặc endpoint chuyển hướng. |
| `FIX_AND_RETRY` | `7` | Sửa payload yêu cầu trước khi thử lại. |

### `ProtocolReason` (`ushort`)

Các mã lý do chuẩn được mang trong khung `Control`, `Directive` và `SessionResume` (`src/Nalix.Abstractions/Networking/Protocols/ProtocolReason.cs`), nhóm theo dải số:

| Dải | Danh mục | Thành phần |
| :--- | :--- | :--- |
| `0–49` | Chung | `NONE = 0`, `UNKNOWN = 1`, `CANCELLED = 2`, `NOT_IMPLEMENTED = 3`, `TEMPORARY_FAILURE = 4`, `DEPRECATED = 5`, `REQUEST_INVALID = 6`, `INTERNAL_ERROR = 7` |
| `100–149` | Transport / Mạng | `TIMEOUT = 100`, `REMOTE_CLOSED = 101`, `LOCAL_CLOSED = 102`, `NETWORK_ERROR = 103`, `CONNECTION_REFUSED = 104`, `CONNECTION_RESET = 105`, `DNS_FAILURE = 106`, `MTU_VIOLATION = 107`, `CONGESTION = 108`, `KEEPALIVE_FAILED = 109` |
| `150–199` | Protocol / Khung | `PROTOCOL_ERROR = 150`, `VERSION_UNSUPPORTED = 151`, `FRAME_TOO_LARGE = 152`, `MESSAGE_TOO_LARGE = 153`, `UNEXPECTED_MESSAGE = 154`, `MISSING_REQUIRED_FIELD = 155`, `DUPLICATE_MESSAGE = 156`, `STATE_VIOLATION = 157`, `CRYPTO_UNSUPPORTED = 158`, `COMPRESSION_UNSUPPORTED = 159`, `OPERATION_UNSUPPORTED = 160`, `MALFORMED_PACKET = 161` |
| `200–259` | Bảo mật / AuthN / AuthZ | `UNAUTHENTICATED = 200`, `UNAUTHORIZED = 201`, `FORBIDDEN = 202`, `ACCOUNT_LOCKED = 203`, `ACCOUNT_SUSPENDED = 204`, `BANNED = 205`, `IP_BLOCKED = 206`, `RATE_LIMITED = 207`, `TOKEN_EXPIRED = 208`, `TOKEN_REVOKED = 209`, `DEVICE_UNTRUSTED = 210` |
| `260–299` | Mật mã / Toàn vẹn | `TLS_HANDSHAKE_FAILED = 260`, `TLS_REQUIRED = 261`, `TLS_CERT_INVALID = 262`, `SIGNATURE_INVALID = 263`, `CHECKSUM_FAILED = 264`, `DECRYPTION_FAILED = 265`, `REPLAY_DETECTED = 266`, `NONCE_INVALID = 267`, `POW_REQUIRED = 270`, `POW_INVALID = 271` |
| `300–349` | Dịch vụ / Hạ tầng | `SERVER_SHUTDOWN = 300`, `SERVICE_UNAVAILABLE = 301`, `MAINTENANCE = 302`, `OVERLOADED = 303`, `DEPENDENCY_FAILURE = 304`, `DATABASE_UNAVAILABLE = 305`, `CACHE_UNAVAILABLE = 306`, `QUEUE_UNAVAILABLE = 307` |
| `350–399` | Ứng dụng / Ngữ nghĩa | `VALIDATION_FAILED = 350`, `NOT_FOUND = 351`, `ALREADY_EXISTS = 352`, `PRECONDITION_FAILED = 353`, `STATE_CONFLICT = 354`, `UNSUPPORTED_MEDIA_TYPE = 355`, `SERIALIZATION_FAILED = 356`, `UNSUPPORTED_PACKET = 357`, `TRANSFORM_FAILED = 358` |
| `400–449` | Kiểm soát luồng / QoS | `THROTTLED = 400`, `SLOW_CONSUMER = 401`, `CREDIT_EXHAUSTED = 402`, `WINDOW_EXCEEDED = 403` |
| `450–499` | Tài nguyên / Hạn mức | `RESOURCE_LIMIT = 450`, `MEMORY_EXHAUSTED = 451`, `CONNECTION_LIMIT = 452`, `FD_LIMIT = 453`, `DISK_FULL = 454`, `CPU_LIMIT = 455` |
| `500–549` | Quyết định phía client / cục bộ | `CLIENT_QUIT = 500`, `ABORTED = 501`, `IDLE_TIMEOUT = 502`, `LOCAL_POLICY = 503`, `COMPRESSION_FAILED = 504` |
| `550–599` | Phiên / Thời gian / Đồng hồ | `SESSION_NOT_FOUND = 550`, `SESSION_EXPIRED = 551`, `DUPLICATE_SESSION = 552`, `KEY_ROTATION_REQUIRED = 553`, `TIME_SKEW = 554` |
| `600–649` | Nhất quán / Điều phối | `LEADER_CHANGE = 600`, `NOT_LEADER = 601`, `CONSENSUS_UNAVAILABLE = 602`, `STALE_READ = 603` |
| `650–699` | Định tuyến / Đặt vị trí | `REDIRECT = 650`, `MIGRATE = 651`, `REGION_UNAVAILABLE = 652` |
| `700–749` | Tuân thủ / Chính sách | `LEGAL_BLOCK = 700`, `CONTENT_VIOLATION = 701`, `AGE_RESTRICTED = 702`, `INVALID_USERNAME = 703`, `WEAK_PASSWORD = 704` |
| `900–999` | Dành riêng | `RESERVED_900 = 900`, `RESERVED_901 = 901` |

---

## 3. Bảo mật & định danh

### `CipherSuiteType` (`byte`)

Định nghĩa các bộ mật mã stream đối xứng và AEAD được `EnvelopeCipher` hỗ trợ (`src/Nalix.Abstractions/Security/CipherSuiteType.cs`):

| Thành phần | Giá trị | Chế độ | Kích thước nonce | Kích thước tag | Mô tả |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `None` | `0` | Bản rõ | — | — | Không mã hóa (mặc định trước khi bắt tay). |
| `Salsa20` | `3` | Đối xứng | 8 B | 0 B | Stream cipher Salsa20 (XOR keystream với nonce đã XOR với sequence). |
| `Chacha20` | `4` | Đối xứng | 12 B | 0 B | Stream cipher ChaCha20 theo RFC 8439. |
| `Salsa20Poly1305` | `7` | AEAD | 8 B | 16 B | Stream cipher Salsa20 + tag MAC Poly1305 16 byte tách rời. |
| `Chacha20Poly1305` | `8` | AEAD | 12 B | 16 B | AEAD ChaCha20-Poly1305 theo RFC 8439 (mặc định của `PacketEncryptionAttribute`). |

### `PermissionLevel` (`byte`)

Các mức thẩm quyền được gán cho `IConnection.Level` và được `PermissionMiddleware` kiểm tra (`src/Nalix.Abstractions/Security/PermissionLevel.cs`):

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `NONE` | `0` | Trạng thái kết nối ban đầu chưa được xác minh. |
| `POW_VERIFIED` | `10` | Client đã giải câu đố Proof-of-Work (`ProofOfWorkProof`). |
| `ESTABLISHED` | `20` | Client đã hoàn tất bắt tay mật mã X25519 (`HandshakeHandlers`). |
| `GUEST` | `25` | Phiên khách ẩn danh. |
| `READ_ONLY` | `50` | Người quan sát đã xác thực, chỉ có quyền đọc. |
| `USER` | `100` | Người dùng đã xác thực tiêu chuẩn (mặc định cho `[PacketPermission]`). |
| `SUPERVISOR` | `175` | Người kiểm duyệt hoặc quyền giám sát cao cấp. |
| `TENANT_ADMINISTRATOR` | `200` | Quản trị viên tổ chức hoặc tenant. |
| `SYSTEM_ADMINISTRATOR` | `225` | Quản trị viên hệ thống toàn máy chủ. |
| `OWNER` | `255` | Quyền root / chủ sở hữu. |

### `PermissionEvaluation` (`byte`)

Điều khiển cách `PermissionMiddleware` đánh giá `[PacketPermission]` (`src/Nalix.Abstractions/Security/PermissionEvaluation.cs`):

| Thành phần | Giá trị | Mô tả |
| :--- | :--- | :--- |
| `MinimumLevel` | `0` | Yêu cầu `connection.Level >= attribute.Level` (so sánh phân cấp, mặc định). |
| `StrictMatch` | `1` | Yêu cầu `connection.Level == attribute.Level` (khớp chính xác). |

### `SnowflakeType` (`byte`)

Phân loại các định danh `Snowflake` 64-bit (`Unknown = 0`, `Configuration = 1`, `Log = 2`, `System = 3`, `Account = 10`, `Session = 11`, `Message = 20`, `Notification = 21`, `Email = 22`, `Sms = 23`, `Order = 30`, `Inventory = 31`, `Transaction = 32`, `Invoice = 33`, `SupportTicket = 34`, `MaxValue = 255`).

---

## 4. Tuần tự hóa, middleware & đồng thời

### `SerializeLayout` (`byte`)

- `Auto = 0` — Bố cục tự động.
- `Sequential = 1` — Tuần tự hóa các trường/thuộc tính theo thứ tự khai báo.
- `Explicit = 2` — Tuần tự hóa các trường/thuộc tính theo thứ tự `[SerializeOrder(n)]`.

### `DropPolicy` (`int`)

Cấu hình `DispatchOptions.DropPolicy` khi hàng đợi gói tin đầu vào của kết nối đầy:

- `DropNewest = 0` — Loại gói tin vừa đến (mặc định).
- `DropOldest = 1` — Đẩy gói tin cũ nhất trong hàng đợi để nhận gói tin mới.
- `Block = 2` — Áp dụng backpressure tối đa đến `DispatchOptions.BlockTimeout`.
- `Coalesce = 3` — Thay thế gói tin gần nhất trong hàng đợi có cùng opcode.

### `MiddlewareStage` (`byte`)

- `Inbound = 0` — Chạy trước handler gói tin.
- `Outbound = 1` — Chạy sau handler khi gửi phản hồi.
- `Both = 2` — Chạy trên cả đường đầu vào và đường đầu ra.

### `WorkerPriority` (`byte`)

- `LOW = 0`, `NORMAL = 1`, `HIGH = 2`, `URGENT = 3`.

### `PacketContextState` (`byte`)

Không gian tên `Nalix.Abstractions.Networking.Packets` (`src/Nalix.Abstractions/Networking/Packets/PacketContextState.cs`). Theo dõi vòng đời của packet context có pool:

- `Pooled = 0` — Nằm trong object pool, sẵn sàng để cấp phát.
- `InUse = 1` — Đang được handler gói tin sử dụng.
- `Returned = 2` — Đã xử lý xong và được trả về để tái sử dụng.

## API liên quan

- [Kiểu điều khiển](./protocols/control-type.md)
- [Thuộc tính gói tin](./packet-attributes.md)
- [Đặc tả nhị phân trên dây](../../concepts/internals/binary-spec.md)
