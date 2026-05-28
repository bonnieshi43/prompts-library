# 单元测试落地计划（全项目）

> **范围**：`community/web/projects/portal` + `community/web/projects/em` + `community/web/projects/shared`
> **测试栈**：Angular Testing Library (ATL) + MSW v2 + Jest 29
> **关联文档**：`portal-unit-testing-analysis.zh-CN.md`
> **生成日期**：2026-05-25

---

## 一、整体优先级框架

### 1.1 全局优先级排序

```
[P0] shared/schedule（基础）
  ↓
[P0] portal/portal/data + portal/portal/schedule（最低覆盖率 + 核心用户路径）
  ↓
[P1] portal/portal/dashboard + portal/common（Services）
  ↓
[P1] portal/composer（设计器，部分画布组件走 E2E）
  ↓
[P1] portal/vsobjects（运行时视觉对象）
  ↓
[P2] portal/binding + portal/graph + portal/widget
  ↓
[P2] portal/vs-wizard + portal/vsview + portal/viewer + portal/format
  ↓
[P3] em/common + em/monitoring + em/widget + em/navbar + em/page-header
```

### 1.2 各大模块数据一览

| 模块 | TS 文件 | spec 文件 | 覆盖率 | .tl.spec 数量 | 优先级 |
|------|---------|-----------|--------|--------------|--------|
| shared/schedule | 29（纯 model+service） | 0 | **0%** | 0 | **P0（前置）** |
| portal/portal/data | 288 | 3 | **1.0%** | 2（tl） | **P0** |
| portal/portal/schedule | 34 | 7 | 20.6% | 1（tl） | **P0** |
| portal/portal/dashboard | ~4 | 0 | **0%** | 0 | **P1** |
| portal/common | ~22 Services | 5 | **6%** | 0 | **P1** |
| portal/composer | 176 | 54 | 26.1% | 0 | **P1** |
| portal/vsobjects | 121 | 76 | 35.5% | 0 | **P1** |
| portal/binding | 92 | 27 | 27.2% | 0 | **P2** |
| portal/graph | 20 | 9 | 35.0% | 1 | **P2** |
| portal/widget | 162 | 54 | 24.7% | 0 | **P2** |
| portal/vs-wizard | 21 | 6 | 28.6% | 0 | **P2** |
| portal/vsview | 4 | 1 | 25.0% | 0 | **P2** |
| portal/viewer + format + embed | ~11 | 4 | ~30% | 0 | **P3** |
| em/common | 52 | 14 | 27% | 0 | **P3** |
| em/monitoring | 34 | 14 | 41% | 0 | **P3** |
| em/widget | 26 | 0 | **0%** | 0 | **P3** |
| em/navbar + page-header | ~9 | 0 | **0%** | 0 | **P3** |
| shared（剩余） | ~88 | 15 | 17% | 0 | **P3** |

### 1.3 优先级排序依据

| 排序因素 | 权重 | 说明 |
|----------|------|------|
| 覆盖率（越低越急） | 40% | portal/data 1%、shared/schedule 0% 是最大盲区 |
| 用户路径风险 | 30% | data 浏览、schedule 管理是日常核心功能，回归危害大 |
| 代码体量 | 20% | 大文件（>600行）改一处影响面广，需覆盖验证 |
| 可测性 | 10% | 依赖 jsPlumb/canvas/STOMP 实时流的组件测试成本极高，优先 E2E |

---

## 二、阶段规划

### 阶段 A — 前置基建 ✅ 基建完成

解除后续所有 P0 的测试阻塞项。

| 任务 | 文件 | 框架 | 状态 |
|------|------|------|------|
| 新增 Portal MSW Handler 文件 | `mocks/handlers/portal.handlers.ts` | MSW | ✅ Done |
| 注册 portal handlers | `mocks/server.ts`（更新） | — | ✅ Done |
| 新增 Shared Schedule Service 测试 | `shared/schedule/schedule-users.service.spec.ts` | Jest direct | ✅ Done |
| 新增 Shared Schedule Service 测试 | `shared/schedule/schedule-task-names.service.tl.spec.ts` | MSW | ✅ Done |
| 新增 Shared Schedule Service 测试 | `shared/schedule/time-zone.service.tl.spec.ts` | Jest direct（纯逻辑，无 HTTP） | ✅ Done |

### 阶段 B — P0 核心路径（约 1 周）

覆盖 portal/data + portal/schedule 的高风险路径。

### 阶段 C — P1 高价值（持续推进）

composer/vsobjects/dashboard/common Services。

### 阶段 D — P2 渐进迁移（持续）

binding/graph/widget/vs-wizard 等，存量 legacy spec 向 ATL 迁移。

### 阶段 E — P3 补齐 + E2E Smoke

em 剩余模块、portal canvas 类组件 smoke、Playwright 黄金路径。

---

## 三、模块详细计划

---

### 3.1 shared/schedule（P0 前置）

**现状**：29 个文件（16 个 model + 3 个 service），**0 个 spec**。
**原因**：shared/schedule 被 portal 和 em 双端引用；3 个 service 有 HTTP 调用，无测试风险极高；model 文件是纯 TypeScript 接口，可选测。

#### 3.1.1 需要新增的文件 ✅ Done

| 新增文件 | 目标文件 | 框架 | 优先级 |
|----------|----------|------|--------|
| `schedule/schedule-users.service.spec.ts` | `schedule-users.service.ts` | Jest 直接实例化 + HttpClientTestingModule | P0 |
| `schedule/schedule-task-names.service.tl.spec.ts` | `schedule-task-names.service.ts` | MSW + TestBed | P0 |
| `schedule/time-zone.service.tl.spec.ts` | `time-zone.service.ts` | MSW + TestBed | P0 |

#### 3.1.2 schedule-users.service.spec.ts 测试要点 ✅ Done

```typescript
// 路径：projects/shared/src/lib/schedule/schedule-users.service.spec.ts
// 框架：Jest + HttpClientTestingModule（纯 HTTP 契约验证）

describe("ScheduleUsersService", () => {
  // 测试点 1：getUsers() 构造正确的 GET 请求
  it("should call GET /api/schedule/users when getUsers() is called")

  // 测试点 2：返回数据映射为 UsersModel
  it("should map HTTP response to UsersModel")

  // 测试点 3：带 orgId 参数时 URL 包含 orgId query param
  it("should append orgId to request when provided")
})
```

#### 3.1.3 time-zone.service.tl.spec.ts 测试要点 ✅ Done

```typescript
// 路径：projects/shared/src/lib/schedule/time-zone.service.tl.spec.ts
// 框架：MSW + TestBed（真实 HttpClient + 网络拦截）

describe("TimeZoneService", () => {
  // 测试点 1：getTimeZones() 调用 /api/schedule/time-zones 并返回列表
  it("should fetch and return timezone list")

  // 测试点 2：网络错误时返回可观察的 error
  it("should propagate HTTP error")

  // 测试点 3：结果被缓存（调用两次只发一个请求）
  it("should cache the timezone list after first fetch")
})
```

---

### 3.2 mocks/handlers/portal.handlers.ts（P0 前置）✅ Done

**现状**：~~不存在。portal 的 HTTP 接口完全没有 MSW mock，阻塞所有 portal ATL 测试。~~
**完成**：2026-05-25 已创建，覆盖 50+ 端点（Portal 应用级、Schedule、数据源浏览器、物理模型、Query 构建器），并注册到 `server.ts`。

#### 3.2.1 需要新增的文件

**新增**：`community/web/mocks/handlers/portal.handlers.ts` ✅ Done

**更新**：`community/web/mocks/server.ts` ✅ Done

#### 3.2.2 portal.handlers.ts 需要覆盖的 API 范围 ✅ Done

```typescript
// mocks/handlers/portal.handlers.ts

// === Data 模块 ===
GET  /api/portal/data/sources              // datasource 列表
GET  /api/portal/data/sources/:name        // 单个 datasource 详情
POST /api/portal/data/sources              // 创建 datasource
GET  /api/portal/data/folders              // 文件夹树
POST /api/portal/data/folders              // 创建文件夹
DELETE /api/portal/data/sources/:name      // 删除 datasource
GET  /api/portal/data/physical-model/**    // 物理模型
GET  /api/portal/data/logical-model/**     // 逻辑模型
GET  /api/portal/data/database/schemas/**  // 数据库 schema
GET  /api/portal/data/query/**             // Query 相关

// === Schedule 模块 ===
GET  /api/portal/schedule/tasks            // 任务列表
POST /api/portal/schedule/tasks            // 新建任务
GET  /api/portal/schedule/tasks/:id        // 任务详情
PUT  /api/portal/schedule/tasks/:id        // 更新任务
DELETE /api/portal/schedule/tasks/:id      // 删除任务
GET  /api/portal/schedule/folders          // 文件夹

// === Dashboard 模块 ===
GET  /api/portal/dashboards                // Dashboard 列表
POST /api/portal/dashboards                // 新建 Dashboard
DELETE /api/portal/dashboards/:id          // 删除 Dashboard

// === 公共 ===
GET  /api/portal/tree                      // 仓库树
GET  /api/portal/user-settings             // 用户偏好
```

#### 3.2.3 server.ts 更新 ✅ Done

```typescript
import { portalHandlers } from "./handlers/portal.handlers";

export const server = setupServer(
   ...modelHandlers,
   ...composerHandlers,
   ...emHandlers,
   ...portalHandlers,  // 新增
);
```

---

### 3.3 portal/portal/data（P0）

**现状**：288 个 TS 文件，仅 3 个 spec（含 2 个 .tl.spec.ts 已完成），覆盖率 **1%**。
**原因**：数据源管理是 portal 最核心的用户功能，改动频繁（物理模型、逻辑模型、Query 构建器），回归风险极高。

#### 3.3.1 目录结构

```
portal/data/
├── data-datasource-browser/          # 数据源入口 ✅ Done (data-datasource-browser.component.tl.spec.ts)
├── data-folder-browser/              # 文件夹浏览 ✅ Done (data-folder-browser.component.tl.spec.ts)
├── data-navigation-tree/             # 导航树 ✅ Done (data-sources-tree-view.component.tl.spec.ts)
├── datasources-database/             # 数据库类数据源
│   ├── database-physical-model/      # 物理模型编辑器（1347 行）✅ Done (database-physical-model.component.tl.spec.ts)
│   ├── database-data-model-browser/  # 数据模型浏览（821 行）✅ Done (database-data-model-browser.component.tl.spec.ts)
│   ├── database-query/               # Query 构建器 
│   └── datasources-database.component（719 行）✅ Done (datasources-database.component.tl.spec.ts)
├── datasources-xmla/                 # XMLA 数据源（669 行）
├── data-auto-drill-dialog/           # 自动钻取（662 行）
├── logical-model-property-pane/      # 逻辑模型属性（723 行）
├── query-network-graph-pane/         # Query 关系图（928 行，canvas）
└── physical-model-network-graph/     # 物理模型关系图（868 行，canvas）
```

#### 3.3.2 需要新增的文件（按优先级）

| 优先级 | 新增文件 | 对应源文件 | 约行数 | 框架 | 状态 |
|--------|----------|------------|--------|------|------|
| **P0-1** | `datasources-database/datasources-database.component.tl.spec.ts` | `datasources-database.component.ts` | 719 | ATL + MSW | ✅ Done |
| **P0-2** | `datasources-database/database-physical-model/database-physical-model.component.tl.spec.ts` | `database-physical-model.component.ts` | 1347 | ATL + MSW | ✅ Done |
| **P0-3** | `datasources-database/database-data-model-browser/database-data-model-browser.component.tl.spec.ts` | `database-data-model-browser.component.ts` | 821 | ATL + MSW | ✅ Done |
| **P0-4** | `datasources-xmla/datasources-xmla.component.tl.spec.ts` | `datasources-xmla.component.ts` | 669 | ATL + MSW | ⬜ Pending |
| **P0-5** | `data-auto-drill-dialog/data-auto-drill-dialog.component.tl.spec.ts` | `data-auto-drill-dialog.component.ts` | 662 | ATL + MSW | ⬜ Pending |
| **P0-6** | `logical-model-property-pane/logical-model-property-pane.component.tl.spec.ts` | `logical-model-property-pane.component.ts` | 723 | ATL + MSW | ⬜ Pending |
| **P1-1** | `datasources-database/database-query/query-main/query-fields-pane.component.tl.spec.ts` | query fields pane | — | ATL + MSW | ⬜ Pending |
| **P1-2** | `datasources-database/database-query/query-main/query-conditions-pane.component.tl.spec.ts` | query conditions pane | — | ATL + MSW | ⬜ Pending |
| **P3-1** | `query-network-graph-pane/query-network-graph-pane.component.tl.spec.ts` | 928 行，canvas 重 | — | **smoke only** | ⬜ Pending |
| **P3-2** | `physical-model-network-graph/physical-model-network-graph.component.tl.spec.ts` | 868 行，canvas 重 | — | **smoke only** | ⬜ Pending |

#### 3.3.3 Service 测试（portal/data）

| 新增文件 | 目标 Service | 框架 | 优先级 | 状态 |
|----------|-------------|------|--------|------|
| `portal/services/data-model-browser.service.tl.spec.ts` | `data-model-browser.service.ts`（643 行） | MSW + TestBed | **P0** | ⬜ Pending |
| `portal/services/datasource-browser.service.tl.spec.ts` | `datasource-browser.service.ts`（401 行） | MSW + TestBed | **P0** | ⬜ Pending |
| `portal/services/data-browser.service.tl.spec.ts` | `data-browser.service.ts`（217 行） | MSW + TestBed | P0 | ⬜ Pending |
| `portal/services/data-query-model.service.tl.spec.ts` | `data-query-model.service.ts`（296 行） | MSW + TestBed | P0 | ⬜ Pending |

#### 3.3.4 datasources-database.component.tl.spec.ts 测试要点 ✅ Done

```typescript
// 框架：ATL + MSW
// MSW 拦截：GET /api/portal/data/sources/:name（返回数据库 datasource 详情）

describe("DatasourcesDatabaseComponent", () => {
  // 渲染
  it("should render connection form fields (host, port, database name)")
  it("should render test connection button")

  // 表单交互
  it("should enable save button only when required fields are filled")
  it("should show validation error when host is blank")
  it("should show validation error when port is non-numeric")

  // HTTP 交互
  it("should load datasource details on init via GET /api/portal/data/sources/:name")
  it("should POST connection test and display success/fail message")
  it("should PUT updated datasource on save")

  // 权限状态
  it("should show read-only view when user lacks write permission")
})
```

#### 3.3.5 database-physical-model.component.tl.spec.ts 测试要点 ✅ Done

```typescript
// 框架：ATL + MSW
// 场景：物理模型表管理、关联关系编辑

describe("DatabasePhysicalModelComponent", () => {
  // 初始化
  it("should load physical model table list on init")
  it("should display table columns when a table is selected")

  // 表操作
  it("should add a table to the model via drag-or-button")
  it("should remove a table and update the view")
  it("should show alias dialog when alias button is clicked")

  // 关联关系
  it("should display join between two tables when join exists")
  it("should allow editing join type (inner/left/right/full)")
  it("should validate that both sides of join have selected columns")

  // 保存
  it("should call PUT /api/portal/data/physical-model/** on save")
  it("should show success notification after successful save")
  it("should prevent navigation with unsaved changes (dirty guard)")
})
```

#### 3.3.6 data-model-browser.service.tl.spec.ts 测试要点

```typescript
// 框架：MSW + TestBed（HttpClientModule 真实注入）

describe("DataModelBrowserService", () => {
  it("should fetch datasource list via GET /api/portal/data/sources")
  it("should return empty array on 404 response")
  it("should filter databases by type when type param is provided")
  it("should delete datasource via DELETE and remove from cache")
  it("should get physical model via GET and cache response")
  it("should retry on 503 (if retry logic exists in service)")
})
```

---

### 3.4 portal/portal/schedule（P0）

**现状**：34 个 TS 文件，7 个 legacy spec（TestBed + NO_ERRORS_SCHEMA），1 个 tl.spec.ts，覆盖率 20.6%。
**原因**：schedule 是关键业务功能，现有 legacy spec 使用 NO_ERRORS_SCHEMA 质量差；EM 端已有 25 个高质量 ATL spec 可以直接参考。

#### 3.4.1 目录结构

```
portal/schedule/
├── schedule-task-list/               # 任务列表（920 行）⚠️
│   ├── edit-task-folder-dialog/      # 编辑文件夹对话框
│   ├── move-task-dialog/             # 移动任务对话框
│   └── task-folder-browser/         # 文件夹浏览
├── schedule-task-editor/
│   ├── actions/                     # task-action-pane（有 legacy spec）
│   ├── conditions/                  # task-condition-pane（有 legacy spec）
│   ├── options/                     # task-options-pane（有 legacy spec）
│   ├── add-parameter-dialog/        # 参数对话框（有 legacy spec）
│   ├── execute-as-dialog/           # 执行身份对话框
│   └── parameter-table/             # 参数表格（有 legacy spec）
└── model/                           # 纯 TS 模型（无需测试）
```

#### 3.4.2 参考策略

EM 端 schedule 已有完整的 25 个 `.tl.spec.ts`，portal schedule 与 EM schedule 共用 `shared/schedule` 模型，**可以大量复用 EM 的测试模式和 MSW handler**。

对应关系：

| Portal 组件 | EM 参考文件（直接复用模式） |
|------------|--------------------------|
| `schedule-task-list.component` | `em/.../schedule-task-list.component.tl.spec.ts` |
| `task-action-pane.component` | `em/.../task-action-pane.component.tl.spec.ts` |
| `task-condition-pane.component` | `em/.../task-condition-pane.component.tl.spec.ts` |
| `add-parameter-dialog.component` | `em/.../add-parameter-dialog.component.tl.spec.ts` |
| `daily-condition-editor.component` | `em/.../daily-condition-editor.component.tl.spec.ts` |
| `delivery-emails.component` | `em/.../delivery-emails.component.tl.spec.ts` |
| `backup-file.component` | `em/.../backup-file.component.tl.spec.ts` |

#### 3.4.3 需要新增/迁移的文件

| 动作 | 文件 | 框架 | 优先级 | 状态 |
|------|------|------|--------|------|
| **新增** | `schedule-task-list/schedule-task-list.component.tl.spec.ts` | ATL + MSW | **P0** | ⬜ Pending |
| **新增** | `schedule-task-editor/execute-as-dialog/execute-as-dialog.component.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **迁移** | `schedule-task-editor/actions/task-action-pane.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **迁移** | `schedule-task-editor/conditions/task-condition-pane.spec.ts` → `.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **迁移** | `schedule-task-editor/options/task-options-pane.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **迁移** | `schedule-task-editor/add-parameter-dialog/add-parameter-dialog.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **迁移** | `schedule-task-editor/parameter-table/parameter-table.component.spec.ts` → `.tl.spec.ts` | ATL | P1 | ⬜ Pending |
| **新增** | `schedule-task-list/move-task-dialog/move-task-dialog.component.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **新增** | `schedule-task-list/task-folder-browser/task-folder-browser.component.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |

#### 3.4.4 schedule-task-list.component.tl.spec.ts 测试要点

```typescript
// 框架：ATL + MSW
// 参考：em/settings/schedule/schedule-task-list/schedule-task-list.component.tl.spec.ts

describe("ScheduleTaskListComponent (Portal)", () => {
  // 列表渲染
  it("should render task list when tasks are loaded")
  it("should show empty state when no tasks exist")
  it("should display task name, status, and last-run time for each task")

  // 操作
  it("should navigate to task editor when task name is clicked")
  it("should open delete confirmation dialog when delete button is clicked")
  it("should call DELETE /api/portal/schedule/tasks/:id after confirmation")
  it("should refresh list after deletion")

  // 文件夹
  it("should render folder structure in tree")
  it("should expand/collapse folder on click")
  it("should open new-folder dialog when 'New Folder' button is clicked")

  // 过滤/搜索
  it("should filter tasks by search keyword")
  it("should clear search and show full list when search is cleared")

  // 权限
  it("should hide create button when user lacks CREATE permission")
  it("should disable delete button when user lacks DELETE permission")
})
```

---

### 3.5 portal/portal/dashboard（P1）

**现状**：约 4 个 TS 文件，**0 个 spec**，覆盖率 0%。
**原因**：Dashboard 管理是 portal 首页入口功能，新建/删除/排序 dashboard 影响用户体验。

#### 3.5.1 需要新增的文件

| 新增文件 | 对应源文件 | 框架 | 优先级 |
|----------|------------|------|--------|
| `dashboard/edit-dashboard-dialog.component.tl.spec.ts` | `edit-dashboard-dialog.component.ts` | ATL + MSW | **P1** |
| `dashboard/portal-dashboard.component.tl.spec.ts` | `portal-dashboard.component.ts` | ATL + MSW | P1 |

#### 3.5.2 edit-dashboard-dialog.component.tl.spec.ts 测试要点

```typescript
describe("EditDashboardDialogComponent", () => {
  it("should render name input and type selector")
  it("should validate that name is required")
  it("should show repository tree when type is 'Viewsheet'")
  it("should enable confirm button only when form is valid")
  it("should call POST /api/portal/dashboards on confirm")
  it("should close dialog and emit created dashboard on success")
  it("should show error message if name already exists (409 response)")
})
```

---

### 3.6 portal/common Services（P1）

**现状**：20 个 Services，5 个 spec（全部 TestBed 模式），0% component 覆盖。
**原因**：common 的 services 是 viewsheet 生命周期核心（ViewsheetClientService、RepositoryClientService），影响整个 portal 运行时。

#### 3.6.1 需要补充的 Service 测试

| 新增文件 | 目标 Service | 约行数 | 框架 | 优先级 |
|----------|-------------|--------|------|--------|
| `common/viewsheet-client/viewsheet-client.service.tl.spec.ts` | `viewsheet-client.service.ts` | — | Mock STOMP + TestBed | **P1** |
| `common/repository-client/repository-client.service.tl.spec.ts` | `repository-client.service.ts` | — | MSW + TestBed | **P1** |
| `common/asset-client/asset-client.service.tl.spec.ts` | `asset-client.service.ts` | — | MSW + TestBed | P1 |
| `vsobjects/util/vs-chart.service.tl.spec.ts` | `vs-chart.service.ts`（365 行） | 365 | 逻辑直接测 + MSW | **P1** |
| `vsobjects/util/show-hyperlink.service.spec.ts` | `show-hyperlink.service.ts`（290 行） | 290 | Jest 直接实例化 | P1 |
| `vsobjects/util/data-tip.service.spec.ts` | `data-tip.service.ts`（273 行） | 273 | Mock 依赖注入 | P1 |
| `binding/services/binding-tree.service.tl.spec.ts` | `binding-tree.service.ts`（411 行） | 411 | MSW + TestBed | P1 |
| `composer/util/assembly-action-factory.service.spec.ts` | `assembly-action-factory.service.ts`（240 行） | 240 | Jest 直接实例化 | P1 |
| `composer/util/repository-tree.service.tl.spec.ts` | `repository-tree.service.ts`（243 行） | 243 | MSW + TestBed | P1 |

---

### 3.7 portal/composer（P1）

**现状**：176 个 TS 文件，54 个 spec，覆盖率 26.1%，**0 个 .tl.spec.ts**。
**原因**：composer 是设计器核心，改动频繁（属性面板、绑定、撤销重做）；大量 legacy spec 使用 NO_ERRORS_SCHEMA 掩盖真实渲染问题；画布级组件（ws-pane、layout-pane）依赖 jsPlumb，不适合 ATL 深测。

#### 3.7.1 可测性分层

| 类型 | 组件 | 策略 |
|------|------|------|
| 属性对话框（dialog/vs/） | data-input-pane、highlight-dialog 等 | **ATL 迁移优先** |
| 画布编辑器 | ws-pane、layout-pane、editable-object-container | **smoke + E2E** |
| 服务 | assembly-action-factory、repository-tree | **Jest 直接测** |
| 工具栏 | toolbar 相关 | **ATL 轻量测** |

#### 3.7.2 需要新增/迁移的文件

**属性对话框 ATL 迁移（P1）**

| 动作 | 文件 | 原因 | 状态 |
|------|------|------|------|
| ✅ 已有 | `dialog/vs/data-input-pane-core-logic.tl.spec.ts` | 独立 ATL 测试，作为迁移模板 | ✅ Done |
| ✅ 已有 | `dialog/vs/data-input-pane-validate-date-format.tl.spec.ts` | 独立 ATL 测试，作为迁移模板 | ✅ Done |
| 迁移 | `dialog/vs/data-input-pane.component.spec.ts` → `.tl.spec.ts` | 已有上述 2 个 .tl.spec.ts 作为参考模板 | ⬜ Pending |
| 迁移 | `dialog/vs/highlight-dialog.component.spec.ts` → `.tl.spec.ts` | querySelector 多 | ⬜ Pending |
| 迁移 | `dialog/vs/selection-dialog.component.spec.ts` → `.tl.spec.ts` | querySelector 多 | ⬜ Pending |
| 新增 | `dialog/vs/hyperlink-dialog.component.tl.spec.ts` | 无覆盖 | ⬜ Pending |
| 新增 | `dialog/vs/general-prop-pane.component.tl.spec.ts` | 无覆盖 | ⬜ Pending |

**画布类（P3，smoke only）**

| 新增文件 | 行数 | 测试内容 | 状态 |
|----------|------|----------|------|
| `gui/vs/ws-pane.component.tl.spec.ts` | 1076 | smoke：render 不报错；关键 ARIA 结构存在 | ⬜ Pending |
| `gui/vs/layout-pane.component.tl.spec.ts` | 981 | smoke | ⬜ Pending |
| `gui/vs/asset-tree-pane.component.tl.spec.ts` | 909 | smoke + 树节点展开测试 | ⬜ Pending |
| `gui/vs/ws-details-pane.component.tl.spec.ts` | 812 | smoke | ⬜ Pending |

#### 3.7.3 data-input-pane ATL 测试要点（迁移参考）

```typescript
// 框架：ATL（无 MSW，纯组件逻辑）
// 参考：data-input-pane-core-logic.tl.spec.ts（已有）

describe("DataInputPane (migrated)", () => {
  // 继续当前 tl.spec.ts 模式，添加：
  it("should show error tooltip when field is invalid")
  it("should emit valueChange when input is modified")
  it("should disable input when component is in read-only mode")
  it("should show calendar picker when type is DATE")
})
```

---

### 3.8 portal/vsobjects（P1）

**现状**：121 个 TS 文件，76 个 spec，覆盖率 35.5%，**0 个 .tl.spec.ts**。
**原因**：vsobjects 是 viewsheet 运行时，每次 viewsheet 渲染都会触发；现有 spec 质量参差不齐，大量使用 NO_ERRORS_SCHEMA；month-calendar、preview-table 等体量大、逻辑复杂。

#### 3.8.1 可测性分层

| 类型 | 典型组件 | 策略 |
|------|----------|------|
| 展示+交互（HTTP 轻） | vs-submit、vs-text、vs-image | **ATL 迁移** |
| 展示+交互（STOMP 重） | vs-object-container、vs-calctable | **ATL + Mock ViewsheetClient** |
| 复杂日历/时间 | month-calendar（1026行） | **ATL + Mock** |
| 数据预览 | preview-table（816行） | **ATL + MSW** |
| 画布级 | vs-object-container 画布部分 | **smoke + E2E** |

#### 3.8.2 需要新增/迁移的文件

| 优先级 | 文件 | 行数 | 框架 | 状态 |
|--------|------|------|------|------|
| **P1** | `objects/submit/vs-submit.component.tl.spec.ts`（迁移） | — | ATL | ⬜ Pending |
| **P1** | `objects/calendar/month-calendar.component.tl.spec.ts` | 1026 | ATL + Mock | ⬜ Pending |
| **P1** | `objects/table/preview-table.component.tl.spec.ts` | 816 | ATL + MSW | ⬜ Pending |
| **P1** | `objects/vs-object-container.component.tl.spec.ts` | 710 | ATL + Mock STOMP（smoke） | ⬜ Pending |
| **P1** | `objects/table/vs-calctable.component.tl.spec.ts` | 695 | ATL + Mock STOMP | ⬜ Pending |
| **P2** | `objects/text/vs-text.component.tl.spec.ts` | — | ATL | ⬜ Pending |
| **P2** | `objects/image/vs-image.component.tl.spec.ts` | — | ATL | ⬜ Pending |
| **P2** | `objects/gauge/vs-gauge.component.tl.spec.ts` | — | ATL | ⬜ Pending |

#### 3.8.3 month-calendar.component.tl.spec.ts 测试要点

```typescript
// 框架：ATL + Mock（mock ChangeDetectorRef，mock ViewsheetClientService）

describe("MonthCalendarComponent", () => {
  // 日历渲染
  it("should render correct number of days for given month/year")
  it("should highlight today's date")
  it("should show previous month's trailing days in correct position")

  // 交互
  it("should emit dateSelected when user clicks a date")
  it("should navigate to previous month when left arrow clicked")
  it("should navigate to next month when right arrow clicked")
  it("should not allow selecting a date outside min/max range")

  // 选中状态
  it("should mark dates in selectedDates array as selected")
  it("should mark date range as selected when rangeMode is active")

  // 无障碍
  it("should have aria-label on each date cell")
  it("should announce month change via aria-live region")
})
```

#### 3.8.4 Service 补充（vsobjects）

| 新增文件 | 目标 | 框架 | 优先级 | 状态 |
|----------|------|------|--------|------|
| `vsobjects/util/vs-chart.service.tl.spec.ts` | `vs-chart.service.ts`（365行） | 逻辑 + MSW | **P1** | ⬜ Pending |
| `vsobjects/util/show-hyperlink.service.spec.ts` | `show-hyperlink.service.ts`（290行） | Jest 直接 | P1 | ⬜ Pending |
| `vsobjects/util/data-tip.service.spec.ts` | `data-tip.service.ts`（273行） | Mock 依赖 | P1 | ⬜ Pending |

---

### 3.9 portal/binding（P2）

**现状**：92 个 TS 文件，27 个 spec，覆盖率 27.2%，**0 个 .tl.spec.ts**。
**原因**：binding 编辑器是数据绑定核心 UI，属于较成熟区域；现有 spec 中存在 querySelector 问题需要迁移。

#### 3.9.1 需要新增/迁移的文件

| 优先级 | 文件 | 框架 | 状态 |
|--------|------|------|------|
| **P2** | `editor/chart/field/dimension-editor.component.tl.spec.ts`（迁移） | ATL | ⬜ Pending |
| **P2** | `editor/table/calc-group-option.component.tl.spec.ts`（迁移） | ATL | ⬜ Pending |
| **P2** | `editor/chart/field/measure-editor.component.tl.spec.ts` | ATL | ⬜ Pending |
| **P2** | `editor/binding-editor.component.tl.spec.ts` | ATL + MSW（轻度） | ⬜ Pending |
| **P2** | `services/binding-tree.service.tl.spec.ts` | MSW + TestBed | ⬜ Pending |
| **P2** | `services/vs-chart-editor.service.spec.ts` | Jest 直接 | ⬜ Pending |

#### 3.9.2 dimension-editor 测试要点（迁移）

```typescript
// 框架：ATL（纯组件，无 HTTP）

describe("DimensionEditor (migrated to ATL)", () => {
  it("should render name field and data type selector")
  it("should show date level picker when type is DATE/TIMESTAMP")
  it("should emit change event when user updates any field")
  it("should validate that name is not empty")
  it("should disable editing when read-only flag is set")
})
```

---

### 3.10 portal/graph（P2）

**现状**：20 个 TS 文件，9 个 spec，覆盖率 35%，已有 1 个 `.tl.spec.ts`（`axis-label-pane.tl.spec.ts`）。
**原因**：graph 对话框相对简单，已有最佳实践参考，迁移成本低；`axis-label-pane.tl.spec.ts` 是整个 portal 的 ATL 模板。

#### 3.10.1 需要新增/迁移的文件

| 优先级 | 文件 | 参考 | 状态 |
|--------|------|------|------|
| ✅ **已有** | `dialog/axis-label-pane.tl.spec.ts` | 整个 portal 的 ATL 参考模板 | ✅ Done |
| **P2** | `dialog/legend-pane.component.tl.spec.ts`（迁移） | axis-label-pane 模式 | ⬜ Pending |
| **P2** | `dialog/chart-general-pane.component.tl.spec.ts`（迁移） | axis-label-pane 模式 | ⬜ Pending |
| **P2** | `dialog/axis-title-pane.component.tl.spec.ts`（迁移） | axis-label-pane 模式 | ⬜ Pending |
| **P2** | `dialog/axis-linear-pane.component.tl.spec.ts`（迁移） | axis-label-pane 模式 | ⬜ Pending |
| **P3** | `chart-area.component.tl.spec.ts` | smoke only（1362行，canvas） | ⬜ Pending |
| **P3** | `chart-axis-area.component.tl.spec.ts` | smoke only（644行） | ⬜ Pending |

---

### 3.11 portal/widget（P2）

**现状**：162 个 TS 文件，54 个 spec，覆盖率 24.7%，**0 个 .tl.spec.ts**。
**原因**：widget 是公共 UI 组件库，被 composer、vsobjects、binding 大量复用；条件编辑器（condition/）使用 querySelector 较多，是迁移高收益区。

#### 3.11.1 需要新增/迁移的文件（分批）

**条件编辑器（优先，querySelector 多）**

| 文件 | 动作 |
|------|------|
| `condition/condition-editor.component.tl.spec.ts` | 新增 |
| `condition/junction-editor.component.tl.spec.ts` | 新增 |
| `condition/sub-condition-editor.component.tl.spec.ts` | 新增 |

**通用控件**

| 文件 | 动作 | 框架 |
|------|------|------|
| `color-picker/color-picker.component.tl.spec.ts` | 新增 | ATL |
| `formula-editor/formula-editor.component.tl.spec.ts` | 新增 | ATL + Mock |
| `tree/tree.component.tl.spec.ts` | 迁移（有 legacy spec） | ATL |
| `slide-out-panel/slide-out-panel.component.tl.spec.ts` | 迁移 | ATL |

#### 3.11.2 Services（widget）

| 新增文件 | 目标 | 框架 | 优先级 |
|----------|------|------|--------|
| `services/debounce.service.spec.ts` | `debounce.service.ts` | Jest 直接（已有，确认质量） | 已有 |
| `services/drop-down-stack.service.spec.ts` | `drop-down-stack.service.ts` | Jest 直接 | P2 |
| `services/dialog.service.spec.ts` | `dialog.service.ts`（263行） | Mock MatDialog | P2 |

---

### 3.12 portal/vs-wizard（P2）

**现状**：21 个 TS 文件，6 个 spec，覆盖率 28.6%，**0 个 .tl.spec.ts**。

| 新增文件 | 行数 | 框架 | 优先级 |
|----------|------|------|--------|
| `wizard-pane/vs-wizard-pane.component.tl.spec.ts` | 975 | ATL + MSW | **P2** |
| `wizard-binding/wizard-binding-pane.component.tl.spec.ts` | — | ATL + MSW | P2 |

#### 3.12.1 vs-wizard-pane 测试要点

```typescript
describe("VsWizardPaneComponent", () => {
  it("should render step 1 (Object Type selection) on init")
  it("should navigate to step 2 (Binding) when object type is selected")
  it("should render preview in step 3 (Preview)")
  it("should call POST to create viewsheet object on finish")
  it("should close wizard on cancel without creating object")
})
```

---

### 3.13 portal/vsview（P2）

**现状**：4 个 TS 文件，1 个 spec，覆盖率 25%。

| 新增文件 | 行数 | 框架 | 优先级 |
|----------|------|------|--------|
| `vs-binding-pane/vs-binding-pane.component.tl.spec.ts` | 942 | ATL + MSW | **P2** |

---

### 3.14 em/common（P3）

**现状**：52 个 TS 文件，14 个 spec，覆盖率 27%，**0 个 .tl.spec.ts**。
**原因**：em/common 包含 scroll-nav、file-chooser、table 等通用控件，被整个 EM 复用；现有测试质量较好，优先级低于 portal。

| 需要新增文件 | 框架 | 优先级 |
|-------------|------|--------|
| `common/table/expandable-row-table.component.tl.spec.ts` | ATL | P3 |
| `common/table/sortable-table.component.tl.spec.ts` | ATL | P3 |
| `common/file-chooser/file-chooser.component.tl.spec.ts` | ATL | P3 |
| `common/scroll-nav/scroll-nav.component.tl.spec.ts` | ATL | P3 |

---

### 3.15 em/monitoring（P3）

**现状**：34 个 TS 文件，14 个 spec，覆盖率 41%，**0 个 .tl.spec.ts**。

| 需要新增文件 | 框架 | 优先级 |
|-------------|------|--------|
| `monitoring/summary/cluster-node-summary.component.tl.spec.ts` | ATL + MSW | P3 |
| `monitoring/performance/performance-metrics.component.tl.spec.ts` | ATL + MSW | P3 |
| `monitoring/cache/cache-settings.component.tl.spec.ts` | ATL + MSW | P3 |

---

### 3.16 em/widget（P3）

**现状**：26 个 TS 文件，**0 个 spec**，覆盖率 0%。
**原因**：EM widget 是管理界面公共控件，覆盖率虽为 0%，但相对低风险（UI 简单）。

| 需要新增文件 | 框架 | 优先级 |
|-------------|------|--------|
| `widget/nav-tree/nav-tree.component.tl.spec.ts` | ATL | P3 |
| `widget/breadcrumb/breadcrumb.component.tl.spec.ts` | ATL | P3 |

---

### 3.17 em/navbar + em/page-header（P3）

**现状**：共 9 个 TS 文件，**0 个 spec**，覆盖率 0%。

| 需要新增文件 | 框架 | 优先级 |
|-------------|------|--------|
| `navbar/em-navbar.component.tl.spec.ts` | ATL + MSW（navbar 调 org info API） | P3 |
| `page-header/page-header.component.tl.spec.ts` | ATL | P3 |

---

## 四、框架选型速查表

| 被测对象类型 | 推荐框架 | 文件后缀 | 运行命令 |
|-------------|----------|---------|---------|
| HTTP 重组件（调 REST API） | **ATL + MSW** | `*.component.tl.spec.ts` | `npm run test:tl` |
| 纯展示/简单交互组件 | **ATL（无 MSW）** | `*.component.tl.spec.ts` | `npm run test:tl` |
| HTTP Service | **MSW + TestBed** | `*.service.tl.spec.ts` | `npm run test:tl` |
| 纯逻辑 Service（无 HTTP） | **Jest 直接实例化** | `*.service.spec.ts` | `ng test portal` |
| STOMP / WebSocket 重组件 | **Mock StompClientService + ATL** | `*.component.tl.spec.ts` | `npm run test:tl` |
| Action 类（纯逻辑，无模板） | **Jest 直接测** | `*-actions.spec.ts` | `ng test portal` |
| 画布 / jsPlumb / canvas 重 | **1–3 条 smoke** | `*.component.tl.spec.ts` | E2E 为主 |
| 模型/接口（纯 TS interface） | **不需要测试** | — | — |

---

## 五、ATL 测试模板

### 5.1 ATL + MSW 组件模板（最常用）

```typescript
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { HttpClientModule } from "@angular/common/http";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { server } from "../../../../../mocks/server";
import { http, HttpResponse } from "msw";
import { MyComponent } from "./my.component";
import { MyService } from "./my.service";

// 每个测试文件独立设置 MSW handler（可选，全局 handler 在 portal.handlers.ts）
function setupHandlers() {
  server.use(
    http.get("*/api/portal/data/sources", () =>
      HttpResponse.json([{ name: "ds1", type: "jdbc" }])
    ),
  );
}

async function renderComponent(props = {}) {
  return render(MyComponent, {
    imports: [HttpClientModule, FormsModule, ReactiveFormsModule],
    providers: [MyService],
    componentProperties: { ...props },
    schemas: [NO_ERRORS_SCHEMA], // 过渡期保留，逐步收紧
  });
}

describe("MyComponent", () => {
  beforeEach(() => setupHandlers());

  it("should load data on init and render list", async () => {
    await renderComponent();
    expect(await screen.findByText("ds1")).toBeInTheDocument();
  });

  it("should show empty state when list is empty", async () => {
    server.use(http.get("*/api/portal/data/sources", () => HttpResponse.json([])));
    await renderComponent();
    expect(screen.getByText(/no data sources/i)).toBeInTheDocument();
  });

  it("should call DELETE on remove and refresh list", async () => {
    let deleteCalled = false;
    server.use(
      http.delete("*/api/portal/data/sources/:name", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderComponent();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(deleteCalled).toBe(true);
  });
});
```

### 5.2 纯逻辑 Service 模板（无 HTTP）

```typescript
import { MyService } from "./my.service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(/* inject mock deps */);
  });

  it("should transform input model correctly", () => {
    const result = service.transform({ a: 1 });
    expect(result).toEqual({ b: 1 });
  });
});
```

### 5.3 HTTP Service + MSW 模板

```typescript
import { TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { server } from "../../../../../mocks/server";
import { http, HttpResponse } from "msw";
import { MyDataService } from "./my-data.service";

describe("MyDataService", () => {
  let service: MyDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [MyDataService],
    });
    service = TestBed.inject(MyDataService);
  });

  it("should fetch datasources via GET", async () => {
    server.use(
      http.get("*/api/portal/data/sources", () =>
        HttpResponse.json([{ name: "ds1" }])
      ),
    );
    const result = await service.getDatasources().toPromise();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ds1");
  });
});
```

### 5.4 ATL 查询优先级

```
1. getByRole('button', { name: /save/i })     → 语义最强，首选
2. getByLabelText('Username')                  → 表单字段
3. getByPlaceholderText('Enter host...')       → 无 label 的输入
4. getByText('Connection Settings')            → 静态文本
5. getByTestId('submit-btn')                   → 无语义时加 data-testid

❌ 禁止：querySelector('.submit-button')
```

---

## 六、文件总量汇总

### 6.1 新增文件清单（按阶段）

#### 阶段 A（前置基建）：5 个文件（2/5 ✅ Done）

| 文件 | 类型 | 状态 |
|------|------|------|
| `mocks/handlers/portal.handlers.ts` | MSW Handler | ✅ Done |
| `mocks/server.ts`（更新） | — | ✅ Done |
| `shared/src/lib/schedule/schedule-users.service.spec.ts` | Service 测试 | ⬜ Pending |
| `shared/src/lib/schedule/schedule-task-names.service.tl.spec.ts` | Service 测试 | ⬜ Pending |
| `shared/src/lib/schedule/time-zone.service.tl.spec.ts` | Service 测试 | ⬜ Pending |

#### 阶段 B（P0 核心）：约 20 个文件

Portal/Data（10 个）+ Portal/Schedule（10 个）

#### 阶段 C（P1 高价值）：约 25 个文件

Portal/Dashboard（2）+ Portal/Common Services（9）+ Portal/Composer 对话框（5）+ Portal/VSObjects（9）

#### 阶段 D（P2 渐进迁移）：约 30 个文件

Binding（6）+ Graph（6）+ Widget（8）+ VS-Wizard（2）+ VSView（1）+ 迁移存量（约 7）

#### 阶段 E（P3 补齐）：约 20 个文件

EM Common（4）+ EM Monitoring（3）+ EM Widget（2）+ EM Navbar/PageHeader（2）+ Canvas Smoke（约 9）

#### 总计：约 **100 个新文件**（含更新）

---

### 6.2 运行命令速查

```bash
# 当前目录：community/web

# 运行所有存量测试（CI 默认）
npm run test

# 仅运行 ATL 新栈（.tl.spec.ts）
npm run test:tl

# 单个文件（存量）
npx ng test portal --test-path-pattern "schedule-task-list" --no-ci

# 单个文件（ATL 新栈）
npx jest --config=jest.tl.config.js --testPathPattern "schedule-task-list.component.tl"

# 生成覆盖率基线
npx ng test portal --coverage --no-ci
npx jest --config=jest.tl.config.js --coverage

# Lint + 测试
npm run verify
```

---

## 七、风险提示与注意事项

### 7.1 画布类组件（不适合 ATL 深测）

以下组件依赖 jsPlumb、interact.js、Canvas API，在 Jest/JSDOM 环境中无法真实渲染，**只做 smoke 测试**（render 不报错 + 关键 ARIA 存在），主要覆盖交由 Playwright E2E：

- `ws-pane.component.ts`（1076行，jsPlumb）
- `layout-pane.component.ts`（981行，jsPlumb）
- `chart-area.component.ts`（1362行，Canvas）
- `ws-details-pane.component.ts`（812行）
- `chart-axis-area.component.ts`（644行）
- `physical-model-network-graph.component.ts`（868行，D3/Canvas）
- `query-network-graph-pane.component.ts`（928行，D3/Canvas）

### 7.2 STOMP 重组件

依赖 STOMP/WebSocket 的组件（vs-object-container、vs-calctable 等）需要 Mock StompClientService：

```typescript
providers: [
  { provide: StompClientService, useValue: { subscribe: jest.fn(), send: jest.fn() } }
]
```

### 7.3 NO_ERRORS_SCHEMA 过渡策略

- **过渡期**（阶段 A–B）：新增 .tl.spec.ts 允许保留 `NO_ERRORS_SCHEMA`，减少初期启动阻力。
- **成熟期**（阶段 C–D）：逐步替换为真实子组件或 `MockComponent()`，提升测试真实性。

### 7.4 存量 spec 不强制迁移

不要一次性重写所有 242 个存量 spec。策略：
1. **改动触发迁移**：修改某组件时，同步迁移其 spec。
2. **高价值优先**：`querySelector` 超过 5 处的 spec 是迁移首选。
3. **不改动不迁**：功能稳定的组件保留 legacy spec。

---

## 修订记录

| 日期 | 说明 |
|------|------|
| 2026-05-25 | 初版：基于 portal-unit-testing-analysis 和全项目扫描结果生成 |
| 2026-05-25 | 状态更新：阶段 A 基建完成（portal.handlers.ts 新增 50+ handlers，server.ts 注册）；标记已有 tl.spec.ts（data-datasource-browser、data-folder-browser、data-sources-tree-view、data-input-pane-* 2个、axis-label-pane）|
