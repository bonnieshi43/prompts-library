## 第四阶段 - Case Review

作为一名资深的 AI 测试架构师，我将严格遵循以下结构，对 `script` 识别相关的测试用例进行 Review，并产出标准化 Markdown。

---

### 【Step 1：覆盖度检查】

**1. Prompt 规则覆盖度分析**

目标：验证 `script_testcases.md` 是否全面覆盖 `querySubjectAreas.prompt` 中定义的 7 条 Script 判定规则，以及附加风险点（RISK 系列）。

**2. 覆盖矩阵**

| 测试维度（Prompt 规则 / 风险） | 是否覆盖 | 对应 Case 编号 | 是否充分 | 说明 |
| --- | --- | --- | --- | --- |
| 规则 1：显式脚本 / 代码创建 | 是 | TC-A01, TC-A02 | 充分 | 覆盖 “write a script”、“create a custom expression” 等显式编写脚本 / 表达式的场景。 |
| 规则 2：编程语言提及 | 是 | TC-A03 | 充分 | 以 JavaScript 为代表的编程语言显式提及。 |
| 规则 3：复杂逻辑 / 循环 | 是 | TC-A04, TC-A05 | 充分 | 覆盖 iterate、nested if-else 等典型复杂逻辑。 |
| 规则 4：自定义函数定义 | 是 | TC-A06, TC-A09-Opt | 充分 | 覆盖 “自定义聚合函数” 与 “可复用逻辑块” 等函数定义类场景。 |
| 规则 5：Admin Console 操作 + 脚本 | 是 | TC-A07, TC-D02 | 充分 | 既有纯脚本型场景，也有 UI + script 混合意图。 |
| 规则 6：runquery 使用 | 是 | TC-A08, TC-E01, TC-E02-Opt, TC-E03 | 充分 | 覆盖大小写、API 用法、近义表达（execute a query）等。 |
| 规则 7：`function` 关键词 | 是 | TC-A09-Opt, TC-B01-Opt, TC-B02, TC-B03, TC-B04 | 非常充分 | 通过正负向组合，验证 `function` 在不同语义下的判定边界。 |
| RISK-01：`function` 误触发 | 是 | TC-B01-Opt, TC-B02, TC-B03, TC-B04, TC-H02 | 充分 | 覆盖英文与中文、多种“函数 / 功能”语义。 |
| RISK-02：Admin Console 纯 GUI | 是 | TC-B05, TC-B06, TC-H10 | 充分 | 确保 Admin Console 内非脚本操作不会误判为 `script=true`。 |
| RISK-03：隐式脚本需求 | 是 | TC-C01, TC-C02, TC-C03, TC-C04, TC-H01 | 充分 | 覆盖动态样式、条件可见性、事件触发、跨组件联动、状态保持等。 |
| RISK-04：`gui_required` 与 script 冲突 | 是 | TC-D01, TC-D02, TC-D03, TC-H04 | 充分 | 重点验证 GUI 强信号与脚本需求并存时的决策逻辑。 |
| RISK-06：检索无过滤导致答案类型错误 | 是 | TC-H05 | 部分充分 | 有专门的非脚本查询与脚本语义近似，但仍可进一步增加更贴近脚本文档语义的对照用例。 |
| RISK-07：特定模块脚本路由 | 是 | TC-F02, TC-F03, TC-F04, TC-H06 | 充分 | 覆盖 Table / Worksheet / Freehand Table 等不同 SubjectArea 的脚本路由问题。 |
| RISK-08：runquery 变体与边界 | 是 | TC-E01, TC-E02-Opt, TC-E03 | 充分 | 验证对 API 名字、相似短语的识别与区分能力。 |
| RISK-11：多条件 UI 误判为脚本 | 是 | TC-B07, TC-B08, TC-H03 | 充分 | 展现 UI 可实现的复杂过滤，与真正需要脚本的多条件逻辑做对比。 |
| RISK-12：多轮对话脚本标记漂移 | 是 | TC-H07 | 基本充分 | 多轮脚本对话中保持 `script=true`，但仍可扩展更多变体（如中途插入非脚本问题）。 |
| RISK-14：`combin && script` 场景 | 是 | TC-H09 | 覆盖 | 跨 SubjectArea（Chart + Table）且需要脚本的组合场景。 |

**结论**：测试集整体覆盖了 Prompt 中所有脚本判定规则及主要风险点，正向 / 负向用例搭配合理，覆盖度可评为 **优秀**。

---

### 【Step 2：逐条 Case 质量评估】

| Case ID | 合理性 (1-5) | 清晰度 (1-5) | 是否存在歧义 | 评语 |
| --- | --- | --- | --- | --- |
| TC-A01 | 5 | 5 | 无 | 典型显式脚本需求，用语直接。 |
| TC-A02 | 5 | 5 | 无 | “custom expression” 与复杂逻辑描述清晰。 |
| TC-A03 | 5 | 5 | 无 | 明确点出 JavaScript，触发规则简单可靠。 |
| TC-A04 | 5 | 5 | 无 | “iterate through all chart elements” 精准体现循环逻辑。 |
| TC-A05 | 5 | 5 | 无 | 多条件嵌套，清晰体现 UI 无法覆盖的复杂度。 |
| TC-A06 | 5 | 5 | 无 | “not available as a built-in formula” 很好地消除了与内置函数的歧义。 |
| TC-A07 | 5 | 5 | 无 | Admin Console 场景下的脚本部署需求非常典型。 |
| TC-A08 | 5 | 5 | 无 | 直接点名 runquery，结构清晰。 |
| TC-A09-Opt | 5 | 5 | 无 | 去掉强关键词后，焦点落在“可复用逻辑”，利于测试规则泛化。 |
| TC-B01-Opt | 5 | 5 | 无 | 明确为“内置函数调试”，是高质量负向用例。 |
| TC-B02 | 5 | 5 | 无 | “functions” 明确指“功能”，无脚本意图。 |
| TC-B03 | 5 | 5 | 无 | 典型的函数调试问题。 |
| TC-B04 | 5 | 5 | 无 | “function of” 语义为“作用”，非常适合作为反例。 |
| TC-B05 | 5 | 5 | 无 | 纯 GUI 操作，定位清晰。 |
| TC-B06 | 5 | 5 | 无 | 同上，SMTP 配置属于系统设置场景。 |
| TC-B07 | 5 | 5 | 无 | 多条件过滤但仍可通过 UI 配置，是好的边界用例。 |
| TC-B08 | 5 | 5 | 无 | TopN + 排除 null，操作路径清晰。 |
| TC-C01 | 5 | 5 | 无 | 隐式脚本需求的典型例子。 |
| TC-C02 | 5 | 5 | 无 | 角色控制可见性，意图明确。 |
| TC-C03 | 5 | 5 | 无 | 事件触发 + 动作，是脚本高频场景。 |
| TC-C04 | 5 | 5 | 无 | 跨组件同步需求突出。 |
| TC-D01 | 5 | 4 | 略有歧义 | 故意构造 UI + script 冲突，有助于测试冲突解析逻辑。 |
| TC-D02 | 5 | 5 | 无 | Admin Console 场景下的混合意图用例。 |
| TC-D03 | 5 | 5 | 无 | “no coding” 为强否定脚本信号。 |
| TC-E01 | 5 | 5 | 无 | runquery 大小写变体测试。 |
| TC-E02-Opt | 5 | 5 | 无 | 明确 “runquery API”，信号强，目标清晰。 |
| TC-E03 | 5 | 5 | 无 | “execute a query” 的边界测试合理。 |
| TC-F01 | 5 | 5 | 无 | Chart + script 的基线用例。 |
| TC-F02 | 5 | 5 | 无 | Table 上下文中的脚本需求，表达直接。 |
| TC-F03 | 5 | 5 | 无 | Worksheet + 表达式 + 条件逻辑，合理。 |
| TC-F04 | 5 | 5 | 无 | Freehand Table + 函数定义，很好覆盖 RISK-07。 |
| TC-F05 | 5 | 5 | 无 | Crosstab + 动态脚本，符合真实场景。 |
| TC-G01~G05 | 5 | 5 | 无 | 作为噪声 / 纯 UI / 概念类基线非常合适。 |
| TC-H01 | 5 | 5 | 无 | 状态持久化的隐式脚本需求，描述清楚。 |
| TC-H02 | 5 | 5 | 无 | 中文“函数”场景负向用例设计精到。 |
| TC-H03 | 5 | 5 | 无 | 与平均值比较的复杂过滤，适合锚定 UI 能力上限。 |
| TC-H04 | 5 | 5 | 无 | 显式强调 “point-and-click interface”，有效突出 GUI 信号。 |
| TC-H05 | 5 | 5 | 无 | 标准非脚本问题，用于检验检索与召回的稳定性。 |
| TC-H06 | 5 | 5 | 无 | 精确指定上下文（Freehand Table），便于验证路由问题。 |
| TC-H07 | 5 | 5 | 无 | 多轮脚本上下文中第二问极短，但不引入其他触发词，利于测试对历史上下文的依赖。 |
| TC-H08 | 5 | 5 | 无 | 递归逻辑需求表达完整。 |
| TC-H09 | 5 | 5 | 无 | Chart + Table 组合交互，是良好的 combin+script 场景。 |
| TC-H10 | 5 | 5 | 无 | Admin Console 纯 UI 自定义，用于验证 RISK-02 修复效果。 |

---

### 【Step 3：Trigger Isolation Check】

| Case ID | 是否存在变量污染 | 污染来源 / 说明 | 修正建议 |
| --- | --- | --- | --- |
| TC-A09-Opt | 否 | 已去除 “script / function” 等多重强信号，仅保留“可复用逻辑”概念。 | 无需调整。 |
| TC-C01 ~ TC-C04 | 否 | 设计目标就是在无强关键词下测试隐式脚本需求。 | 无需调整。 |
| TC-D01 | 是（有意为之） | “visual interface” 与 “using a script” 同时出现，用于测试冲突逻辑。 | 忽略污染，保留作为冲突场景用例。 |
| TC-D02 | 是（有意为之） | Admin Console UI + 脚本并存，用于测试信号优先级。 | 保留。 |
| TC-E02-Opt | 否 | 现在以 “runquery API” 为唯一强信号，足够纯粹。 | 无需调整。 |
| TC-F01 ~ TC-F05 | 否 | 核心在于 SubjectArea 与 script 路由，强关键词存在是合理的。 | 无需调整。 |
| TC-H07 | 否 | 多轮脚本上下文中第二问极短，但不引入其他触发词，利于测试对历史上下文的依赖。 | 可追加更多变体作为增强。 |

**结论**：整体上 Trigger Isolation 设计较好，大部分用例信号集中、目标单一；少数“污染”是为测试冲突和优先级而刻意保留的，可接受。

---

### 【Step 4：识别遗漏测试点】

1. **复杂逻辑的更多形态**
   - 遗漏点：如递归 + 状态机组合、跨多个组件的多步业务流程等。
   - 重要性：可进一步检验模型对“复杂逻辑”的泛化识别能力，而不仅局限于 if-else / 简单双循环。

2. **多语言场景下的弱脚本信号**
   - 遗漏点：除中文外的其他语言（如日语、韩语）中“函数 / 功能”类词汇。
   - 重要性：在多语言环境下，`function` 类词汇的歧义会进一步放大 RISK-01。

3. **混合意图的细粒度裁决**
   - 遗漏点：更多现实表达，例如“我想尽量通过界面完成，只有做不到的部分再用脚本”。
   - 重要性：有助于验证在复杂自然语言指令中，系统如何平衡 `gui_required` 与 script 的判定。

4. **检索 / 排序对答案类型的干扰**
   - 遗漏点：脚本 / 非脚本问题在语义空间中高度相似的 pair，系统是否会因为相似度而返回错误答案类型。
   - 重要性：从“能否判对 script 标志”扩展到“能否在召回与排序阶段保持答案类型的一致性”。

---

### 【Step 5：优化建议（示例）】

| 原始 Case ID | 问题类型 | 优化版本（摘要） | 优化理由 |
| --- | --- | --- | --- |
| TC-A09（原版） | 变量污染 | 使用当前的 TC-A09-Opt 版本：去掉 “script / function” 关键词。 | 避免强信号掩盖隐式逻辑需求，便于测试规则边界。 |
| TC-B01（原版） | 语义略模糊 | 使用当前的 TC-B01-Opt：强调 “内置函数参数错误”。 | 明确这是“函数使用问题”，而非“脚本编写问题”。 |
| TC-E02（原版） | 信号过弱 | 使用 TC-E02-Opt：引入 “runquery API” 与 “programmatically fetch data”。 | 增强对 runquery API 的直接指向性。 |

---

### 【Step 6：新增高质量 Case（摘要表）**

| 新 Case ID | 风险类型 | 用户问题（摘要） | 预期 `script` | 预期回答类型 | 验证重点 |
| --- | --- | --- | --- | --- | --- |
| TC-H01 | RISK-03 | 状态保持 / 记住上次筛选值 | true | 脚本代码 | 隐式状态持久化需求识别。 |
| TC-H02 | RISK-01 / 多语言 | 中文中 “VLOOKUP 函数结果不对” | false | 内置函数调试步骤 | 中文场景下避免误判 `script=true`。 |
| TC-H03 | RISK-11 | 只显示“销售额超过平均值”的类别 | false | UI 操作 | 复杂但 UI 可实现的过滤不应判为脚本。 |
| TC-H04 | 混合意图优先级 | 希望“使用点选界面设置条件变色规则” | false | UI 操作 | `gui_required` 信号优先级测试。 |
| TC-H05 | RISK-06 | 修改图表颜色的标准非脚本问题 | false | UI 操作 | 验证检索与答案类型不被脚本文档干扰。 |
| TC-H06 | RISK-07 | Freehand Table 中根据值变色脚本 | true | 脚本代码 | 特定模块脚本路由正确性。 |
| TC-H07 | RISK-12 | 多轮脚本对话中追加需求 | true | 脚本追加建议 | 多轮上下文中 script 标志的保持。 |
| TC-H08 | 规则 3 - 递归 | 遍历组织结构树并标记层级 | true | 递归脚本 | 更复杂的逻辑结构识别。 |
| TC-H09 | RISK-14 | Chart + Table 联动脚本 | true | 脚本代码 | `combin && script` 场景下的路由和答案类型。 |
| TC-H10 | RISK-02 | 修改 Admin Console 登录页 logo | false | UI 配置步骤 | Admin Console 纯 UI 场景回归测试。 |

---

### 【Step 7：最终输出建议】

| Case ID      | 用户问题                                                                                                                                                 | 预期 `script` | 风险/规则            | 设计意图 / 验证重点                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------------- | ----------------------------------------------------------------- |
| TC-A01       | Write a script to change the chart bar color based on the data value.                                                                                   | true          | 规则 1               | 显式要求编写脚本。                                               |
| TC-A02       | I need to create a custom expression to dynamically calculate profit margin based on conditional logic.                                                 | true          | 规则 1               | 显式要求创建表达式。                                             |
| TC-A03       | How do I use JavaScript to dynamically change the chart title based on a selected filter?                                                               | true          | 规则 2               | 明确提到编程语言 JavaScript。                                   |
| TC-A04       | How can I iterate through all chart elements and apply different background colors depending on their value ranges?                                     | true          | 规则 3               | 包含 “iterate” 循环语义的复杂逻辑。                             |
| TC-A05       | I need to implement a nested if-else structure: if region is East and sales > 5000 show green; if region is West and sales < 1000 show red; otherwise show yellow. | true          | 规则 3               | 多层嵌套条件，无法通过 UI Filter 实现。                         |
| TC-A06       | How do I define a custom aggregation function for weighted average that is not available as a built-in formula?                                        | true          | 规则 4               | 明确要求定义不存在的内置函数。                                 |
| TC-A07       | How do I run a deployment script in the admin console to apply bulk configuration changes?                                                             | true          | 规则 5               | Admin console + 明确脚本操作。                                  |
| TC-A08       | How do I use runquery to get filtered results and bind them to a table component in the viewsheet?                                                     | true          | 规则 6               | 包含 `runquery`。                                                |
| TC-A09-Opt   | How can I create a reusable piece of logic for dynamic color binding on a chart component?                                                             | true          | 规则 4 / 7（优化版） | 移除强关键词后，测试对“函数定义 / 可复用逻辑”概念的识别。       |
| TC-B01-Opt   | I'm using the SUM function in the formula editor, but it's giving an error. What are the correct parameters for this built-in function?               | false         | RISK-01（优化版）    | 典型内置函数调试场景，避免误判为脚本需求。                     |
| TC-B02       | What functions does the filter panel support? Can it handle date range filtering?                                                                      | false         | RISK-01              | `functions` 指 UI 面板功能，为纯 GUI 查询。                     |
| TC-B03       | The DATEPART function is not returning the correct week number. How do I fix it?                                                                       | false         | RISK-01              | 公式函数调试问题，无脚本编写需求。                             |
| TC-B04       | What is the function of the Data Binding panel in the chart editor?                                                                                    | false         | RISK-01              | “function” 作为“作用 / 功能”，非脚本语义。                     |
| TC-B05       | How do I add a new user account in the admin console?                                                                                                  | false         | RISK-02              | Admin console 纯 GUI 操作。                                     |
| TC-B06       | Where can I configure the SMTP email settings in admin console?                                                                                        | false         | RISK-02              | Admin console 纯 GUI 配置。                                     |
| TC-B07       | How do I filter my chart data to show only records where sales > 1000 AND region is 'East' AND month is 'January'?                                    | false         | RISK-11              | 多条件但 UI Filter 面板可实现。                                |
| TC-B08       | How do I show only the top 10 values in a bar chart and exclude null entries?                                                                         | false         | RISK-11              | Ranking + 排除 null，UI 可实现。                               |
| TC-C01       | How do I dynamically change the background color of a text label based on the value of a data field?                                                  | true          | RISK-03              | 动态颜色绑定必须通过脚本实现。                                 |
| TC-C02       | How do I make a button component visible only for users who have the admin role?                                                                      | true          | RISK-03              | 按角色动态控制可见性需要脚本。                                 |
| TC-C03       | How do I trigger a data refresh action when a user clicks on a specific chart bar?                                                                    | true          | RISK-03              | 点击事件触发动作需要脚本。                                     |
| TC-C04       | How do I automatically update a text component's content to show the currently selected value in a selection list?                                   | true          | RISK-03              | 跨组件动态内容同步通常需要脚本。                               |
| TC-D01       | I want to configure conditional color changes through the visual interface using a script. Is that possible?                                         | true          | RISK-04              | 混合 UI + 脚本意图，验证 `gui_required` 不影响 `script`。      |
| TC-D02       | In the admin console interface, how do I run a query script through the UI?                                                                           | true          | RISK-04              | Admin console 场景的混合意图。                                 |
| TC-D03       | I need to do everything through the interface only, no coding. How do I change the chart colors using the format panel?                              | false         | RISK-04              | 明确 “no coding”，验证 `gui_required=true`。                   |
| TC-E01       | How do I use RunQuery to retrieve filtered data and display it in a viewsheet component?                                                              | true          | RISK-08              | `runquery` 大写变体。                                           |
| TC-E02-Opt   | I need to programmatically fetch data using the runquery API and then bind the results to a selection list.                                           | true          | RISK-08（优化版）    | 明确使用 API，变为强信号。                                     |
| TC-E03       | How do I execute a query and use its results to populate a selection list?                                                                            | false         | RISK-08              | 验证 “execute a query” 是否被误判。                            |
| TC-F01       | Write a script to set the bar color to red when the sales value exceeds 10000 in a bar chart.                                                        | true          | 基线                 | Chart + script 标准场景，用于对比基准。                        |
| TC-F02       | Write a script to highlight table cells in red when the value is below zero.                                                                         | true          | RISK-07              | Table 上下文 + 明确脚本，验证识别。                            |
| TC-F03       | How do I write a custom expression for a calculated column in a Data Worksheet to convert currency using a formula with conditional logic?           | true          | RISK-07              | Worksheet 上下文 + 表达式编写，验证识别。                      |
| TC-F04       | How do I define a function to calculate running totals in a freehand table?                                                                          | true          | RISK-07              | Freehand table 上下文 + 函数定义，验证识别。                   |
| TC-F05       | Write a script to dynamically change the header row background color in a crosstab based on the column group value.                                 | true          | 基线                 | Crosstab + script 标准场景。                                   |
| TC-G01       | How do I change the chart type from a line chart to a bar chart?                                                                                     | false         | 噪声基线             | 纯 UI 操作。                                                    |
| TC-G02       | What is a crosstab and when should I use it instead of a regular table?                                                                              | false         | 噪声基线             | 概念 / 定义类问题。                                            |
| TC-G03       | How do I bind a date field to the X-axis of a chart in the data binding panel?                                                                       | false         | 噪声基线             | UI 数据绑定操作。                                              |
| TC-G04       | How do I add a date range filter component to my dashboard?                                                                                          | false         | 噪声基线             | Dashboard 添加组件。                                           |
| TC-G05       | How do I change the font size and color of the chart title in the format panel?                                                                      | false         | 噪声基线             | 格式设置操作。                                                 |
| TC-H01       | I want to save the user's last selected filter value so it's still there when they come back to the dashboard next time.                            | true          | RISK-03              | 状态保持 / 持久化的隐式脚本需求。                             |
| TC-H02       | 我在公式编辑器里用了 VLOOKUP 函数，但是结果不对，能帮我看看吗？                                                                                    | false         | RISK-01 / 多语言     | 中文语境下，“函数” 指代内置公式的负向用例。                  |
| TC-H03       | 只显示销售额超过平均值的产品类别。                                                                                                                   | false         | RISK-11              | 与平均值比较的复杂过滤，UI 可实现。                           |
| TC-H04       | I'd like to use the point-and-click interface to set up a rule that changes the chart color when a condition is met.                                | false         | 混合意图优先级       | 测试 `gui_required` 信号是否强于隐式脚本需求。                |
| TC-H05       | How can I change the bar color in my chart?                                                                                                          | false         | RISK-06              | 标准非脚本查询，用于观察脚本文档是否被错误引入。             |
| TC-H06       | (Context: Freehand Table) Write a script to change the font color of a cell to red if its value is negative.                                        | true          | RISK-07              | 在特定模块下验证路由缺陷对答案质量的影响。                   |
| TC-H07       | 轮 1: Write a script to highlight rows in a table. 轮 2: Can I also make the font bold for those rows?                                              | true          | RISK-12              | 验证多轮对话中 `script` 标志的稳定性。                        |
| TC-H08       | I need to traverse all the child nodes in my organizational chart component and assign a level number to each node based on its depth.             | true          | 规则 3 - 递归        | 验证对“递归”这种复杂逻辑的识别能力。                         |
| TC-H09       | I have a chart and a table. I want to write a script that, when I click on a bar in the chart, it highlights the corresponding row in the table.    | true          | RISK-14              | 多 SubjectArea 脚本查询，验证 `scriptAnswerRules` 加载。     |
| TC-H10       | How do I change the system logo displayed in the admin console's login page?                                                                        | false         | RISK-02              | Admin Console 内的纯 UI 配置操作，用于回归测试。             |

