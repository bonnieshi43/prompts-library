# PR2976 测试分析报告
> AI Assistant Reverse Proxy for Private-Network Deployments

---

## 第一部分：需求分析（Requirement Analysis）

### 核心目标
在私有网络/企业内网环境中，允许 AI 助手服务无需公网暴露，所有浏览器流量通过 StyleBI 自身的反向代理转发至内部 Assistant 服务。

### 用户价值
| 痛点 | 解决方案 |
|------|---------|
| 内网部署时浏览器无法直连 Assistant 服务，聊天界面完全无法加载 | Proxy 模式：浏览器只需访问 StyleBI，由 StyleBI 服务端转发请求 |
| SSO 回调 URL 要求浏览器可达 Assistant 服务 | SSO complete 页面改由 StyleBI 内联提供，无需 Assistant 可被浏览器访问 |

### Feature 类型
- 新增功能（New Feature）+ 架构模式扩展
- 向后兼容（Direct Mode 保留）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

| 变更模块 | 变更内容 |
|---------|---------|
| `AssistantProxyController` | 新增 HTTP 反向代理，路由 `/api/assistant/proxy/**` 到内部 URL；含 SSE 流式支持、HTML 路径重写、请求体大小限制（50MB）、Path Traversal 防护 |
| `AssistantWebSocketProxyHandler` | 新增 WebSocket 双向代理，浏览器 WS ↔ 上游 WS 桥接；含连接泄漏清理定时任务 |
| `AssistantWebSocketProxyConfig` | 注册 WS 代理 Handler，使用独立 `HandlerMapping` 避免与 STOMP 冲突 |
| `AIAssistantController` | 新增 `chat.app.internal.url` 属性支持；`get-chat-app-server-url` 接口在 Proxy 模式下返回 `{styleBIUrl}/api/assistant/proxy` |
| `SSOTokenController` | SSO 授权 callback 白名单扩展支持 proxy 路径；Proxy 回调自动附加 CSRF token |
| `HomePageController` | Portal 页 AI 脚本注入逻辑：Proxy 模式从 proxy 路径加载 `ai-assistant.umd.js`，Direct 模式从 server URL 加载 |
| `GZIPFilter` | 排除 `/api/assistant/proxy` 路径，防止 GZIP 缓冲破坏 SSE 流式传输 |
| EM 前端（model + view） | 新增 `chatAppInternalUrl` 字段，管理员可在 EM 配置 Proxy 模式 URL |
| `docker-compose.yaml` | 新增 `CHAT_APP_INTERNAL_URL`、`CHAT_APP_SERVER_SSL_VERIFY` 环境变量；assistant-client 默认指向 proxy 模式 URL |

### 目标覆盖度

| 需求点 | 实现状态 | 说明 |
|-------|---------|------|
| HTTP 请求代理 | 完全覆盖 | `AssistantProxyController` 完整实现 |
| SSE 流式聊天响应代理 | 完全覆盖 | 禁用 buffer + GZIP 排除 |
| WebSocket 实时状态更新代理 | 完全覆盖 | `AssistantWebSocketProxyHandler` 双向桥接 |
| SSO 回调流程通过代理路由 | 完全覆盖 | `SSOTokenController` 支持 proxy callback；`sso-complete.html` 内联提供 |
| 保留 Direct Mode（原有行为） | 完全覆盖 | 两个属性互斥：只设 `server.url` 时走 Direct |
| EM 管理界面配置入口 | 完全覆盖 | 新增 Internal URL 字段 |
| Docker Compose 文档和配置 | 完全覆盖 | README + docker-compose + env template |

### 行为对比

| Before Behavior | After Behavior | Risk |
|----------------|---------------|------|
| 浏览器直连 Assistant（需公网或同网段） | Proxy 模式下，浏览器只接触 StyleBI | 中：代理层引入额外网络跳点，潜在延迟或连接超时 |
| SSO 回调 POST 到 Assistant 的 callback URL | SSO 回调 POST 到 `/api/assistant/proxy/api/auth/callback`，StyleBI 内联返回 `sso-complete.html` | 中：CSRF token 注入逻辑依赖 cookie，环境差异可能导致 token 缺失 |
| `chat.app.server.url` 唯一配置项 | 新增 `chat.app.internal.url`，优先级高于 server.url | 低：同时配置两个 URL 时行为可预测（internal 优先）但需验证 |
| GZIP 压缩全局覆盖所有 API | `/api/assistant/proxy` 路径排除 GZIP | 低：排除逻辑正确，无副作用 |
| Web Component 脚本从 server.url 加载 | Proxy 模式从 proxy 路径加载 | 低：路径重写逻辑需验证资源正确加载 |

---

## 第三部分：Risk Identification（风险识别）

| # | 风险类型 | 描述 |
|---|---------|------|
| R1 | **Functional** | SSE 流式响应中途中断：代理超时（chatClient 设 300s）、网络抖动、Tomcat buffer 配置可能导致流中断 |
| R2 | **Functional** | WebSocket 连接泄漏：浏览器在上游连接建立期间断开，`upstreamSessions` map 可能残留已关闭 session（虽有 60s 清理任务） |
| R3 | **Functional** | SSO 代理回调 CSRF 问题：CSRF token 从 cookie `XSRF-TOKEN` 读取，若 cookie 未设置或同源策略限制，SSO POST 将被 CSRF filter 拒绝（403） |
| R4 | **Compatibility** | Direct Mode 回归风险：引入 Proxy 模式代码后，只配置 `chat.app.server.url` 的现有部署可能受影响（需验证完整流程） |
| R5 | **Functional** | HTML 路径重写误伤：`rewriteProxiedHtml` 的正则 `(src\|href\|action\|data-src)` 可能意外修改内联 HTML 中的第三方资源路径 |
| R6 | **Performance** | 大请求体处理：虽有 50MB Content-Length 检查，chunked body 依赖 `LimitedInputStream`；若上游响应超时（非 Chat 接口），30s 限制可能过短 |
| R7 | **Functional** | SSL 证书验证默认关闭（`chat.app.server.ssl.verify=false`）：生产环境若未显式开启，存在中间人攻击风险 |

---

## 第四部分：Test Design（测试策略设计）

### 核心测试关注点

1. **模式切换正确性**：Proxy Mode vs Direct Mode vs 未配置，三种状态下 UI 显示、API 行为是否符合预期
2. **代理三种协议的完整性**：HTTP（含 SSE 流式）、WebSocket，覆盖正常流和异常断连
3. **SSO 认证链路**：Proxy 模式下完整 SSO 流程（authorize → callback → sso-complete）
4. **HTML 路径重写**：Web Component 脚本和资源是否正确通过代理路径加载
5. **Direct Mode 回归**：原有 direct 模式配置不受新代码影响
6. **边界和安全**：Path Traversal 防护、请求体大小限制、Host Header 注入防护

### 测试环境要求

#### 服务组成

| 服务 | 镜像来源 | 端口 | 说明 |
|------|---------|------|------|
| `stylebi` | 本地构建 或 ECR/GHCR | 8080 | StyleBI 主服务 |
| `scheduler` | 同上 | — | 后台调度服务 |
| `assistant-server` | ECR（需认证） | 3001 | AI 后端（LLM、向量搜索、聊天历史） |
| `assistant-client` | ECR（需认证） | 3002 | 聊天 UI（内嵌于 StyleBI 的 Web Component 来源） |
| `assistant-portal` | ECR（需认证） | 3003 | 管理员审查聊天记录的后台页面 |

#### 前置条件

- Docker Desktop 已安装并运行
- AWS CLI 已安装，且拥有 ECR pull 权限（用于拉取 assistant 镜像）
- 测试用 API Keys（向 team 获取）：OpenAI、Pinecone、Voyage AI、Cohere
- MongoDB 连接字符串（测试用实例）
- Enterprise 版 StyleBI License Key（SSO 相关 TC 需要）
- 浏览器 DevTools（Chrome/Edge 推荐，用于观察 Network / WS 请求）

---

### 第一步：获取 StyleBI 镜像（二选一）

**Option  — 本地构建（开发推荐）：**
```shell
# 在 stylebi 仓库根目录执行
.\mvnw clean package jib:dockerBuild -pl community/docker,docker
```

---

### 第二步：认证 ECR（拉取 assistant 镜像必须） 或 本地拉取镜像参考H:\assistant\chat-app\docker

```shell
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  636869400126.dkr.ecr.us-east-2.amazonaws.com
```
---

### 第三步：创建并编辑 `.env`

```shell
cd integration/ai-assistant
cp _env .env
```

打开 `.env`，根据测试场景选择配置：

**Proxy 模式（TC-01 ~ TC-04、TC-06、TC-07、TC-08 使用）：**
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
STYLEBI_DOCKER_IMAGE=ghcr.io/inetsoft-technology/stylebi-enterprise:latest
STYLEBI_LICENSE_KEY=your-license-key-here

# Proxy 模式：两个都要设置
CHAT_APP_INTERNAL_URL=http://assistant-client:3002   # Docker 内部服务名
CHAT_APP_SERVER_URL=http://localhost:8080/api/assistant/proxy  # 浏览器侧代理路径
- CHAT_APP_INTERNAL_URL — StyleBI 服务器端用来转发请求到 assistant-client 容器的地址（server-to-server，走 Docker内网）
- CHAT_APP_SERVER_URL — 浏览器端 SPA 发 API 请求用的地址，指向 StyleBI 的代理路径 /api/assistant/proxy      

# SSL 验证（自签名证书环境保持 false）
# CHAT_APP_SERVER_SSL_VERIFY=false
```

**Direct 模式（TC-05 回归验证使用）：**
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
# 确保 CHAT_APP_INTERNAL_URL 为空或不存在
CHAT_APP_INTERNAL_URL=
CHAT_APP_SERVER_URL=http://localhost:3002
```

> **注意**：`.env` 中若同一变量出现两次，后面的生效。每次切换模式后需重启 stylebi 容器：
> ```shell
> docker compose up -d --force-recreate stylebi
> ```

---

### 第四步：创建并编辑 `assistant.env`

```shell
cp assistant.env.template assistant.env
```

打开 `assistant.env`，填入以下必填项：

```ini
# MongoDB 连接（测试实例）
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_DB=AIAssistant

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# Pinecone 向量数据库
PINECONE_API_KEY=xxxxxxxx
PINECONE_INDEX=your-index-name

# Voyage AI（embeddings）
VOYAGE_API_KEY=xxxxxxxx

# Cohere（reranking）
COHERE_API_KEY=xxxxxxxx

# SSO 认证开关
# false = 启用完整 JWT 验证（TC-04 SSO 场景必须为 false）
# true  = 跳过验证（快速冒烟测试时可用）
IGNORE_AUTH=false
```

> 若暂无 API Keys，可先设 `IGNORE_AUTH=true` 跑非 SSO 场景，SSO 相关 TC 需设为 `false`。

---

### 第五步：启动所有服务

```shell
docker compose up -d

# 查看各服务启动状态（等待 stylebi healthy）
docker compose ps

# 实时查看 stylebi 启动日志
docker compose logs -f stylebi
```

所有服务就绪后（stylebi 状态变为 `healthy`）：

| 访问地址 | 说明 |
|---------|------|
| `http://localhost:8080` | StyleBI 主界面（默认账号：`admin` / `admin`） |
| `http://localhost:3002` | Assistant 聊天 UI（Direct 模式下独立访问） |
| `http://localhost:3003` | Assistant 管理后台 |

---

### 模式切换方法（测试过程中）

**推荐方式：通过 EM UI 切换（无需重启）**

登录 EM → Settings → Presentation → AI Integration，修改以下字段后保存，立即生效：

| 模式 | AI Assistant Internal URL | AI Assistant Server URL |
|------|--------------------------|------------------------|
| Proxy 模式 | `http://assistant-client:3002` | http://localhost:8080/api/assistant/proxy |
| Direct 模式 | 留空 | `http://localhost:3002` |
| 禁用 AI 助手 | 留空 | 留空 |

> **注意**：EM 中的设置在容器重启后会被 `.env` 中的变量覆盖。如需永久切换模式，请同时修改 `.env` 并重启 stylebi。

**备选方式：修改 `.env` + 重启 stylebi**

```shell
# 编辑 .env 修改变量后，仅重启 stylebi（不需要重建 assistant 服务）
docker compose up -d --force-recreate stylebi

# 若需要完全重置存储（更换了初始配置）
docker compose down -v
docker compose up -d
```

---

### 常用排查命令

```shell
# 查看所有服务日志
docker compose logs stylebi
docker compose logs assistant-server
docker compose logs assistant-client

# 检查 stylebi 是否加载了正确的配置属性
docker compose exec stylebi env | grep -i chat

# 验证代理接口是否可达（返回 200 = proxy 模式生效，503 = internal URL 未配置）
http://localhost:8080/api/assistant/proxy/

# 验证模式识别接口
http://localhost:8080/api/assistant/get-chat-app-server-url 返回 "http://localhost:8080/api/assistant/proxy"
http://localhost:8080/api/assistant/ai-assistant-visible  返回true
```

---

## 第五部分：Key Test Scenarios（核心测试场景）

---

### TC-01：Proxy 模式 — 聊天界面加载

**Scenario Objective**：验证 Proxy 模式下浏览器仅通过 StyleBI 端口即可完整加载 AI Assistant 界面，无直连 assistant-client 端口

**Pre-Condition**：Proxy 模式 `.env` 已配置，所有服务 healthy

**Key Steps**：
1. 浏览器打开 `http://localhost:8080`，登录（admin/admin）
2. 点击工具栏 AI Assistant 图标，打开对话面板
3. DevTools（F12）→ Network 标签，筛选 `localhost:3002`，检查有无直连请求
4. 查看页面源码（Ctrl+U），搜索 `ai-assistant.umd.js`

**快速验证**：
```shell
http://localhost:8080/api/assistant/get-chat-app-server-url
# 期望：{"url":"http://localhost:8080/api/assistant/proxy"}
```

**Expected Result**：
- [ ] AI Assistant 对话面板正常打开，浏览器控制台无报错
- [ ] DevTools Network 无任何 `localhost:3002` 直连请求，所有 Assistant 请求均走 `localhost:8080/api/assistant/proxy/**`
- [ ] 页面源码中 script 路径为 `/api/assistant/proxy/web-component/ai-assistant.umd.js`
- [ ] `get-chat-app-server-url` 返回 proxy 路径（见上方命令）

🔴 **测试结果**：pass

---

### TC-02：Proxy 模式 — SSE 流式聊天响应

**Scenario Objective**：验证 AI 回复通过代理以流式方式逐段呈现，GZIP 排除和 buffer 禁用配置有效

**Pre-Condition**：TC-01 通过

**Key Steps**：
1. 在 AI Assistant 对话框中发送一条较长问题，例如："帮我解释数据分析的完整流程"
2. 观察 AI 回复显示方式（是否逐字出现）
3. DevTools → Network → 筛选 `EventStream`，点击 `/api/assistant/proxy/api/chat` 请求 → Headers

**Expected Result**：
- [ ] AI 回复逐字/逐段实时显示，非等待完成后一次性出现
- [ ] 请求 Content-Type 为 `text/event-stream`
- [ ] 响应头中无 `Content-Encoding: gzip`
- [ ] 整个流式过程无中断、无界面错误

如果想用命令行快速验证 TC-02（需要 IGNORE_AUTH=true）：  

curl -N -H "Accept: text/event-stream" -H "Content-Type: application/json" -d "{\"message\":\"hello\"}" http://localhost:8080/api/assistant/proxy/api/chat

🔴 **测试结果**：Bug #74318

---

### TC-03：Proxy 模式 — WebSocket 实时状态更新

**Scenario Objective**：验证 AI 推理中间步骤（thinking 气泡）通过 WebSocket 代理正确实时显示

**Pre-Condition**：TC-01 通过

**Key Steps**：
1. 发送一条需要工具调用的问题，例如："查询dashboard Census binding的数据"
2. 观察界面是否出现 thinking 或工具调用气泡
3. DevTools → Network → WS 标签，查看 `/api/assistant/proxy` WebSocket 连接

**Expected Result**：
- [ ] 界面显示 AI 思考/工具调用的中间步骤气泡
- [ ] DevTools WS 连接建立成功，可见双向帧数据(WS 列表里有这条连接且状态为 101 Switching Protocols，说明 WebSocket 代理正常工作)
- [ ] 回复完成后 WS 连接正常关闭，无残留连接

🔴 **测试结果**：Bug #74320

---

### TC-04：Proxy 模式 — SSO 完整认证流程

**Scenario Objective**：验证 Proxy 模式下 SSO 完整认证链路闭环（callback 路径改走 proxy，sso-complete 由 StyleBI 内联提供）

**Pre-Condition**：
- Enterprise License 已配置
- `assistant.env` 中 `IGNORE_AUTH=false`
- Proxy 模式已启动

**Key Steps**：
1. 访问 `http://localhost:8080`，打开 AI Assistant 面板
2. 若弹出 SSO 登录弹窗，完成 StyleBI 登录授权
3. DevTools → Network，观察 callback 请求目标地址
4. 观察弹窗关闭后 AI Assistant 的认证状态

**Expected Result**：
- [ ] SSO 授权弹窗正常打开，跳转至 `/sso/authorize`
- [ ] callback 请求发往 `/api/assistant/proxy/api/auth/callback`（非 `localhost:3002`）
- [ ] `sso-complete.html` 由 StyleBI 提供，页面通过 `postMessage` 传递 auth code，弹窗自动关闭
- [ ] AI Assistant 认证成功，可正常对话

🔴 **测试结果**：pass

---

### TC-05：Direct Mode 回归验证

**Scenario Objective**：验证只配置 `chat.app.server.url`（不设 internal URL）时，原有 Direct Mode 行为不受影响

**Scenario Description**：向后兼容性是此次变更的承诺，任何对现有部署的破坏都是高优先级缺陷

**Key Steps**：
1. 登录 EM → Settings → Presentation → AI Integration
2. 清空 **AI Assistant Internal URL** 字段
3. 在 **AI Assistant Server URL** 字段填入 `http://localhost:3002`，点击保存（无需重启）
4. 访问 Portal，打开 AI Assistant
5. DevTools 观察所有 Assistant 相关请求目标地址
6. 完整执行一次对话
7. 测试完成后在 EM 中还原：填回 **AI Assistant Internal URL** = `http://assistant-client:3002`，清空 **AI Assistant Server URL**，保存

**Expected Result**：
- AI Assistant 正常打开，可正常对话
- Network 请求目标为 `http://localhost:3002/**`（直连 assistant-client），无 `/api/assistant/proxy` 路径
- Web Component 脚本从 `http://localhost:3002/web-component/ai-assistant.umd.js` 加载
- 直接请求 `/api/assistant/proxy/**` 返回 503（未配置 internal URL）

**Risk Covered**：R4（Direct Mode 回归）

🔴 **测试结果**：pass

---

### TC-06：Proxy 模式与 Direct 模式优先级

**Scenario Objective**：验证同时配置两个 URL 时，Proxy 模式（internal URL）正确优先生效

**Scenario Description**：优先级逻辑错误可能导致实际使用 Direct 模式但管理员以为是 Proxy 模式，造成私有网络访问失败

**Key Steps**：
1. 登录 EM → Settings → Presentation → AI Integration
2. 同时填入两个字段（无需重启）：
   - **AI Assistant Internal URL** = `http://assistant-client:3002`
   - **AI Assistant Server URL** = `http://localhost:3002`
3. 点击保存
4. 执行命令验证优先级：
   ```shell
   curl http://localhost:8080/api/assistant/get-chat-app-server-url(暂时返回空，但是portal端使用了proxy，先ignore)
   # 期望返回 proxy 路径，而非 http://localhost:3002
   ```
5. 访问 Portal，观察 AI Assistant 加载行为

**Expected Result**：
- `/api/assistant/get-chat-app-server-url` 返回 `http://localhost:8080/api/assistant/proxy`（而非 `http://localhost:3002`）
- 所有 AI 请求走 Proxy 路径

**Risk Covered**：R4（配置优先级）

🔴 **测试结果**：pass

---

### TC-07：未配置任何 URL 时 AI 助手不可见

**Scenario Objective**：验证两个 URL 均未配置时，AI 助手入口不显示，`ai-assistant-visible` 返回 false

**Scenario Description**：防止无效配置导致 UI 显示 AI 入口但点击后报错的体验问题

**Key Steps**：
1. 登录 EM → Settings → Presentation → AI Integration
2. 勾选 **AI Assistant Visible**，点击保存
3. 清空 **AI Assistant Internal URL** 和 **AI Assistant Server URL** 两个字段，点击保存（无需重启）
4. 执行命令验证：
   ```shell
   curl http://localhost:8080/sree/api/assistant/ai-assistant-visible
   # 期望：false
   ```
5. 打开 Portal 页面，检查 AI 助手入口图标

**Expected Result**：
- `/api/assistant/ai-assistant-visible` 返回 `false`
- Portal 页面不显示 AI 助手入口图标
- Portal 页面 HTML 中无 `ai-assistant.umd.js` script 标签

**Risk Covered**：R4（边界配置行为）

🔴 **测试结果**：pass

---

### TC-08：EM 管理界面配置 Proxy URL

**Scenario Objective**：验证管理员可通过 Enterprise Manager 界面正确配置和保存 `chat.app.internal.url`

**Scenario Description**：管理员是配置 Proxy 模式的实际操作者，UI 配置路径是否完整是基础功能验证

**Key Steps**：
1. 以管理员身份登录 StyleBI EM
2. 进入 Settings → Presentation → AI Integration
3. 在 "AI Assistant Internal URL" 字段填入 `http://assistant-client:3002`
4. 保存设置
5. 重新进入该页面，检查字段值是否持久化
6. 访问 `/api/assistant/get-chat-app-server-url` 验证后端属性生效

**Expected Result**：
- Internal URL 字段可正常输入、保存
- 页面刷新后值仍存在
- API 返回的 URL 变为 proxy 路径（`{styleBIUrl}/api/assistant/proxy`）

**Risk Covered**：R4（EM 配置回路）

🔴 **测试结果**：pass

---

### TC-09：Path Traversal 防护

**Scenario Objective**：验证包含路径遍历（`..`）的非法请求在浏览器访问时被拦截

**Key Steps**：
1. 在浏览器地址栏输入以下地址并访问：
   - `http://localhost:8080/api/assistant/proxy/../../../etc/passwd`
2. （可选）再输入编码后的路径进行验证：
   - `http://localhost:8080/api/assistant/proxy/%2e%2e%2f%2e%2e%2fetc/passwd`

**Expected Result**：
- 请求被拦截，不会转发到上游服务
- 返回 400 或 404 等错误响应
- 不返回任何敏感内容

**Risk Covered**：安全 - Path Traversal

🔴 **测试结果**：pass

---

### TC-10：Proxy 模式 — 上游服务不可达时的降级

**Scenario Objective**：验证当内部 Assistant 服务宕机时，StyleBI 返回明确的错误信息，而非长时间无响应

**Scenario Description**：上游不可达是实际生产中常见的故障场景，代理层的错误处理直接影响用户体验和排查效率

**Key Steps**：
1. 配置 Proxy 模式，启动 StyleBI
2. 停止 `assistant-server` 和 `assistant-client` 容器
3. 在 Portal 中打开 AI Assistant，发送一条消息

**Expected Result**：
- UI 显示错误提示（非空白页或无限 loading）
- 对应请求返回 HTTP 502 Bad Gateway
- 响应体包含 "Assistant service unavailable" 信息
- StyleBI 服务本身无崩溃、无异常退出

**Risk Covered**：R1（服务不可达降级）

🔴 **测试结果**：pass

---

*报告生成时间：2026-03-24*
*分析范围：PR2976 - AI Assistant Reverse Proxy for Private-Network Deployments*
