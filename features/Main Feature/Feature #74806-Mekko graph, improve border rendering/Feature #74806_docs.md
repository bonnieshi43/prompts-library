---
doc_type: feature-test-doc
product: StyleBI
module: Viewer / Chart（Mekko 图表渲染引擎）
Feature_id: 74806
Feature: Mekko graph, improve border rendering
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3624
Assignee: Stephen Webster
last_updated: 2026-07-07
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：改进 Mekko（马赛克）图表的边框线渲染质量：(1) 修复贴近绘图区边界的分段边框粗细与内部分段不一致的问题；(2) 修复坐标轴内容（刻度/文字/轴线）与绘图区内容在瓦片渲染上相互"纠缠"（intertwined）的问题。同时配套修正了因此引入的网格线可见性、瓦片像素对齐（SVG_TILE_TRANSLATE、+1px）等底层渲染细节。

**用户价值**：Mekko 图表在 Portal 中显示更专业、边框视觉一致，坐标轴不再与绘图内容重叠/串扰，提升图表可读性；非可滚动图表的绘图区右/下边缘不再出现 1px 裁切。

> 关联信息：Redmine Feature #74806（Category: Viewer，Status: Closed，Target version: stylebi-1.2.0），关联 Epic #74519（Look and Feel）。PDF 中未附带任何 Bug 子任务或 Related Issue 列表（除 Epic 关联），即本 Feature 无已知遗留 Bug 记录。本 PR 与 Feature #74790（PR #3620，修复"图形元素渗漏到坐标轴瓦片"）同属 Epic #74519，是该问题修复后的延续性改进，两者共用 `GraphPaintContextImpl`/`VGraphPair` 渲染上下文逻辑。

---

# 2 Test Focus

## P0 - Core Path

- Mekko 图表贴边分段边框粗细与内部分段视觉一致（需求核心诉求 1）
- 绘图区瓦片（plot tile）不再重复绘制坐标轴内容，坐标轴内容只在专属坐标轴瓦片中出现一次（需求核心诉求 2）

## P1 - Functional Path

- 边界情况：极窄分段（内缩后退化为非正尺寸）的边框处理；底部坐标轴标签过长/旋转导致的多行瓦片场景
- 异常输入：不可滚动图表绘图区右/下边缘裁切修复
- 多对象交互 / 跨图表类型回归：平行坐标图 / 雷达图等"轴即绘图内容"类图表的轴线是否因全局 `paintAxes` 语义变化而消失（本次分析识别的最高风险回归点）；常规图表类型（Bar/Line/Area/Pie，含 facet 分组）网格线与坐标轴是否受影响
- UI 状态变化：图表滚动过程中坐标轴内容与绘图内容是否保持对齐、无重叠错位

## P2 - Extended Path （按需测试）

- 性能：Mekko 图表分段数量很大（100+）时绘图区瓦片生成耗时是否有可感知放大
- 兼容性：SVG 在线渲染路径与 BufferedImage（PDF/Image 导出、打印预览）渲染路径的边框效果一致性；历史保存的、包含平行坐标图/雷达图的 viewsheet 打开后坐标轴显示是否受影响

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Mekko 图表贴边分段边框粗细与内部分段一致 | 1. 创建 Mekko 图表，确保横向/纵向均存在贴边分段与内部分段；2. 放大对比贴边与内部分段描边视觉宽度；3. 分别用默认线宽与自定义粗线宽重复对比 | 所有分段边框视觉粗细一致，贴边分段不出现过粗、过细或缺失 | ✅ Pass — 分段边框视觉粗细一致 | 来源：分析MD 场景1；对应 `MekkoVO.paint()` 半线宽内缩逻辑 |
| TC-2 | 绘图区瓦片不再重复绘制坐标轴内容 | 1. 创建数据量较大、可触发横向/纵向滚动的 Mekko 图表；2. 检查绘图区瓦片图像本身是否含坐标轴刻度/文字；3. 检查坐标轴瓦片（`bottom_x_axis`/`left_y_axis` 等）显示是否完整；4. 滚动图表，确认坐标轴内容不与绘图内容重叠错位 | 绘图区瓦片只含图形与网格线，不含坐标轴刻度/文字；坐标轴瓦片独立正确显示；滚动时无重叠错位 | ⚠️ Pass（备注）— 实测记录为"Mekko 图表不会出现横向 scrollbar"，即测试环境下未能触发横向滚动场景，建议补充验证纵向可滚动场景是否同样符合预期 | 来源：分析MD 场景2；对应 `VGraphPair.getPlotImage/getPlotGraphic` 的 `paintAxes: true→false` |
| **P1** |
| TC-3 | 极窄分段的边框处理 | 1. 构造权重占比极小（如 <1%）且贴近绘图区边界的分段，描边线宽设置较粗；2. 检查该分段边框显示情况 | 明确该边界行为是否符合"边框一致性"预期；若边框完全缺失需与开发确认是否可接受 | ✅ Pass — 边框显示正确 | 来源：分析MD 场景5；根因见 `MekkoVO.paint()` 中 `bw<=0 \|\| bh<=0` 时跳过绘制的保护逻辑 |
| TC-4 | 不可滚动 Mekko 图表绘图区边缘不再被裁切 1px | 1. 创建数据量较小、不触发滚动条的 Mekko 图表；2. 检查绘图区右/下边缘分段边框与内容是否完整；3. 调整浏览器窗口/缩放比例重复检查 | 绘图区边缘内容完整显示，无因容器尺寸不足导致的裁切 | ✅ Pass — 绘图区边缘内容完整显示，不出现因容器尺寸不足导致的裁切 | 来源：分析MD 场景7；对应 `chart-plot-area.component.ts` 中 `scrollContainerWidth/Height` 的 +1px 补齐 |
| TC-5 | 平行坐标图/雷达图绘图区轴线回归（高风险点） | 1. 创建平行坐标图（Parallel/Parabox，若产品 UI 暴露）或雷达图；2. 检查绘图区图像中各维度坐标轴线是否仍显示；3. 与改动前版本对比（如有条件） | 各维度坐标轴线正常显示在绘图区内，未因 `getPlotImage/getPlotGraphic` 全局 `paintAxes=false` 而消失 | ✅ Pass — 雷达图坐标轴线正常显示在绘图区内 | 来源：分析MD 场景3 + 关键实现风险第1条；风险机制：`AbstractParallelCoord`/`ParallelCoord`/`OneVarParallelCoord`/`ParaboxCoord` 通过 `addAxis()` 把维度轴线作为绘图区内容渲染，与 Cartesian 坐标轴共用同一 `paintAxes` 开关。已测雷达图通过，**建议补测 Parallel/Parabox 图表类型本身**（若产品 UI 有独立入口）以完整覆盖该风险 |
| TC-6 | 常规图表类型（Bar/Line/Area/Pie，含 facet）网格线与坐标轴回归 | 1. 依次创建 Bar（含堆叠）、Line、Area、Pie 典型图表，至少一个使用 facet 分组；2. 检查绘图区网格线显示是否正常、无重复或缺失；3. facet 图表检查 facet 边框线（`getAxis()==null` 的 `GridLine`）；4. 检查坐标轴内容只出现一次、位置正确 | 各图表类型网格线、坐标轴、facet 边框显示均正常，无新增问题 | ✅ Pass — facet chart facet 边框线显示正常 | 来源：分析MD 场景6；对应 `GraphPaintContextImpl` 中 `GridLine` 专属分支移除后统一 `return true` 的行为。**注意**：Mekko 图表本身不支持 facet 绑定（已核实代码：前端拖拽区强制单字段替换，后端坐标构建只消费单一 X 维度/Y 度量），此项测试仅适用于 Bar/Line/Area/Pie 等支持 facet 的图表类型 |
| TC-7 | Mekko 图表 SVG 在线渲染与导出图像的边框一致性 | 1. 创建存在贴底部绘图区边界分段的 Mekko 图表，截图记录在线效果；2. 导出为 PDF 与 Image 格式，截取对应区域；3. 对比两者底部边框位置/粗细是否一致 | 若存在差异需与开发确认是否为已知限制（`svg != null` 才叠加 `SVG_TILE_TRANSLATE` 修正） | ⚠️ Executed（结果记录简略）— 记录仅复述场景标题，未明确说明"一致"或"存在差异"，**建议重新执行并明确记录对比结论** | 来源：分析MD 场景4 + 关键实现风险第2条；`MekkoVO.paint()` 中底边界额外内缩仅在 SVG 上下文生效，BufferedImage 导出路径无此修正 |
| TC-8 | 底部坐标轴多行瓦片场景（长/旋转 X 轴标签） | 1. 创建 X 轴标签较长或需要旋转显示的图表，使 `bottom_x_axis` 被拆分为多行瓦片（row ≥ 1）；2. 检查第 0 行与第 1 行及之后坐标轴线是否均无裁切 | 各行坐标轴瓦片显示均完整，无裁切 | ✅ Pass  | 来源：分析MD 关键实现风险第4条 + 边界与异常 Scope；`VGraphPair.getBottomXSubGraphic()` 的实现注释明确承认"假设坐标轴不超过一行"，第 1 行及之后未应用 1px 下移修正，是作者自陈但未验证的边界，**建议本轮测试补充执行** |
| **P2** |
| TC-9 | Mekko 图表大量分段（100+）渲染性能 | 1. 构造分类数很大（100+ 分段）的 Mekko 图表；2. 对比修改前后单次绘图区瓦片生成耗时 | 无明显耗时放大 | ✅ Pass  | 来源：分析MD 性能测试类别；`MekkoVO.paint()` 新增逐分段边界计算，属逐分段线性开销，建议作为功能验证附带观察项，不需要专项压测 |
| TC-10 | 历史保存的平行坐标图/雷达图 viewsheet 兼容性 | 1. 打开本次改动前已保存的、包含平行坐标图或雷达图的历史 viewsheet；2. 检查坐标轴显示是否符合预期，未因本次改动出现轴线缺失 | 历史 viewsheet 坐标轴显示正常，无回归 | ✅ Pass  | 来源：分析MD 兼容性测试类别；与 TC-5（新建图表验证）互补，TC-5 已通过不能替代此项对历史数据的验证 |

---

# 4 Special Testing

## Performance

见 TC-9（未覆盖，建议补测）：`MekkoVO.paint()` 每次绘制新增 `Rectangle2D` 边界计算与 4 组浮点比较，为逐分段（per-segment）级别开销，理论放大量级很小，无需专项压测，作为功能验证附带观察项即可。

## Compatibility
- 历史保存的平行坐标图/雷达图 viewsheet 兼容性：见 TC-10，未覆盖，建议补测。
- 浏览器端不同 DPI/缩放比例下，瓦片 `+1px` 尺寸调整（`chart-plot-area.component.html/ts`）后是否有可感知的图像拉伸或模糊，未见专项记录，可视为遗留观察点。

> 其余分类（Security / 本地化 / script / 文档-API / 配置检查）与本次改动无关（纯渲染引擎像素级修正，无新增 UI 控件、脚本接口、配置项或权限逻辑），本轮不适用，予以跳过。

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- **Chart 渲染引擎**（`inetsoft.graph.*`）：`GraphPaintContextImpl.paintVisual()` 中 `GridLine` 专属分支被整体移除，影响**所有图表类型**的网格线可见性判断，包括 Facet 边框线（`FacetCoord` 中 `getAxis()==null` 的 `GridLine`，参见 `claude/chart.md` 中 `FacetCoord.createSubGGraph()` 相关描述）。
- **Chart 瓦片/矢量图生成**（`inetsoft.report.composition.graph.VGraphPair`）：`getPlotImage`/`getPlotGraphic` 的 `paintAxes` 由 `true` 改为 `false`，是**所有图表类型**绘图区瓦片渲染的共用入口，尤其影响 `AbstractParallelCoord` 及其子类（`ParallelCoord`/`OneVarParallelCoord`/`ParaboxCoord`，参见 `claude/chart.md` "Concrete Coordinate Types" 表）通过 `addAxis()` 添加的绘图区内轴线。
- **Viewer/Portal 在线展示**（Angular `chart-plot-area.component.html/ts`）：瓦片尺寸 `+1px` 与 `scrollContainerWidth/Height` 调整，影响**所有图表类型**的瓦片布局与滚动容器尺寸计算。
- **Export（导出）**：PDF/Excel/Image 导出路径（`BufferedImage` 渲染）与在线 SVG 渲染路径在 Mekko 底部边界内缩上存在已文档化的差异，需要关注导出效果一致性（参见 `claude/viewsheet-export.md` 描述的导出管线）。
- **Feature #74790（PR #3620）**：与本次改动共享同一份 `GraphPaintContextImpl`/`VGraphPair` 渲染上下文逻辑（均属 Epic #74519），两个 Feature 的回归测试范围有重叠，建议合并执行 facet 角落瓦片（`getFacetTLImage/TRImage`）相关验证，避免重复测试。

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|


