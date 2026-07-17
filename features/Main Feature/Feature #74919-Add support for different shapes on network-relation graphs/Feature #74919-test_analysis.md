# Feature #74919 - Add Support for Different Shapes on Network/Relation Graphs

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

- 核心目标：在 `RelationElement`（Network/Relation 图元素）上新增 `setNodeShape` 方法，允许用户通过 Script 灵活调整节点（Node）的形状，而不再局限于默认矩形/圆角矩形。
- 涉及模块：Chart Engine 数据模型层（`RelationElement`）、Chart Engine 渲染层（`RelationVO`）、Script API（`@TernMethod` 暴露给脚本引擎）。
- 功能类型：Script API 扩展 + 渲染能力增强（UI / Rendering）。

### 2. 需求清晰度与完整性

- 需求文本仅说明"新增 `setNodeShape` 函数，可在脚本中方便地调整节点形状"，未定义：
  - 支持哪些具体形状（GShape 枚举范围）、是否支持自定义 `GShape` 子类（如 `ImageShape`）；
  - 自定义形状与现有 `nodeCornerRadius`（圆角）属性的优先级/互斥关系；
  - 自定义形状下节点的填充色/边框色/颜色映射（Color Frame）是否仍然生效；
  - 非矩形（尤其非凸形状，如十字形）节点的点击、Tooltip、Hyperlink 命中区域如何处理；
  - 未指定形状（默认值/null/`GShape.NIL`）时的兼容行为。
- 需求未提及旧数据兼容性（已保存的 Viewsheet/模板在未设置该属性时的反序列化行为），需要通过实现细节和测试兜底确认。

### 3. 测试风险识别

- 行为误解风险：脚本用户可能误以为 `setNodeShape` 支持任意 `GShape` 子类的完整渲染效果（包括图片形状 `ImageShape` 的图片内容），需明确边界。
- 跨模块影响风险：改动同时影响数据模型（序列化/相等性比较）与渲染层（绘制逻辑、点击命中区域），需要分别验证。
- 状态一致性问题：`nodeShape` 与 `nodeCornerRadius` 两个属性共存时的优先级、以及 `GShape.NIL` 这一特殊值的兜底行为是否与文档描述一致。
- 兼容性风险：新增字段 `nodeShape`，需验证旧版本保存的 Viewsheet（不含该字段）反序列化后默认行为不变。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

- Feature（新增脚本可控的节点形状能力）。
- 影响层级：
  - 数据模型层（`RelationElement.java`）：新增 `nodeShape` 字段、`getNodeShape()`/`setNodeShape()`（均标注 `@TernMethod`，暴露给 Script）、`equalsContent()` 相等性比较更新。
  - 渲染层（`RelationVO.java`）：节点绘制逻辑重构，`getShapes()`（命中检测）注释更新说明其行为边界。
- 主要影响路径：所有使用 Network/Relation 图的 Dashboard，尤其是通过 Script 动态设置节点样式的场景；同时影响节点的点击/Tooltip/Hyperlink 交互命中区域。

### 2. 需求实现一致性

- 已覆盖的核心功能：
  - `setNodeShape(GShape)` / `getNodeShape()` 均标注 `@TernMethod`，可在脚本中直接调用 —— 满足"脚本中方便调整节点形状"的需求。
  - `RelationVO.paint()` 中：当 `nodeShape != null` 时，优先使用 `nodeShape.getShape(x, y, w, h)` 得到的几何轮廓替换默认矩形，并开启抗锯齿以获得更平滑的曲线渲染。
  - `equalsContent()` 加入 `nodeShape` 比较，保证该属性纳入元素内容比较（影响撤销/重做、增量渲染判断等依赖该比较的逻辑）。
- 明确的功能边界（实现文档中已注明，需测试验证是否真实生效）：
  - 仅使用 `GShape.getShape()` 返回的几何轮廓，`GShape` 自身的填充色/线色/线型/fill 标志**均被忽略**，节点颜色仍由元素自身的 fill color / border color / color frame 控制。
  - 具有自定义绘制逻辑的形状（如 `ImageShape`）**不会**渲染其图片内容 —— 与"形状"字面含义可能产生认知落差，需要测试验证到底渲染成什么效果（是否退化为图片的默认几何轮廓、或完全不显示）。
  - `GShape.NIL` 的 `getShape()` 返回 `null`，代码中会回退到"默认矩形渲染" —— 但根据实现代码路径，此时 `nodeShape != null`（NIL 本身是非 null 的枚举/单例值）而进入 `if` 分支，`s == null` 时 `shape` 变量保持为原始矩形，**不会**再执行 `else` 分支中的 `nodeCornerRadius` 圆角逻辑。也就是说：当用户显式设置 `nodeShape = GShape.NIL` 且同时设置了 `nodeCornerRadius > 0` 时，最终渲染是"直角矩形"而非"圆角矩形"，这与 Javadoc 描述的"回退到默认矩形渲染"是否包含圆角存在歧义，需要通过测试明确实际行为并与产品预期对齐。
- 隐式行为变化：
  - `nodeShape` 一旦设置（非 null），会**忽略** `nodeCornerRadius` 设置（两者互斥），这是需求未提及、由实现自行决定的行为，需要测试确认符合预期。
  - `getShapes()`（用于点击/Tooltip/Hyperlink 命中检测）**始终返回外接矩形边界**，不随自定义形状变化。对于非凸形状（如十字形 CROSS、X 形 XSHAPE、星形等），节点可视轮廓之外、外接矩形之内的"空白区域"点击仍会触发交互事件——文档中标注为"可接受的权衡（acceptable bounding-box trade-off）"，属于已知设计决策而非缺陷，但需要通过测试明确验证并让相关方确认可接受。

### 3. 关键实现风险

1. **NIL + 圆角组合行为歧义**：如上所述，`nodeShape = GShape.NIL` 时圆角设置被忽略，可能与用户预期（"NIL 等同于未设置形状，应完全恢复默认渲染包括圆角"）不一致。
2. **非矩形节点的命中区域与视觉不一致**：非凸自定义形状节点的点击/Tooltip/Hyperlink 命中区域仍是外接矩形，用户在节点可视图形之外、矩形范围内点击也会触发交互（如跳转、tooltip 弹出），属于潜在的可用性风险点，需明确验证是否符合产品预期。
3. **ImageShape 等自定义绘制形状的降级风险**：`setNodeShape` 文档明确说明 `ImageShape` 等形状的图片不会被渲染，仅使用几何轮廓；若脚本用户传入 `ImageShape` 期望展示图片节点，实际效果会与预期严重不符，需验证具体降级效果是否合理（例如是否显示为空/矩形/异常形状）。
4. **颜色属性被忽略的认知落差风险**：`GShape` 自身的 fillcolor/linecolor/lineStyle/fill 标志均被忽略，节点颜色完全由元素自身颜色属性控制；若脚本用户尝试通过配置的 `GShape` 对象设置颜色，实际不会生效，需要验证是否有必要的提示或文档说明，避免误用。
5. **序列化兼容性风险**：新增 `nodeShape` 字段，需验证旧版本保存的 Viewsheet（无该字段，反序列化后为 `null`）不影响原有节点渲染（矩形/圆角矩形逻辑不变），保持向后兼容。
6. **相等性比较影响范围风险**：`equalsContent()` 新增 `nodeShape` 比较，需要确认所有依赖该方法判断"内容是否相同"的下游逻辑（如增量渲染、变更检测、撤销/重做）在 `nodeShape` 变化时能正确识别为"内容已变化"，而不会因遗漏而导致渲染未刷新。

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

- 本次改动核心风险集中在：自定义形状与现有圆角属性的优先级/边界行为、非凸形状的命中区域与可视区域不一致、`ImageShape` 等特殊形状的降级效果、以及旧数据的序列化兼容性。
- 风险影响范围：所有使用 Relation/Network 图的场景，尤其是通过脚本动态设置节点形状的自动化/高级用户场景。
- 状态一致性问题：`nodeShape` 与 `nodeCornerRadius` 的互斥/回退逻辑需要重点验证，尤其是 `GShape.NIL` 这一边界值。
- 默认行为变化：默认情况下（未调用 `setNodeShape`）节点渲染逻辑应与改动前完全一致（矩形/圆角矩形），需要作为基线回归验证。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：验证核心需求——脚本可通过 `setNodeShape` 调整节点形状且渲染正确。
- **Scope**：Relation/Network 图节点渲染（Web 端）、Script 面板中的方法调用与自动补全。
- **Validation Goal**：脚本调用 `element.setNodeShape(GShape.XXX)` 后，节点按指定几何轮廓渲染；节点颜色（填充/边框/颜色映射）仍由元素自身属性控制，不受 `GShape` 自带颜色属性影响。

**Script**：验证 `setNodeShape`/`getNodeShape` 在脚本编辑器中支持 Auto-complete；脚本设置形状后 UI 渲染结果与脚本预期一致；脚本读取 `getNodeShape()` 返回值与已设置值一致。

Mobile：Relation/Network 图在移动端/小屏幕下展示自定义节点形状时，需验证渲染效果与桌面端一致，触摸点击命中区域符合预期（含外接矩形命中特性）。

#### 回归测试（Regression）

- **Why**：改动重构了节点绘制的核心分支逻辑（`nodeShape` 与 `nodeCornerRadius` 二选一路径），属于对已有默认渲染路径的直接触碰。
- **Scope**：未设置 `nodeShape`（默认 null）场景下的矩形节点渲染、已配置 `nodeCornerRadius` 的圆角节点渲染。
- **Validation Goal**：默认矩形渲染与已有圆角渲染效果与改动前完全一致，无视觉回归。

#### 边界与异常（Boundary）

- **Why**：`GShape.NIL`、非凸形状、`nodeShape` 与 `nodeCornerRadius` 同时设置等场景是本次改动引入的新边界，需重点覆盖。
- **Scope**：`GShape.NIL`（含/不含 `nodeCornerRadius`）、非凸形状（如十字形/星形/X 形）、`ImageShape` 等含自定义绘制逻辑的形状、`nodeShape` 与 `nodeCornerRadius` 同时设置。
- **Validation Goal**：
  - `GShape.NIL` 时节点回退为矩形渲染，明确验证圆角设置在此情形下是否生效，并与产品预期对齐；
  - 非凸形状节点在其可视轮廓之外、外接矩形之内点击/悬浮时，Tooltip/Hyperlink 是否按文档预期触发；
  - `ImageShape` 等特殊形状不渲染图片内容，仅使用几何轮廓（若有），效果不应异常（如报错、空白节点、渲染错位）。

#### 兼容性测试（Compatibility）

- **Why**：新增字段影响对象序列化与相等性比较，需要验证旧数据兼容性。
- **Scope**：加载改动前保存的 Viewsheet（不含 `nodeShape` 字段）、导出（PDF/Image/Print）场景。
- **Validation Goal**：旧 Viewsheet 加载后节点渲染行为不变（`nodeShape` 默认为 null）；自定义形状节点在导出/打印结果中与页面显示一致。

#### 自动化测试建议

- Unit：`RelationElement.setNodeShape/getNodeShape` 取值正确性；`equalsContent()` 在 `nodeShape` 不同时返回 `false`；`RelationVO.paint()` 中 `nodeShape` 为 `null`/`NIL`/普通形状/非凸形状时的分支覆盖。
- Integration：脚本调用 `setNodeShape` 后端到端渲染结果验证；序列化/反序列化含 `nodeShape` 字段的元素前后一致性。
- E2E：Relation 图节点形状的可视回归（不同 `GShape` 类型截图对比）、非凸形状节点点击命中区域的交互测试。

---

## 四、关键测试场景（Key Test Scenarios）

### Scenario 1：脚本设置节点形状基础验证

- **Scenario Objective**：验证通过脚本调用 `setNodeShape` 可以改变 Relation 图节点的渲染形状。
- **Scenario Description**：用户在脚本中调用该方法后，期望节点立即按指定形状渲染；若不生效则脚本 API 形同虚设，无法满足"方便地调整节点形状"的需求。
- **Key Steps**：
  1. 在 Relation 图的脚本中调用 `element.setNodeShape(GShape.OVAL)`（或其它内置形状）。
  2. 刷新/预览图表。
- **Expected Result**：所有节点按指定形状（如椭圆）渲染，替代默认矩形。
- **Risk Covered**：核心脚本 API 功能风险。

🔴 **测试-分析**：GShape.OVAL没这个属性，选择其它渲染正确，选择node，选择边框不正确Bug #75650，：GShape.TRIANGLE graph显示不太好Bug #75655

### Scenario 2：节点颜色属性不受 GShape 自带颜色影响

- **Scenario Objective**：验证节点的填充色/边框色仍由元素自身颜色属性（或颜色映射）控制，不受 `GShape` 对象自带颜色属性影响。
- **Scenario Description**：文档明确 `GShape` 的 fillcolor/linecolor 等被忽略，若实现遗漏此约束，会导致颜色映射（Color Frame）在自定义形状下失效，破坏数据可视化的核心语义。
- **Key Steps**：
  1. 为 Relation 图配置颜色映射（如按类别着色）。
  2. 调用 `setNodeShape` 设置自定义形状。
  3. 观察节点颜色是否仍按颜色映射正确显示。
- **Expected Result**：节点形状变化但颜色仍按原有颜色映射规则显示，不受 `GShape` 自身颜色属性影响。
- **Risk Covered**：颜色属性被忽略的认知落差风险。

🔴 **测试-分析**：设置颜色应用正确

### Scenario 3：GShape.NIL 与 nodeCornerRadius 组合行为验证

- **Scenario Objective**：验证 `nodeShape` 设置为 `GShape.NIL` 且同时设置 `nodeCornerRadius > 0` 时的实际渲染结果。
- **Scenario Description**：代码路径显示此组合下圆角逻辑不会执行（渲染为直角矩形），需要确认该行为是否符合产品预期（"回退到默认渲染"是否应包含圆角）。
- **Key Steps**：
  1. 设置 `element.setNodeCornerRadius(0.3)`。
  2. 设置 `element.setNodeShape(GShape.NIL)`。
  3. 观察渲染结果。
- **Expected Result**：需与产品对齐预期结果（当前实现为直角矩形），并确认该结果是否符合"回退到默认渲染"的用户预期。
- **Risk Covered**：NIL + 圆角组合行为歧义风险。

🔴 **测试-分析**：圆角应用符合预期

### Scenario 4：非凸形状节点的命中区域验证

- **Scenario Objective**：验证非凸自定义形状（如十字形/星形/X 形）节点的点击、Tooltip、Hyperlink 命中区域为外接矩形而非实际可视轮廓。
- **Scenario Description**：用户在节点可视图形之外、外接矩形范围内的空白区域点击，仍可能触发交互（跳转/Tooltip），若与产品预期不符会造成误触和困惑体验。
- **Key Steps**：
  1. 设置节点形状为非凸形状（如 `GShape.CROSS`）。
  2. 为该节点配置 Hyperlink 或验证 Tooltip。
  3. 点击/悬浮节点可视图形之外、外接矩形范围内的区域。
- **Expected Result**：交互行为按文档描述触发（外接矩形范围内均可触发），并确认此行为对用户体验的实际影响是否可接受。
- **Risk Covered**：非凸形状命中区域与可视区域不一致风险。

🔴 **测试-分析**：Hyperlink，Tooltip工作正常
elem = graph.getElement(0);
elem.setNodeShape(GShape.CROSS);
elem.setBorderColor(new java.awt.Color(0, 0, 0)); 



### Scenario 5：ImageShape 降级效果验证

- **Scenario Objective**：验证将 `ImageShape` 等含自定义绘制逻辑的形状设置为节点形状时，不会渲染图片内容且无异常。
- **Scenario Description**：脚本用户可能误以为可以通过该方法展示图片节点，需明确验证实际降级效果，避免出现报错、空白或渲染错位等非预期结果。
- **Key Steps**：
  1. 调用 `element.setNodeShape(new ImageShape(...))`（或等效图片形状）。
  2. 观察节点渲染结果。
- **Expected Result**：节点不显示图片内容，仅显示形状的几何轮廓（若有），渲染过程无异常报错。
- **Risk Covered**：自定义绘制形状降级风险。



🔴 **测试-分析**：ImageShape不支持

### Scenario 6：默认（未设置形状）渲染回归验证

- **Scenario Objective**：验证未调用 `setNodeShape` 的 Relation 图节点渲染效果（矩形/圆角矩形）与改动前完全一致。
- **Scenario Description**：本次改动重构了节点绘制的分支逻辑，属于对默认渲染路径的直接触碰，需确保未使用新功能的既有图表不受影响。
- **Key Steps**：
  1. 打开一个未设置 `nodeShape` 的既有 Relation 图（含/不含 `nodeCornerRadius` 设置）。
  2. 观察节点渲染效果。
- **Expected Result**：节点渲染为矩形或圆角矩形，效果与改动前一致，无视觉回归。
- **Risk Covered**：默认渲染路径回归风险。

🔴 **测试-分析**：默认符合预期

### Scenario 7：旧版本 Viewsheet 兼容性验证

- **Scenario Objective**：验证改动前保存的、不含 `nodeShape` 字段的 Viewsheet 加载后节点渲染正常。
- **Scenario Description**：新增字段可能影响反序列化，需确认旧数据加载时 `nodeShape` 默认为 `null`，不引发异常或渲染差异。
- **Key Steps**：
  1. 加载一个在本功能上线前保存的、包含 Relation 图的 Viewsheet。
  2. 观察节点渲染效果。
- **Expected Result**：节点渲染与本功能上线前一致，无异常。
- **Risk Covered**：序列化兼容性风险。

🔴 **测试-分析**：旧版本符合预期

### Scenario 8：自定义节点形状导出/打印一致性验证

- **Scenario Objective**：验证设置自定义节点形状的 Relation 图在导出（PDF/Image）和打印预览中的显示效果与页面一致。
- **Scenario Description**：节点绘制逻辑改动涉及 `Graphics2D` 绘制路径，需确认导出/打印场景复用同一渲染逻辑，形状与颜色表现一致。
- **Key Steps**：
  1. 为 Relation 图节点设置自定义形状。
  2. 分别执行 PDF 导出、Image 导出与 Print Layout 预览。
- **Expected Result**：导出/打印结果中节点形状、颜色与页面展示一致，无失真或回退为默认矩形。
- **Risk Covered**：导出/打印场景下的渲染一致性风险。

🔴 **测试-分析**：打印导出一致
