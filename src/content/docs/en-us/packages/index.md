---
title: Packages Overview
description: Nalix is composed of focused packages that can be used together or independently. This page provides a map of all packages, their responsibilities, and guidance on choosing the...
section: Packages
---

Nalix is composed of focused packages that can be used together or independently. This page provides a map of all packages, their responsibilities, and guidance on choosing the right combination.

:::tip[Safe defaults]
**Server:** Start with `Nalix.Hosting` — it brings in the core networking and runtime.  
**Client:** Start with `Nalix.SDK` — it includes `Nalix.Codec` and `Nalix.Environment` transitively.
:::

## Package Map

| Package | Purpose | Key Types |
| :--- | :--- | :--- |
| [**Nalix.Abstractions**](./nalix-abstractions.md) | Base contracts, packet attributes, and core networking abstractions | `IPacket`, `IConnection`, `PacketOpcodeAttribute`, `PacketHandlerAttribute`, `NetworkTransport` |
| [**Nalix.Environment**](./nalix-environment.md) | Configuration, environment IO, buffer leasing, and core memory types | `ConfigurationManager`, `BufferLease`, `DataReader`, `DataWriter`, `Clock` |
| [**Nalix.Codec**](./nalix-codec.md) | Serialization, frames, transforms, and compression | `LiteSerializer`, `LZ4Codec`, `FrameCipher`, `PacketRegistry`, `FrameCompression` |
| [**Nalix.Framework**](./nalix-framework.md) | Shared runtime services, instance registration, scheduling, and identifiers | `InstanceManager`, `TaskManager`, `Snowflake`, `TimingScope` |
| [**Nalix.Runtime**](./nalix-runtime.md) | Packet dispatch, built-in protection middleware, and throttling primitives | `PacketDispatchChannel`, `PolicyRateLimiter`, `TokenBucketLimiter`, `PermissionMiddleware` |
| [**Nalix.Network**](./nalix-network.md) | TCP/UDP listeners, connections, protocol bridge, and session store | `TcpListenerBase`, `UdpListenerBase`, `Protocol`, `ConnectionHub`, `SocketConnection` |
| [**Nalix.Hosting**](./nalix-hosting.md) | Fluent server bootstrap, packet discovery, and application lifecycle | `NetworkApplication`, `INetworkApplicationBuilder`, `Bootstrap` |
| [**Nalix.SDK**](./nalix-sdk.md) | Client transport sessions, request/response correlation, and session flows | `TransportSession`, `TcpSession`, `UdpSession`, `TransportOptions`, `RequestOptions` |

## Minimum Package Sets

| Scenario | Packages |
| :--- | :--- |
| **Hosted server** (recommended) | `Nalix.Hosting` |
| **Manual server** | `Nalix.Network`, `Nalix.Runtime`, `Nalix.Framework` |
| **Client only** | `Nalix.SDK` |
| **Shared contracts** | `Nalix.Abstractions`, `Nalix.Codec` |

## Package Detail Pages

- [Nalix.Abstractions](./nalix-abstractions.md)
- [Nalix.Environment](./nalix-environment.md)
- [Nalix.Codec](./nalix-codec.md)
- [Nalix.Framework](./nalix-framework.md)
- [Nalix.Runtime](./nalix-runtime.md)
- [Nalix.Network](./nalix-network.md)
- [Nalix.Hosting](./nalix-hosting.md)
- [Nalix.SDK](./nalix-sdk.md)
