---
title: Benchmark bộ nhớ và lưu trữ
description: Nalix sử dụng một hệ thống quản lý bộ nhớ được tối ưu cao, được thiết kế để loại bỏ các lần tạm dừng do Garbage Collection (GC) trong các khối lượng công việc thông lượng cao.
section: Benchmarks
---

Nalix sử dụng một hệ thống quản lý bộ nhớ được tối ưu cao, được thiết kế để loại bỏ các lần tạm dừng do Garbage Collection (GC) trong các khối lượng công việc thông lượng cao.

## Buffer Pooling và Lease

So sánh các chiến lược lấy bộ nhớ theo nhiều kích thước khác nhau (64 B, 1 KB và 16 KB).

### Chỉ số cấp phát bộ đệm (Size = 64)

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **16.974 ns** | 1.3931 ns | 1.6043 ns | 19.503 ns | 1.01 | 88 B | 1.00 |
| **ArrayPool_Shared** | **10.824 ns** | 0.3976 ns | 0.4579 ns | 11.244 ns | 0.64 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **23.905 ns** | 0.6627 ns | 0.7632 ns | 24.545 ns | 1.42 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **54.052 ns** | 0.5018 ns | 0.5778 ns | 54.617 ns | 3.21 | 0 B | 0.00 |

### Chỉ số cấp phát bộ đệm (Size = 1024)

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **159.487 ns** | 29.9061 ns | 34.4399 ns | 194.306 ns | 1.06 | 1048 B | 1.00 |
| **ArrayPool_Shared** | **6.406 ns** | 0.0902 ns | 0.1039 ns | 6.556 ns | 0.04 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **24.173 ns** | 0.4341 ns | 0.4999 ns | 24.471 ns | 0.16 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **62.729 ns** | 1.1419 ns | 1.3150 ns | 63.688 ns | 0.42 | 0 B | 0.00 |

### Chỉ số cấp phát bộ đệm (Size = 16384)

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **2,608.051 ns** | 452.9858 ns | 521.6591 ns | 3,035.733 ns | 1.062 | 16408 B | 1.00 |
| **ArrayPool_Shared** | **10.496 ns** | 0.8494 ns | 0.9782 ns | 11.159 ns | 0.004 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **23.769 ns** | 0.6516 ns | 0.7504 ns | 24.451 ns | 0.010 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **53.938 ns** | 1.3191 ns | 1.5190 ns | 54.873 ns | 0.022 | 0 B | 0.00 |

### Vì sao bộ nhớ của Nalix?

- **Thuê mảng có pool (`BufferPoolManager`)**: `BufferPoolManager` bọc `ArrayPool<byte>.Shared` với các bộ đếm thuê/trả nguyên tử và chẩn đoán rò rỉ bộ nhớ tùy chọn (`BufferOptions.EnableBufferLeakDetection`), mang lại 0 B cấp phát trên mọi kích thước payload.
- **An toàn lease có đếm tham chiếu (`BufferLease`)**: `BufferLease` cung cấp một lớp bọc thuê có pool và đếm tham chiếu (`Retain()` / `Dispose()`) (`IBufferLease`), giữ cho các chu kỳ thuê/giải phóng không cấp phát (0 B) đồng thời ngăn việc trả bộ đệm sớm qua các ranh giới bất đồng bộ.

---

## Object Pooling

Chỉ số bộ nhớ khi tái sử dụng các thể hiện class thông qua object pool.

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **8.016 ns** | 0.4384 ns | 0.5049 ns | 8.474 ns | 1.00 | 32 B | 1.00 |
| **RentAndReturn_ObjectPool** | **157.624 ns** | 5.2398 ns | 6.0342 ns | 161.363 ns | 19.74 | 0 B | 0.00 |

### Đằng sau thiết kế

- **Tái sử dụng đối tượng**: Tái sử dụng các thể hiện của cấu trúc phức tạp (như trạng thái phiên, envelope gói tin và ngữ cảnh xử lý) giúp tránh tình trạng GC Gen 0 bị quá tải.
- **Kiến trúc đường nhanh lai**:
    - **Cache theo luồng (Thread-Local Cache)**: Tầng đầu tiên, tra cứu không khóa, lưu cache các thể hiện đối tượng trong thread-local storage (`ThreadLocalCache<T>`) để tái sử dụng với độ trễ cực thấp trên cùng một luồng.
    - **Bucket theo chỉ số kiểu (Type-Indexed Buckets)**: Khi các slot thread-local trống hoặc đầy, việc lấy đối tượng sẽ chuyển sang tra cứu dựa trên mảng, sử dụng ID kiểu đã biên dịch (`PoolType<T>.Id`) để bỏ qua việc băm chậm hoặc tra cứu dictionary generic.
- **Logic reset**: Để tránh trạng thái bị ô nhiễm giữa các lần thuê, các đối tượng trong pool triển khai interface reset (`IPoolable`), tự động xóa dữ liệu và chuẩn bị thể hiện để tái sử dụng khi được trả về pool.
