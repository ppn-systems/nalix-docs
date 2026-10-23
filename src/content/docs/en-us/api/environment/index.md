---
title: Nalix.Environment API Reference
description: Reference for Nalix.Environment — zero-allocation memory leases, binary readers/writers, INI configuration, monotonic clock, OS CSPRNG, packet fragmentation, and replay sequencing.
section: API Reference
package: Nalix.Environment
---

`Nalix.Environment` provides the **Level 1** memory, binary IO, configuration, time, cryptographic randomness, packet fragmentation, and sequence counter primitives used across the Nalix ecosystem.

## Memory & Binary IO (`Nalix.Environment.Memory`)

- [**Buffer Management**](./memory/buffer-management.md) — `IBufferLease`, `BufferLease`, `BufferPoolManager`, and `BufferOptions`.
- [**BufferLease**](./memory/buffer-lease.md) — Reference-counted pooled memory slice with headroom and cryptographic zeroing (`ZeroOnDispose`).
- [**DataReader**](./memory/data-reader.md) — Zero-allocation `ref struct` binary reader over `ReadOnlySpan<byte>`, `ReadOnlyMemory<byte>`, `byte[]`, and `byte*`.
- [**DataWriter**](./memory/data-writer.md) — Zero-allocation `ref struct` binary writer supporting pooled auto-expanding and fixed-span modes.

## Configuration (`Nalix.Environment.Configuration`)

- [**Configuration (ConfigurationManager & ConfigurationLoader)**](./configuration.md) — Thread-safe `.ini` configuration binding, live file watching, and validation.

## Platform, Time, Random & Sequencing

- [**Directories**](./directories.md) — Environment- and container-aware application directory resolution (`Directories`) with Unix permission hardening.
- [**Clock**](./clock.md) — High-resolution monotonic and UTC Unix timestamp utilities (`Clock`).
- [**Timing Scope**](./timing-scope.md) — Zero-allocation `readonly struct` (`TimingScope`) for measuring elapsed ticks, microseconds, and milliseconds.
- [**Random (Csprng)**](./random.md) — Cryptographically strong random number generator backed by OS entropy (`OsCsprng`).
- [**Sequencing (SequenceCounter)**](./sequencing.md) — Thread-safe monotonic sequence counter and sliding-window replay validator (`Nalix.Environment.Sequencing`).
- [**Fragmentation (FragmentAssembler & FragmentHeader)**](../codec/packets/fragmentation.md) — Splitting and reassembling oversized payloads (`Nalix.Environment.Fragments` and `FragmentOptions`).

## Related Packages

- [Nalix.Abstractions](../abstractions/index.md)
- [Nalix.Codec](../codec/index.md)
- [Nalix.Framework](../framework/index.md)
- [Nalix.Network](../network/index.md)
- [Nalix.Runtime](../runtime/index.md)
