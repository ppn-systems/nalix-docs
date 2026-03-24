# Nalix.Common

`Nalix.Common` holds the networking primitives, packet definitions, and middleware contracts shared across the SDK and listener stack.

### 🔧 Common contracts
Define packets, connections, attributes, and security enums so the dispatcher, middleware, and SDK agree on every wire characteristic.

**Responsibilities**
- Declare `IPacket` and `IConnection` so handlers, middleware, and the SDK can read packet bytes, connection IDs, and secrets.
- Provide `[PacketController]` / `[PacketOpcode]` attributes and `PacketMetadataBuilder` so `PacketDispatchChannel` compiles handler delegates ahead of time.
- Surface `DropPolicy`, `CipherSuiteType`, and `PermissionLevel` enums used by `ConnectionHub`, `PacketSender<TPacket>`, and the encryption layer.

**Key Components**
- `IPacket` / `IConnection` – core interfaces with `SequenceId`, `TransportOptions`, `Csprng`, and `PermissionLevel`.
- `PacketControllerAttribute` / `PacketOpcodeAttribute` – metadata providers read by `PacketDispatchOptions.WithHandler`.
- `PacketMetadataBuilder` – collects routing metadata and populates `PacketContext<TPacket>.Attributes`.
- `CipherSuiteType` – enumerates SALSA20, CHACHA20, SALSA20-Poly1305, and CHACHA20-Poly1305 for both readers and writers.
- `DropPolicy` – connection-level backpressure: `DROP_NEWEST`, `DROP_OLDEST`, `BLOCK`, `COALESCE`.

**Flow**
- Define packet types implementing `IPacket` → annotate handler classes with `[PacketController]` and `[PacketOpcode]` → register controllers via `PacketDispatchOptions.WithHandler` so `PacketDispatchChannel` compiles metadata once.

### 🔧 Middleware & pooling
`PacketContext<TPacket>` plus `MiddlewarePipeline<TPacket>` and `PacketSender<TPacket>` keep middleware deterministic and zero-allocation.

**Responsibilities**
- Pool contexts & senders to avoid allocations on the hot path.
- Provide `SkipOutbound` and `CancellationToken` control to middleware.
- Let middleware read handler metadata via `PacketContext<TPacket>.Attributes`.

**Key Components**
- `PacketContext<TPacket>` – pooled context that holds `Packet`, `Connection`, `PacketMetadata`, `Sender`, `SkipOutbound`, and `CancellationToken`.
- `PacketSender<TPacket>` – wraps `Connection` writes with the correct ciphertext/compression metadata.
- `MiddlewarePipeline<TPacket>` – runs inbound, outbound, and outbound-always middleware without locking by creating immutable snapshots.
- `IPacketMiddleware<TPacket>` – middleware contract that takes `PacketContext<TPacket>` and a `Func<CancellationToken, Task>` delegate.

**Flow**
- `PacketDispatchChannel` builds a `PacketContext` → inbound middleware runs → handler executes → outbound-always + outbound run, subject to `SkipOutbound`.

```csharp
internal void Reset()
{
    if (this.Sender is PacketSender<TPacket> concreteSender)
    {
        s_object.Return<PacketSender<TPacket>>(concreteSender);
    }

    this.Sender = default!;
    this.Packet = default!;
    this.Attributes = default;
    this.Connection = default!;

    _isInitialized = false;
}
```

!!! note "Avoid reusing contexts"
    `PacketContext<TPacket>` instances are pooled. Always call `PacketContext<TPacket>.Reset()` (handled by the dispatcher) before returning them to the pool, otherwise `Sender`/`Connection` state bleeds into the next handler.
