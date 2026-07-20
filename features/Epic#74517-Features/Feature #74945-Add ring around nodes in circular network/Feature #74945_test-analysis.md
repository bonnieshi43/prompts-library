# Feature #74945 测试分析报告：Add ring around nodes in circular network graph

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为 Circular Network（环形网络图，`CHART_CIRCULAR`）图表增加一个经过所有节点圆心的外接圆环（Ring），并通过 `RelationElement` 暴露 `addShapeBorder(GShape, Color, GLine)` 脚本接口供用户自定义。
- **用户价值**：环形网络图此前只有连接节点的边线，节点是否真正排列成"环形"不直观；增加外接圆环后可视觉上强化"circular"布局特征，同时脚本接口为高级用户提供自定义环形状/颜色/线型的能力。
- **Feature 类型**：Rendering（图表渲染）+ API/Script（脚本可编程性）。

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

1. **`GraphGenerator.java`**（`CHART_CIRCULAR` 分支，`else if(GraphTypes.isRelation(chartType))` 内）：在设置 `Algorithm.CIRCLE` 与 `smoothEdges` 之后，新增一行硬编码调用：
   `elem.addShapeBorder(GShape.CIRCLE, GDefaults.DEFAULT_LINE_COLOR, new GLine(GraphConstants.MEDIUM_DASH))`。默认颜色为 `GDefaults.DEFAULT_LINE_COLOR`（`0xEEEEEE`，极浅灰），线型为中等虚线。**无 UI 配置入口，无持久化字段**，即用户在属性面板中无法关闭/修改此环。
2. **`RelationElement.java`**：
   - 新增 `shapeBorderShape` / `shapeBorderColor` / `shapeBorderLine` 三个实例字段，并已同步加入 `equalsContent()` 比较逻辑（未遗漏，序列化/内容比较一致）。
   - 新增公共方法 `addShapeBorder(GShape, Color, GLine)`：供脚本调用；传 `null` 可移除已设置的环。
   - `mxLayout()` 中，仅当 `algorithm == Algorithm.CIRCLE` 时才计算 `layoutCenter`（质心）与 `layoutRadius`（质心到任一节点中心的距离，即半径）；其余布局算法（`COMPACT_TREE`、`ORGANIC` 等）该值恒为 0，从根本上保证了 Ring 只会在环形布局下生效，即使脚本对 Tree/Network 图表误调用 `addShapeBorder()` 也不会渲染出失真的环（`layoutRadius > 0` 才会创建 `BorderForm`）。
   - `createGeometry()` 中新增：`shapeBorderShape != null && layoutCenter != null && layoutRadius > 0` 时，向 `EGraph` 添加一个 `BorderForm`（内部类，继承 `GraphForm`）。
   - `BorderForm.createVisual()`：读取 `layoutCenter`/`layoutRadius`，调用 `GShape.CIRCLE.getShape(cx-r, cy-r, 2r, 2r)` 生成 `Ellipse2D`（mxGraph 布局坐标系），包装为 `FormVO` 返回；`center==null || radius<=0` 时返回 `null`（不渲染）。
3. **渲染管线集成**：`BorderForm` 作为标准 `GraphForm` 加入 `EGraph.forms`，与其他 Guide Form（参考线等）一样，在 `vgraph.createVisuals(ggraph)` 阶段统一执行 `form.createVisuals(coord)`，并随后经过 `coord.transform()` 完成 mxGraph→屏幕坐标转换（`RelationCoord` 负责），因此环随图表缩放/拖拽自动等比例缩放定位。

### 目标覆盖度

| Feature 需求点 | 是否覆盖 | 说明 |
|---|---|---|
| 环形网络图渲染外接圆环 | ✅ 已覆盖 | 仅 `Algorithm.CIRCLE`（即 `CHART_CIRCULAR`）生效 |
| 通过脚本 `RelationElement.addShapeBorder()` 控制 | ✅ 已覆盖 | 方法签名与需求示例完全一致 |
| "合理默认值"（reasonable defaults） | ⚠️ 部分覆盖 | 默认颜色为 `0xEEEEEE`（极浅灰），比需求示例中的 `Color.LIGHT_GRAY`（`0xC0C0C0`）更浅，存在对比度/可视性风险，需实测确认 |
| UI 配置入口 / 持久化 | ❌ 未实现 | PR 描述明确"no UI setting, no persistence"，环形样式仅可通过脚本控制，无法在属性面板中调整或保存到 viewsheet |
| 移除环（关闭该功能） | ✅ 覆盖（脚本层面） | `addShapeBorder(null, null, null)` 可移除，但无 UI 开关 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|---|---|---|
| Circular Network 图表仅渲染节点与连接边，无外接圆形辅助线 | Circular Network 图表在节点连线基础上额外渲染一个经过所有节点中心的虚线圆环（浅灰色、中等虚线） | Rendering：所有现存的 Circular Network 图表（含历史保存的 viewsheet）刷新后视觉外观会自动变化，无开关可关闭 |
| `RelationElement` 无环形边框相关 API | 新增 `addShapeBorder()` / `getLayoutRadius()` 公共 API，可被图表脚本调用 | Compatibility：脚本层面新增可调用入口，需确认 Auto-complete/脚本文档同步 |
| Tree / Network（`COMPACT_TREE`/`ORGANIC`）图表无此环 | 保持不变（`layoutRadius` 恒为 0，`BorderForm` 不生成） | 低风险，但需回归验证不会误触发 |
| 图表导出（PDF/Excel/Image）、打印预览中 Circular Network 无环 | 导出/打印路径复用同一 `GraphForm` 渲染管线，理论上环也会随导出内容一起呈现 | Rendering/Export：需验证导出格式下环的缩放、虚线样式是否失真或缺失 |

---

## 第三部分：Risk Identification（风险识别）

1. **【Rendering】默认行为强制变化，无法关闭**：所有 Circular Network 图表都会强制多出一个环，且无 UI 开关。若用户不希望显示该环（例如已有仪表板截图/规范文档基于旧样式），无回退路径（脚本移除需要用户具备脚本能力）。
2. **【Rendering/可视性】默认颜色过浅**：`GDefaults.DEFAULT_LINE_COLOR (0xEEEEEE)` 在浅色/白色背景下可能几乎不可见，深色主题（Dark Mode）下对比度未知，需实测确认"合理默认值"是否真正可见。
3. **【Cross-Module / Export】跨模块渲染一致性**：环是通过 `GraphForm`/`FormVO` 新渲染路径实现的，需确认在导出为 PDF/Excel/PNG、打印预览、图表缩放/resize、Tooltip/Selection 交互（如点击、hover）等场景下不会与环形成误触发的选中区域，或位置/大小与视图渲染不一致。
4. **【边界情况】节点数极少或布局失败**：单节点（`nodeCount=1`，半径为 0）、无边数据、布局未收敛等情况下 `layoutRadius<=0`，`createVisual()` 需正确返回 `null` 而不抛异常。
5. **【脚本兼容】新增脚本 API 的可用性**：`addShapeBorder(GShape, Color, GLine)` 为脚本新增入口，需验证脚本编辑器 Auto-complete 是否识别、参数类型（`GShape`/`GLine`/`java.awt.Color`）传 `null` 或非法值时是否有防御性处理（PR diff 未见对 `gshape` 参数 null 校验，`createVisual()` 中 `elem.shapeBorderShape.getShape(...)` 若后续被并发修改为 null 存在潜在 NPE，但因 `shapeBorderShape != null` 在 `createGeometry` 阶段已判断，风险较低，仍建议以异常路径验证）。
6. **【向后兼容性】历史 viewsheet / 快照对比类测试**：依赖图表截图比对的自动化测试（visual regression）在升级后会因新环而产生大量“误报”差异，需评估影响范围。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**：
  1. `CHART_CIRCULAR` 类型图表渲染时是否正确显示经过所有节点中心的圆环（形状、颜色、虚线样式默认值是否符合预期）。
  2. `Algorithm.CIRCLE` 之外的关联图（Tree/Network）不受影响，不出现环。
  3. 脚本 `graph.getElement(idx).addShapeBorder(GShape, Color, GLine)` 可自定义/移除环，且立即生效。

- **高风险路径**：
  - 从其他图表类型切换为 Circular Network（及反向切换）时环的显示/消失是否正确。
  - 缩放图表容器尺寸、拖拽调整仪表板组件大小时环是否等比例跟随缩放。
  - 导出 PDF/Excel/Image 与打印预览路径。

- **涉及模块**：Composer 图表编辑器（属性面板/脚本面板）、Viewer 查看器渲染、Chart 类型切换（`ChangeChartTypeProcessor`/`ChangeChartTypeService`）、导出模块（Exporter）、打印预览、Mobile 视图。

- **专项检查**：
  - **本地化**：本次无新增 UI 文本，暂不涉及本地化测试。
  - **配置检查**：未涉及 `SreeEnv`/`defaults.properties` 配置项，无需验证 Global/Organization 作用域相关内容。
  - **脚本兼容**：
    - 验证 `addShapeBorder` / `getLayoutRadius` 在图表脚本编辑器中 Auto-complete 是否可正常提示；
    - 验证 UI（无配置项）与脚本（可控制）之间的行为是否一致——即脚本设置的环是否能覆盖/叠加默认硬编码环；
    - 验证脚本传入非法参数（如 `null` Shape、非法颜色）时是否稳定不报错。
  - **文档一致性**：`RelationElement.addShapeBorder()` 是面向脚本用户的新公开 API，需确认脚本 API 文档/Help 是否已同步说明其用法与参数含义。
  - **Mobile 影响检查**：涉及图表渲染尺寸与坐标变换，需在移动端/小屏幕下验证环是否正确缩放、不溢出图表区域。
  - **Print Layout / Export 影响检查**：本次改动直接涉及图形绘制（`BorderForm`/`FormVO`/坐标变换），必须验证 PDF、Excel、Image 导出及打印预览中环的位置、大小、虚线样式是否与在线预览一致。

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景 1：Circular Network 图表默认显示外接圆环

- **Scenario Objective**：验证环形网络图默认能展示一个经过所有节点中心的圆环。
- **Scenario Description**：这是本次 Feature 的核心可视化诉求，若环未显示或位置/形状错误，将直接导致 Feature 目标未达成。
- **Pre-condition**：已创建包含多个节点（≥3 个）的数据集，绑定为 Relation 图表。
- **Key Steps**：
  1. 在图表类型下拉框中选择 "Circular Network"。
  2. 观察图表渲染区域。
- **Expected Result**：图表中除节点与连接线外，额外显示一个浅灰色中等虚线圆环，且该圆环经过（或非常接近）所有节点的中心点，视觉上形成"外接圆"。
- **Risk Covered**：默认行为变化、核心功能正确性。

🔴 **测试-分析**： 符合预期

---

### 场景 2：环形圆环随图表容器尺寸缩放同步变化

- **Scenario Objective**：验证圆环在图表被放大/缩小、仪表板组件尺寸调整时仍能正确包裹所有节点。
- **Scenario Description**：圆环基于图表内部坐标计算后再转换为屏幕坐标，若坐标转换存在偏差，缩放后圆环可能与节点错位，影响用户对布局的判断。
- **Key Steps**：
  1. 在 Viewer 中查看 Circular Network 图表。
  2. 拖拽调整该图表组件的宽高（放大与缩小各测试一次）。
  3. 全屏/最大化该图表组件。
- **Expected Result**：无论尺寸如何变化，圆环始终保持"经过所有节点中心"的视觉效果，不出现比例失调、偏移或裁切。
- **Risk Covered**：渲染坐标变换正确性、跨尺寸兼容性。

🔴 **测试-分析**： 符合预期

---

### 场景 3：非 Circular Network 的关联图表（Tree / Network）不受影响

- **Scenario Objective**：验证仅 Circular Network 图表新增圆环，Tree（组织树/层级图）与 Network（网络图）图表保持原有渲染效果不变。
- **Scenario Description**：本次改动集中在 `RelationElement` 共享类中，需回归验证未影响同一基类下的其他关联图表类型，避免出现意外的"跨类型污染"。
- **Key Steps**：
  1. 分别创建 Tree 类型和 Network 类型的关联图表。
  2. 观察渲染效果。
- **Expected Result**：Tree 与 Network 图表均不出现圆环，渲染效果与本次改动前一致。
- **Risk Covered**：跨模块影响、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 4：通过脚本自定义圆环颜色/线型

- **Scenario Objective**：验证高级用户可通过图表脚本自定义圆环的形状、颜色与线型。
- **Scenario Description**：Feature 明确要求提供脚本控制入口，若脚本调用无效或未生效，则脚本可编程性诉求未满足。
- **Pre-condition**：已有 Circular Network 图表。
- **Key Steps**：
  1. 打开该图表的脚本编辑面板。
  2. 输入脚本：获取第一个图表元素，调用其"设置边框形状"方法，传入自定义颜色（如红色）与线型（如实线）。示例脚本：
     ```javascript
     var elem = graph.getElement(0);
     elem.addShapeBorder(GShape.CIRCLE, java.awt.Color.RED, new GLine(GraphConstants.THICK_LINE));
     ```
  3. 保存脚本并刷新图表。
- **Expected Result**：圆环颜色/线型按脚本设置更新（变为红色、实线加粗），且脚本编辑器对该方法/参数提供 Auto-complete 提示。
- **Risk Covered**：脚本兼容性、脚本与 UI 行为一致性。

🔴 **测试-分析**： 符合预期

---

### 场景 5：通过脚本移除圆环

- **Scenario Objective**：验证在无 UI 开关的情况下，用户可通过脚本关闭默认渲染的圆环。
- **Scenario Description**：由于本次改动未提供 UI 层面的开关，脚本移除是唯一的回退手段，必须确保该路径可用，否则用户将无法关闭该强制新增的视觉元素。
- **Key Steps**：
  1. 在 Circular Network 图表脚本面板中，调用"移除边框"脚本（传入空值参数）。示例脚本：
     ```javascript
     var elem = graph.getElement(0);
     elem.addShapeBorder(null, null, null);
     ```
  2. 保存脚本并刷新图表。
- **Expected Result**：图表恢复为仅显示节点与连接线，圆环消失。
- **Risk Covered**：默认行为无法关闭的风险缓解路径、脚本 API 完整性。

🔴 **测试-分析**： 符合预期

---

### 场景 6：极端节点数据下的边界表现

- **Scenario Objective**：验证节点数量极少或数据异常时，图表不因新增圆环逻辑而报错或渲染异常。
- **Scenario Description**：圆环半径依赖于节点数量与布局收敛结果，节点过少或数据为空等边界情况若未妥善处理，可能导致图表渲染失败或抛出异常，影响整个仪表板的可用性。
- **Key Steps**：
  1. 创建仅含 1 个节点的 Circular Network 图表并查看。
  2. 创建无有效关联数据（节点为空）的 Circular Network 图表并查看。
- **Expected Result**：两种情况下图表均能正常打开，不出现圆环（因半径无意义），且不出现渲染报错或页面异常。
- **Risk Covered**：边界条件、异常路径、稳定性。

🔴 **测试-分析**： 边界问题：目前做不出来这种效果，先ignore

---

### 场景 7：导出与打印预览中圆环渲染一致性

- **Scenario Objective**：验证 Circular Network 图表导出为 PDF/Excel/Image 及打印预览时，圆环能正确呈现。
- **Scenario Description**：圆环渲染依赖于新的 `GraphForm`/坐标转换路径，导出与打印走的是独立渲染管线，若未完全复用同一坐标转换逻辑，可能出现导出结果中圆环缺失、错位或虚线样式失真。
- **Key Steps**：
  1. 打开一个含圆环的 Circular Network 图表。
  2. 分别导出为 PDF、Excel、图片格式。
  3. 打开打印预览。
- **Expected Result**：三种导出格式及打印预览中圆环均正常显示，位置、比例、虚线样式与在线查看一致。
- **Risk Covered**：跨模块交互（导出模块）、渲染一致性回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 8：默认圆环颜色在不同主题背景下的可视性

- **Scenario Objective**：验证默认圆环颜色（极浅灰色）在浅色主题与深色主题下均具备基本可辨识度。
- **Scenario Description**：默认颜色 `0xEEEEEE` 明显浅于需求描述中的示例颜色（浅灰色 `LIGHT_GRAY`），存在在浅色背景下"几乎不可见"的可视性风险，属于"合理默认值"是否达标的关键验证点。
- **Key Steps**：
  1. 在默认（浅色）主题下查看 Circular Network 图表圆环的可见程度。
  2. 切换至深色主题（若产品支持仪表板深色模式），再次查看圆环可见程度。
- **Expected Result**：在两种主题背景下，圆环均可被用户清晰辨识为一条虚线圆圈，不会因颜色过浅而"消失"在背景中。
- **Risk Covered**：默认值合理性、UI 可用性、渲染视觉风险。

🔴 **测试-分析**： Bug #75645



