# Nalix

Nalix là framework máy chủ thời gian thực cho .NET, đồng bộ cấu hình, catalog packet và pipeline middleware giữa server và client.

### 🔧 Tổng quan nhanh

**Nhiệm vụ**
- Giữ `ConfigurationManager` và `InstanceManager` đồng nhất.
- Dùng một `PacketRegistryFactory` cho cả listener và SDK.
- Chạy packet qua `PacketDispatchChannel` với middleware + handler cố định.

**Thành phần chính**
- `ConfigurationManager`
- `InstanceManager`
- `PacketRegistryFactory`
- `PacketDispatchChannel`
