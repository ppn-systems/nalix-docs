# 📦 Nalix.Shared

Shared packet frames, registry, and serializers used by both SDK and Network.

### 🧭 Purpose
- Define built-in frames (controls/text).
- Build an immutable packet registry with zero-allocation lookups.
- Provide the base `PacketRegistryFactory` used everywhere else.

### 🧩 Key components
- `PacketRegistryFactory` — scans packet types and binds deserialize function pointers.
- `PacketRegistry` — frozen catalog of deserializers/transformers.
- `Handshake` — control frame used to establish shared secret and protocol flags.
- `Control` / `Directive` / `Text256/512/1024` — built-in frame types.

```csharp
// Build and register the shared catalog
PacketRegistryFactory factory = new();
IPacketRegistry registry = factory.CreateCatalog();
InstanceManager.Instance.Register(registry);

// Handshake frame
Handshake hs = new(0, Csprng.GetBytes(32));
await client.SendAsync(hs.Serialize());
```

### 🔁 Registry build flow
- Add assemblies or namespaces if you have custom packets.
- Call `CreateCatalog()` once; reuse the result in listeners and clients.

```csharp
PacketRegistryFactory factory = new();
factory.AddNamespace("MyApp.Packets", recursive: true);
IPacketRegistry catalog = factory.CreateCatalog();
```
