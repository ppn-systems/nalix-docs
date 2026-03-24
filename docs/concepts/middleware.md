# 🧠 Middleware Pipeline

Middleware runs in a strict order and can inspect metadata before handlers execute.

### 🔧 Pipeline order
Inbound middleware runs before handlers, outbound after.

**Responsibilities**
- Enforce timeouts.
- Inspect packet metadata.
- Add logging.

**Key Components**
- `IPacketMiddleware<IPacket>`
- `PacketDispatchChannel`

**Flow**
- Inbound middleware -> handler -> outbound middleware -> `PacketSender`.

### 🔧 Register middleware
Attach middleware when you build the dispatch channel.

**Responsibilities**
- Attach middleware instances in order.
- Keep middleware stateless when possible.

**Key Components**
- `PacketDispatchOptions.WithMiddleware`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithMiddleware(new CustomMiddleware());
});
```

### 🔧 Read packet metadata
Middleware can read attributes attached to a packet or controller.

**Responsibilities**
- Read `PacketContext.Attributes`.
- Enforce validation rules.

**Key Components**
- `PacketContext<TPacket>`
- `PacketCustomAttribute`

```csharp
PacketCustomAttribute? attribute = context.Attributes.CustomAttributes
    .OfType<PacketCustomAttribute>()
    .FirstOrDefault();
```

### 🔧 Error handling
Capture middleware and handler exceptions in one place.

**Responsibilities**
- Attach error handling to the channel.
- Log op codes for tracing.

**Key Components**
- `PacketDispatchOptions.WithErrorHandling`
- `ILogger`

```csharp
options.WithErrorHandling((ex, opCode)
    => InstanceManager.Instance.GetExistingInstance<ILogger>()?
                              .Error($"Error handling opcode={opCode}", ex));
```
