---
title: Common Enumerations
description: Complete source-synchronized reference for all enumerations in Nalix.Abstractions across networking, protocol control, security, identity, serialization, middleware, and concurrency.
section: API Reference
package: Nalix.Abstractions
---

**Assembly:** `Nalix.Abstractions`  
**Namespaces:** `Nalix.Abstractions.Networking`, `Nalix.Abstractions.Networking.Protocols`, `Nalix.Abstractions.Networking.Packets`, `Nalix.Abstractions.Security`, `Nalix.Abstractions.Identity`, `Nalix.Abstractions.Serialization`, `Nalix.Abstractions.Middleware`, `Nalix.Abstractions.Concurrency`

This page provides a complete, source-verified reference for every enumeration in `Nalix.Abstractions`.

---

## 1. Networking, Transport & Packet Framing

### `NetworkTransport` (`byte`)

Identifies the network transport protocol (`src/Nalix.Abstractions/Networking/NetworkTransport.cs`):

| Member | Value | Description |
| :--- | :--- | :--- |
| `TCP` | `0` | Transmission Control Protocol (reliable stream). |
| `UDP` | `1` | User Datagram Protocol (low-latency datagrams). |
| `WEBSOCKET` | `2` | WebSocket over TCP (RFC 6455 framed stream). |

### `TransportFraming` (`byte`)

Selects the stream framing mode on `IConnection.ITransport` and `Protocol.Framing` (`src/Nalix.Abstractions/Networking/TransportFraming.cs`):

| Member | Value | Description |
| :--- | :--- | :--- |
| `None` | `0` | Raw unframed stream (used for passthrough or pre-upgrade sockets). |
| `UInt16LengthPrefixed` | `1` | 2-byte little-endian `ushort` length prefix (default for Nalix TCP). |
| `VarIntLengthPrefixed` | `2` | LEB128 variable-length integer prefix (governed by `VarIntFramingOptions`). |

### `OperatingMode` (`byte`)

Configures the listener operating mode in `IProtocolBindingBuilder.WithMode(...)`:

| Member | Value | Description |
| :--- | :--- | :--- |
| `Server` | `0` | Standard session-authenticated Nalix server mode (`UdpServerListener`). |
| `Passthrough` | `1` | Stateless connectionless datagram mode (`UdpPassthroughListener` + `PassthroughConnection`). |

### `ProtocolOpCode` (`ushort`)

Reserved system and protocol opcodes (`0x0000..0x00FF`, `src/Nalix.Abstractions/Networking/Protocols/ProtocolOpCode.cs`). Application packets must use `>= 0x0100` (enforced by `NALIX035`).

| Member | Value | Description |
| :--- | :--- | :--- |
| `SESSION_INIT` | `0x0000` | Client initiates X25519 handshake with ephemeral public key and nonce. |
| `SYSTEM_CONTROL` | `0x0001` | System control frame (`Control`: `PING`, `PONG`, `DISCONNECT`, `ERROR`, etc.). |
| `SESSION_SIGNAL` | `0x0002` | Session resumption flow (`SessionResume`: request, ack, or reject). |
| `SESSION_PROOF` | `0x0003` | Client proves possession of the derived session key over the transcript hash. |
| `SYSTEM_TIMESYNC` | `0x0004` | High-resolution clock synchronization frame (`TimeSync`). |
| `SESSION_TOFU` | `0x0005` | Trust-On-First-Use static X25519 identity frame (`SessionTofu`). |
| `SESSION_CHALLENGE` | `0x0006` | Server handshake response carrying server ephemeral public key, nonce, and signature. |
| `SESSION_ESTABLISHED` | `0x0007` | Server confirmation that the encrypted session is established (`SessionEstablished`). |
| `SYSTEM_DIRECTIVE` | `0x0008` | Server-to-client runtime instruction frame (`Directive`: throttle, redirect, notice). |
| `SESSION_REKEY` | `0x0009` | Mid-session symmetric key rotation frame. |
| `POW_CHALLENGE` | `0x000A` | Server-issued Proof-of-Work puzzle (`ProofOfWorkChallenge`). |
| `POW_PROOF` | `0x000B` | Client-submitted Proof-of-Work solution (`ProofOfWorkProof`). |
| `TUNNEL_REQUEST` | `0x00F3` | Tunnel request packet. |
| `TUNNEL_PROVIDE_ACK` | `0x00F4` | Tunnel provisioning acknowledgement. |
| `TUNNEL_CONNECT_ACK` | `0x00F5` | Tunnel connection request acknowledgement. |
| `TUNNEL_READY` | `0x00F6` | Tunnel readiness notification. |
| `TUNNEL_PROVIDE` | `0x00F7` | Tunnel provisioning metadata packet. |
| `TUNNEL_CONNECT` | `0x00F8` | Logical tunnel connection request. |
| `TRAVERSAL_REFLECTOR_INIT` | `0x00F9` | NAT traversal reflector initialization. |
| `TRAVERSAL_REFLECTOR_ALLOCATED` | `0x00FA` | NAT traversal reflector endpoint allocation response. |
| `TRAVERSAL_PEER_SIGNAL` | `0x00FB` | Peer candidate signaling packet. |
| `TRAVERSAL_NAT_PROBE_ACK` | `0x00FC` | NAT reachability probe acknowledgement. |
| `TRAVERSAL_NAT_PROBE` | `0x00FD` | Direct peer reachability probe. |
| `RUNTIME_OBSERVATION` | `0x00FE` | Runtime telemetry observation packet. |
| `OBSERVABILITY_ACCESS` | `0x00FF` | Observability access authorization packet. |

### `PacketFlags` (`[Flags] byte`)

Bitflags stored at byte offset `2` (`PacketHeaderOffset.Flags = 2`) of the 6-byte `PacketHeader` (`src/Nalix.Abstractions/Networking/Packets/PacketFlags.cs`):

| Member | Value | Status | Description |
| :--- | :--- | :---: | :--- |
| `NONE` | `0x00` | Active | Uncompressed, unencrypted, unfragmented application frame. |
| `COMPRESSED` | `1 << 1` (`0x02`) | Active | Payload is compressed with `LZ4Codec`. |
| `ENCRYPTED` | `1 << 2` (`0x04`) | Active | Payload is wrapped in an `EnvelopeCipher` AEAD/Symmetric envelope. |
| `FRAGMENTED` | `1 << 3` (`0x08`) | Active | Payload carries an 8-byte `FragmentHeader` chunk. |
| `RELIABLE` | `1 << 4` (`0x10`) | `[Obsolete]` | Legacy reliability flag — transport reliability is determined by `NetworkTransport`. |
| `UNRELIABLE` | `1 << 5` (`0x20`) | `[Obsolete]` | Legacy unreliability flag — use `NetworkTransport.UDP`. |
| `ACKNOWLEDGED` | `1 << 6` (`0x40`) | `[Obsolete]` | Legacy acknowledgement flag. |
| `SYSTEM` | `1 << 7` (`0x80`) | Active | System-level protocol frame (`Control`, `Directive`, `TimeSync`, handshake). |

### `PacketPriority` (`byte`)

| Member | Value | Description |
| :--- | :--- | :--- |
| `NONE` | `0x00` | Standard priority level. |
| `LOW` | `0x01` | Lower-than-normal background priority. |
| `MEDIUM` | `0x02` | Moderate priority level. |
| `HIGH` | `0x03` | High priority (default for `Control` and `Directive` after pool reset). |
| `URGENT` | `0x04` | Highest priority level (`TimeSync`). |

### `PacketHeaderOffset` (`int`)

Defines the byte offsets of the 6-byte `PacketHeader` and the start of application payload fields (`src/Nalix.Abstractions/Networking/Packets/PacketHeaderOffset.cs`):

| Member | Value | Type | Description |
| :--- | :--- | :--- | :--- |
| `OpCode` | `0` | `ushort` | Wire offset `0`: 2-byte little-endian `OpCode`. |
| `Flags` | `2` | `PacketFlags` | Wire offset `2`: 1-byte `PacketFlags`. |
| `Priority` | `3` | `PacketPriority` | Wire offset `3`: 1-byte `PacketPriority`. |
| `SequenceId` | `4` | `ushort` | Wire offset `4`: 2-byte little-endian `SequenceId`. |
| `Region` | `6` | — | End of the 6-byte header (`PacketConstants.HeaderSize = 6`). |
| `MaxValue` | `255` | — | Maximum allowed header offset value. |

---

## 2. Protocol Control & Signals

### `ControlType` (`byte`)

Identifies the control command carried by a `Control` frame (`src/Nalix.Abstractions/Networking/Protocols/ControlType.cs`):

| Member | Value | Description |
| :--- | :--- | :--- |
| `NONE` | `0x00` | No control message specified. |
| `PING` | `0x01` | Liveness and RTT probe request. |
| `PONG` | `0x02` | Liveness response echoing the `PING` sequence and timestamp. |
| `DISCONNECT` | `0x04` | Graceful disconnect notification with `ProtocolReason`. |
| `ERROR` | `0x05` | Protocol or dispatch error notification. |
| `RESUME` | `0x09` | Session resumption control signal. |
| `SHUTDOWN` | `0x0A` | Server shutdown notification. |
| `REDIRECT` | `0x0B` | Endpoint redirection instruction. |
| `NOTICE` | `0x0D` | Informational maintenance or status notice. |
| `TIMEOUT` | `0x10` | Handler or request timeout notification. |
| `FAIL` | `0x11` | Generic operation failure. |
| `TIMESYNCREQUEST` | `0x12` | Client request for server clock synchronization. |
| `TIMESYNCRESPONSE` | `0x13` | Server response carrying high-resolution timestamps. |
| `CIPHER_UPDATE` | `0x14` | Request to switch the active `CipherSuiteType`. |
| `CIPHER_UPDATE_ACK` | `0x15` | Acknowledges a `CIPHER_UPDATE` transition. |
| `PUBLIC_KEY_REQUEST` | `0x16` | Client request for the server's static public key (TOFU). |
| `POW_REQUEST` | `0x17` | Client request for a Proof-of-Work challenge puzzle. |
| `SESSION_REKEY` | `0x18` | Request to rotate the session encryption secret. |
| `SESSION_REKEY_ACK` | `0x19` | Acknowledges completion of session key rotation. |
| `RESERVED1` | `0xFE` | Reserved for future protocol extension. |
| `RESERVED2` | `0xFF` | Reserved for future protocol extension. |

### `ControlFlags` (`[Flags] byte`)

| Member | Value | Description |
| :--- | :--- | :--- |
| `NONE` | `0x00` | No flags set. |
| `IS_TRANSIENT` | `1 << 0` | Condition is transient and safe to retry. |
| `IS_AUTHRELATED` | `1 << 1` | Condition relates to authentication or authorization. |
| `HAS_REDIRECT` | `1 << 2` | Redirect target metadata is present. |
| `SLOW_DOWN` | `1 << 3` | Client should reduce its outbound send rate. |

### `ProtocolAdvice` (`byte`)

| Member | Value | Description |
| :--- | :--- | :--- |
| `NONE` | `0` | No specific action required. |
| `RETRY` | `1` | Safe to retry immediately. |
| `BACKOFF_RETRY` | `2` | Retry with exponential backoff. |
| `DO_NOT_RETRY` | `3` | Permanent error; do not retry automatically. |
| `REAUTHENTICATE` | `4` | Perform handshake or authentication again. |
| `SLOW_DOWN` | `5` | Reduce request rate. |
| `RECONNECT` | `6` | Reconnect to the server or redirect endpoint. |
| `FIX_AND_RETRY` | `7` | Correct request payload before retrying. |

### `ProtocolReason` (`ushort`)

Standard reason codes carried in `Control`, `Directive`, and `SessionResume` frames (`src/Nalix.Abstractions/Networking/Protocols/ProtocolReason.cs`), grouped by numeric category:

| Range | Category | Members |
| :--- | :--- | :--- |
| `0–49` | General | `NONE = 0`, `UNKNOWN = 1`, `CANCELLED = 2`, `NOT_IMPLEMENTED = 3`, `TEMPORARY_FAILURE = 4`, `DEPRECATED = 5`, `REQUEST_INVALID = 6`, `INTERNAL_ERROR = 7` |
| `100–149` | Transport / Network | `TIMEOUT = 100`, `REMOTE_CLOSED = 101`, `LOCAL_CLOSED = 102`, `NETWORK_ERROR = 103`, `CONNECTION_REFUSED = 104`, `CONNECTION_RESET = 105`, `DNS_FAILURE = 106`, `MTU_VIOLATION = 107`, `CONGESTION = 108`, `KEEPALIVE_FAILED = 109` |
| `150–199` | Protocol / Framing | `PROTOCOL_ERROR = 150`, `VERSION_UNSUPPORTED = 151`, `FRAME_TOO_LARGE = 152`, `MESSAGE_TOO_LARGE = 153`, `UNEXPECTED_MESSAGE = 154`, `MISSING_REQUIRED_FIELD = 155`, `DUPLICATE_MESSAGE = 156`, `STATE_VIOLATION = 157`, `CRYPTO_UNSUPPORTED = 158`, `COMPRESSION_UNSUPPORTED = 159`, `OPERATION_UNSUPPORTED = 160`, `MALFORMED_PACKET = 161` |
| `200–259` | Security / AuthN / AuthZ | `UNAUTHENTICATED = 200`, `UNAUTHORIZED = 201`, `FORBIDDEN = 202`, `ACCOUNT_LOCKED = 203`, `ACCOUNT_SUSPENDED = 204`, `BANNED = 205`, `IP_BLOCKED = 206`, `RATE_LIMITED = 207`, `TOKEN_EXPIRED = 208`, `TOKEN_REVOKED = 209`, `DEVICE_UNTRUSTED = 210` |
| `260–299` | Crypto / Integrity | `TLS_HANDSHAKE_FAILED = 260`, `TLS_REQUIRED = 261`, `TLS_CERT_INVALID = 262`, `SIGNATURE_INVALID = 263`, `CHECKSUM_FAILED = 264`, `DECRYPTION_FAILED = 265`, `REPLAY_DETECTED = 266`, `NONCE_INVALID = 267`, `POW_REQUIRED = 270`, `POW_INVALID = 271` |
| `300–349` | Service / Infrastructure | `SERVER_SHUTDOWN = 300`, `SERVICE_UNAVAILABLE = 301`, `MAINTENANCE = 302`, `OVERLOADED = 303`, `DEPENDENCY_FAILURE = 304`, `DATABASE_UNAVAILABLE = 305`, `CACHE_UNAVAILABLE = 306`, `QUEUE_UNAVAILABLE = 307` |
| `350–399` | Application / Semantics | `VALIDATION_FAILED = 350`, `NOT_FOUND = 351`, `ALREADY_EXISTS = 352`, `PRECONDITION_FAILED = 353`, `STATE_CONFLICT = 354`, `UNSUPPORTED_MEDIA_TYPE = 355`, `SERIALIZATION_FAILED = 356`, `UNSUPPORTED_PACKET = 357`, `TRANSFORM_FAILED = 358` |
| `400–449` | Flow Control / QoS | `THROTTLED = 400`, `SLOW_CONSUMER = 401`, `CREDIT_EXHAUSTED = 402`, `WINDOW_EXCEEDED = 403` |
| `450–499` | Resource / Quota | `RESOURCE_LIMIT = 450`, `MEMORY_EXHAUSTED = 451`, `CONNECTION_LIMIT = 452`, `FD_LIMIT = 453`, `DISK_FULL = 454`, `CPU_LIMIT = 455` |
| `500–549` | Client / Local Decisions | `CLIENT_QUIT = 500`, `ABORTED = 501`, `IDLE_TIMEOUT = 502`, `LOCAL_POLICY = 503`, `COMPRESSION_FAILED = 504` |
| `550–599` | Session / Time / Clock | `SESSION_NOT_FOUND = 550`, `SESSION_EXPIRED = 551`, `DUPLICATE_SESSION = 552`, `KEY_ROTATION_REQUIRED = 553`, `TIME_SKEW = 554` |
| `600–649` | Consistency / Coordination | `LEADER_CHANGE = 600`, `NOT_LEADER = 601`, `CONSENSUS_UNAVAILABLE = 602`, `STALE_READ = 603` |
| `650–699` | Routing / Placement | `REDIRECT = 650`, `MIGRATE = 651`, `REGION_UNAVAILABLE = 652` |
| `700–749` | Compliance / Policy | `LEGAL_BLOCK = 700`, `CONTENT_VIOLATION = 701`, `AGE_RESTRICTED = 702`, `INVALID_USERNAME = 703`, `WEAK_PASSWORD = 704` |
| `900–999` | Reserved | `RESERVED_900 = 900`, `RESERVED_901 = 901` |

---

## 3. Security & Identity

### `CipherSuiteType` (`byte`)

Defines the symmetric stream and AEAD cipher suites supported by `EnvelopeCipher` (`src/Nalix.Abstractions/Security/CipherSuiteType.cs`):

| Member | Value | Mode | Nonce Size | Tag Size | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `None` | `0` | Plaintext | — | — | No encryption (default prior to handshake). |
| `Salsa20` | `3` | Symmetric | 8 B | 0 B | Salsa20 stream cipher (XOR keystream with sequence-XORed nonce). |
| `Chacha20` | `4` | Symmetric | 12 B | 0 B | RFC 8439 ChaCha20 stream cipher. |
| `Salsa20Poly1305` | `7` | AEAD | 8 B | 16 B | Salsa20 stream cipher + detached 16-byte Poly1305 MAC tag. |
| `Chacha20Poly1305` | `8` | AEAD | 12 B | 16 B | RFC 8439 ChaCha20-Poly1305 AEAD (default for `PacketEncryptionAttribute`). |

### `PermissionLevel` (`byte`)

Authority levels assigned to `IConnection.Level` and checked by `PermissionMiddleware` (`src/Nalix.Abstractions/Security/PermissionLevel.cs`):

| Member | Value | Description |
| :--- | :--- | :--- |
| `NONE` | `0` | Unverified initial connection state. |
| `POW_VERIFIED` | `10` | Client has solved a Proof-of-Work challenge (`ProofOfWorkProof`). |
| `ESTABLISHED` | `20` | Client has completed the X25519 cryptographic handshake (`HandshakeHandlers`). |
| `GUEST` | `25` | Anonymous guest session. |
| `READ_ONLY` | `50` | Authenticated read-only observer. |
| `USER` | `100` | Standard authenticated user (default for `[PacketPermission]`). |
| `SUPERVISOR` | `175` | Moderator or elevated supervisor privileges. |
| `TENANT_ADMINISTRATOR` | `200` | Organization or tenant administrator. |
| `SYSTEM_ADMINISTRATOR` | `225` | Server-wide system administrator. |
| `OWNER` | `255` | Root / owner authority level. |

### `PermissionEvaluation` (`byte`)

Controls how `PermissionMiddleware` evaluates `[PacketPermission]` (`src/Nalix.Abstractions/Security/PermissionEvaluation.cs`):

| Member | Value | Description |
| :--- | :--- | :--- |
| `MinimumLevel` | `0` | Requires `connection.Level >= attribute.Level` (hierarchical comparison, default). |
| `StrictMatch` | `1` | Requires `connection.Level == attribute.Level` (exact match). |

### `SnowflakeType` (`byte`)

Categorizes 64-bit `Snowflake` identifiers (`Unknown = 0`, `Configuration = 1`, `Log = 2`, `System = 3`, `Account = 10`, `Session = 11`, `Message = 20`, `Notification = 21`, `Email = 22`, `Sms = 23`, `Order = 30`, `Inventory = 31`, `Transaction = 32`, `Invoice = 33`, `SupportTicket = 34`, `MaxValue = 255`).

---

## 4. Serialization, Middleware & Concurrency

### `SerializeLayout` (`byte`)

- `Auto = 0` — Automatic layout.
- `Sequential = 1` — Serializes fields/properties in declaration order.
- `Explicit = 2` — Serializes fields/properties ordered by `[SerializeOrder(n)]`.

### `DropPolicy` (`int`)

Configures `DispatchOptions.DropPolicy` when a connection's inbound packet queue is full:

- `DropNewest = 0` — Drops the newly arrived packet (default).
- `DropOldest = 1` — Evicts the oldest queued packet to admit the new packet.
- `Block = 2` — Applies backpressure up to `DispatchOptions.BlockTimeout`.
- `Coalesce = 3` — Replaces the most recent queued packet of the same opcode.

### `MiddlewareStage` (`byte`)

- `Inbound = 0` — Runs before the packet handler.
- `Outbound = 1` — Runs after the packet handler when sending a response.
- `Both = 2` — Runs on both inbound and outbound paths.

### `WorkerPriority` (`byte`)

- `LOW = 0`, `NORMAL = 1`, `HIGH = 2`, `URGENT = 3`.

### `PacketContextState` (`byte`)

Namespace `Nalix.Abstractions.Networking.Packets` (`src/Nalix.Abstractions/Networking/Packets/PacketContextState.cs`). Tracks the lifecycle of a pooled packet context:

- `Pooled = 0` — stored in the object pool, available for allocation.
- `InUse = 1` — actively used by a packet handler.
- `Returned = 2` — finished processing and returned for reuse.

## Related APIs

- [Control Type](./protocols/control-type.md)
- [Packet Attributes](./packet-attributes.md)
- [Binary Wire Specification](../../concepts/internals/binary-spec.md)
