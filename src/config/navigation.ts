// Auto-generated and synchronized with Nalix documentation structure (Rule R8)
import type { LocaleCode } from '../i18n/config';
import { localizePath, useTranslations } from '../i18n';

export interface NavItem {
  title: string;
  titleVi?: string;
  /** Canonical doc slug (empty string '' for root index) */
  slug?: string;
  /** Source markdown file path relative to locale folder */
  file?: string;
  items?: NavItem[];
}

export const NAVIGATION_TREE: NavItem[] = [
  {
    "title": "Overview",
    "titleVi": "Tổng quan",
    "slug": "",
    "file": "index.md"
  },
  {
    "title": "Start Here",
    "titleVi": "Bắt đầu",
    "items": [
      {
        "title": "Quick Start",
        "titleVi": "Bắt đầu nhanh",
        "slug": "quickstart",
        "file": "quickstart.md"
      },
      {
        "title": "Installation",
        "titleVi": "Cài đặt",
        "slug": "installation",
        "file": "installation.md"
      },
      {
        "title": "Your First Server",
        "titleVi": "Máy chủ đầu tiên",
        "slug": "guides/getting-started/your-first-server",
        "file": "guides/getting-started/your-first-server.md"
      },
      {
        "title": "Server Blueprint",
        "titleVi": "Kiến trúc máy chủ mẫu",
        "slug": "guides/getting-started/server-blueprint",
        "file": "guides/getting-started/server-blueprint.md"
      }
    ]
  },
  {
    "title": "Guides",
    "titleVi": "Hướng dẫn",
    "items": [
      {
        "title": "Overview",
        "titleVi": "Tổng quan",
        "slug": "guides",
        "file": "guides/index.md"
      },
      {
        "title": "Tutorials",
        "titleVi": "Bài tập thực hành",
        "items": [
          {
            "title": "Build a Chat Room",
            "titleVi": "Xây dựng phòng Chat",
            "slug": "guides/build-a-chat-room",
            "file": "guides/build-a-chat-room.md"
          },
          {
            "title": "Blazor WebAssembly",
            "titleVi": "Blazor WebAssembly",
            "slug": "guides/blazor-wasm",
            "file": "guides/blazor-wasm.md"
          },
          {
            "title": "Securing Your Server",
            "titleVi": "Bảo mật máy chủ",
            "slug": "guides/securing-your-server",
            "file": "guides/securing-your-server.md"
          }
        ]
      },
      {
        "title": "Application Logic",
        "titleVi": "Logic ứng dụng",
        "items": [
          {
            "title": "Packet Handlers",
            "titleVi": "Xử lý gói tin",
            "slug": "guides/application/packet-handlers",
            "file": "guides/application/packet-handlers.md"
          },
          {
            "title": "Middleware Usage",
            "titleVi": "Sử dụng Middleware",
            "slug": "guides/application/middleware-usage",
            "file": "guides/application/middleware-usage.md"
          }
        ]
      },
      {
        "title": "Networking",
        "titleVi": "Mạng & Kết nối",
        "items": [
          {
            "title": "Client Sessions",
            "titleVi": "Phiên kết nối Client",
            "slug": "guides/networking/connecting-clients",
            "file": "guides/networking/connecting-clients.md"
          },
          {
            "title": "TCP Patterns",
            "titleVi": "Mẫu kết nối TCP",
            "slug": "guides/networking/tcp-patterns",
            "file": "guides/networking/tcp-patterns.md"
          },
          {
            "title": "UDP Server",
            "titleVi": "Máy chủ UDP",
            "slug": "guides/networking/udp-server",
            "file": "guides/networking/udp-server.md"
          },
          {
            "title": "UDP Security",
            "titleVi": "Bảo mật UDP",
            "slug": "guides/networking/udp-security",
            "file": "guides/networking/udp-security.md"
          },
          {
            "title": "Idle Connection Timeout",
            "titleVi": "Thời gian chờ kết nối rỗi",
            "slug": "guides/networking/idle-timeout-configuration",
            "file": "guides/networking/idle-timeout-configuration.md"
          }
        ]
      },
      {
        "title": "Extensibility",
        "titleVi": "Mở rộng hệ thống",
        "items": [
          {
            "title": "Custom Middleware",
            "titleVi": "Tùy chỉnh Middleware",
            "slug": "guides/extensibility/custom-middleware",
            "file": "guides/extensibility/custom-middleware.md"
          },
          {
            "title": "Custom Packet Router",
            "titleVi": "Tùy chỉnh bộ định tuyến",
            "slug": "guides/extensibility/custom-packet-router",
            "file": "guides/extensibility/custom-packet-router.md"
          },
          {
            "title": "Custom Metadata Providers",
            "titleVi": "Tùy chỉnh Metadata Provider",
            "slug": "guides/extensibility/metadata-providers",
            "file": "guides/extensibility/metadata-providers.md"
          },
          {
            "title": "Custom Serialization Providers",
            "titleVi": "Tùy chỉnh tuần tự hóa",
            "slug": "guides/extensibility/serialization-providers",
            "file": "guides/extensibility/serialization-providers.md"
          }
        ]
      },
      {
        "title": "Deployment & Operations",
        "titleVi": "Triển khai & Vận hành",
        "items": [
          {
            "title": "Production Checklist",
            "titleVi": "Danh mục kiểm tra Production",
            "slug": "guides/deployment/production-checklist",
            "file": "guides/deployment/production-checklist.md"
          },
          {
            "title": "Reverse Proxy & TLS",
            "titleVi": "Reverse Proxy & TLS",
            "slug": "guides/deployment/reverse-proxy-tls",
            "file": "guides/deployment/reverse-proxy-tls.md"
          },
          {
            "title": "Troubleshooting",
            "titleVi": "Xử lý sự cố",
            "slug": "guides/deployment/troubleshooting",
            "file": "guides/deployment/troubleshooting.md"
          }
        ]
      }
    ]
  },
  {
    "title": "Concepts",
    "titleVi": "Khái niệm",
    "items": [
      {
        "title": "Overview",
        "titleVi": "Tổng quan",
        "slug": "concepts",
        "file": "concepts/index.md"
      },
      {
        "title": "Core Concepts",
        "titleVi": "Khái niệm cốt lõi",
        "items": [
          {
            "title": "How Packets Work",
            "slug": "concepts/how-packets-work",
            "file": "concepts/how-packets-work.md"
          },
          {
            "title": "Handlers & Middleware",
            "slug": "concepts/handlers-and-middleware",
            "file": "concepts/handlers-and-middleware.md"
          },
          {
            "title": "Configuration",
            "slug": "concepts/configuration",
            "file": "concepts/configuration.md"
          },
          {
            "title": "Hosting Model",
            "slug": "concepts/application/hosting-model",
            "file": "concepts/application/hosting-model.md"
          },
          {
            "title": "Glossary",
            "slug": "concepts/glossary",
            "file": "concepts/glossary.md"
          }
        ]
      },
      {
        "title": "Architecture & Internals",
        "titleVi": "Kiến trúc nội bộ",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "concepts/internals",
            "file": "concepts/internals/index.md"
          },
          {
            "title": "System Architecture",
            "slug": "concepts/internals/architecture",
            "file": "concepts/internals/architecture.md"
          },
          {
            "title": "Packet Lifecycle",
            "slug": "concepts/internals/packet-lifecycle",
            "file": "concepts/internals/packet-lifecycle.md"
          },
          {
            "title": "Binary Specification",
            "slug": "concepts/internals/binary-spec",
            "file": "concepts/internals/binary-spec.md"
          },
          {
            "title": "Real-Time Engine",
            "slug": "concepts/internals/real-time-engine",
            "file": "concepts/internals/real-time-engine.md"
          },
          {
            "title": "Middleware Pipeline",
            "slug": "concepts/internals/middleware-pipeline",
            "file": "concepts/internals/middleware-pipeline.md"
          },
          {
            "title": "Configuration System",
            "slug": "concepts/internals/configuration",
            "file": "concepts/internals/configuration.md"
          },
          {
            "title": "Sharding & Concurrency",
            "slug": "concepts/internals/sharding",
            "file": "concepts/internals/sharding.md"
          },
          {
            "title": "Zero-Allocation Path",
            "slug": "concepts/internals/zero-allocation",
            "file": "concepts/internals/zero-allocation.md"
          },
          {
            "title": "Errors & Diagnostics",
            "slug": "concepts/internals/errors-and-diagnostics",
            "file": "concepts/internals/errors-and-diagnostics.md"
          },
          {
            "title": "Guarantees & Failure Handling",
            "slug": "concepts/internals/guarantees-and-failure-handling",
            "file": "concepts/internals/guarantees-and-failure-handling.md"
          },
          {
            "title": "Design Tradeoffs",
            "slug": "concepts/internals/design-tradeoffs",
            "file": "concepts/internals/design-tradeoffs.md"
          },
          {
            "title": "Performance Optimizations",
            "slug": "concepts/internals/performance-optimizations",
            "file": "concepts/internals/performance-optimizations.md"
          }
        ]
      },
      {
        "title": "Security Model",
        "titleVi": "Mô hình bảo mật",
        "items": [
          {
            "title": "Security Architecture",
            "slug": "concepts/internals/security-architecture",
            "file": "concepts/internals/security-architecture.md"
          },
          {
            "title": "Encryption Model",
            "slug": "concepts/internals/encryption-model",
            "file": "concepts/internals/encryption-model.md"
          },
          {
            "title": "Handshake Protocol",
            "slug": "concepts/internals/handshake-protocol",
            "file": "concepts/internals/handshake-protocol.md"
          },
          {
            "title": "Session Resumption",
            "slug": "concepts/internals/session-resumption",
            "file": "concepts/internals/session-resumption.md"
          }
        ]
      },
      {
        "title": "Advanced Topics",
        "titleVi": "Chủ đề nâng cao",
        "items": [
          {
            "title": "Manual Server Wiring",
            "slug": "concepts/internals/minimal-server",
            "file": "concepts/internals/minimal-server.md"
          },
          {
            "title": "Low-Level Session APIs",
            "slug": "concepts/internals/low-level-session-apis",
            "file": "concepts/internals/low-level-session-apis.md"
          },
          {
            "title": "BufferLease Utilization",
            "slug": "concepts/internals/buffer-lease-utilization",
            "file": "concepts/internals/buffer-lease-utilization.md"
          },
          {
            "title": "Buffer Pooling",
            "slug": "concepts/internals/buffer-pooling-configuration",
            "file": "concepts/internals/buffer-pooling-configuration.md"
          }
        ]
      }
    ]
  },
  {
    "title": "Packages",
    "titleVi": "Gói thư viện",
    "items": [
      {
        "title": "Overview",
        "titleVi": "Tổng quan",
        "slug": "packages",
        "file": "packages/index.md"
      },
      {
        "title": "Nalix.Abstractions",
        "slug": "packages/nalix-abstractions",
        "file": "packages/nalix-abstractions.md"
      },
      {
        "title": "Nalix.Environment",
        "slug": "packages/nalix-environment",
        "file": "packages/nalix-environment.md"
      },
      {
        "title": "Nalix.Codec",
        "slug": "packages/nalix-codec",
        "file": "packages/nalix-codec.md"
      },
      {
        "title": "Nalix.Framework",
        "slug": "packages/nalix-framework",
        "file": "packages/nalix-framework.md"
      },
      {
        "title": "Nalix.Network",
        "slug": "packages/nalix-network",
        "file": "packages/nalix-network.md"
      },
      {
        "title": "Nalix.Runtime",
        "slug": "packages/nalix-runtime",
        "file": "packages/nalix-runtime.md"
      },
      {
        "title": "Nalix.Hosting",
        "slug": "packages/nalix-hosting",
        "file": "packages/nalix-hosting.md"
      },
      {
        "title": "Nalix.SDK",
        "slug": "packages/nalix-sdk",
        "file": "packages/nalix-sdk.md"
      }
    ]
  },
  {
    "title": "API",
    "titleVi": "Tài liệu API",
    "items": [
      {
        "title": "Overview",
        "titleVi": "Tổng quan",
        "slug": "api",
        "file": "api/index.md"
      },
      {
        "title": "Analyzers",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/analyzers",
            "file": "api/analyzers/index.md"
          },
          {
            "title": "Diagnostic Codes",
            "slug": "api/analyzers/diagnostic-codes",
            "file": "api/analyzers/diagnostic-codes.md"
          },
          {
            "title": "Code Fixes",
            "slug": "api/analyzers/code-fixes",
            "file": "api/analyzers/code-fixes.md"
          },
          {
            "title": "Generators",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/analyzers/autogen",
                "file": "api/analyzers/autogen/index.md"
              },
              {
                "title": "Packet Handler",
                "slug": "api/analyzers/autogen/packet-handler-generator",
                "file": "api/analyzers/autogen/packet-handler-generator.md"
              },
              {
                "title": "Instance",
                "slug": "api/analyzers/autogen/instance-generator",
                "file": "api/analyzers/autogen/instance-generator.md"
              },
              {
                "title": "Serialization",
                "slug": "api/analyzers/autogen/serialization-generator",
                "file": "api/analyzers/autogen/serialization-generator.md"
              },
              {
                "title": "Packet Registry",
                "slug": "api/analyzers/autogen/packet-registry-generator",
                "file": "api/analyzers/autogen/packet-registry-generator.md"
              },
              {
                "title": "Packet Schema",
                "slug": "api/analyzers/autogen/packet-schema-generator",
                "file": "api/analyzers/autogen/packet-schema-generator.md"
              },
              {
                "title": "Configuration",
                "slug": "api/analyzers/autogen/configuration-generator",
                "file": "api/analyzers/autogen/configuration-generator.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Abstractions",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/abstractions",
            "file": "api/abstractions/index.md"
          },
          {
            "title": "Control Type",
            "slug": "api/abstractions/protocols/control-type",
            "file": "api/abstractions/protocols/control-type.md"
          },
          {
            "title": "Packet Contracts",
            "slug": "api/abstractions/packet-contracts",
            "file": "api/abstractions/packet-contracts.md"
          },
          {
            "title": "Connection Contracts",
            "slug": "api/abstractions/connection-contracts",
            "file": "api/abstractions/connection-contracts.md"
          },
          {
            "title": "Session Contracts",
            "slug": "api/abstractions/session-contracts",
            "file": "api/abstractions/session-contracts.md"
          },
          {
            "title": "Concurrency Contracts",
            "slug": "api/abstractions/concurrency-contracts",
            "file": "api/abstractions/concurrency-contracts.md"
          },
          {
            "title": "Packet Attributes",
            "slug": "api/abstractions/packet-attributes",
            "file": "api/abstractions/packet-attributes.md"
          },
          {
            "title": "Packet Metadata",
            "slug": "api/abstractions/packet-metadata",
            "file": "api/abstractions/packet-metadata.md"
          },
          {
            "title": "Enums",
            "slug": "api/abstractions/enums",
            "file": "api/abstractions/enums.md"
          },
          {
            "title": "Validation Attributes",
            "slug": "api/abstractions/validation",
            "file": "api/abstractions/validation.md"
          },
          {
            "title": "Injection Attributes",
            "slug": "api/abstractions/injection",
            "file": "api/abstractions/injection.md"
          }
        ]
      },
      {
        "title": "Framework",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/framework",
            "file": "api/framework/index.md"
          },
          {
            "title": "Environment",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/environment",
                "file": "api/environment/index.md"
              },
              {
                "title": "Directories",
                "slug": "api/environment/directories",
                "file": "api/environment/directories.md"
              },
              {
                "title": "Clock",
                "slug": "api/environment/clock",
                "file": "api/environment/clock.md"
              },
              {
                "title": "Random",
                "slug": "api/environment/random",
                "file": "api/environment/random.md"
              },
              {
                "title": "Timing Scope",
                "slug": "api/environment/timing-scope",
                "file": "api/environment/timing-scope.md"
              },
              {
                "title": "Configuration",
                "slug": "api/environment/configuration",
                "file": "api/environment/configuration.md"
              },
              {
                "title": "Sequencing",
                "slug": "api/environment/sequencing",
                "file": "api/environment/sequencing.md"
              },
              {
                "title": "Memory",
                "items": [
                  {
                    "title": "Buffer Management",
                    "slug": "api/environment/memory/buffer-management",
                    "file": "api/environment/memory/buffer-management.md"
                  },
                  {
                    "title": "BufferLease",
                    "slug": "api/environment/memory/buffer-lease",
                    "file": "api/environment/memory/buffer-lease.md"
                  },
                  {
                    "title": "DataReader",
                    "slug": "api/environment/memory/data-reader",
                    "file": "api/environment/memory/data-reader.md"
                  },
                  {
                    "title": "DataWriter",
                    "slug": "api/environment/memory/data-writer",
                    "file": "api/environment/memory/data-writer.md"
                  }
                ]
              }
            ]
          },
          {
            "title": "Runtime",
            "items": [
              {
                "title": "Snowflake",
                "slug": "api/framework/snowflake",
                "file": "api/framework/snowflake.md"
              },
              {
                "title": "Task Manager",
                "slug": "api/framework/task-manager",
                "file": "api/framework/task-manager.md"
              },
              {
                "title": "Singleton Base",
                "slug": "api/framework/singleton-base",
                "file": "api/framework/singleton-base.md"
              },
              {
                "title": "Instance Manager",
                "slug": "api/framework/instance-manager",
                "file": "api/framework/instance-manager.md"
              }
            ]
          },
          {
            "title": "Options",
            "items": [
              {
                "title": "Worker Options",
                "slug": "api/framework/options/worker-options",
                "file": "api/framework/options/worker-options.md"
              },
              {
                "title": "Recurring Options",
                "slug": "api/framework/options/recurring-options",
                "file": "api/framework/options/recurring-options.md"
              }
            ]
          },
          {
            "title": "Codec",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/codec",
                "file": "api/codec/index.md"
              },
              {
                "title": "LZ4",
                "slug": "api/codec/lz4",
                "file": "api/codec/lz4.md"
              },
              {
                "title": "Frame Pipeline",
                "slug": "api/codec/frame-pipeline",
                "file": "api/codec/frame-pipeline.md"
              },
              {
                "title": "Packets",
                "items": [
                  {
                    "title": "Frame Model",
                    "slug": "api/codec/packets/frame-model",
                    "file": "api/codec/packets/frame-model.md"
                  },
                  {
                    "title": "Fragmentation",
                    "slug": "api/codec/packets/fragmentation",
                    "file": "api/codec/packets/fragmentation.md"
                  },
                  {
                    "title": "Built-in Frames",
                    "slug": "api/codec/packets/built-in-frames",
                    "file": "api/codec/packets/built-in-frames.md"
                  },
                  {
                    "title": "Packet Registry",
                    "slug": "api/codec/packets/packet-registry",
                    "file": "api/codec/packets/packet-registry.md"
                  }
                ]
              },
              {
                "title": "Serialization",
                "items": [
                  {
                    "title": "Serialization Basics",
                    "slug": "api/codec/serialization/serialization-basics",
                    "file": "api/codec/serialization/serialization-basics.md"
                  },
                  {
                    "title": "Packet Serialization",
                    "slug": "api/codec/serialization/packet-serialization",
                    "file": "api/codec/serialization/packet-serialization.md"
                  },
                  {
                    "title": "Serialization Attributes",
                    "slug": "api/abstractions/serialization-attributes",
                    "file": "api/abstractions/serialization-attributes.md"
                  },
                  {
                    "title": "Reader & Writer Extensions",
                    "slug": "api/codec/serialization/reader-writer-and-header-extensions",
                    "file": "api/codec/serialization/reader-writer-and-header-extensions.md"
                  }
                ]
              }
            ]
          },
          {
            "title": "Memory & Pooling",
            "items": [
              {
                "title": "Packet Pooling",
                "slug": "api/runtime/pooling/packet-pooling",
                "file": "api/runtime/pooling/packet-pooling.md"
              },
              {
                "title": "Object Pooling",
                "slug": "api/framework/memory/object-pooling",
                "file": "api/framework/memory/object-pooling.md"
              },
              {
                "title": "Object Map",
                "slug": "api/framework/memory/object-map",
                "file": "api/framework/memory/object-map.md"
              },
              {
                "title": "Typed Object Pools",
                "slug": "api/framework/memory/typed-object-pools",
                "file": "api/framework/memory/typed-object-pools.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Cryptography",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/security/cryptography",
            "file": "api/security/cryptography.md"
          },
          {
            "title": "Hashing & MAC",
            "slug": "api/security/hashing-and-mac",
            "file": "api/security/hashing-and-mac.md"
          },
          {
            "title": "AEAD & Envelope",
            "slug": "api/security/aead-and-envelope",
            "file": "api/security/aead-and-envelope.md"
          },
          {
            "title": "Key Exchange",
            "slug": "api/security/key-exchange",
            "file": "api/security/key-exchange.md"
          },
          {
            "title": "Handshake Protocol",
            "slug": "api/security/handshake",
            "file": "api/security/handshake.md"
          },
          {
            "title": "Session Resumption",
            "slug": "api/security/session-resume",
            "file": "api/security/session-resume.md"
          },
          {
            "title": "Session Rekey",
            "slug": "api/security/session-rekey",
            "file": "api/security/session-rekey.md"
          },
          {
            "title": "Proof-of-Work",
            "slug": "api/security/proof-of-work",
            "file": "api/security/proof-of-work.md"
          },
          {
            "title": "Permission Levels",
            "slug": "api/security/permission-level",
            "file": "api/security/permission-level.md"
          }
        ]
      },
      {
        "title": "Runtime",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/runtime",
            "file": "api/runtime/index.md"
          },
          {
            "title": "Handlers",
            "slug": "api/runtime/handlers",
            "file": "api/runtime/handlers/index.md"
          },
          {
            "title": "Routing",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/runtime/routing",
                "file": "api/runtime/routing/index.md"
              },
              {
                "title": "Packet Context",
                "slug": "api/runtime/routing/packet-context",
                "file": "api/runtime/routing/packet-context.md"
              },
              {
                "title": "Packet Sender",
                "slug": "api/runtime/routing/packet-sender",
                "file": "api/runtime/routing/packet-sender.md"
              },
              {
                "title": "Dispatch Contracts",
                "slug": "api/runtime/routing/dispatch-contracts",
                "file": "api/runtime/routing/dispatch-contracts.md"
              },
              {
                "title": "Packet Dispatch",
                "slug": "api/runtime/routing/packet-dispatch",
                "file": "api/runtime/routing/packet-dispatch.md"
              },
              {
                "title": "Dispatch Channel & Router",
                "slug": "api/runtime/routing/dispatch-channel-and-router",
                "file": "api/runtime/routing/dispatch-channel-and-router.md"
              },
              {
                "title": "Handler Return Types",
                "slug": "api/runtime/routing/handler-results",
                "file": "api/runtime/routing/handler-results.md"
              }
            ]
          },
          {
            "title": "Middleware",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/runtime/middleware",
                "file": "api/runtime/middleware/index.md"
              },
              {
                "title": "Middleware Pipeline",
                "slug": "api/runtime/middleware/pipeline",
                "file": "api/runtime/middleware/pipeline.md"
              },
              {
                "title": "Policy Rate Limiter",
                "slug": "api/runtime/middleware/policy-rate-limiter",
                "file": "api/runtime/middleware/policy-rate-limiter.md"
              },
              {
                "title": "Token Bucket Limiter",
                "slug": "api/runtime/middleware/token-bucket-limiter",
                "file": "api/runtime/middleware/token-bucket-limiter.md"
              },
              {
                "title": "Permission Middleware",
                "slug": "api/runtime/middleware/permission-middleware",
                "file": "api/runtime/middleware/permission-middleware.md"
              },
              {
                "title": "Timeout Middleware",
                "slug": "api/runtime/middleware/timeout-middleware",
                "file": "api/runtime/middleware/timeout-middleware.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Network",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/network",
            "file": "api/network/index.md"
          },
          {
            "title": "Protocol",
            "slug": "api/network/protocol",
            "file": "api/network/protocol.md"
          },
          {
            "title": "TCP Listener",
            "slug": "api/network/tcp-listener",
            "file": "api/network/tcp-listener.md"
          },
          {
            "title": "UDP Listener",
            "slug": "api/network/udp-listener",
            "file": "api/network/udp-listener.md"
          },
          {
            "title": "WebSocket Listener",
            "slug": "api/network/websocket-listener",
            "file": "api/network/websocket-listener.md"
          },
          {
            "title": "Socket Connection",
            "slug": "api/network/socket-connection",
            "file": "api/network/socket-connection.md"
          },
          {
            "title": "WebSocket Connection",
            "slug": "api/network/websocket-connection",
            "file": "api/network/websocket-connection.md"
          },
          {
            "title": "Session Store",
            "slug": "api/network/session-store",
            "file": "api/network/session-store.md"
          },
          {
            "title": "Connection",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/network/connection/connection",
                "file": "api/network/connection/connection.md"
              },
              {
                "title": "Connection Hub",
                "slug": "api/network/connection/connection-hub",
                "file": "api/network/connection/connection-hub.md"
              },
              {
                "title": "Connection Events",
                "slug": "api/network/connection/connection-events",
                "file": "api/network/connection/connection-events.md"
              },
              {
                "title": "Connection Extensions",
                "slug": "api/network/connection/connection-extensions",
                "file": "api/network/connection/connection-extensions.md"
              },
              {
                "title": "Connection Limiter",
                "slug": "api/network/connection/connection-limiter",
                "file": "api/network/connection/connection-limiter.md"
              },
              {
                "title": "Connection Guard",
                "slug": "api/network/connection/connection-guard",
                "file": "api/network/connection/connection-guard.md"
              }
            ]
          },
          {
            "title": "Time",
            "items": [
              {
                "title": "Time Synchronizer",
                "slug": "api/network/time/time-synchronizer",
                "file": "api/network/time/time-synchronizer.md"
              },
              {
                "title": "Timing Wheel",
                "slug": "api/network/time/timing-wheel",
                "file": "api/network/time/timing-wheel.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Hosting",
        "items": [
          {
            "title": "Network Application",
            "slug": "api/hosting/network-application",
            "file": "api/hosting/network-application.md"
          },
          {
            "title": "WebSocket Binding",
            "slug": "api/hosting/websocket-binding",
            "file": "api/hosting/websocket-binding.md"
          }
        ]
      },
      {
        "title": "SDK",
        "items": [
          {
            "title": "Overview",
            "titleVi": "Tổng quan",
            "slug": "api/sdk",
            "file": "api/sdk/index.md"
          },
          {
            "title": "High-Level APIs",
            "items": [
              {
                "title": "TCP Session",
                "slug": "api/sdk/tcp-session",
                "file": "api/sdk/tcp-session.md"
              },
              {
                "title": "UDP Session",
                "slug": "api/sdk/udp-session",
                "file": "api/sdk/udp-session.md"
              },
              {
                "title": "WebSocket Session",
                "slug": "api/sdk/websocket-session",
                "file": "api/sdk/websocket-session.md"
              },
              {
                "title": "Handshake Extensions",
                "slug": "api/sdk/handshake-extensions",
                "file": "api/sdk/handshake-extensions.md"
              },
              {
                "title": "Resume Extensions",
                "slug": "api/sdk/resume-extensions",
                "file": "api/sdk/resume-extensions.md"
              },
              {
                "title": "Session Extensions",
                "slug": "api/sdk/tcp-session-extensions",
                "file": "api/sdk/tcp-session-extensions.md"
              },
              {
                "title": "Cipher Extensions",
                "slug": "api/sdk/cipher-extensions",
                "file": "api/sdk/cipher-extensions.md"
              },
              {
                "title": "Control Utilities",
                "slug": "api/sdk/control-utilities",
                "file": "api/sdk/control-utilities.md"
              },
              {
                "title": "Session Diagnostics",
                "slug": "api/sdk/diagnostics",
                "file": "api/sdk/diagnostics.md"
              },
              {
                "title": "Session Subscriptions",
                "slug": "api/sdk/subscriptions",
                "file": "api/sdk/subscriptions.md"
              }
            ]
          },
          {
            "title": "Low-Level Primitives",
            "items": [
              {
                "title": "Thread Dispatching",
                "slug": "api/sdk/thread-dispatching",
                "file": "api/sdk/thread-dispatching.md"
              },
              {
                "title": "Frame Reader & Sender",
                "slug": "api/sdk/frame-reader-and-sender",
                "file": "api/sdk/frame-reader-and-sender.md"
              },
              {
                "title": "Transport Session",
                "slug": "api/sdk/transport-session",
                "file": "api/sdk/transport-session.md"
              },
              {
                "title": "Protocol String Extensions",
                "slug": "api/sdk/protocol-string-extensions",
                "file": "api/sdk/protocol-string-extensions.md"
              }
            ]
          }
        ]
      },
      {
        "title": "Options",
        "items": [
          {
            "title": "Runtime",
            "items": [
              {
                "title": "Packet Dispatch",
                "slug": "api/options/runtime/packet-dispatch-options",
                "file": "api/options/runtime/packet-dispatch-options.md"
              },
              {
                "title": "Dispatch",
                "slug": "api/options/runtime/dispatch-options",
                "file": "api/options/runtime/dispatch-options.md"
              }
            ]
          },
          {
            "title": "Network",
            "items": [
              {
                "title": "Overview",
                "titleVi": "Tổng quan",
                "slug": "api/options/network/options",
                "file": "api/options/network/options.md"
              },
              {
                "title": "Network Socket",
                "slug": "api/options/network/network-socket-options",
                "file": "api/options/network/network-socket-options.md"
              },
              {
                "title": "Connection Quota",
                "slug": "api/options/network/connection-quota-options",
                "file": "api/options/network/connection-quota-options.md"
              },
              {
                "title": "Connection Guard",
                "slug": "api/options/network/connection-guard-options",
                "file": "api/options/network/connection-guard-options.md"
              },
              {
                "title": "Connection Ban Store",
                "slug": "api/options/network/connection-ban-store-options",
                "file": "api/options/network/connection-ban-store-options.md"
              },
              {
                "title": "Connection Blacklist Store",
                "slug": "api/options/network/connection-blacklist-store-options",
                "file": "api/options/network/connection-blacklist-store-options.md"
              },
              {
                "title": "Trusted Proxy",
                "slug": "api/options/network/trusted-proxy-options",
                "file": "api/options/network/trusted-proxy-options.md"
              },
              {
                "title": "Proxy Protocol",
                "slug": "api/options/network/proxy-protocol-options",
                "file": "api/options/network/proxy-protocol-options.md"
              },
              {
                "title": "Connection Hub",
                "slug": "api/options/network/connection-hub-options",
                "file": "api/options/network/connection-hub-options.md"
              },
              {
                "title": "WebSocket Transport",
                "slug": "api/options/network/websocket-options",
                "file": "api/options/network/websocket-options.md"
              },
              {
                "title": "Datagram Guard",
                "slug": "api/options/network/datagram-guard-options",
                "file": "api/options/network/datagram-guard-options.md"
              },
              {
                "title": "Timing Wheel",
                "slug": "api/options/network/timing-wheel-options",
                "file": "api/options/network/timing-wheel-options.md"
              },
              {
                "title": "Pooling",
                "slug": "api/options/network/pooling-options",
                "file": "api/options/network/pooling-options.md"
              },
              {
                "title": "Network Callback",
                "slug": "api/options/network/network-callback-options",
                "file": "api/options/network/network-callback-options.md"
              },
              {
                "title": "Session Store",
                "slug": "api/options/network/session-store-options",
                "file": "api/options/network/session-store-options.md"
              },
              {
                "title": "Compression",
                "slug": "api/options/network/compression-options",
                "file": "api/options/network/compression-options.md"
              },
              {
                "title": "Token Bucket",
                "slug": "api/options/network/token-bucket-options",
                "file": "api/options/network/token-bucket-options.md"
              },
              {
                "title": "Directive Guard",
                "slug": "api/options/network/directive-guard-options",
                "file": "api/options/network/directive-guard-options.md"
              }
            ]
          },
          {
            "title": "Hosting",
            "slug": "api/options/hosting/hosting-options",
            "file": "api/options/hosting/hosting-options.md"
          },
          {
            "title": "SDK",
            "items": [
              {
                "title": "Transport",
                "slug": "api/options/sdk/transport-options",
                "file": "api/options/sdk/transport-options.md"
              },
              {
                "title": "WebSocket Transport",
                "slug": "api/options/sdk/websocket-transport-options",
                "file": "api/options/sdk/websocket-transport-options.md"
              },
              {
                "title": "Request",
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
    "titleVi": "Hiệu năng",
    "items": [
      {
        "title": "Overview",
        "titleVi": "Tổng quan",
        "slug": "benchmarks",
        "file": "benchmarks/index.md"
      },
      {
        "title": "Core Infrastructure",
        "slug": "benchmarks/infrastructure",
        "file": "benchmarks/infrastructure.md"
      },
      {
        "title": "Memory & Storage",
        "slug": "benchmarks/memory",
        "file": "benchmarks/memory.md"
      },
      {
        "title": "Data Processing",
        "slug": "benchmarks/data-processing",
        "file": "benchmarks/data-processing.md"
      },
      {
        "title": "Security & Cryptography",
        "slug": "benchmarks/security",
        "file": "benchmarks/security.md"
      },
      {
        "title": "Serialization",
        "slug": "benchmarks/serialization",
        "file": "benchmarks/serialization.md"
      },
      {
        "title": "Serialization Comparison",
        "slug": "benchmarks/serialization-method-compare",
        "file": "benchmarks/serialization-method-compare.md"
      },
      {
        "title": "Network Comparison",
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
  if (locale === 'vi-vn' && item.titleVi) {
    return item.titleVi;
  }
  return item.title;
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
  const isVi = locale === 'vi-vn';
  return [
    { title: isVi ? 'Bắt đầu' : 'Get Started', sectionTitle: 'Start Here', href: localizePath('quickstart', locale) },
    { title: isVi ? 'Hướng dẫn' : 'Guides', sectionTitle: 'Guides', href: localizePath('guides', locale) },
    { title: isVi ? 'Khái niệm' : 'Concepts', sectionTitle: 'Concepts', href: localizePath('concepts', locale) },
    { title: isVi ? 'Gói thư viện' : 'Packages', sectionTitle: 'Packages', href: localizePath('packages', locale) },
    { title: isVi ? 'Tài liệu API' : 'API Reference', sectionTitle: 'API', href: localizePath('api', locale) },
    { title: isVi ? 'Hiệu năng' : 'Benchmarks', sectionTitle: 'Benchmarks', href: localizePath('benchmarks', locale) },
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
  href?: string;
  links: MegaLink[];
  /** Shown under the links when the group has more pages than fit. */
  more?: MegaLink;
}

export interface MegaTab {
  title: string;
  sectionTitle: string;
  href: string;
  columns: MegaColumn[];
}

const MEGA_MAX_LINKS_PER_COLUMN = 5;

function leafPages(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => (item.items ? leafPages(item.items) : item.slug !== undefined ? [item] : []));
}

/**
 * Content of the drop-down panels of the primary navigation: one panel per top-level section,
 * one column per group of that section (or per five pages when the section is a flat list).
 */
export function getMegaMenu(locale: LocaleCode): MegaTab[] {
  const t = useTranslations(locale);
  const link = (item: NavItem): MegaLink => ({ title: getNavTitle(item, locale), href: localizePath(item.slug ?? '', locale) });

  return getTopLevelTabs(locale).map((tab) => {
    const section = NAVIGATION_TREE.find((node) => node.title === tab.sectionTitle);
    const children = section?.items ?? [];
    const columns: MegaColumn[] = [];

    const flat = children.filter((child) => !child.items);
    for (let i = 0; i < flat.length; i += MEGA_MAX_LINKS_PER_COLUMN) {
      columns.push({ title: i === 0 ? tab.title : '', links: flat.slice(i, i + MEGA_MAX_LINKS_PER_COLUMN).map(link) });
    }

    for (const group of children.filter((child) => child.items)) {
      const pages = leafPages(group.items ?? []);
      if (!pages.length) continue;
      const first = link(pages[0]);
      // Direct children only: a sub-group is one line named after the sub-group, so
      // identical page titles ("Overview") of nested groups never repeat in a column.
      const entries = (group.items ?? []).flatMap((child): MegaLink[] => {
        const target = child.items ? leafPages(child.items)[0] : child;
        return target?.slug === undefined ? [] : [{ title: getNavTitle(child, locale), href: link(target).href }];
      });
      columns.push({
        title: getNavTitle(group, locale),
        href: first.href,
        links: entries.slice(0, MEGA_MAX_LINKS_PER_COLUMN),
        more:
          entries.length > MEGA_MAX_LINKS_PER_COLUMN || pages.length > entries.length
            ? { title: t('nav.allPages').replace('{count}', String(pages.length)), href: first.href }
            : undefined,
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
    return { ...tab, columns };
  });
}
