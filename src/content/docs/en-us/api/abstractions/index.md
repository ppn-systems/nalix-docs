---
title: Abstractions API
description: Reference for Nalix.Abstractions — the zero-dependency Level 0 contracts, packet and handler attributes, connection interfaces, session scopes, and validation metadata shared across the Nalix ecosystem.
section: API Reference
package: Nalix.Abstractions
---

`Nalix.Abstractions` defines the **Level 0** interfaces, attributes, value types, and enumerations shared across the entire Nalix stack (`Nalix.Environment`, `Nalix.Codec`, `Nalix.Framework`, `Nalix.Runtime`, `Nalix.Network`, `Nalix.SDK`, and `Nalix.Hosting`).

## Core Contracts

- [**Packet Contracts**](./packet-contracts.md) — `IPacket`, `IPacketContext<TPacket>`, `IPacketSender`, `IPacketStaticOpcode`, `IPacketDeserializer<TPacket>`, and `PacketHeader`.
- [**Packet Attributes**](./packet-attributes.md) — `[PacketHandler]`, `[PacketOpcode]`, `[PacketPermission]`, `[PacketEncryption]`, `[PacketRateLimit]`, `[PacketTimeout]`, `[PacketTransport]`, and `[PacketIdempotent]`.
- [**Packet Metadata**](./packet-metadata.md) — `PacketMetadata` compiled by `PacketHandlerGenerator`.
- [**Connection Contracts**](./connection-contracts.md) — `IConnection`, `IConnectionHub`, `IProtocol`, `IListener`, `IFrameProcessor`, `IOpCodeExtractor`, and `ITransportSequencer`.
- [**Session Contracts**](./session-contracts.md) — `ISessionService`, `ISessionFactory`, `ISessionStore`, `ISessionPersistencePolicy`, `SessionEntry`, `SessionSnapshot`, and `SessionScope`.
- [**Concurrency Contracts**](./concurrency-contracts.md) — `ITaskManager`, `IWorker`, `WorkerAttribute`, `IWorkerHandle`, `IWorkerContext`, `IRecurringHandle`, `IWorkerOptions`, and `IRecurringOptions`.

## Primitives & Enumerations

- [**Control Types**](./protocols/control-type.md) — `ControlType` system-level signaling opcodes (`PING`, `PONG`, `DISCONNECT`, `POW_REQUEST`, `SESSION_REKEY`, etc.).
- [**Common Enumerations**](./enums.md) — Complete reference for `ProtocolOpCode`, `PacketFlags`, `PacketPriority`, `PermissionLevel`, `PermissionEvaluation`, `CipherSuiteType`, `NetworkTransport`, `TransportFraming`, `DropPolicy`, `MiddlewareStage`, `SnowflakeType`, `ProtocolReason`, and `ProtocolAdvice`.
- [**Serialization Attributes**](./serialization-attributes.md) — `[Packet]`, `[GenerateFormatter]`, `[SerializePackable]`, `[SerializeOrder]`, `[SerializeIgnore]`, `[SerializeHeader]`, `[SerializeDynamicSize]`, `IFixedSizeSerializable`, and `SerializerBounds`.

## Validation & Dependency Injection

- [**Validation Attributes**](./validation.md) — AOT-safe configuration validation attributes (`[ValueRange]`, `[DurationRange]`, `[Required]`, `[Length]`, `[AllowedEnum]`, `IValidatableConfiguration`) and `ValidationException`.
- [**Injection Attributes**](./injection.md) — Compile-time DI contracts (`[Injectable]`, `[Inject]`, `[FromScope]`, and `IPacketScope`) used by `InstanceGenerator` and `PacketHandlerGenerator`.
