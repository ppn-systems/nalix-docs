# Middleware Recipes (Based on Nalix Throttling Components)

This guide maps common needs to the actual Nalix middleware/limiters and shows correct setup drawn from the Nalix.Network throttling docs.

## When to use what
- **ConnectionLimiter** — guard accepts: per-IP concurrent cap + ban window for connect floods.
- **TokenBucketLimiter** — per-endpoint token bucket; smooths sustained traffic with soft/hard lockout.
- **PolicyRateLimiter** — per-handler tiered RPS/burst via `[PacketRateLimit]`; shares limiters across tiers.
- **ConcurrencyGate** — per-OpCode concurrency slots with optional FIFO queue and circuit breaker.

## Typical ordering (accept → dispatch)
1) `ConnectionLimiter` (before/at accept)  
2) `TokenBucketLimiter` or `PolicyRateLimiter` (ingress rate)  
3) `ConcurrencyGate` (in-flight handler cap)  
4) Business handlers

## ConnectionLimiter (accept protection)
```csharp
var connOpts = ConfigurationManager.Instance.Get<ConnectionLimitOptions>();
connOpts.Validate();
var limiter = new ConnectionLimiter(connOpts);

if (!limiter.IsConnectionAllowed(remoteEndPoint)) return; // reject/bounce
connection.OnCloseEvent += limiter.OnConnectionClosed;
```
- Use for DDoS bursts; bans when attempts/window exceeded; cleanup via internal TaskManager job.

## TokenBucketLimiter (per-endpoint tokens)
```csharp
var tbOpts = ConfigurationManager.Instance.Get<TokenBucketOptions>();
var limiter = new TokenBucketLimiter(tbOpts);
var decision = limiter.Check(endpoint);
if (!decision.Allowed) { /* send retry-after using decision.RetryAfterMs */ return; }
```
- Good for steady streams; supports soft throttle, hard lockout, max tracked endpoints, cleanup/eviction.

## PolicyRateLimiter (per-handler RPS tiers)
```csharp
[PacketRateLimit(8, burst: 2.5)]
public async Task HandleChat(ChatPacket p, IConnection c) { ... }

var prl = new PolicyRateLimiter(new PolicyRateLimiterOptions(maxPolicies: 64));
var decision = prl.Check(opCode, packetContext);
if (!decision.Allowed) { /* reject or retry-after */ return; }
```
- RPS/burst values are rounded up to fixed tiers (RPS: 1–128; Burst: 0.1–64). Policies auto-evict when idle.

## ConcurrencyGate (per-OpCode slots)
```csharp
[PacketConcurrencyLimit(4, queue: true, queueMax: 32)]
public async Task HandleUpload(UploadPacket pkt, IConnection conn) { ... }
```
or imperatively:
```csharp
using var lease = await concurrencyGate.EnterAsync(opCode,
    new PacketConcurrencyLimitAttribute(4, queue: true, queueMax: 32),
    ct);
// do work
```
- Queue optional; circuit breaker opens if rejection rate >95% with enough samples; cleanup removes idle opcode state.

## Diagnostics
- `ConnectionLimiter.GenerateReport()` → top endpoints, reject rate, bans.
- `TokenBucketLimiter.GenerateReport()` → credit, blocked endpoints, retry-after.
- `PolicyRateLimiter.GenerateReport()` → active policies, tier usage.
- `ConcurrencyGate.GenerateReport()` → per-opcode load, queue, circuit status.

## Tuning tips
- Keep `MaxTrackedEndpoints` (token bucket) and `MaxPolicies` (policy limiter) bounded to avoid RAM blowup.
- For bursty but acceptable latency, enable queueing in `ConcurrencyGate`; for expensive ops, set `queue: false` (fail fast).
- Align handler attributes: `[PacketRateLimit]` for rate, `[PacketConcurrencyLimit]` for in-flight slots.
- Always wire `OnConnectionClosed` for `ConnectionLimiter` so counts drop correctly.
