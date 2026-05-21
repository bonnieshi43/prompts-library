---
doc_type: feature-test-doc
product: StyleBI
module: Chart
Feature_id: 74789
Feature: Add layout direction option for tree charts
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3616
Assignee: Franky Pan
last_updated: 2026-05-21
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：为树图（Tree Chart）新增「Layout Direction」布局方向选项，支持 Top to Bottom / Bottom to Top / Left to Right / Right to Left 四个方向，用户可在图表属性 Plot 面板中通过下拉框选择。

**用户价值**：树图原本只能从上到下垂直展开，无法适应层级宽度大于深度的数据结构。新增方向选项后，用户可根据数据特征和屏幕空间选择最合适的展开方向，提升层级关系的可读性。

---

# 2 Test Focus

## P0 - Core Path

- 4 个布局方向（Top to Bottom / Bottom to Top / Left to Right / Right to Left）在图表区域的渲染方向是否正确
- 布局方向保存后重新加载能正确还原
- 旧版存档（无 treeLayout 属性）加载后默认 Top to Bottom，渲染不变

## P1 - Functional Path

- 翻转方向（Bottom to Top / Right to Left）下节点坐标与边路径 waypoints 是否对齐，无连线悬空或穿透节点
- 节点文本标签随节点翻转后位置是否正确
- 非树图类型（Network / Circular / Bar 等）不显示 Layout Direction 控件
- 图表类型切换（树图 → 其他 → 树图）后布局方向值正确保留
- 水平方向下配合 Swap XY，轴尺寸不出现异常扩大（关联 Bug #74971 / #75050）
- Top to Bottom + Swap XY 后轴尺寸正常（关联 Bug #75050）
- 非法方向值（手动编辑 XML 或 REST API 传入）自动 fallback 为 Top to Bottom
- 导出 PDF / 图片，方向与页面预览一致
- 脚本动态设置布局方向生效，Auto-complete 包含新属性（关联 Bug #74966）

## P2 - Extended Path（按需测试）

- 节点数量较多（> 50 节点）时切换方向的渲染性能（关联 Bug #74993）
- 移动端 / 小屏幕下 Layout Direction 下拉框可正常展开和选择
- 多语言下「Layout Direction」及 4 个方向选项文本正确本地化
- Help 文档包含 Layout Direction 说明

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 默认方向为 Top to Bottom | 1. 打开含树图的 Viewsheet<br>2. 进入图表属性 → Plot 选项卡<br>3. 查看 Layout Direction 下拉框默认值<br>4. 关闭对话框，观察图表 | Layout Direction 默认显示「Top to Bottom」；树图根节点在顶部，子节点向下展开，与旧版外观一致 | | 默认行为变化；向后兼容 |
| TC-2 | Left to Right 布局渲染 | 1. 图表属性 → Plot，将 Layout Direction 改为「Left to Right」<br>2. 点击 OK<br>3. 检查根节点位置、子节点排列方向、连线走向、节点文本标签 | 根节点在左侧，子节点向右展开；同层节点垂直排列不重叠；连线从父节点右侧连至子节点左侧；节点文本完整显示在节点内 | | 核心新增方向 |
| TC-3 | Bottom to Top 布局渲染 | 1. 将 Layout Direction 改为「Bottom to Top」，点击 OK<br>2. 观察根节点位置及连线走向<br>3. 悬停连线端点，确认端点在节点内 | 根节点在底部，子节点向上展开；每条连线两端准确落在对应节点上，无悬空或错位 | | 翻转坐标计算精度 |
| TC-4 | Right to Left 布局渲染 | 1. 将 Layout Direction 改为「Right to Left」，点击 OK<br>2. 观察根节点位置及子节点排列<br>3. 与 Left to Right 对比，确认为其水平镜像 | 根节点在右侧，子节点向左展开；图形整体是 Left to Right 的水平镜像；连线端点准确落在节点上 | | horizontal + flipped 组合 |
| TC-5 | 布局方向保存与加载还原 | 1. 将 Layout Direction 设为「Left to Right」，保存 Viewsheet<br>2. 关闭并重新打开<br>3. 检查 Layout Direction 值及图表渲染方向 | Layout Direction 仍显示「Left to Right」；图表渲染方向与保存时一致 | | XML 序列化/反序列化 |
| TC-6 | 旧版存档向后兼容 | 1. 导入 Feature 引入前保存的树图 .vso 文件（XML 无 treeLayout 属性）<br>2. 观察树图布局<br>3. 打开图表属性 → Plot 查看 Layout Direction 值 | 布局保持从上到下，与旧版外观一致；Layout Direction 显示「Top to Bottom」 | | 向后兼容；需准备旧版存档文件 |
| **P1** | | | | | |
| TC-7 | 翻转方向节点与边对齐验证 | 1. 使用含 3 层以上层级、同层 ≥ 3 节点的树图<br>2. 分别切换到 Bottom to Top 和 Right to Left<br>3. 放大图表，逐一检查每条连线的起止端点是否落在节点内 | 所有连线端点均准确连接到对应节点；无连线悬空、穿透节点或明显偏移 | | 翻转边路径 waypoints 镜像精度 |
| TC-8 | 节点文本标签随翻转正确显示 | 1. 分别切换 4 个布局方向<br>2. 检查每个节点的文本标签位置 | 4 个方向下节点文本标签均完整显示在节点内，无偏移出节点边界的情况 | | VOText 位置跟随节点翻转 |
| TC-9 | 非树图类型不显示 Layout Direction | 1. 分别打开网络图、环形图、柱状图的图表属性 → Plot 面板<br>2. 检查是否出现 Layout Direction 控件 | 上述非树图类型 Plot 面板中均不出现 Layout Direction 下拉框 | | treeLayoutVisible 控制逻辑 |
| TC-10 | 图表类型切换后方向值保留 | 1. 树图中设置 Layout Direction 为「Bottom to Top」，点击 OK<br>2. 将图表类型改为柱状图，确认并关闭<br>3. 再切回树图，打开图表属性 → Plot | Layout Direction 仍显示「Bottom to Top」；图表渲染为从下到上布局 | | 跨图表类型值保留 |
| TC-11 | 水平方向 + Swap XY 轴尺寸回归 | 1. 切换到「Left to Right」，记录轴区域尺寸<br>2. 启用 Swap XY，观察 X 轴区域变化<br>3. 切回「Top to Bottom」再启用 Swap XY，观察 Y 轴区域 | 轴标签区域大小保持合理，无异常扩大；绘图区域充分利用可用空间 | | 🔴 关联 Bug #74971（Closed）/ #75050（New） |
| TC-12 | 非法方向值 fallback 处理 | 1. 手动编辑 Viewsheet XML，将 treeLayout 属性改为非法字符串（如 `DIAGONAL`）<br>2. 重新加载 Viewsheet<br>3. 检查 Layout Direction 值及图表渲染 | 系统不报错；Layout Direction 显示「Top to Bottom」；树图正常渲染为从上到下布局 | | 非法输入容错；REST API 传入非法值同测 |
| TC-13 | 导出 PDF / 图片方向一致性 | 1. 设置树图为「Left to Right」，在页面预览确认方向<br>2. 导出为 PDF，检查方向<br>3. 导出为 PNG/图片，检查方向 | PDF 和图片中树图均呈现从左到右布局，与页面预览一致；节点与连线无错位 | | 导出渲染一致性 |
| TC-14 | 脚本动态设置布局方向 | 1. 在 Viewsheet 脚本中设置树图布局方向属性（以实际 API 为准）<br>2. 执行脚本，观察树图是否切换到对应方向<br>3. 在脚本编辑器确认 Auto-complete 包含该属性 | 脚本成功修改布局方向，树图实时更新；Auto-complete 提示包含新属性 | | 🔴 关联 Bug #74966（Closed）；PR diff 中未见脚本 API 代码，需确认实现 |
| **P2** | | | | | |
| TC-15 | 大规模树图切换方向性能 | 1. 使用节点数 > 50 的树图<br>2. 依次切换 4 个方向，记录每次渲染响应时间 | 每次方向切换响应时间在可接受范围内（建议 < 3s）；无页面卡死或超时 | | 关联 Bug #74993（New） |
| TC-16 | 移动端 Layout Direction 控件可用性 | 1. 在移动端浏览器或将桌面浏览器宽度缩至 ≤ 400px<br>2. 打开树图图表属性 → Plot<br>3. 展开 Layout Direction 下拉框并选择选项 | 下拉框完整显示标签；能展开 4 个选项且文字完整；选择后值正确更新 | | 移动端小屏幕适配 |
| TC-17 | 多语言本地化文本验证 | 1. 将系统语言切换为中文、日文等已支持语言<br>2. 打开树图图表属性 → Plot<br>3. 检查 Layout Direction 标签及 4 个方向选项文本 | 所有已支持语言下，Layout Direction 及 4 个选项均显示对应语言翻译，无英文原文残留或空白 | | 5 条新增 i18n 文本验证 |
| TC-18 | Help 文档包含 Layout Direction 说明 | 1. 在图表属性 Plot 面板点击 Help 图标（若有）<br>2. 访问 Tree Chart 帮助文档页面<br>3. 搜索「Layout Direction」相关内容 | 帮助文档包含 Layout Direction 选项说明，描述 4 个方向效果；Help 链接能正确定位到该章节 | | 文档一致性；docurl 受限，需人工访问验证 |

---

# 4 Special Testing

## Security

不涉及权限或数据安全变更，无需专项测试。

## Performance

**TC-15** 覆盖大规模树图切换方向的响应性能，按需执行。
关联 Bug #74993（Tree chart refreshes slowly when changes are made）状态 New，该性能问题尚未解决，测试时需记录基线数据。

## Compatibility

**旧版存档兼容**：TC-6 覆盖无 `treeLayout` 属性的旧版 `.vso` 文件加载。
`treeLayout` 仅在非默认值时写入 XML，默认值 `TOP_BOTTOM` 不写出，确保旧版解析工具不受影响。

## 本地化

新增 5 条 `srinter.properties` 文本：

| Key | 英文值 |
|---|---|
| `Bottom\ to\ Top` | Bottom to Top |
| `Left\ to\ Right` | Left to Right |
| `Right\ to\ Left` | Right to Left |
| `Top\ to\ Bottom` | Top to Bottom |
| `Layout\ Direction` | Layout Direction |

需验证所有已支持语言包是否同步添加对应翻译（TC-17）。

## Script

关联 Bug #74966（add script for Layout Direction）标注 Closed，但 **PR #3616 diff 中未见脚本 API 相关代码**，需在测试前确认：
- 脚本属性名称（以实际实现为准）
- 属性值格式（`"TOP_BOTTOM"` / `"LEFT_RIGHT"` 等常量字符串）
- Auto-complete 是否已注册新属性

测试场景见 TC-14。

## 文档/API

- Tree Chart 帮助文档（`inetsoft.com/docs/.../TreeChart.html`）需新增 Layout Direction 选项说明（TC-18）。
- 若有 REST API 文档，`PlotDescriptor.treeLayout` 字段的合法值需在 API 文档中说明。
- `setTreeLayout()` 对非法值 fallback 为 `TOP_BOTTOM` 的行为需在 API 文档中注明。

## 配置检查

无新增 `SreeEnv` 属性或 `defaults.properties` 变更，不需要配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响说明 | 优先级 |
|---|---|---|
| **Chart - Tree Chart 渲染** | `COMPACT_TREE` 布局参数由写死 `false` 改为动态传入，核心渲染路径变更 | P0 |
| **Chart - RelationElement** | 新增 `flipMajorAxis()` 对节点/边几何坐标做后处理，影响所有调用该元素的图表类型渲染 | P0 |
| **Chart - Network / Circular Chart** | 同用 `RelationElement`，需回归确认非树图类型方向无异常 | P1 |
| **Chart 属性面板** | `ChartPlotOptionsPaneModel` 新增字段，`updateChartPlotOptionsPaneModel` 对所有图表类型写入 `treeLayout`，需确认非树图属性保存流程不受影响 | P1 |
| **Export（PDF / Image / Excel）** | `flipMajorAxis()` 在后端渲染管线中执行，导出路径同样受影响 | P1 |
| **Viewsheet 存档（.vso 保存/加载）** | `PlotDescriptor` XML 序列化新增 `treeLayout` 属性，需回归已有存档文件的加载 | P1 |
| **Script 引擎** | 若新增脚本属性，需回归脚本执行与 Auto-complete | P1 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #74966 | add script for Layout Direction | Closed — PR diff 中未见脚本代码，测试前需确认实现位置（TC-14） |
| #74967 | Increase the size of the layout direction | Closed |
| #74971 | when layout Direction from top to bottom change to left to right, the X-axis has become larger | Closed — 需回归验证（TC-11） |
| #74993 | The tree chart refreshes slowly when changes are made | **New** — 性能问题未解决，按需执行 TC-15 |
| #75050 | when layout Direction from top to bottom and swap xy, the Y-axis has become larger | **New** — 未解决，需关注（TC-11） |