# SubjectAreas 测试分析文档

> **分析目标**：验证 SubjectAreas 5 大核心能力
> **核心文件**：
> - Prompt: `server/prompts/subjectAreas/querySubjectAreas.prompt`
> - Tool: `server/src/tools/retrieval/getSubjectArea.ts`
> - Node: `server/src/agents/chatAgent/nodes/subjectAreas.ts`
> - Notebook: `experiment/notebooks/subjectArea/querySubjectAreas.ipynb`
> - Notebook: `experiment/notebooks/subjectArea/historyEnhancedSubjectAreas.ipynb`

---

## 系统架构速览

```
用户问题
  │
  ├─── [并行] getSimpleSubjectArea()    ──→ querySubjectAreas.prompt → YAML 解析
  └─── [并行] getCompletedQuery()       ──→ completeQueryByHistory.prompt（有历史时）
         │
         ▼
   有 explicitly_mentioned=true？
         ├── YES → 直接返回（Fast Path）
         └── NO  → getEnhancedSubjectAreas()（Enhanced Path）
                      ├── 有历史 → 用 completedQuery 重新调用 getSimpleSubjectArea()
                      ├── 再检查 explicitly_mentioned=true → 返回
                      ├── 有 contextType（且在已处理类型中）→ 按 context 过滤 SubModule
                      └── 无匹配 → 按 Module/SubModule 优先级排序，取 Top 1
```

**ContextType 完整映射表**（来自 `shared/types/contextMap.ts`）：

| UI contextType | 内部字符串 | 代码层过滤逻辑 | 备注 |
|---------------|-----------|--------------|------|
| chart | "visualization dashboard chart" | submodule 含 "chart" | 支持 others 回退 |
| crosstab | "visualization dashboard crosstab" | submodule 含 "crosstab" | 支持 others 回退 |
| table | "visualization dashboard table" | submodule 含 "table" | ⚠️ 代码层未排除 freehand table（见风险说明）；支持 others 回退 |
| freehand | "visualization dashboard freehand table" | submodule 含 "freehand" | 支持 others 回退 |
| worksheet | "data worksheet" | module 含 "worksheet" | 无 others 回退，不命中则透传 |
| dashboard | "visualization dashboard" | 无代码层过滤 | 直接走优先级排序 |
| portal | "portal data" | 无代码层过滤 | 直接走优先级排序；LLM 会感知并返回 Portal 相关模块 |
| em | "enterprise manager" | 无代码层过滤 | 直接走优先级排序；EM 优先级最低（score=2） |
| scheduleTask | "schedule task" | 无代码层过滤 | 影响 LLM 返回 Portal/EM > scheduled task；代码层无对应分支，走优先级排序（见风险说明） |
| dashboardPortal | "pinned dashboard" | 无代码层过滤 | 影响 LLM 返回 Dashboard 相关；代码层无对应分支，走优先级排序 |
| (空/undefined) | — | 跳过整个 context 过滤块 | 直接走优先级排序；兜底模块为 "Dashboard" |

> **⚠️ 代码层 table 过滤 Bug**：`getEnhancedSubjectAreas` 中 table 分支使用 `includes("table")` 进行匹配，
> 会命中 "freehand table"。而 `isModuleMatchingContext` 函数则正确加了 `&& !includes("freehand")` 排除。
> 两处逻辑不一致，实际执行 context 过滤时 freehand table 可能被误纳入 table 结果。

---

## 能力一：Module 识别正确

### 规则梳理

| Module | 关键触发词/场景 | 强制性 |
|--------|--------------|--------|
| Dashboard | 可视化、展示、排序、聚合、格式化 | 默认优先 |
| Data Worksheet | 数据建模、关系、预处理、变量、命名分组（Named Grouping） | 中等 |
| Portal | Join/Link、数据类型变更（双路径触发）、数据源/数据模型/VPM | 强制（双路径）|
| Enterprise Manager | 权限/用户/角色/组/审计/系统配置 | **强制覆盖**（忽略问题中其他组件）|

### 风险点

- **EM 强制覆盖**：若问题中同时出现 EM 操作词和 Dashboard 组件名，LLM 可能仍返回 Dashboard，需验证覆盖是否生效
- **Portal 双路径**：Join 场景必须同时返回 `Data Worksheet` 和 `Portal > data model`，漏返任一即为失败

---

## 能力二：SubModule 识别正确

### SubModule 完整清单与识别依据

| SubModule | 归属 Module | 识别依据 | 易混淆点 |
|-----------|-----------|---------|---------|
| chart | Dashboard | 图表类型名（bar/pie/map/gantt/funnel/heatmap）；Axis/Legend/Plot/Target Line/Series | 通用"可视化"词不触发 |
| table | Dashboard | "表格"+"明细"+"隐藏列"+"Form 编辑" | 与 Worksheet data block 易混 |
| crosstab | Dashboard | "透视表"/"交叉制表"/"行列分组"/"Grand Total" | Worksheet 也有 crosstab 格式，需结合 context |
| freehand table | Dashboard | "自由布局"/"自定义表"/"非标准结构表" + cell formula/cell binding | |
| trend&comparison | Dashboard | YoY/MoM/同比/环比/趋势分析/比较分析（**严格触发**）| 时间序列/日期字段**不触发** |
| others | Dashboard | Gauge/Calendar/Slider/Selection/Checkbox/RadioButton/Spinner/Form | |
| data block | Data Worksheet | 数据块/联合/交集/差集/合并/镜像/旋转/条件/表达式列 | |

### 风险点

- **trend&comparison 严格性**：`"show data over time"` 不应触发，`"trend analysis"` 必须触发
- **others 的 Context 回退**：`others` 在代码层会按 contextType 回退为对应子模块，需验证该逻辑正常运行
- **freehand vs table**：问题含 "Table Style" 单独出现时，不应视为显式提及 `table`

---

## 能力三：explicitly_mentioned 判断正确

### 判断规则（来自 Prompt）

```
explicitly_mentioned = true 触发条件（满足任一）：
  1. 直接提及模块/组件名称，且该组件是操作目标
  2. 出现模块独占概念（见下表）
  3. 强制触发词：trend analysis / YoY / MoM / period-over-period

explicitly_mentioned = false 条件（需同时满足全部）：
  1. 未提及任何模块名
  2. 未提及任何独占概念
  3. 模块仅从通用行为推断

特殊例外：
  - "Table Style" 单独出现 → 不视为 table 的 explicit
  - 权限类问题含组件名 → EM 相关 explicit=true，其他组件 explicit 应被忽略
```

### chart 独占概念列表（触发 explicit=true）

`Axis`、`x-axis`、`y-axis`、`Legend`、`Plot`、`Target Line`、`Series`、`bar chart`、`pie chart`、`map`、`heatmap`、`gantt`、`funnel`、`line chart`

### freehand table 独占概念列表（触发 explicit=true）

`cell formula`（单元格级别公式，非系统全局公式）、`cell binding`、`free layout cell grouping`

### 已知历史 BUG（Notebook 观察）

在旧版 `historyEnhancedSubjectAreas.ipynb` 中：
- 问题 `"how to change axis color"` 返回 `explicitly_mentioned: false`
- **当前 Prompt 已修正**：axis 现为 chart 的独占概念，应返回 `true`
- **回归测试必须覆盖此用例**，确认修复生效

---

## 能力四：Prompt 规则是否生效

### 4.1 Group / Aggregate 多模块强制规则

**规则**：检测到 Group 或 Aggregate → 必须同时返回 chart + crosstab + freehand table + Data Worksheet，并**排除** table

### 4.2 Table 双模块原则

**规则**：无上下文时，"table" 同时归属 Dashboard > table 和 Data Worksheet
- 关键词 "layout" → 倾向 Dashboard > table
- 关键词 "cleansing" → 倾向 Data Worksheet

### 4.3 Total / Sorting 规则

- `totals` / `Grand Total` → 包含 crosstab 和 freehand table，**排除** Dashboard > table
- `sort a list` → 包含 table、crosstab、freehand table

### 4.4 trend&comparison 严格性 + 并行提取

- YoY / MoM / period-over-period → **必须**触发 trend&comparison
- "show data over time" / "time series" → **不触发** trend&comparison
- trend&comparison 触发时，并行返回其他相关子模块（chart、crosstab 等）

### 4.5 Join / Data Type 双路径强制规则

- Join / Link → 同时返回 Data Worksheet + Portal > data model，两者 explicit 均为 true
- 数据类型变更 → 同时返回 Data Worksheet + Portal > data model

### 4.6 Concatenation 规则

- union / intersection / minus（差集）操作 → 归属 Data Worksheet > data block，explicit=true

### 4.7 ZERO-MATCH 兜底规则

- 有 contextType（且在已处理类型 chart/crosstab/table/freehand/worksheet 中）→ 返回对应 contextType 的 subjectArea，explicit=false
- 有 contextType 但不在已处理类型中（如 portal/em/scheduleTask/dashboardPortal/dashboard）→ 走优先级排序兜底
- 无 contextType 时 → 返回 `{Dashboard, explicit=false}` 作为兜底

---

## 能力五：Code 层增强逻辑是否正确

### 5.1 Fast Path：explicitly_mentioned=true 直接返回

**逻辑**：只要结果中存在 ≥1 个 `explicitly_mentioned=true` 的项，立即返回，不进入 Enhanced Path

**关键验证点**：
- 有历史对话时，history 不应覆盖 explicit 结果
- trend&comparison 触发时，parallel 规则追加的 chart/crosstab 不应被过滤

### 5.2 Enhanced Path：Context 过滤逻辑

**逻辑**：无 explicit 时，按 contextType 在 LLM 结果中过滤匹配的 submodule

**有代码层过滤分支的 contextType**：

| contextType | 过滤条件 | 无匹配时的 others 回退 |
|-------------|----------|----------------------|
| chart | submodule 含 "chart" | 推断为 `Dashboard > chart` |
| crosstab | submodule 含 "crosstab" | 推断为 `Dashboard > crosstab` |
| freehand | submodule 含 "freehand" | 推断为 `Dashboard > freehand` |
| table | submodule 含 "table"（⚠️ 实际会命中 freehand table，见 Bug 说明）| 推断为 `Dashboard > table` |
| worksheet | module 含 "data worksheet" 或 "worksheet" | 无回退，直接透传原结果按优先级排序 |

**无代码层过滤分支（透传到优先级排序）**：

| contextType | 内部字符串 | 实际行为 |
|-------------|-----------|---------|
| dashboard | "visualization dashboard" | 无 if-else 分支命中 → 走优先级排序 |
| portal | "portal data" | 无 if-else 分支命中 → 走优先级排序 |
| em | "enterprise manager" | 无 if-else 分支命中 → 走优先级排序 |
| scheduleTask | "schedule task" | 无 if-else 分支命中 → 走优先级排序（Portal/EM 优先级最低，可能被 Dashboard 压过）|
| dashboardPortal | "pinned dashboard" | 无 if-else 分支命中 → 走优先级排序 |
| (空) | — | `parsedContext?.contextType` 为 false → 跳过整个过滤块 |

> **scheduleTask 关键风险**：scheduleTask 上下文会让 LLM 倾向返回 Portal > scheduled task 或
> EM > scheduled task，但代码层没有对应过滤分支，且 Portal/EM 在优先级排序中优先级最低（score=2），
> 若 LLM 同时返回 Dashboard 相关模块，Portal/EM scheduled task 可能被排在后面被过滤掉。

### 5.3 Enhanced Path：优先级排序（无 context 匹配时）

**Module 优先级**：Dashboard(0) > Data Worksheet(1) > Others(2)

**SubModule 优先级**（Dashboard 内）：chart(0) > crosstab(1) > freehand(2) > table(3) > others(4)

### 5.4 preferRewriteWithContext 标记

**逻辑**：context 过滤命中时设为 `true`，影响下游 retrieval 策略

| 场景 | preferRewriteWithContext |
|------|--------------------------|
| context 过滤命中（chart/crosstab/table/freehand/worksheet）| `true` |
| explicit=true（Fast Path）| `false`（Fast Path 不设置）|
| 无 context，优先级排序路径 | `false` |
| context=portal/em/scheduleTask/dashboardPortal/dashboard（无过滤分支）| `false` |

### 5.5 singleModules submodule 强制 undefined

**逻辑**：Data Worksheet、Portal、Enterprise Manager 的 submodule 在代码层强制设为 undefined

| LLM 返回 | 代码层输出 |
|---------|-----------|
| `{module: "Data Worksheet", subModule: "data block"}` | `{module: "Data Worksheet", submodule: undefined}` |
| `{module: "Portal", subModule: "data model"}` | `{module: "Portal", submodule: undefined}` |
| `{module: "Enterprise Manager", subModule: "administration"}` | `{module: "Enterprise Manager", submodule: undefined}` |

> **注意**：singleModules 的 submodule 虽然代码层为 undefined，但下游逻辑（retrieval 策略选择）仍需靠 module 名称区分。需确认 submodule=undefined 不会导致 retrieval 路由错误。

### 5.6 空结果兜底

- LLM 返回 `subjectAreas: []`，无 contextType → `[{module: "Dashboard", submodule: undefined, explicitly_mentioned: false}]`
- LLM 返回 `subjectAreas: []`，contextType=chart → `[{module: "visualization dashboard chart", submodule: undefined, explicitly_mentioned: false}]`

> **⚠️ 非标准 contextType 的兜底风险**：
> 代码为 `module: parsedContext?.contextType || vsModuleName`，当 LLM 返回空且 contextType 为
> `"schedule task"` 或 `"pinned dashboard"` 时，兜底 module 会被赋值为这些字符串（非标准模块名），
> 不匹配任何已知 Module（Dashboard/Data Worksheet/Portal/Enterprise Manager），可能导致下游路由异常。

---

## 综合场景分析

### 场景一：有历史对话，无显式指向

```
历史：
  Q: How to create a bar chart?
  A: ...
  Q: How to sort the chart data?
  A: ...

当前问题："How to change the color?"
contextType: —
```

| 验证点 | 期望值 |
|-------|-------|
| getCompletedQuery 输出 | "How to change the color in Dashboard chart"（history 推断） |
| getSimpleSubjectArea（原始问题）| 可能无 explicit |
| Enhanced Path 使用 completedQuery 重跑 | chart，explicit=false |
| 最终 subjectAreas | [Dashboard > chart] |
| preferRewriteWithContext | false（无 contextType）|

### 场景二：有 contextType，问题通用，有 others 命中

```
当前问题："How to configure this component?"
contextType: freehand（"visualization dashboard freehand table"）
```

| 验证点 | 期望值 |
|-------|-------|
| LLM 可能返回 | [{Dashboard > others, false}] |
| Context 过滤（freehand 分支）| 无 freehand submodule → 检查 others → 推断为 freehand |
| 最终 subjectAreas | [Dashboard > freehand] |
| preferRewriteWithContext | true |

### 场景三：显式 + trend 并行

```
当前问题："How to do YoY comparison in a crosstab?"
contextType: —
```

| 验证点 | 期望值 |
|-------|-------|
| explicit 结果 | crosstab（true）+ trend&comparison（true）|
| Fast Path 触发 | YES |
| 最终 subjectAreas | [Dashboard > crosstab, Dashboard > trend&comparison] |
| preferRewriteWithContext | false |

### 场景四：Enterprise Manager 强制覆盖

```
当前问题："How to set read permission for a chart dashboard?"
contextType: chart
```

| 验证点 | 期望值 |
|-------|-------|
| LLM 识别 | Enterprise Manager（permission 强制），不含 Dashboard |
| 代码层 Fast Path | EM 无 explicit（视具体 prompt 结果），可能走 Enhanced |
| 最终 subjectAreas | [Enterprise Manager]，不含 Dashboard > chart |
| contextType 的过滤影响 | 不应将 EM 过滤为 Dashboard > chart |

### 场景五：scheduleTask contextType

```
当前问题："How to configure an email notification for a task?"
contextType: scheduleTask（"schedule task"）
```

| 验证点 | 期望值 |
|-------|-------|
| LLM 识别 | Portal > scheduled task 或 Enterprise Manager > scheduled task |
| 代码层过滤 | scheduleTask 无对应分支 → filteredAreas 为空 → 走优先级排序 |
| 优先级排序 | Portal/EM score=2（最低）→ 若只有 Portal/EM，仍会返回 |
| 最终 subjectAreas | [Portal] 或 [Enterprise Manager]（取决于 LLM 输出和优先级） |
| preferRewriteWithContext | false（无过滤命中）|
| 潜在风险 | LLM 若同时返回 Dashboard 相关，Dashboard 优先级更高会压过 Portal/EM |

---

## 测试优先级矩阵

| 优先级 | 测试能力 | 原因 |
|-------|---------|-----|
| P0（必测）| explicitly_mentioned 正确性 | 直接影响 Fast/Enhanced 路径分支 |
| P0（必测）| trend&comparison 严格触发 | 历史高频错误，影响用户意图理解 |
| P0（必测）| Enterprise Manager 强制覆盖 | 权限相关逻辑错误后果严重 |
| P0（必测）| Axis 独占概念回归 | 已知历史 Bug（旧 notebook 返回 false）|
| P1（重要）| Group 多模块强制 | 规则复杂，LLM 容易漏返 |
| P1（重要）| Table 双模块原则 | 歧义场景高频出现 |
| P1（重要）| Context 过滤 + others 回退 | 代码层逻辑 |
| P1（重要）| preferRewriteWithContext 标记 | 影响 retrieval 策略 |
| P1（重要）| scheduleTask contextType 路径 | 无代码层过滤，依赖优先级排序，存在 Portal/EM 被压过风险 |
| P2（一般）| singleModules submodule 处理 | 代码层强制处理 |
| P2（一般）| 优先级排序 | 兜底路径 |
| P2（一般）| 空结果兜底（非标准 contextType）| 边界保护；scheduleTask/dashboardPortal 兜底 module 为非标准名 |
| P2（一般）| table context 过滤含 freehand table | 代码层 includes("table") 未排除 freehand table |

---

## 已知风险与关注点

| 风险 | 描述 | 影响级别 |
|-----|------|---------|
| Axis 回归 Bug | 旧 notebook 中 axis color 返回 explicit=false，当前 prompt 已修正，需回归验证 | High |
| trend&comparison 误触发 | 时间序列/日期字段可能被 LLM 误识别为 trend | High |
| Table Style 例外规则 | LLM 可能将 Table Style 误判为 table 的 explicit | Medium |
| EM 覆盖不彻底 | 含权限词但同时提及组件名，LLM 可能混合返回 Dashboard + EM | High |
| context 过滤截断 explicit | 若 explicit=true 的结果与 contextType 不匹配，Fast Path 应优先，不应被 context 截断 | High |
| singleModules submodule 丢失 | Portal 的 subModule（data model/VPM 等）在代码层被清空，下游可能无法区分 | Medium |
| Enhanced Path 的 completedQuery 质量 | 若 completedQuery 质量差，重跑 getSimpleSubjectArea 结果更差（噪声放大）| Medium |
| others 的 context 回退 | 代码中 `othersArea` 检测仅靠 submodule 含 "others" 字符串，若 LLM 返回其他描述则回退失效 | Medium |
| table context 过滤含 freehand table | `getEnhancedSubjectAreas` 用 `includes("table")` 过滤，会误命中 "freehand table"；与 `isModuleMatchingContext` 的逻辑不一致 | Medium |
| scheduleTask 上下文无代码过滤 | scheduleTask contextType 传入 LLM 可引导返回 Portal/EM scheduled task，但代码层无对应过滤分支，直接走优先级排序（Portal/EM 优先级最低），有被 Dashboard 压过的风险 | Medium |
| 非标准 contextType 的空结果兜底 | scheduleTask/dashboardPortal 上下文下 LLM 返回空时，兜底 module 值为 "schedule task"/"pinned dashboard"，不是合法 Module 名，可能导致下游路由错误 | Medium |
| dashboardPortal 无代码过滤 | dashboardPortal 上下文无专属过滤分支，依赖 LLM 感知和优先级排序，Dashboard 优先级最高（score=0），一般不会出错，但若问题涉及 Portal 功能则可能丢失 | Low |

---

# SubjectAreas 优化版回归测试集

## 目标
在保证 **高覆盖率** 的前提下减少冗余测试用例，用于验证：
- module 识别
- subModule 识别
- Enhanced Path 逻辑

优化原则：
- 一条规则只保留一个最具代表性的 case
- 删除仅关键词不同但逻辑相同的 case
- 保留复杂规则、异常规则以及历史 bug 回归场景

优化后总用例数：**14 条**

---

# 优化后的测试用例

| CaseID | 场景说明 | contextType | User Query | 预期 Module | 预期 SubModule（Enhanced 最终结果） | explicitly_mentioned | 验证目的 |
|------|------|------|------|------|------|------|------|
| OPT-01 | module 语义推断基础场景 | — | How to visualize data in a dashboard view? | Dashboard | chart | false | 验证在无 context 情况下的基础语义识别 |
| OPT-02 | module 与 subModule 同时显式提到 | dashboard | How to create a chart in the dashboard? | Dashboard | chart | true | 验证显式 module + subModule |
| OPT-03 | module 显式但 subModule 需要语义推断 | dashboard | How to change the color of this dashboard component? | Dashboard | chart | false | 验证组件语义推断 |
| OPT-04 | chart 独占概念识别 | chart | How to change the axis color? | Dashboard | chart | true | 验证 axis 等 chart 独占关键词 |
| OPT-05 | crosstab 显式识别 | crosstab | How to sort rows in a crosstab? | Dashboard | crosstab | true | 验证 crosstab 直接识别 |
| OPT-06 | Grand Total 规则 | — | How to display the Grand Total? | Dashboard | crosstab | false | 验证多组件冲突时的优先规则 |
| OPT-07 | freehand table 独占功能 | freehand | How to write a cell formula for custom calculation? | Dashboard | freehand table | true | 验证 freehand table 专属能力 |
| OPT-08 | others 组件识别 | dashboard | How to add a slider to filter data? | Dashboard | others | true | 验证非核心组件分类 |
| OPT-09 | table 双 module 规则 | — | How to create a table to display records? | Dashboard / Data Worksheet | table | true | 验证 table 同属两个 module |
| OPT-10 | trend 强关键词触发 | — | How to create a YoY comparison chart in a dashboard? | Dashboard | trend&comparison | true | 验证 YoY 触发趋势分析 |
| OPT-11 | trend 负例验证 | — | How to display monthly sales as a time series? | Dashboard | chart | false | 避免误判为 trend |
| OPT-12 | context 过滤 + fallback | freehand | How to configure this component? | Dashboard | freehand table | false | 验证 context filtering |
| OPT-13 | Enterprise Manager 覆盖规则 | chart | How to create a user role for the chart module? | Enterprise Manager | — | true | 验证 EM override |
| OPT-14 | 无匹配 fallback | — | What is the capital of France? | Dashboard | — | false | 验证完全无法识别时的 fallback |

---

# 覆盖范围总结

## Module 覆盖
- Dashboard
- Data Worksheet
- Enterprise Manager
- fallback

## SubModule 覆盖
- chart
- crosstab
- freehand table
- table
- trend&comparison
- others

## 核心识别逻辑
已覆盖：

- 显式识别
- 语义推断
- 独占关键词
- 多组件冲突规则
- context 过滤
- fallback 逻辑
- 负例验证

---

# 遗漏边界场景分析

> 基于现有 OPT-01 ~ OPT-14 测试集，分析在 **问题类型（why / what / how）** 与 **StyleBI 产品模块（Portal / Schedule / Composer）** 两个维度上的覆盖缺口。

---

## 一、问题类型（why / what / how）对 subjectArea 识别的影响

### 现状

OPT-01 ~ OPT-14 中 **所有 User Query 均以 "How to / How do I" 开头**，仅验证了操作指导类问题（how 类型）。

### 分析

SubjectArea 识别的目标是提取 **"问题涉及哪个模块/组件"**，而非理解问题的语法结构。因此理论上：

| 问题类型 | 示例 | 期望行为 |
|---------|------|---------|
| **how** | "How do I add a bar chart?" | → Dashboard > chart ✔ 已覆盖 |
| **what** | "What is a freehand table?" | → Dashboard > freehand table（概念类） |
| **why** | "Why is my crosstab showing wrong totals?" | → Dashboard > crosstab（诊断类） |
| **why（权限）** | "Why can't my users access the dashboard?" | → Enterprise Manager（EM 强制覆盖） |

### 关键风险

1. **"What" 概念类问题**：LLM 可能因缺乏操作动词而降低对模块的识别置信度，产生模糊输出或退化到 Dashboard fallback。
2. **"Why" 诊断类问题**：LLM 可能将诊断意图（可能同时触发 `need_report_issue=true`）与模块识别混淆，导致返回的 subjectArea 偏向 Dashboard fallback 而非具体子模块。
3. **"Why" 权限诊断问题**：例如 "Why can't I access...?" 涉及权限，应触发 EM 强制覆盖，但含有组件名时 LLM 可能返回 Dashboard + EM 混合结果。

---

## 二、StyleBI 产品模块覆盖分析

### 2.1 Portal 模块 — 完全未覆盖

现有测试集中 **无任何 Portal 模块的测试用例**。

| 缺失场景 | 说明 |
|---------|------|
| Portal 显式提及 | 用户明确提到 "Portal" 词语，应返回 `{Portal, explicitly_mentioned: true}` |
| Join / Link 双路径 | Join 操作必须同时返回 Data Worksheet + Portal（两者 explicit 均为 true），属于高优先级规则，当前无用例验证 |
| 数据类型变更双路径 | 数据类型变更（change data type / convert column type）同样触发双路径，当前无用例验证 |
| Portal singleModule submodule=undefined | Portal 的 LLM 返回 subModule（data model / VPM 等）在代码层被强制清为 undefined，可能影响下游路由 |

### 2.2 Schedule 模块 — 完全未覆盖

`scheduleTask` contextType 在 ContextType 完整映射表中存在，但 **OPT-01 ~ OPT-14 中无任何对应测试用例**。

| 缺失场景 | 说明 |
|---------|------|
| scheduleTask 上下文 + schedule 相关问题 | LLM 应识别 Portal > scheduled task 或 EM > scheduled task，但代码层无对应过滤分支，走优先级排序 |
| scheduleTask 上下文 + 通用问题（Dashboard 优先级更高风险） | 若问题不显式提及 schedule，LLM 同时返回 Dashboard 相关时，Dashboard 优先级（score=0）会压过 Portal/EM（score=2），导致 scheduled task 被过滤 |
| scheduleTask 空结果兜底 | LLM 返回空时，兜底 module 被赋值为 `"schedule task"`（非标准 Module 名），可能导致下游路由错误 |

### 2.3 Composer 模块分析

在 StyleBI 产品架构中，**Composer 是创建/编辑仪表板的设计工具**（对应 Dashboard 的设计视图）。
Composer 操作在 subjectAreas 体系中 **不是独立 Module**，映射到 `Dashboard` module：

- 用户在 Composer 中操作 Chart → contextType = `chart` / `dashboard`
- 用户在 Composer 中操作 Crosstab → contextType = `crosstab`
- Composer 特有的布局/组件编排操作 → contextType = `dashboard`

**现状**：Composer 相关场景通过 `dashboard` contextType 间接覆盖，但有以下边界缺口：

| 缺失场景 | 说明 |
|---------|------|
| Composer 布局/排版问题 | "How do I arrange components in my composer?" → 无具体组件名，仅 dashboard context，需验证不会误判为 chart/crosstab 等子模块 |
| dashboardPortal 上下文（Portal 中查看仪表板） | `dashboardPortal` contextType（"pinned dashboard"）无代码层过滤分支，走优先级排序，当前无测试用例 |

### 2.4 Data Worksheet 专项覆盖不足

现有测试集中 Data Worksheet 仅通过 OPT-09（table 双 module）隐性覆盖，以下专项场景缺失：

| 缺失场景 | 说明 |
|---------|------|
| data block 显式（union / intersection / minus） | Concatenation 规则：union/intersection/minus 操作 → Data Worksheet > data block，explicit=true |
| Named Grouping 识别 | Named Grouping 是 Data Worksheet 的专属概念，应触发 `{Data Worksheet, explicit=true}` |
| Worksheet 空 context 兜底 | contextType=worksheet 且 LLM 无命中 → 按文档规则透传（无 others 回退），需验证不崩溃 |

---

## 三、遗漏边界总结

| 维度 | 遗漏场景 | 优先级 |
|------|---------|--------|
| 问题类型 | "Why" 诊断类问题的 subjectArea 识别 | P1 |
| 问题类型 | "What" 概念类问题的模块识别 | P1 |
| 问题类型 | "Why" 权限问题触发 EM 强制覆盖 | P1 |
| Portal | Portal 显式识别 | P0 |
| Portal | Join/Link 双路径规则 | P0 |
| Portal | 数据类型变更双路径 | P1 |
| Portal | singleModule submodule=undefined | P2 |
| Schedule | scheduleTask 上下文 + schedule 相关问题 | P1 |
| Schedule | scheduleTask 上下文被 Dashboard 优先级压过（风险验证） | P1 |
| Schedule | scheduleTask 空结果兜底产生非标准 module 名 | P2 |
| Composer | Composer 通用布局问题（无组件名） | P2 |
| Composer | dashboardPortal 上下文走优先级排序 | P2 |
| Data Worksheet | data block union/intersection 显式识别 | P1 |
| Data Worksheet | Named Grouping 识别 | P1 |

---

# 补充测试用例（OPT-15 ~ OPT-28）

> 补充覆盖原测试集未触及的边界场景，包括 Portal / Schedule / Composer 模块以及 Why / What 问题类型。

| CaseID | 场景说明 | contextType | User Query | 预期 Module | 预期 SubModule（Enhanced 最终结果） | explicitly_mentioned | 验证目的 |
|--------|---------|-------------|------------|------------|----------------------------------|----------------------|---------|
| OPT-15 | Portal 显式提及 | portal | How do I access the data model in the Portal? | Portal | — | true | 验证 Portal 模块显式识别；singleModule submodule 代码层为 undefined |
| OPT-16 | Join 双路径规则 | — | How do I join two worksheets together using a common field? | Data Worksheet / Portal | — / — | true / true | 验证 Join 触发双路径：同时返回 Data Worksheet + Portal，两者 explicit 均为 true |
| OPT-17 | 数据类型变更双路径 | worksheet | How do I change the data type of a column from string to integer? | Data Worksheet / Portal | — / — | true / true | 验证数据类型变更触发双路径：同时返回 Data Worksheet + Portal |
| OPT-18 | scheduleTask 上下文 + schedule 显式问题 | scheduleTask | How do I configure an email notification for a scheduled task? | Portal | — | true | 验证 scheduleTask 上下文下 Portal/EM scheduled task 的识别；代码层无过滤分支，走优先级排序 |
| OPT-19 | scheduleTask 上下文 + 通用问题（Dashboard 压过风险） | scheduleTask | How do I configure the output format? | Dashboard | — | false | **风险验证**：schedule 上下文下通用问题，LLM 同时返回 Dashboard，Dashboard 优先级（score=0）可能压过 Portal（score=2），导致 scheduled task 被过滤 |
| OPT-20 | dashboardPortal 上下文（Composer → Portal 查看） | dashboardPortal | How do I view a report that has been pinned to the portal? | Dashboard | — | false | 验证 dashboardPortal contextType 无代码层过滤，走优先级排序；Dashboard 优先级最高，Portal 特有内容可能被忽略 |
| OPT-21 | Composer 通用布局问题（无组件名） | dashboard | How do I arrange and resize the components in my composer layout? | Dashboard | — | false | 验证 Composer 布局操作（无具体组件名）映射到 Dashboard module；不应误触发 chart/crosstab 等子模块 |
| OPT-22 | "Why" 问题 — 图表诊断 | chart | Why is my bar chart not displaying the correct total values? | Dashboard | chart | true | 验证 "Why" 诊断类问题仍能正确识别模块；"bar chart" 为显式提及，axis/chart 独占概念 |
| OPT-23 | "What" 问题 — 概念理解（双组件） | — | What is the difference between a crosstab and a freehand table in a dashboard? | Dashboard | crosstab / freehand table | true | 验证 "What" 概念类问题对多子模块的正确识别；两者均为 Dashboard 独占概念 |
| OPT-24 | "Why" 问题 — 权限诊断，EM 强制覆盖 | — | Why can't my team members access the dashboard I just published? | Enterprise Manager | — | true | 验证权限相关 "Why" 诊断问题触发 EM 强制覆盖，即使问题中包含 "dashboard" 组件名 |
| OPT-25 | Data Worksheet — data block 显式（union） | worksheet | How do I create a union between two data blocks in my worksheet? | Data Worksheet | — | true | 验证 Concatenation 规则：union 操作触发 Data Worksheet，explicit=true；singleModule submodule 代码层为 undefined |
| OPT-26 | Data Worksheet — Named Grouping 显式 | worksheet | How do I create a named group to categorize product values in my worksheet? | Data Worksheet | — | true | 验证 Named Grouping 触发 Data Worksheet 识别；Named Grouping 为 Data Worksheet 专属概念 |
| OPT-27 | Portal subModule 代码层强制 undefined | — | How do I update a VPM condition in the data model? | Portal | undefined（代码层强制） | true | 验证 singleModules 规则：LLM 返回 `{Portal, subModule: "data model"}` 后代码层将 subModule 强制清为 undefined |
| OPT-28 | scheduleTask 空结果兜底 — 非标准 module 名风险 | scheduleTask | What time is it? | scheduleTask（非标准 module 名） | — | false | **风险验证**：scheduleTask 上下文下 LLM 对完全无关问题返回空 subjectAreas 时，兜底 module 被赋值为 `"schedule task"`（非标准 Module 名），而非 Dashboard / Portal / Enterprise Manager，预期下游路由异常 |

---

## 补充用例覆盖说明

### 新增 Module 覆盖
- **Portal**：OPT-15、OPT-16、OPT-17、OPT-27
- **Schedule（scheduleTask）**：OPT-18、OPT-19、OPT-28
- **Composer（dashboardPortal / 通用 dashboard）**：OPT-20、OPT-21

### 新增问题类型覆盖
- **"Why" 诊断类**：OPT-22（图表）、OPT-24（权限/EM）
- **"What" 概念类**：OPT-23（双组件识别）

### 新增 Data Worksheet 专项覆盖
- **data block（union）**：OPT-25
- **Named Grouping**：OPT-26

### 风险场景验证（预期可能失败）
| CaseID | 风险描述 | 预期失败原因 |
|--------|---------|------------|
| OPT-19 | scheduleTask 上下文被 Dashboard 优先级压过 | Dashboard score=0 > Portal score=2，schedule task 可能被过滤 |
| OPT-20 | dashboardPortal 无专属代码过滤 | 依赖 LLM 感知 + 优先级排序，Portal 内容可能丢失 |
| OPT-28 | scheduleTask 空结果产生非标准 module 名 | 兜底逻辑将 contextType 字符串直接作为 module 名返回 |


