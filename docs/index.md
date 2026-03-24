# Nalix

Nalix is a high-performance real-time server framework for .NET that puts deterministic networking, low-latency middleware, and secure cryptography under a single, opinionated roof. The framework spans five packages with clearly defined responsibilities so you can compose only what your service needs.

## Core pillars

- **Networking built for thousands of connections** – `TcpListenerBase` orchestrates accept loops, pooled buffers, connection limits, and diagnostics while `ConnectionHub` keeps fast, shard-aware lookup tables for active clients.
- **Client and host symmetry** – `IoTTcpSession` and `TcpSessionBase` share the same serialization/cipher stack as the server, so your example client behaves like production agents. Helpers such as `RequestExtensions`, `ControlExtensions`, `TransportOptions`, and `RequestOptions` make retries, encryption, and timing predictable.
- **Programmable middleware** – `PacketDispatchChannel` and `MiddlewarePipeline<TPacket>` run inbound/outbound/outbound-always hooks in order, support logging/mode switches, and tuck error-handling under `PacketContext`.
- **Framework plumbing** – `InstanceManager`, `TaskManager`, `ConfigurationManager`, and `TimeSynchronizer` provide injection, scheduling, configuration binding, and global clocks for every host.

!!! tip "Plan your surface"
    Keep the client and server stacks aligned by reusing `PacketRegistry` instances and registering the same metadata providers for `PacketController` handlers. That way the packets your actor reads on the server are identical to those the SDK serializes on the client.

Explore the Getting Started page to install the SDK and wire `IoTTcpSession` to your service host, then jump to the Concepts section for architecture and middleware guidance.
