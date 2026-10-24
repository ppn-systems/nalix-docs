---
title: Tham chiếu API Nalix.Codec
description: Engine tuần tự hóa nhị phân lúc biên dịch, pipeline biến đổi khung, nén LZ4, mật mã AEAD và packet registry toàn process trong Nalix.Codec.
section: API Reference
package: Nalix.Codec
---

`Nalix.Codec` cung cấp engine tuần tự hóa nhị phân lúc biên dịch (`LiteSerializer`), danh mục gói tin toàn process (`PacketRegistry`), factory gói tin có pool (`PacketFactory<T>`), pipeline biến đổi khung (`FramePipeline`), nén LZ4 (`LZ4Codec`), và các nguyên thủy mật mã (`EnvelopeCipher`, `HandshakeX25519`, `ProofOfWork`) cho hệ sinh thái Nalix.

## Tuần tự hóa (`Nalix.Codec.Serialization`)

Nalix dùng bộ tuần tự hóa nhị phân được sinh từ mã nguồn (`SerializeFormatterGenerator`), được tối ưu cho việc thực thi không cấp phát bộ nhớ và không dùng reflection.

- [**Serialization Basics**](./serialization/serialization-basics.md): `LiteSerializer`, `FormatterProvider`, `IFormatter<T>`, `IFillableFormatter<T>` và `SerializationOptions`.
- [**Packet Serialization**](./serialization/packet-serialization.md): Cách các field, auto-property và hình dạng tập hợp của gói tin được mã hóa thành và giải mã từ định dạng wire.
- [**Serialization Attributes**](../abstractions/serialization-attributes.md): `[GenerateFormatter]`, `[SerializePackable]`, `[SerializeOrder]`, `[SerializeIgnore]`, `[SerializeHeader]` và `[SerializeDynamicSize]`.
- [**Reader, Writer & Header Extensions**](./serialization/reader-writer-and-header-extensions.md): `DataReaderExtensions`, `DataWriterExtensions` và `HeaderExtensions.AsHeaderRef` không sao chép dữ liệu.

## Gói tin & Registry (`Nalix.Codec.DataFrames` & `Nalix.Codec.ProtocolFrames`)

- [**Packet Registry**](./packets/packet-registry.md): Danh mục opcode toàn process với độ phức tạp O(1) (`PacketRegistry.Build()`, `TryDeserialize`, `Deserialize`, `IsKnownOpCode`, `IsRegistered<T>()`).
- [**Frame Model**](./packets/frame-model.md): `FrameBase`, `PacketBase<TSelf>`, `FrameTransformer`, `FrameCipher` và `FrameCompression`.
- [**Built-in Frames**](./packets/built-in-frames.md): Cả 11 khung hệ thống và khung bắt tay tích hợp sẵn (`Control`, `Directive`, `TimeSync`, `SessionInit`, `SessionChallenge`, `SessionProof`, `SessionEstablished`, `SessionResume`, `SessionTofu`, `ProofOfWorkChallenge`, `ProofOfWorkProof`).
- [**Fragmentation**](./packets/fragmentation.md): Tách và ghép lại payload lớn (`FragmentHeader`, `FragmentAssembler`, `FragmentOptions`, `FragmentStreamId` trong `Nalix.Environment.Fragments`).

## Biến đổi khung & Mật mã (`Nalix.Codec.Transforms` & `Nalix.Codec.Security`)

- [**Frame Pipeline**](./frame-pipeline.md): Biến đổi khung inbound (giải mã $\rightarrow$ giải nén) và outbound (nén $\rightarrow$ mã hóa) hợp nhất qua `FramePipeline`.
- [**LZ4 Compression**](./lz4.md): Nén/giải nén khối LZ4 dựa trên span và `BufferLease` có pool (`LZ4Codec`, `LZ4BlockHeader`, `CompressionOptions`).
- [**Cryptography Overview**](../security/cryptography.md): `EnvelopeCipher`, `ChaCha20Poly1305`, `Salsa20Poly1305`, `HandshakeX25519`, `ProofOfWork`, `Keccak256`, `HmacKeccak256` và `Pbkdf2`.

## Tùy chọn cấu hình (`Nalix.Codec.Options`)

- **`CompressionOptions`** (`[Compression]`): `Enabled = true`, `MinSizeToCompress = 512`, `MaxDecompressedSize = 33_554_432` (32 MB).
- **`SerializationOptions`** (`[Serialization]`): `MaxArrayLength = 1_048_576`, `MaxStringLength = 1_048_576`, `MaxDeserializationDepth = 256`.
- **`SecurityOptions`** (`[Security]`): `Pbkdf2Iterations = 310_000`.

## Gói liên quan

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Environment](../environment/index.md)
- [Nalix.Framework](../framework/index.md)
- [Nalix.Network](../network/index.md)
- [Nalix.Runtime](../runtime/index.md)
