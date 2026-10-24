---
title: Tham chiếu API Nalix.Environment
description: Tham chiếu cho Nalix.Environment — lease bộ nhớ không cấp phát, bộ đọc/ghi nhị phân, cấu hình INI, đồng hồ đơn điệu, CSPRNG của hệ điều hành, phân mảnh gói tin và bộ đếm tuần tự chống phát lại.
section: API Reference
package: Nalix.Environment
---

`Nalix.Environment` cung cấp các thành phần nguyên thủy cấp **Level 1** cho bộ nhớ, IO nhị phân, cấu hình, thời gian, ngẫu nhiên mật mã, phân mảnh gói tin và bộ đếm tuần tự, được dùng xuyên suốt hệ sinh thái Nalix.

## Bộ nhớ & IO nhị phân (`Nalix.Environment.Memory`)

- [**Quản lý bộ đệm**](./memory/buffer-management.md) — `IBufferLease`, `BufferLease`, `BufferPoolManager` và `BufferOptions`.
- [**BufferLease**](./memory/buffer-lease.md) — Lát bộ nhớ lấy từ pool, có bộ đếm tham chiếu, headroom và xóa bằng mật mã (`ZeroOnDispose`).
- [**DataReader**](./memory/data-reader.md) — `ref struct` đọc nhị phân không cấp phát trên `ReadOnlySpan<byte>`, `ReadOnlyMemory<byte>`, `byte[]` và `byte*`.
- [**DataWriter**](./memory/data-writer.md) — `ref struct` ghi nhị phân không cấp phát, hỗ trợ chế độ tự mở rộng lấy từ pool và chế độ span cố định.

## Cấu hình (`Nalix.Environment.Configuration`)

- [**Cấu hình (ConfigurationManager & ConfigurationLoader)**](./configuration.md) — Ràng buộc cấu hình `.ini` an toàn đa luồng, theo dõi file trực tiếp và kiểm tra hợp lệ.

## Nền tảng, thời gian, ngẫu nhiên & đánh số tuần tự

- [**Thư mục**](./directories.md) — Phân giải thư mục ứng dụng theo môi trường và container (`Directories`), cùng việc tăng cường quyền Unix.
- [**Clock**](./clock.md) — Tiện ích timestamp Unix UTC và đơn điệu độ phân giải cao (`Clock`).
- [**Phạm vi đo thời gian**](./timing-scope.md) — `readonly struct` không cấp phát (`TimingScope`) để đo số tick, micro giây và mili giây đã trôi qua.
- [**Ngẫu nhiên (Csprng)**](./random.md) — Bộ sinh số ngẫu nhiên mật mã mạnh dựa trên entropy của hệ điều hành (`OsCsprng`).
- [**Đánh số tuần tự (SequenceCounter)**](./sequencing.md) — Bộ đếm tuần tự đơn điệu an toàn đa luồng và bộ kiểm tra chống phát lại cửa sổ trượt (`Nalix.Environment.Sequencing`).
- [**Phân mảnh (FragmentAssembler & FragmentHeader)**](../codec/packets/fragmentation.md) — Chia nhỏ và tái lắp ráp payload vượt kích thước (`Nalix.Environment.Fragments` và `FragmentOptions`).

## Gói liên quan

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Codec](../codec/index.md)
- [Nalix.Framework](../framework/index.md)
- [Nalix.Network](../network/index.md)
- [Nalix.Runtime](../runtime/index.md)
