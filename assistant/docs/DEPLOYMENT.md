# AI Assistant 部署模式详解

## 先读这个：Proxy 模式 vs 直连模式

这份文档的所有“模式一/二/三/四/五”，本质上都落在两种访问方式之一：**Proxy 模式**或**直连模式（Direct）**。

### Proxy 模式（推荐，适用于自签名证书/内网场景）

- **浏览器入口**：永远访问 StyleBI（`/api/assistant/proxy/**`）
- **StyleBI 角色**：反向代理/桥接，把浏览器请求转发到 assistant
- **核心价值**：
  - 浏览器侧**不需要直面 assistant 的自签名 TLS**
  - 也可以规避跨域（CORS）问题
- **模式判定**：`chat.app.internal.url` / `CHAT_APP_INTERNAL_URL` **非空**

### 直连模式（仅在浏览器能信任 assistant 证书时可用）

- **浏览器入口**：直接访问 assistant 的对外地址（本地/公网域名）
- **适用前提**：
  - 本地开发可用 HTTP（如 `http://localhost:3002`），或
  - 公网部署必须使用浏览器信任的 **CA 证书**（如 Let's Encrypt）
- **代价**：需要正确配置 CORS；assistant 的对外入口必须稳定可访问
- **模式判定**：`CHAT_APP_INTERNAL_URL` 为空，且 `CHAT_APP_SERVER_URL` / `chat.app.server.url` 有值

---

## 核心配置项（影响模式判定）

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

```properties
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

## 模式三：ECS + VM — 自签名证书 Proxy

### Proxy 模式

ECS + VM 部署中，如果 VM 上的 `assistant-server` 使用**自签名证书**，则**直连模式不可用**（浏览器无法信任）。此时应使用 **Proxy 模式**，由 StyleBI 转发请求到 VM：

```
[用户浏览器]
    │
    └──→ https://stylebi.example.com/api/assistant/proxy/**  (ECS)
                    │  ECS 内部转发（需 ECS → VM 网络通路）
                    └──→ https://3.234.216.165:3001  (VM/反代地址)
```

#### 配置
1. 构建时：`portal/.env` 里移除所有设置（不要在构建期写死 `localhost` 等地址）

2. proxy 的直连模式：`portal` 运行时环境变量增加如下内容：

```yaml
environment:
  - CHAT_APP_SERVER_URL=https://3.234.216.165:3001
  - STYLEBI_URL=https://inetsoft-btest.com
```

3. `stylebi` server 需要配置增加属性：

```properties
  chat.app.internal.url=https://3.234.216.165:3001
  chat.app.server.ssl.verify=false
  chat.app.server.url=https://3.234.216.165:3001   //use for portal callback, SSO 验证会允许 https://3.234.216.165:3001/api/auth/callback 作为合法的回调地址
```

#### 要求

- ECS 安全组允许出站到 VM 的 `3001,3002,3003`（HTTPS）端口
- VM 安全组允许来自 ECS 的入站

#### 优势

- assistant-server 无需公网暴露也能工作（关键是 `chat.app.server.ssl.verify=false`）
- 浏览器无跨域问题
- VM 上仍可使用自签名证书（证书校验策略由 `ssl.verify=false` 放行）

#### 现象
1) `stylebi` 中 AI 正常访问
2) `http://publicip:3002` 页面无法访问
3) `https://publicip:3001` 手动授权之后，`portal` 正常访问

**Note:**
  - 如果将public ip指向一个域名,比如ai.inetsoft-btest.com

---

## 模式四：ECS + VM — CA 证书配置（用于直连）

**步骤 1：下载并保存 AWS CA 证书**

需要在 rout53 上增加一笔 A 记录，`ai.inetsoft-btest.com` 指向 EC2 的 public ip。

下载 AWS 的 CA 证书（例如 Amazon Root CA 1），保存到 `aws-certs/ca.crt`，供容器 / 服务端在需要时信任 AWS 端点。
每次使用新的 EC2，下面生成 CA 证书的命令都需要再做一次。

**步骤 2：在 EC2 上获取 Let's Encrypt 证书**

```bash
# 安装 certbot（Amazon Linux）
sudo yum install -y certbot

# 临时停止占用 80 端口的服务（独立模式获取证书）
sudo certbot certonly --standalone -d ai.inetsoft-btest.com

# 创建目标目录并复制证书
cd /ai-assistant
mkdir aws-certs
sudo cp /etc/letsencrypt/live/ai.inetsoft-btest.com/fullchain.pem aws-certs/certificate.crt
sudo cp /etc/letsencrypt/live/ai.inetsoft-btest.com/privkey.pem   aws-certs/private.key
sudo chown $USER:$USER aws-certs/certificate.crt aws-certs/private.key
```

**步骤 3：配置 `assistant-server` 使用 CA 证书并启用直连**

- 在 `docker-compose.yaml` 中挂载证书目录：

```yaml
volumes:
  - ./.env:/app/.env:ro
  - ./aws-certs:/app/certs:ro
```

- 在 StyleBI 的 `sree.properties` 里仅添加（开启直连模式）：

```properties
chat.app.server.url=https://ai.inetsoft-btest.com
```

此时采用**直连模式**是可通（使用浏览器信任的 CA 证书）；相关问题追踪：Bug `#74432`（已修复，保留编号便于追踪）

- 由于 portal 在构建镜像时仍使用自签名证书，因此直接访问 `http://ai.inetsoft-btest.com:3003/` 依旧会被浏览器视为不安全连接；
- 如需彻底消除该问题，需要调整 portal 的构建配置，改用 CA 证书。

---

## 模式五：Google Cloud + VM — 自签名证书(Proxy)

在 Google Cloud + VM 的场景里，如果 `inetsoft-stylebi.cloud` 侧没有 CA 证书，则浏览器无法直接信任 VM 上的自签名 TLS（直连模式不可用）。
因此需要沿用“TLS 门面/桥接”的思路：在本地/本模式中使用 `assistant-client(3002)` 作为对外入口，同时让 `stylebi` 通过 proxy 来完成到上游的通信。

> 后续如果补齐 CA 证书，可以逐步切换为“可验证 TLS”的模式（例如开启 `chat.app.server.ssl.verify=true`）。

### 配置注意

1. `docker-compose` 的文件里必须配置 `client`：

```yaml
client:
  image: 767398119392.dkr.ecr.ap-east-1.amazonaws.com/inetsoft/chat-app-client:1.0.0
  container_name: chat-app-client
  ports:
    - "3002:3002"
  restart: unless-stopped
  depends_on:
    - server
```


2. 构建 `portal` 镜像时，需要删除（移除这两行配置，不再在构建期写死本地地址）：

```env
VITE_CHAT_APP_SERVER_URL=https://localhost:3001
VITE_STYLEBI_URL=http://localhost:8080
```

3. 在 `docker-compose` 的 `portal` 服务里，增加如下环境变量（让 portal 在运行时获得正确的公网地址）：

```yaml
environment:
  - CHAT_APP_SERVER_URL=https://3.215.23.225:3001
  - STYLEBI_URL=https://google.inetsoft-stylebi.cloud
```

4. 在`.env`中增加:
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

5. `stylebi` 的 server 需要配置（用于 proxy 模式与自签名证书信任）：

```properties
chat.app.internal.url=http://3.215.23.225:3002
chat.app.server.ssl.verify=false
```

---

## 启动方式组合：直连/Proxy 是否可通（验证矩阵 + 猜测）

下面总结“StyleBI/assistant 分别用容器或源码启动”的常见组合。表格里：
- **可通**：已验证可用
- **不通**：已验证不可用
- **待验证**：尚未完整验证；给出当前最可能的原因/猜测，便于后续追踪

| 组合 | Proxy 模式 | 直连模式 | 备注 / 猜测（用于追踪） |
|---|---|---|---|
| StyleBI 源码 + assistant Docker | **可通（已验证）** | **不通（待分析）** | Proxy 时 StyleBI 转发到 `chat.app.internal.url`（本机 `localhost:3002`）可达；直连失败多半与浏览器直面自签名 TLS / CORS / SSO 回调地址不一致有关（需抓浏览器控制台与 StyleBI server 日志确认） |
| StyleBI Docker + assistant 源码 | 待验证 | 待验证 | 常见风险：容器内访问宿主机需用 `host.docker.internal`（Windows/Mac）或额外网卡/bridge 配置（Linux），否则 `localhost` 指向容器自身 |
| StyleBI Docker + assistant Docker（拆成两套 compose） | **可通（已验证）** | **部分可通（现象：portal 通、StyleBI 不通）** | Proxy 关键是两套 compose 必须共享同一个 network，且 `chat.app.internal.url` 使用容器可解析的地址；直连如果让 portal 指向 `https://host.docker.internal:3001`，浏览器/StyleBI 两侧地址口径可能不一致导致 StyleBI AI 不通 |

---

## 其他模式 / 备注

当 StyleBI 使用 docker、assistant 使用 docker 部署时（这种方式不推荐），可以用一个 `docker-compose.yaml`；如果必须拆成两个 compose，需要共享一个 network（见下节）。

**推荐**：尽量用**一个** `docker-compose.yaml` 启动全部服务（自动同网络、服务名可互相解析）。

如果必须拆成**两个** compose（例如 stylebi 一套、assistant 一套），需要让两套 compose 共享同一个 Docker network：

- **做法 A（推荐）**：创建一个外部网络，然后在两个 compose 里都声明 `external: true` 并引用同名网络。

先创建网络：

```bash
docker network create inetsoft-net
```

`docker-compose.stylebi.yaml` 示例：

```yaml
services:
  stylebi:
    # ...
    networks:
      - inetsoft-net

networks:
  inetsoft-net:
    external: true
```

`docker-compose.assistant.yaml` 示例：

```yaml
services:
  client:
    # ...
    networks:
      - inetsoft-net
  server:
    # ...
    networks:
      - inetsoft-net
  portal:
    # ...
    networks:
      - inetsoft-net

networks:
  inetsoft-net:
    external: true
```

- **做法 B**：不手动创建网络，让其中一套 compose 先创建 network；另一套 compose 用 `external` 引用它（本质相同，但更容易因为 network 名称带前缀而踩坑）。

- **Proxy 模式**：可通（已验证）
  - `stylebi` 配置：

```properties
chat.app.internal.url=http://host.docker.internal:3002
chat.app.server.ssl.verify=false
```
  - 现象：
  1) StyleBI 上点击 AI 按钮 → OK；但浏览器直接访问 `http:///host.docker.internal:3002` 无法打开
  2) `http://localhost:3003/` 授权失败

- **直连 模式**:
```portal
environment:
         - CHAT_APP_SERVER_URL=https://host.docker.internal:3001
         - STYLEBI_URL=http://host.docker.internal:8080
```
  现象:
  1) 上面的配置portal可以通,但是stylebi上ai 不能通
---

## 各模式对比总览

| 维度（快速判断） | 本地直连（模式一） | 本地 Proxy（模式二） | ECS+VM Proxy（模式三） | ECS+VM 直连（模式四） | Google Cloud + VM Proxy（模式五） |
|---|---|---|---|---|---|
| 浏览器访问入口 | 直连 `assistant-client:3002` | StyleBI：`/api/assistant/proxy` | StyleBI：`/api/assistant/proxy` | 直连 `assistant-server` 域名 | StyleBI：`/api/assistant/proxy` |
| 是否走 StyleBI 转发 | 否 | **是** | **是** | 否 | **是** |
| 直连是否可用（前提） | 可（本地 HTTP） | — | — | **可（必须 CA 证书）** | **不可（自签名）** |
| VM/assistant 证书要求 | 本地自签名可用 | 自签名可（proxy 放行） | 自签名可（`ssl.verify=false`） | **CA 签名（如 Let's Encrypt）** | 自签名（proxy 放行） |
| 是否需要 `assistant-client` | **需要** | 可选 | 不需要 | 不需要 | **需要** |
| 是否需要 ECS→VM 网络通路 | — | — | **需要** | 不需要 | — |

<details>
<summary>详细对比（展开查看）</summary>

| 维度 | 本地直连（模式一） | 本地 Proxy（模式二） | ECS+VM Proxy（模式三） | ECS+VM 直连（模式四） | Google Cloud + VM Proxy（模式五） |
|---|---|---|---|---|---|
| `CHAT_APP_INTERNAL_URL`（StyleBI→assistant） | 不设 | 设置（Docker 服务名，如 `http://assistant-client:3002`） | 设置（VM 地址，通常为 `https://<vm>:3001`，并 `ssl.verify=false`） | 不设 | 设置（VM 地址，如 `http://<vm>:3002`） |
| `CHAT_APP_SERVER_URL`（portal/浏览器侧） | `http://localhost:3002` | 可设为 `http://localhost:8080/api/assistant/proxy`（仅 portal 用） | `https://<vm>:3001`（用于 portal callback 等） | `https://ai.inetsoft-btest.com` | `https://<vm>:3001`（运行时注入） |
| `chat.app.server.ssl.verify` | — | **false** | **false** | 可按需开启 **true** | **false**（或 `NODE_TLS_REJECT_UNAUTHORIZED=0` 放行） |
| VM 反向代理 | — | — | 可选（常用于对外提供 `:3001` 入口） | **必须**（对外提供可被浏览器信任的 HTTPS） | — |
| CORS 配置 | 不需要 | 不需要 | 不需要 | **必须**（浏览器直连） | 不需要 |
| assistant 对外暴露面 | 本机端口 | 仅 StyleBI 对外 | VM 端口可不对公网开放（ECS→VM 可达即可） | **公网** | VM 端口（对外/对内视部署而定） |

</details>

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
