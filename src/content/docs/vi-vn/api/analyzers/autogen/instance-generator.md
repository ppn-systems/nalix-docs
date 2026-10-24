---
title: Instance Generator
description: Incremental Roslyn source generator (InstanceGenerator) sinh ra các factory khởi tạo constructor lúc biên dịch và ánh xạ service cho các lớp [Injectable] và các kiểu SingletonBase<T>.
section: API Reference
package: Nalix.Analyzers
---

`InstanceGenerator` (`analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`) là một incremental Roslyn source generator, sinh ra các delegate khởi tạo constructor lúc biên dịch và ánh xạ service cho các lớp `[Injectable]` và các lớp con của `SingletonBase<T>`.

## Ánh xạ mã nguồn

- `analyzers/Nalix.Analyzers.Generators/InstanceGenerator.cs`
- `analyzers/Nalix.Analyzers.Generators/Internal/GeneratorDiagnosticDescriptors.cs`

## Việc generator làm lúc biên dịch

1. **Tìm các service `[Injectable]` và lớp con `SingletonBase<T>`**:
   - Quét mọi lớp cụ thể (concrete) được đánh dấu `[Injectable]` hoặc `[Injectable(typeof(TService))]`.
   - Quét mọi lớp cụ thể kế thừa `SingletonBase<T>`.
2. **Kiểm tra và biên dịch các constructor có thể truy cập**:
   - Với các lớp `[Injectable]`:
     - Thu thập mọi constructor instance `public` và `internal`. Nếu không có constructor nào, báo lỗi **`NALIX063`**.
     - Tách các tham số constructor thành tham số `ConfigurationLoader` (được tự động lấy từ `ConfigurationManager.Instance.Get<TConfig>()`) và tham số runtime `object?[] args` do bên gọi truyền vào. Generator kiểm tra xem hai constructor có cùng số tham số không phải cấu hình (`args.Length`) và có các kiểu tham số chồng lấn hay không. Nếu có, báo lỗi **`NALIX064`**.
     - Sinh ra delegate factory `static args => switch (args.Length)` hỗ trợ mọi constructor có thể truy cập.
   - Với các lớp `SingletonBase<T>`:
     - Yêu cầu constructor không tham số `public` hoặc `internal` (chỉ `protected` thì bộ khởi tạo được sinh ra không truy cập được); nếu không, báo cảnh báo **`NALIX065`**.
3. **Sinh đăng ký `[ModuleInitializer]` (`InstanceGenerated.Initialize()`)**:
   - Gọi `InstanceManager.RegisterActivator<TImpl>(static args => ...)`
   - Gọi `InstanceManager.RegisterServiceMapping<TService, TImpl>()` cho mỗi attribute `[Injectable(typeof(TService))]`
   - Gọi `SingletonActivatorCache.Register<TSingleton>(static () => new TSingleton())` cho các lớp con `SingletonBase<T>`

## Ví dụ

```csharp
using Microsoft.Extensions.Logging;
using Nalix.Abstractions.Injection;
using Nalix.Network.Options;

[Injectable(typeof(IMatchmakerService))]
public sealed class MatchmakerService : IMatchmakerService
{
    private readonly NetworkSocketOptions _socketOptions;
    private readonly ILogger? _logger;

    public MatchmakerService(NetworkSocketOptions socketOptions)
        : this(socketOptions, null)
    {
    }

    public MatchmakerService(NetworkSocketOptions socketOptions, ILogger? logger)
    {
        _socketOptions = socketOptions;
        _logger = logger;
    }
}
```

Bộ khởi tạo được sinh ra trong `InstanceGenerated.g.cs`:

```csharp
[ModuleInitializer]
internal static void Initialize()
{
    InstanceManager.RegisterActivator<MatchmakerService>(static args =>
    {
        return args.Length switch
        {
            0 => new MatchmakerService(
                ConfigurationManager.Instance.Get<NetworkSocketOptions>()),
            1 => new MatchmakerService(
                ConfigurationManager.Instance.Get<NetworkSocketOptions>(),
                (ILogger)args[0]!),
            _ => throw new InvalidOperationException(
                $"No constructor on 'MatchmakerService' matches {args.Length} argument(s).")
        };
    });

    InstanceManager.RegisterServiceMapping<IMatchmakerService, MatchmakerService>();
}
```

## Chẩn đoán được phát ra

| ID | Tiêu đề | Mức độ | Nguyên nhân |
| --- | --- | :---: | --- |
| `NALIX063` | Không tìm thấy constructor có thể truy cập | Lỗi | Lớp `[Injectable]` không có constructor `public` hoặc `internal` nào. |
| `NALIX064` | Constructor không rõ ràng trong lớp injectable | Lỗi | Lớp `[Injectable]` có nhiều constructor `public`/`internal` với cùng số tham số không phải cấu hình và các kiểu tham số không rời nhau. |
| `NALIX065` | Lớp con `SingletonBase` thiếu constructor không tham số có thể truy cập | Cảnh báo | Lớp con `SingletonBase<T>` không có constructor không tham số `public` hoặc `internal`. |

## API liên quan

- [Tổng quan Source Generator](./index.md)
- [Instance Manager](../../framework/instance-manager.md)
- [SingletonBase](../../framework/singleton-base.md)
- [Hợp đồng Dependency Injection](../../abstractions/injection.md)
