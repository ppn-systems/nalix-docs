---
title: Thuộc tính xác thực
description: Nalix cung cấp các thuộc tính xác thực an toàn với AOT trong Nalix.Abstractions.Validation, thay thế System.ComponentModel.DataAnnotations. Các thuộc tính này được ConfigurationGenerator đọc...
section: API Reference
package: Nalix.Abstractions
---

Nalix cung cấp các thuộc tính xác thực an toàn với AOT trong `Nalix.Abstractions.Validation`, thay thế cho `System.ComponentModel.DataAnnotations`. Các thuộc tính này được `ConfigurationGenerator` đọc lúc biên dịch, nên không cần reflection lúc chạy hay phụ thuộc vào DataAnnotations.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Validation/ValueRangeAttribute.cs`
- `src/Nalix.Abstractions/Validation/DurationRangeAttribute.cs`
- `src/Nalix.Abstractions/Validation/LengthAttribute.cs`
- `src/Nalix.Abstractions/Validation/RequiredAttribute.cs`
- `src/Nalix.Abstractions/Validation/AllowedEnumAttribute.cs`
- `src/Nalix.Abstractions/Exceptions/ValidationException.cs`

## Thuộc tính

### `ValueRangeAttribute`

Chỉ định khoảng số (bao gồm hai đầu) mà giá trị thuộc tính phải nằm trong.

- **Không gian tên:** `Nalix.Abstractions.Validation`
- **Phạm vi:** Thuộc tính
- **Hàm dựng:**

  ```csharp
  ValueRangeAttribute(double minimum, double maximum)
  ValueRangeAttribute(long minimum, long maximum)
  ```

- **Thuộc tính:** `Minimum`, `Maximum`, `MinimumInt64`, `MaximumInt64`, `UseInt64`
- Dùng overload `(long, long)` khi biên của khoảng bao gồm `int.MaxValue` hoặc `long.MaxValue`.

### `DurationRangeAttribute`

Chỉ định khoảng `TimeSpan` (bao gồm hai đầu) mà giá trị thuộc tính phải nằm trong.

- **Không gian tên:** `Nalix.Abstractions.Validation`
- **Phạm vi:** Thuộc tính
- **Hàm dựng:**

  ```csharp
  DurationRangeAttribute(string minimum, string maximum)
  ```

- **Thuộc tính:** `Minimum`, `Maximum` (chuỗi thời gian có thể phân tích, ví dụ `"00:00:01"`, `"1.00:00:00"`)

### `RequiredAttribute`

Chỉ định giá trị thuộc tính không được là `null`.

- **Không gian tên:** `Nalix.Abstractions.Validation`
- **Phạm vi:** Thuộc tính

Với thuộc tính kiểu chuỗi cũng không được rỗng, nên dùng `LengthAttribute` với giá trị tối thiểu là 1.

### `LengthAttribute`

Chỉ định độ dài tối thiểu cho thuộc tính kiểu chuỗi hoặc collection.

- **Không gian tên:** `Nalix.Abstractions.Validation`
- **Phạm vi:** Thuộc tính
- **Hàm dựng:**

  ```csharp
  LengthAttribute(int minimum)
  ```

- **Thuộc tính:** `Minimum`
- Áp dụng cho `string`, mảng và các kiểu collection.

### `AllowedEnumAttribute`

Chỉ định giá trị thuộc tính phải là một thành phần đã định nghĩa của kiểu enum của nó.

- **Không gian tên:** `Nalix.Abstractions.Validation`
- **Phạm vi:** Thuộc tính

## ValidationException

Được ném khi kiểm tra xác thực cấu hình hoặc dữ liệu thất bại. Đây là phiên bản thay thế an toàn với AOT của `System.ComponentModel.DataAnnotations.ValidationException`.

- **Không gian tên:** `Nalix.Abstractions.Exceptions`
- **Hàm dựng:**

  ```csharp
  ValidationException()
  ValidationException(string message)
  ValidationException(string message, Exception innerException)
  ValidationException(string propertyName, object? invalidValue, string reason)
  ```

## Các kiểu exception và cấu hình khác

- `BaseException` (`Nalix.Abstractions.Exceptions`): `abstract class BaseException : Exception` với các hàm dựng protected `()`, `(string message)` và `(string message, Exception innerException)`. Lớp cơ sở cho các exception tùy chỉnh của Nalix (`src/Nalix.Abstractions/Exceptions/BaseException.cs`).
- `ConcurrencyFailureException` (`Nalix.Abstractions.Exceptions`): `sealed class ConcurrencyFailureException : InternalErrorException`, được ném khi phát hiện xung đột đồng thời và thao tác bị từ chối. Hàm dựng: `()`, `(string message)`, `(string message, string details)`, `(string message, Exception innerException)` (`src/Nalix.Abstractions/Exceptions/ConcurrencyFailureException.cs`).
- `ExceptionClassifier` (`Nalix.Abstractions.Exceptions`): `static class` với `bool IsNonFatal(Exception ex)`. Trả về `false` với `OutOfMemoryException`, `StackOverflowException`, `AccessViolationException`, `AppDomainUnloadedException`, `BadImageFormatException`, `CannotUnloadAppDomainException` và `InvalidProgramException`, còn lại trả về `true`. Ném `ArgumentNullException` nếu đầu vào là `null` (`src/Nalix.Abstractions/Exceptions/ExceptionClassifier.cs`).
- `ConfiguredIgnoreAttribute` (`Nalix.Abstractions`): attribute chỉ dùng cho thuộc tính, `ConfiguredIgnoreAttribute(string? reason = null)` với `string Reason` (rỗng khi không truyền). Các thuộc tính được đánh dấu sẽ không được gán khi nạp giá trị từ file cấu hình (`src/Nalix.Abstractions/ConfiguredIgnoreAttribute.cs`).
- `IniCommentAttribute` (`Nalix.Abstractions`): attribute `sealed` cho lớp (chú thích section) và thuộc tính (chú thích khóa), `IniCommentAttribute(string comment)` với `string Comment`; nhiều dòng qua `\n`. Hàm dựng ném `ArgumentException` nếu text là null hoặc chỉ có khoảng trắng (`src/Nalix.Abstractions/IniCommentAttribute.cs`).

## Cách dùng trong Options

Các kiểu option của Nalix dùng những attribute này và gọi `ValidateDataAnnotations()` trong phương thức `Validate()` của chúng:

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

## API liên quan

- [Cấu hình](../environment/configuration.md)
- [Tổng quan Abstractions](./index.md)
