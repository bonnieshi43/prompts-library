# Excel 转 E2E 测试用例流程说明

## 概述

`e2e/` 目录实现了一套从 **legacy Excel 测试计划** 到 **可执行 Playwright 测试** 的自动化转换流水线，共经历 6 个阶段。

---

## 文件路径映射规则

```
specs/legacy/[path]/Name_Plan.xls
       ↓ 阶段0（Excel → 结构化 MD）
specs/structured/[path]/name-structured.md
       ↓ 阶段1（AI 生成规范）
specs/browser/[path]/name.md
       ↓ 阶段3（AI 生成测试代码）
tests/browser/[path]/name.spec.ts
                   + name-assets.zip
                   + name-setup.groovy
                   + name-db.sql
```

---

## 六个阶段详解

### 阶段0：Excel 结构化提取（AI 辅助）

**对应文件**：`generate-structured-md.prompt.md`（待创建）

- **输入**：原始 Excel 文件（`.xls` / `.xlsx`，位于 `specs/legacy/`）
- **输出**：`specs/structured/[path]/name-structured.md`

**目标**：对 Excel 内容做 **忠实还原**，不做任何测试逻辑解读。输出的结构化 MD 是阶段1的唯一输入，避免阶段1再直接读 Excel。

**处理内容**：
- 使用 Python xlrd / openpyxl 读取文件，保留所有 sheet
- 将编号章节（`1.`、`2.`、`3.1` 等）还原为 Markdown 标题层级
- 将网格/矩阵区域转为 Markdown 表格，保留所有列（含状态列）
- 识别颜色图例，在表格中用注释标注有色单元格的含义
- 中文内容翻译为英文（测试用的非拉丁字符输入除外）
- 多 sheet 文件：每个 sheet 作为独立的一级章节
- **不做任何筛选、合并或解释**：已删除功能的行、blocked/skipped 状态行一律保留原样

**输出格式示例**：

```markdown
# Name_Plan — Structured Extract

**Source file:** `sree/Portal/Name_Plan.xls`
**Sheets:** `Test Cases`, `Config`

---

## Sheet: Test Cases

### 1. Repository Tree Display

The repository tree is shown in the Portal report tab.

#### 1.1 Default State

| # | Precondition | Action | Expected Result | Status |
|---|-------------|--------|-----------------|--------|
| 1 | No assets loaded | Open `/app/portal/tab/report` | Search input visible | Pass |
| 2 | No assets loaded | Open `/app/portal/tab/report` | "My Dashboards" node visible | Pass |

**Color Legend:** Yellow = separate test case boundary

#### 1.2 Expand Folder (Yellow group)

| # | Precondition | Action | Expected Result | Status |
|---|-------------|--------|-----------------|--------|
| 3 | Repository tree loaded | Click expand toggle on "My Dashboards" | Folder expands | Blocked — feature not released |
```

---

### 阶段1：规范生成（AI 辅助）

**对应文件**：`generate-browser-specs.prompt.md`

- **输入**：结构化 MD（`specs/structured/[path]/name-structured.md`，由阶段0产出）
- **处理**：
  - AI 代理读取 Excel，解析测试步骤、矩阵网格、颜色编码单元格
  - 自动翻译中文内容
  - 识别前置条件类型：
    - `**Assets ZIP:**` — 应用资源导入包
    - `**Setup Script:**` — Groovy 配置脚本
    - `**Database SQL:**` — PostgreSQL 初始化脚本
  - 无法自动化的步骤标记为 `_REQUIRES_HUMAN_:`
  - 已删除功能（Report/Archive 资源、Repository 列表模式等）对应测试记录至 `_SKIPPED_TESTS.md`
- **输出**：`specs/browser/**/*.md`，格式为 Given / When / Then 的 Markdown 规范

**生成的规范示例**：

```markdown
# Repository Tree

**Legacy source:** `sree/Portal/Repository_Plan.xls`

## Prerequisites
- **Assets ZIP:** `repository-assets.zip`

## Test: Portal repository tree shows correct default UI

**URL:** `/app/portal/tab/report`

### Given
- Application is running with default state (security disabled, no assets)
- User navigates to `/app/portal/tab/report`

### When
- No action required — this test verifies the initial state

### Then
- **Assert:** Search input is visible (`getByLabel("Search Repository Tree")`)
- **Assert:** "My Dashboards" folder node is visible
```

---

### 阶段2：人工审查（半自动）

**对应文件**：
- `specs/browser/_RECIPES.md` — 可复用操作配方库（REST API 认证、Viewsheet 操作、登录流程等）
- `legacy-tests.md` — 297 个 Excel 文件的分类目录索引（135 个 UI 候选 + 162 个跳过）

**处理**：
- 人工解决所有 `_REQUIRES_HUMAN_:` 注解
- 按需创建资源文件（`.groovy`、`.zip`、`.sql`）
- 无需修改时使用占位文件：`noop.groovy` / `noop.sql` / `noop.zip`

---

### 阶段3：测试代码生成（AI 辅助）

**对应文件**：`generate-browser-tests.prompt.md`

- **输入**：审查后的 Markdown 规范
- **处理**：
  - AI 将 Given/When/Then 映射为 Playwright API 调用
  - 生成 Testcontainers + Docker Compose 环境启动代码
  - 处理参数化测试（`@ParameterizedTest`）
  - 处理多后端组合测试（`Backend Combinations`）
  - 生成测试结束后的 API 清理（Cleanup）步骤
- **输出**：`tests/browser/**/*.spec.ts` + 配套资源文件

**生成的测试代码示例**：

```typescript
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { DockerComposeEnvironment, Wait } from 'testcontainers';

const composeDir = path.resolve(__dirname, '../../resources');
let environment: StartedDockerComposeEnvironment;
let baseUrl: string;

test.beforeAll(async () => {
  environment = await new DockerComposeEnvironment(
    composeDir,
    ['compose.mongo.yaml', 'compose.filesystem.yaml', 'compose.yaml']
  )
    .withEnvironment({
      INETSOFT_LICENSE_KEY: process.env.INETSOFT_LICENSE_KEY!,
      SETUP_ASSETS_ZIP: '../browser/sree/portal/repository-assets.zip',
    })
    .withWaitStrategy('server-1', Wait.forHealthCheck())
    .withStartupTimeout(120_000)
    .up();

  const host = environment.getContainer('server-1').getHost();
  const port = environment.getContainer('server-1').getMappedPort(8080);
  baseUrl = `http://${host}:${port}`;
});

test.afterAll(async () => {
  if (environment) await environment.down();
});

test('Portal repository tree shows correct default UI', async ({ page }) => {
  await page.goto(baseUrl + '/app/portal/tab/report');
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Search Repository Tree')).toBeVisible();
  await expect(page.getByRole('treeitem', { name: 'My Dashboards' })).toBeVisible();
});
```

---

### 阶段4：环境配置（Docker 多后端）

**对应文件**：`tests/resources/compose.yaml` + 各后端配置文件

| 文件 | 用途 |
|------|------|
| `compose.yaml` | 核心应用栈（storage 初始化服务 + server 应用服务） |
| `compose.mongo.yaml` | MongoDB 键值存储（默认） |
| `compose.db.yaml` | PostgreSQL 键值存储 |
| `compose.ddb.yaml` | AWS DynamoDB |
| `compose.cosmosdb.yaml` | Azure CosmosDB |
| `compose.firestore.yaml` | Google Firestore |
| `compose.filesystem.yaml` | 本地文件系统 Blob 存储（默认） |
| `compose.s3.yaml` | AWS S3 Blob 存储 |
| `compose.azurite.yaml` | Azure Blob 存储模拟器 |
| `compose.gcs.yaml` | Google Cloud Storage |
| `compose.localstack.yaml` | AWS 服务本地模拟 |
| `compose.pg-db.yaml` | PostgreSQL 数据库（JDBC 数据源） |

支持的存储后端组合共 **20 种**（5 种 KV 存储 × 4 种 Blob 存储）。

规范中声明后端组合的写法：

```markdown
## Backend Combinations
| **Key-Value Backend** | **Blob Backend** |
| MongoDB               | Filesystem       |
| MongoDB               | S3               |
| Database              | Filesystem       |
```

---

### 阶段5：测试执行

**对应文件**：`playwright.config.ts`、`package.json`

**关键配置**：
- 全局超时：300 秒（5 分钟，含 Docker 启动 60–120 秒）
- 并行度：单 worker（每个测试独立启动 Docker 栈）
- 支持浏览器：Chromium、Firefox、WebKit
- 测试报告：HTML 格式

**运行命令**：

```bash
# 安装依赖
cd e2e
npm install
npx playwright install

# 运行所有测试
npx playwright test

# 运行单个测试文件
npx playwright test tests/browser/sree/portal/repository.spec.ts

# 查看 HTML 报告
npx playwright show-report
```

**每个测试的执行流程**：

1. Testcontainers 启动对应 Docker Compose 栈（约 60–120 秒）
2. 运行 `setup.groovy` 脚本（如果存在）
3. 导入 `assets.zip` 资源（如果存在）
4. 执行 `db.sql` 初始化数据库（如果存在）
5. 等待服务健康检查通过
6. Playwright 启动浏览器，执行测试步骤
7. 收集截图 / 追踪信息
8. Docker 栈自动清理

---

## 总览表

| 阶段 | 关键文件 | 类型 | 作用 |
|------|---------|------|------|
| 0. Excel 结构化 | `generate-structured-md.prompt.md` | AI 提示词 | 忠实还原 Excel 内容为结构化 Markdown，不做解释 |
| 1. 规范生成 | `generate-browser-specs.prompt.md` | AI 提示词 | 读取结构化 MD，生成 Given/When/Then 测试规范 |
| 2. 人工审查 | `_RECIPES.md`、`legacy-tests.md` | 参考文档 | 配方库 + Excel 目录，辅助人工补全 `_REQUIRES_HUMAN_:` |
| 3. 测试生成 | `generate-browser-tests.prompt.md` | AI 提示词 | 指导将 Markdown 规范转为 TypeScript 测试代码 |
| 4. 环境配置 | `compose.yaml` + `compose.*.yaml` | Docker 配置 | 提供 20 种存储后端组合的容器化运行环境 |
| 5. 测试执行 | `playwright.config.ts`、`package.json` | 运行时配置 | Playwright 测试运行器及依赖管理 |

---

## 各阶段当前状态

| 阶段 | 状态 | 已有文件 | 缺少 / 待办 |
|------|------|---------|------------|
| **0. Excel 结构化** | 未开始 | 无 | 需新建 `generate-structured-md.prompt.md`；需创建 `specs/structured/` 输出目录 |
| **1. 规范生成** | 提示词已有，输入源需调整 | `generate-browser-specs.prompt.md` | 需将提示词中"直接读 Excel"改为"读取结构化 MD"；`specs/browser/` 目前无任何生成产物 |
| **2. 人工审查** | 框架已就绪 | `specs/browser/_RECIPES.md`、`legacy-tests.md`、`noop.groovy/sql/zip` | 无固定缺失文件；每次生成规范后按需创建 `.groovy`、`.zip`、`.sql` |
| **3. 测试生成** | 提示词已就绪 | `generate-browser-tests.prompt.md` | `tests/browser/` 目前无任何生成产物；依赖阶段1/2完成 |
| **4. 环境配置** | 已就绪 | 全部 12 个 `compose.*.yaml` + `compose.yaml` | 需构建 Docker 镜像（`./mvnw clean package jib:dockerBuild -pl docker`） |
| **5. 测试执行** | 配置已就绪 | `playwright.config.ts`、`package.json` | 需 `npm install` + `npx playwright install`；需在 `e2e/.env` 中填写 `INETSOFT_LICENSE_KEY` |

---

## 特性说明

### 参数化测试

规范中声明参数表格，AI 生成 `for...of` 循环测试：

```markdown
**Type:** `@ParameterizedTest`

### Parameters
| username | password | expectedError |
| admin    | Admin1234! | null        |
| user1    | wrongpass  | Invalid password |
```

### 测试清理（Cleanup）

测试修改共享状态后，通过 REST API 还原：

```markdown
### Cleanup
- **API:** `ViewsheetsApi.removeFavorite()` with `assetId` for `{assetPath}`
```

### 默认应用状态

所有测试基于以下默认状态启动，除非规范中另行声明：
- 安全性禁用，无需登录
- 默认管理员账号：`admin` / `Admin1234!`
- 无预置资源、数据源、文件夹
