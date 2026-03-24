# 🔌 Security & Policies

Cipher choices, backpressure policies, and validation options.

### 🔐 Cipher suites
Choose a suite that both client and listener support.

**Responsibilities**
- Select a cipher for sessions.
- Keep choices consistent across components.

**Key Components**
- `CipherSuiteType`
- `TransportOptions.Algorithm`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Algorithm = CipherSuiteType.CHACHA20_POLY1305;
```

### ⚖️ Drop policies
Control what happens when queues are full.

**Responsibilities**
- Apply backpressure rules.
- Protect the hub from overload.

**Key Components**
- `DropPolicy`
- `ConnectionHubOptions`

```csharp
ConnectionHubOptions hub = ConfigurationManager.Instance.Get<ConnectionHubOptions>();
hub.DropPolicy = DropPolicy.DROP_OLDEST;
```

### ⏱️ Timeouts and limits
Use options to cap connect time and packet sizes.

**Responsibilities**
- Enforce connect and request timeouts.
- Limit packet sizes.

**Key Components**
- `TransportOptions.ConnectTimeoutMillis`
- `TransportOptions.MaxPacketSize`
- `PacketTimeoutAttribute`

```csharp
TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.ConnectTimeoutMillis = 7000;
options.MaxPacketSize = 65536;
```
