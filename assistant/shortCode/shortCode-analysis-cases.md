# Short Code 规则分析

## 一、定义

Short code 是**结构性标记符（structural token）**，是**原子性 Markdown 单元**，既不是代码，也不是普通文本，有独立的处理规则。

**格式**：

```
[label](#TYPE_xxxx)
```

`TYPE` 必须是以下四种之一：

| TYPE    | 含义 |
|---------|------|
| `URL`   | 超链接 |
| `IMG`   | 图片 |
| `BTN`   | 按钮 |
| `VEDIO` | 视频 |

---

## 二、核心完整性规则

**来源**：`rules/shortCodeIntegrity.prompt`
**作用范围**：全局，独立于答案模式，所有场景均适用。

| # | 规则 |
|---|------|
| 1 | **来源限制**：只有在源文档中明确出现的 short code 才可使用 |
| 2 | **禁止生成**：模型禁止生成、推断、伪造、重命名、合并或修改任何 short code |
| 3 | **禁止转换**：章节标题、H1/H2/H3 标题、普通文本禁止被转换为 short code |
| 4 | **完整输出**：必须逐字完整复现，包括 label 文本、方括号、圆括号及完整 target；禁止截断（如仅写 `[label]`）或格式错误 |
| 5 | **步骤绑定**：文档步骤与其紧随/关联的 short code 构成不可分割单元；步骤关联的图片 short code 不得被丢弃、跳过或拆散 |
| 6 | **引用保留**：文档中出现 `see [label](#URL_xxxx)` 形式的引用时，引用及其 short code 应尽可能保留 |

---

## 三、其他规则对 Short Code 的影响

### 3.1 输出样式规则（`rules/outputStyle.prompt`）

**规则一：代码块豁免**（`[Code]` 区块）

原文：
```
All code, script lines, internal URLs, tab paths MUST be displayed verbatim using Markdown code blocks.
Do NOT apply this rule to short-codes ([label](#XXX)), which must be reproduced verbatim as a whole.
```

影响：Short code 明确豁免于代码块规则，不得被包裹进 `` ` `` 或 ```` ``` ```` 中，必须以完整 Markdown 形式原样输出。

---

**规则二：UI 格式化豁免**（`[UI Element Formatting]` 区块）

原文：
```
In short-codes (e.g., [label](#BTN_xxxx)), the bracketed text is an internal ID.
Use the visible UI text as the label and preserve the entire short-code unchanged.
```

影响：按钮标签通常须套 `[Label]` 格式，但若已是 short code 形式（如 `[label](#BTN_xxxx)`），则整体保持不变，不受 UI 格式化规则干预。

---

### 3.2 步骤保真规则（`rules/stepByStepFidelity.prompt`）

原文：
```
3. Short-Code Integrity
- ALL associated short-codes (#IMG_xxxx, #URL_xxxx, #BTN_xxxx, #VIDEO_xxxx) MUST be preserved exactly.
- Do NOT add, remove, relocate, or rewrite any short-code.
```

以及文件末尾的强制声明：
```
Violation of ANY rule above invalidates the step-by-step answer.
```

影响：作用于所有包含文档化 UI 步骤的答案场景。所有关联 short code 必须精确保留，不得增加、删除、重新定位或改写；违反此规则则**整个步骤化答案无效**。

---

### 3.3 图片 Short Code 附着规则（`default/scriptAnswerRules.prompt`）

原文：
```
3. UI Content Rules
   - Attach any image short-code (#IMG_xxxx) to the nearest relevant step or item.
```

影响：在包含 UI 步骤的 Script 场景中，图片 short code（`#IMG_xxxx`）必须附着在最近的相关步骤上，不得与步骤游离或单独出现。

---

### 3.4 优先级规则（`models/answerRules-gpt-5-mini.prompt` / `agentic/agentAnswerRules.prompt`）

原文（两个文件内容相同）：
```
**EXECUTION PRIORITY SUMMARY (GUIDING)**
During answer generation, the highest priority is:
1. Faithfulness to documented content
2. Structural integrity of documented steps and short-codes
3. Avoidance of undocumented inference
4. Formatting rules MUST NOT alter structural or short-code integrity.

If trade-offs are necessary, reduce answer scope rather than violate documentation fidelity.
```

以及 Generation-B 规则中：
```
2. When UI steps are required, they MUST comply with **Step-by-Step Fidelity Rules**.
   - All documented steps, order, numbering, and immediately associated short-codes MUST be preserved exactly.
```

影响：Short code 完整性在优先级体系中明确高于格式规则。当格式需求与 short code 完整性冲突时，应**缩减答案范围**而非破坏 short code。

---

### 3.5 上下文注入规则（`default/multiSubject/contextInput.prompt` / `default/crosstab/crosstabQuestion.prompt`）

原文（两个文件内容相同）：
```
Context Guidance (OPTIONAL):
- If `bindingContext`, `dataContext`, or `dateComparisonContext` is provided:
    - Add a separate "Context-Specific Notes" section.
    - Explain how the current configuration affects the documented steps.
    - Context MUST NOT replace or modify documented steps or their short-codes.
```

影响：动态注入的运行时上下文（`bindingContext`、`dataContext`、`dateComparisonContext` 等）不得替换或修改已有的文档步骤及其 short code。

---

## 四、规则适用范围汇总

| 场景 | 适用规则 |
|------|----------|
| 所有答案 | 核心完整性规则（shortCodeIntegrity） |
| 所有答案 | 代码块豁免 + UI 格式化豁免（outputStyle） |
| 含 UI 步骤的答案 | 步骤保真规则中的 Short-Code Integrity（stepByStepFidelity） |
| Script 场景含 UI 步骤 | 图片 short code 附着规则（scriptAnswerRules） |
| Agentic 场景 | 核心完整性规则（agentAnswerRules / agentScriptAnswerRules） |
| 含上下文注入的答案 | 上下文不得修改 short code（contextInput / crosstabQuestion） |
| 格式与完整性冲突时 | short code 完整性优先，缩减答案范围（answerRules-gpt-5-mini / agentAnswerRules） |

---

## 六、测试策略与场景

### 测试策略概述

由于实际输入的文档片段会同时包含多种 short code 场景，可触发多条规则，因此将原始 18 个独立 case 合并为 **5 个综合 case**。

合并原则：
- 共用同一份文档片段（doc）的 case 合并为一个
- 正负向测试共享相同 doc、只在预期输出上区分
- 性质相似的违规类型（如各类 short code 改写）归入同一 case 统一列举

测试输入构成：
- **doc**：人工构造的模拟文档片段，含明确 short code
- **query**：触发对应规则的用户提问
- **expected**：正向判定标准
- **violations**：需被检测的典型错误输出（每条一种违规类型）

---

### 原始 T Case 索引

全部 18 个原始 case 的说明与示例，供合并后的 C1–C5 对照参考。

| Case | 方向 | 验证点 | Doc 片段 | 预期输出 ✓ / 违规输出 ✗ |
|------|------|--------|----------|------------------------|
| T1-1 | 正向 | verbatim 完整复现 | `Click [Export](#BTN_0031) to proceed.` | ✓ `[Export](#BTN_0031)` appears verbatim, label and target unchanged |
| T1-2 | 负向 | label 截断 | `Click [Export](#BTN_0031) to proceed.` | ✗ `[Export]` — target `(#BTN_0031)` is missing |
| T1-3 | 负向 | target 修改 | `See [Guide](#URL_1023) for details.` | ✗ `[Guide](#URL_1024)` or `[Guide](URL_1023)` — target does not match source |
| T2-1 | 负向 | 从标题推断生成 | `## Advanced Settings\nConfigure timeout here.` | ✗ `[Advanced Settings](#URL_xxxx)` — short code fabricated from a heading |
| T2-2 | 负向 | 从按钮文字推断 | `Click the Apply button to save.` | ✗ `[Apply](#BTN_xxxx)` — short code fabricated from plain button text |
| T2-3 | 正向 | 有则使用，无则不造 | Doc A: `Click [Apply](#BTN_0010) to save.` / Doc B: `Click the Apply button to save.` | ✓ Doc A → `[Apply](#BTN_0010)` used as-is; Doc B → plain text "Apply", no `[...](#...)` created |
| T3-1 | 负向 | 行内代码包裹 | `Open [Settings](#URL_0055) to configure.` | ✗ `` `[Settings](#URL_0055)` `` — short code incorrectly wrapped in backticks |
| T3-2 | 负向 | 代码块包裹 | `Click [Download](#BTN_0031) to start.` | ✗ `[Download](#BTN_0031)` placed inside a ```` ``` ```` block |
| T3-3 | 正向 | URL 进代码块，short code 不进 | `Visit [here](#URL_0012) or go to https://docs.example.com` | ✓ `` `https://docs.example.com` `` in code block; `[here](#URL_0012)` rendered as raw Markdown, not in any code block |
| T4-1 | 负向 | BTN double-wrap | `Click [OK](#BTN_0001) to confirm.` | ✗ `[[OK](#BTN_0001)]` — outer brackets added by UI formatting rule |
| T4-2 | 正向 | 普通按钮格式化，BTN short code 不处理 | `Click Apply or [Cancel](#BTN_0002) to discard.` | ✓ `Apply` → `[Apply]`; `[Cancel](#BTN_0002)` stays unchanged, not rendered as `[[Cancel](#BTN_0002)]` |
| T5-1 | 负向 | IMG short code 丢弃 | `1. Click 'File'.\n[File Menu](#IMG_0023)\n2. Select 'Export'.` | ✗ Steps 1 and 2 present in output but `[File Menu](#IMG_0023)` is omitted |
| T5-2 | 负向 | IMG short code 错位 | `1. Step A\n[Screen A](#IMG_0023)\n2. Step B\n[Screen B](#IMG_0024)` | ✗ `[Screen A](#IMG_0023)` appears after Step B instead of after Step A |
| T5-3 | 正向 | 步骤 + IMG 完整保留 | `1. Open the panel.\n[Panel Overview](#IMG_0101)` | ✓ Step 1 is followed immediately by `[Panel Overview](#IMG_0101)`, order and content unchanged |
| T6-1 | 负向 | 上下文替换 short code | Doc: `1. Select the field.\n[Field Selection](#IMG_0055)` + context: `{ "selectedField": "Revenue" }` | ✗ Step becomes `1. Select the Revenue field.` and `[Field Selection](#IMG_0055)` is removed |
| T6-2 | 正向 | 上下文作补充，步骤不变 | same as T6-1 | ✓ Step and `[Field Selection](#IMG_0055)` preserved verbatim; "Revenue" mentioned only in a separate "Context-Specific Notes" section |
| T7-1 | 负向 | label 翻译 | `See [View Full Report](#URL_2048).` (user asks in Chinese) | ✗ `[查看完整报告](#URL_2048)` — label translated due to language-following rule |
| T7-2 | 正向 | 格式冲突时缩减范围 | `See [View Full Report](#URL_2048).` (user asks in Chinese) | ✓ `[View Full Report](#URL_2048)` preserved as-is; surrounding explanation text may be in Chinese |

---

### C1 — 综合正向验证

**合并自**：T1-1, T2-3, T3-3, T4-2

**合并理由**：这四个正向 case 可由同一份 doc 同时触发，一次输出即可完成全部验证。

**doc**：
```
To export data, click [Export](#BTN_0031) to proceed.
For configuration, open [Settings](#URL_0055).
Click Apply to confirm changes, or visit https://docs.example.com for help.
```

**query**：如何导出数据并完成配置？

**expected**：

| 验证点 | 判定标准 |
|--------|----------|
| verbatim 复现 | `[Export](#BTN_0031)` 和 `[Settings](#URL_0055)` 完整出现，label 和 target 与 doc 逐字一致 |
| 代码块豁免 | `https://docs.example.com` 在代码块内；`[Export](#BTN_0031)`、`[Settings](#URL_0055)` 不在任何代码块或反引号中 |
| UI 格式化豁免 | `Apply` → `[Apply]`；`[Export](#BTN_0031)` 不变为 `[[Export](#BTN_0031)]` |
| 无伪造 | 输出中不出现 doc 内不存在的任何 `[...](#TYPE_xxxx)` |

---

### C2 — Short Code 各类改写违规

**合并自**：T1-2, T1-3, T3-1, T3-2, T4-1, T7-1

**合并理由**：上述违规均是"对 short code 进行了某种形式的修改或误处理"，可基于同一 doc 列举各类违规形态。

**doc**（同 C1）：
```
To export data, click [Export](#BTN_0031) to proceed.
For configuration, open [Settings](#URL_0055).
Click Apply to confirm changes, or visit https://docs.example.com for help.
```

**query**：如何导出数据并完成配置？

**violations**：

| 违规类型 | 错误输出示例 | 判定 |
|----------|------------|------|
| label 截断 | `[Export]` 或 `[Settings]`（缺失 target） | FAIL |
| target 修改 | `[Export](#BTN_0032)` 或 `[Settings](#URL_0056)` | FAIL |
| 行内代码包裹 | `` `[Export](#BTN_0031)` `` | FAIL |
| 代码块包裹 | `[Settings](#URL_0055)` 出现在 ` ``` ` 块内 | FAIL |
| BTN double-wrap | `[[Export](#BTN_0031)]` | FAIL |
| label 翻译 | `[导出](#BTN_0031)` 或 `[设置](#URL_0055)` | FAIL |

---

### C3 — 禁止推断/伪造 Short Code

**合并自**：T2-1, T2-2

**合并理由**：两种伪造场景可以放在同一份 doc 中同时触发，一次检验即可覆盖。

**doc**：
```
## Advanced Settings
Configure the timeout value in the input field.
Click the Apply button to save changes.
```

**query**：如何在高级设置中配置超时并保存？

**expected**：输出中不出现任何 `[...](#TYPE_xxxx)` 形式的内容

**violations**：

| 违规类型 | 错误输出示例 | 判定 |
|----------|------------|------|
| 从标题推断 | `[Advanced Settings](#URL_xxxx)` | FAIL |
| 从按钮文字推断 | `[Apply](#BTN_xxxx)` | FAIL |
| 任意伪造 | 输出中出现 doc 内不存在的任何 `[...](#TYPE_xxxx)` | FAIL |

---

### C4 — 步骤绑定 + 上下文注入

**合并自**：T5-1, T5-2, T5-3, T6-1, T6-2

**合并理由**：步骤绑定和上下文注入共享相同的文档结构（步骤 + IMG short code），上下文只是在此基础上额外注入，两组规则可由同一 doc + context 同时验证。

**doc**：
```
1. Click the 'Data' menu.
[Data Menu Screenshot](#IMG_0023)
2. Select 'Bind Data' from the dropdown.
[Bind Data Dialog](#IMG_0024)
3. Click [Confirm Binding](#BTN_0088) to apply.
```

**context**：
```json
{ "bindingContext": { "selectedTable": "SalesData" } }
```

**query**：如何绑定数据？

**expected（正向）**：

| 验证点 | 判定标准 |
|--------|----------|
| 步骤完整 | 步骤 1、2、3 按序出现，无缺漏 |
| IMG 绑定不拆散 | `[Data Menu Screenshot](#IMG_0023)` 紧跟步骤 1；`[Bind Data Dialog](#IMG_0024)` 紧跟步骤 2 |
| BTN verbatim | `[Confirm Binding](#BTN_0088)` 原样出现在步骤 3 |
| 上下文隔离 | `SalesData` 相关说明仅出现在独立的 "Context-Specific Notes" 章节，不修改步骤原文或任何 short code |

**violations（负向）**：

| 违规类型 | 错误输出示例 | 判定 |
|----------|------------|------|
| IMG 丢弃 | 步骤 1/2 输出中缺少 `[...](#IMG_xxxx)` | FAIL |
| IMG 错位 | `[Data Menu Screenshot](#IMG_0023)` 出现在步骤 2 之后 | FAIL |
| 上下文替换步骤 | 步骤改为 `1. Click the 'Data' menu to bind SalesData.` 且 IMG short code 被删除 | FAIL |
| 上下文修改 short code | `[Bind Data Dialog](#IMG_0024)` 被改写或删除 | FAIL |

---

### C5 — 优先级冲突：格式规则不得覆盖 Short Code 完整性

**合并自**：T7-2（T7-1 已合并入 C2）

**doc**（用户使用中文提问，doc 含英文 label 的 short code）：
```
To view the full analysis, see [View Full Report](#URL_2048).
```

**query**：如何查看完整分析报告？

**expected**：

| 验证点 | 判定标准 |
|--------|----------|
| label 不翻译 | 输出含 `[View Full Report](#URL_2048)`，label 保持英文，不因用户使用中文而被翻译 |
| 格式不干预 | short code 不被加粗、斜体、或任何额外 Markdown 修饰 |
| 冲突时缩减范围 | 若格式规则与 short code 完整性冲突，输出选择缩减说明文字而非修改 short code |

**violations**：

| 违规类型 | 错误输出示例 | 判定 |
|----------|------------|------|
| label 被翻译 | `[查看完整报告](#URL_2048)` | FAIL |
| short code 被加粗 | `**[View Full Report](#URL_2048)**` 且括号内容被修改 | FAIL |

---

### 测试场景优先级汇总

| 优先级 | Case | 合并自 | 对应规则来源 | 风险等级 | Case 数（合并前） |
|--------|------|--------|-------------|----------|-----------------|
| P0 | C1 综合正向 | T1-1, T2-3, T3-3, T4-2 | shortCodeIntegrity + outputStyle | 高 | 4 |
| P0 | C2 各类改写违规 | T1-2, T1-3, T3-1, T3-2, T4-1, T7-1 | shortCodeIntegrity + outputStyle + agentAnswerRules | 高 | 6 |
| P0 | C3 禁止推断伪造 | T2-1, T2-2 | shortCodeIntegrity | 高 | 2 |
| P0/P1 | C4 步骤绑定 + 上下文注入 | T5-1, T5-2, T5-3, T6-1, T6-2 | shortCodeIntegrity + stepByStepFidelity + contextInput | 高 | 5 |
| P2 | C5 优先级冲突 | T7-2 | agentAnswerRules / answerRules-gpt-5-mini | 低 | 1 |
| | **合计** | | | | **18 → 5** |

---

## 七、两阶段测试策略

### 根本原因分析

Short code 在生产环境中不稳定，根本原因不是 short code 规则本身有误，而是**规则叠加压力**导致的失稳：

```
大体积 doc（20+ 步骤、多个 IMG/URL short code）
  + 复杂 answerRules（多 phase workflow）
  + outputStyle（语言跟随用户 → 触发翻译冲动）
  + stepByStepFidelity（大量步骤 → 模型倾向压缩输出）
  + contextInput（上下文注入改写步骤）
──────────────────────────────────────────────────
= short code 在某些轮次被截断、翻译或随步骤一起被省略
```

在小 doc + 规则隔离环境下模型表现正常，但全量规则同时生效 + doc 体积大时，模型在"减少输出长度"或"语言一致性"等压力下牺牲了 short code 完整性。

---

### 第一阶段：规则隔离验证（手工构造 doc）

**目标**：确认规则本身定义正确，模型在无干扰时能遵守。建立稳定基线。

**方法**：
- 手工构造最小 doc，只含目标场景的 short code 结构
- 按 C1–C5 逐 case 执行，每次只验证一类规则
- 通过全部 case 后，基线确立

**doc 来源**：手工编写，参考原始 T Case 索引表中的 doc 片段示例。

---

### 第二阶段：压力整合测试（真实 doc）

**目标**：发现规则在实际叠加环境下的失稳点，复现生产中出现过的 short code 错误。

**doc 来源**：开启 `DUMP_DOCS=true`，从真实对话中收集 dump 文件，从中挑选：
1. 含 short code 数量最多的 doc（压力最大）
2. 历史上曾触发 short code 丢失的问题对应的 doc（复现已知 bug）
3. 包含多步骤 + 连续 IMG 组合的 doc（最容易出错的结构）

**测试场景**：

#### S1 — doc 体积压力

| 项 | 内容 |
|----|------|
| doc | 真实 dump doc，含 20+ 步骤、每步带 IMG short code，以及多个 URL/BTN short code |
| query | 与该 doc 对应的原始问题 |
| 关注点 | 模型在输出大量步骤时，是否因"压缩输出"丢弃步骤中的 `[...](#IMG_xxxx)` |
| 对应规则 | shortCodeIntegrity 规则 5、stepByStepFidelity Rule 3 |

#### S2 — 语言规则冲突压力

| 项 | 内容 |
|----|------|
| doc | 真实 doc，含多个英文 label 的 BTN/URL short code |
| query | 中文提问 |
| prompt 环境 | 完整 answerRules + outputStyle（含语言跟随规则）同时生效 |
| 关注点 | outputStyle 的"答案语言跟随用户"规则是否在全量 prompt 下压过 short code verbatim 要求，导致 label 被翻译 |
| 对应规则 | shortCodeIntegrity 规则 4、outputStyle [Language]、agentAnswerRules 优先级规则 |

#### S3 — 多规则同时生效压力

| 项 | 内容 |
|----|------|
| doc | 真实 doc，步骤 + IMG + URL + BTN 混合 |
| prompt 环境 | answerRules + outputStyle + stepByStepFidelity + referenceLink 全部加载 |
| 关注点 | 格式规则（代码块、UI 格式化、加粗）是否在全量 prompt 下干预了 short code |
| 对应规则 | outputStyle 两条豁免规则、stepByStepFidelity Rule 3、agentAnswerRules 优先级 |

#### S4 — 上下文注入 + 大体积 doc

| 项 | 内容 |
|----|------|
| doc | 真实 doc，含步骤 + IMG short code |
| context | 真实 bindingContext 或 dataContext（含字段名、表名等具体数据） |
| 关注点 | 上下文注入是否在大 doc 环境下导致模型改写步骤并顺带删除关联 short code |
| 对应规则 | contextInput 规则、shortCodeIntegrity 规则 5 |

---

### 两阶段执行顺序

```
第一阶段（手工 doc）
  ├── C1 综合正向        → 基线验证
  ├── C2 各类改写违规    → 负向覆盖
  ├── C3 禁止推断伪造    → 负向覆盖
  ├── C4 步骤绑定 + 上下文注入 → 高风险覆盖
  └── C5 优先级冲突      → 补充验证
         ↓ 全部通过，基线确立
第二阶段（真实 doc）
  ├── S1 doc 体积压力    → 发现压缩丢失
  ├── S2 语言规则冲突    → 发现翻译失稳
  ├── S3 多规则叠加      → 发现格式干预
  └── S4 上下文 + 大 doc → 发现注入改写
         ↓ 失败 case → 提炼为新的手工 case 加入第一阶段
```

---

## 五、规则体系结构图

```
Short Code 规则体系
│
├── 定义层（shortCodeIntegrity.prompt）
│   ├── 类型：[label](#TYPE_xxxx)，TYPE ∈ {URL, IMG, BTN, VEDIO}
│   ├── 性质：结构性标记，原子单元，非代码非纯文本
│   └── 六条行为约束：来源 / 禁止生成 / 禁止转换 / 完整输出 / 步骤绑定 / 引用保留
│
├── 格式层（outputStyle.prompt）
│   ├── 代码块规则豁免：short code 不得放入代码块
│   └── UI 格式化规则豁免：BTN 类 short code 不受按钮格式化干预
│
├── 步骤层（stepByStepFidelity.prompt）
│   └── 步骤内所有 short code 精确保留，不得增删移动，违反则答案无效
│
├── 附着规则（scriptAnswerRules.prompt）
│   └── #IMG_xxxx 必须附着于最近相关步骤，不得游离
│
├── 优先级层（agentAnswerRules / answerRules-gpt-5-mini）
│   └── short code 完整性 > 格式规则；冲突时缩减答案范围而非破坏 short code
│
└── 上下文层（contextInput / crosstabQuestion）
    └── 运行时上下文不得替换或修改 short code
```
