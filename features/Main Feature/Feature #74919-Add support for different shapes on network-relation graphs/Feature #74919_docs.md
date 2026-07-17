---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Network-Relation Graph
Feature_id: 74919
Feature: Add support for different shapes on network/relation graphs
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3663
Assignee: Stephen Webster
last_updated: 2026-07-14
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：在 `RelationElement` 上新增 `setNodeShape`/`getNodeShape` 脚本 API（均标注 `@TernMethod`），允许用户在脚本中方便地调整 Network/Relation 图节点的渲染形状，不再局限于默认矩形/圆角矩形。

**用户价值**：脚本用户可通过 `element.setNodeShape(GShape.XXX)` 灵活控制节点外观（如圆形、三角形等），提升 Relation/Network 图的视觉表达能力（Epic #74519 Look and Feel）。

---

# 2 Test Focus

## P0 - Core Path

- 脚本调用 `setNodeShape` 后节点按指定形状渲染，替代默认矩形
- 节点颜色（填充色/边框色/颜色映射）仍由元素自身属性控制，不受 `GShape` 自带颜色属性影响
- 默认（未调用 `setNodeShape`）渲染路径回归：矩形/圆角矩形效果与改动前一致

## P1 - Functional Path

- `GShape.NIL` 与 `nodeCornerRadius` 组合行为（回退矩形是否保留圆角）
- 非凸形状（CROSS/XSHAPE/星形等）节点的点击/Tooltip/Hyperlink 命中区域（外接矩形 vs 可视轮廓）
- `ImageShape` 等含自定义绘制逻辑形状的降级效果
- 选中边框（Selection Border）与自定义形状轮廓的匹配情况

## P2 - Extended Path （按需测试）

- 旧版本 Viewsheet（不含 `nodeShape` 字段）兼容性
- 导出（PDF/Image）与 Print Layout 预览一致性

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 脚本设置节点形状基础验证 | 1. 在 Relation 图脚本中调用 `element.setNodeShape(GShape.XXX)`（如 `FILLED_CIRCLE`/`TRIANGLE` 等内置形状）<br>2. 刷新/预览图表 | 所有节点按指定形状渲染，替代默认矩形；其它形状渲染正确 | Bug #75650 / #75655 | 来源：分析 MD Scenario 1、PDF Related Bugs；`GShape.OVAL` 无该枚举属性；选中节点后选择边框与形状不匹配（Bug #75650）；`GShape.TRIANGLE` 渲染效果不佳（Bug #75655） |
| TC-2 | 节点颜色属性不受 GShape 自带颜色影响 | 1. 为 Relation 图配置颜色映射（按类别着色）<br>2. 调用 `setNodeShape` 设置自定义形状<br>3. 观察节点颜色是否仍按颜色映射正确显示 | 节点形状变化但颜色仍按原有颜色映射规则显示，不受 `GShape` 自身 fillcolor/linecolor 等属性影响 | Pass（设置颜色应用正确） | 来源：分析 MD Scenario 2；代码：`RelationVO.paint()` 仅取 `nodeShape.getShape()` 几何轮廓，颜色仍由 `elem.getBorderColor()` 等控制 |
| TC-3 | 默认（未设置形状）渲染回归验证 | 1. 打开一个未设置 `nodeShape` 的既有 Relation 图（含/不含 `nodeCornerRadius` 设置）<br>2. 观察节点渲染效果 | 节点渲染为矩形或圆角矩形，效果与改动前完全一致，无视觉回归 | Pass（默认符合预期） | 来源：分析 MD Scenario 6；`nodeShape == null` 时走原有 `nodeCornerRadius` 分支，逻辑未变 |
| **P1** | | | | | |
| TC-4 | GShape.NIL 与 nodeCornerRadius 组合行为验证 | 1. 设置 `element.setNodeCornerRadius(0.3)`<br>2. 设置 `element.setNodeShape(GShape.NIL)`<br>3. 观察渲染结果 | `GShape.NIL.getShape()` 返回 null，回退为矩形渲染；需与产品确认该回退是否应保留圆角（当前实现为直角矩形，不执行 `nodeCornerRadius` 分支） | Pass（圆角应用符合预期） | 来源：分析 MD Scenario 3；代码：`RelationVO.paint()` 中 `nodeShape != null` 即进入 if 分支，`s == null` 时不再执行 else 分支的圆角逻辑 |
| TC-5 | 非凸形状节点的命中区域验证 | 1. 设置节点形状为非凸形状（如 `GShape.CROSS`），并设置 `setBorderColor`<br>2. 为该节点配置 Hyperlink 或验证 Tooltip<br>3. 点击/悬浮节点可视图形之外、外接矩形范围内的区域 | 交互行为按设计触发（外接矩形范围内均可触发 Hyperlink/Tooltip），该行为为已知的可接受权衡（acceptable bounding-box trade-off） | Pass（Hyperlink、Tooltip 工作正常） | 来源：分析 MD Scenario 4；代码：`RelationVO.getShapes()` 始终返回外接矩形，注释已说明该权衡 |
| TC-6 | ImageShape 降级效果验证 | 1. 调用 `element.setNodeShape(new ImageShape(...))`（或等效图片形状）<br>2. 观察节点渲染结果 | 节点不显示图片内容，仅使用几何轮廓（若有），渲染过程无异常报错 | ImageShape 不支持 | 来源：分析 MD Scenario 5；Javadoc 已明确说明 "Shapes with custom paint logic (e.g. ImageShape) will not render their image"，需确认实际降级效果（空白/异常）是否可接受 |
| **P2** | | | | | |
| TC-7 | 旧版本 Viewsheet 兼容性验证 | 1. 加载一个在本功能上线前保存的、包含 Relation 图的 Viewsheet<br>2. 观察节点渲染效果 | 节点渲染与本功能上线前一致（`nodeShape` 反序列化为 null），无异常 | Pass（旧版本符合预期） | 来源：分析 MD Scenario 7；`serialVersionUID` 保持 2L，新增字段 null 时安全回退 |
| TC-8 | 自定义节点形状导出/打印一致性验证 | 1. 为 Relation 图节点设置自定义形状<br>2. 分别执行 PDF 导出、Image 导出与 Print Layout 预览 | 导出/打印结果中节点形状、颜色与页面展示一致，无失真或回退为默认矩形 | Pass（打印导出一致） | 来源：分析 MD Scenario 8 |

---

# 4 Special Testing

## Security

不涉及权限、认证、数据隔离或外部输入解析变更，无需专项安全测试。

## Performance

改动仅涉及节点绘制路径的分支重构（矩形 vs 自定义形状），不涉及大数据量性能敏感逻辑，无需专项性能测试。

## Compatibility

- **Old config**：新增 `nodeShape` 字段，`serialVersionUID` 保持 2L，反序列化时旧数据该字段为 null，回退到原有矩形/圆角矩形渲染（见 TC-7）。
- **Round-trip**：自定义形状节点在导出/打印场景下与页面显示保持一致（见 TC-8）。

## Script / Programmatic Support

- **API(s)**：`RelationElement.setNodeShape(GShape)` / `getNodeShape()`，均标注 `@TernMethod`，需验证脚本编辑器 Auto-complete 支持。
- **Gotchas**：
  - `nodeShape` 一旦设置（非 null），会**忽略** `nodeCornerRadius` 设置，两者互斥（`GShape.NIL` 除外，见 TC-4）。
  - `GShape` 自带的 fillcolor/linecolor/lineStyle/fill 标志均被忽略，节点颜色始终由元素自身颜色属性/颜色映射控制。
  - `getShapes()`（命中检测）始终返回外接矩形，不随自定义形状变化，属于已知设计权衡。

## Docs / API

Javadoc 已在 `setNodeShape` 方法上明确标注上述行为边界（颜色属性忽略、`ImageShape` 不渲染图片、`GShape.NIL` 回退逻辑），建议同步补充到面向用户的脚本 API 文档。

## 配置检查

未发现新增 `SreeEnv`、`defaults.properties` 或部署配置项，不需要专项配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 | 优先级 |
|---|---|---|
| Chart - RelationElement | 新增 `nodeShape` 字段及 `equalsContent()` 比较，影响撤销/重做、增量渲染判断等依赖内容比较的逻辑 | P0 |
| Chart - RelationVO 绘制 | 节点绘制分支重构（`nodeShape` vs `nodeCornerRadius` 二选一），默认路径需回归验证无视觉差异 | P0 |
| Chart - 节点选中边框 | 自定义形状下选择边框与实际形状轮廓不匹配（Bug #75650） | P0 |
| Chart - TRIANGLE 形状渲染 | `GShape.TRIANGLE` 渲染效果异常（Bug #75655） | P0 |
| Chart - 命中检测 | `getShapes()` 始终返回外接矩形，非凸形状存在可视区域外可点击的已知权衡 | P1 |
| Script API | `setNodeShape`/`getNodeShape` 脚本可见性与 Auto-complete | P1 |
| Export / Print | PDF/Image 导出与 Print Layout 预览需与页面显示保持一致 | P2 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75650 | setNodeShape 后，选中节点的选择边框（select border）与实际形状不匹配 | New |
| #75655 | setNodeShape 设置为 TRIANGLE 时，图形线条渲染效果不佳 | New |

---
