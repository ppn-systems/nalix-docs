---
title: Đánh số tuần tự
description: Bộ đếm tuần tự đơn điệu an toàn đa luồng và bộ kiểm tra chống phát lại cửa sổ trượt trong Nalix.Environment.Sequencing.SequenceCounter.
section: API Reference
package: Nalix.Environment
---

**Không gian tên:** `Nalix.Environment.Sequencing`  
**Assembly:** `Nalix.Environment`

`SequenceCounter` (`src/Nalix.Environment/Sequencing/SequenceCounter.cs`) là bộ đếm tuần tự 32-bit an toàn đa luồng, không khóa, triển khai `ISequenceCounter` (`Nalix.Abstractions.Security.ISequenceCounter`), dùng để sắp xếp gói tin, bảo đảm tính duy nhất của nonce và kiểm tra chống phát lại theo cửa sổ trượt bitmap 32-bit.

## Ánh xạ mã nguồn

- `src/Nalix.Abstractions/Security/ISequenceCounter.cs`
- `src/Nalix.Environment/Sequencing/SequenceCounter.cs`

## Constructor & phương thức công khai

| Thành viên | Chữ ký | Mô tả |
| --- | --- | --- |
| `SequenceCounter` | `public SequenceCounter(uint initialValue = 0)` | Khởi tạo bộ đếm bắt đầu từ `initialValue`. |
| `Next()` | `public uint Next()` | Tăng nguyên tử và trả về số tuần tự `uint` kế tiếp (`Interlocked.Increment`). |
| `Current()` | `public uint Current()` | Đọc nguyên tử số tuần tự hiện tại (`Volatile.Read`). |
| `IsValid` | `public bool IsValid(uint? receivedSeq, uint window = 0)` | Trả về `true` nếu `receivedSeq` lớn hơn `Current()` hoặc nằm trong `window` phía sau cho phép (tối đa `MaxBitmapWindow = 32` dùng bitmap chống phát lại 32-bit). |
| `UpdateTo` | `public void UpdateTo(uint receivedSeq)` | Cập nhật nguyên tử bộ đếm và bitmap cửa sổ trượt chống phát lại với `receivedSeq`. |
| `ResumeFrom` | `public void ResumeFrom(uint lastKnownSeq, uint safetyGap = 1000)` | Khôi phục bộ đếm sau khi tiếp tục phiên về `lastKnownSeq + safetyGap` để tránh tái sử dụng nonce qua các lần ngắt kết nối. |
| `IsApproachingOverflow` | `public bool IsApproachingOverflow(uint margin = 1_000_000)` | Trả về `true` khi `Current() >= uint.MaxValue - margin`, báo hiệu cần kích hoạt xoay khóa phiên (`SESSION_REKEY`). |
| `Reset` | `public void Reset(uint newValue = 0)` | Đặt lại bộ đếm và bitmap chống phát lại về `newValue` (chỉ được gọi cùng lúc với xoay khóa mật mã). |

## Ví dụ sử dụng

```csharp
using Nalix.Environment.Sequencing;

SequenceCounter outbound = new(initialValue: 0);
uint seq = outbound.Next(); // 1

if (outbound.IsApproachingOverflow(margin: 1_000_000))
{
    // Kích hoạt xoay khóa phiên giữa chừng (SESSION_REKEY) trước khi số 32-bit quay vòng
}
```

## `SequenceOptions` (`Nalix.Environment.Options`)

`SequenceOptions` (`src/Nalix.Environment/Options/SequenceOptions.cs`) là lớp cấu hình sealed (`ConfigurationLoader`, `IValidatableConfiguration`) kiểm soát cửa sổ sắp xếp lại chống phát lại theo từng transport:

| Thuộc tính | Kiểu | Mặc định | Kiểm tra | Mô tả |
| --- | --- | :---: | --- | --- |
| `TcpWindow` | `uint` | `32` | `[ValueRange(0, 256)]` | Cửa sổ sắp xếp lại cho kết nối TCP. |
| `UdpWindow` | `uint` | `128` | `[ValueRange(0, 1024)]` | Cửa sổ sắp xếp lại cho kết nối UDP. |

`Validate()` chạy kiểm tra data annotation và ném `ValidationException` khi `UdpWindow < TcpWindow`.

## API liên quan

- [AEAD & Envelope Encryption](../security/aead-and-envelope.md)
- [Giao thức tiếp tục phiên (Session Resumption)](../security/session-resume.md)
- [Hợp đồng kết nối (ITransportSequencer)](../abstractions/connection-contracts.md)
