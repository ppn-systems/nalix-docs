---
title: Session Resumption Protocol
description: Session resumption enables low-latency reconnection by bypassing the full X25519 handshake. It allows clients to re-establish a secure session using previously negotiated symmet...
section: API Reference
package: Nalix.Codec / Nalix.Network
---

Session resumption enables low-latency reconnection by bypassing the full X25519 handshake. It allows clients to re-establish a secure session using previously negotiated symmetric secrets and a valid session token.

## Source Mapping

- `src/Nalix.Codec/ProtocolFrames/Session/SessionResume.cs`
- `src/Nalix.Runtime/Handlers/SessionHandlers.cs`
- `src/Nalix.Runtime/Sessions/SessionService.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionService.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionFactory.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionStore.cs`
- `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs`

## 1. Design & Rationale

Nalix uses the `SessionResume` packet with a `Stage` state machine to manage session state. The packet supports `REQUEST` and `RESPONSE` stages so the server can restore or reject a session in a single round-trip.

- **Atomic Resumption**: The server applies the restored session snapshot and returns a fresh response token in a single round-trip.
- **Stateless Re-entry**: A session can be resumed immediately as long as the 8-byte `SessionToken` and its associated `Secret` are valid.
- **Token Rotation**: The server can return a rotated `SessionToken` in a successful response.

---

## 2. Handshake vs. Resumption

```mermaid
sequenceDiagram
    participant C as Client (SDK)
    participant S as Server (Runtime)
    
    Note over C, S: Option A: Full Handshake (Standard)
    C->>S: SessionInit (PublicKey, Nonce)
    S->>C: SessionChallenge (PublicKey, Nonce, Proof)
    C->>S: SessionProof (Proof)
    S->>C: SessionEstablished (Proof, SessionToken)
    
    Note over C, S: Option B: Session Resume (Fast)
    C->>S: SessionResume [Stage=REQUEST, Token=T1]
    S->>C: SessionResume [Stage=RESPONSE, Token=T2, Reason=NONE]
```

---

## 3. Protocol Specification

### Packet Shape

`SessionResume` is a fixed-size signal packet carrying the stage, session token, proof, and result reason needed for resumption.

---

## 4. Implementation Details

### Server Handling Logic (`SessionHandlers.HandleAsync`)

When a `SessionResume` (`0x0002`, `SESSION_SIGNAL`) request arrives at `SessionHandlers.HandleAsync`:

1. The incoming packet is validated to ensure the `Stage` (`SessionResumeStage.REQUEST`), `SessionToken`, and `Proof` fields are structurally sound.
2. The server calls `ISessionService.ConsumeAsync(packet.SessionToken, entry => ...)` to atomically validate and consume the stored `SessionEntry`.
3. Inside the predicate, it verifies `Proof` in constant time using `HmacKeccak256.Compute` over the 16-byte buffer `SessionToken (8B LE) || TimeWindow (8B LE, UnixSeconds / 30)` across the `[t - 1, t, t + 1]` time windows (30-second buckets).
4. If validation succeeds, the runtime restores the connection's `Secret`, `Algorithm`, `Level`, and saved state, and marks the handshake state as established.
5. The runtime persists the live connection under its new `ConnectionId` (`newToken`) via `ISessionService.SaveSessionAsync(connection)`, computes a server response proof (`HmacKeccak256` over `newToken (8B LE) || TimeWindow (8B LE)`), and sends `SessionResume` (`Stage = RESPONSE`, `SessionToken = newToken`, `Reason = ProtocolReason.NONE`, `Proof = responseProof`).
6. If validation, token lookup, or proof verification fails, the server sends a `SessionResume` (`Stage = RESPONSE`) with the failure `ProtocolReason` and closes the connection.

---

## 5. Security & Operations

- **Token Confidentiality**: While the token is not a replacement for the symmetric secret, it should be treated as sensitive material as it identifies an active session.
- **Rotation Policy**: Clients must update their local `session.State.SessionToken` immediately upon receiving a successful `RESPONSE`. The SDK already does this in `src/Nalix.SDK/Transport/Extensions/ResumeExtensions.cs`.
- **Invalidation**: Sessions are invalidated upon explicit disconnect or after the configured session-store TTL (Time-To-Live) expires.

---

## Related Documentation

- [Handshake Protocol (X25519)](./handshake.md)
- [Session Contracts](../abstractions/session-contracts.md)
- [Snowflake Identifiers](../framework/snowflake.md)
- [SDK Resume Extensions](../sdk/resume-extensions.md)
