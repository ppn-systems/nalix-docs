---
title: Blazor WebAssembly
description: Hướng dẫn này kết nối một ứng dụng Blazor WebAssembly chạy trong trình duyệt với máy chủ Nalix qua WebSocket, kèm X25519 handshake đầy đủ. Nội dung bao gồm request/response, server push, kết nối lại và cách đăng ký phiên trong dependency injection (DI).
section: Guides
---

Hướng dẫn này kết nối một ứng dụng **Blazor WebAssembly** chạy trong trình duyệt với máy chủ Nalix qua WebSocket, kèm X25519 handshake đầy đủ. Nội dung bao gồm request/response, server push, kết nối lại và cách đăng ký phiên trong dependency injection (DI).

Mã nguồn đầy đủ: `samples/BlazorWasm`

## Bạn sẽ xây dựng gì

- Một máy chủ Nalix với một endpoint WebSocket (`ws://localhost:57230/ws/`) xử lý yêu cầu echo và phát lại các dòng chat.
- Một ứng dụng Blazor WebAssembly độc lập:
    - giữ một `WebSocketSession` duy nhất trong một singleton DI,
    - gửi yêu cầu echo và chờ phản hồi có kiểu,
    - hiển thị các dòng chat mà server đẩy đến mọi tab,
    - kết nối lại với backoff khi kết nối bị rớt (thử resume trước, sau đó thực hiện handshake đầy đủ).

```text
samples/BlazorWasm/
├── BlazorWasm.Contracts/   # packets, shared by server and browser
├── BlazorWasm.Server/      # Nalix server (console app)
└── BlazorWasm.Client/      # Blazor WebAssembly app
    ├── Services/NalixClient.cs        # the one session + reconnect loop
    ├── Services/NalixClientOptions.cs
    ├── Pages/Home.razor
    └── wwwroot/appsettings.json       # Host / Port / Path / ServerPublicKey
```

## Handshake bảo mật có chạy trong trình duyệt không?

Có. Handshake của Nalix dùng mã X25519, AEAD và băm được quản lý sẵn của chính nó. Nó không gọi `System.Security.Cryptography`, vốn phần lớn không được hỗ trợ trong WebAssembly của trình duyệt. `ConnectAsync` → `HandshakeAsync` cho bạn cùng một phiên mã hóa như trên máy tính để bàn, trong Chromium, Firefox và Safari.

Mẫu này đã được kiểm tra trên Chromium headless, ở cả bản build Debug và bản publish Release đã cắt bớt (trimmed): handshake, echo, phát sóng sang tab thứ hai và kết nối lại sau khi bị rớt.

## 1. Dự án gói tin dùng chung

Đặt các gói tin trong một thư viện lớp thuần mà **cả** server và ứng dụng WASM đều tham chiếu. Trình duyệt chỉ có thể giải tuần tự hóa các kiểu gói tin mà nó biết.

```csharp
// samples/BlazorWasm/BlazorWasm.Contracts/EchoRequestPacket.cs
[GenerateFormatter]
[SerializePackable(SerializeLayout.Explicit)]
public sealed partial class EchoRequestPacket : PacketBase<EchoRequestPacket>, IPacketStaticOpcode
{
    public static ushort StaticOpCode => 0x7301;

    [SerializeOrder(0)]
    public string Text { get; set; } = string.Empty;
}
```

`EchoResponsePacket` (`0x7302`) và `ChatMessagePacket` (`0x7303`) theo cùng mẫu. Dự án contracts chỉ tham chiếu `Nalix.Abstractions` và `Nalix.Codec`, không bao giờ tham chiếu `Nalix.Hosting` hay `Nalix.Network`, nên nó nhỏ gọn và an toàn cho trình duyệt. Dự án cũng đặt `<IsTrimmable>true</IsTrimmable>`.

## 2. Server

```csharp
// samples/BlazorWasm/BlazorWasm.Server/Program.cs
await using NetworkApplication app = NetworkApplication.CreateBuilder()
    .UseLogger(logger)
    .UseSecureConnections()   // X25519 handshake + AEAD
    .UseSystemControl()       // serves PUBLIC_KEY_REQUEST (TOFU), ping, disconnect
    .UseSessions()            // allows resume after a reconnect
    .MapHandlers(typeof(DemoHandlers))
    .MapWebSocket<DefaultProtocol>().OnPort(57230).WithPath("/ws/").Bind()
    .Build();
```

Các handler là handler Nalix thông thường. Transport không tạo ra khác biệt nào đối với chúng:

```csharp
[PacketOpcode(0x7301)]
public static async ValueTask HandleEchoAsync(IPacketContext<EchoRequestPacket> context)
{
    using PacketScope<EchoResponsePacket> lease = PacketFactory<EchoResponsePacket>.Acquire();
    lease.Value.Text = context.Packet.Text.ToUpperInvariant();
    lease.Value.ServerUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    await context.Sender.SendAsync(lease.Value).ConfigureAwait(false);   // → RequestAsync<T> on the client
}

[PacketOpcode(0x7303)]
public static async ValueTask HandleChatAsync(IPacketContext<ChatMessagePacket> context)
{
    IConnectionBroadcaster? hub = InstanceManager.Instance.GetExistingInstance<IConnectionBroadcaster>();
    if (hub is not null)
    {
        await hub.BroadcastAsync(context.Packet).ConfigureAwait(false);  // → On<T> in every tab
    }
}
```

Khi khởi động, server in ra public key của nó (`HandshakeHandlers.ServerPublicKey`). Hãy ghim (pin) khóa đó trong client khi chạy production (xem [Lỗi thường gặp](#lỗi-thường-gặp)).

## 3. Dự án client

```xml
<Project Sdk="Microsoft.NET.Sdk.BlazorWebAssembly">
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly" Version="10.0.9" />
    <PackageReference Include="Microsoft.AspNetCore.Components.WebAssembly.DevServer" Version="10.0.9" PrivateAssets="all" />
    <PackageReference Include="Nalix.SDK" Version="14.3.1" />
  </ItemGroup>
  <ItemGroup>
    <ProjectReference Include="..\BlazorWasm.Contracts\BlazorWasm.Contracts.csproj" />
  </ItemGroup>
  <ItemGroup>
    <!-- Keep every packet + generated formatter when the Release publish trims. -->
    <TrimmerRootAssembly Include="BlazorWasm.Contracts" />
  </ItemGroup>
</Project>
```

Cài đặt kết nối được đặt trong `wwwroot/appsettings.json`. Trình duyệt tải tệp này về, nên nó không được chứa bí mật:

```json
{ "Nalix": { "Host": "localhost", "Port": 57230, "Path": "/ws/", "UseTls": false, "ServerPublicKey": "" } }
```

## 4. Đăng ký phiên trong DI

Một tab trình duyệt chỉ nên giữ **một** kết nối Nalix. Bọc nó trong một service, đăng ký service đó như một singleton, và để các component giao tiếp với service thay vì với `WebSocketSession`.

```csharp
// Program.cs
builder.Services.Configure<NalixClientOptions>(builder.Configuration.GetSection("Nalix"));
builder.Services.AddSingleton<NalixClient>();
```

Trong Blazor WebAssembly, `Singleton` và `Scoped` đều tồn tại suốt vòng đời của tab. `Singleton` thể hiện ý định đó một cách tường minh.

Service tạo phiên và đăng ký nhận gói tin được đẩy **trước khi** kết nối:

```csharp
_session = new WebSocketSession(
    new TransportOptions
    {
        Address = o.Host,
        Port = o.Port,
        ServerPublicKey = string.IsNullOrWhiteSpace(o.ServerPublicKey) ? null : o.ServerPublicKey,
        ConnectTimeoutMillis = 5_000,
        ResumeEnabled = true,
        ResumeFallbackToHandshake = true,
    },
    new WebSocketTransportOptions { Path = o.Path, UseTls = o.UseTls });

// Subscribe before connecting so no push is missed. The packet goes back to the pool
// when the handler returns, so copy its fields out.
_chatSubscription = _session.On<ChatMessagePacket>(p => ChatReceived?.Invoke(new ChatLine(p.Username, p.Message)));
_session.OnDisconnected += OnSessionDisconnected;
```

Việc kết nối là single-flight, nên nhiều component có thể gọi cùng lúc:

```csharp
public async Task EnsureConnectedAsync(CancellationToken ct = default)
{
    if (Status == ConnectionStatus.Connected && _session.IsConnected) return;
    await _connectGate.WaitAsync(ct);
    try
    {
        // ConnectAsync + resume if possible, otherwise HandshakeAsync.
        LastConnectResumed = await _session.ConnectWithResumeAsync(ct: ct);
        SetStatus(ConnectionStatus.Connected);
    }
    finally { _connectGate.Release(); }
}
```

## 5. Gọi từ component

```razor
@page "/"
@implements IDisposable
@inject NalixClient Nalix

<button @onclick="EchoAsync">Echo</button> <span>@_echo</span>
<ul>@foreach (var l in _chat) { <li><b>@l.Username</b>: @l.Message</li> }</ul>

@code {
    protected override async Task OnInitializedAsync()
    {
        Nalix.ChatReceived += OnChat;
        Nalix.StatusChanged += OnStatus;
        await Nalix.EnsureConnectedAsync();
    }

    async Task EchoAsync() => _echo = (await Nalix.EchoAsync("hello")).Text;

    // SDK callbacks do not come from the renderer: go back through InvokeAsync.
    void OnChat(ChatLine l) => _ = InvokeAsync(() => { _chat.Add(l); StateHasChanged(); });
    void OnStatus(ConnectionStatus _) => _ = InvokeAsync(StateHasChanged);

    public void Dispose() { Nalix.ChatReceived -= OnChat; Nalix.StatusChanged -= OnStatus; }
}
```

`EchoAsync` bên trong service chỉ là một `RequestAsync` thông thường:

```csharp
EchoRequestPacket request = new() { Text = text };
EchoResponsePacket response = await _session.RequestAsync<EchoResponsePacket>(
    request, RequestOptions.Default.WithTimeout(5_000), ct: ct);
```

## 6. Xử lý server push

Các gói tin được đẩy đến `session.On<T>()`. Service biến mỗi gói tin thành một record đơn giản (`ChatLine`) và phát một sự kiện C#, còn các component thêm record đó vào và render lại thông qua `InvokeAsync`. Có hai quy tắc cần tuân theo:

- **Dispose subscription `On<T>`** khi service bị dispose. Nếu không, handler sẽ tiếp tục được gọi.
- **Hủy đăng ký handler của component trong `Dispose`.** Nếu không, singleton sẽ giữ tham chiếu đến các trang mà người dùng đã rời đi.

## 7. Kết nối lại

`WebSocketSession` kế thừa từ `TransportSession`, có thể tự chạy `ReconnectSupervisor` khi `TransportOptions.AutoReconnectEnabled = true`. Ngoài ra, nếu UI Blazor của bạn muốn kiểm soát trực tiếp các chuyển trạng thái hiển thị (`ConnectionStatus.Reconnecting`), bạn có thể để `AutoReconnectEnabled = false` và tự điều khiển vòng lặp kết nối lại trong `NalixClient`:

```csharp
private void OnSessionDisconnected(object? sender, Exception ex)
{
    if (_userDisconnected) return;                                  // DisconnectAsync() was ours
    if (Interlocked.Exchange(ref _reconnecting, 1) == 1) return;    // one loop at a time
    _ = ReconnectLoopAsync();
}

private async Task ReconnectLoopAsync()
{
    SetStatus(ConnectionStatus.Reconnecting);
    for (int attempt = 0; !_lifetime.IsCancellationRequested; attempt++)
    {
        int delay = (int)Math.Min(15_000, 500 * Math.Pow(2, attempt));       // exp. backoff
        await Task.Delay((int)(delay * (0.8 + Random.Shared.NextDouble() * 0.4)), _lifetime.Token); // + jitter
        try { await ConnectCoreAsync(_lifetime.Token); SetStatus(ConnectionStatus.Connected); return; }
        catch (Exception) { /* keep trying */ }
    }
}
```

`ConnectWithResumeAsync` gửi yêu cầu resume khi phiên đang giữ session token và secret. Nếu server vẫn còn giữ phiên đó, handshake được bỏ qua. Nếu không, nó chuyển sang `HandshakeAsync()`.

Mặc định, `DefaultSessionPersistencePolicy` lưu phiên ngay sau khi `HandshakeAsync()` điền `!connection.Secret.IsZero` (Policy 2), hoặc khi ngắt kết nối nếu `connection.Level >= PermissionLevel.USER` và số lượng attribute đạt `SessionStoreOptions.MinAttributesForPersistence` (`10`, Policy 1). Trạng thái ứng dụng của bạn nằm trên server, nên hãy gửi lại mọi subscription hoặc đăng nhập nếu `ConnectWithResumeAsync` trả về `false` (handshake mới).

Nút **Simulate drop** trong mẫu sẽ chạy đường này. Bạn cũng có thể dừng và khởi động lại server.

## Chạy thử

```bash
# terminal 1
dotnet run --project samples/BlazorWasm/BlazorWasm.Server
# terminal 2
dotnet run --project samples/BlazorWasm/BlazorWasm.Client --urls http://localhost:5230
```

Mở `http://localhost:5230` trong hai tab. Echo trả về chữ in hoa, và các dòng chat xuất hiện ở cả hai tab.

## Lỗi thường gặp

**URL WebSocket.** SDK xây dựng `{ws|wss}://{Host}:{Port}{Path}`. `Path` phải khớp với `WithPath(...)` của server, kể cả dấu gạch chéo cuối (mặc định là `/ws/`). `Host` do **trình duyệt** phân giải, nên `localhost` có nghĩa là máy của người dùng. Hãy đặt tên miền công khai trong `appsettings.json`, hoặc trong `appsettings.{Environment}.json`, cho bản build triển khai.

**Mixed content.** Trang phục vụ qua `https://` chỉ có thể mở `wss://`. Đặt `UseTls = true` và kết thúc TLS trước Nalix, ví dụ bằng nginx hoặc Caddy (xem [Reverse Proxy TLS](deployment/reverse-proxy-tls.md)). Trình duyệt không cho phép bạn chấp nhận chứng chỉ tự ký cho WebSocket như cách bạn làm với trang. Hãy tin cậy chứng chỉ phát triển, hoặc chạy `ws://` thuần cục bộ.

**Kiểm tra Origin.** Trình duyệt gửi header `Origin` khi nâng cấp WebSocket, và bất kỳ trang web nào người dùng truy cập đều có thể thử mở socket đến server của bạn (cross-site WebSocket hijacking). Đặt `NetworkWebSocketOptions.AllowedOrigins` thành đúng origin (hoặc các origin) phục vụ ứng dụng Blazor của bạn, ví dụ `https://app.example.com`. Khi đó listener trả về `403 Forbidden` trước khi nâng cấp cho mọi origin khác. Đặt `AllowMissingOrigin = false` nếu chỉ có trình duyệt kết nối. Giữ `true` nếu client SDK native dùng chung endpoint, vì chúng không gửi `Origin`. Mặc định (danh sách cho phép rỗng) chấp nhận mọi origin và ghi một cảnh báo khi khởi động. Xem [WebSocket Options](../api/options/network/websocket-options.md#thực-thi-origin-bảo-vệ-cswsh). Kiểm tra origin không phải là xác thực. Bạn vẫn phải yêu cầu xác thực ở tầng ứng dụng sau handshake. Handshake mã hóa kết nối, nhưng không cho bạn biết người dùng là ai.

**Ghim khóa server.** Khi `ServerPublicKey` để trống, client tin tưởng khóa mà server gửi trong lần dùng đầu tiên (TOFU). Điều này cần `UseSystemControl()` trên server; nếu không, handshake sẽ hết thời gian chờ `SessionTofu`. Cơ chế này cũng không thể phát hiện man-in-the-middle ở lần kết nối đầu tiên. Với production, hãy sao chép khóa mà server in ra lúc khởi động vào `appsettings.json`. Đó là public key nên có thể đưa xuống trình duyệt.

**Giới hạn theo IP khi phát triển.** Mọi tab, lần tải lại và kết nối lại đều đến từ `127.0.0.1`. `ConnectionQuotaOptions.ExemptLoopback` (bật mặc định) miễn các client loopback khỏi quota theo IP/subnet, cửa sổ tốc độ và tự động cấm, nên việc tải lại nhanh khi phát triển không bị giới hạn và không cần cách xử lý riêng. Client từ xa vẫn nhận giới hạn mặc định (10 lần thử trong 5 giây, giảm một nửa ở chế độ burst); khi một client bị cấm, trình duyệt chỉ báo `ERR_CONNECTION_RESET`. Trên production, khi đứng sau proxy, hãy cấu hình `TrustedProxyOptions` để giới hạn áp dụng cho IP client thật thay vì IP của proxy. Nếu proxy cùng máy không chuyển tiếp địa chỉ client, hãy đặt `ExemptLoopback = false`, nếu không mọi client sẽ được miễn. Xem [Connection Quota Options](../api/options/network/connection-quota-options.md).

**Trimming và AOT.** Bản publish Release của Blazor WASM cắt bớt assembly. Các gói tin được tìm thấy lúc chạy qua `PacketRegistry`, nên hãy gắn gốc (root) assembly contracts bằng `<TrimmerRootAssembly Include="YourApp.Contracts" />`. Mẫu publish cắt bớt không có cảnh báo và chạy được. Biên dịch AOT của WebAssembly (`RunAOTCompilation`) là tùy chọn và chỉ ảnh hưởng đến tốc độ. Vòng nhận của SDK là bất đồng bộ và không bao giờ chặn một luồng, điều này quan trọng vì WASM chỉ có một luồng.

**Giới hạn API của trình duyệt.** Chỉ dùng các API bất đồng bộ. `WebSocketSession.Send(ReadOnlySpan<byte>, ...)`, `TcpSession` và `UdpSession` được đánh dấu `[UnsupportedOSPlatform("browser")]`. Trong trình duyệt không có socket thô, UDP hay TCP. Các tab chạy nền có thể bị điều tiết, và trình duyệt di động có thể đóng băng hoàn toàn chúng, nên hãy chờ `OnDisconnected` sau khi tab được đánh thức. Xử lý việc này là nhiệm vụ của vòng lặp kết nối lại.

**Luồng và render.** Các handler `On<T>` và `OnDisconnected` không được gọi trên synchronization context của renderer. Luôn gọi `InvokeAsync(StateHasChanged)` từ chúng. Sao chép dữ liệu ra khỏi gói tin có pool trước khi handler trả về.

## Xem thêm

- [Hướng dẫn Client Session](networking/connecting-clients.md)
- [Xây dựng phòng chat](build-a-chat-room.md)
- [Bảo vệ máy chủ của bạn](securing-your-server.md)
