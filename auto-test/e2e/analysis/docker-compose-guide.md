# E2E 测试 Docker Compose 启动指南

## 核心概念：多文件叠加模式

E2E 测试使用 Docker Compose **多文件叠加（overlay）** 模式启动应用栈。
所有 compose 文件存放在 `e2e/tests/resources/` 目录下。

基本规则：
- `compose.yaml` 是**核心文件**，定义 `storage` 和 `server` 两个必选服务
- 其余 `compose.*.yaml` 是**叠加文件**，每个对应一种可选的后端或外部服务
- 多个文件叠加时，**后面的文件覆盖前面文件中同名服务的配置**（environment、depends_on 等）
- 叠加文件不仅可以新增服务，还可以为已有服务（storage / server）注入额外的环境变量

---

## 现有 Compose 文件说明

### 核心文件

| 文件 | 作用 |
|------|------|
| `compose.yaml` | 必选。启动 `storage`（初始化节点）和 `server`（应用服务器）。默认 SMTP 指向 `mail.inetsoft.com:587` |

### KV 存储后端（二选一）

| 文件 | 新增服务 | 配置覆盖 |
|------|---------|---------|
| `compose.db.yaml` | `postgres-kv`（PostgreSQL） | storage / server 的 KV 和 ExternalStorage 指向 postgres-kv |
| `compose.mongo.yaml` | `mongodb` | storage / server 的 KV 指向 mongodb |

### Blob 存储后端（二选一）

| 文件 | 新增服务 | 配置覆盖 |
|------|---------|---------|
| `compose.filesystem.yaml` | `permissions`（权限初始化） | storage / server 挂载本地卷，Blob 使用文件系统 |
| `compose.s3.yaml` | 无（依赖 localstack） | storage / server 的 Blob 指向 LocalStack S3 |
| `compose.azurite.yaml` | `azurite`（Azure Blob 模拟） | storage / server 的 Blob 指向 azurite |
| `compose.gcs.yaml` | `fake-gcs-server` | storage / server 的 Blob 指向本地 GCS 模拟 |

### 测试数据库

| 文件 | 新增服务 | 用途 |
|------|---------|------|
| `compose.pg-db.yaml` | `postgres`（PostgreSQL） | 供测试用的业务数据库，与 KV 存储的 postgres-kv 独立 |

### 其他外部依赖

| 文件 | 新增服务 | 用途 |
|------|---------|------|
| `compose.localstack.yaml` | `localstack` | AWS S3 + DynamoDB 本地模拟（配合 compose.s3.yaml / compose.ddb.yaml 使用） |
| `compose.ddb.yaml` | 无（依赖 localstack） | KV 后端使用 DynamoDB |
| `compose.cosmosdb.yaml` | `cosmosdb` | Azure CosmosDB 模拟 |
| `compose.firestore.yaml` | `firestore` | GCP Firestore 模拟 |

---

## MailHog（Mock SMTP）

**解决问题**：调度 Email Action 验证、自助注册邮件验证码、Sharing 邮件发送。

`compose.yaml` 的 storage 服务中已硬编码了真实 SMTP 地址：
```yaml
INETSOFTENV_MAIL_SMTP_HOST: "mail.inetsoft.com"
INETSOFTENV_MAIL_SMTP_PORT: "587"
```

通过叠加 `compose.mailhog.yaml` 可将邮件拦截到 MailHog，不影响其他测试场景。

### compose.mailhog.yaml

```yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    restart: unless-stopped
    ports:
      - "8025"      # Web UI + REST API（Playwright 读信）
    healthcheck:
      test: curl -s http://localhost:8025/api/v2/messages || exit 1
      interval: 10s
      retries: 5
      start_period: 5s

  storage:           # 覆盖 compose.yaml 中 storage 的 SMTP 配置
    environment:
      INETSOFTENV_MAIL_SMTP_HOST: "mailhog"
      INETSOFTENV_MAIL_SMTP_PORT: "1025"

  server:            # 如果 server 也读取邮件配置，同样覆盖
    depends_on:
      mailhog:
        condition: service_healthy
```

### Playwright 中读取邮件

```typescript
const mailhogPort = environment.getContainer('mailhog-1').getMappedPort(8025);
const mailhogHost = environment.getContainer('mailhog-1').getHost();

const res = await page.request.get(`http://${mailhogHost}:${mailhogPort}/api/v2/messages`);
const { items } = await res.json();
expect(items[0].Content.Headers.Subject[0]).toBe("Scheduled Report");
```

---

## 常用组合示例

### 最简启动（默认 MapDB KV + 测试数据库）

```typescript
new DockerComposeEnvironment(composeDir, [
  'compose.yaml',
  'compose.pg-db.yaml',
])
```

### MongoDB KV + 文件系统 Blob + 测试数据库

```typescript
new DockerComposeEnvironment(composeDir, [
  'compose.mongo.yaml',
  'compose.filesystem.yaml',
  'compose.pg-db.yaml',
  'compose.yaml',
])
```

### 调度邮件测试（加入 MailHog）

```typescript
new DockerComposeEnvironment(composeDir, [
  'compose.yaml',
  'compose.pg-db.yaml',
  'compose.mailhog.yaml',
])
```

### AWS S3 Blob 后端（LocalStack）

```typescript
new DockerComposeEnvironment(composeDir, [
  'compose.localstack.yaml',
  'compose.s3.yaml',
  'compose.yaml',
])
```

> **注意**：`compose.yaml` 应始终出现在列表中。叠加文件的顺序影响覆盖优先级——列表**靠后**的文件优先级更高。

---

## 文件叠加的工作原理

以 `compose.db.yaml` + `compose.yaml` 为例，叠加后等效配置：

```yaml
services:
  postgres-kv:           # 来自 compose.db.yaml（新服务）
    image: postgres:18
    ...

  storage:               # 合并结果
    image: stylebi-enterprise  # 来自 compose.yaml
    environment:
      INETSOFTCONFIG_KEYVALUE_TYPE: "database"   # 来自 compose.db.yaml（覆盖）
      INETSOFTENV_LICENSE_KEY: ...               # 来自 compose.yaml
      ...
    depends_on:
      postgres-kv:       # 来自 compose.db.yaml（新增依赖）
        condition: service_healthy
      storage:           # 来自 compose.yaml（原有依赖，保留）
        condition: service_completed_successfully
```

叠加文件中只需写**需要变化的部分**，其余字段由 compose.yaml 提供，Docker Compose 在运行时自动深度合并。

---

## 添加新的外部服务

如需为新的功能域（如 LDAP、Redis 等）引入外部依赖，按以下约定新建文件：

1. 文件命名：`compose.{service-name}.yaml`，放在 `e2e/tests/resources/`
2. 新增服务定义（包含 healthcheck）
3. 覆盖 `storage` / `server` 的 environment 和 depends_on
4. 不修改 `compose.yaml` 本身

这样可以保持主文件简洁，只描述"最小可运行的应用"，扩展能力通过叠加按需引入。
