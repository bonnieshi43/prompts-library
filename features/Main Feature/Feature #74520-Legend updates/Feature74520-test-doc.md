---

doc_type: feature-test-doc
product: StyleBI
module: Chart - Legend
Feature_id: 74520
Feature: Legend updates
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3424
Assignee: Stephen Webster
last_updated: 2026-07-03
version: stylebi-1.2.0

---

# 1 Feature Summary

**核心目标**：优化图例（Legend）的视觉外观与空间利用，具体包含四项：
1. 新增圆角边框选项（Round Corner）
2. 优化布局以节省空间（新增内边距 BORDER_PADDING / 外间隙 OUTER_GAP）
3. 修复内容区与图例项之间背景色不一致的问题（"weird background color"）
4. 增加内边距（padding）

**用户价值**：改善图例视觉观感陈旧、间距拥挤、内容区背景色与外层背景不一致的问题，提升整体 Look and Feel（关联 Epic #74519）。

> Notes：需求未定义圆角默认值（新建/历史图表是否一致）、未定义具体像素量化标准；实现方自行决定"新图表默认开启圆角、历史图表默认关闭"，且 BORDER_PADDING/OUTER_GAP 对所有图例全局无条件生效（来源：分析MD 一/2）。Ticket 曾由 Resolved 改为 Closed，附言 "May need more work"，测试阶段应保持更高警惕（来源：PDF History）。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 圆角开关（Round Corner）的勾选/渲染基础功能
- 内容区与外层背景色一致性修复
- 图例整体 padding（内边距）生效效果

## P1 - Functional Path

- 历史 Viewsheet 加载后的图例尺寸兼容性（默认圆角=false）
- 新建图表默认圆角行为（默认圆角=true）
- 图例项交互命中区域（tooltip / 下钻 / 选中）与视觉位置一致性
- 圆角效果在打印预览与 PDF/Excel/Image 导出中的一致性
- 单图例图表布局宽度回归（移除单图例限宽逻辑）
- 多语言环境下 "Round Corner" 标签本地化
- `roundCorners` 属性在 Spec/Descriptor/DialogModel/前端 DTO 四层间的一致性
- 圆角/直角两条边框绘制路径的描边一致性（不越界绘制 56446、双线支持 53529）
- 脚本（Script）API 对 `roundCorners` 的读写支持（关联 Bug #75561）

## P2 - Extended Path （按需测试）

- 极小尺寸图例下的内容区计算边界情况
- 仅含标题、无图例项的最小尺寸计算
- Scalar（渐变）图例与普通分类图例在圆角裁剪/内容偏移上的一致性
- 多图例极端宽度比例分配下的全宽填充策略
- 大量图例项 + 圆角绘制的性能表现
- `border-radius` 在不同浏览器下的渲染一致性
- 移动端/小屏幕下 `outerGap` 偏移导致的压缩或裁切

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | 圆角开关基础渲染 | 1. 打开图表设计器图例格式对话框；2. 勾选 "Round Corner"，观察图例边框与背景；3. 取消勾选，再次观察 | 勾选后图例边框与背景呈现圆角（半径约10px，对应代码20px直径）；取消后恢复直角 | | 来源：PDF 需求点1 |
| TC-2 | 内容区背景色一致性修复 | 1. 渲染一个包含图例的图表；2. 对比图例内容区（items）背景色与外层背景色 | 内容区与外层背景色无色差，不再出现原有的"奇怪背景色"问题 | | 来源：PDF 需求点3 |
| TC-3 | Padding 内边距生效验证 | 1. 渲染带图例的图表；2. 观察图例项与图例边框之间的间距 | 图例项与边框之间存在统一内边距（8px BORDER_PADDING），视觉上不再贴边拥挤 | | 来源：PDF 需求点2/4 |
| **P1** |
| TC-4 | 历史 Viewsheet 加载兼容性 | 1. 加载改动前创建、不含 `roundCorners` 属性的历史 Viewsheet；2. 观察图例边框形态；3. 对比图例区域与相邻组件是否重叠/裁剪 | 图例默认直角；尺寸虽因新增 padding 略有变化，但不与相邻仪表板元素重叠或内容被裁剪 | 🔴 对bc的没有影响 | 来源：分析MD 场景1（测试结果已验证） |
| TC-5 | 新建图表默认圆角行为 | 1. 新建图表并添加含图例的维度/度量；2. 不做任何格式设置，查看"Round Corner"复选框初始状态及实际渲染 | 复选框默认勾选，图例边框与背景呈现圆角效果 | 🔴 结果正确默认圆角 | 来源：分析MD 场景2（测试结果已验证）；需与产品确认默认开启是否符合预期（需求未明确定义） |
| TC-6 | 图例项交互命中区域一致性 | 1. 分别对普通分类图例与 Scalar 渐变图例的图例项进行鼠标悬浮；2. 验证 tooltip 弹出位置是否对齐图例项视觉区域；3. 若配置下钻，点击验证是否正确触发 | tooltip 与点击命中区域均与图例项视觉位置精确对齐，两种图例类型表现一致 | 🔴 结果正确，不影响tooltip | 来源：分析MD 场景3（测试结果已验证）；风险来源：`ListLegendContentArea` 坐标偏移补偿逻辑被移除 |
| TC-7 | 导出与打印一致性 | 1. 为图例开启圆角；2. 分别执行打印预览、导出PDF、导出Excel、导出Image；3. 对比四种输出中图例圆角/内边距/背景色是否与 Viewer 一致 | 各导出格式图例视觉效果与 Viewer 渲染保持一致，圆角半径约10px | 🔴 导出没问题 | 来源：分析MD 场景4（测试结果已验证） |
| TC-8 | 单图例图表布局宽度回归 | 1. 使用仅含单个、内容较少（2-3项）图例的图表；2. 对比改动前后图例区域占用宽度 | 需与产品/设计方确认宽度变化是否为预期；若非预期应视为回归缺陷 | 🔴 单图例表现正常 | 来源：分析MD 场景5（测试结果已验证）；风险来源：`LegendGroup.layoutTB()` 移除单图例限宽逻辑 |
| TC-9 | 多语言环境本地化验证 | 1. 切换系统/界面语言为非英文（如中文）；2. 打开图例格式面板查看"Round Corner"对应标签文本 | 标签显示为对应语言翻译文本，而非英文原文或资源 key | 🔴 本地化已经添加 | 来源：分析MD 场景6（测试结果已验证） |
| TC-10 | roundCorners 四层数据一致性 | 1. 在对话框中设置圆角；2. 保存后检查 `LegendSpec`（运行时）、`LegendsDescriptor`（XML持久化）、`LegendFormatDialogModel`/`LegendFormatGeneralPaneModel`（对话框）、`LegendContainer`（前端DTO）四层是否同步 | 四层数据一致，无设置丢失或显示不一致；`equals`/`hashCode`/`writeXML`/`parseAttributes` 往返序列化正确 | | 来源：分析MD 风险识别/自动化建议（需补充验证） |
| TC-11 | 圆角/直角边框绘制路径一致性 | 1. 分别测试圆角与直角两种边框；2. 验证描边宽度、"不越界绘制"（56446）、双线支持（53529）在两条路径下是否均生效 | 两条绘制路径（`RoundRectangle2D` vs `Common.drawRect`）在描边宽度、像素对齐、既有修复效果上保持一致 | | 来源：分析MD 实现分析 2（需补充验证） |
| TC-12 | 脚本 API 对 roundCorners 的读写支持 | 1. 通过脚本尝试读取/设置图例 `roundCorners` 属性；2. 观察 UI 与实际渲染是否同步 | `roundCorners` 可通过脚本读写，且设置后 UI 与渲染同步一致 | | 🔴 关联 Bug #75561，来源：分析MD 风险6（PR diff 未包含脚本绑定层改动，需补充验证） |
| **P2** |
| TC-13 | 极小尺寸图例边界情况 | 1. 将图例容器尺寸设置为接近或小于 `BORDER_PADDING + OUTER_GAP` 总和；2. 观察内容区计算与图例项排列 | 内容区计算不出现负值，图例项不出现异常挤压重叠 | | 来源：分析MD 边界与异常 |
| TC-14 | 仅标题无图例项最小尺寸 | 1. 创建仅显示标题、无图例项的图例；2. 观察新增 padding 下最小尺寸计算 | 最小尺寸计算正确，标题区域不因 padding 变化而异常 | | 来源：分析MD 边界与异常 |
| TC-15 | Scalar 图例与分类图例圆角裁剪一致性 | 1. 分别对 Scalar 渐变图例、普通分类图例开启圆角；2. 对比内容偏移与圆角裁剪表现 | 两种图例类型在圆角裁剪、内容区偏移上表现一致 | | 来源：分析MD 边界与异常 |
| TC-16 | 多图例极端宽度比例全宽填充 | 1. 创建多个图例且宽度分配比例极端（某图例占比极小）；2. 观察全宽填充策略下的视觉效果 | 各图例按分配比例填满宽度，无异常挤压或溢出 | | 来源：分析MD 边界与异常 |
| TC-17 | 大量图例项圆角绘制性能 | 1. 创建包含大量分类项的长列表图例并开启圆角；2. 触发联动筛选等频繁重绘场景，观察渲染耗时 | 渲染耗时相较直角矩形绘制无明显退化 | | 来源：分析MD 性能测试 |
| TC-18 | border-radius 跨浏览器渲染一致性 | 1. 在桌面端主流浏览器中分别打开含圆角图例的图表 | 圆角视觉呈现在各浏览器间基本一致 | | 来源：分析MD 兼容性测试 |
| TC-19 | 移动端/小屏幕 outerGap 响应式验证 | 1. 在移动端/小屏幕下查看图例区域；2. 观察 `outerGap` 偏移是否导致图例被过度压缩或边框裁切；3. 测试图例拖拽/缩放交互 | 小尺寸容器下图例不被过度压缩或裁切，触摸场景下移动/缩放偏移计算正确 | | 来源：分析MD 功能验证-Mobile |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
无直接安全相关改动，本次改动集中于渲染与布局层，暂无需专项安全测试。

## Performance
关注圆角绘制（`RoundRectangle2D` 裁剪 + 描边）在大量图例项、频繁刷新（如联动筛选）场景下相较原矩形绘制的渲染耗时是否有明显退化（见 TC-17）。整体性能风险较低，改动集中在布局常量与绘制路径分支判断，未引入额外重复计算或高频调用路径。

## Compatibility
- 新建图表 vs. 历史图表加载后 `roundCorners` 默认值差异验证（新建=true，历史加载=false）
- 历史保存的 Viewsheet XML（不含 `roundCorners` 属性）加载后应正确回退为 `false`，且图例尺寸变化不应影响仪表板整体布局可用性
- `border-radius` CSS 样式跨浏览器渲染一致性（见 TC-18）

## 本地化
"Round Corner" 复选框标签在非英文环境下需有对应翻译资源（见 TC-9，🔴 分析MD 结论：本地化已经添加）。PR diff 未直接包含资源文件改动，此前存在潜在遗漏风险，测试结果显示已解决，建议仍做一次多语言环境的回归确认。

## script
`roundCorners` 属性是否已加入脚本可控属性列表，脚本设置后 UI 与渲染是否同步（见 TC-12，关联 Bug #75561，PR diff 未包含脚本绑定层改动，需补充验证）。

## 文档/API
无对外 API 文档变更需求，`LegendContainer`/`LegendFormatDialogModel` 等为内部 DTO 变更，暂不涉及公开 API 文档更新。

## 配置检查
验证 `LegendSpec`/`LegendsDescriptor` 的 `equals`/`hashCode`/`writeXML`/`parseAttributes` 是否完整同步 `roundCorners` 字段，并确认是否存在遗漏的 `clone()`/深拷贝方法未同步更新（见 TC-10）。

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- **Chart（图表渲染）**：所有包含图例的图表，因 `BORDER_PADDING`（8px）/`OUTER_GAP`（4px）全局无条件生效，图例尺寸与位置整体变化
- **Dashboard / Viewsheet**：历史保存的图例位置/大小在重新打开后可能与相邻内容出现重叠或错位
- **图例分组布局（LegendGroup）**：单图例图表因移除"限宽"逻辑，宽度表现可能变化
- **图例交互（Tooltip / 下钻 / 选中）**：`ListLegendContentArea` 坐标偏移补偿逻辑被移除，命中区域计算方式变化
- **Export（PDF / Excel / Image 导出）与打印预览**：底层 Graphics2D 绘制路径变化，需验证导出管线是否复用同一套 `Legend.paint()` 逻辑
- **Script API**：图例格式相关脚本可控属性列表可能需要补充 `roundCorners`
- **多语言资源**：新增 UI 文本 "Round Corner" 依赖的本地化资源

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75561 | 脚本（Script）与导出（Export）路径对 `roundCorners` 的同步支持情况未在本次 PR diff 中体现，可能影响脚本可控属性完整性及导出效果一致性 | 状态未在 PDF/PR 材料中明确标注，来源为分析MD 风险6，需在测试阶段单独核实并确认当前状态 |

> 说明：Feature #74520 对应的 PDF（Redmine Issue）中未列出关联的 New/Request Feedback 状态 Bug 子任务（Subtasks 为空）。上表中的 Bug #75561 为分析MD 中提及的关联风险项，其准确状态需人工在 Issue Tracker 中确认后补充。

---
