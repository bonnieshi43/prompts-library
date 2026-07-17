# Feature #74894 测试分析报告
> Add card-style chart tooltip | PR #3655 | 分析日期：2026-05-15

---

## 输入完整性检查

- PR diff：完整（17个文件，9页）
- Feature 描述：完整
- Knowledge 知识库文档：
https://inetsoft-technology.github.io/stylebi-docs/InetSoftUserDocumentation/1.1.0/viewsheet/ChartTypes.html

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为图表 Tooltip 新增 "Card" 卡片样式，提供带圆角边框、居中文字、层级化字体的视觉展示，作为扁平 `label:value` 格式的可选替代方案。
- **用户价值**：用户可通过 Customize Tooltip 对话框切换 Tooltip 视觉样式，使 Measure 值以最大字体突出显示，Dimension 和 Aesthetic 数据依次降级，提升 tooltip 的视觉层次感与可读性。
- **Feature 类型**：UI / Rendering

🔴 **测试-分析**：符合预期-add 'Card' ui in chart tooltip

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

| 文件 | 变更内容 |
|---|---|
| `ChartInfo.java` | 新增 `enum TooltipStyle { DEFAULT, CARD }` 及 `getTooltipStyle()`/`setTooltipStyle()` 接口方法 |
| `AbstractChartInfo.java` | 实现 getter/setter，XML 序列化写入 `tooltipStyle` 属性，反序列化时未知值回退 DEFAULT，**字段默认值为 `TooltipStyle.CARD`（第3887行）** |
| `ChartToolTip.java` | `getTooltip()` 分支：CARD 模式路由至 `renderCard()`，生成 `<div class="tt-tier-N">` 结构；`appendTier()` 通过 `Math.min(tier, 3)` 限制最大层级；新增 `getStyle()`/`setStyle()` |
| `PlotArea.java` | 引入 `cardSolo` 条件（CARD && !combinedToolTip）：cardSolo=true 时列顺序 `{measures, dims, others}`，Combined+CARD 或 DEFAULT 时保持 `{dims, measures, others}`；雷达图跳过条件从 `k == 0` 修改为 `cols[k] == dims` |
| `TipCustomizeDialogModel.java` | 新增 `TooltipStyle { DEFAULT, CARD }` 枚举，字段**默认值为 `DEFAULT`** |
| `ChartPropertyDialogController.java` | GET：映射 `vsChartInfo.getTooltipStyle()` → dialog model；POST：映射 dialog model → `vsChartInfo.setTooltipStyle()` |
| `ChartModel.java` / `VSChartModel.java` / `GraphBuilder.java` | 全链路传递 `tooltipStyle` 字符串至前端 |
| `chart-area.component.ts` / `.html` | 初始 `tooltipCSS = "widget__default-tooltip"`；tooltip 字符串变化时，CARD 模式切换为 `widget__card-tooltip`；`[tooltipCSS]` 绑定至 axis、plot、legend 组件 |
| `tip-customize-dialog.component.html/.ts` | 新增 "Tooltip Style" fieldset，含 Default/Card 单选按钮，仅在 `model.chart === true` 时显示 |
| `_directives.scss` | 新增 `.widget__card-tooltip`：`border-radius:8px`、`text-align:center`、`padding:12px 16px`；tier-1(16px/600)、tier-2(13px/0.9)、tier-3(11px/0.7) |

### 目标覆盖度

| Feature 需求点 | PR 实现状态 | 备注 |
|---|---|---|
| TooltipStyle enum on ChartInfo | ✅ 完整实现 | |
| XML 持久化，旧图表保持 DEFAULT | ✅ 完整实现 | 未知值 try-catch 回退 |
| ChartToolTip 生成 tier div | ✅ 完整实现 | appendTier() + renderCard() |
| Measure 提升至第一 tier | ✅ 完整实现 | PlotArea 列顺序调整 |
| Customize Tooltip 对话框新增样式选项 | ✅ 完整实现 | 仅 chart 可见 |
| 前端 CSS 由 model.tooltipStyle 驱动 | ✅ 完整实现 | 非内容嗅探 |
| widget__card-tooltip SCSS | ✅ 完整实现 | |
| opt-in 行为（新图表默认 DEFAULT） | ⚠️ **存疑** | AbstractChartInfo 字段默认值为 **CARD**，新图表实际默认 CARD |
| ChartToolTipTest 覆盖 | ❓ 无法确认 | 二进制文件未展示 diff |

🔴 **测试-分析**： 新建图表默认使用 Card样式，旧图表保持 Default 不变（opt-in有误导，目前这样合理）

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|---|---|---|
| 所有图表 tooltip 均为扁平 label:value 格式 | 新创建图表默认使用 CARD 样式（AbstractChartInfo 字段默认 CARD） | **高** |
| PlotArea 列顺序固定 {dims, measures, others} | cardSolo（CARD + 非 Combined）时列顺序 {measures, dims, others}；CARD + Combined 或 DEFAULT 保持原序；Multi-style 图表因无法开启 Combined 始终为 cardSolo | 中 |
| 雷达图跳过条件 `k == 0` | 雷达图跳过条件 `cols[k] == dims`，影响 DEFAULT 和 CARD 两种模式 | 中 |
| Customize Tooltip 无样式选项 | 新增 Default/Card 单选按钮，仅对 chart 类型显示 | 低 |
| 无 tooltipCSS 概念 | chart-area 根据 model 动态切换 CSS 类 | 低 |
| 旧 XML 无 tooltipStyle 属性 | 反序列化时缺省 DEFAULT，向后兼容 | 低 |

---

## 第三部分：Risk Identification（风险识别）

1. **[高 / Compatibility] AbstractChartInfo 默认值为 CARD**：第3887行 `tooltipStyle = TooltipStyle.CARD` 意味着所有新建图表直接使用 Card 样式，与 Feature "opt-in" 描述相悖。而 `TipCustomizeDialogModel` 默认为 `DEFAULT`，`ChartToolTip` 字段默认也为 `DEFAULT`，三处默认值不一致，存在行为分歧风险。

2. **[高 / Rendering] `.widget__default-tooltip` CSS 类未定义**：`chart-area.component.ts` 非 CARD 时设置 `tooltipCSS = "widget__default-tooltip"`，但 `_directives.scss` 仅新增 `.widget__card-tooltip`，未见 `.widget__default-tooltip` 存在。若该类不存在，DEFAULT 模式 tooltip 样式可能发生回归。

3. **[中 / Rendering] tooltipCSS 仅在 tooltipString 变化时更新**：CSS 类切换逻辑嵌入在 `if(tooltipString != this.tooltipString)` 块内，若 Tooltip Style 发生变化但 tooltip 内容未变，CSS 类不会立即刷新，导致样式无法实时生效。

4. **[中 / Functional] Custom 模板 + CARD 样式**：自定义模板按换行符切分为多条 tier，超过3条后，第4条起的内容均渲染为 tt-tier-3 样式，导致数据视觉上无差异，可能引发误解。

5. **[中 / Functional] Combined Tip + CARD 样式**：`renderCard()` 依赖 `(-1, -1)` separator 跳过逻辑，需验证多图表 combined tooltip 在 CARD 模式下的正确分隔与渲染。

6. **[中 / Functional] Multi-style Chart + CARD 样式**：Multi-style 图表因代码限制无法开启 Combined Tooltip，CARD 模式下始终进入 `cardSolo = true` 分支（measures-first）。Multi-style 每个 series 有独立的 dims/measures 配置，不同 series 数据点悬停时 tier-1 内容可能不一致，存在字段混入或排序混乱风险。

7. **[中 / Functional] DC Chart + CARD 样式**：Date Comparison 图表的对比字段（Current、Prior、Change%）均被归入 `measures` 数组，`cardSolo = true` 时全部提升至 tier-1 优先级。多个对比 measure 并列在 tier-1 后视觉层级是否合理存在不确定性；同时 `DCMergeCell` 数据需经 `getOriginalData()` 解包，需确认解包值在 CARD 模式下正确渲染。

8. **[中 / Functional] 特殊图表类型 CARD 样式行为**：部分图表类型（雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud）有特殊的字段处理逻辑。雷达图的跳过条件从 `k == 0` 改为 `cols[k] == dims`，在 DEFAULT 和 CARD 模式下均生效；其他图表可能出现字段优先级语义偏差（如收盘价不在最突出位置、Task 名称被弱化、Word Cloud 词频在 tier-1 而词本身在 tier-2 等），需验证各特殊图表的 tier 分配正确性。

9. **[低 / Compatibility] 旧服务器版本兼容**：新版 dashboard 在旧服务器上打开时，`tooltipStyle` XML 属性被忽略，图表回退 DEFAULT 样式，已通过注释说明但需人工验证。

10. **[低 / Rendering] 移动端尺寸**：Card tooltip 使用 `max-width: 40vw / max-height: 40vh`，在小屏幕上可能裁剪内容（overflow: hidden），存在信息截断风险。

11. **[低 / Documentation] 文档更新遗漏**：新增的 Card Tooltip 功能需要在官方文档中进行说明，若文档未同步更新，用户可能无法了解和正确使用该功能。

---

## 第四部分：Test Design（测试策略设计）

**核心验证点**：
- Card 样式 tooltip 是否正确分层渲染（tier-1 最大字体展示 Measure，tier-2 展示 Dimension，tier-3 展示 Aesthetic）
- DEFAULT 样式 tooltip 回归（扁平格式、列顺序不变、样式不变）
- 新建图表的默认 Tooltip Style（CARD 还是 DEFAULT）
- Tooltip Style 设置的持久化、保存与重新加载
- 特殊图表类型（雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud等）在 CARD 模式下的 tier 分配正确性
- 官方文档是否同步更新 Card Tooltip 功能说明

**高风险路径**：
- 新建图表后直接查看 tooltip，验证默认样式
- 图表含3条以上 tooltip 数据时的 tier 渲染
- 自定义模板 + CARD 样式组合
- 切换 Tooltip Style 后不刷新页面直接查看 tooltip 是否更新
- DEFAULT 模式下 tooltip 的 CSS 类是否正常
- Multi-style 图表（Bar+Line 等混合类型）各 series 数据点悬停时 tier 排序一致性
- DC 图表对比字段（Current/Prior/Change%）在 CARD 模式下的 tier 分配与数值正确性
- 特殊图表类型的字段优先级语义（如 Candle/Stock 的收盘价、Gantt 的 Task 名称）

**涉及模块**：Chart 渲染、Tooltip Customize Dialog、Dashboard Viewer/Editor、Binding Editor、Date Comparison（DC）、Multi-style Chart、特殊图表类型（雷达图、Candle/Stock、Gantt、Map、Relation/Network、Box Plot、Word Cloud等）

**专项检查**：
- **本地化**：新增 `_#(Tooltip Style)`、`_#(Default)`、`_#(Card)` i18n key，需验证各语言环境下文本正确。
- **脚本兼容**：`tooltipStyle`（Card/Default 样式）**未注册 Script 属性**，无法通过脚本读写，Auto-complete 不会出现该属性。现有 `Chart1.toolTip` 属性对应的是自定义模板文本（`customTooltip` 字段），与样式控制无关；`getToolTip()` 始终返回 `null`，为只写属性。若需脚本动态切换 Card/Default 样式，当前版本不支持，需确认是否为有意设计。
- **文档一致性**：Customize Tooltip 对话框新增选项，需验证 Help 文档是否同步更新。
- **Mobile 影响**：`max-width: 40vw / max-height: 40vh / overflow: hidden` 在窄屏设备下需验证内容是否被裁剪。

🔴 **测试-分析**：支持脚本（Bug #75067）， Chart1.tooltipStyle = "CARD" or “DEFAULT”

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景分组说明：
- **基础功能**（1-8）：所有图表通用的核心功能验证
- **柱状图专项**（9-11）：堆叠/非堆叠、Combined/非 Combined 场景
- **特殊图表类型**（12-23）：雷达图、Multi-style、DC、T&C 等特殊图表
- **UI 专项**（24-26）：非图表组件、本地化、文档验证

| # | 场景 | 分组 |
|---|---|---|
| 1 | Card 样式 Tooltip 基础渲染验证 | 基础功能 |
| 2 | DEFAULT 样式 Tooltip 回归验证 | 基础功能 |
| 3 | 新建图表默认 Tooltip Style 验证 | 数据一致性 |
| 4 | Tooltip Style 持久化与重新加载验证 | 数据一致性 |
| 5 | 旧版 Dashboard 兼容性验证 | 数据一致性 |
| 6 | Tooltip Style 切换后样式实时更新验证 | 交互与边界 |
| 7 | 超过3条 Tooltip 数据的 Tier 渲染验证 | 交互与边界 |
| 8 | 自定义模板 + Card 样式组合验证（含换行符、空格行、tier延续、DEFAULT对比） | 交互与边界 |
| 9 | 堆叠柱状图 + Combined + Card（完整验证） | 柱状图专项 |
| 10 | 堆叠柱状图 + 非 Combined + Card（对比验证） | 柱状图专项 |
| 11 | 普通柱状图 + Combined + Card（边界验证） | 柱状图专项 |
| 12 | 雷达图 Tooltip 回归验证 | 特殊图表类型 |
| 13 | Multi-style Chart + Card 样式 Tooltip 验证 | 特殊图表类型 |
| 14 | DC Chart（Date Comparison）+ Card 样式 Tooltip 验证 | 特殊图表类型 |
| 15 | T&C（Trend & Comparison）+ Card 样式 Tooltip 验证 | 特殊图表类型 |
| 16 | Candle / Stock Chart + Card 样式验证 | 特殊图表类型 |
| 17 | Gantt Chart + Card 样式验证 | 特殊图表类型 |
| 18 | Map Chart + Card 样式验证 | 特殊图表类型 |
| 19 | Relation / Network Chart + Card 样式验证 | 特殊图表类型 |
| 20 | Box Plot + Card 样式验证 | 特殊图表类型 |
| 21 | Word Cloud + Card 样式验证 | 特殊图表类型 |
| 22 | Treemap + Card 样式验证 | 特殊图表类型 |
| 23 | Scatter Matrix Chart + Card 样式验证 | 特殊图表类型 |
| 24 | Mekko Chart + Card 样式验证 | 特殊图表类型 |
| 25 | 非图表组件不显示 Tooltip Style 选项验证 | UI 专项 |
| 26 | 本地化文本验证 | UI 专项 |
| 27 | 文档一致性验证 | UI 专项 |

---

### Scenario 1：Card 样式 Tooltip 基础渲染验证

**Objective**：验证 CARD 模式下 tooltip 按位置顺序分配 tier，Measure 优先显示在最大字体层。

**Description**：Card 样式通过 tier 级联（tier-1 > tier-2 > tier-3）建立视觉优先级，字段按顺序分配并 cap 在 3。

**Pre-condition**：柱状图，X-axis 绑定 2 个 Dimension（Year、Employee），Y-axis 绑定 1 个 Measure，Tooltip Style = Card。

**Steps**：
1. 打开图表，进入 Customize Tooltip，选择 Card 样式，保存。
2. 悬停数据点，检查 tooltip 的 HTML 结构和视觉效果。
3. 在 Customize Tooltip 中调整字段顺序（如 Employee 移至 Year 前），保存后再次验证。

**Expected Result**：
- tooltip 渲染为 `.tt-tier-1`（16px/600）、`.tt-tier-2`（13px）、`.tt-tier-3`（11px）结构
- cardSolo 模式列顺序 `{measures, dims, others}`，Measure 天然占据 tier-1
- 示例：Sum(Order Number)→tier-1，Year→tier-2，Employee→tier-3（同类型字段视觉权重不同是预期行为）
- 用户调整字段顺序后，tier 随之改变
- 外观：圆角8px、居中、border+box-shadow

**Risk Covered**：Card 样式核心渲染、位置顺序 tier 分配、字段重排序影响、tier-3 cap 机制

✅ **测试-分析**：Bug #75000 已被开发 Reject, Bug #75339
**Tier 分配规则：按位置顺序，非字段类型**。设计意图：保持视觉优先级、兼容多 Measure 图表、用户可通过字段排序控制、支持自定义模板。

---

### Scenario 2：DEFAULT 样式 Tooltip 回归验证

**Scenario Objective**：确认切换回 DEFAULT 样式后，tooltip 恢复扁平 label:value 格式，列顺序为 {dims, measures, others}。

**Scenario Description**：PlotArea 新增了列顺序分支逻辑，需确保 DEFAULT 模式行为无回归。

**Pre-condition**：已有含 Dimension + Measure 的图表，Tooltip Style 设置为 Default。

**Key Steps**：
1. 打开图表的 Customize Tooltip 对话框，确认 Tooltip Style 为 "Default"，保存。
2. 悬停数据点，观察 tooltip 内容。
3. 检查 tooltip HTML 结构（不含 tt-tier 类）。
4. 确认 Dimension 显示在 Measure 之前。

**Expected Result**：
- tooltip 无 `.tt-tier-N` 结构，保持原有 label:value 格式
- 列顺序：Dimension → Measure → 其他
- CSS 类为 `widget__default-tooltip`，非 `widget__card-tooltip`；需在浏览器开发工具中确认该 CSS 类在样式表中有实际定义，若类不存在则 DEFAULT 模式 tooltip 样式可能发生回归（Risk #2）

**Risk Covered**：DEFAULT 模式回归、列顺序正确性、CSS 类正确切换

🔴 **测试-分析**：符合预期

---

### Scenario 3：新建图表默认 Tooltip Style 验证

**Scenario Objective**：验证新建图表时的 Tooltip Style 默认值是否符合预期（需与产品确认 CARD 或 DEFAULT）。

**Scenario Description**：`AbstractChartInfo` 字段默认值为 `CARD`，但 Feature 需求描述为 "opt-in"，存在语义歧义，需测试验证实际行为并确认是否为预期设计。

**Key Steps**：
1. 在 Dashboard 中新建一个图表，不做任何 Tooltip Style 设置。
2. 保存并预览，悬停数据点，观察 tooltip 样式。
3. 打开 Customize Tooltip 对话框，查看 Tooltip Style 默认选中项。
4. 记录实际默认值（CARD or DEFAULT）。

**Expected Result**：
- **需与产品确认**：若设计为 opt-in，期望默认 DEFAULT；若新图表默认 CARD 为产品决策，则新建图表显示 Card 样式 tooltip 为预期。
- Customize Tooltip 对话框中选中项与实际 tooltip 样式一致。

**Risk Covered**：AbstractChartInfo 默认值为 CARD 与 opt-in 语义不一致风险

🔴 **测试-分析**：符合预期

---

### Scenario 4：Tooltip Style 持久化与重新加载验证

**Scenario Objective**：验证 Tooltip Style 的设置能正确序列化到 XML 并在重新加载后恢复。

**Scenario Description**：AbstractChartInfo 新增 `tooltipStyle` XML 属性，需确保 save-reload 后样式不丢失。

**Key Steps**：
1. 创建图表，设置 Tooltip Style 为 Card，保存 Dashboard。
2. 关闭并重新打开 Dashboard。
3. 打开 Customize Tooltip 对话框，检查 Tooltip Style 选项。
4. 悬停数据点，确认 tooltip 仍为 Card 样式。
5. 切换为 Default，保存，重新打开，重复验证。

**Expected Result**：
- CARD 设置在 save-reload 后保持为 CARD
- DEFAULT 设置在 save-reload 后保持为 DEFAULT
- tooltip 实际显示与对话框设置一致

**Risk Covered**：XML 序列化/反序列化正确性、持久化一致性

🔴 **测试-分析**：符合预期

---

### Scenario 5：旧版 Dashboard 兼容性验证（无 tooltipStyle 属性）

**Scenario Objective**：确认旧版 Dashboard（XML 中无 tooltipStyle 属性）加载后 tooltip 行为不受影响，默认使用 DEFAULT 样式。

**Scenario Description**：向后兼容是本次变更的显式设计目标，代码中有注释说明 legacy 图表回退 DEFAULT。

**Pre-condition**：准备一个在此 PR 合并前创建的 Dashboard（XML 中不含 `tooltipStyle` 属性）。

**Key Steps**：
1. 加载旧版 Dashboard。
2. 打开图表的 Customize Tooltip 对话框，查看 Tooltip Style 默认值。
3. 悬停数据点，观察 tooltip 样式。

**Expected Result**：
- Tooltip Style 显示为 "Default"
- tooltip 以扁平 label:value 格式显示，无 Card 样式
- 无 JavaScript 错误或渲染异常

**Risk Covered**：向后兼容性、旧 XML 无属性时的默认行为

🔴 **测试-分析**：符合预期

---

### Scenario 6：Tooltip Style 切换后样式实时更新验证

**Scenario Objective**：验证在 Customize Tooltip 对话框中切换 Style 后，tooltip 样式是否及时更新，不需要额外操作。

**Scenario Description**：`tooltipCSS` 仅在 `tooltipString` 变化时更新，存在切换后样式不刷新的潜在问题。

**Key Steps**：
1. 图表 Tooltip Style 设置为 Default，悬停数据点，确认 DEFAULT 样式显示。
2. 不关闭 Dashboard，直接打开 Customize Tooltip，切换为 Card，应用。
3. 立即悬停相同数据点，查看 tooltip 样式是否更新为 Card。
4. 再切换回 Default，悬停数据点，验证是否恢复 DEFAULT 样式。

**Expected Result**：
- 切换 Style 后，下次触发 tooltip 时应正确显示新样式
- 不出现旧样式残留或 CSS 类未切换的情况

**Risk Covered**：tooltipCSS 更新时机问题、CSS 类切换逻辑

🔴 **测试-分析**：符合预期

---

### Scenario 7：超过3条 Tooltip 数据的 Tier 渲染验证

**Objective**：验证超过3条数据时，第4条及后续字段 cap 在 tier-3，数据完整不丢失。

**Description**：`appendTier()` 使用 `Math.min(tier, 3)` 限制最大层级，确保超过3条时样式统一但数据不丢失。

**Pre-condition**：图表含4个以上字段（如 1 Measure + 3 Dimension），Tooltip Style = Card。

**Steps**：
1. 悬停数据点触发 tooltip。
2. 检查所有字段数据完整显示，第3条及以后均为 tt-tier-3 样式。

**Expected Result**：
- 第1个字段 → tt-tier-1（16px），第2个 → tt-tier-2（13px），第3个及以后 → tt-tier-3（11px）
- 示例：1 Measure + 3 Dimension → Measure→tier-1，Dim1→tier-2，Dim2/Dim3→tier-3（均 cap 在 tier-3）
- 所有数据完整显示，无截断丢失

**Risk Covered**：tier cap 边界逻辑、多字段数据完整性

🔴 **测试-分析**：符合预期

---

### Scenario 8：自定义模板 + Card 样式组合验证

**Scenario Objective**：验证 Custom 内容格式下 CARD 样式的模板解析行为，涵盖换行符分割、空行过滤、tier 计数器延续及静态/动态混合渲染。

**Scenario Description**：`renderCard()` 在 `customToolTip` 存在时按换行符切分为多条 tier；tier 计数器在 custom 行与后续自动数据字段之间共享，custom 行先消费计数器，数据字段从剩余 tier 继续递增并 cap 在 3。

**Pre-condition**：图表绑定至少 2 个数据字段（如 Sales、Region），Tooltip Content 设置为 Custom，Tooltip Style 设置为 Card。

**Key Steps**：

*【基础分层 + 超限 cap】*
1. 在 Custom 模板文本框中逐行输入 3-5 行静态内容（每行按回车换行，如依次输入 "Header"、"Sub"、"Detail"、"Extra"），保存后悬停数据点。
2. 确认每非空行渲染为一个 tier div，第 4 行起均为 tt-tier-3，数据完整不丢失。

*【空行与空白字符行过滤】*
3. 模板输入 3 行内容：第 1 行输入 "Line1"，第 2 行为空（直接回车），第 3 行输入 "Line2"，保存后悬停数据点。
4. 确认空行被过滤，仅显示 2 个 tier div（Line1 → tt-tier-1，Line2 → tt-tier-2）。
5. 修改模板第 2 行为纯空白字符（空格或制表符），保存后再次悬停数据点。
6. 确认空白字符行同样被过滤，仍显示 2 个 tier div，无多余空行产生。

*【静态 + 动态占位符混合】*
7. 输入含占位符的混合模板（如依次输入 "订单摘要"、"{0} Year"、"{1} Total"，各行按回车换行），保存后悬停数据点。
8. 确认各行按顺序渲染为 tier div，占位符被正确替换为对应字段数据值，行顺序不变。

**Expected Result**：
- 每非空行 → 一个 tier div，超过 3 行后均为 tt-tier-3，数据不丢失
- 真空行不产生 tier div
- 纯空白字符行（仅含空格、制表符等）不产生 tier div
- 静态文本与占位符混合时行顺序不变，占位符正确替换为数据值

**Risk Covered**：Custom 模板 + CARD 交叉场景、空行过滤逻辑、静态与动态占位符混合渲染

✅ **测试-分析**：Bug #75019 已修复 - `line.isEmpty()` → `line.isBlank()`，正确跳过空白字符行

---

### Scenario 9：堆叠柱状图 + Combined + Card（完整验证）

**Scenario Objective**：验证堆叠柱状图在 Combined Tooltip 开启时，Card 样式能正确将悬停系列的 Measure 置于最突出位置，共享 X 轴维度作为副标题显示，Stack Total 以最大字号突出显示。

**Pre-condition**：
- 堆叠柱状图配置：
  - **X 轴**：绑定 Dimension（如 `Quarter`）
  - **Y 轴**：绑定 **2 个 Measure**（如 `Sum(Sales)`、`Sum(Profit)`）
  - **颜色分组**：绑定 Dimension（如 `Category`，至少 2 个值：Business、Personal）
- Customize Tooltip：Combined Tooltip = 开启，Tooltip Style = Card

**Steps**：
1. 打开 Customize Tooltip 对话框，确认 Combined Tooltip 已开启，Tooltip Style 选 Card，保存。
2. 悬停某个堆叠柱的 **第一个 Measure 数据块**（如 Q3/Business 的 Sales 块），触发 combined tooltip。
3. 观察 tooltip 整体布局和各行字号：
   - 最顶部最大字体行显示的是什么？
   - 紧接其下的小字行显示的是什么？
   - 后续其他 Measure 和 Category 如何显示？
   - 底部 Stack Total 的字号是否最大？

**Expected Result**：
- **第一行（tier-1，16px）**：悬停的 Measure 值，如 `Sum(Sales): 73.3K`
- **第二行（tier-2.subtitle，12px）**：共享 X 轴维度，如 `Quarter: Q3`，仅出现一次
- **第三行（tier-2，13px）**：另一个 Measure 的值，如 `Sum(Profit): 15.2K`
- **第四行（tier-3，11px）**：颜色分组字段，如 `Category: Business`
- **后续行（tier-2/tier-3）**：其他 Category 的 Sales 和 Profit 数据
- **最后一行（tier-1.stack-total，20px）**：Stack Total，如 `Total: 233.2K`，字体最大

**Tier 分配规则验证**：
| 内容 | Tier | 字号 | 验证点 |
|------|------|------|--------|
| 悬停的 Measure | `.tt-tier-1` | 16px | 最突出，位于顶部 |
| 共享 X-dimension | `.tt-tier-2.tt-subtitle` | 12px | 副标题样式，仅显示一次 |
| 其他系列的 Measure | `.tt-tier-2` | 13px | 同位置其他 Measure，次突出 |
| 各系列的其他字段 | `.tt-tier-3` | 11px | Category 等维度信息 |
| Stack Total | `.tt-tier-1.tt-stack-total` | **20px** | 底部总结行，字体最大 |

**设计意图**：通过一个场景完整验证所有 Tier 分配规则，包括单系列和多系列场景的 Stack Total 行为。

🔴 **测试-分析**：Bug #75004 已修复

---

### Scenario 10：堆叠柱状图 + 非 Combined + Card（对比验证）

**Scenario Objective**：验证堆叠柱状图在关闭 Combined Tooltip 时，Card 样式的 Stack Total 是否仍以 20px 大字体突出显示，与 Combined 模式形成对比。

**Pre-condition**：
- 堆叠柱状图配置：
  - **X 轴**：绑定 Dimension（如 `Quarter`）
  - **Y 轴**：绑定 **2 个 Measure**（如 `Sum(Sales)`、`Sum(Profit)`）
  - **颜色分组**：绑定 Dimension（如 `Category`，至少 2 个值：Business、Personal）
- Customize Tooltip：Combined Tooltip = 不选中，Tooltip Style = Card

**Steps**：
1. 打开 Customize Tooltip 对话框，确认 Combined Tooltip 已开启，Tooltip Style 选 Card，保存。
2. 悬停某个堆叠柱的 **第一个 Measure 数据块**（如 Q3/Business 的 Sales 块），触发 combined tooltip。
3. 观察 tooltip 整体布局和各行字号：
   - 最顶部最大字体行显示的是什么？
   - 紧接其下的小字行显示的是什么？
   - 后续其他 Measure 和 Category 如何显示？
   - 底部 Stack Total 的字号是否最大？

**Expected Result**：
- **第一行（tier-1，16px）**：悬停的 Measure 值，如 `Sum(Sales): 73.3K`
- **第二行（tier-2.subtitle，12px）**：共享 X 轴维度，如 `Quarter: Q3`，仅出现一次
- **第三行（tier-2，13px）**：另一个 Measure 的值，如 `Sum(Profit): 15.2K`
- **第四行（tier-3，11px）**：颜色分组字段，如 `Category: Business`
- **后续行（tier-2/tier-3）**：其他 Category 的 Sales 和 Profit 数据
- **最后一行（tier-1.stack-total，20px）**：Stack Total，如 `Total: 233.2K`，字体最大

**Tier 分配规则验证**：
| 内容 | Tier | 字号 | 验证点 |
|------|------|------|--------|
| 悬停的 Measure | `.tt-tier-1` | 16px | 最突出，位于顶部 |
| 共享 X-dimension | `.tt-tier-2.tt-subtitle` | 12px | 副标题样式，仅显示一次 |
| 其他系列的 Measure | `.tt-tier-2` | 13px | 同位置其他 Measure，次突出 |
| 各系列的其他字段 | `.tt-tier-3` | 11px | Category 等维度信息 |
| Stack Total | `.tt-tier-1.tt-stack-total` | **20px** | 底部总结行，字体最大 |

**设计意图**：通过一个场景完整验证所有 Tier 分配规则，包括单系列和多系列场景的 Stack Total 行为。

🔴 **测试-分析**：Bug #75004 已修复

---

### Scenario 11：普通柱状图 + Combined + Card（边界验证）

**Scenario Objective**：验证普通柱状图（非堆叠、无颜色分组）在 Combined Tooltip 开启时，Card 样式仍能正确显示 X 轴维度，确保维度信息不会丢失。

**Pre-condition**：
- 非堆叠柱状图配置：
  - **X 轴**：绑定 Dimension（如 `Quarter`）
  - **Y 轴**：绑定 1 个 Measure（如 `Sum(Sales)`）
  - **颜色分组**：**未绑定**（无）
- Customize Tooltip：Combined Tooltip = 开启，Tooltip Style = Card

**Steps**：
1. 打开 Customize Tooltip 对话框，确认 Combined Tooltip 已开启，Tooltip Style 选 Card，保存。
2. 悬停某个数据点，触发 combined tooltip。
3. 观察 tooltip 布局：
   - X 轴维度是否正确显示？
   - 是否有缺失的维度信息？

**Expected Result**：
- **第一行（tier-1，16px）**：悬停的 Measure 值，如 `Sum(Sales): 73.3K`
- **第二行（tier-2.subtitle，12px）**：X 轴 Dimension，如 `Quarter: Q3`，必须显示
- **无 Stack Total**：非堆叠图无总和

**Tier 分配规则验证**：
| 内容 | Tier | 字号 | 验证点 |
|------|------|------|--------|
| 悬停的 Measure | `.tt-tier-1` | 16px | 最突出，位于顶部 |
| X 轴 Dimension | `.tt-tier-2.tt-subtitle` | 12px | **必须显示**，副标题样式 |

**设计意图**：验证当图表只有 X 和 Y 轴数据（无颜色分组）时，X 轴维度不会丢失，确保维度信息完整性。

🔴 **测试-分析**：Bug #75055

---

### Scenario 12：雷达图 Tooltip 回归验证

**Scenario Objective**：确认雷达图在 DEFAULT 和 CARD 样式下，tooltip 中 dimension 跳过逻辑正确，不出现 dimension 数据误显示或丢失。

**Scenario Description**：`PlotArea` 将雷达图跳过条件从 `k == 0`（数组索引）改为 `cols[k] == dims`（数据类型判断），此修改同时影响 DEFAULT 和 CARD 两种模式。

**Pre-condition**：准备一个雷达图（Radar chart），包含多个 Dimension 和 Measure。

**Key Steps**：
1. 在 DEFAULT 模式下，悬停雷达图数据点，观察 tooltip 中 dimension 内容。
2. 切换为 CARD 模式，悬停同一数据点，观察 tooltip。
3. 对比两种模式下 tooltip 内容是否合理（CARD 模式下 Measure 在前，DEFAULT 模式下 Dimension 在前）。
4. 确认雷达图 tooltip 中 dimension 未被错误跳过或重复显示。

**Expected Result**：
- DEFAULT 模式：雷达图 tooltip 与修复前行为一致（每个点只显示该点 dimension 值）
- CARD 模式：Measure 在 tier-1，dimension 信息正确展示
- 无 dimension 数据错误跳过或重复

**Risk Covered**：雷达图条件修改的回归影响、DEFAULT/CARD 双模式验证

🔴 **测试-分析**：符合预期

---

### Scenario 13：Multi-style Chart + Card 样式 Tooltip 验证

**Objective**：验证 Bar+Line 混合图表在 Card 样式下，各系列的 Measure 正确显示在最突出位置。

**Description**：Multi-style 图表无法开启 Combined Tooltip，始终使用 measures-first 逻辑。需验证不同类型系列悬停时，各自的 Measure 正确显示在 tier-1。

**Pre-condition**：
- 创建 Multi-style 图表：Bar + Line 组合
- **Bar 系列**：Y 轴绑定 `Sum(Sales)`
- **Line 系列**：Y 轴绑定 `Sum(Profit)`
- **共享 X 轴**：绑定 `Quarter`（Dimension）
- Tooltip Style = Card

**Steps**：
1. 打开图表的 Customize Tooltip 对话框，确认 Tooltip Style 选项存在。
2. 选择 Card 样式，点击 OK 保存。
3. 悬停 **Bar 数据点**（柱状图），观察 tooltip：
   - 第一行是否显示 `Sum(Sales)`？
   - 字体是否最大（16px）？
4. 悬停 **Line 数据点**（折线图），观察 tooltip：
   - 第一行是否显示 `Sum(Profit)`？
   - 字体是否最大（16px）？
5. 对比两次 tooltip，确认内容对应各自系列，无交叉混入。

**Expected Result**：
| 悬停对象 | tier-1（16px） | tier-2（13px） | 备注 |
|---------|---------------|----------------|------|
| Bar 数据点 | `Sum(Sales): xxx` | `Quarter: Qx` | Measure 正确对应 Bar 系列 |
| Line 数据点 | `Sum(Profit): xxx` | `Quarter: Qx` | Measure 正确对应 Line 系列 |

**Risk Covered**：Multi-style 各系列独立字段配置、measures-first 逻辑正确性

🔴 **测试-分析**：符合预期

---

### Scenario 14：DC Chart（Date Comparison）+ Card 样式 Tooltip 验证

**Objective**：验证 DC 图表原始 Measure 优先显示在 tier-1，派生对比字段次之。

**Description**：PlotArea 在 cardSolo 模式下将 DC 派生字段排序在前，导致 Change 错误占据 tier-1。期望：原始 Measure → tier-1，Change → tier-2。

**Pre-condition**：开启 Date Comparison 的图表（含原始 Measure、Current、Prior、Change value/Change%），Tooltip Style = Card。

**Steps**：
1. 创建 DC 图表并配置对比字段，设置 Tooltip Style 为 Card，保存。
2. 悬停数据点，检查 tier 分配：**原始 Measure → tier-1**，Change → tier-2，Current/Prior → tier-3，Dimensions → tier-3。
3. 切换为 DEFAULT 样式，验证回归行为。

**Expected Result**：
- **原始 Measure → tier-1**（16px/600，最大字体）
- **Change value/Change% → tier-2**（13px）
- **Current/Prior → tier-3**（11px）
- **Dimensions → tier-3**
- 所有 DC 对比字段完整显示，数值正确，无对象引用错误
- DEFAULT 模式下行为与 PR 前一致

**Risk Covered**：原始 Measure 应占 tier-1、派生字段优先级、DC 数据正确显示、DEFAULT 模式回归

🔴 **测试-分析**：Bug #75030。期望：原始 Measure → tier-1，Change → tier-2。当前实际：Change → tier-1（错误）。

---

### Scenario 15：T&C（Trend & Comparison）+ Card 样式 Tooltip 验证

**Objective**：验证 T&C 场景原始 Measure 占 tier-1，派生字段次之。

**Description**：Bug #75030：T&C 派生字段（Change/Change%/Running Total 等）预期与 DC 一致：原始 Measure → tier-1，派生字段 → tier-2/tier-3。

**Pre-condition**：开启 Trend & Comparison 的图表（含派生字段），Tooltip Style = Card。

**Steps**：
1. 创建 T&C 图表配置派生字段，设置 Tooltip Style 为 Card，保存。
2. 悬停数据点，检查 tier 分配：**原始 Measure → tier-1**，派生字段 → tier-2/tier-3。

**Expected Result**：
- **原始 Measure → tier-1**（16px/600，最大字体）
- **派生字段（Change/Change%/Running Total 等）→ tier-2/tier-3**（按位置顺序）
- 所有派生字段完整显示

**Risk Covered**：T&C 派生字段 tier-1 错位问题

🔴 **测试-分析**：Bug #75030

---

### Scenario 16：Candle / Stock Chart + Card 样式验证

**Objective**：验证 OHLC 字段 tier 分配及 X 轴日期始终为 subtitle

**Description**：Close 在 tier-1，X 轴日期为 subtitle，Open/High/Low 在 tier-2，Y 轴分组维度在 tier-3。

**Pre-condition**：Candle/Stock 图表，绑定 OHLC + 日期维度，可选 Y 轴分组维度（如 `bullOrbear`），Tooltip Style = Card

**Key Steps**：
1. 设置 Tooltip Style 为 Card
2. 悬停 K 线数据点，检查 tier 分配
3. （边界）悬停带 Y 轴分组的 K 线，确认日期仍为 subtitle

**Expected Result**：
- tier-1：Close: value
- tier-1.subtitle：Date: value ← X 轴日期始终为 subtitle
- tier-2：Open/High/Low
- tier-3：Y 轴分组维度（如 `bullOrbear: Bullish`）← 不抢占 subtitle

**Risk Covered**：OHLC 顺序、X 轴日期优先级、Y 轴维度不抢占 subtitle

🔴 **测试-分析**：Bug #75026、#75302 已修复。X 轴日期始终为 subtitle，Y 轴维度在 tier-3。

---

### Scenario 17：Gantt Chart + Card 样式验证

**Objective**：验证 Gantt 图表按层级规则分配字段：任务名称在 tier-1，时间度量在 tier-2，上下文信息在 tier-3

**Description**：根据 Gantt 图表的 tier 分配规则，最内层 Y 维度（任务名称）作为 headline 显示在 tier-1，时间度量（Start/End/Milestone）作为核心数据显示在 tier-2，外层维度和美学字段作为上下文显示在 tier-3。

**Pre-condition**：Gantt 图表，绑定：
- Y 轴：Task（任务名称）+ 可选的分组维度
- Measures：Start、End、Milestone（可选）
- X 轴：日期维度
- 可选绑定颜色/大小等美学字段
- Tooltip Style = Card

**Key Steps**：
1. 设置 Tooltip Style 为 Card
2. 悬停 Gantt 条形
3. 检查各字段的 tier 分配
4. 确认 Task 名称（最内层 Y 维度）显示在最突出位置
5. 确认时间度量（Start/End/Milestone）显示在 tier-2
6. 验证外层维度和美学字段显示在 tier-3

**Expected Result**：
- **Tier 1（headline，16px/600）**：最内层 Y 维度 — 最后一个 `getRTYFields()` 条目（任务名称），最具体标识悬停的条形
- **Tier 2（grouped values，13px）**：Start / End / Milestone — 绑定到悬停元素的日期度量，Gantt 的核心数据
- **Tier 3（context，11px）**：外层 Y 维度 + X 维度 + 所有美学字段（颜色、大小、文本），已通过轴/图例传达的次要上下文
- **Fallback**：无 Y 维度绑定时 → 统一层级，无 headline，所有行平等

**Risk Covered**：Task 名称可见性、字段优先级语义、时间度量核心地位、上下文信息层级

🔴 **测试-分析**：
Bug #75015 已修复。修正后的 Gantt Tooltip 字段顺序：任务名称（最内层 Y 维度）显示在 tier-1，时间度量（Start/End/Milestone）显示在 tier-2，外层维度和美学字段显示在 tier-3，符合语义优先级和用户阅读习惯。
Bug #75307

---

### Scenario 18：Map Chart + Card 样式验证

**Objective**：验证多层地图美学字段过滤在 Card 模式下的正确性，及地名的 tier 位置

**Description**：Map 图表多层钻取时，仅最高层显示美学字段（如颜色分组），低层不显示。此过滤逻辑在 Card 模式下需验证是否影响 tier 分配和地名显示位置。

**Pre-condition**：
- **用例 A（单层地图）**：
  - 地理字段：`State`（州级别）
  - 颜色绑定：`Region`（按区域着色）
- **用例 B（多层地图）**：
  - 地理字段：`State`（州级别）→ `City`（城市级别），支持钻取
  - 颜色绑定：`Region`（按区域着色）

**Key Steps**：
1. 设置 Tooltip Style 为 Card，保存
2. 悬停用例 A 的区域，观察 tooltip 中地名和颜色字段的 tier 分配
3. 悬停用例 B 的 State 层区域，记录 tooltip 内容
4. 钻取至 City 层，悬停城市区域，记录 tooltip 内容
5. 对比 State 层与 City 层的 tooltip 差异

**Expected Result**：
- **用例 A**：`State` 地名显示在 tier-1，`Region` 颜色字段显示在 tier-2
- **用例 B State 层**：`State` → tier-1，`Region` → tier-2（最高层，显示美学字段）
- **用例 B City 层**：`City` → tier-1，`Region` **不显示**（非最高层，美学字段过滤）
- 两层 tooltip 均无布局错乱或字段错误混入

**Risk Covered**：多层地图美学字段过滤是否影响 Card 模式 tier 分配、地名 tier 位置正确性

🔴 **测试-分析**：Bug #75344, 多层地图仅最高层显示美学字段是设计决策，可接受。

---

### Scenario 19：Relation / Network Chart + Card 样式验证

**Objective**：验证根节点与非根节点的字段过滤

**Description**：Relation/Network 图表根节点与非根节点的字段过滤规则不同，根节点排除 Target 和美学字段。

**Pre-condition**：Relation 图表，绑定 Source/Target/度量/颜色/节点大小，Tooltip Style = Card

**Key Steps**：
1. 设置 Tooltip Style 为 Card
2. 悬停根节点，记录显示字段
3. 悬停非根节点，记录显示字段
4. 若绑定 nodeShape，验证根节点是否显示

**Expected Result**：
- 根节点：Source(tier-1)，无 Target 和美学字段
- 非根节点(Target节点)：Target(tier-1) + Source(tier-2) + 美学(tier-3)
- 两类节点均无多余字段混入或布局错乱

**Risk Covered**：根节点/非根节点字段过滤差异

🔴 **测试-分析**：符合预期

---

### Scenario 20：Box Plot + Card 样式验证

**Objective**：验证单度量箱型图的新 tooltip 层级结构

**Description**：单度量箱型图采用专用信息层级：Median 为 tier-1 headline，X维度为 subtitle，Q1/Q3（IQR）在 tier-2，Min/Max 和颜色美学在 tier-3。多度量箱型图沿用原有通用路径。

**Pre-condition**：Box Plot，绑定维度、单一度量、颜色分组维度，Tooltip Style = Card

**Key Steps**：
1. 设置 Tooltip Style 为 Card
2. 悬停单度量 Box Plot 数据点
3. 检查统计量的 tier 分配及 X维度 subtitle

**Expected Result**：
- `Median_[field]` → tier-1，X维度 → tier-1 subtitle
- `Q25_[field]` / `Q75_[field]` → tier-2（IQR 分组）
- `Min_[field]` / `Max_[field]`、颜色维度 → tier-3
- 多度量箱型图行为不变（Max 领先 tier-1）
- 无 X维度时无 subtitle，IQR 仍分组在 tier-2

**Risk Covered**：单度量新层级、X维度 subtitle、IQR 分组、多度量向后兼容

🔴 **测试-分析**：Bug #75341已修复，规则已update

---

### Scenario 21：Word Cloud + Card 样式验证

**Objective**：验证词频与词本身的 tier 分配，记录当前行为作为基线

**Description**：Word Cloud 中词本身为 dim（TextGroup）、词频为 measure，修复后 TextGroup 字段优先显示在 tier-1，符合语义预期。

**Pre-condition**：Word Cloud 图表，绑定文字字段（如 Product）和大小字段（如 Count），Tooltip Style = Card

**Key Steps**：
1. 设置 Tooltip Style 为 Card，保存
2. 悬停词云中任意词，触发 tooltip
3. 记录词本身和词频各自的 tier

**Expected Result**：
- `TextGroup`（词本身）→ tier-1
- `Sum`（词频/度量）→ tier-2
- `others`（颜色分组维度）→ tier-3

**Risk Covered**：Bug #75035 已修复。词本身作为核心标识显示在 tier-1，符合语义预期。

---

### Scenario 22：Sunburst Chart + Card 样式验证

**Objective**：验证 Sunburst 图表在 Card 模式下，悬停不同层级的环时 tooltip tier-1 字段随当前层正确切换

**Description**：Sunburst 所有层级同时可见（内环 = 外层维度，外环 = 内层维度），无需钻取即可对比不同层的 tooltip。tier-1 应始终反映当前悬停环所对应的维度字段。

**Pre-condition**：
- 创建 Sunburst 图表，绑定如下字段：
  - **层级维度**：`Category`（内环）→ `Product`（外环）
  - **大小（Size）**：`Sum(Sales)`
  - **颜色（Color）**：`Region`
- 打开 Customize Tooltip，设置 Tooltip Style = Card，保存

**Key Steps**：
1. 预览图表，确认 Sunburst 内外两层环均可见
2. 悬停**内环**某个扇区（Category 层），观察 tooltip：
   - 最大字体（16px）显示的是哪个字段？
   - 中等字体（13px）显示的是哪个字段？
3. 移动鼠标至同一分组下的**外环**扇区（Product 层），观察 tooltip：
   - 最大字体（16px）显示的是哪个字段？是否仍为 Category？
   - 中等字体（13px）是否出现了 Product？
4. 对比两次 tooltip，确认外环比内环多出 `Product` 字段（tier-2），且 `Sum(Sales)` 层级随之后移

**Expected Result**：

| 悬停位置 | tier-1（16px） | tier-2（13px） | tier-3（11px） |
|----------|----------------|----------------|----------------|
| 内环（Category 环） | `Category: xxx` | `Sum(Sales): xxx` | `Region: xxx` |
| 外环（Product 环） | `Category: xxx` | `Product: xxx` | `Sum(Sales): xxx` |

- **两层 tier-1 均为 Category**（`getCurrentTreeDims()` 始终将顶层维度排在首位）
- 内环为 Category 聚合节点，Product 无具体值不显示，`Sum(Sales)` 升至 tier-2
- 外环有具体 Product 值，出现在 tier-2；`Sum(Sales)` 退至 tier-3
- 核心验证：外环 tooltip 比内环多出 `Product` 字段（tier-2），`Sum(Sales)` 层级随之后移

**Risk Covered**：Sunburst/Treemap 共用 TreemapVO 专属 measures 路径（`getCurrentTreeDims()`）、层级切换对 tier 分配的影响

🔴 **测试-分析**：符合预期

---

### Scenario 23：Scatter Matrix Chart + Card 样式验证

**Objective**：Scatter Matrix 按 #75066 规则分配 tier：分类美学优先 headline，坐标度量 tier-2，补充字段 tier-3

**Pre-condition**：Scatter Matrix：X/Y=Quantity/Paid/Discount；Color=Region；Shape=State；Size=Total；Tooltip Style=Card

**Key Steps**：悬停散点，检查各字段的 tier 分配

**Expected Result**：

| 字段 | Tier | 字号 | 说明 |
|------|------|------|------|
| `Region`（Color） | tier-1 | 16px/600 | 颜色美学优先级最高，成为 headline |
| `State`（Shape） | tier-2 | 13px | 形状美学次之 |
| `Quantity Purchased`/`Paid`/`Discount`（X/Y） | tier-2 | 13px | 坐标度量，结构行 |
| `Total`（Size） | tier-3 | 11px | Size 度量，补充字段 |

**规则说明**：
- Headline 优先级：`color → shape → texture → line → size`，仅分类（非度量）字段符合

**Risk Covered**：美学优先级、度量过滤、结构行 vs 补充字段

🔴 **测试-分析**：#75066， 目前符合设计意图。Region 赢得 headline，Total 在 tier-3 正确。

---

### Scenario 24：Mekko Chart + Card 样式验证

**Objective**：验证 Mekko 图表在 Card 模式下，Measure、外层维度、内层维度三类字段的 tier 分配正确，内层维度不被遗漏

**Description**：Mekko 图表同时有外层维度（X 轴分组）和内层维度（色块细分），两个维度字段均应出现在 tooltip 中，且 Measure 优先于维度字段显示。

**Pre-condition**：
- 创建 Mekko Chart，绑定如下字段：
  - **外层维度（X-axis）**：`Category`
  - **内层维度（Color/细分）**：`Sub-Category`
  - **Y-axis Measure**：`Sum(Sales)`
- 打开 Customize Tooltip，设置 Tooltip Style = Card，保存

**Key Steps**：
1. 预览图表，悬停任意一个色块，触发 tooltip
2. 检查 tooltip 共显示几行，各行字体大小是否有层级差异
3. 逐行确认：
   - 最大字体（16px）行显示的是哪个字段？
   - 中等字体（13px）行显示的是哪个字段？
   - 最小字体（11px）行显示的是哪个字段？
4. **重点确认**：`Sub-Category`（内层维度）是否出现在 tooltip 中

**Expected Result**：

| tier | 字号 | 显示字段 | 验证重点 |
|------|------|----------|----------|
| tier-1 | 16px | `Sum(Sales): xxx` | Measure 优先，最突出 |
| tier-2 | 13px | `Category: xxx` | 外层维度 |
| tier-3 | 11px | `Sub-Category: xxx` | **内层维度必须出现，不可缺失** |

- 三个字段均完整显示，`Sub-Category` 不被意外过滤掉

**Risk Covered**：Mekko 内层维度在 Card 模式下的 tier 分配正确性、内层维度字段完整性

🔴 **测试-分析**：符合预期

---

### Scenario 25：非图表组件不显示 Tooltip Style 选项验证

**Scenario Objective**：确认 Tooltip Style 选项（Default/Card 单选按钮）仅在图表组件的 Customize Tooltip 中显示，非图表组件（如 Table、Text）中不显示。

**Scenario Description**：`tip-customize-dialog.component.html` 使用 `*ngIf="model.chart"` 控制显示，需验证条件判断正确。

**Key Steps**：
1. 打开 Table 组件的 Tooltip 对话框，确认无 "Tooltip Style" 选项。
2. 打开 Chart 组件的 Tooltip 对话框，确认有 "Tooltip Style" 选项（Default/Card）。

**Expected Result**：
- 仅 Chart 类型组件显示 Tooltip Style 选项
- Table、Text 等非 Chart 组件的 Tooltip 对话框不显示该选项
- 无 UI 错位或布局异常

**Risk Covered**：UI 条件渲染、非图表组件回归

🔴 **测试-分析**：符合预期

---

### Scenario 26：本地化文本验证

**Scenario Objective**：验证新增 i18n key（`_#(Tooltip Style)`、`_#(Default)`、`_#(Card)`）在各语言环境下正确显示，无 key 直出或乱码。

**Key Steps**：
1. 切换系统语言为非英文（如中文/日文），打开 Chart Customize Tooltip 对话框。
2. 检查 "Tooltip Style"、"Default"、"Card" 标签的显示文本。

**Expected Result**：
- 各语言均显示对应翻译文本，不出现 `_#(...)` 原始 key
- 若翻译文件未更新，至少英文默认文本正确显示

**Risk Covered**：本地化遗漏风险

🔴 **测试-分析**：Bug #75021(没有本地化)

---

### Scenario 27：文档一致性验证

**Scenario Objective**：验证新增的 Card Tooltip 功能在官方文档中有完整、准确的说明，确保用户能够了解并正确使用该功能。

**Scenario Description**：Feature #74894 为图表组件新增了 Tooltip Style 选项（Default/Card），此功能需要在用户文档中进行说明。需验证 `AddTipsToChart.adoc` 文档包含对 Card 样式的完整说明，包括功能介绍、配置步骤和视觉差异对比。

**Pre-condition**：访问官方文档系统，定位到 `AddTipsToChart.adoc`（或对应中文文档）。

**Key Steps**：
1. 打开文档 `modules/viewsheet/pages/AddTipsToChart.adoc`，定位到 Custom Tooltip 章节。
2. 检查是否包含 Tooltip Style 选项的说明（Default/Card 单选按钮）。
3. 检查是否描述了 Card 样式的视觉特点（tier-1/tier-2/tier-3 分层布局）。
4. 检查是否包含 Default 与 Card 样式的对比说明。
5. 检查是否包含配置步骤说明。
6. 检查是否有相关截图或示例辅助说明。

**Expected Result**：
- 文档中明确说明 Tooltip Style 选项及其两个取值（Default/Card）
- Card 样式的分层视觉特点有清晰描述
- 配置步骤完整，用户可按文档完成设置
- 包含 Default 与 Card 样式的行为差异说明

**Risk Covered**：文档更新遗漏、功能说明不完整导致用户无法正确使用新功能

🔴 **测试-分析**：merge后报文档的bug
