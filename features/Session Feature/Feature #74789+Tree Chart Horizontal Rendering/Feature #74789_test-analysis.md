# Feature #74789 测试分析报告：为树图添加布局方向选项

> **输入完整性说明**
> - ✅ Feature #74789 描述可访问，需求信息完整
> - ✅ PR #3616 diff 内容完整，涵盖 9 个文件变更
> - ✅ 知识库文档（chart.md）可访问，包含 RelationElement / VGraph 渲染管线详情
> - ✅ 官方 Help 文档（inetsoft.com/docs）网络访问受限，已经从PDF中获取

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：树图（Tree Chart）当前仅支持垂直（从上到下）布局，本 Feature 新增布局方向选项，支持 4 个方向：Top to Bottom、Bottom to Top、Left to Right、Right to Left。
- **用户价值**：消除了树图只能纵向渲染的限制，用户可根据层级结构的宽度/深度、屏幕空间及视觉偏好选择最合适的展开方向，提升数据可读性。
- **Feature 类型**：UI + Rendering（新增 UI 控件，影响图表几何坐标计算与渲染输出）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

| 层次 | 变更内容 |
|------|----------|
| **数据模型** | `PlotDescriptor` 新增 `treeLayout` 字段（默认 `TOP_BOTTOM`），定义 4 个常量；`setTreeLayout` 对非法值自动回退 `TOP_BOTTOM`；XML 序列化仅在非默认值时写出该属性（向后兼容） |
| **渲染引擎** | `RelationElement` 新增 `horizontal`、`flipped` 两个布尔字段；`COMPACT_TREE` 布局从写死 `false` 改为传入 `horizontal`；新增 `flipMajorAxis()` 方法对节点坐标和边路径做 180° 镜像翻转 |
| **桥接层** | `GraphGenerator.initRelationElement()` 从 `PlotDescriptor.treeLayout` 派生 `horizontal` / `flipped` 并注入 `RelationElement` |
| **模型层** | `ChartPlotOptionsPaneModel` 新增 `treeLayout`、`treeLayoutVisible`（仅 `CHART_TREE` 时为 true）字段及读写方法；`updateChartPlotOptionsPaneModel` 对所有图表类型写入 `treeLayout`（确保切换图表类型时值能保留） |
| **前端 UI** | `chart-plot-options-pane.component.html` 在 `treeLayoutVisible=true` 时显示「Layout Direction」下拉框，4 个选项与常量对应 |
| **国际化** | `srinter.properties` 新增 `Bottom to Top`、`Left to Right`、`Right to Left`、`Top to Bottom`、`Layout Direction` 5 条文本 |

### 目标覆盖度

| Feature 需求点 | PR 实现情况 |
|----------------|-------------|
| 支持水平（Left to Right）布局 | ✅ 通过 `horizontal=true, flipped=false` 实现 |
| 支持 4 个方向（含 Bottom to Top / Right to Left） | ✅ `flipMajorAxis()` 处理翻转逻辑 |
| UI 控件展示与绑定 | ✅ 下拉框 + ngModel 双向绑定 |
| 值持久化（XML 保存/读取） | ✅ `parseXML` / `writeXML` 已处理 |
| 脚本支持（Bug #74966） | ⚠️ **PR diff 中未见脚本 API 新增代码**，需确认是否在其他 commit 或后续 PR 中处理 |
| 轴尺寸异常（Bug #74971 / #75050，切换方向后轴变大） | ⚠️ PR 中未见专项修复，关联 Bug 标记 Closed/New，需独立验证 |
| 刷新性能（Bug #74993） | ⚠️ 关联 Bug 标记 New，未在本 PR 解决 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|-----------------|----------------|------|
| 树图固定从上到下布局，无方向选项 | 「图表属性 → Plot」面板出现「Layout Direction」下拉框（仅树图可见） | 新控件在非树图类型是否完全隐藏 |
| `COMPACT_TREE` 布局 `horizontal` 写死为 `false` | 根据用户选择传入 `horizontal` | 水平树图节点坐标计算正确性 |
| 无翻转逻辑 | 选择 `BOTTOM_TOP` / `RIGHT_LEFT` 时触发 `flipMajorAxis()`，对所有节点坐标和边路径做镜像 | 边路径 waypoints 翻转后连接是否正确；节点文本标签位置是否跟随 |
| `treeLayout` 不存在，旧 XML 无该属性 | 读取旧 XML 无该属性时默认 `TOP_BOTTOM`，渲染行为不变 | 向后兼容，已有存档图表方向应保持不变 |
| 非法 `treeLayout` 值会被接受 | 非法值自动 fallback 为 `TOP_BOTTOM` | REST API / 手动编辑 XML 注入非法值时行为可预期 |
| `treeLayout` 仅 `CHART_TREE` 时有意义 | `updateChartPlotOptionsPaneModel` 对所有图表类型都写入该值 | 切换图表类型后再切回树图，方向值是否正确保留 |

---

## 第三部分：Risk Identification（风险识别）

1. **[Rendering] 翻转坐标计算精度**：`flipMajorAxis()` 通过 `bound - x - width` 镜像节点，边路径 waypoints 通过 `bound - x` 镜像（不减宽度）。边的原始 geometry `x/y` 也被镜像（不减宽高），若 `bound` 计算不准确（如节点未完全在正坐标域），翻转后节点与边端点会对不齐。

2. **[Rendering] 轴尺寸异常（关联 Bug #74971 / #75050）**：切换到 Left/Right 方向后 X 轴变大；Top/Bottom + Swap XY 后 Y 轴变大。虽关联 Bug 标注 Closed/New，实际修复代码未见于本 PR diff，需重点回归。

3. **[Functional] 脚本支持缺失**：关联 Bug #74966（add script for Layout Direction）标注 Closed，但 PR diff 中未见脚本 API 代码，需确认脚本接口是否已在其他入口实现，否则用户无法通过脚本动态切换方向。

4. **[Compatibility] 向后兼容**：旧版存档（无 `treeLayout` XML 属性）加载后应保持 `TOP_BOTTOM`；若默认值逻辑有误会导致已有树图布局突变。

5. **[Cross-Module] 图表类型切换时的值保留**：`treeLayout` 对所有图表类型均写入，切换到非树图再切回时值应保留，但不应在非树图上触发任何渲染变化。

6. **[Rendering] 文本标签位置**：翻转后节点文本标签（VOText）是否跟随节点正确渲染，还是仍基于旧坐标偏移，需视觉验证。

7. **[Performance] 大规模树图刷新性能（关联 Bug #74993）**：切换布局方向触发完整重绘，在节点数量较多时响应速度是否可接受。

8. **[Export / Print] 导出后方向一致性**：`flipMajorAxis()` 在后端渲染，PDF/Image/Excel 导出依赖后端 `VGraph.paintGraph()`；需验证导出结果与页面预览方向一致。

9. **[Localization] UI 文本本地化**：新增 5 条 `srinter.properties` 英文条目，其他语言包是否同步更新。

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点

- 4 个布局方向在页面的视觉渲染是否正确（根节点位置、子节点展开方向、边连线方向）
- 翻转后节点与边路径是否对齐（无节点与连线错位）
- 节点文本标签是否随节点一起翻转
- 旧版存档加载后方向保持 `TOP_BOTTOM` 不变

### 高风险路径

1. **Top→Bottom（默认）→ Left→Right → Bottom→Top → Right→Left** 四方向循环切换，实时观察渲染变化
2. **切换方向 + 保存 + 重新打开**，验证持久化与还原
3. **水平方向（Left/Right）下配合 Swap XY**，观察轴标签/轴尺寸异常
4. **节点数量较多（>50节点）的树图**切换方向，观察性能与布局完整性
5. **通过脚本设置布局方向**（如已实现）
6. **导出 PDF/Image**，与页面预览对比方向一致性
7. **加载无 `treeLayout` 属性的旧版 `.vso` 文件**

### 涉及模块

- Chart 属性面板（Plot 选项卡）
- 树图渲染引擎（RelationElement / RelationCoord）
- 图表导出（PDF / Image / Excel）
- 脚本引擎（如有 script API）
- 视图表存档（保存 / 加载 `.vso`）

### 专项检查

- **本地化**：新增「Layout Direction」、「Top to Bottom」、「Bottom to Top」、「Left to Right」、「Right to Left」共 5 条 UI 文本需验证多语言（中/日/德等已支持语言）是否正确显示。
🔴 **测试-分析**：已经添加

- **脚本兼容**：
  - 确认 `layoutDirection` 或对应脚本属性是否已在脚本 API 中可用
  - UI 下拉框选项与脚本设置值（`"TOP_BOTTOM"` 等常量）是否同步
  - 脚本 Auto-complete 是否包含新属性
🔴 **测试-分析**：Bug #74966
- **文档一致性**：Tree Chart 帮助文档（`inetsoft.com/docs/.../TreeChart.html`）应新增「Layout Direction」选项的说明；验证 Help 图标是否指向正确页面锚点。
🔴 **测试-分析**：后期处理
- **Print Layout / Export 影响**：`flipMajorAxis()` 直接操作节点/边几何坐标，影响后端渲染输出，需在 PDF 导出和打印预览中验证 4 个方向的输出效果。
🔴 **测试-分析**：显示正确

### Mobile 影响检查
🔴 **测试-分析**：显示正确

下拉框新控件出现在 Plot 选项面板，需验证：
- 移动端属性面板中「Layout Direction」下拉框是否可正常展开/选择
- 水平方向树图在窄屏（< 400px）下是否溢出或截断

---

## 第五部分：Key Test Scenarios（核心测试场景）

---

### TC-01：默认布局方向验证（Top to Bottom）

**Scenario Objective**：确认新功能不破坏树图原有默认从上到下的布局。

**Scenario Description**：新版本新增了布局方向控件，默认值若配置错误，将导致所有现有树图在升级后自动改变布局，影响大量用户。

**Pre-condition**：已有一个包含树图的 Viewsheet，图表数据包含至少 2 层层级关系。

**Key Steps**：
1. 打开 Viewsheet，进入树图的「图表属性」对话框，切换至「Plot」选项卡。
2. 确认「Layout Direction」下拉框显示为「Top to Bottom」。
3. 关闭对话框，观察图表渲染结果。

**Expected Result**：树图根节点在顶部，子节点向下展开，与 Feature 引入前的外观完全一致；「Layout Direction」下拉框默认选中「Top to Bottom」。

**Risk Covered**：默认行为变化、向后兼容

---

🔴 **测试-分析**：节点显示正确

### TC-02：切换为 Left to Right 布局

**Scenario Objective**：验证水平方向（从左到右）布局能正确渲染树图。

**Scenario Description**：水平布局是本次 Feature 的核心新增方向，渲染引擎需要将原本纵向的节点坐标映射到横向，若坐标转换有误，节点会出现错位或重叠。

**Pre-condition**：树图含 3 层以上层级，同层节点数量 ≥ 3。

**Key Steps**：
1. 打开树图「图表属性 → Plot」，将「Layout Direction」改为「Left to Right」。
2. 点击「OK」，观察图表区域。
3. 检查所有节点位置、连线方向及节点文本标签。

**Expected Result**：根节点出现在图表左侧，子节点向右展开；同层节点垂直排列，不重叠；连线从父节点右边连至子节点左边；节点内文本标签显示完整，未偏移出节点边界。

**Risk Covered**：水平方向渲染正确性、节点与边对齐

---

🔴 **测试-分析**：节点显示正确

### TC-03：切换为 Bottom to Top 布局

**Scenario Objective**：验证从下到上翻转布局后节点与边路径的坐标镜像是否准确。

**Scenario Description**：Bottom to Top 需要在后端对所有节点坐标和边路径 waypoints 做 180° 翻转，若翻转计算边界值有误，边的起止点将与节点位置不匹配，出现「连线悬空」或「连线穿透节点」的视觉错误。

**Key Steps**：
1. 在「Layout Direction」中选择「Bottom to Top」，点击「OK」。
2. 观察根节点位置与连线走向。
3. 将鼠标悬停至各连线端点，确认端点落在节点内。

**Expected Result**：根节点在图表底部，子节点向上展开；每条连线的两端均准确连接到对应节点，无悬空或错位；节点文本标签在节点内正常显示。

**Risk Covered**：翻转坐标计算精度、边路径 waypoints 镜像

---

🔴 **测试-分析**：旋转正确

### TC-04：切换为 Right to Left 布局

**Scenario Objective**：验证「水平 + 翻转」组合（Right to Left）渲染正确。

**Scenario Description**：Right to Left 同时启用水平轴和翻转逻辑，是两个变量叠加的最复杂场景，翻转边界值计算用的是水平轴（X）的最大值，若与垂直翻转时的 Y 轴逻辑混用，将导致坐标系错乱。

**Key Steps**：
1. 在「Layout Direction」中选择「Right to Left」，点击「OK」。
2. 观察根节点位置、子节点排列及连线走向。
3. 对比「Left to Right」方向，确认图形为其水平镜像。

**Expected Result**：根节点在图表右侧，子节点向左展开；图形整体是「Left to Right」的水平镜像；所有连线端点准确落在节点上。

**Risk Covered**：水平轴翻转、horizontal + flipped 组合逻辑

---

🔴 **测试-分析**：Bug #75095

### TC-05：布局方向保存与加载还原

**Scenario Objective**：确认选定的布局方向在保存并重新打开后能正确还原。

**Scenario Description**：布局方向涉及新的 XML 属性序列化，若写入或读取逻辑有误，用户保存后重新打开图表，方向会被重置为默认值，导致设置丢失。

**Key Steps**：
1. 将「Layout Direction」设为「Left to Right」，保存 Viewsheet。
2. 关闭并重新打开该 Viewsheet。
3. 打开「图表属性 → Plot」，检查「Layout Direction」的值及图表渲染方向。

**Expected Result**：「Layout Direction」仍显示「Left to Right」；图表渲染方向与保存时一致，根节点在左侧。

**Risk Covered**：XML 序列化/反序列化、持久化正确性

---
🔴 **测试-分析**：加载值保持

### TC-06：旧版存档向后兼容（无 treeLayout 属性）

**Scenario Objective**：确认升级后加载不含 `treeLayout` 属性的旧版树图存档，布局不发生变化。

**Scenario Description**：若旧版存档在读取时未能正确采用默认值，会导致所有现有用户的树图在升级后布局突变，属于严重回归。

**Pre-condition**：准备一个在本次 Feature 引入前保存的树图 `.vso` 文件（XML 中不含 `treeLayout` 属性）。

**Key Steps**：
1. 将旧版 `.vso` 文件导入系统，打开对应 Viewsheet。
2. 观察树图布局方向。
3. 打开「图表属性 → Plot」，确认「Layout Direction」的值。

**Expected Result**：树图保持从上到下的布局，与旧版本外观一致；「Layout Direction」显示「Top to Bottom」。

**Risk Covered**：向后兼容、默认值回退

---

🔴 **测试-分析**：旧版本是top to bottom

### TC-07：非树图类型不显示 Layout Direction 控件

**Scenario Objective**：确认「Layout Direction」控件仅在树图类型下可见，其他图表类型不显示。

**Scenario Description**：`treeLayoutVisible` 标志位控制控件可见性，若判断逻辑有误（如误将网络图、环形图等也判定为 true），其他图表将显示无意义的方向选项，干扰用户并可能引入数据状态污染。

**Key Steps**：
1. 分别创建或打开「网络图（Network）」、「环形图（Circular）」、「柱状图（Bar）」等非树图类型。
2. 对每种图表打开「图表属性 → Plot」选项卡。
3. 检查是否出现「Layout Direction」下拉框。

**Expected Result**：上述所有非树图类型的 Plot 面板中均不出现「Layout Direction」控件。

**Risk Covered**：控件可见性控制、非树图回归

---

🔴 **测试-分析**：非树图类型不显示 Layout Direction 控件

### TC-08：图表类型切换时 treeLayout 值保留

**Scenario Objective**：确认将树图切换为其他图表类型后再切回，已选的布局方向不会丢失。

**Scenario Description**：`treeLayout` 对所有图表类型均写入以保留值，但若切换图表类型的路径未正确保留该值，用户每次切回树图都需要重新设置方向，体验下降。

**Key Steps**：
1. 在树图中将「Layout Direction」设为「Bottom to Top」，点击「OK」。
2. 打开「图表类型」面板，将图表改为「柱状图」，确认并关闭。
3. 再次将图表类型改回「树图」，打开「图表属性 → Plot」。

**Expected Result**：「Layout Direction」仍显示「Bottom to Top」；图表渲染为从下到上的布局。

**Risk Covered**：图表类型切换时的值保留、跨模块状态一致性

---

🔴 **测试-分析**：图表类型切换时 treeLayout 值保留

### TC-09：布局方向与 PDF/图片导出一致性

**Scenario Objective**：确认导出的 PDF 和图片中树图方向与页面预览一致。

**Scenario Description**：布局方向的翻转由后端渲染引擎在坐标生成阶段完成，导出时同样走后端渲染管线，若导出路径未正确传递方向参数，导出结果将与页面显示不一致。

**Pre-condition**：树图已设置为「Left to Right」方向。

**Key Steps**：
1. 在预览模式下确认树图方向为从左到右。
2. 将 Viewsheet 导出为 PDF，检查导出文件中树图的方向。
3. 再次导出为 PNG/图片，检查方向。

**Expected Result**：PDF 和图片导出中，树图均呈现从左到右的布局，与页面预览一致；节点与连线无错位。

**Risk Covered**：导出渲染一致性、Print Layout 影响

---
🔴 **测试-分析**：导出和preview一致

### TC-10：水平方向下的轴尺寸异常回归（关联 Bug #74971 / #75050）

**Scenario Objective**：验证切换布局方向后图表轴（坐标轴标签区域）不出现异常放大。

**Scenario Description**：关联 Bug 报告显示，从 Top to Bottom 切换到 Left to Right 时 X 轴变大；在 Top to Bottom + Swap XY 时 Y 轴变大。即使关联 Bug 标注 Closed，也需回归确认本 PR 未引入或未修复该问题。

**Key Steps**：
1. 设置「Layout Direction」为「Top to Bottom」，记录图表轴区域大小。
2. 切换为「Left to Right」，观察 X 轴区域是否异常扩大。
3. 切回「Top to Bottom」，并启用「Swap XY」，观察 Y 轴区域是否异常扩大。

**Expected Result**：4 个布局方向下，轴标签区域大小保持合理，不出现大幅异常扩大；图表绘图区域充分利用可用空间。

**Risk Covered**：轴尺寸计算回归（Bug #74971 / #75050）

---

🔴 **测试-分析**：Bug #74971 ，#75050

### TC-11：脚本动态设置布局方向

**Scenario Objective**：验证可以通过 Viewsheet 脚本动态修改树图的布局方向。

**Scenario Description**：关联 Bug #74966（add script for Layout Direction）已关闭，说明脚本支持被视为需求的一部分，若脚本无法操作该属性，用户将无法通过动态逻辑（如响应参数变化切换方向）使用此功能。

**Key Steps**：
1. 在 Viewsheet 脚本中编写代码对树图设置布局方向属性（如 `chart.layoutDirection = "LEFT_RIGHT"`，以实际 API 为准）。
2. 执行脚本，观察树图是否切换为对应方向。
3. 在脚本编辑器中验证属性名 Auto-complete 是否提示该新属性。

**Expected Result**：脚本成功修改布局方向，树图实时更新为指定方向；Auto-complete 提示中包含新增的布局方向属性。

**Risk Covered**：脚本 API 完整性、UI 与脚本同步

---
🔴 **测试-分析**：Bug #74966

### TC-12：非法布局方向值的容错处理

**Scenario Objective**：确认通过 REST API 或手动编辑 XML 传入非法方向值时，系统能安全回退而非崩溃。

**Scenario Description**：`setTreeLayout()` 对未知值做了 fallback 处理，但需验证实际生效，防止手动编辑存档文件或 REST 客户端传入任意字符串时触发异常渲染或错误状态。

**Pre-condition**：可访问 Viewsheet XML 文件或 REST API。

**Key Steps**：
1. 手动编辑 Viewsheet XML，将 `treeLayout` 属性值改为任意非法字符串（如 `"DIAGONAL"`）。
2. 重新加载该 Viewsheet，打开树图。
3. 查看「Layout Direction」下拉框显示值及图表渲染方向。

**Expected Result**：系统不报错；「Layout Direction」显示为「Top to Bottom」（默认值）；树图正常渲染为从上到下布局。

**Risk Covered**：非法输入容错、安全性

---

🔴 **测试-分析**：忽略不需要手动修改

### TC-13：移动端 Layout Direction 控件可用性

**Scenario Objective**：确认在移动端或小屏幕下「Layout Direction」下拉框可正常显示和操作。

**Scenario Description**：属性面板在移动端布局受限，新增的下拉框控件可能因宽度不足被截断或遮挡，导致用户无法选择选项。

**Key Steps**：
1. 在移动端浏览器（或将桌面浏览器缩窄至 ≤ 400px）打开带树图的 Viewsheet。
2. 进入树图「图表属性 → Plot」面板。
3. 尝试展开并选择「Layout Direction」下拉框中的选项。

**Expected Result**：下拉框完整显示「Layout Direction」标签；点击后能展开 4 个选项且选项文字完整；选择后值正确更新。

**Risk Covered**：Mobile 端 UI 响应式兼容、新控件在小屏幕下的可用性

---

🔴 **测试-分析**：移动端正常显示

### TC-14：Layout Direction 本地化文本验证

**Scenario Objective**：验证「Layout Direction」及 4 个方向选项在所有已支持语言下均正确显示本地化文本。

**Scenario Description**：新增了 5 条国际化文本，若非英文语言包未同步添加翻译，对应语言用户将看到英文原文或显示为空，影响产品一致性。

**Key Steps**：
1. 分别将系统语言切换为中文、日文等已支持语言（视实际支持语言而定）。
2. 打开树图「图表属性 → Plot」面板。
3. 检查「Layout Direction」标签及下拉选项文本。

**Expected Result**：所有已支持的非英文语言界面中，「Layout Direction」及 4 个方向选项均显示对应语言的翻译文本（而非英文原文或空白）。

**Risk Covered**：本地化文本完整性

---
🔴 **测试-分析**：已经添加

### TC-15：帮助文档同步更新验证

**Scenario Objective**：确认 Tree Chart 的官方帮助文档已包含「Layout Direction」选项的说明。

**Scenario Description**：新增功能若未在文档中说明，用户无法了解各方向选项的含义及使用场景，降低功能可发现性与可用性。

**Key Steps**：
1. 在树图「图表属性 → Plot」面板中，点击「Help」图标（若存在）。
2. 打开 `inetsoft.com/docs/.../TreeChart.html` 文档页面。
3. 在页面中搜索「Layout Direction」相关内容。

**Expected Result**：帮助文档包含「Layout Direction」选项的说明，描述 4 个方向（Top to Bottom / Bottom to Top / Left to Right / Right to Left）的效果；Help 链接能正确定位到该说明章节。

**Risk Covered**：文档一致性、功能可发现性
🔴 **测试-分析**：后续验证