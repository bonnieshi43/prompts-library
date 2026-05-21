遗漏：
1.area select and highlight

# Feature #74787 测试分析报告
# Rounded corners for tree chart nodes

> PR: https://github.com/inetsoft-technology/stylebi/pull/3615
> 知识库文档：chart.md / chart-ui.md / chart-date-comparison.md
> 外部文档：https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/TreeChart.html

---

## ⚠️ 输入完整性说明

| 项目 | 状态 | 备注 |
|------|------|------|
| Feature 描述 | ✅ 完整 |
| PR diff | ✅ 完整 | 13 个文件变更均已获取 |
| Knowledge 文档 | ✅ 已提供 | chart.md / chart-ui.md / chart-date-comparison.md |
| 外部文档 URL | ✅ 能实时访问 | 已作为补充参考 |

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为 Tree Chart 的节点（Node）增加圆角支持，允许用户通过 `nodeCornerRadius` 参数控制节点矩形的圆角程度（0 = 直角，0.5 = 胶囊形）。
- **用户价值**：Tree Chart 原有节点为直角矩形，视觉上较生硬。新功能允许用户调整圆角弧度，提升图表美观度与可定制性，与已有 Bar Corner Radius 功能保持一致的交互体验。
- **Feature 类型**：UI / Rendering / Data（配置持久化）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

1. **数据模型层（`PlotDescriptor`）**：新增 `nodeCornerRadius` 字段，默认值 `0.3`，支持 XML 序列化/反序列化（`writeAttributes` / `parseAttributes`），值域自动 clamp 至 `[0, 0.5]`，`equalsContent` 已包含该字段比较。
2. **渲染层（`RelationVO.paint()`）**：绘制节点时若 `nodeCornerRadius > 0`，将节点 `Shape` 替换为 `RoundRectangle2D`，圆角弧度 = `r × min(width, height) × 2`。
3. **图表生成层（`GraphGenerator.initRelationElement()`）**：仅在 `CHART_TREE` 类型时将 `PlotDescriptor.nodeCornerRadius` 同步至 `RelationElement`。
4. **元素模型层（`RelationElement`）**：新增 `nodeCornerRadius` 字段（默认 `0`），getter/setter 含 clamp，`equalsContent` 已包含。
5. **Script 层（`ChartProcessor`）**：仅在 `CHART_TREE` 类型下注册 `nodeCornerRadius` Script 属性。
6. **前端 UI（`chart-plot-options-pane`）**：新增 "Node Corner Radius" 数值输入控件，条件显示（`nodeCornerRadiusVisible = CHART_TREE`），含 `[0, 0.5]` 范围校验与错误提示；`fieldset` 显示条件新增 `nodeCornerRadiusVisible`。
7. **前端模型（`ChartPlotOptionsPaneModel`）**：新增 `nodeCornerRadius?: number` 与 `nodeCornerRadiusVisible?: boolean`。
8. **GraphBuilder**：`RelationVO` 分支新增圆角读取逻辑，将 `cornerRadius` 传至渲染上下文。
9. **CSS**：`.bar-corner-radius` 重命名为 `.corner-radius`，Bar 与 Node 两个输入框共用该样式。
10. **i18n**：新增 `Node Corner Radius` 与 `nodeCornerRadius.rangeWarning` 资源字符串。
11. **单元测试**：新增 `PlotDescriptorXmlTest`，覆盖 round-trip、legacy XML、默认值、边界 clamp 四个场景。

### 目标覆盖度

| 需求点 | PR 实现状态 |
|--------|------------|
| Tree Chart 节点圆角渲染 | ✅ 已实现 |
| UI 配置入口（Plot Options 面板） | ✅ 已实现 |
| 值域限制 [0, 0.5] | ✅ 前端校验 + 后端 clamp |
| Script 支持 | ✅ 仅 CHART_TREE 类型注册 |
| 配置持久化（XML） | ✅ 已实现 |
| 向后兼容（旧 XML 缺省） | ✅ parseXML 缺省时设为 0 |
| 新 Tree Chart 默认圆角 | ✅ 默认值 0.3 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|----------------|----------------|------|
| Tree Chart 节点始终为直角矩形 | 新建 Tree Chart 节点默认显示圆角（radius=0.3） | 中：新建报表视觉发生变化，存量无影响 |
| `PlotDescriptor` 无 `nodeCornerRadius` 字段，内存默认值与持久化无关 | 字段默认值 0.3，但 parseXML 缺省时覆盖为 0 | 高：旧 XML 加载时双默认值设计，依赖 parseXML 覆盖逻辑 |
| `RelationVO.paint()` 节点 Shape 为原始矩形 | r > 0 时替换为 `RoundRectangle2D` | 中：影响所有依赖 paint 路径的输出（屏幕/导出/打印） |
| Plot Options 面板无 Node Corner Radius 控件 | CHART_TREE 类型显示该控件 | 低：条件显示，不影响其他图表 |
| `.bar-corner-radius` CSS 类名 | 重命名为 `.corner-radius` | 低：若有自定义主题引用旧类名将失效 |
| Script 不支持 `nodeCornerRadius` | CHART_TREE 类型 Script 注册该属性 | 低：新增能力，无破坏 |
| `fieldset` 显示条件不含 `nodeCornerRadiusVisible` | OR 条件新增 `nodeCornerRadiusVisible` | 低：需回归 fieldset 整体显隐逻辑 |

---

## 第三部分：Risk Identification（风险识别）

| # | 风险描述 | 类型 | 严重度 |
|---|---------|------|--------|
| R1 | 旧版 XML 缺少 `nodeCornerRadius` 属性时，`parseXML` 必须将值覆盖为 0（否则存量 Tree Chart 意外变圆角）。此逻辑依赖 `parseAttributes` 中 `val != null ? parse : 0.0` 分支，需端到端验证 | Compatibility / Data Consistency | 高 |
| R2 | 渲染管道（`RelationVO.paint()`）将 `Shape` 替换为 `RoundRectangle2D`，该 paint 路径同时服务屏幕渲染、图片 tile 导出、PDF/Image 导出，需验证各输出通路的圆角效果一致 | Rendering / Export | 中 |
| R3 | `arc = r × min(width, height) × 2`，极细或极扁节点下 arc 可能异常（覆盖整个短边），导致视觉错乱 | Rendering / Boundary | 中 |
| R4 | Script 注册条件为 `CHART_TREE`；图表类型切换（Tree → 非 Tree）后，已通过 Script 设置的 `nodeCornerRadius` 是否被正确忽略/清除 | Functional / Cross-Module | 中 |
| R5 | `equalsContent` 已包含 `nodeCornerRadius` 比较，若漏掉会导致脏标记失效，变更不触发 `genTime` 更新，Angular tile URL 不变化，客户端不刷新图表 | Data Consistency / UI | 中 |
| R6 | 前端输入框值为 `null`（清空）时，`plotDesc.setNodeCornerRadius(null ? 0)` 路径是否正确；非数字、超范围输入的错误提示是否触发 | Functional / UI | 低 |
| R7 | Date Comparison 场景下，Tree Chart + DC 开启时，`ChartDcProcessor` 修改 RT 字段布局，`initRelationElement()` 仍能正确读取 `PlotDescriptor.nodeCornerRadius` 并同步至 `RelationElement` | Cross-Module / DC | 低 |

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点
1. 新建 Tree Chart 节点默认显示圆角（radius=0.3）
2. 旧版 XML（无 `nodeCornerRadius` 属性）加载后节点保持直角
3. UI 设置圆角值 → 渲染正确 → 保存重开后值持久化
4. 值域边界（0、0.5、超范围、负数、非数字、null）的处理
5. Script 设置与 UI 面板同步；auto-complete 仅在 CHART_TREE 下可见

### 高风险路径
- **旧版 XML 加载**：导入 PR 合并前保存的 Tree Chart，验证节点为直角
- **保存→重开**：设置圆角后保存 Viewsheet，关闭重开验证持久化
- **导出路径**：PDF / Image / 打印预览，验证 `RoundRectangle2D` 圆角渲染一致
- **类型切换**：Tree ↔ 非 Tree 图表切换，验证控件显隐与渲染
- **Script 路径**：`nodeCornerRadius` Script 设置后 tile URL 是否更新（`genTime` 变化）

### 涉及模块（回归验证）
- Chart Plot Options 面板整体布局（已有控件不受影响）
- Bar Corner Radius 控件（CSS 类名变更 `.bar-corner-radius` → `.corner-radius`）
- PDF / Excel / Image 导出（Tree Chart 圆角导出效果）
- Script 编辑器（auto-complete、属性可用性）
- Viewsheet 保存/加载（XML 序列化完整性）
- `VGraph` 渲染管道：tile 生成 → `genTime` 缓存失效 → 前端 tile URL 更新

### 专项检查

**本地化**：新增 `Node Corner Radius` 和 `nodeCornerRadius.rangeWarning`，需在多语言（中文/日文/法文等）环境下验证文本正确显示，无截断。

🔴 **测试-分析**：已经添加

**脚本兼容**：
- CHART_TREE 类型下，Script Editor auto-complete 含 `nodeCornerRadius`
- 非 CHART_TREE 类型下，auto-complete 不含该属性
- Script 设置后 UI 面板值同步，图表 tile 更新（依赖 `genTime` 变化）

🔴 **测试-分析**：Bug #74988

**文档一致性**：新增 Plot Options UI 控件和 Script 属性，需验证在线 Help 文档（TreeChart 页）是否同步更新。

🔴 **测试-分析**：doc暂时没添加后面验证

**Print Layout / Export 影响**：`RelationVO.paint()` 修改了 `Shape` 为 `RoundRectangle2D`，此 paint 方法同时被屏幕渲染与导出调用（`VSExporter` 通过 `VGraph.paintGraph()` 切片导出），需专项验证 PDF / PNG / 打印预览的圆角效果。

**Mobile 影响**：Plot Options 面板新增输入控件，需在小屏幕（≤480px）下验证布局不错位、输入框可交互。

🔴 **测试-分析**：验证没影响

### 知识库关联检查点

**chart.md — 渲染管道**：
- `RelationVO.paint()` 属于 Step 3（visual objects）中的 `ElementVO.paint()` 路径
- `equalsContent` 变更影响 `EGraph` 差量检测；若 `nodeCornerRadius` 变化未触发 `VGraphPair` 重算，则 tile 不更新
- 导出路径：`AbstractVSExporter` 以 `EXPORT_SIZE=1000` 切片调用 `VGraph.paintGraph()`，圆角 Shape 需在切片边界处正确裁剪

**chart-ui.md — 前端 tile 刷新机制**：
- `genTime` 是 tile URL 的缓存 key；`nodeCornerRadius` 变更若未触发后端 `genTime` 更新，前端将持续显示旧图片
- `equalsContent` 决定是否触发 dirty → recompute → 新 `genTime`；本次 PR 已在两处（`PlotDescriptor`、`RelationElement`）加入该字段的比较，需端到端验证

**chart-date-comparison.md — DC 场景**：
- `initRelationElement()` 在 `GraphGenerator` 中调用，位于 `ChartDcProcessor.process()` 之后；DC 修改 RT 字段布局但不影响 `PlotDescriptor`，理论上圆角应正常传递
- 需专项验证：Tree Chart + DC 开启时，节点圆角是否正确渲染

---

## 第五部分：Key Test Scenarios（核心测试场景）

---

### Scenario 1：新建 Tree Chart 默认圆角渲染

**Scenario Objective**：验证新建 Tree Chart 节点默认显示圆角（radius=0.3）

**Scenario Description**：`PlotDescriptor` 默认值为 0.3，新建图表时节点应自动显示圆角，这是本 PR 核心的视觉变化。

**Pre-condition**：无

**Key Steps**：
1. 新建 Viewsheet，拖入含层级关系的数据源，创建 Tree Chart
2. 不修改任何 Plot Options 配置，直接预览
3. 查看 Tree Chart 节点外观
4. 打开 Chart Editor → Plot Options，查看 "Node Corner Radius" 输入框值

**Expected Result**：节点显示圆角，视觉与 radius=0.3 一致；Plot Options 输入框为空（placeholder 显示 0.3）

**Risk Covered**：默认行为变化

🔴 **测试-分析**：默认值0.3
---

### Scenario 2：旧版 XML 加载向后兼容性（最高优先级）

**Scenario Objective**：验证不含 `nodeCornerRadius` 属性的旧版 Tree Chart XML 加载后节点保持直角

**Scenario Description**：`parseXML` 缺少属性时赋值为 0，覆盖内存默认值 0.3。这是**双默认值设计**的核心风险，旧报表不应因本次 PR 而意外改变外观。

**Pre-condition**：准备一份 PR 合并前保存的 Tree Chart Viewsheet（XML 中无 `nodeCornerRadius` 属性）

**Key Steps**：
1. 导入旧版 Tree Chart Viewsheet，或手动编辑 XML 删除 `nodeCornerRadius` 属性后导入
2. 打开该 Viewsheet，查看 Tree Chart 节点外观
3. 打开 Chart Editor → Plot Options，查看 "Node Corner Radius" 值

**Expected Result**：节点为直角（无圆角）；Plot Options 输入框为空（对应值 0）

**Risk Covered**：R1（向后兼容性 / 双默认值）

---
🔴 **测试-分析**：节点为直角

### Scenario 3：圆角值配置、保存与持久化

**Scenario Objective**：验证 UI 设置圆角值后渲染正确，保存重开后值持久化

**Scenario Description**：覆盖完整的配置→渲染→XML 序列化→反序列化链路，同时验证 `equalsContent` 变更触发 `genTime` 更新、前端 tile 刷新。

**Pre-condition**：存在一个 Tree Chart

**Key Steps**：
1. 打开 Chart Editor → Plot Options，将 "Node Corner Radius" 设为 0.2，点击 OK
2. 观察 Tree Chart 节点圆角变化（tile 应刷新）
3. 保存 Viewsheet，关闭后重新打开
4. 打开 Chart Editor → Plot Options，检查值是否为 0.2
5. 查看节点圆角是否与设置一致

**Expected Result**：设置后节点圆角与 0.2 一致，tile URL `genTime` 发生变化；重新打开后值持久为 0.2，节点保持圆角

**Risk Covered**：R5（equalsContent / genTime / tile 刷新）、数据持久化

---
🔴 **测试-分析**：加载正确

### Scenario 4：值域边界与非法输入校验

**Scenario Objective**：验证 `nodeCornerRadius` 前端校验与后端 clamp 在各边界条件下行为正确

**Scenario Description**：前端有范围校验，后端也有 clamp，需验证两端行为一致、错误提示正确触发，防止非法值进入渲染层。

**Pre-condition**：打开 Tree Chart 的 Chart Editor → Plot Options

**Key Steps**：
1. 输入 `0`，点击 OK → 观察节点形状
2. 输入 `0.5`，点击 OK → 观察节点形状
3. 输入 `-0.1` → 观察错误提示
4. 输入 `0.6` → 观察错误提示
5. 输入 `abc` → 观察错误提示
6. 清空输入框（null），点击 OK → 观察节点形状

**Expected Result**：
- `0`：节点直角，无提示
- `0.5`：节点胶囊形
- 负数 / 超 0.5 / 非数字：显示 "Node corner radius must be between 0 and 0.5."，无法提交
- 清空：节点直角（等同于 0）

**Risk Covered**：R6（非法输入 / 边界）

---
🔴 **测试-分析**：和期待结果一样,Bug #74991 text显示超出

### Scenario 5：Script 设置 nodeCornerRadius 及 auto-complete

**Scenario Objective**：验证 Script 中 `nodeCornerRadius` 属性可正确控制圆角，且仅在 CHART_TREE 类型下可用

**Scenario Description**：`ChartProcessor` 在 CHART_TREE 类型下注册该 Script 属性；Script 变更需触发 `genTime` 更新，否则前端 tile 不刷新（依据 chart-ui.md tile 缓存机制）。

**Pre-condition**：存在一个 Tree Chart

**Key Steps**：
1. 打开 Script Editor，输入 `Chart1.`，确认 auto-complete 包含 `nodeCornerRadius`
2. 设置 `Chart1.nodeCornerRadius = 0.4;`，执行
3. 观察节点圆角，确认 tile URL `genTime` 已变化
4. 打开 Plot Options，确认 "Node Corner Radius" 值同步为 0.4
5. 切换为 Bar Chart，再次打开 Script Editor，确认 auto-complete 不含 `nodeCornerRadius`

**Expected Result**：Tree Chart 下 auto-complete 可见且功能正常；Script 设置后 tile 刷新、UI 值同步；非 Tree 类型下不暴露该属性

**Risk Covered**：R4（Script / Cross-Module）、R5（genTime 更新）

---

🔴 **测试-分析**： Script 设置 nodeCornerRadius 及 auto-complete功能正确

### Scenario 6：图表类型切换时控件显隐与渲染

**Scenario Objective**：验证 Chart Editor 中切换图表类型时 "Node Corner Radius" 控件正确显隐，且渲染不出现残留

**Scenario Description**：`nodeCornerRadiusVisible` 由 `GraphTypeUtil.checkType(info, ctype == CHART_TREE)` 决定，类型切换是高频操作。

**Pre-condition**：存在一个 Tree Chart，已设置 nodeCornerRadius=0.3

**Key Steps**：
1. 打开 Chart Editor，确认 Plot Options 显示 "Node Corner Radius"
2. 切换图表类型为 Bar Chart
3. 打开 Plot Options，确认 "Node Corner Radius" 控件不可见
4. 切换回 Tree Chart
5. 打开 Plot Options，确认控件重新可见，值为 0.3

**Expected Result**：控件随图表类型正确显隐；切换回 Tree 时保留上次设置的圆角值；图表渲染无异常

**Risk Covered**：R4（状态切换 / Cross-Module）

---

🔴 **测试-分析**：切换控件不显示，结果不应用，切换回来保持

### Scenario 7：PDF / Image 导出圆角渲染一致性

**Scenario Objective**：验证 Tree Chart 节点圆角在 PDF 和 Image 导出中与屏幕显示一致

**Scenario Description**：依据 chart.md，`AbstractVSExporter` 以 `EXPORT_SIZE=1000` 切片调用 `VGraph.paintGraph()`，与屏幕渲染使用同一 `RelationVO.paint()` 路径。`RoundRectangle2D` 需在切片边界处正确裁剪。

**Pre-condition**：存在一个已设置 nodeCornerRadius=0.3 的 Tree Chart

**Key Steps**：
1. 导出 Viewsheet 为 PDF，打开查看 Tree Chart 节点形状
2. 导出为 PNG/Image，查看节点形状
3. 使用打印预览，查看节点形状
4. 对比屏幕显示，确认一致性

**Expected Result**：PDF、Image、打印预览中节点均显示与屏幕一致的圆角效果；切片边界处圆角无截断或错位

**Risk Covered**：R2（Rendering / Export）

---
🔴 **测试-分析** 导出和显示一致

### Scenario 8：极端节点尺寸下的圆角渲染

**Scenario Objective**：验证极细或极扁节点在圆角计算时不出现视觉异常

**Scenario Description**：`arc = r × min(width, height) × 2`；当节点宽高比极端时（如宽/高 > 10），arc 可能超过节点短边，导致圆角过度或形变。

**Pre-condition**：构造含长文本标签（宽远大于高）或多层级压缩（高远大于宽）的 Tree Chart

**Key Steps**：
1. 创建节点标签极长（宽度远大于高度）的 Tree Chart，设置 nodeCornerRadius=0.5
2. 创建节点层级密集（高度远大于宽度）的场景，设置 nodeCornerRadius=0.5
3. 调整图表容器至较小尺寸

**Expected Result**：节点显示为胶囊形（短边完全圆润），无视觉错误、点短无渲染崩溃；圆角弧度不超过节边的一半

**Risk Covered**：R3（边界渲染）

---
🔴 **测试-分析** 显示正常

### Scenario 9：Tree Chart + Date Comparison 圆角渲染

**Scenario Objective**：验证开启 Date Comparison 的 Tree Chart 节点圆角正常渲染

**Scenario Description**：依据 chart-date-comparison.md，`ChartDcProcessor.process()` 修改 RT 字段布局后，`initRelationElement()` 在 `GraphGenerator` 中被调用，仍应能正确读取 `PlotDescriptor.nodeCornerRadius` 并传至渲染层。

**Pre-condition**：Tree Chart 绑定含日期字段的数据源，已开启 Date Comparison（如 Standard Periods，当前年 vs 去年）

**Key Steps**：
1. 为 Tree Chart 开启 Date Comparison
2. 设置 nodeCornerRadius=0.3
3. 查看 Tree Chart 节点圆角渲染
4. 切换 Comparison Option（VALUE / CHANGE / PERCENT）后再次查看

**Expected Result**：DC 开启后节点圆角正常显示，与未开启 DC 时效果一致；切换 Comparison Option 不影响圆角渲染

**Risk Covered**：R7（DC / Cross-Module）

---
🔴 **测试-分析**：DC 开启后节点圆角正常显示，与未开启 DC 时效果一致；切换 Comparison Option 不影响圆角渲染


### Scenario 10：Bar Corner Radius CSS 类名变更回归

**Scenario Objective**：验证 CSS 类名从 `.bar-corner-radius` 重命名为 `.corner-radius` 后，Bar Chart 的 Corner Radius 输入框样式未受影响

**Scenario Description**：PR 中将 CSS 类名统一重命名以复用样式，需确认 Bar Chart 已有的 Corner Radius 控件样式（`min-width: 160px` 等）与变更前一致。

**Pre-condition**：存在一个 Bar Chart

**Key Steps**：
1. 打开 Bar Chart 的 Chart Editor → Plot Options
2. 检查 "Bar Corner Radius" 输入框宽度与样式是否正常
3. 对比 Tree Chart 的 "Node Corner Radius" 输入框样式，确认两者一致
4. 检查是否存在自定义主题引用 `.bar-corner-radius` 类名，若有则验证其未失效

**Expected Result**：两个输入框样式一致，宽度不小于 160px，无样式错乱；Bar Corner Radius 功能完全正常

**Risk Covered**：Rendering / Compatibility（CSS 重命名）

---

🔴 **测试-分析**：输入框样式一致

### Scenario 11：非 Tree 图表类型不显示控件且渲染不受影响

**Scenario Objective**：验证 Bar / Relation（非 Tree 布局）等其他图表类型不显示 "Node Corner Radius" 控件，且不影响其渲染

**Scenario Description**：控件可见性由 `nodeCornerRadiusVisible` 控制，`initRelationElement()` 中有 `CHART_TREE` 类型守卫，其他图表不应受任何影响。

**Pre-condition**：存在 Bar Chart、Network Chart（Relation 非 Tree）

**Key Steps**：
1. 打开 Bar Chart 的 Chart Editor → Plot Options，确认无 "Node Corner Radius" 控件
2. 打开 Network Chart 的 Chart Editor → Plot Options，确认无该控件
3. 确认上述图表渲染正常，无圆角出现

**Expected Result**：非 CHART_TREE 类型 Plot Options 面板不含该控件；图表渲染无任何变化

**Risk Covered**：R4（Cross-Module）、回归验证

🔴 **测试-分析**：非 Tree 图表类型不显示"Node Corner Radius" 控件