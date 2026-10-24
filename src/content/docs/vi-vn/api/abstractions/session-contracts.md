---
title: Hợp đồng phiên
description: Hợp đồng lưu trữ phiên có thể tiếp tục trong Nalix.Abstractions.Networking.Sessions, gồm ISessionService, ISessionStore, ISessionFactory, SessionEntry, SessionSnapshot và SessionScope.
section: API Reference
package: Nalix.Abstractions
---

**Không gian tên:** `Nalix.Abstractions.Networking.Sessions`  
**Assembly:** `Nalix.Abstractions`

`Nalix.Abstractions.Networking.Sessions` định nghĩa các hợp đồng để ghi nhận, lưu trữ và tiêu thụ nguyên tử trạng thái phiên, hỗ trợ tiếp tục phiên không cần RTT (`SessionResume`).

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Networking/Sessions/ISessionService.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionFactory.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionStore.cs`
- `src/Nalix.Abstractions/Networking/Sessions/ISessionPersistencePolicy.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionEntry.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionSnapshot.cs`
- `src/Nalix.Abstractions/Networking/Sessions/SessionScope.cs`

## Tổng quan thành phần công khai

| Kiểu | Loại | Thành phần công khai |
| --- | --- | --- |
| `ISessionService` | `interface : IDisposable` | `ValueTask SaveSessionAsync(IConnection, CancellationToken)`, `ValueTask<SessionScope> ConsumeAsync(ulong sessionToken, Func<SessionEntry, bool>? predicate = null, CancellationToken ct = default)` |
| `ISessionStore` | `interface` | `ValueTask StoreAsync(SessionEntry, CancellationToken)`, `ValueTask<SessionScope> ConsumeAsync(ulong sessionToken, Func<SessionEntry, bool>? predicate = null, CancellationToken ct = default)` |
| `ISessionFactory` | `interface` | `SessionEntry CreateSession(IConnection connection)` |
| `ISessionPersistencePolicy` | `interface` | `bool ShouldPersist(IConnection connection)` |
| `SessionScope` | `readonly struct : IDisposable` | `SessionEntry? Value { get; }`, `bool IsValid { get; }`, `void Dispose()`, `implicit operator SessionEntry?(SessionScope)` |
| `SessionEntry` | `class` | `SessionSnapshot Snapshot`, `ulong ConnectionId`, `void Return()` |
| `SessionSnapshot` | `class` | `ulong SessionToken`, `long CreatedAtUnixMilliseconds`, `long ExpiresAtUnixMilliseconds`, `Bytes32 Secret`, `CipherSuiteType Algorithm`, `PermissionLevel Level`, `IObjectMap<AttributeKey, object>? Attributes`, `void ClearSecret()`, `void Return()` |

## `ISessionService` & `ISessionStore`

Cả `ISessionService.ConsumeAsync` và `ISessionStore.ConsumeAsync` đều thực hiện thao tác **lấy-và-xóa nguyên tử** và trả về `SessionScope`:

```csharp
using SessionScope scope = await sessionService.ConsumeAsync(
    sessionToken,
    predicate: entry => entry.Snapshot.ExpiresAtUnixMilliseconds > nowMs,
    cancellationToken: ct);

if (scope.IsValid)
{
    SessionEntry entry = scope.Value!;
    // Khôi phục Secret, Algorithm, Level và bộ đếm sequence lên kết nối mới
}
```

:::important[Tiêu thụ nguyên tử một lần (`SessionScope`)]
1. `ConsumeAsync` xóa phiên khỏi store ngay khi khớp, để các lần replay đồng thời với cùng `sessionToken` không thể tranh chấp (bảo vệ TOCTOU).
2. Dispose `SessionScope` trả về (`using SessionScope scope = ...`) sẽ tự động gọi `entry.Return()`, từ đó gọi `Snapshot.Return()` (`ClearSecret()` và `Attributes?.Return()`).
:::

## `ISessionFactory` & `ISessionPersistencePolicy`

- **`ISessionFactory.CreateSession(IConnection)`**: Tạo `SessionEntry` và điền `SessionSnapshot` với `ConnectionId` của kết nối (`SessionToken`), `Secret` 32 byte (`Bytes32`), `Algorithm`, `Level` và `Attributes` (bao gồm số thứ tự TCP/UDP).
- **`ISessionPersistencePolicy.ShouldPersist(IConnection)`**: Đánh giá xem phiên của một kết nối có nên được lưu hay không (mặc định `DefaultSessionPersistencePolicy` kiểm tra bắt tay mật mã đã hoàn tất và `Secret` khác không).

## API liên quan

- [Kho & dịch vụ phiên (InMemorySessionStore)](../network/session-store.md)
- [Giao thức tiếp tục phiên](../security/session-resume.md)
- [Extension tiếp tục phía client (ConnectWithResumeAsync)](../sdk/resume-extensions.md)
- [Hợp đồng kết nối](./connection-contracts.md)
