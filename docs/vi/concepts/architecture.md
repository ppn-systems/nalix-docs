# 🧠 Kiến trúc

Phân lớp cấu hình, catalog packet và pipeline dispatch.

**Thành phần**
- `ConfigurationManager`
- `InstanceManager`
- `PacketRegistryFactory`
- `PacketDispatchChannel`

```mermaid
flowchart LR
    Config["ConfigurationManager"] --> Registry["PacketRegistryFactory"]
    Registry --> Channel["PacketDispatchChannel"]
    Channel --> Middleware["Middleware"]
    Middleware --> Handler["Handlers"]
```
