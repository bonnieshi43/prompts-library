# Script 标志识别 — 测试风险点分析

> 更新日期：2026-03-04（全量重写，基于 script_flag_analysis.md）
> 角色：AI 测试工程师
> 分析范围：Prompt 识别规则 → 逻辑判断 → 文档检索 → 模板路由 → 答案生成

---

## 风险优先级说明

| 级别 | 含义 |
|------|------|
| P0 | 系统性错误，大概率影响用户答案质量，必须优先验证 |
| P1 | 高频边界场景，明显影响答案方向 |
| P2 | 中频边界，需额外测试用例覆盖 |
| P3 | 低频/轻微，可作为回归兜底 |

---

## RISK-01  「function」关键词触发范围过宽（P0）

### 风险描述

Prompt 规则第 7 条：查询中出现 `"function"` 即触发 `script=true`。
但自然语言中 `function` 大量用于描述**产品功能**或**内置公式**，并非脚本函数。

**典型误触发查询（预期 script=false）：**
```
"What is the SUM function in the formula editor?"
"What functions does the filter panel have?"
"How does the lookup function work in a table?"
"What is the function of the Data Binding panel?"
"The date function is not working, how to fix it?"
```

### 可能影响

- `getQuestionPrompt()` 错误路由到 `viewsheetScriptQuestion` / `chartScriptQuestion`
- `getDocumentString()` 在 script=true 分支下检索全量文档，script 文档进入上下文
- 答案以"脚本优先"方向输出，对实际只需内置公式的问题产生误导

### 建议测试方向

1. 构造 10 条含 `function` 但非脚本意图的查询，断言 `script=false`
2. 对照组：相同语义但不含 `function` 关键词（如用 `formula`、`operator` 替代），验证识别结果一致
3. 答案验证：误触发后，答案是否仍然正确（是否出现不必要的 JS 代码块）

---

## RISK-02  admin console 操作误触发 script=true（P1）

### 风险描述

Prompt 规则第 5 条：提到 `"admin console"` 即触发 `script=true`。
但 admin console 本身是 **GUI 工具**，绝大多数操作是纯界面配置，不涉及脚本编写。

**典型误触发查询（预期 script=false）：**
```
"How do I add a new user in the admin console?"
"Where can I configure email settings in admin console?"
"How to view audit logs in admin console?"
"How to set up data source connection in admin console?"
```

**应触发 script=true 的对照组：**
```
"How to run a query script in admin console?"
"How to deploy a custom script via admin console?"
```

### 可能影响

- GUI 型 admin console 操作被路由到 Script 模板
- 答案以脚本/代码为主，用户期望 UI 步骤，实际收到代码指引，无法操作

### 建议测试方向

1. 分别测试 admin console 的 GUI 操作查询与脚本操作查询，验证 `script` 识别各自正确
2. 对结果不确定的中间地带查询（如"admin console 配置 API"）重复运行 5 次，观察稳定性
3. 答案验证：GUI 型查询的回答中是否意外出现代码块

---

## RISK-03  隐式脚本需求识别失效（P1）

### 风险描述

Prompt 7 条规则全部基于**显式关键词**。对于语义上只能靠脚本实现、但描述中不含任何关键词的问题，LLM 将返回 `script=false`。

**典型漏判查询（预期 script=true，但无关键词）：**
```
"How to dynamically change a text element's background color based on a field value?"
"How to make a component visible only for specific users?"
"How to apply conditional formatting to chart elements based on a threshold?"
"How to trigger an action when a selection changes?"
```

### 可能影响

- `script=false` → 使用标准模板，文档检索过滤掉 script 模块（非 Dashboard 时）
- 用户收到"UI 步骤"答案，但实际任务无法通过 UI 完成，产生严重误导

### 建议测试方向

1. 整理出**只能通过脚本实现但问法朴素**的用例集（建议 15 条以上）
2. 断言 `script=true`，或答案中必须包含脚本代码示例
3. 与产品/开发对齐：确认这类场景是否应扩展 Prompt 规则，或依赖其他机制兜底

---

## RISK-04  `gui_required=true` 静默覆盖合法 script=true（P1）

### 风险描述

`isScriptModule()` 逻辑：`return !gui_required && script`。
当查询中含有"通过界面/通过 UI"等词语时，`gui_required=true`，即使 `script=true` 也会被强制归零。

**存在内在矛盾的规则组合：**
- 规则 5：提到 `"admin console"` → `script=true`
- `gui_required` 规则：admin console 是 GUI 界面 → LLM 可能同时设 `gui_required=true`
- 结果：`isScriptModule(true, true) = false`，script 被静默覆盖

**混合意图查询（风险边界）：**
```
"I want to use the interface to configure a script for conditional color changes"
"Is there a GUI way to write viewsheet scripts?"
"Can I do scripting through the visual editor in admin console?"
```

### 可能影响

- 合法的脚本查询被降级为 UI 路径，答案缺少代码指引
- 系统对用户完全不透明，无任何提示说明 script 被覆盖
- Admin Console 相关脚本操作查询结果不稳定

### 建议测试方向

1. 构造含"通过界面/UI"措辞但明确需要脚本的查询，验证 `script` 最终值
2. 读取 server logs 中 `getSimpleSubjectArea()` 的原始 YAML 输出，对比 `parsed.script`、`parsed.gui_required`、`isScriptModule()` 三者的值
3. 多次运行 admin console 类脚本查询，验证 `gui_required` 与 `script` 的组合是否稳定

---

## RISK-05  单 subject area 时 `scriptAnswerRules` 未生效（P1）

### 风险描述

`loadPrompt()` 中 `scriptAnswerRules` 替换逻辑：

```typescript
// getPromptTemplate.ts:122
if (combin && script) {
   content = content.replace(/\[include:answerRules\.prompt\]/g, "[include:scriptAnswerRules.prompt]");
}
```

该替换要求 `combin=true`（多个 subject area）。当只有**单一 subject area**（`combin=false`）且 `script=true` 时，此替换**不触发**。

- `chartScriptQuestion.prompt`、`viewsheetScriptQuestion.prompt` 等模板是否已**直接内嵌** `scriptAnswerRules`，决定了此风险的严重程度
- 若这些模板中只有 `[include:answerRules.prompt]`（标准规则），则 combin=false + script=true 时答案规则为 UI 导向

### 可能影响

- 单 subject area 脚本查询（最常见的场景）可能使用错误的 answerRules
- 答案风格：UI 为主，脚本为辅（与 scriptAnswerRules 要求的"脚本优先"相反）
- combin=false vs combin=true 同类脚本查询的答案风格不一致

### 建议测试方向

1. 阅读 `chartScriptQuestion.prompt`、`viewsheetScriptQuestion.prompt`，确认是否内嵌 `scriptAnswerRules`
2. 构造单 subject area 脚本查询 vs 跨 subject area 脚本查询，对比答案风格（脚本/UI 的主次位置）
3. 验证 `combin=false + script=true` 场景下，答案是否仍符合"Script MUST be primary"原则

---

## RISK-06  `script=true` 检索无过滤，GUI 文档进入脚本上下文（P1）

### 风险描述

`getDocumentString()` 在 `script=true` 分支下**不传任何 filter**：

```typescript
// tools.ts:134-137
if(script) {
   const { docs } = await getDocumentResults(retrievalQueries, combin, logs, ...);  // 无 filter
}
```

相比之下，`script=false + considerScript=true` 分支用精确过滤器分别检索两组文档。
`script=true` 时，Pinecone 向量搜索覆盖**全部 module**，包括大量 GUI 操作文档（如 Portal、Dashboard 菜单操作说明）。

**风险场景：**
若用户查询语义与 GUI 文档相似度更高（如 "change chart bar color"），向量检索可能优先返回 GUI 文档，导致脚本问题得到 UI 答案。

### 可能影响

- `script=true` 场景下检索结果质量不稳定，高度依赖查询措辞
- 文档中 GUI 比例过高时，`scriptAnswerRules` 要求的"脚本优先"无足够文档支撑
- LLM 在 GUI 文档主导的 context 下可能回退到 UI 步骤

### 建议测试方向

1. 构造脚本查询，在 server logs 中统计 Retrieved Documents 的 `module` 分布（SCRIPT_MODULES vs 非 SCRIPT_MODULES 比例）
2. 同一查询分别在 `script=true` 和 `script=false + isDashboard=true` 下对比 context 文档组成
3. 识别哪类查询在 `script=true` 时仍主要返回 GUI 文档，评估答案质量

---

## RISK-07  table / freehand / Worksheet 的 script=true 被静默忽略（P1）

### 风险描述

`getQuestionPrompt()` 中分支优先级如下（简化）：

```
combin              → multiSubjectQuestion
chart && script     → chartScriptQuestion       ✅
trend&comparison    → trendComparisonQuestion   ← 无 script 变体，提前截断
chart               → chartQuestion
freehand            → freehandQuestion          ← 无 script 变体，提前截断
crosstab && script  → crosstabScriptQuestion    ✅
crosstab            → crosstabQuestion
table               → tableQuestion             ← 无 script 变体，提前截断
Worksheet           → worksheetQuestion         ← 无 script 变体，提前截断
script              → viewsheetScriptQuestion   ✅ 兜底，但上面已被截断
```

对于 `table`、`freehand`、`Worksheet`、`trend&comparison`，当 `script=true` 时，其 subjectArea 分支**比 `script` 兜底分支优先**，导致 script 标志完全失效。

同时，这些场景均为 `combin=false`，`loadPrompt()` 中的 scriptAnswerRules 替换也不触发。

**结果：** `script=true` 的文档检索范围（全量文档）与标准 answerRules（UI 导向）之间产生矛盾——context 中有脚本文档，但规则要求 UI 优先。

### 可能影响

- Table / Worksheet 的脚本查询得到 UI 步骤而非代码
- 行为不一致：同类脚本问题在 chart 上下文给出代码，在 table 上下文给出 UI 步骤
- 用户体验混乱

### 建议测试方向

1. 对比同一脚本需求在不同 subjectArea 上的答案：
   - "Write a script to change element color based on value"
   - 分别在 chart / crosstab / table / freehand 上下文中提问
2. 在 server logs 中验证实际使用的 prompt template 名称
3. 确认产品预期：table/worksheet 是否应该有 script 变体，还是这些场景不应触发 script=true

---

## RISK-08  Dashboard 非脚本查询因 `considerScript=isDashboard` 引入脚本文档噪声（P2）

### 风险描述

`executeVectorSearch()` 中：
```typescript
let considerScript = isDashboard;  // documentRetriever.ts:71
```

当 `script=false` 但 `isDashboard=true` 时，`getDocumentString()` 会并行检索 non-script + script 两组文档并拼接，**所有 Dashboard 非脚本查询都会附带脚本文档**。

使用的 Prompt（如 `chartQuestion.prompt`、`defaultQuestion.prompt`）包含标准 `answerRules`，没有明确禁止 LLM 输出脚本代码。

### 可能影响

- 非脚本 Dashboard 查询答案中意外出现脚本代码或脚本建议
- 用户期望 GUI 操作指引，答案包含不必要的 API 调用
- 脚本文档稀释有效文档，真正相关的 GUI 文档排序权重降低

### 建议测试方向

1. 构造明确 GUI 操作的 Dashboard 查询（如 "How to add a chart title?"），验证答案不含 JS 代码
2. 统计 `script=false + isDashboard=true` 场景下检索结果中脚本文档的数量占比
3. 对比 `isDashboard=true` vs `isDashboard=false` 的同类非脚本查询答案差异

---

## RISK-09  多语言查询的 script 识别一致性（P2）

### 风险描述

Prompt 规则以英文描述，用户用中文/其他语言提问时，LLM 需要跨语言识别脚本意图。规则关键词（`function`、`script`、`runquery`、`admin console`）在其他语言中有多种对应表达，识别稳定性未知。

**中英文平行测试对（语义相同，语言不同）：**

| 英文（已知行为） | 中文（待验证） |
|-----------------|---------------|
| "Write a script to change chart color" | "写一个脚本来改变图表颜色" |
| "How to use a JavaScript function?" | "如何使用 JavaScript 函数？" |
| "How to use runquery?" | "如何使用 runquery？" |
| "How to add a chart title?" | "如何添加图表标题？" |

### 可能影响

- 中文脚本查询识别失败（False Negative）：用户收到 UI 步骤而非脚本方案
- 中文非脚本查询误触发（False Positive）：用户收到不必要的脚本代码
- 多语言用户体验与英文用户不一致

### 建议测试方向

1. 构建中英文平行测试集（各 10 条以上），对比 `script` 识别结果是否一致
2. 重点覆盖 7 个触发条件在中文下的表达变体
3. 对答案质量评分，确认中文用户与英文用户体验对等

---

## RISK-10  `runquery` 关键词变体识别（P2）

### 风险描述

Prompt 规则第 6 条写明 `` `runquery` ``，但用户实际书写存在多种变体：

| 变体 | 预期触发？ |
|------|----------|
| `runquery` | ✅ 应触发 |
| `RunQuery` | ❓ 不确定 |
| `run query` | ❓ 不确定 |
| `run a query` | ❓ 不确定 |
| `execute a query` | ❓ 不确定 |
| `run the query result` | ❓ 不确定 |

### 可能影响

- 变体表达导致 `script=false`，用户无法获得 runquery 相关 API 文档
- runquery 是特定平台能力，识别失败直接导致答案缺少核心内容

### 建议测试方向

1. 对上表 6 种变体分别测试，记录 `script` 实际值
2. 与产品确认哪些变体应触发，并在 Prompt 中明确覆盖

---

## RISK-11  多条件 UI 过滤被误判为需要脚本（P2）

### 风险描述

Prompt 规则第 3 条：涉及"复杂逻辑控制结构（嵌套条件、循环）"触发 `script=true`。
但许多多条件过滤场景完全可通过 **UI Filter 面板**实现，无需脚本。

**典型误触发查询（预期 script=false）：**
```
"How to filter data where sales > 1000 AND region = 'East' AND month = 'January'?"
"Show top 10 values and exclude nulls from the chart"
"Filter records where status is either 'Active' or 'Pending' and date is this quarter"
```

**应触发 script=true 的对照组（逻辑确实需要脚本）：**
```
"How to write a loop to apply the same formatting to 20 components?"
"Create a custom aggregation with nested IF conditions using script"
```

### 可能影响

- 用户收到脚本解决方案，但实际可通过 UI 完成，增加操作复杂度
- 脚本文档进入 context，答案与用户实际需求不匹配

### 建议测试方向

1. 构造"多条件但 UI 可实现"的查询，断言 `script=false`
2. 构造"确实需要脚本逻辑"的查询，断言 `script=true`
3. 明确边界：几层条件算"复杂"，与开发/产品对齐 Prompt 规则阈值

---

## RISK-12  多轮对话中 script 标志因查询改写而漂移（P2）

### 风险描述

`getEnhancedSubjectAreas()` 在有历史记录时，会对改写后的 `completedQuery` **重新调用 LLM**：

```typescript
const output = (!history || history.length == 0) ? simpleOutput :
   await getSimpleSubjectArea(completedQuery, history, ...);
const script = output?.script;  // 第二次调用的结果
```

`completedQuery` 由 `completeQueryByHistory()` 根据历史记录改写，措辞可能与原始问题不同。若改写后的查询丢失了 script 关键词，第二次 LLM 调用可能返回不同的 `script` 值。

**漂移场景：**
```
第一轮："How do I write a script to change chart color?"  → script=true
第二轮（追问）："Can you give me an example?"
  → completedQuery 改写为更完整的查询，可能保留 "script"
第三轮（模糊）："What if I want to apply it to all charts?"
  → completedQuery 改写后可能丢失 "script" 关键词 → script=false
```

### 可能影响

- 多轮对话中答案风格不一致：第一轮给代码，后续轮次退化为 UI 步骤
- 用户体验割裂，难以追踪答案质量下降的原因

### 建议测试方向

1. 执行 3-5 轮对话，首轮为明确 script 需求，后续轮为追问或延伸
2. 每轮记录 `script` 实际值，验证多轮稳定性
3. 对比 `simpleOutput.script` 与最终返回的 `script`（需要在代码中添加日志）

---

## RISK-13  `SCRIPT_MODULES` 常量与 Pinecone 实际数据不同步（P3）

### 风险描述

```typescript
// tools.ts:20
const SCRIPT_MODULES = ["chartAPI", "commonscript", "viewsheetscript"];
```

若 Pinecone 知识库中新增了脚本相关 module（如 `worksheetscript`、`adminscript`）但未同步更新此常量：

- `script=false + considerScript=true`：新模块不在 `$in` 过滤器中，被归入"non-script 文档"，不在 script 组检索
- `script=false + considerScript=false`：新模块被纳入 `$nin` 过滤器，被错误排除

### 可能影响

- 知识库更新后 script 文档过滤行为静默失效
- 非脚本查询意外获得新 script 模块的文档

### 建议测试方向

1. 核查 Pinecone 知识库中所有 `module` 字段的唯一值列表，与 `SCRIPT_MODULES` 对比
2. 知识库每次更新后，将此项列入回归检查清单
3. 建议引入自动化测试：定期校验常量与 Pinecone metadata 的一致性

---

## RISK-14  `combin + script` 的 scriptAnswerRules 正则替换脆弱（P3）

### 风险描述

`loadPrompt()` 中 scriptAnswerRules 替换：

```typescript
if(combin && script) {
   content = content.replace(
      /\[include:answerRules\.prompt\]/g,   // 依赖精确字符串匹配
      "[include:scriptAnswerRules.prompt]"
   );
}
```

此替换依赖 `multiSubjectQuestion.prompt` 文件中**精确包含** `[include:answerRules.prompt]`。
若模板文件被修改（改变大小写、路径、格式），正则静默失败，`combin + script=true` 时仍使用标准 answerRules，无任何报错。

对比：单 subject area 的 Script 模板（`chartScriptQuestion.prompt`、`viewsheetScriptQuestion.prompt`）**直接内嵌** `[include:scriptAnswerRules.prompt]`，无此风险。

### 可能影响

- 多 subjectArea 脚本查询静默使用错误的 answerRules
- 不易被发现（无错误日志，只表现为答案行为改变）

### 建议测试方向

1. 多 subjectArea 脚本查询（如同时涉及 chart 和 crosstab）验证答案是否符合"脚本优先"
2. 在 `multiSubjectQuestion.prompt` 中搜索 `answerRules` 包含内容，确认与正则匹配一致
3. 建议将替换逻辑改为更健壮的方式（或在 script 模板中直接引用 scriptAnswerRules）

---

## 风险汇总表

| 编号 | 风险名称 | 优先级 | 风险类型 | 核心验证点 |
|------|----------|--------|----------|-----------|
| RISK-01 | `function` 关键词触发范围过宽 | **P0** | False Positive | 内置公式/功能描述不应触发 script |
| RISK-02 | admin console GUI 操作误触发 | **P1** | False Positive | admin console UI 操作不需要脚本路径 |
| RISK-03 | 隐式脚本需求识别失效 | **P1** | False Negative | 无关键词但实际需脚本的查询漏判 |
| RISK-04 | `gui_required` 静默覆盖合法 script | **P1** | 边界逻辑 | 混合 UI+脚本意图的查询识别稳定性 |
| RISK-05 | 单 subject 时 scriptAnswerRules 未生效 | **P1** | 代码逻辑 | combin=false+script=true 答案规则验证 |
| RISK-06 | script=true 检索无过滤引入 GUI 文档 | **P1** | 检索质量 | 脚本查询的 context 文档 module 分布 |
| RISK-07 | table/freehand/Worksheet script 被静默忽略 | **P1** | 路由缺陷 | 非 chart/crosstab subjectArea 的脚本路由 |
| RISK-08 | isDashboard 引入非脚本查询的脚本噪声 | **P2** | 检索质量 | Dashboard 非脚本查询答案是否含多余脚本 |
| RISK-09 | 多语言 script 识别一致性 | **P2** | 多语言 | 中文脚本查询识别与英文一致性 |
| RISK-10 | `runquery` 变体识别 | **P2** | 关键词变体 | 大小写/空格/近义词变体触发结果 |
| RISK-11 | 多条件 UI 过滤误判为脚本 | **P2** | False Positive | 多条件但 UI 可实现的查询不应触发 script |
| RISK-12 | 多轮对话 script 标志漂移 | **P2** | 多轮稳定性 | 追问/延伸对话中 script 值是否稳定 |
| RISK-13 | `SCRIPT_MODULES` 常量与 Pinecone 不同步 | **P3** | 数据一致性 | 常量覆盖范围与知识库实际模块匹配 |
| RISK-14 | combin+script 的正则替换脆弱 | **P3** | 代码健壮性 | multiSubjectQuestion 模板修改后替换是否仍生效 |

---

## 建议测试执行顺序

```
第一轮（P0/P1 全覆盖）——必测
├── RISK-01：function 关键词误触发测试集（10 条）
├── RISK-02：admin console GUI 查询测试集（5 条）+ 脚本类对照组（3 条）
├── RISK-03：隐式脚本需求测试集（15 条）
├── RISK-04：gui_required vs script 混合意图测试集（5 条）
├── RISK-05：单 subject + script=true 答案规则验证（5 条）
├── RISK-06：script=true 检索文档 module 分布统计（5 条）
└── RISK-07：table/freehand/Worksheet + script=true 路由验证（各 3 条）

第二轮（P2 边界覆盖）——建议测
├── RISK-08：Dashboard 非脚本查询答案质量验证（5 条）
├── RISK-09：中文平行测试集（10 条）
├── RISK-10：runquery 变体识别（6 条变体）
├── RISK-11：多条件 UI 可实现查询（5 条）
└── RISK-12：多轮对话 script 稳定性（3 个场景，各 3 轮）

第三轮（P3 回归兜底）——定期执行
├── RISK-13：Pinecone 模块列表核查（工具脚本验证）
└── RISK-14：combin+script answerRules 替换完整性（2 条）
```

---

## 附：subjectArea × script 覆盖矩阵

| subjectArea | script=true 路由 | scriptAnswerRules | 风险评级 |
|-------------|-----------------|-------------------|----------|
| chart | chartScriptQuestion ✅ | 直接内嵌 ✅ | 无 |
| crosstab | crosstabScriptQuestion ✅ | 直接内嵌 ✅ | 无 |
| viewsheet（默认） | viewsheetScriptQuestion ✅ | 直接内嵌 ✅ | 无 |
| combin（多 SA） | multiSubjectQuestion ✅ | 正则替换 ⚠️ | RISK-14 |
| **table** | **tableQuestion ❌ 忽略** | **标准 rules ❌** | **RISK-07 P1** |
| **freehand** | **freehandQuestion ❌ 忽略** | **标准 rules ❌** | **RISK-07 P1** |
| **Worksheet** | **worksheetQuestion ❌ 忽略** | **标准 rules ❌** | **RISK-07 P1** |
| **trend&comparison** | **trendComparisonQuestion ❌ 忽略** | **标准 rules ❌** | **RISK-07 P1** |

## 附：文档检索路径矩阵

| script | isDashboard | 检索范围 | 风险 |
|--------|-------------|---------|------|
| true | any | 全量无过滤 | RISK-06：GUI 文档混入 |
| false | true | non-script + script 拼接 | RISK-08：脚本噪声 |
| false | false | 仅 non-script | 无 |
