# Feature #74973 测试分析报告：雷达图蛛网多边形网格外观（Polygon/Spider-Web Grid）

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为雷达图（Radar/Spider Chart，底层 `PolarCoord` + 内嵌 `ParallelCoord`）新增"蛛网状"多边形网格外观选项，将默认的圆形同心圆网格及外边界，替换为与维度/度量个数相匹配的 N 边多边形（如6个维度→六边形，5个→五边形）。
- **用户价值**：满足体育统计、KPI/绩效仪表盘等场景下用户对"经典雷达图"外观的诉求（业界惯用多边形蛛网网格而非圆形网格），解决当前系统雷达图网格样式单一、不符合行业惯例的痛点。
- **Feature 类型**：Rendering（图表渲染）+ Script API（脚本属性，无对应 UI 开关）。

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

1. `PolarCoord` 新增 `webGrid` 布尔属性及 `setWebGrid(boolean)` / `isWebGrid()` 公共方法（默认为 `false`），通过脚本引擎的反射机制自动暴露给图表脚本（`coord.setWebGrid(true)`），无需任何 UI 改动。
2. 新增私有方法 `getSidesCount()` 计算多边形边数：
   - 当内部坐标是 `RectCoord`（普通极坐标/饼图场景）时，取 X 轴 `Scale.getTicks().length`；
   - 当内部坐标是其他类型（雷达图场景为 `ParallelCoord`）时，取 `coord.getDimCount()`（维度个数）。
   - 二者是两套不同的计数口径，仅在多数常规场景下数值相同。
3. `transformLine()`：当 `webGrid=true` 且边数 ≥ 3 时，原本把"水平线段"转换成圆弧（`Arc2D`）的逻辑改为调用新增的 `createPolygonRing()`，直接将同心圆环的两个端点（对应相邻两个 spoke 位置）连成一条直线——因为雷达图的每一圈同心"圆环"本身就是由 N 段独立线段组成（每个 spoke 间隔一段），直线段恰好就是多边形的一条边，无需插值。
4. `createAxis()`：当 `webGrid=true` 且边数 ≥ 3 时，为最外层 `PolarAxis` 设置多边形模式（对应 `axis2.setUsePolygon(true)` / `setPolygonSides(n)`）。
5. `PolarAxis` / `PolarAxisLine` 新增 `usePolygon`（及历史版本中的 `polygonSides`）字段：
   - `PolarAxis.setUsePolygon()` 会同步转发给已存在的 `line`（`PolarAxisLine`）对象，修复了"视觉对象在计数被赋值之前就已创建，导致设置丢失"的时序 Bug（与 `width`/`height` 现有的转发写法保持一致）。
   - `PolarAxisLine.paint()`：`usePolygon=true` 时，使用 `PolarUtil.getTickLocations()` 得到的**真实 tick 角度**（而非从0开始的均匀分角）构造多边形 `Path2D`（`createPolygon`），因为 `ParallelCoord` 的 spoke 是在每个刻度格子的中心，而不是格子边界，若用均匀角度会导致多边形顶点与实际 spoke 错位；`usePolygon=false` 时维持原有 `Ellipse2D` 圆形绘制，默认行为不变。
   - 当前仓库代码在 `paint()` 中对 tick 数组做了 `.clone()`（注释说明是为避免和 `paintTicks()` 二次修改同一个缓存数组），说明该 tick 数组是共享/缓存对象，新增的多边形绘制路径与已有 tick 绘制路径共用同一数据源，存在潜在的数组共享副作用，需重点关注。
6. `equalsContent()` 新增 `webGrid` 字段比较，影响 `PolarCoord` 对象"结构相等性"判断（用于图表复用/缓存判断等场景）。

### 目标覆盖度

| Feature 需求点 | 覆盖情况 |
|---|---|
| 新增脚本属性以启用蛛网多边形网格 | 已实现，`setWebGrid(boolean)` |
| 多边形边数需与维度数匹配（六边形/五边形…） | 已实现，`getSidesCount()` |
| 外边界与内部网格环均需变为多边形 | 已实现（`createAxis`外边界 + `transformLine`网格环） |
| 多边形顶点与雷达图 spoke 对齐 | 已实现，使用 tick 实际角度而非均匀分角 |
| UI 层开关/属性面板入口 | **未实现**——纯脚本属性，需求本身描述为"script property"，与实现一致，非遗漏 |
| 自动化测试用例 | **未见新增**，PR 仅改动 3 个渲染类源码文件 |
| 脚本 API 文档同步 | 未见相关文档改动痕迹，需人工确认 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|---|---|---|
| 雷达图同心网格环始终渲染为圆形圆弧（`Arc2D`） | `webGrid=true` 且维度数 ≥3 时，网格环渲染为 N 边多边形线段 | Rendering |
| 极坐标/雷达图外轴边界始终为椭圆（`Ellipse2D`） | `webGrid=true` 且边数 ≥3 时，外边界为闭合多边形路径（`Path2D`） | Rendering |
| `PolarAxis` 仅 `width`/`height` 会延迟转发到内部 `line` 对象 | 新增 `usePolygon`（及边数）同样需要延迟转发，逻辑与 width/height 一致 | Functional / 时序 |
| 维度数 <3（1或2个度量）没有多边形分支 | 显式判断 `n>=3` 时才走多边形逻辑，否则回退到原圆形/圆弧绘制 | 边界条件 |
| `equalsContent` 不比较 webGrid | 新增比较，可能影响坐标对象"是否相同"的判定（图表刷新/缓存/MV 相关逻辑） | Compatibility / 缓存一致性 |
| 无该脚本属性，旧脚本不涉及 | 新脚本属性默认 `false`，未调用的旧图表/脚本渲染效果不变 | 向后兼容（风险低） |
| 多边形顶点按从0开始均匀分角计算（早期设计问题） | 顶点改用刻度实际角度（`PolarUtil.getTickLocations`），与 spoke 精确对齐 | Rendering（PR过程中已修复的已知坑，仍需回归验证） |

---

## 第三部分：Risk Identification（风险识别）

- **Rendering**：多边形顶点依赖 tick / 维度数计算，若刻度数量与实际 spoke（维度）数不一致（如某度量数据全部为空被裁剪、tick 被格式化合并等），会导致多边形边数与视觉 spoke 数不匹配，出现网格错位。
- **Functional**：`getSidesCount()` 对 `RectCoord` 用 tick 数、对其他坐标（雷达图）用 `getDimCount()`，两套口径在边界场景（如某些 tick 被隐藏、次刻度存在）下可能不等价，导致非雷达图的极坐标（饼图等共用 `PolarCoord`）场景表现异常。
- **Data Consistency / 状态切换**：雷达图度量个数动态变化（增删 Binding 字段、钻取切换）时，多边形边数应实时随之变化（如从六边形变为五边形），需验证不存在使用缓存/旧值导致边数与实际不符的情况。
- **Cross-Module（跨模块）**：`equalsContent` 新增 `webGrid` 比较，可能影响依赖坐标"结构相等"判断的模块（增量渲染、MV 匹配、图表对象复用等），需要做回归验证，确认不会引入不必要的重建或漏判缓存失效。
- **边界情况**：边数 <3（仅1、2个维度/度量）时代码显式回退圆形绘制，需要验证该路径不抛异常、不产生退化图形。
- **向后兼容性**：已有（升级前创建）雷达图 / 极坐标图表在反序列化后 `webGrid` 默认为 `false`，渲染效果应与升级前完全一致，需重点做回归。
- **渲染一致性（跨路径）**：网格环多边形（`PolarCoord.createPolygonRing`，按等分角度 fraction×2π 计算）与外边界多边形（`PolarAxisLine.createPolygon`，按 tick 真实弧度角计算）是两套独立实现，需验证二者在同一图表中生成的多边形顶点严格重合（网格线终点应落在外边界顶点上），否则出现网格与边界错位的视觉缺陷（该问题在 PR 描述中提到是本次开发过程中修复的坑，属于典型高风险回归点）。
- **Export/Print**：多边形绘制走标准 `Graphics2D`/`Path2D` 路径，理论上导出应自动复用同一绘制逻辑，但需验证 PDF/Excel/Image 导出与预览渲染保持一致，无残缺、错位或比例失真。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**：
  1. `setWebGrid(true)` 后，雷达图网格环与外边界正确渲染为 N 边多边形，且 N 与实际绑定的度量/维度个数一致；
  2. 多边形顶点与对应 spoke（轴线）精确对齐，网格与边界顶点重合；
  3. 未调用 `setWebGrid`（默认 `false`）时渲染效果与升级前完全一致；
  4. 度量个数变化时多边形边数动态、正确更新。
- **高风险路径**：脚本中调用 `setWebGrid(true)` 后触发的图表刷新；度量个数在边界值（1、2、3、多个）之间增减；脚本同时设置轴线颜色/网格颜色/线型（对应 Redmine 历史记录中的示例脚本）；图表导出为 PDF/Excel/Image 及打印预览；已有雷达图/极坐标图表在版本升级后打开验证向后兼容。
- **涉及模块**：图表脚本执行引擎（脚本属性反射调用）、Export/打印（PDF/Excel/Image）、MV 及图表缓存判断（`equalsContent`）、Composer 设计态预览与 Viewer 运行态预览一致性、非雷达图但共用 `PolarCoord` 的普通极坐标/饼图/环形图（验证误设置或默认值不产生副作用）。
- **专项检查**：
  - **本地化**：本次无 UI 文本新增/变更，不涉及本地化测试。
  - **配置检查**：未涉及 `SreeEnv`/`defaults.properties` 等环境属性变更，不适用。
  - **脚本兼容**：
    - 验证脚本编辑器中调用 `coord.setWebGrid(true)` / `coord.isWebGrid()` 可正常执行且无报错；
    - 验证脚本 Auto-complete（智能提示）列表中能识别到新增的 `setWebGrid`/`isWebGrid` 方法；
    - 由于本功能无对应 UI 开关，不存在"UI 与 Script 不同步"的问题，但需要明确告知/确认该效果目前只能通过脚本开启，Format 面板无入口。
  - **文档一致性**：需确认脚本 API 参考文档/帮助文档是否已补充 `PolarCoord.setWebGrid` 的说明及示例脚本，PR 本身仅在源码新增了 Javadoc 注释，未见对外文档同步的证据。
- **Mobile 影响检查**：本次改动为图表内部绘制逻辑，不涉及触摸交互、工具栏折叠或响应式布局改变，但建议在移动端/小屏幕下验证雷达图在尺寸压缩时多边形网格是否变形或错位。
- **Print Layout / Export 影响检查**：涉及图形绘制方法（`paint()`）与坐标计算（视觉属性变化），按规范需要验证 PDF、Excel、Image 导出效果与预览一致。

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景 1：启用蛛网多边形网格 — 基本渲染

- **Scenario Objective**：验证通过脚本开启蛛网网格后，雷达图能正确显示为多边形网格外观。
- **Scenario Description**：这是本次功能的核心诉求，若多边形未生成或生成错误，用户将无法获得预期的经典雷达图外观，直接影响功能可用性。
- **Pre-condition**：已有一张包含至少 6 个数值型度量字段的数据源（Worksheet/Query），例如 Sales、Profit、Quantity、Discount、Shipping Cost、Unit Price 等。
- **Key Steps**：
  1. 在 Composer 中新建/打开一个 Viewsheet，拖入一个 Chart 组件并绑定到该数据源；
  2. 在图表类型面板中，将图表类型切换为 **Radar（雷达图）**；
  3. 在绑定面板（Binding Pane）中，将 6 个数值度量依次拖入 **Y** 绑定区域（雷达图多度量场景**不需要**在 X/Group 绑定任何维度字段，只要 Y 绑定的度量个数 ≥2，系统即按度量个数生成对应的多轴雷达图）；
  4. 选中该 Chart，点击工具栏 **Script**（或右键图表 → **Edit Script**）打开该图表的脚本编辑器，勾选/确认 **Enable Script**；
  5. 在脚本编辑器中粘贴以下**最小化脚本**（只调用 webGrid 本身，不做 min/max 统一或改色，避免与既有功能效果混淆）：
     ```javascript
     graph.getCoordinate().setWebGrid(true);
     ```
  6. 点击 **Apply/OK** 保存脚本，回到 Viewsheet 预览（Viewer）或 Composer 预览区刷新图表。
- **Expected Result**：最外层边界变为六边形（而非圆形），六个顶点分别落在六条 spoke 轴线上；数据折线的位置、颜色，以及各轴刻度范围均与未开启时保持一致（不应有变化）。
- **Risk Covered**：默认行为变化、Rendering。

🔴 **测试-分析**： 符合预期

> 需求单历史记录中附带的完整示例脚本（含 min/max 统一 + 颜色/线型设置）作为组合场景，见场景6。

### 场景 2：未启用蛛网网格 — 默认行为保持不变

- **Scenario Objective**：验证不设置该脚本属性时，雷达图渲染效果与升级前完全一致。
- **Scenario Description**：这是最基本的回归保护，若默认行为被意外改变，将影响所有现有雷达图用户，属于高风险回归点。
- **Pre-condition**：雷达图脚本中不调用任何与网格样式相关的新属性。
- **Key Steps**：
  1. 打开一个已有雷达图（不含新脚本设置）；
  2. 查看图表预览。
- **Expected Result**：网格环及外边界仍为圆形同心圆，视觉效果与功能上线前完全一致。
- **Risk Covered**：向后兼容性、默认行为变化。

🔴 **测试-分析**： 符合预期

### 场景 3：度量个数动态变化 — 多边形边数随之更新

- **Scenario Objective**：验证多边形边数能随雷达图绑定的度量个数变化而正确更新。
- **Scenario Description**：用户在使用过程中经常调整绑定字段，若多边形边数未随之刷新（如仍显示旧边数或与实际 spoke 数不符），会造成网格与轴线明显错位，误导用户对数据的解读。
- **Pre-condition**：雷达图已开启蛛网网格，初始绑定 6 个度量。
- **Key Steps**：
  1. 在绑定面板中依次将度量个数从 6 个减少到 4 个，再增加到 8 个；
  2. 每次调整后查看图表预览。
- **Expected Result**：多边形边数始终与当前绑定的度量个数一致（如4边形、8边形），顶点始终与对应 spoke 对齐，无残留旧边数或错位现象。
- **Risk Covered**：状态切换、数据一致性。

🔴 **测试-分析**： 符合预期

### 场景 4：边界条件 — 维度数小于 3

- **Scenario Objective**：验证度量个数为 1 或 2 时，图表不会因多边形逻辑异常而报错或显示畸形图形。
- **Scenario Description**：多边形至少需要 3 个顶点才有意义，若边界处理不当，可能导致异常报错或绘制出退化的线段/图形，影响图表可用性。
- **Pre-condition**：雷达图已开启蛛网网格。
- **Key Steps**：
  1. 将雷达图绑定度量减少到 2 个，查看图表；
  2. 再减少到 1 个，查看图表。
- **Expected Result**：图表正常渲染（回退为默认圆形/圆弧网格样式或系统既有的少维度处理效果），不出现报错、空白图或异常图形。
- **Risk Covered**：边界情况、异常路径。

🔴 **测试-分析**： 符合预期

### 场景 5：网格环与外边界顶点对齐一致性

- **Scenario Objective**：验证同心网格多边形与最外层边界多边形的顶点严格对齐，形成规整的蛛网结构。
- **Scenario Description**：网格环与外边界分别由两套独立逻辑生成，若计算角度的方式不一致，会出现网格线终点未落在边界顶点上的错位现象，是本次实现中被明确记录过的高风险坑点。
- **Pre-condition**：雷达图已开启蛛网网格，包含多层刻度（如3层以上同心网格）。
- **Key Steps**：
  1. 开启蛛网网格后放大查看图表任意一个顶点区域；
  2. 检查该顶点处的所有同心网格线与外边界线的交汇点。
- **Expected Result**：所有同心网格环在同一 spoke 方向上的顶点与外边界多边形的对应顶点完全重合，无错位、无断裂。
- **Risk Covered**：Rendering、跨渲染路径一致性。

🔴 **测试-分析**： 符合预期

### 场景 6：结合轴线/网格颜色脚本联合使用

> 备注：脚本中 min/max 统一、颜色/线型设置调用的是既有 Scale/AxisSpec API，非本次 PR 新增能力，本场景仅验证与 webGrid 的组合兼容性，相关异常不应算作 webGrid 缺陷。

- **Scenario Objective**：验证蛛网网格属性与已有的轴线颜色、网格颜色、网格线型等脚本属性可以正确组合生效。
- **Scenario Description**：需求单历史记录中的示例脚本展示了蛛网网格与颜色/线型定制同时使用的典型用法，需保证多个脚本属性叠加设置时互不冲突。
- **Pre-condition**：使用需求单中提供的完整示例脚本（设置 webGrid、统一各轴最小/最大值、设置线条颜色为灰色、细线网格样式）。
- **Key Steps**：
  1. 将示例脚本整体应用到雷达图；
  2. 查看图表渲染效果。
- **Expected Result**：图表呈现灰色细线的多边形蛛网网格，各轴刻度范围统一，颜色、线型与多边形结构均按脚本预期正确显示，无相互覆盖或失效的情况。
- **Risk Covered**：跨模块交互、脚本兼容。

🔴 **测试-分析**： 符合预期

### 场景 7：非雷达图的极坐标图表（饼图/环形图）设置该属性

- **Scenario Objective**：验证在非雷达图但同样使用 `PolarCoord` 的图表（如饼图、环形图）上误设置蛛网网格属性时的表现。
- **Scenario Description**：饼图/环形图的内层坐标构造时 X 轴为空（没有真正的 X 维度刻度），`getSidesCount()` 在此场景下应恒为 0，多边形分支不会触发；需要验证即便用户误调用该脚本属性，饼图/环形图也不会产生任何非预期的图形畸变。
- **Pre-condition**：创建一个饼图/环形图，脚本中对其坐标对象调用蛛网网格设置。
- **Key Steps**：
  1. 在饼图/环形图脚本中调用 `graph.getCoordinate().setWebGrid(true);`；
  2. 查看图表渲染效果，并与不调用该脚本时对比。
- **Expected Result**：饼图/环形图渲染效果与不调用该脚本时**完全一致**——始终保持圆形/圆弧外观，不出现多边形、不出现渲染异常或崩溃；即该属性对饼图/环形图应无任何可观察的影响（等同于未生效）。
- **Risk Covered**：跨模块影响、非法输入/非预期调用。

🔴 **测试-分析**： 符合预期

### 场景 8：图表导出与打印一致性

- **Scenario Objective**：验证开启蛛网网格的雷达图在导出为 PDF/Excel/图片以及打印预览时，图形效果与在线预览保持一致。
- **Scenario Description**：导出/打印复用同一套图形绘制逻辑，但涉及坐标换算与页面适配，需验证多边形网格不会在导出过程中出现比例失真、顶点错位或裁切问题。
- **Pre-condition**：雷达图已开启蛛网网格并正常显示。
- **Key Steps**：
  1. 将该雷达图分别导出为 PDF、Excel、PNG/图片格式；
  2. 打开打印预览查看效果；
  3. 与在线预览效果逐一比对。
- **Expected Result**：所有导出格式及打印预览中的多边形网格外观、顶点对齐、颜色/线型均与在线预览保持一致，无变形或错位。
- **Risk Covered**：跨模块影响（Export/Print）、渲染一致性。

🔴 **测试-分析**： 符合预期

### 场景 9：向后兼容 — 已有图表升级后的行为

- **Scenario Objective**：验证在功能上线前创建、且从未涉及新脚本属性的雷达图/极坐标图表，在版本升级后打开时行为不受影响。
- **Scenario Description**：`equalsContent` 新增了 `webGrid` 字段比较，涉及坐标对象"结构相等性"判断，可能间接影响图表缓存、增量渲染等跨模块逻辑；需要确认老图表升级后不会因该字段的引入而产生非预期的重新渲染或缓存判断错误。
- **Pre-condition**：使用升级前版本创建的雷达图/极坐标图表资产（不含 webGrid 相关脚本）。
- **Key Steps**：
  1. 将该图表资产导入/打开于当前（含本功能）版本环境；
  2. 反复刷新图表、切换页面再返回，观察渲染及缓存行为。
- **Expected Result**：图表渲染效果（圆形网格）与升级前一致，刷新/切换过程中未出现异常的重新计算、渲染卡顿或缓存判断错误。
- **Risk Covered**：向后兼容性、跨模块交互（缓存一致性）。

🔴 **测试-分析**： 符合预期

### 场景 10：脚本 Auto-complete 与文档一致性检查

- **Scenario Objective**：验证新增脚本属性能被脚本编辑器智能提示正确识别，且相关脚本 API 说明已同步更新。
- **Scenario Description**：本功能是纯脚本驱动、无 UI 入口的能力，用户完全依赖脚本编辑器的智能提示和帮助文档来发现和正确使用该属性，若提示缺失或文档未同步，将大幅降低该功能的可发现性和可用性。
- **Pre-condition**：打开雷达图的脚本编辑面板。
- **Key Steps**：
  1. 在脚本编辑器中输入坐标对象变量并触发自动补全提示；
  2. 查阅产品脚本 API 帮助文档中关于极坐标/雷达图网格样式的说明。
- **Expected Result**：智能提示列表中包含新增的设置/获取蛛网网格属性的方法；帮助文档中包含该属性的用法说明及示例。
- **Risk Covered**：脚本兼容（Auto-complete）、文档一致性。

🔴 **测试-分析**： Bug #75657, 没merge，fass先不让报doc的，后面报
