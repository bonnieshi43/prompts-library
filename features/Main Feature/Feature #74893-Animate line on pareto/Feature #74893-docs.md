---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Pareto / Animation
Feature_id: 74893
Feature: Animate line on pareto
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3653
Assignee: milotalon
last_updated: 2026-07-10
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：为 Pareto 图中的累计百分比线增加"画出（draw-on）"动画效果，使该线在所有 Bar 动画播放完成后逐渐绘制出来，明确不包含 ghost fill（渐隐填充）和 hover 交互效果。

**用户价值**：用户打开包含 Pareto 图且已开启图表动画的 Dashboard 时，可以看到累计百分比线随 Bar 动画结束后自然延续地画出，视觉上更连贯、更能体现"先看柱子分布，再看累计趋势"的阅读顺序，而不是线条与柱子同时瞬间出现。

**实现方式**：`LineVO` 检测 `elem.getHint("_pareto_")` 并写入 `data-pareto` 标记；`SVGSupport` 新增 `ATTR_PARETO` 常量；`SVGAnimationDOMInjector` 中 `injectBarAnimationFromAnnotations()` 由 `void` 改为返回 `double`（`lastBarDelay`），新增 `injectParetoLineAnimation()` 在所有 Bar 动画结束（`lastBarDelay + DURATION + READY_BUFFER`）后对筛选出的 Pareto 线注入动画；实线走 `stroke-dashoffset`，虚线走 `clip-path` wipe，两种路径被提炼为共享方法 `applyLineDrawAnimation()`（同时被普通折线图动画复用）。

---

# 2 Test Focus

## P0 - Core Path

- Pareto 图开启图表动画时，累计百分比线以 draw-on 效果从左到右画出，最终显示完整曲线
- Pareto 线动画在所有 Bar 动画播放完成后才开始（时序：`lastBarDelay + DURATION + READY_BUFFER`）
- Pareto 线动画不包含 ghost fill 效果（与普通折线图/面积图区分）
- Pareto 线动画不引入额外 hover 高亮/tooltip 行为变化
- `_pareto_` hint 识别准确性：只有真正的 Pareto 累计线被识别为动画对象，不误判其它折线系列
- 普通折线图/面积图动画回归（`applyLineDrawAnimation` 共享逻辑重构后，原有 stroke-dashoffset、clip-path wipe、ghost fill、多系列 stagger delay、端点圆点隐藏行为不变）

## P1 - Functional Path

- 虚线样式 Pareto 线的 clip-path wipe 动画正确呈现，不破坏虚线样式，无锚点圆点残留
- 无 Bar 数据（筛选后仅剩 Pareto 线）场景下，`lastBarDelay` 按默认值（约 0.9s）处理，动画仍正确触发
- 大量 Bar（stagger 延迟较大）场景下，Pareto 线在最后一个 Bar 完成后正确启动，无提前或错位
- 图表动画总开关关闭（或 fadeOnly 模式）时，Pareto 线不出现 draw-on 动画，与该开关关闭时既有折线动画行为一致
- 二次编辑过的 Pareto 图（切换坐标系 Swap XY、合并系列）hint 是否仍正确设置，动画是否仍生效
- 导出（PDF/Image）与 Print Layout 预览中 Pareto 线以完整（非动画中间态）形式呈现

## P2 - Extended Path （按需测试）

- 移动端/小屏幕下 Pareto 图动画效果与桌面端一致，无布局错位或裁切
- 浏览器兼容性（不同浏览器下 SVG 动画表现一致）
- 大数据量 Pareto 图（多类别）动画性能与流畅度

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | Pareto 线绘制动画基础验证 | 1. 打开一个包含 Pareto 图且已开启图表动画的 Viewsheet<br>2. 观察累计百分比线的渲染过程 | 累计百分比线以从左到右画出的动态效果呈现，最终显示完整曲线 | | 来源：分析 MD Scenario 1；核心风险：`_pareto_` hint 识别与动画触发 |
| TC-2 | Bar 与 Pareto 线动画时序验证 | 1. 打开包含多个类别（多根 Bar）的 Pareto 图<br>2. 观察 Bar 动画与线条动画的先后顺序 | 所有 Bar 完全长出后，Pareto 线才开始画出，两者之间存在明显的短暂间隔（`lastBarDelay + DURATION + READY_BUFFER`） | | 来源：分析 MD Scenario 2；跨方法时序耦合风险 |
| TC-3 | 无 Ghost Fill 效果验证 | 1. 打开包含 Pareto 图的 Viewsheet，触发动画<br>2. 对比 Pareto 线与图表中其它折线系列（若有）的动画表现 | Pareto 线下方无渐变填充效果；其它折线系列（若存在）仍保留原有 ghost fill 效果 | | 来源：分析 MD Scenario 3；需求明确排除 ghost fill |
| TC-4 | 无 Hover 交互效果验证 | 1. 鼠标悬浮在 Pareto 线上<br>2. 观察是否出现因动画引入的新增高亮效果 | 无因动画引入的额外 hover 高亮效果；原有 tooltip（如有）行为不受动画改动影响 | | 来源：分析 MD Scenario 4；需求明确排除 hover 效果 |
| TC-5 | `_pareto_` hint 识别准确性 | 1. 创建标准 Pareto Chart Style 图表<br>2. 创建手动拼装的 Bar+Line 组合图（非 Pareto Style）<br>3. 分别触发动画 | 标准 Pareto 图的累计线正确触发 draw-on 动画；手动拼装的 Bar+Line 组合图（未设置 `_pareto_` hint）不触发该动画，行为与改动前一致 | | 风险：hint 依赖的静默失败，未命中不报错 |
| TC-6 | 普通折线图/面积图动画回归 | 1. 打开不含 Pareto 的普通折线图（含多系列）与面积图<br>2. 触发动画，观察绘制效果、ghost fill、多系列先后顺序 | 各系列按原有 stagger 延迟依次画出；面积图 ghost fill 效果保留；虚线折线仍走 clip-path wipe；Batik 端点圆点仍被隐藏 | | 来源：分析 MD Scenario 8；`applyLineDrawAnimation` 共享逻辑重构回归风险 |
| **P1** | | | | | |
| TC-7 | 虚线 Pareto 线动画验证 | 1. 将 Pareto 线样式配置为虚线<br>2. 触发图表动画，观察绘制效果 | 虚线 Pareto 线以从左到右擦除（clip-path wipe）方式显示，最终虚线样式与静态状态一致，无锚点圆点残留 | | 来源：分析 MD Scenario 5 |
| TC-8 | 无 Bar 数据时的 Pareto 线动画验证 | 1. 构造/筛选出仅有 Pareto 线、无 Bar 数据的场景<br>2. 触发动画 | Pareto 线动画正常触发，无异常或空白显示；`lastBarDelay` 缺省按默认延迟（约 0.9s）处理 | | 来源：分析 MD Scenario 6；PR Review 确认空 Bar 场景默认 0.9s 延迟 |
| TC-9 | 大量 Bar 下时序正确性 | 1. 创建包含大量类别（如 30+）的 Pareto 图，使 Bar stagger 延迟较大<br>2. 观察 Pareto 线启动时间 | Pareto 线在最后一根 Bar 动画结束后才启动，不提前、不与最后几根 Bar 动画重叠 | | 边界场景下时序计算风险 |
| TC-10 | 图表动画总开关关闭 | 1. 关闭 Chart Animation（或使用 fadeOnly 模式）<br>2. 打开 Pareto 图 | Pareto 线不出现 draw-on 动画，直接以静态终态显示；与该开关关闭时既有折线图行为一致 | | 分析 MD 指出 Pareto 线动画无独立开关，复用总开关 |
| TC-11 | 二次编辑后的 Pareto 图 hint 保持 | 1. 创建 Pareto 图后执行 Swap XY 坐标系切换（若可行）<br>2. 或将 Pareto 图与其它图表合并系列<br>3. 重新触发动画 | 若二次编辑后仍为合法 Pareto 图，`_pareto_` hint 应保持正确，动画仍触发；若编辑导致语义不再是 Pareto，动画不触发但不报错 | | 风险：hint 依赖跨编辑路径的静默失败 |
| TC-12 | 导出/打印场景下 Pareto 线完整性 | 1. 打开包含 Pareto 图的 Viewsheet<br>2. 分别执行 PDF 导出、Image 导出与 Print Layout 预览 | 导出/打印结果中 Pareto 线完整显示（非动画中间态"未画出"状态），与关闭动画时的历史导出效果一致 | | 来源：分析 MD Scenario 7；SVG 初始态为 stroke-dashoffset 满长 |
| TC-13 | 共享逻辑输出属性一致性 | 1. 对比 Pareto 线与普通折线图动画生成的 `stroke-dasharray`、`animation` 时长、缓动函数等 SVG 属性 | 两条路径通过 `applyLineDrawAnimation` 产出的属性一致，未因重构引入差异 | | PR Review 指出的代码重复/共享方法建议点 |
| TC-14 | 端点圆点隐藏范围验证 | 1. 若 Pareto 线本身配置为显示数据点圆点<br>2. 触发动画，观察圆点显示状态 | 明确记录 `descendantCircles` 隐藏（`opacity:0`）是否误隐藏了 Pareto 线本应显示的数据点圆点（而非仅虚线锚点圆点） | | 分析 MD 风险点 5：端点圆点误隐藏风险 |
| **P2** | | | | | |
| TC-15 | 移动端/小屏幕兼容 | 1. 在移动端或小屏幕容器下打开 Pareto 图<br>2. 触发动画 | 动画效果与桌面端一致，无布局错位或裁切 | | 分析 MD 功能验证 Mobile 部分 |
| TC-16 | 浏览器兼容性 | 1. 在主流浏览器（Chrome/Firefox/Edge/Safari）中分别打开同一 Pareto 图<br>2. 对比动画表现 | SVG 动画在各浏览器中表现一致，无卡顿或渲染差异 | | 兼容性扩展 |
| TC-17 | 大数据量 Pareto 图动画性能 | 1. 使用较多类别（如 100+）的 Pareto 图数据<br>2. 触发动画，观察流畅度与首次渲染耗时 | 动画流畅无明显卡顿；不因类别数量增多导致页面卡死或时序计算异常 | | 性能扩展 |

---

# 4 Special Testing

## Security

不涉及权限、认证、数据隔离或外部输入解析变更，无需专项安全测试。

## Performance

执行 TC-9、TC-17，重点关注 Bar 数量较多时 stagger 延迟累积后 Pareto 线时序计算（`lastBarDelay`）是否仍准确，以及动画注入是否引入明显的渲染性能退化。

## Compatibility

- 导出兼容：PDF / Image 导出、Print Layout 预览需保证 Pareto 线以完整静态形式呈现（TC-12）。
- 图表编辑路径兼容：Swap XY、系列合并等二次编辑后 `_pareto_` hint 保持正确（TC-11）。
- 回归兼容：普通折线图/面积图动画（含多系列 stagger、ghost fill、虚线 wipe、端点圆点隐藏）不受共享方法重构影响（TC-6）。
- 浏览器/移动端兼容：动画效果跨浏览器、跨设备一致（TC-15、TC-16）。

## 本地化

本 Feature 为纯渲染动画效果，未发现新增 UI 文本或 i18n key，无需专项本地化测试。

## script

未发现新增脚本 API（`_pareto_` hint 为内部渲染标记，非脚本可访问属性），无需专项脚本兼容测试。

## 自动化补充建议

- 新增 `LineVO` 对 `_pareto_` hint 判断与 `data-pareto` 属性写入的单元测试。
- 新增 `applyLineDrawAnimation` 对实线/虚线两种路径生成属性一致性的单元测试（PR Review 指出的代码重复点，重构后需保证行为等价）。
- 新增 `injectBarAnimationFromAnnotations` 返回值（`lastBarDelay`）在空 Bar、单 Bar、多 Bar 场景下的单元测试，覆盖默认延迟（约 0.9s）分支。
- 新增 `injectParetoLineAnimation` 时序计算（`lastBarDelay + DURATION + READY_BUFFER`）的单元测试。
- 补充导出流程 SVG 快照测试，确认导出结果不残留动画中间态。

## 文档/API

若产品文档描述图表动画能力，可补充说明 Pareto 图累计线在开启动画时的画出效果及其在所有 Bar 完成后启动的时序设计；无需新增 API 文档（无新脚本接口）。

## 配置检查

未发现新增 `SreeEnv`、`defaults.properties` 或部署配置项，Pareto 线动画复用现有 Chart Animation 总开关，不需要专项配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 | 优先级 |
|---|---|---|
| Chart - SVGAnimationDOMInjector | 核心变更集中于此：`injectBarAnimationFromAnnotations` 签名由 void 改为 double，新增 `injectParetoLineAnimation`，风险为跨模块调用点遗漏或时序计算错误 | P0 |
| Chart - 普通折线图/面积图动画 | `applyLineDrawAnimation` 共享方法同时服务 Pareto 与普通折线，重构可能引入行为差异（stroke-dashoffset、clip-path wipe、ghost fill、stagger delay） | P0 |
| Chart - LineVO / SVGSupport | 新增 `_pareto_` hint 判断与 `data-pareto` 属性，若几何计算层未正确设置 hint，动画静默不生效 | P1 |
| Export / Print | SVG 初始态为"未画出"，导出/打印流程若未正确处理会导致 Pareto 线残缺显示 | P1 |
| Chart 编辑路径（Swap XY / 系列合并） | 二次编辑后 `_pareto_` hint 是否保持正确，间接影响动画是否继续生效 | P1 |
| Mobile / Browser 兼容 | SVG 动画在不同设备与浏览器下表现一致性 | P2 |

---

# 6 Bug List

暂无已提交 Bug（PR 已合并，5 项检查通过；Code Review 指出的代码重复、误导性注释、冗余属性等均为 Minor/建议性问题，未阻塞合并）。若测试执行中发现上述测试场景失败，应在此补充记录。
