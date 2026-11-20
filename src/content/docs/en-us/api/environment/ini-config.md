---
title: IniConfig
description: Low-level .ini reader and writer in Nalix.Environment with typed getters, NALIX_<SECTION>_<KEY> environment overrides, in-memory writes, and atomic flushing.
section: API Reference
package: Nalix.Environment
---

**Namespace:** `Nalix.Environment.Configuration.Binding`  
**Assembly:** `Nalix.Environment`

`IniConfig` (`public sealed class IniConfig : IDisposable`) is the low-level `.ini` reader/writer behind [Configuration](./configuration.md). `ConfigurationManager` and the code emitted by `ConfigurationGenerator` use it; most applications bind options classes instead and never touch it directly. The type is marked `[EditorBrowsable(EditorBrowsableState.Never)]`, so it does not appear in IntelliSense.

## Source Mapping

- `src/Nalix.Environment/Configuration/Binding/IniConfig.cs`

## Quick Reference

| Member | Signature | Description |
| :--- | :--- | :--- |
| `IniConfig(string)` | `public IniConfig(string path)` | Resolves `path` to a full path and loads the file if it exists. |
| `ExistsFile` | `public bool ExistsFile { get; }` | `true` if the file exists on disk (checked on every access). |
| `FilePath` | `public string FilePath { get; }` | Absolute path of the `.ini` file. |
| `Reload` | `public void Reload()` | Re-reads the file, discarding in-memory changes. |
| `WriteValue` | `public void WriteValue(string section, string key, object value)` | Sets a value in memory and marks the instance dirty. |
| `WriteComment` | `public void WriteComment(string section, string? key, string? comment)` | Registers a comment for a section or key, written on the next flush. |
| `GetString` | `public string GetString(string section, string key)` | Raw string value; honors the environment override. |
| `GetBool`, `GetInt32`, ... | `public T? GetXxx(string section, string key)` | Typed getters returning a nullable value. |
| `GetEnum<TEnum>` | `public TEnum? GetEnum<TEnum>(string section, string key) where TEnum : struct, Enum` | Enum getter (name or numeric value). |
| `Flush` | `public void Flush()` | Writes pending changes to disk when dirty. |
| `Dispose` | `public void Dispose()` | Disposes the internal lock. |

## Constructor

```csharp
public IniConfig(string path)
```

`path` is converted with `Path.GetFullPath` (`IniConfig.cs` L108). If the file exists, it is loaded immediately (L137-L140). A missing file is not an error: the instance starts empty and the file is created by the first successful `Flush`.

| Condition | Exception | Source |
| :--- | :--- | :--- |
| `path` is `null` | `ArgumentNullException` | L95-L98 |
| `path` is empty or whitespace | `ArgumentException` | L100-L103 |
| `Path.GetFullPath` rejects the path, or it is not a supported format or contains invalid characters | `ArgumentException` | L110-L128 |

The initial load is retried up to 3 times on `IOException`, with a `100 ms` then `200 ms` delay (L1080-L1105). The final `IOException` is rethrown.

Loading throws an `IOException` ("Error reading configuration file") when a section contains the same key twice, because the underlying `InvalidDataException` is wrapped (L1204-L1209, L1239-L1241).

## Properties

- `ExistsFile` returns `File.Exists(_path)` (L75). It is evaluated on each access, not cached.
- `FilePath` returns the absolute path resolved by the constructor (L80).

## File format

`Load` (L1114-L1247) parses the file as UTF-8 with these rules:

- Lines starting with `;` are comments. Consecutive comment lines directly above a section or key are attached to it (L1156-L1173, L1182-L1186, L1214-L1218). A blank line discards pending comments (L1149-L1153), and separator lines made only of dashes are skipped (L1160-L1164).
- `[Name]` starts a section (L1177-L1195). Keys before any section belong to the empty-named section.
- `key = value` splits on the first `=`; both sides are trimmed (L1198-L1202). A line with an empty key or an empty value (`key =`) is ignored (L1199).

## Reading values

### `GetString`

```csharp
public string GetString(string section, string key)
```

Returns the stored string, or `string.Empty` when the section or key does not exist (L373-L377). `section` and `key` throw `ArgumentNullException` when `null` and `ArgumentException` when empty or whitespace (L348-L359).

Before any file lookup, `GetString` checks the environment (L361-L365).

### Environment override

An environment variable named `NALIX_<SECTION>_<KEY>` takes precedence over the file. The name is built as `$"NALIX_{section}_{key}"` and uppercased with `ToUpperInvariant()` (L361). If the variable is set (even to an empty string, since the check is `is not null`), its value is returned and the file is not consulted (L362-L365).

| Section | Key | Environment variable |
| :--- | :--- | :--- |
| `NetworkSocket` | `Port` | `NALIX_NETWORKSOCKET_PORT` |
| `Transport` | `Backlog` | `NALIX_TRANSPORT_BACKLOG` |

:::note[Name building]
Only uppercasing is applied (L361); the section and key are inserted as written, so a space or other special character in either appears in the variable name.
:::

All typed getters read through `GetString`, so the override applies to them as well. The exception is a value already cached by a previous typed read (see [Caching](#caching)): the cache is checked before `GetString` (for example L413-L418), so an environment variable set after the first successful read does not take effect until the cache entry is dropped.

### Typed getters

Every typed getter has the shape `public T? GetXxx(string section, string key)`.

| Getter | Return type | Parsing | Source |
| :--- | :--- | :--- | :--- |
| `GetChar` | `char?` | Value of exactly one character | L393-L399 |
| `GetBool` | `bool?` | `true`/`1`/`yes` and `false`/`0`/`no` (case-insensitive), otherwise `bool.TryParse` | L409-L453 |
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
| `GetEnum<TEnum>` | `TEnum?` | Name (case-insensitive), then numeric value | L946-L989 |

Integer getters use the culture-sensitive `TryParse(string, out T)` overload (for example L516, L718). Floating-point, decimal, date and time getters use the invariant culture.

### Missing or invalid keys

| Situation | Result |
| :--- | :--- |
| Key or section missing (`GetString`) | `string.Empty` (L377) |
| Key missing or empty (typed getter) | `null` |
| Value is the text `null` (any case) | `null` (for example L423-L425, L512-L514, L962-L965) |
| Value cannot be parsed (numeric, `DateTime`, `TimeSpan`, `Guid`, `char`, `enum`) | `null` |
| Value cannot be parsed (`GetBool`) | `false`, not `null` (L444-L445) |

Typed getters never throw for a missing or malformed value. Only `GetString` validates its arguments (see above).

:::warning[GetBool and invalid text]
`GetBool` falls through to `bool.TryParse` and ignores its result, so an unrecognized value such as `maybe` yields `false` (L444-L446), and that `false` is cached. Validate boolean values yourself if you need to detect typos.
:::

### Caching

Successfully parsed values are cached under `section:key:typeSuffix` (L1012-L1015, for example `AddToCache` at L449 and L518). When the cache reaches `2048` entries it is cleared entirely (L41, L1037-L1040). The cache is cleared by `Reload` / file reload (L1131) and the entries for a key are removed by `WriteValue` (L221-L245).

## Writing values

### `WriteValue`

```csharp
public void WriteValue(string section, string key, object value)
```

Sets `[section]` / `key` in memory only; call `Flush` to persist it.

- `section`, `key` and `value` must not be `null` (`ArgumentNullException`, L167-L169).
- `section` must not contain `\r`, `\n`, `[` or `]`; `key` must not contain `\r`, `\n` or `=` (`ArgumentException`, L172-L182).
- If the stored string is already equal to the new one, nothing changes and the instance is not marked dirty (L214-L217).
- Otherwise the value is stored, cached typed values for that key are evicted, and the instance is marked dirty (L219-L247).
- The value is converted to text with the invariant culture for `float`/`double` (`"R"`), `decimal` (`"G"`) and `DateTime` (`"O"`), and with `ToString()` for everything else. Carriage returns are removed and newlines become spaces to prevent INI injection (L1054-L1073).

### `WriteComment`

```csharp
public void WriteComment(string section, string? key, string? comment)
```

Registers a comment above a section header (`key` is `null` or empty) or above a key.

- A `null` or whitespace `comment` returns immediately (L285-L288). A `null` `section` throws `ArgumentNullException` (L290).
- The comment is only recorded if the key does not already exist with a non-empty value and no comment is registered yet for that target (L304-L310). Section-level comments are recorded when none exists.
- Multi-line comments are supported with embedded `\n` (L271).
- Comments live in memory and are written on the next flush. When a file is loaded, comments above sections and keys are read back (L1182-L1186, L1214-L1218), but the `Reload`/load path replaces any comments registered in memory (L1132).
- On write, a key comment is prefixed with the key name (`; Port: text`) (L1275-L1280, L1296-L1302), and a section comment is framed by separator lines of `-` characters (L47, L1431-L1436).

## Reload and external changes

```csharp
public void Reload()
```

`Reload()` calls the internal `Load` (L151). It re-reads the file, clearing the section data, the value cache and the registered comments before parsing (L1130-L1132), and resets the dirty flag (L1224). Unsaved `WriteValue` / `WriteComment` changes are discarded. If the file does not exist, `Reload` returns without changing anything (L1116-L1119).

Exceptions: `FileNotFoundException` becomes `IOException`, `UnauthorizedAccessException` is rethrown with a message that includes the path, and other non-fatal errors (including duplicate keys) are wrapped in `IOException` (L1226-L1242).

`GetString`, `WriteValue` and `WriteComment` also call `CheckFileChanges` (L368, L188, L300). When the file's last write time (UTC) is newer than the time of the last read or flush, the file is reloaded automatically (L1326-L1331); `IOException` while checking is ignored and the data in memory is used (L1332-L1335). Your own `Flush` updates the stored timestamp so it does not trigger a reload (L1520).

## `Flush`

```csharp
public void Flush()
```

If the instance is dirty, `WriteFile` writes the whole file; otherwise nothing happens (L995-L1001).

`WriteFile` (L1370-L1556):

1. Creates the target directory if it does not exist (L1387-L1405).
2. Writes all sections to a uniquely named temporary file `<path>.<guid>.tmp` as UTF-8 (L1410-L1413). Keys inside a section are padded so the `=` signs line up, and the format is `key = value` (L1446-L1477).
3. Replaces the target with `File.Replace`, or `File.Move` when the file is missing, retrying up to 5 times on `IOException` with a delay that starts at 15 ms and doubles (L1485-L1517).
4. Records the new last write time and clears the dirty flag (L1520-L1521).
5. Deletes the temporary file if the write was not committed (L1536-L1550).

Failures surface as `UnauthorizedAccessException` ("Access denied when writing configuration file"), `IOException` (path too long, or I/O error), or `InvalidOperationException` when the directory cannot be determined (L1388-L1392, L1524-L1535).

## `Dispose`

```csharp
public void Dispose()
```

`Dispose` disposes the internal `ReaderWriterLockSlim` only (L1559). It does not flush: call `Flush` before disposing if you have pending writes. Do not use the instance after disposal.

## Thread safety

`IniConfig` guards its data with a `ReaderWriterLockSlim` created with `LockRecursionPolicy.NoRecursion` (L50, L134):

- Reads of section data and of the cache take the read lock (L370, L1020).
- `WriteValue` and `WriteComment` take an upgradeable read lock and upgrade to a write lock for mutations (L184-L208, L297-L312).
- `Load`, `WriteFile` and cache inserts take the write lock (L1121, L1372, L1034).
- The dirty flag is `volatile` (L58).

Individual calls are therefore safe from multiple threads. A sequence of calls (for example `WriteValue` followed by `Flush`) is not atomic, and the lock is per instance and in-process: it does not coordinate separate processes beyond the temp-file replacement described above.

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
