# Chat Agent 完整流程与 Prompt 调用分析

## 1. 主工作流（LangGraph StateGraph）

```
START
  │
  ▼
INITIALIZE                    ← 无 Prompt（纯数据初始化）
  │
  ▼
INTENT_DETECTION              ← intent.prompt
  │
  ▼
DETERMINE_SUBJECT_AREAS       ← querySubjectAreas.prompt + completeQueryByHistory.prompt（并发）
  │
  ├─── agentic=true ──────────────────────────────────────────┐
  │                                                            │
  ▼                                                            ▼
RETRIEVE_DOCUMENTS                                       AGENTIC_RAG
  │                                                            │
  ▼                                                            ▼
GENERATE_RESPONSE                                            END
  │
  ├── retrievalScore≤3 or answerScore≤3 ──▶ AGENTIC_RAG ──▶ END
  └── otherwise ──────────────────────────▶ END
```

---

## 2. 各节点与 Prompt

### INITIALIZE（`initialization.ts`）
- 无 Prompt 调用
- 加载会话历史、摘要化对话、解析 contextType/noBinding、初始化 stepTimes/retrievalCache

### INTENT_DETECTION（`intentDetection.ts`）
- Prompt：`intent.prompt`
- 模型：`INTENT_MODEL_NAME`
- 返回：`{ need_report_issue, reasoning, help_message }` → 判断意图为 Report Issue / Help Request / General Question

### DETERMINE_SUBJECT_AREAS（`subjectAreas.ts` → `getSubjectArea.ts`）
- **并发**调用两个 Prompt：
  - `querySubjectAreas.prompt` — 识别模块（Chart/Crosstab/Table/Worksheet 等）
  - `completeQueryByHistory.prompt` — 根据历史补全当前问题
- 模型：`SUBJECTAREA_MODEL_NAME` / `COMPLETE_QUERY_MODEL_NAME`
- 若有 `explicitly_mentioned` 的 subjectArea 直接使用；否则进入 `getEnhancedSubjectAreas` 结合 contextType 过滤
- **路由（`agenticDecimer`）**：`agentic=true` → 跳过检索直达 AGENTIC_RAG

### RETRIEVE_DOCUMENTS（`retrieval.ts` → `documentRetriever.ts` 子图）

内部三节点子图：

```
buildRetrievalQuery      ← retriever 策略 Prompt（按 preferRetrievers）
      │
executeVectorSearch      ← 无 Prompt（Pinecone 向量检索）
      │
generateQuestionPrompt   ← 按 subjectArea 选对应问题模板
```

**buildRetrievalQuery** 触发的 retriever Prompt：

| 策略名 | Prompt 文件 |
|---|---|
| rewrite | `rewrite_rule.prompt` |
| expansion | `expansion_rule.prompt` |
| decomposition | `decomposition_rule.prompt` |
| minor_expansion | `minor_expansion.prompt` |
| hyde | `hyde.prompt` |
| step-back | `step-back.prompt` |
| rewrite_expansion | `rewrite_expansion.prompt` |
| rewrite_decomposition_expansion | `rewrite_decomposition_expansion.prompt` |

> `preferRetrievers` 为空时不调用任何 retriever prompt，直接用原问题检索。

**generateQuestionPrompt** 按 subjectArea 选模板，并区分 `forAgentic` 标志：

| subjectArea | Simple RAG Prompt | Agentic Prompt（forAgentic=true） |
|---|---|---|
| chart + script | `chartScriptQuestion.prompt` | `chartScriptAgentic.prompt` |
| chart | `chartQuestion.prompt` | `chartAgentic.prompt` |
| freehand | `freehandQuestion.prompt` | `freehandAgentic.prompt` |
| crosstab + script | `crosstabScriptQuestion.prompt` | `crosstabScriptAgentic.prompt` |
| crosstab | `crosstabQuestion.prompt` | `crosstabAgentic.prompt` |
| table | `tableQuestion.prompt` | `tableAgentic.prompt` |
| Worksheet | `worksheetQuestion.prompt` | `worksheetAgentic.prompt` |
| trend&comparison | `trendComparisonQuestion.prompt` | `trendComparisonAgentic.prompt` |
| script | `viewsheetScriptQuestion.prompt` | `viewsheetScriptAgentic.prompt` |
| 多模块（combin） | `multiSubjectQuestion.prompt` | `combinAgentic.prompt` |
| 默认 | `defaultQuestion.prompt` | `agenticSystem.prompt` |

问题模板通过 `[include:xxx.prompt]` 组合子片段：
- `answerRules.prompt` → 按 `ANSWER_MODEL_NAME` 自动映射：
  - `gpt-4o-mini` / `gpt-4.1-nano` → `answerRules-gpt-4o-mini.prompt`
  - `gpt-4.1-mini`（默认） → `answerRules-gpt-4.1-mini.prompt`
  - `gpt-5-mini` / `gpt-5-nano` → `answerRules-gpt-5-mini.prompt`
- `simpleRAGScoreEvaluator.prompt` — 评分指令（`ignoreAnswerScore=true` 时移除）
- `simpleRAGAnswerOutput.prompt` — 输出格式（`ignoreAnswerScore=true` 时移除）
- `techSupportPersona.prompt`、`styleBIConceptDisambiguation.prompt` — 人格设定

### GENERATE_RESPONSE（`answerGen.ts` → `answerService.ts`）
- 使用第 RETRIEVE 阶段生成的 `questionPromptString`（已组合完毕）
- 调用 `invokeRag()` → 模型：`ANSWER_MODEL_NAME`
- 返回 JSON：`{ answer, retrieval_score, answer_score }`
- **路由（`simpleRAGEvaluatorRouter`）**：`retrievalScore≤3 or answerScore≤3` → 触发 AGENTIC_RAG

### AGENTIC_RAG（`agentic.ts`）
两种模式由 `Config.ai.useMultiAgentRag` 决定，见第 3 节。

---

## 3. 三种回答模式的 Prompt 对比

| | Simple RAG | 普通 Agentic（`useMultiAgentRag=false`） | Multi-Agent（`useMultiAgentRag=true`） |
|---|---|---|---|
| **answer prompt 来源** | `documentRetriever` → `getQuestionPrompt()` | `AgenticRAGService.getSystemPrompt()` | `documentRetriever` → `getQuestionPrompt()` |
| **`forAgentic`** | `false` | **`true`** | `false` |
| **Prompt 文件** | `xxxQuestion.prompt` | `xxxAgentic.prompt` | `xxxQuestion.prompt`（同 Simple RAG） |
| **存储字段** | `questionPromptString` | 直接构建为 systemPrompt | `agenticQuestionPromptString` |
| **`ignoreAnswerScore`** | `false`（保留评分） | `true`（移除评分/JSON schema） | `true`（移除评分/JSON schema） |
| **`jsonResponse`** | `true`（解析 JSON 取 answer/score） | N/A（Agent 输出直接取最后消息） | `false`（纯文本，不 JSON.parse） |

### 关键结论

- **`forAgentic=true` 只在 `AgenticRAGService.getSystemPrompt()` 里设置**，其他地方均为 `false`。
- **Multi-Agent 和 Simple RAG 使用同名 prompt 文件**（`xxxQuestion.prompt`），但 Multi-Agent 用 `agenticQuestionPromptString` 字段传递，且 `ignoreAnswerScore=true` 会移除评分与 JSON 输出格式片段，最终输出为纯文本而非 JSON。
- **普通 Agentic 才是真正使用独立 `xxxAgentic.prompt` 文件**的唯一模式。

---

## 4. Prompt 加载机制（`getPromptTemplate.ts`）

```
getPromptTemplate({ promptName: "xxx" })
  └─ loadPrompt("xxx.prompt")
       ├─ findPromptFile() 递归搜索 Config.server.promptsDir 目录
       ├─ 读取文件内容
       ├─ 替换 [include:answerRules.prompt] → 按 ANSWER_MODEL_NAME 选具体文件
       ├─ 处理特殊规则：combin/script/ignoreAnswerScore
       └─ 递归解析所有 [include:xxx.prompt] 指令（嵌套组合）
```

`Config.server.promptsDir` 由环境变量 `PROMPTS_VERSION` 决定：
- `v1` → `prompts/`
- `v2`（默认） → `prompts-v2/`

---

## 5. Prompt 调用全貌汇总

| 阶段 | Prompt 文件 | 模型配置 |
|---|---|---|
| 意图检测 | `intent.prompt` | `INTENT_MODEL_NAME` |
| 主题识别 | `querySubjectAreas.prompt` | `SUBJECTAREA_MODEL_NAME` |
| 问题补全 | `completeQueryByHistory.prompt` | `COMPLETE_QUERY_MODEL_NAME` |
| 检索查询改写 | retriever 策略 Prompt（8 种） | 默认模型 |
| Simple RAG 回答 | `xxxQuestion.prompt`（组合） | `ANSWER_MODEL_NAME` |
| 普通 Agentic 回答 | `xxxAgentic.prompt`（forAgentic=true） | `DEFAULT_MODEL_NAME` |
| Multi-Agent 评估 | `evaluatorAgent.prompt` | 默认模型 |
| Multi-Agent 回答 | `xxxQuestion.prompt`（同 Simple RAG，ignoreAnswerScore=true） | `ANSWER_MODEL_NAME` |
