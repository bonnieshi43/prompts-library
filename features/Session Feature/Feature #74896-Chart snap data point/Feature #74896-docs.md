---

doc_type: feature-test-doc
product: StyleBI
module: Chart
Feature_id: "74896"
Feature: Snap-to-nearest-data-point tooltip + bar combined fixes
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3665
Assignee: Franky Pan
last_updated: 2026-05-22
version: stylebi-1.2.0

---

# 1 Feature Summary

**核心目标**：为 line/area/bar 图表扩展 Tooltip 能力：① 新增「吸附到最近数据点」Snap 功能（鼠标吸附 + 虚线参考线）；② Combined Tooltip 支持扩展到 bar/stacked-bar 图表；③ 修复 Card 样式在 Combined 模式下的渲染层级混乱问题。

**用户价值**：① 鼠标悬停时精准锁定最近 X 轴刻度，方便对比多系列数据；② bar 图用户可启用 Combined Tooltip，之前因 Bug 静默失效；③ Card 样式合并提示框从混乱的3层字体层级改为可读的「头部 + 系列列表 + 汇总」结构。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

核心功能
- Snap 勾选框的条件显示与隐藏（line/area/bar + X轴含维度）
- Snap 功能核心交互行为（吸附、虚线参考线、mouseleave清除）
- Combined Tooltip 在 bar/stacked-bar 上的数据聚合正确性
- Card 样式在 Combined 模式下的新渲染结构（header + list + total）
- 旧图表（无 snap 属性）加载后行为不变

## P1 - Functional Path

- Snap 与 Combined 的联动交互（勾选 Combined 时自动勾选 Snap）
- Snap 与 Reference Line 互斥行为
- Snap 与不同 Tooltip Format 的组合行为
- Combined Tooltip + Card 样式 + Snap 三者同时启用
- 切换图表类型时 Snap 状态的自动禁用行为

## P2 - Extended Path （按需测试）

- 本地化验证（文案翻译）
- 脚本兼容性（API 暴露）
- 文档一致性（知识库更新）
- Mobile 影响检查（touch事件）
- 打印/导出检查（PDF/Excel）

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Snap 勾选框的条件显示与隐藏 | 1. 创建 Line/Area/Bar 系列图表（X轴含维度），打开 Customize Tooltip 对话框<br>2. 切换为 Pie/Point/Radar/Map，重新打开对话框<br>3. 在折线图中 Swap XY 交换坐标轴，重新打开对话框<br>4. 将折线图改为 Multi-style 模式，重新打开对话框<br>5. 对 Gauge/Image/Text 组件打开 Customize Tooltip 对话框 | Line/Area/Bar + X轴含维度：显示 Snap 勾选框<br>Pie/Point/Radar/Map：不显示<br>X轴为度量（flipped）：不显示<br>Multi-style：不显示<br>Gauge/Image/Text：不显示「Combine tooltips」勾选框 | ✅ 符合预期 | 覆盖风险 R6、R7、R9 |
| TC-2 | Snap 功能核心交互行为 | 1. Dashboard 预览模式下打开折线图<br>2. 慢速移动鼠标从左向右扫过 plot 区域<br>3. 在两个数据点中间位置暂停鼠标<br>4. 将鼠标移出图表区域<br>5. 重新进入后快速移动鼠标 | Tooltip 跳跃式锁定到最近 X 刻度<br>鼠标停在两点中间锁定到距离更近的刻度，出现灰色虚线垂直参考线<br>鼠标离开后虚线立即消失<br>快速移动时 snap 正常工作，无残留 | ✅ 符合预期 | 覆盖风险 R4、R5，验证吸附逻辑与参考线清除 |
| TC-3 | Combined Tooltip 在 Bar 图上首次启用 | 1. 创建柱状图，勾选「Combine tooltips from different series」，取消 Snap，保存<br>2. 悬停到某一分组的某一 bar 上<br>3. 悬停到同一 X 刻度的另一个 bar 上<br>4. 切换为堆叠柱状图，重复步骤 1-3 | 启用 Combine 后，悬停任何 bar 显示该 X 刻度下所有系列数据<br>未启用 Combine 时，仅显示当前 bar 的数据<br>Stacked Bar 同一 X 刻度不同 bar 悬停时内容相同，底部显示 Stack Total<br>无空白 Tooltip 或报错 | ✅ 符合预期 | 覆盖风险 R3，验证 bar 图多系列聚合 |
| TC-4 | Card 样式 + Combined Tooltip 新渲染结构 | 1. 悬停折线图某 X 刻度（Card + Combined）<br>2. 观察 Tooltip 结构布局<br>3. 关闭 Combined Tooltip，重新悬停<br>4. Default Style + Combined 重复步骤 1-2 | Card + Combined：顶部显示 Measure 值（最大字体），第二行显示 X 维度值（副标题），下方列出各系列名称和值，堆叠图底部有汇总行<br>Card + 非Combined：保持原有表现<br>Default + Combined：按 Default 样式显示 | ✅ 符合预期 | 覆盖风险 R1，验证渲染结构变更 |
| TC-5 | 向后兼容 - 旧图表加载后无 Snap 行为变化 | 1. 打开不含 snapTooltip 属性的旧版 Dashboard<br>2. 打开 Customize Tooltip 对话框查看 Snap 初始状态<br>3. 关闭对话框，预览模式下悬停图表 | Snap 勾选框未勾选<br>鼠标悬停时 tooltip 自由移动，无吸附，无虚线参考线 | ✅ 符合预期 | 验证向后兼容性，确保旧图表行为不变 |
| **P1** |
| TC-6 | 勾选 Combined 时自动勾选 Snap，并独立控制 | 1. 打开 Customize Tooltip，Snap 和 Combined 均未勾选<br>2. 勾选「Combine tooltips from different series」<br>3. 观察 Snap 状态<br>4. 手动取消勾选 Snap，保持 Combined 勾选，保存<br>5. 重新打开对话框观察状态<br>6. 取消勾选 Combined，观察 Snap 状态 | 步骤3：Snap 自动变为勾选状态<br>步骤5：Combined=勾选，Snap=未勾选（保持手动设置）<br>步骤6：取消 Combined 后，Snap 状态保持不变 | 🔴 Bug #75294 | 验证 UX 联动逻辑，状态持久化 |
| TC-7 | Snap 与 Reference Line 互斥行为 | 1. 确认图表已启用 Reference Line<br>2. 勾选「Snap to nearest data point」，保存<br>3. 预览模式下悬停折线，观察参考线<br>4. 关闭 Snap，再次悬停 | 步骤3：只显示 Snap 的垂直虚线，不出现 per-region 高亮参考线<br>步骤4：关闭 Snap 后，per-region 参考线正常显示 | ✅ 符合预期 | 覆盖风险 R2、R5，验证 canvas 互斥 |
| TC-8 | Snap 与不同 Tooltip Format 的组合行为 | 1. Tooltip Format = Default，Snap 开启，保存预览<br>2. Tooltip Format 切换为 Custom，Snap 保持开启，观察 Combined 状态<br>3. 切换回 Default，勾选 Combined，Snap 保持开启 | 虚线导线正常出现并吸附<br>Custom 模式下 Combined 勾选框不可用<br>导线正常出现，tooltip 显示多系列聚合内容 | ✅ 符合预期 | 验证 Format 独立性与互斥逻辑 |
| TC-9 | Combined Tooltip + Card 样式 + Snap 三者同时启用 | 1. 预览 Dashboard，慢速移动鼠标穿过图表<br>2. 在任意 X 刻度暂停，观察 tooltip 和参考线<br>3. 验证 tooltip 内容结构 | 每个 X 刻度处出现灰色虚线参考线<br>Tooltip 以 Card 样式显示：顶部 Measure 值、第二行 X 维度值、下方各系列数据、底部合计<br>无 JS 报错，无内容为空或结构混乱 | 🔴 Bug #75096 | 高风险路径，三项功能交汇验证 |
| TC-10 | 切换图表类型时 Snap 状态的自动禁用行为 | 1. 折线图已启用 Snap 和 Combined，切换为柱状图<br>2. 打开 Customize Tooltip 观察状态<br>3. 切换为散点图，打开对话框观察状态<br>4. 切换回折线图，观察状态 | 步骤2：Combined 和 Snap 均保持勾选<br>步骤3：Snap 勾选框不再显示<br>步骤4：Snap和Combined 保持勾选 | 🔴 Bug #75091, 75094, 75297 | 覆盖风险 R6、R7，状态 clamp 验证 |
| **P2** |
| TC-11 | 本地化验证 | 验证 "Combine tooltips from different series" 和 "Snap to nearest data point" 在各语言版本中的翻译 | 所有语言版本翻译正确或保持英文降级 | ✅ 已本地化 | 覆盖风险 R8，多语言翻译验证 |
| TC-12 | 脚本兼容性验证 | 验证 `Chart1.combinedTooltip` 在 bar 图上设置是否生效 | `combinedTooltip` 属性在 bar 图上正常生效 | 🔴 Bug #75089 | 覆盖风险 R9，API 兼容性验证 |
| TC-13 | 文档一致性检查 | 验证知识库文档 `AddTipsToChart.adoc` 是否同步更新 | 文档内容覆盖 bar/stacked-bar，标签文字更新为 "series"，新增 Snap 使用说明 | 🔴 merge后再报 | 文档内容需同步更新 |
| TC-14 | Mobile 影响检查 | 验证 touch 事件下吸附是否触发，导线是否显示，tooltip 是否响应 | touch 事件下吸附正常触发，导线正常显示，tooltip 正常响应 | ✅ 符合预期 | touch 事件兼容性验证 |
| TC-15 | 打印/导出检查 | 验证 PDF/Excel 导出正常，打印预览中 tooltip 不被错误渲染 | 导出正常无报错，打印预览无 tooltip 错误渲染 | ✅ 符合预期 | 导出功能不被 tooltip 改动影响 |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security

无特殊安全测试需求

## Performance

无特殊性能测试需求

## Compatibility

- 旧版图表（无 snapTooltip 属性）加载后行为不变
- 切换图表类型时 Snap 状态正确处理
- API 字段重命名兼容性（`combinedSupported`）

## 本地化

- "Combine tooltips from different series" 文本在所有支持语言版本中验证翻译
- "Snap to nearest data point" 新增字符串验证多语言翻译

## script

- `combinedTooltip` 属性在 bar 图上的脚本设置验证
- `snapTooltip` 属性尚未在脚本 API 中暴露（功能缺口）

## 文档/API

- 知识库文档 `AddTipsToChart.adoc` 更新验证
- Customize Tooltip Dialog 的 Help 文档链接内容同步验证

## 配置检查

无特殊配置检查需求

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- Chart Properties Dialog → Customize Tooltip 对话框
- Gauge / Image / Text 组件的 Customize Tooltip 对话框（`combinedSupported` 重命名）
- chart-plot-area 组件（鼠标交互、参考线绘制）
- PlotArea.java 多系列 tooltip 聚合逻辑
- Dashboard 预览模式下的图表交互

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75089 | `snapTooltip` 属性尚未在脚本 API 中暴露 | New |
| #75091 | 切换图表类型时 Snap 状态未正确禁用 | New |
| #75094 | 切换回支持类型时 Snap 状态未正确恢复 | New |
| #75096 | Combined Tooltip + Card 样式 + Snap 三者同时启用时存在问题 | New |
| #75294 | 勾选 Combined 时自动勾选 Snap 的联动问题 | New |
| #75297 | 切换图表类型时 Snap 状态的自动禁用行为问题 | New |

---
