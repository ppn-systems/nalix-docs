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
| **RawAllocation** | **16.578 ns** | 0.7459 ns | 0.9958 ns | 18.244 ns | 1.00 | 88 B | 1.00 |
| **ArrayPool_Shared** | **9.110 ns** | 0.2700 ns | 0.3415 ns | 9.604 ns | 0.55 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **35.959 ns** | 1.9918 ns | 2.5189 ns | 41.332 ns | 2.18 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **64.282 ns** | 3.8836 ns | 5.1845 ns | 73.644 ns | 3.89 | 0 B | 0.00 |

### Chỉ số cấp phát bộ đệm (Size = 1024)

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **121.806 ns** | 3.6228 ns | 4.8364 ns | 129.286 ns | 1.00 | 1048 B | 1.00 |
| **ArrayPool_Shared** | **9.500 ns** | 0.7683 ns | 0.9435 ns | 11.607 ns | 0.08 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **40.596 ns** | 2.5648 ns | 3.1498 ns | 46.851 ns | 0.33 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **60.421 ns** | 2.0328 ns | 2.6433 ns | 65.717 ns | 0.50 | 0 B | 0.00 |

### Chỉ số cấp phát bộ đệm (Size = 16384)

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **1,760.521 ns** | 92.5375 ns | 123.5349 ns | 1,968.484 ns | 1.005 | 16408 B | 1.00 |
| **ArrayPool_Shared** | **8.679 ns** | 0.3308 ns | 0.3810 ns | 9.197 ns | 0.005 | 0 B | 0.00 |
| **BufferPoolManager_RentReturn** | **38.340 ns** | 3.1783 ns | 4.2430 ns | 46.787 ns | 0.022 | 0 B | 0.00 |
| **BufferLease_RentDispose** | **61.450 ns** | 3.6315 ns | 4.4598 ns | 70.845 ns | 0.035 | 0 B | 0.00 |

### Vì sao bộ nhớ của Nalix?

- **Thuê mảng có pool (`BufferPoolManager`)**: `BufferPoolManager` bọc `ArrayPool<byte>.Shared` với các bộ đếm thuê/trả nguyên tử và chẩn đoán rò rỉ bộ nhớ tùy chọn (`BufferOptions.EnableBufferLeakDetection`), mang lại 0 B cấp phát trên mọi kích thước payload.
- **An toàn lease có đếm tham chiếu (`BufferLease`)**: `BufferLease` cung cấp một lớp bọc thuê có pool và đếm tham chiếu (`Retain()` / `Dispose()`) (`IBufferLease`), giữ cho các chu kỳ thuê/giải phóng không cấp phát (0 B) đồng thời ngăn việc trả bộ đệm sớm qua các ranh giới bất đồng bộ.

---

## Object Pooling

Chỉ số bộ nhớ khi tái sử dụng các thể hiện class thông qua object pool.

| Phương thức | Mean | Error | StdDev | P95 | Tỷ lệ | Cấp phát | Tỷ lệ cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **RawAllocation** | **10.61 ns** | 0.420 ns | 0.561 ns | 11.57 ns | 1.00 | 32 B | 1.00 |
| **RentAndReturn_ObjectPool** | **80.44 ns** | 3.108 ns | 3.700 ns | 87.16 ns | 7.60 | 0 B | 0.00 |

### Đằng sau thiết kế

- **Tái sử dụng đối tượng**: Tái sử dụng các thể hiện của cấu trúc phức tạp (như trạng thái phiên, envelope gói tin và ngữ cảnh xử lý) giúp tránh tình trạng GC Gen 0 bị quá tải.
- **Kiến trúc đường nhanh lai**:
    - **Cache theo luồng (Thread-Local Cache)**: Tầng đầu tiên, tra cứu không khóa, lưu cache các thể hiện đối tượng trong thread-local storage (`ThreadLocalCache<T>`) để tái sử dụng với độ trễ cực thấp trên cùng một luồng.
    - **Bucket theo chỉ số kiểu (Type-Indexed Buckets)**: Khi các slot thread-local trống hoặc đầy, việc lấy đối tượng sẽ chuyển sang tra cứu dựa trên mảng, sử dụng ID kiểu đã biên dịch (`PoolType<T>.Id`) để bỏ qua việc băm chậm hoặc tra cứu dictionary generic.
- **Logic reset**: Để tránh trạng thái bị ô nhiễm giữa các lần thuê, các đối tượng trong pool triển khai interface reset (`IPoolable`), tự động xóa dữ liệu và chuẩn bị thể hiện để tái sử dụng khi được trả về pool.
