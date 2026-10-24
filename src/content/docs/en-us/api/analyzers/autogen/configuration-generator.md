---
title: Configuration Generator
description: Incremental Roslyn source generator (ConfigurationGenerator) that emits reflection-free INI binding, property copying, and data-annotation validation methods for ConfigurationLoader classes.
section: API Reference
package: Nalix.Analyzers
---

`ConfigurationGenerator` (`analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`) is an incremental Roslyn source generator that emits reflection-free `.ini` binding, property copying, and data-annotation validation for `partial` classes inheriting from `ConfigurationLoader`.

## Source Mapping

- `analyzers/Nalix.Analyzers.Generators/ConfigurationGenerator.cs`
- `src/Nalix.Environment/Configuration/Binding/ConfigurationLoader.cs`

## What It Generates

For every `partial` class inheriting from `ConfigurationLoader`, the generator emits `<ClassName>_Config.g.cs` with three overridden methods:

| Generated Method | Signature | Responsibility |
| --- | --- | --- |
| `CopyPropertiesTo` | `protected override void CopyPropertiesTo(ConfigurationLoader target)` | Copies all bindable property values to `target` during live `.ini` file reloads without allocating a new options instance. |
| `BindProperties` | `protected override void BindProperties(IniConfig configFile, string section)` | Writes the class-level `[IniComment]` header via `WriteSectionComment`, then reads each public bindable property (primitives, `decimal`, `string`, `Guid`, `TimeSpan`, `DateTime`, `enum`) from `configFile`. If a key is missing in the `.ini` file, writes its `[IniComment]` and current default value back to the file. Skips `[ConfiguredIgnore]` properties. |
| `ValidateDataAnnotations` | `protected override void ValidateDataAnnotations()` | Compiles declarative validation attributes (`[ValueRange]`, `[AllowedEnum]`, `[Length]`, `[Required]`, `[DurationRange]`) into direct C# checks that throw `ValidationException`. |

## Example

### Source Options Definition

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

### Generated Companion (`RoomOptions_Config.g.cs`)

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

## Related APIs

- [Configuration (ConfigurationManager)](../../environment/configuration.md)
- [Validation Attributes](../../abstractions/validation.md)
- [Source Generators Overview](./index.md)
- [Diagnostic Codes (NALIX023, NALIX024)](../diagnostic-codes.md)
