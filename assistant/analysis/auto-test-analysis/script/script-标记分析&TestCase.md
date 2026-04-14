# SubjectAreas Script 标记完整分析报告

> **生成时间**: 2026-03-06  
> **分析范围**: SubjectAreas 模块中所有与 script 标记相关的 prompt 规则和代码逻辑

---

## 目录

1. [Script 标记判定规则](#1-script-标记判定规则)
2. [Script 标记影响的逻辑分支](#2-script-标记影响的逻辑分支)
3. [Prompt 中的 Script 判断规则](#3-prompt-中的-script-判断规则)
4. [Script 标记的数据流](#4-script-标记的数据流)

---

## 1. Script 标记判定规则

### 1.1 什么情况下 script = true？

Script 标记为 `true` **仅当满足以下任一条件**：

| 序号 | 触发条件 | 说明 | 示例 |
|------|---------|------|------|
| 1 | **显式脚本/代码创建** | 用户明确提到编写、创建或编辑脚本、代码或自定义表达式 | "如何编写脚本修改图表颜色？" |
| 2 | **编程语言提及** | 查询中引用具体编程语言（JavaScript、Python 等） | "用 JavaScript 控制组件可见性" |
| 3 | **复杂逻辑控制** | 涉及实现复杂逻辑控制结构（多层嵌套条件、循环等） | "写一个循环遍历所有行的表达式" |
| 4 | **自定义函数定义** | 需要定义新函数或算法，非内置功能 | "定义一个自定义日期格式化函数" |
| 5 | **Admin Console 操作** | 用户提到 "admin console" 或必须通过管理控制台完成的操作 | "用 Admin Console 脚本创建数据源" |
| 6 | **runquery 使用** | 任何涉及使用或操作 `runquery` 结果的查询 | "用 runQuery 加载数据并更新文本组件" |
| 7 | **Function 提及** | 查询提到 "function" 并指向函数使用/调用/基于函数的操作 | "调用 chartAPI 函数创建图表" |

### 1.2 什么情况下 script = false？

**除上述所有条件以外的所有情况**，统一视为 `script = false`，包括但不限于：

- 使用 Formula Editor 中的 CALC 函数（GUI 辅助功能）
- 通过 UI 界面进行配置操作
- 概念性问题或功能说明
- 使用内置的条件格式化功能
- "function" 指代产品功能而非代码函数

### 1.3 最终判定逻辑

最终的 script 标记由 `isScriptModule` 函数决定：

**关键点**：
- 即使 `script = true`，如果 `gui_required = true`，最终仍会被判定为 **非脚本场景**
- 只有当 `gui_required` 为 `false` 或 `undefined`，且 `script = true` 时，才最终为脚本场景

---

## 2. Script 标记影响的逻辑分支

### 2.1 在 SubjectArea 检索阶段

**影响范围**：透明传递，不改变 SubjectArea 筛选逻辑

**特点**：
- `script` 值在此阶段仅作为标记随结果返回
- 不会影响 SubjectArea 的筛选、排序或优先级
- 保持数据完整性，供下游节点使用

### 2.2 在 Chat Agent 的 subjectAreas 节点

**影响范围**：决定对话路由和回答模式

**逻辑效果**：

| gui_required | result.script | 最终 script | 场景描述 |
|--------------|---------------|-------------|----------|
| false/undefined | true | **true** | 脚本/表达式问题场景 |
| false/undefined | false | **false** | 非脚本场景 |
| true | true | **false** | 需要 GUI，强制视为非脚本 |
| true | false | **false** | 非脚本场景 |

**下游影响**：
- 路由到脚本相关的 agent/工具链（如表达式编写助手）
- 在后续对话中作为条件，区分"脚本回答模式" vs "操作/功能使用回答模式"
- 影响知识库检索策略（脚本文档 vs 操作文档）

---

## 3. Prompt 中的 Script 判断规则

### 3.1 querySubjectAreas.prompt 中的规则

**位置**：`### 6. Dynamic & Script & GUI Determination Logic`

**完整规则文本**：

Script Determination Rules:
- script = true ONLY when the query meets ANY of the following criteria:
  1. Explicit Script/Code Creation: User explicitly mentions writing, creating, or editing scripts, code, or custom expressions
  2. Programming Language Mention: Query references specific programming languages (JavaScript, Python, etc.)
  3. Complex Logic Required: Involves implementing complex logical control structures (multiple nested conditions, loops, etc.)
  4. Custom Function Definition: Requires defining new functions or algorithms not available as built-in features
  5. Admin Console Operations: User mentions "admin console" or operations that must be performed through the admin console interface
  6. runquery Usage: Any query involving the use or manipulation of runquery results
  7. Function Mention: Query mentions "function" (e.g., using functions, calling functions, function-based operations)

- script = false in ALL other cases.

**输出格式**：

```
script: <true|false>
gui_required: <true|false>
dynamic: <true|false>
```

### 3.2 completeQueryByHistory.prompt 中的规则

**位置**：`## Script Identification Rule`

**用途**：仅用于历史补全，不影响最终 `result.script`

**规则文本**：

For each extracted SubjectArea, determine script independently.
- Set script = true if the user question in that SubjectArea is primarily about 
  writing or using expressions/formulas/scripts, including:
  - referencing fields or rows (e.g., field[...], relative row, offset)
  - calculated fields or expression columns
  - syntax, functions, or calculation logic

- Set script = false if the user question is primarily about where or how to 
  operate in the product, including:
  - UI steps, menus, settings, or permissions
  - feature usage flows (how to create, configure, enable something)
  - conceptual or descriptive questions without expression logic

**关键差异**：
- 此处的 `script` 标记是 **per-SubjectArea** 的，用于区分历史对话中每轮的意图
- 仅影响 `replaced_query` 的补全风格（表达式导向 vs 操作导向）
- **不会回传**到 TypeScript 代码中的 `SubjectAreasOutput.script` 字段

**在 Completion Algorithm 中的作用**：

Special Handling for Confirmations/Selections:
- Determine whether the latest matched SubjectArea has script = true.
- If script = true:
  - The reconstructed replaced_query MUST remain expression/script-oriented.
  - Do NOT rewrite it into UI steps, feature usage, or conceptual questions.
- If script = false:
  - Reconstruct the replaced_query as a product operation, feature usage, 
    or configuration intent.

---

## 4. Script 标记的数据流

### 4.1 主流程数据流

```
用户查询
    ↓
querySubjectAreas.prompt (LLM 判断)
    ↓
YAML 输出: script: true/false, gui_required: true/false
    ↓
getSimpleSubjectArea() 解析
    ↓
SubjectAreasOutput { script, gui_required }
    ↓
getEnhancedSubjectAreas() 传递
    ↓
determineSubjectAreas() 节点
    ↓
isScriptModule(gui_required, script)
    ↓
最终 script 标记写入 ChatState
    ↓
后续节点根据 script 标记路由
```

### 4.2 历史补全流程（并行）

```
用户查询 + 历史对话
    ↓
completeQueryByHistory.prompt
    ↓
提取历史 SubjectArea (每个带 script 标记)
    ↓
根据历史 script 决定补全风格
    ↓
生成 replaced_query
    ↓
(不影响最终 result.script)
```

---

## 附录：相关文件清单

### Prompt 文件
1. `chat-app/server/prompts-v2/subjectAreas/querySubjectAreas.prompt`
2. `chat-app/server/prompts-v2/subjectAreas/completeQueryByHistory.prompt`
3. `chat-app/server/prompts-v2/subjectAreas/scriptKnowledgeBase.md`

### 代码文件
1. `chat-app/server/src/tools/retrieval/getSubjectArea.ts`
2. `chat-app/server/src/agents/chatAgent/nodes/subjectAreas.ts`

### 文档文件
1. `scriptDoc/subjectAreas-script-analysis.md`
2. `scriptDoc/subjectAreas-script-testcases.md`
3. `scriptDoc/subjectAreas-script-risk-analysis.md`

---

# Script Recognition Regression Test Cases

> **目的**: SubjectAreas 模块中 `script` 标记识别的回归测试
> **覆盖范围**: 所有 7 条 prompt 级别规则、负向/边界用例、`gui_required` 覆盖行为以及多轮对话场景
> **最终 `script` 值** 由 `isScriptModule(gui_required, script)` 决定 — `gui_required=true` 会覆盖 `script=true` 产生 `false`

**多轮格式**: 每轮显示 `User` 问题和该轮的 `Expected script`。"Current Turn" 行是被测试的轮次。

---

## 完整测试用例表格

| CaseID | 类别 | 用户问题 | 预期 script | 验证规则 | 设计意图 |
|--------|------|----------|-------------|----------|----------|
| **TC-P01** | 正向用例 | How do I write a script to dynamically change the color of chart data points based on their values? | `true` | 显式脚本/代码创建 | 用户明确使用"script"一词进行代码编写。任何直接提到编写、创建或编辑脚本、代码或自定义表达式的查询都必须产生 `script=true`，无论针对哪个组件。 |
| **TC-P02** | 正向用例 | How can I use JavaScript to control the visibility of a Text component based on a RadioButton selection? | `true` | 编程语言引用 | 查询在编码上下文中命名了特定编程语言（JavaScript）— 用户明确打算编写代码，而不是使用 UI 控件。在代码编写上下文中引用任何具体编程语言都必须触发 `script=true`。 |
| **TC-P03** | 正向用例 | How do I write an expression that loops through all table rows and marks each row red when the sales value exceeds 1000? | `true` | 复杂逻辑控制结构 | 查询需要循环（遍历行），这是一种复杂的逻辑控制结构，无法通过任何 UI 对话框表达。实现循环或多级嵌套条件必须触发 `script=true`。 |
| **TC-P04** | 正向用例 | How do I define a custom function that converts a timestamp into a human-readable date string like "Mar 5, 2026" for use in a dashboard expression? | `true` | 自定义函数定义 | 用户打算定义一个新的命名函数，该函数不作为内置功能存在。编写产品中不存在的自定义函数或算法必须触发 `script=true`。 |
| **TC-P05** | 正向用例 | How do I use the Admin Console to automate the creation of a new JDBC data source? | `true` | Admin Console 操作 | 用户在执行操作的上下文中明确提到"Admin Console"。Admin Console 任务通过 Groovy DSL 编写脚本；任何引用 Admin Console 执行操作的查询都必须触发 `script=true`。 |
| **TC-P06** | 正向用例 | How can I use runQuery to load data from a Data Worksheet and assign the first row's value to a Text component? | `true` | runQuery 使用 | 查询明确涉及 `runQuery`，这是一个只能从脚本调用的编程 API（无法通过 UI 访问）。任何提到使用或操作 runQuery 结果的查询都必须触发 `script=true`。 |
| **TC-P07** | 正向用例 | How do I call the createBulletGraph() function to build a bullet chart programmatically? | `true` | "function" 关键词在代码调用上下文中 | 查询在调用代码函数（`createBulletGraph()`）的意义上使用"function"。当"function"指的是调用、定义或操作代码级函数（而不是产品功能）时，必须触发 `script=true`。 |
| **TC-N01** | 负向用例 | How do I use CALC.sumif to calculate total sales where the quantity purchased exceeds 50? | `false` | CALC 公式函数（GUI 辅助，非脚本） | CALC 函数（例如 `CALC.sumif`）通过 Formula Editor 对话框输入 — 这是一个 GUI 辅助功能，不需要 JavaScript 编写。虽然它们类似于函数调用，但它们不是脚本，不得触发 `script=true`。 |
| **TC-N02** | 负向用例 | How do I configure a selection list component to filter a table by region using the dashboard designer? | `false` | 纯 UI 配置操作 | 用户正在导航产品菜单和对话框来设置组件 — 没有暗示代码编写。基于 UI 的配置操作必须产生 `script=false`，无论其复杂性如何。 |
| **TC-N03** | 负向用例 | What types of chart elements are available in StyleBI and what are the differences between them? | `false` | 概念性/描述性问题 | 用户正在寻求产品知识 — 没有代码，没有 UI 操作。不涉及编写表达式、脚本或执行 GUI 步骤的纯概念性或描述性问题必须产生 `script=false`。 |
| **TC-N04** | 负向用例（边界） | Is the StyleBI frontend built with JavaScript or TypeScript? | `false` | 编程语言提及但非编码意图（TC-P02 的边界） | 出现了编程语言名称，但意图是事实性/架构性问题 — 不是编写代码的请求。仅提及语言名称而没有编码意图不得触发 `script=true`。这是编程语言规则的边界条件。 |
| **TC-N05** | 负向用例（边界） | How does the drill-down feature work in a crosstab table? | `false` | "function" 指产品功能，非代码（TC-P07 的边界） | "Feature"（以及扩展的产品功能名称）描述 UI 功能，而不是代码函数。当"function"或相关术语指的是产品功能而不是可调用的代码函数时，不得触发 `script=true`。这是函数提及规则的边界条件。 |
| **TC-N06** | 负向用例（边界） | How do I set a highlight rule in the conditional formatting dialog to color table rows red when the value exceeds 1000? | `false` | 通过 UI 可实现的条件逻辑（TC-P03 的边界） | 任务涉及条件逻辑（如果值 > 1000 → 红色），但完全可以通过内置的条件格式化 UI 对话框实现。相同逻辑存在 GUI 路径意味着它不符合"需要脚本的复杂逻辑"。这是将 UI 支持的条件与仅脚本的循环/嵌套逻辑分开的边界条件。 |
| **TC-G01** | gui_required 覆盖 | How do I open the Script tab in the component properties panel and write a JavaScript expression to hide a text label? | `false` | gui_required 覆盖 script（isScriptModule 逻辑） | 查询包含两个脚本触发信号：命名 JavaScript（规则 2）和提到编写表达式（规则 1）。但是，它还需要导航 GUI（在属性面板中打开 Script 选项卡），这设置了 `gui_required=true`。`isScriptModule(gui_required=true, script=true)` 函数必须返回 `false`，因为 `gui_required` 优先。验证在 LLM 产生 `script=true` 后正确应用代码级覆盖逻辑。 |
| **TC-M01** | 多轮对话 | **Previous**: How do I write a script in the onInit handler to load data using runQuery and assign the first record's value to a Text component? (script=`true`) <br> **Current**: Yes, that approach looks right. How do I properly structure the variable assignment? | `true` | 脚本导向的前一轮的确认 | 当前一轮建立了脚本上下文（明确的脚本编写意图）时，当前轮中的简短确认或后续问题不包含独立的脚本触发器。`completeQueryByHistory` prompt 必须检测历史中的 `script=true` 并重建面向脚本的 `replaced_query`（例如，"如何在使用 runQuery 结果的 onInit 脚本中构造变量赋值？"）。然后 `querySubjectAreas` prompt 评估此重写的查询并必须产生 `script=true`。验证历史驱动的查询补全保留脚本方向。 |
| **TC-M02** | 多轮对话 | **Previous**: How do I add a filter condition to a table using the filter toolbar? (script=`false`) <br> **Current**: Can I achieve the same filtering logic by writing a JavaScript expression instead? | `true` | 非脚本历史，当前轮引入脚本意图 | 前一轮是非脚本 UI 问题。当前轮独立引入脚本触发内容：编程语言引用（JavaScript）和明确的表达式编写意图。当前查询自己的信号必须占主导地位。验证单轮可以在不被非脚本历史抑制的情况下将 `script` 从 `false` 切换到 `true`。 |
| **TC-M03** | 多轮对话 | **Previous**: How do I write a script to dynamically set the foreground color of a Text component? (script=`true`) <br> **Current**: How do I change the font size for the same component using the Format panel? | `false` | 脚本历史，当前轮无关的 UI 操作 | 前一轮是面向脚本的，但当前轮是一个独立的 UI 配置问题（Format 面板），没有编码意图。必须独立评估当前查询并产生 `script=false`。验证当当前查询明确是非脚本时，先前的脚本上下文不会"渗透"到当前轮。 |

---

**报告结束**
