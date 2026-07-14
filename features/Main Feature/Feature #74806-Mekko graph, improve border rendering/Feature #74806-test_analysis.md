# Feature #74806 测试分析：Mekko 图表边框渲染一致性改进

> PR 内容完全可见（已通过 GitHub API 获取完整 diff、提交历史及合并后源码），以下分析基于对 PR #3624 diff 与相关源码（`GraphPaintContextImpl.java` / `GDefaults.java` / `MekkoVO.java` / `VGraphPair.java` / `chart-plot-area.component.html` / `chart-plot-area.component.ts` / `AbstractParallelCoord.java` 等）的实际核对，非猜测性描述。本 PR 的 base 分支为 `epic-74519`，与 Feature #74790（PR #3620，修复"图形元素渗漏到坐标轴瓦片"）同属一个 epic，是该问题修复后的延续性改进。

## 一、需求分析

### 1. 功能理解与范围

- **核心目标**：改进 Mekko（马赛克/玛丽美柯）图表的边框线渲染，解决 (a) 图表外边缘边框粗细/是否存在不一致，(b) 坐标轴内容与绘图区内容在渲染上"纠缠"（intertwined）两个问题。
- **解决的业务问题**：用户在查看 Mekko 图表时，分段边框在贴近绘图区边界处出现视觉上的粗细不均或缺失，同时坐标轴元素可能与绘图内容重叠/串扰，影响图表专业度和可读性。
- **涉及模块**：
  - 核心图表渲染引擎（`inetsoft.graph.*`：`GraphPaintContextImpl`、`MekkoVO`、`GDefaults`）
  - 图表瓦片图像/矢量图生成（`inetsoft.report.composition.graph.VGraphPair`）
  - Angular 图表瓦片布局（`chart-plot-area.component.html/ts`）
- **功能类型**：Bug Fix + 渲染精度优化（像素级坐标修正），非新增功能。

### 2. 需求清晰度与完整性

- 需求描述仅两句话，且明确聚焦 "Mekko graph"，但实际改动中 `VGraphPair.getPlotImage/getPlotGraphic`（`paintAxes` 参数由 `true` 改为 `false`）与 `GraphPaintContextImpl` 中 `GridLine` 分支的整体移除，都是**所有图表类型共用**的绘图上下文逻辑，并非 Mekko 专属。需求把复现/验收范围限定得过窄，容易导致测试只覆盖 Mekko 而漏测其它图表类型在绘图区瓦片（plot tile）中坐标轴/网格线渲染行为的变化。
- 需求未说明、需通过读代码补全的边界：
  - "边框大小不一致"具体是指边框整体粗细不一致，还是仅指贴近绘图区四条边界的分段边框比内部分段边框更粗/更细。（实现证实是后者：内部相邻分段的边框由相邻单元格的填充色覆盖外侧一半描边，天然呈现单倍宽度；只有贴着绘图区边界的分段缺少这种覆盖，才需要额外内缩处理。）
  - 是否要求 SVG 在线渲染（Portal 网页展示）与 BufferedImage 渲染（PDF/Image 导出、打印预览）表现一致。（实现中两条路径存在文档化的不一致，见下方风险。）
  - 可滚动（scrollable）与不可滚动图表的场景是否都需要验证。

> **补充澄清（已核实代码）**：Mekko 图表本身**不支持 facet（分面）**。前端 `chart-data-editor.component.ts` 中 Mekko 的 X/Y/Group 字段区 被标记为单一"主字段"，拖入新字段时强制替换而非追加，用户无法绑定第二个 X 维度/Y 度量来触发 facet 布局；后端 `SeparateGraphGenerator` 构建 Mekko 坐标时也只消费单个 X 维度和单个 Y 度量。因此本文档中所有 facet 相关的测试点（如"回归测试"中的 Faceted 图表验证、场景 6）均针对**其它支持 facet 的图表类型**（Bar/Line/Area/Pie 等），不适用于 Mekko 自身，测试时无需（也无法）尝试为 Mekko 图表绑定 facet。
  - 未提供任何截图/预期效果图，验收标准依赖对代码注释与提交历史的反推。

### 3. 测试风险识别

- **行为误解风险**：容易被误当作纯 Mekko 局部样式修复，实际改动触达 `GraphPaintContextImpl.paintVisual()`（全图表类型共用）与 `VGraphPair.getPlotImage/getPlotGraphic`（`paintAxes: true → false`，同样全图表类型共用），必须做跨图表类型回归。
- **跨模块影响**：改动同时涉及 Java 渲染引擎（像素级内缩计算）与 Angular 瓦片布局（CSS 尺寸 +1px），两侧必须协同验证，任一侧回退都会导致边框错位或裁切重新出现。
- **状态一致性问题**：PR 提交历史显示作者在"是否需要单独的 `paintGridLines` 开关"上反复了 4 次（引入→复杂化→简化→最终移除分支直接返回 `true`），说明该逻辑改动本身经历了不稳定的探索过程，最终版本对网格线在"绘图区瓦片"和"坐标轴瓦片"两种上下文中的可见性都产生了变化，需要针对两种瓦片分别验证。
- **性能/渲染放大风险**：`MekkoVO.paint()` 在每次绘制时都新增 `shape.getBounds2D()`、`coord.getVGraph().getPlotBounds()` 计算及 4 组边界比较，属于逐分段（per-segment）级别的开销；对于分类数极多的 Mekko 图表（大量窄分段）需要关注绘制耗时是否有可感知的放大。
- **兼容性风险**：`getFacetTLImage/Graphic`、`getFacetTRImage/Graphic`（对照 Feature #74790 分析）此前未纳入 `getEVGraphContext()` 的统一入口，本次 `paintAxes` 由 `true→false` 的改动只作用于 `getPlotImage/getPlotGraphic`，不影响这两个方法，但两者共享同一份 `GraphPaintContextImpl.paintVisual()` 逻辑，`GridLine` 分支被整体移除后其行为在所有调用入口都同步变化，需要确认 facet 四角瓦片没有引入新的网格线/边框残留。

## 二、实现分析

### 1. 改动类型（Change Type Identification）

Bugfix + 渲染精度修正，跨越 UI 与业务逻辑两层，改动文件与影响层级：

| 文件 | 改动内容 | 影响层级 |
|---|---|---|
| `GraphPaintContextImpl.java` | 移除 `GridLine` 专属分支，`GridLine` 不再受 `paintAxes`/`paintVOVisuals` 控制，统一走末尾 `return true` | 核心渲染引擎，**全图表类型** |
| `GDefaults.java` | 新增命名常量 `SVG_TILE_TRANSLATE = 0.5`，替换硬编码 magic number | 核心渲染引擎，无行为变化 |
| `MekkoVO.java` | 保存 `coord` 字段；`paint()` 中按分段是否贴近绘图区边界，对左/右/上/下四条边分别内缩半个描边宽度（下边额外叠加 SVG 场景专属的 `SVG_TILE_TRANSLATE` 修正）；新增退化矩形（`bw<=0 \|\| bh<=0`）保护 | Mekko 图表专属渲染逻辑 |
| `VGraphPair.java` | `getPlotImage`/`getPlotGraphic` 的 `paintAxes` 由 `true` 改为 `false`；新增 `getBottomXSubGraphic()`，对底部坐标轴瓦片第 0 行额外下移 1px；`getSubGraphic()` 新增 `translateY` 重载参数 | 图表瓦片生成，**全图表类型**（`getPlotImage/Graphic` 是所有图表绘图区瓦片/矢量图的唯一入口） |
| `chart-plot-area.component.html` | 瓦片 `<div>` 宽高各 +1px（含 pan 快照瓦片） | Angular 瓦片布局，**全图表类型** |
| `chart-plot-area.component.ts` | `scrollContainerWidth/Height` 计算方式调整：不可滚动场景下补齐此前缺失的 +1px，可滚动场景数值不变 | Angular 滚动容器尺寸，**全图表类型** |

用户可感知路径：Portal 在线查看 Mekko（含滚动/不滚动，**不含 facet**——Mekko 不支持 facet 绑定）/ 其它类型图表（含 facet）的绘图区显示；间接波及依赖 `getPlotImage`/`getPlotGraphic` 的导出与嵌入路径。

### 2. 需求实现一致性

**根因还原（基于代码逐行比对）**：

1. **边框内缩不足** —— `MekkoVO.paint()` 此前直接 `g2.draw(shape)`，描边以几何中心线为基准向两侧各扩展半个线宽。内部相邻分段之间，一侧的溢出被邻居的填充色覆盖，视觉上仍是单倍线宽；但贴着绘图区四条边界的分段，溢出的那一半描边没有任何东西覆盖，要么被裁切（看起来变细/不完整），要么在瓦片拼接处产生视觉差异（看起来比内部边框粗，或与相邻瓦片错位）。本次修复通过仅对"贴边"的分段做半线宽内缩，使其与内部分段呈现一致的视觉粗细，**直接对应需求中"borders are inconsistent sizes around the edges"**。
2. **坐标轴与绘图内容纠缠** —— `VGraphPair.getPlotImage/getPlotGraphic` 此前调用 `getEVGraphContext(true, true)`，`paintAxes=true` 意味着 `Axis` 对象（刻度线、刻度文字、轴线）在**绘图区瓦片本身**也会被绘制一次，而坐标轴瓦片（`getBottomXImage` 等）本身也用 `paintAxes=true` 独立绘制了一遍——两者各自独立生成图像后由前端拼接展示，容易在缩放、滚动、瓦片边界处出现坐标轴内容与绘图内容重叠/错位，即需求描述的"axis is getting intertwined on the plot rendering"。修复将绘图区瓦片改为 `paintAxes=false`，坐标轴对象只在专属坐标轴瓦片中绘制一次，**直接对应需求第二点**。
3. **网格线（GridLine）例外处理** —— 由于绘图区瓦片改为 `paintAxes=false`，若仍保留修复前 `GridLine` 分支（`return paintAxes || axis==null`），会导致挂载在坐标轴上的网格线（如 Y 轴对应的水平参考线）在绘图区瓦片中被意外隐藏——而网格线本应始终随绘图内容一起显示。作者提交历史显示经过 4 轮调整，最终判断"当前代码库中不存在需要隐藏网格线的场景"，直接移除该分支，使 `GridLine` 落入方法末尾的默认 `return true`，即**网格线在任何瓦片/任何上下文中都无条件绘制**。这是一处间接但必要的配套修复，否则单独修改 `paintAxes` 会引入新的"绘图区丢网格线"回归。
4. **像素级瓦片拼接修正** —— `GDefaults.SVG_TILE_TRANSLATE` 常量化、`getBottomXSubGraphic()` 对首行坐标轴瓦片下移 1px、Angular 瓦片 `+1px` 与 `scrollContainerWidth/Height` 的 +1px 补齐，是为了让新的"内缩边框"与"轴/绘图区分离"两项改动在瓦片边界处不产生新的裁切或缝隙，本质是配合前两点修复的像素对齐收尾工作。

**需求覆盖度对比**：

| 需求点 | 实现覆盖 | 说明 |
|---|---|---|
| Mekko 边框粗细不一致（贴边分段） | ✅ | 四条边界均已实现半线宽内缩逻辑 |
| 坐标轴与绘图内容渲染纠缠 | ✅（Cartesian 坐标系图表） | `getPlotImage/Graphic` 已改为 `paintAxes=false`，坐标轴对象只在专属瓦片绘制 |
| 平行坐标系 / 雷达图等"轴即绘图内容"的图表类型 | ⚠️ 高风险未覆盖 | 见下方关键实现风险第 1 条 |
| SVG 在线渲染 vs BufferedImage（导出/打印）渲染一致性 | ⚠️ 部分未覆盖 | 底边额外的 `SVG_TILE_TRANSLATE` 内缩仅在 `svg != null` 时生效，见风险第 2 条 |
| 极窄分段（内缩后宽/高 ≤ 0）的容错 | ✅（但代价是完全不绘制边框） | 见风险第 3 条 |
| 非可滚动图表绘图区右/下边缘被裁切 1px | ✅ | `scrollContainerWidth/Height` 已补齐该场景下缺失的 +1px |

### 3. 关键实现风险

- **【高优先级，跨模块】平行坐标系/雷达类图表的"轴"可能从绘图区瓦片中消失**：`AbstractParallelCoord`（`ParallelCoord`、`OneVarParallelCoord`、`ParaboxCoord` 均继承自它）通过 `addAxis()` 将每个维度的坐标轴作为 `Axis` 对象加入 `VGraph`，而这些轴线在视觉上是**绘图区内部的组成部分**（平行坐标图的竖直分隔线/轴，而非外部独立的坐标轴条）。`GraphPaintContextImpl.paintVisual()` 中 `Axis` 分支的判断（`return paintAxes`）不区分"外部 Cartesian 坐标轴"与"绘图区内的平行坐标轴"，两者共用同一套开关。本次修复将**所有**图表类型的 `getPlotImage/getPlotGraphic` 统一改为 `paintAxes=false`，而平行坐标系图表并没有像 Cartesian 图表那样天然存在独立的"坐标轴瓦片"来承接这些轴线——一旦绘图区瓦片不再绘制它们，这类图表的轴线视觉上可能完全消失。这是本次改动中**范围外溢**导致的、非 Mekko 图表本身的潜在回归，且未见任何相关测试或说明，风险等级最高。
- **【中优先级，导出一致性】SVG 与 BufferedImage 渲染路径的边框内缩不一致**：`MekkoVO.paint()` 中，绘图区底边界（`MaxY`）额外叠加的 `GDefaults.SVG_TILE_TRANSLATE` 内缩仅在 `svg != null`（即真正的 SVG 渲染上下文，对应 Portal 在线瓦片）时生效；当渲染目标是 `BufferedImage`（用于 PDF/Image 导出、打印预览等，见 `claude/viewsheet-export.md` 描述的导出管线）时不会叠加该修正。这是代码注释中明确承认的设计取舍（`VGraphPair.getBottomXImage` 也有类似的文档化不对称），但意味着同一个 Mekko 图表，其贴底部边界的分段边框在网页在线查看与导出为图片/PDF 之间可能呈现**不同的粗细/位置**，需要专门验证。
- **【中优先级，边界场景】极窄分段的边框会被完全跳过**：`if(bw <= 0 || bh <= 0) { g2.dispose(); return; }` 对于因双重内缩（左右各减半线宽后仍不足以保持正宽度/高度）导致退化的矩形，选择**完全不绘制边框**而非做其它降级处理。对于占比极小的类别（如 Mekko 图表中权重接近 0 的分段），描边宽度设置较粗时，该分段会完全没有边框，而相邻正常分段有边框，视觉上出现"某些格子缺边框"的不一致，这与需求"改进边框一致性"的初衷存在潜在冲突，需要用极端数据场景验证。
- **【中优先级，未覆盖行文档记录的边界假设】底部坐标轴多行瓦片场景**：`getBottomXSubGraphic()` 的实现注释明确写明"assumption: the bottom axis is short enough that it never needs more than one tile row. Row 1+ ... are not shifted"——即当 X 轴标签因过长/旋转导致坐标轴区域被拆分为多行瓦片时，只有第 0 行应用了 1px 下移修正，其余行仍是修复前的行为。这是作者主动记录但未验证的边界，需要用长文本/旋转 X 轴标签场景触发多行瓦片来确认是否重新出现裁切。
- **【低优先级，性能】Mekko 图表大量分段时的绘制开销增加**：每个 `MekkoVO.paint()` 调用新增了 `Rectangle2D` 边界计算与 4 次浮点比较，对于分类数很多（几十到上百个分段）的 Mekko 图表，属于逐分段线性开销，理论上可感知但量级很小，建议做一次大数据量下的渲染耗时对比而非深入性能测试。
- **无新增自动化测试**：本次改动未见任何单元测试文件变更（PR 的 7 个改动文件均为业务代码/模板），核心的像素级内缩逻辑、`paintAxes` 语义变化均缺少测试保护，修复效果与后续回归都需要依赖人工可视化验证。

## 三、测试设计

### 3.1 风险驱动测试策略

- 本次改动本质上是**通用绘图上下文语义变化（`paintAxes`、`GridLine` 处理）+ Mekko 专属像素级内缩**两部分叠加，前者影响全部图表类型的绘图区瓦片渲染，后者只影响 Mekko。测试必须分层：先验证 Mekko 本身的边框一致性诉求，再对**平行坐标系/雷达图**做专项回归（本次分析识别出的最高风险点），最后对常规图表类型（Bar/Line/Area/Point/Pie）做抽样回归确认坐标轴/网格线显示未受影响。
- 默认行为变化：绘图区瓦片不再绘制 `Axis` 对象（坐标轴刻度/文字/轴线），只由专属坐标轴瓦片承担；网格线在任意上下文中一律绘制。这一变化对所有图表类型生效，而非仅 Mekko，需要在回归测试中明确对比"改动前/后坐标轴是否只出现一次、出现在正确的瓦片中"。
- 是否影响历史配置：不涉及持久化配置或数据结构变更，纯渲染逻辑，无历史数据兼容性问题；但涉及 SVG 与导出（BufferedImage）两条独立渲染路径，需要按导出格式分别确认边框效果的一致性预期（是否要求完全一致，或允许已知的、文档化的差异）。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：直接验证需求描述的两个现象（边框粗细不一致、坐标轴与绘图内容纠缠）是否消失。
- **Scope**：创建 Mekko 图表，分别覆盖：默认尺寸分段较均匀、包含占比极小的窄分段、有/无描边颜色（`borderColor`/无描边）、不同 `line.getStroke()` 线宽等场景；同时在同一图表上确认坐标轴刻度/文字不再重复出现在绘图区图像内。
- **Validation Goal**：贴近绘图区四条边界的分段边框与内部分段边框视觉粗细一致；绘图区图像中不出现坐标轴刻度线/文字；坐标轴瓦片（`bottom_x_axis` 等）中的坐标轴内容显示正常、无缺失。
- 若涉及图表渲染逻辑（本次改动直接命中 `MekkoVO.paint()` 及 `VGraphPair` 瓦片生成）：
  - **Print Layout / Export**：分别验证 PDF、Excel、Image 导出中 Mekko 图表的边框效果，重点核对底部边界分段（`getBottomXImage`/`MekkoVO` 中 `svg==null` 分支）是否与 Portal 在线查看存在可感知差异。

#### 回归测试（Regression）

- **Why**：`GraphPaintContextImpl.paintVisual()` 与 `VGraphPair.getPlotImage/getPlotGraphic` 是所有图表类型共用的渲染入口，必须确认未破坏其它图表类型。
- **受影响模块**：核心图表渲染引擎（`inetsoft.graph.*`）、所有走 `getPlotImage/getPlotGraphic` 的图表出口。
- **可能被破坏的行为**：
  - **平行坐标图 / OneVarParallelCoord / ParaboxCoord**：各维度坐标轴（竖线）是否仍在绘图区正确显示（本次分析识别的最高风险点，务必单独验证，不能仅靠常规回归抽样带过）。
  - Bar（含堆叠）、Line、Area、Point、Pie、Radar 各至少一种典型图表：绘图区内网格线（水平/垂直参考线）是否仍正常显示，坐标轴内容是否只出现一次且位置正确。
  - Faceted 图表（**限其它支持 facet 的图表类型，Mekko 本身不支持 facet 绑定，无需/无法在 Mekko 上验证此项**）：facet 边框线（`FacetCoord` 中 `getAxis()==null` 的 `GridLine`，与 Feature #74790 分析中提到的"facet 边框线"是同一机制）在移除 `GridLine` 专属分支后是否依旧正确显示，不多不少。
  - 可滚动图表的滚动条出现阈值：确认 `scrollContainerWidth/Height` 调整后，原本判断"是否显示滚动条"的阈值（依赖未变化的 `layoutBounds`/`bounds` 比较）没有被间接影响。

#### 边界与异常（Boundary）

- **Why**：实现中存在多处主动承认但未验证的边界假设。
- **Scope**：
  - Mekko 图表中包含权重占比极小（描边内缩后宽/高 ≤ 0）的分段，确认该分段是否呈现"完全无边框"，并评估是否可接受。
  - X 轴标签较长/需要旋转显示，导致 `bottom_x_axis` 被拆分为多行瓦片（row ≥ 1），确认第 1 行及之后是否重新出现坐标轴线裁切。
  - 图表不可滚动（无滚动条）与可滚动两种场景下，绘图区右边缘/下边缘是否都不再出现 1px 裁切或空隙（对应 `scrollContainerWidth/Height` 修改）。
  - Mekko 图表默认宽度极窄（如缩略图/小尺寸卡片场景），分段本身接近内缩后退化的边界情况。

#### 性能测试（Performance）

- **Why**：`MekkoVO.paint()` 为每个分段新增了边界计算与比较，属于高频渲染路径（每次刷新/滚动重绘都会执行）。
- **Scope**：构造分类数很大（如 100+ 分段）的 Mekko 图表，对比修改前后单次绘图区瓦片生成耗时，确认无明显放大；无需专项压测，作为功能验证的附带观察项即可。

#### 兼容性测试（Compatibility）

- **Why**：`paintAxes` 语义变化（绘图区瓦片不再画坐标轴）是所有图表类型的默认行为变化。
- **Scope**：确认历史保存的、包含各类坐标系（尤其是平行坐标系/雷达图）的 viewsheet 在打开后坐标轴显示符合预期，而非因本次改动出现轴线缺失；确认浏览器端（不同 DPI/缩放比例）瓦片 +1px 尺寸调整后无明显的图像拉伸或模糊变化。

#### 自动化测试建议

- **Unit**：可对 `MekkoVO` 新增的内缩计算逻辑抽取为可单测的纯函数（当前直接内联在 `paint()` 中，测试成本较高），覆盖"贴左边"、"贴右边"、"贴上边"、"贴下边"、"四边都贴"、"内缩后退化为非正尺寸"等组合；可对 `GraphPaintContextImpl.paintVisual()` 补充 `GridLine`（`getAxis()==null`/`!=null`）在 `paintAxes` true/false 组合下的单测，锁定"网格线始终绘制"这一新语义，防止未来又被意外改动。
- **Integration/E2E**：Mekko 图表绘图区瓦片截图对比，覆盖窄分段/宽分段混合数据；平行坐标图绘图区瓦片截图对比（专项回归）；导出 PDF/Image 与在线查看的边框位置对比。
- **是否需要 Mock**：无需 Mock，可直接构造小型 `EGraph`+`DataSet` 走真实渲染管线断言像素/绘制调用。

## 四、关键测试场景

### 场景 1：Mekko 图表贴边分段边框粗细与内部分段一致

- **Scenario Objective**：验证需求核心诉求——边框粗细不一致问题已修复。
- **Scenario Description**：创建一个 Mekko 图表，数据分布使部分分段贴近绘图区左/右/上/下边界，部分分段完全在内部。
- **Key Steps**：
  1. 在 Portal 中创建 Mekko 图表，确保横向/纵向都存在贴边分段与内部分段。
  2. 放大截图对比贴边分段与内部分段的描边视觉宽度。
  3. 分别在默认线宽与自定义较粗线宽下重复对比。
- **Expected Result**：所有分段边框视觉粗细一致，贴边分段边框不出现过粗、过细或缺失。
- **Risk Covered**：需求第一点核心缺陷。
🔴 **测试-分析**：分段边框视觉粗细一致
### 场景 2：绘图区瓦片不再重复绘制坐标轴内容

- **Scenario Objective**：验证需求第二点——坐标轴与绘图内容纠缠问题已修复。
- **Scenario Description**：创建一个可滚动（数据量较大）的 Mekko 图表。
- **Key Steps**：
  1. 创建数据量足以触发横向或纵向滚动的 Mekko 图表。
  2. 检查绘图区瓦片图像（plot tile）本身是否包含坐标轴刻度/文字。
  3. 检查坐标轴瓦片（`bottom_x_axis`/`left_y_axis` 等）是否正常显示完整坐标轴。
  4. 滚动图表，确认滚动过程中坐标轴内容不会与绘图内容重叠或错位。
- **Expected Result**：绘图区瓦片只含图形与网格线，不含坐标轴刻度/文字；坐标轴瓦片独立正确显示；滚动时无重叠错位。
- **Risk Covered**：需求第二点核心缺陷。
🔴 **测试-分析**：Mekko图标不会出现横向scrollbar忽略

### 场景 3：平行坐标系/雷达类图表绘图区轴线是否丢失（高风险回归）

- **Scenario Objective**：验证 `paintAxes` 全局语义变化未导致"轴即绘图内容"类图表的轴线消失。
- **Scenario Description**：创建平行坐标图（Parallel/Parabox 相关图表类型，若产品 UI 暴露该图表类型）或雷达图。
- **Key Steps**：
  1. 创建一个包含多个维度轴的平行坐标图（或产品中对应的图表类型）。
  2. 检查绘图区图像中各维度的坐标轴线是否仍然显示。
  3. 与改动前版本（如有条件）截图对比。
- **Expected Result**：各维度坐标轴线正常显示在绘图区内，未因 `getPlotImage/getPlotGraphic` 的 `paintAxes=false` 改动而消失。
- **Risk Covered**：实现分析中识别的最高优先级跨模块回归风险（`AbstractParallelCoord` 及其子类的 `addAxis()` 轴线）。
🔴 **测试-分析**雷达图坐标轴线正常显示在绘图区内

### 场景 4：Mekko 图表 SVG 在线渲染与导出图像的边框一致性

- **Scenario Objective**：验证 Portal 在线查看与 PDF/Image 导出之间，Mekko 分段贴底部边界的边框是否存在可感知差异。
- **Scenario Description**：创建一个存在贴底部绘图区边界分段的 Mekko 图表。
- **Key Steps**：
  1. 在 Portal 中查看该 Mekko 图表，截图记录底部贴边分段的边框效果。
  2. 将同一图表导出为 PDF 与 Image 格式，截取对应区域。
  3. 对比两者底部边框的位置/粗细是否一致。
- **Expected Result**：若存在差异，需要与开发确认是否为可接受的已知限制（`svg != null` 才叠加 `SVG_TILE_TRANSLATE` 修正是当前实现的既定行为），否则需要跟进导出路径的一致性修复。
- **Risk Covered**：实现分析中识别的"SVG 与 BufferedImage 渲染路径不一致"风险。

🔴 **测试-分析**：Mekko 图表 SVG 在线渲染与导出图像的边框一致性

### 场景 5：极窄分段的边框缺失

- **Scenario Objective**：验证内缩后退化为非正尺寸的分段边框处理是否满足业务对"一致性"的预期。
- **Scenario Description**：构造一个包含权重占比极小类别（如 <1%）的 Mekko 图表，且描边线宽设置较粗。
- **Key Steps**：
  1. 创建数据分布悬殊的 Mekko 图表，确保存在几乎不可见宽度的分段，且贴近绘图区边界。
  2. 检查该极窄分段是否完全没有边框，而其它正常分段边框正常。
- **Expected Result**：明确该行为是否符合预期；若被认为是新的"边框不一致"表现，需要反馈给开发评估是否需要进一步处理（如降级为不内缩而接受轻微裁切，优于完全不绘制）。
- **Risk Covered**：实现分析中识别的"极窄分段边框被完全跳过"风险。

🔴 **测试-分析**：边框显示正确

### 场景 6：常规图表类型（Bar/Line/Area/Pie）网格线与坐标轴回归

- **Scenario Objective**：确认 `GraphPaintContextImpl` 中 `GridLine` 专属分支移除后，常规图表类型未出现网格线重复/缺失或坐标轴异常。
- **Scenario Description**：对 Bar（含堆叠）、Line、Area、Pie 各创建一个典型图表，其中至少一个使用 facet 分组。
- **Key Steps**：
  1. 依次创建上述图表类型的 viewsheet。
  2. 检查绘图区网格线（水平/垂直参考线）显示是否正常，无重复或缺失。
  3. 对于 facet 图表，检查 facet 边框线（`getAxis()==null` 的 `GridLine`）显示是否正常。
  4. 检查坐标轴内容只出现一次，位置正确。
- **Expected Result**：各图表类型网格线、坐标轴、facet 边框显示均正常，无因本次改动引入的新问题。
- **Risk Covered**：需求范围描述过窄导致的回归盲区（`paintAxes`/`GridLine` 逻辑为全图表类型共用）。
🔴 **测试-分析**：face chart facet 边框线显示正常

### 场景 7：不可滚动 Mekko 图表绘图区边缘不再被裁切 1px

- **Scenario Objective**：验证 `scrollContainerWidth/Height` 计算修正后，非滚动场景下绘图区右/下边缘不再出现裁切。
- **Scenario Description**：创建一个数据量较小、不触发滚动条的 Mekko 图表。
- **Key Steps**：
  1. 创建不可滚动的 Mekko 图表（`bounds.height <= layoutBounds.height` 且宽度同理）。
  2. 检查绘图区右边缘与下边缘的分段边框/内容是否完整，无 1px 裁切。
  3. 调整浏览器窗口大小或缩放比例，重复检查。
- **Expected Result**：绘图区边缘内容完整显示，不出现因容器尺寸不足导致的裁切。
- **Risk Covered**：实现分析中"非可滚动图表绘图区右/下边缘被裁切 1px"这一根因问题的修复验证。
🔴 **测试-分析**：绘图区边缘内容完整显示，不出现因容器尺寸不足导致的裁切