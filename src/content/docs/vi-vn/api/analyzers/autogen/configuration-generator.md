---
title: Bộ sinh cấu hình
description: Bộ sinh mã nguồn Roslyn incremental (ConfigurationGenerator) phát ra logic binding INI không dùng reflection, sao chép thuộc tính và các method xác thực data-annotation cho lớp ConfigurationLoader.
section: API Reference
package: Nalix.Analyzers
---

`ConfigurationGenerator` (`analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`) là bộ sinh mã nguồn Roslyn incremental, phát ra binding `.ini` không dùng reflection, sao chép thuộc tính và xác thực data-annotation cho các lớp `partial` kế thừa `ConfigurationLoader`.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`
- `src/Nalix.Environment/Configuration/Binding/ConfigurationLoader.cs`

## Mã được sinh ra

Với mỗi lớp `partial` kế thừa `ConfigurationLoader`, bộ sinh tạo `<ClassName>_Config.g.cs` với ba method override:

| Method được sinh | Chữ ký | Trách nhiệm |
| --- | --- | --- |
| `CopyPropertiesTo` | `protected override void CopyPropertiesTo(ConfigurationLoader target)` | Sao chép mọi giá trị thuộc tính có thể bind sang `target` khi nạp lại file `.ini` lúc chạy, mà không cấp phát instance options mới. |
| `BindProperties` | `protected override void BindProperties(IniConfig configFile, string section)` | Ghi header `[IniComment]` của lớp qua `WriteSectionComment`, sau đó đọc từng thuộc tính public có thể bind (kiểu nguyên thủy, `decimal`, `string`, `Guid`, `TimeSpan`, `DateTime`, `enum`) từ `configFile`. Nếu thiếu khóa trong file `.ini`, ghi lại `[IniComment]` và giá trị mặc định hiện tại vào file. Bỏ qua các thuộc tính `[ConfiguredIgnore]`. |
| `ValidateDataAnnotations` | `protected override void ValidateDataAnnotations()` | Biên dịch các attribute xác thực khai báo (`[ValueRange]`, `[AllowedEnum]`, `[Length]`, `[Required]`, `[DurationRange]`) thành kiểm tra C# trực tiếp, ném `ValidationException`. |

## Ví dụ

### Định nghĩa Options gốc

```csharp
using Nalix.Abstractions;
using Nalix.Abstractions.Validation;
using Nalix.Environment.Configuration.Binding;

[IniComment("Custom game room settings")]
public sealed partial class RoomOptions : ConfigurationLoader, IValidatableConfiguration
{
    [IniComment("Maximum players per room (2..64)")]
    [ValueRange(2, 64)]
    public int MaxPlayers { get; set; } = 16;

    [IniComment("Room title prefix (minimum 3 characters)")]
    [Required]
    [Length(3)]
    public string TitlePrefix { get; set; } = "Lobby";

    [ConfiguredIgnore]
    public object? RuntimeTag { get; set; }

    public void Validate() => this.ValidateDataAnnotations();
}
```

### Lớp đồng hành được sinh ra (`RoomOptions_Config.g.cs`)

```csharp
partial class RoomOptions
{
    protected override void CopyPropertiesTo(ConfigurationLoader target)
    {
        if (target is RoomOptions t)
        {
            t.MaxPlayers = this.MaxPlayers;
            t.TitlePrefix = this.TitlePrefix;
        }
    }

    protected override void BindProperties(IniConfig configFile, string section)
    {
        this.WriteSectionComment(configFile, section, "Custom game room settings");

        int? _v_MaxPlayers = configFile.GetInt32(section, "MaxPlayers");
        if (_v_MaxPlayers.HasValue)
        {
            this.MaxPlayers = _v_MaxPlayers.Value;
        }
        else
        {
            configFile.WriteComment(section, "MaxPlayers", "Maximum players per room (2..64)");
            configFile.WriteValue(section, "MaxPlayers", this.MaxPlayers);
        }
        // ...
    }

    protected override void ValidateDataAnnotations()
    {
        base.ValidateDataAnnotations();
        if (this.MaxPlayers < 2 || this.MaxPlayers > 64)
        {
            throw new ValidationException("MaxPlayers must be between 2 and 64.");
        }
        // ...
    }
}
```

## API liên quan

- [Cấu hình (ConfigurationManager)](../../environment/configuration.md)
- [Thuộc tính xác thực](../../abstractions/validation.md)
- [Tổng quan bộ sinh mã nguồn](./index.md)
- [Mã chẩn đoán (NALIX023, NALIX024)](../diagnostic-codes.md)
