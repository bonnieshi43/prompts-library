---
doc_type: feature-test-doc
product: Style BI
module: Chart / Plot Options
feature_id: #74783 & #74786
feature: Smooth Lines for Area/Line Charts & Circular Network Charts
type: feature-test-spec
owner: Chart Team
assignee: TBD
pr_link: TBD
last_updated: 2026-05-14
version: 1.1.0
---

## 1 Feature Summary

### What / Why

- **Goal**：为图表添加平滑曲线渲染功能，提升数据可视化的视觉美感，使数据趋势展示更加流畅自然
- **User entry**：Chart Plot Options 面板 → "Smooth Lines" 开关
- **Key behavior**：
  - Area/Line 图表：启用后使用 Catmull-Rom Bezier 曲线连接数据点
  - Circular Network 图表：启用后使用二次 Bezier 曲线使 chord lines 向圆心弯曲

### Scope & Non-scope

- **In scope**：
  - Area/Stacked Area 图表
  - Line/Stacked Line 图表
  - Circular Network 图表
  - Multi-style 图表（Line + Area）
  - SVG/PNG/Excel/HTML/PDF 导出
  - Script API 读写支持

- **Out of scope**：
  - Step Area/Jump Line 图表（开关隐藏）
  - Network/Tree 图表（开关隐藏）
  - Multi-segment edges（保持直线）
  - ORGANIC/Tree 布局算法（不受影响）

---

## 2 Functional Rules（规则化描述，避免只写步骤）

- **Default behavior**：
  - Area/Stacked Area："Smooth Lines" 默认勾选（ON）
  - Line/Stacked Line："Smooth Lines" 默认未勾选（OFF）
  - Circular Network："Smooth Lines" 默认勾选（ON），chord 向圆心弯曲
  - 已有图表（无 smoothLines 属性）：默认 OFF，保持原外观

- **Toggle / config behavior**：
  - 启用 smoothLines：Area/Line 使用 Catmull-Rom 曲线；Circular 使用二次 Bezier 曲线
  - 禁用 smoothLines：所有图表恢复直线段连接

- **Multi-object interaction**（多轴/多绑定/多图/多视图等）：
  - Multi-style 图表：smoothLines 全局控制，所有支持的 style 同步变化
  - Line + Area：两者同步应用平滑曲线
  - Area + Bar：Area 应用平滑曲线，Bar 不受影响

- **Priority rules**（UI vs Script / 配置覆盖顺序）：
  - Script 设置优先于 UI 设置
  - 图表类型转换时：Area → Line 重置为 OFF；Line → Area 保持当前状态

- **Error handling / guardrails**（禁用、灰显、不崩溃、不乱码等）：
  - Step/Jump/Network/Tree 图表："Smooth Lines" 开关隐藏
  - 多段 edges：保持直线，不受 smoothEdges 影响

---

## 3 Compatibility / Support Matrix（适用性矩阵）

| Object / Type | Subtype / Example | Entry exists? | Supported? | Expected behavior / Notes |
|---|---|---:|---:|---|
| Area Chart | Area | ✅ | ✅ | 默认 ON，Catmull-Rom 曲线 |
| Area Chart | Stacked Area | ✅ | ✅ | 默认 ON，Catmull-Rom 曲线 |
| Line Chart | Line | ✅ | ✅ | 默认 OFF，Catmull-Rom 曲线 |
| Line Chart | Stacked Line | ✅ | ✅ | 默认 OFF，Catmull-Rom 曲线 |
| Line Chart | Step Area | ❌ | ❌ | 开关隐藏 |
| Line Chart | Jump Line | ❌ | ❌ | 开关隐藏 |
| Relation Chart | Circular Network | ✅ | ✅ | 默认 ON，二次 Bezier 曲线 |
| Relation Chart | Network | ❌ | ❌ | 开关隐藏 |
| Relation Chart | Tree | ❌ | ❌ | 开关隐藏 |
| Multi-style | Line + Area | ✅ | ✅ | 全局控制，同步变化 |
| Multi-style | Area + Bar | ✅ | ⚠️ | Area 受影响，Bar 不受影响 |
| Multi-style | Bar + Bar | ❌ | ❌ | 开关隐藏 |

---

## 4 Test Focus（只列必须测的路径）

### P0 - Core Path（必测主路径）

- **Core scenario(s)**：
  - 新建 Area/Line/Circular 图表验证默认状态
  - 启用/禁用 smoothLines 验证渲染效果
  - Multi-style 图表全局控制验证

- **Persist & reload**（保存/刷新/导入导出 round-trip）：
  - 保存启用 smoothLines 的图表，刷新后状态保持
  - SVG/PNG/Excel/HTML/PDF 导出曲线保持
  - Print Layout 模式曲线渲染正确

- **UI state echo**（对话框回显/禁用/灰显规则）：
  - 开关可见性正确（支持的图表类型显示，不支持的隐藏）
  - 默认值正确回显

### P1 - Functional / Boundary（高风险功能与边界）

- **Multi-binding / multi-axis / mixed modes**：
  - Multi-style 图表（Line + Area、Area + Bar）
  - Stacked Area 边界像素一致性

- **Not supported / negative paths**：
  - Step/Jump/Network/Tree 图表开关隐藏
  - Circular 多段 edges 保持直线

- **Locale**（若有 UI 文案）：
  - "Smooth Lines" 标签多语言正确显示

### P2 - Extended（按需抽样）

- **Export / Print / Embedded**：
  - PNG/Excel/HTML/PDF 导出曲线保持
  - Print Layout 模式曲线渲染

- **Performance**（如大数据量/多对象）：
  - 大量数据点时曲线计算性能

- **Backward compatibility**（旧文件/旧脚本/旧配置）：
  - 导入旧版本图表配置保持原外观

---

## 5 Test Scenarios（可执行用例表）

| ID | Priority | Scenario | Steps | Expected | Result | Notes (risk/bug/link) |
|---|---|---|---|---|---|---|
| TC74783-1 | P0 | 新建图表默认状态验证 | 1. 创建 Area、Line、Circular 图表<br>2. 查看 Plot Options 面板 | Area/Circular 默认勾选，Line 默认未勾选 | | |
| TC74783-2 | P0 | smoothLines 启用/禁用渲染 | 1. 创建 Area 图表<br>2. 启用 smoothLines<br>3. 禁用 smoothLines | 启用时曲线平滑，禁用时恢复直线 | | |
| TC74783-3 | P0 | Area ↔ Line 类型转换 | 1. 创建 Area 启用 smoothLines<br>2. 转换为 Line<br>3. 转换回 Area | Area→Line 重置为 OFF，Line→Area 保持状态 | | Bug: 首次转换可能不同步 |
| TC74783-4 | P0 | Circular ↔ Network/Tree 转换 | 1. 创建 Circular 启用 smoothLines<br>2. 转换为 Network | 转换后开关隐藏 | | Bug #74961 |
| TC74783-5 | P0 | Multi-style 全局控制 | 1. 创建 Line + Area 图表<br>2. 启用 smoothLines | Line 和 Area 同步变为曲线 | | |
| TC74783-6 | P0 | SVG 导出曲线保持 | 1. 创建启用 smoothLines 的 Area 图表<br>2. 导出 SVG | SVG 包含 data-smooth="true"，使用曲线命令 | | |
| TC74783-7 | P1 | 多格式导出曲线保持 | 1. 创建启用 smoothLines 的 Area 图表<br>2. 导出 PNG/Excel/HTML/PDF | 所有格式曲线渲染正确 | | |
| TC74783-8 | P1 | Step/Jump 图表开关隐藏 | 1. 创建 Step Area/Jump Line 图表<br>2. 查看 Plot Options | "Smooth Lines" 开关不可见 | | |
| TC74783-9 | P1 | Network/Tree 图表开关隐藏 | 1. 创建 Network/Tree 图表<br>2. 查看 Plot Options | "Smooth Lines" 开关不可见 | | |
| TC74783-10 | P1 | Circular 多段边缘保持直线 | 1. 创建包含多段路径的 Circular 图表<br>2. 启用 smoothLines | 多段路径保持直线，仅两点连线弯曲 | | |
| TC74783-11 | P1 | 历史配置升级兼容 | 1. 导入旧版本图表配置<br>2. 查看渲染效果 | 保持原外观（smoothLines 默认 false） | | |
| TC74783-12 | P2 | Script 控制 smoothLines | 1. 创建 Line 图表<br>2. Script 设置 chart.plot.smoothLines = true<br>3. 读取属性 | 图表渲染为曲线，读取返回 true | | Bug #74953 |
| TC74783-13 | P2 | 算法差异验证 | 1. 创建 Area 和 Circular 图表启用 smoothLines<br>2. 对比渲染效果 | Area 使用 Catmull-Rom，Circular 使用二次 Bezier | | |
| TC74783-14 | P2 | 多语言资源验证 | 1. 切换系统语言<br>2. 查看 Plot Options | "Smooth Lines" 显示对应语言翻译 | | |
| TC74783-15 | P2 | 文档一致性验证 | 1. 创建各类型图表<br>2. 验证行为与文档描述一致 | 所有行为与文档描述一致 | | Documentation #74959 |

---

## 6 Special Testing（仅当涉及时填写）

### Security

- 无特殊安全风险

### Performance

- **大数据量测试**：大量数据点（1000+）时曲线计算性能
- **大量 chord 线条**：Circular Network 大量 edges 时的渲染性能

### Compatibility

- **Old config**：导入无 smoothLines 属性的旧版本图表配置，验证保持原外观
- **Round-trip**：创建→保存→导出→导入，验证状态保持一致

### Script / Programmatic Support

- **API(s)**：`chart.plot.smoothLines`（读写）
- **UI vs Script priority**：Script 设置优先于 UI 设置
- **Gotchas**：需要先获取 plot 对象才能访问属性

### Localization

- **Strings / keys**："Smooth Lines" 标签需要多语言翻译
- **Fallback behavior**（无翻译时）：显示英文 key

### Docs / API

- **Doc updates needed**：
  - Plot Options (Line Chart) 部分添加 Smooth Lines 说明
  - Plot Options (Network/Tree Chart) 部分添加 Smooth Lines 说明（仅 Circular）

---

## 7 Regression Impact（回归影响）

- **Impacted areas**：
  - 渲染引擎（LineVO/AreaVO/RelationElement）
  - 对话框模型（ChartPlotOptionsPaneModel）
  - 序列化（PlotDescriptor）
  - 导出（SVG/PNG/Excel/HTML/PDF）
  - 图表类型转换（ChangeChartTypeController）

- **Smoke list**：
  - Area 图表默认启用 smoothLines
  - Line 图表默认禁用 smoothLines
  - Circular 图表默认启用 smoothLines
  - Step/Jump/Network/Tree 图表无 smoothLines 开关
  - 历史图表保持原外观

---

## 8 Bug List

| Bug ID | Description | Status | Link / Notes |
|---|---|---|---|
| #74953 | Script 未实现 smoothLines 属性读写 | 待修复 | ChartProcessor 未注册属性 |
| #74961 | Circular→Network 转换时 UI 状态与渲染不同步 | 待修复 | UI 显示正确但渲染未更新 |
| #74959 #74958 | 帮助文档需要更新 Smooth Lines 说明 | 待处理 | 文档地址：ChartProperties.html |