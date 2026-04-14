# SimpleRAG vs Multi-Agent 完整对比

## 一、流程对比

```
──────────────────────────────── 共同前置阶段 ────────────────────────────────
START
  │
  ▼
INITIALIZE               【相同】无 Prompt，加载历史/解析 context
  │
  ▼
INTENT_DETECTION         【相同】intent.prompt
  │
  ▼
DETERMINE_SUBJECT_AREAS  【相同】querySubjectAreas.prompt + completeQueryByHistory.prompt（并发）
  │
  └──────────────────────── 此处开始分叉 ──────────────────────────────────────

─────────────────────────────── 检索阶段 ────────────────────────────────────

SimpleRAG                                  Multi-Agent
─────────────────────────────              ──────────────────────────────────
RETRIEVE_DOCUMENTS（子图）                  AGENTIC_RAG → 内部检索循环（最多3轮）
  │                                          │
  ├─ buildRetrievalQuery                     ├─ Attempt 1：原问题，strategy="null"
  │    └─ retriever prompt（可选）            │    └─ buildRetrievalQuery（无 retriever prompt）
  │                                          │
  ├─ executeVectorSearch（Pinecone）          ├─ EvaluatorAgent  【Multi-Agent 独有】
  │                                          │    └─ evaluatorAgent.prompt
  └─ generateQuestionPrompt                  │         └─ isSufficient=true → 跳出
       └─ xxxQuestion.prompt                 │         └─ isSufficient=false → Attempt 2
            写入 questionPromptString         │              └─ buildRetrievalQuery（+ retriever prompt）
                                             │              └─ EvaluatorAgent 再评估
                                             │
                                             ├─ generateQuestionPrompt（仅第1次执行）
                                             │    └─ xxxQuestion.prompt  【与 SimpleRAG 相同文件】
                                             │         写入 agenticQuestionPromptString

─────────────────────────────── 回答阶段 ────────────────────────────────────

SimpleRAG                                  Multi-Agent
─────────────────────────────              ──────────────────────────────────
GENERATE_RESPONSE                          AnswerGeneratorAgent
  └─ answerService.generateAnswer()          └─ answerService.generateAnswer()
       │                                          │
       ├─ questionPromptString                    ├─ agenticQuestionPromptString
       │    （xxxQuestion.prompt）                │    （xxxQuestion.prompt）【相同文件】
       │                                          │
       ├─ jsonResponse = true                     ├─ jsonResponse = false
       │    → 输出 JSON                           │    → 输出纯文本
       │      { answer,                           │
       │        retrieval_score,                  │
       │        answer_score }                    │
       │                                          │
       └─ ignoreAnswerScore = false               └─ ignoreAnswerScore = true
            → 包含评分 prompt 片段                      → 移除评分 prompt 片段

─────────────────────────────── 后续路由 ────────────────────────────────────

SimpleRAG                                  Multi-Agent
─────────────────────────────              ──────────────────────────────────
simpleRAGEvaluatorRouter                   直接 END
  ├─ score≤3 → 触发 AGENTIC_RAG
  └─ 正常 → END
```

---

## 二、Prompt 调用对比表

| 阶段 | Prompt 文件 | SimpleRAG | Multi-Agent | 是否相同 |
|---|---|:---:|:---:|:---:|
| 意图检测 | `intent.prompt` | ✅ | ✅ | ✅ **相同** |
| 主题识别 | `querySubjectAreas.prompt` | ✅ | ✅ | ✅ **相同** |
| 问题补全 | `completeQueryByHistory.prompt` | ✅ | ✅ | ✅ **相同** |
| 检索改写 | `rewrite_rule.prompt` 等 retriever 策略 | ✅（可选） | ✅（第2/3轮，可选） | ✅ **相同** |
| 文档充分性评估 | `evaluatorAgent.prompt` | ❌ | ✅ | ❌ **Multi独有** |
| 问题模板 | `xxxQuestion.prompt`（按 subjectArea） | ✅ | ✅ | ✅ **相同文件** |
| 回答规则 | `answerRules-xxx.prompt`（include内） | ✅（含） | ✅（含） | ✅ **相同** |
| 评分指令 | `simpleRAGScoreEvaluator.prompt`（include内） | ✅（含） | ❌（被移除） | ❌ **行为不同** |
| 输出格式 | `simpleRAGAnswerOutput.prompt`（include内） | ✅（含） | ❌（被移除） | ❌ **行为不同** |

---

## 三、关键差异汇总

| 差异点 | SimpleRAG | Multi-Agent |
|---|---|---|
| 检索次数 | 固定 1 次 | 最多 3 次（由 EvaluatorAgent 控制） |
| 文档充分性判断 | 无（直接用检索结果） | `evaluatorAgent.prompt` 控制循环 |
| 传入答案阶段的文档 | 单次检索的 `docStrings` | 多轮累积的 `allDocuments` |
| 问题模板字段 | `questionPromptString` | `agenticQuestionPromptString` |
| `forAgentic` | `false` | `false`（与 SimpleRAG 相同） |
| `ignoreAnswerScore` | `false` | `true` |
| `jsonResponse` | `true`（解析 JSON 取 answer+score） | `false`（直接取纯文本） |
| 答案包含评分 | 有 `retrieval_score` + `answer_score` | 无 |
| 触发后续 Agentic | 评分≤3 时触发 | 不触发（自身就是兜底） |

---

## 四、结论

- **共享相同 Prompt 文件的阶段**：意图检测、主题识别、问题补全、retriever 改写策略、`xxxQuestion.prompt`（回答模板主体）
- **Multi-Agent 独有的 Prompt**：`evaluatorAgent.prompt`
- **相同文件但行为不同**：`xxxQuestion.prompt` — SimpleRAG 完整加载（含评分/JSON输出格式），Multi-Agent 通过 `ignoreAnswerScore=true` 裁剪掉评分和输出 schema 片段，导致最终模型收到的 prompt 内容不完全相同
