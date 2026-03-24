# Troubleshooting

Common failures and quick fixes.

## Handshake fails

- **Symptom:** client disconnects right after connect.
- **Check:** same `PacketRegistryFactory` and `Algorithm`; secret not null in logs.
- **Fix:** regenerate secret with `Csprng.GetBytes`; share one catalog for listener + client.

## Ping/Pong timeout

- **Symptom:** `PingAsync` throws timeout.
- **Check:** network port/firewall, `EnableTimeout` in `NetworkSocketOptions`.
- **Fix:** raise timeout; ensure listener `Activate()` before client connects.

## Timeout wheel closes connection

- **Symptom:** connection drops after idle seconds.
- **Check:** `TimingWheelOptions.MaxTimeout`.
- **Fix:** increase `MaxTimeout` or disable `EnableTimeout` in dev.

## Rate limited

- **Symptom:** rejects logged by `PolicyRateLimiter`/`TokenBucket`.
- **Check:** current rules vs actual traffic.
- **Fix:** bump `Capacity`/`RefillPerSecond` or add a rule for trusted clients.

## No packets reach handlers

- **Symptom:** silent server, no handler logs.
- **Check:** handler `[PacketOpcode]` matches client; catalog registered.
- **Fix:** call `PacketRegistryFactory().CreateCatalog()` once and register in `InstanceManager`.

## Need fast diagnostics

- Call `GenerateReport()` on `TcpListenerBase` or `Protocol` for live snapshot.
- Temporarily set logger `MinLevel=Debug` to trace packet flow.
