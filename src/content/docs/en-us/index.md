---
title: Nalix
description: Nalix is a real-time TCP and UDP networking framework for .NET 10. You define packet types once, share them between your server and client, and Nalix handles the transport, rout...
section: Overview
---

<p align="center">
  <img src="assets/nalix.png" alt="Nalix Logo" width="200"/>
</p>

<p align="center">
  <a href="https://www.nuget.org/packages?q=Nalix"><img src="https://img.shields.io/nuget/v/Nalix.Network.svg?style=flat-square&label=NuGet" alt="NuGet version"/></a>
  <a href="https://github.com/ppn-systems/nalix/stargazers"><img src="https://img.shields.io/github/stars/ppn-systems/nalix.svg?style=flat-square&color=yellow" alt="GitHub stars"/></a>
  <a href="https://github.com/ppn-systems/nalix/blob/master/LICENSE"><img src="https://img.shields.io/github/license/ppn-systems/nalix.svg?style=flat-square&color=blue" alt="License"/></a>
</p>

Nalix is a real-time TCP and UDP networking framework for .NET 10. You define packet types once, share them between your server and client, and Nalix handles the transport, routing, and security for you.

[Get Started](./quickstart.md) · [View Packages](./packages/index.md)

## What you get

- **One packet definition, shared everywhere.** Define a packet type once in a shared project; both server and client use the same class.
- **A fluent server builder.** Wire up listeners, handlers, and security with a few chained calls, then call `RunAsync()`.
- **A client that just works.** Connect, send a request, and await a typed response — no manual framing or correlation.

:::tip[Try it now]
[Quick Start](./quickstart.md) builds a full client/server pair in a few minutes.
:::

## Start here

- [Quick Start](./quickstart.md) — build and run a request/response server
- [Installation](./installation.md) — pick the right packages for your project
- [Your First Server](./guides/getting-started/your-first-server.md) — a closer look at the pieces

## Guides

- [Build a Chat Room](./guides/build-a-chat-room.md) — broadcast messages to every connected client
- [Securing Your Server](./guides/securing-your-server.md) — enable encryption and multiple transports
- [Guides overview](./guides/index.md) — the full list

## Concepts

- [How Packets Work](./concepts/how-packets-work.md)
- [Handlers and Middleware](./concepts/handlers-and-middleware.md)
- [Configuration](./concepts/configuration.md)
- [Glossary](./concepts/glossary.md)

If you want to know how Nalix works internally — wire formats, sharding, memory pooling — see [Internals](./concepts/internals/index.md). You don't need it to build with Nalix.

## Core packages

| Package | Purpose |
| :--- | :--- |
| [**Nalix.Hosting**](./packages/nalix-hosting.md) | Fluent builder (`NetworkApplication.CreateBuilder()`) and application lifecycle for server bootstrap |
| [**Nalix.Network**](./packages/nalix-network.md) | TCP, UDP, and WebSocket listeners, connections, connection hub, and transport guard |
| [**Nalix.Runtime**](./packages/nalix-runtime.md) | Multi-threaded packet dispatch (`PacketDispatchChannel`), middleware pipeline, and session service |
| [**Nalix.SDK**](./packages/nalix-sdk.md) | Client-side transport sessions (`TcpSession`, `UdpSession`), handshakes, and request/response correlation |
| [**Nalix.Codec**](./packages/nalix-codec.md) | Compile-time binary serialization (`LiteSerializer`), LZ4 compression, AEAD encryption, and `PacketRegistry` |
| [**Nalix.Framework**](./packages/nalix-framework.md) | Dependency injection (`InstanceManager`), background workers (`TaskManager`), `Snowflake` IDs, and object/buffer pools |
| [**Nalix.Environment**](./packages/nalix-environment.md) | Zero-allocation memory (`BufferLease`, `DataReader`, `DataWriter`), INI configuration, `Clock`, `TimingScope`, and `Csprng` |
| [**Nalix.Abstractions**](./packages/nalix-abstractions.md) | Zero-dependency contracts (`IPacket`, `IConnection`, `IBufferLease`), packet attributes, and validation metadata |

For the full package map, see [Packages Overview](./packages/index.md).

---

*Nalix is built by [PPN Corporation](https://github.com/ppn-systems). Licensed under Apache 2.0.*
