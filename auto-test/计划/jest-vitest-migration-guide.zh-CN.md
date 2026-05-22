# StyleBI 前端：Jest 现状、Vitest 迁移与工具链对比

> **适用范围：** `community/web` 第 1 层 Angular 单元/组件测试（Portal、EM、Shared）。  
> **关联文档：** [Epic-70095-test-migration-audit.zh-CN.md](./Epic-70095-test-migration-audit.zh-CN.md)（覆盖率、工作量、CI 接入）。  
> **源码参考：** `stylebi-session/community/web`（`package.json`、`angular.json`、`jest.tl.config.js`）。

---

## 1. 三个概念不要混用

| 概念 | 是什么 | 是否等于「Vitest 迁移」 |
|------|--------|------------------------|
| **Jest → Vitest** | 更换**测试运行器**与 mock API（`jest.*` → `vi.*`） | ✅ 是 |
| **`*.tl.spec.ts`** | Epic-70095 的**测试写法/命名**（ATL + MSW，偏组件模板与场景） | ❌ 否 |
| **Legacy `*.spec.ts`** | 历史用例（TestBed + `By.css` 等经典 Angular 测法） | ❌ 否（迁移时**保留文件名**，只改 runner） |

**常见误解：** 把约 338 个 `.spec.ts` 批量改名为 `.tl.spec.ts`。  
**正确理解：** Vitest 迁移是**工具链替换**；`.tl.spec.ts` 是迁移完成后**增量新增**的高质量组件测试，与 legacy spec **可并存**。

---

## 2. 当前 Jest 工具链现状（迁移前）

### 2.1 架构示意

```
community/web/
├── package.json
│   ├── "test": "ng test"              → @angular-builders/jest（portal / em）
│   └── "test:tl": "npx jest --config=jest.tl.config.js"
├── angular.json
│   └── test.testPathIgnorePatterns: ["\\.tl\\.spec\\.ts$"]   # ng test 排除 TL
├── jest.config.js / jest.tl.config.js
│   └── jest-preset-angular、jest-canvas-mock、setup-jest.ts
└── projects/**/
    ├── *.spec.ts              # Legacy，走 ng test
    ├── *.tl.spec.ts           # Epic-70095，走 test:tl
    ├── *.service.spec.ts
    ├── *.service.logic.spec.ts / *.service.scene.spec.ts
    └── __snapshots__/         # 约 28 个快照（主要在 vsobjects/action/）
```

### 2.2 两套入口、同一运行器（Jest）

| 命令 | 配置 | 匹配文件 | 典型数量级 |
|------|------|----------|------------|
| `ng test` / `npm test` | `angular.json` → `@angular-builders/jest:run` | `**/*.spec.ts`，**排除** `*.tl.spec.ts` | ~294 legacy |
| `npm run test:tl` | `jest.tl.config.js` → `testMatch: ["**/*.tl.spec.ts"]` | 仅 `*.tl.spec.ts` | ~44（持续增长） |
| **合计** | 均为 **Jest 29.x** + `jest-preset-angular` | 约 **338** 个 spec 文件 | 见 Epic 审计 |

### 2.3 Legacy vs Epic-70095 文件约定

| 模式 | 用途 | 示例 |
|------|------|------|
| `*.component.spec.ts` / 其它 `*.spec.ts` | Legacy：TestBed、Material 全量导入、CSS 选择器 | `delivery-emails.component.spec.ts` |
| `*.component.tl.spec.ts` | ATL + MSW（或 stub），语义化查询、按 Group/Risk 组织 | `schedule-task-editor-page.component.tl.spec.ts` |
| `*.service.spec.ts` | 纯服务/HTTP 逻辑 | `schedule-task-editor-data.service.spec.ts` |
| `*.service.logic.spec.ts` | 复杂服务的方法级切片 | `security-provider.service.logic.spec.ts` |
| `*.service.scene.spec.ts` | 复杂服务的场景/异步流 | `security-provider.service.scene.spec.ts` |

**并存示例：** 同一组件可同时有 `delivery-emails.component.spec.ts`（legacy）与 `delivery-emails.component.tl.spec.ts`（Epic-70095）。生成新测时以 `.tl.spec.ts` 为范本，legacy 仅用于避免重复覆盖。

### 2.4 CI 与报告（迁移前缺口）

| 项 | 现状 |
|----|------|
| `.tl.spec.ts` | `ng test` 忽略；Maven 通常不跑 `npm run test:tl` → **多仅本地执行** |
| JUnit 报告 | `jest-junit` 写 `junit.xml`，Jenkins 未稳定归档 |
| 目标 | Vitest 迁移后统一 runner + 内置 JUnit reporter（见 Epic 第 9 节） |

---

## 3. Vitest 迁移：计划做什么

### 3.1 目标

- 将**全部**现有第 1 层 spec（含 legacy `*.spec.ts` 与 `*.tl.spec.ts`）从 **Jest** 迁到 **Vitest**。
- **合并** `ng test` 与 `test:tl` 为**一套** Vitest 配置与命令。
- 在 Portal/Composer 大规模扩测**之前**完成，避免「先写数百个 Jest 用例再迁一遍」。

### 3.2 明确不做什么

- ❌ 不把 `.spec.ts` 批量改名为 `.tl.spec.ts`
- ❌ 不强制重写 TestBed / 断言结构（机械替换为主）
- ❌ 不与第 2 层 E2E 的 Vitest REST 测试混为一谈（`e2e/` 对真实 StyleBI 实例，目录与目标不同）

### 3.3 API 与依赖对照表

| Jest（当前） | Vitest（目标） |
|--------------|----------------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `@types/jest` | `@vitest/globals` |
| `@angular-builders/jest` | `vitest.config.ts` + npm scripts |
| `jest-canvas-mock` | `vitest-canvas-mock` |
| `jest-junit` | Vitest 内置 `reporters: ['junit']` |

**保持不变：** `describe` / `it` / `expect`、`TestBed`、mock 结构、业务断言逻辑。

### 3.4 迁移工作量审计（约 338 个文件）

| 模式 | 影响文件数 | 工作量 |
|------|------------|--------|
| `jest.resetModules` / `isolateModules` / `genMockFromModule` | **0** | 无 |
| `jest.mock()` 工厂 | **2** | 改为 `vi.mock()`，每文件 1–2 行 |
| Canvas mock | **11** | 全局包替换，不改各 spec |
| `toMatchSnapshot` / `toMatchInlineSnapshot` | **28** | `vitest --update-snapshots` 一次重生（`vsobjects/action/` + `format/`） |
| 其余 | **~297** | `jest.` → `vi.` 查找替换 |

**预估：** 机械迁移约 **1–2 人天**。

### 3.5 推荐步骤

1. 新增 `vitest.config.ts`、`vitest-setup.ts`（canvas mock、全局 stub）。
2. 更新 `angular.json` / `package.json`：用 Vitest scripts 替代 `@angular-builders/jest`。
3. `tsconfig.spec.json`：`@types/jest` → `@vitest/globals`。
4. 全库 `jest.` → `vi.`（含 `.tl.spec.ts` 内现有 `jest.fn()` 等）。
5. `jest-canvas-mock` → `vitest-canvas-mock`。
6. `vitest --update-snapshots` 处理 28 个快照。
7. 跑通全量 spec，再接 Jenkins / Maven（Epic 第 9 节）。

### 3.6 迁移后增强（与 runner 无关）

| # | 增强项 | 说明 |
|---|--------|------|
| 1 | **新增** `.tl.spec.ts` | 有 service spec 的组件补模板/交互测试（**新文件**，非改名） |
| 2 | CSS 查询 → ATL 语义查询 | `getByRole` / `getByLabel`，抗 portal2026 / composer2026 样式变更 |
| 3 | 快照 → 显式断言 | 优先改 `vsobjects/action/` 等快照密集区 |
| 4 | `MaterialTestingModule` | 减少 EM 测试里重复的 Material 导入 |
| 5 | 统一异步 | 新测倾向 `waitFor()`；旧 spec 不必一轮全改 |

---

## 4. Jest 与 Vitest 工具链对比

### 4.1 定位

| 维度 | Jest | Vitest |
|------|------|--------|
| 来源 | Meta（原 Facebook） | Vite 团队，也可用于非 Vite 项目 |
| 设计 | 独立「全能」测试平台 | 与现代 bundler 共享 transform / 依赖图 |
| 测试 API | `describe` / `it` / `expect` / `jest.*` | 高度兼容，`vi.*` 替代 `jest.*` |
| 快照 / Mock | 内置 | 内置，API 对齐 |
| 并行 | worker 进程 | 默认多线程，大规模套件通常更快 |
| Watch | 支持 | 通常更快 |
| CI 报告 | 常靠 `jest-junit` 等插件 | 内置 JUnit 等 reporter |

对 StyleBI 而言：**差异主要在工程接线与维护成本**，不是「能不能测 Angular」——两者都能通过 preset / setup 跑 Angular + Zone.js。

### 4.2 工具链替换了什么、没替换什么

```
┌─────────────────────────────────────────────────────────────┐
│  替换（工具链）                                                │
│  • 运行器：Jest → Vitest                                       │
│  • 配置：jest.config + jest.tl.config → vitest.config.ts       │
│  • Mock API：jest.* → vi.*                                     │
│  • Angular 接入：@angular-builders/jest → vitest + setup       │
│  • 报告：jest-junit → vitest reporters                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  不替换（测试方法论 / 文件名）                                  │
│  • *.spec.ts 与 *.tl.spec.ts 的分工                            │
│  • ATL + MSW 写法（.tl.spec.ts）                               │
│  • TestBed、服务/管道/指令测法                                  │
│  • Epic-70095 命名：.logic.spec / .scene.spec                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Angular 项目注意点

| 主题 | Jest（当前） | Vitest（迁移后需验证） |
|------|--------------|------------------------|
| Angular 集成 | `jest-preset-angular` + `@angular-builders/jest` | `vitest-setup.ts` + 适配库 / 环境（jsdom 或 happy-dom） |
| 模板 / 样式 | preset 已处理 | 需在 config 中显式对齐 |
| `it.failing` | `@jest/globals` | Vitest 原生支持（Epic-70095 已用） |
| 双配置合并 | `ng test` ⊕ `test:tl` | 单一 `vitest.config.ts` 匹配全部 spec |

### 4.4 与第 2 层「Vitest」的区别

| | 第 1 层（本文） | 第 2 层 E2E |
|--|----------------|-------------|
| 目录 | `community/web/projects/**` | `e2e/tests/**` |
| 运行器目标 | Jest → **Vitest**（计划中） | **已是 Vitest** |
| 被测对象 | Angular 组件/服务/管道/指令 | 真实 StyleBI + Playwright 浏览器 / REST API |
| 隔离 | TestBed / MSW | Testcontainers + Docker Compose |

---

## 5. 迁移前后命令与依赖（对照）

### 5.1 npm scripts（目标态示意）

| 阶段 | 命令 | 说明 |
|------|------|------|
| 迁移前 | `npm test` / `ng test` | Jest，不含 `.tl.spec.ts` |
| 迁移前 | `npm run test:tl` | Jest，`jest.tl.config.js` |
| 迁移后 | `npm test`（或 `verify`） | **单一 Vitest**，含全部 spec 模式 |
| 迁移后 | ~~`test:tl`~~ | 可废弃或改为 `vitest --watch` 别名 |

### 5.2 主要依赖（迁移前 → 后）

| 迁移前（Jest） | 迁移后（Vitest） |
|----------------|------------------|
| `jest`, `jest-preset-angular` | `vitest` |
| `@angular-builders/jest` | （移除或仅保留 ng 包装脚本） |
| `@types/jest` | `@vitest/globals` |
| `jest-canvas-mock` | `vitest-canvas-mock` |
| `jest-junit` | （移除，用 Vitest 内置 reporter） |
| `@testing-library/jest-dom` | 可保留或换 `@testing-library/jest-dom/vitest` |

---

## 6. 决策速查

| 问题 | 答案 |
|------|------|
| Vitest 迁移要不要改文件名？ | **一般不改**；`.spec.ts` 仍可为 legacy 风格 |
| 新组件测试用什么命名？ | 组件模板/场景优先 **`*.component.tl.spec.ts`**（ATL） |
| 服务逻辑测什么文件？ | **`*.service.spec.ts`**，复杂时 `.logic` / `.scene` |
| 迁移和写新测哪个先做？ | **先 Vitest 迁移**（1–2 天），再大规模扩测 |
| `.tl.spec.ts` 现在用什么跑？ | 迁移前：**Jest**（`test:tl`）；迁移后：**Vitest**（同一套件） |

---

## 7. 相关资源

| 资源 | 路径 |
|------|------|
| Epic 总审计（覆盖率、阶段、CI） | [Epic-70095-test-migration-audit.zh-CN.md](./Epic-70095-test-migration-audit.zh-CN.md) |
| 前端测试 README | [README.md](./README.md) |
| ATL 组件测试生成提示词 | [front-end-testing/prompts/component-Front and ui-generation-prompt.md](./front-end-testing/prompts/component-Front%20and%20ui-generation-prompt.md) |
| 源码 `package.json` / `angular.json` | `community/web/` |

---

*文档版本：2026-05，与 Epic-70095 审计及 `community/web` Jest 双入口现状对齐。*
