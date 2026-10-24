---
title: Protocol
description: Tham chiếu cho Nalix.Network.Protocols.Protocol — lớp cơ sở trừu tượng cho protocol phía máy chủ, định nghĩa đóng khung, trích xuất opcode, xử lý khung và các hook vòng đời kết nối.
section: API Reference
package: Nalix.Network
---

**Namespace:** `Nalix.Network.Protocols`  
**Assembly:** `Nalix.Network`

`Protocol` (`public abstract partial class Protocol : IProtocol`) là lớp cơ sở trừu tượng mà `TcpListenerBase`, `UdpListenerBase` và `WebSocketListenerBase` sử dụng. Nó định nghĩa quy trình chấp nhận kết nối (`OnAccept`, `ValidateConnection`), lựa chọn kiểu đóng khung trên dây (`Framing`), các hook biến đổi và trích xuất opcode đầu vào (`FrameProcessor`, `OpCodeExtractor`), xử lý gói tin (`ProcessMessage`, `PostProcessMessage`), và số liệu lỗi/gói tin ở mức protocol.

## Nguồn mã

- `src/Nalix.Abstractions/Networking/IProtocol.cs`
- `src/Nalix.Network/Protocols/Protocol.Core.cs`
- `src/Nalix.Network/Protocols/Protocol.PublicMethods.cs`
- `src/Nalix.Network/Protocols/Protocol.Lifecycle.cs`
- `src/Nalix.Network/Protocols/Protocol.Metrics.cs`

## Vòng đời và pipeline xử lý gói tin

```mermaid
flowchart TD
    subgraph AcceptPhase["1. Connection Acceptance (OnAccept)"]
        NewConn["Accepted IConnection"] --> CheckAcc{"IsAccepting?"}
        CheckAcc -->|No| Disc["connection.Disconnect()"]
        CheckAcc -->|Yes| Val{"ValidateConnection(connection)?"}
        Val -->|No| Disc
        Val -->|Yes| Frame["connection.TCP.UseFraming(Framing)"]
        Frame --> Begin["connection.TCP.BeginReceive(ct)"]
    end

    subgraph MessagePhase["2. Inbound Message Loop"]
        Begin --> Inbound["Listener Transforms Frame via FrameProcessor"]
        Inbound --> Proc["ProcessMessage(sender, args) (Abstract)"]
        Proc --> Post["PostProcessMessage(sender, args)"]
        Post --> Hook["OnPostProcess(args) + Increment TotalMessages"]
        Hook --> Keep{"KeepConnectionOpen?"}
        Keep -->|No| Disc
        Keep -->|Yes| Next["Await Next Frame"]
    end
```

## Thành phần công khai và protected

```csharp
namespace Nalix.Network.Protocols;

public abstract partial class Protocol : IProtocol
{
    // Abstract contracts required from derived protocols
    public abstract IFrameProcessor FrameProcessor { get; }
    public abstract IOpCodeExtractor OpCodeExtractor { get; }
    public abstract void ProcessMessage(object? sender, IConnectionEventArgs args);

    // Configurable properties
    public virtual TransportFraming Framing { get; set; } = TransportFraming.UInt16LengthPrefixed;
    public virtual bool KeepConnectionOpen { get; protected set; }
    public bool IsAccepting { get; protected set; }

    // Metrics
    public ulong TotalMessages { get; }
    public ulong TotalErrors { get; }

    // Lifecycle & execution methods
    public virtual void OnAccept(IConnection connection, CancellationToken cancellationToken = default);
    public void PostProcessMessage(object? sender, IConnectionEventArgs args);
    public void SetConnectionAcceptance(bool isEnabled);

    // Protected extensibility hooks
    protected virtual bool ValidateConnection(IConnection connection) => true;
    protected virtual void OnPostProcess(IConnectionEventArgs args);
    protected virtual void OnConnectionError(IConnection connection, Exception exception);
    protected virtual void Dispose(bool disposing);

    // Diagnostics & disposal
    public virtual string GenerateReport();
    public virtual void WriteReportData(Utf8JsonWriter writer);
    public void Dispose();
}
```

## Tự triển khai `Protocol`

Khi dùng `Nalix.Hosting` (`builder.MapTcp<MyProtocol>(port)`), bạn chỉ cần triển khai `ProcessMessage` nếu kế thừa lớp protocol của hosting, hoặc cung cấp `FrameProcessor` (`FramePipeline.Instance`) và `OpCodeExtractor` (`NativeOpCodeExtractor.Instance`):

```csharp
using Nalix.Abstractions.Networking;
using Nalix.Abstractions.Networking.Packets;
using Nalix.Abstractions.Networking.Protocols;
using Nalix.Codec.Classifiers;
using Nalix.Codec.Transforms;
using Nalix.Network.Protocols;
using Nalix.Runtime.Dispatching;

public sealed class GameProtocol(IPacketDispatch dispatcher) : Protocol
{
    public override IFrameProcessor FrameProcessor => FramePipeline.Instance;
    public override IOpCodeExtractor OpCodeExtractor => NativeOpCodeExtractor.Instance;

    public GameProtocol(IPacketDispatch dispatcher, bool keepOpen = true) : this(dispatcher)
    {
        this.KeepConnectionOpen = keepOpen;
        this.IsAccepting = true;
    }

    public override void ProcessMessage(object? sender, IConnectionEventArgs args)
    {
        if (args.Lease is not null)
        {
            dispatcher.HandlePacket(args.Lease, args.Connection);
        }
    }
}
```

## API liên quan

- [TCP Listener](./tcp-listener.md)
- [UDP Listener](./udp-listener.md)
- [Connection](./connection/connection.md)
- [Packet Dispatch Channel & Router](../runtime/routing/dispatch-channel-and-router.md)
