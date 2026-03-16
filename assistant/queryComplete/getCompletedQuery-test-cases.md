# `getCompletedQuery()` 测试设计文档

> 源码：`chat-app/server/src/tools/retrieval/getSubjectArea.ts`
> Prompt：`chat-app/server/prompts/subjectAreas/completeQueryByHistory.prompt`
> 实现：`test/promptfoo-test/completeQuery/promptfooconfig.yaml`

---

## 一、背景：为什么现有测试不够

### 1.1 原有测试（QueryCompletion.yaml）的覆盖范围

| 已覆盖场景 | 断言方式 |
|-----------|---------|
| 空历史直传 | `expQueryContains` |
| 代词消解（its / them） | `expQueryContains` + `expQueryNotContains` |
| 话题延续（what about for bar charts） | `expQueryContains` |
| 话题切换（新问题与历史无关） | `expQueryContains` |
| 多轮深层跟进 | `expQueryContains` |

### 1.2 `expQueryContains` 的根本局限

`expQueryContains` 测的是**关键词存在性**，而 `getCompletedQuery` 要生成的是
**语义自足、意图正确的独立问句**。两者目标根本不同。

**典型失效场景：**

```
question: "Yes"
expQueryContains: total
→ LLM 返回 "Yes, include total" — total 存在，测试 PASS
→ 但 "Yes" 残留，问句依然依赖上下文，实际是错的
```

```
question: "How do I change its color?"
expQueryContains: legend
→ LLM 正确返回 "How to change the color of the chart key?"
→ 用了 legend 的同义词 "key"，测试 FAIL，但语义完全正确
```

**无法验证的核心属性：**

| 属性 | `expQueryContains` | 说明 |
|------|--------------------|------|
| 问句是否**语义自足** | ✗ | 这是 getCompletedQuery 的核心目标 |
| 确认词是否被**完整重建** | 部分 | 词命中不等于意图命中 |
| 是否违反**禁止模块规则** | 弱 | NotContains 只能查一个词 |
| 是否保持了**script/UI 导向** | ✗ | 纯语义判断，关键词无法覆盖 |

---

## 二、测试方案：三层断言分层模型

```
Layer 1 — js 结构断言（快、确定性强，无 LLM）
  ├── check-structure.js        [全局] JSON 合法 + replaced_query 字段非空
  ├── check-not-passthrough.js  [opt-in: isConfirmation=true]
  │     确认/选择词不能裸传，replaced_query 须 ≥15 字符且不以确认词开头
  └── check-no-forbidden-module.js  [opt-in: checkForbiddenModule=true]
        replaced_query 不得含 "portal" / "enterprise manager"

Layer 2 — js 关键词断言（per-case inline，只用于高置信度必现词）
  └── 如 chart/sort/filter/legend，用于辅助定位失败原因

Layer 3 — llm-rubric 语义断言（per-case，仅用于无法关键词化的场景）
  └── 统一格式："The output is JSON. Evaluate query_processing.replaced_query (RQ).
       PASS if ... FAIL if ..."
```

### 2.1 Rubric 使用原则：不是所有 case 都需要

**判断标准**：是否存在一种情况——keyword assertion 通过，但输出实际上语义错误？

| 情形 | 是否需要 rubric |
|------|----------------|
| 行为完全确定（空历史直传、显式完整问题） | ✗ keyword 足够 |
| 代词消解、话题延续（预期词必然出现） | ✗ keyword 足够 |
| 禁止模块（Portal/EM 检查） | ✗ 结构断言足够 |
| 确认/选择型回答（Yes / Sales Amount） | ✓ keyword 无法验证意图是否正确重建 |
| 否定反馈（I don't like X） | ✓ keyword 无法验证目标是否正确保留 |
| script 导向保持 | ✓ 纯语义判断，keyword 区分不了表达式导向 vs UI 导向 |
| 行为本身模糊/多种合理答案 | ✓ 只用 rubric，不加脆弱的 keyword 断言 |

**不加 rubric 的代价：**
- 每个 rubric = 1 次 grader LLM 调用，成本和时间成比例增加
- rubric 是概率性的，对确定性 case 引入 false fail 风险
- rubric 失败比 keyword 失败更难调试

---

## 三、测试文件结构

```
test/promptfoo-test/completeQuery/
├── prompt-loader.js                  # 自定义 loader：LangChain 变量替换 + 双括号反转义
├── promptfooconfig.yaml              # 所有 20 个 test cases
└── assertions/
    ├── check-structure.js            # Layer 1 全局：JSON 结构 + replaced_query 存在
    ├── check-not-passthrough.js      # Layer 1 opt-in：确认词不能裸传
    └── check-no-forbidden-module.js  # Layer 1 opt-in：禁止 Portal/EM
```

**prompt-loader.js 的关键处理：**

```
读取 completeQueryByHistory.prompt
  ↓
替换 {history}  ← 格式化为 "Human: ...\nAI: ..." 字符串（LangChain 默认格式）
替换 {question} ← 实际问题
  ↓
{{ → {  /  }} → }   ← 解转 LangChain 双括号转义，还原 JSON 示例格式
```

---

## 四、测试用例设计思路（20 cases）

### Section 1：结构性 / 直传场景

测试 Phase 2 Guardrail 1（空历史）和 Guardrail 3（问题已完整），验证 no-op 行为。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S1-1 | 空历史 → 问题原样返回 | L2 | Guardrail 1 最基础的验证，行为 100% 确定，keyword 完全足够 |
| S1-2 | 完整独立问题 → 不被历史改写 | L2 | Guardrail 3：问题已含动作+对象时直接停止，验证明确问题不会被历史污染 |

---

### Section 2：代词消解 / 话题延续

验证 Phase 2 后向搜索的基础补全能力。预期词必然出现，keyword 足够，无需 rubric。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S2-1 | 代词 "its" → 解析为图表图例颜色 | L2 | 三条 js 断言已完整覆盖（含 color、含 legend、不含 its），加 rubric 只增加成本 |
| S2-2 | 代词 "them" → 解析为 worksheet 列 | L2 | 同上 |
| S2-3 | 话题延续 → 针对 bar chart 的 reference line | L2 | 预期词（bar + reference）必然出现，keyword 足够 |
| S2-4 | 话题延续 → date column range filter | L2 | 同上 |

---

### Section 3：确认 / 选择型回答

**为什么 Prompt 有规则但原有测试完全未覆盖：** QueryCompletion.yaml 中没有任何确认/选择场景。这是实际对话中的高频路径（用户回答助手的澄清问题）。

**为什么必须加 rubric：** `includes('total')` 通过不代表 "Yes" 已被消除、意图已完整重建。keyword 无法区分 `"Yes, include total"`（错）和 `"Include totals in the Dashboard table"`（对）。

所有 S3 case 均启用 `isConfirmation: "true"` 触发 Layer 1 `check-not-passthrough.js`。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S3-1 | "Yes" → 重建 table totals 意图 | L1+L2+L3 | 最典型的确认型场景，验证 "Yes" 不裸传且意图被完整重建 |
| S3-2 | 选择 "Sales Amount" → 保留 aggregation 意图 | L1+L2+L3 | 自然语言选项中选一项，验证选择项与原始目标合并 |
| S3-3 | 选择 "Current Row" + script 历史 | L1+L2+L3 | 核心验证点：script=true 历史下，选择型回答必须保持表达式导向，不能变成 UI 操作步骤 |
| S3-4 | 两轮澄清后的 "Yes" → 追溯完整意图 | L1+L3 | Prompt 要求追溯"最近完整的多轮链"，验证嵌套澄清时追溯深度是否正确。keyword 无法表达嵌套意图的质量 |
| S3-5 | 单字母选项 "A" → 解析选项文本 + 合并原始意图 | L1+L2+L3 | 助手给出 (A)(B)(C) 字母列表，用户回复 "A"。LLM 必须从历史中读取选项文本，将 "A" 解析为 "legend label text color"，再与原始问题合并。check-not-passthrough 阻止裸传 "A"；L2 验证选项内容词命中；L3 验证语义完整性 |

---

### Section 4：否定反馈 / 寻求替代方案

**为什么需要测：** Prompt Section 4 有专门规则，QueryCompletion.yaml 完全未覆盖。

**为什么需要 rubric：** keyword 可以验证 intent 词还在，但无法验证否定情绪是否被正确转化为 "instead of / without" 结构。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S4-1 | "I don't like Crosstabs" → 保留 sales by region 目标 | L2+L3 | 否定偏好不能成为 replaced_query 的核心；原始目标必须保留并加上替代约束 |
| S4-2 | "Any other way?" → 保留 chart filter 目标 | L2+L3 | 寻求替代方案时，Active Goal 必须被识别并延续 |

---

### Section 5：禁止模块保护

**为什么关键词检查足够：** `check-no-forbidden-module.js` 直接检查字符串，行为完全确定，S5-2 不需要 rubric。S5-1 加 rubric 是为了同时验证"用了正确模块（Dashboard）"，而不仅是"没用错误模块"。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S5-1 | Portal 历史 + Visual 动作 → 必须用 Dashboard | L1+L2+L3 | 禁止模块 + 验证应匹配 Dashboard；Prompt 明确规则，验证后向搜索的模块过滤是否生效 |
| S5-2 | Enterprise Manager 历史 + Data 动作 | L1+L2 | 结构断言（forbidden module check）+ keyword 已完整覆盖，无需 rubric |

---

### Section 6：Script 上下文隔离

**为什么是独立的 section：** `script` 标志是 per-SubjectArea 独立判断的，不应跨条目污染。两个对称 case 验证双向隔离。

**为什么必须用 rubric：** keyword 区分不了"表达式导向"和"UI 操作导向"，这是纯语义判断。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S6-1 | Script 历史不污染后续 UI 问题 | L2+L3 | 历史是表达式问题（script=true），当前是明确 UI 操作。Rubric 验证 replaced_query 保持 UI 导向，未被表达式化 |
| S6-2 | Script 历史 + 否定反馈 → 保持表达式导向 | L3 | 否定反馈仍在 script 上下文内，replaced_query 不能变成 UI 操作步骤。纯语义判断，只用 rubric |

---

### Section 7：边界 / Prompt 未定义场景

这些 case 对应 Prompt 未显式处理的边界行为，测试系统在"未定义场景"下的合理性。

| Case | 场景 | 断言层 | 设计思路 |
|------|------|--------|---------|
| S7-1 | 3 轮窗口截断：第 4 轮上下文已丢失 | L2+L3 | Phase 1 只提取最近 3 条 SubjectArea，已知设计限制。验证截断后输出仍合理；rubric 接受多种合理答案（无唯一正确答案） |
| S7-2 | 纯名词查询 "Legend" → 必须补全为可执行问句 | L2+L3 | Prompt 的 backward search 依赖动作分类，纯名词无法分类。验证系统能否为名词合理补充动作 |
| S7-3 | 混合历史（worksheet→portal→chart）+ Visual 动作 | L1+L2+L3 | 后向搜索应跳过禁止模块和不匹配类型，命中最近的 Dashboard/chart。验证 fallback 优先级正确 |
| S7-4 | 问题中明确含模块 → 历史不应覆盖 | L2 | Guardrail 3：问题已完整时直接停止。验证显式陈述优先于历史推断，两条 js 已完整表达 |
| S7-5 | 中文问题 + 英文历史（多语言混合） | L3 | Prompt 示例全为英文，未声明语言行为。预期有不确定性（结果可能中/英文），只用 rubric |
| S7-6 | 嵌套选择链 → "The second option" 重建完整意图 | L1+L3 | 连续两轮澄清后的选择，Prompt 对嵌套深度未明确定义。Rubric 验证意图重建是否正确 |
| S7-7 | 全 forbidden 历史 → 无合法模块时的 fallback | L1+L2+L3 | Prompt 未定义后向搜索全未命中时的行为。验证容错性：至少不崩溃、不返回空、不引用禁止模块 |
| S7-8 | 多轮深层跟进（crosstab conditional formatting） | L2+L3 | 原 QueryCompletion.yaml 已有案例，迁移至 promptfoo 并加 rubric 提升验证质量 |

---

## 五、代码层单元测试方向

以下场景无法通过 promptfoo（prompt 层）测试，需在 `getSubjectArea.test.ts` 中 mock LLM 验证。

| 场景 | 期望行为 |
|------|---------|
| LLM 返回 `replaced_query` 字段缺失 | 返回 `undefined`，下游 `completedQuery \|\| question` 回退到原始问题，不 throw |
| LLM 返回完全无效 JSON | `JSON.parse` 抛出，被上层 catch，不影响主流程 |
| AbortSignal 在 LLM 调用后触发 | 抛出 "Request was cancelled"，不返回 replaced_query |
| `replaced_query` 与原问题完全相同 | 直接返回该值，下游行为不变 |
| `replaced_query` 返回空字符串 | 空字符串为 falsy，下游 `completedQuery \|\| question` 回退到原始问题 |

---

## 六、Case 汇总与优先级

| Case | 场景 | 断言层 | 优先级 |
|------|------|--------|--------|
| S1-1 | 空历史直传 | L2 | P0 基础回归 |
| S1-2 | 完整问题不修改 | L2 | P0 |
| S2-1 | 代词 its | L2 | P1 |
| S2-2 | 代词 them | L2 | P1 |
| S2-3 | 话题延续 bar chart | L2 | P1 |
| S2-4 | 话题延续 date filter | L2 | P1 |
| S3-1 | 确认 Yes → totals | L1+L2+L3 | **P0 完全未测试的高频场景** |
| S3-2 | 选择 Sales Amount | L1+L2+L3 | **P0** |
| S3-3 | 选择 Current Row + script | L1+L2+L3 | **P0 script 导向** |
| S3-4 | 嵌套澄清后 Yes | L1+L3 | P1 |
| S3-5 | 字母选项 "A" 解析 | L1+L2+L3 | **P0** |
| S4-1 | 否定反馈 don't like | L2+L3 | P1 |
| S4-2 | 寻求替代方案 | L2+L3 | P1 |
| S5-1 | Portal 历史 → Visual | L1+L2+L3 | P1 明确 Prompt 规则 |
| S5-2 | EM 历史 → Data | L1+L2 | P1 |
| S6-1 | Script 历史不污染 UI | L2+L3 | **P0 Script 隔离** |
| S6-2 | Script 历史 + 否定反馈 | L3 | P1 |
| S7-1 | 3 轮窗口截断 | L2+L3 | P2 已知设计限制 |
| S7-2 | 纯名词查询 | L2+L3 | P2 |
| S7-3 | 混合历史 Visual | L1+L2+L3 | P1 |
| S7-4 | 显式模块覆盖历史 | L2 | P1 |
| S7-5 | 中英文混合 | L3 | P2 |
| S7-6 | 嵌套选择链 | L1+L3 | P2 Prompt 定义模糊 |
| S7-7 | 无合法模块 fallback | L1+L2+L3 | P1 Prompt 空白区域 |
| S7-8 | 多轮深层跟进 | L2+L3 | P1 |
