# 检索策略 Prompt 规则分析与测试维度（含测试用例集）

> 本文件由以下两份文档合并而成，**规则分析在前，测试用例在后**，便于统一查阅与回归测试：
>
> - `prompts-v2/retrievers/检索策略Prompt规则分析与测试维度.md`
> - `prompts-v2/retrievers/检索策略测试用例集2.md`

---

## Part A：检索策略 Prompt 规则分析与测试维度

# 检索策略 Prompt 规则分析与测试维度

> 基于 `default_strategies.prompt` 及其引用的 `rewrite_rule.prompt`、`decomposition_rule.prompt`、`minor_expansion.prompt` 分析。

---

## 一、Rewrite 阶段主要规则总结

### 1. 上下文注入开关（allowContextInjection）

默认为 `false`，满足以下任一条件时置为 `true`：

- `rewriteWithContext` 参数为 `true`
- 问题是仪表板模糊操作 + 当前模块含 chart/crosstab/freehand table + 问题动作与模块类型匹配
- 问题是步骤追问 + 历史有清晰流程 或 `allowContextInjection = true`

### 2. Step 1：判断是否需要改写

| 条件 | 处理方式 |
|------|----------|
| 问题清晰、术语正确（如"how to create a bar chart"） | 仅去除疑问词，跳过 Step 2，直接进入 Step 3 |
| 问题模糊、缺乏上下文、询问具体步骤（如"下一步是什么"） | 进入 Step 2 改写 |

### 3. Step 2：改写规则

#### 规则一：是否注入上下文
- `allowContextInjection = false` → 严禁添加任何上下文，只用原始输入
- `allowContextInjection = true` → 仅授权，实际注入由后续规则（Step 2.2、Step 3）决定

#### 规则二：步骤追问处理
- 识别关键词：first step / second step / next step / then / continue 等
- 有历史流程上下文 → 改写为询问后续步骤
- 无历史但 `allowContextInjection = true` → 使用模块上下文改写
- **禁止**：直接回答步骤内容；禁止对其他类型问题拼接上下文

#### 规则三：聚焦功能操作（核心规则）

**必须忽略（业务内容）：**
- 具体字段名（如"销售额"、"客户姓名"）
- 业务实体名（如"A渠道"、"华东区"）
- 业务指标名（如"ROI"、"转化率"）
- 业务场景描述（如"销售分析"、"用户群体"）

**必须保留/转换（操作内容）：**

| 原始表达 | 转换结果 |
|----------|----------|
| 排名、Top N、最高/最低 | view data ranking / sort data |
| 筛选、过滤、排除、只显示 | filter data |
| 对比、比较 | data comparison |
| 目标线、基准线、均值线 | target line |
| 时间序列展示 | display time series |
| 同比、环比、趋势分析 | date comparison / trend analysis |
| 分组操作 | group data（数据字段）/ group components（UI组件） |
| 汇总、求和、平均、合并列属性 | aggregate data |
| 自定义布局表格 | freehand table |
| 关联表、查看相关实体 | join tables |
| 合并表 | union |
| 笛卡尔积 | Crossjoin |
| Excel数据 | Excel data source |

**优先级规则（关键）：**
- 排名检测优先于过滤（当子集选择依赖排序位置时）
- target line ≠ 过滤，target line ≠ 排名
- 时间序列展示 ≠ 趋势分析（无明确对比意图时不转换为 date comparison）

#### 规则四：禁止主动扩展
- 只做被动转换（已有内容 → 标准术语）
- 禁止添加用户未提及的操作或功能
- 保持查询单一性

### 4. Step 3：Dashboard 组件上下文注入

同时满足以下**全部条件**才注入：
1. `allowContextInjection = true`
2. 当前模块包含 chart / crosstab / freehand table
3. 用户问题对组件类型模糊（功能可适用于多种组件）
4. 问题中未已明确提及具体组件类型

操作：从上下文提取组件关键词追加到改写结果末尾。

**反例（不注入）：**
- "how to create a bar chart" + 上下文包含 freehand table → 不注入（问题已明确 bar chart）

### 5. Stage Two：改写自检（Self-Check）

7 项检查：
1. 是否避免了业务数据
2. 步骤追问是否正确处理
3. 是否聚焦功能操作
4. 是否使用标准术语
5. 是否有不当上下文拼接
6. 是否仅改写未扩展
7. Enterprise Manager 上下文处理（若属于 EM 操作，改写结果中不得出现 dashboard/chart 等可视化词汇）

---

## 二、Decomposition 阶段主要规则总结

### 1. 完全隔离原则（Critical）

分解阶段**唯一输入**是 `rewritten_query`，完全忽略：
- `contextType`（当前模块）
- `history`（历史对话）
- `question`（原始问题）

### 2. 不需要分解的情况（优先级从高到低）

| 类型 | 示例 | 处理 |
|------|------|------|
| 单概念查询 | "improve dashboard performance" | 不分解 |
| 单操作查询 | "create a bar chart" | 不分解 |
| 优化/性能目标查询 | "improve dashboard loading speed" | 不分解 |
| 多参数单操作 | "group sales by year and quarter" | 不分解（共享同一动词） |

### 3. 需要分解的情况

| 类型 | 示例 |
|------|------|
| 显式多功能组合（and/also/simultaneously） | "create a bar chart and add data labels" |
| 复合步骤（first...then...） | "first filter data then create a chart" |

### 4. 分解判断流程（顺序执行）

1. 仅分析 `rewritten_query` 的语言结构
2. 判断是否是单概念/单目标 → 是则不分解
3. 判断是否显式包含多个独立功能（靠连接词识别） → 否则不分解
4. 仍不确定 → **保守原则：倾向不分解**

### 5. 分解原则

- **上下文保留**：分解后每个子查询须保留必要的关键对象（如含 chart 则子查询也须含 chart）
- **严禁扩展**：只分解改写结果中明确存在的内容
- **原子性**：每个子查询对应单一可独立配置的功能
- **合理数量**：通常 1-3 个

### 6. 分解自检（Phase 4）

1. 分解是否真的必要
2. 是否引入了改写结果中未有的内容
3. 上下文是否在子查询中保留
4. 子查询数量是否合理（1-3个）
5. 子查询是否真正原子化

---

## 三、rewriteWithContext 的判断逻辑

`rewriteWithContext` 是由系统外部传入的参数（布尔值），不由 prompt 内部计算决定。

其作用是：**作为激活 `allowContextInjection` 的条件之一**。

```
allowContextInjection = false  (default)

if:
  rewriteWithContext == true
  OR (ambiguous dashboard op AND module ∈ {chart, crosstab, freehand table} AND action matches module)
  OR (step inquiry AND (history has clear process OR allowContextInjection == true))
then:
  allowContextInjection = true
```

`allowContextInjection = true` 后的效果：
1. Step 2.2（步骤追问）可使用模块上下文改写
2. Step 3（Dashboard 组件注入）可将模块组件类型追加到查询末尾

**关键区分：**
- `rewriteWithContext = true` 只是"授权允许注入"，不代表每次都一定会注入
- Step 3 的注入有额外条件（问题模糊 + 已包含组件类型则不注入）

---

## 四、可转化的测试维度

### 维度 1：Rewrite - 业务内容剥离

| 测试点 | 描述 |
|--------|------|
| T1-1 | 含具体字段名的问题 → 改写结果不含字段名 |
| T1-2 | 含业务实体名的问题 → 改写结果不含实体名 |
| T1-3 | 含业务指标（ROI/转化率）的问题 → 改写结果转为通用操作词 |
| T1-4 | 含业务场景描述的问题 → 改写结果不含场景词 |

### 维度 2：Rewrite - 操作类型转换准确性

| 测试点 | 描述 |
|--------|------|
| T2-1 | "Top 10 产品" → "view data ranking"（不转为 filter） |
| T2-2 | "过滤掉某类数据" → "filter data"（不转为 ranking） |
| T2-3 | 排名与过滤共存时，排名优先（dashboard 模块） |
| T2-4 | "均值线/目标线" → "target line"（不转为 filter 或 ranking） |
| T2-5 | "按时间展示" → "display time series"（不转为 date comparison） |
| T2-6 | "同比/环比" → "date comparison"（明确对比意图才转换） |
| T2-7 | "group by year and quarter" → 单个 group 查询（不拆分维度） |
| T2-8 | "join 两张表" → "join tables" |
| T2-9 | 自定义布局表格 → "freehand table"（普通表格样式不触发） |

### 维度 3：Rewrite - 步骤追问处理

| 测试点 | 描述 |
|--------|------|
| T3-1 | 含"下一步"关键词 + 历史有流程 → 改写为流程续问，不直接回答 |
| T3-2 | 含"下一步"关键词 + 无历史 + `allowContextInjection=true` → 用模块上下文改写 |
| T3-3 | 含"下一步"关键词 + `allowContextInjection=false` → 只基于原始输入，不拼接上下文 |
| T3-4 | 非步骤追问 → 不拼接历史上下文 |

### 维度 4：Rewrite - 上下文注入（Step 3）

| 测试点 | 描述 |
|--------|------|
| T4-1 | `allowContextInjection=true` + 模块=chart + 问题模糊 → 注入 "in chart" |
| T4-2 | `allowContextInjection=true` + 模块=chart + 问题已明确 chart → 不注入 |
| T4-3 | `allowContextInjection=false` + 模块=chart + 问题模糊 → 不注入 |
| T4-4 | `allowContextInjection=true` + 模块非chart/crosstab/freehand table → 不注入 |

### 维度 5：Rewrite - rewriteWithContext 参数

| 测试点 | 描述 |
|--------|------|
| T5-1 | `rewriteWithContext=true` → `allowContextInjection=true` 被激活 |
| T5-2 | `rewriteWithContext=false` + 其他条件不满足 → `allowContextInjection=false` |
| T5-3 | `rewriteWithContext=false` + 仪表板模糊操作 + 匹配模块 → `allowContextInjection=true` |

### 维度 6：Rewrite - 禁止主动扩展

| 测试点 | 描述 |
|--------|------|
| T6-1 | 问题只提一个操作 → 改写结果不引入额外功能 |
| T6-2 | 问题提及优化目标 → 不展开为具体功能列表 |

### 维度 7：Rewrite - Enterprise Manager 场景

| 测试点 | 描述 |
|--------|------|
| T7-1 | EM 用户管理操作 → 改写结果不含 dashboard/chart/table 等词 |

### 维度 8：Decomposition - 是否分解判断

| 测试点 | 描述 |
|--------|------|
| T8-1 | 单操作改写结果 → `final_queries` 只有1条，与 `rewritten_query` 一致 |
| T8-2 | 含 "and" 连接两个独立功能 → 拆为两条子查询 |
| T8-3 | "group by year and quarter" → 不拆（多参数同动词） |
| T8-4 | 优化目标类查询 → 不拆，不扩展为功能列表 |
| T8-5 | 含 "first...then..." → 拆为两步骤查询 |

### 维度 9：Decomposition - 上下文保留

| 测试点 | 描述 |
|--------|------|
| T9-1 | "create a bar chart and add data labels" → 第二条子查询含 "bar chart" |
| T9-2 | "add charts and filters to a dashboard" → 两条子查询均含 "dashboard" |
| T9-3 | 分解后每条子查询独立可理解 |

### 维度 10：Decomposition - 隔离性验证

| 测试点 | 描述 |
|--------|------|
| T10-1 | 历史含额外信息 → 分解结果不受历史影响 |
| T10-2 | 原始问题含业务词 → 分解只基于 rewritten_query |
| T10-3 | 模块上下文不影响分解结果 |

### 维度 11：输出格式

| 测试点 | 描述 |
|--------|------|
| T11-1 | 输出为合法 JSON，含 `rewritten_query`（string）和 `final_queries`（array） |
| T11-2 | 无多余文字、无 markdown 包裹 |
| T11-3 | `final_queries` 数组不为空 |

---

## 五、最容易出错的地方

### 1. 排名 vs 过滤 的判断边界（高风险）

> "显示销售额最高的10个产品" → 应为 **ranking**，不是 filter
> "只显示销售额大于10万的产品" → 应为 **filter**，不是 ranking

当两者同时出现时，dashboard 模块下优先识别 ranking，但规则表述略复杂，模型容易混淆。

### 2. 时间序列 vs 趋势分析 的误判（高风险）

> "按月展示销售数据" → display time series（不含对比意图）
> "查看今年和去年的对比" → date comparison（明确对比）

模型易将所有时间相关表达都转为 date comparison，需要严格检查是否有明确对比/趋势意图。

### 3. Step 3 的注入条件漏判

四个条件必须**同时满足**，缺一不注入。尤其容易遗漏：
- 问题已明确组件类型 → 不注入（但易忘记检查）
- 模块不含 chart/crosstab/freehand table → 不注入

### 4. 步骤追问的上下文拼接滥用

`allowContextInjection = true` 只授权步骤追问和 Step 3 使用上下文，不代表所有问题都可以拼接历史。非步骤追问的问题如果触发了上下文拼接，属于严重违规。

### 5. 分解时的过度拆分

模型易将以下情况错误拆分：
- 多参数同动词（"group by year and quarter"）→ 错拆为两条
- 优化目标查询 → 错拆为具体功能列表

保守原则是核对时的底线：**不确定就不拆**。

### 6. 分解时上下文丢失

拆分后第二条、第三条子查询丢失关键对象词（如 chart、dashboard），导致检索时语义不完整。这是最常见的分解错误。

### 7. Enterprise Manager 与 Dashboard 上下文污染

当用户在 EM 模块操作时（管理用户/组/角色），若改写结果含 dashboard/chart 等词，会导致检索结果偏向可视化文档，完全偏离用户意图。

### 8. rewriteWithContext 参数理解歧义

`rewriteWithContext = true` ≠ 一定会注入上下文
仅代表"开关打开"，Step 3 的实际注入还需满足额外条件（问题模糊 + 模块匹配）。

---

*文件生成时间：2026-03-10*
*基于 prompts-v2/retrievers/ 目录下的 prompt 文件分析*

---

## Part B：检索策略测试用例集 2

# 检索策略测试用例集 2

> **设计原则**：每个 case 尽量覆盖多条规则（Rewrite + Decomposition + Expansion 三阶段）；不需要分解的简单 case 占总数的 1/6（共 3 条）。
>
> **输入参数**：`question`、`contextType`、`rewriteWithContext`、`history`（多轮）
>
> **验证目标**：`rewritten_query`（隐含）、`final_queries`

---

## 测试用例总表

| Case ID | 用户问题 | contextType | rewriteWithContext | 预期 final_queries | 验证规则 |
|---------|---------|-------------|:-----------------:|-------------------|---------|
| **N01** | How to export a report as PDF? | support dashboard | false | `["export PDF report"]` | Rewrite-Step1：清晰问题仅去疑问词跳过Step2；T8-1：单操作不分解 |
| **N02** | 我的仪表板打开特别慢，有没有什么优化方法？ | dashboard | false | `["improve dashboard loading speed"]` | T6-2：优化目标不主动扩展为功能列表；T8-4：单目标不分解 |
| **N03** | 怎么把某个用户从角色里面移除？ | em | false | `["remove user from role"]` | T7-1：EM操作改写结果不含 dashboard/chart/table 等可视化词汇；T8-1：不分解 |
| **C01** | 我想在图表里看销售额排名前10的客户，同时加一条平均线作为参考标准 | visualization dashboard chart | true | `["view data ranking in chart",` `"target line in chart"]` | T2-1：Top N→ranking 不转为 filter；T2-4：均值线→target line 不是 ranking；T4-1：Step3注入"chart"（两个操作均模糊）；T1：剥离业务字段/实体；T8-2：显式"同时"→分解；T9：两条子查询均保留"chart" |
| **C02** | 我的订单表里没有客户地址，需要把客户信息表关联进来，同时只保留已完成状态的订单 | worksheet | false | `["join tables",` `"filter data"]` | T2-8："关联"→join tables；T2-2：条件过滤→filter data（不是ranking）；T1：剥离表名/字段名/业务状态；T8-2：显式"同时"→分解 |
| **C03** | 我想按月份展示近半年的销售数据，另外也做一个今年和去年同期的同比分析 | worksheet | false | `["display time series",` `"date comparison"]` | T2-5：按月连续展示→time series（无对比意图，不转date comparison）；T2-6：同比明确对比意图→date comparison（不是time series）；T1；T8-2 |
| **C04** | 帮我把ROI最低的三个渠道过滤出来，另外按产品类型分组展示数据 | visualization dashboard chart | true | `["view data ranking in chart",` `"group data in chart"]` | T2-3：dashboard场景"最低三个+过滤动词"→ranking优先于filter；T2：group；T1：ROI/渠道/产品类型剥离；T4-1：Step3注入"chart"；T8-2；T9：两条均保留"chart" |
| **C05** | 为什么我在图表上设置的时间过滤条件不起作用？ | visualization dashboard chart | true | `["filter data in chart",` `"filter data in chart permission settings"]` | T2-2：过滤条件→filter data；T4-1：Step3注入"chart"（模糊操作+chart模块）；Expansion-Rule1：WHY型+操作失败→追加权限查询；T8-2：Expansion产生第2条 |
| **C06** | 我进不去同事分享的仪表板，另外我想在仪表板里给图表加数据下钻功能 | dashboardPortal | false | `["view shared dashboard",` `"dashboard access permission settings",` `"drill down chart in dashboard"]` | Expansion-Rule2：无法访问→权限查询（非WHY型）；T2：drill down；T1；T8-2：3条查询；T9：第3条保留"dashboard"上下文 |
| **C07** ⚡ | [多轮¹] 好，下一步是什么？另外怎么给这个图表设置数据标签？ | chart | **false** | `["create line chart subsequent steps",` `"add data labels to chart"]` | T3-1：步骤追问+历史有明确流程→allowContextInjection=true（即使rewriteWithContext=false）；T8-2：两个独立问题→分解；T9：第2条保留"chart" |
| **C08** ⚡ | [多轮²] 第二步怎么做？然后我还想了解怎么给交叉表设置条件高亮 | visualization dashboard crosstab | true | `["create crosstab next step",` `"conditional highlight in crosstab"]` | T3-2：步骤追问+无明确历史流程+allowContextInjection=true→使用模块上下文改写；T4-1：Step3注入"crosstab"；T8-2；T9：两条均含"crosstab" |
| **C09** | 我想让报表导出任务在数据同步完成后再自动执行，还要配置任务失败时发邮件通知 | scheduleTask | false | `["scheduler task dependency condition execution order",` `"scheduler task notification"]` | Scheduler-Rule：任务依赖查询必须包含 dependency/condition/execution order 关键词；T1：剥离具体任务名称；T8-2：两个独立功能→分解 |
| **C10** | 我想创建一张行列完全自定义的报表，数据来源是公司的Excel文件，这两步怎么做？ | freehand | false | `["create freehand table",` `"connect Excel data source"]` | T2-9：自定义布局→freehand table（仅针对表格，非样式）；T2：Excel文件→Excel data source；T1：剥离"公司"等业务描述；T8-2：显式"两步"→分解 |
| **C11** | 我想修改门户的显示主题颜色，另外怎么限制只有指定用户才能访问某个报表？ | portal | false | `["configure portal theme",` `"set report access permission"]` | T1：剥离"指定用户"/报表名等业务内容；T8-2：两个独立功能→分解；T9：各子查询独立可理解 |
| **C12** | 交叉表里怎么手动调整行的显示顺序？能不能点某一行下钻到详细数据？ | crosstab | true | `["manual sort in crosstab",` `"drill down in crosstab"]` | T4-1：Step3注入"crosstab"（两个操作均模糊，未提具体组件）；T8-2：两个独立操作→分解；T9：两条均保留"crosstab" |
| **C13** | 我需要先按季度对数据做分组汇总，然后把结果导出成Excel表 | table | false | `["aggregate data",` `"export data"]` | T2：分组汇总→aggregate data；T2：导出Excel→export data；T1：剥离"季度"维度名；T8-5：先…然后…复合步骤→分解 |
| **C14** | 我想在仪表板上加一个饼图显示各类别占比，还要加个下拉选择器让用户按地区筛选 | dashboard | false | `["add pie chart to dashboard",` `"add filter to dashboard"]` | T2：饼图→pie chart；T2-2：下拉选择器过滤→filter data；T1：剥离"类别"/"地区"业务名；T8-2："还要"→分解；T9：两条均保留"dashboard" |
| **C15** | 为什么我没办法编辑这个数据集？另外我也看不到某个同事发布的仪表板 | dashboard | false | `["edit dataset",` `"edit dataset permission settings",` `"view dashboard",` `"view dashboard access permission settings"]` | Expansion-Rule1：WHY+操作失败（无法编辑）→追加权限查询；Expansion-Rule2：无法查看（非WHY）→追加权限查询；T1：剥离"某个同事"等描述；T8-2：两类问题各含扩展→4条 |

---

## 多轮对话历史说明

### ⚡ C07 历史记录（rewriteWithContext=false 的特殊场景）

```
轮次1 用户: 我想创建一个折线图，步骤是什么？
轮次1 助手: 创建折线图的步骤如下：
          步骤1：在工作表中选择数据绑定字段...
          步骤2：切换到图表类型面板，选择折线图...
轮次2 用户: 好，下一步是什么？另外怎么给这个图表设置数据标签？  ← 当前问题
```

**验证关键点**：`rewriteWithContext = false`，但由于"步骤追问 + 历史有明确操作流程"这一条件成立，`allowContextInjection` 应自动置为 `true`。改写第一部分应引用历史流程（折线图创建步骤），而不是依赖 `rewriteWithContext` 参数。

---

### ⚡ C08 历史记录（无明确操作流程的多轮场景）

```
轮次1 用户: 交叉表有什么用？
轮次1 助手: 交叉表是一种用于展示多维度数据汇总的组件，支持行列分组显示...
轮次2 用户: 第二步怎么做？然后我还想了解怎么给交叉表设置条件高亮  ← 当前问题
```

**验证关键点**：历史中没有清晰的操作步骤流程，但 `rewriteWithContext = true`，`allowContextInjection = true`，步骤追问应使用 `contextType`（crosstab）作为上下文改写，而不是直接回答步骤内容。

---

## 覆盖率矩阵

### contextType 覆盖

| contextType | Case |
|-------------|------|
| support dashboard | N01 |
| dashboard | N02, C14, C15 |
| em | N03 |
| visualization dashboard chart | C01, C04, C05 |
| worksheet | C02, C03 |
| dashboardPortal | C06 |
| chart | C07 |
| visualization dashboard crosstab | C08 |
| scheduleTask | C09 |
| freehand | C10 |
| portal | C11 |
| crosstab | C12 |
| table | C13 |

### 问题类型覆盖

| 问题类型 | Case |
|---------|------|
| How（操作方法） | N01, N02, N03, C01, C02, C03, C04, C07, C08, C09, C10, C11, C12, C13, C14 |
| Why（原因追问） | C05, C15 |
| Cannot access/view（权限类） | C06, C15 |
| Step inquiry（步骤追问，多轮） | C07, C08 |

### 分解类型覆盖

| 分解场景 | Case |
|---------|------|
| 不需要分解（1/6） | N01, N02, N03 |
| 显式 and/同时/还要 → 分解 | C01, C02, C04, C11, C14 |
| 先…然后… 复合步骤 → 分解 | C13 |
| 步骤追问 + 其他问题 → 分解 | C07, C08 |
| WHY Expansion 产生多条 | C05, C15 |
| 不能访问 Expansion 产生多条 | C06, C15 |
| 多独立功能 → 分解 | C03, C09, C10, C12 |

### 核心规则覆盖

| 规则 | Case |
|------|------|
| Rewrite-Step1（清晰问题仅去疑问词） | N01 |
| T2-1（排名不转过滤） | C01, C04 |
| T2-2（条件过滤不转排名） | C02, C05 |
| T2-3（dashboard场景排名优先） | C04 |
| T2-4（target line ≠ ranking/filter） | C01 |
| T2-5（时间展示→time series，不转date comparison） | C03 |
| T2-6（明确同比→date comparison） | C03 |
| T2-8（关联多表→join tables） | C02 |
| T2-9（自定义布局→freehand table） | C10 |
| T1（业务内容剥离） | C01~C15 全部 |
| T3-1（步骤追问+历史→allowContextInjection=true，覆盖rewriteWithContext=false） | C07 |
| T3-2（步骤追问+无历史+allowContextInjection→模块上下文） | C08 |
| T4-1（Step3：模糊操作+组件模块→注入组件类型） | C01, C04, C05, C08, C12 |
| T4-2（Step3：已明确组件→不注入）| 在 C07 第2部分验证（"这个图表"已含chart） |
| T6-2（优化目标不扩展） | N02 |
| T7-1（EM操作不含可视化词） | N03 |
| Scheduler-Rule（依赖查询必含dependency等关键词） | C09 |
| T8-1（单操作不分解） | N01, N02, N03 |
| T8-2（显式多功能→分解） | C01, C02, C04, C06, C07, C08, C14 |
| T8-4（单目标不分解） | N02 |
| T8-5（first…then…→分解） | C13 |
| T9（分解后保留关键对象上下文） | C01, C04, C06, C07, C08, C12, C14 |
| Expansion-Rule1（WHY+操作失败→权限查询） | C05, C15 |
| Expansion-Rule2（无法访问→权限查询） | C06, C15 |

---

*生成日期：2026-03-10*
*参考文件：`prompts-v2/retrievers/default_strategies.prompt`、`rewrite_rule.prompt`、`decomposition_rule.prompt`、`minor_expansion.prompt`*

