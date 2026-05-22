# StyleBI Angular 测试策略 – Epic-70095 之后
## portal2026 与 composer2026 计划 – 2026 年 5 月

```
**框架：** Angular 15.2 + TypeScript 4.9.4 + RxJS 6.6.7  
**测试运行器：** 通过 `@angular-builders/jest` 使用 Jest 28 – 迁移到 Vitest 是第一步（见第 5 节）  
**Spec 位置：** 与源码同目录（`foo.component.ts` 与 `foo.component.tl.spec.ts` 并列）
```

## 三层测试架构 – portal2026 与 composer2026 计划

```
第 1 层 – Vitest 单元测试      迁移并扩展组件、服务、管道与指令的覆盖
第 2 层 – Playwright E2E       针对真实 StyleBI 实例的浏览器 + REST API 测试，由 Docker 隔离
第 3 层 – Stagehand AI 驱动    对结构 UI 变更具有韧性的语义化冒烟测试 [目前为零]
```

### 第 1 层 – 单元测试

基于 Vitest、与源码同目录的测试。portal2026 与 composer2026 的重设计决定哪些现在写、哪些延后 —— portal2026 仅改动 `TopHeader`，因此除它以外的 portal 测试现在写的都能保留。Composer 分为三类：内部不变的组件（现在写）、将被替换的外壳容器（延后）、以及 Stage 2 全新组件（随构建编写）。详见第 4 节。

### 第 2 层 – Playwright E2E

通过 Playwright 的浏览器测试，以及通过 Vitest 的 REST API 测试，均在 Testcontainers 提供的真实 StyleBI 实例上运行。当前覆盖集中在 EM 管理流程。Portal 查看器黄金路径，以及 spec 与代码缺口（有 Markdown 计划但无 TypeScript 实现）是下一优先级。Composer E2E 待外壳重构稳定后再做。基线与缺口详见第 4 节。

### 第 3 层 – Stagehand

基于语义的 AI 驱动冒烟测试，按用户意图而非 CSS 选择器操作 —— 在重设计过程中结构上仍具韧性。目前为零。必须在 composer2026 Stage 2 开始前搭建，以便在外壳变更时仍覆盖关键 Composer 工作流。

| | Vitest 单元 | Playwright E2E | Stagehand |
|---|---|---|---|
| 速度 | 毫秒级 | 秒级 | 10–30 秒/操作 |
| 成本 | 免费 | 免费 | 按 LLM 调用计费 |
| 确定性 | ✓ | ✓ | ~ 偶有波动 |
| 经受 UI 重构 | ✓ | ✗ | **✓ 可适应** |
| 测试业务逻辑 | ✓ | 部分 | ✗ |

---

## 2. 第 1 层覆盖



### 第 1 层单元测试覆盖审计

> **范围：** 本分析仅覆盖 **UI（Angular）测试** – 后端/Java 测试不在 portal2026 与 composer2026 范围内。三层中，第 1 层（单元）与第 2 层（E2E）已有测试。第 3 层（Stagehand）为零。第 2 层在 `e2e/` 中有 22 个 spec（9 个 Playwright 浏览器 + 13 个 Vitest REST API），具备基于 Testcontainers 的完整 Docker 隔离 —— 当前 E2E 基线与缺口见第 4 节。

Composer 不是独立的 Angular 项目 – 它位于 `web/projects/portal/src/app/composer/` 的 `portal` 项目内。`elements` 与 `viewer-element` 构建目标共享 portal 源码，不单独增加文件。下表各区域按组件、服务、管道、指令分别列出，便于按类型看到覆盖缺口，而非藏在单一合计中。

| 区域 | 类型 | 总数 | 已测 | 未测 | 覆盖率 | 2026 计划 |
|---|---|---|---|---|---|---|
| **Composer** | 组件 | 176 | 51 | 125 | 29% | 混合 – 见第 4 节 |
| `portal/app/composer/` | 服务 | 16 | 1 | 15 | 6% | 现在写 – 原样复用 |
| | 指令 | 25 | 0 | 25 | 0% | 延后 – 与将被替换的外壳绑定 |
| | **小计** | **217** | **52** | **165** | **24%** | |
| **Portal 面向用户** | 组件 | 143 | 9 | 134 | 6% | 现在写 |
| `portal/app/portal/` | 服务 | 25 | 0 | 25 | 0% | 现在写 |
| | 管道 | 3 | 0 | 3 | 0% | 现在写 |
| | **小计** | **171** | **9** | **162** | **5%** | |
| **Portal 共享** | 组件 | 435 | 160 | 275 | 37% | 现在写 |
| `portal/app/vsobjects/` | 服务 | 86 | 1 | 85 | 1% | 现在写 |
| `widget/` `binding/` 等 | 管道 | 11 | 1 | 10 | 9% | 现在写 |
| | 指令 | 43 | 3 | 40 | 7% | 现在写 |
| | **小计** | **575** | **165** | **410** | **29%** | |
| **EM** | 组件 | 266 | 97 | 169 | 36% | 不在 2026 重设计范围 |
| `em/` | 服务 | 39 | 12 | 27 | 31% | 不在 2026 重设计范围 |
| | 指令 | 4 | 2 | 2 | 50% | 不在 2026 重设计范围 |
| | **小计** | **309** | **111** | **198** | **36%** | |
| **共享库** | 组件 | 4 | 1 | 3 | 25% | 接近完成 |
| `shared/` | 服务 | 15 | 0 | 15 | 0% | 现在写 – portal 与 EM 共用 |
| | 指令 | 1 | 0 | 1 | 0% | 现在写 |
| | **小计** | **20** | **1** | **19** | **5%** | |
| **总计** | | **1,292** | **338 (26%)** | **954 (74%)** | | |

> **portal2026 范围说明：** 435 个 Portal 共享组件（`vsobjects/`、`widget/`、`binding/`、`vs-wizard/`、`graph/` 等）同时服务 Portal 查看器与 Composer。portal2026 仅改 CSS，契约不变 —— 现在写的测试全部保留。同目录下 86 个服务与 43 个指令同样稳定，应与组件一并现在编写。

### 按类型的 Spec 文件分布

现有 338 个 spec 文件按命名模式分布：

| Spec 类型 | 数量 | 说明 |
|---|---|---|
| `.component.spec.ts` | 161 | 明确以 component 命名的 spec |
| 未命名（对话框、动作、工具） | 157 | 缩写名的组件/对话框测试（如 `calendar-data-pane.spec.ts`），约 27 个 action-handler 类 spec，约 8 个 module spec |
| `.service.spec.ts` | 14 | 服务逻辑测试 |
| `.directive.spec.ts` | 5 | 指令行为测试 |
| `.pipe.spec.ts` | 1 | 管道转换测试 |
| **合计** | **338** | |

### Portal 子目录明细

Spec 数量包含该文件夹内所有类型（组件 + 服务 + 管道 + 指令），不能直接与组件数相减。按类型覆盖率见上文第 2 节表格。

| 子目录 | 组件数 | Spec 总数 |
|---|---|---|
| `composer/` | 176 | 52 |
| `widget/` | 162 | 44 |
| `portal/` | 143 | 9 |
| `vsobjects/` | 121 | 74 |
| `binding/` | 92 | 27 |
| `vs-wizard/` | 21 | 6 |
| `graph/` | 20 | 8 |
| `viewer/` + `vsview/` | 8 | 2 |
| `format/` | 5 | 3 |
| `common/` | 2 | 1 |
| `embed/` | 2 | 0 |
| `reload/` + `status-bar/` | 2 | 0 |

### EM 子目录明细

Spec 数量包含该文件夹内所有类型（组件 + 服务 + 指令）。按类型覆盖率见上文第 2 节表格。

| 子目录 | 组件数 | Spec 总数 |
|---|---|---|
| `settings/`（schedule、content、security、presentation、general、logging） | 203 | 73 |
| `monitoring/` | 19 | 13 |
| `common/util/` | 15 | 14 |
| `auditing/` | 14 | 0 |
| `search/` | 2 | 4 |
| `password/` | 2 | 1 |
| `navbar/` | 2 | 0 |
| `widget/` | 6 | 0 |
| `manage-favorites/` 及其他 | 3 | 6 |

### 测试命名约定（本 Epic 确立）

| 模式 | 使用场景 | 示例 |
|---|---|---|
| `feature.component.tl.spec.ts` | 使用 ATL + Material stub 的组件/模板测试 | `schedule-task-editor-page.component.tl.spec.ts` |
| `feature.service.spec.ts` | 纯服务/工具逻辑测试 | `schedule-task-editor-data.service.spec.ts` |
| `feature.service.logic.spec.ts` | 复杂服务的纯逻辑切片 | `security-provider.service.logic.spec.ts` |
| `feature.service.scene.spec.ts` | 复杂服务的集成/场景切片 | `security-provider.service.scene.spec.ts` |

### 共享测试基础设施（本 Epic 确立）

**`MaterialTestingModule`** – 为 EM 组件测试集中再导出 Material 模块。每个新的 EM `.tl.spec.ts` 应使用它，而非手动罗列 Material 导入。

**`audit-test-utils.ts`**
- `MatSelectStub` – 用于表单 select 测试的 `ControlValueAccessor` stub，无需 Material 开销
- `makeErrorServiceMock()` – `ErrorHandlerService` mock 工厂；任何注入它的测试都应使用

**`ScheduleTaskEditorDataService` 抽取模式** – 将 HTTP 逻辑从组件抽到专用服务。应遵循的范本：service spec 负责 HTTP 逻辑，`.tl.spec.ts` 负责组件模板行为。任何使用 `setTimeout` 的新组件应使用 `TimerService` 抽象。

---

## 3. 按类型的测试方法

服务、管道与指令各有不同的测试契约。三者的覆盖率见第 2 节表格。

**服务（共 182，覆盖率 8%）：** 可注入类，承载业务逻辑、HTTP 调用与共享状态。通过 `TestBed` 注入、mock 依赖、断言方法行为进行测试。现有 14 个 service spec 集中在 EM；Portal 仅 2 个，Shared 为零。优先级：portal 服务优先（影响面最大 —— `portal/` 25 个，共享子目录 86 个），其次 shared 服务（15 个，portal 与 EM 共用）。

**管道（共 14，覆盖率 7%）：** 纯转换函数。纯管道无需 `TestBed` —— 实例化类并调用 `transform()`。仅存在 `condition.pipe.spec.ts`；`truncate`、`tree-search`、`replace-all` 及所有 VPM clause 管道均未测。是整个代码库中最易快速补齐的一类。

**指令（共 73，覆盖率 7%）：** 基于属性的 DOM 行为。用最小宿主组件隔离断言 DOM 效果。仅 5 个 directive spec；广泛使用的 `tooltip`、`defaultFocus`、`inputTrim`、`fixedDropdown`、`resizableTable` 等均无测试。

### 测试模式

**管道（无需 TestBed）：**
```ts
it('truncates long strings', () => {
  expect(new TruncatePipe().transform('hello world', 5)).toBe('hello…');
});
```

**指令（最小宿主）：**
```ts
@Component({ template: '<input [defaultFocus]>' })
class TestHostComponent {}

it('focuses the element on init', () => {
  const fixture = TestBed.createComponent(TestHostComponent);
  fixture.detectChanges();
  expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input'));
});
```

**服务：**
```ts
it('returns empty list when no results', () => {
  const http = TestBed.inject(HttpTestingController);
  service.search('').subscribe(r => expect(r).toEqual([]));
  http.expectOne('/api/search').flush([]);
});
```

---

## 4. 现在写 vs. 延后 – portal2026 与 composer2026

### portal2026 范围（来自设计交接）

portal2026 是 **单组件变更**：仅修改 `TopHeader`（高度 56→44px、按钮/图标尺寸、间距、一处 aria-label 文案）。不触及其他 portal 组件。今天为 portal 组件、服务、管道、指令写的测试在 portal2026 后完整保留。

### composer2026 范围（来自设计交接 —— Option B + B1）

重设计将现有 Angular 组件映射为三个明确类别。「全部延后 composer」过于简化 —— 仅 **外壳容器** 被替换。

**类别 1 – 内部不变，仅重新挂到新外壳（现在写）**

这些组件保留全部现有行为；仅宿主插槽变化：

| 现有组件 | 新插槽 | 测试动作 |
|---|---|---|
| `AssetTreeComponent` | 左面板「Assets」标签 | **现在写** |
| `ComposerToolboxPaneComponent` | 左面板「Toolbox」标签 | **现在写** |
| `ComponentsPaneComponent` | 左面板「Components」标签（始终可见） | **现在写** |
| `vs-formats-pane` | 右面板「Format」标签 | **现在写** |
| `VSBindingPane` 内部 | 绑定编辑器浮层（图表路径，仅 chrome 变化） | **现在写** |
| 现有 `*-property-dialog` 组件 | 右面板 Bindings/Format 标签（Bucket A 对话框） | **现在写** |
| `<save-viewsheet-dialog>` | 保存模态（Bucket 3b） | **现在写** |
| `<import-csv-dialog>` | 侧滑 sheet（Bucket 2） | **现在写** |
| `sort-column-dialog` | 锚定弹出层（Bucket 3a） | **现在写** |
| 所有 `composer-binding-tree` 服务 | 新 `TableBindingsProps` shelf 复用 | **现在写** |

**类别 2 – 将被替换的外壳/容器组件（延后）**

仅结构布线变化 —— 不要为这些旧容器写测试：

| 现有组件 | 变化 | 测试动作 |
|---|---|---|
| `ComposerToolbarComponent` | 与文件标签条合并为新统一顶栏 | **延后** |
| `ComposerMainComponent` 布局 | 分屏布线改为 activity rail + 三面板脚手架 | **延后** |

**类别 3 – 全新组件（Stage 2 构建时编写）**

尚无现有代码可测；每个组件构建时同目录编写 spec：

| 新组件 | 描述 | 层级 |
|---|---|---|
| 顶栏 | 工具栏 + 文件标签合并；app-switcher ▾、⋯ 菜单、Save、Preview/Run、Ask AI | Tier 2 |
| Activity rail（左侧 44px） | 图标条映射 `SidebarTab` 枚举（Assets/Toolbox/Components/Inspector/Assistant） | Tier 1 |
| 左面板分栏容器 | 三标签脚手架路由到类别 1 面板 | Tier 2 |
| 右面板 Inspector 容器 | Bindings/Format/Script 标签路由；Format、Script 路由到类别 1 组件 | Tier 2 |
| `ChartBindingsSummary` | 只读数据源 + chip 摘要 +「Open chart editor」CTA（图表绑定右面板视图） | Tier 1 |
| `TableBindingsProps` | Table/Crosstab/Selection/Form 可编辑紧凑绑定 shelf；复用 `composer-binding-tree` 服务 | Tier 2 |
| `BindingsProps` | 其他控件类型的默认 fallback shelf | Tier 1 |
| 浮动选区工具栏 | 锚定在选中控件上方；图表主 CTA 为「Edit chart」 | Tier 2 |
| 空状态卡片 | 3 张入门卡（拖控件 / 连数据 / 模板）+ AI 提示占位 | Tier 1 |

### 第 2 层与第 3 层

| 区域 | 设计影响 | 测试动作 |
|---|---|---|
| 第 2 层 E2E – 补齐 SREE portal spec 与代码缺口 | 7 个 portal spec 仅有 Markdown 计划、无 TypeScript；基础设施就绪 | **现在写** – 使用现有 Testcontainers + Playwright |
| 第 2 层 E2E – portal2026 查看器黄金路径 | Portal 查看器尚无浏览器测试；单组件重设计不会破坏选择器 | **现在写** – 稳定黄金路径，基础设施已有 |
| 第 2 层 E2E – composer2026 黄金路径 | 外壳重构使选择器今天很脆弱 | **延后** – composer2026 外壳稳定后编写 |
| 第 3 层 Stagehand – Composer 重设计期间 | 语义意图经受结构变更 | **现在搭建** – 15–20 条关键工作流作为安全网 |

#### 第 2 层当前基线

**基础设施（`e2e/`）：** Playwright + Vitest + Testcontainers。每次测试通过 Docker Compose 启动隔离的 StyleBI 实例。11 种 Compose 变体覆盖各存储后端（MongoDB、PostgreSQL、S3、Azure Blob、GCS、Firestore、CosmosDB、DynamoDB）。由企业 OpenAPI 规范生成的 TypeScript REST 客户端驱动全部 API 测试。

**浏览器 spec（已实现 9 个）：**

| Spec | 区域 | 状态 |
|---|---|---|
| `em/navigation.spec.ts` | EM 登录、顶层导航、设置区 | ✅ 已实现 |
| `em/content/dashboard/dashboard-security.spec.ts` | 仪表板基于权限的可见性 | ✅ 已实现 |
| `em/content/dashboard/dashboard-security-disabled.spec.ts` | 关闭安全时的仪表板 | ✅ 已实现 |
| `em/content/repository/import-export.spec.ts` | 仓库导入/导出流程 | ✅ 已实现 |
| `em/logging/logging.spec.ts` | 日志配置 | ✅ 已实现 |
| `em/monitoring/cache/cache.spec.ts` | 缓存管理 | ✅ 已实现 |
| `em/schedule/tasks/tasks.spec.ts` | 计划任务管理 | ✅ 已实现 |
| `em/security/users/users.spec.ts` | 用户管理 | ✅ 已实现 |
| `sree/portal/repository-change-tree.spec.ts` | Portal 仓库资产变更跟踪 | ✅ 已实现 |

**REST API spec（已实现 13 个）：** auth、configuration、data sources、files、logical models、materialized views、physical models、schedule、security、server、tree、viewsheets、worksheets —— 覆盖公共 REST API 的完整 CRUD。

#### 第 2 层缺口

**Spec 与代码缺口（7 个 portal spec）：** 已有 Markdown 计划，尚未生成 TypeScript 测试：

| Spec | 区域 |
|---|---|
| `sree/portal/repository-tree.md` | 树导航交互 |
| `sree/portal/repository-favorites.md` | 收藏夹增删打开 |
| `sree/portal/repository-folder.md` | 文件夹创建/重命名/删除 |
| `sree/portal/repository-search.md` | 搜索与筛选 |
| `sree/portal/repository-history.md` | 资产历史视图 |
| `sree/portal/repository-move.md` | 拖放移动资产 |
| `sree/portal/repository-open-new-tab.md` | 新浏览器标签打开资产 |

**Portal 查看器黄金路径（尚未编写）：** 现有 9 个浏览器 spec 均覆盖 EM 管理流程。Portal 查看器尚无浏览器测试：

| 工作流 | 导航成功 | UI 成功 | 网络成功 |
|---|---|---|---|
| 登录 → Portal 首页 | `/portal` | 仪表板列表可见 | `200 OK` |
| 打开 viewsheet | `/portal/tab/dashboard/vs` | Viewsheet 画布渲染 | `200 OK` |
| 运行报表 | 停留在 viewsheet | 报表输出可见 | `200 OK` |
| 导出数据 | 模态 → 文件下载 | 「Download started」信号 | `200 OK` |
| 新建 viewsheet | `/composer` | 空白画布可见 | `200 OK` |

**CI 缺口：** E2E 未接入 Jenkins 流水线（`Jenkinsfile`）—— 仅本地运行（见第 9 节）。

#### 第 3 层 Stagehand – 推荐的 Composer 工作流

在 composer2026 Stage 2 开始前搭建。Stagehand 按语义意图操作（如 `"open chart binding editor"`）而非 CSS 选择器，因此在重构中仍有效：

| 工作流 | 为何用 Stagehand |
|---|---|
| 打开 viewsheet、添加图表控件、配置绑定 | Composer 核心路径；结构将变 |
| 添加表控件、内联 shelf 设数据绑定 | 绑定子界面正在重设计 |
| 保存/加载 viewsheet 往返 | 跨组件状态 – 选择器脆弱 |
| 打开属性对话框 – 改格式 | 对话框模型正被 Inspector 面板取代 |
| Format 标签：应用颜色、字体、边框 | Format Inspector 在 v3 为全新 |
| Script 标签：输入表达式、应用 | Script 标签上下文在变 |

---

## 5. Vitest 迁移

约 338 个现有 Jest spec 必须在 Portal 与 Composer 测试扩展开始前迁移到 Vitest。在 Jest 上写数百个新 spec 再迁移会加倍工作量。

**迁移是机械性的 – 全量约 1–2 天：**

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `@types/jest` | `@vitest/globals` 类型 |
| `@angular-builders/jest` | vitest 配置 + npm script |
| `jest-canvas-mock` | `vitest-canvas-mock` |

测试逻辑、断言、TestBed 配置与 mock 结构 **不变**。

### 难迁移案例审计

对全部约 338 个 spec 的实际审计：

| 模式 | 影响文件 | 迁移工作量 |
|---|---|---|
| `jest.resetModules` / `jest.isolateModules` / `jest.genMockFromModule` | **0** | 无 – 这些难点不存在 |
| `jest.mock()` 工厂 | **2** | 直接改名为 `vi.mock()` – API 相同，每文件 1–2 行 |
| Canvas mock | **11** | 全局包替换（`jest-canvas-mock` → `vitest-canvas-mock`）– 无需改每个 spec |
| `toMatchSnapshot` / `toMatchInlineSnapshot` | **28** | Vitest 有快照 API – `.snap` 需一次再生成（`vitest --update-snapshots`） |
| 其余 | **~297** | 纯 `jest.` → `vi.` 查找替换，无结构变化 |

28 个快照文件是唯一麻烦点。全部集中在 `vsobjects/action/`（动作菜单测试）加 `format/` 中 1 个。迁移后一条 CLI 即可修复 – 无需逐文件手改。

**步骤：**
1. 添加 `vitest.config.ts` + `vitest-setup.ts`（canvas mock、全局 stub）
2. 更新 `angular.json` – 用 vitest npm scripts 替换 `@angular-builders/jest`
3. 在 `tsconfig.spec.json` 中将 `@types/jest` 换为 `@vitest/globals`
4. 对所有 spec 正则替换 `jest.` → `vi.`
5. 将 `jest-canvas-mock` 换为 `vitest-canvas-mock`
6. 运行 `vitest --update-snapshots` 再生成 `vsobjects/action/` 与 `format/` 中 28 个快照

### 迁移后增强

现有约 338 个 spec 偏重服务与工具测试 – 证明服务可用，但组件模板行为几乎未覆盖。机械迁移完成后，按优先级需五类增强：

**1. 增加组件模板测试（影响最大）**
每个保留的 service spec 都应有消费它的组件的配套 `.tl.spec.ts`。这是最大缺口 – 服务正确性已证，但渲染输出、用户交互与条件 UI 未测。使用 `.tl.spec.ts` 命名与组合编写方法（见第 7 节）。

**2. 将 CSS 选择器查询改为语义化 ATL 查询**
现有组件测试使用 `fixture.debugElement.query(By.css('.some-class'))`。CSS 重构时即使行为不变也会失败。升级为 Angular Testing Library 的 `screen.getByRole()` / `screen.getByLabel()`，使测试经受 portal2026 与 composer2026 视觉变更。

**3. 将快照测试改为显式断言**
28 个 `vsobjects/action/` 快照测试可再生成，但快照不透明 – diff 只说明有变化，不说明是否正确。改为显式断言，如「有编辑权限时工具栏恰好包含这 5 个动作」。集中在一个文件夹，是一次性有界工作。

**4. 在 EM spec 中采用 `MaterialTestingModule`**
若干 EM spec 在每个 `TestBed` 中手动罗列 Material 模块。改用 epic-70095 引入的 `MaterialTestingModule` – 每文件更少样板，Material 版本变更只需改一处。

**5. 统一异步模式**
旧 spec 混用 `fakeAsync/tick`、`async/await` 与 `fixture.whenStable()`。Vitest + ATL 倾向 Testing Library 的 `waitFor()`。编写新测试时逐步统一 – 无需专门一轮全量改造。

---

## 6. 组件复杂度分级

分级适用于 portal2026「现在写」目标：`portal/` 面向用户子目录（143 组件）与 Portal 共享子目录（435 组件，合计 578）。Composer 组件（176）延后 – composer2026 组件构建时再重新分级。

### Tier 1 – 简单（约 197 个 portal2026 组件，约 34%）

**标准：** ≤5 个注入服务，≤6 个 @Input/@Output，无 @ViewChild DOM 操作，无 canvas/Renderer2  
**Portal 示例：** `AliasPane`、`MultiSelect`、`StaticColorEditor`、`ColumnOptionDialog`、`TabListPane`、`TrapAlert`、`TableFormatOption`  
**组合方法自动生成质量：约 95%**

---

### Tier 2 – 中等（约 289 个 portal2026 组件，约 50%）

**标准：** 6–12 个注入服务，或 7–15 个 @Input/@Output，或 @ViewChild + 表单绑定 + 异步模式  
**Portal 示例：** `AdvancedConditionPane`、`IdentityTreeComponent`、`ComponentsPane`、`ResourcePermissionComponent`、`VSLine`  
**组合方法自动生成质量：约 80%**

---

### Tier 3 – 复杂（约 92 个 portal2026 组件，约 16%）

**标准：** 12+ 注入服务，或继承 `AbstractVSObject` 等重型基类，或 canvas/Renderer2/直接 DOM 操作，或 OnPush + 大量 ViewChildren + 复杂异步  
**Portal 示例：** `VSChart`（18 服务）、`VSTable`（OnPush + 滚动 + Renderer2）、`DatabaseQueryComponent`、`ScriptEditPaneComponent`  
**组合方法自动生成质量：约 65%** – 需先切片

**Tier 3 切片方法：** 生成前先拆成聚焦的测试族
- 模式/分支切换
- 校验行为
- 列表与选中状态
- 异步/订阅行为
- 发出的事件与保存 payload 形状

---

### 全新 composer2026 组件（类别 3 —— Stage 2 新建时编写）

新组件最适合 **从第一天就独立编写**（兼容 Angular 17+），TestBed 更轻，测试自然为 Angular 升级做好准备。

> 直接映射自 composer2026 设计交接（`design_handoff_composer/`）。规范原型为 `composer.html`；像素、布局与交互见 `specs/composer-design-spec.md`。

| 新组件 | 设计角色 | 层级 | 关键测试重点 |
|---|---|---|---|
| 顶栏 | 合并 `ComposerToolbarComponent` + 文件标签条；app-switcher ▾、⋯ 菜单、Save、Preview/Run 上下文切换、Ask AI  pill | Tier 2 | 按标签类型的 Preview/Run 切换；4 维边界顶栏矩阵（hasEMAccess × isSaaS × isDesigner × securityEnabled） |
| Activity rail（左 44px） | 图标条映射 `SidebarTab`；切换 Assets/Toolbox/Components/Inspector/Assistant | Tier 1 | 面板切换状态；激活图标色；SidebarTab 枚举映射 |
| 左面板分栏容器 | 三标签脚手架路由到 `AssetTreeComponent`、`ComposerToolboxPaneComponent`、`ComponentsPaneComponent` | Tier 2 | 标签切换路由正确面板；flush split-pane 调整大小 |
| 右面板 Inspector 容器 | Bindings/Format/Script 标签路由；Format→`vs-formats-pane`，Script→脚本编辑器 | Tier 2 | 标签路由；Bindings 子路由按控件类型委派 |
| `ChartBindingsSummary` | 只读源 + 类型化 chip 摘要（X/Y/Color/Detail/Filters）+「Open chart editor」CTA | Tier 1 | CTA 发出 open 事件；摘要反映绑定字段 |
| `TableBindingsProps` | Table/Crosstab/Selection/Form 可编辑紧凑 shelf；复用 `composer-binding-tree` 服务 | Tier 2 | 列 shelf 增删；筛选行；正确复用服务 |
| `BindingsProps` | 未识别控件类型的默认 fallback shelf | Tier 1 | 任意控件类型无错渲染 |
| 浮动选区工具栏 | 锚定在选中控件上；图表主 CTA「Edit chart」，表为同级动词布局 | Tier 2 | 各控件类型正确 CTA；打开绑定编辑器浮层 |
| 空状态卡片 | 3 张入门卡 + AI 提示占位；无打开标签时显示 | Tier 1 | 画布空时显示卡片；有标签时隐藏 |
| 绑定编辑器浮层 | 约 78% 宽滑入面板 + 遮罩；返回 chip + Cancel/Done；包裹现有 `VSBindingPane` | Tier 2 | 开闭动画；点击遮罩关闭；Done 保存 |

---

## 7. 单元测试编写方法论

> **范围：仅第 1 层单元测试。** 本节为 [Unit_test_roadmap.md](Unit_test_roadmap.md) 的摘要，完整 playbook、输出模式与防蔓延规则见该文。第 2 层 E2E 用例编写见 [E2E_test_roadmap.md](E2E_test_roadmap.md)。服务/管道/指令模式见第 3 节。

### 组合方法：Playwright MCP + 源码阅读

单独使用任一工具都不足以编写单元/组件测试，二者互补：

| 所需 | 源码阅读 | Playwright MCP | **组合** |
|---|---|---|---|
| TestBed provider/mock 设置 | ✓ 读 DI 树 | ✗ | ✓ |
| 准确 ATL 选择器 | ~ 推断 | ✓ 实时 DOM | ✓ |
| 交互 → 状态变化 | ~ 推断 | ✓ 实时观察 | ✓ |
| 业务逻辑断言 | ✓ 读类 | ✗ | ✓ |
| 边界/状态触发 | ~ 静态 | ✓ 实时导航 | ✓ |
| 异步/订阅行为 | ✓ 读 Observable | ✗ | ✓ |
| 实际渲染输出 | ~ 猜测 | ✓ 截图 | ✓ |

### 组合方法下各层级 AI 自动化用例质量

| 层级 | 仅源码 | 仅 Playwright | **组合** |
|---|---|---|---|
| Tier 1（~197） | ~90% | ~70% | **~95%** |
| Tier 2（~289） | ~60% | ~50% | **~80%** |
| Tier 3（~92） | ~35% | ~40% | **~65%** |
| **整体** | **~55%** | **~50%** | **~80%** |

### Tier 3 切片约定（本 Epic）

Tier 3 复杂服务与组件遵循 `SecurityProviderService` 引入的 `.logic.spec.ts` / `.scene.spec.ts` 模式：

- **`.logic.spec.ts`** – 纯方法级行为，无 HTTP、无模板
- **`.scene.spec.ts`** – 服务交互、异步流、状态转换
- **`.tl.spec.ts`** – 使用 ATL 查询的组件模板行为

---

## 8. 工作量估算

### 阶段 1 – Vitest 迁移（约 1–2 天）
- 将全部约 338 个 Jest spec 迁移到 Vitest
- 扩展开始前验证工具链

### 阶段 2 – 第 3 层 Stagehand 搭建（约 1 周）
- 针对运行中的 StyleBI 实例搭建 Stagehand
- 编写 15–20 条 Composer 语义工作流测试
- Stage 2 重设计触及组件树前安全网就位

### 阶段 3 – portal2026 第 1 层扩展（约 3–4 周）
- Vitest 迁移后，`portal/` 与共享子目录中约 404 个未测 portal2026 组件

| 层级 | 数量 | 方法 | 估算 |
|---|---|---|---|
| portal2026 Tier 1（简单，578 的 ~34%） | 合计 ~197 / 未测 ~130 | 组合（95% 自动） | ~1 周 |
| portal2026 Tier 2（中等，578 的 ~50%） | 合计 ~289 / 未测 ~210 | 组合（80% 自动） | ~2 周 |
| portal2026 Tier 3（复杂，578 的 ~16%） | 合计 ~92 / 未测 ~64 | 切片 | ~1 周 |
| Composer 服务 | ~30 | 源码阅读 | ~3 天 |
| **portal2026 未测合计** | **~404** | | **~3–4 周** |

### 阶段 4 – 第 2 层 E2E 缺口补齐（约 1–2 周）
基础设施（Playwright、Testcontainers、Docker Compose、helpers）已就绪 —— 无搭建成本。

| 任务 | 工作量 |
|---|---|
| 实现 7 个 SREE portal spec 与代码缺口（使用 `generate-browser-tests.prompt.md` AI 流水线） | ~3–4 天 |
| 新增 5 条 portal 查看器黄金路径浏览器 spec（登录、打开 VS、跑报表、导出、新建 VS） | ~3–4 天 |
| 将 E2E 接入 Jenkins（`Jenkinsfile`）并上传 HTML 报告 | ~1 天 |
| **合计** | **~1–2 周** |

### 阶段 5 – composer2026：类别 1 现在写，类别 3 随构建编写

**类别 1（现在写，与阶段 3 并行约 2 周）：** 内部不变的现有 composer 组件 —— 测在外壳重构后仍有效的行为：
- `AssetTreeComponent`、`ComposerToolboxPaneComponent`、`ComponentsPaneComponent`
- `vs-formats-pane`、`VSBindingPane` 内部
- 所有 `*-property-dialog`（Bucket A）、`save-viewsheet-dialog`、`import-csv-dialog`、`sort-column-dialog`
- 所有 `composer-binding-tree` 服务（16 个服务，目前仅 1 个有 spec）

**类别 3（每个构建时同目录写 spec，合计约 1 周）：** Stage 2 全新组件 —— 创建组件时立即写 spec：
- 顶栏（Preview/Run 切换 + 4 维顶栏矩阵）
- Activity rail（SidebarTab 映射 + 面板切换）
- 左面板分栏容器、右面板 Inspector 标签路由
- `ChartBindingsSummary`、`TableBindingsProps`、`BindingsProps`、绑定编辑器浮层
- 浮动选区工具栏、空状态卡片

composer2026 外壳稳定后：
- composer2026 黄金路径的第 2 层 Playwright E2E（约 1 周）

---

## 9. CI 接入

**CI 系统：** Jenkins（仓库根目录 `Jenkinsfile`）。Maven 驱动完整构建；流水线阶段包括 Maven 构建、Docker 镜像（Jib）、Helm chart 打包。

### 现状 – 缺口

| 缺口 | 详情 |
|---|---|
| `.tl.spec.ts` 未进 CI | `ng test` 通过 `testPathIgnorePatterns` 排除 `.tl.spec.ts`；Maven 从不调用 `npm run test:tl` – 整个 epic-70095 组件测试套件仅手动运行 |
| `jest-junit` XML 未归档 | `jest-junit` 将 `junit.xml` 写到 `web/`，但 Jenkins 无 `archiveArtifacts` 或 `junit` 步骤 – 构建后文件被丢弃 |
| PR 中无测试结果可见性 | 失败仅显示构建失败 – Jenkins 中无逐测试明细 |
| 未配置输出路径 | `package.json` 中 `jest-junit` 无显式输出路径 – 依赖默认位置与环境变量 |
| **E2E 完全未进流水线** | `Jenkinsfile` 无 E2E 阶段 – 全部 22 个 E2E spec（`e2e/tests/`）仅本地运行 |

### 目标状态 – Vitest 迁移后

Vitest **内置 JUnit 报告器** – 无需外部包。输出路径直接在 `vitest.config.ts` 声明：

```ts
// vitest.config.ts
export default defineConfig({
  reporters: ['default', 'junit'],
  outputFile: {
    junit: './target/test-results/junit.xml'
  }
})
```

这可同时取代 `jest-junit` npm 依赖与基于环境变量的隐式路径。`target/test-results/` 与 Maven 标准输出约定一致。

### CI 接入步骤

**步骤 1 – 将 `.tl.spec.ts` 接入 Maven 构建**

更新 `web/pom.xml`，在 `test` 阶段运行两条命令：
```xml
<arguments>run verify:tl</arguments>
```
在 `package.json` scripts 增加 `verify:tl`：`"verify:tl": "ng lint && ng test && npm run test:tl"`

Vitest 迁移后合并为一条命令，因两种 spec 模式在同一 Vitest 套件中运行。

**步骤 2 – 在 `Jenkinsfile` 中归档单元测试结果**

Maven 构建步骤后增加 JUnit 归档：
```groovy
stage('Test') {
    steps {
        sh './mvnw --batch-mode clean install'
    }
    post {
        always {
            junit 'web/target/test-results/junit.xml'
        }
    }
}
```

`post { always { ... } }` 确保测试失败时仍发布结果 – 否则 Maven 在归档前因失败退出。

**步骤 3 – 在 `Jenkinsfile` 增加 E2E 阶段**

单元测试通过后增加 E2E 阶段。E2E 需要 Docker 与 license key：
```groovy
stage('E2E') {
    environment {
        INETSOFT_LICENSE_KEY = credentials('inetsoft-license-key')
    }
    steps {
        dir('e2e') {
            sh 'npm ci'
            sh 'npm run test:api'
            sh 'npm run test:browser'
        }
    }
    post {
        always {
            publishHTML target: [
                reportDir: 'e2e/playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright E2E Report'
            ]
            junit 'e2e/test-results/**/*.xml'
        }
    }
}
```

在 `playwright.config.ts` 配置 Playwright JUnit 输出：
```ts
reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
```

### 接入后的报告

| 获得内容 | 方式 |
|---|---|
| 逐测试通过/失败明细 | Jenkins JUnit 插件按构建展示 |
| 趋势可见性 | Jenkins 跨构建保存历史 |
| Playwright HTML 报告 | `publishHTML` 归档完整交互报告 |
| 无需翻日志即可分诊失败 | Jenkins 测试结果中可见失败测试名、文件与断言 |

---

## 10. 快速收益摘要

| 组别 | 数量 | 方法 | 时间 |
|---|---|---|---|
| Vitest 迁移（全部现有单元 spec） | ~338 | 机械查找替换 | 第 1–2 天 |
| Stagehand Composer 冒烟套件 | ~15–20 工作流 | 语义化编写 | 第 1 周 |
| portal2026 Tier 1 简单（未测） | ~130 | 组合（95% 自动） | 第 2–3 周 |
| portal2026 Tier 2 中等（未测） | ~210 | 组合（80% 自动） | 第 3–5 周 |
| portal2026 Tier 3 复杂（未测） | ~64 | 切片 | 第 5–6 周 |
| Composer 类别 1：内部不变组件 + 全部服务 | ~30 服务 + 类别 1 未测组件 | 源码阅读 + 组合 | 第 3–5 周 |
| E2E：实现 SREE portal spec 与代码缺口 | 7 spec | AI 流水线（`generate-browser-tests.prompt.md`） | 第 2–3 周 |
| E2E：portal 查看器黄金路径 | 5 工作流 | Playwright + 现有 helpers | 第 3–4 周 |
| E2E：接入 Jenkins | 1 个 `Jenkinsfile` 阶段 | Jenkins groovy + Playwright JUnit 报告器 | 第 4 周 |
| Composer 类别 3：全新组件（同目录） | 10 个新组件 | 每个构建时同目录编写 | Stage 2 期间 |
| composer2026 第 2 层 E2E（外壳稳定后） | ~10 工作流 | Playwright + POM | Stage 2 之后 |

---

## 11. 建议起步顺序

1. **Vitest 迁移**（1–2 天）– 在正确技术栈上解锁后续全部单元测试扩展
2. **E2E：实现 SREE portal spec 与代码缺口**（约 3–4 天）– 7 个 Markdown spec 用现有 AI 流水线变为真实 Playwright 测试；无需搭基础设施
3. **E2E：portal 查看器黄金路径**（约 3–4 天）– 5 条浏览器工作流，使用现有 Testcontainers + helper
4. **E2E：Jenkins 接入**（约 1 天）– 在 `Jenkinsfile` 增加 E2E 阶段；配置 Playwright JUnit 报告器
5. **Stagehand Composer 冒烟搭建**（约 1 周）– composer2026 Stage 2 触及外壳容器前必须有安全网
6. **试点：10 个 portal2026 Tier 1 组件** 使用组合方法 – 批量前验证单元测试工作流
7. **批量 portal2026 Tier 1 + Tier 2**（约 340 组件）– 重设计落地前广泛单元覆盖
8. **Composer 类别 1：内部不变组件 + 全部 composer 服务** – 与 portal2026 批量并行现在写；经受重构（`AssetTreeComponent`、`ComponentsPaneComponent`、`vs-formats-pane`、`VSBindingPane` 内部、所有 `*-property-dialog`、所有 `composer-binding-tree` 服务）
9. **Composer 类别 3：每个新组件构建时同目录写 spec** – 顶栏、activity rail、Inspector 容器、`ChartBindingsSummary`、`TableBindingsProps`、浮动工具栏、空状态
10. **composer2026 第 2 层 E2E** – composer2026 外壳稳定后
