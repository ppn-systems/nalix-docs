---
title: Validation Attributes
description: Nalix provides AOT-safe validation attributes in Nalix.Abstractions.Validation as replacements for System.ComponentModel.DataAnnotations. These attributes are read by the Config...
section: API Reference
package: Nalix.Abstractions
---

Nalix provides AOT-safe validation attributes in `Nalix.Abstractions.Validation` as replacements for `System.ComponentModel.DataAnnotations`. These attributes are read by the `ConfigurationGenerator` source generator at compile time — no runtime reflection or DataAnnotations dependency is required.

## Source Mapping

- `src/Nalix.Abstractions/Validation/ValueRangeAttribute.cs`
- `src/Nalix.Abstractions/Validation/DurationRangeAttribute.cs`
- `src/Nalix.Abstractions/Validation/LengthAttribute.cs`
- `src/Nalix.Abstractions/Validation/RequiredAttribute.cs`
- `src/Nalix.Abstractions/Validation/AllowedEnumAttribute.cs`
- `src/Nalix.Abstractions/Exceptions/ValidationException.cs`

## Attributes

### `ValueRangeAttribute`

Specifies the numeric inclusive range that a property value must fall within.

- **Namespace:** `Nalix.Abstractions.Validation`
- **Target:** Properties
- **Constructors:**

  ```csharp
  ValueRangeAttribute(double minimum, double maximum)
  ValueRangeAttribute(long minimum, long maximum)
  ```

- **Properties:** `Minimum`, `Maximum`, `MinimumInt64`, `MaximumInt64`, `UseInt64`
- Use the `(long, long)` overload when the range bound includes `int.MaxValue` or `long.MaxValue`.

### `DurationRangeAttribute`

Specifies the inclusive `TimeSpan` range that a property value must fall within.

- **Namespace:** `Nalix.Abstractions.Validation`
- **Target:** Properties
- **Constructor:**

  ```csharp
  DurationRangeAttribute(string minimum, string maximum)
  ```

- **Properties:** `Minimum`, `Maximum` (parseable time strings, e.g. `"00:00:01"`, `"1.00:00:00"`)

### `RequiredAttribute`

Specifies that a property value must not be `null`.

- **Namespace:** `Nalix.Abstractions.Validation`
- **Target:** Properties

For string properties that must also be non-empty, prefer `LengthAttribute` with a minimum of 1.

### `LengthAttribute`

Specifies the minimum length for a string or collection property.

- **Namespace:** `Nalix.Abstractions.Validation`
- **Target:** Properties
- **Constructor:**

  ```csharp
  LengthAttribute(int minimum)
  ```

- **Properties:** `Minimum`
- Applies to `string`, arrays, and collection types.

### `AllowedEnumAttribute`

Specifies that a property value must be a defined member of its enum type.

- **Namespace:** `Nalix.Abstractions.Validation`
- **Target:** Properties

## ValidationException

Thrown when a configuration or data validation check fails. This is the AOT-safe replacement for `System.ComponentModel.DataAnnotations.ValidationException`.

- **Namespace:** `Nalix.Abstractions.Exceptions`
- **Constructors:**

  ```csharp
  ValidationException()
  ValidationException(string message)
  ValidationException(string message, Exception innerException)
  ValidationException(string propertyName, object? invalidValue, string reason)
  ```

## Other exception and configuration types

- `BaseException` (`Nalix.Abstractions.Exceptions`): `abstract class BaseException : Exception` with protected `()`, `(string message)` and `(string message, Exception innerException)` constructors. Base type for custom Nalix exceptions (`src/Nalix.Abstractions/Exceptions/BaseException.cs`).
- `ConcurrencyFailureException` (`Nalix.Abstractions.Exceptions`): `sealed class ConcurrencyFailureException : InternalErrorException`, thrown when a concurrency conflict is detected and the operation is rejected. Constructors: `()`, `(string message)`, `(string message, string details)`, `(string message, Exception innerException)` (`src/Nalix.Abstractions/Exceptions/ConcurrencyFailureException.cs`).
- `ExceptionClassifier` (`Nalix.Abstractions.Exceptions`): `static class` with `bool IsNonFatal(Exception ex)`. Returns `false` for `OutOfMemoryException`, `StackOverflowException`, `AccessViolationException`, `AppDomainUnloadedException`, `BadImageFormatException`, `CannotUnloadAppDomainException` and `InvalidProgramException`, otherwise `true`; throws `ArgumentNullException` for `null` (`src/Nalix.Abstractions/Exceptions/ExceptionClassifier.cs`).
- `ConfiguredIgnoreAttribute` (`Nalix.Abstractions`): property-only attribute `ConfiguredIgnoreAttribute(string? reason = null)` with `string Reason` (empty when omitted). Marked properties are not set when loading values from a configuration file (`src/Nalix.Abstractions/ConfiguredIgnoreAttribute.cs`).
- `IniCommentAttribute` (`Nalix.Abstractions`): `sealed` attribute for classes (section comment) and properties (key comment), `IniCommentAttribute(string comment)` with `string Comment`; multi-line via `\n`. The constructor throws `ArgumentException` for null or whitespace text (`src/Nalix.Abstractions/IniCommentAttribute.cs`).

## Usage in Options

Nalix option types use these attributes and call `ValidateDataAnnotations()` in their `Validate()` method:

```csharp
using Nalix.Abstractions.Validation;
using Nalix.Environment.Configuration.Binding;

public sealed partial class MyOptions : ConfigurationLoader, IValidatableConfiguration
{
    [ValueRange(1, 10_000)]
    public int MaxItems { get; set; } = 100;

    [DurationRange("00:00:01", "1.00:00:00")]
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(5);

    public void Validate() => this.ValidateDataAnnotations();
}
```

## Related APIs

- [Configuration](../environment/configuration.md)
- [Abstractions Overview](./index.md)
