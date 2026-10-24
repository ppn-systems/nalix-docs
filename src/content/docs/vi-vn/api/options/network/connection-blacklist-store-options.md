---
title: Tùy chọn kho danh sách chặn kết nối
description: Tài liệu cấu hình cho ConnectionBlacklistStoreOptions trong Nalix.Network — danh sách chặn IP và dải CIDR cố định, được nạp từ đĩa.
section: API Reference
package: Nalix.Network
---

**Không gian tên:** `Nalix.Network.Options`  
**Assembly:** `Nalix.Network`

`ConnectionBlacklistStoreOptions` cấu hình danh sách chặn IP và dải CIDR cố định (`NetworkAccessList`) được [ConnectionGuard](../../network/connection/connection-guard.md) kiểm tra trước khi chấp nhận kết nối đến.

## Ánh xạ mã nguồn

- `src/Nalix.Network/Options/ConnectionBlacklistStoreOptions.cs`
- `src/Nalix.Network/Internal/Security/NetworkAccessList.cs`
- `src/Nalix.Network/RateLimiting/Connection.Guard.cs`

## Giá trị mặc định và kiểm tra hợp lệ

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | :--- | :--- | :--- |
| `Enabled` | `bool` | `true` | Không có | Bật hoặc tắt việc nạp và kiểm tra tệp danh sách chặn cố định IP/CIDR. |
| `StoreFileName` | `string` | `"blacklist.txt"` | Không có | Tên tệp văn bản nằm trong `Directories.ConfigurationDirectory`, chứa các địa chỉ IP hoặc dải CIDR bị chặn (mỗi dòng một mục). |
| `MaxBlacklistedIps` | `int` | `100_000` | `[ValueRange(10, 1_000_000)]` | Số mục danh sách chặn tối đa được nạp vào bộ nhớ (`10..1,000,000`). |

`Validate()` thực thi `this.ValidateDataAnnotations()` và ném `ValidationException` khi vi phạm ràng buộc.

## Ví dụ cấu hình

### Cấu hình bằng code

```csharp
using Nalix.Hosting;
using Nalix.Network.Options;

INetworkApplicationBuilder builder = NetworkApplication.CreateBuilder();

builder.Configure<ConnectionBlacklistStoreOptions>(options =>
{
    options.Enabled = true;
    options.StoreFileName = "blacklist.txt";
    options.MaxBlacklistedIps = 200_000;
});
```

### Cấu hình INI (`default.ini`)

```ini
[ConnectionBlacklistStore]
Enabled = true
StoreFileName = blacklist.txt
MaxBlacklistedIps = 100000
```

### Định dạng tệp danh sách chặn (`blacklist.txt`)

Đặt `blacklist.txt` trong `Directories.ConfigurationDirectory`, mỗi dòng một địa chỉ IPv4/IPv6 hoặc dải subnet CIDR (các dòng bắt đầu bằng `#` sẽ bị bỏ qua):

```text
# Block a single IPv4 address
192.0.2.44

# Block IPv4 and IPv6 CIDR subnets
198.51.100.0/24
2001:db8:dead::/48
```

## API liên quan

- [Connection Guard](../../network/connection/connection-guard.md)
- [Tùy chọn kho cấm kết nối](./connection-ban-store-options.md)
- [Tùy chọn Trusted Proxy](./trusted-proxy-options.md)
- [Tùy chọn mạng](./options.md)
