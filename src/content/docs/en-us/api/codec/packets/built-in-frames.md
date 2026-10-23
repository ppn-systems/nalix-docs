---
title: Built-in Frames
description: Reference for all 11 built-in system, handshake, session resumption, and Proof-of-Work protocol frames in Nalix.Codec.ProtocolFrames.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.ProtocolFrames`  
**Assembly:** `Nalix.Codec`

`Nalix.Codec` ships **11 fixed-size built-in protocol frames** in `namespace Nalix.Codec.ProtocolFrames` occupying reserved system opcodes `0x0000` through `0x000B` (with `ProtocolOpCode.SESSION_REKEY = 0x0009` carried via `Control`). All 11 frames inherit from `PacketBase<TSelf>`, implement `IFixedSizeSerializable` and `IPacketStaticOpcode`, and are pre-registered in `PacketRegistry` with a pool capacity of `128` each.

## Source Mapping

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

## Built-in Protocol Frames Summary

| Frame Class | `ProtocolOpCode` | Hex OpCode | Wire Size (`Size`) | Purpose |
| --- | --- | :---: | ---: | --- |
| `SessionInit` | `SESSION_INIT` | `0x0000` | `70` bytes | Handshake step 1 (Client $\rightarrow$ Server): ephemeral X25519 `PublicKey` (`Bytes32`) + `Nonce` (`Bytes32`). |
| `Control` | `SYSTEM_CONTROL` | `0x0001` | `9` bytes | System control signaling (`PING`, `PONG`, `DISCONNECT`, `SESSION_REKEY`, `SESSION_REKEY_ACK`, `POW_REQUEST`, `PUBLIC_KEY_REQUEST`, etc.). |
| `SessionResume` | `SESSION_SIGNAL` | `0x0002` | `49` bytes | Single-RTT session resumption (`Stage`, `SessionToken`, `Reason`, `Proof`). |
| `SessionProof` | `SESSION_PROOF` | `0x0003` | `38` bytes | Handshake step 3 (Client $\rightarrow$ Server): client `Proof` (`Bytes32`). |
| `TimeSync` | `SYSTEM_TIMESYNC` | `0x0004` | `23` bytes | Clock synchronization and RTT measurement (`Type`, `Timestamp`, `MonoTicks`). |
| `SessionTofu` | `SESSION_TOFU` | `0x0005` | `38` bytes | Trust-On-First-Use reply carrying the server's static X25519 `PublicKey` (`Bytes32`). |
| `SessionChallenge` | `SESSION_CHALLENGE` | `0x0006` | `102` bytes | Handshake step 2 (Server $\rightarrow$ Client): ephemeral `PublicKey` (`Bytes32`) + `Nonce` (`Bytes32`) + server `Proof` (`Bytes32`). |
| `SessionEstablished` | `SESSION_ESTABLISHED` | `0x0007` | `46` bytes | Handshake step 4 (Server $\rightarrow$ Client): server finish `Proof` (`Bytes32`) + assigned 8-byte `SessionToken` (`ulong`). |
| `Directive` | `SYSTEM_DIRECTIVE` | `0x0008` | `21` bytes | Server-to-client structured feedback (`Type`, `Reason`, `Action`, `Control`, `Arg0`, `Arg1`, `Arg2`). |
| `ProofOfWorkChallenge` | `POW_CHALLENGE` | `0x000A` | `79` bytes | Server-issued stateless PoW puzzle (`Nonce`, `Difficulty`, `TimestampTicks`, `Mac`). |
| `ProofOfWorkProof` | `POW_PROOF` | `0x000B` | `87` bytes | Client-submitted PoW solution (`Nonce`, `Difficulty`, `TimestampTicks`, `Mac`, `Solution`). |

---

## 1. System & Control Frames

### `Control` (`0x0001`, 9 bytes)

Carries protocol control signals (`Reason`, `Type`).

- **Properties**:
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(0)]`, 2 bytes)
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

### `Directive` (`0x0008`, 21 bytes)

Sent by the server to instruct the client to throttle, back off, solve a Proof-of-Work challenge, or reconnect.

- **Properties**:
  - `ControlType Type { get; set; }` (`[SerializeOrder(0)]`, 1 byte)
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(1)]`, 2 bytes)
  - `ProtocolAdvice Action { get; set; }` (`[SerializeOrder(2)]`, 1 byte)
  - `ControlFlags Control { get; set; }` (`[SerializeOrder(3)]`, 1 byte)
  - `uint Arg0 { get; set; }` (`[SerializeOrder(4)]`, 4 bytes)
  - `uint Arg1 { get; set; }` (`[SerializeOrder(5)]`, 4 bytes)
  - `ushort Arg2 { get; set; }` (`[SerializeOrder(6)]`, 2 bytes)
- **Method**:
  - `void Initialize(ControlType type, ProtocolReason reason, ProtocolAdvice action, ushort sequenceId, PacketFlags flags = PacketFlags.SYSTEM, ControlFlags controlFlags = ControlFlags.NONE, uint arg0 = 0, uint arg1 = 0, ushort arg2 = 0)`

### `TimeSync` (`0x0004`, 23 bytes)

Used by `PingExtensions` and `SystemTimeSyncHandlers` for RTT measurement and monotonic/UTC clock synchronization.

- **Properties**:
  - `ControlType Type { get; set; }` (`[SerializeOrder(0)]`) — `PING`, `PONG`, `TIMESYNCREQUEST`, or `TIMESYNCRESPONSE`
  - `long Timestamp { get; set; }` (`[SerializeOrder(1)]`) — UTC Unix timestamp in milliseconds
  - `long MonoTicks { get; set; }` (`[SerializeOrder(2)]`) — Monotonic clock ticks
- **Method**:
  - `void Initialize(ControlType type, ushort sequenceId = 0, PacketFlags flags = PacketFlags.SYSTEM)` — Sets `Type`, `SequenceId`, `Flags`, and automatically stamps `MonoTicks = Clock.MonoTicksNow()` and `Timestamp = Clock.UnixMillisecondsNow()`.

---

## 2. Session & Handshake Frames

All session frames implement `IPacketValidatable` (`bool Validate(out string? reason)`).

### `SessionInit` (`0x0000`, 70 bytes)

- **Properties**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`), `Bytes32 Nonce` (`[SerializeOrder(1)]`)
- **Method**: `void Initialize(Bytes32 publicKey, Bytes32 nonce, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionChallenge` (`0x0006`, 102 bytes)

- **Properties**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`), `Bytes32 Nonce` (`[SerializeOrder(1)]`), `Bytes32 Proof` (`[SerializeOrder(2)]`)
- **Method**: `void Initialize(Bytes32 publicKey, Bytes32 nonce, Bytes32 proof, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionProof` (`0x0003`, 38 bytes)

- **Property**: `Bytes32 Proof` (`[SerializeOrder(0)]`)
- **Method**: `void Initialize(Bytes32 proof, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionEstablished` (`0x0007`, 46 bytes)

- **Properties**: `Bytes32 Proof` (`[SerializeOrder(0)]`), `ulong SessionToken` (`[SerializeOrder(1)]`)
- **Method**: `void Initialize(Bytes32 proof, ulong sessionToken, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionResume` (`0x0002`, 49 bytes)

- **Properties**:
  - `SessionResumeStage Stage { get; set; }` (`[SerializeOrder(0)]`) — `NONE`, `REQUEST`, or `RESPONSE`
  - `ulong SessionToken { get; set; }` (`[SerializeOrder(1)]`)
  - `ProtocolReason Reason { get; set; }` (`[SerializeOrder(2)]`)
  - `Bytes32 Proof { get; set; }` (`[SerializeOrder(3)]`)
- **Method**: `void Initialize(SessionResumeStage stage, ulong sessionToken, ProtocolReason reason = ProtocolReason.NONE, Bytes32 proof = default, PacketFlags flags = PacketFlags.SYSTEM)`

### `SessionTofu` (`0x0005`, 38 bytes)

- **Property**: `Bytes32 PublicKey` (`[SerializeOrder(0)]`)
- **Method**: `void Initialize(Bytes32 publicKey)`

---

## 3. Proof-of-Work Frames

### `ProofOfWorkChallenge` (`0x000A`, 79 bytes)

- **Properties**:
  - `Bytes32 Nonce { get; set; }` (`[SerializeOrder(0)]`) — 32-byte server challenge nonce
  - `byte Difficulty { get; set; }` (`[SerializeOrder(1)]`) — Required leading zero bits (`0..64`)
  - `long TimestampTicks { get; set; }` (`[SerializeOrder(2)]`) — Server timestamp (`Environment.TickCount64`)
  - `Bytes32 Mac { get; set; }` (`[SerializeOrder(3)]`) — 32-byte `HmacKeccak256` tag binding `Nonce | Difficulty | TimestampTicks | ConnectionId`
- **Method**: `void Initialize(Bytes32 nonce, byte difficulty, long timestampTicks, Bytes32 mac, PacketFlags flags = PacketFlags.SYSTEM)`

### `ProofOfWorkProof` (`0x000B`, 87 bytes)

- **Properties**:
  - `Bytes32 Nonce { get; set; }` (`[SerializeOrder(0)]`)
  - `byte Difficulty { get; set; }` (`[SerializeOrder(1)]`)
  - `long TimestampTicks { get; set; }` (`[SerializeOrder(2)]`)
  - `Bytes32 Mac { get; set; }` (`[SerializeOrder(3)]`)
  - `long Solution { get; set; }` (`[SerializeOrder(4)]`) — 8-byte counter solved by `ProofOfWorkSolver.SolveChallenge`
- **Method**: `void Initialize(Bytes32 nonce, byte difficulty, long timestampTicks, Bytes32 mac, long solution, PacketFlags flags = PacketFlags.SYSTEM)`

---

## Pooling Built-in Frames (`PacketFactory<T>`)

Use `PacketFactory<TPacket>.Acquire()` to rent a disposable `PacketScope<TPacket>` wrapper that automatically returns the packet to `IObjectPoolManager` on disposal (enforced by analyzer **`NALIX075`**):

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Codec.Pooling;
using Nalix.Codec.ProtocolFrames;

using PacketScope<SessionInit> scope = PacketFactory<SessionInit>.Acquire();
SessionInit init = scope.Value;
init.Initialize(clientPublicKey, clientNonce, PacketFlags.SYSTEM);

await session.SendAsync(init, ct);
```

## Related APIs

- [Frame Model](./frame-model.md)
- [Packet Registry](./packet-registry.md)
- [Handshake Protocol](../../security/handshake.md)
- [Proof-of-Work](../../security/proof-of-work.md)
- [Session Resumption](../../security/session-resume.md)
