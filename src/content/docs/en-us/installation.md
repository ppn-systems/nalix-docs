---
title: Installation
description: This page explains how to select the right Nalix packages for your project and verify that your environment meets the prerequisites.
section: Start Here
---

This page explains how to select the right Nalix packages for your project and verify that your environment meets the prerequisites.

## Prerequisites

| Requirement | Minimum |
|---|---|
| **.NET SDK** | 10.0 or later ([download](https://dotnet.microsoft.com/download)) |
| **C# language version** | 14 (default with .NET 10) |
| **IDE** | Visual Studio 2026, JetBrains Rider 2025.3+, or VS Code with C# Dev Kit |

## Choose Your Package Set

Install only the packages required for your role. Every package is available on [NuGet](https://www.nuget.org/packages?q=Nalix).

### Server (hosted — recommended)

The hosted server model provides a fluent builder and managed lifecycle. This is the recommended starting point for new projects.

```bash
dotnet add package Nalix.Hosting
```

`Nalix.Hosting` transitively references `Nalix.Network`, `Nalix.Runtime`, `Nalix.Framework`, `Nalix.Codec`, `Nalix.Environment`, and `Nalix.Abstractions`.

### Server (manual wiring)

If you need full control over startup order without the hosting builder:

```bash
dotnet add package Nalix.Network
dotnet add package Nalix.Runtime
dotnet add package Nalix.Framework
dotnet add package Nalix.Codec
dotnet add package Nalix.Environment
dotnet add package Nalix.Abstractions
```

### Client

```bash
dotnet add package Nalix.SDK
```

`Nalix.SDK` transitively references `Nalix.Codec`, `Nalix.Environment`, and `Nalix.Abstractions`.

### Shared contracts

If your packet definitions live in a separate assembly:

```bash
dotnet add package Nalix.Abstractions
dotnet add package Nalix.Codec
```

### Summary

| Scenario | Packages |
|---|---|
| Hosted server | `Nalix.Hosting` |
| Manual server | `Nalix.Network`, `Nalix.Runtime`, `Nalix.Framework`, `Nalix.Codec`, `Nalix.Environment`, `Nalix.Abstractions` |
| Client | `Nalix.SDK` |
| Shared contracts | `Nalix.Abstractions`, `Nalix.Codec` |
| Full stack | Server set + Client set, sharing one contracts assembly |

## Multi-Project Solutions

If you split contracts, server, and client into separate projects (see the [Quick Start](./quickstart.md) for the layout), pin the Nalix package version once in a root `Directory.Build.props` instead of repeating it per project — this prevents version drift between your server and client:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <NalixVersion>$(VersionFromYourReleasePlan)</NalixVersion>
  </PropertyGroup>
</Project>
```

When upgrading, bump `NalixVersion`, clear `obj`/`bin` if source-generated contracts changed, then `dotnet build` to confirm every project is aligned.

## Configuration File

When using `Nalix.Hosting`, `Bootstrap.Initialize()` sets `NALIX_BASE_PATH` to `AppContext.BaseDirectory` and automatically generates `data/config/server.ini` on first launch (standalone `ConfigurationManager.Instance` defaults to `default.ini` inside `Directories.ConfigurationDirectory`). Section headers automatically strip the `Options` suffix from `ConfigurationLoader` class names:

```ini
[NetworkSocket]
Port=57206
Backlog=512

[Dispatch]
MaxPerConnectionQueue=4096
DropPolicy=DropNewest
BlockTimeout=00:00:01

[Transport]
Address=127.0.0.1
Port=57206
ConnectTimeoutMillis=30000
BufferSize=65536
```

:::note[Dispatch loop scaling]
Worker-loop count is configured on `PacketDispatchOptions<TPacket>` (`Nalix.Runtime.Routing`) in code via `WithDispatchLoopCount(...)`.
Use `WithDispatchLoopCount(null)` to keep auto-scaling behavior.
Note: `PacketDispatchOptions<TPacket>` (handler/middleware config) is a different type from `DispatchOptions` (queue bounds and drop policy).
:::

## Validate Options at Startup

When resolving an options class via `ConfigurationManager.Instance.Get<TOptions>()`, Nalix automatically invokes `Validate()` if `TOptions` implements `IValidatableConfiguration` (such as `NetworkSocketOptions`, `PoolingOptions`, `TokenBucketOptions`, and `HostingOptions`) and runs source-generated data-annotation checks (`[ValueRange]`, `[Length]`, `[Required]`):

```csharp
using Nalix.SDK.Options;
using Nalix.Network.Options;
using Nalix.Environment.Configuration;

// Server: loads [NetworkSocket] and automatically validates IValidatableConfiguration
NetworkSocketOptions socket = ConfigurationManager.Instance.Get<NetworkSocketOptions>();

// Client: loads [Transport] and validates [ValueRange] / [Length] annotations
TransportOptions transport = ConfigurationManager.Instance.Get<TransportOptions>();
```

## What to Read Next

- [Quick Start](./quickstart.md) — build your first client/server pair
- [Packages Overview](./packages/index.md) — what each package provides and how the 5 dependency levels layer on each other
- [Configuration Concept Guide](./concepts/configuration.md) — how `.ini` binding and hot-reload work
