---
title: Reverse Proxy & TLS
description: Nalix does not terminate TLS itself. WebSocketListenerBase binds a raw TCP socket and speaks HTTP/1.1 Upgrade directly — put nginx, Caddy, or Cloudflare Tunnel in front for wss:// and TLS termination.
section: Guides
---

Nalix does not terminate TLS itself. `WebSocketListenerBase` binds a raw TCP
socket via `TcpListenerBase` and parses the HTTP/1.1 WebSocket `Upgrade`
directly — there is no `wss://` TLS termination in process, on any OS. Application data is already protected in transit by the
built-in X25519 handshake + ChaCha20-Poly1305 session encryption (see
[Handshake](../../api/security/handshake.md)), but that does not give you
`wss://`, valid browser certificates, or SNI/cert rotation. For that, put a
reverse proxy in front and let it own TLS.

This guide covers the proxies most commonly paired with Nalix: nginx
(manual certs via certbot), Caddy (automatic certs, zero config for renewal),
and Cloudflare Tunnel (Cloudflare terminates public TLS and tunnels plain HTTP
to your origin).

## What the proxy must do

1. Terminate TLS on `:443` and speak plain WebSocket to Nalix on the
   configured `NetworkWebSocketOptions.Port` (default `57207`).
2. Preserve the `Upgrade` / `Connection` headers for the WebSocket handshake.
3. Forward the real client IP so `ConnectionGuard` and rate limiting see
   actual clients, not the proxy's IP.
4. Send an `Origin` header that matches `NetworkWebSocketOptions.AllowedOrigins`
   if you use CSWSH origin checking (see [WebSocket Options](../../api/options/network/websocket-options.md)).

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

Cert renewal (certbot, cron/systemd timer already installed by the package):

```bash
sudo certbot --nginx -d example.com
sudo systemctl status certbot.timer   # auto-renewal, runs twice daily
```

## Caddy

Caddy gets you `wss://` with automatic Let's Encrypt certs and renewal,
no certbot, no cron job:

```caddyfile
example.com {
    reverse_proxy /ws/* 127.0.0.1:57207 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up -CF-Connecting-IP
    }
}
```

:::caution[Clear headers the client could supply]
With `[ForwardedHeaders] Enabled = true` and a trusted peer, Nalix takes the
client IP from the first header present, in this fixed order:
`CF-Connecting-IP`, then `X-Real-IP`, then `X-Forwarded-For`. nginx and Caddy
forward client-sent headers unless told otherwise, so a client that adds its
own `CF-Connecting-IP` would outrank your `X-Real-IP` and pick the IP used for
bans, per-IP limits and rate limiting. When you are not behind Cloudflare,
clear `CF-Connecting-IP` as above and always set `X-Real-IP` from the real
peer address.
:::

:::caution[Proxies that only append `X-Forwarded-For`]
If the proxy only appends to `X-Forwarded-For` and does not set `X-Real-IP`
(for example AWS ALB, or nginx with only `$proxy_add_x_forwarded_for`), Nalix
currently reads the **left-most** `X-Forwarded-For` entry, which the client
can forge. Configure the proxy to set `X-Real-IP` from the peer address, and
keep `RequireTrustedProxy = true` with a strict `trusted_proxies.txt`.
:::

That's the whole config — Caddy issues, installs, and renews the
certificate automatically on first request.

## Cloudflare Tunnel

Cloudflare Tunnel is the simplest setup when you do not want to expose the
Nalix host or manage an origin certificate. Clients connect to
`wss://example.com/ws/`; Cloudflare owns the public certificate and
`cloudflared` forwards plain HTTP WebSocket traffic to Nalix.

`cloudflared` ingress example:

```yaml
tunnel: nalix
credentials-file: /etc/cloudflared/nalix.json

ingress:
  - hostname: example.com
    service: http://127.0.0.1:57207
  - service: http_status:404
```

Nalix should still bind to loopback:

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

Cloudflare sends `CF-Connecting-IP` to the origin. Nalix reads that header
before `X-Real-IP` and `X-Forwarded-For`, but only honors it from a trusted
physical peer. For Tunnel, add the local `cloudflared` peer to
`trusted_proxies.txt`; for the loopback config above, that is usually
`127.0.0.1` (and `::1` if IPv6 loopback is used).

`CF-Connecting-IP` is only trustworthy if nothing but Cloudflare can reach the
origin. Keep Nalix bound to loopback behind `cloudflared`, or, for a proxied
(orange-cloud) origin without Tunnel, firewall the origin to Cloudflare's IP
ranges (or your proxy) only — otherwise a client connecting directly can set
the header itself.

You do not need TLS between `cloudflared` and Nalix when `service` uses
`http://127.0.0.1:57207`. Use an HTTPS origin service only if you intentionally
want local origin TLS too.

## Nalix-side configuration

Match the proxy setup on the Nalix side:

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

`ClientIpHeader` selects which header carries the client IP. `Auto` (the default)
uses the first present of `CF-Connecting-IP`, `X-Real-IP`, `X-Forwarded-For`; any
other value reads only that header and ignores the rest, so set it to the one
header your proxy always sets (for example `XRealIp` for nginx/Caddy as
configured above).

`RequireTrustedProxy = true` means forwarded-IP headers are only honored
from IPs listed in `trusted_proxies.txt` (`TrustedProxyOptions.StoreFileName`,
loaded from `Directories.ConfigurationDirectory`) — add your nginx/Caddy box's IP (or
`127.0.0.1` if it's local) to that file. Without this, any client could
spoof `X-Forwarded-For` and bypass IP-based rate limiting.

See [Trusted Proxy Options](../../api/options/network/trusted-proxy-options.md)
for the full option reference. `ForwardedHeadersOptions` itself
(`src/Nalix.Network/Options/ForwardedHeadersOptions.cs`) has three
fields: `Enabled`, `RequireTrustedProxy` and `ClientIpHeader`.

## Checklist

- [ ] Nalix `Host` bound to `127.0.0.1` or an internal interface, not `*`, once a proxy is in front.
- [ ] `ForwardedHeaders.Enabled = true`, `RequireTrustedProxy = true`.
- [ ] Proxy IP added to `trusted_proxies.txt`.
- [ ] `AllowedOrigins` set to your real origin(s); `AllowMissingOrigin = false` for browser-only deployments.
- [ ] Proxy `proxy_read_timeout` / equivalent is longer than your idle timeout expectations for long-lived WebSocket connections.
- [ ] Client connects to `wss://example.com/ws/`, not the raw Nalix port.
- [ ] For Cloudflare Tunnel, `cloudflared` ingress points at `http://127.0.0.1:57207` unless you deliberately run origin TLS.

## Recommended Next Pages

- [Production Checklist](./production-checklist.md)
- [WebSocket Options](../../api/options/network/websocket-options.md)
- [Trusted Proxy Options](../../api/options/network/trusted-proxy-options.md)
- [Handshake](../../api/security/handshake.md)
