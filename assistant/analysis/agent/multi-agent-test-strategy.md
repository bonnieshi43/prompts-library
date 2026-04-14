# Multi-Agent RAG 测试策略

## 一、需要测试的核心环节（按风险排序）

```
检索循环（最多3轮）
  ├── Attempt 1: RetrievalExecutor（原问题，无策略prompt）
  │     └── EvaluatorAgent（evaluatorAgent.prompt）→ JSON输出
  │           ├── isSufficient=true → 跳出循环
  │           └── isSufficient=false → selectNextStrategy → Attempt 2
  ├── Attempt 2: RetrievalExecutor（suggestedNextQuery + 策略prompt）
  │     └── EvaluatorAgent → 再评估
  └── Attempt 3: 同上，或强制跳出
        └── AnswerGeneratorAgent（agenticQuestionPromptString → xxxQuestion.prompt）
```

风险最高的三个点：
1. **EvaluatorAgent 的 isSufficient 判断** — 直接控制循环次数
2. **suggestedNextQuery 的质量** — 控制第2/3轮检索方向
3. **最终答案生成** — 用 `xxxQuestion.prompt` + `jsonResponse=false`，输出格式与 Simple RAG 不同

---

## 二、测试维度与方向

### 维度 1：EvaluatorAgent Prompt 测试（最高优先级）

这是整个 Multi-Agent 的"大脑"，直接控制循环次数和检索方向。

**方向 1.1 — 充分性判断准确性（True/False 正确率）**

| 场景 | 输入 | 期望 |
|---|---|---|
| 文档完全覆盖问题 | 高相关文档 | `isSufficient=true` |
| 文档完全无关 | 不相关文档 | `isSufficient=false` |
| 术语不同但语义相同 | 用户问"switch binding"，文档写"set field dynamically" | `isSufficient=true`（prompt中有等价词规则） |
| 文档包含完整步骤演练 | walkthrough型文档 | `isSufficient=true` |
| 文档只提到功能存在但无步骤 | 仅描述性文档 | `isSufficient=false` |
| 部分覆盖 | 文档答了一半 | `isSufficient=false` + `missingAspects` 非空 |

**方向 1.2 — JSON 格式合规性**

EvaluatorAgent 解析失败时会 fallback 为 `isSufficient=true`（`evaluatorAgent.ts:93`），这意味着格式错误会导致"假充分"提前跳出循环。

需要验证：
- 输出是否是合法 JSON（无 markdown code fence，无前置说明）
- 所有字段是否存在：`isSufficient`, `confidence`, `reasoning`, `missingAspects`, `suggestedNextQuery`
- `missingAspects` 是否是数组
- `confidence` 是否在 0.0-1.0 范围内

**方向 1.3 — suggestedNextQuery 质量**

`isSufficient=false` 时，`suggestedNextQuery` 直接作为第2轮检索的 query（`multiAgentRAGService.ts:80`）。

需要验证：
- 是否聚焦在 `missingAspects` 上，而非重复原问题
- 是否保留了 context（如 chart/crosstab）
- 是否去掉了业务词（同 rewrite 策略的要求）

---

### 维度 2：Answer Generation 测试（与 Simple RAG 对比）

Multi-Agent 最终答案用的是 `xxxQuestion.prompt`（`ignoreAnswerScore=true`, `jsonResponse=false`），与 Simple RAG 使用同名文件但行为不同。

**方向 2.1 — 输出格式差异**

Simple RAG 输出 JSON `{ answer, retrieval_score, answer_score }`，Multi-Agent 直接输出纯文本。需要验证：
- 答案里没有 JSON wrapper
- 没有多余的评分字段泄露到最终输出

**方向 2.2 — 多轮累积文档的答案质量**

Multi-Agent 将多轮检索文档**累积拼接**（`allDocuments += documents`）。需要验证：
- 文档量较大（2-3轮累积）时答案是否仍然聚焦
- 是否出现来自不同轮次文档的内容混淆

**方向 2.3 — 与 Simple RAG 同 prompt 文件的答案一致性**

同一个问题、同一批文档，Multi-Agent 和 Simple RAG 的答案是否一致（排除评分字段差异后）。如果差异过大，说明 `ignoreAnswerScore=true` 去掉的 prompt 片段影响了答案内容。

---

### 维度 3：循环控制逻辑测试

**方向 3.1 — 正常停止（1轮足够）**

第1轮就评为 sufficient → 只执行1次检索，直接生成答案。验证：
- log 里只出现 1 次 `Retrieval Executor`
- 不触发 `selectNextStrategy`

**方向 3.2 — 最大次数兜底**

3轮都 insufficient → 强制跳出，用现有文档生成答案。验证：
- log 里出现"Max retrieval attempts reached"
- 仍然能正常生成答案，不报错

**方向 3.3 — selectNextStrategy 策略序列**

策略序列固定：`default_strategies → rewrite_expansion → rewrite_decomposition_expansion → stepback → hyde`，通过 `(currentIndex + attempt) % 5` 轮换。验证：
- attempt=1 时用 `default_strategies`
- attempt=2 时用 `rewrite_expansion`
- 第2/3轮检索的 query 实际走了对应策略的 retriever prompt

---

### 维度 4：端到端回归测试

**方向 4.1 — 触发条件验证**

Multi-Agent 只在两种情况触发：
- `agentic=true`（前端强制开启）
- Simple RAG 评分 `retrievalScore≤3 or answerScore≤3`

需要测试这两种入口下 Multi-Agent 是否都能正常完成。

**方向 4.2 — 不同 subjectArea 的覆盖**

不同 subjectArea 对应不同的 `agenticQuestionPromptString`，需覆盖主要场景：chart / crosstab / worksheet / 默认。

---

## 三、测试方法（复用现有 promptfoo 基础设施）

项目已有 promptfoo 框架（`test/promptfoo-test/`），Multi-Agent 测试拆为两个独立套件。

### Suite 1：EvaluatorAgent Prompt 测试

目录：`test/promptfoo-test/multi-agent/evaluator/`

```yaml
# promptfooconfig.yaml

description: "EvaluatorAgent prompt - sufficiency judgment accuracy"

prompts:
  - file://./prompt-loader.js   # 加载 evaluatorAgent.prompt

providers:
  - id: openai:gpt-4o-mini

defaultTest:
  assert:
    # 基础断言1：输出必须是合法 JSON
    - type: is-json
    # 基础断言2：字段完整性
    - type: javascript
      value: |
        const obj = JSON.parse(output);
        return typeof obj.isSufficient === 'boolean'
          && typeof obj.confidence === 'number'
          && obj.confidence >= 0 && obj.confidence <= 1
          && Array.isArray(obj.missingAspects)
          && typeof obj.reasoning === 'string';

tests:
  # ── 场景1：文档充分 ──────────────────────────────────────────────
  - description: "sufficient - doc fully covers the question"
    vars:
      question: "How do I add a target line to a chart?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/target-line-sufficient.txt"
    assert:
      - type: javascript
        value: JSON.parse(output).isSufficient === true

  # ── 场景2：文档完全不相关 ─────────────────────────────────────────
  - description: "insufficient - completely irrelevant documents"
    vars:
      question: "How do I add a target line to a chart?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/irrelevant-doc.txt"
    assert:
      - type: javascript
        value: |
          const obj = JSON.parse(output);
          return obj.isSufficient === false
            && typeof obj.suggestedNextQuery === 'string'
            && obj.suggestedNextQuery.length > 0;

  # ── 场景3：术语等价（关键规则验证）──────────────────────────────────
  - description: "sufficient - terminology equivalence (switch binding = set field dynamically)"
    vars:
      question: "How do I switch chart binding dynamically?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/form-control-set-field.txt"
    assert:
      - type: javascript
        value: JSON.parse(output).isSufficient === true
      - type: llm-rubric
        value: >
          The documents use "set field dynamically" which is equivalent to "switch binding".
          isSufficient must be true because the prompt explicitly states these are equivalent concepts.

  # ── 场景4：文档含完整步骤演练 ─────────────────────────────────────
  - description: "sufficient - doc contains walkthrough/step-by-step tutorial"
    vars:
      question: "How do I use a RadioButton to control which measure is shown on a chart?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/form-control-walkthrough.txt"
    assert:
      - type: javascript
        value: JSON.parse(output).isSufficient === true

  # ── 场景5：文档仅描述功能存在，无步骤 ────────────────────────────────
  - description: "insufficient - doc only mentions feature exists, no steps"
    vars:
      question: "How do I configure conditional formatting on a crosstab?"
      contextType: "crosstab"
      history: ""
      documents: "file://docs/crosstab-feature-mention-only.txt"
    assert:
      - type: javascript
        value: |
          const obj = JSON.parse(output);
          return obj.isSufficient === false
            && obj.missingAspects.length > 0;

  # ── 场景6：部分覆盖 ───────────────────────────────────────────────
  - description: "insufficient - partial coverage, missing key steps"
    vars:
      question: "How do I create a chart and add a trend line?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/chart-create-only.txt"
    assert:
      - type: javascript
        value: |
          const obj = JSON.parse(output);
          return obj.isSufficient === false
            && obj.missingAspects.some(a => a.toLowerCase().includes('trend'));
      - type: llm-rubric
        value: >
          missingAspects should mention trend line as missing information.
          suggestedNextQuery should focus on trend line, not repeat the full original question.
```

### Suite 2：Answer Generation 测试

目录：`test/promptfoo-test/multi-agent/answer-gen/`

```yaml
# promptfooconfig.yaml

description: "Multi-Agent answer generation - plain text output, no JSON wrapper"

prompts:
  - id: multi-agent-answer
    file://./prompt-loader.js   # 加载 xxxQuestion.prompt（ignoreAnswerScore=true）

providers:
  - id: openai:gpt-4o-mini

defaultTest:
  assert:
    # 答案不能是 JSON 对象
    - type: javascript
      value: |
        try { const obj = JSON.parse(output); return false; } catch(e) { return true; }

tests:
  # ── 场景1：单轮充分文档 ───────────────────────────────────────────
  - description: "answer quality - single retrieval round sufficient docs"
    vars:
      question: "How do I add a target line to a chart?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/target-line-sufficient.txt"
    assert:
      - type: llm-rubric
        value: >
          Answer must provide actionable step-by-step instructions.
          Answer must not be a JSON object.
          Answer must reference the target line feature specifically.

  # ── 场景2：多轮累积文档 ───────────────────────────────────────────
  - description: "answer quality - multi-round accumulated docs"
    vars:
      question: "How do I switch chart binding dynamically using form controls?"
      contextType: "dashboard"
      history: ""
      documents: "file://docs/multi-round-accumulated.txt"
    assert:
      - type: llm-rubric
        value: >
          Answer must be focused and coherent despite large document input.
          Answer must not mix unrelated content from different documents.
          Answer must address the specific question about dynamic binding with form controls.
```

---

## 四、文档准备方法

Multi-Agent 的文档是**多轮累积**的，需要准备两类文档：

### 类型 A：单轮充分文档（测试1轮即停止）

从 `dumpDocs` 日志或 rerank 输出中取第1次检索结果。

开启方式：设置 `Config.logger.dumpDocs=true`，或在 `answerService.ts` 中临时 dump `docStrings`（参考 README 中的 rerank-output 方案）。

### 类型 B：多轮累积文档（测试2/3轮后答案质量）

手动触发 Multi-Agent（设置 `agentic=true`），从 log 中依次提取每次检索的 `docStrings`，拼接后作为测试文档。

### 文档目录结构建议

```
test/promptfoo-test/multi-agent/
  evaluator/
    docs/
      target-line-sufficient.txt
      irrelevant-doc.txt
      form-control-set-field.txt
      form-control-walkthrough.txt
      crosstab-feature-mention-only.txt
      chart-create-only.txt
    prompt-loader.js
    promptfooconfig.yaml
  answer-gen/
    docs/
      target-line-sufficient.txt
      multi-round-accumulated.txt
    prompt-loader.js
    promptfooconfig.yaml
```

---

## 五、优先级建议

| 优先级 | 测试内容 | 原因 |
|---|---|---|
| P0 | EvaluatorAgent JSON 格式合规 | 解析失败 fallback 为"假充分"，直接影响整个循环 |
| P0 | EvaluatorAgent isSufficient 准确性（充分/不充分/术语等价） | 核心控制流决策 |
| P1 | suggestedNextQuery 质量 | 决定第2/3轮检索方向 |
| P1 | 最终答案格式（纯文本，非JSON） | `jsonResponse=false` 的行为验证 |
| P2 | 多轮累积文档下答案质量 vs Simple RAG | 对比回归 |
| P2 | 循环次数控制（1轮停/3轮兜底） | 性能与兜底逻辑 |
| P3 | 不同 subjectArea 的答案覆盖 | 全面性 |

---

## 六、稳定性测试建议

EvaluatorAgent 的 JSON 输出存在随机性，建议使用 `--repeat` 做稳定性测试：

```bash
# 每个 case 重复5次，至少4次通过（pass rate 80%）
PROMPTFOO_PASS_RATE_THRESHOLD=80 npx promptfoo eval \
  --config multi-agent/evaluator/promptfooconfig.yaml \
  --no-cache --repeat 5
```

重点关注"术语等价"类 case 的稳定性，这类 case 最容易在不同 run 之间产生不一致判断。
