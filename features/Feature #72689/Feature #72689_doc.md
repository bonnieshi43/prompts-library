---
doc_type: feature-test-doc
product: StyleBI
module: vs-tab
Feature_id: 72689
Feature: Option to put tab for tabbed components on bottom of component
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2385
Assignee: Franky Pan
last_updated: 2026-04-24
version: stylebi-1.1.0 
---

# 1 Feature Summary

**核心目标**：
为 Tab 组件新增 `bottomTabs` 配置，使 tab 页签可从默认顶部切换到底部，并在属性面板、脚本、持久化、布局重排、导出链路中保持一致。

**用户价值**：
解决 tabbed component 只能将页签放在顶部的问题，支持更灵活的 dashboard / embedded 布局设计，减少通过样式或绕行布局实现底部 tab 的成本。

---

# 2 Test Focus

## P0 - Core Path

- `bottomTabs` 开关生效，tab 正确显示在底部
- bottom/top 来回切换后 child 位置正确，无残留偏移
- 保存、重开、旧对象兼容时配置保持一致，默认值仍为 `false`
- script 动态控制 `bottomTabs` 时 design/runtime/export 行为一致


## P1 - Functional Path

- tab height、tab position、drag/drop、resize 联动
- selection list / calendar / slider / form / embedded viewsheet / table 等复杂组件组合
- dropdown、drilldown、search、shrink to fit 等状态组合
- print layout、HTML/PNG、device layout 中 UI 状态和几何位置一致
- round bottom corners only 与 format / painter 的组合回归

## P2 - Extended Path （按需测试）

- Performance：复杂 tab 容器在多 child / resize 下的重排稳定性
- Compatibility：旧版本对象、无 `bottomTabs` 属性对象打开行为
- script / 文档 / 配置检查：脚本可控、文档已更新、序列化正确

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Bottom Tabs 基础行为 | 新建 tabbed component，开启 `bottomTabs`，添加多个 child，切换选项卡 | tab 显示在底部；child 与 tab 贴合；组件不越界 | 需测试 | 来源：PDF + 分析MD；关联 Bug #74130、#74299 |
| TC-2 | Bottom/Top 模式切换可逆 | `bottomTabs=true` 后拖回 top，再切回 bottom，配合 tab position 调整 | 切换后无残留偏移、无重复位移，tab/assembly 不越界 | 需测试 | 来源：分析MD；关联 Bug #74301 |
| TC-3 | 保存/重开与兼容性 | 保存 report 后重开；再打开旧版本对象和无 `bottomTabs` 属性对象 | 配置持久化正确；旧对象默认 `false`；top-tabs 默认行为不变 | 需测试 | 来源：分析MD + feature list；覆盖“未覆盖/兼容性”风险 |
| TC-4 | Script 动态控制 | 用 script 动态设置 `bottomTabs`，再添加/切换 assembly，并分别在 runtime/print/device 验证 | UI、runtime、导出保持一致；tab 不应仍显示在顶部，也不应消失 | 已知风险 | 来源：PDF + 分析MD；关联 Bug #73295、#74447、#74593、#74598 |
| **P1** |
| TC-5 | 高度/缩放/重排联动 | 修改 tab height，拖拽或 resize child，观察 tab bar 与 child 位置 | 无二次偏移；tab bar 不被 child resize 影响；布局稳定 | 分析通过，仍需回归 | 来源：分析MD；对应 maxChildHeight / resize 风险 |
| TC-6 | 复杂组件组合 | 在 bottom tabs 中放入 selection list、calendar、slider、form，覆盖 dropdown、drilldown、label top/bottom | 文本、值区、label、dropdown 与 tab 不重叠；编辑态/运行态一致 | 已知风险 | 来源：PDF + 分析MD；关联 Bug #74304、#74306、#74308、#74459、#74485、#74489、#74494、#74504、#74554、#74555 |
| TC-7 | Embedded/Search/Table 组合 | 在 tab 中加入 embedded viewsheet、selection search、table shrink to fit | embedded viewsheet、search bar、table 位置正确，无重叠/错位 | 已知风险 | 来源：PDF + 分析MD；关联 Bug #74408、#74463、#74594、#74621 |
| TC-8 | 导出与多终端 | 分别验证 HTML、PNG、print layout、device layout | bottom tabs 在各终端保持一致；圆角/位置/可见性正确 | 已知风险 | 来源：PDF + 分析MD；关联 Bug #74406、#74427、#74523、#74593、#74598 |
| **P2** |
| TC-9 | Format / Round Bottom Corners | 开启 round bottom corners only，执行 format reset / painter / export | 圆角仅作用于底部 tab 场景，reset/painter 后格式不串 | 按需测试 | 来源：PDF 截图说明 + 分析MD；模块影响：FormatPainterController |

---

# 4 Special Testing

## Security
无新增安全入口，常规回归即可。

## Performance
- 验证多 child、不同高度、频繁 resize 时布局重排无明显卡顿
- 检查导出和 device layout 切换时是否出现额外重排异常

## Compatibility
- 旧版本对象、无 `bottomTabs` 属性对象打开默认应为 `false`
- top-tabs 既有行为和布局不得回归

## 本地化
- 校验新增属性文案是否可本地化
- 检查 `Added bottom tabs` / round bottom corners 相关 UI 文案

## script
- `bottomTabs` 需支持脚本读写
- 重点验证 script 设置后与 design/runtime/print/device 的一致性

## 文档/API
- Documentation #73299：确认 tab properties 中新增选项已在文档体现

## 配置检查
- `bottomTabs` 默认值为 `false`
- assembly attribute 序列化/反序列化正确
- 属性面板、脚本值、持久化值一致

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- Tab 属性面板与 Tab 渲染 UI
- Tab 布局引擎 / child 几何重排
- Script（`TabVSAScriptable`）
- 持久化（assembly attribute / `TabVSAssemblyInfo`）
- Format / round corner / painter
- Export（print / HTML / PNG）
- Device layout
- Embedded Viewsheet / Selection List / Calendar / Slider / Table / Form

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| 73295 | Add a script for the newly added bottom tabs option | Related (PDF) |
| 74130 | When Bottom Tabs is true, the component extends beyond the edge | Related (PDF) |
| 74299 | When Bottom Tabs is true and add component, the component still shows in bottom area | Related (PDF) |
| 74301 | When Bottom Tabs is true and drag tab to top, the assembly goes beyond the top edge | Related (PDF) |
| 74304 | When Bottom Tabs is true, the value of Slider overlaps with the tab | Related (PDF) |
| 74306 | When Bottom Tabs and dropdown are true, the value of selection list overlaps with the tab | Related (PDF) |
| 74308 | When Bottom Tabs and dropdown are true, the value of calendar overlaps with the tab | Related (PDF) |
| 74406 | Bottom Tabs is not applied in print layout | Related (PDF) |
| 74408 | When Bottom Tabs is true and add embedded viewsheet to tab, the embedded viewsheet position is wrong | Related (PDF) |
| 74427 | Tab corner displays wrong in exported file | Related (PDF) |
| 74447 | When Bottom Tabs script is true and add assembly to tab, the assembly shows on bottom of tab | Related (PDF) |
| 74459 | When uncheck dropdown in selection list, the selection list position is wrong on tab | Related (PDF) |
| 74463 | When Bottom Tabs and dropdown are true, embedded VS icon and selection overlap | Related (PDF) |
| 74485 | When uncheck dropdown in selection list, bottomTabs should not apply in edit mode | Related (PDF) |
| 74489 | When Bottom Tabs is true and drag selection list to tab, the selection list position is wrong | Related (PDF) |
| 74494 | When script sets Bottom Tabs true and selection is dropdown, selection bottom edge is not touching the tab | Related (PDF) |
| 74504 | When Bottom Tabs is true and label position is top/bottom, form assembly and tab are misaligned | Related (PDF) |
| 74523 | Bottom Tabs is not applied in Device Layouts | Related (PDF) |
| 74554 | When Bottom Tabs is true and slider label is bottom, tab position changes | Related (PDF) |
| 74555 | When Bottom Tabs is true and slider label is bottom in script, tab and label overlap | Related (PDF) |
| 74593 | When script sets Bottom Tabs true and export in print layout, the tab still shows on top | Related (PDF) |
| 74594 | When script sets Bottom Tabs true, the search bar and tab overlap | New (PDF, 2026-04-15) |
| 74598 | When dynamic script sets bottomTabs true in device layouts, tab is not shown | New (PDF, 2026-04-15) |
| 74621 | When table uses shrink to fit and bottomTabs is true, the table position is wrong | New (PDF, 2026-04-16) |
