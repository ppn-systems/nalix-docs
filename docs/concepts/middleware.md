# 🧠 Middleware Pipeline

This package provides core attributes to control middleware ordering, execution stages, and pipeline-managed transformations in any .NET backend/server using a middleware pipeline (e.g., `MiddlewarePipeline<TPacket>`).  
These attributes let you concisely control where, when, and how your middleware gets invoked — without manual pipeline wiring.

## ✨ Key Features

- **Middleware Staging:**  
  Supports three middleware execution stages:
  - **Inbound:** Pre-handler processing (validation, rate limit, security, unwrap, etc.)
  - **Outbound:** Post-handler transforms (wrap, audit, etc. — executed in reverse order)
  - **OutboundAlways:** Always runs after handler, even if cancelled/error occurs

- **Flexible Ordering:**  
  Attribute-driven ordering via `[MiddlewareOrder]` and `[MiddlewareStage]` for full control

- **Composable & Thread-Safe:**  
  Register, clear, and reorder middleware at runtime; snapshot-based execution for zero locking during hot-paths

- **Configurable Error Handling:**  
  Catch middleware exceptions, choose to continue or abort the chain, pluggable error logger/handler

- **Reusable for All Packet Types:**  
  Works with any packet/business object type (`IPacket`, or custom DTO), and any server scenario

- **Easy Integration:**  
  Use as a standalone lib or drop into protocol processing path

---

## 🧭 Usage Example

```csharp
// Register your middleware components (inbound, outbound, transform, etc)
var pipeline = new MiddlewarePipeline<IPacket>();
pipeline.Use(new UnwrapPacketMiddleware());
pipeline.Use(new PermissionMiddleware());
pipeline.Use(new ConcurrencyMiddleware());
pipeline.Use(new RateLimitMiddleware());
pipeline.Use(new TimeoutMiddleware());
pipeline.Use(new WrapPacketMiddleware()); // Outbound

// Configure global error handling behavior
pipeline.ConfigureErrorHandling(
    continueOnError: true,
    errorHandler: (ex, type) => logger.Error($"MW error in {type.Name}: {ex}")
);

// When handling a request:
await pipeline.ExecuteAsync(
    context,              // PacketContext<TPacket> with all connection/packet info
    async ct => { await MyHandler(context.Packet, ct); },  // Final business handler
    cancellationToken     // Cancellation
);
```

---

## 📄 Middleware Implementation Contract

Implement a middleware as below (example: Permission check):

```csharp
[MiddlewareOrder(-50)]
[MiddlewareStage(MiddlewareStage.Inbound)]
public class PermissionMiddleware : IPacketMiddleware<IPacket>
{
    public async Task InvokeAsync(
        PacketContext<IPacket> context,
        Func<CancellationToken, Task> next)
    {
        if (context.Attributes.Permission is null
            || context.Attributes.Permission.Level <= context.Connection.Level)
        {
            await next(context.CancellationToken);
            return;
        }

        // Optionally: send a fail message, log, etc...
    }
}
```

---

## 🧩 Attribute-Driven Ordering & Staging

- **[MiddlewareOrder(N)]**: Set execution order (lower runs first for inbound, last for outbound)
- **[MiddlewareStage(Inbound|Outbound|Both, AlwaysExecute = ...)]**: Bind to pipeline stages

Middleware order is automatically resolved and cached for runtime performance.

---

## 🧰 Supported Middleware Examples

| Middleware                | Stage        | Use-case                                     |
|---------------------------|--------------|----------------------------------------------|
| `UnwrapPacketMiddleware`  | Inbound      | Decrypt/decompress incoming data             |
| `PermissionMiddleware`    | Inbound      | Permission/auth guard                        |
| `ConcurrencyMiddleware`   | Inbound      | Dynamic request throttling                   |
| `RateLimitMiddleware`     | Inbound      | Global/IP/attribute-driven rate limits       |
| `TimeoutMiddleware`       | Inbound      | Per-packet/handler timeout+fail response     |
| `WrapPacketMiddleware`    | Outbound     | Encrypt/compress outgoing data               |

---

## 🛡️ Error Handling

Configure whether to abort or continue on exception in any middleware. Plug in a custom logger:

```csharp
pipeline.ConfigureErrorHandling(
    continueOnError: false, // Or true to log and skip faulty MW
    errorHandler: (ex, type) => Log.Error($"[Middleware {type.Name}] {ex}")
);
```

---

## 🚀 Extending / Advanced Usage

- Write custom middleware for: A/B testing, metrics, request manipulation, legacy/modern protocol handling, device policies, circuit breaking, etc.
- Use `Clear()` to remove all middleware and re-register chains dynamically.
- All state is lock-free during execution for high-throughput server deployments.

---

## 🏷️ Available Attributes

### 1. `MiddlewareOrderAttribute`

Marks the execution **priority/order** of a middleware class in the pipeline.

```csharp
[MiddlewareOrder(50)]
public class MyBusinessMiddleware : IPacketMiddleware<IPacket> { ... }
```

- **Order value meaning:**
  - **Lower = earlier in inbound, later in outbound.**
  - Negative: executes before default (e.g., security, unwrapping)
  - Zero: default order
  - Positive: executes after default (e.g., limits, post-processing)

| Order Value | Common Use Case                                   |
|-------------|---------------------------------------------------|
| -100        | Critical pre-processing (unwrapping, decryption)  |
| -50         | Security/authentication checks                    |
| 0           | Default logic                                     |
| 50          | Business, throttling, rate/concurrency limits     |
| 100         | Post-processing (wrapping, encryption)            |

---

### 2. `MiddlewareStageAttribute`

Indicates **which stage** (inbound, outbound, both) this middleware should run in the pipeline.

```csharp
[MiddlewareStage(MiddlewareStage.Inbound)]
public class AuthGuardMiddleware : IPacketMiddleware<IPacket> { ... }

[MiddlewareStage(MiddlewareStage.Outbound, AlwaysExecute = true)]
public class AuditLogMiddleware : IPacketMiddleware<IPacket> { ... }
```

- **Inbound:** Executed *before* the main handler (verification, unwrapping)
- **Outbound:** Executed *after* handler (logging, wrapping)
- **Both:** Included in both stages

#### `AlwaysExecute` (for Outbound)

- By default, outbound middleware can be **skipped** if packet context signals `SkipOutbound`.
- `AlwaysExecute = true`: Middleware always runs, even if outbound phase is being skipped (e.g., for auditing, hard security policy).

---

### 3. `PipelineManagedTransformAttribute`

```csharp
[PipelineManagedTransform]
public class RawPassthroughPacket : IPacket { ... }
```

- **Purpose:**  
  Marks a packet type as “handled by pipeline,” not by its own per-type transformer logic.  
  Catalog builder skips auto-binding transformer methods for these.
- **Use Case:**  
  For message types that *must not* be transformed by the traversal logic (e.g., raw system/control packets, pipeline-managed records).

---

## Enum: `MiddlewareStage`

Enum values for the above attribute:

```csharp
public enum MiddlewareStage : byte
{
    Inbound = 0,
    Outbound = 1,
    Both = 2
}
```

---

## ✅ Best Practices

- Always annotate your middleware with both `[MiddlewareOrder]` and `[MiddlewareStage]` for predictable execution.
- Use negative orders for critical security rules and protocol unwrapping.  
- Use positive orders for limits, logs, or post-processing wrappers.
- Use `AlwaysExecute` for mandatory outbound steps (compliance logging, etc).

---

## 🧪 Example: Complete Custom Middleware

```csharp
[MiddlewareOrder(-50)]
[MiddlewareStage(MiddlewareStage.Inbound)]
public class PermissionMiddleware : IPacketMiddleware<IPacket>
{
    public async Task InvokeAsync(PacketContext<IPacket> context, Func<CancellationToken, Task> next)
    {
        // ...permission logic here
        await next(context.CancellationToken);
    }
}
```

---

## 🧠 CustomAttributes in Metadata

The `CustomAttributes` feature allows dynamic extensions of packet metadata to add additional handler-specific properties beyond standard attributes such as `Timeout`, `Permission`, or `Encryption`. This is especially useful for advanced use cases like:

- Supporting **third-party systems**.
- **Experimental features** without modifying primary metadata structures.
- Adding **tags or flags** specific to business logic.

### 🔧 How to Use CustomAttributes

1. **Add Custom Attribute to the Builder**  
   During metadata creation, use `PacketMetadataBuilder.Add` to add custom attributes dynamically. Example:

   ```csharp
   builder.Add(new PacketRateLimitAttribute(requestsPerSecond: 50));
   builder.Add(new ExampleCustomAttribute("Version", "v1.1"));
   ```

2. **Get Custom Attribute**  
   Retrieve custom attributes during pipeline execution using `PacketMetadata.GetCustomAttribute<T>`. Example:

   ```csharp
   var versionAttribute = metadata.GetCustomAttribute<ExampleCustomAttribute>();
   if (versionAttribute != null)
   {
       Console.WriteLine($"Packet Version: {versionAttribute.Value}");
   }
   ```

### Full CustomAttributes Example

Here’s an end-to-end example demonstrating the definition and usage of `CustomAttributes`:

#### 🪪 Step 1: Define a Custom Attribute  

You can define your custom attribute class:

```csharp
public class PacketTagAttribute : Attribute
{
    public string Tag { get; }

    public PacketTagAttribute(string tag)
    {
        Tag = tag;
    }
}
```

#### 🧷 Step 2: Attach Custom Attributes in Metadata Provider  

Use `IPacketMetadataProvider` to assign your custom attributes dynamically for packets:

```csharp
public class ExampleMetadataProvider : IPacketMetadataProvider
{
    public void Populate(MethodInfo method, PacketMetadataBuilder builder)
    {
        // Assign a custom tag attribute
        builder.Add(new PacketTagAttribute("Experimental"));

        // Add more optional attributes based on the method
        if (method.Name == "HandleCritical")
        {
            builder.Add(new PacketTagAttribute("Critical"));
        }
    }
}
```

#### 🔎 Step 3: Retrieve Custom Attributes During Execution  

Access and process the custom attributes during middleware execution:

```csharp
[MiddlewareOrder(-25)]
[MiddlewareStage(MiddlewareStage.Inbound)]
public class LogPacketTagMiddleware : IPacketMiddleware<IPacket>
{
    public async Task InvokeAsync(PacketContext<IPacket> context, Func<CancellationToken, Task> next)
    {
        var builder = new PacketMetadataBuilder();
        foreach (var provider in PacketMetadataProviders.Providers)
        {
            provider.Populate(context.Method, builder);
        }

        // Build metadata
        var metadata = builder.Build();

        // Log custom attributes (e.g., PacketTag)
        var tag = metadata.GetCustomAttribute<PacketTagAttribute>()?.Tag;
        if (tag != null)
        {
            Console.WriteLine($"Processing packet with Tag: {tag}");
        }

        // Continue the pipeline
        await next(context.CancellationToken);
    }
}
```

---

### 🎯 CustomAttributes Use Cases

Here are some practical examples leveraging `CustomAttributes`:

| Use Case                        | Attribute                                                   | Example                                   |
|---------------------------------|-------------------------------------------------------------|-------------------------------------------|
| **Tagging packets**             | `PacketTagAttribute`                                        | Add tags like "HighPriority" or "System"  |
| **Packet versioning**           | `PacketVersionAttribute`                                    | Track experimental packet versions        |
| **Third-party integrations**    | `PacketExternalSystemAttribute` (link to external tool ID)  | Integrate with external analytics tools   |
| **Tracing/Diagnostics**         | Add unique diagnostic flags                                 | Debugging server message paths            |

---

### ✅ Best Practices for CustomAttributes

- Use `CustomAttributes` for extending existing metadata **without breaking core functionality**.
- Dynamically add attributes using `PacketMetadataBuilder.Add()` in combination with specific `MethodInfo` metadata.
- Always include a fallback mechanism in case a `CustomAttribute` is missing while retrieving it.

---
