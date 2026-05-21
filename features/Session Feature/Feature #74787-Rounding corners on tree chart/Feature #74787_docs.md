---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Tree Chart
Feature_id: "74787"
Feature: Rounding corners on tree chart nodes
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3615
Assignee: Franky Pan
last_updated: 2026-05-21
version: stylebi-1.2.0
---

# Feature #74787 — Rounding corners on tree chart nodes

---

# 1 Feature Summary

**核心目标**：为 Tree Chart 的节点（Node）增加圆角支持，允许用户通过 `nodeCornerRadius` 参数（范围 0–0.5）控制节点矩形的圆角程度：`0` = 直角，`0.5` = 胶囊形。新建 Tree Chart 默认值为 `0.3`（圆角），旧版已保存图表加载时保持直角（向后兼容）。

**用户价值**：Tree Chart 原有节点为硬角矩形，视觉生硬。圆角功能使节点外观更现代、与参考样例（见 Product Organisation - Tree）保持一致，提升整体图表美观度与可定制性，与已有 Bar Corner Radius 功能交互逻辑对齐。

---

# 2 Test Focus

## P0 - Core Path

- 新建 Tree Chart 节点默认显示圆角（radius = 0.3）
- 旧版 XML（无 `nodeCornerRadius` 属性）加载后节点保持直角（向后兼容）
- UI 设置 `nodeCornerRadius` → 渲染正确更新 → 保存重开后值持久化
- 节点圆角在 PDF / Image 导出及打印预览中与屏幕一致

## P1 - Functional Path

- 值域边界校验：`0`、`0.5`、负数、超 `0.5`、非数字、清空（null）
- Script 设置 `nodeCornerRadius` 后图表更新，auto-complete 仅在 CHART_TREE 类型下可见
- 图表类型切换（Tree ↔ 非 Tree）时控件正确显隐，切换回 Tree 时值保留
- 修改圆角值后 tile `genTime` 更新，前端正确刷新
- 非 Tree 类型（Bar / Network）不显示该控件，渲染不受影响
- Tree Chart + Date Comparison 开启时圆角正常渲染
- 极端节点尺寸（极细 / 极扁）下圆角计算无视觉异常
- area select / highlight 交互在圆角节点上正常工作

## P2 - Extended Path（按需测试）

- 多语言环境（中文/日文/法文）下 "Node Corner Radius" 及错误提示文本显示正确
- Bar Corner Radius 控件 CSS 类名变更（`.bar-corner-radius` → `.corner-radius`）后样式无回归
- Mobile / 小屏幕（≤ 480px）下 Plot Options 面板布局无错位

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 新建 Tree Chart 默认圆角 | 1. 新建 Viewsheet，创建 Tree Chart<br>2. 不修改任何 Plot Options<br>3. 查看节点外观<br>4. 打开 Plot Options，查看 "Node Corner Radius" 输入框 | 节点显示圆角（radius=0.3 效果）；输入框为空，placeholder 显示 0.3 | 🔴 默认值 0.3 ✅ | 分析 Scenario 1；PR 默认值设计 |
| TC-2 | 旧版 XML 向后兼容 | 1. 导入 PR 合并前保存的 Tree Chart（XML 无 `nodeCornerRadius` 属性），或手动删除该属性后导入<br>2. 打开 Viewsheet，查看节点外观<br>3. 打开 Plot Options，查看值 | 节点为直角（无圆角）；输入框为空（值 0） | 🔴 节点为直角 ✅ | 分析 Scenario 2；最高优先级，双默认值设计核心风险 R1 |
| TC-3 | 圆角值配置、保存与持久化 | 1. 打开 Plot Options，设置 Node Corner Radius = 0.2，点击 OK<br>2. 观察节点圆角及 tile 刷新<br>3. 保存 Viewsheet，关闭后重新打开<br>4. 打开 Plot Options，确认值 | 圆角与 0.2 一致，tile genTime 变化；重开后值持久为 0.2，节点保持圆角 | 🔴 加载正确 ✅ | 分析 Scenario 3；覆盖 R5 equalsContent / genTime |
| TC-4 | 导出圆角渲染一致性 | 1. 设置 nodeCornerRadius=0.3，导出为 PDF<br>2. 导出为 PNG/Image<br>3. 打印预览<br>4. 对比屏幕显示 | PDF、Image、打印预览中节点圆角与屏幕一致，切片边界无截断 | 🔴 导出和显示一致 ✅ | 分析 Scenario 7；R2；paint 路径 VSExporter 切片 |
| **P1** | | | | | |
| TC-5 | 值域边界与非法输入校验 | 1. 输入 `0`，OK → 观察<br>2. 输入 `0.5`，OK → 观察<br>3. 输入 `-0.1` → 观察提示<br>4. 输入 `0.6` → 观察提示<br>5. 输入 `abc` → 观察提示<br>6. 清空输入框，OK → 观察 | `0`：直角；`0.5`：胶囊形；负数/超 0.5/非数字：显示 "Node corner radius must be between 0 and 0.5."，无法提交；清空：直角 | 🔴 和期待结果一致 ✅ | 分析 Scenario 4；R6；Bug #74991 text 超出已关联 |
| TC-6 | Script 设置 nodeCornerRadius 及 auto-complete | 1. 打开 Script Editor，输入 `Chart1.`，检查 auto-complete<br>2. 设置 `Chart1.nodeCornerRadius = 0.4;`，执行<br>3. 观察节点圆角及 tile genTime<br>4. 打开 Plot Options，确认值同步<br>5. 切换为 Bar Chart，确认 auto-complete 不含该属性 | Tree Chart 下 auto-complete 含 `nodeCornerRadius`；设置后圆角更新，UI 值同步；非 Tree 类型不暴露 | 🔴 Script 功能正确 ✅ | 分析 Scenario 5；R4/R5；Bug #74988 已关联（barCornerRadius script 未应用于 Tree Chart） |
| TC-7 | 图表类型切换时控件显隐 | 1. Tree Chart 中打开 Plot Options，确认显示 "Node Corner Radius"<br>2. 切换为 Bar Chart，打开 Plot Options，确认控件不可见<br>3. 切换回 Tree Chart，打开 Plot Options，确认控件可见且值保留 | 控件随类型正确显隐；切换回 Tree 时上次设置值保留；渲染无异常 | 🔴 切换控件不显示，结果不应用，切回保持 ✅ | 分析 Scenario 6；R4 状态切换 |
| TC-8 | genTime 更新与 tile 刷新联动 | 1. 记录当前 tile URL 中 `genTime` 值（浏览器 Network 面板）<br>2. 修改 Node Corner Radius 从 0 改为 0.3，OK<br>3. 观察 tile 请求 URL 的 `genTime` | genTime 变化，浏览器发起新 tile 请求，圆角效果更新 | | 分析 Scenario 11；R5 equalsContent / tile 刷新机制 |
| TC-9 | 非 Tree 类型不显示控件且渲染无影响 | 1. 打开 Bar Chart Plot Options，确认无 "Node Corner Radius"<br>2. 打开 Network Chart Plot Options，确认无该控件<br>3. 确认两图表渲染正常，无圆角 | 非 CHART_TREE 类型不含该控件；渲染无变化 | 🔴 非 Tree 不显示控件 ✅ | 分析 Scenario 11/12；R4 Cross-Module 回归 |
| TC-10 | Tree Chart + Date Comparison 圆角渲染 | 1. 开启 Tree Chart 的 Date Comparison（Standard Periods）<br>2. 设置 nodeCornerRadius=0.3<br>3. 查看节点圆角<br>4. 切换 Comparison Option（VALUE/CHANGE/PERCENT）后再查看 | DC 开启后圆角正常显示，与未开启 DC 效果一致；切换 Comparison Option 不影响圆角 | 🔴 DC 开启后圆角正常 ✅ | 分析 Scenario 9；R7；chart-date-comparison.md |
| TC-11 | 极端节点尺寸圆角渲染 | 1. 创建含极长标签节点的 Tree Chart，设置 nodeCornerRadius=0.5<br>2. 创建层级密集（节点极扁）的场景，设置 nodeCornerRadius=0.5<br>3. 调整图表容器至较小尺寸 | 节点为胶囊形，无视觉错误/渲染崩溃；圆角弧度不超过短边的一半 | 🔴 显示正常 ✅ | 分析 Scenario 8；R3 边界渲染 |
| TC-12 | area select / highlight 在圆角节点上的交互 | 1. 设置 nodeCornerRadius=0.3，进入 Viewer<br>2. 点击单个节点，验证 highlight 效果<br>3. 框选多个节点（area select），验证选中效果<br>4. 取消选择，验证恢复正常 | 点击/框选高亮效果正确作用于圆角节点；选中区域与节点视觉边界对齐；取消后恢复 | | 分析 MD 顶部遗漏标注；高交互风险点 |
| **P2** | | | | | |
| TC-13 | 多语言文本显示 | 切换为中文/日文/法文语言环境，打开 Tree Chart Plot Options，输入非法值触发提示 | "Node Corner Radius" 标签及错误提示文本正确显示，无截断或乱码 | 🔴 已添加测试 ✅ | 分析 专项-本地化；i18n 新增字符串 |
| TC-14 | Bar Corner Radius CSS 回归 | 1. 打开 Bar Chart Plot Options，检查 "Bar Corner Radius" 输入框样式<br>2. 对比 Tree Chart "Node Corner Radius" 输入框样式 | 两个输入框样式一致（min-width ≥ 160px），无样式错乱；Bar Corner Radius 功能正常 | 🔴 样式一致 ✅ | 分析 Scenario 10；`.bar-corner-radius` → `.corner-radius` CSS 重命名 |
| TC-15 | Mobile 小屏幕布局 | 在 ≤480px 宽度设备/模拟器下，打开 Tree Chart Plot Options | 面板布局无错位，"Node Corner Radius" 输入框可正常交互 | 🔴 验证无影响 ✅ | 分析 专项-Mobile；新增 UI 控件 |

---

# 4 Special Testing

## 本地化

新增资源字符串：`Node Corner Radius`、`viewer.viewsheet.chart.nodeCornerRadius.rangeWarning`。需在中文、日文、法文等语言环境下验证 Plot Options 标签与错误提示文本正确显示，无截断。→ TC-13

## Script

- CHART_TREE 类型：`Chart1.nodeCornerRadius` 在 Script Editor auto-complete 中可见，赋值后图表实时更新
- 非 CHART_TREE 类型：auto-complete 不暴露该属性
- Script 设置与 UI 面板值双向同步
- 🔴 关联 Bug #74988（barCornerRadius script 未应用于 Tree Chart）：验证同类问题不在 nodeCornerRadius 上复现

→ TC-6

## 文档/API

🔴 doc 暂未添加，待上线后验证：Help 文档 [TreeChart 页](https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/TreeChart.html) 是否新增 Node Corner Radius 说明及 Script 属性文档。

## 配置检查

`nodeCornerRadius` 存储于 `PlotDescriptor` XML 属性（`writeAttributes` / `parseAttributes`），属于 Viewsheet 级别配置，无 `SreeEnv` 全局属性，无需重启服务验证。需验证：
- XML round-trip 精度保留（`1e-9` 精度）
- 旧版 XML 缺省时覆盖为 `0.0` 的向后兼容逻辑

→ TC-2、TC-3

---

# 5 Regression Impact（回归影响）

| 模块 | 影响说明 | 关联 TC |
|------|---------|---------|
| Tree Chart 渲染 | `RelationVO.paint()` 修改 Shape 为 `RoundRectangle2D`，影响屏幕渲染、tile 生成、导出 | TC-1、TC-3、TC-4 |
| Chart Plot Options 面板 | fieldset 显示条件新增 `nodeCornerRadiusVisible`，需验证已有控件（showValues、stackValues 等）不受影响 | TC-9 |
| Bar Chart Corner Radius | CSS 类名从 `.bar-corner-radius` 改为 `.corner-radius`，共用样式 | TC-14 |
| Script 引擎 | `ChartProcessor` 仅 CHART_TREE 注册属性；非 Tree 类型不受影响 | TC-6、TC-9 |
| Export（PDF / Image / 打印） | `VSExporter` 通过 `VGraph.paintGraph()` 切片导出，`RoundRectangle2D` 需在切片边界正确裁剪 | TC-4 |
| Viewsheet 保存/加载（XML） | `PlotDescriptor` XML 序列化新增属性，向后兼容依赖 `parseXML` 覆盖逻辑 | TC-2、TC-3 |
| Date Comparison（Chart DC） | `ChartDcProcessor` 修改 RT 字段后，`initRelationElement()` 仍需正确传递圆角值 | TC-10 |
| Network Chart（Relation 非 Tree） | 共用 `RelationVO`，但 `initRelationElement()` 有 `CHART_TREE` 守卫，需验证不受影响 | TC-9 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #74988 | `<Epic #74519-Feature #74787>` barCornerRadius script haven't applied in tree chart | Closed |
| #74991 | `<Epic #74519-Feature #74787>` The value display is overflowing outside | Closed |

> **TC-notes**：
> - **#74988**：已关闭。验证 `nodeCornerRadius` Script 属性不存在同类问题（TC-6）；同时确认 `barCornerRadius` 在 Tree Chart 上的修复不被本次变更回退。
> - **#74991**：已关闭。与 TC-5 中"清空输入框"及边界值测试对应；验证节点内文本显示不超出节点边界，特别是在设置较小圆角（radius < 0.1）或节点尺寸较小时（TC-11）。