---
title: Connection Guard
description: Tham chiếu cho Nalix.Network.RateLimiting.ConnectionGuard — bộ giới hạn chấp nhận kết nối theo IP, theo subnet và toàn cục, với cấm IP lũy tiến và Proof-of-Work thích ứng.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.RateLimiting`  
**Assembly:** `Nalix.Network`

`ConnectionGuard` (`[Injectable] public sealed partial class ConnectionGuard : IConnectionGuard, IProofOfWorkPolicy`) kiểm soát các kết nối đến qua TCP, WebSocket và UDP passthrough trước khi đối tượng `Connection` được cấp phát. Nó thực thi danh sách đen IP/CIDR cố định, trần kết nối toàn cục, hạn ngạch proxy đáng tin cậy, giới hạn đồng thời và giới hạn cửa sổ trượt theo IP và theo subnet (`/24` với IPv4, `/48` với IPv6), cấm IP lũy tiến được lưu xuống đĩa, và Proof-of-Work thích ứng (`IProofOfWorkPolicy`) điều chỉnh theo EWMA và sức chứa.

## Nguồn mã

- `src/Nalix.Abstractions/Networking/IConnection.Guard.cs`
- `src/Nalix.Abstractions/Security/IProofOfWorkPolicy.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Slot.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Subnet.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Cleanup.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Report.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.Types.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/Internal/Security/NetworkBanRepository.cs`

## Pipeline chấp nhận

```mermaid
flowchart TD
    Req(["TryAccept(IPEndPoint / SocketEndpoint)"]) --> Inv{"Null or 0.0.0.0 / ::?"}
    Inv -->|Yes| Rej["Reject"]
    Inv -->|No| Blk{"NetworkAccessList.IsBlacklisted?"}
    Blk -->|Yes| Rej
    Blk -->|No| Glob{"_globalConnections < MaxConnections?"}
    Glob -->|No| Rej
    Glob -->|Yes| Loop{"ExemptLoopback && Loopback IP?"}
    Loop -->|Yes| Acc["Accept Connection"]
    Loop -->|No| Proxy{"NetworkAccessList.IsTrustedProxy?"}
    Proxy -->|Yes| ProxyCap{"Within TrustedProxyOptions Caps?"}
    ProxyCap -->|Yes| Acc
    ProxyCap -->|No| Rollback["Decrement Global + Reject"]
    Proxy -->|No| BanCheck{"Currently Banned?"}
    BanCheck -->|Yes| Rollback
    BanCheck -->|No| RateCheck{"Within Per-IP Concurrent & Window Limits?"}
    RateCheck -->|No (Rate Violation)| ProgBan["Apply Progressive Ban + Persist"] --> Rollback
    RateCheck -->|No (Concurrent Cap)| Rollback
    RateCheck -->|Yes| SubCheck{"Within /24 or /48 Subnet Caps?"}
    SubCheck -->|No| RollbackSlot["Release IP Slot + Decrement Global + Reject"]
    SubCheck -->|Yes| Acc
```

## Tham chiếu API công khai

```csharp
namespace Nalix.Network.RateLimiting;

[Injectable]
[Injectable(typeof(IConnectionGuard))]
[Injectable(typeof(IProofOfWorkPolicy))]
public sealed partial class ConnectionGuard : IConnectionGuard, IProofOfWorkPolicy
{
    public static readonly string RecurringName = "conn.limit";

    public ConnectionGuard();
    public ConnectionGuard(ConnectionQuotaOptions? config = null);

    public byte CurrentDifficulty { get; }
    public bool IsUnderAttack { get; }

    public bool TryAccept(IPEndPoint endPoint);
    public bool IsTrustedProxy(IPEndPoint? endPoint);
    public void Release(IPEndPoint endPoint);
    public void BanEndpoint(IPAddress address, TimeSpan duration);
    public void OnConnectionClosed(object? sender, IConnectionEventArgs args);

    public string GenerateReport();
    public void WriteReportData(Utf8JsonWriter writer);
    public void Dispose();
    public ValueTask DisposeAsync();
}
```

### Thành phần chính

| Thành phần | Mô tả |
| :--- | :--- |
| `CurrentDifficulty` | Tính độ khó Proof-of-Work hiện tại theo số bit 0 đứng đầu (từ `AdaptivePowMinDifficulty` đến `AdaptivePowMaxDifficulty`), dựa trên tích của hệ số EWMA tốc độ kết nối (`AdaptivePowStartRate..AdaptivePowMaxRate`) và hệ số sức chứa (`CapacityPoWThreshold..1.0`). |
| `IsUnderAttack` | `true` khi `CurrentDifficulty > AdaptivePowMinDifficulty` (kích hoạt thử thách `POW_REQUIRED` trong handshake). |
| `TryAccept(IPEndPoint)` | Giữ chỗ slot toàn cục, theo IP và theo subnet cho `endPoint`. Trả về `false` nếu bị từ chối hoặc đang bị cấm. |
| `IsTrustedProxy(IPEndPoint?)` | Trả về `true` khi `endPoint` khớp với một IP hoặc dải CIDR của reverse proxy đáng tin cậy đã cấu hình trong `NetworkAccessList`. |
| `Release(IPEndPoint)` | Giảm các bộ đếm toàn cục, theo IP và theo subnet mà không cần `IConnection` (dùng khi thiết lập socket thất bại sau khi `TryAccept` đã thành công). |
| `BanEndpoint(IPAddress, TimeSpan)` | Cấm thủ công `address` trong `duration` (trừ khi `address` là proxy đáng tin cậy) và đánh dấu `NetworkBanRepository` cần ghi xuống đĩa. |
| `OnConnectionClosed` | Handler sự kiện được đăng ký vào `connection.ConnectionClosed` để giải phóng slot theo IP, theo subnet và toàn cục, đồng thời áp dụng hình phạt ngắn hạn cho kết nối (`ShortLivedThresholdMs`). |

## Thành phần lưu trữ và kiểm soát truy cập nội bộ

- **`NetworkAccessList`**: Tải danh sách đen IP/CIDR cố định (`ConnectionBlacklistStoreOptions.StoreFileName`, mặc định `"blacklist.txt"`) và IP/CIDR của proxy đáng tin cậy (`TrustedProxyOptions.StoreFileName`, mặc định `"trusted_proxies.txt"`), hỗ trợ nạp lại nóng qua `FileSystemWatcher`.
- **`NetworkBanRepository`**: Định kỳ ghi các lệnh cấm lũy tiến đang hoạt động xuống đĩa (`ConnectionBanStoreOptions.StoreFileName`, mặc định `"banned_ips.bin"`, mỗi `AutoSaveInterval = 5m`) và khôi phục khi máy chủ khởi động, đồng thời giảm dần số lần cấm theo `BanCountDecayWindow` (`7d`).

## API liên quan

- [Connection Limiter Overview](./connection-limiter.md)
- [Connection Quota Options](../../options/network/connection-quota-options.md)
- [Connection Guard Options](../../options/network/connection-guard-options.md)
- [Trusted Proxy Options](../../options/network/trusted-proxy-options.md)
- [Connection Ban Store Options](../../options/network/connection-ban-store-options.md)
- [Connection Blacklist Store Options](../../options/network/connection-blacklist-store-options.md)
