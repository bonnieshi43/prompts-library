# Rewrite 公共规则分析与测试维度

> 本文件作为可复用的 Rewrite 公共规则文档。

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

## 二、rewriteWithContext 的判断逻辑与应用场景

### 1. 参数的计算位置

`rewriteWithContext` 由 TypeScript 代码计算后作为参数传入 prompt，**不由 prompt 内部决定**。
最终传入 prompt 的字符串为 `"true"` 或 `"false"`（`promptRetriever.ts:23`）。

---

### 2. TypeScript 侧：`preferRewriteWithContext` 的计算（两个来源取 OR）

#### 来源 A：`getSubjectArea.ts` 内部 context 过滤触发

位置：`getSubjectArea.ts:251~263`，返回时直接设 `preferRewriteWithContext: true`。

**同时满足以下全部条件：**

1. LLM 返回的 subjectAreas 不为空
2. 不存在 `explicitly_mentioned=true` 的 area（否则直接走显式结果，不进过滤分支）
3. 存在 `parsedContext.contextType`（用户当前打开了具体页面）
4. 按 contextType 过滤后 `filteredAreas.length > 0`（过滤成功收窄了结果）

各 contextType 的过滤规则：

| contextType | 过滤条件 |
|---|---|
| `worksheet` | module 包含 "data worksheet" 或 "worksheet" |
| `freehand` | submodule 包含 "freehand" 或 "freehand table" |
| `chart` | submodule 包含 "chart" |
| `crosstab` | submodule 包含 "crosstab" |
| `table` | submodule 包含 "table" 且不含 "freehand" |

**含义**：LLM 返回了多个候选模块，系统根据用户当前页面把范围收窄了，query 应结合上下文重写。

#### 来源 B：`subjectAreas.ts` 中的补充判断

位置：`subjectAreas.ts:40~41`

```typescript
const finalPreferRewriteWithContext = preferRewriteWithContext ||
   (originalSubjectObj.length === 1 && isModuleMatchingContext(originalSubjectObj[0], internalContext));
```

**条件**：`getSubjectArea` 返回的**恰好只有 1 个** subjectArea，且该 area 与 `internalContext` 匹配。

`isModuleMatchingContext` 的匹配规则（`getSubjectArea.ts:381~410`）：

| contextType | 匹配条件 |
|---|---|
| `worksheet` | module 包含 "data worksheet" 或 "worksheet" |
| `freehand` | submodule 包含 "freehand" 或 "freehand table" |
| `chart` | submodule 包含 "chart" |
| `crosstab` | submodule 包含 "crosstab" |
| `table` | submodule 包含 "table" 且不含 "freehand" |

**含义**：LLM 只返回了一个模块，且刚好就是用户当前所在页面，问题是强上下文相关的。

---

### 3. Prompt 侧：`allowContextInjection` 的计算

默认 `allowContextInjection = false`，满足以下**任一**条件置为 `true`：

| 条件 | 说明 |
|---|---|
| `rewriteWithContext = true` | TypeScript 侧已判定需要上下文（直接透传） |
| query 是 **Dashboard 模糊操作** AND module 含 chart/crosstab/freehand table AND 操作动作与模块类型匹配 | 用户在 Dashboard 某组件页面提出模糊操作 |
| query 是**步骤询问**（含"下一步"/"第几步"/"then"/"continue"等关键词）AND（历史有明确流程 OR `allowContextInjection = true`） | 追问步骤场景 |

---

### 4. 实际注入的两个时机（allowContextInjection=true 后仍受限）

#### Step 2（query rewrite 阶段）—— 仅限步骤询问

- 必须含有步骤关键词（first/next/then/continue 等）
- 有历史流程 → 用历史流程改写为续步骤查询
- 无历史且 `allowContextInjection = true` → 用 module context 改写
- **严禁**对其他类型 query 直接拼接上下文

#### Step 3（Dashboard 组件注入）—— 同时满足以下全部

1. `allowContextInjection = true`
2. 当前 module context 包含 chart / crosstab / freehand table 之一
3. 用户 query 对组件类型**有歧义**（功能可适用于多个 Dashboard 组件）
4. query 中**没有**已经提到具体组件名

满足时：从 context 提取组件关键词（chart/crosstab/freehand table）追加到 query 末尾。

---

### 5. 完整决策树

```
preferRewriteWithContext (TS计算)
  = (来源A：LLM返回多area → contextType过滤成功收窄)
  || (来源B：LLM返回单area && 该area与internalContext匹配)
          ↓ 作为字符串参数 rewriteWithContext 传入 prompt
          ↓
allowContextInjection (Prompt计算，默认 false)
  = rewriteWithContext == "true"
  || (Dashboard模糊操作 && module匹配 && 动作与模块匹配)
  || (步骤询问 && (历史有流程 || allowContextInjection == true))
          ↓
实际注入（仍受场景限制）
  Step 2：仅步骤询问 → 拼接历史流程或module context
  Step 3：Dashboard组件歧义 && 未提及具体组件 → 追加组件名
```

---

### 6. 关键区分

- `rewriteWithContext = true` 只是"授权允许注入"，不代表每次都一定会注入
- `allowContextInjection = true` 之后仍受步骤询问 / Dashboard 组件歧义两个具体时机约束
- 非步骤询问的问题即使 `allowContextInjection = true` 也严禁拼接上下文
- Step 3 问题已明确组件类型时不注入（即使 `allowContextInjection = true`）
- 模块非 chart/crosstab/freehand table 时 Step 3 不注入
