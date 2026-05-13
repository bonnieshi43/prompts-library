# Feature #74786 测试分析报告

> **需求**：为 Circular Network Chart 支持 Smooth/Curved Bezier 边线  
> **PR**：#3613 - Smooth/curved edges for circular network charts  
> **分析日期**：2026-05-13  

---

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

**功能核心目标**：为 Circular Network Chart（环形关系图）的连线提供曲线/贝塞尔效果，替代原有直线弦（chord）连接。

**解决的业务问题**：视觉上，直线弦会与节点圆弧形成杂乱的穿插感，参考示例中的贝塞尔弧线更自然地表达节点间关系，降低视觉噪音。

**涉及模块**：

| 模块 | 文件 |
|------|------|
| 图形渲染引擎 | `RelationEdgeGeometry`、`GTool`、`RelationElement` |
| 图表生成流水线 | `GraphGenerator` |
| 图表类型切换 | `ChangeChartTypeController` |
| 图表选项面板 | `ChartPlotOptionsPaneModel` |
| 向导绑定处理 | `VSWizardBindingHandler` |

**功能类型**：数据可视化渲染增强 / 用户可配置图表属性

---

### 2. 需求清晰度与完整性

**隐含假设未明确**：

- 需求中说"支持 curved/bezier lines"，但未说明曲率强度是否可由用户调节，还是固定值。实现选择了硬编码 `0.5`（`CIRCULAR_EDGE_SMOOTHING`），这可能与用户预期不符。
- 需求中的参考图为纯环形布局，未说明是否只适用于 Circular 算法，或同样适用于 Network/Tree 关系图。

**行为定义缺失**：

- 切换到 Circular 图表时，Smooth Lines 是否应默认开启未在需求中指定（PR 自行决策为默认开启）。
- 已有保存的 Circular 图表（历史配置中 `smoothLines = false`），加载后是否应自动迁移未说明。

**UI 行为缺失**：

- 需求未说明 UI 控件的 label 是否需要调整。现有 "Smooth Lines" 标签在 Line/Area 图中表示曲线插值，复用在 Circular 图中其语义改变为弧线弯曲，可能引起用户困惑。

---

### 3. 测试风险识别

| 风险类型 | 描述 |
|----------|------|
| 行为误解风险 | `smoothLines` 在 Line/Area 图中控制线段插值平滑，在 Circular 图中控制弦弧化，语义不同但共用同一字段，测试需验证两类图表互不干扰 |
| 跨模块影响 | `isSmoothLinesVisible()` 逻辑变更，可能影响所有调用该方法的图表选项面板场景 |
| 状态一致性 | `smoothEdges` 参与 `equalsContent()`，但 `layoutCenter` 是 `transient`——需确认重绘时 layoutCenter 能在 `equalsContent` 不触发的情况下仍被正确刷新 |

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型

**类型**：Feature（含单元测试补充）

**影响层级**：

| 层级 | 说明 |
|------|------|
| 数据层 | `RelationElement` 新增字段及序列化参与（`smoothEdges` 纳入 `equalsContent`） |
| 业务逻辑层 | `GTool.computeCenterPullCurve()`、`RelationEdgeGeometry.getEdges()`、`GraphGenerator` 条件分支 |
| 跨层 | `ChangeChartTypeController` 改变切换图表时的默认状态写入，影响 UI→后端状态链路 |

**受影响的用户路径**：

- 创建新 Circular 图表（自动默认曲线）
- 切换现有图表至 Circular 类型（自动开启 smoothLines）
- 向导推荐生成 Circular 图表（自动默认曲线）
- 已有 Circular 图表打开（默认不变，保持直线，除非用户手动开启）

---

### 2. 需求实现一致性

**已完整实现**：

- 为 Circular 图表提供了弧线渲染能力（`computeCenterPullCurve`）
- UI 选项面板中 "Smooth Lines" 对 Circular 图表可见
- 新图表默认开启曲线

**实现不足（需求未完全覆盖）**：

- 曲率强度无用户可控参数，固定为 `CIRCULAR_EDGE_SMOOTHING = 0.5`。参考图中的曲率未必恰好对应 0.5，无法微调。
- Organic Network、Tree 图表类型未支持（代码注释中明确说明"暂不支持"），需求并未明确排除这两种类型。

**过度实现（PR 自行决策）**：

- 切换到 Circular 图表时自动开启 `smoothLines = true`（`ChangeChartTypeController`），需求未要求此行为，可能影响用户对默认行为的预期。

**隐式行为变化**：

- `isSmoothLinesVisible()` 方法新增了 `|| ctype == GraphTypes.CHART_CIRCULAR`，这意味着所有调用此方法的场景（包括其他图表类型检测逻辑）都会感知到此变化。需确认无误报。

---

### 3. 关键实现风险

#### 风险 1：`pts.size() == 2` 分支的坐标 Y 轴互换逻辑

```java
Point2D s = new Point2D.Double(p1.getX(), p2.getY());
Point2D t = new Point2D.Double(p2.getX(), p1.getY());
```

- **风险来源**：此处将两个点的 Y 坐标做了交叉互换，注释称为"preserve existing y-swap"，但这与标准坐标系转换不一致。若某个布局算法确实会输出两点显式路径，该互换可能导致弧线起止点错位。
- **影响路径**：任何产生 2-point 显式路径的布局 + smoothEdges 开启时
- **潜在后果**：曲线方向或起止位置视觉错误

#### 风险 2：环形质心计算使用算术均值

质心 = 所有节点中心点坐标的均值。若节点大小（`width/height`）不均匀，节点中心分布非完美等间距，则均值点会偏离可视环形中心，导致弧线不对称地向偏心方向弯曲。

- **影响路径**：节点大小差异较大的 Circular 图
- **潜在后果**：弧线视觉不居中，尤其在节点尺寸不一致时更明显

#### 风险 3：`smoothEdges` 与 `layoutCenter` 的生命周期不同步

`smoothEdges` 参与 `equalsContent()`（脏检查），而 `layoutCenter` 是 `transient`。若某次重绘触发的 `equalsContent` 判断认为图表无变化（`smoothEdges` 未改变），但 `layoutCenter` 因 transient 被反序列化为 null，则曲线渲染会静默降级为直线（条件 `elem.getLayoutCenter() != null` 为 false）。

- **影响路径**：反序列化后首次渲染、集群环境下跨节点对象传输
- **潜在后果**：用户开启了曲线，但加载后图表显示直线，无任何错误提示

#### 风险 4：Export 路径的 `QuadCurve2D` 兼容性

原代码路径中 `getEdges()` 返回 `Line2D`；此 PR 返回 `QuadCurve2D`。导出渲染器（PDF、SVG、PNG）若依赖 `instanceof Line2D` 的特判处理，则曲线在导出时可能显示为直线或渲染异常。

- **影响路径**：Circular 图表 + smoothEdges=true + 导出操作
- **潜在后果**：导出结果中边线变回直线或渲染失败

#### 风险 5：`smoothLines` 语义复用与 Script 控制

`PlotDescriptor.smoothLines` 原用于 Line/Area 图的线段平滑插值，现被 Circular 图复用控制弧线。若用户在 Script 中设置 `chart.smoothLines = false`，将同时影响两种图表类型的行为。测试应验证 Script 可控性且不产生语义混淆。

- **影响路径**：包含 Script 的图表 + Circular 类型
- **潜在后果**：用户脚本行为与预期不符

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

**核心风险**：

1. 新渲染路径（曲线 Shape）在所有输出格式下的正确性
2. `smoothLines` 标志的双语义造成的状态干扰
3. 坐标转换逻辑（y-swap）的正确性
4. 反序列化后 `layoutCenter` 为 null 时的降级行为
5. 切换图表类型时默认状态自动变更对历史配置的影响

**是否改变默认行为**：是——切换至 Circular 图表时 `smoothLines` 自动设为 `true`。

**是否影响历史配置**：已保存 Circular 图表（`smoothLines = false`）加载后仍为直线，行为不变，但用户可能不知道有此新功能。

---

### 3.2 必要测试类别

#### 功能验证（Functional）

**Why**：核心渲染路径变更，需验证曲线在 UI 中正确显示。

**Scope**：Circular Network Chart + Smooth Lines UI 选项

**Validation Goal**：
- Smooth Lines 复选框在 Circular 图表属性面板中可见且可用
- 勾选后图表连线变为弧线，取消后恢复直线
- 切换至 Circular 图表时 Smooth Lines 默认勾选
- Browser 与移动端均需验证渲染结果

**Script 控制验证**

**Why**：`smoothLines` 是可通过 Script 访问的属性，语义发生变化，需确认脚本可控且行为正确。

- 通过 `chart.smoothLines = true/false` 脚本控制后，圆形网络图边线状态是否同步
- 脚本控制不应影响同面板中 Line/Area 图的 smoothLines 行为

#### 回归测试（Regression）

**Why**：`isSmoothLinesVisible()` 逻辑变更影响所有图表类型的该属性可见性判断；`ChangeChartTypeController` 的条件修改影响图表切换时的默认值设置。

**受影响模块**：
- Chart Plot Options 面板：Line、Area、Step、Jump 图表类型的 "Smooth Lines" 可见性不应受影响
- 图表类型切换：从 Circular 切换到其他类型时，不应强制开启其他类型的 smoothLines

**可能被破坏的行为**：
- Area → Line 切换：原逻辑会关闭 smoothLines，需确认未被 Circular 分支干扰
- 非 Circular 关系图（CHART_NETWORK、CHART_TREE）：Smooth Lines 选项不应显示

#### 边界与异常（Boundary）

**Why**：实现中存在多处边界条件，PR 单元测试仅覆盖数学层，未覆盖集成层和视觉层。

| 场景 | 验证点 |
|------|--------|
| 单节点图（`nodes.size() = 1`） | `layoutCenter` 为该节点中心，不崩溃 |
| 两节点图 | 连线只有一条，弧线向质心弯曲，视觉合理 |
| 自环（self-loop） | 已有单测覆盖，需在真实 UI 中确认视觉无异常 |
| 节点大小不均匀 | 质心偏移时弧线不对称，需确认视觉可接受 |
| 反序列化场景 | 加载保存的 Circular 图表，确认 `layoutCenter` 被重算，曲线不降级为直线 |

#### 自动化测试建议

| 层级 | 覆盖内容 |
|------|----------|
| Unit | `GTool.computeCenterPullCurve` 已有 5 个单测；可补充 `RelationElement.equalsContent` 中 `smoothEdges` 参与比较的测试 |
| Integration | `GraphGenerator` → `RelationElement.setSmoothEdges` → `RelationEdgeGeometry.getEdges` 端到端，验证输出 Shape 类型为 `QuadCurve2D` |
| E2E | 创建 Circular 图表 → 开启/关闭 Smooth Lines → 导出 PNG/PDF → 视觉比对确认弧线存在 |

---

## 四、关键测试场景（Key Test Scenarios）

---

### Scenario 1：新建 Circular 图表默认开启曲线

- **Objective**：验证 Circular 图表新建时默认开启曲线
- **Description**：用户从图表类型选择器切换到 Circular 类型，验证 Smooth Lines 状态
- **Key Steps**：
  1. 打开 Composer，创建包含两个以上维度字段的图表
  2. 在图表类型选择器中选择 Circular Network Chart
  3. 打开 Plot 属性面板，查看 Smooth Lines 复选框状态
  4. 观察图表连线外观
- **Expected Result**：Smooth Lines 默认勾选；图表连线显示为向环中心弯曲的弧线，而非直线
- **Risk Covered**：切换图表类型时 `smoothLines` 自动设为 true 的行为正确性

---

### Scenario 2：Smooth Lines 开关视觉切换

- **Objective**：验证 Smooth Lines 开关对 Circular 图表的视觉切换
- **Description**：在 Circular 图表上手动切换 Smooth Lines 状态，验证边线在直线与弧线之间正确切换
- **Key Steps**：
  1. 打开已有 Circular Network Chart（或新建后默认曲线状态）
  2. 打开 Plot 属性面板，取消勾选 Smooth Lines
  3. 确认连线变为直弦
  4. 重新勾选，确认恢复弧线
- **Expected Result**：每次切换后图表立即刷新；勾选时边线为 `QuadCurve2D` 弧线；取消时边线为直线；两种状态均不出现渲染异常或空白
- **Risk Covered**：平滑线开关 UI 与渲染层状态同步

---

### Scenario 3：Line/Area 图 Smooth Lines 行为回归

- **Objective**：验证 Line/Area 图的 Smooth Lines 行为未被影响
- **Description**：在 Line 图表和 Area 图表上验证 Smooth Lines 选项可见且功能不变
- **Key Steps**：
  1. 创建 Line Chart，确认 Plot 面板中 Smooth Lines 可见
  2. 开启 / 关闭 Smooth Lines，验证连线插值行为与 PR 前一致
  3. 同样对 Area Chart 执行
  4. 创建 Step Chart，确认 Smooth Lines 不可见（原有行为保持）
- **Expected Result**：Line/Area 图表的 Smooth Lines 表现与修改前完全一致；Step/Jump 图表的 Smooth Lines 依然隐藏
- **Risk Covered**：`isSmoothLinesVisible()` 变更对非 Circular 图表类型无副作用

---

### Scenario 4：Circular 图表导出弧线正确渲染

- **Objective**：验证 Circular 图表导出时弧线正确渲染
- **Description**：开启 Smooth Lines 的 Circular 图表导出为 PNG 和 PDF，确认导出文件中连线为弧线
- **Key Steps**：
  1. 创建 Circular Network Chart，确认 Smooth Lines 已开启，UI 中弧线可见
  2. 导出为 PNG，打开文件查看连线形状
  3. 导出为 PDF，打开文件查看连线形状
  4. 对比 Smooth Lines 关闭时的同图表导出结果
- **Expected Result**：开启 Smooth Lines 时，PNG 和 PDF 导出均显示弧线；关闭时显示直线；无渲染异常或线段消失
- **Risk Covered**：导出管道对 `QuadCurve2D`（新 Shape 类型）的兼容性

---

### Scenario 5：历史保存图表加载后曲线正常

- **Objective**：验证加载历史保存的 Circular 图表（`smoothLines=true`）时弧线正确渲染（layoutCenter 不为 null）
- **Description**：保存一个开启了 Smooth Lines 的 Circular 图表，关闭后重新打开，验证弧线正常显示
- **Key Steps**：
  1. 创建 Circular Network Chart，开启 Smooth Lines，保存视图表
  2. 关闭并重新打开该视图表
  3. 观察连线是否仍为弧线
  4. 若在集群环境下，切换到另一节点访问同一图表，重复步骤 3
- **Expected Result**：重新打开后连线仍为弧线；`layoutCenter` 在 `mxLayout()` 执行后被重新填充，不因 transient 丢失而降级为直线
- **Risk Covered**：`layoutCenter` 为 transient 字段在反序列化/重绘场景下的生命周期正确性

---

### Scenario 6：节点大小不均匀时弧线视觉合理性

- **Objective**：验证节点大小不均匀时弧线视觉合理性
- **Description**：在 Circular 图表中配置节点大小绑定（Size 字段差异较大），开启 Smooth Lines，观察弧线方向
- **Key Steps**：
  1. 绑定一个数值差异显著的字段到节点大小
  2. 选用 Circular 布局，开启 Smooth Lines
  3. 观察所有边的弧线是否均弯向环形视觉中心
  4. 对比无大小差异时的弧线效果
- **Expected Result**：弧线应大体向环中心方向弯曲；若质心偏移导致部分弧线方向明显异常，需记录为视觉缺陷（质心算法局限性）
- **Risk Covered**：算术均值质心与可视环形中心的偏差对渲染质量的影响

---

### Scenario 7：Network/Tree 图 Smooth Lines 不可见

- **Objective**：验证 Organic Network 和 Tree 图表的 Smooth Lines 选项不可见
- **Description**：切换至 Network（Organic）和 Tree 图表类型，确认 Plot 面板中 Smooth Lines 不显示
- **Key Steps**：
  1. 创建 Network Chart（Organic），打开 Plot 属性面板
  2. 确认 Smooth Lines 选项不存在
  3. 同样对 Tree Chart 执行
- **Expected Result**：Network 和 Tree 图表的 Plot 面板中均无 Smooth Lines 选项
- **Risk Covered**：`isSmoothLinesVisible()` 对其他关系图类型的隔离性；`smoothEdges` 仅在 `Algorithm.CIRCLE` 时生效

---

### Scenario 8：Script 控制 Smooth Lines

- **Objective**：验证通过 Script 控制 `smoothLines` 可正确开关 Circular 图表的弧线渲染
- **Description**：在图表的 `onLoad` Script 中设置 `chart.smoothLines = true/false`，观察连线渲染
- **Key Steps**：
  1. 创建 Circular Network Chart，Script 中写入 `chart.smoothLines = false`
  2. 执行图表，观察连线应为直线
  3. 将 Script 改为 `chart.smoothLines = true`，重新执行
  4. 确认同一 Script 属性在 Line Chart 中仍正常控制线段插值
- **Expected Result**：Script 设置 `smoothLines` 对 Circular 图表有效；对 Line Chart 的控制行为不受影响；无脚本错误
- **Risk Covered**：`smoothLines` 语义复用对 Script 层的影响
