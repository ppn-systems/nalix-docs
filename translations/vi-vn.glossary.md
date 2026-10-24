# Vietnamese glossary

Terms the translators of `vi-vn` agree on. Keep one rendering per term across all pages.

## Tone

Natural, concise technical Vietnamese. Address the reader as "bạn". Prefer short sentences. Do not translate word for word.

## Keep in English

Product and package names (Nalix, `Nalix.Network`…), identifiers, namespaces, option names, file paths, URLs, commands, protocol names (TCP, UDP, WebSocket, TLS, AEAD, X25519, ChaCha20-Poly1305), and these terms that Vietnamese developers use as they are: middleware, handler (when it names a type), listener, client, handshake, opcode, pool, lease, benchmark, throttle, token, payload, callback, async.

## Terms

| English | Vietnamese |
| :--- | :--- |
| packet | gói tin |
| packet handler | bộ xử lý gói tin |
| connection | kết nối |
| session | phiên |
| server | máy chủ |
| buffer | bộ đệm |
| serialization / serializer | tuần tự hóa / bộ tuần tự hóa |
| encryption / decryption | mã hóa / giải mã |
| key exchange | trao đổi khóa |
| zero-allocation | không cấp phát bộ nhớ (zero-allocation) |
| allocation | cấp phát |
| latency | độ trễ |
| throughput | thông lượng |
| rate limit / throttling | giới hạn tốc độ |
| anti-replay | chống phát lại |
| timeout | thời gian chờ |
| routing / dispatch | định tuyến / điều phối |
| thread-safe | an toàn đa luồng |
| configuration / option(s) | cấu hình / tùy chọn |
| default | mặc định |
| overview | tổng quan |
| reference | tham chiếu |
| guide / tutorial | hướng dẫn / bài thực hành |
| deployment | triển khai |
| troubleshooting | xử lý sự cố |
| note / tip / warning / danger | ghi chú / mẹo / cảnh báo / nguy hiểm |

Navigation titles already translated in `src/config/navigation.ts` (`titles`): use the same Vietnamese for a page `title` when the page has one there (for example Quick Start = Bắt đầu nhanh, Installation = Cài đặt, Troubleshooting = Xử lý sự cố).
