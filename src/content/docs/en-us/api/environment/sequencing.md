---
title: Sequencing
description: Thread-safe monotonic sequence counter and sliding-window replay validator in Nalix.Environment.Sequencing.SequenceCounter.
section: API Reference
package: Nalix.Environment
---

**Namespace:** `Nalix.Environment.Sequencing`  
**Assembly:** `Nalix.Environment`

`SequenceCounter` (`src/Nalix.Environment/Sequencing/SequenceCounter.cs`) is a thread-safe, lock-free 32-bit sequence counter implementing `ISequenceCounter` (`Nalix.Abstractions.Networking.ISequenceCounter`), used for packet ordering, nonce uniqueness, and 32-bit bitmap sliding-window replay validation.

## Source Mapping

- `src/Nalix.Abstractions/Networking/ISequenceCounter.cs`
- `src/Nalix.Environment/Sequencing/SequenceCounter.cs`

## Public Constructors & Methods

| Member | Signature | Description |
| --- | --- | --- |
| `SequenceCounter` | `public SequenceCounter(uint initialValue = 0)` | Initializes the counter starting at `initialValue`. |
| `Next()` | `public uint Next()` | Atomically increments and returns the next `uint` sequence number (`Interlocked.Increment`). |
| `Current()` | `public uint Current()` | Atomically reads the current sequence number (`Volatile.Read`). |
| `IsValid` | `public bool IsValid(uint? receivedSeq, uint window = 0)` | Returns `true` if `receivedSeq` is ahead of `Current()` or within the allowed trailing `window` (up to `MaxBitmapWindow = 32` using a 32-bit replay bitmap). |
| `UpdateTo` | `public void UpdateTo(uint receivedSeq)` | Atomically updates the counter and sliding-window replay bitmap with `receivedSeq`. |
| `ResumeFrom` | `public void ResumeFrom(uint lastKnownSeq, uint safetyGap = 1000)` | Restores the counter after session resumption to `lastKnownSeq + safetyGap` to prevent nonce reuse across disconnects. |
| `IsApproachingOverflow` | `public bool IsApproachingOverflow(uint margin = 1_000_000)` | Returns `true` when `Current() >= uint.MaxValue - margin`, signaling that session key rotation (`SESSION_REKEY`) should be triggered. |
| `Reset` | `public void Reset(uint newValue = 0)` | Resets the counter and replay bitmap to `newValue` (must only be called alongside a cryptographic key rotation). |

## Usage Example

```csharp
using Nalix.Environment.Sequencing;

SequenceCounter outbound = new(initialValue: 0);
uint seq = outbound.Next(); // 1

if (outbound.IsApproachingOverflow(margin: 1_000_000))
{
    // Trigger mid-session key rotation (SESSION_REKEY) before 32-bit wrap-around
}
```

## Related APIs

- [AEAD & Envelope Encryption](../security/aead-and-envelope.md)
- [Session Resumption Protocol](../security/session-resume.md)
- [Connection Contracts (ITransportSequencer)](../abstractions/connection-contracts.md)
