---
title: Tùy chọn Hosting
description: Tài liệu cấu hình cho HostingOptions và quá trình khởi tạo Bootstrap trong Nalix.Hosting — chẩn đoán khi khởi động, giới hạn tối thiểu của ThreadPool, xử lý ngoại lệ toàn cục và độ phân giải timer 1ms trên Windows.
section: API Reference
package: Nalix.Hosting
---

**Không gian tên:** `Nalix.Hosting.Options`  
**Assembly:** `Nalix.Hosting`

`HostingOptions` cấu hình hành vi khởi tạo máy chủ (`Bootstrap.Initialize()`), chẩn đoán khởi động trên console, giới hạn tối thiểu số luồng của `ThreadPool` của .NET, ghi log các ngoại lệ không được xử lý toàn cục, và độ phân giải timer 1 ms trên Windows (`timeBeginPeriod(1)`).

## Ánh xạ mã nguồn

- `src/Nalix.Hosting/Options/HostingOptions.cs`
- `src/Nalix.Hosting/Bootstrap.cs`
- `src/Nalix.Hosting/Internal/DiagnosticChannel.cs`

## Vòng đời Bootstrap (`Bootstrap.Initialize()`)

`Nalix.Hosting` tự động gọi `Bootstrap.Initialize()` thông qua `[ModuleInitializer]` khi assembly được nạp:

1. **Đường dẫn cấu hình máy chủ riêng**: Gọi `ConfigurationManager.Instance.SetConfigFilePath(Path.Combine(Directories.ConfigurationDirectory, "server.ini"))` để cấu hình máy chủ được tách riêng trong `server.ini` (tránh xung đột với `default.ini` của client).
2. **Khởi tạo các option**: Chạm vào tất cả các lớp option của framework, codec, network, runtime và hosting thông qua `ConfigurationManager.Instance.Get<TOptions>()`, rồi gọi `ConfigurationManager.Instance.Flush()` để ghi một template `server.ini` đầy đủ ra đĩa.
3. **Tinh chỉnh ThreadPool**: Áp dụng `MinWorkerThreads` và/hoặc `MinCompletionPortThreads` thông qua `ThreadPool.SetMinThreads(...)` khi một trong hai thuộc tính có giá trị `> 0`.
4. **Trình xử lý ngoại lệ toàn cục**: Khi `EnableGlobalExceptionHandling` là `true`, đăng ký `AppDomain.CurrentDomain.UnhandledException` (ghi log lỗi nghiêm trọng và flush `ConfigurationManager` nếu tiến trình sắp kết thúc) và `TaskScheduler.UnobservedTaskException` (ghi log và gọi `e.SetObserved()`).
5. **Timer độ phân giải cao trên Windows**: Khi `EnableHighPrecisionTimer` là `true` trên Windows, gọi `timeBeginPeriod(1)` từ `winmm.dll` để nâng độ phân giải timer của hệ điều hành lên `1 ms`.
6. **Banner khởi động tương tác**: Khi `Environment.UserInteractive && !DisableStartupBanner`, in banner khởi động của Nalix, các metadata runtime (`Version`, `PID`, `OS`, `Arch`, `Runtime`, `Config`, `GC Mode`, `Timer`, `Processors`, `Local IP`, `Public IP` lấy từ `NALIX_PUBLIC_IP`), và đưa ra cảnh báo nếu đang dùng Workstation GC thay vì Server GC.

## Thuộc tính và giá trị mặc định

| Thuộc tính | Kiểu | Mặc định | Kiểm tra hợp lệ | Mô tả |
| :--- | :--- | ---: | :--- | :--- |
| `DisableConsoleClear` | `bool` | `false` | Không có | Nếu `true`, không gọi `Console.Clear()` trước khi in banner khởi động (cũng được bỏ qua tự động khi đầu ra console bị chuyển hướng). |
| `DisableStartupBanner` | `bool` | `false` | Không có | Nếu `true`, ẩn banner ASCII và bảng chẩn đoán `[INIT]` khi khởi động. |
| `MinWorkerThreads` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Số luồng worker tối thiểu của `ThreadPool` (`0` giữ mặc định của hệ điều hành/.NET; khuyến nghị: `ProcessorCount * 2`). |
| `MinCompletionPortThreads` | `int` | `0` | `[ValueRange(0, int.MaxValue)]` | Số luồng completion port (IOCP) tối thiểu của `ThreadPool` (`0` giữ mặc định của hệ điều hành/.NET). |
| `EnableGlobalExceptionHandling` | `bool` | `true` | Không có | Đăng ký các handler `UnhandledException` và `UnobservedTaskException` trong quá trình bootstrap. |
| `EnableHighPrecisionTimer` | `bool` | `true` | Không có | Gọi `timeBeginPeriod(1)` trên Windows để có độ phân giải timer 1 ms (tự động được ghép cặp với `timeEndPeriod(1)` khi tiến trình thoát). |

`Validate()` thực thi `this.ValidateDataAnnotations()`.

## Dọn dẹp khi thoát tiến trình (`Bootstrap.OnProcessExit`)

`Bootstrap` đăng ký `Console.CancelKeyPress` và `AppDomain.CurrentDomain.ProcessExit`. Khi tiến trình kết thúc, nó sẽ:
1. Hủy tất cả worker nền đang chạy thông qua `InstanceManager.Instance.GetExistingInstance<TaskManager>()?.CancelAllWorkers()`.
2. Flush các thay đổi cấu hình đang chờ thông qua `ConfigurationManager.Instance.Flush()`.
3. Giải phóng `InstanceManager.Instance` (việc này giải phóng các service đã đăng ký như `ConnectionGuard`, đồng thời ghi cơ sở dữ liệu ban lũy tiến xuống đĩa).
4. Gọi `timeEndPeriod(1)` trên Windows nếu `timeBeginPeriod(1)` đã được bật.
5. Giải phóng `DiagnosticChannel`.

## Cấu hình INI (`server.ini`)

```ini
[Hosting]
; Hosting configuration — controls startup diagnostics, console behavior, and lifecycle settings
DisableConsoleClear = false
DisableStartupBanner = false
MinWorkerThreads = 0
MinCompletionPortThreads = 0
EnableGlobalExceptionHandling = true
EnableHighPrecisionTimer = true
```

## API liên quan

- [Network Application](../../hosting/network-application.md)
- [Hệ thống cấu hình](../../environment/configuration.md)
- [Task Manager](../../framework/task-manager.md)
