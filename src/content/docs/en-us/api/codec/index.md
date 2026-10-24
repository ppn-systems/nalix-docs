---
title: Nalix.Codec API Reference
description: Compile-time binary serialization, frame transformation pipelines, LZ4 compression, AEAD cryptography, and process-wide packet registry in Nalix.Codec.
section: API Reference
package: Nalix.Codec
---

`Nalix.Codec` provides the compile-time binary serialization engine (`LiteSerializer`), process-wide packet catalog (`PacketRegistry`), pooled packet factories (`PacketFactory<T>`), frame transformation pipeline (`FramePipeline`), LZ4 compression (`LZ4Codec`), and cryptographic primitives (`EnvelopeCipher`, `HandshakeX25519`, `ProofOfWork`) for the Nalix ecosystem.

## Serialization (`Nalix.Codec.Serialization`)

Nalix uses a source-generated binary serializer (`SerializeFormatterGenerator`) optimized for zero-allocation, reflection-free execution.

- [**Serialization Basics**](./serialization/serialization-basics.md): `LiteSerializer`, `FormatterProvider`, `IFormatter<T>`, `IFillableFormatter<T>`, and `SerializationOptions`.
- [**Packet Serialization**](./serialization/packet-serialization.md): How packet fields, auto-properties, and collection shapes are encoded to and from wire format.
- [**Serialization Attributes**](../abstractions/serialization-attributes.md): `[GenerateFormatter]`, `[SerializePackable]`, `[SerializeOrder]`, `[SerializeIgnore]`, `[SerializeHeader]`, and `[SerializeDynamicSize]`.
- [**Reader, Writer & Header Extensions**](./serialization/reader-writer-and-header-extensions.md): `DataReaderExtensions`, `DataWriterExtensions`, and zero-copy `HeaderExtensions.AsHeaderRef`.

## Packets & Registry (`Nalix.Codec.DataFrames` & `Nalix.Codec.ProtocolFrames`)

- [**Packet Registry**](./packets/packet-registry.md): Process-wide O(1) opcode catalog (`PacketRegistry.Build()`, `TryDeserialize`, `Deserialize`, `IsKnownOpCode`, `IsRegistered<T>()`).
- [**Frame Model**](./packets/frame-model.md): `FrameBase`, `PacketBase<TSelf>`, `FrameTransformer`, `FrameCipher`, and `FrameCompression`.
- [**Built-in Frames**](./packets/built-in-frames.md): All 11 built-in system and handshake frames (`Control`, `Directive`, `TimeSync`, `SessionInit`, `SessionChallenge`, `SessionProof`, `SessionEstablished`, `SessionResume`, `SessionTofu`, `ProofOfWorkChallenge`, `ProofOfWorkProof`).
- [**Fragmentation**](./packets/fragmentation.md): Splitting and reassembling large payloads (`FragmentHeader`, `FragmentAssembler`, `FragmentOptions`, `FragmentStreamId` in `Nalix.Environment.Fragments`).

## Frame Transforms & Cryptography (`Nalix.Codec.Transforms` & `Nalix.Codec.Security`)

- [**Frame Pipeline**](./frame-pipeline.md): Fused inbound (decrypt $\rightarrow$ decompress) and outbound (compress $\rightarrow$ encrypt) frame transformation via `FramePipeline`.
- [**LZ4 Compression**](./lz4.md): Span-based and pooled `BufferLease` block compression/decompression (`LZ4Codec`, `LZ4BlockHeader`, `CompressionOptions`).
- [**Cryptography Overview**](../security/cryptography.md): `EnvelopeCipher`, `ChaCha20Poly1305`, `Salsa20Poly1305`, `HandshakeX25519`, `ProofOfWork`, `Keccak256`, `HmacKeccak256`, and `Pbkdf2`.

## Configuration Options (`Nalix.Codec.Options`)

- **`CompressionOptions`** (`[Compression]`): `Enabled = true`, `MinSizeToCompress = 512`, `MaxDecompressedSize = 33_554_432` (32 MB).
- **`SerializationOptions`** (`[Serialization]`): `MaxArrayLength = 1_048_576`, `MaxStringLength = 1_048_576`, `MaxDeserializationDepth = 256`.
- **`SecurityOptions`** (`[Security]`): `Pbkdf2Iterations = 310_000`.

## Related Packages

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Environment](../environment/index.md)
- [Nalix.Framework](../framework/index.md)
- [Nalix.Network](../network/index.md)
- [Nalix.Runtime](../runtime/index.md)
