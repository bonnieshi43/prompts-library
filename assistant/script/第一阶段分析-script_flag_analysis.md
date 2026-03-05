# Script Flag 分析报告

> 更新日期：2026-03-04（重新全量分析）
> 分析范围：Subject Area 检测 → 文档检索 → Prompt 选择 → 答案生成

---

## 1. `script` 标志的来源

### 1.1 数据类型定义

**文件**：`chat-app/server/src/tools/retrieval/getSubjectArea.ts`

```typescript
// Line 16-23
export interface SubjectAreasOutput {
   subjectAreas: SubjectArea[];
   completedQuery?: string;
   dynamic?: boolean;
   script?: boolean;       // ← 核心标志
   gui_required?: boolean;
   preferRewriteWithContext?: boolean;
}
```

### 1.2 LLM 提取逻辑

**函数**：`getSimpleSubjectArea()` — `getSubjectArea.ts:68`

```typescript
// Line 107-108
const script = parsed?.script ?? false;        // 从 LLM 响应中提取，默认 false
const gui_required = parsed?.gui_required ?? false;
```

LLM 调用的 prompt 文件为：
- `chat-app/server/prompts-v2/subjectAreas/querySubjectAreas.prompt`

### 1.3 `isScriptModule()` — 最终判断函数

**函数**：`isScriptModule()` — `getSubjectArea.ts:373`

```typescript
export function isScriptModule(gui_required?: boolean, script?: boolean) {
   return !gui_required && script;
}
```

> **关键点**：即使 LLM 返回 `script=true`，若同时 `gui_required=true`，最终 `script` 仍为 `false`。

---

## 2. Prompt 中 script 的判断规则

**文件**：`chat-app/server/prompts-v2/subjectAreas/querySubjectAreas.prompt`

### script = true 的触发条件（满足任意一条）

| 条件 | 说明 |
|------|------|
| 显式提及脚本/代码 | 用户明确要求编写、创建或编辑脚本、代码或自定义表达式 |
| 涉及编程语言 | 查询引用了具体编程语言（JavaScript、Python 等） |
| 复杂逻辑控制 | 需要实现多层嵌套条件、循环等复杂逻辑控制结构 |
| 自定义函数定义 | 需要定义内置功能中不存在的新函数或算法 |
| Admin Console 操作 | 用户提到"admin console"或必须通过 admin console 执行的操作 |
| runquery 使用 | 涉及 `runquery` 结果的使用或操作 |
| 提到 "function" | 查询中出现 "function"（如使用函数、调用函数等） |

### script = false 的条件

- **所有其他情况**：UI 导航、功能使用、概念性问题等

---

## 3. 逻辑分支详解

### 3.1 分支一：文档检索过滤

**函数**：`getDocumentString()` — `chat-app/server/src/tools/tools.ts:125`

```typescript
const SCRIPT_MODULES = ["chartAPI", "commonscript", "viewsheetscript"];

// script=true：只检索 script 模块文档
if (script) {
   → 无过滤器（检索全部文档，包含 script modules）
}

// script=false + isDashboard=true：同时检索 non-script 和 script 文档
else if (considerScript) {  // considerScript = isDashboard
   → 并行检索：
     - filter: { module: { "$nin": SCRIPT_MODULES } }  // non-script
     - filter: { module: { "$in": SCRIPT_MODULES } }   // script
     → 拼接返回（non-script 在前，script 在后）
}

// script=false + isDashboard=false：只检索 non-script 文档
else {
   → filter: { module: { "$nin": SCRIPT_MODULES } }
}
```

**`considerScript` 的来源**：

**函数**：`executeVectorSearch()` — `chat-app/server/src/agents/chatAgent/nodes/retrieval/documentRetriever.ts:55`

```typescript
let considerScript = isDashboard;  // Line 71
```

> `isDashboard` 为 true 时（当前 subject area 包含 Dashboard 模块），才会同时检索 script 文档。

### 3.2 分支二：Prompt 模板选择

**函数**：`getQuestionPrompt()` — `chat-app/server/src/tools/generation/questionPrompt.ts:28`

| 条件 | 普通模式（forAgentic=false） | Agentic 模式（forAgentic=true） |
|------|--------------------------|-------------------------------|
| `chart && script` | `chartScriptQuestion.prompt` | `chartScriptAgentic.prompt` |
| `chart && !script` | `chartQuestion.prompt` | `chartAgentic.prompt` |
| `crosstab && script` | `crosstabScriptQuestion.prompt` | `crosstabScriptAgentic.prompt` |
| `crosstab && !script` | `crosstabQuestion.prompt` | `crosstabAgentic.prompt` |
| `script`（其他）| `viewsheetScriptQuestion.prompt` | `viewsheetScriptAgentic.prompt` |
| `!script`（默认）| `defaultQuestion.prompt` | `agenticSystem.prompt` |
| `combin`（多 subjectArea）| `multiSubjectQuestion.prompt` | `combinAgentic.prompt` |

> **注意**：`freehand`、`table`、`Worksheet` 等 subjectArea 不区分 script，始终使用同一套 prompt。

### 3.3 分支三：AnswerRules 替换

**函数**：`loadPrompt()` — `chat-app/server/src/tools/getPromptTemplate.ts:75`

```typescript
// Line 122-130
if (combin && script) {
   // combin=true 且 script=true：替换为 scriptAnswerRules
   content = content.replace(
      /\[include:answerRules\.prompt\]/g,
      "[include:scriptAnswerRules.prompt]"
   );
}
else if (content.includes("[include:answerRules.prompt]")) {
   // 其他情况：根据 Answer 模型名称动态选择 answerRules 文件
   const answerRulesFileName = getPromptNameByModel(getAnswerModelName(), "answerRules");
   content = content.replace(/\[include:answerRules\.prompt\]/g, `[include:${answerRulesFileName}]`);
}
```

> `scriptAnswerRules.prompt` 的核心原则：**脚本优先，UI 为辅**。

---

## 4. 完整数据流

```
用户查询
    ↓
[determineSubjectAreas 节点]
    ├── getSubjectArea(question, history, ...)
    │       ├── getSimpleSubjectArea()      ← 调用 querySubjectAreas.prompt
    │       │       └── parsed.script       ← LLM 返回 true/false
    │       └── getEnhancedSubjectAreas()   ← 传递 script 标志
    └── isScriptModule(gui_required, script)
            └── script = !gui_required && script
    ↓
ChatState { script: boolean, isDashboard: boolean }
    ↓
[retrieveDocuments 节点]
    ├── buildRetrievalQueries()
    │       └── 传递 script 到 retrievalQueryGenerator（影响查询生成策略）
    └── executeVectorSearch()
            ├── considerScript = isDashboard
            └── getDocumentString(queries, combin, script, logs, considerScript)
                    ├── script=true     → 检索全部文档（含 script modules）
                    ├── considerScript  → 并行检索 non-script + script，拼接结果
                    └── else            → 只检索 non-script 文档
    ↓
generateQuestionPrompt()
    ├── getQuestionPrompt(script, subjectArea, forAgentic, ...)
    │       └── 按优先级选择 prompt 模板（见 3.2）
    └── getPromptTemplate({ script, combin })
            └── loadPrompt()
                    └── 若 combin && script → 替换 answerRules 为 scriptAnswerRules
    ↓
[generateResponse 节点]
    ├── script=true  → 脚本优先（代码/表达式为主要输出）
    └── script=false → UI 步骤优先（操作流程为主要输出）
```

---

## 5. 所有涉及 script 判断的代码位置

### 5.1 核心代码文件

| 文件 | 函数 | 说明 |
|------|------|------|
| `chat-app/server/src/tools/retrieval/getSubjectArea.ts` | `getSimpleSubjectArea()` L107 | 从 LLM 响应提取 script 标志 |
| `chat-app/server/src/tools/retrieval/getSubjectArea.ts` | `getEnhancedSubjectAreas()` L168 | 传递 script 标志 |
| `chat-app/server/src/tools/retrieval/getSubjectArea.ts` | `getSubjectArea()` L47 | 返回 script 标志 |
| `chat-app/server/src/tools/retrieval/getSubjectArea.ts` | `isScriptModule()` L373 | **最终 script 判断**：`!gui_required && script` |
| `chat-app/server/src/agents/chatAgent/nodes/subjectAreas.ts` | `determineSubjectAreas()` L36 | 调用 isScriptModule，写入 ChatState |
| `chat-app/server/src/agents/chatAgent/nodes/retrieval/documentRetriever.ts` | `buildRetrievalQueries()` L45 | 传递 script 到检索查询生成器 |
| `chat-app/server/src/agents/chatAgent/nodes/retrieval/documentRetriever.ts` | `executeVectorSearch()` L61,72 | 使用 script 控制文档过滤 |
| `chat-app/server/src/agents/chatAgent/nodes/retrieval/documentRetriever.ts` | `generateQuestionPrompt()` L85,114,126,139 | 传递 script 到 prompt 选择 |
| `chat-app/server/src/tools/tools.ts` | `createRetrieveDocumentTool()` L35 | 接受 script 参数（agentic tool） |
| `chat-app/server/src/tools/tools.ts` | `getDocumentString()` L125-155 | **文档检索分支**（3 路逻辑） |
| `chat-app/server/src/tools/generation/questionPrompt.ts` | `getQuestionPrompt()` L28 | **Prompt 模板选择分支** |
| `chat-app/server/src/tools/getPromptTemplate.ts` | `getPromptTemplate()` L30 | 接受 script 参数 |
| `chat-app/server/src/tools/getPromptTemplate.ts` | `loadPrompt()` L75,122-130 | **AnswerRules 替换分支** |
| `chat-app/server/src/services/combinService.ts` | `getCombinedPromptString()` L12,21,37 | 多 subject area 合并时传递 script |
| `chat-app/server/src/agents/chatAgent/nodes/retrieval.ts` | `retrieveDocuments()` L13-70 | 将 script 传入 retriever.invoke |
| `chat-app/server/src/tools/agenticTool.ts` | `processRetrieveDocs()` L7-50 | 将 script 透传至 agentic 检索工作流 |

### 5.2 相关 Prompt 文件

| 文件 | 说明 |
|------|------|
| `chat-app/server/prompts-v2/subjectAreas/querySubjectAreas.prompt` | LLM 判断 script 的规则定义 |
| `chat-app/server/prompts-v2/subjectAreas/completeQueryByHistory.prompt` | 历史补全查询时传递 script 上下文 |
| `chat-app/server/prompts-v2/default/scriptAnswerRules.prompt` | script=true 时的答案生成规则 |
| `chat-app/server/prompts-v2/default/script/viewsheetScriptQuestion.prompt` | 通用 script 问题模板 |
| `chat-app/server/prompts-v2/default/chart/chartScriptQuestion.prompt` | Chart + script 问题模板 |
| `chat-app/server/prompts-v2/default/crosstab/crosstabScriptQuestion.prompt` | Crosstab + script 问题模板 |
| `chat-app/server/prompts-v2/agentic/modules/viewsheetScriptAgentic.prompt` | Agentic 通用 script 模板 |
| `chat-app/server/prompts-v2/agentic/modules/chartScriptAgentic.prompt` | Agentic chart+script 模板 |
| `chat-app/server/prompts-v2/agentic/modules/crosstabScriptAgentic.prompt` | Agentic crosstab+script 模板 |
| `chat-app/server/prompts-v2/rules/stylebiScriptKnowledgeConstraints.prompt` | Script 知识约束规则 |

---

## 6. 测试场景建议

### 6.1 script=true 的典型测试用例

```
# 应触发 script=true 的查询
- "How do I write a script to change the chart color based on conditions?"
- "Create a JavaScript function to calculate custom aggregation"
- "How to use runquery to filter data?"
- "Write a custom expression using IF-ELSE logic"
- "How to perform this operation in admin console?"
- "How to define a function for dynamic binding?"
```

### 6.2 script=false 的典型测试用例

```
# 应触发 script=false 的查询
- "How do I change the chart type to bar chart?"
- "Where is the data binding panel in Dashboard?"
- "How to add a date filter to my viewsheet?"
- "What is a crosstab?"
```

### 6.3 边界测试（gui_required 优先）

```
# gui_required=true 会覆盖 script=true
- 涉及 GUI 必须操作但同时提到 script 的查询
- isScriptModule(gui_required=true, script=true) → false
```

### 6.4 isDashboard 对检索的影响

```
# Dashboard 场景：considerScript=true → 同时检索 script+non-script
- 当前 context 为 Dashboard 时，script=false 也会附带 script 文档

# 非 Dashboard 场景：considerScript=false → 只检索 non-script
- context 为 Data Worksheet 等时，script=false 不检索 script 文档
```

---

## 7. 关键常量

```typescript
// chat-app/server/src/tools/tools.ts:20
const SCRIPT_MODULES = ["chartAPI", "commonscript", "viewsheetscript"];
```

Pinecone 向量库中，`module` 字段属于这三个值的文档被视为"script 文档"。
