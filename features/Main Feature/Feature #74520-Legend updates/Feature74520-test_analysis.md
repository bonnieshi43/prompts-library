---
type: feature-test-analysis
source_feature: "Feature #74520 — Legend updates"
source_pr: "https://github.com/inetsoft-technology/stylebi/pull/3424 (18 files changed, 5 commits, merged into epic-74519)"
---

# Feature #74520 / PR #3424 需求与实现分析

> 说明：PR 内容基于 Files changed 页面提供的 diff 片段，覆盖 18 个文件中的关键改动点。部分文件（如导出模块 Excel/PDF Exporter、脚本 API 绑定层、多语言资源文件）未出现在提供的 diff 中，其与本次改动的一致性无法从现有材料直接验证，相关结论已在下文中标注为"需补充验证"而非确定性结论。

---

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

- **功能核心目标**：优化图例（Legend）的视觉外观与空间利用，具体包含四项：
  1. 新增圆角边框选项
  2. 优化布局以节省空间
  3. 修复内容区与图例项之间背景色不一致（"weird background color"）问题
  4. 增加内边距（padding）
- **解决的业务问题**：图例视觉观感陈旧、间距拥挤、内容区背景色与外层背景不一致，影响 Look and Feel（关联 Epic #74519）。
- **涉及模块**：
  - Backend 图形渲染层（`inetsoft.graph.guide.legend.*`，AWT/Graphics2D 绘制）
  - 数据/持久化层（`LegendSpec`、`LegendsDescriptor` 的 XML 序列化）
  - Web 模型层（`LegendContainer`、`LegendFormatDialogModel` 等 DTO）
  - 前端 Angular 组件（图例容器渲染、格式设置面板）
- **功能类型**：UI 视觉样式 + 布局计算（属混合型：图形渲染逻辑变更 + 新增用户可配置属性）。

### 2. 需求清晰度与完整性

- **圆角选项的默认值未在需求中定义**：需求仅描述"新增圆角选项"，未说明该选项默认开启还是关闭，也未说明对新建图表与已有（历史）图表是否应有不同默认行为。实现中自行决定了"新图表默认开启、历史图表默认关闭"的策略，这是需求未覆盖、由实现方补充定义的行为，存在与产品预期不一致的风险。
- **"优化空间布局"缺乏量化标准**：需求未定义具体的间距值（如 padding 应为多少像素）、圆角半径应为多大，也未说明是否所有图例（无论是否开启圆角）都应统一应用新的内边距逻辑。实现中将 8px 内边距（BORDER_PADDING）与 4px 外间隙（OUTER_GAP）作为**全局无条件生效**的常量，而非仅在开启圆角时生效——这一范围扩张（影响所有已有图例的尺寸与位置）在需求文本中并未被显式要求或说明。
- **"背景色不一致"缺乏具体复现场景描述**：需求未描述该 bug 的具体触发条件（例如何种图例类型、何种透明度设置下出现），导致无法直接从需求推导出针对性的回归验证点，只能依赖实现 diff 反推。
- **Ticket 状态流转存在异常信号**：该 Feature 曾从 "Resolved" 变更为 "Closed"，附带评论 "May need more work"。这提示该功能在关闭时可能仍存在未完全解决的遗留问题，测试阶段应对此保持更高警惕，而非默认实现已完全达标。

### 3. 测试风险识别

- **行为误解风险**：圆角默认值的实现选择（新建图表默认开启）若与产品/UX 团队预期不符，将导致大范围新建图表的视觉呈现"意外改变"，而非用户主动选择的结果。
- **跨模块影响**：BORDER_PADDING/OUTER_GAP 的引入影响 `Legend` 的最小/首选宽高计算、内容区域计算、多图例分组布局（`LegendGroup`）、以及区域命中测试（`ListLegendContentArea`），跨越渲染、布局、交互（tooltip/drill-through）三个子系统。
- **状态一致性问题**：`roundCorners` 属性需要在 `LegendSpec`（运行时）、`LegendsDescriptor`（持久化）、`LegendFormatDialogModel`/`LegendFormatGeneralPaneModel`（对话框）、`LegendContainer`（前端 DTO）四层之间保持同步，任一层遗漏都会造成设置丢失或显示不一致。
- **性能放大风险较低**：本次改动集中在布局常量与绘制路径分支判断，未引入额外的重复计算或高频调用路径，性能层面风险有限，但仍需关注圆角绘制（`RoundRectangle2D`）在大量图例/频繁刷新场景下的绘制开销。
- **兼容性风险**：历史保存的 Viewsheet/报表在重新打开后，图例尺寸会因 BORDER_PADDING 的引入而整体变化（即使 roundCorners 仍为 false），可能导致已保存的手动调整布局（如自定义图例位置/大小）出现视觉错位或裁剪。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

本 PR 属于 **Feature + 视觉 Bugfix 混合型改动**，具体分层：

| 层级 | 改动内容 |
|---|---|
| 渲染/绘制层（Backend Graphics2D） | `Legend.java` 中 `paint`/`paintBg`/`paintContent`/`paintTitle` 方法新增圆角绘制分支与背景重绘范围调整 |
| 布局计算层（Backend） | `Legend.java` 中最小/首选宽高、内容区域、标题区域、条带区域、图例项区域的计算全部加入 `BORDER_PADDING` 偏移；`LegendGroup.java` 移除"单图例限宽"逻辑 |
| 坐标/交互层（Backend） | `ListLegendContentArea.java` 移除原有的内容区偏移补偿逻辑，改为直接使用原始坐标 |
| 数据模型/持久化层 | `LegendSpec`、`LegendsDescriptor` 新增 `roundCorners` 字段及序列化支持；`ChartVSAssemblyInfo` 设置新图表默认值 |
| Web DTO 层 | `LegendContainer`、`LegendFormatDialogModel`、`LegendFormatGeneralPaneModel` 新增/透传 `roundCorners`、`outerGap` 字段 |
| 前端 UI 层 | 新增"Round Corner"复选框；图例容器组件新增 `border-radius` 与基于 `outerGap` 的位置/尺寸偏移；图例内容区域背景色置空以避免叠加 |

**受影响的用户路径**：
- 图表设计器中"图例格式"对话框（新增圆角勾选项）
- 所有包含图例的图表在 Viewer 中的渲染呈现（无论是否使用圆角，因 padding/gap 为全局生效）
- 图例项的鼠标交互（悬浮提示、下钻、选中），因坐标计算方式变化而可能受影响
- 报表/仪表板的打印预览与导出（PDF / Excel / Image），因底层 Graphics2D 绘制路径变化

### 2. 需求实现一致性

- **核心功能基本覆盖**：四项需求点（圆角、布局优化、背景色修复、padding）在 diff 中均能找到对应实现，功能覆盖度较完整。
- **存在需求未要求的隐式默认行为变更（过度实现风险）**：
  - `ChartVSAssemblyInfo.setDefaultFormat()` 中为**新建图表**默认设置 `roundCorners = true`，而需求仅要求"新增一个选项"，并未要求默认开启。这是实现方自行补充的产品决策，需要与需求方/产品确认是否符合预期。
  - `BORDER_PADDING`（8px）与 `OUTER_GAP`（4px）的引入对**所有图例**（不区分是否开启圆角）无条件生效，意味着"Add padding"这一需求被实现为全局默认行为变更，而非仅作为圆角选项的配套效果。这会改变所有历史图表的图例尺寸与位置，超出"新增可选项"的需求范畴。
- **默认行为变化明确存在新旧图表差异**：新建图表 `roundCorners` 默认 `true`，从 XML 加载的历史图表默认 `false`（`parseAttributes` 中属性缺失时保持默认值 `false`）。这一差异化默认值设计合理地保障了历史图表向后兼容，但也意味着"是否为圆角"取决于图表创建时间而非用户主动选择，需要在测试中明确验证并向用户说明。
- **用户交互行为变化**：
  - 图例边框绘制逻辑由统一的 `Common.drawRect` 分裂为"圆角用 `RoundRectangle2D` + 普通用 `Common.drawRect`"两条路径，两条路径在描边宽度/像素对齐处理上是否完全一致（如原有的 "don't draw border outside of bounds" 修复 (56446) 是否在圆角路径下同样生效）需要重点验证。
  - 前端图例容器的定位方式由"直接使用 `bounds`"改为"叠加 `outerGap` 偏移"，若某些历史保存的图例位置数据是基于旧坐标系统统计/展示的（例如用户手动拖拽保存的图例位置），刷新后可能出现轻微位移。

### 3. 关键实现风险

**风险 1：OUTER_GAP 与 BORDER_PADDING 的强耦合不变式**
- **风险来源**：代码注释显式声明 "INVARIANT: BORDER_PADDING must be >= OUTER_GAP"，否则图例项会渲染到可见背景区域之外。该不变式仅通过注释约束，没有代码层面的断言或校验。
- **影响模块**：`Legend.java` 的绘制与布局计算，一旦未来任一常量被单独修改，将直接导致图例项溢出背景视觉区域。
- **潜在后果**：视觉回归缺陷（图例项"漂浮"在背景框外），且由于是常量硬编码，问题可能在长期后才被引入且不易被静态发现。

**风险 2：图例项命中区域坐标计算简化**
- **风险来源**：`ListLegendContentArea.setRelPos()` 原本通过 `contentBounds - bounds` 计算补偿偏移（`pos2`），本次改动移除该补偿、直接使用 `pos`，理由是"新的坐标系统下图例项已经相对于图例原点布局"。
- **影响模块/用户路径**：图例项的 tooltip 显示位置、下钻（drill-through）点击区域、选中态高亮区域。
- **潜在后果**：如果该坐标假设在某些图例类型（如 Scalar/渐变图例 vs. 普通分类图例）下不完全成立，会导致鼠标交互区域与视觉呈现位置错位，属于较隐蔽且不易在纯视觉走查中发现的问题。

**风险 3：背景重绘范围变更导致的双重绘制/裁剪副作用**
- **风险来源**：`paintBg` 新增 `useRoundCorners` 参数区分"外层背景"（可为圆角）与"内层区域"（标题行、内容区，始终为矩形）；同时新增了在 `roundCorners` 开启时对 `g2` 做 `RoundRectangle2D` 的二次裁剪（注释中称为 "belt-and-suspenders" 保底措施）。
- **影响模块**：图例整体绘制路径、`VLabel.paint(g, false)` 抑制单项背景重绘的改动。
- **潜在后果**：如果 `BORDER_PADDING`（8px）与圆角裁剪区域的假设关系被打破（注释中提到该保底措施依赖 "content 内缩量 8px 大于 OUTER_GAP 4px" 这一前提），content 区域仍存在被圆角裁掉边缘像素的可能，尤其在图例项紧贴边界排列时。

**风险 4：多图例分组布局的宽度策略变更**
- **风险来源**：`LegendGroup.layoutTB()` 移除了"仅有单个图例时，宽度不超过 preferredWidth"的限制，改为始终填满分配宽度。
- **影响模块/用户路径**：仅包含单个图例的图表在图例区域的视觉宽度（可能从"紧凑贴合内容"变为"撑满可用空间"）。
- **潜在后果**：对于原本依赖"图例宽度自适应内容、不占多余空间"的图表布局（尤其是与其他内容并排显示时），该改动可能造成视觉上明显变宽，属于影响面较广的默认行为变化，且未在需求中被显式提及为预期效果。

**风险 5：本地化资源未在提供的 diff 中体现**
- **风险来源**：新增 UI 文本 `_#(Round Corner)` 依赖多语言资源文件条目，但本次 diff 未包含任何 `.properties`/资源包文件的改动。
- **影响模块**：非英文语言环境下的图例格式对话框。
- **潜在后果**：若资源文件未同步更新，非英文界面下该复选框标签可能显示为原始 key 或退化为英文，构成本地化缺陷。**（PR 内容未完全可见，此项基于现有 diff 范围推断，需人工确认资源文件是否在其他未展示的 commit/文件中已补充。）**

**风险 6：脚本（Script）与导出（Export）路径的同步支持情况未在 diff 中验证**  Bug #75561
- **风险来源**：本次 diff 未包含任何 Script API 绑定层（如 `LegendDescriptor` 的脚本可访问属性列表）或导出相关类（PDF/Excel Exporter）的改动文件。
- **影响模块**：通过脚本动态设置图例样式的场景、PDF/Excel 导出中图例的圆角与背景呈现效果。
- **潜在后果**：若 `roundCorners` 未同步加入脚本可控属性列表，用户将无法通过脚本控制该新属性；若导出模块存在独立的图例绘制路径（而非直接复用 `Legend.paint()`），则导出效果可能与 Viewer 内呈现不一致。**（PR 内容未完全可见，需在测试阶段针对导出结果与脚本 API 单独验证。）**

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

- **本次改动引入的核心风险**集中在两个层面：(1) 全局性、无条件生效的布局常量变更（BORDER_PADDING/OUTER_GAP）对所有历史图例的尺寸与位置产生连锁影响；(2) 新增的 `roundCorners` 属性在四层数据模型（运行时 Spec、持久化 Descriptor、对话框 Model、前端 DTO）之间的一致性传递。
- **风险影响范围**：不仅限于新使用圆角功能的用户，而是覆盖**所有**包含图例的图表/报表/仪表板（因 padding 变更全局生效）。
- **状态一致性问题**：存在，涉及 `LegendSpec`/`LegendsDescriptor` 的 `equals`/`hashCode`/序列化是否完整同步 `roundCorners` 字段（diff 中已确认更新，但未确认是否存在遗漏的 `clone()`/深拷贝方法未同步更新）。
- **默认行为变化**：存在（新图表默认圆角开启、所有图例默认新增内边距与外间隙），需要明确区分"新建图表"与"历史图表加载"两类场景分别验证。
- **历史配置影响**：存在（已保存 Viewsheet 在重新渲染后图例尺寸变化，可能与用户此前手动调整的布局产生冲突）。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：验证四项需求功能点（圆角、布局、背景色修复、padding）是否按预期呈现。
- **Scope**：图例格式对话框、图表设计器画布、Viewer 渲染。
- **Validation Goal**：勾选/取消"Round Corner"后图例边框与背景是否正确切换为圆角/直角；图例内容区背景色与外层背景是否不再出现色差；padding 是否统一生效。

若涉及前端交互，需在以下环境验证：

- **Browser**：桌面端主流浏览器下图例圆角、内边距、多图例并排布局的视觉呈现。
- **Mobile**：图例区域在移动端/小屏幕下的响应式布局验证，重点关注 `outerGap` 偏移量在小尺寸容器下是否导致图例被过度压缩或边框被裁切；图例拖拽/缩放交互（`chart-legend-container` 的 move/resize）在触摸场景下的偏移计算是否正确。

因本次改动涉及图形绘制方法（`paint`/`paintBg`）、布局坐标计算（`getContentBounds`/`layoutItems`/`layoutBand`）、CSS 样式变更（`border-radius`），需额外验证：

- **Print Layout / Export**：打印预览及 PDF / Excel / Image 导出中，图例圆角效果、内边距、背景色是否与 Viewer 内呈现一致（重点排查导出管线是否复用同一套 `Legend.paint()` 逻辑）。

因新增 UI 元素（Round Corner 复选框），需验证：

- **Script**：`roundCorners` 属性是否可通过脚本读写（若产品要求所有图例格式属性均支持脚本控制，需确认该属性未被遗漏）；脚本设置后 UI 与实际渲染是否同步一致。
- **Locale**：非英文语言环境下"Round Corner"标签是否有对应翻译资源，而非显示原始 key 或回退英文。

#### 回归测试（Regression）

- **受影响模块**：所有包含图例的历史图表/报表（因全局 padding/gap 变更），多图例分组布局（`LegendGroup`），图例项交互命中区域（tooltip、下钻、选中）。
- **可能被破坏行为**：
  - 历史保存的图例位置/大小在重新打开后发生视觉偏移或与相邻内容重叠。
  - 单图例图表宽度较改动前变宽（因 `LegendGroup` 移除单图例限宽逻辑）。
  - 图例项的悬浮提示/下钻点击区域与视觉呈现位置不一致（因坐标偏移补偿逻辑被移除）。
  - 图例边框绘制在非圆角路径下是否仍保留原有的"不越界绘制"修复（56446）与双线支持（53529）效果。

#### 边界与异常（Boundary）

- 极小尺寸图例（容器宽高接近或小于 `BORDER_PADDING + OUTER_GAP` 总和）下，内容区域计算是否出现负值或图例项挤压重叠。
- 仅含标题、无图例项的图例在新增 padding 下的最小尺寸计算是否正确。
- 渐变（Scalar）图例与普通分类图例在圆角裁剪、内容区偏移上的表现是否一致（两者在 `getPreferredWidth0` 中有不同计算分支）。
- 多图例同时存在且宽度分配比例极端（如某一图例占比极小）时，全宽填充策略下的视觉效果。

#### 性能测试（Performance）

- 大量图例项（长列表分类图例）在开启圆角绘制（`RoundRectangle2D` 裁剪 + 描边）时的渲染耗时是否较原有矩形绘制出现明显退化，尤其是在图表频繁刷新（如联动筛选触发的重绘）场景下。

#### 兼容性测试（Compatibility）

- **默认行为变化**：新建图表 vs. 历史图表加载后 `roundCorners` 默认值差异的验证（新建应为开启，历史加载应为关闭）。
- **旧配置兼容**：历史保存的 Viewsheet XML（不含 `roundCorners` 属性）加载后是否正确回退为 `false`，且图例整体尺寸变化是否在可接受范围内、不影响仪表板整体布局的可用性。
- **浏览器差异**：`border-radius` CSS 样式在不同浏览器下的渲染一致性（一般风险较低，但建议纳入基本验证矩阵）。

#### 自动化测试建议

- **Unit**：`Legend` 类中 `getMinWidth0`/`getPreferredWidth0`/`getContentBounds` 等方法在引入 `BORDER_PADDING`/`OUTER_GAP` 后的计算结果单元测试；`LegendSpec`/`LegendsDescriptor` 的 `equals`/`hashCode`/`writeXML`/`parseAttributes` 对 `roundCorners` 字段的往返序列化测试。
- **Integration**：`GraphUtil.setLegendSpec()` 到 `Legend.paint()` 的属性传递链路集成测试，验证 `LegendsDescriptor.roundCorners` 能正确驱动最终绘制分支。
- **E2E**：图例格式对话框勾选"Round Corner" → 保存 → Viewer 中图例圆角呈现 → 导出 PDF/Excel 校验一致性的端到端关键路径。
- **Mock 需求**：涉及 Graphics2D 绘制结果的验证建议采用图像快照对比（visual regression）而非纯断言，因圆角/背景/padding 均为像素级视觉改动。

---

## 四、关键测试场景（Key Test Scenarios）

### 场景 1：历史图表加载后图例尺寸兼容性验证

- **Scenario Objective**：验证不含 `roundCorners` 属性的历史 Viewsheet 加载后，图例默认保持直角且整体布局不因新增 padding/gap 而破坏原有仪表板排版。
- **Scenario Description**：打开一个在本次改动前创建并保存、包含至少一个图例的历史 Viewsheet。
- **Key Steps**：
  1. 加载历史 Viewsheet（其 XML 中不含 `roundCorners` 属性）。
  2. 观察图例边框形态（应为直角）。
  3. 对比改动前后图例区域的宽高与相邻组件是否发生重叠或错位。
- **Expected Result**：图例默认呈直角边框；图例尺寸虽因新增 padding 略有变化，但不导致与相邻仪表板元素重叠或内容被裁剪。
- **Risk Covered**：默认行为兼容性风险、全局 padding 变更对历史布局的影响。

🔴 **测试-分析**：对bc的没有影响

### 场景 2：新建图表默认圆角行为验证

- **Scenario Objective**：验证新建图表的图例默认开启圆角效果，符合实现中 `ChartVSAssemblyInfo` 的默认值设定。
- **Scenario Description**：在图表设计器中新建一个图表并添加图例。
- **Key Steps**：
  1. 新建图表，添加一个包含图例的维度/度量。
  2. 不做任何图例格式设置，直接查看图例格式对话框中"Round Corner"复选框的初始状态及图例实际渲染效果。
- **Expected Result**：复选框默认勾选，图例边框与背景呈现圆角效果。
- **Risk Covered**：需求未明确的隐式默认值风险，需与产品预期核对。

🔴 **测试-分析**：结果正确默认圆角

### 场景 3：图例项交互命中区域一致性验证

- **Scenario Objective**：验证坐标计算简化后，图例项的鼠标交互（tooltip、下钻）区域与视觉呈现位置保持一致。
- **Scenario Description**：在一个包含多个图例项、且设置了下钻或悬浮提示功能的图表上进行交互测试。
- **Key Steps**：
  1. 分别对普通分类图例与渐变（Scalar）图例的图例项进行鼠标悬浮。
  2. 验证 tooltip 弹出位置是否精确对齐鼠标所在的图例项视觉区域。
  3. 若配置了下钻，点击图例项验证下钻是否被正确触发。
- **Expected Result**：tooltip 与点击命中区域均与图例项视觉位置精确对齐，两种图例类型表现一致。
- **Risk Covered**：`ListLegendContentArea` 坐标偏移补偿逻辑移除后可能引入的交互区域错位风险。

🔴 **测试-分析**：结果正确，不影响tooltip

### 场景 4：圆角边框在导出与打印中的一致性验证

- **Scenario Objective**：验证圆角效果、内边距、背景色修复在 PDF/Excel/Image 导出及打印预览中与 Viewer 内呈现保持一致。
- **Scenario Description**：对一个开启圆角图例的图表分别执行打印预览、PDF 导出、Excel 导出、Image 导出。
- **Key Steps**：
  1. 在图表设计器中为图例开启圆角。
  2. 分别执行打印预览、导出为 PDF、导出为 Excel、导出为图片。
  3. 对比四种输出中图例的圆角半径、内边距、背景色是否与 Viewer 内一致。
- **Expected Result**：各导出格式中图例视觉效果与 Viewer 渲染保持一致，圆角半径约为 10px（对应代码中 20px 直径设定）。
- **Risk Covered**：导出管线是否复用同一绘制逻辑的未验证风险；圆角参数在不同渲染路径下的一致性。

🔴 **测试-分析**：导出没问题

### 场景 5：单图例图表布局宽度回归验证

- **Scenario Objective**：验证移除"单图例限宽"逻辑后，仅含单个图例的图表整体布局是否符合预期，不产生非预期的视觉变宽。
- **Scenario Description**：使用一个仅有一个图例且原本图例内容较少（如只有 2-3 个分类项）的图表。
- **Key Steps**：
  1. 在改动前后版本（或通过历史快照对比）分别渲染同一图表。
  2. 对比图例区域占用宽度的差异。
- **Expected Result**：需与产品/设计方确认该宽度变化是否为预期效果；若非预期，应视为回归缺陷。
- **Risk Covered**：`LegendGroup.layoutTB()` 布局策略变更引入的非预期视觉回归。

🔴 **测试-分析**：单图例表现正常

### 场景 6：多语言环境下新增 UI 文本验证

- **Scenario Objective**：验证"Round Corner"复选框标签在非英文语言环境下存在正确的本地化资源。
- **Scenario Description**：将系统语言切换为非英文语言（如中文），打开图例格式对话框。
- **Key Steps**：
  1. 切换系统/用户界面语言。
  2. 打开图例格式设置面板，查看"Round Corner"对应的复选框标签文本。
- **Expected Result**：标签显示为对应语言的翻译文本，而非英文原文或资源 key。
- **Risk Covered**：本地化资源遗漏风险（PR 提供的 diff 中未包含资源文件改动，需重点核实）。

🔴 **测试-分析**：本地化已经添加
