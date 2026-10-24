---
title: Code Fixes của Nalix.Analyzers
description: Tài liệu tham chiếu cho cả 16 implementation CodeFixProvider của Roslyn trong Nalix.Analyzers.CodeFixes và 20 quy tắc chẩn đoán đang hoạt động mà chúng tự động sửa.
section: API Reference
package: Nalix.Analyzers
---

`Nalix.Analyzers.CodeFixes` cung cấp **16 lớp `CodeFixProvider` của Roslyn** để tự động hóa các sửa lỗi cơ học thường gặp cho **20 mã chẩn đoán đang hoạt động** (cộng với `NALIX031` đã bị loại bỏ) do `Nalix.Analyzers` phát ra.

## Ánh xạ mã nguồn

Mọi provider nằm trong `analyzers/Nalix.Analyzers.CodeFixes/`:

| Lớp provider | Chẩn đoán được sửa | Tiêu đề hành động sửa | Biến đổi |
| --- | --- | --- | --- |
| `PacketOpcodeCodeFixProvider` | `NALIX002` | `Add [PacketOpcode]` | Thêm `[PacketOpcode(0x0000)]` vào một method handler bên trong controller `[PacketHandler]`. |
| `PacketHandlerCodeFixProvider` | `NALIX008` | `Add [PacketHandler]` | Thêm `[PacketHandler]` vào lớp controller chứa nó. |
| `PacketRegistryDeserializerCodeFixProvider` | `NALIX009` | `Implement IPacketDeserializer<T>` | Thêm `IPacketDeserializer<ClassName>` vào danh sách lớp cơ sở và sinh ra `public static new ClassName Deserialize(ReadOnlySpan<byte> buffer) => PacketBase<ClassName>.Deserialize(buffer);`. |
| `PacketSelfTypeCodeFixProvider` | `NALIX010`, `NALIX011` | `Use '{ClassName}' as type argument` | Thay đối số kiểu generic sai trong `PacketBase<TSelf>` hoặc `IPacketDeserializer<T>` bằng tên lớp chứa. |
| `PacketDeserializeCodeFixProvider` | `NALIX012`, `NALIX052` | `Generate valid static Deserialize method` | Thêm hoặc cập nhật `Deserialize` thành `public static new ClassName Deserialize(ReadOnlySpan<byte> buffer) => PacketBase<ClassName>.Deserialize(buffer);`. |
| `SerializeOrderMissingCodeFixProvider` | `NALIX013` | `Add [SerializeOrder]` / `Add [SerializeIgnore]` | Cung cấp hai hành động: thêm `[SerializeOrder(nextOrder)]` (dùng `maxOrder + 1` trên kiểu) hoặc thêm `[SerializeIgnore]`. |
| `DuplicateSerializeOrderCodeFixProvider` | `NALIX014` | `Use next available SerializeOrder` | Đổi đối số `[SerializeOrder]` bị trùng thành `maxOrder + 1`. |
| `SerializationConflictCodeFixProvider` | `NALIX015` | `Remove [SerializeOrder]` / `Remove [SerializeIgnore]` | Cung cấp hai hành động để xóa `[SerializeOrder]` hoặc `[SerializeIgnore]` khi cả hai cùng có trên một thành viên. |
| `ResetForPoolCodeFixProvider` | `NALIX020` | `Call base.ResetForPool()` | Chèn `base.ResetForPool();` làm câu lệnh đầu tiên của override `ResetForPool()` (chuyển method dạng expression-bodied sang dạng block nếu cần). |
| `ConfigurationIgnoreCodeFixProvider` | `NALIX023`, `NALIX024` | `Add [ConfiguredIgnore]` | Thêm `[ConfiguredIgnore]` vào property không được hỗ trợ (`NALIX023`) hoặc không bind được (`NALIX024`) trong các lớp con `ConfigurationLoader`. |
| `MiddlewareCodeFixProvider` | `NALIX030`, `NALIX032` | `Add [MiddlewareOrder(0)]` (`NALIX030`) / `Remove AlwaysExecute` (`NALIX032`) | Thêm `[MiddlewareOrder(0)]` vào lớp middleware (`NALIX030`) hoặc xóa `AlwaysExecute = true` trên `MiddlewareStage.Inbound` (`NALIX032`, cùng với `NALIX031` đã bị loại bỏ). |
| `DispatchLoopCountCodeFixProvider` | `NALIX047` | `Clamp dispatch loop count to 1..64` | Kẹp các literal số nguyên nằm ngoài khoảng truyền vào `WithDispatchLoopCount(...)` về khoảng hợp lệ `1..64` (`< 1` thành `1`, `> 64` thành `64`). |
| `RedundantPacketCastCodeFixProvider` | `NALIX055` | `Remove redundant Packet cast` | Thay `(MyPacket)context.Packet` hoặc `context.Packet as MyPacket` bằng `context.Packet`. |
| `NullMiddlewareCodeFixProvider` | `NALIX056` | `Remove null middleware registration` | Xóa lệnh gọi `.WithMiddleware(null)` / `.WithErrorHandlingMiddleware(null)` khỏi chuỗi builder fluent. |
| `RequestOptionsConsistencyCodeFixProvider` | `NALIX057` | `Set TimeoutMs to 5000` / `Disable retries` | Giải quyết xung đột timeout vô hạn + retry (`NALIX057`) bằng cách đặt `TimeoutMs = 5000` hoặc `RetryCount = 0`. |
| `GenericPacketHandlerCodeFixProvider` | `NALIX058` | `Remove [PacketOpcode]` | Xóa `[PacketOpcode]` khỏi các method generic không thể gắn làm packet handler. |

## Khi chẩn đoán không có code fix

Các chẩn đoán đòi hỏi một quyết định kiến trúc hoặc bảo mật rõ ràng cố ý không có code fix tự động:

- **Opcode trùng (`NALIX001`, `NALIX036`, `NALIX068`, `NALIX106`) và opcode dành riêng (`NALIX035`)**: Số opcode là hợp đồng wire protocol được client và server dùng chung; tự chọn một opcode ngẫu nhiên sẽ làm hỏng khả năng tương thích wire.
- **Vi phạm chữ ký và phạm vi handler (`NALIX003`, `NALIX067`, `NALIX076`)**: Cần quyết định nên lấy service qua `[FromScope]` hay sao chép dữ liệu trước khi chuyển việc sang xử lý khác.
- **Quy tắc hợp đồng RPC và tài nguyên (`NALIX039`, `NALIX075`, `NALIX100`–`NALIX104`, `NALIX107`)**: Cần chọn đúng hợp đồng kiểu trả về/tham số RPC, bỏ `readonly` khỏi field `[Inject]`, hoặc đặt lại các field có thể thay đổi trong `ResetForPool()`.

## API liên quan

- [Tổng quan Analyzers](./index.md)
- [Chẩn đoán (Diagnostic Codes)](./diagnostic-codes.md)
- [Source Generators](./autogen/index.md)
- [Serialization Attributes](../abstractions/serialization-attributes.md)
