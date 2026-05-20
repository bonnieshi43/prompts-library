# Feature #74787 - Tree Chart 节点圆角 分析报告
## 未覆盖内容
1.圆角以后text的显示Bug #74991
2.圆角以后的highlight
3.圆角以后的选择
4.printlayout和mobile

> **说明**：PR diff 内容通过 PDF 截图获取，共 13 个文件变更，内容基本完整。部分 Angular 组件 TypeScript 文件（`chart-plot-options-pane.component.ts`）的 diff 末尾被截断，已基于可见内容进行分析。

---

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

**功能核心目标**：为树形图（Tree Chart）的节点形状增加圆角支持，用户可通过 UI 控件调整圆角半径，使节点从直角矩形变为圆角矩形乃至椭圆/药丸形。

**解决的业务问题**：提升树形图的视觉美观性与可定制性，与已有的 Bar Chart 圆角功能保持产品能力对齐。

**涉及模块**：
- **UI**：Plot Options 面板新增 Node Corner Radius 输入控件（Angular）
- **Backend（Java）**：`PlotDescriptor`、`RelationElement`、`RelationVO`、`GraphGenerator`、`GraphBuilder`、`ChartProcessor`
- **Script**：通过 `ChartProcessor` 暴露 `nodeCornerRadius` 脚本属性
- **持久化**：XML 序列化 / 反序列化（`PlotDescriptor.writeXML` / `parseXML`）
- **测试**：新增 `PlotDescriptorXmlTest`

**功能类型**：UI 可视化属性 + 数据持久化 + Script 控制

### 2. 需求清晰度与完整性

需求原文仅一句话，存在以下未明确内容：

- **默认行为未定义**：新建树形图是否默认启用圆角？值为多少？（实现自行决策为 0.3，属于隐含假设）
- **已有图表的兼容行为未定义**：升级后已保存的树形图节点形状是否应保持不变？（实现采用"读取旧 XML 时默认为 0"策略，但需求未明确说明）
- **适用图表类型范围未定义**：仅限 `CHART_TREE`？还是包含其他关系图类型？
- **输入范围未定义**：`[0, 0.5]` 的区间定义完全来自实现侧决策
- **Script 控制能力未作要求**：属于超出需求的实现，虽有价值但未受需求约束

### 3. 测试风险识别

- **默认值双轨风险**：新建图表默认 0.3（圆角），旧 XML 解析默认 0（直角）——两套默认值逻辑易被测试遗漏
- **跨模块状态不同步风险**：UI 输入 → Model → PlotDescriptor → RelationElement → RelationVO 渲染，链路长，任一环节映射错误均导致视觉结果偏差
- **Script 行为与 UI 不一致风险**：Script 设置的值是否能正确反映到渲染层，需独立验证
- **图表类型条件控制风险**：`nodeCornerRadius` 属性在非 Tree Chart 类型下是否完全不生效，需验证隔离性

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型

**Feature**，影响层级：UI + 业务逻辑 + 数据层（跨层）

受影响的用户路径：
- 用户打开 Tree Chart → Plot Options 面板 → 调整 Node Corner Radius → 图表节点形状实时变化
- 用户通过 Script 设置 `nodeCornerRadius` → 图表节点形状变化
- 已保存的旧版 Tree Chart 重新打开 → 节点保持直角（兼容路径）
- 新建 Tree Chart → 节点默认圆角（0.3）

### 2. 需求实现一致性

**实现完整性**：核心功能路径完整，从 UI 到渲染、序列化、Script 均有覆盖。

**隐式行为变化（高关注）**：

实现引入了一个**对用户不透明的默认行为差异**：

```text
新建 PlotDescriptor → DEFAULT_NODE_CORNER_RADIUS = 0.3（圆角）
parseXML（旧图表） → nodeCornerRadius 属性缺失时 → setNodeCornerRadius(0)（直角）
```

这意味着同一套代码对"新建"与"加载已有"图表表现不同。需求未明确要求此行为，属于实现自行决策，须明确作为产品决策记录并测试验证。

**过度实现**：Script 支持（`ChartProcessor` 中通过 `scriptable.addProperty` 暴露）属于需求未要求的能力扩展，实现本身合理，但需额外测试覆盖。

**UI 端的 null 语义处理**：`ChartPlotOptionsPaneModel` 中 `nodeCornerRadius` 使用 `Double`（可为 null），UI 中 `nodeCornerRadius > 0 ? value : null` 的映射逻辑意味着值为 0 时 UI 显示为空，写回时 null 被映射为 0。此处语义需在测试中确认无丢失。

### 3. 关键实现风险

**风险 1：fieldset 显示条件遗漏**

- **风险来源**：Angular 模板中 `fieldset` 的 `*ngIf` 条件更新为包含 `model.barCornerRadiusVisible || model.nodeCornerRadiusVisible`，但 `fieldset` 内部的 `nodeCornerRadius` 输入框直接放在 `fieldset` 闭合标签前，未被 `</fieldset>` 正确包裹（从 diff 第 254–263 行可见结构存在缩进异常）
- **影响模块**：Plot Options UI
- **潜在后果**：UI 结构错位，节点圆角输入框可能渲染在错误的 DOM 层级，或在切换图表类型时显示/隐藏行为异常

**风险 2：CSS 类名变更的全局影响**

- **风险来源**：将 `.bar-corner-radius` 重命名为 `.corner-radius`
- **影响模块**：所有引用 `.bar-corner-radius` 的样式或测试选择器
- **潜在后果**：若存在 E2E 测试或外部样式通过 `.bar-corner-radius` 选择器定位 Bar Corner Radius 输入框，将失效

**风险 3：非 Tree Chart 类型下的属性隔离**

- **风险来源**：`GraphGenerator` 中仅在 `info.getChartType() == CHART_TREE` 时调用 `setNodeCornerRadius`；`ChartProcessor` 中 Script 属性注册同样有此条件判断
- **影响模块**：非树形图类型图表
- **潜在后果**：切换图表类型（如 Tree → Network/Force）时，若 `PlotDescriptor` 中仍保留 `nodeCornerRadius` 值，但 `RelationElement` 未被设置，渲染层不受影响，但需验证 UI 控件是否正确隐藏

**风险 4：RelationVO 渲染层的 cornerRadius 传递路径**

- **风险来源**：`GraphBuilder` 中对 `RelationVO` 提取 `cornerRadius` 的逻辑与 `RelationVO.paint()` 中独立计算圆角形状两套并行
- **影响模块**：前端 Canvas/SVG 渲染
- **潜在后果**：需确认两处计算路径的值是否一致，避免 Java 端渲染与前端渲染结果不一致（如导出 PDF/Image 与界面显示不同）

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

本次改动核心风险集中在：

- **双默认值逻辑**（新建 vs 旧 XML 加载）是本次最高优先级验证点
- **UI → 后端 → 渲染的完整数据链路**需端到端验证
- **图表类型切换时的属性隔离**需回归
- **Script 控制与 UI 控制的一致性**需交叉验证
- **导出场景（PDF/Image）是否与界面一致**需独立确认

### 3.2 必要测试类别

#### 功能验证（Functional）

**Why**：核心功能路径涉及多层数据传递，需验证每层映射正确。

**Scope**：UI 操作 → 值保存 → 图表渲染

**Validation Goal**：用户调整圆角值后，树形图节点形状与设定值视觉一致

需覆盖：
- 输入有效值（0.1、0.3、0.5）后节点形状变化
- 输入 0 后节点恢复直角
- `nodeCornerRadiusVisible` 仅在 Tree Chart 类型下为 true，切换至其他图表类型后控件隐藏
- Script 设置 `nodeCornerRadius` 与 UI 设置效果一致

**Script 验证**：
- Script 中可通过 `chart.nodeCornerRadius = 0.4` 控制节点圆角
- Script 设置值后图表刷新，节点形状与 Script 值对应
- Script 在非 Tree Chart 类型图表中是否不暴露该属性（或设置无效）

**Locale 验证**：
- "Node Corner Radius" 标签在所有支持语言下有对应翻译资源（`srinter.properties` 已添加英文，需验证其他 Locale 文件）

#### 兼容性测试（Compatibility）

**Why**：实现引入了双默认值策略，旧图表行为保持与新图表默认行为存在差异，是最高风险的兼容性场景。

**Scope**：已保存 Tree Chart 的升级兼容

**Validation Goal**：升级前保存的 Tree Chart 重新打开后节点保持直角（不因默认值 0.3 被覆盖）

需覆盖：
- 加载不含 `nodeCornerRadius` 属性的旧版 XML → 节点应为直角（0）
- 加载含 `nodeCornerRadius="0.4"` 的 XML → 节点应为对应圆角值
- 新建 Tree Chart → 节点默认圆角（0.3）
- 切换图表类型（Tree → Bar → Tree）后，`nodeCornerRadius` 值是否正确恢复

#### 回归测试（Regression）

**Why**：CSS 类名变更（`.bar-corner-radius` → `.corner-radius`）及 `fieldset` 条件变更可能影响已有 Bar Chart 圆角功能。

**Scope**：Bar Chart 圆角功能

**Validation Goal**：Bar Chart 的 `barCornerRadius` 输入框样式与交互不受本次变更影响

需覆盖：
- Bar Chart Plot Options 面板中 `Bar Corner Radius` 输入框正常显示且样式无异常
- `.corner-radius` CSS 样式在 Bar Corner Radius 和 Node Corner Radius 两个输入框上均正确应用

#### 边界与异常（Boundary）

**Why**：输入值存在明确区间约束 `[0, 0.5]`，且前后端均有 clamp 逻辑，需验证边界行为一致。

需覆盖：
- 输入 0 → 节点直角，UI 显示为空（null 映射行为）
- 输入 0.5 → 节点接近药丸形
- 输入负值（如 -0.1）→ 触发范围警告，值被拒绝或 clamp 为 0
- 输入大于 0.5（如 0.6）→ 触发 `nodeCornerRadius.rangeWarning`
- 输入非数字字符 → `isFloat` 验证器拦截
- 节点极小（宽/高接近 0px）时圆角计算 `arc = r * shortDim * 2` 的结果是否导致渲染异常

#### 性能测试（Performance）

**Why**：`RelationVO.paint()` 中每次绘制时均重新计算圆角形状（`RoundRectangle2D` 实例创建），在大量节点场景下可能影响渲染性能。

需覆盖：
- 大型树形图（100+ 节点）启用圆角（0.3）时的渲染帧率与关闭圆角时对比

---

## 四、关键测试场景（Key Test Scenarios）

### Scenario 1：新建 Tree Chart 默认圆角验证

- **Scenario Objective**：验证新建树形图默认启用圆角（0.3），符合产品设计决策
- **Scenario Description**：用户新建一个 Tree Chart，不做任何 Plot Options 修改，观察节点形状
- **Key Steps**：
  1. 新建 Viewsheet，拖入数据源，创建 Tree Chart
  2. 不修改任何 Plot Options
  3. 观察图表节点形状
  4. 打开 Plot Options → 确认 Node Corner Radius 输入框当前值
- **Expected Result**：节点显示为圆角矩形；Plot Options 面板中 Node Corner Radius 值为 0.3
- **Risk Covered**：新建默认值 `DEFAULT_NODE_CORNER_RADIUS = 0.3` 是否正确生效

---
`🔴 **测试-分析**：结果匹配

### Scenario 2：旧版已保存 Tree Chart 加载兼容性

- **Scenario Objective**：验证升级后旧图表节点保持直角，不被新默认值覆盖
- **Scenario Description**：加载一个在本次 PR 合入前保存的 Tree Chart（XML 中不含 `nodeCornerRadius` 属性）
- **Key Steps**：
  1. 准备一份旧版 Tree Chart 资源（XML 中无 `nodeCornerRadius` 属性）
  2. 在升级后环境中加载该资源
  3. 观察图表节点形状
  4. 打开 Plot Options → 确认 Node Corner Radius 输入框显示值
- **Expected Result**：节点保持直角；Plot Options 面板中 Node Corner Radius 输入框为空（null / 0）
- **Risk Covered**：`parseXML` 中缺失属性时强制赋 0 的兼容逻辑；双默认值机制

---

`🔴 **测试-分析**：结果匹配

### Scenario 3：UI 调整圆角值 → 保存 → 重新打开验证

- **Scenario Objective**：验证圆角值经完整 UI → 序列化 → 反序列化 → 渲染链路后一致
- **Scenario Description**：用户在 Tree Chart 中手动设置 Node Corner Radius 为 0.4，保存后重新打开
- **Key Steps**：
  1. 打开 Tree Chart，进入 Plot Options
  2. 将 Node Corner Radius 设置为 0.4，点击确认
  3. 观察图表节点圆角变化
  4. 保存 Viewsheet，关闭后重新打开
  5. 再次查看节点形状与 Plot Options 面板值
- **Expected Result**：两次打开节点圆角一致，Plot Options 中值为 0.4；节点视觉形状与值匹配
- **Risk Covered**：XML 序列化 `writeAttributes` / `parseAttributes` 往返正确性；UI Model 到 PlotDescriptor 的映射

---
`🔴 **测试-分析**：结果匹配

### Scenario 4：范围边界输入与错误提示验证

- **Scenario Objective**：验证超出 [0, 0.5] 范围的输入被正确拦截并展示警告
- **Scenario Description**：用户在 Node Corner Radius 输入框中分别输入边界外的值
- **Key Steps**：
  1. 打开 Tree Chart Plot Options
  2. 输入 -0.1 → 观察提示
  3. 清除后输入 0.6 → 观察提示
  4. 输入 "abc" → 观察提示
  5. 输入 0 → 观察节点形状
  6. 输入 0.5 → 观察节点形状
- **Expected Result**：-0.1 和 0.6 时显示 `viewer.viewsheet.chart.nodeCornerRadius.rangeWarning`；"abc" 时浮点验证拦截；0 时节点为直角；0.5 时节点接近药丸形
- **Risk Covered**：前端 Validator 逻辑；后端 clamp 逻辑；警告文案国际化

---
`🔴 **测试-分析**：结果匹配

### Scenario 5：Script 控制节点圆角

- **Scenario Objective**：验证通过 Script 设置 `nodeCornerRadius` 能正确反映到渲染，且与 UI 设置效果一致
- **Scenario Description**：在 Tree Chart 中通过 Script 设置圆角值，与 UI 手动设置结果对比
- **Key Steps**：
  1. 打开 Tree Chart，进入 Script 编辑器
  2. 执行 `chart.nodeCornerRadius = 0.4`
  3. 观察节点形状
  4. 打开 Plot Options，确认 Node Corner Radius 显示值
  5. 将 Script 值改为 0，再次观察
- **Expected Result**：Script 设置 0.4 后节点显示圆角，Plot Options 同步显示 0.4；Script 设置 0 后节点恢复直角
- **Risk Covered**：`ChartProcessor` 中 Script 属性注册正确；Script 与 UI 状态同步

---
`🔴 **测试-分析**：Bug #74988

### Scenario 6：图表类型切换时控件可见性与值隔离

- **Scenario Objective**：验证 `nodeCornerRadius` 控件仅在 Tree Chart 类型下可见，切换类型后正确隐藏且不影响其他图表
- **Scenario Description**：用户在 Tree Chart 中设置圆角后切换为 Bar Chart，再切换回 Tree Chart
- **Key Steps**：
  1. 创建 Tree Chart，设置 Node Corner Radius = 0.4
  2. 切换图表类型为 Bar Chart
  3. 打开 Plot Options → 确认 Node Corner Radius 控件不可见
  4. 切换回 Tree Chart
  5. 打开 Plot Options → 确认 Node Corner Radius 值
- **Expected Result**：Bar Chart 下控件不可见；切换回 Tree Chart 后值仍为 0.4（或合理默认值）；Bar Chart 节点不受 `nodeCornerRadius` 影响
- **Risk Covered**：`nodeCornerRadiusVisible` 条件判断；图表类型切换时 PlotDescriptor 值的保留行为；非 Tree Chart 类型的属性隔离

---
🔴 **测试-分析**：结果正确

### Scenario 7：导出场景圆角一致性

- **Scenario Objective**：验证 Tree Chart 节点圆角在导出 PDF 和图片时与界面显示一致
- **Scenario Description**：设置圆角 0.3 的 Tree Chart，导出为 PDF 和 PNG，对比界面与导出文件中的节点形状
- **Key Steps**：
  1. 创建 Tree Chart，设置 Node Corner Radius = 0.3
  2. 导出为 PDF，打开检查节点形状
  3. 导出为 PNG，检查节点形状
  4. 与界面预览对比
- **Expected Result**：PDF 和 PNG 中节点圆角形状与界面一致，不出现直角退化
- **Risk Covered**：`RelationVO.paint()` Java 端渲染与前端渲染路径的一致性；`GraphBuilder` 中 `cornerRadius` 传递是否覆盖所有导出路径

🔴 **测试-分析**：导出一致