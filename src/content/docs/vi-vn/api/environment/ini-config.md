---
title: IniConfig
description: Bộ đọc và ghi .ini cấp thấp trong Nalix.Environment với các getter có kiểu, ghi đè qua biến môi trường NALIX_<SECTION>_<KEY>, ghi trong bộ nhớ và flush nguyên tử.
section: API Reference
package: Nalix.Environment
---

**Namespace:** `Nalix.Environment.Configuration.Binding`  
**Assembly:** `Nalix.Environment`

`IniConfig` (`public sealed class IniConfig : IDisposable`) là bộ đọc/ghi `.ini` cấp thấp đứng sau [Configuration](./configuration.md). `ConfigurationManager` và mã do `ConfigurationGenerator` sinh ra đều dùng nó; hầu hết ứng dụng chỉ bind các lớp tùy chọn và không bao giờ dùng trực tiếp. Kiểu này được đánh dấu `[EditorBrowsable(EditorBrowsableState.Never)]`, nên không xuất hiện trong IntelliSense.

## Source Mapping

- `src/Nalix.Environment/Configuration/Binding/IniConfig.cs`

## Quick Reference

| Thành viên | Chữ ký | Mô tả |
| :--- | :--- | :--- |
| `IniConfig(string)` | `public IniConfig(string path)` | Chuyển `path` thành đường dẫn đầy đủ và nạp tệp nếu tệp tồn tại. |
| `ExistsFile` | `public bool ExistsFile { get; }` | `true` nếu tệp tồn tại trên đĩa (kiểm tra ở mỗi lần truy cập). |
| `FilePath` | `public string FilePath { get; }` | Đường dẫn tuyệt đối của tệp `.ini`. |
| `Reload` | `public void Reload()` | Đọc lại tệp, bỏ các thay đổi trong bộ nhớ. |
| `WriteValue` | `public void WriteValue(string section, string key, object value)` | Đặt một giá trị trong bộ nhớ và đánh dấu instance là đã thay đổi. |
| `WriteComment` | `public void WriteComment(string section, string? key, string? comment)` | Đăng ký chú thích cho một section hoặc key, được ghi ở lần flush kế tiếp. |
| `GetString` | `public string GetString(string section, string key)` | Giá trị chuỗi thô; tôn trọng giá trị ghi đè từ môi trường. |
| `GetBool`, `GetInt32`, ... | `public T? GetXxx(string section, string key)` | Các getter có kiểu, trả về giá trị nullable. |
| `GetEnum<TEnum>` | `public TEnum? GetEnum<TEnum>(string section, string key) where TEnum : struct, Enum` | Getter cho enum (theo tên hoặc giá trị số). |
| `Flush` | `public void Flush()` | Ghi các thay đổi đang chờ xuống đĩa khi có thay đổi. |
| `Dispose` | `public void Dispose()` | Giải phóng khóa nội bộ. |

## Constructor

```csharp
public IniConfig(string path)
```

`path` được chuyển đổi bằng `Path.GetFullPath` (`IniConfig.cs` L108). Nếu tệp tồn tại, nó được nạp ngay lập tức (L137-L140). Tệp không tồn tại không phải là lỗi: instance bắt đầu rỗng và tệp được tạo ở lần `Flush` thành công đầu tiên.

| Điều kiện | Ngoại lệ | Nguồn |
| :--- | :--- | :--- |
| `path` là `null` | `ArgumentNullException` | L95-L98 |
| `path` rỗng hoặc chỉ gồm khoảng trắng | `ArgumentException` | L100-L103 |
| `Path.GetFullPath` từ chối đường dẫn, hoặc đường dẫn có định dạng không được hỗ trợ hoặc chứa ký tự không hợp lệ | `ArgumentException` | L110-L128 |

Lần nạp đầu tiên được thử lại tối đa 3 lần khi gặp `IOException`, với độ trễ `100 ms` rồi `200 ms` (L1080-L1105). `IOException` cuối cùng được ném lại.

Việc nạp ném `IOException` ("Error reading configuration file") khi một section chứa cùng một key hai lần, vì `InvalidDataException` bên dưới được bọc lại (L1204-L1209, L1239-L1241).

## Properties

- `ExistsFile` trả về `File.Exists(_path)` (L75). Giá trị được tính ở mỗi lần truy cập, không được lưu đệm.
- `FilePath` trả về đường dẫn tuyệt đối do constructor xác định (L80).

## File format

`Load` (L1114-L1247) phân tích tệp theo UTF-8 với các quy tắc sau:

- Các dòng bắt đầu bằng `;` là chú thích. Các dòng chú thích liên tiếp ngay phía trên một section hoặc key được gắn vào nó (L1156-L1173, L1182-L1186, L1214-L1218). Một dòng trống sẽ loại bỏ các chú thích đang chờ (L1149-L1153), và các dòng phân cách chỉ gồm dấu gạch ngang bị bỏ qua (L1160-L1164).
- `[Name]` bắt đầu một section (L1177-L1195). Các key đứng trước mọi section thuộc về section có tên rỗng.
- `key = value` tách ở dấu `=` đầu tiên; cả hai vế đều được cắt khoảng trắng (L1198-L1202). Dòng có key rỗng hoặc giá trị rỗng (`key =`) bị bỏ qua (L1199).

## Reading values

### `GetString`

```csharp
public string GetString(string section, string key)
```

Trả về chuỗi đã lưu, hoặc `string.Empty` khi section hoặc key không tồn tại (L373-L377). `section` và `key` ném `ArgumentNullException` khi là `null` và `ArgumentException` khi rỗng hoặc chỉ gồm khoảng trắng (L348-L359).

Trước khi tra cứu tệp, `GetString` kiểm tra môi trường (L361-L365).

### Environment override

Một biến môi trường có tên `NALIX_<SECTION>_<KEY>` được ưu tiên hơn tệp. Tên được tạo bằng `$"NALIX_{section}_{key}"` và chuyển thành chữ hoa bằng `ToUpperInvariant()` (L361). Nếu biến được đặt (kể cả là chuỗi rỗng, vì phép kiểm tra là `is not null`), giá trị của nó được trả về và tệp không được tra cứu (L362-L365).

| Section | Key | Biến môi trường |
| :--- | :--- | :--- |
| `NetworkSocket` | `Port` | `NALIX_NETWORKSOCKET_PORT` |
| `Transport` | `Backlog` | `NALIX_TRANSPORT_BACKLOG` |

:::note[Cách tạo tên]
Chỉ có phép chuyển chữ hoa được áp dụng (L361); section và key được chèn đúng như đã viết, nên khoảng trắng hoặc ký tự đặc biệt trong một trong hai sẽ xuất hiện trong tên biến.
:::

Mọi getter có kiểu đều đọc qua `GetString`, nên giá trị ghi đè cũng áp dụng cho chúng. Ngoại lệ là giá trị đã được lưu đệm bởi một lần đọc có kiểu trước đó (xem [Caching](#caching)): bộ đệm được kiểm tra trước `GetString` (ví dụ L413-L418), nên biến môi trường được đặt sau lần đọc thành công đầu tiên sẽ không có hiệu lực cho đến khi mục trong bộ đệm bị loại bỏ.

### Typed getters

Mọi getter có kiểu đều có dạng `public T? GetXxx(string section, string key)`.

| Getter | Kiểu trả về | Phân tích | Nguồn |
| :--- | :--- | :--- | :--- |
| `GetChar` | `char?` | Giá trị gồm đúng một ký tự | L393-L399 |
| `GetBool` | `bool?` | `true`/`1`/`yes` và `false`/`0`/`no` (không phân biệt hoa thường), nếu không thì `bool.TryParse` | L409-L453 |
| `GetByte` | `byte?` | `byte.TryParse` | L499-L523 |
| `GetSByte` | `sbyte?` | `sbyte.TryParse` | L533 |
| `GetInt16` / `GetUInt16` | `short?` / `ushort?` | `TryParse` | L567, L601 |
| `GetInt32` / `GetUInt32` | `int?` / `uint?` | `TryParse` | L635, L669 |
| `GetInt64` / `GetUInt64` | `long?` / `ulong?` | `TryParse` | L703-L725, L735 |
| `GetSingle` | `float?` | `NumberStyles.Float`, invariant culture | L769-L795 |
| `GetDouble` | `double?` | `NumberStyles.Float`, invariant culture | L805-L829 |
| `GetDecimal` | `decimal?` | `NumberStyles.Number`, invariant culture | L463-L489 |
| `GetDateTime` | `DateTime?` | `DateTime.TryParse`, invariant culture | L839-L865 |
| `GetTimeSpan` | `TimeSpan?` | `TimeSpan.TryParse`, invariant culture | L875-L901 |
| `GetGuid` | `Guid?` | `Guid.TryParse` | L911-L935 |
| `GetEnum<TEnum>` | `TEnum?` | Tên (không phân biệt hoa thường), sau đó đến giá trị số | L946-L989 |

Các getter số nguyên dùng overload `TryParse(string, out T)` phụ thuộc culture (ví dụ L516, L718). Các getter số thực, decimal, ngày và giờ dùng invariant culture.

### Missing or invalid keys

| Tình huống | Kết quả |
| :--- | :--- |
| Thiếu key hoặc section (`GetString`) | `string.Empty` (L377) |
| Thiếu key hoặc key rỗng (getter có kiểu) | `null` |
| Giá trị là văn bản `null` (mọi kiểu chữ) | `null` (ví dụ L423-L425, L512-L514, L962-L965) |
| Không phân tích được giá trị (số, `DateTime`, `TimeSpan`, `Guid`, `char`, `enum`) | `null` |
| Không phân tích được giá trị (`GetBool`) | `false`, không phải `null` (L444-L445) |

Các getter có kiểu không bao giờ ném ngoại lệ vì giá trị bị thiếu hoặc sai định dạng. Chỉ `GetString` kiểm tra tham số của nó (xem phần trên).

:::warning[GetBool và văn bản không hợp lệ]
`GetBool` chuyển sang `bool.TryParse` và bỏ qua kết quả của nó, nên một giá trị không nhận diện được như `maybe` cho ra `false` (L444-L446), và `false` đó được lưu đệm. Hãy tự kiểm tra các giá trị boolean nếu bạn cần phát hiện lỗi gõ.
:::

### Caching

Các giá trị phân tích thành công được lưu đệm dưới khóa `section:key:typeSuffix` (L1012-L1015, ví dụ `AddToCache` tại L449 và L518). Khi bộ đệm đạt `2048` mục, nó bị xóa toàn bộ (L41, L1037-L1040). Bộ đệm bị xóa bởi `Reload` / nạp lại tệp (L1131) và các mục của một key bị loại bỏ bởi `WriteValue` (L221-L245).

## Writing values

### `WriteValue`

```csharp
public void WriteValue(string section, string key, object value)
```

Đặt `[section]` / `key` chỉ trong bộ nhớ; hãy gọi `Flush` để lưu lại.

- `section`, `key` và `value` không được là `null` (`ArgumentNullException`, L167-L169).
- `section` không được chứa `\r`, `\n`, `[` hoặc `]`; `key` không được chứa `\r`, `\n` hoặc `=` (`ArgumentException`, L172-L182).
- Nếu chuỗi đã lưu đã bằng chuỗi mới, không có gì thay đổi và instance không được đánh dấu là đã thay đổi (L214-L217).
- Ngược lại, giá trị được lưu, các giá trị có kiểu đã lưu đệm của key đó bị loại bỏ, và instance được đánh dấu là đã thay đổi (L219-L247).
- Giá trị được chuyển thành văn bản bằng invariant culture cho `float`/`double` (`"R"`), `decimal` (`"G"`) và `DateTime` (`"O"`), và bằng `ToString()` cho mọi kiểu khác. Ký tự carriage return bị xóa và ký tự xuống dòng được đổi thành khoảng trắng để ngăn INI injection (L1054-L1073).

### `WriteComment`

```csharp
public void WriteComment(string section, string? key, string? comment)
```

Đăng ký một chú thích phía trên tiêu đề section (`key` là `null` hoặc rỗng) hoặc phía trên một key.

- `comment` là `null` hoặc chỉ gồm khoảng trắng sẽ trả về ngay lập tức (L285-L288). `section` là `null` ném `ArgumentNullException` (L290).
- Chú thích chỉ được ghi nhận nếu key chưa tồn tại với giá trị không rỗng và chưa có chú thích nào được đăng ký cho đối tượng đó (L304-L310). Chú thích cấp section được ghi nhận khi chưa có chú thích nào.
- Chú thích nhiều dòng được hỗ trợ bằng `\n` nhúng trong chuỗi (L271).
- Chú thích nằm trong bộ nhớ và được ghi ở lần flush kế tiếp. Khi một tệp được nạp, các chú thích phía trên section và key được đọc lại (L1182-L1186, L1214-L1218), nhưng đường nạp `Reload`/load thay thế mọi chú thích đã đăng ký trong bộ nhớ (L1132).
- Khi ghi, chú thích của key được thêm tên key làm tiền tố (`; Port: text`) (L1275-L1280, L1296-L1302), và chú thích của section được bao bởi các dòng phân cách gồm ký tự `-` (L47, L1431-L1436).

## Reload and external changes

```csharp
public void Reload()
```

`Reload()` gọi `Load` nội bộ (L151). Nó đọc lại tệp, xóa dữ liệu section, bộ đệm giá trị và các chú thích đã đăng ký trước khi phân tích (L1130-L1132), và đặt lại cờ thay đổi (L1224). Các thay đổi `WriteValue` / `WriteComment` chưa lưu sẽ bị bỏ. Nếu tệp không tồn tại, `Reload` trả về mà không thay đổi gì (L1116-L1119).

Ngoại lệ: `FileNotFoundException` trở thành `IOException`, `UnauthorizedAccessException` được ném lại với thông báo có chứa đường dẫn, và các lỗi không nghiêm trọng khác (kể cả key trùng lặp) được bọc trong `IOException` (L1226-L1242).

`GetString`, `WriteValue` và `WriteComment` cũng gọi `CheckFileChanges` (L368, L188, L300). Khi thời điểm ghi cuối của tệp (UTC) mới hơn thời điểm của lần đọc hoặc flush gần nhất, tệp được nạp lại tự động (L1326-L1331); `IOException` trong lúc kiểm tra bị bỏ qua và dữ liệu trong bộ nhớ được sử dụng (L1332-L1335). `Flush` của chính bạn cập nhật mốc thời gian đã lưu để không kích hoạt nạp lại (L1520).

## `Flush`

```csharp
public void Flush()
```

Nếu instance có thay đổi, `WriteFile` ghi toàn bộ tệp; nếu không thì không có gì xảy ra (L995-L1001).

`WriteFile` (L1370-L1556):

1. Tạo thư mục đích nếu nó chưa tồn tại (L1387-L1405).
2. Ghi tất cả section vào một tệp tạm có tên duy nhất `<path>.<guid>.tmp` theo UTF-8 (L1410-L1413). Các key trong một section được đệm để các dấu `=` thẳng hàng, và định dạng là `key = value` (L1446-L1477).
3. Thay thế đích bằng `File.Replace`, hoặc `File.Move` khi tệp chưa có, thử lại tối đa 5 lần khi gặp `IOException` với độ trễ bắt đầu ở 15 ms và nhân đôi mỗi lần (L1485-L1517).
4. Ghi lại thời điểm ghi cuối mới và xóa cờ thay đổi (L1520-L1521).
5. Xóa tệp tạm nếu việc ghi chưa được xác nhận (L1536-L1550).

Lỗi xuất hiện dưới dạng `UnauthorizedAccessException` ("Access denied when writing configuration file"), `IOException` (đường dẫn quá dài, hoặc lỗi I/O), hoặc `InvalidOperationException` khi không xác định được thư mục (L1388-L1392, L1524-L1535).

## `Dispose`

```csharp
public void Dispose()
```

`Dispose` chỉ giải phóng `ReaderWriterLockSlim` nội bộ (L1559). Nó không flush: hãy gọi `Flush` trước khi dispose nếu bạn còn các thay đổi ghi đang chờ. Không dùng instance sau khi đã dispose.

## Thread safety

`IniConfig` bảo vệ dữ liệu của nó bằng một `ReaderWriterLockSlim` được tạo với `LockRecursionPolicy.NoRecursion` (L50, L134):

- Việc đọc dữ liệu section và bộ đệm lấy khóa đọc (L370, L1020).
- `WriteValue` và `WriteComment` lấy khóa đọc có thể nâng cấp và nâng lên khóa ghi để thay đổi dữ liệu (L184-L208, L297-L312).
- `Load`, `WriteFile` và việc chèn vào bộ đệm lấy khóa ghi (L1121, L1372, L1034).
- Cờ thay đổi là `volatile` (L58).

Do đó từng lời gọi riêng lẻ là an toàn khi dùng từ nhiều luồng. Một chuỗi lời gọi (ví dụ `WriteValue` rồi đến `Flush`) không mang tính nguyên tử, và khóa này theo từng instance và trong cùng tiến trình: nó không điều phối giữa các tiến trình riêng biệt ngoài việc thay thế tệp tạm đã mô tả ở trên.

## Example

```csharp
using Nalix.Environment.Configuration.Binding;

using IniConfig ini = new("config/server.ini");

// Defaults and documentation, only registered for keys that do not exist yet.
ini.WriteComment("Server", null, "Server settings");
ini.WriteComment("Server", "Port", "Listen port (1..65535)");
ini.WriteValue("Server", "Port", 57206);
ini.WriteValue("Server", "Timeout", TimeSpan.FromSeconds(30));
ini.WriteValue("Server", "EnableTls", true);
ini.Flush();

// Typed reads: nullable results, so supply your own fallback.
ushort port = ini.GetUInt16("Server", "Port") ?? 57206;
TimeSpan timeout = ini.GetTimeSpan("Server", "Timeout") ?? TimeSpan.FromSeconds(10);
bool tls = ini.GetBool("Server", "EnableTls") ?? false;
string name = ini.GetString("Server", "Name");   // string.Empty when missing

// A deployment can override the value without editing the file:
//   NALIX_SERVER_PORT=60000
```

## Related APIs

- [Configuration](./configuration.md)
- [Directories](./directories.md)
- [Configuration Generator](../analyzers/autogen/configuration-generator.md)
