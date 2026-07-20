# Feature #74853 测试分析报告

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：改进 Gantt 图表的坐标轴渲染方式，使甘特条从坐标轴起点开始绘制（无间隙）、标签居中显示在刻度之间（类目轴风格）、网格线与数据带对齐。
- **用户价值**：解决当前 Gantt 图表在轴起点存在视觉空隙、日期标签与时间刻度对齐生硬（不直观）、网格线与实际数据条带错位的问题，提升甘特图的可读性与专业度。
- **Feature 类型**：Rendering（图表渲染，核心图形引擎 `inetsoft.graph.*` + 报表组合层 `inetsoft.report.composition.graph.*`）。

---

## 第二部分：Implementation Change（变更分析）

**核心变更**：

1. `AxisSpec` 新增 `labelBetween` 布尔属性（默认 `false`，`@TernMethod` 暴露给脚本），并纳入 `equals()`/`hashCode()`。
2. `DefaultAxis`：当 `isLabelBetween()==true` 时，改用 `vlabels.length` 而非 `ticks.length` 计算每个 label/band 的宽度（`wwidth`/`wheight`），并将标签位置从"对齐刻度"改为"相邻刻度中点"，最后一个标签以轴末端（`length`）作为"虚拟边界刻度"计算中点。
3. `GanttGraphGenerator.fixGanttCoord()`：
   - 新增 `scale.setFill(true)`（实现"从轴起点开始渲染，无间隙"）。
   - 新增 `yscale.getAxisSpec().setLabelBetween(true)`（实现"标签居中于刻度之间"）。
   - 新增 `xScale.getAxisSpec().setGridBetween(true)`（实现"网格与数据带对齐"）。
   - **删除**了原先基于 `AxisDescriptor`（`xdesc`）重建 `AxisSpec` 的大段逻辑（含 `setLineColor`/`setLineVisible`/`setTickVisible`/`setTextSpec`/`setLabelVisible`/`setTextFrame`/`setTruncate`/`addHighlightToAxis` 及 Gantt/普通图表两种取值分支），仅以注释说明"`fixCoordProperties()` 已重新应用 AxisSpec，此处只需补充 labelBetween"。
   - 移除一处与本次特性无关的死代码：`XCube.SQLSERVER` 判断 + `Tool.localize(label)` 调用（label 变量此后未被使用）。
   - 循环写法、`List` 是否 `final` 等纯代码风格调整，无行为影响。

**目标覆盖度**：

| Feature 需求点 | 是否覆盖 | 说明 |
|---|---|---|
| 从轴开始渲染（无间隙） | 已覆盖 | `scale.setFill(true)` |
| 标签在刻度间渲染 | 已覆盖，但存在语义偏差 | `AxisSpec` 注释声称"N 个刻度产生 N-1 个标签"，但 `DefaultAxis` 实际实现要求 `vlabels.length == tlocs.length`（即 N 个刻度对应 N 个标签，最后一个用轴末端补位），文档与实现不一致 |
| 网格与数据带对齐 | 已覆盖 | 复用已有的 `gridBetween` 属性，仅新增调用点 |

**行为变化对比表**：

| Before Behavior | After Behavior | Risk |
|---|---|---|
| Gantt 时间轴按默认 padding 渲染，起点与轴线间有空隙 | `TimeScale.setFill(true)`，起点无空隙，条形贴轴渲染 | 可能影响首/末数据点的视觉留白及与其他图表元素（如提示线、边界高亮）的重叠 |
| Y 轴（任务/分组）标签对齐刻度线 | Y 轴标签居中于相邻刻度之间，最后一个标签以轴末端为虚拟边界 | 当 `vlabels.length != tlocs.length`（如标签被去重/截断）时静默回退为旧的对齐刻度方式，但同一时刻 band 宽度计算已按 `vlabels.length` 变化，导致网格与标签错位 |
| X 轴网格线默认不在刻度间绘制 | X 轴 `gridBetween=true`，网格与数据带对齐 | 与新的 label-between 宽度计算共同作用，若二者判定条件不同步会造成网格/标签不对齐 |
| `fixGanttCoord` 手动拷贝 `AxisDescriptor` 的颜色/可见性/高亮/文本格式到新建 `AxisSpec` | 该逻辑整体删除，改由外部 `fixCoordProperties()`（未在本 diff 中）负责 | 若 `fixCoordProperties()` 未覆盖 `addHighlightToAxis` 等能力，将导致 Gantt 图表自定义轴线颜色/可见性/高亮/文本截断等特性回归丢失 |
| Gantt 标签存在一处未使用的 `Tool.localize(label)` 调用 | 该死代码整体删除 | 若该 label 变量实际在别处（diff 未展示范围外）被引用，删除可能导致本地化文本丢失（当前证据显示为死代码，风险较低但需验证） |

---

## 第三部分：Risk Identification（风险识别）

- **Rendering / 默认行为变化**：Gantt 条形起点无间隙渲染是全局默认开启（非可配置开关），所有现有 Gantt 图表的视觉呈现都会发生变化，属于隐性的默认行为变更。
- **Rendering / 边界情况**：`vlabels.length == tlocs.length` 校验失败时的静默降级，导致标签位置与网格带宽计算基准不一致（网格用 `vlabels.length`，位置用旧 `tlocs`）。
- **Cross-Module / 回归风险**：`AxisSpec.labelBetween` 是共享类新增字段，理论上默认值 `false` 不应影响非 Gantt 图表，但需要回归验证其他图表类型（Bar/Line/分类轴）不受影响。
- **Compatibility / 向后兼容性**：`fixGanttCoord` 中删除了对 `AxisDescriptor` 自定义属性（颜色、可见性、高亮、截断、文本格式）的应用逻辑，若替代方法未完全覆盖，已有的自定义 Gantt 轴样式（尤其是 `addHighlightToAxis` 高亮）可能回归丢失。
- **Data Consistency**：Y 轴 `labelBetween` 与 X 轴 `gridBetween` 是否与 Gantt 图的分组/里程碑字段渲染保持一致，尤其涉及 brush、facet 等叠加场景时的联动。
- **Functional / 非法输入及边界**：单一数据点、单一刻度、跨大范围日期导致标签被抽稀（`skip` 逻辑）等场景下 `midTlocs` 计算是否越界或退化。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**：
  1. Gantt 条形是否从坐标轴起点开始渲染，无空隙。
  2. Y 轴任务/分组标签是否居中显示在相邻刻度之间。
  3. X 轴网格线是否与数据条带对齐。
  4. 标签数与刻度数不一致时的降级表现是否可接受（不出现错位、重叠、越界）。

- **高风险路径**：
  - 自定义了轴线颜色/可见性/高亮/截断格式的已有 Gantt 图表升级后的样式回归。
  - 极端日期范围（单点、超长跨度触发标签抽稀）下的标签与网格对齐。
  - 多分组/多里程碑字段同时存在时的 Y 轴 labelBetween 渲染。

- **涉及模块**：
  - 图表核心引擎（`AxisSpec`/`DefaultAxis`/`Scale`/`Coordinate`）—— 影响所有使用 `AxisSpec` 的图表类型，需做非 Gantt 图表的回归冒烟。
  - Gantt 图表专属渲染路径（`GanttGraphGenerator`）。
  - 脚本/表达式引擎（`AxisSpec` 新增 `@TernMethod`，可被 Groovy 脚本调用）。

- **专项检查**：
  - **本地化**：`GanttGraphGenerator` 中移除的 `Tool.localize(label)` 调用需验证 Gantt 任务/里程碑标签的本地化文本显示是否受影响（尤其在非默认 locale 及 SQL Server Cube 数据源场景）。
  - **脚本兼容**：`AxisSpec.isLabelBetween()`/`setLabelBetween()` 已标注 `@TernMethod`，需验证脚本中可正常调用该 API 设置/读取，且对非 Gantt 图表脚本行为无副作用；Auto-complete 是否能识别新方法。
  - **配置检查**：本次改动未涉及 `SreeEnv`/`defaults.properties`，可不做该项。
  - **文档一致性**：`AxisSpec.isLabelBetween()` 的 Javadoc 声称"N 个刻度产生 N-1 个标签"，与 `DefaultAxis` 实际实现（要求标签数等于刻度数、末位用轴末端补位）不符，需要与产品/知识库文档核对甘特图标签-刻度对应关系的正确定义。

- **Mobile 影响检查**：不涉及响应式布局/触摸交互/工具栏改动，可不做专项移动端验证，但需确认小屏幕下 Gantt 图表整体渲染无明显异常（作为回归冒烟的一部分）。

- **Print Layout / Export 影响检查**：本次改动涉及坐标计算（`DefaultAxis` 中 `wwidth`/`wheight`/`tlocs`）及 Scale 填充属性，属于影响图表布局坐标的变更，**需要验证** Gantt 图表在打印预览及 PDF / Excel / Image 导出中的坐标轴、网格、标签对齐效果与在线预览一致。

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景 1：Gantt 图表条形从轴起点开始渲染

- **Scenario Objective**：验证甘特图任务条从时间轴起始位置开始绘制，不再出现起始空隙。
- **Scenario Description**：用户创建甘特图后，若时间轴起点与第一个任务条之间存在明显留白，会造成图表左侧空间浪费和视觉不连贯，是本次改进要解决的核心痛点。
- **Key Steps**：
  1. 创建包含开始时间、结束时间、任务名称字段的甘特图。
  2. 观察时间轴左边界与第一个任务条起始位置的关系。
- **Expected Result**：第一个任务条紧贴时间轴起始刻度绘制，轴起点与条形之间无空白间隙。
- **Risk Covered**：默认行为变化。

🔴 **测试-分析**： 符合预期

---

### 场景 2：Y 轴任务分组标签居中显示在相邻刻度之间

- **Scenario Objective**：验证甘特图纵轴（任务/分组）标签以类目轴风格居中显示，而非与刻度线对齐。
- **Scenario Description**：原有标签与刻度线对齐的方式在数据条较密集时容易造成标签与条形错位，影响用户判断标签对应的具体任务行。
- **Key Steps**：
  1. 创建包含多个任务分组的甘特图。
  2. 观察每个分组标签相对于其所在任务行（数据带）的位置。
- **Expected Result**：每个分组标签居中显示在对应的任务行区域内，而非贴靠在刻度分割线上；最后一个分组标签同样居中于末尾任务行内。
- **Risk Covered**：默认行为变化、状态切换（渲染模式变化）。

🔴 **测试-分析**： 符合预期

---

### 场景 3：X 轴网格线与任务条带对齐

- **Scenario Objective**：验证时间轴网格线的位置与实际甘特条所在的时间区间对齐，而非仅落在刻度点上。
- **Scenario Description**：网格线与数据带错位会让用户误判某个任务条实际横跨的时间区间，是数据可读性的关键风险点。
- **Key Steps**：
  1. 创建跨多个时间单位（如跨多月）的甘特图。
  2. 对照每条任务的起止时间，检查网格分隔线是否落在对应时间区间的边界上。
- **Expected Result**：网格线与任务条实际所跨的时间带边界对齐，未出现网格线穿过条形中部或与条形边界错位的情况。
- **Risk Covered**：渲染或 UI 行为变化、数据一致性。

🔴 **测试-分析**： 符合预期

---

### 场景 4：标签数量与刻度数量不一致时的边界表现

- **Scenario Objective**：验证当时间跨度极端（单一时间点、超长时间跨度导致标签被抽稀）时，标签与网格显示不出现错位或异常。
- **Scenario Description**：当数据范围导致显示的标签数量少于或多于刻度数量时，标签定位逻辑存在静默降级路径，可能造成网格宽度与标签实际位置不匹配，是本次实现中最容易被忽略的边界缺陷来源。
- **Key Steps**：
  1. 构造仅含单一任务（单一日期）的甘特图数据。
  2. 构造跨度极大（如跨越数年）导致标签被自动抽稀显示的甘特图数据。
  3. 分别观察轴标签与网格带的对齐情况。
- **Expected Result**：无论标签是否被抽稀，标签位置与网格带宽度始终保持一致对应关系，不出现标签悬空、网格与标签明显错位或标签重叠越界的情况。
- **Risk Covered**：边界条件、数据一致性、异常路径。

🔴 **测试-分析**： 符合预期

---

### 场景 5：自定义轴样式（颜色/可见性/高亮/截断）在甘特图上的保留情况

- **Scenario Objective**：验证已对甘特图坐标轴设置过自定义颜色、可见性、截断或高亮的图表，在本次更新后样式设置依然生效。
- **Scenario Description**：本次实现移除了原先手工拷贝坐标轴自定义属性（含高亮）的代码块，改由其他机制统一处理，如替代机制未完全承接原有能力，会导致用户此前配置的坐标轴外观设置在升级后悄然失效，属于典型的隐蔽回归风险。
- **Pre-condition**：已存在一个甘特图，其坐标轴或分组维度设置了自定义线条颜色、标签截断或高亮条件。
- **Key Steps**：
  1. 打开已配置自定义轴样式（颜色/截断/高亮）的甘特图。
  2. 检查坐标轴线条颜色、标签截断显示、高亮条件是否与配置一致。
- **Expected Result**：坐标轴的颜色、可见性、截断、高亮等自定义样式均按原有配置正确显示，未出现被重置为默认样式的情况。
- **Risk Covered**：向后兼容性、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 6：其他图表类型不受 AxisSpec 新增属性影响

- **Scenario Objective**：验证除甘特图外的其他图表类型（如柱状图、折线图、分类轴图表）的坐标轴渲染未受本次改动影响。
- **Scenario Description**：`labelBetween` 是加在通用坐标轴属性类上的新字段，默认值为关闭，理论上不影响其他图表，但由于是共享底层类，存在误触发的回归风险，需要跨模块验证。
- **Key Steps**：
  1. 创建非甘特图类型的图表（如柱状图、折线图），使用与之前版本相同的数据和配置。
  2. 对比坐标轴标签位置、网格线样式与升级前是否一致。
- **Expected Result**：非甘特图表的坐标轴标签仍对齐刻度线，网格线样式与升级前保持一致，未出现居中偏移或起点贴轴等甘特图特有的新行为。
- **Risk Covered**：跨模块影响、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 7：脚本中读写 labelBetween 属性

- **Scenario Objective**：验证用户可通过脚本对坐标轴的"标签居中"属性进行读取和设置，且脚本编辑体验正常。
- **Scenario Description**：新属性已开放给脚本调用，若脚本层暴露的方法与实际渲染行为不一致，或自动补全未识别该新方法，会造成用户脚本个性化配置图表时的体验缺陷。
- **Key Steps**：
  1. 在图表脚本编辑器中输入坐标轴对象相关脚本，检查是否有获取/设置标签居中属性的方法自动补全提示。
  2. 编写脚本显式设置该属性并应用到图表。
    ```javascript
    var coord = graph.getCoordinate();
    var scale = coord.getXScale();
    var scaley = coord.getYScale();
    var spec = scale.getAxisSpec();
    spec.setGridBetween(false);
    var specY = scaley.getAxisSpec();
    specY.setLabelBetween(false);
    ```
- **Expected Result**：脚本编辑器可自动补全该方法；脚本设置后图表渲染效果与预期的标签居中/取消居中效果一致。
- **Risk Covered**：脚本兼容性、安全性问题（脚本入参校验）。

🔴 **测试-分析**： Bug #75694

---

### 场景 8：打印预览与导出中的甘特图坐标轴一致性

- **Scenario Objective**：验证甘特图在打印预览、PDF/Excel/图片导出中，坐标轴起点、标签居中、网格对齐效果与在线预览一致。
- **Scenario Description**：本次改动涉及坐标计算逻辑，导出渲染路径与在线预览路径可能使用不同的坐标处理分支，若未同步验证，容易出现"预览正常、导出错位"的用户可见缺陷。
- **Key Steps**：
  1. 在门户中打开已应用本次改动效果的甘特图，进入打印预览。
  2. 分别导出为 PDF、Excel、图片格式。
  3. 对比导出结果与在线预览中的坐标轴起点、标签位置、网格对齐效果。
- **Expected Result**：打印预览及各导出格式中甘特图的坐标轴起点无间隙、标签居中显示、网格与数据带对齐效果与在线预览保持一致。
- **Risk Covered**：跨模块影响（导出模块）、渲染一致性回归风险。

🔴 **测试-分析**： 符合预期
