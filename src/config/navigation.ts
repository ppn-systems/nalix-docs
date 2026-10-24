// Auto-generated and synchronized with Nalix documentation structure (Rule R8)
import type { LocaleCode } from '../i18n/config';
import { localizePath, useTranslations } from '../i18n';

export interface NavItem {
  title: string;
  /** Titles per locale; a locale without an entry uses `title`. */
  titles?: Partial<Record<LocaleCode, string>>;
  /** Canonical doc slug (empty string '' for root index) */
  slug?: string;
  /** Source markdown file path relative to locale folder */
  file?: string;
  items?: NavItem[];
}

export const NAVIGATION_TREE: NavItem[] = [
  {
    "title": "Overview",
    "titles": { "vi-vn": "Tổng quan" },
    "slug": "",
    "file": "index.md"
  },
  {
    "title": "Start Here",
    "titles": { "vi-vn": "Bắt đầu" },
    "items": [
      {
        "title": "Quick Start",
        "titles": { "vi-vn": "Bắt đầu nhanh" },
        "slug": "quickstart",
        "file": "quickstart.md"
      },
      {
        "title": "Installation",
        "titles": { "vi-vn": "Cài đặt" },
        "slug": "installation",
        "file": "installation.md"
      },
      {
        "title": "Your First Server",
        "titles": { "vi-vn": "Máy chủ đầu tiên" },
        "slug": "guides/getting-started/your-first-server",
        "file": "guides/getting-started/your-first-server.md"
      },
      {
        "title": "Server Blueprint",
        "titles": { "vi-vn": "Kiến trúc máy chủ mẫu" },
        "slug": "guides/getting-started/server-blueprint",
        "file": "guides/getting-started/server-blueprint.md"
      }
    ]
  },
  {
    "title": "Guides",
    "titles": { "vi-vn": "Hướng dẫn" },
    "items": [
      {
        "title": "Overview",
        "titles": { "vi-vn": "Tổng quan" },
        "slug": "guides",
        "file": "guides/index.md"
      },
      {
        "title": "Tutorials",
        "titles": { "vi-vn": "Bài tập thực hành" },
        "items": [
          {
            "title": "Build a Chat Room",
            "titles": { "vi-vn": "Xây dựng phòng Chat" },
            "slug": "guides/build-a-chat-room",
            "file": "guides/build-a-chat-room.md"
          },
          {
            "title": "Blazor WebAssembly",
            "titles": { "vi-vn": "Blazor WebAssembly" },
            "slug": "guides/blazor-wasm",
            "file": "guides/blazor-wasm.md"
          },
          {
            "title": "Securing Your Server",
            "titles": { "vi-vn": "Bảo mật máy chủ" },
            "slug": "guides/securing-your-server",
            "file": "guides/securing-your-server.md"
          }
        ]
      },
      {
        "title": "Application Logic",
        "titles": { "vi-vn": "Logic ứng dụng" },
        "items": [
          {
            "title": "Packet Handlers",
            "titles": { "vi-vn": "Xử lý gói tin" },
            "slug": "guides/application/packet-handlers",
            "file": "guides/application/packet-handlers.md"
          },
          {
            "title": "Middleware Usage",
            "titles": { "vi-vn": "Sử dụng Middleware" },
            "slug": "guides/application/middleware-usage",
            "file": "guides/application/middleware-usage.md"
          }
        ]
      },
      {
        "title": "Networking",
        "titles": { "vi-vn": "Mạng & Kết nối" },
        "items": [
          {
            "title": "Client Sessions",
            "titles": { "vi-vn": "Phiên kết nối Client" },
            "slug": "guides/networking/connecting-clients",
            "file": "guides/networking/connecting-clients.md"
          },
          {
            "title": "TCP Patterns",
            "titles": { "vi-vn": "Mẫu kết nối TCP" },
            "slug": "guides/networking/tcp-patterns",
            "file": "guides/networking/tcp-patterns.md"
          },
          {
            "title": "UDP Server",
            "titles": { "vi-vn": "Máy chủ UDP" },
            "slug": "guides/networking/udp-server",
            "file": "guides/networking/udp-server.md"
          },
          {
            "title": "UDP Security",
            "titles": { "vi-vn": "Bảo mật UDP" },
            "slug": "guides/networking/udp-security",
            "file": "guides/networking/udp-security.md"
          },
          {
            "title": "Idle Connection Timeout",
            "titles": { "vi-vn": "Thời gian chờ kết nối rỗi" },
            "slug": "guides/networking/idle-timeout-configuration",
            "file": "guides/networking/idle-timeout-configuration.md"
          }
        ]
      },
      {
        "title": "Extensibility",
        "titles": { "vi-vn": "Mở rộng hệ thống" },
        "items": [
          {
            "title": "Custom Middleware",
            "titles": { "vi-vn": "Tùy chỉnh Middleware" },
            "slug": "guides/extensibility/custom-middleware",
            "file": "guides/extensibility/custom-middleware.md"
          },
          {
            "title": "Custom Packet Router",
            "titles": { "vi-vn": "Tùy chỉnh bộ định tuyến" },
            "slug": "guides/extensibility/custom-packet-router",
            "file": "guides/extensibility/custom-packet-router.md"
          },
          {
            "title": "Custom Metadata Providers",
            "titles": { "vi-vn": "Tùy chỉnh Metadata Provider" },
            "slug": "guides/extensibility/metadata-providers",
            "file": "guides/extensibility/metadata-providers.md"
          },
          {
            "title": "Custom Serialization Providers",
            "titles": { "vi-vn": "Tùy chỉnh tuần tự hóa" },
            "slug": "guides/extensibility/serialization-providers",
            "file": "guides/extensibility/serialization-providers.md"
          }
        ]
      },
      {
        "title": "Deployment & Operations",
        "titles": { "vi-vn": "Triển khai & Vận hành" },
        "items": [
          {
            "title": "Production Checklist",
            "titles": { "vi-vn": "Danh mục kiểm tra Production" },
            "slug": "guides/deployment/production-checklist",
            "file": "guides/deployment/production-checklist.md"
          },
          {
            "title": "Reverse Proxy & TLS",
            "titles": { "vi-vn": "Reverse Proxy & TLS" },
            "slug": "guides/deployment/reverse-proxy-tls",
            "file": "guides/deployment/reverse-proxy-tls.md"
          },
          {
            "title": "Troubleshooting",
            "titles": { "vi-vn": "Xử lý sự cố" },
            "slug": "guides/deployment/troubleshooting",
            "file": "guides/deployment/troubleshooting.md"
          }
        ]
      }
    ]
  },
  {
    "title": "Concepts",
    "titles": { "vi-vn": "Khái niệm" },
    "items": [
      {
        "title": "Overview",
        "titles": { "vi-vn": "Tổng quan" },
        "slug": "concepts",
        "file": "concepts/index.md"
      },
      {
        "title": "Core Concepts",
        "titles": { "vi-vn": "Khái niệm cốt lõi" },
        "items": [
          {
            "title": "How Packets Work",
            "titles": { "vi-vn": "Gói tin hoạt động thế nào" },
            "slug": "concepts/how-packets-work",
            "file": "concepts/how-packets-work.md"
          },
          {
            "title": "Handlers & Middleware",
            "titles": { "vi-vn": "Handler & Middleware" },
            "slug": "concepts/handlers-and-middleware",
            "file": "concepts/handlers-and-middleware.md"
          },
          {
            "title": "Configuration",
            "titles": { "vi-vn": "Cấu hình" },
            "slug": "concepts/configuration",
            "file": "concepts/configuration.md"
          },
          {
            "title": "Hosting Model",
            "titles": { "vi-vn": "Mô hình hosting" },
            "slug": "concepts/application/hosting-model",
            "file": "concepts/application/hosting-model.md"
          },
          {
            "title": "Glossary",
            "titles": { "vi-vn": "Thuật ngữ" },
            "slug": "concepts/glossary",
            "file": "concepts/glossary.md"
          }
        ]
      },
      {
        "title": "Architecture & Internals",
        "titles": { "vi-vn": "Kiến trúc nội bộ" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "concepts/internals",
            "file": "concepts/internals/index.md"
          },
          {
            "title": "System Architecture",
            "titles": { "vi-vn": "Kiến trúc hệ thống" },
            "slug": "concepts/internals/architecture",
            "file": "concepts/internals/architecture.md"
          },
          {
            "title": "Packet Lifecycle",
            "titles": { "vi-vn": "Vòng đời gói tin" },
            "slug": "concepts/internals/packet-lifecycle",
            "file": "concepts/internals/packet-lifecycle.md"
          },
          {
            "title": "Binary Specification",
            "titles": { "vi-vn": "Đặc tả nhị phân" },
            "slug": "concepts/internals/binary-spec",
            "file": "concepts/internals/binary-spec.md"
          },
          {
            "title": "Real-Time Engine",
            "titles": { "vi-vn": "Engine thời gian thực" },
            "slug": "concepts/internals/real-time-engine",
            "file": "concepts/internals/real-time-engine.md"
          },
          {
            "title": "Middleware Pipeline",
            "titles": { "vi-vn": "Pipeline middleware" },
            "slug": "concepts/internals/middleware-pipeline",
            "file": "concepts/internals/middleware-pipeline.md"
          },
          {
            "title": "Configuration System",
            "titles": { "vi-vn": "Hệ thống cấu hình" },
            "slug": "concepts/internals/configuration",
            "file": "concepts/internals/configuration.md"
          },
          {
            "title": "Sharding & Concurrency",
            "titles": { "vi-vn": "Sharding & đồng thời" },
            "slug": "concepts/internals/sharding",
            "file": "concepts/internals/sharding.md"
          },
          {
            "title": "Zero-Allocation Path",
            "titles": { "vi-vn": "Đường đi zero-allocation" },
            "slug": "concepts/internals/zero-allocation",
            "file": "concepts/internals/zero-allocation.md"
          },
          {
            "title": "Errors & Diagnostics",
            "titles": { "vi-vn": "Lỗi & chẩn đoán" },
            "slug": "concepts/internals/errors-and-diagnostics",
            "file": "concepts/internals/errors-and-diagnostics.md"
          },
          {
            "title": "Guarantees & Failure Handling",
            "titles": { "vi-vn": "Đảm bảo & xử lý lỗi" },
            "slug": "concepts/internals/guarantees-and-failure-handling",
            "file": "concepts/internals/guarantees-and-failure-handling.md"
          },
          {
            "title": "Design Tradeoffs",
            "titles": { "vi-vn": "Đánh đổi thiết kế" },
            "slug": "concepts/internals/design-tradeoffs",
            "file": "concepts/internals/design-tradeoffs.md"
          },
          {
            "title": "Performance Optimizations",
            "titles": { "vi-vn": "Tối ưu hiệu năng" },
            "slug": "concepts/internals/performance-optimizations",
            "file": "concepts/internals/performance-optimizations.md"
          }
        ]
      },
      {
        "title": "Security Model",
        "titles": { "vi-vn": "Mô hình bảo mật" },
        "items": [
          {
            "title": "Security Architecture",
            "titles": { "vi-vn": "Kiến trúc bảo mật" },
            "slug": "concepts/internals/security-architecture",
            "file": "concepts/internals/security-architecture.md"
          },
          {
            "title": "Encryption Model",
            "titles": { "vi-vn": "Mô hình mã hóa" },
            "slug": "concepts/internals/encryption-model",
            "file": "concepts/internals/encryption-model.md"
          },
          {
            "title": "Handshake Protocol",
            "titles": { "vi-vn": "Giao thức handshake" },
            "slug": "concepts/internals/handshake-protocol",
            "file": "concepts/internals/handshake-protocol.md"
          },
          {
            "title": "Session Resumption",
            "titles": { "vi-vn": "Tiếp tục phiên" },
            "slug": "concepts/internals/session-resumption",
            "file": "concepts/internals/session-resumption.md"
          }
        ]
      },
      {
        "title": "Advanced Topics",
        "titles": { "vi-vn": "Chủ đề nâng cao" },
        "items": [
          {
            "title": "Manual Server Wiring",
            "titles": { "vi-vn": "Kết nối máy chủ thủ công" },
            "slug": "concepts/internals/minimal-server",
            "file": "concepts/internals/minimal-server.md"
          },
          {
            "title": "Low-Level Session APIs",
            "titles": { "vi-vn": "API phiên mức thấp" },
            "slug": "concepts/internals/low-level-session-apis",
            "file": "concepts/internals/low-level-session-apis.md"
          },
          {
            "title": "BufferLease Utilization",
            "titles": { "vi-vn": "Sử dụng BufferLease" },
            "slug": "concepts/internals/buffer-lease-utilization",
            "file": "concepts/internals/buffer-lease-utilization.md"
          },
          {
            "title": "Buffer Pooling",
            "titles": { "vi-vn": "Pool bộ đệm" },
            "slug": "concepts/internals/buffer-pooling-configuration",
            "file": "concepts/internals/buffer-pooling-configuration.md"
          }
        ]
      }
    ]
  },
  {
    "title": "Packages",
    "titles": { "vi-vn": "Gói thư viện" },
    "items": [
      {
        "title": "Overview",
        "titles": { "vi-vn": "Tổng quan" },
        "slug": "packages",
        "file": "packages/index.md"
      },
      {
        "title": "Nalix.Abstractions",
        "titles": { "vi-vn": "Nalix.Abstractions" },
        "slug": "packages/nalix-abstractions",
        "file": "packages/nalix-abstractions.md"
      },
      {
        "title": "Nalix.Environment",
        "titles": { "vi-vn": "Nalix.Environment" },
        "slug": "packages/nalix-environment",
        "file": "packages/nalix-environment.md"
      },
      {
        "title": "Nalix.Codec",
        "titles": { "vi-vn": "Nalix.Codec" },
        "slug": "packages/nalix-codec",
        "file": "packages/nalix-codec.md"
      },
      {
        "title": "Nalix.Framework",
        "titles": { "vi-vn": "Nalix.Framework" },
        "slug": "packages/nalix-framework",
        "file": "packages/nalix-framework.md"
      },
      {
        "title": "Nalix.Network",
        "titles": { "vi-vn": "Nalix.Network" },
        "slug": "packages/nalix-network",
        "file": "packages/nalix-network.md"
      },
      {
        "title": "Nalix.Runtime",
        "titles": { "vi-vn": "Nalix.Runtime" },
        "slug": "packages/nalix-runtime",
        "file": "packages/nalix-runtime.md"
      },
      {
        "title": "Nalix.Hosting",
        "titles": { "vi-vn": "Nalix.Hosting" },
        "slug": "packages/nalix-hosting",
        "file": "packages/nalix-hosting.md"
      },
      {
        "title": "Nalix.SDK",
        "titles": { "vi-vn": "Nalix.SDK" },
        "slug": "packages/nalix-sdk",
        "file": "packages/nalix-sdk.md"
      }
    ]
  },
  {
    "title": "API",
    "titles": { "vi-vn": "Tài liệu API" },
    "items": [
      {
        "title": "Overview",
        "titles": { "vi-vn": "Tổng quan" },
        "slug": "api",
        "file": "api/index.md"
      },
      {
        "title": "Analyzers",
        "titles": { "vi-vn": "Analyzers" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/analyzers",
            "file": "api/analyzers/index.md"
          },
          {
            "title": "Diagnostic Codes",
            "titles": { "vi-vn": "Mã chẩn đoán" },
            "slug": "api/analyzers/diagnostic-codes",
            "file": "api/analyzers/diagnostic-codes.md"
          },
          {
            "title": "Code Fixes",
            "titles": { "vi-vn": "Code Fixes" },
            "slug": "api/analyzers/code-fixes",
            "file": "api/analyzers/code-fixes.md"
          },
          {
            "title": "Generators",
            "titles": { "vi-vn": "Generators" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/analyzers/autogen",
                "file": "api/analyzers/autogen/index.md"
              },
              {
                "title": "Packet Handler",
                "titles": { "vi-vn": "Bộ xử lý gói tin" },
                "slug": "api/analyzers/autogen/packet-handler-generator",
                "file": "api/analyzers/autogen/packet-handler-generator.md"
              },
              {
                "title": "Instance",
                "titles": { "vi-vn": "Instance" },
                "slug": "api/analyzers/autogen/instance-generator",
                "file": "api/analyzers/autogen/instance-generator.md"
              },
              {
                "title": "Serialization",
                "titles": { "vi-vn": "Tuần tự hóa" },
                "slug": "api/analyzers/autogen/serialization-generator",
                "file": "api/analyzers/autogen/serialization-generator.md"
              },
              {
                "title": "Packet Registry",
                "titles": { "vi-vn": "Registry gói tin" },
                "slug": "api/analyzers/autogen/packet-registry-generator",
                "file": "api/analyzers/autogen/packet-registry-generator.md"
              },
              {
                "title": "Packet Schema",
                "titles": { "vi-vn": "Schema gói tin" },
                "slug": "api/analyzers/autogen/packet-schema-generator",
                "file": "api/analyzers/autogen/packet-schema-generator.md"
              },
              {
                "title": "Configuration",
                "titles": { "vi-vn": "Cấu hình" },
                "slug": "api/analyzers/autogen/configuration-generator",
                "file": "api/analyzers/autogen/configuration-generator.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Abstractions",
        "titles": { "vi-vn": "Abstractions" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/abstractions",
            "file": "api/abstractions/index.md"
          },
          {
            "title": "Control Type",
            "titles": { "vi-vn": "Kiểu điều khiển" },
            "slug": "api/abstractions/protocols/control-type",
            "file": "api/abstractions/protocols/control-type.md"
          },
          {
            "title": "Packet Contracts",
            "titles": { "vi-vn": "Contract gói tin" },
            "slug": "api/abstractions/packet-contracts",
            "file": "api/abstractions/packet-contracts.md"
          },
          {
            "title": "Connection Contracts",
            "titles": { "vi-vn": "Contract kết nối" },
            "slug": "api/abstractions/connection-contracts",
            "file": "api/abstractions/connection-contracts.md"
          },
          {
            "title": "Session Contracts",
            "titles": { "vi-vn": "Contract phiên" },
            "slug": "api/abstractions/session-contracts",
            "file": "api/abstractions/session-contracts.md"
          },
          {
            "title": "Concurrency Contracts",
            "titles": { "vi-vn": "Contract đồng thời" },
            "slug": "api/abstractions/concurrency-contracts",
            "file": "api/abstractions/concurrency-contracts.md"
          },
          {
            "title": "Packet Attributes",
            "titles": { "vi-vn": "Thuộc tính gói tin" },
            "slug": "api/abstractions/packet-attributes",
            "file": "api/abstractions/packet-attributes.md"
          },
          {
            "title": "Packet Metadata",
            "titles": { "vi-vn": "Metadata gói tin" },
            "slug": "api/abstractions/packet-metadata",
            "file": "api/abstractions/packet-metadata.md"
          },
          {
            "title": "Enums",
            "titles": { "vi-vn": "Enum" },
            "slug": "api/abstractions/enums",
            "file": "api/abstractions/enums.md"
          },
          {
            "title": "Validation Attributes",
            "titles": { "vi-vn": "Thuộc tính xác thực" },
            "slug": "api/abstractions/validation",
            "file": "api/abstractions/validation.md"
          },
          {
            "title": "Injection Attributes",
            "titles": { "vi-vn": "Thuộc tính injection" },
            "slug": "api/abstractions/injection",
            "file": "api/abstractions/injection.md"
          }
        ]
      },
      {
        "title": "Framework",
        "titles": { "vi-vn": "Framework" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/framework",
            "file": "api/framework/index.md"
          },
          {
            "title": "Environment",
            "titles": { "vi-vn": "Môi trường" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/environment",
                "file": "api/environment/index.md"
              },
              {
                "title": "Directories",
                "titles": { "vi-vn": "Thư mục" },
                "slug": "api/environment/directories",
                "file": "api/environment/directories.md"
              },
              {
                "title": "Clock",
                "titles": { "vi-vn": "Clock" },
                "slug": "api/environment/clock",
                "file": "api/environment/clock.md"
              },
              {
                "title": "Random",
                "titles": { "vi-vn": "Random" },
                "slug": "api/environment/random",
                "file": "api/environment/random.md"
              },
              {
                "title": "Timing Scope",
                "titles": { "vi-vn": "Phạm vi thời gian" },
                "slug": "api/environment/timing-scope",
                "file": "api/environment/timing-scope.md"
              },
              {
                "title": "Configuration",
                "titles": { "vi-vn": "Cấu hình" },
                "slug": "api/environment/configuration",
                "file": "api/environment/configuration.md"
              },
              {
                "title": "Sequencing",
                "titles": { "vi-vn": "Sắp thứ tự" },
                "slug": "api/environment/sequencing",
                "file": "api/environment/sequencing.md"
              },
              {
                "title": "Memory",
                "titles": { "vi-vn": "Bộ nhớ" },
                "items": [
                  {
                    "title": "Buffer Management",
                    "titles": { "vi-vn": "Quản lý bộ đệm" },
                    "slug": "api/environment/memory/buffer-management",
                    "file": "api/environment/memory/buffer-management.md"
                  },
                  {
                    "title": "BufferLease",
                    "titles": { "vi-vn": "BufferLease" },
                    "slug": "api/environment/memory/buffer-lease",
                    "file": "api/environment/memory/buffer-lease.md"
                  },
                  {
                    "title": "DataReader",
                    "titles": { "vi-vn": "DataReader" },
                    "slug": "api/environment/memory/data-reader",
                    "file": "api/environment/memory/data-reader.md"
                  },
                  {
                    "title": "DataWriter",
                    "titles": { "vi-vn": "DataWriter" },
                    "slug": "api/environment/memory/data-writer",
                    "file": "api/environment/memory/data-writer.md"
                  }
                ]
              }
            ]
          },
          {
            "title": "Runtime",
            "titles": { "vi-vn": "Runtime" },
            "items": [
              {
                "title": "Snowflake",
                "titles": { "vi-vn": "Snowflake" },
                "slug": "api/framework/snowflake",
                "file": "api/framework/snowflake.md"
              },
              {
                "title": "Task Manager",
                "titles": { "vi-vn": "Trình quản lý tác vụ" },
                "slug": "api/framework/task-manager",
                "file": "api/framework/task-manager.md"
              },
              {
                "title": "Singleton Base",
                "titles": { "vi-vn": "Lớp singleton cơ sở" },
                "slug": "api/framework/singleton-base",
                "file": "api/framework/singleton-base.md"
              },
              {
                "title": "Instance Manager",
                "titles": { "vi-vn": "Trình quản lý instance" },
                "slug": "api/framework/instance-manager",
                "file": "api/framework/instance-manager.md"
              }
            ]
          },
          {
            "title": "Options",
            "titles": { "vi-vn": "Tùy chọn" },
            "items": [
              {
                "title": "Worker Options",
                "titles": { "vi-vn": "Tùy chọn worker" },
                "slug": "api/framework/options/worker-options",
                "file": "api/framework/options/worker-options.md"
              },
              {
                "title": "Recurring Options",
                "titles": { "vi-vn": "Tùy chọn định kỳ" },
                "slug": "api/framework/options/recurring-options",
                "file": "api/framework/options/recurring-options.md"
              }
            ]
          },
          {
            "title": "Codec",
            "titles": { "vi-vn": "Codec" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/codec",
                "file": "api/codec/index.md"
              },
              {
                "title": "LZ4",
                "titles": { "vi-vn": "LZ4" },
                "slug": "api/codec/lz4",
                "file": "api/codec/lz4.md"
              },
              {
                "title": "Frame Pipeline",
                "titles": { "vi-vn": "Pipeline khung" },
                "slug": "api/codec/frame-pipeline",
                "file": "api/codec/frame-pipeline.md"
              },
              {
                "title": "Packets",
                "titles": { "vi-vn": "Gói tin" },
                "items": [
                  {
                    "title": "Frame Model",
                    "titles": { "vi-vn": "Mô hình khung" },
                    "slug": "api/codec/packets/frame-model",
                    "file": "api/codec/packets/frame-model.md"
                  },
                  {
                    "title": "Fragmentation",
                    "titles": { "vi-vn": "Phân mảnh" },
                    "slug": "api/codec/packets/fragmentation",
                    "file": "api/codec/packets/fragmentation.md"
                  },
                  {
                    "title": "Built-in Frames",
                    "titles": { "vi-vn": "Khung tích hợp sẵn" },
                    "slug": "api/codec/packets/built-in-frames",
                    "file": "api/codec/packets/built-in-frames.md"
                  },
                  {
                    "title": "Packet Registry",
                    "titles": { "vi-vn": "Registry gói tin" },
                    "slug": "api/codec/packets/packet-registry",
                    "file": "api/codec/packets/packet-registry.md"
                  }
                ]
              },
              {
                "title": "Serialization",
                "titles": { "vi-vn": "Tuần tự hóa" },
                "items": [
                  {
                    "title": "Serialization Basics",
                    "titles": { "vi-vn": "Kiến thức cơ bản về tuần tự hóa" },
                    "slug": "api/codec/serialization/serialization-basics",
                    "file": "api/codec/serialization/serialization-basics.md"
                  },
                  {
                    "title": "Packet Serialization",
                    "titles": { "vi-vn": "Tuần tự hóa gói tin" },
                    "slug": "api/codec/serialization/packet-serialization",
                    "file": "api/codec/serialization/packet-serialization.md"
                  },
                  {
                    "title": "Serialization Attributes",
                    "titles": { "vi-vn": "Thuộc tính tuần tự hóa" },
                    "slug": "api/abstractions/serialization-attributes",
                    "file": "api/abstractions/serialization-attributes.md"
                  },
                  {
                    "title": "Reader & Writer Extensions",
                    "titles": { "vi-vn": "Extension reader & writer" },
                    "slug": "api/codec/serialization/reader-writer-and-header-extensions",
                    "file": "api/codec/serialization/reader-writer-and-header-extensions.md"
                  }
                ]
              }
            ]
          },
          {
            "title": "Memory & Pooling",
            "titles": { "vi-vn": "Bộ nhớ & pooling" },
            "items": [
              {
                "title": "Packet Pooling",
                "titles": { "vi-vn": "Pooling gói tin" },
                "slug": "api/runtime/pooling/packet-pooling",
                "file": "api/runtime/pooling/packet-pooling.md"
              },
              {
                "title": "Object Pooling",
                "titles": { "vi-vn": "Pooling đối tượng" },
                "slug": "api/framework/memory/object-pooling",
                "file": "api/framework/memory/object-pooling.md"
              },
              {
                "title": "Object Map",
                "titles": { "vi-vn": "Object map" },
                "slug": "api/framework/memory/object-map",
                "file": "api/framework/memory/object-map.md"
              },
              {
                "title": "Typed Object Pools",
                "titles": { "vi-vn": "Pool đối tượng có kiểu" },
                "slug": "api/framework/memory/typed-object-pools",
                "file": "api/framework/memory/typed-object-pools.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Cryptography",
        "titles": { "vi-vn": "Mật mã" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/security/cryptography",
            "file": "api/security/cryptography.md"
          },
          {
            "title": "Hashing & MAC",
            "titles": { "vi-vn": "Hashing & MAC" },
            "slug": "api/security/hashing-and-mac",
            "file": "api/security/hashing-and-mac.md"
          },
          {
            "title": "AEAD & Envelope",
            "titles": { "vi-vn": "AEAD & Envelope" },
            "slug": "api/security/aead-and-envelope",
            "file": "api/security/aead-and-envelope.md"
          },
          {
            "title": "Key Exchange",
            "titles": { "vi-vn": "Trao đổi khóa" },
            "slug": "api/security/key-exchange",
            "file": "api/security/key-exchange.md"
          },
          {
            "title": "Handshake Protocol",
            "titles": { "vi-vn": "Giao thức handshake" },
            "slug": "api/security/handshake",
            "file": "api/security/handshake.md"
          },
          {
            "title": "Session Resumption",
            "titles": { "vi-vn": "Tiếp tục phiên" },
            "slug": "api/security/session-resume",
            "file": "api/security/session-resume.md"
          },
          {
            "title": "Session Rekey",
            "titles": { "vi-vn": "Đổi khóa phiên" },
            "slug": "api/security/session-rekey",
            "file": "api/security/session-rekey.md"
          },
          {
            "title": "Proof-of-Work",
            "titles": { "vi-vn": "Proof-of-Work" },
            "slug": "api/security/proof-of-work",
            "file": "api/security/proof-of-work.md"
          },
          {
            "title": "Permission Levels",
            "titles": { "vi-vn": "Mức phân quyền" },
            "slug": "api/security/permission-level",
            "file": "api/security/permission-level.md"
          }
        ]
      },
      {
        "title": "Runtime",
        "titles": { "vi-vn": "Runtime" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/runtime",
            "file": "api/runtime/index.md"
          },
          {
            "title": "Handlers",
            "titles": { "vi-vn": "Handler" },
            "slug": "api/runtime/handlers",
            "file": "api/runtime/handlers/index.md"
          },
          {
            "title": "Routing",
            "titles": { "vi-vn": "Định tuyến" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/runtime/routing",
                "file": "api/runtime/routing/index.md"
              },
              {
                "title": "Packet Context",
                "titles": { "vi-vn": "Ngữ cảnh gói tin" },
                "slug": "api/runtime/routing/packet-context",
                "file": "api/runtime/routing/packet-context.md"
              },
              {
                "title": "Packet Sender",
                "titles": { "vi-vn": "Bộ gửi gói tin" },
                "slug": "api/runtime/routing/packet-sender",
                "file": "api/runtime/routing/packet-sender.md"
              },
              {
                "title": "Dispatch Contracts",
                "titles": { "vi-vn": "Contract điều phối" },
                "slug": "api/runtime/routing/dispatch-contracts",
                "file": "api/runtime/routing/dispatch-contracts.md"
              },
              {
                "title": "Packet Dispatch",
                "titles": { "vi-vn": "Điều phối gói tin" },
                "slug": "api/runtime/routing/packet-dispatch",
                "file": "api/runtime/routing/packet-dispatch.md"
              },
              {
                "title": "Dispatch Channel & Router",
                "titles": { "vi-vn": "Kênh & router điều phối" },
                "slug": "api/runtime/routing/dispatch-channel-and-router",
                "file": "api/runtime/routing/dispatch-channel-and-router.md"
              },
              {
                "title": "Handler Return Types",
                "titles": { "vi-vn": "Kiểu trả về của handler" },
                "slug": "api/runtime/routing/handler-results",
                "file": "api/runtime/routing/handler-results.md"
              }
            ]
          },
          {
            "title": "Middleware",
            "titles": { "vi-vn": "Middleware" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/runtime/middleware",
                "file": "api/runtime/middleware/index.md"
              },
              {
                "title": "Middleware Pipeline",
                "titles": { "vi-vn": "Pipeline middleware" },
                "slug": "api/runtime/middleware/pipeline",
                "file": "api/runtime/middleware/pipeline.md"
              },
              {
                "title": "Policy Rate Limiter",
                "titles": { "vi-vn": "Bộ giới hạn tốc độ theo chính sách" },
                "slug": "api/runtime/middleware/policy-rate-limiter",
                "file": "api/runtime/middleware/policy-rate-limiter.md"
              },
              {
                "title": "Token Bucket Limiter",
                "titles": { "vi-vn": "Bộ giới hạn token bucket" },
                "slug": "api/runtime/middleware/token-bucket-limiter",
                "file": "api/runtime/middleware/token-bucket-limiter.md"
              },
              {
                "title": "Permission Middleware",
                "titles": { "vi-vn": "Middleware phân quyền" },
                "slug": "api/runtime/middleware/permission-middleware",
                "file": "api/runtime/middleware/permission-middleware.md"
              },
              {
                "title": "Timeout Middleware",
                "titles": { "vi-vn": "Middleware thời gian chờ" },
                "slug": "api/runtime/middleware/timeout-middleware",
                "file": "api/runtime/middleware/timeout-middleware.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Network",
        "titles": { "vi-vn": "Mạng" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/network",
            "file": "api/network/index.md"
          },
          {
            "title": "Protocol",
            "titles": { "vi-vn": "Giao thức" },
            "slug": "api/network/protocol",
            "file": "api/network/protocol.md"
          },
          {
            "title": "TCP Listener",
            "titles": { "vi-vn": "TCP Listener" },
            "slug": "api/network/tcp-listener",
            "file": "api/network/tcp-listener.md"
          },
          {
            "title": "UDP Listener",
            "titles": { "vi-vn": "UDP Listener" },
            "slug": "api/network/udp-listener",
            "file": "api/network/udp-listener.md"
          },
          {
            "title": "WebSocket Listener",
            "titles": { "vi-vn": "WebSocket Listener" },
            "slug": "api/network/websocket-listener",
            "file": "api/network/websocket-listener.md"
          },
          {
            "title": "Socket Connection",
            "titles": { "vi-vn": "Kết nối socket" },
            "slug": "api/network/socket-connection",
            "file": "api/network/socket-connection.md"
          },
          {
            "title": "WebSocket Connection",
            "titles": { "vi-vn": "Kết nối WebSocket" },
            "slug": "api/network/websocket-connection",
            "file": "api/network/websocket-connection.md"
          },
          {
            "title": "Session Store",
            "titles": { "vi-vn": "Kho lưu phiên" },
            "slug": "api/network/session-store",
            "file": "api/network/session-store.md"
          },
          {
            "title": "Connection",
            "titles": { "vi-vn": "Kết nối" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/network/connection/connection",
                "file": "api/network/connection/connection.md"
              },
              {
                "title": "Connection Hub",
                "titles": { "vi-vn": "Connection Hub" },
                "slug": "api/network/connection/connection-hub",
                "file": "api/network/connection/connection-hub.md"
              },
              {
                "title": "Connection Events",
                "titles": { "vi-vn": "Sự kiện kết nối" },
                "slug": "api/network/connection/connection-events",
                "file": "api/network/connection/connection-events.md"
              },
              {
                "title": "Connection Extensions",
                "titles": { "vi-vn": "Extension kết nối" },
                "slug": "api/network/connection/connection-extensions",
                "file": "api/network/connection/connection-extensions.md"
              },
              {
                "title": "Connection Limiter",
                "titles": { "vi-vn": "Connection Limiter" },
                "slug": "api/network/connection/connection-limiter",
                "file": "api/network/connection/connection-limiter.md"
              },
              {
                "title": "Connection Guard",
                "titles": { "vi-vn": "Connection Guard" },
                "slug": "api/network/connection/connection-guard",
                "file": "api/network/connection/connection-guard.md"
              }
            ]
          },
          {
            "title": "Time",
            "titles": { "vi-vn": "Thời gian" },
            "items": [
              {
                "title": "Time Synchronizer",
                "titles": { "vi-vn": "Time Synchronizer" },
                "slug": "api/network/time/time-synchronizer",
                "file": "api/network/time/time-synchronizer.md"
              },
              {
                "title": "Timing Wheel",
                "titles": { "vi-vn": "Timing Wheel" },
                "slug": "api/network/time/timing-wheel",
                "file": "api/network/time/timing-wheel.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Hosting",
        "titles": { "vi-vn": "Hosting" },
        "items": [
          {
            "title": "Network Application",
            "titles": { "vi-vn": "Ứng dụng mạng" },
            "slug": "api/hosting/network-application",
            "file": "api/hosting/network-application.md"
          },
          {
            "title": "WebSocket Binding",
            "titles": { "vi-vn": "Binding WebSocket" },
            "slug": "api/hosting/websocket-binding",
            "file": "api/hosting/websocket-binding.md"
          }
        ]
      },
      {
        "title": "SDK",
        "titles": { "vi-vn": "SDK" },
        "items": [
          {
            "title": "Overview",
            "titles": { "vi-vn": "Tổng quan" },
            "slug": "api/sdk",
            "file": "api/sdk/index.md"
          },
          {
            "title": "High-Level APIs",
            "titles": { "vi-vn": "API mức cao" },
            "items": [
              {
                "title": "TCP Session",
                "titles": { "vi-vn": "Phiên TCP" },
                "slug": "api/sdk/tcp-session",
                "file": "api/sdk/tcp-session.md"
              },
              {
                "title": "UDP Session",
                "titles": { "vi-vn": "Phiên UDP" },
                "slug": "api/sdk/udp-session",
                "file": "api/sdk/udp-session.md"
              },
              {
                "title": "WebSocket Session",
                "titles": { "vi-vn": "Phiên WebSocket" },
                "slug": "api/sdk/websocket-session",
                "file": "api/sdk/websocket-session.md"
              },
              {
                "title": "Handshake Extensions",
                "titles": { "vi-vn": "Extension handshake" },
                "slug": "api/sdk/handshake-extensions",
                "file": "api/sdk/handshake-extensions.md"
              },
              {
                "title": "Resume Extensions",
                "titles": { "vi-vn": "Extension tiếp tục phiên" },
                "slug": "api/sdk/resume-extensions",
                "file": "api/sdk/resume-extensions.md"
              },
              {
                "title": "Session Extensions",
                "titles": { "vi-vn": "Extension phiên" },
                "slug": "api/sdk/tcp-session-extensions",
                "file": "api/sdk/tcp-session-extensions.md"
              },
              {
                "title": "Cipher Extensions",
                "titles": { "vi-vn": "Extension mã hóa" },
                "slug": "api/sdk/cipher-extensions",
                "file": "api/sdk/cipher-extensions.md"
              },
              {
                "title": "Control Utilities",
                "titles": { "vi-vn": "Tiện ích điều khiển" },
                "slug": "api/sdk/control-utilities",
                "file": "api/sdk/control-utilities.md"
              },
              {
                "title": "Session Diagnostics",
                "titles": { "vi-vn": "Chẩn đoán phiên" },
                "slug": "api/sdk/diagnostics",
                "file": "api/sdk/diagnostics.md"
              },
              {
                "title": "Session Subscriptions",
                "titles": { "vi-vn": "Đăng ký phiên" },
                "slug": "api/sdk/subscriptions",
                "file": "api/sdk/subscriptions.md"
              }
            ]
          },
          {
            "title": "Low-Level Primitives",
            "titles": { "vi-vn": "Nguyên thủy mức thấp" },
            "items": [
              {
                "title": "Thread Dispatching",
                "titles": { "vi-vn": "Điều phối luồng" },
                "slug": "api/sdk/thread-dispatching",
                "file": "api/sdk/thread-dispatching.md"
              },
              {
                "title": "Frame Reader & Sender",
                "titles": { "vi-vn": "Reader & sender khung" },
                "slug": "api/sdk/frame-reader-and-sender",
                "file": "api/sdk/frame-reader-and-sender.md"
              },
              {
                "title": "Transport Session",
                "titles": { "vi-vn": "Phiên transport" },
                "slug": "api/sdk/transport-session",
                "file": "api/sdk/transport-session.md"
              },
              {
                "title": "Protocol String Extensions",
                "titles": { "vi-vn": "Extension chuỗi giao thức" },
                "slug": "api/sdk/protocol-string-extensions",
                "file": "api/sdk/protocol-string-extensions.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Options",
        "titles": { "vi-vn": "Tùy chọn" },
        "items": [
          {
            "title": "Runtime",
            "titles": { "vi-vn": "Runtime" },
            "items": [
              {
                "title": "Packet Dispatch",
                "titles": { "vi-vn": "Điều phối gói tin" },
                "slug": "api/options/runtime/packet-dispatch-options",
                "file": "api/options/runtime/packet-dispatch-options.md"
              },
              {
                "title": "Dispatch",
                "titles": { "vi-vn": "Điều phối" },
                "slug": "api/options/runtime/dispatch-options",
                "file": "api/options/runtime/dispatch-options.md"
              }
            ]
          },
          {
            "title": "Network",
            "titles": { "vi-vn": "Mạng" },
            "items": [
              {
                "title": "Overview",
                "titles": { "vi-vn": "Tổng quan" },
                "slug": "api/options/network/options",
                "file": "api/options/network/options.md"
              },
              {
                "title": "Network Socket",
                "titles": { "vi-vn": "Socket mạng" },
                "slug": "api/options/network/network-socket-options",
                "file": "api/options/network/network-socket-options.md"
              },
              {
                "title": "Connection Quota",
                "titles": { "vi-vn": "Hạn mức kết nối" },
                "slug": "api/options/network/connection-quota-options",
                "file": "api/options/network/connection-quota-options.md"
              },
              {
                "title": "Connection Guard",
                "titles": { "vi-vn": "Connection Guard" },
                "slug": "api/options/network/connection-guard-options",
                "file": "api/options/network/connection-guard-options.md"
              },
              {
                "title": "Connection Ban Store",
                "titles": { "vi-vn": "Kho cấm kết nối" },
                "slug": "api/options/network/connection-ban-store-options",
                "file": "api/options/network/connection-ban-store-options.md"
              },
              {
                "title": "Connection Blacklist Store",
                "titles": { "vi-vn": "Kho danh sách đen kết nối" },
                "slug": "api/options/network/connection-blacklist-store-options",
                "file": "api/options/network/connection-blacklist-store-options.md"
              },
              {
                "title": "Trusted Proxy",
                "titles": { "vi-vn": "Trusted Proxy" },
                "slug": "api/options/network/trusted-proxy-options",
                "file": "api/options/network/trusted-proxy-options.md"
              },
              {
                "title": "Proxy Protocol",
                "titles": { "vi-vn": "Proxy Protocol" },
                "slug": "api/options/network/proxy-protocol-options",
                "file": "api/options/network/proxy-protocol-options.md"
              },
              {
                "title": "Connection Hub",
                "titles": { "vi-vn": "Connection Hub" },
                "slug": "api/options/network/connection-hub-options",
                "file": "api/options/network/connection-hub-options.md"
              },
              {
                "title": "WebSocket Transport",
                "titles": { "vi-vn": "Transport WebSocket" },
                "slug": "api/options/network/websocket-options",
                "file": "api/options/network/websocket-options.md"
              },
              {
                "title": "Datagram Guard",
                "titles": { "vi-vn": "Datagram Guard" },
                "slug": "api/options/network/datagram-guard-options",
                "file": "api/options/network/datagram-guard-options.md"
              },
              {
                "title": "Timing Wheel",
                "titles": { "vi-vn": "Timing Wheel" },
                "slug": "api/options/network/timing-wheel-options",
                "file": "api/options/network/timing-wheel-options.md"
              },
              {
                "title": "Pooling",
                "titles": { "vi-vn": "Pooling" },
                "slug": "api/options/network/pooling-options",
                "file": "api/options/network/pooling-options.md"
              },
              {
                "title": "Network Callback",
                "titles": { "vi-vn": "Callback mạng" },
                "slug": "api/options/network/network-callback-options",
                "file": "api/options/network/network-callback-options.md"
              },
              {
                "title": "Session Store",
                "titles": { "vi-vn": "Kho lưu phiên" },
                "slug": "api/options/network/session-store-options",
                "file": "api/options/network/session-store-options.md"
              },
              {
                "title": "Compression",
                "titles": { "vi-vn": "Nén" },
                "slug": "api/options/network/compression-options",
                "file": "api/options/network/compression-options.md"
              },
              {
                "title": "Token Bucket",
                "titles": { "vi-vn": "Token Bucket" },
                "slug": "api/options/network/token-bucket-options",
                "file": "api/options/network/token-bucket-options.md"
              },
              {
                "title": "Directive Guard",
                "titles": { "vi-vn": "Directive Guard" },
                "slug": "api/options/network/directive-guard-options",
                "file": "api/options/network/directive-guard-options.md"
              }
            ]
          },
          {
            "title": "Hosting",
            "titles": { "vi-vn": "Hosting" },
            "slug": "api/options/hosting/hosting-options",
            "file": "api/options/hosting/hosting-options.md"
          },
          {
            "title": "SDK",
            "titles": { "vi-vn": "SDK" },
            "items": [
              {
                "title": "Transport",
                "titles": { "vi-vn": "Transport" },
                "slug": "api/options/sdk/transport-options",
                "file": "api/options/sdk/transport-options.md"
              },
              {
                "title": "WebSocket Transport",
                "titles": { "vi-vn": "Transport WebSocket" },
                "slug": "api/options/sdk/websocket-transport-options",
                "file": "api/options/sdk/websocket-transport-options.md"
              },
              {
                "title": "Request",
                "titles": { "vi-vn": "Yêu cầu" },
                "slug": "api/options/sdk/request-options",
                "file": "api/options/sdk/request-options.md"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "title": "Benchmarks",
    "titles": { "vi-vn": "Hiệu năng" },
    "items": [
      {
        "title": "Overview",
        "titles": { "vi-vn": "Tổng quan" },
        "slug": "benchmarks",
        "file": "benchmarks/index.md"
      },
      {
        "title": "Core Infrastructure",
        "titles": { "vi-vn": "Hạ tầng cốt lõi" },
        "slug": "benchmarks/infrastructure",
        "file": "benchmarks/infrastructure.md"
      },
      {
        "title": "Memory & Storage",
        "titles": { "vi-vn": "Bộ nhớ & lưu trữ" },
        "slug": "benchmarks/memory",
        "file": "benchmarks/memory.md"
      },
      {
        "title": "Data Processing",
        "titles": { "vi-vn": "Xử lý dữ liệu" },
        "slug": "benchmarks/data-processing",
        "file": "benchmarks/data-processing.md"
      },
      {
        "title": "Security & Cryptography",
        "titles": { "vi-vn": "Bảo mật & mật mã" },
        "slug": "benchmarks/security",
        "file": "benchmarks/security.md"
      },
      {
        "title": "Serialization",
        "titles": { "vi-vn": "Tuần tự hóa" },
        "slug": "benchmarks/serialization",
        "file": "benchmarks/serialization.md"
      },
      {
        "title": "Serialization Comparison",
        "titles": { "vi-vn": "So sánh tuần tự hóa" },
        "slug": "benchmarks/serialization-method-compare",
        "file": "benchmarks/serialization-method-compare.md"
      },
      {
        "title": "Network Comparison",
        "titles": { "vi-vn": "So sánh mạng" },
        "slug": "benchmarks/network-comparison",
        "file": "benchmarks/network-comparison.md"
      }
    ]
  }
];

export interface FlatNavLink {
  title: string;
  slug: string;
  file: string;
  section: string;
  breadcrumbs: string[];
}

/**
 * Returns localized title for a NavItem
 */
export function getNavTitle(item: NavItem, locale: LocaleCode): string {
  return item.titles?.[locale] ?? item.title;
}

/**
 * Flattens all leaf links in the navigation tree in reading order (deduplicating repeated links).
 */
export function getFlatNavigation(tree: NavItem[] = NAVIGATION_TREE): FlatNavLink[] {
  const result: FlatNavLink[] = [];
  const seenSlugs = new Set<string>();

  function walk(items: NavItem[], topSection: string, trail: string[]) {
    for (const item of items) {
      const currentTop = topSection || item.title;
      const nextTrail = [...trail, item.title];
      if (typeof item.slug === 'string' && item.file) {
        if (!seenSlugs.has(item.slug)) {
          seenSlugs.add(item.slug);
          result.push({
            title: item.title,
            slug: item.slug,
            file: item.file,
            section: currentTop,
            breadcrumbs: nextTrail,
          });
        }
      }
      if (item.items && item.items.length > 0) {
        walk(item.items, currentTop, nextTrail);
      }
    }
  }

  walk(tree, '', []);
  return result;
}

/**
 * Returns all referenced markdown files in the navigation tree (including duplicates if any).
 */
export function getAllNavFiles(tree: NavItem[] = NAVIGATION_TREE): Set<string> {
  const files = new Set<string>();
  function walk(items: NavItem[]) {
    for (const item of items) {
      if (item.file) files.add(item.file);
      if (item.items) walk(item.items);
    }
  }
  walk(tree);
  return files;
}

/**
 * Finds Previous and Next links for a given canonical slug.
 */
export function getPrevNextLinks(slug: string): { prev: FlatNavLink | null; next: FlatNavLink | null } {
  const flat = getFlatNavigation();
  const idx = flat.findIndex((item) => item.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

/**
 * Finds the top-level navigation section and breadcrumb trail for a given slug.
 */
export function getNavContextForSlug(slug: string): {
  topSection: NavItem | null;
  breadcrumbs: string[];
} {
  for (const top of NAVIGATION_TREE) {
    if (top.slug === slug) {
      return { topSection: top, breadcrumbs: [top.title] };
    }
    if (top.items) {
      const found = findInSubtree(top.items, slug, [top.title]);
      if (found) {
        return { topSection: top, breadcrumbs: found };
      }
    }
  }
  return { topSection: NAVIGATION_TREE[0] ?? null, breadcrumbs: [] };
}

function findInSubtree(items: NavItem[], targetSlug: string, trail: string[]): string[] | null {
  for (const item of items) {
    const nextTrail = [...trail, item.title];
    if (item.slug === targetSlug) {
      return nextTrail;
    }
    if (item.items) {
      const res = findInSubtree(item.items, targetSlug, nextTrail);
      if (res) return res;
    }
  }
  return null;
}

/**
 * Top-level header tabs for quick jumping across major documentation pillars.
 */
export function getTopLevelTabs(locale: LocaleCode) {
  const t = useTranslations(locale);
  return [
    { title: t('nav.startHere'), sectionTitle: 'Start Here', href: localizePath('quickstart', locale) },
    { title: t('nav.guides'), sectionTitle: 'Guides', href: localizePath('guides', locale) },
    { title: t('nav.concepts'), sectionTitle: 'Concepts', href: localizePath('concepts', locale) },
    { title: t('nav.packages'), sectionTitle: 'Packages', href: localizePath('packages', locale) },
    { title: t('nav.api'), sectionTitle: 'API', href: localizePath('api', locale) },
    { title: t('nav.benchmarks'), sectionTitle: 'Benchmarks', href: localizePath('benchmarks', locale) },
  ];
}

export interface MegaLink {
  title: string;
  href: string;
  external?: boolean;
}

export interface MegaColumn {
  /** Column heading; empty for a continuation of the previous column. */
  title: string;
  /** Where the heading leads (the group's overview page). */
  href?: string;
  links: MegaLink[];
}

export interface MegaTab {
  title: string;
  sectionTitle: string;
  /** Sections this tab stands for (it is highlighted on pages of any of them). */
  sectionTitles: string[];
  href: string;
  columns: MegaColumn[];
  /** Last line of the panel, leading to the whole section. */
  footer: MegaLink;
}

/** Pages shown per column: the first ones of the group, in navigation order. */
const MEGA_MAX_LINKS_PER_COLUMN = 5;
/** A section that is a plain list of pages (no groups) fills columns of this size. */
const MEGA_MAX_FLAT_LINKS_PER_COLUMN = 8;

const isOverview = (item: NavItem) => item.title === 'Overview';

function leafPages(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.items ? leafPages(item.items) : item.slug !== undefined ? [item] : []));
}

/**
 * Content of the drop-down panels of the primary navigation: one panel per top-level section.
 * A group becomes a column whose heading links to the group's overview, so the overview page is
 * not repeated in the list; only the first few pages of the group are listed.
 */
export function getMegaMenu(locale: LocaleCode): MegaTab[] {
  const t = useTranslations(locale);
  const link = (item: NavItem): MegaLink => ({ title: getNavTitle(item, locale), href: localizePath(item.slug ?? '', locale) });

  const tabs = getTopLevelTabs(locale).map((tab): MegaTab => {
    const section = NAVIGATION_TREE.find((node) => node.title === tab.sectionTitle);
    const children = section?.items ?? [];
    const columns: MegaColumn[] = [];

    const flat = children.filter((child) => !child.items && !isOverview(child));
    for (let i = 0; i < flat.length; i += MEGA_MAX_FLAT_LINKS_PER_COLUMN) {
      columns.push({
        title: i === 0 ? tab.title : '',
        href: i === 0 ? tab.href : undefined,
        links: flat.slice(i, i + MEGA_MAX_FLAT_LINKS_PER_COLUMN).map(link),
      });
    }

    for (const group of children.filter((child) => child.items)) {
      const pages = leafPages(group.items ?? []);
      if (!pages.length) continue;
      const overview = pages.find(isOverview) ?? pages[0];
      // Direct children only: a sub-group is one line named after the sub-group, so
      // identical page titles of nested groups never repeat in a column.
      const entries = (group.items ?? [])
        .filter((child) => !isOverview(child))
        .flatMap((child): MegaLink[] => {
          const target = child.items ? leafPages(child.items)[0] : child;
          return target?.slug === undefined ? [] : [{ title: getNavTitle(child, locale), href: link(target).href }];
        });
      columns.push({
        title: getNavTitle(group, locale),
        href: link(overview).href,
        links: entries.slice(0, MEGA_MAX_LINKS_PER_COLUMN),
      });
    }

    if (tab.sectionTitle === 'Start Here') {
      columns.push({
        title: t('nav.resources'),
        links: [
          { title: t('nav.github'), href: 'https://github.com/ppn-systems/nalix', external: true },
          { title: t('nav.nuget'), href: 'https://www.nuget.org/packages?q=Nalix', external: true },
        ],
      });
    }
    return {
      ...tab,
      sectionTitles: [tab.sectionTitle],
      columns,
      footer: { title: t('nav.viewAll').replace('{title}', tab.title), href: tab.href },
    };
  });

  // Benchmarks has no tab of its own: its pages are a column of the Packages panel.
  const benchmarks = tabs.find((tab) => tab.sectionTitle === 'Benchmarks');
  const packages = tabs.find((tab) => tab.sectionTitle === 'Packages');
  if (!benchmarks || !packages) return tabs;
  packages.columns.push(...benchmarks.columns);
  packages.sectionTitles.push(benchmarks.sectionTitle);
  return tabs.filter((tab) => tab !== benchmarks);
}
