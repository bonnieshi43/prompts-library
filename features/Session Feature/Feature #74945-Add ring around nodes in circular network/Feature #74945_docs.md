---

doc_type: feature-test-doc
product: StyleBI
module: Chart
Feature_id: "74945"
Feature: Add ring around nodes in circular network graph
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3673
Assignee: Stephen Webster
last_updated: 2026-07-14
version: stylebi-1.2.0

---

# 1 Feature Summary

**核心目标**：为 Circular Network（环形网络图，`CHART_CIRCULAR`）图表增加一个经过所有节点圆心的外接圆环（Ring），并通过 `RelationElement` 暴露 `addShapeBorder(GShape, Color, GLine)` 脚本接口供用户自定义。
**用户价值**：环形网络图此前只有连接节点的边线，节点是否真正排列成"环形"不直观；增加外接圆环后可视觉上强化"circular"布局特征，同时脚本接口为高级用户提供自定义环形状/颜色/线型的能力。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

核心功能
- Circular Network 图表默认显示外接圆环
- 非 Circular Network 的关联图表（Tree / Network）不受影响
- 通过脚本自定义圆环颜色/线型
- 通过脚本移除圆环

## P1 - Functional Path

- 边界情况：极端节点数据（单节点、空数据）下的表现
- 异常输入：脚本传入非法参数（null、非法颜色）
- UI状态变化：图表容器尺寸缩放、拖拽调整仪表板组件大小
- 多对象交互：导出与打印预览

## P2 - Extended Path （按需测试）

- 兼容性：历史 viewsheet / 快照对比类测试
- 安全：无新增安全风险点
- 性能：无明显性能影响

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | Circular Network 图表默认显示外接圆环 | 1. 创建包含多个节点（≥3个）的数据集，绑定为 Relation 图表<br>2. 在图表类型下拉框中选择 "Circular Network"<br>3. 观察图表渲染区域 | 图表中除节点与连接线外，额外显示一个浅灰色中等虚线圆环，且该圆环经过（或非常接近）所有节点的中心点，视觉上形成"外接圆" | 符合预期 | 【分析MD】场景1 |
| TC-2 | 非 Circular Network 的关联图表（Tree / Network）不受影响 | 1. 分别创建 Tree 类型和 Network 类型的关联图表<br>2. 观察渲染效果 | Tree 与 Network 图表均不出现圆环，渲染效果与本次改动前一致 | 符合预期 | 【分析MD】场景3 |
| TC-3 | 通过脚本自定义圆环颜色/线型 | 1. 打开 Circular Network 图表的脚本编辑面板<br>2. 输入脚本：`var elem = graph.getElement(0); elem.addShapeBorder(GShape.CIRCLE, java.awt.Color.RED, new GLine(GraphConstants.THICK_LINE))`<br>3. 保存脚本并刷新图表 | 圆环颜色/线型按脚本设置更新（变为红色、实线加粗），且脚本编辑器对该方法/参数提供 Auto-complete 提示 | 符合预期 | 【分析MD】场景4 |
| TC-4 | 通过脚本移除圆环 | 1. 在 Circular Network 图表脚本面板中，调用脚本：`var elem = graph.getElement(0); elem.addShapeBorder(null, null, null)`<br>2. 保存脚本并刷新图表 | 图表恢复为仅显示节点与连接线，圆环消失 | 符合预期 | 【分析MD】场景5 |
| **P1** |
| TC-5 | 环形圆环随图表容器尺寸缩放同步变化 | 1. 在 Viewer 中查看 Circular Network 图表<br>2. 拖拽调整该图表组件的宽高（放大与缩小各测试一次）<br>3. 全屏/最大化该图表组件 | 无论尺寸如何变化，圆环始终保持"经过所有节点中心"的视觉效果，不出现比例失调、偏移或裁切 | 符合预期 | 【分析MD】场景2 |
| TC-6 | 极端节点数据下的边界表现 | 1. 创建仅含1个节点的 Circular Network 图表并查看<br>2. 创建无有效关联数据（节点为空）的 Circular Network 图表并查看 | 两种情况下图表均能正常打开，不出现圆环（因半径无意义），且不出现渲染报错或页面异常 | ignore | 【分析MD】场景6 - 边界问题：目前做不出来这种效果 |
| TC-7 | 导出与打印预览中圆环渲染一致性 | 1. 打开一个含圆环的 Circular Network 图表<br>2. 分别导出为 PDF、Excel、图片格式<br>3. 打开打印预览 | 三种导出格式及打印预览中圆环均正常显示，位置、比例、虚线样式与在线查看一致 | 符合预期 | 【分析MD】场景7 |
| TC-8 | 默认圆环颜色在不同主题背景下的可视性 | 1. 在默认（浅色）主题下查看 Circular Network 图表圆环的可见程度<br>2. 切换至深色主题（若产品支持仪表板深色模式），再次查看圆环可见程度 | 在两种主题背景下，圆环均可被用户清晰辨识为一条虚线圆圈，不会因颜色过浅而"消失"在背景中 | Fail | 【分析MD】场景8, Bug #75645 |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
无新增安全风险点

## Performance
无明显性能影响

## Compatibility
- 历史 viewsheet / 快照对比类测试可能受影响（依赖图表截图比对的自动化测试会因新环产生差异）

## 本地化
本次无新增 UI 文本，暂不涉及本地化测试

## script
- 验证 `addShapeBorder` / `getLayoutRadius` 在图表脚本编辑器中 Auto-complete 是否可正常提示
- 验证 UI（无配置项）与脚本（可控制）之间的行为是否一致——即脚本设置的环是否能覆盖/叠加默认硬编码环
- 验证脚本传入非法参数（如 `null` Shape、非法颜色）时是否稳定不报错

## 文档/API
- `RelationElement.addShapeBorder()` 是面向脚本用户的新公开 API，需确认脚本 API 文档/Help 是否已同步说明其用法与参数含义

## 配置检查
未涉及 `SreeEnv`/`defaults.properties` 配置项，无需验证 Global/Organization 作用域相关内容

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- **Chart**：图表编辑器（属性面板/脚本面板）、Viewer 查看器渲染、Chart 类型切换（`ChangeChartTypeProcessor`/`ChangeChartTypeService`）
- **Dashboard**：仪表板组件（拖拽调整尺寸）
- **Export**：导出模块（PDF/Excel/Image）
- **Print**：打印预览
- **Mobile**：移动端视图（图表渲染尺寸与坐标变换）

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75645 | 默认圆环颜色在不同主题背景下的可视性问题 | New |

---