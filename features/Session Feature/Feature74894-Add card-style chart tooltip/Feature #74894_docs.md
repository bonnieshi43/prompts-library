---

doc_type: feature-test-doc
product: StyleBI
module: Chart / Tooltip
Feature_id: "74894"
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3655
Assignee: Franky Pan
last_updated: 2026-06-09
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
- 特殊图表类型（雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud等）在 CARD 模式下的 tier 分配正确性
- 非图表组件（Table/Text）不显示 Tooltip Style 选项

## P2 - Extended Path （按需测试）

- 本地化文本验证
- 脚本兼容性（Bug #75067）
- 文档一致性验证
- 移动端尺寸验证

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Card 样式 Tooltip 基础渲染验证 | 1. 打开图表，进入 Customize Tooltip，选择 Card 样式，保存。<br>2. 悬停数据点，检查 tooltip 的 HTML 结构和视觉效果。<br>3. 在 Customize Tooltip 中调整字段顺序，保存后再次验证。 | - tooltip 渲染为 `.tt-tier-1`（16px/600）、`.tt-tier-2`（13px）、`.tt-tier-3`（11px）结构<br>- cardSolo 模式列顺序 `{measures, dims, others}`，Measure 天然占据 tier-1<br>- 用户调整字段顺序后，tier 随之改变<br>- 外观：圆角8px、居中、border+box-shadow | Fail | 🔴 测试-分析：Bug #75000 已被开发 Reject, Bug #75339 |
| TC-2 | DEFAULT 样式 Tooltip 回归验证 | 1. 打开图表的 Customize Tooltip 对话框，确认 Tooltip Style 为 "Default"，保存。<br>2. 悬停数据点，观察 tooltip 内容。<br>3. 检查 tooltip HTML 结构（不含 tt-tier 类）。<br>4. 确认 Dimension 显示在 Measure 之前。 | - tooltip 无 `.tt-tier-N` 结构，保持原有 label:value 格式<br>- 列顺序：Dimension → Measure → 其他<br>- CSS 类为 `widget__default-tooltip` | Pass | 🔴 测试-分析：符合预期 |
| TC-3 | 新建图表默认 Tooltip Style 验证 | 1. 在 Dashboard 中新建一个图表，不做任何 Tooltip Style 设置。<br>2. 保存并预览，悬停数据点，观察 tooltip 样式。<br>3. 打开 Customize Tooltip 对话框，查看 Tooltip Style 默认选中项。 | - 新建图表默认使用 Card 样式<br>- Customize Tooltip 对话框中选中项与实际 tooltip 样式一致 | Pass | 🔴 测试-分析：符合预期 |
| TC-4 | Tooltip Style 持久化与重新加载验证 | 1. 创建图表，设置 Tooltip Style 为 Card，保存 Dashboard。<br>2. 关闭并重新打开 Dashboard。<br>3. 打开 Customize Tooltip 对话框，检查 Tooltip Style 选项。<br>4. 悬停数据点，确认 tooltip 仍为 Card 样式。<br>5. 切换为 Default，保存，重新打开，重复验证。 | - CARD 设置在 save-reload 后保持为 CARD<br>- DEFAULT 设置在 save-reload 后保持为 DEFAULT<br>- tooltip 实际显示与对话框设置一致 | Pass | 🔴 测试-分析：符合预期 |
| **P1** |
| TC-5 | 旧版 Dashboard 兼容性验证 | 1. 加载旧版 Dashboard（XML 中不含 `tooltipStyle` 属性）。<br>2. 打开图表的 Customize Tooltip 对话框，查看 Tooltip Style 默认值。<br>3. 悬停数据点，观察 tooltip 样式。 | - Tooltip Style 显示为 "Default"<br>- tooltip 以扁平 label:value 格式显示，无 Card 样式<br>- 无 JavaScript 错误或渲染异常 | Pass | 🔴 测试-分析：符合预期 |
| TC-6 | Tooltip Style 切换后样式实时更新验证 | 1. 图表 Tooltip Style 设置为 Default，悬停数据点，确认 DEFAULT 样式显示。<br>2. 不关闭 Dashboard，直接打开 Customize Tooltip，切换为 Card，应用。<br>3. 立即悬停相同数据点，查看 tooltip 样式是否更新为 Card。<br>4. 再切换回 Default，悬停数据点，验证是否恢复 DEFAULT 样式。 | - 切换 Style 后，下次触发 tooltip 时应正确显示新样式<br>- 不出现旧样式残留或 CSS 类未切换的情况 | Pass | 🔴 测试-分析：符合预期 |
| TC-7 | 超过3条 Tooltip 数据的 Tier 渲染验证 | 1. 图表含4个以上字段（如 1 Measure + 3 Dimension），Tooltip Style = Card。<br>2. 悬停数据点触发 tooltip。<br>3. 检查所有字段数据完整显示，第3条及以后均为 tt-tier-3 样式。 | - 第1个字段 → tt-tier-1（16px），第2个 → tt-tier-2（13px），第3个及以后 → tt-tier-3（11px）<br>- 所有数据完整显示，无截断丢失 | Pass | 🔴 测试-分析：符合预期 |
| TC-8 | 自定义模板 + Card 样式组合验证 | 1. 在 Custom 模板文本框中逐行输入 3-5 行静态内容，保存后悬停数据点。<br>2. 确认每非空行渲染为一个 tier div，第 4 行起均为 tt-tier-3。<br>3. 测试空行过滤、空白字符行过滤。<br>4. 测试静态文本与占位符混合。 | - 每非空行 → 一个 tier div，超过 3 行后均为 tt-tier-3，数据不丢失<br>- 真空行和纯空白字符行不产生 tier div<br>- 静态文本与占位符混合时行顺序不变，占位符正确替换 | Fail | 🔴 测试-分析：Bug #75019 已修复 |
| TC-9 | 堆叠柱状图 + Combined + Card | 1. 打开 Customize Tooltip 对话框，确认 Combined Tooltip 已开启，Tooltip Style 选 Card，保存。<br>2. 悬停某个堆叠柱的第一个 Measure 数据块，触发 combined tooltip。<br>3. 观察 tooltip 整体布局和各行字号。 | - tier-1（16px）：悬停的 Measure 值<br>- tier-2.subtitle（12px）：共享 X 轴维度<br>- tier-2（13px）：另一个 Measure 的值<br>- tier-3（11px）：颜色分组字段<br>- tier-1.stack-total（20px）：Stack Total，字体最大 | Fail | 🔴 测试-分析：Bug #75004 已修复 |
| TC-10 | 堆叠柱状图 + 非 Combined + Card | 参考 TC-9 步骤，关闭 Combined Tooltip 后验证。 | - tier-1（16px）：悬停的 Measure 值<br>- tier-2.subtitle（12px）：共享 X 轴维度<br>- tier-1.stack-total（20px）：Stack Total，字体最大 | Fail | 🔴 测试-分析：Bug #75004 已修复 |
| TC-11 | 普通柱状图 + Combined + Card | 1. 打开 Customize Tooltip 对话框，确认 Combined Tooltip 已开启，Tooltip Style 选 Card，保存。<br>2. 悬停某个数据点，触发 combined tooltip。<br>3. 观察 tooltip 布局。 | - tier-1（16px）：悬停的 Measure 值<br>- tier-2.subtitle（12px）：X 轴 Dimension，必须显示<br>- 无 Stack Total（非堆叠图） | Fail | 🔴 测试-分析：Bug #75055 |
| TC-12 | 雷达图 Tooltip 回归验证 | 1. 在 DEFAULT 模式下，悬停雷达图数据点，观察 tooltip 中 dimension 内容。<br>2. 切换为 CARD 模式，悬停同一数据点，观察 tooltip。<br>3. 对比两种模式下 tooltip 内容是否合理。 | - DEFAULT 模式：雷达图 tooltip 与修复前行为一致<br>- CARD 模式：Measure 在 tier-1，dimension 信息正确展示<br>- 无 dimension 数据错误跳过或重复 | Pass | 🔴 测试-分析：符合预期 |
| TC-13 | Multi-style Chart + Card 样式验证 | 1. 创建 Multi-style 图表（Bar + Line），设置 Tooltip Style = Card。<br>2. 悬停 Bar 数据点，观察 tier-1 是否显示对应 Measure。<br>3. 悬停 Line 数据点，观察 tier-1 是否显示对应 Measure。 | - Bar 数据点：Sum(Sales) → tier-1<br>- Line 数据点：Sum(Profit) → tier-1<br>- 各自 Measure 正确对应，无交叉混入 | Pass | 🔴 测试-分析：符合预期 |
| TC-14 | DC Chart + Card 样式验证 | 1. 创建 DC 图表并配置对比字段，设置 Tooltip Style = Card，保存。<br>2. 悬停数据点，检查 tier 分配。 | - 原始 Measure → tier-1（16px/600）<br>- Change value/Change% → tier-2（13px）<br>- Current/Prior → tier-3（11px）<br>- Dimensions → tier-3 | Fail | 🔴 测试-分析：Bug #75030 |
| TC-15 | T&C Chart + Card 样式验证 | 1. 创建 T&C 图表配置派生字段，设置 Tooltip Style = Card，保存。<br>2. 悬停数据点，检查 tier 分配。 | - 原始 Measure → tier-1（16px/600）<br>- 派生字段（Change/Change%/Running Total 等）→ tier-2/tier-3 | Fail | 🔴 测试-分析：Bug #75030 |
| TC-16 | Candle/Stock Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card。<br>2. 悬停 K 线数据点，检查 tier 分配。<br>3. 悬停带 Y 轴分组的 K 线，确认日期仍为 subtitle。 | - tier-1：Close: value<br>- tier-1.subtitle：Date: value（X 轴日期始终为 subtitle）<br>- tier-2：Open/High/Low<br>- tier-3：Y 轴分组维度 | Fail | 🔴 测试-分析：Bug #75026、#75302 已修复 |
| TC-17 | Gantt Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card。<br>2. 悬停 Gantt 条形，检查各字段的 tier 分配。<br>3. 确认 Task 名称显示在 tier-1。 | - Tier 1：最内层 Y 维度（任务名称）<br>- Tier 2：Start / End / Milestone<br>- Tier 3：外层 Y 维度 + X 维度 + 美学字段 | Fail | 🔴 测试-分析：Bug #75015 已修复，Bug #75307 |
| TC-18 | Map Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card，保存。<br>2. 悬停单层地图区域，观察 tooltip 中地名和颜色字段的 tier 分配。<br>3. 悬停多层地图的 State 层和 City 层，对比差异。 | - 单层地图：地名 → tier-1，颜色字段 → tier-2<br>- 多层地图 State 层：State → tier-1，Region → tier-2<br>- 多层地图 City 层：City → tier-1，Region 不显示 | Fail | 🔴 测试-分析：Bug #75344（设计决策） |
| TC-19 | Relation/Network Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card。<br>2. 悬停根节点，记录显示字段。<br>3. 悬停非根节点，记录显示字段。 | - 根节点：Source(tier-1)，无 Target 和美学字段<br>- 非根节点：Target(tier-1) + Source(tier-2) + 美学(tier-3) | Pass | 🔴 测试-分析：符合预期 |
| TC-20 | Box Plot + Card 样式验证 | 1. 设置 Tooltip Style 为 Card。<br>2. 悬停单度量 Box Plot 数据点。<br>3. 检查统计量的 tier 分配及 X维度 subtitle。 | - Median_[field] → tier-1，X维度 → tier-1 subtitle<br>- Q25/Q75 → tier-2（IQR 分组）<br>- Min/Max、颜色维度 → tier-3 | Fail | 🔴 测试-分析：Bug #75341 已修复 |
| TC-21 | Word Cloud + Card 样式验证 | 1. 设置 Tooltip Style 为 Card，保存。<br>2. 悬停词云中任意词，触发 tooltip。<br>3. 记录词本身和词频各自的 tier。 | - TextGroup（词本身）→ tier-1<br>- Sum（词频/度量）→ tier-2<br>- others（颜色分组维度）→ tier-3 | Fail | 🔴 测试-分析：Bug #75035 已修复 |
| TC-22 | Sunburst Chart + Card 样式验证 | 1. 预览图表，悬停内环扇区，观察 tooltip。<br>2. 悬停外环扇区，观察 tooltip。<br>3. 对比两次 tooltip 的差异。 | - 内环：Category → tier-1，Sum(Sales) → tier-2，Region → tier-3<br>- 外环：Category → tier-1，Product → tier-2，Sum(Sales) → tier-3 | Pass | 🔴 测试-分析：符合预期 |
| TC-23 | Scatter Matrix Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card。<br>2. 悬停散点，检查各字段的 tier 分配。 | - Region（Color）→ tier-1（16px/600）<br>- State（Shape）→ tier-2（13px）<br>- X/Y 坐标度量 → tier-2（13px）<br>- Total（Size）→ tier-3（11px） | Fail | 🔴 测试-分析：#75066，符合设计意图 |
| TC-24 | Mekko Chart + Card 样式验证 | 1. 设置 Tooltip Style 为 Card，保存。<br>2. 悬停任意色块，触发 tooltip。<br>3. 检查各字段的 tier 分配。 | - tier-1（16px）：Sum(Sales)<br>- tier-2（13px）：Category（外层维度）<br>- tier-3（11px）：Sub-Category（内层维度，必须出现） | Pass | 🔴 测试-分析：符合预期 |
| **P2** |
| TC-25 | 非图表组件不显示 Tooltip Style 选项验证 | 1. 打开 Table 组件的 Tooltip 对话框，确认无 "Tooltip Style" 选项。<br>2. 打开 Chart 组件的 Tooltip 对话框，确认有 "Tooltip Style" 选项。 | - 仅 Chart 类型组件显示 Tooltip Style 选项<br>- Table、Text 等非 Chart 组件不显示该选项 | Pass | 🔴 测试-分析：符合预期 |
| TC-26 | 本地化文本验证 | 1. 切换系统语言为非英文（如中文/日文），打开 Chart Customize Tooltip 对话框。<br>2. 检查 "Tooltip Style"、"Default"、"Card" 标签的显示文本。 | - 各语言均显示对应翻译文本，不出现 `_#(...)` 原始 key | Fail | 🔴 测试-分析：Bug #75021 |
| TC-27 | 文档一致性验证 | 1. 打开文档 `modules/viewsheet/pages/AddTipsToChart.adoc`，定位到 Custom  tooltip 章节。<br>2. 检查是否包含 Tooltip Style 选项的说明。<br>3. 检查是否描述了 Card 样式的视觉特点。 | - 文档中明确说明 Tooltip Style 选项及其两个取值<br>- Card 样式的分层视觉特点有清晰描述<br>- 配置步骤完整 | Fail | 🔴 测试-分析：merge后报文档的bug |

---

# 4 Special Testing

## Security
- 无特殊安全测试需求

## Performance
- 无特殊性能测试需求

## Compatibility
- 旧版 Dashboard 兼容性（已有 TC-5 覆盖）
- 旧服务器版本兼容：新版 dashboard 在旧服务器上打开时，`tooltipStyle` XML 属性被忽略，图表回退 DEFAULT 样式

## 本地化
- 验证新增 i18n key（`_#(Tooltip Style)`、`_#(Default)`、`_#(Card)`）在各语言环境下正确显示（已有 TC-26 覆盖）

## script
- 支持脚本动态切换样式：`Chart1.tooltipStyle = "CARD"` 或 `"DEFAULT"`（Bug #75067）

## 文档/API
- 验证官方文档已更新 Card Tooltip 功能说明（已有 TC-27 覆盖）

## 配置检查
- 无特殊配置检查需求

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- **Chart**：所有图表类型的 tooltip 渲染逻辑
- **Dashboard Viewer/Editor**：Tooltip Style 设置的保存与加载
- **Binding Editor**：tooltip 字段顺序影响
- **Date Comparison (DC)**：派生字段的 tier 分配
- **Multi-style Chart**：各系列独立字段配置
- **特殊图表类型**：雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud、Sunburst、Scatter Matrix、Mekko

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75000 | Card tooltip tiering ignores field type, breaking visual parity for dimensions | Rejected |
| #75002 | Card tooltip apply error in Combined Tip | Closed |
| #75004 | Card tooltip apply error in Combined Tip for stack chart | Closed |
| #75015 | Gantt Chart Card Tooltip Tiering isn't good | Closed |
| #75019 | Custom tooltip does not skip whitespace-only lines in CARD style | Closed |
| #75021 | Tooltip Style and Card options aren't localized | Closed |
| #75026 | Candle/Stock Chart Card Tooltip Tiering is unreasonable | Closed |
| #75030 | Date Comparison change wrongly occupies tier-1 in card tooltip | Closed |
| #75035 | Word Cloud Card Tooltip prioritizes word frequency over word text | Closed |
| #75054 | Stack Total not highlighted in no combined card tip for stacked chart | Closed |
| #75055 | No stack chart combined-card tooltip display error | Closed |
| #75066 | Scatter Matrix 美学优先级规则 | Closed |
| #75067 | Tooltip style should add script supported | Closed |
| #75179 | Default tooltip status exist confusion | Rejected |
| #75298 | Card Tooltip font hierarchy lost after merging main into epic-74519 branch | Closed |
| #75302 | When x&y pane binding dim, candle/Stock Chart Card Tooltip Tiering is unreasonable | Closed |
| #75306 | When style is scatter matrix, aesthetic display error in card tooltip | Request Feedback |
| #75307 | Gantt Chart Card Tooltip text tier isn't good | Closed |
| #75339 | Solo cards tooltip display not good | Closed |
| #75341 | Boxplot chart card tooltip display unreasonable | Closed |
| #75344 | Map chart card tooltip display unreasonable | Closed |

---