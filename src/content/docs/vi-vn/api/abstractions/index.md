---
title: API Abstractions
description: Tham chiếu cho Nalix.Abstractions — các hợp đồng Level 0 không phụ thuộc, attribute gói tin và handler, interface kết nối, phạm vi phiên và metadata xác thực dùng chung trong toàn hệ sinh thái Nalix.
section: API Reference
package: Nalix.Abstractions
---

`Nalix.Abstractions` định nghĩa các interface, attribute, kiểu giá trị và enumeration **Level 0** dùng chung cho toàn bộ stack Nalix (`Nalix.Environment`, `Nalix.Codec`, `Nalix.Framework`, `Nalix.Runtime`, `Nalix.Network`, `Nalix.SDK` và `Nalix.Hosting`).

## Hợp đồng cốt lõi

- [**Hợp đồng gói tin**](./packet-contracts.md) — `IPacket`, `IPacketContext<TPacket>`, `IPacketSender`, `IPacketStaticOpcode`, `IPacketDeserializer<TPacket>` và `PacketHeader`.
- [**Thuộc tính gói tin**](./packet-attributes.md) — `[PacketHandler]`, `[PacketOpcode]`, `[PacketPermission]`, `[PacketEncryption]`, `[PacketRateLimit]`, `[PacketTimeout]`, `[PacketTransport]` và `[PacketIdempotent]`.
- [**Metadata gói tin**](./packet-metadata.md) — `PacketMetadata` được biên dịch bởi `PacketHandlerGenerator`.
- [**Hợp đồng kết nối**](./connection-contracts.md) — `IConnection`, `IConnectionHub`, `IProtocol`, `IListener`, `IFrameProcessor`, `IOpCodeExtractor` và `ITransportSequencer`.
- [**Hợp đồng phiên**](./session-contracts.md) — `ISessionService`, `ISessionFactory`, `ISessionStore`, `ISessionPersistencePolicy`, `SessionEntry`, `SessionSnapshot` và `SessionScope`.
- [**Hợp đồng đồng thời**](./concurrency-contracts.md) — `ITaskManager`, `IWorker`, `WorkerAttribute`, `IWorkerHandle`, `IWorkerContext`, `IRecurringHandle`, `IWorkerOptions` và `IRecurringOptions`.

## Kiểu nguyên thủy & enumeration

- [**Kiểu điều khiển**](./protocols/control-type.md) — `ControlType`, các opcode tín hiệu cấp hệ thống (`PING`, `PONG`, `DISCONNECT`, `POW_REQUEST`, `SESSION_REKEY`, v.v.).
- [**Các enumeration dùng chung**](./enums.md) — Tham chiếu đầy đủ cho `ProtocolOpCode`, `PacketFlags`, `PacketPriority`, `PermissionLevel`, `PermissionEvaluation`, `CipherSuiteType`, `NetworkTransport`, `TransportFraming`, `DropPolicy`, `MiddlewareStage`, `SnowflakeType`, `ProtocolReason` và `ProtocolAdvice`.
- [**Thuộc tính tuần tự hóa**](./serialization-attributes.md) — `[Packet]`, `[GenerateFormatter]`, `[SerializePackable]`, `[SerializeOrder]`, `[SerializeIgnore]`, `[SerializeHeader]`, `[SerializeDynamicSize]`, `IFixedSizeSerializable` và `SerializerBounds`.

## Xác thực & Dependency Injection

- [**Thuộc tính xác thực**](./validation.md) — Thuộc tính xác thực cấu hình an toàn với AOT (`[ValueRange]`, `[DurationRange]`, `[Required]`, `[Length]`, `[AllowedEnum]`, `IValidatableConfiguration`) và `ValidationException`.
- [**Thuộc tính injection**](./injection.md) — Hợp đồng DI lúc biên dịch (`[Injectable]`, `[Inject]`, `[FromScope]` và `IPacketScope`) được `InstanceGenerator` và `PacketHandlerGenerator` sử dụng.
