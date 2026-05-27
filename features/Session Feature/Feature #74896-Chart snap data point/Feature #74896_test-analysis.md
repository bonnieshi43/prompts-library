# Feature #74896 测试分析报告
> PR #3665 · Snap-to-nearest-data-point tooltip + bar combined fixes
> 分析日期：2026-05-21

---

## 输入完整性检查

| 项目 | 状态 |
|------|------|
| PR PDF（#3665） | ✅ 可读，diff 完整（23 个文件） |
| Feature 需求描述 | ✅ 充分 |
| 知识库文档（AddTipsToChart.adoc） | ✅ 可访问，内容完整 |

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为 line/area/bar 图表扩展 Tooltip 能力：
  ① 新增「吸附到最近数据点」Snap 功能（鼠标吸附 + 虚线参考线）；
  ② Combined Tooltip 支持扩展到 bar/stacked-bar 图表；
  ③ 修复 Card 样式在 Combined 模式下的渲染层级混乱问题。
- **Snap 支持的图表类型**（共 11 种）：
  - Line（5种）：Line、Line Stack、Step、Jump、Step Stack
  - Area（4种）：Area、Area Stack、Step Area、Step Area Stack
  - Bar（2种）：Bar、Bar Stack（注：3D Bar 已从 UI 移除，仅支持已有图表的向后兼容）
  - **前置条件**：X 轴必须至少包含一个维度字段（dim，如日期、地区、产品类别），不支持以下情况：
    - **Flipped chart**：当用户将度量字段放在 X 轴、维度字段放在 Y 轴时（称为 flipped chart），Snap 功能不可用（但 Combined Tooltip 仍可用）
    - **Multi-style**：每个系列使用不同图表类型的多样式图表
  - **与 Combined Tooltip 的区别**：Combined Tooltip 与坐标轴方向无关（flipped chart 仍支持），而 Snap Tooltip 必须有维度字段在 X 轴
- **用户价值**：
  ① 鼠标悬停时精准锁定最近 X 轴刻度，方便对比多系列数据；
  ② bar 图用户可启用 Combined Tooltip，之前因 Bug 静默失效；
  ③ Card 样式合并提示框从混乱的3层字体层级改为可读的「头部 + 系列列表 + 汇总」结构。
- **Feature 类型**：UI / Rendering / Functional（Bug Fix + 新功能混合）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

| 变更类型 | 变更描述 |
|----------|----------|
| 新增功能 | 为 line/area/bar 图表新增「吸附到最近数据点」功能，鼠标悬停时自动吸附到最近 X 轴刻度并显示虚线参考线 |
| 功能扩展 | Combined Tooltip 功能扩展到 bar/stacked-bar 图表（之前因 Bug 静默失效） |
| 界面优化 | Card 样式的合并提示框从混乱的多层字体层级改为清晰的「头部 + 系列列表 + 汇总」结构 |
| 文本更新 | Combined Tooltip 标签文字从 "lines" 改为 "series"，更准确反映支持范围 |
| 交互改进 | Snap 与 Combined 功能独立，用户可自由组合使用；Snap 激活时自动抑制原有参考线绘制 |
| 向后兼容 | 旧版图表加载时 Snap 默认关闭，保持原有行为不变 |
| 状态管理 | 切换到不支持的图表类型时，Snap 状态自动关闭，确保数据一致性 |

### 目标覆盖度

| Feature 需求点 | PR 实现状态 |
|---------------|------------|
| line/area chart Snap to nearest data point | ✅ 完整实现 |
| bar chart Snap to nearest data point | ✅ `supportsSnapTooltip` 包含 bar |
| Snap 与 Combined 独立（可组合） | ✅ 前端明确保持独立 |
| Combined Tooltip 支持 bar/stacked-bar | ✅ Bug fix + UI 放开 |
| Card 样式 Combined 改为 header+list+total 结构 | ✅ `renderCombinedCard()` 新实现 |
| 勾选 Combined 时自动勾选 Snap | ✅ |
| 旧图表无 snap 属性时默认 false | ✅ XML parse 中有注释确认 |
| 不支持图表切换后 flag 自动 clamp | ✅ Controller 保存时 clamp |
| UI 文案更新 | ✅ "lines" → "series" |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|----------------|----------------|------|
| Combined Tooltip 对 bar 图静默无效（BarVO 类型转换失败导致空桶） | bar/stacked-bar 图 Combined Tooltip 正常聚合多系列 | Functional |
| Card + Combined 模式将所有系列塞入3层字体层级（视觉混乱） | header（X dim）+ series 列表 + 汇总行 | Rendering |
| Card + Combined 时 measures 先于 dims 排列 | Combined 时 dims 先（供头部用），solo 时 measures 先（不变） | Rendering / Compatibility |
| Customize Tooltip 对话框中 Combined 勾选框标签为 "Combine tooltips from different lines" | 标签改为 "Combine tooltips from different series" | 本地化 |
| Customize Tooltip 对话框中无 Snap 勾选框 | line/area/bar + dim on X 时出现 "Snap to nearest data point" 勾选框 | UI / Functional |
| `lineChart` 字段标识 dialog model | `combinedSupported` 字段 | Compatibility（API 改名） |
| 参考线与 Snap 同时存在 | Snap 激活时抑制 per-region 参考线，独占 `referenceLineCanvas` | Cross-Module |

---

## 第三部分：Risk Identification（风险识别）

| # | 风险描述 | 类型 |
|---|---------|------|
| R1 | Card 样式 + Combined 模式下数据列顺序变化，可能影响已有图表的 tooltip 显示顺序 | Rendering / Compatibility |
| R2 | Snap 激活时会抑制原有参考线显示，用户已配置参考线的图表启用 Snap 后参考线会消失 | Cross-Module / Functional |
| R3 | Combined Tooltip 在柱状图上首次启用，聚合逻辑可能存在边界问题，特别是堆叠柱状图的汇总行计算 | Functional / Data Consistency |
| R4 | Snap 吸附定位缓存可能在数据刷新时过期，导致吸附位置不准确 | Functional / Rendering |
| R5 | Snap 虚线与原有参考线、触摸点共用绘制层，可能产生视觉闪烁 | Rendering |
| R6 | 翻转图表（X 轴为度量字段）不支持 Snap，已保存的 Snap 设置需要正确处理 | Compatibility / Functional |
| R7 | 多样式图表不支持 Snap/Combined，切换图表类型时状态需要正确清理 | Compatibility / UI |
| R8 | UI 文案变更需要在所有支持语言中验证是否正确翻译 | 本地化 |
| R9 | API 字段重命名可能影响其他模块或脚本的兼容性 | Compatibility / Cross-Module |

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点
1. Snap 勾选框的显示/隐藏条件（line/area/bar + dim on X 才显示，bar 新加入）
2. Snap 行为：吸附逻辑、虚线参考线绘制、mouseleave 清除
3. Combined Tooltip 在 bar/stacked-bar 上的数据聚合正确性
4. Card 样式在 Combined 模式下的新渲染结构（header + list + total）
5. 旧图表（无 snap 属性）加载后行为不变

### 高风险路径
- Card + Combined + bar：全新路径，三项变更交汇
- Snap + 已有 Reference Line：两者使用同一 canvas，互斥逻辑
- 在不支持图表类型上保存后切换回支持类型：clamp 后重新勾选
- Combined + Custom Tooltip Format：snap 可用，combined 禁用

### 涉及模块（回归验证）
- Chart Properties Dialog → Customize Tooltip 对话框
- Gauge / Image / Text 组件的 Customize Tooltip 对话框（`combinedSupported` 重命名）
- chart-plot-area 组件（鼠标交互、参考线绘制）
- PlotArea.java 多系列 tooltip 聚合逻辑

### 专项检查

**本地化**：
- "Combine tooltips from different series" 文本需要在所有已支持语言版本中验证是否正确翻译（原为 "lines"）。
- "Snap to nearest data point" 为新增字符串，需验证多语言版本是否有对应翻译或保持英文降级。

🔴 **测试-分析**：已本地化

**脚本兼容性**：
- `combinedTooltip` 属性已在脚本 API 中暴露（`Chart1.combinedTooltip`），需验证在 bar 图上设置是否生效（PR 扩展了支持范围）。
- `snapTooltip` 属性尚未在脚本 API 中暴露（功能缺口），需评估是否需要补充实现。

🔴 **测试-分析**：Bug #75089

**文档一致性**：
- 知识库文档 `AddTipsToChart.adoc` 第 140 行当前仍描述 "For a Line or Area type chart, select 'Combine tooltips from different lines'"，需同步更新为：
  - 覆盖图表类型增加 bar/stacked-bar
  - 标签文字改为 "Combine tooltips from different series"
  - 新增 "Snap to nearest data point" 勾选框的使用说明
- Customize Tooltip Dialog 需验证 Help 文档（`cshid = "CustomTooltip"`）链接内容是否同步。

🔴 **测试-分析**：merge后再报

**Mobile 影响检查**：
- touch 事件下吸附是否触发，导线是否显示，tooltip 是否响应

🔴 **测试-分析**：能正常显示，tooltip也能相应

**打印/导出检查**：验证 PDF/Excel 导出正常（无报错）；打印预览中 tooltip 不被错误渲染。

🔴 **测试-分析**：符合预期

---

## 第五部分：Key Test Scenarios（核心测试场景）

---

### Scenario 1：Snap 勾选框的条件显示与隐藏

**Scenario Objective**：验证「Snap to nearest data point」勾选框仅在支持的图表类型和轴配置下出现。

**Scenario Description**：确保用户仅在合适的图表类型上看到 Snap 选项，避免在不支持的图表上误操作导致功能异常。

**Key Steps**：
1. 分别创建以下图表，X 轴拖入维度字段，打开 Chart Properties → Tooltip → Customize 按钮：
   - Line 系列：折线图（Line）、阶梯线图（Step）、跳跃线图（Jump）、堆叠折线图（Line Stack）
   - Area 系列：面积图（Area）、阶梯面积图（Step Area）、堆叠面积图（Area Stack）
   - Bar 系列：柱状图（Bar）、堆叠柱状图（Stacked Bar）
2. 验证以上图表 Customize Tooltip 对话框中是否显示「Snap to nearest data point」勾选框。
3. 切换为饼图（Pie）/ 散点图（Point）/ 雷达图（Radar）/ 地图（Map），重新打开对话框。
4. 在折线图中点击「Swap XY」按钮交换坐标轴，重新打开对话框。
5. 将折线图改为 Multi-style 模式（每系列独立图表类型），重新打开对话框。
6. 对 Gauge、Image、Text 组件分别打开 Properties → Customize Tooltip 对话框。

**Expected Result**：
- Line/Area/Bar 所有变体 + X 轴含维度：显示 Snap 勾选框。
- Pie/Point/Radar/Map：不显示 Snap 勾选框。
- X 轴为度量（flipped）：不显示 Snap 勾选框。
- Multi-style：不显示 Snap 勾选框。
- Gauge/Image/Text：不显示「Combine tooltips」勾选框，Tooltip Format 切换正常。

**Risk Covered**：R6、R7、R9

🔴 **测试-分析**：符合预期

---

### Scenario 2：Snap 功能核心交互行为

**Scenario Objective**：验证启用 Snap 后鼠标悬停时光标锁定最近 X 刻度并显示虚线参考线，离开时清除。

**Scenario Description**：验证 Snap 核心交互功能正常工作，确保鼠标悬停时 tooltip 正确吸附到最近数据点，参考线正常显示和清除。

**Pre-condition**：折线图，X 轴含维度字段（至少 3 个数据点），已启用 Snap 勾选框并保存。

**Key Steps**：
1. 在 Dashboard 预览模式下打开包含上述折线图的仪表板。
2. 慢速移动鼠标，从图表最左侧向最右侧扫过 plot 区域。
3. 在两个数据点中间位置暂停鼠标。
4. 将鼠标移出图表区域。
5. 重新进入图表区域后快速移动鼠标。

**Expected Result**：
- 步骤 2：Tooltip 跳跃式锁定到最近的 X 刻度（而非随鼠标平滑移动），每个刻度显示该刻度对应的所有系列数据。
- 步骤 3：鼠标停在两点中间，tooltip 锁定到距离更近的一个 X 刻度，图表 plot 区域出现一条灰色虚线垂直参考线穿过该刻度。
- 步骤 4：鼠标离开后虚线参考线立即消失。
- 步骤 5：快速移动时 snap 仍正常工作，不出现参考线残留。

**Risk Covered**：R4、R5

🔴 **测试-分析**：符合预期

---

### Scenario 3：勾选 Combined 时自动勾选 Snap，并独立控制

**Scenario Objective**：验证 Combined 勾选时 Snap 自动勾选的 UX 联动，以及两者可独立操作。

**Scenario Description**：验证 Snap 和 Combined 的联动交互逻辑，确保用户操作体验符合预期，状态切换正确。

**Pre-condition**：折线图，X 轴含维度，Y 轴含至少 2 个度量系列。

**Key Steps**：
1. 打开 Customize Tooltip，此时 Snap 和 Combined 均为未勾选状态
2. 勾选「Combine tooltips from different series」勾选框
3. 观察「Snap to nearest data point」勾选框状态
4. 手动取消勾选「Snap to nearest data point」，保持 Combined 勾选，点击 OK 保存
5. 重新打开 Customize Tooltip，观察两个勾选框的状态
6. 取消勾选 Combined，观察 Snap 状态是否改变

**Expected Result**：
- 步骤 3：Snap 勾选框自动变为勾选状态
- 步骤 5：Combined = 勾选，Snap = 未勾选（保持手动设置值）
- 步骤 6：取消 Combined 后，Snap 状态保持不变

**Risk Covered**：R3、Functional

🔴 **测试-分析**：符合预期

---

### Scenario 4：Snap 与 Reference Line 互斥行为

**Scenario Objective**：验证启用 Snap 后，图表原有的 per-region 参考线被正确抑制，不会在同一 canvas 上产生视觉冲突。

**Scenario Description**：确保 Snap 虚线参考线与图表原有参考线功能互斥，避免同时显示导致视觉混乱。

**Pre-condition**：折线图，已在图表描述符中启用「Reference Line」（Show Reference Line），同时启用 Snap。

**Key Steps**：
1. 打开图表的 Chart Properties，确认 Reference Line 已勾选。
2. 打开 Customize Tooltip，勾选「Snap to nearest data point」，保存。
3. 在预览模式下悬停鼠标在折线上，观察参考线区域。
4. 关闭 Snap，再次悬停，观察参考线。

**Expected Result**：
- 步骤 3：只显示 Snap 的垂直虚线，不出现 per-region 高亮参考线（两者不叠加显示）。
- 步骤 4：关闭 Snap 后，per-region 参考线正常显示，虚线不出现。

**Risk Covered**：R2、R5

🔴 **测试-分析**：符合预期

---

### Scenario 5：Snap 与不同 Tooltip Format 的组合行为验证

**Scenario Objective**：验证 Snap 功能在三种 Tooltip Format（Default、Custom、Combined）下均正常工作，且 Custom 模式下 Combined 选项正确禁用。

**Scenario Description**：Snap 与 Tooltip Format 设计上相互独立，Custom 模式下 Combined 应不可用。需确认三种 Format 切换时导线行为一致，且 Custom + Combined 的互斥状态正确呈现，避免用户在 Custom 模式下误以为 Combined 生效。

**Pre-condition**：折线图，X 轴含维度，多系列，Snap 已勾选。

**Key Steps**：
1. Tooltip Format = Default，Snap 开启，保存预览 → 悬停图表观察导线和 tooltip 内容
2. Tooltip Format 切换为 Custom（填写自定义模板），Snap 保持开启 → 观察对话框中「Combine tooltips」勾选框状态 → 保存预览，悬停观察
3. Tooltip Format 从 Custom 切换回 Default，勾选「Combine tooltips from different series」，Snap 保持开启，保存预览 → 悬停观察

**Expected Result**：
- 步骤 1：虚线导线正常出现并吸附最近 X tick，tooltip 显示标准格式内容
- 步骤 2：对话框中 Combined 勾选框为不可勾选状态；预览中导线正常出现，tooltip 按自定义模板渲染
- 步骤 3：导线正常出现，tooltip 显示多系列聚合内容（Combined Card 结构）

**Risk Covered**：Functional（Format 独立性）、Custom + Combined 互斥

🔴 **测试-分析**：符合预期

---

### Scenario 6：Combined Tooltip 在 Bar 图上首次启用

**Scenario Objective**：验证 Combined Tooltip（Default 样式）在分组柱状图（Bar）和堆叠柱状图（Stacked Bar）上能正确聚合同一 X 刻度的多系列数据。

**Scenario Description**：验证柱状图启用 Combined Tooltip 后能正确显示同一 X 刻度的所有系列数据，避免出现空白 tooltip。

**Pre-condition**：柱状图（Bar），X 轴含维度，Y 轴含 2 条以上度量/系列。

**Key Steps**：
1. 创建柱状图（Bar），打开 Chart Properties → Customize Tooltip，勾选「Combine tooltips from different series」，取消 Snap（若已自动勾选），保存。
2. 在预览模式下悬停到图表中某一分组（X 刻度）的某一 bar 上，观察 Tooltip 内容。
3. 悬停到同一 X 刻度的另一个 bar 上，比较 Tooltip 内容。
4. 将图表类型切换为堆叠柱状图（Stacked Bar），重复步骤 1-3。

**Expected Result**：
- 步骤 2-3：**启用 Combine 后**，悬停任何一个 bar，Tooltip 都会显示该 X 刻度下**所有系列**的数据（如：X=Q1 时，同时显示 Series A 和 Series B 的值）。
- 步骤 2-3：**未启用 Combine 时**，悬停第一个 bar 只显示 Series A，悬停第二个 bar 只显示 Series B（仅当前 bar 的数据）。
- 步骤 4（Stacked Bar）：同一 X 刻度的不同 bar 悬停时，Tooltip 内容相同（均显示该刻度全部系列），底部显示 Stack Total。
- 全程不出现空白 Tooltip 或报错。

**Risk Covered**：R3、Functional

🔴 **测试-分析**：符合预期

---

### Scenario 7：Card 样式 + Combined Tooltip 新渲染结构验证

**Scenario Objective**：验证 Card 样式在 Combined 模式下使用新的「header + 系列列表 + 汇总」结构，而非旧的3层字体层级混排。

**Scenario Description**：确保 Card 样式在 Combined 模式下使用清晰的「头部 + 系列列表 + 汇总」结构，提升用户可读性，同时保持单系列模式的原有体验。

**Pre-condition**：折线图（single 配置，多系列在同一 plot 区域），Tooltip Style 设为「Card」，Combined Tooltip 已勾选。

**Key Steps**：
1. 在预览模式下悬停折线图某 X 刻度。
2. 观察 Card 样式 Tooltip 的结构布局。
3. 关闭 Combined Tooltip（仅 Card 样式，单系列模式），重新悬停。
4. 对 Default Tooltip Style + Combined 组合重复步骤 1-2。

**Expected Result**：
- 步骤 2（Card + Combined）：Tooltip 顶部显示悬停的 Measure 值（最大字体），第二行显示共享的 X 维度值（副标题样式，较小字体），下方列出各系列名称和值，若为堆叠图则底部有汇总行（最大字体，强调显示）。
- 步骤 3（Card + 非Combined）：Tooltip 保持原有表现，度量值在第一层（最大字体），维度在第二层，与此次改动前一致。
- 步骤 4（Default + Combined）：按 Default 样式显示合并 tooltip，不受 renderCombinedCard 影响。

**Risk Covered**：R1、Rendering

🔴 **测试-分析**：符合预期

---

### Scenario 8：Combined Tooltip + Card 样式 + Snap 三者同时启用

**Scenario Objective**：验证三项功能同时启用时，tooltip 内容（Combined Card 结构）和 snap 吸附行为共同正常工作。

**Scenario Description**：三者交汇是最复杂的使用路径，Card 渲染结构和 snap 定位来自不同代码路径，可能产生意外交互。

**Pre-condition**：折线图，多系列，X 轴维度，Tooltip Style = Card，Combined + Snap 均勾选。

**Key Steps**：
1. 预览 Dashboard，慢速移动鼠标穿过图表。
2. 在任意 X 刻度暂停，观察 tooltip 和参考线。
3. 验证 tooltip 内容结构。

**Expected Result**：
- 每个 X 刻度处出现灰色虚线参考线。
- Tooltip 以 Card 样式显示，结构为：顶部悬停的 Measure 值（最大字体），第二行 X 维度值（副标题样式），下方各系列数据（列表），底部合计（若有堆叠，最大字体）。
- 无 JS 报错，无 tooltip 内容为空或结构混乱。

**Risk Covered**：R1、R2、R3、Rendering

🔴 **测试-分析**：Bug #75096

---

### Scenario 9：切换图表类型时 Snap 状态的自动禁用行为

**Scenario Objective**：验证已启用 Snap 的图表切换到不支持的图表类型后，Snap 状态被正确禁用。

**Scenario Description**：验证切换图表类型时 Snap 状态正确处理，确保不支持的图表类型自动关闭 Snap，保持数据一致性。

**Pre-condition**：折线图，已启用 Snap 和 Combined Tooltip，保存至 Dashboard。

**Key Steps**：
1. 进入 Chart Editor，将图表类型从折线图切换为柱状图（Bar）。
2. 打开 Chart Properties → Customize Tooltip，观察 Combined Tooltip 和 Snap 状态。
3. 将图表切换为散点图（Point），打开 Customize Tooltip 对话框，观察状态。
4. 再切换回折线图，观察两个勾选框状态。

**Expected Result**：
- 步骤 2（Bar）：Combined Tooltip 和 Snap 均保持勾选状态。
- 步骤 3（Point）：Snap 勾选框不再显示（scatter 不支持）；
- 步骤 4（回到 Line）：Snap 勾选框显示，但状态为未勾选（已被自动禁用，未自动恢复）；Combined Tooltip 保持勾选状态。

**Risk Covered**：R6、R7、Compatibility

🔴 **测试-分析**：Bug #75091, 75094

---

### Scenario 10：向后兼容 - 旧图表加载后无 Snap 行为变化

**Scenario Objective**：验证不含 `snapTooltip` 属性的旧版图表保存文件，加载后 snap 默认为关闭且交互行为与改动前一致。

**Scenario Description**：确保旧版本图表加载后行为不变，Snap 默认关闭，保持向后兼容性。

**Pre-condition**：导入一个改动前保存的折线图 Dashboard（或手动确认当前 Dashboard 中折线图未曾设置过 snap）。

**Key Steps**：
1. 打开包含折线图的旧版 Dashboard（XML 中无 snapTooltip 属性）。
2. 打开图表 Customize Tooltip 对话框，查看 Snap 勾选框初始状态。
3. 关闭对话框，在预览模式下悬停图表。
4. 观察鼠标悬停行为和参考线。

**Expected Result**：
- 步骤 2：Snap 勾选框未勾选（false）。
- 步骤 3-4：鼠标悬停时 tooltip 随鼠标自由移动（无吸附），不出现虚线参考线，与改动前行为完全一致。

**Risk Covered**：Compatibility（向后兼容）

🔴 **测试-分析**：符合预期
