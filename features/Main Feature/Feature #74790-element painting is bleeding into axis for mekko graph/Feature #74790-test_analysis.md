# Feature #74790 测试分析：Mekko 图表元素绘制渗漏到坐标轴渲染中

> PR 内容完全可见（已获取完整 diff 及元数据），以下分析基于对 PR #3620 diff 与相关源码（`GraphPaintContext.java` / `GraphPaintContextImpl.java` / `VGraph.java` / `VGraphPair.java` / `GraphVO.java` / `AssemblyImageService.java`）的实际核对，非猜测性描述。

## 一、需求分析

### 1. 功能理解与范围

- **核心目标**：修复图表渲染时，绘图元素（及绘图区背景）渗漏到坐标轴 / 标题 / facet 角落等非绘图区瓦片图像中的问题，需求以 Mekko 图表复现描述。
- **解决的业务问题**：坐标轴瓦片图像上出现不应存在的图形残留，影响图表可读性和专业度。
- **涉及模块**：核心图表渲染引擎（`inetsoft.graph.*`，绘制上下文与 `VGraph.paint()`）、图表瓦片图像生成（`inetsoft.report.composition.graph.VGraphPair`）、瓦片 HTTP 服务（`AssemblyImageService`）。
- **功能类型**：Bug Fix（渲染正确性）。

### 2. 需求清晰度与完整性

- 需求描述只有一句话，仅提及 "mekko graph"。但根据实际改动范围看，`GraphPaintContext` 是**所有图表类型共用**的绘制上下文接口，缺陷本质是通用渲染逻辑缺陷，并非 Mekko 专属。需求把复现范围表述得过窄，容易让测试仅在 Mekko 图表上验证，从而漏测其它图表类型在同一根因下的表现。
- 需求未说明的边界条件（均需通过阅读实现补全）：
  - 具体在哪些渲染出口复现（Portal 在线 PNG 瓦片 / SVG 导出 / print / embed）。
  - 复现是否依赖图表是否可滚动（scrollable/expanded graph）。
  - "修复后的正确表现"具体指什么：坐标轴瓦片应完全不含绘图元素，还是仅背景不渗漏即可。

> **补充澄清（已核实代码，且已被实测验证——见场景 4 的 🔴 标注）**：**Mekko 图表本身不支持 facet（分面）**。前端 `chart-data-editor.component.ts` 中 Mekko 的 X/Y/Group 字段区为单一"主字段"，拖入新字段时强制替换而非追加，无法绑定第二个维度触发 facet 布局；后端 `SeparateGraphGenerator` 构建 Mekko 坐标也只消费单个 X 维度/单个 Y 度量。因此本文档中"Facet 左上/右上角瓦片遗漏修复"这一风险点（`getFacetTLImage`/`getFacetTRImage` 未同步修复）**无法用 Mekko 图表验证**，其复现与回归需改用支持 facet 的其它图表类型（如 Bar/Line），场景 3、场景 4 的原始设计（"带 facet 的 Mekko 图表"）已被证实前提不成立，见下方对应场景的修正说明。

### 3. 测试风险识别

- **行为误解风险**：容易被当作 Mekko 专属修复，仅在 Mekko 图表上验证；实际改动位于通用绘制上下文/瓦片生成逻辑，影响所有图表类型的坐标轴、标题、facet 角落瓦片。
- **跨模块影响**：同一批瓦片语义（x_title/y_title/facet 角落等）由 PNG（`*Image`）与 SVG（`*Graphic`，`AssemblyImageService.getChartSVG`）两条并行路径分别实现，需交叉验证，不能只测一条路径。
- **状态一致性问题**：scrollable（存在 expanded `evgraph`）与 non-scrollable 图表走不同代码分支，需分别验证。

## 二、实现分析

### 1. 改动类型（Change Type Identification）

Bugfix，影响层级：渲染引擎（`inetsoft.graph` 核心绘制管线）+ 图表瓦片图像生成（`VGraphPair`），间接影响 Portal 在线图表显示与 SVG 导出/嵌入显示。改动文件：

- `GraphPaintContext.java`：新增 `paintBackground()` 默认方法（默认 `true`）。
- `GraphPaintContextImpl.java`：新增 `paintBackground` 字段与 Builder 方法；重写 `paintVisual()` 中"抑制非绘图元素"的判断逻辑。
- `VGraph.java`：`paint()` 中绘制绘图区背景改为受 `ctx.paintBackground()` 控制。
- `VGraphPair.java`：`getEVGraphContext(boolean axes)` 改为委托新增的 `getEVGraphContext(boolean axes, boolean paintVOVisuals)`；`getPlotImage`/`getPlotGraphic` 显式传入 `(true, true)`。

PR 未新增或修改任何单元测试文件。

### 2. 需求实现一致性

**根因还原**（基于代码逐行比对得出，非推测）：

- `VGraphPair.getEVGraphContext(boolean axes)`（用于构造坐标轴/标题/facet 角落瓦片的绘制上下文）此前从未显式设置 `paintVOVisuals`，因此始终取 `GraphPaintContextImpl.Builder` 的默认值 `true`。这使得 `paintVisual()` 中原本用来"在非绘图瓦片里隐藏图形元素"的分支（`!paintVOVisuals && ...`）在这些调用点上从未被触发——坐标轴/标题/facet 瓦片因此会把所有 `ElementVO`（`BarVO`、`MekkoVO`、`PointVO` 等）一并画出来。
- 同时 `VGraph.paint()` 此前无条件调用 `paintPlotBackground()`，与 `paintVOVisuals` 完全无关——即便图形元素被正确抑制，绘图区背景（填充色/条带/背景图）依旧会画到坐标轴瓦片上。
- 本次修复通过 (a) 让坐标轴类瓦片显式取 `paintVOVisuals=false`，(b) 新增 `paintBackground` 并使其与 `paintVOVisuals` 联动，同时在 `VGraph.paint()` 中据此判断是否绘制背景，从根因上解决了该问题。
- `paintVisual()` 的抑制逻辑由一个复合布尔表达式拆分为三个显式分支（`ElementVO` 排除 `GraphVO` / `VOText`+`VMeasureTitle` / 绘图区内的 `FormVO`），对 `ElementVO`（非 `GraphVO`）、`VOText`/`VMeasureTitle`、"绘图区内 `FormVO`" 三类的抑制结果与原表达式在逻辑上等价；唯一实质性变化是新增了 `GraphVO`（facet 子图容器）例外——此前 `GraphVO` 会被无条件抑制，现在被放行。该例外之所以安全：`GraphVO.paint(g, ctx)` 会把同一个 `ctx` 递归传给内部 `VGraph.paint()`，子图内部真正的图形元素（`BarVO`/`MekkoVO` 等）仍会被同一个 `paintVOVisuals=false` 过滤，因此不会重新引入渗漏，反而让 facet 子图自身的坐标轴标签/背景得以正确显示。

**需求覆盖度对比**：

| 需求点 | 实现覆盖 | 说明 |
|---|---|---|
| 坐标轴瓦片不再渗漏图形元素（PNG tile，`*Image` 方法） | ✅ | `getEVGraphContext` 在 scrollable 与 non-scrollable 两种情况下均已显式传入 `paintVOVisuals=false` |
| 坐标轴瓦片不再渗漏绘图背景（PNG tile） | ✅ | `paintBackground` 与 `paintVOVisuals` 联动一致 |
| Facet 内部坐标轴仍正常显示 | ✅ | `GraphVO` 例外 + ctx 递归复用 |
| SVG 导出/嵌入路径（`*Graphic` 方法）同步修复 | ⚠️ | X/X2/Y/Y2 Title 的 `*Graphic` 方法仍走未改动的 `getVGraphContext()`；non-scrollable 图表下 `paintVOVisuals` 仍为 `true`，见下方风险 |
| Facet 左上/右上角瓦片同步修复 | ⚠️ | `getFacetTLImage/Graphic`、`getFacetTRImage/Graphic` 未改动，见下方风险 |
| Plot 瓦片本身渲染不受影响 | ✅ | `getPlotImage`/`getPlotGraphic` 显式传入 `(true, true)`，行为与修复前一致 |

### 3. 关键实现风险

- **SVG 导出路径遗漏修复（跨模块风险，优先级高）**：`AssemblyImageService.getChartSVG()`（`AssemblyImageService.java:826-836`）对 `x_title`/`x2_title`/`y_title`/`y2_title` 分别调用 `VGraphPair.getXTitleGraphic()` 等方法，这些方法（`VGraphPair.java:2126-2167`）调用的是**本 PR 未改动**的 `getVGraphContext()`（`VGraphPair.java:2450-2456`），其中 `paintVOVisuals(evgraph == null)`——当图表为 **non-scrollable**（`evgraph == null`）时该值为 `true`，等价于修复前的缺陷行为。即同一个 Mekko 图表，若数据量较小（触发 `AssemblyImageService.getChartSVG` 中 `rcnt < 10000` 的 SVG 渲染分支）且不需要滚动，其标题瓦片仍可能出现元素/背景渗漏。
- **Facet 左上/右上角瓦片遗漏修复（跨模块风险）**：`getFacetTLImage()`/`getFacetTRImage()`（及其 `Graphic` 对应方法）未调用 `getEVGraphContext()`，而是各自内联构造 `GraphPaintContextImpl.Builder()`，只设置了 `paintVOVisuals(evgraph == null)`，**完全未设置 `paintBackground`**（默认值 `true`）。对 non-scrollable 的 faceted 图表，这两个角落瓦片仍可能同时出现元素渗漏（`paintVOVisuals=true`）与背景渗漏（`paintBackground` 未被抑制）。对照之下 `getFacetBLImage/BR` 已改为调用 `getEVGraphContext()` 而被修复，TL/TR 与 BL/BR 的处理方式不一致，是明显的实现不彻底点。
- **无自动化测试覆盖**：本次改动未新增或修改任何单元测试（`core/src/test` 下未找到与 `GraphPaintContext`/`VGraph` 绘制/Mekko 渲染相关的测试），修复完全依赖人工截图比对，回归风险需靠手工测试兜底。
- **需求描述范围过窄带来的回归盲区**：改动位于所有图表类型共用的 `GraphPaintContext`/`VGraph`，若测试仅针对 Mekko 图表验证，可能漏掉其它图表类型（尤其本身元素易越界的类型：堆叠柱状图、区域图、宽 Point 图、雷达图）在坐标轴/标题/facet 瓦片上的相同验证需求。

## 三、测试设计

### 3.1 风险驱动测试策略

- 本次改动的核心风险是"某些渲染出口遗漏了 `paintVOVisuals`/`paintBackground` 的正确取值"，属于**逐路径覆盖类**缺陷——必须对该图表所有会产生独立瓦片图像的出口逐一验证，不能只验证 PNG plot 瓦片就判定通过。
- 影响范围横跨 PNG tile（Portal 在线查看）与 SVG（`getChartSVG`，导出/小数据量场景）两条并行代码路径，二者共享相同瓦片语义但用不同方法获取 `GraphPaintContext`，必须分别验证，不能假设二者行为一致。
- 默认行为变化：对 scrollable 场景，坐标轴/标题/facet-BL/BR 瓦片行为从"渗漏"变为"不渗漏"，属预期修复；但对 non-scrollable 图表的 Title（SVG）与 Facet-TL/TR 瓦片，默认行为**未变**（仍可能渗漏），这是本次修复遗留的范围边界，需要与开发确认是否算作已知限制。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：直接验证 bug 报告的现象是否消失。
- **Scope**：Mekko 图表在 Portal 中正常显示（无 facet，数据量分别覆盖可滚动/不可滚动两种情况），检查坐标轴瓦片（top_x_axis/bottom_x_axis/left_y_axis/right_y_axis）与标题瓦片（x_title/y_title 等）边缘是否仍有分段图形或背景色渗出。
- **Validation Goal**：坐标轴/标题瓦片仅包含刻度线与文本，不包含任何 Mekko 分段图形或绘图区背景色/条带。

#### 回归测试（Regression）

- **Why**：改动位于所有图表共用的绘制上下文，需确认其它图表类型未受影响。
- **Scope**：至少覆盖 Bar（含堆叠）、Line、Area、Point、Pie、Radar 各一种典型图表的坐标轴/标题/facet 瓦片渲染。
- **受影响模块**：所有走 `VGraph.paint(g, ctx)` 的图表渲染出口。
- **可能被破坏的行为**：facet 子图坐标轴标签因 `GraphVO` 例外重新可见，需确认这是预期恢复而非意外的"多显示"。

#### 边界与异常（Boundary）

- **Why**：根因中 scrollable / non-scrollable 分支处理不一致，是本次修复明确保留的边界差异点。
- **Scope**：
  - **（已修正：原设计"Mekko + facet"前提不成立，Mekko 不支持 facet 绑定，见场景 3/4 修正说明）** 改用支持 facet 的图表类型（如 Bar），数据量小（non-scrollable，`evgraph == null`）+ 有 facet：验证 facet TL/TR 角落瓦片是否仍渗漏。
  - Mekko 图表数据量小 + 触发 SVG 渲染（`rcnt < 10000`）：验证 Title Graphic 瓦片是否仍渗漏。
  - Mekko 图表数据量大（scrollable，`evgraph != null`）：验证滚动前后瓦片均不渗漏。
  - **（已修正，同上）** Faceted 图表（改用支持 facet 的图表类型）：验证 facet 子图坐标轴标签/背景正确显示，且子图内部图形元素不渗漏到 facet 角落瓦片。

#### 性能测试（Performance）

不适用：本次改动只是新增布尔判断与方法拆分，未改变渲染算法复杂度或引入额外重复计算。

#### 兼容性测试（Compatibility）

- **Why**：`GraphVO` 由"始终抑制"变为"始终放行（依赖递归过滤）"，是一次可观察的默认行为变化。
- **Scope**：确认历史 facet 图表在坐标轴瓦片上的表现符合预期；若此前因过度抑制而缺失部分 facet 坐标轴标签，本次修复顺带恢复了显示，需要与设计者确认这是否是预期的连带效果。

#### 自动化测试建议

- **Unit**：可对 `GraphPaintContextImpl.paintVisual()` 补充单测，覆盖 `ElementVO`/`GraphVO`/`FormVO(isInPlot true/false)`/`VOText`/`VMeasureTitle` 与 `paintVOVisuals` true/false 的组合；纯逻辑判断，无需真实渲染，成本低且能长期防止逻辑回归。当前该方法及 `VGraph.paint()` 的背景分支均无测试覆盖。
- **Integration/E2E**：Mekko 图表坐标轴瓦片截图对比（结构化区域校验），覆盖 scrollable/non-scrollable × facet/non-facet 组合，以及 PNG/SVG 两条渲染路径。
- **是否需要 Mock**：无需 Mock，可直接构造小型 `EGraph`+`DataSet` 走真实渲染管线断言绘制调用/像素结果。

## 四、关键测试场景

### 场景 1：Mekko 图表坐标轴瓦片不再渗漏元素与背景

- **Scenario Objective**：验证 bug 报告的核心现象已修复。
- **Scenario Description**：创建一个数据量适中、无 facet 的 Mekko 图表。
- **Key Steps**：
  1. 在 Portal 中创建/打开 Mekko 图表 viewsheet。
  2. 检查 `bottom_x_axis`、`left_y_axis` 等坐标轴瓦片图像（可通过浏览器 Network 面板查看对应 tile 请求返回的 PNG）。
  3. 放大查看瓦片边缘是否存在色块/线段残留。
- **Expected Result**：坐标轴瓦片只包含刻度与文字，无任何 Mekko 分段图形或绘图区背景色渗出。
- **Risk Covered**：需求核心缺陷。
🔴 **测试-分析**：Mekko图形或绘图区背景色无渗出

### 场景 2：Non-scrollable Mekko 图表通过 SVG 路径渲染仍可能渗漏

- **Scenario Objective**：验证 SVG 渲染路径（`getChartSVG`）是否仍存在与修复前相同的缺陷。
- **Scenario Description**：构造一个数据点较少（触发 `rcnt < 10000` 的 SVG 路径）且不需要滚动的 Mekko 图表。
- **Key Steps**：
  1. 触发走 SVG 渲染的场景（数据行数 < 10000，参照 `AssemblyImageService.getChartSVG` 中 `rcnt<10000` 判断）。
  2. 获取 x_title / y_title 对应的 SVG 图形（对应 `getXTitleGraphic`/`getYTitleGraphic`）。
  3. 检查标题区域是否仍有图形元素或绘图背景渗漏。
- **Expected Result**：若复现渗漏，说明本 PR 未覆盖 SVG 导出路径，需要跟进 `getVGraphContext()`（`VGraphPair.java:2450`）补齐 `paintBackground` 并显式传入 `paintVOVisuals=false`。
- **Risk Covered**：实现分析中标识的"SVG 导出路径遗漏修复"风险。

🔴 **测试-分析**：mekko不会出现滚动条，SVG 导出没问题

### 场景 3（已修正）：Non-scrollable + Facet 图表左上/右上角瓦片渗漏

> **修正说明**：原场景设计为"带 facet 的 Mekko 图表"，但已核实 Mekko 图表不支持 facet 绑定（前端拖拽区强制单字段替换，后端坐标构建只消费单一 X 维度/Y 度量），该前提不成立，无法按原设计执行。"Facet 左上/右上角瓦片遗漏修复"这一风险本身是通用绘制上下文缺陷（`getFacetTLImage/Graphic`、`getFacetTRImage/Graphic` 未同步走 `getEVGraphContext()`），与图表类型无关，因此改用支持 facet 的图表类型复现。

- **Scenario Objective**：验证 `getFacetTLImage`/`getFacetTRImage` 是否仍存在渗漏。
- **Scenario Description**：构造一个带 facet（行/列分组）且数据量不触发滚动的 Bar 图表（或其它支持 facet 的图表类型）。
- **Key Steps**：
  1. 创建带两级 facet 分组的 Bar 图表，控制数据量使 `evgraph == null`（non-scrollable）。
  2. 检查 `facetTL`、`facetTR` 角落瓦片图像。
- **Expected Result**：若这两个角落瓦片出现图形元素或背景色渗漏，说明该已知遗漏点被复现，需要修复 `getFacetTLImage/Graphic`、`getFacetTRImage/Graphic` 中内联构造的 `GraphPaintContextImpl`。
- **Risk Covered**："Facet 左上/右上角瓦片遗漏修复"风险。

🔴 **测试-分析**：Non-scrollable结果正确（原始记录针对 Mekko non-scrollable 场景，facet 前提已被证实不适用于 Mekko，需按上方修正后的图表类型重新验证 facet 角落瓦片渗漏点）

### 场景 4（已修正）：Facet 图表坐标轴瓦片正确显示子图信息

> **修正说明**：原场景要求"带 facet 的 Mekko 图表"——已通过实测确认（见下方 🔴 记录）及代码核实：Mekko 不支持 facet 绑定，该场景无法在 Mekko 上执行。`GraphVO` 递归过滤逻辑本身与图表类型无关（对任意可 facet 的图表类型都适用），改用支持 facet 的图表类型（如 Bar/Line）验证同一风险点。

- **Scenario Objective**：验证 `GraphVO` 例外未破坏坐标轴过滤，同时确实让子图坐标轴信息可见。
- **Scenario Description**：创建带 facet 的 Bar/Line 图表（或其它支持 facet 的图表类型），观察 facet 内部子图在坐标轴瓦片区域的表现。
- **Key Steps**：
  1. 创建多级 facet 的 Bar/Line 图表。
  2. 检查每个 facet 子图对应坐标轴瓦片，确认子图坐标轴标签/背景正常显示。
  3. 确认子图内部的图形元素本身**没有**被画到坐标轴瓦片上。
- **Expected Result**：子图坐标轴标签/背景可见，但子图内部图形元素不可见。
- **Risk Covered**：`GraphVO` 递归过滤是否按预期工作。

🔴 **测试-分析**：mekko不可以创建Facet（已确认，该场景需改用支持 facet 的图表类型重新执行，见上方修正说明）

### 场景 5：非 Mekko 图表类型回归

- **Scenario Objective**：确认改动未对其他图表类型造成新的渗漏或坐标轴/标签缺失。
- **Scenario Description**：对 Bar（含堆叠）、Line、Area、Point、Pie 图表分别执行场景 1 的检查步骤。
- **Key Steps**：
  1. 依次创建上述图表类型的 viewsheet。
  2. 检查各自坐标轴/标题瓦片是否干净。
  3. 对比修复前版本（如有条件）确认行为变化仅限于"去除渗漏"，无其它副作用。
- **Expected Result**：各图表类型坐标轴/标题瓦片均无渗漏，且原有坐标轴标签/标题显示不受影响。
- **Risk Covered**：需求范围描述过窄导致的回归盲区。
🔴 **测试-分析**：别的chart没影响

