# 🧠 Pipeline middleware

Middleware chạy trước/ sau handler theo thứ tự cố định.

### 🔧 Thêm middleware
```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithMiddleware(new CustomMiddleware());
});
```

### 🔧 Đọc metadata
```csharp
PacketCustomAttribute? attr = context.Attributes.CustomAttributes
    .OfType<PacketCustomAttribute>()
    .FirstOrDefault();
```

### 🔧 Xử lý lỗi
```csharp
options.WithErrorHandling((ex, opCode)
    => NLogix.Host.Instance.Error($"opcode={opCode}", ex));
```
