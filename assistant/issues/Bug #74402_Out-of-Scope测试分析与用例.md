# out_of_scope 边界测试用例

> 文件路径：`chat-app/server/prompts-v2/default/intent.prompt`
> 测试目标：覆盖 `out_of_scope=true` 与 `out_of_scope=false` 两类边界场景，确保模型不会误判

---

## 一、Prompt 中 out_of_scope 相关逻辑梳理

### 判定为 true 的触发条件
> 核心判断句："Is the user asking me to do something a general AI assistant does, not a StyleBI assistant?"

| 类别 | 示例 |
|------|------|
| 翻译 | "translate X to Spanish"、"say this in French" |
| 数学计算 | "what is 234 + 26 / (3 * 7)"、"calculate X" |
| 通用知识 | "what is the meaning of life"、"who won the world cup" |
| 创意写作 | "write me a poem"、"tell me a story" |
| 个人建议 | "what should I eat today"、"help me write a cover letter" |

### 判定为 false 的条件
- StyleBI 功能、图表、仪表板、视图表、报告、数据源相关
- StyleBI 配置、脚本、绑定、过滤器、格式化
- StyleBI 错误、Bug、异常行为、性能问题
- 如何在 StyleBI 中完成某项操作

### 联动规则
- `out_of_scope=true` 时：`need_report_issue=false`，`help_message=""`，输出 `out_of_scope_message`（语言随用户问题）
- `out_of_scope=false` 时：才评估 `need_report_issue`

---

## 二、测试用例

### A. out_of_scope = true

#### 分类说明
这些用例的共同特征：**表面上可能与 BI/数据/StyleBI 有所关联，但实质上是通用 AI 任务**，容易被误判为 false。

---

#### 类别 I：纯通用任务，零 StyleBI 关联（基准用例）

这些是最典型的 true 场景，作为基准验证模型基础判断能力。

| # | chat_history | question | 预期 out_of_scope | 说明 |
|---|---|---|---|---|
| I-1 | （无） | Translate "Good morning" to Japanese | **true** | 纯文本翻译，无任何 StyleBI 关联 |
| I-2 | （无） | What is 234 + 26 / (3 * 7)? | **true** | 纯数学计算，与 prompt 中示例完全一致 |
| I-3 | （无） | Write me a poem about data | **true** | 创意写作，"data" 是通用词汇，不锚定 StyleBI |
| I-4 | （无） | What should I eat for breakfast today? | **true** | 个人建议，无任何业务关联 |
| I-5 | （无） | Who won the FIFA World Cup in 2022? | **true** | 通用常识，与 BI/StyleBI 无关 |
| I-6 | （无） | Explain quantum physics to me | **true** | 通用知识，与 prompt 中示例一致 |
| I-7 | （无） | Tell me a joke | **true** | 创意娱乐请求 |
| I-8 | （无） | Help me write a cover letter for a software engineer position | **true** | 个人写作任务 |

---

#### 类别 J：StyleBI 作为背景提及，但核心请求是通用任务

这是最容易误判的类别：问题中出现了 StyleBI，但用户真正要求的是与 StyleBI 无关的通用操作。

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| J-1 | （无） | I use StyleBI at work. Can you translate this email to French for me? | **true** | "I use StyleBI" 只是用户背景说明，真实请求是翻译邮件 |
| J-2 | （无） | I'm a StyleBI user. What is the capital of Australia? | **true** | StyleBI 身份标签与问题内容完全无关 |
| J-3 | （无） | Can you calculate the compound interest on $10,000 at 5% annual rate for 10 years? I need it for a report I'm building. | **true** | "for a report" 是借口，请求本质是纯金融数学计算，StyleBI 未被提及 |
| J-4 | （无） | While helping me with StyleBI, can you also write a short story about a data analyst? | **true** | 创意写作请求，StyleBI 部分只是引子 |
| J-5 | （无） | I work in data analytics using StyleBI. What programming language should I learn next? | **true** | 职业建议/通用编程选型，与 StyleBI 功能无关 |
| J-6 | （无） | I use StyleBI for dashboards. Can you proofread this email I'm sending to my manager? | **true** | 文本校对，通用写作辅助任务 |
| J-7 | （无） | My company uses StyleBI. Explain what blockchain technology is. | **true** | 通用技术知识，StyleBI 仅作公司背景 |
| J-8 | （无） | I need to present my StyleBI report tomorrow. Can you write a speech introduction for me? | **true** | 演讲稿撰写是创意写作/个人写作任务，不是 StyleBI 使用问题 |

---

#### 类别 K：通用技术/编程任务，未指定与 StyleBI 集成

这类问题涉及技术或编程，表面看与数据分析相关，但没有 StyleBI 的使用语境。

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| K-1 | （无） | Write a Python script to merge two CSV files | **true** | 通用 Python 编程任务，无 StyleBI 连接点 |
| K-2 | （无） | How do I center a div in CSS? | **true** | 通用前端问题，与 StyleBI 无关 |
| K-3 | （无） | Write a SQL query to find the top 10 customers by total revenue | **true** | 通用 SQL 任务，未指定在 StyleBI 中使用 |
| K-4 | （无） | Explain what a REST API is | **true** | 通用技术知识，虽然 StyleBI 有 API，但问题未提及 StyleBI |
| K-5 | （无） | How do I sort a list in Python? | **true** | 通用编程，与 StyleBI 无关 |
| K-6 | （无） | Write a regex to extract email addresses from text | **true** | 通用编程工具请求 |
| K-7 | （无） | What is the difference between supervised and unsupervised machine learning? | **true** | 通用 ML 知识，与 StyleBI 无关 |

---

#### 类别 L：提及竞品或其他 BI 工具，但未涉及 StyleBI

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| L-1 | （无） | How do I create a calculated field in Tableau? | **true** | Tableau 操作问题，与 StyleBI 无关；虽然功能名类似，对象不同 |
| L-2 | （无） | What is Power BI and how does it work? | **true** | 竞品介绍，未涉及 StyleBI |
| L-3 | （无） | Write a DAX formula to calculate year-over-year growth in Power BI | **true** | DAX 是 Power BI 专属语言，不是 StyleBI |
| L-4 | （无） | How do I embed a Tableau dashboard in my website? | **true** | 竞品集成问题，与 StyleBI 无关 |
| L-5 | （无） | Explain the difference between Power BI and Tableau | **true** | 竞品对比，StyleBI 未被提及 |

---

#### 类别 M：BI 行业通用知识，不涉及 StyleBI 具体功能

这类问题看似与数据分析工作相关，但属于行业通识，不是 StyleBI 产品问题。

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| M-1 | （无） | Who invented the pie chart? | **true** | 历史知识，BI 相关但与 StyleBI 无关 |
| M-2 | （无） | What is the best book to learn data visualization? | **true** | 书单推荐，通用学习建议 |
| M-3 | （无） | Explain what ETL stands for | **true** | 行业术语解释，脱离任何工具语境；若结合 StyleBI 配置则为 false |
| M-4 | （无） | What are the best practices for dashboard design in general? | **true** | 通用设计原则，非 StyleBI 特有；若问"在 StyleBI 中"则为 false |
| M-5 | （无） | What data visualization library should I use for my React app? | **true** | 通用前端技术选型，与 StyleBI 无关 |

---

#### 类别 N：对话历史是 StyleBI 语境，但当前问题已明确跳出主题

即使有 StyleBI 历史，当前问题明确转向通用任务，仍应为 true。

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| N-1 | "How do I add a filter to my StyleBI dashboard?" | By the way, can you translate "revenue" to Chinese? | **true** | 历史是 StyleBI，但当前请求明确是文本翻译（非 StyleBI 本地化） |
| N-2 | "I'm working on a StyleBI report." | Can you help me write a LinkedIn post about my data work? | **true** | 历史有 StyleBI，但请求是社交媒体写作 |
| N-3 | "How do I configure StyleBI permissions?" | Now, what is 500 divided by 7? | **true** | 历史有 StyleBI，但当前是孤立的数学计算 |
| N-4 | "My StyleBI chart is not rendering correctly." | Also, what's a good recipe for pasta? | **true** | 极端跳题，历史无法为当前请求提供 StyleBI 关联 |

---

### B. out_of_scope = false

#### 分类说明
这些用例的共同特征：**表面上触发了 out_of_scope=true 的关键词或语义，但实质上是 StyleBI 相关问题**，容易被误判。

---

#### 类别 A：含 "translate / 翻译" 关键词，但指 StyleBI 本地化功能

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| A-1 | （无） | How do I translate the labels in my StyleBI dashboard to French? | **false** | "translate" 触发翻译规则，但这是 StyleBI 本地化配置问题 |
| A-2 | （无） | Can StyleBI display column headers in multiple languages? | **false** | 多语言展示是 StyleBI 功能特性 |
| A-3 | （无） | How to localize error messages shown in my viewsheet? | **false** | 本地化/翻译语境，但目标是 viewsheet（StyleBI 核心概念） |
| A-4 | （无） | I need to translate the tooltip text in my chart—how do I do that in StyleBI? | **false** | 句子以 "translate" 开头，但限定在 StyleBI 图表 tooltip 配置 |

---

#### 类别 B：含 "calculate / formula / 计算" 关键词，但指 StyleBI 公式或绑定

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| B-1 | （无） | How do I calculate the year-over-year growth rate in a StyleBI viewsheet? | **false** | "calculate" 触发数学规则，但是 StyleBI 公式场景 |
| B-2 | （无） | What formula should I use to compute a running total in StyleBI? | **false** | "compute" / "formula" 看似数学，但是 StyleBI 表达式问题 |
| B-3 | （无） | How to write a calculated field in StyleBI that divides revenue by units sold? | **false** | 含具体除法计算，但场景是 StyleBI calculated field 配置 |
| B-4 | （无） | In StyleBI, how do I use the SUM function across a grouped dimension? | **false** | 聚合函数像数学题，但是 StyleBI 数据绑定问题 |
| B-5 | （无） | Can I write an IF-ELSE expression in StyleBI to flag negative values? | **false** | 条件逻辑似通用编程，但目标是 StyleBI 表达式 |

---

#### 类别 C：含 "write / 写" 关键词，但指 StyleBI 脚本或配置

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| C-1 | （无） | Can you help me write a viewsheet script to filter data by date range? | **false** | "write a script" 像创意写作/通用编程，但 viewsheet script 是 StyleBI 核心功能 |
| C-2 | （无） | Write a StyleBI onInit script that loads default parameter values | **false** | 命令式 "Write"，但目标是 StyleBI onInit 生命周期脚本 |
| C-3 | （无） | How do I write a query condition in StyleBI to exclude null records? | **false** | "write a query" 像通用 SQL 任务，但场景是 StyleBI 查询条件配置 |
| C-4 | （无） | Help me write a custom tooltip script for my StyleBI chart | **false** | "write a script" 触发风险，但 custom tooltip 是 StyleBI 功能 |

---

#### 类别 D：通用 BI/数据概念提问，但在 StyleBI 使用语境下

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| D-1 | （无） | What is a KPI and how do I display one in StyleBI? | **false** | "What is a KPI" 似通用知识，但后半句是 StyleBI 使用问题 |
| D-2 | （无） | What is a crosstab, and can StyleBI generate one? | **false** | 概念解释+StyleBI 能力询问，不应因前半句触发 out_of_scope |
| D-3 | （无） | Explain what a drill-down chart is in StyleBI | **false** | "Explain" 像通用解释，但 drill-down 在 StyleBI 上下文中是具体功能 |
| D-4 | （无） | What does binding a field to a chart axis mean in StyleBI? | **false** | "what does X mean" 看似通用知识，但是 StyleBI 绑定机制解释 |
| D-5 | （无） | What is the difference between a viewsheet and a report in StyleBI? | **false** | 概念对比问题，但两者均为 StyleBI 内部概念 |

---

#### 类别 E：对话历史中已明确 StyleBI 语境，当前问题措辞模糊

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| E-1 | "I'm building a sales dashboard in StyleBI. How do I add a date filter?" | How do I add a title to it? | **false** | 独立看 "How do I add a title" 极模糊，但历史语境明确是 StyleBI |
| E-2 | "The bar chart in my StyleBI report is not showing data." | Can you explain why that happens? | **false** | "explain why" 看似通用，但历史语境已锚定 StyleBI 异常排查 |
| E-3 | "I'm using StyleBI." | What charts are available? | **false** | 问题极简，但历史确立 StyleBI 上下文 |
| E-4 | "How do I set up a StyleBI data source?" | What databases does it support? | **false** | "What databases does it support" 脱离语境看泛化，但指 StyleBI 数据源 |
| E-5 | "My StyleBI viewsheet script isn't working." | How do I debug it? | **false** | "How do I debug" 通用编程句式，但语境是 StyleBI 脚本调试 |

---

#### 类别 F：非英语提问，内容为 StyleBI 相关

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| F-1 | （无） | 如何在 StyleBI 中设置图表的 X 轴标签格式？ | **false** | 中文问题，内容是 StyleBI 图表配置，语言不应影响判断 |
| F-2 | （无） | StyleBI 中怎么写过滤条件？ | **false** | 中文"怎么写"看似创意写作触发词，但指 StyleBI 过滤器配置 |
| F-3 | （无） | StyleBI 报表中能不能用计算字段做同比？ | **false** | "计算字段"+"同比"，语境清晰是 StyleBI 分析功能 |
| F-4 | （无） | ¿Cómo configuro un filtro en StyleBI? | **false** | 西班牙语提问，是 StyleBI 过滤器配置，不应触发 out_of_scope |

---

#### 类别 G：涉及第三方工具，但实质是 StyleBI 集成/对比问题

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| G-1 | （无） | How does StyleBI compare to Tableau in terms of chart types? | **false** | 涉及竞品 Tableau，但问题核心是 StyleBI 能力对比 |
| G-2 | （无） | Can I import an Excel file as a data source in StyleBI? | **false** | 涉及 Excel，但是 StyleBI 数据接入功能 |
| G-3 | （无） | My Excel data is not loading into StyleBI—what could be wrong? | **false** | 涉及 Excel，但 malfunction 归因于 StyleBI 数据导入，应为 false（且可能 need_report_issue=true） |
| G-4 | （无） | How do I connect StyleBI to a SQL Server database? | **false** | 涉及 SQL Server（第三方），但问题是 StyleBI 数据源配置 |

---

#### 类别 H：措辞像"个人建议"，但实质是 StyleBI 设计决策

| # | chat_history | question | 预期 out_of_scope | 风险点 |
|---|---|---|---|---|
| H-1 | （无） | What chart type should I use for showing sales trends in StyleBI? | **false** | "what should I use" 像个人建议，但是 StyleBI 图表选型问题 |
| H-2 | （无） | Should I use a bar chart or a line chart for monthly revenue in my StyleBI dashboard? | **false** | 同上，决策建议但限定在 StyleBI 可视化设计 |
| H-3 | （无） | What's the best way to organize data on a StyleBI viewsheet? | **false** | "best way" 语义主观，但是 StyleBI 布局/设计指导 |
| H-4 | （无） | How should I set up permissions for my StyleBI reports? | **false** | "how should I" 建议语气，但是 StyleBI 权限配置 |

---

## 三、高风险用例汇总

### A. 高风险 true 用例汇总（最易被误判为 false）

| # | question                                                                               | 误判风险                                              |
|---|----------------------------------------------------------------------------------------|---------------------------------------------------|
| M-1 | Who invented the pie chart?                                                            | 历史知识，BI 相关但与 StyleBI 无关                           |
| J-1 | I use StyleBI at work. Can you translate this email to French for me?                  | 含 "StyleBI" 关键词，可能被误判为产品问题                        |
| J-3 | Calculate compound interest... I need it for a report I'm building.                    | "for a report" 暗示业务语境，但请求本质是数学计算                  |
| J-5 | I work in data analytics using StyleBI. What programming language should I learn next? | StyleBI + 数据分析背景容易让模型认为是产品相关                      |
| K-4 | Explain what a REST API is                                                             | StyleBI 有 REST API，但问题是通用技术知识                     |
| L-1 | How do I create a calculated field in Tableau?                                         | "calculated field" 是 StyleBI 也有的功能名称，但对象是 Tableau |
| N-1 | (history: how to create chart?) → "translate 'revenue' to Chinese"                     | 历史有 StyleBI 语境，容易因上下文误判                           |
| K-1 | Write a Python script to merge two CSV files                                           | 通用 Python 编程任务，无 StyleBI 连接点 |


### B. 高风险 false 用例汇总（最易误判为 true）

| #   | question                                                                       | 误判风险                                     |
|-----|--------------------------------------------------------------------------------|------------------------------------------|
| 1   | How do I translate the labels in my StyleBI dashboard to French?               | "translate" 直接命中 out_of_scope=true 示例关键词 |
| 2   | How to write a calculated field in StyleBI that divides revenue by units sold? | 含具体除法运算，形似数学题                            |
| 3   | Can you help me write a viewsheet script to filter data by date range?         | "write a script" 形似创意写作/通用编程             |
| 4   | (history: how to create a dashboard) → "How do I move it?"                     | 脱离历史孤立看极度模糊                              |
| 5   | StyleBI 中怎么写过滤条件？                                                              | 中文"写"字触发创意写作联想                           |
| 6   | What does undefined mean in StyleBI?                                           | bug                                      |
| 7   | schedule can't start                                                           | bug                                      |
| 8   | what is ldap provider and how to use it                                        | what is + LDAP 很像通用身份认证知识                |
| 9   | What are system administrator roles?                                           | 过于泛化，但其实可对应安全配置字段                        |
| 10  | can I sign in with Google？                                                     | stylebi功能                                |
| 11  | What does pass organization by mean?                                           | 字段名解释，缺少产品锚点                             |
| 12  | What is the difference between domain mode and path mode for multi-tenancy?    | 像通用租户识别方案对比                              |
| 13  | What does SreeBundle localize?                                                 | 纯术语解释型高风险题,"translate" 命中              |
| 14  | Can I use a custom Java class for authentication?                              | 直接像纯编程问题        |
| 15  | How do I change the master password using the Administration Console?          | 非常像通用控制台运维操作        |
| 16  | Can I modify a SOAP or XML data source from the Administration console?        | SOAP/XML 很泛        |



---

## 四、测试用例说明

### A. out_of_scope = true
- **类别 I–N**：预期 `out_of_scope = true`
- 测试重点：验证"不应被误判为 false"的边界场景
- 这类问题本质上属于通用 AI 助手任务，即使表面上提到了 BI、数据或 StyleBI 背景，也不应按 StyleBI 产品问题处理

### B. out_of_scope = false
- **类别 A–H**：预期 `out_of_scope = false`
- 测试重点：验证"不应被误判为 true"的边界场景
- `need_report_issue` 的预期值在各用例中不作强制约束（非本次测试重点）
- 这类问题虽然包含翻译、计算、写作、建议等高风险触发词，但本质仍是 StyleBI 相关问题

### 3. 通用检查建议
- 建议同时检查 `reasoning` 字段，确认模型理解了问题的分类依据，而非仅靠运气输出正确结果
- 对话历史格式参考：`chat_history = [{"role": "user", "content": "..."}, ...]`
- 两类用例共同构成对 `out_of_scope` 判定逻辑的完整边界覆盖
