# 检索策略 Prompt 规则分析与测试维度（含测试用例集）

---

## Part A：检索策略 Prompt 规则分析与测试维度

# 检索策略 Prompt 规则分析与测试维度

> 基于 `default_strategies.prompt` 及其引用的 `rewrite_rule.prompt`、`decomposition_rule.prompt`、`minor_expansion.prompt` 分析。
>
> Rewrite 公共规则已抽离至：[`rewrite_rules.md`](./rewrite_rules.md)

---

## 一、Rewrite 阶段主要规则总结

- [rewrite_rules.md](./rewrite_rules.md)

引用章节：
- 一、Rewrite 阶段主要规则总结

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

## 三、Minor Expansion 阶段主要规则总结

### 1. 概述

Minor Expansion 是在 Decomposition 之后的可选扩展阶段，用于识别需要补充查询的特定场景。系统按顺序评估以下条件，满足任一条件即触发相应的扩展策略。

### 2. 扩展规则详解

#### 规则一：操作失败类 WHY 问题的扩展

**触发条件：**
- 原始问题是 **"WHY" 类型问题**（为什么...不能...）
- 且涉及 **无法执行或不工作的操作**

**动作：**
- 追加 **1 条** 额外查询，关于该特定操作的 **权限/访问控制设置**

**示例：**
- 原始：`"Why can't I export this dashboard as PDF?"`
- 扩展：`"export dashboard as PDF"` + `"permission settings for exporting dashboards"`

#### 规则二：权限/访问相关问题的扩展

**触发条件：**
- 原始问题表明用户 **无法查看、访问或执行某操作**
- 但 **不是 WHY 类型问题**
- 且问题可能与权限或访问控制相关（如无法查看数据、报表、仪表板或他人内容）

**动作：**
- 追加 **1 条** 额外查询，关于相关资源或操作的 **权限、角色或访问控制设置**

**示例：**
- 原始：`"I cannot see the sales dashboard"`
- 扩展：`"cannot see sales dashboard"` + `"permission settings for viewing dashboards"`

#### 规则三：战略/架构/模式类问题的扩展

**触发条件：**
原始问题 **不是** 关于视觉设计，且满足以下任一条件：

1. **概念/战略类**：询问"原则"、"最佳实践"、"优缺点"、"哲学"
2. **宽泛方法论 HOW-TO**：询问如何实现涉及 **多个技术模式、重构或架构选择** 的高级目标
   - 示例：`"how to factor out..."`, `"how to organize..."`, `"how to optimize..."`

**负面触发条件（不扩展）：**
- **具体原子操作**：查询描述软件中的 **单一、离散的功能或菜单操作**
  - 示例：`"how to extend a model"`, `"how to add a field"`, `"how to export a PDF"`
  - 这些是明确的任务，不需要战略扩展

**动作：**
- 追加最多 **2 条** 扩展查询

**扩展查询的要求：**

1. **上下文深度**：对于方法论查询（如"factor out code"），扩展为具体实现模式
   - 示例：`"reusable components"`, `"shared modules"`
2. **约束**：保持在同一功能域内，不跳跃到无关的生命周期阶段
   - 反例：如果询问"重构"，不应扩展到"部署"

**判断对比表：**

| 原始查询 | 是否扩展 | 原因 |
|---------|--------|------|
| "How to **extend** a logical model" | **否** | "Extend" 是具体的功能操作 |
| "How to **factor out** common code" | **是** | "Factor out" 是涉及多种代码复用方式的方法论 |
| "How to **filter** a table" | **否** | 具体的原子 UI 操作 |
| "Best practices for **organizing** dashboard layouts" | **是** | 战略性问题，涉及多种组织模式 |
| "How to **optimize** query performance" | **是** | 宽泛的方法论，涉及多个优化策略 |

**扩展示例：**

原始查询：`"How to factor out common code"`

扩展结果：
1. `"reusable code components and shared functions in StyleBI"`
2. `"best practices for modular code structure in StyleBI"`

### 3. 扩展的优先级与互斥性

- **规则一 vs 规则二**：规则一（WHY 类型）优先于规则二（非 WHY 的权限问题）
- **规则三的独立性**：规则三（战略/架构）与规则一、二独立，可同时触发
- **最大扩展数量**：
  - 规则一：1 条
  - 规则二：1 条
  - 规则三：最多 2 条
  - 总计：最多 4 条扩展查询

### 4. 扩展的约束条件

1. **不扩展的情况**：
   - 原始问题已经很具体（单一原子操作）
   - 问题涉及视觉设计（UI 样式、颜色、布局美学）
   - 问题已包含足够的上下文和细节

2. **扩展的边界**：
   - 扩展查询应保持与原始问题的语义相关性
   - 不应引入完全无关的功能域
   - 扩展查询应能独立被检索系统理解

### 5. 测试维度

| 测试点 | 描述 |
|--------|------|
| T-Exp-1 | WHY 类型操作失败问题 → 追加权限查询 |
| T-Exp-2 | 非 WHY 的权限/访问问题 → 追加权限查询 |
| T-Exp-3 | 战略/架构问题 → 追加最多 2 条方法论查询 |
| T-Exp-4 | 具体原子操作 → 不扩展 |
| T-Exp-5 | 视觉设计问题 → 不扩展 |
| T-Exp-6 | 扩展查询保持功能域一致性 |
| T-Exp-7 | 扩展查询数量不超过规则限制 |

---

## 四、rewriteWithContext 的判断逻辑与应用场景

- [rewrite_rules.md](./rewrite_rules.md)

引用章节：
- 二、rewriteWithContext 的判断逻辑与应用场景

## 五、可转化的测试维度

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
| T5-4 | `rewriteWithContext=true` + 步骤追问 + 有历史流程 → 优先使用历史流程上下文 |
| T5-5 | `rewriteWithContext=true` + 问题已明确组件类型 → Step 3 不注入 |
| T5-6 | `rewriteWithContext=true` + 非步骤追问问题 → 不拼接任何上下文（仅授权，不强制注入） |

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
| T8-1 | 单操作改写结果 → `final_queries` 只有1条 |
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
| T11-1 | 输出为合法 JSON，含 `final_queries`（array） |
| T11-2 | 无多余文字、无 markdown 包裹 |
| T11-3 | `final_queries` 数组不为空 |

---

## 六、最容易出错的地方

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

### 8. rewriteWithContext 参数理解歧义（高风险）

**常见误解：**
- `rewriteWithContext = true` ≠ 一定会注入上下文，仅代表"开关打开"
- `rewriteWithContext = true` ≠ 所有问题都可以拼接上下文，只有步骤追问和 Step 3 可以
- `rewriteWithContext = true` 不会覆盖"问题已明确组件类型"的判断（Step 3 仍不注入）

**正确理解：**
- `rewriteWithContext = true` 激活 `allowContextInjection = true`
- `allowContextInjection = true` 仅授权，实际注入由具体场景规则决定
- 即使授权，也要满足场景条件才能注入

---

*文件生成时间：2026-03-12*
*基于 prompts-v2/retrievers/ 目录下的 prompt 文件分析*

---

## Part B：检索策略测试用例集

---

## 说明

- **C 系列**：通用检索策略规则验证（改写、分解、业务词剥离等），全部 `rewriteWithContext=false`
- **CI 系列**：上下文注入专项测试，验证从 TS 计算到 Prompt 决策再到实际注入的完整链路
- **多轮对话**：以 `[History]` 标注上轮内容

---

## C 系列：主测试用例

| Case ID | 用户问题 | contextType | 预期 final_queries                                                                                           | 验证的规则 |
|---------|---------|-------------|------------------------------------------------------------------------------------------------------------|-----------| 
| C01 | How do I show the top 10 products by sales amount and also add an average target line to the chart? | dashboard | `["view data ranking in chart", "add target line in chart"]`                                               | 字段名（sales amount）不进改写; Top N → view data ranking（非filter）; 均值线/目标线 → target line; and连接独立功能 → 分解2条; 分解子查询保留chart |
| C02 | I want to create a bar chart and then add data labels to display the exact values on each bar. | chart | `["create bar chart", "add data labels to bar chart"]`                                                     | first...then结构 → 按步骤分解; 分解后子查询保留bar chart对象词 |
| C03 | How can I join the orders table with the customers table and then group the result by region? | worksheet | `["join tables", "group data"]`                                                                            | join tables术语转换; 业务实体名（orders/customers/region）不进改写; first-then结构 → 分解2条 |
| C04 | How do I show year-over-year comparison by quarter and also apply conditional formatting to highlight values below the benchmark? | crosstab | `["date comparison in crosstab", "apply conditional formatting in crosstab"]`                              | year-over-year明确对比意图 → date comparison; and连接 → 分解2条; 子查询保留crosstab |
| C05 | I need to create a custom layout table showing department performance metrics and group the components by business unit. | freehand | `["create freehand table", "group components in freehand table"]`                                          | 自定义布局表格 → freehand table; group components（UI组件）vs group data（数据字段）区分; and连接 → 分解2条 |
| C06 | How do I display monthly sales data over time and filter out records where the conversion rate is below 5%? | table | `["display time series in table", "filter data in table"]`                                                 | 按月展示+无对比意图 → display time series（非date comparison）; 阈值过滤 → filter data（非ranking）; 指标名（conversion rate）不进改写; and连接 → 分解2条 |
| C07 | Why can't I view certain reports in the portal, and how do I configure the access permissions for different user groups? | portal | `["view reports in portal", "configure permissions in portal", "permission settings required to view reports in portal"]` | WHY 类型操作失败问题 → Minor Expansion 规则一触发 → 追加权限查询; 业务实体名不进改写; and连接 → 分解2条 + 扩展1条 |
| C08 | 如何在 Enterprise Manager 中给用户分配角色权限，并且同时管理用户组的成员？ | em | `["assign role to user", "manage user groups"]`                                                            | EM操作改写结果不含dashboard/chart/table等可视化词; and连接 → 分解2条 |
| C09 | How do I set up a schedule task to export a dashboard report as PDF and automatically email it to the sales team every Monday? | scheduleTask | `["configure schedule task to export dashboard as PDF", "configure email notification for schedule task"]` | 业务实体名（sales team）不进改写; and连接独立功能 → 分解2条; 子查询保留schedule task |
| C10 | How do I embed a dashboard in the portal and configure interactive filter settings for the embedded view? | dashboardPortal | `["embed dashboard in portal", "configure filter settings in portal"]`                                     | and连接独立功能 → 分解2条; 两条子查询保留portal |
| C11 | How do I display only the top 5 highest-grossing customers who exceed the annual revenue threshold? | dashboard | `["view data ranking in dashboard"]`                                                                       | ranking与filter共存时dashboard模块ranking优先; Top N → view data ranking（非filter）; 业务实体名/指标名不进改写; 单输出→不分解 |
| C12 | How do I group the transaction data by year and quarter to analyze seasonal business patterns? | worksheet | `["group data by year and quarter"]`                                                                       | group by year and quarter → 单条group查询（多参数共享同一动词，不拆分）; 业务场景词不进改写 |
| C13 | How do I merge the current year sales data table with the previous year sales data table using union? | worksheet | `["union tables"]`                                                                                         | union合并表 → union tables术语转换; 业务实体名不进改写; 单操作→不分解 |
| C14 | I want to show total revenue and average order count aggregated by product category in a freehand table, with subtotals for each group. | freehand | `["aggregate data in freehand table"]`                                                                     | total/average/subtotal同属aggregate语义 → 共享同一操作不拆分; 业务实体名/指标名不进改写 |
| C15 | 如何在数据表中对华东区和华北区的销售额进行同比分析，并筛选出 ROI 大于 200% 的记录？ | table | `["date comparison in table", "filter data in table"]`                                                     | 同比 → date comparison（明确对比意图）; 筛选+阈值 → filter data; 业务实体名/指标名不进改写; and连接 → 分解2条 |
| C16 | 在 Enterprise Manager 中，为什么无法访问某些报表？如何重置用户密码并重新分配访问权限？ | em | `["reset user password", "assign user permissions", "permission settings required to access reports in em"]` | WHY 类型操作失败问题 → Minor Expansion 规则一触发 → 追加权限查询; EM操作改写不含可视化词; and连接 → 分解2条 + 扩展1条 |
| C17 | 如何先设置交叉表的行列表头，然后应用百分比计算，最后将结果导出？ | crosstab | `["configure crosstab headers", "apply percentage calculation in crosstab", "export crosstab"]`            | 先...然后...最后 → 按步骤分解3条; 每条子查询保留crosstab对象词 |
| C18 | How do I configure a schedule task to first generate a worksheet report and then automatically archive it to a network storage folder? | scheduleTask | `["configure schedule task to generate report", "configure archive destination for schedule task"]`        | first...then → 按步骤分解; 子查询保留schedule task对象词; 业务实体名不进改写 |
| C19 | **[History]** "How do I create a sales analysis dashboard?" → discussed chart and filter features. **[Current]** How do I configure the portal layout and set up the navigation menu? | dashboardPortal | `["configure portal layout", "configure navigation menu in portal"]`                                       | 历史中的dashboard/chart内容不影响当前portal问题的分解（分解隔离性）; and连接 → 分解2条; 两条子查询保留portal |
| C20 | Where can I find the report subscription settings and how do I configure email notification preferences in the portal? | portal | `["configure report subscription in portal", "configure email notification preferences in portal"]`        | and连接不同操作 → 分解2条; 两条子查询保留portal |
| C21 | How do I improve dashboard loading speed? | dashboard | `["improve dashboard loading speed"]`                                                                      | 优化目标类查询 → 不展开为具体功能列表; 单目标→不分解 |
| C22 | What is a freehand table in StyleBI? | freehand | `["freehand table"]`                                                                                       | 单概念查询→不分解; 改写仅保留核心功能术语 |
| C23 | How do I sort the data displayed in a chart? | chart | `["sort data in chart"]`                                                                                   | rewriteWithContext=false → allowContextInjection=false; Step3不注入; 单操作→不分解 |
| C24 | **[History]** 无相关历史流程。**[Current]** What are the available user role types in Enterprise Manager? | em | `["user roles"]`                                                                                           | EM操作改写结果不含dashboard/chart等可视化词; 单概念→不分解 |
| C27 | How do I filter the Q1 revenue data by product line and add a reference line showing the annual target on the chart? | chart | `["filter data in chart", "add target line in chart"]`                                                     | 分解阶段唯一输入是rewritten_query（原始业务词不影响分解）; 子查询保留chart对象词 |
| C28 | 我想把 Excel 文件中的数据导入到工作表中进行分析，应该怎么操作？ | worksheet | `["Excel data source"]`                                                                                    | Excel数据/文件 → Excel data source术语转换; 单操作→不分解 |
| C29 | 如何对商品目录和促销活动表做笛卡尔积关联？ | worksheet | `["Crossjoin tables"]`                                                                                     | 笛卡尔积 → Crossjoin术语转换; 业务实体名不进改写; 单操作→不分解 |
| C30 | How can I compare the sales performance between the East and West regions for the same quarter? | chart | `["data comparison in chart"]`                                                                             | 对比/比较（非时间维度）→ data comparison（非date comparison）; 业务实体名/场景词不进改写; 单操作→不分解 |
| C31 | How do I show the top 10 products by sales volume but only include those with profit margin above 20%? | chart | `["view data ranking in chart"]`                                                                           | ranking与filter共存时ranking优先（chart模块）; Top N优先级高于阈值过滤; 业务字段名不进改写 |
| C32 | How do I display monthly sales trends for the last 12 months? | dashboard | `["display time series in dashboard"]`                                                                     | 按月展示+趋势词但无明确对比意图 → display time series（非date comparison）; "trends"词不转date comparison（缺对比目标）; 单操作→不分解 |
| C33a | I want to create a bar chart and add data labels to the chart. | chart | `["create bar chart", "add data labels to bar chart"]`                                                     | 分解隔离性验证part-a：chart模块，按步骤分解，子查询保留bar chart |
| C33b | I want to create a bar chart and add data labels to the chart. | dashboard | `["create bar chart", "add data labels in chart"]`                                                         | 分解隔离性验证part-b：同一rewritten_query在不同contextType下分解结果一致；证明contextType不影响分解逻辑 |
| C34 | How do I filter to only show values above the 50K target benchmark line? | chart | `["add target line in chart", "filter data in chart"]`                                                     | Target line ≠ 过滤（两者分开处理）; 阈值作为过滤条件被剥离; 业务指标名不进改写; and隐含 → 分解2条 |
| C35 | How do I sort the data in this chart next? | dashboard | `["sort data in chart"]`                                                                                   | 仪表板模糊操作(sort)+步骤追问关键词(next)+模块含chart → allowContextInjection自动激活; rewriteWithContext=false但仍注入chart |
| C36 | How do I group sales by product category and also group the results by sales region? | worksheet | `["group data by product category", "group data by sales region"]`                                         | 多个独立group操作（不同维度）→ 分解2条（vs C12的多参数同动词不拆）; and连接 → 分解2条 |
| C37 | In Enterprise Manager, how can I manage the users who created this dashboard and audit their permissions? | em | `["manage user permissions", "audit user access"]`                                                         | EM操作改写结果不含dashboard/chart等可视化词（即使原问题提了dashboard）; 关键词"created this dashboard"被完全剥离; and连接 → 分解2条 |
| C38 | **[History]** "How do I create a dashboard?" → answered with 5 turns of chart/filter discussion. "How do I configure the portal layout?" → answered. **[Current]** How do I create a bar chart? | dashboard | `["create bar chart"]`                                                                                     | 长多轮对话后接完全新问题（非步骤追问）→ 不拼接历史; rewriteWithContext=false + 非步骤追问 → 严禁上下文注入; 单操作→不分解 |
| C39 | How do I "highlight" the top 3 products and also apply "special formatting" to the chart? | chart | `["view data ranking in chart", "apply special formatting in chart"]`                                      | 特殊字符（引号）处理不影响逻辑; Top N → ranking; and连接 → 分解2条 |

---

## CI 系列：上下文注入专项测试用例

> 专门验证 `rewriteWithContext → allowContextInjection → 是否注入` 的完整决策链。
>
> **列说明：**
> - **场景说明（触发来源）**：描述什么 TS 路径使 `rewriteWithContext` 为该值
> - **预期 rewriteWithContext**：TS 侧应计算出的值（作为 prompt 的输入参数）
> - **预期 allowContextInjection**：prompt 内部应计算出的值
> - **是否注入 Context**：最终 query 中是否出现组件/模块词

| Case ID | 用户问题 | 场景说明（触发来源） | contextType | 预期 rewriteWithContext | 预期 allowContextInjection | 是否注入 Context | 预期 final_queries | 验证规则 |
|---------|---------|-------------------|-------------|----------------------|--------------------------|----------------|--------------------|---------|
| CI-01 | How do I add labels? | LLM 返回 [chart, crosstab, table] 多候选，context 过滤收窄至 chart（**Source A**） | chart | true | true | **是** | `["add data labels in chart"]` | Source A → rewriteWithContext=true → allowContextInjection=true → Step3: 问题模糊+module=chart → 注入 "in chart" |
| CI-02 | How do I apply conditional formatting? | LLM 返回多候选（含 crosstab、chart），context 过滤收窄至 crosstab（**Source A**） | crosstab | true | true | **是** | `["apply conditional formatting in crosstab"]` | Source A → Step3: 问题模糊+module=crosstab → 注入 "in crosstab" |
| CI-03 | How do I configure this component? | LLM 返回 [Dashboard>others]，others 回退为 freehand table，filteredAreas 非空（**Source A + others 回退**） | freehand | true | true | **是** | `["configure component in freehand table"]` | Source A(others回退) → Step3: 问题模糊+module=freehand → 注入 "in freehand table" |
| CI-04 | How do I change the color scheme on a bar chart? | LLM 返回 [chart] 单个 area，与 chart contextType 匹配（**Source B**） | chart | true | true | **否** | `["change color scheme on bar chart"]` | Source B → allowContextInjection=true → Step3: 问题已明确 "bar chart"（条件4不满足）→ 不注入；若注入则 final_queries 会多出 "in chart" 后缀，缺失可验证 |
| CI-05 | How do I filter data? | LLM 返回 [Data Worksheet] 单个 area，与 worksheet contextType 匹配（**Source B**） | worksheet | true | true | **否** | `["filter data"]` | Source B → allowContextInjection=true → Step3: worksheet **不在** {chart/crosstab/freehand table} 支持列表 → 不注入；非步骤追问 → Step2 也不注入 |
| CI-06 | How do I apply formatting? | LLM 返回 [Dashboard>table] 单个 area，与 table contextType 匹配（**Source B**） | table | true | true | **否** | `["apply formatting"]` | Source B → allowContextInjection=true → Step3: table **不在** {chart/crosstab/freehand table} → 不注入 |
| CI-07 | How do I sort the data? *(module 内含 chart 组件)* | dashboard **无**代码层过滤分支，TS 不触发 Source A/B；Prompt 识别为 dashboard 模糊操作且 module 含 chart（**Prompt 条件 2**） | dashboard | false | true | **是** | `["sort data in chart"]` | rewriteWithContext=false → Prompt 条件2独立激活 allowContextInjection → Step3: module=chart，问题模糊 → 注入 "in chart" |
| CI-08 | How do I configure the Y-axis scale? | Y-axis 是 chart 独占概念（subjectAreas_Analysis 5.1）→ explicit=true → **Fast Path**，TS 不走 context 过滤 | chart | false | false | **否** | `["configure y-axis scale"]` | explicit=true Fast Path → rewriteWithContext=false；非 dashboard 模糊操作，非步骤追问 → allowContextInjection=false → 不注入；若注入则 final_queries 会出现 "in chart"，缺失可验证 |
| CI-09 | How do I assign permissions to users? | em **无**代码层过滤分支，TS 不触发 rewriteWithContext；非 dashboard 模糊操作 | em | false | false | **否** | `["assign user permissions"]` | em 无过滤分支 → rewriteWithContext=false → 无 Prompt 条件满足 → allowContextInjection=false → 不注入 |
| CI-10 | **[History]** "How to create a bar chart?" → answered. **[Current]** What should I do next? | 步骤追问关键词(next) + **历史有明确流程**（Prompt 条件 3） | chart | false | true | **是** | `["add data labels to bar chart"]` | Prompt 条件3: 步骤追问+历史流程 → allowContextInjection=true → Step2: 历史优先 → 改写为流程续步骤；注入来自历史上下文 |
| CI-11 | **[History]** "How do I configure the chart axis colors?" → answered. **[Current]** Then what should I do? | 步骤追问(then) + **历史有明确流程** + **rewriteWithContext=true**（Source B 同时满足），验证两个条件共存时历史流程的优先级 | chart | true | true | **是** | `["configure chart data series"]` | 条件1(rewriteWithContext=true) 与 条件3(步骤追问+历史) 同时满足 → allowContextInjection=true → Step2: **历史流程优先**于 module context → 注入来自历史上下文；若 Step2 改用 module context（"configure chart"）则视为历史优先失效 |
| CI-12 | How do I set up an automatic weekly email report? | scheduleTask **无**代码层过滤分支（subjectAreas_Analysis 5.2），TS 不触发 rewriteWithContext；非 dashboard 模糊操作，非步骤追问 | scheduleTask | false | false | **否** | `["configure schedule task to send email report"]` | scheduleTask 无代码过滤分支 → rewriteWithContext 恒为 false；无 Prompt 条件满足 → allowContextInjection=false → 不注入 |

### CI 系列 — 判断矩阵速查

| 场景类型 | rewriteWithContext | allowContextInjection | 是否注入 |
|---------|-------------------|-----------------------|---------|
| Source A：context 过滤收窄（chart/crosstab/freehand，模糊问题） | true | true | **是** |
| Source A + others 回退（freehand context） | true | true | **是** |
| Source B：单 area 匹配（chart/crosstab/freehand，模糊问题） | true | true | **是** |
| Source B：单 area 匹配，但问题已明确组件 | true | true | **否**（Step3条件4不满足） |
| Source A/B：worksheet/table contextType | true | true | **否**（Step3不支持该模块） |
| explicit=true Fast Path | false | false | **否** |
| dashboard context + 模糊操作 + module含chart（Prompt条件2）| false | true | **是** |
| em/scheduleTask 无过滤分支，非模糊操作 | false | false | **否** |
| 步骤追问 + 历史有流程（Prompt条件3，含 rewriteWithContext=true 共存）| false/true | true | **是**（Step2用历史，优先于 module ctx）|

---

## 规则覆盖索引

| 规则 | 覆盖的 Case |
|------|------|
| 字段名剥离 | C01, C06, C12, C14, C15 |
| 实体名剥离 | C03, C05, C07, C08, C09, C13, C15, C16, C18, C20, C29, C30 |
| 指标名剥离 | C06, C14, C15, C30 |
| 场景词剥离 | C05, C12, C30 |
| Top N → view data ranking（非filter） | C01, C11, C31, C39 |
| ranking与filter共存时ranking优先 | C11, C31 |
| 过滤/筛选 → filter data（非ranking） | C06, C15, C34 |
| 均值线/目标线/基准线 → target line | C01, C04, C27, C34 |
| 按时间展示（无对比意图）→ display time series | C06, C32 |
| 同比/环比/year-over-year → date comparison | C04, C15 |
| 对比/比较（非时间维度）→ data comparison | C30 |
| group by 多参数同动词 → 单条 group 查询 | C12 |
| join 表 → join tables | C03 |
| union 表 → union tables | C13 |
| 笛卡尔积 → Crossjoin | C29 |
| 自定义布局表格 → freehand table | C05 |
| Excel数据/文件 → Excel data source | C28 |
| aggregate 语义共享 → 不拆分 | C14 |
| group components vs group data | C05 |
| 步骤追问 + allowContextInjection=false → 仅原始输入 | C26|
| allowContextInjection=false + 问题模糊 → Step3不注入 | C23, CI-08, CI-09 |
| rewriteWithContext=false + 仪表板模糊操作+匹配模块 → allowContextInjection自动激活 | C25, C35, CI-07 |
| Source A：context过滤收窄 → rewriteWithContext=true → 注入 | CI-01, CI-02, CI-03 |
| Source A + others回退 → rewriteWithContext=true → 注入 | CI-03 |
| Source B：单area匹配context → rewriteWithContext=true | CI-04, CI-05, CI-06, CI-11 |
| Source B + 问题已明确组件 → allowContextInjection=true但Step3不注入 | CI-04 |
| Source B + worksheet/table → allowContextInjection=true但Step3不支持模块 | CI-05, CI-06 |
| explicit=true Fast Path → rewriteWithContext=false → 不注入 | CI-08 |
| em/scheduleTask 无代码过滤 → rewriteWithContext=false → 不注入 | CI-09, CI-12 |
| 步骤追问 + 历史有流程 → Prompt条件3 → Step2用历史注入 | CI-10, CI-11 |
| 条件1(rewriteWithContext=true)与条件3(步骤追问+历史)共存 → 历史优先 | CI-11 |
| 优化目标类查询 → 不展开为功能列表 | C21 |
| 单概念查询 → 不分解 | C22, C24 |
| EM 操作改写不含可视化词 | C08, C16, C24, C37 |
| and连接两个独立功能 → 拆为2条 | C01, C03, C04, C05, C07, C08, C09, C10, C15, C16, C18, C19, C20, C27, C34, C36, C37, C39 |
| group by 多参数同动词 → 不拆 | C12 |
| 优化目标 → 不拆不扩展 | C21 |
| first...then / 先...然后 → 按步骤拆分 | C02, C03, C17, C18 |
| 分解后子查询保留关键对象词 | C01, C02, C04, C05, C09, C17, C18, C27 |
| 分解后两条子查询均含父对象 | C07, C10, C19, C20 |
| 历史含额外信息 → 分解不受历史影响 | C19 |
| 原始问题含业务词 → 分解只基于 rewritten_query | C27 |
| 模块上下文不影响分解结果 | C33a + C33b |
| Target line ≠ 过滤 | C34 |
| 仪表板模糊操作 + 步骤追问 | C35 |
| 多group操作的拆分判断 | C36 |
| EM操作与可视化词污染防控 | C37 |
| 长多轮对话的隔离性验证 | C38 |
| 特殊字符处理和JSON转义 | C39 |

---

## 附：各 contextType 的 Case 分布

| contextType | C 系列 | CI 系列 |
|-------------|--------|---------|
| dashboard | C01, C11, C21, C25, C32, C33b, C35, C38 | CI-07 |
| worksheet | C03, C12, C13, C28, C29, C36 | CI-05 |
| freehand | C05, C14, C22 | CI-03 |
| table | C06, C15 | CI-06 |
| chart | C02, C23, C27, C30, C31, C33a, C34, C39 | CI-01, CI-04, CI-08, CI-10, CI-11 |
| crosstab | C04, C17, C26 | CI-02 |
| portal | C07, C20 | — |
| em | C08, C16, C24, C37 | CI-09 |
| scheduleTask | C09, C18 | CI-12 |
| dashboardPortal | C10, C19 | — |

---

*文件生成时间：2026-03-13*
*规则来源：检索策略Prompt规则分析与测试维度.md、subjectAreas_Analysis.md*