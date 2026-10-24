---
title: DispatchOptions
description: Reference for Nalix.Runtime.Options.DispatchOptions — per-connection queue bounds, drop policy, weighted round-robin priority weights, and bucket sizing.
section: API Reference
package: Nalix.Runtime
---

**Namespace:** `Nalix.Runtime.Options`  
**Assembly:** `Nalix.Runtime`

`DispatchOptions` (`public sealed partial class DispatchOptions : ConfigurationLoader, IValidatableConfiguration`) controls per-connection mailbox capacities, overflow drop policy, priority weights, and sharded bucket sizing inside `DispatchChannel<TPacket>`.

## Source Mapping

- `src/Nalix.Runtime/Options/DispatchOptions.cs`
- `src/Nalix.Runtime/Internal/Routing/DispatchChannel.cs`

## Properties

Loaded from the `[Dispatch]` section of `default.ini` via `ConfigurationManager.Instance.Get<DispatchOptions>()`:

| Property | Type | Default | Validation | Description |
| :--- | :--- | :---: | :--- | :--- |
| `MaxPerConnectionQueue` | `int` | `4096` | `[ValueRange(0, 1_048_576)]` | Maximum queued packets allowed for a single connection (`0` = unlimited, not recommended for production). |
| `DropPolicy` | `DropPolicy` | `DropPolicy.DropNewest` | `[AllowedEnum]` | Overflow strategy when a connection's queue reaches `MaxPerConnectionQueue` (`DropNewest`, `DropOldest`, `Coalesce`, or `Block`). |
| `BlockTimeout` | `TimeSpan` | `1000 ms` (`00:00:01`) | `>= TimeSpan.Zero` | Maximum wait duration for blocking `Push` calls when `DropPolicy == DropPolicy.Block` (`PacketDispatchChannel.HandlePacket` uses `noBlock: true`). |
| `PriorityWeights` | `string` | `"1,2,4,8,16"` | Exactly 5 positive comma-separated `int` values | Weighted round-robin budgets for `[NONE, LOW, MEDIUM, HIGH, URGENT]`. |
| `BucketCountMultiplier` | `int` | `64` | `[ValueRange(1, 1024)]` | Multiplier applied to `Environment.ProcessorCount` to size the internal connection-state hash bucket array. |
| `MinBucketCount` | `int` | `256` | `[ValueRange(1, 65536)]`, `<= MaxBucketCount` | Lower bound on internal connection-state hash buckets (rounded up to a power of two). |
| `MaxBucketCount` | `int` | `16384` | `[ValueRange(1, 1048576)]`, `>= MinBucketCount` | Upper bound on internal connection-state hash buckets (rounded up to a power of two). |

## Validation Rules (`Validate()`)

`Validate()` runs DataAnnotation attribute checks (`[ValueRange]`, `[AllowedEnum]`) and then enforces:

1. `MinBucketCount <= MaxBucketCount`.
2. `PriorityWeights` is non-empty and splits into **exactly 5** positive integers corresponding to `PacketPriority.NONE`, `LOW`, `MEDIUM`, `HIGH`, and `URGENT`.
3. `BlockTimeout >= TimeSpan.Zero`.

## Usage Example

```csharp
using System;
using Nalix.Abstractions.Security;
using Nalix.Runtime.Options;

DispatchOptions options = new()
{
    MaxPerConnectionQueue = 1024,
    DropPolicy = DropPolicy.DropNewest,
    BlockTimeout = TimeSpan.FromMilliseconds(500),
    PriorityWeights = "1,2,4,8,16",
    MinBucketCount = 256,
    MaxBucketCount = 16384
};

options.Validate();
```

## Related APIs

- [Packet Dispatch (PacketDispatchChannel)](../../runtime/routing/packet-dispatch.md)
- [Dispatch Channel and Router](../../runtime/routing/dispatch-channel-and-router.md)
- [Packet Dispatch Options](./packet-dispatch-options.md)
