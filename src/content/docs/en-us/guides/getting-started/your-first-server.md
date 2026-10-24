---
title: Your First Server
description: This looks at the HelloWorld sample piece by piece so you understand what each part is doing, not just how to copy it.
section: Start Here
---

This looks at the HelloWorld sample piece by piece so you understand what each part is doing, not just how to copy it.

Full source: `samples/HelloWorld`

## The pieces

A minimal Nalix application has three projects:

- **Contracts** — the packet types both server and client use
- **Server** — hosts the listener and handlers
- **Client** — connects and sends requests

```text
HelloWorld/
├── HelloWorld.Contracts/   # Shared packet definitions
├── HelloWorld.Server/      # Server application
├── HelloWorld.Client/      # Client application
└── HelloWorld.sln
```

Full source: `samples/HelloWorld/README.md`

> This page explains the code shown in the [Quick Start](../../quickstart.md). Keep it open alongside — each section below points at the snippet it explains.

## Packets are plain classes with attributes

See the packet definition in [Quick Start §2](../../quickstart.md#2-define-the-packets).

`[GenerateFormatter]` instructs the Nalix Roslyn source generator to emit a zero-reflection binary serializer and a `[ModuleInitializer]` (`PacketRegistryGenerator`) that automatically registers the packet in `PacketRegistry` at startup. `StaticOpCode` (`IPacketStaticOpcode`) is the 16-bit number that identifies this packet type on the wire; pick any value `>= 0x0100` (such as `0x7001`) that doesn't collide with another packet in your project (`0x0000..0x00FF` are reserved for built-in system frames, enforced by analyzer `NALIX035`). `PacketBase<TSelf>` provides the 6-byte wire header (`OpCode`, `Flags`, `Priority`, `SequenceId`) at `[SerializeOrder(0..3)]`, so payload properties start at `PacketHeaderOffset.Region` (`4`) or higher.

## Handlers respond to one opcode each

See the handler in [Quick Start §3](../../quickstart.md#3-write-the-server).

`context.Sender.SendAsync(...)` sends a reply back on the same connection that sent the request. `PacketFactory<T>.Acquire()` hands you a pooled packet instance instead of allocating a new one every time — you don't need to think about this beyond wrapping it in a `using` block.

## The server is a builder chain

See the builder chain in [Quick Start §3](../../quickstart.md#3-write-the-server).

`MapHandlers` registers your handler class. `MapTcp<DefaultProtocol>().OnPort(...).Bind()` opens a TCP listener using the built-in protocol — you only need a custom protocol if you're doing something unusual with raw frames. `RunAsync` blocks until the cancellation token fires (here, on Ctrl+C).

## The client sends and awaits a typed reply

See the client in [Quick Start §4](../../quickstart.md#4-write-the-client).

`RequestAsync<TResponse>` subscribes for the response before it sends the request, so a fast reply is never missed. If nothing comes back within the timeout, it throws.

## Common problems

**Client cannot connect.** Make sure the server is running before you start the client, and that nothing else is listening on the port.

**Packet handler not found at runtime.** Make sure the `HelloWorld.Contracts` assembly is actually loaded and referenced — its module initializer registers packets automatically when the assembly loads.

## Next steps

- [Build a Chat Room](../build-a-chat-room.md) — add broadcast to every connected client
- [How Packets Work](../../concepts/how-packets-work.md) — packet attributes in more depth
- [Handlers and Middleware](../../concepts/handlers-and-middleware.md) — what runs before your handler
