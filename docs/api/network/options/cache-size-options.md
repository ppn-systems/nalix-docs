# Cache Size Options

This page covers `CacheSizeOptions`, the receive-side cache sizing configuration in `Nalix.Network.Configurations`.

## Source mapping

- `src/Nalix.Network/Configurations/CacheSizeOptions.cs`

## Main type

- `CacheSizeOptions`

## Purpose

`CacheSizeOptions` controls how many incoming frames can be buffered before processing.

It currently exposes one main property:

- `Incoming`

## Incoming

`Incoming` is the maximum number of incoming cache entries the runtime should keep buffered.

Source details:

- default value: `100`
- validated range: `10` to `1_000_000`
- backed by data annotations

## Validation

`Validate()` runs standard data-annotation validation and throws when values fall outside the declared limits.

## Basic usage

```csharp
CacheSizeOptions cache = ConfigurationManager.Instance.Get<CacheSizeOptions>();
cache.Validate();
```

## When to tune it

Raise `Incoming` when:

- your server sees short bursts faster than the dispatch path can immediately drain
- you want more headroom before backpressure or drops show up

Keep it conservative when:

- memory pressure matters more than burst tolerance
- your normal load profile is already stable with the defaults

## Related APIs

- [Network Options](./options.md)
- [Dispatch Options](./dispatch-options.md)
- [Packet Dispatch](../../routing/packet-dispatch.md)
- [Socket Connection](../runtime/socket-connection.md)
