---
title: Reverse Proxy & TLS
description: Nalix không tự kết thúc TLS. WebSocketListenerBase bind một socket TCP thô và nói trực tiếp HTTP/1.1 Upgrade — hãy đặt nginx, Caddy hoặc Cloudflare Tunnel phía trước để có wss:// và kết thúc TLS.
section: Guides
---

Nalix không tự kết thúc TLS. `WebSocketListenerBase` bind một socket TCP thô qua `TcpListenerBase` và tự phân tích HTTP/1.1 WebSocket `Upgrade` — không có việc kết thúc TLS `wss://` trong tiến trình, trên bất kỳ hệ điều hành nào. Dữ liệu ứng dụng đã được bảo vệ khi truyền bằng handshake X25519 và mã hóa phiên ChaCha20-Poly1305 tích hợp sẵn (xem [Handshake](../../api/security/handshake.md)), nhưng điều đó không cung cấp `wss://`, chứng chỉ hợp lệ cho trình duyệt, hay SNI/xoay vòng chứng chỉ. Để có những thứ đó, hãy đặt một reverse proxy phía trước và để nó quản lý TLS.

Hướng dẫn này bao gồm các proxy thường được ghép cùng Nalix nhất: nginx (chứng chỉ thủ công qua certbot), Caddy (chứng chỉ tự động, không cần cấu hình gia hạn) và Cloudflare Tunnel (Cloudflare kết thúc TLS công khai và chuyển tiếp HTTP thuần tới origin).

## Proxy phải làm gì

1. Kết thúc TLS trên `:443` và nói WebSocket thuần tới Nalix trên `NetworkWebSocketOptions.Port` đã cấu hình (mặc định `57207`).
2. Giữ nguyên các header `Upgrade` / `Connection` cho handshake WebSocket.
3. Chuyển tiếp IP client thật để `ConnectionGuard` và giới hạn tốc độ nhìn thấy client thực, không phải IP của proxy.
4. Gửi header `Origin` khớp với `NetworkWebSocketOptions.AllowedOrigins` nếu bạn dùng kiểm tra origin CSWSH (xem [WebSocket Options](../../api/options/network/websocket-options.md)).

## nginx

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /ws/ {
        proxy_pass http://127.0.0.1:57207;
        proxy_http_version 1.1;

        # WebSocket upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Real client IP + origin
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header CF-Connecting-IP "";   # not behind Cloudflare: drop client-supplied value
        proxy_set_header Host $host;

        # WebSocket connections are long-lived; don't let nginx kill them early
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

Gia hạn chứng chỉ (certbot, cron/systemd timer đã được gói cài đặt sẵn):

```bash
sudo certbot --nginx -d example.com
sudo systemctl status certbot.timer   # auto-renewal, runs twice daily
```

## Caddy

Caddy cho bạn `wss://` với chứng chỉ Let's Encrypt và gia hạn tự động, không cần certbot, không cần cron job:

```caddyfile
example.com {
    reverse_proxy /ws/* 127.0.0.1:57207 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up -CF-Connecting-IP
    }
}
```

:::caution[Xóa các header mà client có thể tự cung cấp]
Khi `[ForwardedHeaders] Enabled = true` và peer là một nguồn đáng tin cậy, Nalix lấy IP client từ header đầu tiên có mặt, theo thứ tự cố định:
`CF-Connecting-IP`, rồi `X-Real-IP`, rồi `X-Forwarded-For`. nginx và Caddy chuyển tiếp các header do client gửi trừ khi bạn cấu hình khác, vì vậy một client tự thêm `CF-Connecting-IP` sẽ đứng trên `X-Real-IP` của bạn và chọn IP dùng cho ban, giới hạn theo IP và giới hạn tốc độ. Khi bạn không đứng sau Cloudflare, hãy xóa `CF-Connecting-IP` như trên và luôn đặt `X-Real-IP` từ địa chỉ peer thật.
:::

:::caution[Các proxy chỉ nối thêm `X-Forwarded-For`]
Nếu proxy chỉ nối thêm vào `X-Forwarded-For` mà không đặt `X-Real-IP` (ví dụ AWS ALB, hoặc nginx chỉ với `$proxy_add_x_forwarded_for`), Nalix hiện đọc mục **ngoài cùng bên trái** của `X-Forwarded-For`, mục này client có thể giả mạo. Hãy cấu hình proxy đặt `X-Real-IP` từ địa chỉ peer, và giữ `RequireTrustedProxy = true` với `trusted_proxies.txt` chặt chẽ.
:::

Đó là toàn bộ cấu hình — Caddy tự cấp, cài đặt và gia hạn chứng chỉ ở yêu cầu đầu tiên.

## Cloudflare Tunnel

Cloudflare Tunnel là cách thiết lập đơn giản nhất khi bạn không muốn lộ máy chủ Nalix ra ngoài hoặc tự quản lý chứng chỉ origin. Client kết nối tới `wss://example.com/ws/`; Cloudflare sở hữu chứng chỉ công khai và `cloudflared` chuyển tiếp lưu lượng WebSocket HTTP thuần tới Nalix.

Ví dụ ingress của `cloudflared`:

```yaml
tunnel: nalix
credentials-file: /etc/cloudflared/nalix.json

ingress:
  - hostname: example.com
    service: http://127.0.0.1:57207
  - service: http_status:404
```

Nalix vẫn nên bind vào loopback:

```ini
[NetworkWebSocket]
Host = 127.0.0.1
Port = 57207
AllowedOrigins = https://example.com
AllowMissingOrigin = false

[ForwardedHeaders]
Enabled = true
RequireTrustedProxy = true
```

Cloudflare gửi `CF-Connecting-IP` tới origin. Nalix đọc header đó trước `X-Real-IP` và `X-Forwarded-For`, nhưng chỉ chấp nhận từ một peer vật lý đáng tin cậy. Với Tunnel, hãy thêm peer `cloudflared` cục bộ vào `trusted_proxies.txt`; với cấu hình loopback ở trên, thường là `127.0.0.1` (và `::1` nếu dùng loopback IPv6).

`CF-Connecting-IP` chỉ đáng tin nếu không có gì ngoài Cloudflare có thể truy cập origin. Hãy giữ Nalix bind vào loopback phía sau `cloudflared`, hoặc, với origin được proxy (đám mây cam) mà không dùng Tunnel, hãy tường lửa origin chỉ cho phép dải IP của Cloudflare (hoặc proxy của bạn) — nếu không, một client kết nối trực tiếp có thể tự đặt header này.

Bạn không cần TLS giữa `cloudflared` và Nalix khi `service` dùng `http://127.0.0.1:57207`. Chỉ dùng origin service HTTPS khi bạn cố ý muốn TLS cục bộ tới origin.

## Cấu hình phía Nalix

Khớp cấu hình proxy ở phía Nalix:

```ini
[NetworkWebSocket]
Host = 127.0.0.1        ; only listen on loopback, proxy is the public edge
Port = 57207
AllowedOrigins = https://example.com
AllowMissingOrigin = false

[ForwardedHeaders]
Enabled = true           ; trust X-Forwarded-For / X-Real-IP / CF-Connecting-IP
RequireTrustedProxy = true
ClientIpHeader = Auto    ; Auto, CfConnectingIp, XRealIp or XForwardedFor
```

`ClientIpHeader` chọn header nào mang IP client. `Auto` (mặc định) dùng header đầu tiên có mặt trong `CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`; bất kỳ giá trị nào khác chỉ đọc đúng header đó và bỏ qua các header còn lại, nên hãy đặt nó thành header duy nhất mà proxy của bạn luôn gửi (ví dụ `XRealIp` cho nginx/Caddy như cấu hình ở trên).

`RequireTrustedProxy = true` nghĩa là các header IP được chuyển tiếp chỉ được chấp nhận từ các IP có trong `trusted_proxies.txt` (`TrustedProxyOptions.StoreFileName`, nạp từ `Directories.ConfigurationDirectory`) — hãy thêm IP của máy nginx/Caddy (hoặc `127.0.0.1` nếu nó chạy cục bộ) vào file đó. Nếu không có điều này, bất kỳ client nào cũng có thể giả mạo `X-Forwarded-For` và vượt qua giới hạn tốc độ theo IP.

Xem [Trusted Proxy Options](../../api/options/network/trusted-proxy-options.md) để có tài liệu tham chiếu đầy đủ về tùy chọn. Bản thân `ForwardedHeadersOptions` (`src/Nalix.Network/Options/ForwardedHeadersOptions.cs`) có ba trường: `Enabled`, `RequireTrustedProxy` và `ClientIpHeader`.

## Danh mục kiểm tra

- [ ] `Host` của Nalix bind vào `127.0.0.1` hoặc một interface nội bộ, không phải `*`, khi đã có proxy phía trước.
- [ ] `ForwardedHeaders.Enabled = true`, `RequireTrustedProxy = true`.
- [ ] IP của proxy đã được thêm vào `trusted_proxies.txt`.
- [ ] `AllowedOrigins` được đặt thành (các) origin thật của bạn; `AllowMissingOrigin = false` cho triển khai chỉ dành cho trình duyệt.
- [ ] `proxy_read_timeout` / tương đương của proxy dài hơn kỳ vọng về idle timeout cho các kết nối WebSocket sống lâu.
- [ ] Client kết nối tới `wss://example.com/ws/`, không phải cổng Nalix thô.
- [ ] Với Cloudflare Tunnel, ingress của `cloudflared` trỏ tới `http://127.0.0.1:57207` trừ khi bạn cố ý chạy TLS ở origin.

## Các trang nên đọc tiếp

- [Danh mục kiểm tra Production](./production-checklist.md)
- [WebSocket Options](../../api/options/network/websocket-options.md)
- [Trusted Proxy Options](../../api/options/network/trusted-proxy-options.md)
- [Handshake](../../api/security/handshake.md)
