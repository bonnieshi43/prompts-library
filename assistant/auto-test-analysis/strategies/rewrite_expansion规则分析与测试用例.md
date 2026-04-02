# Rewrite_Expansion检索策略 Prompt 规则分析与测试维度（含测试用例集）

---

# Part A：Rewrite_Expansion Prompt 系统性分析

> 文件来源：`chat-app/server/prompts-v2/retrievers/rewrite_expansion.prompt`（主文件，内含 `rewrite_rule.prompt` + `expansion_rule.prompt`）
> 分析目标：为后续测试用例设计提供规则映射（只针对Expansion 的规则边界/触发条件,Rewrite的规则在default_strategies中已经覆盖，所以不再进行测试）

---

## 一、Rewrite 阶段 Prompt 规则系统性分析

---

### 1 Rewrite 阶段主要规则总结

#### 1.1 上下文注入开关（`allowContextInjection`）

默认为 `false`。满足以下任一条件时置为 `true`：

- `rewriteWithContext` 参数为 `true`
- 问题属于 Dashboard 模糊操作，且当前模块含 `chart / crosstab / freehand table` 之一，并且问题动作与模块类型匹配
- 问题属于步骤追问（step inquiry），且历史对话存在清晰流程；或 `allowContextInjection = true`

关键点：该开关仅用于“授权是否允许注入上下文”，不代表必然注入。

#### 1.2 Step 1：判断是否需要改写

| 条件 | 处理方式 |
|---|---|
| 问题清晰、术语正确（如 `how to create a bar chart`） | 仅去除/替换疑问词（how/how to/what is/why is/why 等），跳过 Step 2，进入 Step 3 |
| 问题模糊、缺乏上下文、或询问具体操作步骤（如 `what is the next step?`） | 进入 Step 2 进行改写（生成可用于检索文档的 rewritten query） |

#### 1.3 Step 2：改写规则

规则一：是否允许上下文（只授权，不保证注入）

- `allowContextInjection = false`：严禁添加任何上下文，只使用原始输入进行改写
- `allowContextInjection = true`：仅授权允许上下文注入，实际注入内容与条件由后续规则（Step 2.2、Step 3）决定

规则二：步骤追问（Step inquiries）处理

识别关键词：`first/second/third step、next step、what next、then、continue ...`。

处理策略：

- 有历史流程上下文：改写为询问“后续步骤”，避免直接回答步骤内容
- 无历史但 `allowContextInjection = true`：使用模块上下文改写
- 禁止：直接回答步骤内容；严格禁止在不允许的场景中拼接上下文

规则三：聚焦功能操作（核心规则）

必须忽略（业务内容）：

- 具体字段名
- 业务实体名
- 业务指标名
- 业务场景描述

必须保留/转换（操作内容）：

- 排名/排序：top/bottom/highest/lowest/first/last → `view data ranking` / `sort data`
- 过滤/筛选：filter out/exclude/hide/show only → `filter data`
- 排名 vs 过滤优先级：仅当筛选依赖于排序位置（ordered position）时，ranking 优先；dashboard 模块中排名与过滤共存时倾向 ranking
- 数据对比/比较 → `data comparison`
- 图表目标线/基准线/阈值线 → `target line`（不是过滤，也不是排名）
- 时间序列展示 → `display time series`（不等价于趋势分析/对比）
- 同比/环比/趋势分析/显式对比意图 → `date comparison` / `trend analysis`
- 分组：数据字段分组 → `group data`；UI 组件分组 → `group components`
- 汇总/聚合 → `aggregate data`
- 自定义布局表格 → `freehand table`（限定“自定义布局表格”，不用于普通 table 样式）
- 表关系：join → `join tables`；union → `union tables`；crossjoin → `Crossjoin tables`
- 数据源：Excel 数据/文件 → `Excel data source`
- 调度模块：任务调度的顺序/依赖/条件/执行描述必须包含调度条件关键词（`dependency / condition / execution order / follow-up`）
- 多动作/多模块组合：terms 用分号 `;` 分隔输出

重要补充：禁止主动扩展（active expansion）

- 只允许被动转换：把用户已提及的内容改写为标准术语
- 禁止主动引入用户未提及的新增功能/操作
- 单一查询原则：除非用户显式提到多个不相关操作，否则保持查询单一范围
- rewritten query 不得覆盖比原问题更大的范围

#### 1.4 Step 3：Dashboard 组件上下文注入

当以下全部条件满足时注入：

- `allowContextInjection = true`
- 当前模块包含 `chart / crosstab / freehand table`
- 用户问题对组件类型存在歧义
- 用户问题未已明确提及具体组件类型

注入动作：从上下文抽取组件关键词（chart/crosstab/freehand table），追加到 rewritten query 末尾以定位正确文档。

#### 1.5 Stage Two：改写自检（Self-Check）

改写结果输出前需逐项自检并在失败时修正：

- 是否避免业务数据（字段名/实体名/指标名等）
- 步骤追问是否被正确改写（避免直接回答步骤内容）
- 是否聚焦功能操作（排除业务分析/解读）
- 是否使用标准术语且准确
- 是否存在不当上下文拼接
- 是否仅改写而不是扩展（避免引入额外问题/新方向）
- Enterprise Manager 场景处理是否正确（EM 操作不得出现 dashboard/chart/table/crosstab 等可视化词）

---

### 2 `rewriteWithContext` 的判断逻辑与应用场景

#### 2.1 参数定义与来源

`rewriteWithContext` 是系统外部传入的布尔参数，由上游对话状态/模块判断决定；prompt 内部不自行计算。

#### 2.2 触发场景（何时为 true）

- 步骤追问：用户问“下一步是什么/然后呢/接下来呢”
- Dashboard 模糊操作：模块内用户行为不明确到具体组件类型（但动作方向明确）
- 上下文相关性高：系统判断注入上下文能提升检索准确度
- 多轮关联：用户问题与前序对话明确相关

#### 2.3 作用机制（授权但不强制注入）

`rewriteWithContext=true` 只会激活 `allowContextInjection` 开关；Step 2.2（步骤追问）与 Step 3（组件注入）仍需满足各自额外约束才会真正注入上下文。

简化逻辑（与 prompt 一致）：

```text
allowContextInjection = false

if rewriteWithContext == true
  => allowContextInjection = true
else if (dashboard ambiguous op AND module in [chart,crosstab,freehand table] AND action matches)
  => allowContextInjection = true
else if (step inquiry AND (history has clear process OR allowContextInjection == true))
  => allowContextInjection = true
```

#### 2.4 具体效果与优先级

Step 2.2（步骤追问）：

- `rewriteWithContext=true` + 步骤追问
  - 有历史流程：改写为续步骤
  - 无历史但 `allowContextInjection=true`：使用模块上下文改写
  - 无历史且 `allowContextInjection=false`：只基于原始输入，不拼接上下文

Step 3（组件注入）：

- 只有在 `allowContextInjection=true` 且当前模块为 chart/crosstab/freehand table，且用户问题对组件类型歧义且未明确组件类型时，才追加组件关键词。

优先级关键点：

- `rewriteWithContext=true` + 步骤追问 + 有历史流程：优先使用历史流程语义（而非只套模块上下文）
- `rewriteWithContext=true` + 用户已明确组件类型：Step 3 不注入
- `rewriteWithContext=true` + 模块不属于 chart/crosstab/freehand table：Step 3 不注入

关键区分：

- `rewriteWithContext=true` ≠ 一定会注入上下文，只是允许开关打开
- 非步骤追问/非 Step 3 场景不得拼接历史或模块上下文

#### 2.5 对应测试用例（快速对齐）

- `C06/C07/C18`：步骤追问 + 历史流程 → 续步骤改写（不直接回答步骤内容）
- `C30`：步骤追问 + 无历史 + `allowContextInjection=true` → 用模块上下文改写
- `C31`：`rewriteWithContext=false` 但触发 dashboard 模糊操作判定 → allowContextInjection 自动激活（从而允许 Step 3 行为）
- `C32`：步骤追问 + `allowContextInjection=false` → 不拼接上下文
- `C16/C33/C38`：组件类型已明确或模块不匹配或非步骤追问 → 不注入上下文（仅授权，不强制）

---

## 二、Expansion 阶段规则清单（共 4 条）

### Rule 1 — 直接使用原 Query（最高优先级）

**触发条件（两个条件必须同时满足）：**
- 改写后的 query 已包含标准术语（如 crosstab、dashboard、hyperlink、filter 等）
- 意图清晰，无歧义

**"意图清晰"的精确含义（重要）：**
不仅指用户的目标明确，更要求标准术语能**唯一确定**一个具体的功能/文档路径。

反例（不满足 Rule 1，应扩展）：
```
User: How to display my data in a table?
```
"table" 是标准术语，意图也明确，但在 StyleBI 中对应多个不同组件（crosstab / table / freehandTable），存在**特征级歧义**，因此不满足 Rule 1，应触发 Rule 4 扩展。

正例（满足 Rule 1，不扩展）：
```
User: How to set a hyperlink for a crosstab?
```
"hyperlink + crosstab" 唯一对应一个功能文档，无歧义。

**期望行为：**
- 直接返回改写后的 query，不做扩展
- 输出数组长度 = 1

**Prompt 原文：** _"Do not expand for the sake of quantity."_

---

### Rule 2 — 内容完整性

**规则：**
- 每条扩展 query 必须覆盖用户原始问题提到的**所有要点**
- 不允许生成只覆盖部分意图的 query

**Prompt 原文：** _"Each query must comprehensively cover all points mentioned in the user's original question."_

---

### Rule 3 — 零冗余

**规则（含两个子规则）：**
- **3a：** 若多条 query 指向同一篇功能文档，只保留最简洁的那条
- **3b：** 严格禁止通过仅替换动词（add / set / configure 等）生成语义相同的 query

**Prompt 原文：** _"Strictly prohibit generating semantically identical queries by merely swapping verbs."_

---

### Rule 4 — 多角度问题求解

**触发条件：**
- 问题具有歧义、或存在多个可能的技术解法
- 问题描述的是症状/现象而非具体功能操作

**期望行为：**
- 从不同技术视角或功能角度扩展 1–3 条 query
- 每条 query 代表一个真正独立的功能路径

**Prompt 内置示例：**

| 用户问题 | 输出（扩展角度） |
|---|---|
| 为什么看不到别人分享的 dashboard？ | 访问权限配置 / 目录查看权限 / RBAC 用户角色 |
| 怎么把柱状图变红？ | 条件格式 / 主题色 / 自定义配色 |
| 怎么用表格展示数据？ | crosstab / table / freehandTable |
| 只显示 2025 年的数据 | 报表过滤条件 / 过滤组件 / 数据集过滤条件 |
| 怎么创建图表？ | 只返回 1 条（意图已清晰） |
| 怎么给 crosstab 设置 hyperlink？ | 只返回 1 条（已含标准术语） |

---

## 三、测试维度

### 维度 A — Rule 1：标准术语 + 唯一特征映射 → 不扩展

**核心验证点：** 标准术语能唯一确定一个功能文档时，不应强行凑数扩展。

| 测试场景 | 输入特征 | 期望输出 |
|---|---|---|
| A1 | 含单一标准术语（hyperlink），唯一映射到一个功能 | 长度 = 1 |
| A2 | 含多个标准术语（hyperlink + crosstab），组合仍唯一确定功能 | 长度 = 1 |
| A3 | 含标准术语但该术语在 StyleBI 中对应多个组件（如 table → crosstab/table/freehandTable） | 应扩展至 2–3 |
| A4 | 含标准术语但问题宽泛（如"如何使用 filter？"，filter 有多个入口） | 应扩展（边界案例） |
| A5 | 无标准术语，意图清晰 | 应扩展 |

---

### 维度 B — Rule 2：内容完整性

**核心验证点：** 多要点问题，扩展 query 不能遗漏原始要求中的任何一点。

| 测试场景 | 输入特征 | 期望输出 |
|---|---|---|
| B1 | 问题包含两个操作步骤（如：创建图表并设置颜色） | 每条 query 均覆盖两个要点 |
| B2 | 问题包含条件限定（如：在移动端 dashboard 上…） | 限定条件不能在任何 query 中丢失 |
| B3 | 长问题含多个子问题 | 展开时不遗漏子问题 |

---

### 维度 C — Rule 3：零冗余

**核心验证点：** 不同表述但语义等价的 query 应被合并。

| 测试场景 | 输入特征 | 期望输出 |
|---|---|---|
| C1 | 可能生成"添加过滤条件"和"设置过滤条件"两条 query | 只保留 1 条 |
| C2 | 可能生成"配置权限"和"设定权限"两条 query | 只保留 1 条 |
| C3 | 多角度展开后，两个角度实际指向同一文档 | 合并为 1 条 |

---

### 维度 D — Rule 4：多角度展开质量

**核心验证点：** 展开的 query 应来自真正不同的功能模块，而非换词。

| 测试场景 | 输入特征 | 期望输出 |
|---|---|---|
| D1 | 模糊问题（如"数据显示不对"） | 从数据源、计算、过滤多角度展开 |
| D2 | 症状问题（如"图表加载很慢"） | 从性能优化、数据量、查询等角度展开 |
| D3 | 同一功能有多种实现路径（如 prompt 示例中的表格类型） | 每条对应一种实现路径 |
| D4 | 展开后两条 query 实际上是同一功能换了描述词 | 应被 Rule 3 过滤，只保留 1 条 |

---

### 维度 E — 输出格式合规性

**核心验证点：** 模型必须严格输出纯 JSON，不带任何额外内容。

| 测试场景 | 验证点 |
|---|---|
| E1 | 输出是否为合法 JSON 数组 |
| E2 | 数组元素是否全为字符串 |
| E3 | 是否不含 markdown 代码块（```json） |
| E4 | 是否不含解释性文字或前缀 |
| E5 | 数组长度是否在 1–3 之间 |

---

### 维度 F — 数量约束

**核心验证点：** 扩展数量上限为 3，不得超出。

| 测试场景 | 输入特征 | 期望输出 |
|---|---|---|
| F1 | 非常宽泛的问题（有 5+ 种可能解法） | 长度 ≤ 3，选最相关的角度 |
| F2 | 意图单一的问题 | 长度 = 1，不硬凑 |

---

## 四、最容易出错的地方

### 错误类型 1：过度扩展（最高频）

**现象：** 即使 query 已含标准术语且意图清晰，模型仍倾向于生成 2–3 条来"显得更全面"。

**根因：** LLM 的默认行为是"多输出=更完整"，与 Rule 1 的"量少质精"原则相悖。

**典型案例：**
```
输入：How to set a hyperlink for a crosstab?
错误输出：["How to set a hyperlink for a crosstab", "Configure link in table component", "Add URL in crosstab cell"]
正确输出：["How to set a hyperlink for a crosstab"]
```

---

### 错误类型 2：冗余 query（Rule 3b 违反）

**现象：** 模型用不同动词生成语义等价的 query，无法自我识别为冗余。

**典型案例：**
```
错误输出：["Add filter to report", "Set filter conditions in report", "Configure filter in report"]
正确输出：["Add filter conditions to report"]
```

---

### 错误类型 3：Rule 1 与 Rule 4 的边界判断失误

**现象：** 模型无法正确判断标准术语是否"唯一确定"一个功能，导致该扩展时不扩展，或不该扩展时扩展。

**高风险案例：**

| 输入 | 正确行为 | 原因 |
|---|---|---|
| `"How to use filter?"` | 应扩展 | filter 有多个入口（报表/组件/数据集），存在特征级歧义 |
| `"How to set a filter on a table?"` | 应扩展 | table 本身映射多个组件（crosstab/table/freehandTable） |
| `"Why can't I add a filter?"` | 应扩展 | 症状性问题，即使含标准术语也需多角度排查 |
| `"How to set a hyperlink for a crosstab?"` | 不扩展 | hyperlink + crosstab 唯一确定一个功能 |
| `"How to create a chart?"` | 不扩展 | chart 意图单一，无歧义 |

**核心判断依据：**
- 标准术语 → 唯一功能文档 → Rule 1（不扩展）
- 标准术语 → 多个功能文档/组件 → Rule 4（扩展）
- 症状性/宽泛问题 → Rule 4（扩展），无论是否含标准术语

---

### 错误类型 4：多角度展开"形散神不散"

**现象：** 展开的 query 表面上来自不同角度，但实际引用同一篇文档（违反 Rule 3a）。

**典型案例：**
```
用户：怎么限制用户看到的数据？
输出：["Row-level security", "Data row filtering", "Data access restriction"]
```
以上三条可能都指向同一篇权限文档，应只保留 1 条。

---

### 错误类型 5：内容完整性丢失（多要点问题）

**现象：** 问题包含两个及以上条件，扩展后只有部分 query 涵盖所有条件，另一部分遗漏了限定语。

**典型案例：**
```
输入：How to add a filter on a mobile dashboard?
错误输出：["Add filter to dashboard", "Mobile layout configuration"]
正确输出：["Add filter on mobile dashboard", "Mobile dashboard filter component"]
// "mobile" 限定语不能在任何 query 中丢失
```

---

### 错误类型 6：输出格式违规

**现象：** 模型在 JSON 前后附加说明文字，或使用 markdown 代码块包裹，导致下游 JSON.parse 失败。

**常见形式：**
```
Here are the expanded queries:
```json
["Query 1", "Query 2"]
```

---

## 五、其他值得关注的点

### 4.1 多轮对话上下文的影响

prompt 中包含 `{history}` 字段，意味着历史对话会参与扩展决策。

**潜在风险：**
- 当历史对话引入了额外上下文时，当前问题的"标准术语是否清晰"判断可能受干扰
- 例如：历史中已确认用户在操作 crosstab，当前问题是"怎么设置颜色"——此时是否应扩展？

**建议测试：**
- 带历史的多轮场景 vs 无历史的单轮场景，对比扩展行为是否一致

---

### 4.2 `rewriteWithContext` 字段的双重角色

prompt 中 `{rewriteWithContext}` 是 Rewrite 阶段的输出，直接作为 Expansion 的输入。

**潜在风险：**
- 如果 Rewrite 阶段输出质量差（query 仍然模糊或含口语），Expansion 规则会更难判断是否触发 Rule 1
- Expansion 测试应包含"Rewrite 输出质量不佳"的降级场景

---

### 4.3 标准术语列表未穷举

prompt 给出的示例术语（crosstab、dashboard、hyperlink、filter）只是示例，非完整列表。

**潜在风险：**
- 模型对非示例术语（如 `binding`、`viewsheet`、`dataTip`、`rangeslider`）是否同样应用 Rule 1，行为可能不一致
- 建议针对这些"边缘标准术语"专门设计测试用例

---

### 4.4 中英文混合输入

用户可能用中文提问（如 prompt 示例中有中文问题），Expansion 输出的语言应与 Rewrite 后的 query 保持一致（通常为英文）。

**潜在风险：**
- 中文输入 → 英文 query，扩展的语言是否统一？
- 中英混合问题时输出语言是否稳定？

---

## 六、测试维度汇总表

| 维度 | 对应规则 | 验证重点 | 优先级 |
|---|---|---|---|
| A：不扩展场景 | Rule 1 | 含标准术语+清晰意图时不冗余扩展 | P0 |
| B：内容完整性 | Rule 2 | 多要点问题不丢失限定条件 | P1 |
| C：零冗余 | Rule 3 | 语义相同的 query 合并 | P0 |
| D：多角度质量 | Rule 4 | 展开的 query 来自真正不同功能模块 | P1 |
| E：输出格式 | 输出规范 | 纯 JSON，无 markdown，无额外文字 | P0 |
| F：数量约束 | 隐式约束 | 1–3 条，不超限，不强凑 | P1 |
| G：Rule 1 vs Rule 4 边界 | Rule 1 + Rule 4 | 标准术语 + 宽泛问题时的判断 | P0 |
| H：多轮对话影响 | 上下文处理 | 历史对话是否干扰扩展判断 | P2 |
| I：边缘标准术语 | Rule 1 | 非示例术语是否同等触发 Rule 1 | P2 |
| J：中英文稳定性 | 输出规范 | 输出语言与 Rewrite 输出一致 | P2 |

---

# Part B：Expansion 阶段测试用例

---

> 基于 `expansion_rule.prompt` 规则分析设计
> 总计 25 条
> contextType 覆盖：dashboard / worksheet / freehand / table / chart / crosstab / portal / em / scheduleTask / dashboardPortal

---

## 测试用例总表

| Case ID | 用户问题 | contextType | 预期 final_queries | 覆盖规则 |
|---|---|---|---|---|
| EXP-001 | How do I add a hyperlink to a crosstab? | crosstab | `["How to add a hyperlink to a crosstab"]` | 直接使用原 Query：hyperlink + crosstab 唯一确定一个功能；Rewrite 将 "How do I" 替换为 "How to" |
| EXP-002 | How to create a dashboard? | dashboard | `["How to create a dashboard"]` | 直接使用原 Query：dashboard 创建意图单一，无歧义；Rewrite 保留 "How to" 形式 |
| EXP-003 | What is a rangeslider and how do I add it to a dashboard? | dashboard | `["add rangeslider to dashboard"]` | 直接使用原 Query：rangeslider 为边缘标准术语，意图唯一；Rewrite 去除 "What is...and how do I" 复合疑问词，保留操作部分 |
| EXP-004 | How does the dataTip feature work on a chart? | chart | `["dataTip in chart"]` | 直接使用原 Query：dataTip 为边缘标准术语，意图唯一；Rewrite 去除 "How does...work on" 疑问结构 |
| EXP-005 | How do I use filters in my worksheet? | worksheet | `["Add filter conditions to worksheet", "Create filter component", "Add filter conditions to dataset"]` | 多角度展开：filter 有多个入口（过滤条件 / 过滤组件 / 数据集过滤），标准术语无法唯一确定功能路径；Rewrite 去除 "How do I use" 和 "my"，输出参考 expansion 内置示例格式（动词短语，无 How to 前缀） |
| EXP-006 | Why can't I see the dashboard my colleague shared with me? | dashboardPortal | `["Dashboard access permission configuration", "Directory viewing permission troubleshooting", "User roles and department settings (RBAC)"]` | 多角度展开：症状性问题，即使含 dashboard 也需扩展；Rewrite 去除症状描述和 "my colleague"；expansion_rule.prompt 内置此问题的标准示例输出 |
| EXP-007 | Why is my chart not showing any data? | chart | `["Chart data binding configuration", "Dataset query troubleshooting for chart", "Data source connection configuration for chart"]` | 多角度展开：症状性问题（图表无数据），Rewrite 去除 "Why is my...not showing"，覆盖 data binding / 数据集查询 / 数据源配置三个排查方向 |
| EXP-008 | I want to only show data from this year. | worksheet | `["Add filter conditions to report", "Create filter component", "Add filter conditions to dataset"]` | 多角度展开：Rewrite 将 "show only" 转换为 `filter data`，剥离 "this year" 业务时间细节；expansion_rule.prompt 内置此模式标准示例（"I want to show only 2025 data"） |
| EXP-009 | How do I change the color of my bar chart? | chart | `["Configure conditional formatting", "Change theme colors", "Customize chart color scheme"]` | 多角度展开：Rewrite 去除 "How do I" 和 "my"；expansion_rule.prompt 内置此问题标准示例（"How do I turn the bar chart red?"）对应三种配色路径 |
| EXP-010 | I can't log into the portal after my admin created my account. | portal | `["Portal login troubleshooting", "User role and permission configuration for portal", "User group and directory permission configuration in portal"]` | 多角度展开：症状性登录问题；Rewrite 去除 "I can't / my admin / my account" 个人信息，覆盖登录排查 / 角色权限 / 用户组目录权限三个方向 |
| EXP-011 | How do I send a dashboard to my team automatically every Monday? | scheduleTask | `["Create scheduled task to send dashboard", "Configure email recipients for scheduled task", "Set weekly recurrence for scheduled task"]` | 多角度展开：Rewrite 去除 "How do I / my team / every Monday"（业务时间细节）；定时任务有多个独立配置步骤（创建任务 / 邮件收件人 / 时间重复规则） |
| EXP-012 | What are my options for comparing data across different time periods? | dashboard | `["date comparison in crosstab", "date comparison using time series chart", "date comparison using dashboard date filter"]` | 多角度展开：Rewrite 去除 "What are my options for"，显式时间段对比意图转换为标准术语 `date comparison`；有多种实现路径（crosstab / 时序图表 / 日期过滤器）；数量约束 ≤3 |
| EXP-013 | How do I restrict which rows of data each user can see? | em | `["Row-level security configuration", "Virtual private model for user data restriction", "User role data access permission configuration"]` | 多角度展开：Rewrite 去除 "How do I restrict"，用户行级数据权限有多种真正不同的实现路径（row-level security / virtual private model / 用户角色权限） |
| EXP-016 | Why does my scheduled task always send an empty dashboard? | scheduleTask | `["Scheduled task data query troubleshooting", "Scheduled task parameter configuration", "Scheduled task output format configuration"]` | 多角度展开：症状性问题；Rewrite 去除 "Why does my...always send an empty"，覆盖数据查询 / 参数配置 / 输出格式三个排查方向 |
| EXP-015 | How do I create a chart that automatically updates when I change the date filter? | dashboard | `["Create chart that updates when date filter changes", "Configure filter interaction for chart update in dashboard"]` | 内容完整性：Rewrite 去除 "How do I"；chart creation 和 filter interaction 两要点必须在每条 query 中同时出现，不可拆分 |
| EXP-016 | Where can I configure the email server settings for scheduled tasks in Enterprise Manager? | em | `["configure email server settings for scheduled tasks in Enterprise Manager"]` | 直接使用原 Query：Rewrite 去除 "Where can I"，保留 email server / scheduled task / Enterprise Manager 三个明确限定，意图唯一；三个限定条件全部保留（Rule 2） |
| EXP-017 | How do I set up user access permissions for a dashboard? | dashboard | `["user access permissions for dashboard"]` | 零冗余：Rewrite 去除 "How do I set up"；禁止仅替换动词（add / set / configure）生成语义等价 query，只保留最简洁的一条 |
| EXP-018 | How do I configure a schedule task to run every day? | scheduleTask | `["schedule task daily recurrence"]` | 零冗余：Rewrite 去除 "How do I configure...to run"，转换为 `schedule task daily recurrence`；禁止仅替换动词生成语义等价 query |
| EXP-019 | What can I do with StyleBI? | portal | `["Create and publish dashboards in StyleBI", "Build data analysis worksheets in StyleBI", "Set up data sources in StyleBI"]` | 多角度展开：宽泛问题；Rewrite 去除 "What can I do with"；选最具代表性的 3 个功能方向；数量约束 ≤3 |
| EXP-020 | How do I export data from my dashboard? | table | `["Export table data to Excel from dashboard", "Export dashboard to PDF", "Download chart data from dashboard"]` | 多角度展开：Rewrite 去除 "How do I" 和 "my"；导出有多种格式路径（Excel / PDF / chart data）；零冗余：不同导出路径功能文档不重叠 |
| EXP-021 | **[History]** "How do I create a crosstab?" → answered. **[Current]** How do I change the background color? | crosstab | `["set background color for crosstab"]` | 直接使用原 Query：rewriteWithContext=true 激活上下文注入；Step 3 将 contextType=crosstab 注入模糊问题；history 也确认用户在操作 crosstab；background color + crosstab 意图唯一锁定 |
| CHN-001 | 为什么我的图表加载很慢？ | chart | `["Chart rendering performance optimization", "Dataset query optimization for chart", "Reduce data volume for chart performance"]` | 多角度展开：症状性问题；Rewrite 去除 "为什么我的"，输出为英文（与 expansion 示例语言一致）；覆盖渲染性能 / 数据集查询优化 / 数据量控制三个方向 |
| CHN-002 | 怎么限制用户只能看到自己部门的数据？ | em | `["Row-level security configuration for user data restriction", "Virtual private model setup for user data access", "User role data access permission configuration"]` | 多角度展开：Rewrite 去除 "怎么限制 / 自己部门的"，输出为英文；三条路径真正独立（row-level security / VPM / 用户角色），不能都指向同一权限文档 |
| CHN-003 | 如何在 dashboard 中添加过滤器？ | dashboard | `["Add filter component to dashboard", "Set dashboard filter condition", "Add selection list to dashboard"]` | 多角度展开：Rewrite 去除 "如何"，输出为英文；dashboard filter 有多个入口（过滤组件 / 过滤条件 / 选择列表），标准术语无法唯一确定功能路径 |
| CHN-004 | 我想在dashboard里展示数据对比，怎么做？ | freehand | `["data comparison in crosstab", "data comparison in chart", "data comparison in table"]` | 多角度展开：Rewrite 去除 "我想 / 怎么做"，"数据对比" 转换为标准术语 `data comparison`，输出为英文；数据对比展示有多种可视化路径（crosstab / chart / table） |

---

## 各维度覆盖汇总

| 维度 | 对应 Case ID | Case 数 |
|---|---|--------|
| A（Rule 1 不扩展） | EXP-001, 002, 003, 004, 016, 017, 018, 021 | 8 |
| B（Rule 2 内容完整性） | EXP-015, 016, 021 | 3 |
| C（Rule 3 零冗余） | EXP-017, 018, CHN-002 | 3 |
| D（Rule 4 多角度质量） | EXP-005, 006, 007, 008, 009, 010, 011, 012, 013, 016, 019, 020, CHN-001, CHN-002, CHN-003, CHN-004 | 16 |
| F（数量约束） | EXP-012, 019, 020 | 3 |
| G（Rule 1 vs Rule 4 边界） | EXP-005, 006, CHN-003 | 3 |
| H（多轮对话） | EXP-021 | 1 |
| I（边缘标准术语） | EXP-003, 004 | 2 |

---

## contextType 覆盖汇总

| contextType | Case ID |
|---|---|
| dashboard | EXP-002, 003, 012, 015, 017, 019, 020, CHN-003 |
| worksheet | EXP-005, 008 |
| freehand | CHN-004 |
| table | EXP-020 |
| chart | EXP-004, 007, 009, CHN-001 |
| crosstab | EXP-001, 021 |
| portal | EXP-010, 019 |
| em | EXP-013, 016, 017, 018, CHN-002 |
| scheduleTask | EXP-011, 016, 018 |
| dashboardPortal | EXP-006 |

---

## 疑问类型覆盖汇总

| 类型 | Case ID |
|---|---|
| How do I / How to | EXP-001, 002, 003, 005, 009, 011, 013, 015, 017, 018, 020, 021, CHN-003 |
| Why | EXP-006, 007, 016, CHN-001 |
| What | EXP-003, 004, 012, 019 |
| Where | EXP-016 |
| 陈述 / 意图句 | EXP-008, 010, CHN-002, CHN-004 |

---

## 验证方式建议

| 验证点 | 建议断言类型 |
|---|---|
| 数组长度 = 1（Rule 1 / 零冗余） | `json-path: $.length == 1` |
| 数组长度 ≤ 3 | `json-path: $.length <= 3` |
| 输出为合法 JSON 数组 | `is-json` |
| 不含 markdown 代码块 | `not-contains: \`\`\`` |
| 关键词保留（Rule 2 内容完整性） | `contains: filter` / `contains: Enterprise Manager` 等 |
| 无语义重复（Rule 3b） | `llm-rubric: none of the queries are semantically identical or differ only by verb` |
| 多角度真实独立（Rule 4） | `llm-rubric: each query targets a different feature module or technical approach` |
| 中文输入英文输出（CHN cases） | `llm-rubric: all queries are in English` |
