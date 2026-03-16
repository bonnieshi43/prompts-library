## 未覆盖内容
1.chart type,除了bar以外，auto chart是bar，inverver Bug #74166
2.chart类型的切换
3.mutilstyle的应用
4.和一些属性的结合使用，比如glossy effect 影响
5.script Bug #74168
6.bar区域的选择，比如brush等

---

## 第一部分：Requirement Summary（需求概要）

### 核心目标
- 为 Bar Chart（柱状图）引入圆角效果，使样式更符合现代 Material 3/AI 设计规范。
- 在图库渲染中支持可配置的圆角（包括仅开口端圆角 & 全角圆角）。

### 用户价值
- 视觉更加现代、柔和，提高图表可读性和整体 UI 一致性。
- 通过配置属性（圆角程度、是否四角圆角）灵活控制图形风格。

### Feature 类型
- Rendering（渲染）
- API/Config（图表属性扩展）
- Backward‑compatible Behavior Change（向后兼容性）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更
- **新增属性**
  - 在 `IntervalElement` 中新增 `cornerRadius` 和 `roundAllCorners` 属性。
  - 提供 getter/setter，默认值：`cornerRadius=0`（禁用）、`roundAllCorners=false`（默认仅开口端圆角）。
- **渲染引擎支持**
  - 在 `BarVO` 绘制逻辑中，根据 `cornerRadius` 和 `roundAllCorners` 构建圆角路径。
  - 实现 `buildRoundedBarShape()` 方法，处理不同方向和四角/双角圆角。
- **传递配置**
  - 在 `PlotDescriptor` & `GraphBuilder` 中解析 XML/属性值至对应 `BarVO`。
  - 默认圆角比 `DEFAULT_BAR_CORNER_RADIUS = 0.3`，新图默认为圆角。
- **前端/UI 属性支持**
  - 图表配置面板中增加圆角相关选项（HTML/TS 变更）。
- **单元测试**
  - 添加 `BarVORoundedShapeTest` 用例验证圆角绘制与路径生成。

### 目标覆盖度对比

| 需求点 | 实现覆盖 | 注释 |
|--------|----------|------|
| 可配置柱状图圆角 | ✅ | 支持 `cornerRadius` |
| 支持仅对开口端圆角 | ✅ | 通过 `roundAllCorners=false` |
| 支持全部四角圆角 | ✅ | 通过 `roundAllCorners=true` |
| 支持横向 & 纵向柱状图 | ✅ | 绘制逻辑考虑方向参数 |
| 默认向后兼容不改变旧图 | ⚠️ | 默认圆角已启用，旧图无配置会圆角显示 |
| UI 属性配置项同步 | ⚠️ | 存在但需验证国际化、Tooltip 文案 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|-----------------|----------------|------|
| Bar 无圆角 | Bar 默认圆角 | 默认图外观变化 |
| 单一渲染形状 | 提供圆角路径 | 绘制逻辑更复杂 |
| 配置项无圆角 | 新增 UI 控件属性 | 配置解析错误风险 |
| Bar 栈图无圆角约束 | 可单独四角/端圆角 | 堆叠场景表现需验证 |

---

## 第三部分：Risk Identification（风险识别）

### 功能风险
- 默认圆角启用可能导致现有 Dashboard 外观改变（Backward Compatibility）。🔴 **测试-分析**：
- 堆叠/负值/水平柱状图圆角在边界条件下显示异常。 🔴 **测试-分析**：堆叠/负值/水平柱状图圆角在边界条件下显示正常

### 渲染风险
- 绘制路径与现有库兼容性（如与堆叠算法交互）。    🔴 **测试-分析**：无影响
- 强制四角圆角在极窄柱状图上可能导致重叠/剪裁问题。🔴 **测试-分析**：无影响

### 配置/解析风险
- 属性解析在旧配置没有 setting 时默认为 0.3 可能不被预期。🔴 **测试-分析**：兼容无影响
- UI 属性面板错误输入（非数值/范围外值）。  🔴 **测试-分析**：弹warning
- 国际化本地化文案未覆盖全部新属性。        🔴 **测试-分析**：已添加本地化

### 跨模块风险
- Export/Scheduler/Gateway 导出图表时可能无法保留圆角效果。🔴 **测试-分析**：导出保留圆角
- API 对 embed/外部调用可能影响行为。                     🔴 **测试-分析**： 无影响

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点
- **圆角属性生效性**                                        🔴 **测试-分析**：功能正常
  - `cornerRadius=0` → 无圆角
  - `cornerRadius=x` (0<x<=0.5) → 圆角显示且比例正确
  - `roundAllCorners` true/false 两种行为
- **不同图类型验证**
  - 标准柱状图、横向柱状图、堆叠柱状图验证圆角边界行为          🔴 **测试-分析**：功能正常，interver没添加
- **默认行为兼容**
  - 无配置时是否仍旧生效（默认 0.3）
  - 已存在老图是否外观发生变化
- **异常输入验证**                                          🔴 **测试-分析**：超出范围弹warning，确实输入直角
  - 超出合法范围（<=0 or >0.5）输入
  - 非数值/缺失输入
- **导出/嵌入测试**
  - PNG/PDF 导出是否保留圆角                                 🔴 **测试-分析**：导出保留圆角
  - 外部 embed 场景兼容
- **UI / 本地化**                                           🔴 **测试-分析**：已添加本地化
  - 图表属性面板显示与默认值
  - 本地化标签/提示语

### 涉及模块
- 渲染 Engine（BarVO/IntervalElement）
- 属性 parser（PlotDescriptor）
- Builder（GraphBuilder）
- UI 配置（chart-plot-options-pane）
- Export 引擎
- Scheduler 截图和图表静态化

### 专项检查清单
- **配置相关**
  - 正确解析 XML/JSON 中 `barCornerRadius` 与 `barRoundAllCorners`
  - 属性面板默认值是否同步
  - 输入范围限制（0~0.5）
- **渲染相关**
  - 垂直/水平堆叠与非堆叠场景
  - 负值/0 值柱状图圆角行为
  - 细长显示比例下是否正常
- **兼容性**
  - 老报表加载是否有视觉偏差
  - API embed 是否变更默认表现
- **导出**
  - PNG/PDF 导出效果对比

---

## 第五部分：Key Test Scenarios (核心测试场景)

### 场景 1：无圆角配置的旧图                          🔴 **测试-分析**：和期待结果相同
- **Objective**：验证未配置圆角时行为保持一致
- **Steps**：
  1. 加载老版本无圆角设置报表
  2. 对比历史渲染结果截图
- **Expected**：柱状图仍旧应按历史样式渲染
- **Risk Covered**：默认行为变化风险

### 场景 2：cornerRadius=0 的显式配置                🔴 **测试-分析**：和期待结果相同
- **Objective**：明确关闭圆角效果
- **Steps**：
  1. 设置 `cornerRadius=0`
  2. 渲染柱状图
- **Expected**：柱无圆角，顶角/全角均为直角
- **Risk Covered**：错误解析行为

### 场景 3：端圆角 vs 全角圆角                         🔴 **测试-分析**：和期待结果相同
- **Objective**：`roundAllCorners` 行为验证
- **Steps**：
  1. 设置 `cornerRadius=0.3` 且 `roundAllCorners=false`
  2. 设置 `cornerRadius=0.3` 且 `roundAllCorners=true`
  3. 对比渲染效果
- **Expected**：端圆角只圆开口端；全角圆角四角均圆滑
- **Risk Covered**：渲染逻辑分支错误

### 场景 4：水平柱状图圆角验证                           🔴 **测试-分析**：和期待结果相同
- **Objective**：横向柱状图方向圆角计算正确
- **Steps**：
  1. 新建水平 bar chart
  2. 设置圆角配置不同组合
- **Expected**：横向圆角在左右方向表现符合预期
- **Risk Covered**：方向逻辑

### 场景 5：堆叠柱状图顶部圆角                           🔴 **测试-分析**：不支持   Bug #74164
- **Objective**：验证堆叠图在不同数据组合下圆角正确性
- **Steps**：
  1. 创建堆叠图，多 series 不同值组合
  2. 验证只有顶端可应用圆角
- **Expected**：中间堆叠不圆角；顶堆叠端圆角
- **Risk Covered**：堆叠渲染计算

### 场景 6：导出图表效果                                 🔴 **测试-分析**：Bug #74167
- **Objective**：PNG/PDF 导出保持圆角表现
- **Steps**：
  1. 在 UI 设置圆角
  2. 导出 PNG/PDF
- **Expected**：导出图与实时渲染一致
- **Risk Covered**：导出兼容性

### 场景 7：属性面板输入约束                            🔴 **测试-分析**：和期待结果相同
- **Objective**：确保 UI 数值限制与错误提示
- **Steps**：
  1. 输入非法数值（如 >0.5、负数、非数字）
- **Expected**：显示错误提示且不影响渲染
- **Risk Covered**：异常输入处理