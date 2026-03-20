# SubjectArea 识别规则系统性分析文档(含测试用例集）

----

## Part A：SubjectArea 识别规则系统性分析文档
> 基于 `querySubjectAreas.prompt`、`completeQueryByHistory.prompt`、`getSubjectArea.ts` 的完整分析
> 生成日期：2026-03-17
> 测试目标字段：`module` / `subModule` / `explicitly_mentioned`

---

## 一、整体处理流程

```
用户 query
    │
    ├─── [并行执行] ──────────────────────────────────────────────────────┐
    │                                                                     │
    │  getSimpleSubjectArea(原始 query)              getCompletedQuery()  │
    │  → 调用 querySubjectAreas prompt               → 调用 completeQueryByHistory prompt
    │                                                → 返回 completedQuery
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
                │
                ▼
    findExplicitlyMentionedSubjectAreas()
                │
    ┌───────────┴────────────────────┐
    │ 存在 explicitly_mentioned=true │
    └──────────┬─────────────────────┘
               │ YES → 直接返回，跳过所有后续增强逻辑 ← [短路规则，优先级最高]
               │ NO  ↓
    getEnhancedSubjectAreas()（见第三节）
```

**关键点：** `explicitly_mentioned=true` 是整个流程的短路条件，一旦 LLM 输出中存在任何 true，则直接返回，不做任何增强。

---

## 二、模块与子模块总览

| Module | SubModule |
|--------|-----------|
| Dashboard | chart |
| Dashboard | table |
| Dashboard | crosstab |
| Dashboard | freehand table |
| Dashboard | trend&comparison |
| Dashboard | others |
| Data Worksheet | data block |
| Portal | data source connection, data model, VPM, data security, scheduled task, bookmark, viewer, data profiling report |
| Enterprise Manager | administration, scheduled task |

---

## 三、增强逻辑（getEnhancedSubjectAreas）

仅在 **无 explicitly_mentioned=true** 时执行。

### 流程

```
有 history?
    │
    │ NO  → 直接用 simpleOutput（不重新调用 LLM）
    │ YES → 用 completedQuery 重新调用 getSimpleSubjectArea
                │
                ▼
        新结果中存在 explicitly_mentioned=true?
                │ YES → 短路返回（同主流程）
                │ NO  ↓
        分离 trend/comparison areas（module 名含 "trend" 或 "comparison"）
                │
        存在 parsedContext.contextType?
                │ YES → 进入 contextType 过滤（见 3.1）
                │ NO  ↓
        优先级排序后取 top 1（见 3.2）
```

### 3.1 contextType 过滤规则

根据当前用户所在的模块上下文（`parsedContext.contextType`）过滤 subjectAreas：

| contextType | 保留条件 | "others" 回退 |
|------------|---------|--------------|
| worksheet | module 含 "data worksheet" 或 "worksheet" | 无 |
| freehand | submodule 含 "freehand" 或 "freehand table" | 若无匹配但存在 others → 插入 `{Dashboard, freehand}` |
| chart | submodule 含 "chart" | 若无匹配但存在 others → 插入 `{Dashboard, chart}` |
| crosstab | submodule 含 "crosstab" | 若无匹配但存在 others → 插入 `{Dashboard, crosstab}` |
| table | submodule 含 "table" 且不含 "freehand" | 若无匹配但存在 others → 插入 `{Dashboard, table}` |

**当 contextType 过滤成功（filteredAreas.length > 0）：**
- 若存在 trend/comparison area → 追加 `trendComparisonAreas[0]`
- 直接返回，不进行优先级排序

### 3.2 无 contextType 时的优先级排序

当 contextType 不存在或过滤结果为空时，对 non-trend areas 按以下优先级排序，**只取 top 1**：

**Module 优先级：**

| Module | 优先级分值 |
|--------|---------|
| Dashboard | 0（最高） |
| Data Worksheet | 1 |
| 其他（Portal、Enterprise Manager 等） | 2 |

**SubModule 优先级（仅在 Module 分值相同=0 时生效）：**

| SubModule | 优先级分值 |
|----------|---------|
| chart | 0 |
| crosstab | 1 |
| freehand / freehand table | 2 |
| table | 3 |
| 其他 | 4 |

**最终结果构成：**

```
resultAreas = [sortedNonTrendAreas[0]] + (trendComparisonAreas[0] if exists)
```

---

## 四、各 Module / SubModule 识别规则（Prompt 层）

### 4.1 Dashboard

**触发条件：** 涉及视觉展示、排序、聚合、格式化、命名分组。

---

#### Dashboard > chart

**Module-Exclusive Concepts（触发 explicitly_mentioned=true）：**
- Axis（x-axis, y-axis, axis color, axis format, axis label）
- Legend（图例）
- Plot（绘图区）
- Target Line（目标线）
- Series（系列）
- 图表类型名称：bar chart, pie chart, line chart, map, heatmap, Gantt, Funnel, scatter 等

**通用触发（explicitly_mentioned=false）：**
- group/aggregate 操作（必须包含 chart）

**边界：**
- Manual Sort 支持 chart（同时支持 crosstab 和 freehand table，非专属）

---

#### Dashboard > table

**识别关键词：** table、明细表、detail table

**支持特性：** 隐藏列、排序、Table Style、Form 编辑

**强制排除场景：**
- query 含 "table" + ("Group" 或 "Aggregate") → **必须排除**
- query 含 "Total" → **必须排除**

**边界：**
- "Table Style" 单独出现 → **不触发** explicitly_mentioned=true
- "Table" 单独出现（无上下文）→ 必须同时返回 Dashboard>table 和 Data Worksheet（双模块原则）

---

#### Dashboard > crosstab

**识别关键词：** crosstab、pivot table、交叉表、透视表

**支持特性：** 行/列分组、Ranking、Sorting（Manual Sort）、Total、Grand Total、并排聚合、Table Style

**特殊规则：**
- Worksheet 和 Dashboard 都能创建 crosstab
- 根据 query 中提到的 module 和 current module 决定哪个 explicitly_mentioned=true

---

#### Dashboard > freehand table

**Module-Exclusive Concepts（触发 explicitly_mentioned=true）：**
- Cell formula（单元格级别公式，区别于系统级公式）
- Cell binding（单元格绑定）
- Free layout cell grouping（自由布局分组）

**通用识别：** freehand table、custom table（自定义布局）、复杂不规则结构表格

**支持特性：** 单元格公式绑定、单元格分组、插入行列、灵活布局、Table Style、Named grouping、Manual Sort

---

#### Dashboard > trend&comparison

**触发条件（极严格，满足之一才触发）：**
- 明确提及趋势分析 (trend analysis)
- YoY（同比）、MoM（环比）、period-over-period

**绝对禁止触发（单独出现不触发）：**
- 时间序列 (time series)
- 日期/时间字段 (date/time fields)
- 连续时间 (continuous time)
- "as time series"
- 任何隐含时间语义

**当触发时：**
- 在已有基础组件之外**额外追加**（并行追加规则）
- explicitly_mentioned=true

---

#### Dashboard > others

**触发条件：** 用户明确提及以下任一组件：
Gauge、Calendar、Slider、Selection List、Selection Tree、RadioButton、Checkbox、Combobox、TextInput、Spinner、Form Component、Variable

**规则：** 明确提及 → explicitly_mentioned=true

---

### 4.2 Data Worksheet

**触发条件：** 底层数据建模、关系、数据预处理、变量、Named Grouping（可复用分组 Assembly）。

**data block 触发关键词：**
- data block、数据准备 (data preparation)
- mirror、rotate
- condition in data preparation
- expression column / formula column（≠ freehand table cell formula）
- union、intersection、minus/difference
- combine data blocks / merge data blocks
- order of concatenation

**Named Grouping 归属说明：**
- Named Grouping = 用户定义的可复用自定义条件分组（作为 Worksheet Assembly）→ Data Worksheet
- Dashboard 内数据分组 → 对应 Dashboard subModule

---

### 4.3 Portal

| SubModule | 触发场景 |
|-----------|---------|
| data source connection | 创建/编辑/连接数据源 |
| data model | 数据模型、Physical View、Join/Link、Data Type 修改 |
| VPM | Virtual Private Model 操作 |
| data security | 数据层安全设置 |
| scheduled task | 用户级调度任务 |
| bookmark | 书签功能 |
| viewer | 查看器操作 |
| data profiling report | 数据分析报告 |

---

### 4.4 Enterprise Manager

**强制触发规则（覆盖所有其他规则，忽略 query 中的其他模块提及）：**

| 触发场景 | SubModule |
|---------|-----------|
| 创建/编辑/删除 role / group / user / organization | administration |
| 管理 group/role/organization 成员 | administration |
| 任何 permission（权限）相关操作 | administration |
| audit records（审计记录）操作 | administration |
| 管理系统资源、系统样式、系统配置的管理员操作 | administration |
| 系统级调度任务管理 | scheduled task |

---

## 五、`explicitly_mentioned` 判定规则

### 5.1 = true 的触发条件（满足任一即为 true）

#### 条件 1：直接提及模块/组件名称
用户直接说出模块或组件名称，且该模块是操作的直接目标。

| 示例 | 命中 |
|------|------|
| "modify this chart" | Dashboard > chart, true |
| "create a crosstab" | Dashboard > crosstab, true |
| "edit the dashboard table" | Dashboard > table, true |

#### 条件 2：出现模块专属概念（Concept-Explicit）

**专属概念判断标准（需同时满足）：**
1. 该概念主要且唯一关联某个 SubjectArea
2. 该概念不是适用于多个模块的通用概念

| 专属概念 | 所属 SubjectArea |
|---------|-----------------|
| Axis / Legend / Plot / Target Line / Series | Dashboard > chart |
| 图表类型（bar, pie, map, heatmap...） | Dashboard > chart |
| Cell formula（单元格级别） | Dashboard > freehand table |
| Cell binding | Dashboard > freehand table |
| Free layout cell grouping | Dashboard > freehand table |

#### 条件 3：Mandatory Trigger Terms（强制触发词）

| 触发词 | 强制映射 | explicitly_mentioned |
|-------|---------|---------------------|
| trend analysis / YoY / MoM / period-over-period | Dashboard > trend&comparison | true |
| union / intersection / minus / difference / concatenation / combine/merge data blocks | Data Worksheet > data block | true |
| Join / Link / Connection between tables / Data Block Join | Data Worksheet + Portal > data model | true（两者） |
| 在 source/prep 层修改字段类型 | Portal > data model + Data Worksheet | true（两者） |

---

### 5.2 = false 的触发条件（必须同时满足全部）

1. 用户**没有**提及模块名称
2. 用户**没有**提及任何模块专属概念
3. 模块是**仅从通用行为/动作/结果**推断出的

#### 典型 false 场景

| 场景 | 推断模块 |
|------|---------|
| "如何对数据排序" | Dashboard 多个 subModule |
| "怎么添加聚合" | chart + crosstab + freehand table + Data Worksheet |
| "如何分组" | 同上 |
| "如何创建 table"（无上下文） | Dashboard>table + Data Worksheet |

---

### 5.3 特殊例外

| 例外 | 规则 |
|------|------|
| "Table Style" 单独出现 | 不触发 explicitly_mentioned=true |
| Enterprise Manager 场景中出现 chart/table 等 | 忽略，EM 规则覆盖，只有 EM 本身为 true |
| Crosstab 跨模块 | 根据 query 中的 module 和 current module 决定哪个 true |

---

## 六、特殊复合规则

### 规则 A：Group / Aggregate 强制多返回

**触发词：** group, grouping, aggregate, aggregation

**必须返回（缺一不可）：**
- Data Worksheet
- Dashboard > chart
- Dashboard > crosstab
- Dashboard > freehand table

**explicitly_mentioned：** 全部 false（除非 query 同时明确提及这些组件名）

**排除：** 若同时提及 "table" + group/aggregate → 排除 Dashboard > table

---

### 规则 B："Table" 双模块原则

**触发：** 提及 "creating/using a table"，无明确上下文

**必须同时返回：**
- Dashboard > table
- Data Worksheet

**上下文消歧：**

| 关键词 | 优先归属 |
|-------|---------|
| embedded, style, page, layout | Dashboard |
| data processing, raw data, cleansing | Data Worksheet |
| 50/50 | 以 chat history 出现的模块为其中之一 |

---

### 规则 C：Total 规则

**触发词：** total, grand total

**必须：** 排除 Dashboard>table，包含 crosstab + freehand table

**explicitly_mentioned：** 未明确提及具体组件时 → false

---

### 规则 D：List / Sorting（无 Group/Total）

包含：Dashboard>table + crosstab + freehand table

---

### 规则 E：Trend/Comparison 并行追加

在已识别基础组件之外，额外追加 `{Dashboard, trend&comparison, explicitly_mentioned=true}`

---

### 规则 F：Filter / Condition 双路径

| 上下文 | 归属 |
|-------|------|
| 涉及交互（user interaction） | Dashboard |
| 涉及数据过滤（data filtering） | Data Worksheet |

---

### 规则 G：as time series 处理

识别 subjectAreas 与 "group date" 相同（Data Worksheet + chart + crosstab + freehand table），但**不触发** trend&comparison

---

### 规则 H：Join/Link 强制双返回

**触发词：** Join, Link, Connection between tables, Data Block Join

**必须返回：** Data Worksheet + Portal > data model

两者 explicitly_mentioned=true

---

### 规则 I：Data Type 强制双返回

**触发：** 在 source/prep 层修改字段类型

**必须返回：** Portal > data model + Data Worksheet

两者 explicitly_mentioned=true

---

### 规则 J：Concatenation 强制返回

**触发词：** concatenation, union, intersection, minus, difference, combine/merge data blocks

**必须返回：** Data Worksheet > data block，explicitly_mentioned=true

---

## 七、容易混淆的边界

### 7.1 table vs crosstab vs freehand table

| 特征 | table | crosstab | freehand table |
|------|-------|----------|----------------|
| 支持 Group/Aggregate | ❌ | ✅ | ✅ |
| 支持 Total/Grand Total | ❌ | ✅ | ✅ |
| 支持 Manual Sort | ❌ | ✅ | ✅ |
| 支持 Table Style | ✅ | ✅ | ✅ |
| 支持 Cell Formula（专属） | ❌ | ❌ | ✅ |
| 支持 Form 编辑 | ✅ | ❌ | ❌ |
| 自由布局 | ❌ | ❌ | ✅ |
| Named Grouping | ❌ | ❌ | ✅ |

### 7.2 trend&comparison vs time series

| 用户表达 | 触发 trend&comparison |
|---------|---------------------|
| "YoY growth" | ✅ true |
| "MoM comparison" | ✅ true |
| "trend analysis of sales" | ✅ true |
| "show as time series" | ❌ 否 |
| "group by date" | ❌ 否 |
| "continuous time axis" | ❌ 否 |

### 7.3 Portal scheduled task vs Enterprise Manager scheduled task

| 场景 | 归属 |
|------|------|
| 用户管理自己的调度任务 | Portal > scheduled task |
| 系统级/管理员调度任务 | Enterprise Manager > scheduled task |

### 7.4 Data Worksheet crosstab vs Dashboard crosstab

| 场景 | explicitly_mentioned=true 归属 |
|------|-------------------------------|
| 用户明确说"Dashboard 的 crosstab" | Dashboard > crosstab |
| 用户明确说"Worksheet 的 crosstab" | Data Worksheet |
| current module = Dashboard，模糊提及 crosstab | Dashboard > crosstab |
| 两者都不明确 | 需结合 current module 判断 |

### 7.5 Named Grouping 归属

| 上下文 | 归属 |
|-------|------|
| 可复用的、独立的命名分组 Assembly | Data Worksheet |
| Dashboard crosstab 的行列分组（数据分组） | Dashboard > crosstab |
| freehand table 内的分组 | Dashboard > freehand table |

### 7.6 Permission / Enterprise Manager 覆盖

只要操作涉及权限、角色、用户、组织、审计，无论 query 中提到多少其他模块（chart, table 等），都**必须**归属 Enterprise Manager，**忽略**其他模块提及。

---

## 八、测试用例设计维度

### 维度 1：单模块直接命中（explicitly_mentioned=true）
- Dashboard 每个 subModule 至少一条直接命名用例
- 验证短路路径：有 true → 不进入增强逻辑

### 维度 2：explicitly_mentioned=false 推断场景
- 通用操作词（group, sort, filter）无具体组件名
- 验证正确归属且 explicitly_mentioned=false

### 维度 3：多模块并发返回
- Group/Aggregate → 4 个 subjectArea
- Join/Link → 2 个（Data Worksheet + Portal）
- Total → 2 个（crosstab + freehand table）
- Table 无上下文 → 2 个（Dashboard>table + Data Worksheet）
- Trend + 图表 → 基础组件 + trend&comparison

### 维度 4：排除规则验证
- Table + Group → 无 Dashboard>table
- Total → 无 Dashboard>table
- "as time series" → 无 trend&comparison
- EM 场景中有 chart/table 提及 → 无 Dashboard/Worksheet 结果

### 维度 5：Module-Exclusive Concepts
- Axis/Legend → chart, true，短路
- Cell formula → freehand table, true，短路
- YoY/MoM → trend&comparison, true
- Union/Intersection → Data Worksheet > data block, true

### 维度 6：增强逻辑 - contextType 过滤
- contextType=chart，LLM 返回 [chart, crosstab] → 只剩 chart
- contextType=freehand，LLM 返回 [crosstab] → 过滤空，不触发 others 回退
- contextType=worksheet，LLM 返回 [chart, Data Worksheet] → 只剩 Data Worksheet
- contextType 匹配成功 + trend 存在 → 结果包含 trend

### 维度 7：增强逻辑 - 优先级排序
- 无 contextType，LLM 返 [Portal, Data Worksheet, Dashboard>chart] → 只取 Dashboard>chart
- 无 contextType，LLM 返 [Dashboard>table, Dashboard>crosstab] → 只取 crosstab（优先级高）
- 无 contextType，LLM 返 [chart, trend&comparison] → [chart, trend&comparison]

### 维度 8：history 相关
- 有 history → 用 completedQuery 重新调用，可能产生不同 subjectAreas
- 无 history → 直接用 simpleOutput，不重新调用

---

## 九、完整优先级总结

```
优先级 1（最高）：explicitly_mentioned=true 短路规则
  → 存在任一 true → 立即返回，跳过所有增强

优先级 2：Enterprise Manager 强制覆盖（Prompt 层）
  → 权限/用户/角色/组织/审计 → 强制 EM，忽略其他模块

优先级 3：Mandatory Trigger Terms（Prompt 层）
  → trend/YoY/MoM → trend&comparison (true)
  → Join/Link → Data Worksheet + Portal (true)
  → Data Type → Portal + Data Worksheet (true)
  → union/intersection/minus → Data Worksheet > data block (true)

优先级 4：Module-Exclusive Concept 检测（Prompt 层）
  → 专属概念出现 → 对应 subModule, true

优先级 5：直接模块名称提及（Prompt 层）
  → 用户说出模块/组件名 → true

优先级 6：特殊复合规则（Prompt 层）
  → Group/Aggregate / Total / Table 双模块等

优先级 7：contextType 过滤（代码层增强）
  → 按当前上下文收窄结果

优先级 8（最低）：优先级排序取 top 1（代码层增强）
  → Dashboard > Worksheet > 其他
  → chart > crosstab > freehand > table > others
```

## Part B：SubjectArea 识别规则测试用例集

> 基于 `subjectArea-rule-analysis.md` 生成
> 生成日期：2026-03-18
> 测试目标：验证 LLM 返回的 `module` / `subModule` / `explicitly_mentioned` 是否正确
> **说明：若测试走增强逻辑（原始 LLM 输出无 explicitly_mentioned=true），预期结果为增强后的最终输出**

---

| CaseID | 用户问题                                                                                                                                                     | contextType  | 预期 subjectAreas                                                                                                                                            | 实际意图（验证规则）                                                                                                                                                              |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| TC-001 | "How do I modify the chart color?"                                                                                                                       | portal       | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim1** 直接提及模块名 "chart"，触发 explicitly_mentioned=true，短路返回                                                                                                              |
| TC-002 | "Create a crosstab to show sales by region and month"                                                                                                    | dashboard    | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: true                                                                                     | **Dim1** 直接提及 "crosstab"，短路返回                                                                                                                                           |
| TC-003 | "How do I hide a column in the dashboard table?"                                                                                                         | portal       | module: Dashboard<br>subModule: table<br>explicitly_mentioned: true                                                                                        | **Dim1** "dashboard table" 明确指向 Dashboard>table 组件，explicitly_mentioned=true                                                                                            |
| TC-004 | "I want to build a freehand table for a non-standard layout"                                                                                             | em           | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: true                                                                               | **Dim1** 直接提及 "freehand table"                                                                                                                                          |
| TC-005 | "I need to add a Gauge to track the sales KPI"                                                                                                           | dashboard    | module: Dashboard<br>subModule: others<br>explicitly_mentioned: true                                                                                       | **Dim1** Gauge 是 Dashboard>others 的明确组件，explicitly_mentioned=true                                                                                                       |
| TC-006 | "How do I insert a Slider for date range filtering?"                                                                                                     | dashboard    | module: Dashboard<br>subModule: others<br>explicitly_mentioned: true                                                                                       | **Dim1** Slider 明确触发 Dashboard>others                                                                                                                                   |
| TC-007 | "I want to build a heatmap to visualize correlations between variables"                                                                                  | dashboard    | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim1** 图表类型名 "heatmap" 触发 chart，explicitly_mentioned=true                                                                                                             |
| TC-008 | "How do I change the x-axis label format?"                                                                                                               | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim5** Axis 是 Dashboard>chart 的专属概念，未提及 "chart" 名称，依然 explicitly_mentioned=true                                                                                       |
| TC-009 | "How do I move the legend to the bottom of the visualization?"                                                                                           | dashboard    | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim5** Legend 是 Dashboard>chart 专属概念，未提及 "chart" 名，仍为 true                                                                                                            |
| TC-010 | "I want to add a target line at 100 to show my monthly quota"                                                                                            | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim5** Target Line 是 chart 专属概念                                                                                                                                       |
| TC-011 | "How do I change the series colors to match the brand palette?"                                                                                          | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true                                                                                        | **Dim5** Series 是 chart 专属概念                                                                                                                                            |
| TC-012 | "如何在单元格中写 cell formula 来计算累计求和？"                                                                                                                         | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: true                                                                               | **Dim5** cell formula 是 freehand table 的专属概念（区别于系统级公式），explicitly_mentioned=true                                                                                        |
| TC-013 | "How to set up cell binding to display data from a specific field?"                                                                                      | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: true                                                                               | **Dim5** cell binding 是 freehand table 专属概念                                                                                                                             |
| TC-014 | "How to configure free layout cell grouping for the custom header section?"                                                                              | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: true                                                                               | **Dim5** free layout cell grouping 是 freehand table 专属概念                                                                                                                |
| TC-015 | "I need a month-over-month comparison of this quarter's sales figures"                                                                                   | dashboard    | module: Dashboard<br>subModule: trend&comparison<br>explicitly_mentioned: true                                                                             | **Dim1/Mandatory** MoM 强制触发 trend&comparison=true                                                                                                                       |
| TC-016 | "Show period-over-period analysis comparing Q1 versus Q2 performance"                                                                                    | dashboard    | module: Dashboard<br>subModule: trend&comparison<br>explicitly_mentioned: true                                                                             | **Dim1/Mandatory** period-over-period 强制触发 trend&comparison=true                                                                                                        |
| TC-017 | "我想对两个数据集做 union 操作"                                                                                                                                     | dashboard    | module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true                                                                              | **Dim1/Mandatory** union 强制触发 Data Worksheet>data block，explicitly_mentioned=true，短路返回                                                                                  |
| TC-018 | "How do I compute the intersection of two result sets?"                                                                                                  | dashboard    | module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true                                                                              | **Dim1/Mandatory** intersection 强制触发 Data Worksheet>data block                                                                                                          |
| TC-019 | "I want to subtract the second dataset from the first using a minus operation"                                                                           | dashboard    | module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true                                                                              | **Dim1/Mandatory** minus/difference 强制触发 Data Worksheet>data block                                                                                                      |
| TC-020 | "How do I join two tables using a common key field?"                                                                                                     | worksheet    | ⓵ module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true<br>⓶ module: Portal<br>subModule: data model<br>explicitly_mentioned: true | **Dim3** Join 强制双返回，两者均为 true，short-circuit 同时返回两个结果                                                                                                                    |
| TC-021 | "I want to link data from two different data sources together"                                                                                           | worksheet    | ⓵ module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true<br>⓶ module: Portal<br>subModule: data model<br>explicitly_mentioned: true | **Dim3** Link 强制双返回，验证 DW+Portal 同时出现                                                                                                                                   |
| TC-022 | "How do I change the data type of a field at the model level?"                                                                                           | worksheet    | ⓵ module: Portal<br>subModule: data model<br>explicitly_mentioned: true<br>⓶ module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: true | **Dim3** Data Type 强制双返回（Portal>data model + Data Worksheet），两者均 true                                                                                                   |
| TC-023 | "Show a line chart with period-over-period performance analysis"                                                                                         | dashboard    | ⓵ module: Dashboard<br>subModule: chart<br>explicitly_mentioned: true<br>⓶ module: Dashboard<br>subModule: trend&comparison<br>explicitly_mentioned: true  | **Dim3** line chart（true）+ period-over-period（true），并行追加，two modules returned                                                                                           |
| TC-024 | "How do I group the table data by product category?"                                                                                                     | crosstab     | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: false                                                                                    | **Dim4** "table+group" 规则：LLM 排除 Dashboard>table，返回 [crosstab/false, freehand/false, DW/false]；无 true → 增强；contextType=crosstab 过滤，输出 crosstab。验证 Dashboard>table 不在结果中 |
| TC-025 | "如何在仪表盘中显示小计和合计行？"                                                                                                                                       | crosstab     | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: false                                                                                    | **Dim4** total 规则排除 Dashboard>table；LLM 返回 [crosstab/false, freehand/false]；增强后 contextType=crosstab 过滤，输出 crosstab，验证无 table                                           |
| TC-026 | "我希望每个区域都显示 grand total"                                                                                                                                 | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: false                                                                              | **Dim4** grand total 排除 table；增强后 contextType=freehand 过滤，输出 freehand table                                                                                             |
| TC-027 | "Display the sales data plotted as a continuous time series"                                                                                             | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim4** "time series" 单独出现，禁止触发 trend&comparison；验证结果中无 trend&comparison；contextType=chart 过滤输出 chart                                                                  |
| TC-028 | "Group dates by month and show them on a continuous time axis"                                                                                           | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim4** "continuous time axis" 不触发 trend&comparison；验证结果中无 trend&comparison                                                                                            |
| TC-029 | "How do I manage user roles and permissions for the chart component?"                                                                                    | em           | module: Enterprise Manager<br>subModule: administration<br>explicitly_mentioned: true                                                                      | **Dim4** EM 强制覆盖规则：permission 操作 → EM/administration，**忽略** query 中的 "chart"；验证结果中无 Dashboard/chart                                                                     |
| TC-030 | "How do I sort the records in ascending order?"                                                                                                          | crosstab     | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: false                                                                                    | **Dim2** 排序是通用操作，无专属模块名/概念，explicitly_mentioned=false；增强后 contextType=crosstab 过滤                                                                                       |
| TC-031 | "I want to apply an interactive filter based on the user's current selection"                                                                            | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim2** filter→Dashboard（交互语义），无显式触发，false；增强后 contextType=chart 过滤                                                                                                    |
| TC-032 | "How can I aggregate values by region in this component?"                                                                                                | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: false                                                                              | **Dim2** aggregate 是通用操作，explicitly_mentioned=false；增强后 contextType=freehand 过滤                                                                                         |
| TC-033 | "How do I filter raw data during the preprocessing stage?"                                                                                               | worksheet    | module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: false                                                                             | **Dim2** data filtering→Data Worksheet，无显式触发，false；增强后 contextType=worksheet 过滤                                                                                         |
| TC-034 | "如何对数据进行排名展示，显示前 5 名？"                                                                                                                                   | crosstab     | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: false                                                                                    | **Dim2** Ranking 是通用操作，explicitly_mentioned=false；增强后 contextType=crosstab 过滤                                                                                           |
| TC-035 | "How do I apply conditional formatting to highlight values above threshold?"                                                                             | freehand     | module: Dashboard<br>subModule: freehand table<br>explicitly_mentioned: false                                                                              | **Dim6** formatting 通用；增强后 contextType=freehand 过滤，输出 freehand table                                                                                                    |
| TC-036 | "I want to add a new expression column to compute profit margin"                                                                                         | worksheet    | module: Data Worksheet<br>subModule: data block<br>explicitly_mentioned: false                                                                             | **Dim6** expression column → DW；增强后 contextType=worksheet 过滤，输出 Data Worksheet                                                                                          |
| TC-037 | "如何隐藏某些列不显示？"                                                                                                                                            | table        | module: Dashboard<br>subModule: table<br>explicitly_mentioned: false                                                                                       | **Dim6** hide column → Dashboard>table（table 支持此特性）；增强后 contextType=table 过滤，输出 table                                                                                   |
| TC-038 | "How do I add a total aggregation calculation to summarize the data?"                                                                                    | dashboard    | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim7** total 排除 table，aggregate 涵盖 chart/crosstab/freehand/DW，全部 false；contextType=dashboard 不匹配任何过滤器 → 优先级排序，Dashboard 优先，subModule chart(0) > crosstab(1)，取 chart   |
| TC-039 | "I want to create a visualization to show the breakdown of sales by region"                                                                              | dashboard    | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim7** 通用可视化，LLM 返 [chart/false, crosstab/false, ...]；contextType=dashboard 无匹配过滤器 → 优先级排序取 chart(0)                                                                  |
| TC-040 | "如何对数据创建汇总展示？"                                                                                                                                           | dashboard    | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false                                                                                       | **Dim7** 汇总展示，多模块 false；contextType=dashboard 无过滤匹配 → 优先级排序，Dashboard>chart 优先级最高                                                                                       |
| TC-041 | "Yes" *(前一轮 assistant: "Do you want to sort the data in the table? You can sort ascending or descending.")*                                              | table        | module: Dashboard<br>subModule: table<br>explicitly_mentioned: false                                                                                       | **Dim8** 短确认词 → completeQueryByHistory 重建为 "Sort the data in the table"；增强逻辑用 completedQuery 重新调用，contextType=table 过滤，输出 Dashboard>table                               |
| TC-042 | "The second option" *(前一轮 assistant: "Which column should be used for grouping? Option A: Region, Option B: Product Category")*                          | crosstab     | module: Dashboard<br>subModule: crosstab<br>explicitly_mentioned: false                                                                                    | **Dim8** 选项选择 → completeQueryByHistory 重建为 "Use Product Category for grouping"；增强逻辑重新调用，contextType=crosstab 过滤，输出 crosstab                                             |
| TC-043 | "How do I create a new data source connection to a PostgreSQL database?"                                                                                 | portal       | module: Portal<br>subModule: data source connection<br>explicitly_mentioned: true                                                                          | **Dim1** "data source connection" 是 Portal 专属概念，explicitly_mentioned=true                                                                                               |
| TC-044 | "How do I set up a Virtual Private Model to restrict data visibility?"                                                                                   | portal       | module: Portal<br>subModule: VPM<br>explicitly_mentioned: true                                                                                             | **Dim1** VPM（Virtual Private Model）是 Portal 专属概念，explicitly_mentioned=true                                                                                              |
| TC-045 | "How do I configure data security conditions to filter rows by user attribute?"                                                                          | portal       | module: Portal<br>subModule: data security<br>explicitly_mentioned: true                                                                                   | **Dim1** data security 是 Portal 专属配置（数据层行级安全），explicitly_mentioned=true                                                                                                 |
| TC-046 | "How do I set up a scheduled task to automatically email the dashboard every Monday?"                                                                    | portal       | module: Portal<br>subModule: scheduled task<br>explicitly_mentioned: true                                                                                  | **Dim1** 用户级 scheduled task → Portal>scheduled task（区别于 EM 系统级调度）                                                                                                       |
| TC-047 | "How do I save the current dashboard filter state as a bookmark for quick access?"                                                                       | portal       | module: Portal<br>subModule: bookmark<br>explicitly_mentioned: true                                                                                        | **Dim1** bookmark 是 Portal 专属功能，explicitly_mentioned=true                                                                                                               |
| TC-048 | "How do I share a bookmark with other users?"                                                                                                            | portal       | module: Portal<br>subModule: bookmark<br>explicitly_mentioned: true                                                                                        | **Dim1** 直接操作 bookmark，Portal-exclusive                                                                                                                                 |
| TC-049 | "How do I use the viewer to preview and interact with a published dashboard?"                                                                            | portal       | module: Portal<br>subModule: viewer<br>explicitly_mentioned: true                                                                                          | **Dim1** viewer 是 Portal 专属概念，explicitly_mentioned=true                                                                                                                 |
| TC-050 | "How do I generate a data profiling report to check the quality of my data source?"                                                                      | portal       | module: Portal<br>subModule: data profiling report<br>explicitly_mentioned: true                                                                           | **Dim1** data profiling report 是 Portal 专属功能，explicitly_mentioned=true                                                                                                  |
| TC-051 | "How can I encrypt the generated dashboard when sending emails?"                                                                                         | scheduleTask | module: schedule task<br>explicitly_mentioned: false                                                                                                       | 暗示schedule task,走增强逻辑                                                                                                                                                   |
| TC-052 | "How do I make the bars in my graph show different colors for each category?"                                                                            | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false | **Dim2/口语** 口语描述柱状图外观，未使用任何专属概念词（"bars" 不在专属列表）；从通用视觉描述推断 chart；contextType=chart 过滤 |
| TC-053 | "My graph is way too crowded, how do I remove some of the labels?"                                                                                       | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false | **Dim2/口语** 口语描述图形布局问题，无专属概念词；推断为 chart；contextType=chart 过滤 |
| TC-054 | "How do I make one specific data point pop out so it's easy to spot?"                                                                                    | chart        | module: Dashboard<br>subModule: chart<br>explicitly_mentioned: false | **Dim2/口语** 口语描述高亮数据点；无专属概念词；推断为 chart；contextType=chart 过滤 |
| TC-055 | "How do I make sure each salesperson can only see their own customers' data when they open the dashboard, without having to apply any filters themselves?" | portal       | module: Portal<br>subModule: VPM<br>explicitly_mentioned: false | **Dim2/口语** 口语描述"按登录用户自动隔离数据"，未使用 VPM/Virtual Private Model 等关键词；推断为 Portal>VPM；走增强，priority ranking 取 Portal |
| TC-056 | "Is there a way so that people from different departments automatically see only the numbers that belong to their own team?"                             | portal       | module: Portal<br>subModule: VPM<br>explicitly_mentioned: false | **Dim2/口语** 口语描述按部门自动数据隔离；未使用专属概念词；推断为 Portal>VPM |
| TC-057 | "Can I set it up so this dashboard automatically lands in my inbox every Friday morning?"                                                                | portal       | module: Portal<br>subModule: scheduled task<br>explicitly_mentioned: false | **Dim2/口语** 口语描述"定时自动发送报表到邮箱"，未使用 scheduled task 关键词；推断为 Portal>scheduled task；走增强，priority ranking 取 Portal |
| TC-058 | "How do I make this dashboard automatically send out as a PDF to the whole team at the start of each month?"                                             | portal       | module: Portal<br>subModule: scheduled task<br>explicitly_mentioned: false | **Dim2/口语** 口语描述"自动定期导出 PDF 并发送"；推断为 Portal>scheduled task |
| TC-059 | "A new colleague just joined and needs to be able to log in and see the dashboard, how do I set them up?"                                                | portal       | module: Enterprise Manager<br>subModule: administration<br>explicitly_mentioned: true | **Dim2/口语** 口语描述"新建用户/开通访问"；触发 EM mandatory override（create user = access control）；explicitly_mentioned=true，忽略其他模块 |
| TC-060 | "Someone left our company last month and I want to make sure they can't get in anymore"                                                                  | em           | module: Enterprise Manager<br>subModule: administration<br>explicitly_mentioned: true | **Dim2/口语** 口语描述"撤销离职员工登录访问"；触发 EM mandatory（access control）；explicitly_mentioned=true |
| TC-061 | "I want to see a record of who has been opening which dashboard over the past two weeks"                                                                 | em           | module: Enterprise Manager<br>subModule: administration<br>explicitly_mentioned: true | **Dim2/口语** 口语描述"查看访问记录"→ audit records；触发 EM mandatory；explicitly_mentioned=true |
| TC-062 | "How do I put all the people from the sales team into one group so I can control what they see all at once?"                                             | portal       | module: Enterprise Manager<br>subModule: administration<br>explicitly_mentioned: true | **Dim2/口语** 口语描述"创建/管理用户分组"；触发 EM mandatory（group management）；explicitly_mentioned=true |
