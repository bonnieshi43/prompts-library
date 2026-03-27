# AI Assistant 部署模式详解

## 核心配置项

| 属性 | sree.properties 键 | 环境变量 | 作用 |
|---|---|---|---|
| 直连 URL | `chat.app.server.url` | `CHAT_APP_SERVER_URL` | 浏览器直接访问 assistant 的地址 |
| 代理内部 URL | `chat.app.internal.url` | `CHAT_APP_INTERNAL_URL` | StyleBI 服务器到 assistant 的内部地址（proxy 模式专用） |
| SSL 验证 | `chat.app.server.ssl.verify` | `CHAT_APP_SERVER_SSL_VERIFY` | StyleBI 代理时是否验证 assistant 的 TLS 证书（默认 false） |

**模式判断逻辑**（`AIAssistantController.getChatAppServerUrl()`）：

```
CHAT_APP_INTERNAL_URL 非空  →  Proxy 模式
CHAT_APP_INTERNAL_URL 为空  →  Direct 模式（使用 CHAT_APP_SERVER_URL）
两者都为空                  →  AI 功能未启用（返回 204）
```

---

## 模式一：本地 Docker Compose — 直连模式（默认）

### 架构图

```
[用户浏览器]
    │
    ├──→ http://localhost:8080  (StyleBI)
    │        └── /api/assistant/get-chat-app-server-url
    │                └── 返回 http://localhost:3002
    │
    └──→ http://localhost:3002/api/...  (assistant-client nginx)
                    │
                    └── proxy_pass https://assistant-server:3001
                        proxy_ssl_verify off  ← 信任自签名证书
```

### 配置（`.env`）

```ini
CHAT_APP_SERVER_URL=http://localhost:3002
# CHAT_APP_INTERNAL_URL 不设置
```

### 为什么直连的是 assistant-client（3002）而不是 assistant-server（3001）

assistant-server 使用**自签名 TLS 证书**（`certs/` 目录挂载进容器）。浏览器无法对自签名证书发起 XHR/fetch 请求，会直接报 `NET::ERR_CERT_AUTHORITY_INVALID`，且用户无法绕过。

assistant-client（3002）内的 nginx 是 HTTP 门面：
- 浏览器 → HTTP:3002（无证书问题）
- nginx → HTTPS:3001（`proxy_ssl_verify off`，内部信任自签名证书）

浏览器永远不会直接看到那个自签名证书。

### 各容器角色

| 容器 | 端口 | 作用 |
|---|---|---|
| `stylebi` | 8080 | StyleBI 主服务，返回配置 URL |
| `scheduler` | — | 定时任务 |
| `assistant-server` | 3001 (HTTPS) | AI 后端（LLM、向量检索、聊天记录） |
| `assistant-client` | 3002 (HTTP) | **nginx 门面**（消化自签名证书）+ 独立访问时提供 SPA |
| `assistant-portal` | 3003 | 管理后台 |

### 特点

- assistant-client 容器**必须存在**，作为浏览器和 assistant-server 之间的 TLS 桥梁
- StyleBI 不转发任何 AI 流量
- assistant-client 需要对用户浏览器可达（开放 3002 端口）

---

## 模式二：本地 Docker Compose — Proxy 模式（推荐）

### 架构图

```
[用户浏览器]
    │
    └──→ http://localhost:8080/api/assistant/proxy/**  (StyleBI)
                    │  服务器内部转发
                    │  CHAT_APP_INTERNAL_URL=http://assistant-client:3002
                    └──→ http://assistant-client:3002/**
                                    │
                                    └── nginx → https://assistant-server:3001
```

### 配置（`.env`）

```ini
CHAT_APP_INTERNAL_URL=http://assistant-client:3002   # Docker 内部服务名
CHAT_APP_SERVER_URL=http://localhost:8080/api/assistant/proxy  # 浏览器侧代理路径
```

> **注意**：proxy 模式下 `CHAT_APP_SERVER_URL` 仅供 assistant-portal 容器使用。StyleBI 的 `get-chat-app-server-url` 接口会动态计算 `{styleBIUrl}/api/assistant/proxy` 返回给浏览器，不直接使用 `CHAT_APP_SERVER_URL` 的静态值。

### StyleBI Proxy 实现细节

**HTTP 代理**（`AssistantProxyController`，映射 `/api/assistant/proxy/**`）：

- 请求体流式透传，不全量缓冲（上限 50MB）
- SSE 流式聊天：`bufferSize=0` + 先 `flushBuffer`，保证 token 实时推送
- `/api/chat` 路径用 300s 超时的长连接 client，其余用 30s 普通 client
- 路径遍历防护：`URI.normalize()` 过滤 `../` 攻击
- 响应头处理：
  - 剥除上游 CSP（避免内部 origin 泄漏给浏览器）
  - 重写 `Location` 重定向头，使重定向仍走代理
  - 剥除 Cookie `Domain=` 属性，使 cookie 绑定到 StyleBI 域而非 assistant 域

**HTML 重写**（代理返回 HTML 时）：

- 注入脚本覆盖 `window.__ENV__.CHAT_APP_SERVER_URL` 为代理路径
- 将 SPA 资源路径 `/assets/...` 重写为 `/api/assistant/proxy/assets/...`

**WebSocket 代理**（`AssistantWebSocketProxyHandler`）：

- 把浏览器的 WS 连接桥接到上游 assistant 的 WS
- 支持实时"thinking"状态气泡等事件推送

**SSL 设置**：`CHAT_APP_SERVER_SSL_VERIFY=false`（默认）信任自签名证书，StyleBI 充当了 nginx `proxy_ssl_verify off` 的角色。

### 特点

- assistant-client、assistant-server 均不需要对外暴露端口
- 浏览器只需访问 StyleBI，无跨域问题
- StyleBI ECS 实例需要能访问 assistant 内网地址

---

## 模式三：ECS + VM — 真实域名直连模式

### 部署拓扑

```
StyleBI  →  AWS ECS（多实例）
Assistant → 独立 VM（Docker 启动 assistant-server）
              └── 反向代理（nginx/caddy）→ 真实域名（CA 签名证书）
```

### 架构图

```
[用户浏览器]
    │
    ├──→ https://stylebi.example.com  (ECS)
    │        └── /api/assistant/get-chat-app-server-url
    │                └── 返回 https://assistant.example.com
    │
    └──→ https://assistant.example.com/api/...  (VM 上的反向代理)
                    │
                    └── 443 → assistant-server:3001
```

### 配置

```ini
CHAT_APP_SERVER_URL=https://assistant.example.com
# CHAT_APP_INTERNAL_URL 不设置
```

### 与本地直连模式的关键区别

**1. 自签名证书问题消失**

真实域名配备 CA 签名证书，浏览器可直接信任，无需任何中间 nginx 门面。

**2. assistant-client 容器不再需要**

当 StyleBI 以嵌入式 web component 方式集成时，assistant-client 的 SPA 角色由 StyleBI 承担。CA 签名证书消除了 nginx TLS 门面的需求。VM 上只需运行：

- `assistant-server`（3001）
- 反向代理（nginx/caddy，处理域名 + TLS）

**3. VM 上必须有独立反向代理**

assistant-server 本身监听 3001，需要 VM 上的 nginx/caddy 将域名流量转发：

```nginx
server {
    listen 443 ssl;
    server_name assistant.example.com;
    # CA 签名证书配置...

    location / {
        proxy_pass http://localhost:3001;
    }
}
```

**4. 必须配置 CORS**

浏览器从 `https://stylebi.example.com` 向 `https://assistant.example.com` 发跨域请求，assistant-server 必须允许：

```
Access-Control-Allow-Origin: https://stylebi.example.com
```

本地 docker-compose 均为 `localhost`，无跨域问题。

**5. StyleBI ECS 不转发任何流量**

ECS 实例只负责返回配置 URL，之后流量完全是浏览器到 VM 的直连，ECS 不需要到 VM 的网络通路。

**6. SSO/JWT 验证方向**

assistant-server 需要验证 StyleBI 签发的 JWT，会请求：

```
VM 上的 assistant-server → https://stylebi.example.com/sso/jwks
```

需确保 VM 能访问 ECS 上 StyleBI 的公网地址（通常没问题，无 Docker 网络复杂性）。

---

## 模式四：ECS + VM — Proxy 模式（可选）

如果不想将 assistant-server 暴露公网，可在 ECS + VM 部署中启用 proxy 模式：

```
[用户浏览器]
    │
    └──→ https://stylebi.example.com/api/assistant/proxy/**  (ECS)
                    │  ECS 内部转发（需 ECS → VM 网络通路）
                    └──→ http://10.x.x.x:3001  (VM 内网 IP)
```

### 配置

```ini
CHAT_APP_INTERNAL_URL=http://10.x.x.x:3001   # VM 内网 IP（ECS 同 VPC）
# CHAT_APP_SERVER_URL 可不设，或设为辅助用途
CHAT_APP_SERVER_SSL_VERIFY=false              # 若 INTERNAL_URL 为 http 则无需关注
```

### 要求

- ECS 安全组允许出站到 VM 的 3001 端口
- VM 安全组允许来自 ECS 的入站

### 优势

- assistant-server 无需公网暴露，无需真实域名
- 浏览器无跨域问题
- VM 上的反向代理和 CA 证书均不需要

---

## 各模式对比总览

| 维度 | 本地直连 | 本地 Proxy | ECS+VM 直连 | ECS+VM Proxy |
|---|---|---|---|---|
| `CHAT_APP_INTERNAL_URL` | 不设 | 设置（Docker 服务名） | 不设 | 设置（VM 内网 IP） |
| `CHAT_APP_SERVER_URL` | `http://localhost:3002` | `http://localhost:8080/api/assistant/proxy` | `https://assistant.example.com` | 可不设 |
| TLS 证书 | 自签名 | 自签名 | CA 签名 | 无需（内网 HTTP） |
| assistant-client 容器 | **必须** | 可选 | **不需要** | 不需要 |
| VM 反向代理 | — | — | **必须** | 不需要 |
| CORS 配置 | 不需要 | 不需要 | **必须** | 不需要 |
| StyleBI 转发流量 | 否 | **是** | 否 | **是** |
| assistant 网络暴露 | Docker 内网 | Docker 内网 | **公网** | VPC 内网 |
| ECS → VM 网络通路 | — | — | 不需要 | **必须** |

---

## SSO / JWT 验证链路（各模式通用）

```
[用户登录 StyleBI]
    │ StyleBI 签发 JWT
    ↓
[嵌入式 chat web component]
    │ 携带 JWT 发请求
    ↓
[assistant-server]
    │ 验证 JWT：GET {styleBIUrl}/sso/jwks
    ↓
[StyleBI JWKS 端点]  ← assistant-server 必须能访问此地址
```

- Docker Compose：`STYLEBI_INTERNAL_URL=http://stylebi:8080`（docker-compose.yaml 自动注入）
- ECS + VM：VM 访问 StyleBI 公网地址，无需特殊配置
- `IGNORE_AUTH=true`：跳过验证，仅在 JWKS 端点确实无法访问时使用
