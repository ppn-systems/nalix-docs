# 🚀 Getting Started

## Requirements

- .NET 8 SDK or later.
- Access to the configuration directory (`%ProgramData%\Nalix\config\default.ini` on Windows or `$XDG_DATA_HOME/Nalix/config/default.ini` on Linux) so the framework can read `NetworkSocketOptions`, `TransportOptions`, and other shared settings.
- A packet registry file or in-code packet registration to ensure both client and server agree on op codes and encryption metadata.

## Install via NuGet

```bash
dotnet add package Nalix.SDK
```

The SDK package brings together client helpers, localization, and transport builders. When you depend on the server stack as well, add `Nalix.Network`, `Nalix.Logging`, `Nalix.Common`, and `Nalix.Framework` individually so you only ship what you need.

### Bootstrap the client

```csharp
InstanceManager.Instance.Register<ILogger>(NLogix.Host.Instance);
PacketRegistry packetRegistry = new PacketRegistryFactory().CreateCatalog();
InstanceManager.Instance.Register<IPacketRegistry>(packetRegistry);

TransportOptions options = ConfigurationManager.Instance.Get<TransportOptions>();
options.Address = "localhost";
options.Port = 12345;

IoTTcpSession client = new();
await client.ConnectAsync();

Handshake handshake = new(opCode: 0, secret: Csprng.GetBytes(32));
await client.SendAsync(handshake.Serialize());
```

This snippet mirrors the SDK example: register logging and packet catalog with `InstanceManager`, so transports, middleware, and protocols share the same dependencies.

!!! note "Transport configuration"
    `TransportOptions` controls timeouts, reconnection, buffer sizing, compression, and the default cipher suite (`CipherSuiteType.CHACHA20_POLY1305`). Update this section in `default.ini` or programmatically before calling `ConnectAsync` to tune latency or enable unconditional encryption.
