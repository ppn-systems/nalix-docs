---
title: Khung tích hợp sẵn
description: Tài liệu tham chiếu cho cả 11 khung giao thức hệ thống, bắt tay, tiếp tục phiên và Proof-of-Work tích hợp sẵn trong Nalix.Codec.ProtocolFrames.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.ProtocolFrames`  
**Assembly:** `Nalix.Codec`

`Nalix.Codec` đi kèm **11 khung giao thức tích hợp sẵn có kích thước cố định** trong `namespace Nalix.Codec.ProtocolFrames`, chiếm các opcode hệ thống dành riêng từ `0x0000` đến `0x000B` (với `ProtocolOpCode.SESSION_REKEY = 0x0009` được mang qua `Control`). Cả 11 khung đều kế thừa `PacketBase<TSelf>`, implement `IFixedSizeSerializable` và `IPacketStaticOpcode`, và được đăng ký sẵn trong `PacketRegistry` với sức chứa pool là `128` cho mỗi khung.

## Ánh xạ mã nguồn

- `src/Nalix.Codec/ProtocolFrames/Control.cs`
- `src/Nalix.Codec/ProtocolFrames/Directive.cs`
- `src/Nalix.Codec/ProtocolFrames/TimeSync.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionInit.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionChallenge.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionProof.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionEstablished.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionResume.cs`
- `src/Nalix.Codec/ProtocolFrames/Session/SessionTofu.cs`
- `src/Nalix.Codec/ProtocolFrames/Security/ProofOfWorkChallenge.cs`
- `src/Nalix.Codec/ProtocolFrames/Security/ProofOfWorkProof.cs`

## Tóm tắt khung giao thức tích hợp sẵn

| Lớp khung | `ProtocolOpCode` | OpCode hex | Kích thước wire (`Size`) | Mục đích |
| --- | --- | :---: | ---: | --- |
| `SessionInit` | `SESSION_INIT` | `0x0000` | `70` byte | Bước 1 của bắt tay (Client $\rightarrow$ Server): `PublicKey` X25519 tạm thời (`Bytes32`) + `Nonce` (`Bytes32`). |
| `Control` | `SYSTEM_CONTROL` | `0x0001` | `9` byte | Tín hiệu điều khiển hệ thống (`PING`, `PONG`, `DISCONNECT`, `SESSION_REKEY`, `SESSION_REKEY_ACK`, `POW_REQUEST`, `PUBLIC_KEY_REQUEST`, v.v.). |
| `SessionResume` | `SESSION_SIGNAL` | `0x0002` | `49` byte | Tiếp tục phiên trong một RTT (`Stage`, `SessionToken`, `Reason`, `Proof`). |
| `SessionProof` | `SESSION_PROOF` | `0x0003` | `38` byte | Bước 3 của bắt tay (Client $\rightarrow$ Server): `Proof` của client (`Bytes32`). |
| `TimeSync` | `SYSTEM_TIMESYNC` | `0x0004` | `23` byte | Đồng bộ đồng hồ và đo RTT (`Type`, `Timestamp`, `MonoTicks`). |
| `SessionTofu` | `SESSION_TOFU` | `0x0005` | `38` byte | Phản hồi Trust-On-First-Use mang `PublicKey` X25519 tĩnh của server (`Bytes32`). |
| `SessionChallenge` | `SESSION_CHALLENGE` | `0x0006` | `102` byte | Bước 2 của bắt tay (Server $\rightarrow$ Client): `PublicKey` tạm thời (`Bytes32`) + `Nonce` (`Bytes32`) + `Proof` của server (`Bytes32`). |
| `SessionEstablished` | `SESSION_ESTABLISHED` | `0x0007` | `46` byte | Bước 4 của bắt tay (Server $\rightarrow$ Client): `Proof` hoàn tất phía server (`Bytes32`) + `SessionToken` 8 byte được cấp (`ulong`). |
| `Directive` | `SYSTEM_DIRECTIVE` | `0x0008` | `21` byte | Phản hồi có cấu trúc từ server tới client (`Type`, `Reason`, `Action`, `Control`, `Arg0`, `Arg1`, `Arg2`). |
| `ProofOfWorkChallenge` | `POW_CHALLENGE` | `0x000A` | `79` byte | Câu đố PoW không trạng thái do server phát hành (`Nonce`, `Difficulty`, `TimestampTicks`, `Mac`). |
| `ProofOfWorkProof` | `POW_PROOF` | `0x000B` | `87` byte | Lời giải PoW do client gửi (`Nonce`, `Difficulty`, `TimestampTicks`, `Mac`, `Solution`). |

---

## 1. Khung hệ thống & điều khiển

### `Control` (`0x0001`, 9 byte)

Mang các tín hiệu điều khiển giao thức (`Reason`, `Type`).

- **Thuộc tính**:
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(0)]`, 2 byte)
  - `ControlType Type { get; set; }` (`[SerializeOrder(1)]`, 1 byte)
- **Method**:
  - `void Initialize(ControlType type, ushort sequenceId = 0, PacketFlags flags = PacketFlags.SYSTEM, ProtocolReason reasonCode = ProtocolReason.NONE)`

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Codec.Pooling;
using Nalix.Codec.ProtocolFrames;

using PacketScope<Control> lease = PacketFactory<Control>.Acquire();
Control control = lease.Value;
control.Initialize(ControlType.PING, sequenceId: 42, flags: PacketFlags.SYSTEM);
```

### `Directive` (`0x0008`, 21 byte)

Server gửi để yêu cầu client giảm tốc độ, lùi lại, giải một thử thách Proof-of-Work, hoặc kết nối lại.

- **Thuộc tính**:
  - `ControlType Type { get; set; }` (`[SerializeOrder(0)]`, 1 byte)
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(1)]`, 2 byte)
  - `ProtocolAdvice Action { get; set; }` (`[SerializeOrder(2)]`, 1 byte)
  - `ControlFlags Control { get; set; }` (`[SerializeOrder(3)]`, 1 byte)
  - `uint Arg0 { get; set; }` (`[SerializeOrder(4)]`, 4 byte)
  - `uint Arg1 { get; set; }` (`[SerializeOrder(5)]`, 4 byte)
  - `ushort Arg2 { get; set; }` (`[SerializeOrder(6)]`, 2 byte)
- **Method**:
  - `void Initialize(ControlType type, ProtocolReason reason, ProtocolAdvice action, ushort sequenceId, PacketFlags flags = PacketFlags.SYSTEM, ControlFlags controlFlags = ControlFlags.NONE, uint arg0 = 0, uint arg1 = 0, ushort arg2 = 0)`

### `TimeSync` (`0x0004`, 23 byte)

Được `PingExtensions` và `SystemTimeSyncHandlers` dùng để đo RTT và đồng bộ đồng hồ monotonic/UTC.

- **Thuộc tính**:
  - `ControlType Type { get; set; }` (`[SerializeOrder(0)]`) — `PING`, `PONG`, `TIMESYNCREQUEST` hoặc `TIMESYNCRESPONSE`
  - `long Timestamp { get; set; }` (`[SerializeOrder(1)]`) — Dấu thời gian Unix UTC tính bằng mili giây
  - `long MonoTicks { get; set; }` (`[SerializeOrder(2)]`) — Số tick của đồng hồ monotonic
- **Method**:
  - `void Initialize(ControlType type, ushort sequenceId = 0, PacketFlags flags = PacketFlags.SYSTEM)` — Đặt `Type`, `SequenceId`, `Flags`, và tự động đánh dấu `MonoTicks = Clock.MonoTicksNow()` và `Timestamp = Clock.UnixMillisecondsNow()`.

---

## 2. Khung phiên & bắt tay

Mọi khung phiên đều implement `IPacketValidatable` (`bool Validate(out string? reason)`).

### `SessionInit` (`0x0000`, 70 byte)

- **Thuộc tính**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`), `Bytes32 Nonce` (`[SerializeOrder(1)]`)
- **Method**: `void Initialize(Bytes32 publicKey, Bytes32 nonce, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionChallenge` (`0x0006`, 102 byte)

- **Thuộc tính**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`), `Bytes32 Nonce` (`[SerializeOrder(1)]`), `Bytes32 Proof` (`[SerializeOrder(2)]`)
- **Method**: `void Initialize(Bytes32 publicKey, Bytes32 nonce, Bytes32 proof, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionProof` (`0x0003`, 38 byte)

- **Thuộc tính**: `Bytes32 Proof` (`[SerializeOrder(0)]`)
- **Method**: `void Initialize(Bytes32 proof, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionEstablished` (`0x0007`, 46 byte)

- **Thuộc tính**: `Bytes32 Proof` (`[SerializeOrder(0)]`), `ulong SessionToken` (`[SerializeOrder(1)]`)
- **Method**: `void Initialize(Bytes32 proof, ulong sessionToken, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionResume` (`0x0002`, 49 byte)

- **Thuộc tính**:
  - `SessionResumeStage Stage { get; set; }` (`[SerializeOrder(0)]`) — `NONE`, `REQUEST` hoặc `RESPONSE`
  - `ulong SessionToken { get; set; }` (`[SerializeOrder(1)]`)
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(2)]`)
  - `Bytes32 Proof { get; set; }` (`[SerializeOrder(3)]`)
- **Method**: `void Initialize(SessionResumeStage stage, ulong sessionToken, ProtocolReason reason = ProtocolReason.NONE, Bytes32 proof = default, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionTofu` (`0x0005`, 38 byte)

- **Thuộc tính**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`)
- **Method**: `void Initialize(Bytes32 publicKey)`

---

## 3. Khung Proof-of-Work

### `ProofOfWorkChallenge` (`0x000A`, 79 byte)

- **Thuộc tính**:
  - `Bytes32 Nonce { get; set; }` (`[SerializeOrder(0)]`) — Nonce thử thách 32 byte của server
  - `byte Difficulty { get; set; }` (`[SerializeOrder(1)]`) — Số bit 0 đứng đầu yêu cầu (`0..64`)
  - `long TimestampTicks { get; set; }` (`[SerializeOrder(2)]`) — Dấu thời gian của server (`Environment.TickCount64`)
  - `Bytes32 Mac { get; set; }` (`[SerializeOrder(3)]`) — Thẻ `HmacKeccak256` 32 byte ràng buộc `Nonce | Difficulty | TimestampTicks | ConnectionId`
- **Method**: `void Initialize(Bytes32 nonce, byte difficulty, long timestampTicks, Bytes32 mac, PacketFlags flags = PacketFlags.SYSTEM)`

### `ProofOfWorkProof` (`0x000B`, 87 byte)

- **Thuộc tính**:
  - `Bytes32 Nonce { get; set; }` (`[SerializeOrder(0)]`)
  - `byte Difficulty { get; set; }` (`[SerializeOrder(1)]`)
  - `long TimestampTicks { get; set; }` (`[SerializeOrder(2)]`)
  - `Bytes32 Mac { get; set; }` (`[SerializeOrder(3)]`)
  - `long Solution { get; set; }` (`[SerializeOrder(4)]`) — Bộ đếm 8 byte được giải bởi `ProofOfWorkSolver.SolveChallenge`
- **Method**: `void Initialize(Bytes32 nonce, byte difficulty, long timestampTicks, Bytes32 mac, long solution, PacketFlags flags = PacketFlags.SYSTEM)`

---

## Thuê khung tích hợp sẵn (`PacketFactory<T>`)

Dùng `PacketFactory<TPacket>.Acquire()` để thuê một wrapper `PacketScope<TPacket>` dùng một lần, tự động trả gói tin về `IObjectPoolManager` khi dispose (được thực thi bởi analyzer **`NALIX075`**):

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;
using Nalix.Codec.ProtocolFrames;

using PacketScope<SessionInit> scope = PacketFactory<SessionInit>.Acquire();
SessionInit init = scope.Value;
init.Initialize(clientPublicKey, clientNonce, PacketFlags.SYSTEM);

await session.SendAsync(init, ct);
```

## API liên quan

- [Frame Model](./frame-model.md)
- [Packet Registry](./packet-registry.md)
- [Bắt tay giao thức](../../security/handshake.md)
- [Proof-of-Work](../../security/proof-of-work.md)
- [Tiếp tục phiên](../../security/session-resume.md)
