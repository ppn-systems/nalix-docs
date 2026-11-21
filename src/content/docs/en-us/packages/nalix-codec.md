---
title: Nalix.Codec
description: Level 2 wire codec package providing compile-time binary serialization, LZ4 compression, AEAD encryption, built-in protocol frames, and PacketRegistry.
section: Packages
package: Nalix.Codec
---

`Nalix.Codec` is the **Level 2** wire transformation package. It converts strongly-typed C# packet objects into framed binary payloads and back, integrating compile-time serialization (`LiteSerializer`), pooled LZ4 compression (`LZ4Codec`), AEAD encryption (`EnvelopeCipher`), fused frame pipelines (`FramePipeline`), and the process-wide `PacketRegistry`.

## Key Responsibilities

- **Serialization (`Nalix.Codec.Serialization`)**: Zero-reflection binary serialization via `LiteSerializer`, `FormatterProvider`, and `IFormatter<T>`.
- **Packet Catalog (`Nalix.Codec.DataFrames`)**: Base packet classes (`FrameBase`, `PacketBase<TSelf>`) and the frozen `PacketRegistry` lookup table.
- **Packet Pooling (`Nalix.Codec.Pooling`)**: `PacketFactory<TPacket>`, `PacketScope<TPacket>`, and `PacketBatchScope<TPacket>` for zero-allocation packet rental.
- **Compression (`Nalix.Codec.LZ4`)**: Pooled, zero-allocation LZ4 block compression and decompression via `LZ4Codec`.
- **Cryptography (`Nalix.Codec.Security`)**: `EnvelopeCipher` (`ChaCha20Poly1305`, `Salsa20Poly1305`, `ChaCha20`, `Salsa20`), `HandshakeX25519`, `ProofOfWork`, `Keccak256`, `HmacKeccak256`, and `Pbkdf2`. The `Nalix.Codec.Security.Datagram` namespace adds the datagram-session AEAD (see below).
- **Frame Transforms (`Nalix.Codec.Transforms`)**: `FramePipeline`, `FrameCipher`, `FrameCompression`, and `FrameTransformer` for inbound/outbound frame processing.

## Where It Fits

```mermaid
flowchart TD
    subgraph Core ["Nalix.Codec (Level 2)"]
        Serialization["LiteSerializer & Formatters"]
        Registry["PacketRegistry & PacketBase<T>"]
        Transforms["FramePipeline (LZ4Codec + EnvelopeCipher)"]
        ProtocolFrames["Built-in Protocol Frames"]
    end

    subgraph Base ["Lower Layers"]
        Env["Nalix.Environment (BufferLease / DataReader / DataWriter)"]
        Abs["Nalix.Abstractions (IPacket / Attributes)"]
    end

    Core --> Env
    Core --> Abs
```

## Packet Registry Flow

At compile time, `PacketRegistryGenerator` discovers every class marked with `[Packet]` and emits a `[ModuleInitializer]` that registers its factory and deserializer into `PacketRegistry`. Calling `PacketRegistry.Build()` (done automatically by `NetworkApplicationBuilder`) freezes the catalog into a fast lookup table.

```mermaid
flowchart LR
    A["PacketRegistryGenerator"] -- "RegisterPacket<T>()" --> B["PacketRegistry"]
    B -- "Build()" --> C["Frozen Opcode Catalog"]
    C --> D["Nalix.Runtime (Server Dispatch)"]
    C --> E["Nalix.SDK (Client Receive)"]
```

## Core Components

### `FrameBase` and `PacketBase<TSelf>`

Base classes for all wire packets. `PacketBase<TSelf>` implements `IPacket`, `IPoolable`, header stamping, and pooled deserialization/serialization helpers.

### `LiteSerializer` and `FormatterProvider`

The serialization engine. For packet classes annotated with `[GenerateFormatter]` and `[SerializePackable]`, `SerializeFormatterGenerator` emits a compile-time `IFormatter<T>` implementation and registers it with `FormatterProvider`, avoiding runtime reflection or IL generation.

### `FramePipeline`, `FrameCipher`, and `FrameCompression`

- `FramePipeline.ProcessOutbound(...)` applies outbound transforms in canonical wire order (**compress first, then encrypt**). When both compression and encryption are active, it uses a **fused single-lease path** (`ProcessOutboundFused`) and skips compression automatically if the payload does not shrink by at least 12.5%.
- `FramePipeline.TryProcessInbound(...)` applies inbound transforms in canonical wire order (**decrypt first, then decompress**), setting `EncryptedOnWire = true` and `ZeroOnDispose = true` on decrypted plaintext leases.

### Built-in Protocol Frames (`Nalix.Codec.ProtocolFrames`)

- **Control & Directives**: `Control` (`PING`, `PONG`, `DISCONNECT`, `PUBLIC_KEY_REQUEST`, etc.), `Directive` (throttling/error notices), `TimeSync`.
- **X25519 Handshake**: `SessionTofu`, `SessionInit`, `SessionChallenge`, `SessionProof`, `SessionEstablished`.
- **Session Resume**: `SessionResume` (unified frame using `SessionResumeStage` for `REQUEST` and `RESPONSE`).
- **Proof-of-Work**: `ProofOfWorkChallenge`, `ProofOfWorkProof`.
- **Datagram Ticket**: `DatagramTicket` (`ProtocolOpCode.DATAGRAM_TICKET = 0x000C`, `Nalix.Codec.ProtocolFrames`) with `DatagramTicketStage` (`NONE`, `REQUEST`, `RESPONSE`): the stream-session exchange that hands the client a datagram session ticket (see [Built-in Frames](../api/codec/packets/built-in-frames.md)).

### Datagram Protection (`Nalix.Codec.Security.Datagram`)

Implements the `IDatagramProtection` and `IDatagramProtectionFactory` contracts from `Nalix.Abstractions` (`src/Nalix.Codec/Security/Datagram/`):

- `ChaCha20Poly1305DatagramProtection` — sealed class that seals and opens datagrams with ChaCha20-Poly1305 (`TagSize = ChaCha20Poly1305.TagSize`). It has independent send and receive keys, supports key updates signaled by the key phase bit (`UpdateSendKey()`, `DiscardPreviousReceiveKey()`), and is constructed either directly from the two direction secrets (`new(Bytes32 sendSecret, Bytes32 receiveSecret)`) or through `Create(Bytes32 sessionSecret, ulong connectionId, ReadOnlySpan<byte> ticketNonce, bool isServer)`. Instances are not thread-safe.
- `ChaCha20Poly1305DatagramProtectionFactory` — stateless sealed factory with a shared `Instance`; `Create(...)` delegates to `ChaCha20Poly1305DatagramProtection.Create`.
- `DatagramKeySchedule` — static HKDF-Keccak256 key schedule: `TicketNonceSize = 16`, `IvSize = 12`, `DeriveDirectionSecrets(sessionSecret, connectionId, ticketNonce, out clientToServer, out serverToClient)` (throws `ArgumentException` unless the nonce is 16 bytes), `DeriveKey`, `DeriveIv`, `DeriveNextSecret` (used by key updates), and `BuildNonce(iv, packetNumber, nonce)` (XORs the packet number into the IV).

:::note[Memory and Fragmentation Primitives]
While `Nalix.Codec` performs serialization and frame transforms, the underlying memory primitives (`BufferLease`, `DataReader`, `DataWriter`) and fragmentation types (`FragmentHeader`, `FragmentAssembler`, `FragmentOptions`, `DatagramEngineOptions`) reside in **[Nalix.Environment](./nalix-environment.md)**.
:::

## Quick Example

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Primitives;
using Nalix.Codec.DataFrames;
using Nalix.Codec.ProtocolFrames;

// Freeze the packet catalog (called automatically when using Nalix.Hosting)
PacketRegistry.Build();

// Rent and initialize a built-in SessionInit handshake frame
SessionInit init = SessionInit.Create();
init.Initialize(
    new Bytes32(publicKeyBytes),
    new Bytes32(nonceBytes),
    PacketFlags.SYSTEM);

byte[] wireBytes = init.Serialize();
```

## Key API Pages

- [Serialization Basics](../api/codec/serialization/serialization-basics.md)
- [Packet Serialization](../api/codec/serialization/packet-serialization.md)
- [LZ4 Compression](../api/codec/lz4.md)
- [Frame Model](../api/codec/packets/frame-model.md)
- [Packet Registry](../api/codec/packets/packet-registry.md)
- [Built-in Frames](../api/codec/packets/built-in-frames.md)
- [Fragmentation](../api/codec/packets/fragmentation.md)
- [Cryptography](../api/security/cryptography.md)
