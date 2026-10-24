---
title: Tùy chọn kho lưu ban kết nối
description: Tài liệu cấu hình cho ConnectionBanStoreOptions trong Nalix.Network — lưu trữ bền vững trên đĩa, chu kỳ tự động lưu và cửa sổ suy giảm 7 ngày đối với các IP bị cấm lũy tiến.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionBanStoreOptions` cấu hình việc lưu trữ bền vững trên đĩa (`NetworkBanRepository`) cho các lệnh cấm IP động, lũy tiến do [ConnectionGuard](../../network/connection/connection-guard.md) tạo ra khi peer vi phạm giới hạn tốc độ kết nối, ngưỡng lỗi hoặc hạn ngạch flood gói tin.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionBanStoreOptions.cs`
- `src/Nalix.Network/Internal/Security/NetworkBanRepository.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`

## Giá trị mặc định và kiểm tra hợp lệ

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `Enabled` | `bool` | `true` | Không có | Bật hoặc tắt việc lưu các lệnh cấm IP động xuống đĩa để giữ lại qua các lần khởi động lại máy chủ. |
| `AutoSaveInterval` | `TimeSpan` | `00:05:00` (5 phút) | `[DurationRange("00:01:00", "01:00:00")]` | Chu kỳ định kỳ để ghi các bản ghi cấm đã thay đổi (dirty) xuống đĩa (từ `1` phút đến `1` giờ). |
| `StoreFileName` | `string` | `"banned_ips.bin"` | Không có | Tên tệp cơ sở dữ liệu nhị phân, nằm trong `Directories.DataDirectory`. |
| `BanCountDecayWindow` | `TimeSpan` | `7.00:00:00` (7 ngày) | `[DurationRange("01:00:00", "30.00:00:00")]` | Thời gian cư xử tốt liên tục cần có trước khi số lần vi phạm lũy tiến của một IP bị suy giảm (từ `1` giờ đến `30` ngày). |
| `MaxPersistedBans` | `int` | `100_000` | `[ValueRange(10, 1_000_000)]` | Số bản ghi cấm tối đa được nạp vào bộ nhớ hoặc ghi xuống đĩa, nhằm tránh cạn kiệt bộ nhớ. |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném `ValidationException` khi vi phạm ràng buộc.

## Ví dụ cấu hình

### Cấu hình bằng code

```csharp
using System;
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<ConnectionBanStoreOptions>(options =>
{
    options.Enabled = true;
    options.AutoSaveInterval = TimeSpan.FromMinutes(10);
    options.StoreFileName = "banned_ips.bin";
    options.BanCountDecayWindow = TimeSpan.FromDays(14);
    options.MaxPersistedBans = 50_000;
});
```

### Cấu hình INI (`default.ini`)

```ini
[ConnectionBanStore]
Enabled = true
AutoSaveInterval = 00:05:00
StoreFileName = banned_ips.bin
BanCountDecayWindow = 7.00:00:00
MaxPersistedBans = 100000
```

## API liên quan

- [Connection Guard](../../network/connection/connection-guard.md)
- [Tùy chọn Connection Guard](./connection-guard-options.md)
- [Tùy chọn kho danh sách chặn kết nối](./connection-blacklist-store-options.md)
- [Tùy chọn mạng](./options.md)
