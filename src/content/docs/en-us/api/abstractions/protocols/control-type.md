---
title: Control Type
description: ControlType enum reference in Nalix.Abstractions.Networking.Protocols for system-level signaling, ping/pong, time sync, PoW requests, and cipher/key rotation.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Networking.Protocols`  
**Assembly:** `Nalix.Abstractions`

`ControlType` (`byte`) identifies the system-level command carried by a `Control` protocol frame (`ProtocolOpCode.SYSTEM_CONTROL = 0x0001`).

## Source Mapping

- `src/Nalix.Abstractions/Networking/Protocols/ControlType.cs`
- `src/Nalix.Codec/ProtocolFrames/Control.cs`

## Enum Definition

| Hex | Name | Description |
| --- | --- | --- |
| `0x00` | `NONE` | No control message specified. |
| `0x01` | `PING` | Liveness and round-trip latency probe request. |
| `0x02` | `PONG` | Response sent to a `PING` request. |
| `0x04` | `DISCONNECT` | Graceful disconnect notification carrying a `ProtocolReason`. |
| `0x05` | `ERROR` | Notification of a protocol, rate-limit, permission, or dispatch error. |
| `0x09` | `RESUME` | Resume an interrupted session. |
| `0x0A` | `SHUTDOWN` | Request or announce graceful server shutdown. |
| `0x0B` | `REDIRECT` | Instruct client to reconnect to another endpoint. |
| `0x0D` | `NOTICE` | Informational maintenance or operational notice. |
| `0x10` | `TIMEOUT` | Handler or request timed out on the server. |
| `0x11` | `FAIL` | Generic operation failure. |
| `0x12` | `TIMESYNCREQUEST` | Client request for high-resolution server time (`TimeSync`). |
| `0x13` | `TIMESYNCRESPONSE` | Server response with high-resolution timestamps. |
| `0x14` | `CIPHER_UPDATE` | Request to switch the active `CipherSuiteType`. |
| `0x15` | `CIPHER_UPDATE_ACK` | Acknowledges a cipher suite switch. |
| `0x16` | `PUBLIC_KEY_REQUEST` | Client request for the server's static public key (TOFU). |
| `0x17` | `POW_REQUEST` | Client request for a Proof-of-Work challenge puzzle. |
| `0x18` | `SESSION_REKEY` | Request to rotate the session symmetric key. |
| `0x19` | `SESSION_REKEY_ACK` | Acknowledges completion of session key rotation. |
| `0xFE` | `RESERVED1` | Reserved for future protocol extension. |
| `0xFF` | `RESERVED2` | Reserved for future protocol extension. |

## Usage

`Control` frames are pooled via `PacketBase<Control>.Create()` and default to `PacketFlags.SYSTEM`:

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Codec.ProtocolFrames;

Control ping = Control.Create();
ping.Initialize(ControlType.PING, sequenceId: 42, reason: ProtocolReason.NONE, flags: PacketFlags.SYSTEM);
```

## Related APIs

- [Built-in Protocol Frames](../../codec/packets/built-in-frames.md)
- [Common Enumerations](./../enums.md)
- [Client Control Utilities](../../sdk/control-utilities.md)
