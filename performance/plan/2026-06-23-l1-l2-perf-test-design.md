# L1/L2 前端性能测试专项设计

**Date:** 2026-06-23
**Scope:** 前端性能根因分析 + L1 Vitest bench 目标
**关联文档:** `2026-06-22-performance-test-design.md`（总体架构）

---

## 根因分类框架（RC 分类）

| 根因 | 描述 | 检测方式 |
|---|---|---|
| **RC1** In-Zone 高频事件 | `scroll`/`resize`/`mousemove`/`wheel` 监听未在 `runOutsideAngular` 内，每次事件触发全局 CD | 代码审查：找缺少 `runOutsideAngular` 的事件注册 |
| **RC2** 操作后全量刷新 | rename/delete/clone 后触发全树 HTTP 重取 + 全量重建 | 代码审查：找操作回调中的 `loadTree`/`dataChange.next()` |
| **RC3** 算法大数据集 | filter/flatten/sort/search 在 N > 500 时耗时退化 | L1 bench 测量 |
| **RC4** Default CD 热路径 | 未设 `OnPush` 的组件在高频更新父级下被反复检查 | 代码审查：找 CD 策略为 Default 且父级频繁更新的组件 |
| **RC5** 过度 server round-trip | 单次用户操作触发多次 server event/请求，无 debounce 或去重 | 代码审查：找无 debounce 的 `sendEvent()` |

---

## 真实慢场景 → 根因映射

| 慢场景 | 根因 | 受影响组件 | 状态 |
|---|---|---|---|
| portal tree scroll 卡顿 | **RC1** | `VirtualScrollTreeDatasource.registerScrollContainer` | ✅ Bug #75489 已修复 |
| EM tree scroll | — | `SecurityTreeViewComponent` 用 CDK | ✅ CDK 管理 scroll，无风险 |
| tree rename/delete/clone 后刷新慢 | **RC2** | `SecurityTreeDataService.refreshTreeData()` + `restoreExpandedState()` O(N) 级联 | ⏳ Bug #75500 open |
| tree search 慢（大节点数） | **RC3** | `VirtualScrollTreeDatasource.filterValues` | ✅ bench 已有，2000 节点 2.6ms |
| selection list/tree 大量 item | **RC3** | `vs-selection.component`：无虚拟滚动，`trackByIdx` 返回 index | ⏳ Bug #75503 open |
| Dashboard resize 卡顿 | **RC1** | `ChartObjectAreaBase`：构造器 in-Zone resize 订阅，10 图表≈140 CD/次 | ⏳ Bug #75511 open，L3 Playwright 覆盖 |
| Dashboard mousemove 卡顿 | **RC4** | `ChartArea` Default CD + `VSDataTipDirective.ngDoCheck` | ⏳ Bug #75512 open |
| Dashboard 内容区 scroll | — | `ViewerAppComponent`：ResizeSensor 在 `runOutsideAngular` 内 | ✅ 无风险 |
| Composer tree scroll | **RC1** | `VirtualScrollTreeDatasource`（同 portal tree） | ✅ Bug #75489 已修复 |
| `vs-table` scroll/wheel | — | scroll/wheel 均用 `outOfZone` | ✅ 无风险 |
| `vs-crosstab` wheel 横向滚动 | **RC1** | `(wheel)` 普通绑定 in Zone；垂直 scroll 已用 `outOfZone` ✅ | ✅ Bug #75504 已修复 |
| crosstab/table 行列很多 | **RC3** | 45 个 `@for` 嵌套，无列虚拟化 | ⏳ Bug #75504 同 issue，后续跟进 |
| chart 复杂渲染 | **RC4** | `vs-chart.component`：无 `OnPush`，每次交互全量 server round-trip | ⏳ Bug #75513 open |
| Composer wizard 多列选择 | **RC5** | `object-wizard-pane.component`：每次列选择立即发 server event，无 debounce | ⏳ Bug #75514 open |
| chart action 多次 GetImage | **RC5** | `vs-chart.component`：Axis/Legend/Plot 各自独立请求，无合并/防抖 | ⏳ Bug #75516 open |

---

## L1：Vitest bench 目标

> **状态：暂缓实现。** 场景分析已完成，待相关 bug 修复后再补充 bench 或扩展新场景。

### 已有

| 文件 | 场景 | 状态 |
|---|---|---|
| `virtual-scroll.bench.ts` | `filterValues` Old vs New，N=100/500/1000/2000 | ✅ 已完成 |

### 新建目标（待实现）

#### B1：`VirtualScrollTreeDatasource.getFlattenedNodes`（大树展开）

**文件：** `virtual-scroll-tree-datasource.bench.ts`（扩充到已有文件）

```
N=1000 宽树展开（10 层 × 100 子节点）
N=5000 宽树展开
深树展开（depth=200，单链）
```

#### B2：`ComposerMainComponent` tab 切换算法路径

**文件：** `composer-main.component.bench.ts`

```
bench("open 50 sheets sequentially", () => { ... });
bench("switch tab in 50-sheet context", () => { ... });
```

#### B3：`TreeComponent` 通用树 flatten 算法

**文件：** `tree.component.bench.ts`

```
N=1000 节点树构建 + flatten
N=5000 节点树构建 + flatten
```

#### B4：Selection list 显示计算

**文件：** `vs-selection.bench.ts`

```
bench("build selectionValuesTable from 500 items", () => { ... });
bench("build selectionValuesTable from 2000 items", () => { ... });
```

#### B5：VSCrosstab cell model 构建

**文件：** `vs-crosstab.bench.ts`

```
bench("build cell model 100col × 100row", () => { ... });
bench("build cell model 500col × 100row", () => { ... });
```

---

## L2：ATL 测试（有意义才保留）

> **状态：暂缓新增。** 场景分析已完成，已有测试保持现状；待 bug 修复后将对应 `it.fails` 转为 `it`，或视需要扩展新场景。

| 文件 | 覆盖内容 | 状态 |
|---|---|---|
| `virtual-scroll-tree-datasource.tl.spec.ts` | Bug #75489：scroll 进 Zone → CD 计数 | ✅ 已修复，2 个 `it` 通过（cdCount = 0） |
| `security-tree-view.component.tl.spec.ts` | Bug #75500：`restoreExpandedState` O(N) 级联，spy `expand()` 调用次数 | ⏳ open，1 个 `it.fails` 守门 |
| `vs-selection.component.tl.spec.ts` | Bug #75503：`trackByIdx` 返回 index 而非稳定 value key，直接断言返回值 | ⏳ open，1 个 `it.fails` 守门 |
| `portal/app.component.tl.spec.ts` | Bug C：message 监听器泄漏 | ✅ 2 个 `it.fails` |

> **原则：** L2 测试仅在能可靠断言具体行为（spy 调用次数、函数返回值等）时添加。
> zone 进出检测、`ɵsetProfiler` CD 计数等机制在 Angular 21 + ATL 环境不可靠，不作为 L2 测试手段。

---

## 运行命令

```bash
# L1 bench
npm run test:perf

# L2 CD / 行为计数 — portal
npm run test:portal:tl

# L2 CD / 行为计数 — em
npm run test:em:tl
```
