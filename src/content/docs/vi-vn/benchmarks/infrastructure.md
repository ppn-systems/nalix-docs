---
title: Benchmark hạ tầng lõi
description: Chỉ số hiệu năng chi tiết cho runtime lõi của Nalix, bao gồm quản lý kết nối, lưu trữ phiên, đăng ký gói tin và các cổng đồng thời.
section: Benchmarks
---

Chỉ số hiệu năng chi tiết cho runtime lõi của Nalix, bao gồm quản lý kết nối, lưu trữ phiên, đăng ký gói tin và các cổng đồng thời.

## Connection Hub

`ConnectionHub` đóng vai trò registry trung tâm cho các kết nối socket đang hoạt động.

| Phương thức | Mean | Error | StdDev | Cấp phát |
| :--- | ---: | ---: | ---: | ---: |
| **GetConnection** | **3.633 ns** | 0.2432 ns | 0.3247 ns | 0 B |
| **RegisterAndUnregister** | 269.944 ns | 8.3769 ns | 8.9631 ns | 0 B |

:::note
`RegisterAndUnregister` đã bị bỏ qua trong lần chạy này do lỗi khi thực thi. Hiện đang được xem xét để tối ưu.
:::

### Đằng sau thiết kế

- **Lập chỉ mục không khóa**: Connection hub dựa vào các collection đồng thời hiệu năng cao và mảng chỉ mục để xử lý đăng ký đồng thời mà không cần khóa toàn cục.
- **Đường tra cứu nhanh**: Tra cứu một phiên theo định danh dạng số dài mất dưới 4 nano giây (~3.6 ns), đảm bảo việc lấy phiên không trở thành nút thắt trong vòng lặp nhận tin đến.

---

## Connection Guard

`ConnectionGuard` quản lý giới hạn tốc độ kết nối và danh sách chặn IP ở mức kết nối.

| Phương thức | Mean | Error | StdDev | Cấp phát |
| :--- | ---: | ---: | ---: | ---: |
| **TryAccept_Allowed** | **66.53 ns** | 2.010 ns | 2.614 ns | 0 B |
| **TryAccept_Blacklisted** | **234.27 ns** | 8.412 ns | 11.230 ns | 0 B |

### Đằng sau thiết kế

- **Đường nhanh danh sách chặn theo IP**: Các IP bị chặn được kiểm tra ngay lập tức bằng cấu trúc tối ưu giống trie hoặc hashset, hoàn toàn không cấp phát bộ nhớ.
- **Kiểm tra hạn mức**: Chấp nhận một kết nối cần kiểm tra giới hạn đồng thời hiện tại và giới hạn yêu cầu theo cửa sổ trượt, thực hiện trong khoảng ~67 ns và không cấp phát bộ nhớ heap.

---

## Session Store

`SessionStore` duy trì các phiên người dùng cục bộ hiệu năng cao.

| Phương thức | Mean | Error | StdDev | Cấp phát |
| :--- | ---: | ---: | ---: | ---: |
| **StoreAndConsume** | **281.0 ns** | 7.89 ns | 10.26 ns | 48 B |

### Đằng sau thiết kế

- **Map phiên an toàn đa luồng**: Sử dụng các map tra cứu không khóa, cho phép nhiều thao tác đọc đồng thời. Việc thêm và tiêu thụ metadata phiên được tối ưu cho bố cục thân thiện với cache.

---

## Packet Registry

`PacketRegistry` ánh xạ định danh payload tới các contract handler cụ thể.

| Phương thức | Mean | Error | StdDev | Cấp phát |
| :--- | ---: | ---: | ---: | ---: |
| **TryDeserialize** | **5.700 ns** | 0.1906 ns | 0.2478 ns | 0 B |

### Đằng sau thiết kế

- **Ánh xạ giải tuần tự hóa không cấp phát**: Việc ánh xạ định danh kiểu gói tin đến sang logic giải tuần tự hóa được biên dịch sẵn và lưu cache hoàn toàn. Đường tra cứu chạy trong khoảng 5.7 ns với 0 B bộ nhớ heap.

---

## Hàng đợi sẵn sàng dispatch

`DispatchChannel<TPacket>` chuyển thông báo "kết nối có gói tin sẵn sàng" từ callback hoàn tất socket đến một worker dispatch, mỗi tin nhắn một lần. Bước chuyển này trước đây dùng `System.Threading.Channels.Channel<T>` (`SingleReader = false, SingleWriter = false`), mặc dù code chỉ gọi `TryWrite`/`TryRead` và không bao giờ dùng bề mặt `ReadAsync`/`WaitToReadAsync` bất đồng bộ mà Channels được tạo ra để phục vụ. Với cấu hình đó, `Channel<T>` vẫn lấy monitor lock khi ghi và đọc để duy trì bookkeeping cho các reader đang chờ (không dùng đến). Nó được thay bằng một `ConcurrentQueue<T>` không khóa đơn giản, cho cùng API dạng `TryWrite`/`TryRead` mà không phải trả chi phí cho cơ chế không ai gọi tới.

| Phương thức | Mean | Tỷ lệ | Cấp phát |
| :--- | ---: | ---: | ---: |
| **Channel\<T\> write+read, single thread** | 1.49 μs | 1.00 | 0 B |
| **ConcurrentQueue\<T\> write+read, single thread** | **0.47 μs** | **0.32** | 0 B |
| **Channel\<T\> write+read, producer/consumer threads** | 341.28 ns / op | 1.00 | 0 B |
| **ConcurrentQueue\<T\> write+read, producer/consumer threads** | **74.93 ns / op** | **0.22** | 1 B |

Đo đầu cuối, thực thi trực tiếp `DispatchChannel<IPacket>.Push` → `TryClaim` → `TryDequeue` → `Release` (đường đi thực tế của mỗi tin nhắn):

| Kịch bản | Trước | Sau | Thay đổi |
| :--- | ---: | ---: | ---: |
| Một kết nối, không tranh chấp | 325.2 ns | **286.0 ns** | −12% |
| 64 kết nối đẩy đồng thời, đã drain | 68.75 μs | **60.11 μs** | −12.6% |

:::note
Đây là một cải thiện thực sự cho mỗi tin nhắn ở tầng dispatch, nhưng dispatch channel chỉ là một trong nhiều bước của đường xử lý request đầy đủ (vòng đi về socket của hệ điều hành chiếm phần lớn CPU/op phía máy chủ đầu cuối). Khi chạy lại phép so sánh echo đầy đủ trong [network-comparison.md](network-comparison.md) chỉ với thay đổi này, không thấy khác biệt nào ngoài nhiễu thông thường giữa các lần chạy trên container dùng chung này. Cải thiện là có thật nhưng quá nhỏ so với tổng CPU/op để nhìn thấy ở quy mô đó.
:::

### Đằng sau thiết kế

- **Không trả chi phí cho tính năng không dùng**: Việc thay cấu trúc nền đã loại bỏ một lần lấy khóa ở mỗi thao tác enqueue/dequeue mà không làm thay đổi hành vi. Hàng đợi sẵn sàng chưa từng dựa vào ngữ nghĩa reader chặn của `Channel<T>`.
- **Số liệu trên thay đổi giữa các lần chạy** tới khoảng ~20% trên container 4 vCPU dùng chung này. Tỷ lệ giữa hai triển khai mới là tín hiệu ổn định, không phải các con số nano giây tuyệt đối.

---

## Cổng đồng thời và Throttling

Nalix dùng bộ giới hạn token bucket và các cổng đồng thời để ngăn máy chủ quá tải và bảo vệ hot path.

### Token Bucket Limiter

| Phương thức | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Evaluate** | **120.1 ns** | 3.55 ns | 4.61 ns | 127.8 ns | 0 B |

### Policy Rate Limiter

| Phương thức | Mean | Error | StdDev | P95 | Cấp phát |
| :--- | ---: | ---: | ---: | ---: | ---: |
| **Evaluate** | **149.2 ns** | 2.84 ns | 3.59 ns | 152.9 ns | 0 B |

### Chiến lược tối ưu

- **Vòng lặp CAS (Compare-And-Swap) nguyên tử**: Quyết định throttling được đưa ra bằng cấu trúc interlocked không khóa, thực hiện các thao tác nguyên tử trong vài nano giây.
- **Đánh giá không cấp phát**: Đánh giá `TokenBucket` chạy mà không cấp phát đối tượng (0 B) trong khoảng ~120 ns, cho phép kiểm tra giới hạn tốc độ trực tiếp trên các gói tin có tần suất cao.
