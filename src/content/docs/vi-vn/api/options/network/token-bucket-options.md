---
title: Tùy chọn Token Bucket
description: Tham chiếu cho Nalix.Runtime.Options.TokenBucketOptions — dung lượng burst, tốc độ nạp lại, phân mảnh, điều tiết thích ứng theo CPU và cấu hình khóa mềm/khóa cứng cho TokenBucketLimiter.
section: API Reference
package: Nalix.Runtime
---

**Không gian tên:** `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`TokenBucketOptions` (`public sealed partial class TokenBucketOptions : ConfigurationLoader, IValidatableConfiguration`) cấu hình bộ giới hạn tốc độ micro-token dạng fixed-point, phân mảnh [TokenBucketLimiter](../../runtime/middleware/token-bucket-limiter.md) và cung cấp giá trị dự phòng mặc định cho [PolicyRateLimiter](../../runtime/middleware/policy-rate-limiter.md).

## Ánh xạ mã nguồn

- `src/Nalix.Runtime/Options/TokenBucketOptions.cs`
- `src/Nalix.Runtime/Throttling/TokenBucketLimiter.cs`
- `src/Nalix.Runtime/Throttling/PolicyRateLimiter.cs`

## Thuộc tính

Được tải từ mục `[TokenBucket]` trong `default.ini` qua `ConfigurationManager.Instance.Get<TokenBucketOptions>()`:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | :---: | :--- | :--- |
| `CapacityTokens` | `int` | `64` | `[ValueRange(1, int.MaxValue)]` | Dung lượng burst tối đa tính bằng số token nguyên cho mỗi endpoint. |
| `RefillTokensPerSecond` | `double` | `32.0` | `[ValueRange(0.001, double.MaxValue)]` | Tốc độ nạp token duy trì mỗi giây. |
| `HardLockoutSeconds` | `int` | `30` | `[ValueRange(0, int.MaxValue)]` | Thời gian tính bằng giây mà một endpoint bị chặn cứng sau khi đạt `MaxSoftViolations` (`0` = tắt). |
| `StaleEntrySeconds` | `int` | `180` | `[ValueRange(1, int.MaxValue)]` | Số giây nhàn rỗi trước khi một mục endpoint đủ điều kiện để bị thu hồi ở nền. |
| `CleanupIntervalSeconds` | `int` | `45` | `[ValueRange(1, int.MaxValue)]` | Khoảng thời gian tính bằng giây cho tác vụ dọn dẹp định kỳ `"token.bucket"` trong `ITaskManager`. |
| `TokenScale` | `int` | `100` | `[ValueRange(1, 1_000_000)]` | Số micro-token fixed-point trên mỗi token nguyên (`CapacityTokens * (long)TokenScale` phải vừa trong `long`). |
| `ShardCount` | `int` | `256` | `[ValueRange(1, int.MaxValue)]`, lũy thừa của 2 | Số shard của map đồng thời (`(ShardCount & (ShardCount - 1)) == 0`). |
| `SoftViolationWindowSeconds` | `int` | `8` | `[ValueRange(1, int.MaxValue)]` | Cửa sổ trượt tính bằng giây để cộng dồn các vi phạm soft-throttle liên tiếp. |
| `MaxSoftViolations` | `int` | `5` | `[ValueRange(1, int.MaxValue)]` | Số vi phạm soft trong `SoftViolationWindowSeconds` cần thiết để leo thang lên `HardLockout`. |
| `CooldownResetSec` | `int` | `10` | `[ValueRange(1, int.MaxValue)]` | Thời gian đặt lại cooldown đã cấu hình tính bằng giây. |
| `MaxTrackedEndpoints` | `int` | `100_000` | `[ValueRange(0, int.MaxValue)]` | Số endpoint tối đa được theo dõi đồng thời trên tất cả shard (`0` = không giới hạn). |
| `AdaptiveThrottlingEnabled` | `bool` | `true` | — | Điều chỉnh tốc độ nạp theo `ITaskManager.ConcurrencyLimitRatio` khi tải CPU của server cao. |
| `InitialTokens` | `int` | `-1` | `<= CapacityTokens` | Số dư token ban đầu cho endpoint mới gặp (`< 0` = đầy `CapacityTokens`, `0` = rỗng khi khởi động nguội, `> 0` = số token cụ thể). |
| `MaxEvictionCapacity` | `int` | `8192` | `[ValueRange(64, 65536)]` | Dung lượng danh sách ứng viên ban đầu dùng trong các lượt quét dọn khi vượt giới hạn. |
| `MinReportCapacity` | `int` | `256` | `[ValueRange(64, 8192)]` | Dung lượng danh sách ban đầu tối thiểu khi tạo snapshot `IReportable`. |

## Quy tắc kiểm tra hợp lệ (`Validate()`)

`Validate()` chạy kiểm tra thuộc tính DataAnnotation và áp dụng:

1. `ShardCount > 0` và `(ShardCount & (ShardCount - 1)) == 0` (phải là lũy thừa của 2).
2. `CapacityTokens * (long)TokenScale <= long.MaxValue`.
3. `InitialTokens <= CapacityTokens`.

## API liên quan

- [Token Bucket Limiter](../../runtime/middleware/token-bucket-limiter.md)
- [Policy Rate Limiter](../../runtime/middleware/policy-rate-limiter.md)
- [Tùy chọn Directive Guard](./directive-guard-options.md)
