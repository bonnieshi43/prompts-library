---

doc_type: feature-test-doc
product: StyleBI
module: Chart / Tooltip
Feature_id: "74894"
Feature: Add card-style chart tooltip
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3655
Assignee: Franky Pan
last_updated: 2026-05-20
version: stylebi-1.2.0

---

# 1 Feature Summary

**核心目标**：为图表 Tooltip 新增 "Card" 卡片样式，通过 tier-1（16px/600）、tier-2（13px）、tier-3（11px）三级字体层级，替代扁平 `label:value` 格式，提供带圆角边框、居中文字的视觉层次展示。

**用户价值**：用户可通过 Customize Tooltip 对话框一键切换 Default/Card 样式；Card 模式下 Measure 值以最大字体突出显示，Dimension 和 Aesthetic 字段依次降级，帮助用户快速聚焦关键数据。

---

# 2 Test Focus

## P0 - Core Path

- Card 样式 tooltip 分层渲染（tier-1/2/3 字体、HTML 结构、视觉外观）
- DEFAULT 样式 tooltip 回归（扁平格式、列顺序 `{dims, measures, others}` 不变）
- 新建图表默认 Tooltip Style（`AbstractChartInfo` 字段默认 CARD）
- Tooltip Style 持久化：保存 → 重新加载后样式不丢失

## P1 - Functional Path

- 旧版 Dashboard 兼容性（XML 无 `tooltipStyle` 属性时回退 DEFAULT）
- Tooltip Style 切换后样式实时更新（CSS 类切换时机）
- 超过 3 条字段时 tier cap（第 4 条起均为 `tt-tier-3`，数据完整不丢失）
- 自定义模板 + Card（换行分 tier、空行/空白字符行过滤、占位符替换）
- 堆叠柱状图 + Combined + Card（Stack Total、subtitle tier 验证）
- 堆叠柱状图 + 非 Combined + Card（Stack Total 仍以 20px 显示）
- 普通柱状图 + Combined + Card（X 轴 Dimension 不丢失）
- 雷达图 tooltip 回归（跳过条件从 `k==0` 改为 `cols[k]==dims`，影响 DEFAULT/CARD 双模式）
- Multi-style Chart + Card（各系列 Measure 独立显示在 tier-1，无交叉混入）
- DC / T&C 派生字段 tier 分配（原始 Measure → tier-1，派生字段次之）
- 特殊图表：Candle/Stock、Gantt、Map（多层钻取）、Relation/Network（根节点/目标节点）、Box Plot、Word Cloud、Sunburst、Mekko
- 非图表组件（Table/Text）不显示 Tooltip Style 选项

## P2 - Extended Path （按需测试）

- 本地化：新增 i18n key 各语言文本正确
- 文档一致性：`AddTipsToChart.adoc` 同步更新 Card 功能说明

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | Card 样式基础渲染 | 柱状图绑定 2 Dim（Year、Employee）+ 1 Measure，设置 Card，悬停数据点，检查 HTML 结构和字体；调整字段顺序后再次验证 | `.tt-tier-1`(16px/600) / `.tt-tier-2`(13px) / `.tt-tier-3`(11px)；cardSolo 列顺序 Measure→tier-1，Dim1→tier-2，Dim2→tier-3；外观：圆角 8px、居中、border+shadow；字段顺序调整后 tier 随之变化 | Pass | Bug #75000 Reject — tier 按位置顺序分配，非字段类型，为设计意图 |
| TC-2 | DEFAULT 样式回归 | 图表设置 Default，悬停数据点，检查 HTML 结构和列顺序；浏览器开发工具确认 CSS 类 | 无 `.tt-tier-N` 结构，扁平 label:value；列顺序 Dim→Measure；CSS 类为 `widget__default-tooltip` 且有实际定义 | Pass | Risk #2：`widget__default-tooltip` 是否存在需人工确认 |
| TC-3 | 新建图表默认 Tooltip Style | 新建图表不设置 Tooltip Style，保存预览悬停；打开对话框查看默认选中项 | 默认为 Card（AbstractChartInfo 默认 CARD）；对话框选中项与实际样式一致 | Pass | 产品决策：新图表默认 Card，旧图表保持 Default（向后兼容） |
| TC-4 | Tooltip Style 持久化 | 设置 Card，保存，关闭重开，验证 tooltip；再设置 Default，重复验证 | Save-reload 后 Card/Default 各自保持；对话框选中项与实际 tooltip 样式一致 | Pass | |
| **P1** | | | | | |
| TC-5 | 旧版 Dashboard 兼容性 | 加载无 `tooltipStyle` 属性的旧版 XML Dashboard，查看对话框默认值，悬停 tooltip | 对话框显示 Default；tooltip 为扁平 label:value；无 JS 错误或渲染异常 | Pass | |
| TC-6 | Style 切换实时更新 | Default→悬停确认；不关闭 Dashboard，切换 Card→立即悬停；再切回 Default→悬停 | 每次切换后下次触发 tooltip 样式正确更新；无旧样式残留或 CSS 类未切换 | Pass | Risk #3：CSS 类仅在 `tooltipString` 变化时更新 |
| TC-7 | 超 3 条字段 tier cap | 图表绑定 1 Measure + 3 Dim（共 4 字段），Card，悬停数据点 | 第1→tier-1，第2→tier-2，第3/第4→tier-3（均 cap）；4 条数据完整显示，无截断丢失 | Pass | |
| TC-8 | 自定义模板 + Card | ①静态输入 3-5 行内容；②含真空行；③含纯空白字符行；④混合占位符（如 `{0} Year`） | 每非空行一个 tier div；空行不产生 tier；纯空白字符行不产生 tier；占位符正确替换为数据值，行顺序不变 | Pass | Bug #75019 Fixed — `line.isEmpty()` → `line.isBlank()`，正确过滤空白字符行 |
| TC-9 | 堆叠柱状图 + Combined + Card | X:Quarter，Y:Sum(Sales)+Sum(Profit)，颜色:Category，Combined 开启，Card，悬停堆叠块 | 悬停 Measure→tier-1(16px)，X 轴 Dim→tier-2.subtitle(12px，仅一次)，其他 Measure→tier-2，颜色 Dim→tier-3，Stack Total→tier-1.stack-total(20px) | Pass | Bug #75004 Fixed |
| TC-10 | 堆叠柱状图 + 非 Combined + Card | 同上配置，Combined 关闭，Card，悬停单个块 | 悬停 Measure→tier-1，X 轴 Dim→tier-2，Stack Total→tier-1.stack-total(20px) | Pass | Bug #75004 Fixed |
| TC-11 | 普通柱状图 + Combined + Card | X:Quarter，Y:Sum(Sales)，无颜色 Dim，Combined 开启，Card | Measure→tier-1，**X 轴 Dim(Quarter)→tier-2.subtitle（必须显示）**；无 Stack Total | Bug #75055 | X 轴维度丢失 |
| TC-12 | 雷达图 Tooltip 回归 | DEFAULT 和 CARD 两种模式各悬停雷达图数据点，对比 tooltip | DEFAULT：Dim 在前，Measure 在后；CARD：Measure→tier-1，Dim 正确展示；无 Dim 错误跳过或重复 | Pass | 跳过条件从 `k==0` 改为 `cols[k]==dims`，影响 DEFAULT/CARD 双模式 |
| TC-13 | Multi-style Chart + Card | Bar(Sum(Sales)) + Line(Sum(Profit))，共享 X:Quarter，Card | Bar 点→Sales→tier-1，Quarter→tier-2；Line 点→Profit→tier-1，Quarter→tier-2；两次结果不交叉混入 | Pass | Multi-style 无法开启 Combined，始终 cardSolo=true |
| TC-14 | DC Chart + Card | 开启 Date Comparison（原始 Measure + Current/Prior/Change%），Card，悬停 | 原始 Measure→tier-1；Change/Change%→tier-2；Current/Prior/Dim→tier-3；数值正确 | Bug #75030 | Change 错误占据 tier-1 |
| TC-15 | T&C + Card | 开启 Trend & Comparison（派生字段：Running Total/Change 等），Card，悬停 | 原始 Measure→tier-1；派生字段→tier-2/tier-3；所有字段完整显示 | Bug #75030 | 与 DC 同一问题 |
| TC-16 | Candle/Stock + Card | 绑定 OHLC + 日期 Dim，Card，悬停 K 线数据点 | High→tier-1，Close→tier-2，Open/Low→tier-3，日期 Dim 出现在 tooltip | Bug #75026 | measures 数组顺序 [High, Close, Open, Low]，金融惯例收盘价应最突出 |
| TC-17 | Gantt + Card | 绑定 Start/End/Task + Milestone，Card，悬停 Gantt 条形 | Start Date→tier-1，End Date→tier-2，Task 名称出现在 tooltip | Bug #75015 | Task 名称被压至 tier-3，核心标识被弱化，存在语义问题 |
| TC-18 | Map + Card | 用例 A：State + 颜色 Region；用例 B：State→City 钻取 + 颜色 Region；Card | A：State→tier-1，Region→tier-2；B State 层：同 A；B City 层：City→tier-1，Region **不显示** | Pass | 多层地图仅最高层显示美学字段为设计决策 |
| TC-19 | Relation/Network + Card | Source(Employee)/Target(Manager)/颜色(Department)，Card，分别悬停根节点和目标节点 | 根节点：Source→tier-1，无 Target 和美学字段；目标节点：Target→tier-1，Source→tier-2，美学→tier-3 | Pass | `getMeasureName()` 根节点返回 sourceDim，目标节点返回 targetDim |
| TC-20 | Box Plot + Card | Dim(state) + Measure(customer_id) + 颜色 Dim(reseller)，Card，悬停 | Max→tier-1，Q75/Medium/Q25/Min→tier-2，state/reseller→tier-3；字段名含统计量前缀（如 `Max_customer_id`）为预期 | Pass | |
| TC-21 | Word Cloud + Card | 文字字段(Product) + 大小字段(Count)，Card，悬停词 | 词频(measure)→tier-1，词本身(dim)→tier-2；记录为基线 | Bug #75035 | 语义上词本身应在 tier-1，待产品确认 |
| TC-22 | Sunburst + Card | Category(内环)→Product(外环) + Size:Sum(Sales) + Color:Region，Card，分别悬停内外环 | 内环：Category→tier-1，Sum(Sales)→tier-2，Region→tier-3；外环：Category→tier-1，Product→tier-2，Sum(Sales)→tier-3 | Pass | `getCurrentTreeDims()` 始终将顶层维度排首位；内环为 Category 聚合节点，Product 无具体值不显示 |
| TC-23 | Mekko + Card | 外层 Dim:Category + 内层 Dim:Sub-Category + Measure:Sum(Sales)，Card，悬停色块 | Sum(Sales)→tier-1，Category→tier-2，Sub-Category→tier-3；三字段均完整显示，Sub-Category 不缺失 | Pass | 内层维度通过 `innerDimension` 注入 dims 末尾 |
| TC-24 | 非图表组件不显示 Style 选项 | 打开 Table 的 Tooltip 对话框；打开 Chart 的 Tooltip 对话框 | Table 无 Tooltip Style 选项；Chart 有 Default/Card 单选按钮；无 UI 错位 | Pass | `*ngIf="model.chart"` 控制 |
| **P2** | | | | | |
| TC-25 | 本地化文本 | 切换中文/日文，打开 Chart Customize Tooltip，检查 "Tooltip Style"/"Default"/"Card" 标签文本 | 各语言显示对应翻译，不出现 `_#(...)` 原始 key | Bug #75021 | 本地化缺失 |
| TC-26 | 文档一致性 | 打开 `modules/viewsheet/pages/AddTipsToChart.adoc`，检查 Tooltip Style 说明、Card 特点、Default vs Card 对比、配置步骤 | 包含 Tooltip Style 选项说明（Default/Card）、Card 分层视觉说明、差异对比、配置步骤 | Bug | merge 后补充文档 bug |

---

# 4 Special Testing

## 本地化

新增 `_#(Tooltip Style)`、`_#(Default)`、`_#(Card)` i18n key，需验证各语言文本正确显示，不出现原始 key 直出。**Bug #75021：本地化缺失。**

## Script

`tooltipStyle`（Card/Default 样式控制）**未注册 Script 属性**，无法通过脚本读写，Auto-complete 不出现该属性。`Chart1.toolTip` 属性对应自定义模板文本（`customTooltip` 字段），与样式控制无关；`getToolTip()` 始终返回 `null`（只写属性）。若需脚本动态切换 Card/Default，当前版本不支持。**Bug #75067：待确认是否有意设计。**

## 文档/API

`modules/viewsheet/pages/AddTipsToChart.adoc` 需包含：Tooltip Style 选项说明（Default/Card）、Card 分层视觉特点（tier-1/2/3）、Default vs Card 行为差异、配置步骤。**Bug：merge 后补充文档 bug。**

## 兼容性

旧版 XML（无 `tooltipStyle` 属性）加载后回退 DEFAULT，向后兼容。新版 Dashboard 在旧服务器上打开时，`tooltipStyle` 属性被忽略，图表回退 DEFAULT 样式，需人工验证。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 |
|---|---|
| Chart 渲染 | PlotArea 列顺序新增 cardSolo 分支（`CARD && !combinedToolTip` → measures-first）；雷达图跳过条件从 `k==0` 改为 `cols[k]==dims`，影响 DEFAULT 和 CARD 双模式 |
| Tooltip Customize Dialog | 新增 Default/Card 单选按钮，仅 chart 类型可见（`*ngIf="model.chart"`） |
| Dashboard Viewer/Editor | `chart-area` CSS 类根据 `model.tooltipStyle` 动态切换；旧版 XML 向后兼容 |
| Date Comparison (DC) | DC 派生字段（Current/Prior/Change%）全部归入 measures，cardSolo 下提升至 tier-1 优先级 |
| T&C (Trend & Comparison) | 派生字段 tier 分配变化，原始 Measure 与派生字段优先级需验证 |
| Multi-style Chart | 因代码限制无法开启 Combined，始终进入 cardSolo=true 分支 |
| 特殊图表类型 | 雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud、Sunburst/Treemap/Icicle、Mekko 各自字段优先级语义 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| Bug #75000 | TC-1 Measure 应优先占 tier-1（设计验证） | Reject — tier 按位置顺序分配，非字段类型，为设计意图 |
| Bug #75004 | 堆叠柱状图 Stack Total tier 渲染异常 | Fixed |
| Bug #75015 | Gantt Task 名称被压至 tier-3，核心标识语义被弱化 | Open |
| Bug #75019 | 自定义模板空白字符行未过滤，产生多余 tier div | Fixed |
| Bug #75021 | Tooltip Style / Default / Card 本地化缺失 | Fixed |
| Bug #75026 | Candle/Stock OHLC 字段 High 在 tier-1，金融语义收盘价应最突出 | Open |
| Bug #75030 | DC / T&C 派生字段（Change%）错误占据 tier-1，原始 Measure 应在 tier-1 | Open |
| Bug #75035 | Word Cloud 词本身（dim）语义上应在 tier-1，当前词频（measure）占 tier-1 | Open |
| Bug #75055 | 普通柱状图 + Combined + Card 时 X 轴 Dimension 丢失 | Open |
| Bug #75067 | tooltipStyle 无法通过脚本控制，待确认是否有意设计 | Open |
