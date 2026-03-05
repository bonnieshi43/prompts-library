# Script 标志识别 — 回归测试用例集

> 生成日期：2026-03-04
> 目标：验证 `querySubjectAreas.prompt` 对 `script` 标志的识别是否正确
> 覆盖范围：7 条正向触发规则 / False Positive 风险 / False Negative 风险 / 边界场景 / 关键词变体

---

## 用例分类说明

| 分类 | 说明 | 覆盖风险 |
|------|------|----------|
| A — Core Positive | 明确满足 7 条规则，断言 script=true | 规则完整性 |
| B — False Positive Guard | 表面含有规则关键词，但语义不涉及脚本，断言 script=false | RISK-01, RISK-02, RISK-11 |
| C — False Negative Guard | 无明显脚本关键词但任务只能靠脚本实现，断言 script=true | RISK-03 |
| D — Boundary / gui_required | 混合 GUI 和脚本意图，验证 gui_required 交互逻辑 | RISK-04 |
| E — Keyword Variants | runquery 大小写/变体 | RISK-08 |
| F — SubjectArea Context | 不同组件上下文中脚本查询的识别 | RISK-07 |
| G — Noise Baseline | 纯 GUI/概念类，绝对不应触发 script | 基线对照 |

---

## A — Core Positive（7 条规则正向验证）

### TC-A01
- **场景**：Rule 1 — 显式要求编写脚本
- **用户问题**：`Write a script to change the chart bar color based on the data value.`
- **预期 script**：`true`
- **设计意图**：明确包含 "write a script"，最典型触发场景。验证 Rule 1 的基础覆盖。

---

### TC-A02
- **场景**：Rule 1 — 编辑脚本 / 自定义表达式
- **用户问题**：`I need to create a custom expression to dynamically calculate profit margin based on conditional logic.`
- **预期 script**：`true`
- **设计意图**：包含 "create a custom expression"，验证 Rule 1 对 "expression" 变体的覆盖。

---

### TC-A03
- **场景**：Rule 2 — 明确提到编程语言 JavaScript
- **用户问题**：`How do I use JavaScript to dynamically change the chart title based on a selected filter?`
- **预期 script**：`true`
- **设计意图**：Rule 2 基础覆盖，验证 "JavaScript" 触发。

---

### TC-A04
- **场景**：Rule 3 — 复杂循环逻辑
- **用户问题**：`How can I iterate through all chart elements and apply different background colors depending on their value ranges?`
- **预期 script**：`true`
- **设计意图**：包含 "iterate"（循环语义），验证 Rule 3 对非关键词 "loop" 但含循环意图的查询是否识别。同时检测与 Rule 7 "function" 无关的路径。

---

### TC-A05
- **场景**：Rule 3 — 嵌套条件逻辑
- **用户问题**：`I need to implement a nested if-else structure: if region is East and sales > 5000 show green; if region is West and sales < 1000 show red; otherwise show yellow.`
- **预期 script**：`true`
- **设计意图**：多层嵌套条件，无法通过 UI Filter 实现，验证 Rule 3 与 RISK-11 的边界区分。

---

### TC-A06
- **场景**：Rule 4 — 定义自定义函数
- **用户问题**：`How do I define a custom aggregation function for weighted average that is not available as a built-in formula?`
- **预期 script**：`true`
- **设计意图**：Rule 4 基础覆盖，明确要求"定义不存在的函数"。注意区分 Rule 7（提到 function）。

---

### TC-A07
- **场景**：Rule 5 — Admin Console 脚本操作
- **用户问题**：`How do I run a deployment script in the admin console to apply bulk configuration changes?`
- **预期 script**：`true`
- **设计意图**：Admin console + 明确脚本操作，验证 Rule 5 在有 "script" 关键词时的识别。

---

### TC-A08
- **场景**：Rule 6 — runquery 使用
- **用户问题**：`How do I use runquery to get filtered results and bind them to a table component in the viewsheet?`
- **预期 script**：`true`
- **设计意图**：Rule 6 基础覆盖，包含 "runquery"。

---

### TC-A09
- **场景**：Rule 7 — "function" 出现在明确脚本上下文中
- **用户问题**：`How do I define a function for dynamic color binding on a chart component using viewsheet script?`
- **预期 script**：`true`
- **设计意图**：Rule 7 与 Rule 1 联合触发，验证 "function" 在明确脚本上下文中不被误判为 False Positive。

---

## B — False Positive Guard（防止误触发，预期 script=false）

### TC-B01
- **场景**：RISK-01 — "function" 出现在内置公式上下文
- **用户问题**：`What is the SUM function in the formula editor and how do I use it in a calculated field?`
- **预期 script**：`false`
- **设计意图**：Rule 7 风险点。"SUM function" 指内置公式，非脚本函数。验证 LLM 不因 "function" 误触发。

---

### TC-B02
- **场景**：RISK-01 — "function" 描述产品功能
- **用户问题**：`What functions does the filter panel support? Can it handle date range filtering?`
- **预期 script**：`false`
- **设计意图**：`functions` 指 UI 面板功能，纯 GUI 查询。验证 Rule 7 不被泛化触发。

---

### TC-B03
- **场景**：RISK-01 — "function" 指内置日期公式
- **用户问题**：`The DATEPART function is not returning the correct week number. How do I fix it?`
- **预期 script**：`false`
- **设计意图**：公式函数调试问题，无脚本编写需求。验证公式错误排查不被路由到 script 路径。

---

### TC-B04
- **场景**：RISK-01 — "function" 描述平台能力
- **用户问题**：`What is the function of the Data Binding panel in the chart editor?`
- **预期 script**：`false`
- **设计意图**："function" 作为名词含义"作用/功能"，完全非脚本语境。最典型的 RISK-01 误触发案例。

---

### TC-B05
- **场景**：RISK-02 — Admin Console 纯 GUI 操作
- **用户问题**：`How do I add a new user account in the admin console?`
- **预期 script**：`false`
- **设计意图**：Admin console 提到但操作是 UI 添加用户，无脚本需求。验证 Rule 5 不因 "admin console" 泛化触发。

---

### TC-B06
- **场景**：RISK-02 — Admin Console 配置操作
- **用户问题**：`Where can I configure the SMTP email settings in admin console?`
- **预期 script**：`false`
- **设计意图**：Admin console 邮件配置是纯 GUI 表单操作，无脚本。同 RISK-02 覆盖。

---

### TC-B07
- **场景**：RISK-11 — 多条件过滤，UI 可实现
- **用户问题**：`How do I filter my chart data to show only records where sales > 1000 AND region is 'East' AND month is 'January'?`
- **预期 script**：`false`
- **设计意图**：多条件但 UI Filter 面板可实现，不需要脚本。验证 Rule 3 对 "多条件" 的判断不过于激进。

---

### TC-B08
- **场景**：RISK-11 — Ranking 过滤，UI 可实现
- **用户问题**：`How do I show only the top 10 values in a bar chart and exclude null entries?`
- **预期 script**：`false`
- **设计意图**：Ranking + 排除 null，UI 排名过滤器可实现。验证 Rule 3 不被简单的"多条件"触发。

---

## C — False Negative Guard（隐式脚本需求，预期 script=true）

> 这组用例验证：无明显脚本关键词，但任务**只能通过脚本**实现。
> 若系统返回 `script=false`，属于 RISK-03 漏判，需关注。

### TC-C01
- **场景**：RISK-03 — 动态颜色绑定（隐式 viewsheet script）
- **用户问题**：`How do I dynamically change the background color of a text label based on the value of a data field?`
- **预期 script**：`true`
- **设计意图**：动态颜色绑定必须通过 viewsheet script 实现（`setBackground()` API），无 UI 入口。验证 LLM 能否从语义推断脚本需求，而非依赖关键词。

---

### TC-C02
- **场景**：RISK-03 — 条件可见性控制（隐式脚本）
- **用户问题**：`How do I make a button component visible only for users who have the admin role?`
- **预期 script**：`true`
- **设计意图**：按角色动态控制组件可见性需要 viewsheet script 中的 `setVisible()` 结合角色判断，无 UI 配置选项。

---

### TC-C03
- **场景**：RISK-03 — 交互触发事件（隐式脚本）
- **用户问题**：`How do I trigger a data refresh action when a user clicks on a specific chart bar?`
- **预期 script**：`true`
- **设计意图**：点击事件 → 执行动作需要 script onClick handler，虽无"script"关键词，但属于典型脚本场景。

---

### TC-C04
- **场景**：RISK-03 — 跨组件联动（隐式脚本）
- **用户问题**：`How do I automatically update a text component's content to show the currently selected value in a selection list?`
- **预期 script**：`true`
- **设计意图**：跨组件动态内容同步通常需要脚本，验证 LLM 是否能识别此类隐式需求。

---

## D — Boundary Cases（gui_required 与 script 交互边界）

### TC-D01
- **场景**：RISK-04 — "通过界面"配置但明确提到 script
- **用户问题**：`I want to configure conditional color changes through the visual interface using a script. Is that possible?`
- **预期 script**：`true`
- **预期 gui_required**：`true`（风险：isScriptModule 将返回 false）
- **设计意图**：验证 `gui_required=true` 与 `script=true` 同时出现时，`isScriptModule()` 的覆盖行为是否符合预期。此用例预计系统会返回 `script=false`，属于已知的边界问题。

---

### TC-D02
- **场景**：RISK-04 — Admin Console + 明确脚本 + GUI 强调
- **用户问题**：`In the admin console interface, how do I run a query script through the UI?`
- **预期 script**：`true`
- **预期 gui_required**：可能为 `true`（风险同 TC-D01）
- **设计意图**：admin console 是 GUI，query script 是脚本需求，两者同时出现，验证优先级。

---

### TC-D03
- **场景**：纯 GUI 强调，无任何脚本关键词
- **用户问题**：`I need to do everything through the interface only, no coding. How do I change the chart colors using the format panel?`
- **预期 script**：`false`
- **预期 gui_required**：`true`
- **设计意图**：明确 "no coding"、"through the interface"，验证 gui_required=true 且 script=false 的识别路径。

---

## E — Keyword Variant Tests（runquery 变体，RISK-08）

### TC-E01
- **场景**：runquery 大写变体
- **用户问题**：`How do I use RunQuery to retrieve filtered data and display it in a viewsheet component?`
- **预期 script**：`true`
- **设计意图**：Rule 6 对大写 `RunQuery` 的识别。LLM 通常不区分大小写，但应明确验证。

---

### TC-E02
- **场景**：runquery 空格变体
- **用户问题**：`How do I run query results and bind them to a table in the dashboard?`
- **预期 script**：`true`（存疑，可能为 false）
- **设计意图**：`run query`（两个词）是否触发 Rule 6。若 LLM 判断为 `false`，属于 RISK-08 漏判，需记录。

---

### TC-E03
- **场景**：runquery 语义近义（execute a query）
- **用户问题**：`How do I execute a query and use its results to populate a selection list?`
- **预期 script**：`false`（预计不触发，仅记录实际值）
- **设计意图**：验证 "execute a query" 是否被误判为 runquery 场景。若触发 script=true，属于 False Positive；若不触发，为预期行为。

---

## F — SubjectArea Context（不同组件上下文）

### TC-F01
- **场景**：Chart 上下文，明确脚本（基准，已知正确）
- **用户问题**：`Write a script to set the bar color to red when the sales value exceeds 10000 in a bar chart.`
- **预期 script**：`true`
- **设计意图**：Chart + script 标准场景，作为其他 subjectArea 对比的基准。预期路由到 `chartScriptQuestion` 模板。

---

### TC-F02
- **场景**：RISK-07 — Table 上下文，明确脚本
- **用户问题**：`Write a script to highlight table cells in red when the value is below zero.`
- **预期 script**：`true`
- **设计意图**：Table subjectArea + 明确 "script"，验证 script 识别正确。同时在 logs 中验证实际使用模板（预期为 tableScriptQuestion，但目前实际为 tableQuestion）。

---

### TC-F03
- **场景**：RISK-07 — Data Worksheet 上下文，表达式编写
- **用户问题**：`How do I write a custom expression for a calculated column in a Data Worksheet to convert currency using a formula with conditional logic?`
- **预期 script**：`true`
- **设计意图**：Worksheet + 表达式编写，验证 script 识别。注意：即使 script=true 识别正确，Worksheet 分支路由也会忽略 script 标志（RISK-07 记录点）。

---

### TC-F04
- **场景**：RISK-07 — Freehand Table 上下文，function 关键词
- **用户问题**：`How do I define a function to calculate running totals in a freehand table?`
- **预期 script**：`true`
- **设计意图**：Freehand table + "define a function"（Rule 4 + Rule 7），验证识别是否正确。同样受 RISK-07 影响（路由可能忽略 script）。

---

### TC-F05
- **场景**：Crosstab 上下文，明确脚本
- **用户问题**：`Write a script to dynamically change the header row background color in a crosstab based on the column group value.`
- **预期 script**：`true`
- **设计意图**：Crosstab + script 标准场景，预期路由到 `crosstabScriptQuestion`。

---

## G — Noise Baseline（绝对不应触发，基线对照）

### TC-G01
- **场景**：纯 UI 操作，无任何歧义词
- **用户问题**：`How do I change the chart type from a line chart to a bar chart?`
- **预期 script**：`false`
- **设计意图**：最基础的 UI 操作查询。若触发 script=true，说明 Prompt 存在根本性问题。

---

### TC-G02
- **场景**：概念性问题
- **用户问题**：`What is a crosstab and when should I use it instead of a regular table?`
- **预期 script**：`false`
- **设计意图**：概念/定义类问题，与脚本无关。

---

### TC-G03
- **场景**：UI 数据绑定操作
- **用户问题**：`How do I bind a date field to the X-axis of a chart in the data binding panel?`
- **预期 script**：`false`
- **设计意图**：数据绑定是 GUI 操作，含 "binding" 但不含脚本意图。

---

### TC-G04
- **场景**：Dashboard 添加组件（UI）
- **用户问题**：`How do I add a date range filter component to my dashboard?`
- **预期 script**：`false`
- **设计意图**：Dashboard 组件添加是纯 UI 操作。在 `isDashboard=true` 场景下作为基线，验证 `considerScript` 不影响 script 识别（仅影响检索）。

---

### TC-G05
- **场景**：格式设置（UI）
- **用户问题**：`How do I change the font size and color of the chart title in the format panel?`
- **预期 script**：`false`
- **设计意图**：Chart 格式面板操作，有 GUI 对应项。验证格式问题不被路由到 chartScriptQuestion。

---

## 覆盖率矩阵

| 规则 / 风险点 | 覆盖用例 |
|--------------|----------|
| Rule 1: 显式 script/code | TC-A01, TC-A02 |
| Rule 2: 编程语言 | TC-A03 |
| Rule 3: 复杂逻辑/循环 | TC-A04, TC-A05 |
| Rule 4: 自定义函数定义 | TC-A06 |
| Rule 5: Admin Console | TC-A07, TC-B05, TC-B06 |
| Rule 6: runquery | TC-A08, TC-E01, TC-E02, TC-E03 |
| Rule 7: function 关键词 | TC-A09, TC-B01, TC-B02, TC-B03, TC-B04 |
| RISK-01: function FP | TC-B01, TC-B02, TC-B03, TC-B04 |
| RISK-02: admin console FP | TC-B05, TC-B06 |
| RISK-03: 隐式脚本 FN | TC-C01, TC-C02, TC-C03, TC-C04 |
| RISK-04: gui_required 覆盖 | TC-D01, TC-D02, TC-D03 |
| RISK-07: subjectArea 路由 | TC-F02, TC-F03, TC-F04 |
| RISK-08: runquery 变体 | TC-E01, TC-E02, TC-E03 |
| RISK-11: 多条件 UI 可实现 FP | TC-B07, TC-B08 |
| 噪声基线 | TC-G01–TC-G05 |

**共计：29 个用例**

---

## 执行说明

1. 每个用例需在系统中实际运行，从 server logs 中提取 `subjectArea` 节点的 LLM 原始响应 YAML
2. 读取 YAML 中 `script` 和 `gui_required` 字段，与预期值对比
3. 额外记录：
   - 用于检索的 Prompt 模板名称（来自 logs `Question Prompt Template`）
   - 实际使用的 `answerRules` 文件（若可观察）
4. **多次运行**：Rule 5/RISK-04 相关用例（TC-A07, TC-D01, TC-D02）建议运行 5 次，记录稳定性
5. **C 类用例（RISK-03）**：若系统返回 `script=false`，记录为已知漏判，不阻塞发布，但需在 backlog 中记录改进项
