---
title: Frame Pipeline
description: High-level inbound and outbound frame transformation orchestration (LZ4 compression and AEAD/symmetric encryption) in Nalix.Codec.Transforms.FramePipeline.
section: API Reference
package: Nalix.Codec
---

**Namespace:** `Nalix.Codec.Transforms`  
**Assembly:** `Nalix.Codec`

`FramePipeline` unifies the execution of cryptographic (`EnvelopeCipher`) and compression (`LZ4Codec`) transforms for inbound and outbound frames, preserving the 6-byte `PacketHeader` (`FrameTransformer.Offset = 6`) while transforming the payload region (`DATA_REGION`).

## Source Mapping

- `src/Nalix.Codec/Transforms/FramePipeline.cs`
- `src/Nalix.Codec/Transforms/FrameCipher.cs`
- `src/Nalix.Codec/Transforms/FrameCompression.cs`
- `src/Nalix.Codec/Transforms/FrameTransformer.cs`

## Canonical Wire Order

- **Outbound (`ProcessOutbound`)**: Compress first (`PacketFlags.COMPRESSED`) $\rightarrow$ Encrypt (`PacketFlags.ENCRYPTED`).
- **Inbound (`TryProcessInbound` / `ProcessInbound`)**: Decrypt first $\rightarrow$ Decompress.

## Public API

| Method | Signature | Description |
| --- | --- | --- |
| `TryProcessInbound` | `public static bool TryProcessInbound([Borrowed] ref IBufferLease current, ReadOnlySpan<byte> secret, CipherSuiteType algorithm, out uint? seq)` | Non-throwing inbound pipeline. Decrypts and/or decompresses `current` in place (swapping `current` to a newly rented `BufferLease` if transformed). Returns `false` if decryption, authentication, or decompression fails. |
| `ProcessInbound` | `public static void ProcessInbound([Borrowed] ref IBufferLease current, ReadOnlySpan<byte> secret, CipherSuiteType algorithm, out uint? seq)` | Throwing inbound pipeline. Throws `ArgumentNullException` (if `current` is `null`) or `CipherException` (on decryption, authentication, or decompression failure). |
| `ProcessOutbound` | `public static void ProcessOutbound([Borrowed] ref IBufferLease current, bool enableCompress, int minSizeToCompress, bool enableEncrypt, ReadOnlySpan<byte> secret, uint? seq, CipherSuiteType algorithm)` | Applies outbound LZ4 compression (when `payloadSize >= minSizeToCompress` and compression saves $\ge 12.5\%$) and envelope encryption. Throws `ArgumentNullException`, `CipherException` (including when `seq.HasValue` is `false` and encryption is enabled, validated up-front before compression when `doCompress && enableEncrypt`), `LZ4Exception`, or `InternalErrorException`. |

## Key Runtime & Security Invariants

1. **12.5% Minimum Compression Gain (`IsCompressionWorthwhile`)**:
   - Outbound compression is only kept when `compressedLength <= originalLength - (originalLength >> 3)` (at least 12.5% smaller). If a payload is incompressible, `FramePipeline` sends the raw payload without `PacketFlags.COMPRESSED`.
2. **Fused Single-Allocation Paths**:
   - **Outbound (`ProcessOutboundFused`)**: When both compression and encryption are active, validates `seq.HasValue` up-front, rents a **single** `BufferLease` (`BufferLease.TransportHeadroom` reserved) with a scratch tail region, compresses into the tail, encrypts into the main region, wipes the scratch tail, and commits the final length.
   - **Inbound (`TryProcessInboundFused`)**: When a frame has both `PacketFlags.ENCRYPTED` and `PacketFlags.COMPRESSED`, decrypts into a temporary pooled array (cleared in `finally`), validates the LZ4 header via `FrameTransformer.TryGetDecompressedLength` against `Math.Min(CompressionOptions.MaxDecompressedSize, LZ4CompressionConstants.MaxBlockSize)` (`256 KB` cap), and decompresses directly into the final `BufferLease`.
3. **Plaintext Scrubbing & `EncryptedOnWire` Tracking**:
   - When `ProcessOutbound` encrypts a plaintext `BufferLease`, it sets `plaintextLease.ZeroOnDispose = true` so the source plaintext is scrubbed when returned to the pool.
   - When `TryProcessInbound` / `FrameCipher` decrypts an inbound frame, the resulting plaintext lease has **`EncryptedOnWire = true`** and **`ZeroOnDispose = true`**, while the transient `PacketFlags.ENCRYPTED` and `PacketFlags.COMPRESSED` bits are cleared from `header.Flags`. Downstream handlers and `[PacketEncryption(true)]` inspect `lease.EncryptedOnWire` (`context.IsEncrypted`).
4. **Borrowed Reference Swap Ownership**:
   - `FramePipeline` mutates `ref IBufferLease current` by swapping the reference to the new transformed lease and disposing any intermediate lease it created, but **never** disposes the caller's original `current` lease (allowing the caller to manage original lease lifetime deterministically).

## Usage Example

```csharp
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Security;
using Nalix.Codec.Transforms;

// Outbound: compress payloads >= 512 bytes and encrypt with ChaCha20-Poly1305
IBufferLease originalOut = OutboundLease;
IBufferLease currentOut = originalOut;
FramePipeline.ProcessOutbound(
    ref currentOut,
    enableCompress: true,
    minSizeToCompress: 512,
    enableEncrypt: true,
    secret: sessionSecret,
    seq: nextOutboundSeq,
    algorithm: CipherSuiteType.Chacha20Poly1305);

// Inbound: non-throwing decrypt + decompress on network receive loop
IBufferLease originalIn = InboundLease;
IBufferLease currentIn = originalIn;
if (FramePipeline.TryProcessInbound(
    ref currentIn,
    secret: sessionSecret,
    algorithm: CipherSuiteType.Chacha20Poly1305,
    out uint? envelopeSeq))
{
    // currentIn now holds decrypted/decompressed packet bytes (EncryptedOnWire == true)
}
```

## Related APIs

- [Frame Model](./packets/frame-model.md)
- [AEAD and Envelope](../security/aead-and-envelope.md)
- [LZ4 Compression](./lz4.md)
- [BufferLease](../environment/memory/buffer-lease.md)
- [Sequencing](../environment/sequencing.md)
