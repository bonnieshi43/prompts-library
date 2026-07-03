---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Funnel Graph
Feature_id: 74763
Feature: Enhance funnel graph look and feel
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3575
Assignee: Stephen Webster
last_updated: 2026-06-29
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：将 Funnel 图从当前类似堆叠 Bar 的视觉形态，增强为连续、无间隙的梯形漏斗效果，使相邻阶段边缘对齐，整体更符合漏斗图表达“阶段递减/转化流失”的语义。

**用户价值**：用户在 Dashboard 中使用 Funnel Chart 展示销售漏斗、流程转化、阶段流失等数据时，可以直接获得更直观的漏斗视觉，而不是需要通过堆叠柱状图外观理解漏斗关系。

---

# 2 Test Focus

## P0 - Core Path

- Funnel 基础渲染：连续梯形、无 bar gap、相邻阶段边缘对齐
- Funnel 专用 geometry：按数据阶段顺序生成梯形/平行四边形，最后一段收尾正常
- Funnel 下 Bar Corner Radius / Round All Corners 控件应隐藏；旧存档/API 残留值也不应影响漏斗形状
- Label layout：value label 在最终 transform 下位置正确，无重复、无丢失
- Hover / Tooltip / Highlight：segment 与 label 能正确关联到同一数据点
- Save / Reload 后 Funnel 外观和交互保持一致

## P1 - Functional Path

- Vertical Funnel 以及旧存档/API 触发的 inverted/horizontal 兼容；UI 中 Swap XY 对 Funnel 应隐藏
- Funnel 轴行为：线性值轴 label 隐藏，轴线颜色继承 top/x axis，facet 下各 panel 一致
- Funnel 绑定/配置限制：Y 区域只接受 Dimension，不支持 Secondary Y、Stack Values、Trend Line/Target Line
- 单层、双层、多层、空数据、Null/0 值、极端值等边界数据稳定
- 超长 label、密集阶段、不同格式化值下标签和 tooltip 可读
- Color / Break By / Stack 等多对象场景下，不同 funnel group 不互相串形
- PNG / SVG / PDF 导出与页面预览一致，SVG annotation 与 hover dim 逻辑匹配
- 普通 Bar、Stack Bar、Interval、Waterfall 等共用 BarVO/Geometry 路径无回归

## P2 - Extended Path （按需测试）

- 大数据量 Funnel 渲染性能：100 / 500 / 1000 stages
- 浏览器、移动端、小容器、Dashboard enlarge 等显示兼容性
- 本地化标签、数值格式、日期格式在 label / tooltip / export 中一致
- 脚本或 API 创建/刷新 Funnel 图时仍能正确渲染

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 基础 Funnel 渲染为连续梯形 | 1. 创建 Funnel Chart，绑定有序阶段维度和 measure<br>2. 使用 5 个以上递减阶段数据<br>3. 打开 show values，预览图表 | 每个阶段渲染为连续梯形/平行四边形；相邻阶段无 bar gap；整体不再像堆叠 Bar；最后阶段收尾正常 | Bug #75528 / #75533 | 来源：Feature PDF 目标、分析 MD 红标、PR 中 skip funnel gap 和 trapezoid reshape |
| TC-2 | 相邻阶段边缘无缝连接 | 1. 使用值差异明显的数据，如 100、80、30、10<br>2. 放大图表检查相邻 section 接缝<br>3. 切换颜色和边框后再次检查 | 上一阶段右边缘高度与下一阶段左边缘高度一致；无白缝、重叠、断裂或锯齿状错位 | | 来源：分析 MD Scenario 2 |
| TC-3 | 数据顺序与梯形高度映射 | 1. 分别测试按阶段排序、按 measure 排序、手动排序的数据<br>2. 修改排序后刷新图表<br>3. 对比每一段左右边缘高度 | Funnel section 顺序与图表排序一致；每段右边缘正确连接下一数据点高度；排序变化后 shape cache 不残留旧形状 | | 风险：`cachedShape`、`_funnel_shaped_`、X 排序 |
| TC-4 | Funnel 下禁用 Corner Radius | 1. 打开 Funnel Chart 的 Plot Options<br>2. 确认 Bar Corner Radius / Round All Corners 控件不可见<br>3. 使用旧存档、脚本或 API 注入 `barCornerRadius > 0` 后重新加载<br>4. 与普通 Bar Chart 同配置对比 | Funnel 中圆角控件不显示；即使旧值存在，Funnel section 仍保持直线梯形边缘，不出现圆角；普通 Bar Chart 仍按配置显示圆角 | | 来源：分析 MD Scenario 3；代码：`ChartPlotOptionsPaneModel` 隐藏 Funnel 圆角控件，`BarVO` 对 funnel 跳过 rounding |
| TC-5 | Label layout 位置正确 | 1. 开启 show values<br>2. 测试 vertical/horizontal、宽容器/窄容器、长短 label<br>3. 刷新、过滤、调整大小后重复验证 | Label 位于对应 funnel section 内或产品规定位置；无重复 label；无明显偏移、丢失、遮挡关键形状 | | 来源：分析 MD Scenario 4；PR 中 layoutText final pass 判断 |
| TC-6 | Hover highlight 与 tooltip 关联正确 | 1. 逐个 hover funnel section<br>2. 再 hover/选中对应 label<br>3. 检查 highlight 区域、tooltip 数据、selected 状态 | Highlight 区域与鼠标所在 section/label 一致；tooltip 显示对应阶段和 measure；选择状态不跳到相邻 section | Bug #75530 | 来源：分析 MD 红标；PR 中 SVG label annotation row/col |
| TC-7 | 保存后重新加载外观和交互不丢失 | 1. 保存包含 Funnel Chart 的 Viewsheet<br>2. 关闭后重新打开<br>3. 验证 shape、label、hover、tooltip、配置项 | Reload 后 Funnel 仍为连续梯形；label 和 hover 映射仍正确；无 JS 错误或回退为 stacked bar 外观 | | 持久化与渲染缓存回归 |
| **P1** | | | | | |
| TC-8 | Funnel 坐标兼容与 Swap XY 限制 | 1. 在 Chart Editor 中确认 Funnel 不显示 Swap XY 操作<br>2. 使用旧存档或 API 构造 inverted/horizontal Funnel（如可行）<br>3. 使用 4-6 个阶段数据检查排序、shape 方向、label、tooltip | UI 不允许用户对 Funnel 直接 Swap XY；旧存档/API 兼容路径下，Funnel 不反向、不交叉，label 跟随 shape，hover 区域与视觉区域一致 | | 风险：Coordinate Transform、横向 Funnel X 排序；代码：`chart-editor-toolbar` 隐藏 Funnel Swap |
| TC-9 | 单层与双层 Funnel 边界 | 1. 使用单个阶段数据创建 Funnel<br>2. 使用两个阶段数据创建 Funnel<br>3. 开启 label、hover、export | 单层 Funnel 稳定显示为合法 section；双层 Funnel 两段连接正确；无异常路径、空白图或报错 | | 来源：分析 MD Boundary |
| TC-10 | 空数据、Null、0 值、极端值 | 1. 测试空 dataset、全部 null、部分 null、0 值、极大/极小值<br>2. 观察渲染、tooltip 和控制台<br>3. 保存后重新打开 | 空数据按产品标准显示空态；Null/0 值不导致非法 path 或 NaN；极端值下 shape 仍在 plot area 内 | | 异常输入和 path 计算稳定性 |
| TC-11 | 超长 label 与密集阶段 | 1. 使用 20 个以上阶段<br>2. 阶段名称包含长文本、多语言字符、数字格式化值<br>3. 调整容器尺寸 | Label 不应重复或错配；tooltip 可显示完整值；小空间下按产品规则裁剪/隐藏，不遮挡成不可读状态 | | 来源：分析 MD Boundary；知识库 Tooltip/Label |
| TC-12 | Color / Break By / Stack 多对象场景 | 1. 为 Funnel 绑定 Color 维度或 Break By 维度<br>2. 测试多 funnel group 同屏显示<br>3. 结合 Stack/Stack Measures 可用场景回归 | 每个 funnel group 独立生成连续 section；不同组之间不互相连接；颜色、legend、tooltip 数据正确 | | PR 从 collision map 收集 allBars，需防串组 |
| TC-13 | Dashboard 交互后重新计算 shape | 1. 对 Funnel 所在 Dashboard 执行 filter、brush、zoom、exclude、show enlarged、resize<br>2. 每次交互后检查 shape/label/hover<br>3. 取消过滤恢复原状态 | 每次数据或容器变化后重新生成正确 shape；无 cached shape 残留、label 偏移或 hover 错位 | | 知识库：Chart 交互与 shape 稳定性 |
| TC-14 | PNG / SVG / PDF 导出一致性 | 1. 创建含 label 和颜色的 Funnel Chart<br>2. 分别导出 PNG、SVG、PDF<br>3. 对比页面预览和导出结果 | 导出中漏斗连续、边缘平滑；label 位置与页面一致；颜色和透明度一致；无额外锯齿或错位 | Bug #75529 | 来源：分析 MD 红标“导出有锯齿”；PR 涉及 SVG annotation |
| TC-15 | SVG animation 与 hover dim label | 1. 使用支持 SVG animation 的导出/预览路径<br>2. 等待动画完成后 hover funnel section<br>3. 检查 label opacity 和 dim 效果 | Label animation 不破坏 hover dim；section 与 label 的 data-row/data-col annotation 能正确配对 | | PR 涉及 `SVGAnimationDOMInjector` label annotation |
| TC-16 | Bar 系列图表回归 | 1. 分别创建普通 Bar、Stack Bar、Interval、Waterfall<br>2. 设置 corner radius、stack、show values、tooltip<br>3. 导出并执行 hover/selection | 非 Funnel 图表仍保持原有矩形/圆角/stack 行为；label、hover、tooltip、export 无回归 | Pass | 来源：分析 MD Scenario 8 “不影响其它 chart style” |
| TC-16A | Funnel 轴与 facet 轴线颜色 | 1. 创建 Funnel Chart，设置 X/top axis line color 和 visible 状态<br>2. 检查线性值轴 label 和 axis line<br>3. 创建 facet/multi-panel Funnel，重复检查各 panel | Funnel 的线性值轴 label 隐藏；隐藏值轴的 line color/visible 状态继承 top/x axis；facet 下每个 panel 轴线颜色一致 | | 代码：`GraphGenerator` 隐藏 Funnel linear axis label，并通过 `setFunnelAxisColor()` 继承轴线颜色 |
| TC-16B | Funnel 绑定和配置限制 | 1. 在 Funnel Chart 中尝试将 Measure 拖到 Y、Dimension 拖到 X/Measure 区域<br>2. 检查 Secondary Y、Stack Values、Trend Line、Target Line、Sort by Value 控件<br>3. 切换到 Bar/Line 后对比 | Funnel Y 区域只接受 Dimension；Secondary Y 不可用；Stack Values、Trend Line/Target Line 不显示或不可用；最后一个 Y 维度固定按 value 排序的限制符合当前产品行为 | | 代码：`ChartDndHandler` / `graph-util.ts` / `ChartPlotOptionsPaneModel` / `chart-fieldmc` |
| TC-16C | Inline SVG 多 tile hover 与 label dim | 1. 开启 inline SVG 渲染并使用足够大的 Funnel 触发 split/tile（如环境支持）<br>2. Hover 某个 Funnel section<br>3. 观察同 tile 和其他 tile 的 section/label dim 状态<br>4. 清除 hover 后再次移动到其他 section | 当前 section 及其 label 保持 active；非 active section/label 正确 dim；跨 tile SVG root 使用 `inetsoft-dim-all` 同步 dim；清除或切换 hover 后无 stale active class | | 代码：`BarVO` 写入 `inetsoft-bar-label` row/col；`ChartInlineSvgDirective` 同时激活 bar 与 label，并处理 cross-tile dim |
| **P2** | | | | | |
| TC-17 | 大数据量 Funnel 性能 | 1. 分别使用 100、500、1000 个阶段数据<br>2. 记录首次渲染、resize、filter 后刷新耗时<br>3. 观察内存和页面响应 | 渲染和交互在可接受范围内；页面无卡死；shape cache 不持续增长；label 策略不造成明显性能退化 | Pass | 来源：分析 MD Scenario 7 “渲染正常”，建议记录机器与数据规模 |
| TC-18 | 浏览器、移动端、小容器兼容 | 1. 在主流浏览器验证 Funnel<br>2. 使用移动端或 <= 400px 宽度模拟<br>3. 测试 Dashboard 小组件和 enlarged view | Shape 不超出 plot area；label/tooltip 可用；小容器下不出现重叠到无法操作的状态 | | 兼容性扩展 |
| TC-19 | 本地化与格式化 | 1. 切换中文、英文、日文等语言<br>2. 使用本地化阶段名称、日期、货币、百分比格式<br>3. 检查 label、tooltip、export | 文本和格式与系统语言/format 设置一致；无乱码、截断异常或 export 格式不一致 | | 无新增 i18n key，但需回归数据文本展示 |
| TC-20 | 脚本/API 创建或刷新 Funnel | 1. 使用已有脚本/API 创建或刷新 Funnel Chart 数据绑定<br>2. 执行脚本后预览图表<br>3. 保存、reload、导出 | 脚本/API 路径生成的 Funnel 与 UI 创建一致；无异常回退为 bar 外观；hover/label/export 可用 | | 不涉及新增脚本属性，回归现有创建与刷新路径 |

---

# 4 Special Testing

## Security

不涉及权限、认证、数据隔离或外部输入解析变更，无需专项安全测试。仍需确认 tooltip/label 中已有 HTML 或特殊字符处理不被本次 label layout 改动破坏。

## Performance

执行 TC-17，至少覆盖 100 / 500 / 1000 stages 的 Funnel 数据。重点记录首次渲染、resize、filter 后重新渲染、hover 响应时间，以及 `cachedShape` 是否导致持续内存增长。

## Compatibility

- Chart 类型兼容：普通 Bar、Stack Bar、Interval、Waterfall、Multiple Measure、Multiple Style 回归。
- Coordinate 兼容：Vertical 为主路径；Swap XY 在 UI 中应隐藏，旧存档/API 触发的 inverted/horizontal Funnel 需兼容；同时覆盖不同宽高比、Dashboard resize/enlarge。
- Export 兼容：PNG / SVG / PDF 需与页面预览一致。
- Browser / Mobile 兼容：主流浏览器和小屏幕下形状、label、tooltip 不错位。

## 本地化

本 Feature 未发现新增 UI 文本或 i18n key。需回归阶段名称、数值格式、日期格式、货币/百分比格式在 label、tooltip、export 中一致显示。

## script

未发现新增 Funnel 专属 script API。需回归现有脚本/API 创建 Chart、设置数据绑定、刷新 Dashboard 后，Funnel 仍使用连续梯形渲染，并且保存/导出路径一致。

## 自动化补充建议

- 新增 `BarVO` funnel reshape 单元测试：验证 allBars 左到右排序、right edge 使用下一段高度、`_funnel_shaped_` 防重复处理、`cachedShape.clear()` 后路径更新。
- 新增 SVG/前端单元测试：验证 `inetsoft-bar-label` 与 `inetsoft-bar` 使用相同 row/col，`highlightElement(s)` 能同时激活 Funnel section 与 label。
- 补充 Plot Options / Binding model 测试：Funnel 下 Bar Corner Radius、Round All Corners、Swap XY、Secondary Y、Stack Values、Trend Line/Target Line 的可见性与限制。

## 文档/API

若用户文档中描述 Funnel Chart，应补充其视觉行为为连续漏斗 section，而不是 stacked bar。若 API 文档列出 Funnel Chart 支持项，需明确 Bar Corner Radius 对 Funnel 不生效或被忽略。

## 配置检查

未发现新增 `SreeEnv`、`defaults.properties` 或部署配置项，不需要专项配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 | 优先级 |
|---|---|---|
| Chart - Funnel Geometry | BarVO 对 Funnel 使用连续梯形 reshape，影响核心视觉正确性 | P0 |
| Chart - BarVO / IntervalGeometry | Funnel 复用 Bar/Interval 路径，corner radius、stack rounding、cached shape 可能影响非 Funnel 图表 | P0 |
| Chart Layout / Label Layout | Funnel 多次 layoutText pass 下只应使用最终 transform 计算 label，风险为 label 重复、丢失、偏移 | P0 |
| Chart Hover / Tooltip / Selection | SVG annotation 使用 row/col 将 label 与 bar 配对，风险为 hover dim、tooltip、selection 错位 | P0 |
| Export / SVG Animation | SVG label annotation 和 animation 注入逻辑变化，风险为导出锯齿、label opacity、页面与导出不一致 | P1 |
| Coordinate Transform | Horizontal Funnel、Swap XY、宽高比变化依赖 transform，风险为 shape 反向、排序错误或 edge 不连接 | P1 |
| Chart Axis / Facet Axis | Funnel 线性值轴 label 被隐藏，轴线颜色从 top/x axis 继承；facet 下可能出现 panel 轴线颜色不一致 | P1 |
| Chart Binding / Plot Options UI | Funnel 对 Y 区域、Secondary Y、Swap XY、Bar Corner Radius、Round All Corners、Stack Values、Trend Line/Target Line 有特殊限制 | P1 |
| Inline SVG Directive | bar-label row/col 配对依赖前后端 annotation，split/tile 场景依赖 `inetsoft-dim-all` 同步 dim | P1 |
| Dashboard Interactions | Filter、brush、zoom、exclude、resize、enlarge 会触发重绘，风险为 cached shape 残留 | P1 |
| Existing Chart Styles | 普通 Bar、Stack Bar、Interval、Waterfall 与 Funnel 共用部分 geometry/layout 代码，需回归无行为变化 | P1 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75528 | 基础 Funnel 渲染/漏斗视觉效果相关问题 | open|
| #75533 | 基础 Funnel 渲染/漏斗视觉效果相关问题 | open |
| #75530 | Hover/选中时 highlight 区域与实际 Funnel section 不匹配 | open |
| #75529 | Funnel 导出结果存在锯齿或与页面预览不一致 | open|
| #75535 | 有些有gap有些没有 | open |
