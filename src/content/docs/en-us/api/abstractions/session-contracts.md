---
title: Session Contracts
description: Resumable session persistence contracts in Nalix.Abstractions.Networking.Sessions including ISessionService, ISessionStore, ISessionFactory, SessionEntry, SessionSnapshot, and SessionScope.
section: API Reference
package: Nalix.Abstractions
---

**Namespace:** `Nalix.Abstractions.Networking.Sessions`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Networking.Sessions` defines the contracts for capturing, storing, and atomically consuming session state to support zero-RTT session resumption (`SessionResume`).

## Source Mapping

- `src/Nalix.Abstractions/Networking/Sessions/ISessionService.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionFactory.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionStore.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionPersistencePolicy.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionEntry.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionSnapshot.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionScope.cs`

## Public Members at a Glance

| Type | Kind | Public Members |
| --- | --- | --- |
| `ISessionService` | `interface : IDisposable` | `ValueTask SaveSessionAsync(IConnection, CancellationToken)`, `ValueTask<SessionScope> ConsumeAsync(ulong sessionToken, Func<SessionEntry, bool>? predicate = null, CancellationToken ct = default)` |
| `ISessionStore` | `interface` | `ValueTask StoreAsync(SessionEntry, CancellationToken)`, `ValueTask<SessionScope> ConsumeAsync(ulong sessionToken, Func<SessionEntry, bool>? predicate = null, CancellationToken ct = default)` |
| `ISessionFactory` | `interface` | `SessionEntry CreateSession(IConnection connection)` |
| `ISessionPersistencePolicy` | `interface` | `bool ShouldPersist(IConnection connection)` |
| `SessionScope` | `readonly struct : IDisposable` | `SessionEntry? Value { get; }`, `bool IsValid { get; }`, `void Dispose()`, `implicit operator SessionEntry?(SessionScope)` |
| `SessionEntry` | `class` | `SessionSnapshot Snapshot`, `ulong ConnectionId`, `void Return()` |
| `SessionSnapshot` | `class` | `ulong SessionToken`, `long CreatedAtUnixMilliseconds`, `long ExpiresAtUnixMilliseconds`, `Bytes32 Secret`, `CipherSuiteType Algorithm`, `PermissionLevel Level`, `IObjectMap<AttributeKey, object>? Attributes`, `void ClearSecret()`, `void Return()` |

## `ISessionService` & `ISessionStore`

Both `ISessionService.ConsumeAsync` and `ISessionStore.ConsumeAsync` perform an **atomic retrieve-and-remove** operation and return a `SessionScope`:

```csharp
using SessionScope scope = await sessionService.ConsumeAsync(
    sessionToken,
    predicate: entry => entry.Snapshot.ExpiresAtUnixMilliseconds > nowMs,
    cancellationToken: ct);

if (scope.IsValid)
{
    SessionEntry entry = scope.Value!;
    // Restore Secret, Algorithm, Level, and sequence counters onto the new connection
}
```

:::important[Single-Use Atomic Consumption (`SessionScope`)]
1. `ConsumeAsync` removes the session from the store immediately when matched so concurrent replay attempts with the same `sessionToken` cannot race (TOCTOU protection).
2. Disposing the returned `SessionScope` (`using SessionScope scope = ...`) automatically calls `entry.Return()`, which calls `Snapshot.Return()` (`ClearSecret()` and `Attributes?.Return()`).
:::

## `ISessionFactory` & `ISessionPersistencePolicy`

- **`ISessionFactory.CreateSession(IConnection)`**: Creates a `SessionEntry` and populates its `SessionSnapshot` with the connection's `ConnectionId` (`SessionToken`), 32-byte `Secret` (`Bytes32`), `Algorithm`, `Level`, and `Attributes` (including TCP/UDP sequence numbers).
- **`ISessionPersistencePolicy.ShouldPersist(IConnection)`**: Evaluates whether a connection's session should be saved (default `DefaultSessionPersistencePolicy` verifies that a cryptographic handshake was completed and `Secret` is non-zero).

## Related APIs

- [Session Store & Service (InMemorySessionStore)](../network/session-store.md)
- [Session Resumption Protocol](../security/session-resume.md)
- [Client Resume Extensions (ConnectWithResumeAsync)](../sdk/resume-extensions.md)
- [Connection Contracts](./connection-contracts.md)
