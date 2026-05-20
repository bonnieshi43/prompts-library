---
doc_type: feature-test-doc
product: StyleBI
module: Chart
Feature_id: "74789"
Feature: Tree Chart Layout Direction
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3616
Assignee: ""
last_updated: 2025-05-14
version: "stylebi-1.2.0"
---

# Feature #74789 — Tree Chart Layout Direction

---

# 1 Feature Summary

**核心目标**：为 Tree Chart 新增 Layout Direction 配置项，支持四个方向：Top→Bottom（默认）、Bottom→Top、Left→Right、Right→Left，并持久化到 XML。

**用户价值**：现有 Tree Chart 仅支持垂直方向（Top→Bottom），导致组织结构图、产品结构图等横向展示场景空间利用率低、可读性差。新增方向选项后，用户可根据 dashboard 空间灵活选择布局方式，更接近行业标准 org chart 展示效果。

---

# 2 Test Focus

## P0 — Core Path

- 四个方向（Top→Bottom / Bottom→Top / Left→Right / Right→Left）渲染正确，层级关系不变
- Layout Direction 下拉框在 Tree Chart 下可见，切换后实时生效
- XML 持久化正确：保存后重新打开方向不丢失
- 默认值为 Top→Bottom，老 viewsheet 打开后行为不变

## P1 — Functional Path

- chart type 切换后再切回 Tree chart，treeLayout 值保持
- 非 tree chart（Bar/Line 等）不显示 Layout Direction 选项
- Network / Circular Network chart 不受 layout direction 影响
- Export（PNG / PDF）与 UI 渲染方向一致
- Annotate 刷新后方向正确
- 改变 chart size 后方向正确刷新
- Scrollbar 刷新后方向正确
- 有 XY 轴情况切换轴后更新正确（关联 Bug #74971）
- Print layout / Mobile layout 下方向正确渲染

## P2 — Extended Path（按需测试）

- 大规模树（1000+ 节点）Left→Right 方向性能（已知性能较慢）
- 超宽/超深树的布局溢出表现

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | Top→Bottom 默认渲染 | 新建 Tree Chart，不修改 Layout Direction | Root 在顶，子节点向下展开，edge routing 正确 | | 默认值验证 |
| TC-2 | Left→Right 方向渲染 | 创建 Tree Chart → 选择 Left to Right | Root 在左，子节点向右展开，edge routing 正确，层级不变 | | 分析MD Scenario 1 |
| TC-3 | Right→Left 方向渲染 | 创建 Tree Chart → 选择 Right to Left | Root 在右，子节点向左展开，label 不镜像 | | 分析MD Scenario 2 |
| TC-4 | Bottom→Top 方向渲染 | 创建 Tree Chart → 选择 Bottom to Top | Root 在底，子节点向上展开 | | 分析MD Scenario 3 |
| TC-5 | XML 持久化 round-trip | 设置 Left→Right → 保存 → 重新打开 viewsheet | 方向保持 Left→Right，渲染一致 | | |
| TC-6 | 老 viewsheet 兼容性 | 加载不含 treeLayout 属性的历史 viewsheet | 自动 fallback 为 Top→Bottom，图表无变化 | | 分析MD Scenario 4；backward compatibility |
| **P1** | | | | | |
| TC-7 | UI 可见性：Tree Chart | 打开 Tree Chart 的 Plot Options | Layout Direction 下拉框可见 | | |
| TC-8 | UI 可见性：非 Tree Chart | 切换到 Bar / Line Chart | Layout Direction 下拉框不可见 | | |
| TC-9 | chart type 切换状态保持 | Tree chart 设为 Left→Right → 切换 Bar → 切回 Tree | treeLayout 保持 Left→Right | | 分析MD Scenario 6；切换保持 |
| TC-10 | Network chart 不受影响 | 创建 Network Chart，修改 layout direction（若可见） | Network 渲染不受 orientation 参数影响 | | 仅 COMPACT_TREE 支持 orientation |
| TC-11 | Export PNG 方向一致 | Left→Right Tree → 导出 PNG | 导出图片方向与 UI 一致 | | 分析MD Scenario 7 |
| TC-12 | Export PDF 方向一致 | Left→Right Tree → 导出 PDF | 导出 PDF 方向与 UI 一致 | | 分析MD Scenario 7 |
| TC-13 | Annotate 刷新 | 设置方向后添加 annotation，刷新 | 方向与 annotation 位置正确 | | 遗漏测试项 2 |
| TC-14 | 改变 chart size 刷新 | 设置方向后拖拽改变 chart 大小 | 方向正确，布局重新渲染 | | 遗漏测试项 3 |
| TC-15 | Scrollbar 刷新 | 大树启用 scrollbar，设置方向后滚动 | 方向正确，scroll 正常 | | 遗漏测试项 4 |
| TC-16 | XY 轴切换（Bug #74971） | 有 XY 轴情况切换轴后验证 tree layout 更新 | 轴切换后 layout 状态正确 | | 遗漏 Bug #74971 |
| TC-17 | Print layout 渲染 | 设置 Left→Right → 切换 Print layout | 方向正确渲染 | | 遗漏测试项 1 |
| TC-18 | Mobile layout 渲染 | 设置 Left→Right → 切换 Mobile layout | 方向正确渲染 | | 遗漏测试项 1 |
| **P2** | | | | | |
| TC-19 | 大规模树性能 | 构造 1000+ 节点树，选择 Left→Right | 可完成渲染，无 UI 卡死（性能已知较慢，记录耗时） | | 分析MD Scenario 8 |

---

# 4 Special Testing

## Performance

TC-19 覆盖大规模树（1000+ 节点）Left→Right 方向渲染。已知超大树性能较慢，测试时记录渲染耗时作为基线，不设硬性 pass/fail 标准，但需确认无 UI 冻结。

## Compatibility

- 老 viewsheet（不含 treeLayout 属性）：TC-6 覆盖，自动 fallback Top→Bottom。
- Browser rendering：主流浏览器（Chrome / Firefox / Edge）下验证 TC-2～TC-4。

## Script

关联 Bug #74966（script bug），若 script 中引用 tree chart layout 属性，需验证 script 读写 treeLayout 值正确。

## 本地化

Layout Direction 下拉框文案（Top to Bottom / Bottom to Top / Left to Right / Right to Left）需在对应 locale 下验证显示正确。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响说明 |
|---|---|
| Tree Chart 渲染 | 核心改动；四方向 layout engine 变更，需全量回归 |
| Export（PNG / PDF / Print） | render pipeline 经过 layout 层，需验证导出一致性 |
| Chart Type 切换 | treeLayout 在所有 chart type 切换中保留，需验证非 tree chart 不受影响 |
| PlotDescriptor XML | 新增 treeLayout 属性，需验证 round-trip 与老 XML 兼容 |
| Network / Circular Network | 不支持 orientation，需验证不受影响 |
| Annotation / Scrollbar | 依赖 chart geometry，layout 改动后需验证刷新正确 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| Bug #74971 | 有 XY 轴情况切换轴时 Tree Layout 更新异常 | — |
| Bug #74966 | Script bug（与本 Feature 关联） | — |
| Bug #74967 | UI 不美观 | — |