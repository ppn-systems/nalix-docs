---
title: Benchmark tuần tự hóa
description: Nalix có một engine tuần tự hóa nhị phân tùy chỉnh, LiteSerializer, được thiết kế để đạt thông lượng tối đa và cấp phát tối thiểu trong việc truyền tải mạng hiệu năng cao.
section: Benchmarks
---

Nalix có một engine tuần tự hóa nhị phân tùy chỉnh, `LiteSerializer`, được thiết kế để đạt thông lượng tối đa và cấp phát tối thiểu trong việc truyền tải mạng hiệu năng cao.

## Hiệu năng LiteSerializer

Micro-benchmark chi tiết các thao tác tuần tự hóa tiêu chuẩn, bao gồm struct unmanaged, formatter tùy chỉnh, điền span nội tuyến và phân giải formatter.

| Phương thức | Mean | Error | StdDev | P95 | Gen0 | Gen1 | Gen2 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Serialize_Unmanaged_Small** | **8.4605 ns** | 0.3905 ns | 0.5214 ns | 9.1123 ns | 0.0015 | - | - | 56 B |
| **Serialize_Unmanaged_Large** | **49.7401 ns** | 1.3714 ns | 1.7831 ns | 52.4651 ns | 0.0144 | - | - | 536 B |
| **Deserialize_Unmanaged_Small** | **3.3755 ns** | 0.0330 ns | 0.0441 ns | 3.4550 ns | - | - | - | 0 B |
| **Deserialize_Unmanaged_Large** | **22.0984 ns** | 0.2677 ns | 0.3083 ns | 22.6873 ns | - | - | - | 0 B |
| **Serialize_Formatter** | **58.3652 ns** | 2.3481 ns | 2.6099 ns | 60.5600 ns | 0.0041 | - | - | 152 B |
| **Deserialize_Formatter** | **60.4312 ns** | 0.7158 ns | 0.9556 ns | 62.0313 ns | 0.0079 | - | - | 296 B |
| **Fill_IntoSpan_Small** | **1.0629 ns** | 0.0188 ns | 0.0245 ns | 1.1034 ns | - | - | - | 0 B |
| **Fill_IntoSpan_Large** | **5.1200 ns** | 0.0450 ns | 0.0585 ns | 5.2316 ns | - | - | - | 0 B |
| **Resolve_Formatter** | **0.9009 ns** | 0.0128 ns | 0.0162 ns | 0.9219 ns | - | - | - | 0 B |

### Vì sao tuần tự hóa của Nalix?

- **Giải tuần tự hóa không cấp phát**: Giải tuần tự hóa các cấu trúc unmanaged (`Deserialize_Unmanaged_Small` và `Deserialize_Unmanaged_Large`) hoàn toàn không cấp phát (0 B) và chạy trong khoảng từ một chữ số đến hai chữ số thập phân nano giây.
- **Đường nhanh điền span**: Sao chép dữ liệu nguyên thủy trực tiếp vào span đích (`Fill_IntoSpan_Small`) mất khoảng **1 nano giây** (~1.06 ns) với chi phí gần như bằng không.
- **Sao chép bộ nhớ trực tiếp**: Với các struct unmanaged, `LiteSerializer` dùng phép sao chép khối bộ nhớ mức thấp qua lớp `Unsafe`, tạo ra các lệnh CPU chạy ở giới hạn phần cứng.
- **Inlining tích cực**: Các phương thức chính trên đường tuần tự hóa được trang trí bằng thuộc tính biên dịch tích cực, cho phép RyuJIT inline và loại bỏ chi phí gọi phương thức.
