---
title: Token Bucket Limiter
description: Tham chiếu cho Nalix.Runtime.Throttling.TokenBucketLimiter — bộ giới hạn tốc độ token bucket có phân mảnh, dùng số cố định micro-token, tự điều chỉnh theo CPU và leo thang từ soft throttle sang khóa cứng.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Throttling`  
**Assembly:** `Nalix.Runtime`

`TokenBucketLimiter` (`[Injectable] public sealed partial class TokenBucketLimiter : IDisposable, IAsyncDisposable, IReportable`) là bộ giới hạn tốc độ token bucket có phân mảnh và độ chính xác cao của Nalix. Nó phục vụ cả việc giới hạn tốc độ toàn cục theo endpoint (`Evaluate(INetworkEndpoint)`) lẫn giới hạn theo policy riêng của từng handler (`Evaluate(INetworkEndpoint, in RateLimitPolicy)`).

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Cleanup.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Report.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.Types.cs`
- `src/Nalix.Runtime/Options/TokenBucketOptions.cs`

## Các đặc điểm kiến trúc chính

1. **Số học micro-token dạng số cố định (`TokenScale`)**: Số dư được theo dõi bằng số nguyên micro-token (`1` token đầy đủ = `TokenScale` micro-token, mặc định `100`), dùng tick của `Stopwatch.GetTimestamp()`, tránh sai số dấu phẩy động khi tốc độ gói tin cao.
2. **Phân mảnh theo lũy thừa của hai (`ShardCount = 256`)**: Các endpoint được chia vào `ShardCount` shard độc lập bằng bitmask kiểu `XxHash32` / Murmur (`hash & (ShardCount - 1)`), loại bỏ tranh chấp khóa toàn cục.
3. **Điều chỉnh tốc độ nạp theo CPU (`AdaptiveThrottlingEnabled`)**: Khi `AdaptiveThrottlingEnabled` là `true` (mặc định) và `ITaskManager` đã được đăng ký, tốc độ nạp token tự động co giãn theo `ITaskManager.ConcurrencyLimitRatio` (`0.0..1.0`) khi CPU của máy chủ tải cao.
4. **Leo thang từ Soft Throttle sang Hard Lockout**: Khi một endpoint dùng hết token, mỗi yêu cầu bị từ chối trong `SoftViolationWindowSeconds` (`8s`) sẽ tăng `SoftViolations`. Khi đạt `MaxSoftViolations` (`5`), endpoint bị khóa trong `HardLockoutSeconds` (`30s`).
5. **`EndpointState` có pool và số lượng bị chặn**: Các instance `EndpointState` được tái sử dụng qua `ObjectPoolManager.Shared`, giới hạn ở `MaxTrackedEndpoints` (`100_000`), và được quét định kỳ bởi job dọn dẹp lặp lại `"token.bucket"`.

## Tham chiếu API công khai

### Constructor & trường tĩnh

| Thành phần | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `RecurringName` | `public static readonly string RecurringName = "token.bucket";` | Tên gốc của job dọn dẹp các mục cũ lặp lại được lập lịch trong `ITaskManager`. |
| `TokenBucketLimiter()` | `public TokenBucketLimiter()` | Khởi tạo bộ giới hạn bằng `ConfigurationManager.Instance.Get<TokenBucketOptions>()`. |
| `TokenBucketLimiter(TokenBucketOptions?)` | `public TokenBucketLimiter(TokenBucketOptions? options = null)` | Khởi tạo bộ giới hạn với `TokenBucketOptions` được truyền vào và kiểm tra tính hợp lệ của nó. |

### Phương thức đánh giá & chẩn đoán

| Phương thức | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `Evaluate` (policy toàn cục) | `public RateLimitDecision Evaluate(INetworkEndpoint key)` | Tiêu thụ `1` token cho `key` theo `TokenBucketOptions` đã cấu hình của bộ giới hạn. |
| `Evaluate` (policy động) | `public RateLimitDecision Evaluate(INetworkEndpoint key, in RateLimitPolicy policy)` | Tiêu thụ `1` token cho `key` theo `RateLimitPolicy` riêng của handler (được `PolicyRateLimiter` dùng). |
| `GenerateReport` | `public string GenerateReport()` | Trả về bản tóm tắt chẩn đoán đã định dạng, gồm `CapacityTokens`, `RefillPerSecond`, `TokenScale`, `Shards`, `TrackedEndpoints`, `PeakTrackedEndpoints`, `HardBlockedCount`, `SoftWarningCount` và `TotalCleaned`. |
| `WriteReportData` | `public void WriteReportData(Utf8JsonWriter writer)` | Ghi các chỉ số chẩn đoán dạng JSON có cấu trúc. |
| `Dispose` / `DisposeAsync` | `public void Dispose()` / `public ValueTask DisposeAsync()` | Hủy job dọn dẹp lặp lại và đánh dấu bộ giới hạn đã dispose (các lệnh `Evaluate` sau đó fail-close với `HardLockout`). |

### Kiểu lồng nhau (`RateLimitDecision`, `RateLimitReason`, `RateLimitPolicy`)

```csharp
public readonly struct RateLimitDecision
{
    public bool Allowed { get; init; }
    public int RetryAfterMs { get; init; }
    public ushort Credit { get; init; }
    public RateLimitReason Reason { get; init; }
}

public enum RateLimitReason : byte
{
    None = 0,
    SoftThrottle = 1,
    HardLockout = 2
}
```

## Ví dụ sử dụng

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Runtime.Options;
using Nalix.Runtime.Throttling;

using TokenBucketLimiter limiter = new(new TokenBucketOptions
{
    CapacityTokens = 64,
    RefillTokensPerSecond = 32.0,
    HardLockoutSeconds = 30,
    MaxSoftViolations = 5
});

TokenBucketLimiter.RateLimitDecision decision = limiter.Evaluate(connection.NetworkEndpoint);
if (!decision.Allowed)
{
    // Từ chối gói tin; khuyên client thử lại sau decision.RetryAfterMs
}
```

## API liên quan

- [Policy Rate Limiter](./policy-rate-limiter.md)
- [Token Bucket Options](../../options/network/token-bucket-options.md)
- [Middleware Pipeline](./pipeline.md)
- [Connection Guard](../../network/connection/connection-guard.md)
