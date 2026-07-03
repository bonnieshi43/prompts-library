# StyleBI 性能测试体系设计

**Date:** 2026-06-22
**Scope:** StyleBI 全栈（前端 Angular + 后端 Java + 并发负载）
**目的:** 从"能发现问题的测试工具集"升级为"可持续回归、可用于发布质量把关的性能测试体系"

---

## 背景

### 现有资产

| 项目 | 工具 | 成熟度 | 核心价值 |
|------|------|--------|---------|
| stylebi-k6-testing | k6 + TypeScript + InfluxDB + Grafana | 高（6 个场景，WebSocket/STOMP 完整实现） | 用户行为端到端，WebSocket 独有能力 |
| concurrency-test | Locust + Python | 中（多租户场景完整，硬编码多） | 多租户并发，已发现真实问题 |
| PerformanceAnalysis | 手工 + Groovy | 低（无自动化） | 大数据量场景量化基线 |
| angular-upgrade-performance-analysis.md | 分析文档 | — | Angular CD 风暴、内存泄漏根因分析 |
| 2026-06-22-frontend-performance-test-design.md | 设计文档 | — | 前端三层测试设计，L1/L2 部分已实现 |

### 主要缺口（来自全景分析报告）

- **G1** 无统一 SLA 阈值体系（无法自动判定 pass/fail）
- **G2** 无 CI/CD 持续回归（性能回归窗口长）
- **G3** 无服务端监控联动（问题归因靠人工）
- **G4** 无长稳/Soak 测试
- **G5** 无 Spike 峰值冲击测试
- **G6** 无结果正确性断言
- **G10** 工具硬编码多，多环境复用差

### 核心决策

- **统一工具**：以 k6 为主工具（TypeScript、WebSocket/STOMP 支持、InfluxDB+Grafana 已就绪）；Locust 多租户场景价值迁移至 k6 HTTP 模式；手工测试保留为大数据量基线参考
- **CI 平台**：GitHub Actions
- **仓库策略**：两个仓库各自管理自己的 CI（方案 X），独立触发，结果汇聚到同一 Grafana 看板
- **演进目标**：长期工程质量建设，防止性能退化

### 仓库职责划分

两个仓库职责边界清晰，不互相依赖：

```
stylebi-main（本仓库）                stylebi-k6-testing（独立仓库）
─────────────────────────────         ──────────────────────────────
docs/performance/sla.md               src/thresholds.ts
  └─ 跨仓库 SLA 单一真相源               └─ 数值从 sla.md 同步，人工维护

e2e/tests/performance/                src/test-d1.ts ~ test-soak.ts
  └─ L1/L2/L3 测试                      └─ L4 k6 测试脚本

.github/workflows/
  perf-pr.yml      ← L1+L2+L3        .github/workflows/
  perf-nightly.yml ← L3 full           perf-nightly.yml ← L4 k6 nightly
                                        perf-release.yml ← L4 k6 release 全量

monitoring/prometheus.yml             （无，监控配置归 stylebi-main）
monitoring/grafana/
  └─ 统一看板（接收两个仓库的测试结果）
```

> **SLA 同步规则**：`stylebi-main/docs/performance/sla.md` 是阈值数字的单一来源。
> 每次 SLA 表更新后，需同步更新 `stylebi-k6-testing/src/thresholds.ts` 中的对应数值。
> 两个仓库的 PR checklist 均加入"SLA 是否同步"检查项。

---

## 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    StyleBI 性能测试体系                           │
├──────────┬──────────────┬───────────────────┬───────────────────┤
│  L1 算法  │   L2 组件    │   L3 浏览器渲染    │   L4 并发负载      │
│ Vitest   │ ATL + Zone  │ Playwright + CDP  │ k6 + InfluxDB    │
│  bench   │  CD 计数     │  Web Perf API     │  + Grafana        │
├──────────┴──────────────┴───────────────────┴───────────────────┤
│                      GitHub Actions CI                           │
│  PR smoke → nightly full → release regression                    │
├─────────────────────────────────────────────────────────────────┤
│                     统一 SLA 阈值表                               │
│  操作响应 / 渲染时间 / 并发吞吐 / 错误率                            │
└─────────────────────────────────────────────────────────────────┘
```

### 四层职责边界

| 层 | 回答的问题 | 运行时机 | 运行时长 |
|---|---|---|---|
| L1 Vitest bench | 算法复杂度是否退化？ | 每次 PR | < 1 min |
| L2 ATL CD 计数 | 有没有多余的 Angular CD？ | 每次 PR | < 2 min |
| L3 Playwright 渲染 | 用户实际等了多少毫秒？ | nightly | 10-20 min |
| L4 k6 并发 | 多用户下系统撑得住吗？ | nightly / release | 30-60 min |

### 三阶段里程碑

```
阶段 1 ── 让每次测试都有判定能力
           └─ 跑基线 → 标定 SLA 阈值 → k6 thresholds → 服务端监控接入
           └─ L1 bench（与阶段 1 并行，低成本）
           └─ L2 CD 计数（与阶段 1 并行，低成本）

阶段 2 ── 补全场景
           └─ Playwright 渲染性能层（L3）
           └─ k6 多租户迁移（Locust → k6）
           └─ Spike / Soak 场景

阶段 3 ── 持续回归
           └─ GitHub Actions L1-L4 全部接入
           └─ 版本趋势看板
           └─ Release 质量健康卡片
```

### L1/L2/L3/L4 与阶段对应 + 实现方式

#### 阶段-层对照表

| 层 | 启动阶段 | 依赖 | 与现有 tl.spec.ts 的关系 |
|---|---|---|---|
| **L4 k6 并发** | **阶段 1**（最优先） | k6 项目已就绪 | 完全独立，在 stylebi-k6-testing 仓库 |
| **L1 Vitest bench** | **阶段 1 并行** ⏸ 暂缓 | 无服务依赖，立即可做 | 同目录另建 `.bench.ts`，不混入 tl.spec.ts；场景分析已完成，待 bug 修复后再实现 |
| **L2 ATL CD 计数** | **阶段 1 并行** ⏸ 暂缓 | 无服务依赖，立即可做 | 在已有 `.tl.spec.ts` 加 `describe("performance - CD count")` 块；已有测试保持现状，待 bug 修复后将 `it.fails` 转为 `it` 或扩展新场景 |
| **L3 Playwright** | **阶段 2** | 需要运行中的 StyleBI 实例 | 完全独立，在 `e2e/tests/performance/` |

L1 和 L2 不依赖任何服务端，**可与阶段 1 的 k6 工作并行推进**，不需要等待。

---

#### 前端性能根因框架（RC 分类）

原 prescan 指标（`logic_lines > 500`、`async_zones ≥ 3`）是**结构视角代理指标**，与真实慢场景的根因重合度约 60%，遗漏了两类最高影响的问题类型。经实测与代码核查，改为以根因类型（RC）驱动 L1/L2 候选选取。

**真实慢场景（来自实测）：**
1. 所有 tree 的加载、rename/delete、search、scroll（含 EM 端 role/users/orgs、content tree、repository tree）
2. Clone 组织时的性能
3. Selection list/tree 大量 item 的情况
4. Dashboard scroll、chart/table 复杂操作
5. Chart action/mode-switch 触发多次 GetImage（RC5 chart 变体）→ Bug #75516 open
6. Composer wizard 多列同时选择（RC5）→ Bug #75514 open
7. Add Column（多 Banding）响应慢——服务端 SQL 效率 + `AssetDataCache` 命中率低（类 Bug #74534）；→ **L4 k6 + 缓存监控（C.1）**
8. Switch Provider / Switch Bookmark 慢——服务端数据加载主导；→ **L4 k6 + SLA 阈值**
9. Embedded VS Action 慢——服务端内嵌 VS 执行路径 overhead；→ **L3 Playwright + L4 k6**

**根因分类：**

| 根因 | 描述 | 检测方式 | 对应测试层 |
|---|---|---|---|
| **RC1** In-Zone 高频事件 | `scroll`/`resize`/`mousemove`/`wheel` 监听未在 `runOutsideAngular` 内 → 每次事件触发全局 CD | 代码审查：找缺少 `runOutsideAngular` 的事件注册；修复后代码 review | 代码审查 + 修复 |
| **RC2** 操作后全量刷新 | rename/delete/clone 后触发全树 HTTP 重取 + 全量重建，而非增量更新 | 代码审查：找操作回调中的 `loadTree`/`dataChange.next()` | L2（spy 方法调用次数，bug 明确时） |
| **RC3** 算法大数据集 | filter/flatten/sort/search 在 N > 500 时耗时退化 | bench 测量 | L1（bench N=100/1000/5000） |
| **RC4** Default CD 热路径 | 未设 `OnPush` 的组件位于高频更新父级下，每次父 CD 均检查 | 找 CD 策略为 Default 且父级频繁更新的组件 | 代码审查（`ɵsetProfiler` 在 Angular 21 不可用） |
| **RC5** 过度 server round-trip | 单次用户操作触发多次 server event/请求，无 debounce 或去重 | 代码审查：找无 debounce 的 `sendEvent()` | 代码审查 + 修复 |

> prescan `logic_lines` 仍可辅助定位 RC3 候选（大文件更可能含复杂算法），但不是唯一准入条件。

**已核查组件（2026-06-22 代码核查结论）：**

| 组件 | RC | 核查结论 | 状态 |
|---|---|---|---|
| `VirtualScrollTreeDatasource.registerScrollContainer` | **RC1** | `element.addEventListener("scroll", ...)` 在 Zone 内，无 `runOutsideAngular`。所有使用 portal `TreeComponent` 的地方均受影响（Composer binding/toolbox tree、`DataSourcesTreeViewComponent` 等）。修复一处全部受益。 | Bug A，已有 `it.fails` |
| `SecurityTreeViewComponent`（EM） | **RC2** | 使用 CDK VirtualScrollViewport，**RC1 风险：无**；但 rename/delete/clone 后 `dataChange` 触发全树 HTTP 重取 + `flattenedDataChanged` 重建 | ❌ 未覆盖 |
| `RepositoryTreeViewComponent`（EM） | — | OnPush + CDK，search 有 `debounceTime(1000)` | ✅ 无高风险 |
| `vs-selection.component` | **RC3** | scroll 已用 `OutOfZoneDirective`（RC1 风险：无）；**无虚拟滚动**，最多 500 item 全部渲染入 DOM；`trackBy` 用数组下标而非唯一 ID，重排时触发不必要的重渲染 | Bug #75503（open）；`vs-selection.component.tl.spec.ts` 1 个 `it.fails` |
| `vs-table.component` | — | scroll/wheel 均用 `outOfZone`（RC1 风险：无）；sort/filter 发往后端不触发前端全量重渲染；OnPush ✅ | ✅ 无高风险 |
| `ChartObjectAreaBase` | **RC1** | 构造器 `fromEvent(window, 'resize')` 在 Zone 内，10 图表 ≈ 140 次 CD/resize 事件（Bug #75511） | ATL 不适用，L3 only |
| `vs-chart.component`（GetImage 多次） | **RC5** | mode switch / 联动 action 时多次触发 `GetImageEvent`，Axis/Legend/Plot 各部件各自独立请求，无合并/防抖 | ⏳ Bug #75516 open |

---

#### L1：Vitest bench — 与 tl.spec.ts 的融合方式

> **状态：⏸ 暂缓实现。** 场景分析与选题已完成（见 `2026-06-23-l1-l2-perf-test-design.md`），待相关 bug 修复后再补充 bench 或扩展新场景。

**原则：不混入 tl.spec.ts，另建 `.bench.ts` 文件。**

`bench()` 只在 `npm run test:perf` 下触发，`npm test` 不跑。混入 tl.spec.ts 会让功能 CI 看到 bench 块产生干扰。已有的 `virtual-scroll.bench.ts`（299 行）是正确范式：`test()` 正确性断言 + `bench()` 性能测量，同文件，命令独立触发。

**选题依据 — 基于根因框架（RC3）：**

```
RC3：该函数是否在 N > 500 的数据集上运行 filter / flatten / sort / search？
     → 直接量化大数据集下的算法耗时退化
prescan logic_lines 作为辅助参考（大文件更可能含复杂算法），但不是唯一准入条件
```

**当前优先组件：**

| 组件 | RC | bench 场景 |
|---|---|---|
| `VirtualScrollTreeDatasource` | RC3 | 已有 bench（2000 节点 2.6ms/次）；扩充 N=5000、深度树场景，作为 `filterValues` 回归守门 |
| `ComposerMainComponent` | RC3 | 50+ sheet tab 切换；sheet 打开耗时（logic_lines=2512，算法路径长） |
| `TreeComponent`（portal 通用树） | RC3 | `getFlattenedNodes` 展开 1000/5000 节点树的耗时 |
| selection 大列表 | RC3（待核查） | 1000/5000 item 的 `getDisplayedValues` / STATE bitmask 过滤耗时（核查后补充具体文件） |

**文件命名约定：**
```
virtual-scroll.bench.ts                    # 已有
composer-main.component.bench.ts           # 新建
```

**bench 文件结构模板（复用 virtual-scroll.bench.ts 范式）：**
```typescript
// test() — 正确性断言，npm test 时运行
describe("XXX — correctness", () => {
  test("returns expected result", () => { ... });
});

// bench() — 性能测量，npm run test:perf 时运行
describe("XXX — N=1000", () => {
  bench("impl A", () => { /* 待优化路径 */ });
  bench("impl B", () => { /* 优化后路径 */ });
});
```

---

#### L2：ATL 行为断言 — 使用原则

> **状态：⏸ 暂缓新增。** 已有测试保持现状（见 `2026-06-23-l1-l2-perf-test-design.md`）；待 bug 修复后将对应 `it.fails` 转为 `it`，或视需要扩展新场景。

**原则：只在能可靠断言具体行为时添加 L2 测试。**

可靠的 L2 测试手段：
- **spy 调用次数**：验证某方法被调用了多少次（如 `expand()` per-node vs batch）
- **函数返回值**：直接断言纯逻辑输出（如 `trackByIdx()` 返回稳定 key 而非 index）

不可靠的手段（不用）：
- `zone.onMicrotaskEmpty` 计数：async 测试中 `await` 本身产生 Promise microtask，造成误计
- `ɵsetProfiler` CD 计数：Angular 21 无法导入（TS2724），不可用
- `NgZone.isInAngularZone()` + ATL render：受 `OutOfZoneDirective.ngOnInit` observers 守卫时序影响，结果不确定

**已有 L2 测试（有意义，保留）：**

| 根因 | 组件 | 文件 | 状态 |
|---|---|---|---|
| RC1 | `VirtualScrollTreeDatasource` | `virtual-scroll-tree-datasource.tl.spec.ts` | ✅ Bug #75489 已修复，2 个 `it` 通过 |
| RC1（L3 only） | `ChartObjectAreaBase` | — ATL 不适用 — | ⏳ Bug #75511 open，Playwright 场景覆盖 |
| RC2 | `SecurityTreeViewComponent`（EM） | `security-tree-view.component.tl.spec.ts` | ⏳ Bug #75500 open，spy `expand()` 调用次数，1 个 `it.fails` |
| RC3 | `vs-selection.component` | `vs-selection.component.tl.spec.ts` | ⏳ Bug #75503 open，断言 `trackByIdx()` 返回值，1 个 `it.fails` |

**运行命令：** `npm run test:portal:tl` / `npm run test:em:tl`

---

## 缓存层性能维度分析

> 源码分析结论（2026-06-22）。每个缓存层的可测试性、现有指标和性能风险说明，为阶段 1-3 的测试场景设计和 Grafana 面板选型提供依据。

StyleBI 共有 **5 个缓存层**，性能特性和可观测性各不相同：

| 缓存层 | 关键类 | 现有指标 | 主要性能风险 |
|---|---|---|---|
| 查询结果缓存 | `AssetDataCache` | ✅ Micrometer（已可接 Prometheus） | 冷热缓存响应时间差 3-10x |
| 表数据内存/磁盘 Swap | `XSwappableTable` / `XSwapper` | ✅ `XSwappableMonitor`（hits/misses/disk bytes） | 内存不足溢写磁盘后性能骤降 |
| MV 物化视图 | `MVTransformer` / `MVStorage` | ❌ **无 hit/miss 指标（缺口）** | 命中 vs 未命中性能差异极大但完全不可观测 |
| Ignite 分布式 Session | `RuntimeSheetCache` / `IgniteCluster` | ✅ `ClusterCacheUsageService`（size） | FULL_SYNC 写模式：每次 VS 状态保存等待所有副本确认，多节点下写延迟叠加 |
| 浏览器 HTTP 缓存 | `CacheInterceptor` / `StaticResourceInterceptor` | — | Angular bundle 用 `mustRevalidate`，每次导航都验证；chart tile 用 Blob URL，无缓存 |

---

### C.1 查询结果缓存（AssetDataCache）

**机制**：缓存查询执行后的 `TableLens`（结果集），key 为 `DataKey`（表+变量+用户+schema）。

```
配置参数：
  query.cache.data=true      # 开关
  query.cache.limit=100      # 最大条目数（默认 100）
  query.cache.timeout=600000 # 超时 10 分钟
```

**失效策略**：依赖变更（`dependenceMap`）+ 时间戳 + 数据修改检测，LRU eviction。

**已有 Micrometer 指标**（`CacheMeterService`，每 5 秒刷新）：
- `inetsoft.cache.requests{result=hit/miss}` — 命中/未命中次数
- `inetsoft.cache.transfer{direction=read/write}` — 磁盘溢写字节数
- `inetsoft.cache.size` — 当前缓存条目数

**对测试场景的影响**：
- k6 D1 场景需区分**冷缓存**（首次查询）和**热缓存**（重复查询）两种 SLA
- Soak 期间观察 hit rate 是否稳定（hit rate 下降 = 缓存失效过频或容量不足）
- 阶段 1 Grafana 加 hit rate 折线图（`hit / (hit + miss)`）

---

### C.2 表数据内存/磁盘 Swap（XSwappableTable）

**机制**：大数据集按 8192 行分片存储（`XTableFragment`），内存不足时按优先级溢写到磁盘（`.tdat` 文件）。

**内存压力级别**（`XSwapper`）：

| 级别 | 可用内存 | 行为 |
|---|---|---|
| GOOD_MEM | > 40% | 正常，不溢写 |
| NORM_MEM | 30-40% | 开始评估溢写 |
| LOW_MEM | 20-30% | 主动溢写低优先级分片 |
| BAD_MEM | 15-20% | 积极溢写 |
| CRITICAL_MEM | < 15% | 紧急溢写，性能骤降 |

**已有指标**（`XSwappableMonitor`，通过 `CacheMeterService` 暴露）：
- `inetsoft.cache.transfer{type=data,direction=read}` — 从磁盘读回字节数（miss 代价）
- `inetsoft.cache.transfer{type=data,direction=write}` — 溢写到磁盘字节数

**对测试场景的影响**：
- E1 大数据场景：对比 JVM Heap 与溢写字节数的关系
- Soak 期间：溢写字节数持续增长 = 内存压力积累，是性能退化的先行指标
- 阶段 1 Grafana 加 Swap 溢写字节数/分钟面板

---

### C.3 MV 物化视图缓存（MVTransformer / MVStorage）

**机制**：MV 数据从 BlobStorage 加载后缓存在 `ConcurrentHashMap`（`MVStorage`）。查询时 `MVTransformer` 决定是否 rewrite 到 MV。

**命中决策关键检查**（`MVTransformer.java`）：
1. 分组列是否全部在 MV 中
2. 聚合函数是否可组合（SUM/COUNT 可以，DISTINCT COUNT 部分支持）
3. 查询列是否全部存在于 MV 列定义

**现有指标：❌ 无任何 hit/miss 计数器**

**缺口修复**（阶段 2 代码改动）：在 `MVTransformer.transform()` 入口新增 Micrometer counter：

```java
// community/core/.../inetsoft/mv/MVTransformer.java
meterRegistry.counter("inetsoft.mv.query",
    "result", mvHit ? "hit" : "miss",
    "mvName", mvDef.getName()
).increment();
```

**对测试场景的影响**：
- 指标修复后，Grafana 显示 MV hit rate 趋势
- k6 需设计 MV 命中场景（查询匹配 MV 列定义）和未命中场景（含 MV 中没有的列）
- SLA：MV 命中时 `viewsheet_open_time` 应比未命中快 5-20x（基线标定后确认）

---

### C.4 Ignite 分布式 Session 缓存（RuntimeSheetCache）

**机制**：VS/WS 运行时状态先存本地 LRU（500 条），同时异步写入 Ignite 分布式缓存（Zstd 压缩）。

**关键性能参数**：

| 参数 | 值 | 性能含义 |
|---|---|---|
| WriteSynchronizationMode | FULL_SYNC | 写操作等待所有副本确认，多节点下写延迟叠加 |
| 副本数（≤2 节点） | REPLICATED，2 副本 | 每次写 = 2 次网络往返 |
| 副本数（3-4 节点） | PARTITIONED，2 副本 | 写延迟取决于最慢副本节点 |
| 副本数（5-10 节点） | PARTITIONED，3 副本 | 写延迟进一步增加 |
| Zstd 压缩 | 是 | 减少网络传输但增加 CPU 开销 |

**已有指标**（`ClusterCacheUsageService`）：总条目数、本节点条目数（无写延迟指标）。

**对测试场景的影响**：
- 多节点集群下 `viewsheet_open_time` SLA 应比单节点宽松 15-30%（FULL_SYNC 开销）
- MT1 多租户场景应记录单节点 vs 多节点的 p95 差异
- Soak 期间观察 Ignite cache size 是否只增不减（session 泄漏）

---

### C.5 浏览器 HTTP 缓存

| 资源类型 | Cache-Control | 说明 |
|---|---|---|
| `/api/**` API 响应 | `no-store` | 完全禁止缓存，正确 |
| 静态资源 `/**` | `no-cache, private, must-revalidate` | 每次导航发条件 GET，304 才用缓存 |
| chart tile 图像 | Blob URL（无缓存头） | `URL.createObjectURL()` 绕过缓存，防止陈旧图表，设计正确 |

**优化机会**：Angular esbuild bundle 文件名含内容哈希（如 `main.abc123.js`），理论上可改为 `max-age=31536000, immutable`，减少每次导航的 304 验证请求（约节省 N×RTT）。

**对测试场景的影响**：
- L3 Playwright P3 场景分别测**冷加载**（清 Cache）和**热加载**（304 命中），记录 LCP 差异
- 若 bundle 改为强缓存，热加载 LCP 预期改善 200-500ms

---

### C.6 缓存层对各阶段的影响汇总

| 阶段 | 来自缓存分析的新增工作 |
|---|---|
| **阶段 1** | Grafana 新增：cache hit rate、Swap 溢写字节数、Ignite cache size 面板（指标已有，接入即可） |
| **阶段 2** | `MVTransformer.java` 新增 Micrometer counter；k6 D1 区分冷/热缓存场景；MT1 加单节点 vs 多节点对比 |
| **阶段 3** | Soak 通过标准增加：cache hit rate 无明显下降、Ignite size 无只增不减趋势、Swap 溢写无持续积累 |

---

## 阶段 1：SLA 阈值体系 + 服务端监控

### 1.1 SLA 阈值标定流程

**阈值不能凭感觉拍，必须从实测数据标定。SLA 表是阶段 1 的输出，不是输入。**

标定步骤：

```
第一步：跑基线（不设阈值）
    现有 k6 D1/D2/E1 脚本原样跑一次，导出 summary
    → 获得 viewsheet_open_time、selection_time 的实际 p95/p99

第二步：参考手工测试历史数据
    PerformanceAnalysis 里已有各操作实测秒数
    → 作为"已知现状"锚点

第三步：设阈值 = 当前 p95 × 1.2（留 20% 余量）
    例：基线 viewsheet_open_time p95 = 2.1s → 阈值设为 p95 < 2.5s

第四步：随优化推进，逐步收紧阈值
    每季度 review 一次，性能变好后把阈值往下调
```

### 1.2 SLA 阈值表（初始模板，数字待基线标定后填入）

| 场景类型 | 指标 | P95 目标 | P99 目标 | 错误率上限 | BI 行业建议值 | 参考来源 |
|---|---|---|---|---|---|---|
| Viewsheet 打开 | `viewsheet_open_time` | 待标定 | 待标定 | < 1% | p95 < 5s / p99 < 10s | Gartner：80% BI 用户期望 Dashboard < 5s；Tableau 官方性能指南 |
| 筛选器联动响应 | `selection_time` | 待标定 | 待标定 | < 1% | p95 < 2s / p99 < 4s | Nielsen NNG：< 1s 感觉即时，< 3s 可接受；Power BI / Tableau filter 最佳实践目标 < 2s |
| 大数据 VS 打开（≥1M 行） | `viewsheet_open_time` | 待标定 | 待标定 | < 2% | p95 < 15s / p99 < 30s | 业界大数据 BI 查询可接受等待：10-30s（含网络+计算）；Apache Superset 大数据场景基准 |
| 导出（Excel/PDF，<10MB） | 导出完成时间 | 待标定 | 待标定 | < 2% | p95 < 30s / p99 < 60s | Looker / Tableau 导出最佳实践：小文件 < 30s，大文件异步处理 |
| 树加载（≤1000 节点） | `tree_load_time` | 待标定 | 待标定 | — | p95 < 1s / p99 < 2s | Nielsen NNG：UI 树/列表展开 < 1s 为流畅体验上限 |
| 页面首次渲染 LCP | LCP | < 2.5s | < 4s | — | **直接采用** | Google Core Web Vitals（Good < 2.5s，Needs Improvement < 4s） |
| Dashboard 图表全部加载 | `dashboard_ready_time` | 待标定 | 待标定 | — | p95 < 5s / p99 < 10s | Gartner BI 报告；Metabase / Superset 社区 Dashboard 加载基准目标 |
| WebSocket 建连成功率 | WS checks rate | — | — | > 99% | **直接采用** | 实时推送类应用标准（参考 Socket.io、Grafana 生产 SLA） |
| 并发 400 用户 HTTP 错误率 | http_req_failed rate | — | — | < 1% | **直接采用** | Google SRE：99.9% 可用性对应错误率 < 0.1%；BI SaaS 通行宽松线 < 1% |

> **标定策略**：行业建议值作为初始上限参考，实际阈值取 `min(行业建议值, 基线 p95 × 1.2)`。
> 若基线已优于行业建议（如树加载实测 p95 = 400ms），则以基线值收紧（阈值设 480ms），而非放宽到行业上限。

### 1.3 k6 Thresholds 配置

不同测试场景的性能期望有本质差异，**不能共用同一套响应时间阈值**：

| 场景 | 为什么阈值不同 |
|---|---|
| D1 / D2 / D3 / MT1 | 标准负载，响应时间期望相近，可共用 |
| E1（大数据 ≥1M 行） | VS 打开合理需要 15s+，标准阈值 5s 会误报 |
| Spike | 冲击期允许短暂错误率升高（< 5%），不能用标准 < 1% |
| Soak | 关注 2h 内的**漂移幅度**（末尾 vs 开始 p95 差），不是绝对值 |

**可以统一的**：HTTP 错误率、WebSocket 成功率（结构性质量门禁，所有场景通用）。

**设计方案**：BASE（全局质量门禁）+ SCENARIO（场景响应时间）分层，各脚本用展开合并：

```typescript
// src/thresholds.ts
// p(95)/p(99) 数值在阶段 1 基线跑测完成后填入，提交前不得保留 0

// ── 全局质量门禁（所有场景共用）────────────────────────────
export const BASE_THRESHOLDS = {
  http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }], // 错误率超 1% 立即中止
  checks:          [{ threshold: 'rate>0.99' }],                     // WS 成功率 > 99%
};

// ── 场景响应时间阈值（按场景特性分组）──────────────────────
export const SCENARIO_THRESHOLDS = {

  // D1 / D2 / D3 / MT1：标准负载，共用
  standard: {
    viewsheet_open_time: [
      { threshold: 'p(95)<0' },   // TODO: 基线 × 1.2（ms）
      { threshold: 'p(99)<0' },   // TODO: 基线 × 1.5（ms）
    ],
    selection_time: [
      { threshold: 'p(95)<0' },   // TODO: 基线 × 1.2（ms）
    ],
  },

  // E1：大数据场景，响应时间期望更宽松
  bigdata: {
    viewsheet_open_time: [
      { threshold: 'p(95)<0' },   // TODO: 基线 × 1.2（ms），参考行业建议 < 15000
      { threshold: 'p(99)<0' },   // TODO: 参考行业建议 < 30000
    ],
  },

  // Spike：冲击期容忍更高错误率，覆盖 BASE_THRESHOLDS.http_req_failed
  spike: {
    http_req_failed:     [{ threshold: 'rate<0.05' }],   // 冲击期容忍 5%，覆盖 BASE
    viewsheet_open_time: [{ threshold: 'p(95)<0' }],     // TODO: standard × 2（ms）
  },

  // Soak：绝对值阈值与 standard 相同；漂移检测靠 Grafana 趋势，不靠单次 threshold
  soak: {
    viewsheet_open_time: [{ threshold: 'p(95)<0' }],     // TODO: 同 standard
  },
};
```

**各脚本用展开合并，一行接入**：

```typescript
// test-d1.ts / test-d2.ts / test-d3.ts / test-mt1.ts
options = { thresholds: { ...BASE_THRESHOLDS, ...SCENARIO_THRESHOLDS.standard } };

// test-e1.ts
options = { thresholds: { ...BASE_THRESHOLDS, ...SCENARIO_THRESHOLDS.bigdata } };

// test-spike.ts（spike 阈值覆盖 BASE 的错误率）
options = { thresholds: { ...BASE_THRESHOLDS, ...SCENARIO_THRESHOLDS.spike } };

// test-soak.ts
options = { thresholds: { ...BASE_THRESHOLDS, ...SCENARIO_THRESHOLDS.soak } };
```

这样：维护入口只有一个文件，新增场景只加一个 key，不会各自漂移。

### 1.4 服务端监控接入

StyleBI 已有 Prometheus metrics 端点（`/actuator/prometheus`），直接接入：

```
k6 压测运行
    ↓ 指标写入
InfluxDB（已有）
Prometheus scrape → InfluxDB（新增 scrape job）
    ↓
Grafana（已有）── 新增 "StyleBI Server Health" dashboard
    ├── JVM Heap Used / Max
    ├── GC 次数 / GC 耗时（stop-the-world 时长）
    ├── 线程数（total / daemon / blocked）
    ├── HikariCP 连接池 active / idle / pending
    ├── Scheduler 任务队列积压量
    └── k6 自定义指标时间轴对齐（压测开始/结束标注）
```

配置步骤：
1. `monitoring/prometheus.yml` 新增 scrape job 指向 StyleBI server
2. Grafana 新增 "StyleBI Server Health" dashboard（复用社区 JVM Micrometer 模板）
3. k6 脚本 `setup()` 阶段写入 InfluxDB 一条 `test_start` 事件，方便 Grafana 画时间区间标注

### 1.5 阶段 1 交付物

| 交付物 | 位置 |
|---|---|
| 基线跑测结果（JSON） | `docs/performance/baseline-{date}.json` |
| SLA 阈值表（标定后） | `docs/performance/sla.md` |
| `src/thresholds.ts` | k6 项目 `src/` |
| D1/D2/D3/E1 引用 thresholds | k6 项目各测试脚本 |
| `monitoring/prometheus.yml` | stylebi-main `monitoring/` |
| Grafana JVM dashboard JSON | `monitoring/grafana/jvm-dashboard.json` |

---

## 阶段 2：Playwright 渲染性能层 + 场景补全

### 2.1 Playwright 渲染性能层（L3）

**定位**：在真实 Chromium 里自动量化用户能感受到的渲染耗时，补 k6 看不到的那一半（JS 执行、CD 次数、Long Task、LCP）。

#### 文件结构

复用现有 `e2e/` 目录，单独建子目录：

```
e2e/
└── tests/
    └── performance/
        ├── tree-load.perf.ts           # 树加载时间（场景 P1）
        ├── dashboard-render.perf.ts    # Dashboard 渲染（场景 P2）
        ├── page-lcp.perf.ts            # 页面 LCP/FCP（场景 P3）
        └── helpers/
            └── perf-utils.ts           # 公共采集工具
```

#### 公共采集工具（perf-utils.ts）

```typescript
// 采集 Web Vitals
export async function collectWebVitals(page: Page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    return {
      ttfb: nav.responseStart - nav.requestStart,
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
    };
  });
}

// 采集 Long Tasks（卡顿来源，主线程 >50ms 任务）
export async function collectLongTasks(page: Page, action: () => Promise<void>) {
  await page.evaluate(() => {
    (window as any).__longTasks = [];
    new PerformanceObserver(list => {
      (window as any).__longTasks.push(...list.getEntries().map(e => e.duration));
    }).observe({ entryTypes: ['longtask'] });
  });
  await action();
  return page.evaluate(() => (window as any).__longTasks as number[]);
}

// 写入结构化结果（供 CI 判定和趋势写入）
export function writeResult(scenario: string, metric: string, valueMs: number, thresholdMs: number) {
  const pass = valueMs < thresholdMs;
  const result = { scenario, metric, valueMs, thresholdMs, pass, ts: Date.now() };
  fs.appendFileSync('perf-results.ndjson', JSON.stringify(result) + '\n');
  expect(valueMs, `${metric} ${valueMs}ms 超过阈值 ${thresholdMs}ms`).toBeLessThan(thresholdMs);
}
```

#### 三个核心测试场景

**场景 P1：树加载时间**
- 操作：打开 Composer → 展开含 1000 节点的字段树
- 量化：`performance.mark` 从点击展开 → 最后一个节点 DOM 可见的耗时
- Long Tasks：展开期间 >50ms 任务数量
- 阈值：`tree_load_time` p95（基线标定后填入）

**场景 P2：Dashboard 渲染时间**
- 操作：导航到含 6 个图表的 Dashboard
- 量化：从导航开始 → 所有 `chart tile img` 的 `load` 事件触发
- Long Tasks：resize 一次期间 >50ms 任务数量（对应 Bug B）
- 阈值：`dashboard_ready_time`（基线标定后填入）；resize Long Tasks < N 个

**场景 P3：页面 LCP / FCP**
- 操作：清缓存冷启动，导航到 Portal 首页
- 量化：LCP、FCP、TTFB
- 阈值：LCP < 2500ms（直接用 Google Core Web Vitals）

#### pass/fail 机制

每个测试用 `expect(value).toBeLessThan(threshold)` 直接断言，失败时 Playwright 标红，CI job 退出码非 0。结果同时写入 `perf-results.ndjson` 供趋势写入 InfluxDB。

### 2.2 k6 场景补全

#### 多租户场景（test-mt1.ts，从 Locust 迁移）

```
每个 VU 属于不同 org（USE_MULTI_USER + ORG_LIST 参数）
同时打开各自 org 的热点 Viewsheet
断言：viewsheet 返回数据包含期望的 orgId 字段（结果不串数据）
阈值：参考 D1，多租户下 p95 允许放宽 50%
```

#### Spike 测试（test-spike.ts）

```
ramping-arrival-rate 模式
0 → 200 用户在 30 秒内涌入（模拟早高峰全体刷新）
峰值持续 2 分钟
降回 0 后观察恢复速度（2 分钟内 p95 恢复到基线 ×1.2 以内）
通过标准：峰值期间错误率 < 1%，恢复时间 < 2 min
```

#### Soak 测试（test-soak.ts）

```
50 并发用户持续 2 小时
每 15 分钟采样一次 viewsheet_open_time p95
结合服务端 JVM 监控观察内存趋势
通过标准：
  - 2 小时末尾 p95 与开始时 p95 差异 < 20%
  - JVM Heap 无持续单调增长（排除 GC 后仍增长）
  - 线程数无只增不减趋势
```

### 2.3 阶段 2 交付物

| 交付物 | 位置 |
|---|---|
| `perf-utils.ts` 采集工具 | `e2e/tests/performance/helpers/` |
| `tree-load.perf.ts` | `e2e/tests/performance/` |
| `dashboard-render.perf.ts` | `e2e/tests/performance/` |
| `page-lcp.perf.ts` | `e2e/tests/performance/` |
| `test-mt1.ts` 多租户 k6 | k6 项目 `src/` |
| `test-spike.ts` Spike k6 | k6 项目 `src/` |
| `test-soak.ts` Soak k6 | k6 项目 `src/` |
| `perf-results.ndjson` 格式规范 | `docs/performance/output-format.md` |

---

## 阶段 3：GitHub Actions 接入 + 趋势看板

### 3.1 CI 触发策略（方案 X：两仓库各自管理）

两个仓库独立触发，结果均写入同一 InfluxDB，在 Grafana 统一查看：

```
stylebi-main CI                          stylebi-k6-testing CI
────────────────────────────────         ──────────────────────────────────
PR 提交 → perf-pr.yml                    Nightly → perf-nightly.yml
  L1 bench      < 1 min                    L4 D1/D2/D3    ~30 min（标准并发）
  L2 ATL        < 2 min                    L4 MT1          ~30 min（多租户）
  L3 smoke      < 5 min
                                          手动触发 → perf-release.yml
Nightly → perf-nightly.yml                 L4 E1           ~30 min（大数据）
  L3 full      10-20 min                   L4 Spike        ~15 min
                                           L4 Soak          ~2 h
```

| 触发时机 | 仓库 | 测试层 | 耗时 |
|---|---|---|---|
| PR 提交（每次） | stylebi-main | L1 + L2 + L3 smoke | < 8 min |
| Nightly（02:00） | stylebi-main | L3 full | 10-20 min |
| Nightly（03:00） | stylebi-k6-testing | L4 D1/D2/D3 + MT1 | ~60 min |
| Release 前（手动） | stylebi-k6-testing | L4 E1 + Spike + Soak | 3-4 h |

> 两个 Nightly 错开 1 小时，避免同时占用 perf 服务器。

### 3.2 Workflow 文件结构

```
stylebi-main/
└── .github/workflows/
    ├── perf-pr.yml          # PR 触发：L1 + L2 + L3 smoke
    └── perf-nightly.yml     # 定时触发：L3 full

stylebi-k6-testing/
└── .github/workflows/
    ├── perf-nightly.yml     # 定时触发：L4 D1/D2/D3 + MT1
    └── perf-release.yml     # 手动触发：L4 E1 + Spike + Soak
```

#### stylebi-main — perf-pr.yml

```yaml
name: Performance - PR Smoke
on: [pull_request]

jobs:
  l1-bench:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: true }
      - run: cd community/web && npm ci && npm run test:perf
      - uses: actions/upload-artifact@v4
        with: { name: bench-results, path: bench-results.json }

  l2-cd-count:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: true }
      - run: cd community/web && npm ci && npm run test:portal:tl

  l3-render-smoke:
    runs-on: ubuntu-latest
    needs: []                     # 与 L1/L2 并行
    # 前提：需要运行中的 StyleBI 实例。
    # 选项 A（推荐）：专用 perf 环境（secrets.PERF_SERVER_URL），无需 CI 内启动容器
    # 选项 B：stylebi Docker 镜像在 CI 内启动（需镜像可从 runner 拉取）
    # 阶段 3 实施时根据实际环境选择
    env:
      PLAYWRIGHT_BASE_URL: ${{ secrets.PERF_SERVER_URL }}
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx playwright install chromium
      - run: npx playwright test e2e/tests/performance/ --project=chromium
      - uses: actions/upload-artifact@v4
        with: { name: perf-results, path: perf-results.ndjson }
```

#### stylebi-k6-testing — perf-nightly.yml

```yaml
name: Performance - k6 Nightly
on:
  schedule: [{ cron: '0 3 * * *' }]   # 03:00，错开 stylebi-main nightly

jobs:
  k6-d1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run webpack
      - uses: grafana/k6-action@v0.3.1
        with: { filename: dist/test-d1.js }
        env:
          SERVER_IP:     ${{ secrets.PERF_SERVER_IP }}
          AUTH_USER:     ${{ secrets.PERF_AUTH_USER }}
          AUTH_PASSWORD: ${{ secrets.PERF_AUTH_PASSWORD }}
          K6_OUT:        influxdb=http://${{ secrets.INFLUXDB_HOST }}:8086/k6

  k6-d2:
    runs-on: ubuntu-latest
    needs: k6-d1       # 顺序执行，避免并发压垮 perf 服务器
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run webpack
      - uses: grafana/k6-action@v0.3.1
        with: { filename: dist/test-d2.js }
        env:
          SERVER_IP:     ${{ secrets.PERF_SERVER_IP }}
          AUTH_USER:     ${{ secrets.PERF_AUTH_USER }}
          AUTH_PASSWORD: ${{ secrets.PERF_AUTH_PASSWORD }}
          K6_OUT:        influxdb=http://${{ secrets.INFLUXDB_HOST }}:8086/k6

  # k6-d3 / k6-mt1 结构同上，依次 needs 前一个 job
```

#### stylebi-k6-testing — perf-release.yml

```yaml
name: Performance - k6 Release
on:
  workflow_dispatch:    # 纯手动触发，不自动运行
    inputs:
      scenario:
        description: '要运行的场景'
        required: true
        type: choice
        options: [all, e1, spike, soak]

jobs:
  k6-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run webpack
      - name: Run selected scenario
        uses: grafana/k6-action@v0.3.1
        with:
          filename: dist/test-${{ github.event.inputs.scenario }}.js
        env:
          SERVER_IP:     ${{ secrets.PERF_SERVER_IP }}
          AUTH_USER:     ${{ secrets.PERF_AUTH_USER }}
          AUTH_PASSWORD: ${{ secrets.PERF_AUTH_PASSWORD }}
          K6_OUT:        influxdb=http://${{ secrets.INFLUXDB_HOST }}:8086/k6
```

### 3.3 版本趋势看板

```
k6 → InfluxDB（已有）
Playwright perf-results.ndjson
    → parse-perf-results.ts 脚本
    → 写入 InfluxDB measurement: playwright_perf
                                               ↓
                                           Grafana
                                    ├── p95 趋势折线（by 场景，x 轴=日期/版本）
                                    ├── 阈值红线（超线区域变红）
                                    └── 场景对比（D1 vs D2 vs MT1）
```

### 3.4 Release 质量健康卡片

手动触发 `perf-release.yml` 后，脚本自动生成 `perf-report-{version}.md`：

```markdown
## StyleBI vX.X.X 性能健康卡片

生成时间：YYYY-MM-DD
测试环境：{server specs}

| 场景 | 指标 | 实测 p95 | 阈值 | 结论 |
|------|------|----------|------|------|
| Viewsheet 打开 | viewsheet_open_time | Xs | <Xs | ✅/❌ |
| 筛选联动 | selection_time | Xs | <Xs | ✅/❌ |
| 树加载 | tree_load_time | Xms | <Xms | ✅/❌ |
| Dashboard LCP | LCP | Xs | <2.5s | ✅/❌ |
| 400 并发错误率 | http_req_failed | X% | <1% | ✅/❌ |
| Soak 2h 内存增长 | JVM Heap delta | X% | <20% | ✅/❌ |
```

### 3.5 阶段 3 交付物

**stylebi-main 仓库：**

| 交付物 | 位置 |
|---|---|
| `perf-pr.yml`（L1+L2+L3 PR 检查） | `stylebi-main/.github/workflows/` |
| `perf-nightly.yml`（L3 full nightly） | `stylebi-main/.github/workflows/` |
| `parse-perf-results.ts`（Playwright 结果写入 InfluxDB） | `stylebi-main/scripts/` |
| `generate-perf-report.ts`（Release 健康卡片生成） | `stylebi-main/scripts/` |
| Grafana 统一趋势看板 JSON | `stylebi-main/monitoring/grafana/perf-trend.json` |
| Release 健康卡片模板 | `stylebi-main/docs/performance/report-template.md` |

**stylebi-k6-testing 仓库：**

| 交付物 | 位置 |
|---|---|
| `perf-nightly.yml`（L4 D1/D2/D3/MT1 nightly） | `stylebi-k6-testing/.github/workflows/` |
| `perf-release.yml`（L4 E1/Spike/Soak 手动触发） | `stylebi-k6-testing/.github/workflows/` |
| `src/thresholds.ts`（阈值配置，数值与 sla.md 同步） | `stylebi-k6-testing/src/` |
| `src/test-mt1.ts`（多租户场景） | `stylebi-k6-testing/src/` |
| `src/test-spike.ts`（Spike 冲击） | `stylebi-k6-testing/src/` |
| `src/test-soak.ts`（Soak 长稳） | `stylebi-k6-testing/src/` |

---

## 整体时间线

```
Week 1-2   阶段 1：基线跑测 → 标定 SLA 阈值 → k6 thresholds 接入
           （并行）L1：场景分析已完成 ⏸ 暂缓实现，待 bug 修复后推进
           （并行）L2：场景分析已完成 ⏸ 暂缓新增，待 bug 修复后推进

Week 3     阶段 1：Prometheus scrape 配置 + Grafana JVM 面板 + SLA 文档

Week 4-5   阶段 2：Playwright 渲染测试 P1/P2/P3 + perf-utils
Week 6-7   阶段 2：k6 MT1 + Spike + Soak 脚本
Week 8     阶段 3：GitHub Actions 三个 workflow（含 L1/L2 bench 接入）
Week 9     阶段 3：InfluxDB 写入脚本 + Grafana 趋势看板
Week 10    收尾：Release 健康卡片脚本 + Runbook 文档
```

---

## 验收标准

### 体系级验收（阶段 3 完成后）

- [ ] PR 合并前自动运行 L1+L2+L3 smoke，有 pass/fail 结论，不靠人工判断
- [ ] Nightly 自动运行 L3 full + L4 标准场景，结果写入 InfluxDB
- [ ] Grafana 趋势看板可看到至少 30 天的 p95 历史曲线
- [ ] Release 前可一键生成性能健康卡片
- [ ] Soak 2h 跑完后服务端监控无异常趋势（内存/线程/错误率）

### 场景级验收

- [ ] L1：⏸ 暂缓——场景分析已完成，待 bug 修复后实现 bench 并建立基线
- [ ] L2：⏸ 暂缓——`it.fails` 测试在对应 Bug 修复后全部转为 `it`（#75500 restoreExpandedState、#75503 trackByIdx）
- [ ] L3：树加载、Dashboard 渲染、LCP 均有自动阈值判定
- [ ] L4：D1/D2/D3 配置 thresholds，WS 成功率 >99%，HTTP 错误率 <1%

---

## 附录：关键文件路径速查

```
性能测试体系：
  docs/performance/sla.md                    # 统一 SLA 阈值表
  docs/performance/baseline-{date}.json      # 基线跑测结果
  docs/performance/output-format.md          # 结果输出格式规范

k6 项目（stylebi-k6-testing）：
  src/thresholds.ts                          # 集中阈值配置
  src/test-d1.ts / d2 / d3 / e1             # 现有场景（引入 thresholds）
  src/test-mt1.ts                            # 新增：多租户
  src/test-spike.ts                          # 新增：Spike 冲击
  src/test-soak.ts                           # 新增：Soak 长稳

Playwright 性能测试：
  e2e/tests/performance/helpers/perf-utils.ts
  e2e/tests/performance/tree-load.perf.ts
  e2e/tests/performance/dashboard-render.perf.ts
  e2e/tests/performance/page-lcp.perf.ts

CI/CD：
  .github/workflows/perf-pr.yml
  .github/workflows/perf-nightly.yml
  .github/workflows/perf-release.yml

监控：
  monitoring/prometheus.yml
  monitoring/grafana/jvm-dashboard.json
  monitoring/grafana/perf-trend.json

脚本：
  scripts/parse-perf-results.ts
  scripts/generate-perf-report.ts

