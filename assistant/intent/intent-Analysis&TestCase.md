# Intent 检测模块分析

> 适用对象：AI 助手测试员  
> 目标：理解 Intent Detection 的判定规则与测试关注点

---

## 1. 功能概述

Intent 模块负责判断用户当前提问是否属于 **产品问题反馈** 类型，从而决定是否在回答中展示 **「Report Issue」** 按钮及固定帮助文案。

- **核心目标**：  
  - 只有当用户 **明确描述或强烈暗示** 产品故障 / 错误 / 异常结果时，才将 `need_report_issue` 判为 `true`。  
  - 其他情况（使用指导、配置、概念问题、功能建议、模糊抱怨、非 StyleBI 问题）一律判为 `false`。

---

## 2. Prompt 规则速览

### 2.1 文件位置

| 版本 | 路径 |
|------|------|
| v1 | `server/prompts/default/intent.prompt` |
| v2 | `server/prompts-v2/default/intent.prompt` |

> 实际使用哪个版本由环境变量 `PROMPTS_VERSION` 决定，默认是 `v2`（`prompts-v2/` 目录）。当前两版内容一致。

### 2.2 决策规则（核心业务含义）

| 判定为 `need_report_issue = true` | 判定为 `need_report_issue = false` |
|----------------------------------|------------------------------------|
| 产品故障、报错、失败 | 使用/操作类问题（how-to） |
| 结果错误、不一致、异常 | 配置/安装/权限配置类问题 |
| UI 缺陷、图表/报表显示异常 | 概念/理论类问题 |
| 数据缺失、错误、不更新 | 功能建议 / 需求 |
| 系统导致的崩溃、明显卡顿 | 没有具体症状的模糊抱怨 |
| 因系统行为无法完成任务 | 与 StyleBI 无关的问题 |

> 测试时可以把上表当作“业务金标准”：任何用例的预期 `need_report_issue` 都应该能在左/右两列找到对应理由。

### 2.3 输入变量

| 变量名 | 含义 |
|--------|------|
| `{chat_history}` | 过往对话历史（包含用户和助手多轮内容） |
| `{question}` | 本轮用户最新问题文本 |

> 多轮场景下，模型需要结合 `chat_history` 来判断类似「还是不行」这类短句是否仍然属于产品问题。

### 2.4 输出格式（JSON）

```json
{
  "need_report_issue": true | false,
  "reasoning": "简短说明判断理由",
  "help_message": ""
}
```

- **need_report_issue**：是否需要展示「Report Issue」入口（测试关注的核心字段）。
- **reasoning**：1–2 句的简短说明，解释为什么是/不是产品问题（用于可观测性与排查）。
- **help_message**：仅在需要展示反馈入口时才会使用的固定帮助文案翻译。

### 2.5 help_message 规则

| 条件 | help_message 要求 |
|------|-------------------|
| `need_report_issue = true` | 必须是「Fixed Help Message」的翻译版本 |
| | 翻译语言必须与用户问题语言一致 |
| | 如果用户问题是英文或语言不明，则使用英文 |
| | 文案中的 `**Report Issue**` 必须原样保留，不得翻译或改写 |
| `need_report_issue = false` | 必须是空字符串 `""` |

> 这意味着：**只要是 false，`help_message` 一定是空的；只要是 true，`help_message` 一定是一段固定格式的引导文案。**

### 2.6 固定帮助文案（英文基线）

```text
I hope the information above helps resolve your issue. To help us improve our product, if you encounter any reproducible bugs or error messages, you are very welcome to click **Report Issue** and describe them in detail. Your feedback is very important to us!
```

> 所有非英文场景（中文、日文等）都是对这段英文的翻译版本，但中间的 `**Report Issue**` 必须保持英文和加粗格式。

---

## 3. 测试分析要点（从 Prompt 角度）

### 3.1 常见边界场景与预期

| 场景示例 | 期望 `need_report_issue` | 原因归类 |
|----------|-------------------------|----------|
| 提供具体错误码/堆栈，如 “HTTP 500”、“NullPointerException…” | true | 明确产品错误/故障 |
| 询问“怎么用某个功能” | false | how-to 使用问题 |
| 仅表达“希望支持某个新功能/模式” | false | 功能建议 |
| 明确说“数据不对/结果异常/图表错乱/报表导出不正常”等 | true | 结果/显示异常 |
| 明确描述“系统很卡、打开就崩溃” | true | 系统导致卡顿/崩溃 |
| 只是说“界面不好看/体验一般” | false | 模糊抱怨、无具体症状 |
| 明确说明问题出在其他产品（如 Power BI） | false | 与 StyleBI 无关 |

> 建议：把你们常见的用户话术对照上表，确认预期先在业务层面达成一致，再据此评估模型输出是否合理。

### 3.2 重点验证点（黑盒角度）

在执行测试用例（参考 `intent-test-cases-v2.md`）时，重点观察：

1. **判定是否与业务规则一致**
   - 对于“明显产品问题”场景，`need_report_issue` 应稳定为 `true`。
   - 对于 “how-to/配置/概念/建议/模糊抱怨/非 StyleBI” 场景，`need_report_issue` 应稳定为 `false`。

2. **help_message 是否遵守约束**
   - true 时：有值，且是固定文案的翻译（语言正确，包含 `**Report Issue**`）。
   - false 时：严格为 `""`（空字符串），不会出现“true 但没文案 / false 但有文案”的混搭。

3. **多语言场景**
   - 中文问题 → 中文引导文案 + 英文 `**Report Issue**`。
   - 英文或语言不明的短句（如 “Error 500”）→ 英文引导文案。
   - 其他语种（如日文）→ 对应语种翻译 + 英文 `**Report Issue**`。

4. **多轮对话**
   - 历史中已经详细描述错误，本轮只说“还是不行” → 应结合 `chat_history` 仍判为 true。
   - 历史为配置/权限/使用问题，本轮短句“还是不行” → 通常仍应保持 false（视产品策略）。

---

## 4. 相关文件速查（用于定位和回归）

> 作为测试员，你只需知道“去哪里看/改了什么需要回归什么”，不必深入阅读代码实现。

| 用途 | 文件路径 | 说明 |
|------|----------|------|
| Intent Prompt（v2 默认） | `server/prompts-v2/default/intent.prompt` | 修改此文件后，需回归全部 Intent 测试用例（尤其是边界与多语言用例）。 |
| Intent 节点逻辑 | `server/src/agents/chatAgent/nodes/intentDetection.ts` | 出现 JSON 解析异常或字段异常时，可让开发同事从此处排查。 |
| 工作流编排 | `server/src/agents/chatAgent/workflows.ts` | 确认 Intent 节点是否在主流程中启用。 |
| Intent 状态字段定义 | `server/src/agents/chatAgent/types.ts` | 包含 `reportIssue` / `helpMessage` 等字段定义。 |
| 聊天工作流入口 | `server/src/agents/chatAgent/index.ts` | 决定何时在回答中追加 `help_message`。 |
| JSON 解析辅助 | `server/src/tools/tools.ts` | 包含从 LLM 输出中提取 JSON 的通用工具。 |
| 模型配置与选择 | `server/src/llms/modelFactory.ts` | 切换 `INTENT_MODEL_NAME` 后，需要做一次回归。 |
| 前端展示 | `client/src/components/MessageItem.tsx` | `reportIssue=true` 时是否展示 `ReportIssueButton`。 |

---

## 5. 简易数据流示意（帮助理解端到端行为）

```text
User Question
     │
     ▼
┌─────────────────┐
│ intentDetection │ ← chat_history, question
│  (LLM + Prompt) │
└────────┬────────┘
         │
         ├─ reportIssue (boolean)
         ├─ helpMessage (string)
         └─ _stepContent (调试用标签)
         │
         ▼
┌─────────────────┐      若 reportIssue = true      ┌──────────────────┐
│ generateResponse│ ───────────────────────────────►│ 追加 helpMessage  │
└────────┬────────┘                                 │ 到最终 answer 尾部 │
         │                                           └────────┬─────────┘
         ▼                                                     │
┌─────────────────┐                                            │
│ MessageService  │ ◄──────────────────────────────────────────┘
│ (持久化到 DB)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MessageItem.tsx │  ← 前端根据 reportIssue 是否展示「Report Issue」按钮
└─────────────────┘
```

> 测试端到端时，典型检查路径：  
> **模型输出 → JSON 字段 → API 返回 → DB 字段 → 前端按钮/文案展示是否一致。**


# Intent 检测 — `need_report_issue` 回归测试用例

> **范围：** 覆盖 `server/prompts-v2/default/intent.prompt` 中所有 `need_report_issue` 真/假判定规则。
---

| 用例编号 | 场景/类型 | 用户问题（多轮用例含对话历史） | 预期 `need_report_issue` | 设计意图 |
|---------|----------|-------------------------------|:------------------------:|---------|
| TC-001 | 产品故障/报错 | `Every time I try to export a report to PDF in StyleBI, I get "Export failed: Internal server error (code 500)". This happens on every attempt.` | `true` | 验证包含明确错误码和失败描述的问题，能被识别为产品故障/报错，返回 `true`。 |
| TC-002 | 结果错误/不一致 | `The revenue total on my StyleBI dashboard shows $120,000, but running the same query in the worksheet returns $115,000. The numbers don't match between views.` | `true` | 验证描述系统两处输出结果不一致的问题，能被识别为结果异常，返回 `true`。 |
| TC-003 | UI/图表显示异常 + 数据不更新 | `My dashboard's sales chart has been showing the same figures since Monday — the data isn't refreshing at all — and the chart itself renders as a blank panel half the time.` | `true` | 验证同时包含图表显示缺陷与数据不更新症状的问题，能被识别为 UI/数据异常，返回 `true`。|
| TC-004 | 系统崩溃/卡顿 + 操作无法完成 | `StyleBI crashes every time I open a dashboard with more than five charts. On the rare occasions it stays open, the Save button is completely unresponsive and my changes are lost.` | `true` | 验证同时描述系统崩溃与因系统无响应导致操作失败的问题，能被识别为系统性异常，返回 `true`。 |
| TC-005 | 使用/配置/概念问题 | `What is the difference between a crosstab and a worksheet in StyleBI, and how do I configure row-level security for each?` | `false` | 验证同时包含概念理解与配置操作的信息类问题，不被识别为需上报的问题，返回 `false`。 |
| TC-006 | 功能建议/需求 | `It would be really useful if StyleBI supported real-time collaborative editing of dashboards. Is that on the roadmap?` | `false` | 验证无具体产品症状、仅表达功能期望的建议类问题，不被识别为需上报的问题，返回 `false`。 |
| TC-007 | 模糊抱怨（无具体症状） | `I feel like StyleBI is just not intuitive. The whole thing seems overly complicated and hard to navigate.` | `false` | 验证仅表达主观不满、无任何可复现产品症状的模糊抱怨，不被识别为需上报的问题，返回 `false`。 |
| TC-008 | 非 StyleBI 问题 | `My Tableau workbook stopped connecting to the database after upgrading to the latest Tableau Desktop version. How do I fix this?` | `false` | 验证与 StyleBI 无关的第三方产品问题，不被识别为需上报的问题，返回 `false`。 |
| TC-009 | 多轮对话（报错上下文 + 简短跟进） | **对话历史：** 用户：`"When I click any chart on my StyleBI dashboard, the drill-down throws 'Drill path not found'. I've tried three different charts and they all fail the same way."` → 助手：`"That sounds like a drill-down path resolution issue. Let me look into it."` **当前问题：** `"Still not working."` | `true` | 验证当对话历史中含有详细产品报错、当前消息仅为简短跟进时，模型能结合历史上下文推断并返回 `true`。 |

---

**共计：** 9 条用例

| 分类 | 覆盖规则 | 用例 |
|------|---------|------|
| `true` 判定（4 条） | 产品故障/报错；结果错误或不一致；UI/图表显示异常 + 数据不更新（合并）；系统崩溃/卡顿 + 操作无法完成（合并） | TC-001 – TC-004 |
| `false` 判定（4 条） | How-to 使用 + 概念/理论 + 配置/安装（合并）；功能建议；模糊抱怨；非 StyleBI 问题 | TC-005 – TC-008 |
| 多轮上下文（1 条） | 报错上下文 + 简短跟进 → `true`（false 侧多轮方向由单轮 false 用例充分覆盖） | TC-009 |


