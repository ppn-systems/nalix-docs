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
| **Serialize_Unmanaged_Small** | **11.3692 ns** | 0.6061 ns | 0.8091 ns | 12.387 ns | 0.0055 | - | - | 56 B |
| **Serialize_Unmanaged_Large** | **60.9115 ns** | 9.5825 ns | 12.7924 ns | 76.527 ns | 0.0530 | - | - | 536 B |
| **Deserialize_Unmanaged_Small** | **4.0649 ns** | 0.1476 ns | 0.1970 ns | 4.438 ns | - | - | - | 0 B |
| **Deserialize_Unmanaged_Large** | **16.6168 ns** | 0.5510 ns | 0.6968 ns | 17.877 ns | - | - | - | 0 B |
| **Serialize_Formatter** | **64.0497 ns** | 1.6643 ns | 2.1641 ns | 66.875 ns | 0.0197 | - | - | 152 B |
| **Deserialize_Formatter** | **78.7231 ns** | 3.0755 ns | 4.1057 ns | 84.189 ns | 0.0286 | - | - | 296 B |
| **Fill_IntoSpan_Small** | **1.1024 ns** | 0.1480 ns | 0.1976 ns | 1.439 ns | - | - | - | 0 B |
| **Fill_IntoSpan_Large** | **5.5824 ns** | 0.2336 ns | 0.3037 ns | 6.181 ns | - | - | - | 0 B |
| **Resolve_Formatter** | **0.9033 ns** | 0.1041 ns | 0.1316 ns | 1.171 ns | - | - | - | 0 B |

### Vì sao tuần tự hóa của Nalix?

- **Giải tuần tự hóa không cấp phát**: Giải tuần tự hóa các cấu trúc unmanaged (`Deserialize_Unmanaged_Small` và `Deserialize_Unmanaged_Large`) hoàn toàn không cấp phát (0 B) và chạy trong khoảng từ một chữ số đến hai chữ số thập phân nano giây.
- **Đường nhanh điền span**: Sao chép dữ liệu nguyên thủy trực tiếp vào span đích (`Fill_IntoSpan_Small`) mất khoảng **1 nano giây** (~1.10 ns) với chi phí gần như bằng không.
- **Sao chép bộ nhớ trực tiếp**: Với các struct unmanaged, `LiteSerializer` dùng phép sao chép khối bộ nhớ mức thấp qua lớp `Unsafe`, tạo ra các lệnh CPU chạy ở giới hạn phần cứng.
- **Inlining tích cực**: Các phương thức chính trên đường tuần tự hóa được trang trí bằng thuộc tính biên dịch tích cực, cho phép RyuJIT inline và loại bỏ chi phí gọi phương thức.
