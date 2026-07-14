---
doc_type: feature-test-doc
product: StyleBI
module: Viewer / Chart（图表渲染引擎，绘图上下文/瓦片生成）
Feature_id: 74790
Feature: element painting is bleeding into axis for mekko graph
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3620
Assignee: Stephen Webster
last_updated: 2026-07-07
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：修复图表渲染时，绘图元素（及绘图区背景）渗漏到坐标轴 / 标题 / facet 角落等非绘图区瓦片图像中的问题。通过新增 `paintBackground` 开关并让坐标轴类瓦片显式取 `paintVOVisuals=false`，从根因上抑制非绘图瓦片中的图形元素与背景绘制。

**用户价值**：坐标轴、标题、facet 角落等区域的瓦片图像不再出现不应存在的图形残留/背景色渗出，提升图表可读性与专业度。

> 关联信息：Redmine Feature #74790（Category: Viewer，Status: Closed，Target version: stylebi-1.2.0，Start date: 2026-05-05），关联 Epic #74519（Look and Feel）。PDF 中未附带任何 Bug 子任务或 Related Issue 列表（除 Epic 关联）。需求描述以 Mekko 图表复现，但改动位于所有图表类型共用的 `GraphPaintContext`/`VGraph` 绘制管线，本身不是 Mekko 专属缺陷。本 Feature 是同一 Epic 下 Feature #74806（PR #3624，边框渲染改进）的前置修复，二者共享 `GraphPaintContextImpl`/`VGraphPair` 渲染上下文逻辑。

---

# 2 Test Focus

## P0 - Core Path

- Mekko 图表坐标轴瓦片（PNG tile）不再渗漏图形元素与绘图区背景（需求核心现象）

## P1 - Functional Path

- 边界情况：scrollable（存在 expanded `evgraph`）与 non-scrollable 图表分别验证，二者走不同代码分支
- 异常输入 / 已知遗留缺口：non-scrollable 图表下 SVG 导出路径（`getChartSVG`，`*Graphic` 方法）的 Title 瓦片是否仍渗漏；facet 图表左上/右上角瓦片（`getFacetTLImage`/`getFacetTRImage`）是否仍渗漏
- 多对象交互：facet 内部子图坐标轴标签/背景是否因 `GraphVO` 例外正确显示，同时确认子图内部图形元素本身不会被重新引入渗漏
- 多对象交互 / 跨图表类型回归：改动位于所有图表类型共用的绘制上下文，需在 Bar（含堆叠）/Line/Area/Point/Pie/Radar 等其它图表类型上验证未引入新的渗漏或坐标轴/标签缺失

## P2 - Extended Path （按需测试）

- 性能：不适用（本次改动只是新增布尔判断与方法拆分，未改变渲染算法复杂度，见分析MD结论）
- 兼容性：历史 facet 图表在坐标轴瓦片上的表现是否符合预期（`GraphVO` 由"始终抑制"变为"始终放行"是一次可观察的默认行为变化）

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Mekko 图表坐标轴瓦片不再渗漏元素与背景 | 1. 在 Portal 中创建/打开数据量适中、无 facet 的 Mekko 图表；2. 检查 `bottom_x_axis`、`left_y_axis` 等坐标轴瓦片图像；3. 放大查看瓦片边缘是否存在色块/线段残留 | 坐标轴瓦片只包含刻度与文字，无任何 Mekko 分段图形或绘图区背景色渗出 | ✅ Pass — Mekko 图形或绘图区背景色无渗出 | 来源：分析MD 场景1；对应 `getEVGraphContext` 显式传入 `paintVOVisuals=false` |
| **P1** |
| TC-2 | Non-scrollable Mekko 图表 SVG 渲染路径是否仍渗漏 | 1. 构造数据点较少（触发 `AssemblyImageService.getChartSVG` 中 `rcnt<10000` 的 SVG 路径）且不需要滚动的 Mekko 图表；2. 获取 x_title/y_title 对应的 SVG 图形（`getXTitleGraphic`/`getYTitleGraphic`）；3. 检查标题区域是否仍有图形元素或绘图背景渗漏 | 若复现渗漏，说明 SVG 导出路径未覆盖，需要跟进 `getVGraphContext()` 补齐 `paintBackground` 并显式传入 `paintVOVisuals=false` | ⚠️ Pass（需复核触发条件）— 实测记录"mekko 不会出现滚动条，SVG 导出没问题"，未渗漏 | 来源：分析MD 场景2 + 关键实现风险第1条。**风险**：`getVGraphContext()`（`VGraphPair.java:2450`）本 PR 未改动，`paintVOVisuals(evgraph==null)` 理论上在真正 non-scrollable（`evgraph==null`）时仍为 `true`，等价缺陷行为。实测"无渗漏"需确认测试数据是否真正落入 `evgraph==null` 分支，还是数据量仍触发了 scrollable 路径而绕过了该风险点，**建议复测并明确记录 `evgraph` 状态** |
| TC-3 | Non-scrollable + Facet 图表左上/右上角瓦片渗漏（已修正） | 1. 创建带两级 facet 分组、数据量不触发滚动（`evgraph==null`）的 **Bar 图表**（Mekko 不支持 facet，见下方修正说明）；2. 检查 `facetTL`、`facetTR` 角落瓦片图像 | 若这两个角落瓦片出现图形元素或背景色渗漏，说明 `getFacetTLImage/Graphic`、`getFacetTRImage/Graphic` 中内联构造的 `GraphPaintContextImpl` 未同步修复 | ⛔ 未覆盖（原设计前提不成立，尚未用正确图表类型复测）| 来源：分析MD 场景3。**修正说明**：原场景要求"带 facet 的 Mekko 图表"，经核实 Mekko 图表不支持 facet 绑定（前端拖拽区强制单字段替换，后端坐标构建只消费单一 X 维度/Y 度量），已实测证实（见 TC-4 记录"mekko不可以创建Facet"），该前提不成立。原始记录"Non-scrollable结果正确"很可能只验证了非 facet 部分，**facet TL/TR 角落瓦片渗漏这一风险点实际尚未被验证，需改用 Bar/Line 等支持 facet 的图表类型补测** |
| TC-4 | Facet 图表坐标轴瓦片正确显示子图信息（已修正） | 1. 创建带 facet 的 **Bar/Line 图表**（Mekko 不支持 facet，见修正说明）；2. 检查每个 facet 子图对应坐标轴瓦片，确认子图坐标轴标签/背景正常显示；3. 确认子图内部图形元素本身**没有**被画到坐标轴瓦片上 | 子图坐标轴标签/背景可见，但子图内部图形元素不可见 | ⛔ 未覆盖（原设计前提不成立）— 实测记录"mekko不可以创建Facet"，已确认 | 来源：分析MD 场景4。**修正说明**：`GraphVO` 递归过滤逻辑本身与图表类型无关，对任意可 facet 的图表类型都适用，**建议改用 Bar/Line 图表重新执行本场景** |
| TC-5 | 非 Mekko 图表类型回归 | 1. 依次创建 Bar（含堆叠）、Line、Area、Point、Pie 图表；2. 检查各自坐标轴/标题瓦片是否干净；3. 对比修复前版本（如有条件）确认行为变化仅限于"去除渗漏"，无其它副作用 | 各图表类型坐标轴/标题瓦片均无渗漏，且原有坐标轴标签/标题显示不受影响 | ✅ Pass — 别的 chart 没影响 | 来源：分析MD 场景5；覆盖需求范围描述过窄（仅提及 Mekko）带来的回归盲区 |
| **P2** |
| TC-6 | 历史 facet 图表坐标轴瓦片兼容性 | 1. 打开本次改动前已保存的、包含 facet 分组的历史 viewsheet；2. 检查 facet 子图坐标轴标签在坐标轴瓦片上的显示是否符合预期 | 历史 facet 图表坐标轴标签显示正常；若此前因过度抑制而缺失部分标签，本次修复顺带恢复显示应视为预期的连带效果，而非新增问题 | ⛔ 未覆盖（未执行） | 来源：分析MD 兼容性测试类别；`GraphVO` 由"始终抑制"变为"始终放行（依赖递归过滤）"是本次修复引入的可观察默认行为变化 |

---

# 4 Special Testing

## Performance

不适用：本次改动只是新增布尔判断（`paintBackground`）与方法拆分（`getEVGraphContext` 重载），未改变渲染算法复杂度或引入额外重复计算（分析MD 明确结论）。

## Compatibility

见 TC-6（未覆盖，建议补测）：历史保存的 facet 图表在坐标轴瓦片上的表现是否符合预期。

> 其余分类（Security / 本地化 / script / 文档-API / 配置检查）与本次改动无关（纯绘制上下文/瓦片生成逻辑修正，无新增 UI 控件、脚本接口、配置项或权限逻辑），本轮不适用，予以跳过。

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- **Chart 渲染引擎**（`inetsoft.graph.*`）：`GraphPaintContext`/`GraphPaintContextImpl.paintVisual()` 是所有图表类型共用的绘制上下文接口，改动影响**所有图表类型**的坐标轴/标题/facet 瓦片渲染，不仅限于 Mekko。
- **Chart 瓦片/矢量图生成**（`inetsoft.report.composition.graph.VGraphPair`）：`getEVGraphContext(boolean axes)` 改为委托 `(axes, paintVOVisuals)` 重载，`getPlotImage`/`getPlotGraphic` 显式传入 `(true, true)`；同一批瓦片语义由 PNG（`*Image`）与 SVG（`*Graphic`，`AssemblyImageService.getChartSVG`）两条并行路径分别实现，需交叉验证，不能只测一条路径。
- **瓦片 HTTP 服务**（`AssemblyImageService`）：`getChartSVG()` 中 `rcnt<10000` 判断决定走 SVG 渲染分支，是 TC-2 风险点的触发条件来源。
- **Feature #74806（PR #3624）**：与本次改动共享同一份 `GraphPaintContextImpl`/`VGraphPair` 渲染上下文逻辑（同属 Epic #74519）。#74806 进一步移除了 `GraphPaintContextImpl` 中的 `GridLine` 专属分支、并将 `getPlotImage/getPlotGraphic` 的 `paintAxes` 由 `true` 改为 `false`——这意味着 TC-1（本 Feature 的核心回归点）在 #74806 合入后的最终代码状态下需要**重新验证**，不能仅依赖 #74790 阶段的测试结果作为最终结论。
- **Facet 左上/右上角瓦片遗漏修复**（TC-3/TC-4 对应风险）：`getFacetTLImage/Graphic`、`getFacetTRImage/Graphic` 内联构造 `GraphPaintContextImpl`、未走统一的 `getEVGraphContext()` 入口，与 `getFacetBLImage/BR`（已修复）处理方式不一致，是明确的实现不彻底点，建议作为独立缺陷跟踪并推动修复，而非仅停留在测试记录层面。

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|

