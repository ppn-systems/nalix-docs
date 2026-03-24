# 🔌 Server API

Listener-side contracts for accepting connections and dispatching packets.

### 🔧 Accept and dispatch
Listeners accept sockets and push frames to the dispatcher.

**Responsibilities**
- Accept TCP sockets.
- Register connections.
- Forward buffers to the dispatch channel.

**Key Components**
- `TcpListenerBase`
- `ConnectionHub`
- `PacketDispatchChannel`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithHandler(() => new HandshakeHandlers());
});

sealed class DemoProtocol : Protocol
{
    private readonly PacketDispatchChannel _dispatch;
    public DemoProtocol(PacketDispatchChannel dispatch) => _dispatch = dispatch;
    public override void ProcessMessage(object sender, IConnectEventArgs args)
        => _dispatch.HandlePacket(args.Lease, args.Connection);
}

sealed class DemoListener : TcpListenerBase
{
    public DemoListener(ushort port, IProtocol protocol) : base(port, protocol) { }
}

DemoProtocol protocol = new(channel);
DemoListener listener = new(57206, protocol);
listener.Activate();
```

### 🔧 Dispatch configuration
Configure middleware, handlers, and logging on the channel.

**Responsibilities**
- Attach middleware.
- Register handlers.
- Add logging and error handling.

**Key Components**
- `PacketDispatchOptions.WithMiddleware`
- `PacketDispatchOptions.WithHandler`
- `PacketDispatchOptions.WithLogging`
- `PacketDispatchOptions.WithErrorHandling`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithLogging(NLogix.Host.Instance);
    options.WithMiddleware(new TimeoutMiddleware());
    options.WithErrorHandling((ex, opCode) => NLogix.Host.Instance.Error($"opcode={opCode}", ex));
    options.WithHandler(() => new HandshakeHandlers());
});
```

### 🔧 Handler registration
Handlers are discovered from attributes on controller classes.

**Responsibilities**
- Annotate controllers and opcodes.
- Let the channel compile delegates once.

**Key Components**
- `PacketControllerAttribute`
- `PacketOpcodeAttribute`
- `WithHandler<TController>()`

```csharp
PacketDispatchChannel channel = new(options =>
{
    options.WithHandler<HandshakeHandlers>();
});
```

### 🔧 Metadata providers
Attach custom metadata for middleware and handlers.

**Responsibilities**
- Register providers before activation.
- Expose attributes on `PacketContext`.

**Key Components**
- `PacketMetadataProviders`
- `PacketCustomAttributeProvider`

```csharp
PacketMetadataProviders.Register(new PacketCustomAttributeProvider());
```
