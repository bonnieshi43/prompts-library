# Feature #74894 测试分析报告
> Add card-style chart tooltip | PR #3655 | 分析日期：2026-05-15

---

## 输入完整性检查

- PR diff：完整（17个文件，9页）
- Feature 描述：完整
- Knowledge 知识库文档：未提供，分析基于 PR diff 与 Feature 需求

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

3. **[中 / Functional] 雷达图 tooltip 条件修改影响 DEFAULT 模式**：`cols[k] == dims` 的修改在 DEFAULT 和 CARD 模式下均生效，属于附带的行为变更，需验证雷达图在 DEFAULT 模式下 tooltip 的正确性。

4. **[中 / Rendering] tooltipCSS 仅在 tooltipString 变化时更新**：CSS 类切换逻辑嵌入在 `if(tooltipString != this.tooltipString)` 块内，若 Tooltip Style 发生变化但 tooltip 内容未变，CSS 类不会立即刷新，导致样式无法实时生效。

5. **[中 / Functional] Custom 模板 + CARD 样式**：自定义模板按换行符切分为多条 tier，超过3条后，第4条起的内容均渲染为 tt-tier-3 样式，导致数据视觉上无差异，可能引发误解。

6. **[中 / Functional] Combined Tip + CARD 样式**：`renderCard()` 依赖 `(-1, -1)` separator 跳过逻辑，需验证多图表 combined tooltip 在 CARD 模式下的正确分隔与渲染。

7. **[中 / Functional] Multi-style Chart + CARD 样式**：Multi-style 图表因代码限制无法开启 Combined Tooltip，CARD 模式下始终进入 `cardSolo = true` 分支（measures-first）。Multi-style 每个 series 有独立的 dims/measures 配置，不同 series 数据点悬停时 tier-1 内容可能不一致，存在字段混入或排序混乱风险。

8. **[中 / Functional] DC Chart + CARD 样式**：Date Comparison 图表的对比字段（Current、Prior、Change%）均被归入 `measures` 数组，`cardSolo = true` 时全部提升至 tier-1 优先级。多个对比 measure 并列在 tier-1 后视觉层级是否合理存在不确定性；同时 `DCMergeCell` 数据需经 `getOriginalData()` 解包，需确认解包值在 CARD 模式下正确渲染。

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
- 雷达图 tooltip 在 DEFAULT 和 CARD 模式下的正确性
- 官方文档是否同步更新 Card Tooltip 功能说明

**高风险路径**：
- 新建图表后直接查看 tooltip，验证默认样式
- 图表含3条以上 tooltip 数据时的 tier 渲染
- 自定义模板 + CARD 样式组合
- 切换 Tooltip Style 后不刷新页面直接查看 tooltip 是否更新
- DEFAULT 模式下 tooltip 的 CSS 类是否正常
- Multi-style 图表（Bar+Line 等混合类型）各 series 数据点悬停时 tier 排序一致性
- DC 图表对比字段（Current/Prior/Change%）在 CARD 模式下的 tier 分配与数值正确性

**涉及模块**：Chart 渲染、Tooltip Customize Dialog、Dashboard Viewer/Editor、Binding Editor、Date Comparison（DC）、Multi-style Chart

**专项检查**：
- **本地化**：新增 `_#(Tooltip Style)`、`_#(Default)`、`_#(Card)` i18n key，需验证各语言环境下文本正确。
- **脚本兼容**：`tooltipStyle`（Card/Default 样式）**未注册 Script 属性**，无法通过脚本读写，Auto-complete 不会出现该属性。现有 `Chart1.toolTip` 属性对应的是自定义模板文本（`customTooltip` 字段），与样式控制无关；`getToolTip()` 始终返回 `null`，为只写属性。若需脚本动态切换 Card/Default 样式，当前版本不支持，需确认是否为有意设计。
- **文档一致性**：Customize Tooltip 对话框新增选项，需验证 Help 文档是否同步更新。
- **Mobile 影响**：`max-width: 40vw / max-height: 40vh / overflow: hidden` 在窄屏设备下需验证内容是否被裁剪。

---

## 第五部分：Key Test Scenarios（核心测试场景）

| # | 场景 | 分组 |
|---|---|---|
| 1 | Card 样式 Tooltip 基础渲染验证 | 核心功能 |
| 2 | DEFAULT 样式 Tooltip 回归验证 | 核心功能 |
| 3 | 新建图表默认 Tooltip Style 验证 | 数据一致性 |
| 4 | Tooltip Style 持久化与重新加载验证 | 数据一致性 |
| 5 | 旧版 Dashboard 兼容性验证 | 数据一致性 |
| 6 | Tooltip Style 切换后样式实时更新验证 | 交互与边界 |
| 7 | 超过3条 Tooltip 数据的 Tier 渲染验证 | 交互与边界 |
| 8 | 自定义模板 + Card 样式组合验证（含换行符、空格行、tier延续、DEFAULT对比） | 交互与边界 |
| 9 | 雷达图 Tooltip 回归验证 | 特定图表类型 |
| 10 | Combined Tip + Card 样式验证 | 特定图表类型 |
| 11 | Multi-style Chart + Card 样式 Tooltip 验证 | 特定图表类型 |
| 12 | DC Chart（Date Comparison）+ Card 样式 Tooltip 验证 | 特定图表类型 |
| 13 | 非图表组件不显示 Tooltip Style 选项验证 | UI 专项 |
| 14 | 本地化文本验证 | UI 专项 |
| 15 | 文档一致性验证 | UI 专项 |

---

### Scenario 1：Card 样式 Tooltip 基础渲染验证

**Scenario Objective**：验证 CARD 模式下 tooltip 正确生成 tt-tier 分层结构，Measure 值显示在最大字体层，同类型字段共享相同 tier。

**Scenario Description**：这是本次 PR 的核心功能验证，确保 `renderCard()` 方法的 tier 生成逻辑及 CSS 样式正确。

**Pre-condition**：已有一个含 Measure + 多个 Dimension 的图表（如柱状图），X-axis 绑定至少 2 个 Dimension（如 Year、Employee），Y-axis 绑定 1 个 Measure，将 Tooltip Style 设置为 Card。

**Key Steps**：
1. 打开 Dashboard，选择含多个 Dimension 和 Measure 的图表。
2. 进入 Chart Properties → Customize Tooltip，选择 "Card" 样式，保存。
3. 鼠标悬停在图表数据点上，触发 tooltip 显示。
4. 检查 tooltip 的 HTML 结构（浏览器开发工具）。
5. 观察 tooltip 视觉呈现：圆角、居中对齐、字体层级。

**Expected Result**：
- tooltip 渲染为包含 `.tt-tier-1`、`.tt-tier-2`、`.tt-tier-3` 的 div 结构
- **所有 Measure** → `.tt-tier-1`（16px / font-weight 600）
- **所有 Dimension** → `.tt-tier-2`（13px）
- **所有 Others** → `.tt-tier-3`（11px）
- 同类型字段（如多个 Dimension）应共享相同 tier 和视觉权重，不依赖绑定顺序
- 整体外观：圆角8px、居中文字、border + box-shadow

**Risk Covered**：Card 样式核心渲染、Measure 提升至首行、同类型字段一致的 tier 分配

🔴 **测试-分析**：关联 Bug #75000 - 维度字段 tier 分配应基于语义类型而非绑定顺序

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

**Scenario Objective**：验证当 tooltip 数据超过3条时，后续数据均渲染为 tt-tier-3 样式，且数据完整显示（不截断）。

**Scenario Description**：`appendTier()` 使用 `Math.min(tier, 3)` 将第4条及后续内容均映射为 tier-3，需确认数据不被丢弃，仅样式统一。此场景聚焦 **tier cap 边界逻辑**，与 Scenario 1 的基础渲染验证互补。

**Pre-condition**：图表含4个以上字段（如 1 Measure + 3 Dimension），Tooltip Style 设置为 Card。

**Key Steps**：
1. 悬停图表数据点，触发 tooltip。
2. 检查 tooltip 中是否包含所有字段数据。
3. 确认第3条及之后所有数据均使用 `tt-tier-3` CSS 类。
4. 确认无数据被截断或丢失。

**Expected Result**：
- 所有 Measure → tt-tier-1（16px）
- 所有 Dimension → tt-tier-2（13px）
- 所有 Others → tt-tier-3（11px）
- 超过3条后仅样式统一为 tier-3，数据完整显示不丢失

**Risk Covered**：tier cap 边界逻辑、多字段数据完整性

🔴 **测试-分析**：需在 Scenario 1 的 bug fix 验证通过后执行

---

### Scenario 8：自定义模板 + Card 样式组合验证

**Scenario Objective**：验证 Custom 内容格式下 CARD 样式的模板解析行为，涵盖换行符分割、空行过滤、tier 计数器延续及静态/动态混合渲染。

**Scenario Description**：`renderCard()` 在 `customToolTip` 存在时按换行符切分为多条 tier；tier 计数器在 custom 行与后续自动数据字段之间共享，custom 行先消费计数器，数据字段从剩余 tier 继续递增并 cap 在 3。

**Pre-condition**：图表绑定至少 2 个数据字段（如 Sales、Region），Tooltip Content 设置为 Custom，Tooltip Style 设置为 Card。

**Key Steps**：

*【基础分层 + 超限 cap】*
1. 在 Custom 模板文本框中逐行输入 3-5 行静态内容（每行按回车换行，如依次输入 "Header"、"Sub"、"Detail"、"Extra"），保存后悬停数据点。
2. 确认每非空行渲染为一个 tier div，第 4 行起均为 tt-tier-3，数据完整不丢失。

*【空行过滤】*
3. 模板输入 3 行内容，其中第 2 行直接按回车跳过（不输入任何字符），形如：第 1 行输入 "Line1"，第 2 行为空（按回车），第 3 行输入 "Line2"，保存后悬停数据点。
4. 确认空行不产生 tier div，最终仅 2 个 tier div（Line1 → tt-tier-1，Line2 → tt-tier-2）。

*【静态 + 动态占位符混合】*
5. 输入含占位符的混合模板（如依次输入 "订单摘要"、"{0} Year"、"{1} Total"，各行按回车换行），保存后悬停数据点。
6. 确认各行按顺序渲染为 tier div，占位符被正确替换为对应字段数据值，行顺序不变。

**Expected Result**：
- 每非空行 → 一个 tier div，超过 3 行后均为 tt-tier-3，数据不丢失
- 真空行不产生 tier div
- 静态文本与占位符混合时行顺序不变，占位符正确替换为数据值

**Risk Covered**：Custom 模板 + CARD 交叉场景、空行过滤逻辑、静态与动态占位符混合渲染

🔴 **测试-分析**：Bug #75019

---

### Scenario 9：雷达图 Tooltip 回归验证

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

### Scenario 10：Combined Tip + Card 样式验证

**Scenario Objective**：验证 Combined Tooltip 与 CARD 样式的交互正确性。

**Scenario Description**：`renderCard()` 依赖 `(-1, -1)` separator 跳过逻辑，Combined Tip 场景是潜在的边界情况。实际代码中 Combined + CARD 时 `cardSolo = false`，列顺序保持 `{dims, measures, others}`（dims-first），共享 Dimension 作为合并 tooltip 的首行标题。

**Pre-condition**：折线图（含多系列），开启 Combined Tooltip，Tooltip Style 设置为 Card；另准备一个堆叠柱状图 + Combined Tooltip + Card。

**Key Steps**：
1. 配置 Combined Tooltip = 开启，Tooltip Style = Card，保存。
2. 悬停数据点，触发合并 tooltip，检查 HTML 结构。
3. 确认共享 Dimension 在 tier-1（dims-first 顺序），各系列数据正常渲染为 `.tt-tier-N` 结构，无 `-1` 索引值泄露。
4. 切换至堆叠柱状图 + Combined + Card，验证底部 Stack Total 行以 tier-1 样式显示。

**Expected Result**：
- Combined + CARD 模式下列顺序为 dims-first
- separator marker `(-1, -1)` 被正确跳过，不出现在 tooltip 显示内容中
- 堆叠图 Stack Total 以 tt-tier-1 样式强调显示

**Risk Covered**：Combined Tip 与 CARD 样式交互、cardSolo 条件判断、separator 跳过逻辑

🔴 **测试-分析**：我认为期望的分析的不对，报了Bug #75002(dim display in first)，Bug #75004（for stack chart）

---

### Scenario 11：Multi-style Chart + Card 样式 Tooltip 验证

**Scenario Objective**：验证 Multi-style 图表在 CARD 样式下，各 series 数据点的 tooltip tier 排序正确，measures-first 逻辑不因不同 series 类型产生异常。

**Scenario Description**：Multi-style 图表无法开启 Combined Tooltip，因此始终进入 `cardSolo = true` 分支（measures-first）。每个 series 有独立的 dims/measures 配置，需验证不同 series 悬停时 tier-1 内容正确对应。

**Pre-condition**：Multi-style 图表（如 Bar + Line），各 series 绑定不同 Measure，共享 Dimension，Tooltip Style 设置为 Card。

**Key Steps**：
1. 进入 Customize Tooltip，确认 Tooltip Style 选项可见，设置为 Card 并保存。
2. 分别悬停 Bar 和 Line series 数据点，检查各自 tooltip：
   - tier-1 展示对应 series 的 Measure
   - tier-2 展示 Dimension，无跨 series 字段混入

**Expected Result**：
- Tooltip Style 选项在 Multi-style 图表上正确显示
- 各 series 的 Measure 值在 tier-1（最大字体），Dimension 在 tier-2
- 不同 series 悬停时 tooltip 内容正确对应，无字段错位或空白

**Risk Covered**：Multi-style per-series 字段配置下 cardSolo measures-first 排序正确性、Tooltip Style UI 入口可用性

---

### Scenario 12：DC Chart（Date Comparison）+ Card 样式 Tooltip 验证

**Scenario Objective**：验证 Date Comparison 图表在 CARD 样式下，对比 Measure 字段（当前值、对比值、变化量）的 tier 分配合理，不出现 tier-1 过度拥挤或对比字段显示异常。

**Scenario Description**：DC 图表的对比字段（comparison measures，如同期对比值、变化率）在 PlotArea 中被归入 `measures` 数组。CARD + 非 Combined Tooltip 场景下（`cardSolo = true`），所有 measures 包括对比字段均提升至 tier-1 优先级。DC 图表通常产生 2～3 个对比 measure，全部进入 tier-1 后实际视觉层级是否合理需要验证。此外，DC 图表数据含 `DCMergeCell`，代码在 PlotArea 第1342行进行特殊解包（`getOriginalData()`），需确认解包后值在 CARD 样式下正确显示。

**Pre-condition**：创建一个启用了 Date Comparison 的图表（含当前期、对比期、变化量等字段），Tooltip Style 设置为 Card。

**Key Steps**：
1. 创建图表并开启 Date Comparison，配置对比字段（如 Current、Prior、Change%）。
2. 进入 Customize Tooltip，设置 Tooltip Style 为 Card，保存。
3. 悬停图表数据点，触发 tooltip。
4. 检查 tooltip 中各对比 measure 字段（Current、Prior、Change%）所在的 tier 层级。
5. 确认 `DCMergeCell` 解包后的原始数值正确显示，无 `[object Object]` 或乱码。
6. 切换回 DEFAULT 样式，对比两种模式下 DC tooltip 内容的差异。

**Expected Result**：
- DC 对比 measure 字段（Current / Prior / Change%）均正常出现在 tooltip 中
- CARD 模式下所有 measure 字段（含 DC 对比字段）从 tier-1 开始依次渲染，超过3条后降为 tier-3
- `DCMergeCell` 解包后显示为可读的原始数值，非对象引用
- DEFAULT 模式下 DC tooltip 内容与引入此 PR 前行为一致（回归）

**Risk Covered**：DC 对比 measure 在 cardSolo measures-first 排序下的 tier 分配、DCMergeCell 解包后在 CARD 模式下的正确渲染

🔴 **测试-分析**：场景1规则明确后(看是按字段类型分组，还是位置)，再check dc

---

### Scenario 13：非图表组件不显示 Tooltip Style 选项验证

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

### Scenario 14：本地化文本验证

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

### Scenario 15：文档一致性验证

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
