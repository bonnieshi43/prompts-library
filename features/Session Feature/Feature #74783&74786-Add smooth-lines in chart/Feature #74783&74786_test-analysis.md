# Smooth Lines 功能测试分析报告

---

## 第一部分：Requirement Summary（需求概要）

### 核心目标
为图表添加平滑曲线渲染功能，使用曲线替代直线段连接数据点。

### Feature 范围

| Feature | 图表类型 | 核心功能 |
|---------|---------|---------|
| **#74783** | Area/Stacked Area/Line/Stacked Line | Catmull-Rom Bezier 平滑曲线 |
| **#74783** | Multi-style（Line + Area） | 全局控制，所有 style 同步应用平滑曲线 |
| **#74786** | Circular Network | 二次 Bezier 弯曲 chord lines |

### 用户价值
- 提升图表视觉美感，使数据趋势展示更加流畅自然
- Circular Network 的 chord 线条向圆心弯曲，网络关系展示更清晰

### Feature 类型
- **UI层**：添加"Smooth Lines"开关交互控件
- **数据层**：`PlotDescriptor`持久化smoothLines配置
- **渲染层**：
  - `LineVO`/`AreaVO` 实现 Catmull-Rom 曲线（#74783）
  - `GTool.computeCenterPullCurve()` 实现二次 Bezier 曲线（#74786）

🔴 **测试-分析**：符合预期
Area/Stacked Area/Line/Stacked Line都已添加UI，实现Catmull-Rom曲线绘制
Circular Network已添加UI，实现了二次 Bezier 曲线

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

#### Feature #74783 变更

| 模块 | 变更内容 |
|------|---------|
| `LineElement` | 新增 `Type.CURVED` 枚举值 |
| `PlotDescriptor` | 新增 `smoothLines` 布尔属性，XML持久化（缺失时默认false） |
| `ChartPlotOptionsPaneModel` | 添加 `smoothLinesVisible` 计算逻辑，控制开关可见性 |
| `GraphGenerator` | 根据`PlotDescriptor.smoothLines`设置`LineElement.Type.CURVED` |
| `LineVO`/`AreaVO` | 实现Catmull-Rom曲线渲染 |
| `GTool` | 提供共享的Catmull-Rom Bezier计算方法 |
| `SVGSupport` | 新增`ATTR_SMOOTH`注解支持SVG动画导出 |
| `ChartProcessor` | 添加脚本支持 `smoothLines` 属性读写 |

#### Feature #74786 变更

| 模块 | 变更内容 |
|------|---------|
| `RelationElement` | 新增 `smoothEdges` 属性 |
| `GraphGenerator` | Circular 图表设置 `elem.setSmoothEdges(desc.getPlotDescriptor().isSmoothLines())` |
| `GTool` | 新增 `computeCenterPullCurve()` 方法实现二次 Bezier 曲线 |

### 复用关系

两个 Feature 共享以下机制：

```
PlotDescriptor.smoothLines (UI开关)
         ↓
ChartPlotOptionsPaneModel.smoothLinesVisible (控制开关显示)
         ↓
GraphGenerator 设置元素属性
    ├── LineElement.Type.CURVED (#74783)
    └── RelationElement.smoothEdges (#74786)
         ↓
渲染层实现曲线
    ├── LineVO/AreaVO (Catmull-Rom) (#74783)
    └── GTool.computeCenterPullCurve() (二次Bezier) (#74786)
```

### 目标覆盖度

#### Feature #74783 覆盖度

| 需求点 | 实现状态 |
|--------|---------|
| Plot Options面板添加"Smooth Lines"开关 | ✅ 已实现 |
| Line/Area VO实现Catmull-Rom曲线渲染 | ✅ 已实现 |
| 堆叠面积图边界像素一致性 | ✅ 已实现（共享GTool计算） |
| SVG导出曲线保持 | ✅ 已实现（通过`ATTR_SMOOTH`注解） |
| 持久化支持 | ✅ 已实现（PlotDescriptor.smoothLines） |
| 新Area/Stacked Area默认ON | ✅ 已实现 |
| 新Line/Stacked Line默认OFF | ✅ 已实现 |
| 已有图表保持原外观 | ✅ 已实现（XML属性缺失→false） |
| Step/Jump图表隐藏开关 | ✅ 已实现 |
| 脚本支持 | ✅ 已实现（ChartProcessor已修复） |

🔴 **测试-分析**：符合预期

#### Feature #74786 覆盖度

| 需求点 | 实现状态 |
|--------|---------|
| Circular 图表使用二次 Bezier 弯曲 chord lines | ✅ 已实现 |
| 复用 PlotDescriptor.smoothLines | ✅ 已实现 |
| 复用 Plot Options 开关 | ✅ 已实现（UI层由74783处理） |
| Circular 图表默认 smooth=on | ✅ 已实现 |
| 已有图表保持直线（XML缺失→false） | ✅ 已实现 |
| Network/Tree 隐藏开关 | ✅ 已实现 |
| 仅 Algorithm.CIRCLE 生效 | ✅ 已实现 |
| 仅 2-point edges 生效 | ✅ 已实现 |

🔴 **测试-分析**：符合预期。

### 算法差异对比

| 特性 | Feature #74783 | Feature #74786 |
|------|---------------|----------------|
| **曲线类型** | Catmull-Rom Bezier | 二次 Bezier |
| **控制点计算** | 基于数据点插值生成平滑曲线 | 中点向圆心拉动 |
| **Smoothing Factor** | N/A | `CIRCULAR_EDGE_SMOOTHING = 0.5` |
| **实现位置** | `LineVO`/`AreaVO` | `GTool.computeCenterPullCurve()` |
| **适用图表** | Area/Line 系列 | Circular Network |

🔴 **测试-分析**：符合预期

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|----------------|---------------|------|
| Area/Stacked Area图表使用直线段连接数据点 | 新图表默认使用Catmull-Rom平滑曲线 | 低 - 需求明确 |
| Line/Stacked Line图表使用直线段连接数据点 | 保持直线段，用户可手动启用平滑曲线 | 低 - 向后兼容 |
| Multi-style（Line + Area）图表使用直线段 | smoothLines全局控制，所有style同步变化 | 中 - 需验证UI可见性和渲染一致性 |
| Circular图表chord lines为直线 | 新建Circular图表chord向圆心弯曲 | 低 - 需求明确 |
| 已有图表保持原有外观 | 保持原有外观（smoothLines默认false） | 低 - 向后兼容 |
| SVG导出使用直线命令 | 平滑曲线图表使用曲线命令（C/c） | 中 - 需要验证 |
| Step/Jump图表无特殊处理 | smoothLines开关隐藏 | 低 - UI逻辑明确 |
| Network/Tree图表无smoothEdges控制 | smoothEdges不可见 | 低 - UI逻辑明确 |

🔴 **测试-分析**：符合预期

---

## 第三部分：Risk Identification（风险识别）

### 功能风险
- **状态转换复杂**：图表类型转换时smoothLines状态重置逻辑复杂（Area→Line应重置为OFF）
- **类型转换一致性**：Circular→Network/Tree时需验证状态正确处理
- **Multi-style全局控制**：Multi-style图表中smoothLines全局控制所有style，需验证UI可见性和渲染一致性

### 渲染风险
- **SVG动画兼容性**：`SVGAnimationDOMInjector`可能在动画重写时展平曲线（#74783）
- **Area.fill()曲线展平**：Java2D的Area.add()会静默展平三次曲线（#74783）
- **Multi-style渲染一致性**：Multi-style图表中Line和Area部分需同步应用平滑曲线
- **多段边缘**（#74786）：需求明确仅2-point edges生效，多段edges可能不会弯曲
- **算法限制**（#74786）：仅Algorithm.CIRCLE生效，ORGANIC/Tree等布局不受影响

### 性能风险
- **大数据性能**：大量数据点时曲线计算开销增大

### 兼容性风险
- **历史配置兼容**：升级后已有图表需保持原外观
- **多语言资源**：缺失语言环境下可能显示英文key

### 边界情况
- **2-point edges**（#74786）：仅简单的两点连线才会弯曲
- **大数据量**：大量chord线条时曲线计算开销

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点

#### Feature #74783 验证点
1. smoothLines开关在Area/Line系列图表中正确显示/隐藏
2. 不同图表类型的默认行为正确性（Area:ON, Line:OFF）
3. 图表类型转换时状态正确重置
4. SVG导出时曲线保持（不被展平）
5. Catmull-Rom曲线渲染正确性
6. 脚本可读写smoothLines属性
7. Multi-style图表中smoothLines全局控制所有style，UI可见性和渲染一致性

🔴 **测试-分析**：第3,6存在bug，在场景里已覆盖

#### Feature #74786 验证点
1. Circular图表启用smoothEdges后chord线条弯曲
2. 弯曲程度符合CIRCULAR_EDGE_SMOOTHING=0.5的预期
3. Network/Tree图表smoothLines开关不可见
4. 图表类型转换时状态正确处理
5. 多段edges保持直线
6. 仅Algorithm.CIRCLE生效

🔴 **测试-分析**：第4存在bug，在场景里已覆盖

### 高风险路径

1. **Area图表流程**：新建Area图表→启用smoothLines→转换为Line→验证重置
2. **Multi-style流程**：创建Multi-style图表→启用smoothLines→验证Line和Area部分同步变化
4. **Circular流程**：新建Circular图表→启用smoothLines→验证chord弯曲→转换为Network→验证开关隐藏
5. **SVG导出流程**：启用smoothLines的Area图表→SVG导出→验证曲线命令
4. **历史兼容流程**：导入旧版本图表配置→验证保持原外观

🔴 **测试-分析**：符合预期

### 涉及模块

| 模块 | 职责 |
|------|------|
| `PlotDescriptor` | 属性持久化（smoothLines） |
| `GraphGenerator` | 元素创建逻辑，设置LineElement.Type或RelationElement.smoothEdges |
| `ChangeChartTypeController` | 类型转换时smoothLines状态管理 |
| `ChartPlotOptionsPaneModel` | UI可见性控制 |
| `LineVO`/`AreaVO` | Catmull-Rom曲线渲染（#74783） |
| `RelationElement` | smoothEdges属性控制（#74786） |
| `GTool` | computeCenterPullCurve曲线计算（#74786） |
| `SVGSupport` | SVG导出曲线保持 |
| `ChartProcessor` | 脚本属性注册（已修复） |

### 专项检查

- **本地化**：验证"Smooth Lines"标签在各语言环境下正确显示
- **脚本兼容**：验证Script可读取/设置smoothLines属性
- **曲线渲染**：验证弯曲程度是否符合预期（#74786）
- **多段edges**：验证多段连接是否保持直线（#74786）
- **算法限制**：验证仅Algorithm.CIRCLE生效（#74786）
- **文档一致性**：需验证Help文档同步更新

🔴 **测试-分析**：脚本兼容和文档存在bug，在场景里已覆盖

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 验证点一：新建图表默认行为

#### 场景1：不同图表类型的默认状态

**Scenario Objective**：验证新建图表时smoothLines的默认状态符合预期

**Key Steps**：
1. 分别创建 Area、Line、Circular 图表
2. 不做任何设置，查看 Plot Options 面板
3. 检查各图表的渲染效果

**Expected Result**：
- Area/Stacked Area："Smooth Lines" 默认勾选
- Line/Stacked Line："Smooth Lines" 默认未勾选
- Circular Network："Smooth Lines" 默认勾选，chord 向圆心弯曲

**Risk Covered**：默认行为正确性

🔴 **测试-分析**：符合预期

---

### 验证点二：状态转换一致性

#### 场景2：Area ↔ Line 类型转换

**Scenario Objective**：验证 Area/Line 系列转换时 smoothLines 状态正确重置

**Key Steps**：
1. 创建 Area 图表并启用 smoothLines
2. 转换为 Line 类型
3. 查看 Plot Options 面板状态

**Expected Result**：
- Area → Line："Smooth Lines" 被重置为未勾选
- Line → Area："Smooth Lines" 保持当前状态

**Risk Covered**：状态转换一致性

🔴 **测试-分析**：偶尔第一次没有save vs时，会有问题(ui上对着，但画出来的和ui不符合)，不重现了

---

#### 场景3：Circular ↔ Network/Tree 类型转换

**Scenario Objective**：验证 Circular 与 Network/Tree 转换时 UI 开关正确处理

**Key Steps**：
1. 创建 Circular 图表并启用 smoothLines
2. 转换为 Network 类型
3. 查看 Plot Options 面板

**Expected Result**：
- Circular → Network/Tree："Smooth Lines" 开关隐藏
- Network/Tree → Circular：首次进入 Circular 时默认勾选

**Risk Covered**：类型转换状态一致性

🔴 **测试-分析**： Bug #74961(ui状态转化正确，但画的和ui不同步)

---

### 验证点三：渲染正确性

#### 场景4：Catmull-Rom 曲线渲染（Area/Line）

**Scenario Objective**：验证 Area/Line 图表的 Catmull-Rom 曲线渲染效果

**Key Steps**：
1. 创建 Area/Line 图表并启用 smoothLines
2. 绑定包含多个数据点的数据源
3. 检查渲染效果

**Expected Result**：
- 数据点之间使用平滑曲线连接
- 曲线通过所有数据点
- 无折角或突变

**Risk Covered**：曲线渲染正确性

🔴 **测试-分析**：符合预期-数据点之间使用平滑曲线连接

---

#### 场景5：二次 Bezier 曲线渲染（Circular）

**Scenario Objective**：验证 Circular 图表的 chord 弯曲效果

**Key Steps**：
1. 创建 Circular 图表并启用 smoothLines
2. 检查 chord 线条渲染效果
3. 测量弯曲弧度

**Expected Result**：
- chord 线条向圆心方向弯曲
- 弯曲程度适中（符合 CIRCULAR_EDGE_SMOOTHING=0.5）
- 控制点位于中点与圆心之间

**Risk Covered**：Circular 曲线渲染正确性

🔴 **测试-分析**：符合预期-chord 线条向圆心方向弯曲
---

#### 场景6：堆叠面积图边界一致性

**Scenario Objective**：验证 Stacked Area 图表各区域边界像素对齐

**Key Steps**：
1. 创建 Stacked Area 图表并启用 smoothLines
2. 检查渲染效果
3. 放大检查边界接缝

**Expected Result**：
- 各堆叠区域之间无明显接缝
- 曲线边界像素对齐

**Risk Covered**：堆叠面积图曲线形状组合正确性

🔴 **测试-分析**：符合预期

---

#### 场景6：Multi-style 组合图表验证

**Scenario Objective**：验证 Multi-style 图表中 smoothLines 的全局控制行为

**Key Steps**：
1. 创建 Multi-style 图表（Line + Area）
2. 查看 Plot Options 面板，确认 "Smooth Lines" 开关可见性
3. 启用 smoothLines
4. 检查 Line 和 Area 部分的渲染效果
5. 禁用 smoothLines
6. 再次检查渲染效果
7. 创建 Multi-style 图表（Area + Bar）
8. 重复步骤 2-6

**Expected Result**：
- **Line + Area 组合**：
  - "Smooth Lines" 开关可见
  - smoothLines 是全局控制，不是每个 style 独立控制
  - 启用 smoothLines 后：Line 和 Area 部分都使用 Catmull-Rom 平滑曲线
  - 禁用 smoothLines 后：Line 和 Area 部分都恢复为直线段
  - Line 和 Area 部分的曲线渲染一致（同步变化）
- **Area + Bar 组合**：
  - "Smooth Lines" 开关可见（因为包含 Area）
  - smoothLines 全局控制
  - 启用 smoothLines 后：Area 部分使用平滑曲线，Bar 部分不受影响（保持矩形）
  - 禁用 smoothLines 后：Area 部分恢复为直线段，Bar 部分不受影响
- **Bar + Bar 组合**：
  - "Smooth Lines" 开关不可见（Bar 不支持 smoothLines）

**Risk Covered**：Multi-style 图表兼容性、全局控制一致性、不支持 style 的行为

🔴 **测试-分析**：符合预期

---

### 验证点四：UI 可见性控制

#### 场景7：Step/Jump 图表隐藏开关

**Scenario Objective**：验证 Step/Jump 图表类型隐藏 smoothLines 开关

**Key Steps**：
1. 创建 Step Area/Jump Line 图表
2. 查看 Plot Options 面板

**Expected Result**：
- "Smooth Lines" 开关不可见

**Risk Covered**：UI 条件渲染正确性

🔴 **测试-分析**：符合预期-ui不可见

---

#### 场景8：Network/Tree 图表隐藏开关

**Scenario Objective**：验证 Network/Tree 图表类型隐藏 smoothLines 开关

**Key Steps**：
1. 创建 Network 和 Tree 图表
2. 分别查看 Plot Options 面板

**Expected Result**：
- Network 和 Tree 图表的 "Smooth Lines" 开关均不可见

**Risk Covered**：UI 条件渲染正确性

🔴 **测试-分析**：符合预期-ui不可见

---

### 验证点五：边界条件

#### 场景9：Circular 多段边缘保持直线

**Scenario Objective**：验证多段连接的边缘不受 smoothEdges 影响

**Key Steps**：
1. 创建包含多段路径连接的 Circular 图表
2. 启用 smoothLines
3. 检查多段路径的渲染效果

**Expected Result**：
- 多段路径保持直线
- 仅简单的两点连线弯曲

**Risk Covered**：边界条件处理、多段 edges 限制

🔴 **测试-分析**：符合预期
不需要刻意构造多段路径，这是布局算法自动产生的
观察是否 所有 连线都弯曲
- 如果发现某些连线保持直线，说明它们是多段路径
- 这正是预期行为

---

### 验证点六：导出与持久化

#### 场景10：SVG 导出曲线保持

**Scenario Objective**：验证 SVG 导出时曲线不被展平

**Key Steps**：
1. 创建启用 smoothLines 的 Area 图表
2. 导出为 SVG 格式
3. 检查 SVG 内容

**Expected Result**：
- SVG 包含 `data-smooth="true"` 注解
- 路径使用曲线命令（C/c）而非直线命令（L/l）

**Risk Covered**：SVG 导出完整性

🔴 **测试-分析**：符合预期

---

#### 场景11：多格式导出曲线保持

**Scenario Objective**：验证 PNG、Excel、HTML、PDF 导出时曲线渲染正确

**Key Steps**：
1. 创建启用 smoothLines 的 Area 图表
2. 导出为 PNG 格式，打开图片检查曲线渲染效果
3. 导出为 Excel 格式，打开文件检查图表渲染效果
4. 导出为 HTML 格式，在浏览器中打开检查曲线渲染效果
5. 切换到 Print Layout 模式，检查曲线渲染效果
6. 从 Print Layout 导出为 PDF，打开文件检查曲线渲染效果

**Expected Result**：
- PNG 图片中曲线渲染与 UI 中显示一致，曲线平滑无折角
- Excel 图表中曲线渲染与 UI 中显示一致，曲线平滑无折角
- HTML 中曲线渲染与 UI 中显示一致，曲线平滑无折角
- Print Layout 模式下曲线渲染与正常模式一致
- PDF 导出中曲线渲染正确，无展平或变形

**Risk Covered**：多格式导出完整性、Print Layout 兼容性

🔴 **测试-分析**：符合预期

---

#### 场景12：历史配置升级兼容性

**Scenario Objective**：验证升级后已有图表保持原外观

**Key Steps**：
1. 准备包含旧版本图表配置的报表（无 smoothLines 属性）
2. 导入报表
3. 查看图表渲染效果和 Plot Options 面板

**Expected Result**：
- 图表保持原有直线/曲线外观（smoothLines 默认 false）
- 用户可手动启用平滑线

**Risk Covered**：历史配置兼容性

🔴 **测试-分析**：符合预期

---

#### 场景15：Mobile Layout 曲线渲染

**Scenario Objective**：验证 Mobile Layout 模式下曲线渲染正确性

**Key Steps**：
1. 创建启用 smoothLines 的 Area/Line 图表
2. 创建启用 smoothLines 的 Circular 图表
3. 切换到 Mobile Layout 模式
4. 检查两类图表的曲线渲染效果
5. 在 Mobile Layout 模式下导出为 PNG/PDF，检查导出效果

**Expected Result**：
- Mobile Layout 模式下 Area/Line 曲线渲染与正常模式一致，平滑无折角
- Mobile Layout 模式下 Circular 曲线渲染与正常模式一致，向圆心弯曲
- Mobile Layout 模式下导出的 PNG/PDF 曲线渲染正确，无展平或变形

**Risk Covered**：Mobile Layout 兼容性

🔴 **测试-分析**：符合预期

---

### 验证点七：脚本与扩展性

#### 场景13：Script 控制 smoothLines

**Scenario Objective**：验证 Script 可读写 smoothLines 属性

**Key Steps**：
1. 创建 Line 图表
2. 通过 Script 设置 `chart.plot.smoothLines = true`
3. 执行脚本并验证图表渲染
4. 通过 Script 读取 `chart.plot.smoothLines`

**Expected Result**：
- 图表渲染为平滑曲线
- Script 读取返回 true

**Risk Covered**：脚本兼容性

🔴 **测试-分析**：Bug #74953(已修复)

---

#### 场景14：算法差异验证

**Scenario Objective**：验证 Area/Line 和 Circular 的曲线算法完全独立

**Key Steps**：
1. 创建 Area 图表启用 smoothLines
2. 创建 Circular 图表启用 smoothLines
3. 同时显示两个图表

**Expected Result**：
- Area 图表使用 Catmull-Rom 曲线
- Circular 图表使用二次 Bezier 曲线
- 两者渲染效果完全不同

**Risk Covered**：功能复用正确性、算法差异验证

🔴 **测试-分析**：符合预期

---

### 验证点八：本地化

#### 场景15：多语言资源验证

**Scenario Objective**：验证 "Smooth Lines" 标签在各语言环境下正确显示

**Key Steps**：
1. 切换系统语言为中文/法语/日语/英语
2. 打开图表 Plot Options 面板

**Expected Result**：
- "Smooth Lines" 标签显示对应语言的翻译文本

**Risk Covered**：本地化支持

🔴 **测试-分析**：已添加

---

### 验证点九：文档一致性验证

#### 场景16：文档描述与实际 UI 行为一致性验证

**Scenario Objective**：验证文档中描述的 Smooth Lines 功能与实际 UI 行为一致

**Key Steps**：
1. 创建 Area 图表
   - 查看 Plot Options 面板，确认 "Smooth Lines" 开关可见且默认勾选
   - 禁用 "Smooth Lines"，确认图表变为直线段
   - 启用 "Smooth Lines"，确认图表变为平滑曲线
2. 创建 Line 图表
   - 查看 Plot Options 面板，确认 "Smooth Lines" 开关可见且默认未勾选
   - 启用 "Smooth Lines"，确认图表变为平滑曲线
3. 创建 Circular Network 图表
   - 查看 Plot Options 面板，确认 "Smooth Lines" 开关可见且默认勾选
   - 禁用 "Smooth Lines"，确认 chord 线条变为直线

**Expected Result**：
- 所有支持 smoothLines 的图表类型，"Smooth Lines" 开关可见
- 所有图表类型的默认值与文档描述一致（Area/Circular: ON, Line: OFF）
- 启用/禁用 "Smooth Lines" 后的渲染效果与文档描述一致

**Risk Covered**：文档准确性、用户体验一致性

🔴 **测试-分析**：Documentation #74959，Documentation #74958

---

**文档版本**：v3.0
**生成日期**：2026-05-14
**合并对象**：Feature #74783 + Feature #74786
**分析状态**：完成