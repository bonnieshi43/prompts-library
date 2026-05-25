# community/web/projects 前端单元测试覆盖分析

> 分析范围：`community/web/projects`（portal、em、shared）  
> 分析日期：2026-05-22  
> 相关文档：`claude/frontend-testing-strategy.md`、`.claude/skills/web-component-unitcase/`

---

## 目录

1. [现有 case 覆盖情况](#1-现有-case-覆盖情况)
2. [补充 component 单元测试的最佳实践](#2-补充-component-单元测试的最佳实践)
3. [运行命令速查](#3-运行命令速查)
4. [总结](#4-总结)

---

## 1. 现有 case 覆盖情况

### 1.1 工具栈与运行方式

| 层级 | 技术 | 说明 |
|------|------|------|
| 测试框架 | **Jest 29** + `jest-preset-angular` | 通过 `@angular-builders/jest:run` 接入 `ng test` |
| 传统写法 | **Angular TestBed** + `ComponentFixture` | 存量主力 |
| 新写法 | **@testing-library/angular@17** + `@testing-library/user-event` + **jest-dom** | 文件后缀 `*.tl.spec.ts` |
| HTTP Mock | **MSW v2**（`mocks/server.ts`）+ `jest-fixed-jsdom` | TL 测试推荐；存量大量仍用 `HttpClientTestingModule` |
| 辅助 | `TestUtils`（约 1700+ 行）、`jest-canvas-mock` | 集中构造 VS/Chart/WS 等 mock 模型 |
| 文档/流程 | `claude/frontend-testing-strategy.md`、`.claude/skills/web-component-unitcase/` | Risk-first、生成规范 |

**两套流水线（重要）：**

- **默认**：`npm run verify` → `ng test` → `angular.json` 中 `testPathIgnorePatterns` **排除** `\.tl\.spec\.ts$`
- **TL 专用**：`npm run test:tl` → `jest.tl.config.js`，只跑 `**/*.tl.spec.ts`

因此：**EM 上大量新测例不在默认 CI/verify 里**，需单独执行 `npm run test:tl`。

**未使用：**

- 行级 coverage 门槛（无 `collectCoverage` / `coverageThreshold`）
- Playwright / Cypress E2E
- Storybook 视觉回归（仅在策略文档中规划）

**配置文件要点：**

- `community/web/jest.config.js` — MSW、`jest-fixed-jsdom`、`moduleNameMapper`
- `community/web/setup-jest.ts` — jest-dom + MSW server 生命周期
- `community/web/jest.tl.config.js` — 仅匹配 `*.tl.spec.ts`

---

### 1.2 量化覆盖（按「是否有 spec 文件」，非行覆盖率）

| 项目 | `.component.ts` | `*.component.spec.ts` | `*.tl.spec.ts` | 全部 `*.spec.ts` |
|------|-----------------|------------------------|----------------|------------------|
| **portal** | 753 | 72 | 4 | 246（legacy 242 + TL 4） |
| **em** | 263 | 88 | 57 | 166（legacy 109 + TL 57） |
| **shared** | 4 | 0 | 0 | 15（多为 service/pipe/util） |

> 注：`*.spec.ts`  glob 会匹配 `*.tl.spec.ts`，统计时需单独排除 TL 后缀。

**粗算 component 文件配对率：**

- **Portal**：约 **10%** 组件有 dedicated component spec（TL 极少）
- **EM**：约 **一半以上** 有测试文件，且 **schedule / security / auditing** 正在批量迁到 TL

**Portal 按业务域（组件数 vs component-spec 数）：**

| 区域 | 组件数 | component spec | 全部 spec |
|------|--------|----------------|-----------|
| composer | 176 | 18 | 54 |
| vsobjects | 121 | 17 | 76（含约 27 个 `*-actions`） |
| widget | 162 | 19 | 54 |
| portal（应用壳） | 142 | 5 | 10 |
| binding | 92 | 6 | 27 |
| graph | 20 | 1 | 9 |
| format / vsview | 9 | 0 | 4 |
| vs-wizard | 21 | 6 | 6 |

**Portal 其他 spec 类型分布（legacy）：**

| 类型 | 数量（约） |
|------|-----------|
| `*-actions.spec.ts` | 27 |
| `*.service.spec.ts` | 8 |
| `*.pipe.spec.ts` | 7 |

**EM `*.tl.spec.ts` 集中区域（57 个）：**

- `auditing/*` — 13 个
- `settings/schedule/*` — 任务编辑、条件、action pane、import 等
- `settings/security/*` — 用户、SSO、provider、权限树等
- `authorization.service.tl.spec.ts`

**结论：** 测试文件总数约 **400+**，但与 **1000+ 组件** 相比，**文件级覆盖很薄**；portal 核心路径（composer、portal 壳、binding UI）明显偏少。

---

### 1.3 测试类型与质量画像

#### 做得较好的部分

1. **`vsobjects/action/*`**（约 27 个）：测菜单/上下文动作类逻辑，多用 `TestUtils` + **snapshot**，对 chart/table/selection 等回归有价值。
2. **binding / composer 部分 dialog pane**：有一定交互断言，但实现方式偏旧。
3. **新 TL 用例**（示例）：
   - `audit-user-session.component.tl.spec.ts`
   - `notification-emails.component.tl.spec.ts`
   - `data-sources-tree-view.component.tl.spec.ts`
   - 特征：文件头 **Risk-first 分组** + KEY contracts；**MSW** 管 HTTP；`render()` 辅助函数；测 **业务分支** 而非「能创建」。

#### 质量短板（存量主流）

| 问题 | 表现 | 影响 |
|------|------|------|
| **浅渲染** | 大量 `NO_ERRORS_SCHEMA` | 子组件/模板投影不渲染，测不到真实 DOM 与对话框按钮 |
| **实现细节耦合** | `fixture.nativeElement.querySelector('.submit-button')` 等（portal 中 **90+** 文件仍用 `querySelector`） | 改 class/结构即红，维护成本高 |
| **HTTP 假阳性** | `HttpClientTestingModule` + `expectOne/flush` | 测不到网络错误、延迟、竞态；与真实 `HttpClient` 路径不一致 |
| **低断言密度** | 典型：`should create` + `expect(component).toBeTruthy()` | 数字好看，缺陷发现能力弱 |
| **快照滥用** | action/format 等 `toMatchSnapshot` | 对 intentional UI 变更是负担；对纯数据结构尚可 |
| **双份维护** | 同组件既有 `*.spec.ts` 又有 `*.tl.spec.ts`（EM audit/schedule） | legacy 仍被 `ng test` 执行，TL 需另跑 |
| **已知缺陷未修** | `data-sources-tree-view` 用 `it.failing` 记录 bug | TL 有价值，但默认流水线未跑 TL 时 bug 仍可能漏网 |

#### 示例对比

| 维度 | 旧（`vs-submit.spec.ts`） | 新（`data-sources-tree-view.component.tl.spec.ts`） |
|------|---------------------------|-----------------------------------------------------|
| 定位元素 | `querySelector('button.submit-button')` | `getByRole` / 业务逻辑直接测方法 |
| HTTP | `HttpClientTestingModule` | MSW + `HttpClientModule` |
| Schema | `NO_ERRORS_SCHEMA` | 有针对性 stub + 部分 `NO_ERRORS_SCHEMA` |
| 文档 | 无 | Risk 分组 + KEY contracts + `it.failing` |

---

### 1.4 主要漏洞 / 风险缺口

按 **用户影响** 排序：

1. **Composer / Worksheet 画布**：176 个组件仅 ~18 个 component spec；拖拽、jsPlumb、依赖线、保存流程几乎无行为级单测。
2. **Portal 数据导航 / 权限门控**：仅 1 个 TL spec（`data-sources-tree-view`），且已记录生产级逻辑 bug；同类树、repository、数据源 CRUD 缺口大。
3. **VS 运行时对象**：chart/table/crosstab/selection 组件 spec 稀疏；复杂交互依赖 action 快照，**不等价于组件行为测试**。
4. **STOMP / WebSocket**：`shared/stomp` 有少量单测，portal 实时刷新路径基本无单测。
5. **错误与 loading**：旧测例普遍不测 HTTP 失败后 UI（MSW 新范式才补）。
6. **CI 缺口**：`verify` 不跑 TL；无 coverage gate；**无 E2E** 兜底关键路径。
7. **shared 组件**：4 个组件、0 个 component spec。

---

## 2. 补充 component 单元测试的最佳实践

**原则：不追行覆盖率，追「用户可感知行为 + 生产风险」**；与 `claude/frontend-testing-strategy.md` 和 skill 提示词对齐。

### 2.1 推荐工作流（每个组件）

```
读组件 + 依赖
    → Risk 分析（Risk 2/3 分组）
    → 设计 3–8 条 case（每分组有上限）
    → 写 *.tl.spec.ts（ATL + MSW）
    → npm run test:tl
    → 通过后可弱化/删除 legacy spec
```

**步骤要点：**

1. **先分析再写**（`.claude/skills/web-component-unitcase/component-Front and ui-generation-prompt.md`）
   - 问：「用户做了什么，界面应怎样？」
   - 方法分类：Scenario（HTTP/对话框/路由）vs Pure logic vs Skip
   - **Risk 3**（静默失败、错误分支、权限）必测；**Risk 1**（参数变体重复）跳过

2. **新文件命名：`*.tl.spec.ts`**，与 legacy 并存，避免一次大迁移。

3. **技术模板（新 code 统一）：**
   - `render()` / `renderDialog(props)` 抽公共配置
   - `screen.getByRole` / `getByLabelText` / `getByPlaceholderText`
   - 本项目 i18n 在单测中为字面量：`_#(OK)`、`_#(Folder Name)`
   - `HttpClientModule` 或 `provideHttpClient()`，**不用** `HttpClientTestingModule`
   - 默认 handler 在 `mocks/handlers/`，异常用 `server.use(...)` per test
   - 对话框必须声明 `StandardDialogComponent` 等，否则 `wDialogButtons` 不渲染
   - 复杂子组件用 **CVA stub**（参考 `notification-emails.component.tl.spec.ts` 的 `EmailPickerStub`）

4. **断言对象：** 按钮 disabled、错误文案、`emit` 结果、路由 `navigate` spy——避免只断言 `component.loading === true`。

5. **已知 bug：**

   ```typescript
   import { it as jestIt } from "@jest/globals";
   jestIt.failing("...", () => { ... });
   ```

6. **文件头注释（推荐）：** Risk 分组 + KEY contracts + Design gaps（不测但需记录）。

---

### 2.2 优先级（投入产出比最高）

| 优先级 | Portal | EM |
|--------|--------|-----|
| **P0** | `portal/data/*` 树与权限、`binding/editor/` HTTP 密集、`widget/repository-tree/` | 继续 `settings/schedule/`、`settings/security/`（TL 已铺开） |
| **P1** | `composer/dialog/`、`vsobjects/objects/submit\|table\|selection/` | `settings/content/repository/` |
| **P2** | `format/`、`vs-wizard/` | `monitoring/`（多为展示，Risk 较低） |

**Portal 特别建议：** 从已有 TL 范例扩展——`data-sources-tree-view`、`axis-label-pane`，再迁 `vs-submit`（`frontend-testing-strategy.md` 有对照示例）。

**EM 特别建议：** schedule/security 的 TL 已成熟；下一步将 **`npm run test:tl` 纳入 CI**（或与 `verify` 合并），否则 57 个 TL 文件与默认流水线隔离。

---

### 2.3 不建议的做法

- 为每个组件补 `should create` 凑数量
- 继续用 `querySelector('.btn-primary')` 写新测例
- 全库一次性替换 TestBed → ATL（应 **按目录渐进**）
- 对 composer 拖拽、图表 tile 渲染强行走 Jest（策略里更高层用 Playwright Component / 视觉回归）
- 同一行为在 legacy + TL 各写一套长期双维护（迁移后应删除或缩减 legacy）

---

### 2.4 单组件「高质量」检查清单

- [ ] 改 CSS class 名，测试仍应通过（除非用户可见样式契约）
- [ ] 至少 1 条 **Risk 3**（错误/权限/边界）
- [ ] HTTP 用 MSW，含 1 条失败或异常响应（如 403 / ERROR body）
- [ ] 异步用 `waitFor` / `findBy*`
- [ ] `ng test` 或 `test:tl` 本地通过；MSW `onUnhandledRequest: 'error'` 无漏网请求（必要时在 handler 补 `*/api/assistant/*` 等）
- [ ] 用例总数可控（通常 **单文件 5–15 条**，避免单文件上千行）

---

### 2.5 三层测试职责划分（来自策略文档）

```
┌─────────────────────────────────────────────────────┐
│  ATL + MSW（本阶段重点）                              │
│  测：用户交互 → 可见状态变化 → 跨网络边界的流程       │
├─────────────────────────────────────────────────────┤
│  纯 Jest 单测（保留原有）                             │
│  测：纯计算函数、工具方法、复杂条件分支               │
├─────────────────────────────────────────────────────┤
│  不测（或静态分析覆盖）                               │
│  TypeScript 类型约束、枚举穷举、内部状态流转         │
└─────────────────────────────────────────────────────┘
```

### 2.6 ATL 查询选择决策树

```
元素有 ARIA role（button/input/dialog）？
  → 是：getByRole('button', { name: '...' })    ← 最优先

  → 否：有 <label> 关联？
       → 是：getByLabelText('...')

       → 否：有 placeholder？
            → 是：getByPlaceholderText('...')
                  （Bootstrap floating label 常用此方式）

            → 否：有可见文字？
                 → 是：getByText('...')

                 → 否：加 data-testid，用 getByTestId
```

---

## 3. 运行命令速查

```bash
cd community/web

# 默认流水线（不含 TL）
npm run test
npm run test:em
npm run verify          # lint + ng test（不含 TL）

# 新风格测例
npm run test:tl
npx ng test portal --test-path-pattern "data-sources-tree-view.tl" --no-ci

# 单文件
npx jest path/to/file.tl.spec.ts --config=jest.tl.config.js
```

---

## 4. 总结

| 维度 | 现状 |
|------|------|
| **工具** | Jest 为主；ATL + MSW 已落地但 **portal 极少、em 大量 TL** |
| **覆盖** | 文件级：portal 组件 ~10%，em ~一半+；**无行覆盖率门禁** |
| **质量** | 存量偏浅、脆；新 TL 质量明显更高且带 Risk 文档 |
| **漏洞** | Composer/Portal 壳/STOMP/错误态/E2E/CI 未跑 TL 是最大空洞 |

**最好效果的补充方式：** 按模块用 Risk-first 新增 `*.tl.spec.ts`（ATL + MSW + render helper），优先 portal 数据树、binding HTTP、repository 对话框；EM 侧巩固 schedule/security 并把 `test:tl` 并进 CI；legacy 测例在迁移后逐步退役，而不是继续堆 `querySelector` + `should create`。

---

## 附录：关键文件路径

| 路径 | 用途 |
|------|------|
| `community/web/angular.json` | portal/em test 配置、`testPathIgnorePatterns` |
| `community/web/jest.config.js` | MSW、testEnvironment |
| `community/web/jest.tl.config.js` | 仅 TL spec |
| `community/web/setup-jest.ts` | jest-preset-angular + jest-dom + MSW |
| `community/web/mocks/server.ts` | MSW handlers 聚合 |
| `community/web/projects/portal/src/app/common/test/test-utils.ts` | Mock 工厂 |
| `claude/frontend-testing-strategy.md` | 迁移策略与踩坑 |
| `.claude/skills/web-component-unitcase/` | 生成用例的 prompt 与技巧 |
