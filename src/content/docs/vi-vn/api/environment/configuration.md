---
title: Cấu hình
description: Ràng buộc cấu hình INI, tự động nạp lại khi file thay đổi và kiểm tra hợp lệ trong Nalix.Environment.Configuration (ConfigurationManager, ConfigurationLoader, IniConfig).
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Configuration` (và `Nalix.Environment.Configuration.Binding`)  
**Assembly:** `Nalix.Environment`

Hệ thống cấu hình của `Nalix.Environment` ràng buộc các file `.ini` vào các lớp `ConfigurationLoader` có kiểu mạnh, dựa trên mã được sinh lúc biên dịch bởi `ConfigurationGenerator` (không dùng reflection lúc chạy).

## Ánh xạ mã nguồn

- `src/Nalix.Environment/Configuration/ConfigurationManager.cs`
- `src/Nalix.Environment/Configuration/Binding/ConfigurationLoader.cs`
- `src/Nalix.Environment/Configuration/Binding/ConfigurationLoader.SectionName.cs`
- `src/Nalix.Environment/Configuration/Binding/IniConfig.cs`
- `analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`

## `ConfigurationManager`

`ConfigurationManager` (`public sealed class ConfigurationManager : IDisposable`) quản lý file `.ini` đang hoạt động (mặc định là `<Directories.ConfigurationDirectory>/default.ini`), việc nạp lại qua `FileSystemWatcher` có debounce (`300ms`), và cache an toàn đa luồng của các instance `ConfigurationLoader`.

### Thuộc tính & phương thức công khai

| Thành viên | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `Instance` | `public static ConfigurationManager Instance { get; }` | Instance singleton toàn cục. |
| `ConfigFilePath` | `public string ConfigFilePath { get; }` | Đường dẫn tuyệt đối tới file `.ini` đang hoạt động. |
| `ConfigFileExists` | `public bool ConfigFileExists { get; }` | `true` nếu file `.ini` đang hoạt động tồn tại trên đĩa. |
| `LastReloadTime` | `public DateTime LastReloadTime { get; }` | Dấu thời gian UTC của lần nạp lại cấu hình gần nhất. |
| `Get<TClass>()` | `public TClass Get<TClass>() where TClass : ConfigurationLoader, new()` | Lấy hoặc khởi tạo instance `TClass` đã cache từ file `.ini` đang hoạt động. |
| `Get<TClass>(string, bool)` | `public TClass Get<TClass>(string configFilePath, bool autoReload = true) where TClass : ConfigurationLoader, new()` | Chuyển file `.ini` đang hoạt động sang `configFilePath` rồi lấy `TClass`. |
| `MarkManuallyConfigured<TClass>()` | `public void MarkManuallyConfigured<TClass>() where TClass : ConfigurationLoader` | Đánh dấu `TClass` đã được cấu hình trong code, để các lần nạp lại `.ini` phát cảnh báo khi ghi đè thay đổi lập trình. |
| `SetConfigFilePath` | `public void SetConfigFilePath(string newConfigFilePath, bool autoReload = true)` | Chuyển đường dẫn file `.ini` đang hoạt động (phải nằm dưới `Directories.ConfigurationDirectory`; ném `TimeoutException` nếu đang có một lần nạp lại). |
| `UpdateValue<TClass>` | `public void UpdateValue<TClass>(string key, object value) where TClass : ConfigurationLoader, new()` | Cập nhật một khóa trong mục `.ini` của `TClass`, ghi xuống đĩa và nạp lại `TClass`. |
| `ReloadAll` | `public void ReloadAll()` | Đọc lại file `.ini` đang hoạt động và cập nhật tại chỗ mọi instance đã cache (ném `TimeoutException` nếu đang có lần nạp lại khác chạy đồng thời). |
| `Flush` | `public void Flush()` | Ghi mọi giá trị mặc định/chú thích `.ini` đang đệm xuống đĩa. |
| `IsLoaded<TClass>()` | `public bool IsLoaded<TClass>() where TClass : ConfigurationLoader` | Trả về `true` nếu `TClass` đang được cache. |
| `Remove<TClass>()` | `public bool Remove<TClass>() where TClass : ConfigurationLoader` | Xóa `TClass` khỏi cache đang hoạt động. |
| `ClearAll` | `public void ClearAll()` | Xóa mọi instance cấu hình đã cache. |

## `ConfigurationLoader`

Mọi lớp tùy chọn đều kế thừa `ConfigurationLoader` (`Clone<T>() where T : ConfigurationLoader, new()`) và phải khai báo `partial` để `ConfigurationGenerator` có thể sinh `BindProperties`, `CopyPropertiesTo`, `CloneEmpty` và `ValidateDataAnnotations`.

### Quy ước đặt tên section

Tên section `.ini` được suy ra bằng cách bỏ các hậu tố chuẩn (`Options`, `Config`, `Settings`, `Option`, `Configs`, `Setting`, `Configuration`, `Configurations`) khỏi tên lớp:

- `NetworkSocketOptions` $\rightarrow$ `[NetworkSocket]`
- `TransportOptions` $\rightarrow$ `[Transport]`

### Kiểu thuộc tính được hỗ trợ (`IniConfig`)

`IniConfig` và `ConfigurationGenerator` hỗ trợ:
- **Số nguyên & byte:** `byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong` (`GetByte`, `GetSByte`, `GetInt16`, `GetUInt16`, `GetInt32`, `GetUInt32`, `GetInt64`, `GetUInt64`)
- **Số thực dấu phẩy động & decimal:** `float` (`GetSingle`), `double` (`GetDouble`), `decimal` (`GetDecimal`)
- **Nguyên thủy & kiểu giá trị:** `bool` (`GetBool`), `char` (`GetChar`), `string` (`GetString`), `TimeSpan` (`GetTimeSpan`), `DateTime` (`GetDateTime`), `Guid` (`GetGuid`), và `enum` (`GetEnum<TEnum>`).

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Validation;
using Nalix.Environment.Configuration.Binding;

[IniComment("Server room settings")]
public sealed partial class ServerRoomOptions : ConfigurationLoader, IValidatableConfiguration
{
    [IniComment("Listen port (1..65535)")]
    [ValueRange(1, 65535)]
    public ushort Port { get; set; } = 57206;

    [ConfiguredIgnore]
    public string InternalRuntimeId { get; set; } = "local";

    public void Validate() => this.ValidateDataAnnotations();
}
```

## API liên quan

- [Trình sinh cấu hình](../analyzers/autogen/configuration-generator.md)
- [Thuộc tính kiểm tra hợp lệ](../abstractions/validation.md)
- [Directories](./directories.md)
