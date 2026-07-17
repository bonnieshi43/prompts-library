# StyleBI 图表动画与Hover功能 — 测试分析报告

> 覆盖 **Feature #74605**(PR #3474,"Add animation support for more graph types")与 **Feature #74685**(PR #3529,"Add animation and hover support for network and circle packing")两个平级 Feature,以及影响二者的共享基础设施变更(Bug #75442、PR #3675、PR #4210)。二者共用同一套底层动画注入机制(`SVGAnimationDOMInjector` + `VGraphPair.applyAnimationHint` + `chart-inline-svg.directive.ts`),故合并为一份整体分析,而非拆分成独立章节。

## ⚠️ 前提条件(测试前必读)

**系统属性 `graph.svg.inline` 必须设置为 `true`,本报告涉及的全部内容才具备可测性。**

该属性默认值为 `false`。为 `false` 时,图表以传统静态 `<img>`(PNG)方式渲染,SVG 不会内联进页面 DOM,本报告涉及的全部入场动画与 hover 高亮(包括两个 Feature 新增的全部类型,以及此前 bar/line/area/point/pie 已有的动画)**都不会出现**——不是某个类型没做,而是整条功能链路被跳过。测试前请先在 EM 系统属性中确认 `graph.svg.inline=true` 已配置,否则会误判为大面积功能缺失。

## Input Validation(输入完整性说明)

- **PR diff**:已完整读取 PR #3474 全部 6 轮 code review 及最终 diff(`e1b043ba7`),以及 PR #3529、#4027、#3675、#4210 的 diff(通过 `git show` 直接读取源码变更)。
- **Knowledge 文档**:已读取 `claude/chart.md`(图表引擎架构)。
- **Ticket 归属**:PR #3474 → Feature #74605;PR #3529 → **Feature #74685**(与 #74605 平级独立,非其子任务或延伸修复);PR #4027 → **Bug #75442**;PR #3675、PR #4210 的 commit 标题未包含 Redmine ticket 号,归属未知,建议提交前在 Redmine 核实。

---

## 第一部分:Requirement Summary(需求概要)

- **核心目标**:两个 Feature 本质上是同一套"图表入场动画 + hover 高亮"能力的分阶段滚动上线。Feature #74605 覆盖 boxplot、candle、marimekko、icicle、radar、treemap 六种类型;Feature #74685 在此基础上继续覆盖 network(力导向)与 circle packing 两种类型。二者共同的目的都是消除"部分图表类型有动画、部分没有"的体验割裂感。
- **用户价值**:hover 时相关系列/节点高亮、其余变暗,配合入场动画,提升数据探索时的可读性与产品整体视觉一致性。
- **Feature 类型**:两者均为 Rendering(SVG 动画注入)+ UI(Angular hover 交互)。
- **需求范围边界**:Gantt milestone 动画属于**独立 Bug #75442**,不属于这两个 Feature 中的任何一个,但复用同一套基础设施,故一并纳入本报告的回归范围。

---

## 第二部分:Implementation Change(变更分析)

### 核心变更(两个 PR 共同构成的技术方案)

- `SVGAnimationDOMInjector.java`:PR #3474 新增 8 个 `inject*Animation` 方法(treemap/sunburst/icicle 共用 `applyAnimStyleToChildren`,candle/box 共用 `injectXPositionFadeAnimation`,mekko/radar 各自独立实现);PR #3529 在此基础上继续新增 `injectRelationAnimation`(network/tree/circular 共用)与 `injectCirclePackingAnimation`,并把重复的整数样式表由 `Map<Integer,String>` 优化为 `List<String>`。
- `VGraphPair.applyAnimationHint` 判定链:两个 PR 各自新增对应的 `hasXxxVO` 检查(`hasTreemapVO`/`hasSunburstVO`/`hasIcicleVO`/`hasMekkoVO`/`hasCandleSchemaVO`/`hasBoxSchemaVO`/`hasRadarCoord` 来自 #74605;`hasRelationVO`/`hasCirclePackingVO` 来自 #74685),决定图表最终打哪个 `ANIMATION_KEY`。
- `RelationVO`/`RelationEdgeVO`(#74685 新增):节点标注 `data-row`/`data-col`/`data-node-id`(取自 mxGraph `mxCell` ID),边标注 `data-row`/`data-source`/`data-target`。这是比 #74605 里 treemap 系"最近邻坐标匹配"更精确的关联方式——直接用图结构节点 ID 匹配,不依赖坐标估算。
- `BoxPainter.paint`(#74605):去掉箱体内部的白色填充,改为系列色直接填充(**PR 描述未提及此为有意的视觉变更**)。
- `chart-inline-svg.directive.ts`:两个 PR 均扩展了 hover 逻辑,`barLabelMap` 字段被复用于 treemap/mekko/relation 多种标签(命名遗留,非功能问题)。
- 新增 `SVGAnimationDOMInjectorTest.java`,#74605 引入 741 行/15 用例,#74685 在此基础上继续补充 relation/circle-packing 相关用例。

### 目标覆盖度(需求 vs 实现,两个 Feature 合并对照)

| 图表类型 | 所属 Ticket | 需求文本是否列出 | 是否实现 | 备注 |
|---|---|---|---|---|
| Boxplot | #74605 | ✓ | ✓ | |
| Candle | #74605 | ✓ | ✓ | 与 Stock 共用同一动画分支 |
| Marimekko | #74605 | ✓ | ✓ | |
| Icicle | #74605 | ✓ | ✓ | |
| Radar | #74605 | ✓ | ✓ | facet 多面板有已知局限(见风险) |
| Treemap | #74605 | ✓ | ✓ | |
| **Sunburst** | #74605 | ✗ 需求遗漏 | ✓ 隐式实现 | 与 Treemap/Icicle 共用 `TreemapVO` 体系 |
| **Stock (OHLC)** | #74605 | ✗ 需求遗漏 | ✓ 副作用覆盖 | `SchemaVO.isBoxPlot()` 不区分 `StockPainter`/`CandlePainter` |
| Circle Packing | #74685 | ✓ | ✓ | #74605 阶段曾被明确排除(out of scope),由 #74685 补齐 |
| Network | #74685 | ✓ | ✓ | 力导向布局下动画顺序有已知局限(见风险) |
| **Tree** | #74685 | ✗ 标题未列,PR commit 描述列出 | ✓ | 与 Sunburst 同一模式:标题窄于实现 |
| **Circular** | #74685 | ✗ 标题与 commit 描述均未提及 | ✓ 隐式覆盖 | `hasRelationVO` 不区分布局算法而被动获得,风险最高的遗漏项 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk | 影响范围 |
|---|---|---|---|
| 上述类型加载图表时静态呈现,无入场动画 | 加载时按类型专属的方式播放入场动画(淡入/生长/交错延迟) | Rendering — 首次加载视觉变化 | #74605 + #74685 |
| Bar/Point 的 hover 渐变时长为 `.15s` | 统一为 `.2s ease`,覆盖全部新旧类型 | Rendering — 既有功能被静默改变 | 全部类型(#74605 引入的变更,影响范围含 #74685) |
| Boxplot 箱体内部固定为白色填充 | 箱体内部改为系列色填充 | Rendering — 未声明的视觉变更 | #74605 |
| Radar 无 hover/动画能力 | 支持,但 facet 场景 hover 基于全局重编号的 `data-row`,可能跨面板误触发 | Functional — 已知局限 | #74605 |
| Network/Tree/Circular/Circle Packing 无动画 | 按"深度带"/面积排序交错淡入,hover 基于图结构 ID 精确匹配 | Functional — 力导向/水平树排序假设不成立(见风险) | #74685 |
| 3D Bar、3D Pie 曾短暂获得动画 | 由 PR #3675 明确移除 | Functional — 回归风险 | #74605 |
| 设计态(Composer/Wizard/Binding Editor)会重复播放入场动画 | 由 PR #4210 抑制为仅运行态播放;附带修复一处 NPE | Cross-Module — 影响全部类型 | #74605 + #74685 |
| Gantt 图无里程碑动画 | 由 Bug #75442 补充 milestone 延迟淡入 | Functional | 独立 Bug,不属于任一 Feature |

---

## 第三部分:Risk Identification(风险识别)

1. **Rendering / 向后兼容性** — Boxplot 箱体填充色从白色变为系列色,是否为预期设计需与产品确认。
2. **Rendering / 向后兼容性** — Bar/Point 既有 hover 过渡时长从 `.15s` 变为 `.2s ease`,属于静默的既有功能行为变化,影响全部图表类型(不限于新增类型)。
3. **Functional / 边界情况** — Radar facet(多面板)图表 hover 时,`data-row` 全局重编号导致跨面板 series 误变暗。
4. **Functional / 布局依赖** — Network/Tree 的"深度带"排序假设仅对纵向树布局成立,力导向网络图与水平 COMPACT_TREE 布局的动画顺序可能不符合直觉,这是代码注释里明确承认的已知局限。
5. **Functional / 需求覆盖** — Tree、Circular 不在 Feature #74685 标题中(Circular 连 PR commit 描述都未提及),若仅按标题字面验收会漏测。
6. **Functional / 回归风险** — 3D Bar、3D Pie 曾短暂获得动画(PR 74518),后被 #3675 明确移除,需验证当前确实不触发。
7. **Cross-Module(高优先级)** — 设计时 vs 运行时的动画抑制逻辑(#4210)对两个 Feature 的全部类型统一生效,一旦出问题是全局性缺陷。该改动附带修复了一处导致 Chart Binding Editor 崩溃的 NPE,需纳入回归。
8. **Functional / 优先级判定** — 混合类型图表的动画分支判定存在显式优先级依赖(candle/box 先于 point,pie 先于 radar),叠加系列可能命中错误分支。
9. **Data Consistency / 边界情况** — Mekko 图表中多个 cell 的 y-top 四舍五入到同一像素值时,共享同一动画延迟(非崩溃,需确认为既定行为)。
10. **Cross-Module / 边界情况** — Network 图节点/边通过 `mxCell` ID 匹配,若存在 source/target 缺失的异常拓扑数据,动画标注会被跳过,需验证不报错。
11. **Rendering / Export** — 所有动画类型导出为 PDF/Excel/Image 时,需验证不残留动画初始态(透明度未完成、位置未到位)。
12. **Compatibility** — hover 依赖 CSS `:hover` 与 `:has()` 选择器,移动端/触屏与旧浏览器可能出现变暗残留或高亮静默失效。
13. **Traceability** — Sunburst/Stock(#74605)与 Tree/Circular(#74685)均为"需求标题未列出但已实现"的隐式覆盖项,测试缺陷归档时容易挂错 ticket,需要在执行阶段特别注意。

---

## 第四部分:Test Design(测试策略设计)

- **核心验证点**:
  1. Feature #74605 的 8 种类型(boxplot/candle/marimekko/icicle/radar/treemap/sunburst/stock)与 Feature #74685 的 4 种类型(network/tree/circular/circle packing)加载时入场动画正确触发,hover 时目标高亮、其余变暗;
  2. 设计时不触发动画重放,运行时正常触发,且对全部 12 种类型一致生效;
  3. 明确应无动画的类型(3D Bar、3D Pie、Map/Map Contour、Parabox)确实不触发;
  4. Gantt milestone(Bug #75442)动画时序正确,但测试结果归档到独立 ticket,不与两个 Feature 混淆。

- **高风险路径**:Boxplot 视觉回归;Radar facet 跨面板串扰;Network 力导向/水平树动画顺序合理性;Tree/Circular 隐式覆盖漏测;设计时/运行时抑制边界;混合类型图表动画分支判定;导出路径动画残留。

- **涉及模块**:Composer 画布、Chart Binding Editor、可视化向导(Wizard)、Viewer 运行时、Embed 嵌入、Export/Print、Mobile/小屏浏览。

- **专项检查**:
  - **本地化**:无 UI 文本新增/变更,不适用。
  - **配置检查**:强依赖已有属性 `graph.svg.inline`(默认 `false`)。测试前必须确认已设为 `true`,否则整个功能面不可测。
  - **脚本兼容**:动画为纯服务端 SVG 注入 + 前端 CSS,未新增 Script 可绑定项;需验证通过 Viewsheet 脚本动态切换 chart type 后,新生成 SVG 的动画类型判定依然正确响应。
  - **文档一致性**:若 Boxplot 视觉变更确认为有意为之,建议同步更新相关文档截图。

- **Mobile 影响检查**:触屏设备/小屏幕下验证 hover 高亮不会产生残留的 `.inetsoft-active` 变暗状态。

- **Print Layout / Export 影响检查**:验证 PDF/Excel/Image 导出中所有动画类型外观正确,不残留动画初始态。

---

## 第五部分:Key Test Scenarios(核心测试场景)

**场景 0 — `graph.svg.inline` 属性未开启时的降级表现**
- Scenario Objective:验证该属性为 `false`(默认值)时,图表回退为静态图片,不出现动画或 hover 高亮,且无报错。
- Pre-condition:EM 系统属性 `graph.svg.inline` 设为 `false`。
- Key Steps:打开任意含本报告涉及图表类型的 Viewsheet。
- Expected Result:图表正常显示为静态图片,无动画、无 hover 高亮,不报错。
- Risk Covered:配置开关边界、误判风险。

🔴 **测试-分析**： 符合预期

后续场景均假定 `graph.svg.inline=true` 已开启。

**场景 1 — Feature #74605 新增图表类型入场动画基础验证**
- Scenario Objective:验证 boxplot、candle、marimekko、icicle、radar、treemap 图表首次加载时播放入场动画。
- Key Steps:在 Viewer 中新建/刷新对应图表类型的 Viewsheet 页面。
- Expected Result:元素按类型专属方式平滑呈现,无闪烁或错位。
- Risk Covered:默认行为变化、渲染。

🔴 **测试-分析**： Bug #75643

**场景 2 — Sunburst 加载动画(需求遗漏项)**
- Scenario Objective:验证 Sunburst 图表具备入场动画,与 Treemap/Icicle 一致。
- Key Steps:
  1. 创建 Sunburst 图表并加载;
  2. 用层级数据(如 reseller/state)悬停内圈的父级 arc(如 reseller),观察外圈落在其角度范围内的子级 arc(如 state)是否一并高亮。
- Expected Result:按环层(root→leaf)顺序依次淡入;步骤 2 中悬停父级 arc 时子级 arc 应同步保持高亮
- Risk Covered:需求遗漏、回归风险、父子级联 hover 正确性(待验证)。

🔴 **测试-分析**： 符合预期(动画部分;父子级联 hover 待补测)

**场景 3 — Stock(OHLC)图表动画复用验证(需求遗漏项)**
- Scenario Objective:验证 Stock 图表复用 Candle 动画效果,视觉合理。
- Key Steps:创建 Stock 图表并加载。
- Expected Result:呈现与 Candle 相同风格的按位置交错淡入动画。
- Risk Covered:隐式覆盖、需求不完整。

🔴 **测试-分析**： 符合预期

**场景 4 — Boxplot 视觉外观回归(填充色变化)**
- Scenario Objective:确认 Boxplot 箱体内部当前呈现为系列色填充而非传统白色,与产品预期一致。
- Pre-condition:与变更前版本(或设计稿)的截图对比。
- Key Steps:创建含多个系列的 Boxplot 图表并渲染。
- Expected Result:填充色与产品确认结果一致。
- Risk Covered:向后兼容性、未声明的视觉变更。

🔴 **测试-分析**： 符合预期

**场景 5 — Icicle/Treemap/Mekko 标签正确匹配对应格子**
- Scenario Objective:验证标签在动画/hover 时正确关联所属格子,包括标签定位略微超出边界的情况。
- Key Steps:构造标签中心点略微偏出格子边界的数据,悬停该标签。
- Expected Result:标签仍关联并高亮视觉上最接近的格子。
- Risk Covered:边界条件、数据一致性。

🔴 **测试-分析**： 符合预期

**场景 6 — Radar 单面板 hover 高亮**
- Scenario Objective:验证悬停 Radar 图某系列的多边形/顶点时,其余系列正确变暗。
- Key Steps:依次悬停多边形内部区域与顶点圆点。
- Expected Result:悬停多边形时其余多边形与顶点均变暗;悬停顶点时仅其余顶点变暗(已知的非对称设计)。
- Risk Covered:交互一致性、已记录的设计限制。

🔴 **测试-分析**： Bug #75642

**场景 7 — Radar Facet 跨面板 hover 串扰(已知限制)**
- Scenario Objective:验证多面板 Radar 图中悬停一个面板是否误使其他面板变暗。
- Pre-condition:使用分面维度创建多面板 Radar 图。
- Key Steps:在其中一个面板悬停某系列。
- Expected Result:当前行为为跨面板同 data-row 序号的系列也会变暗(已知限制,非崩溃)。
- Risk Covered:跨模块交互、已知缺陷追踪。

🔴 **测试-分析**： 符合预期

**场景 8 — Marimekko 相邻 cell 坐标碰撞时动画仍正确显示**
- Scenario Objective:验证多个 cell 顶部坐标四舍五入到同一像素值时,所有 cell 仍获得有效动画。
- Key Steps:构造两个同列 cell 高度差在亚像素范围内的数据。
- Expected Result:两个 cell 均正常显示入场动画。
- Risk Covered:边界条件、数据一致性。

📝 **备注**:该像素级碰撞取决于图表实际渲染尺寸下的浮点数舍入结果,无法通过业务数据可靠地手工构造,不适合作为手工/E2E 场景执行。该风险已由单元测试 `mekko_duplicateYtopDoesNotThrow`(`SVGAnimationDOMInjectorTest.java`)直接覆盖——测试中手工构造 y=10.0 与 y=10.4(均四舍五入为 10)两个像素坐标,绕过渲染管线直接验证两个 cell 均能正常获得动画样式。此场景保留仅作风险追溯用,无需手工执行。

**场景 9 — 混合类型图表动画分支优先级**
- Scenario Objective:验证 Candle 图叠加独立 Point 标记系列时,呈现 Candle 动画而非 Point 动画。
- Key Steps:创建 Candle 图表并额外绑定 Point 标记系列。
- Expected Result:整体呈现 Candle 专属动画。
- Risk Covered:跨模块交互、优先级判定错误。

🔴 **测试-分析**： 符合预期

**场景 10 — Network(力导向)图表入场动画与 hover(Feature #74685)**
- Scenario Objective:验证力导向 Network 图加载时节点与边正确淡入,hover 时高亮关联节点/边。
- Key Steps:创建 Network 图并加载,悬停任意节点。
- Expected Result:hover 高亮该节点直接相连的边与对端节点,其余变暗。
- Risk Covered:跨类型功能一致性。

🔴 **测试-分析**： 符合预期

**场景 11 — 力导向布局动画顺序的已知局限确认(Feature #74685)**
- Scenario Objective:验证力导向 Network 图的入场动画顺序即便不严格按层级,也不产生明显违反直觉的跳跃感。
- Scenario Description:这是代码注释里承认的已知局限,需显式验证并归档为已知限制,而非当作新缺陷反复提交。
- Key Steps:创建含 20+ 节点的力导向 Network 图并加载。
- Expected Result:整体呈现平滑交错淡入,无突兀跳动。
- Risk Covered:布局不确定性、已知缺陷追踪。

🔴 **测试-分析**： 符合预期

**场景 12 — Tree 与 Circular 图表显式验证(需求遗漏项,Feature #74685)**
- Scenario Objective:显式验证 Tree(层级树)与 Circular 布局均具备入场动画与 hover 高亮,不能因标题未提及而漏测。
- Key Steps:
  1. 分别创建 Tree 图与 Circular 图并加载、悬停任意节点;
  2. 在 Tree 图中悬停一个有子节点的父级节点(如某维度值节点),观察其下子级节点(如 state)是否一并高亮。
- Expected Result:均按"深度带"root-first 顺序淡入,hover 高亮关联节点/边;步骤 2 中父级节点与其下子级节点应同步高亮、其余不相关节点变暗。
- Risk Covered:需求遗漏、验收范围偏差、父子级联 hover 正确性。

🔴 **测试-分析**： 符合预期(已验证:hover 父级节点 "false",其下子级 state 节点正确一并高亮)

**场景 13 — Circle Packing 当前状态确认(历史遗留项闭环,Feature #74685)**
- Scenario Objective:确认 Circle Packing 图表已具备入场动画(圆圈按面积从大到小交错淡入),而非停留在 #74605 阶段"out of scope"的结论。
- Key Steps:
  1. 创建 Circle Packing 图表并加载,悬停任意嵌套圆圈及标签;
  2. 用与场景 12 相同的层级数据(如 binding reseller 和 state),悬停外层较大的父级圆圈(如 reseller),观察其内部嵌套的子级圆圈(如 state)是否一并高亮,并与 Tree 图的父子级联表现做对比。
- Expected Result:外层大圆先淡入,内层嵌套圆随后淡入;hover 时圆圈与标签同步高亮;步骤 2 中悬停父级圆圈时,其内部子级圆圈应同步保持高亮、不应被当作"其他元素"变暗(对比场景 12,Tree 图的父子级联是符合预期的)。
- Risk Covered:需求追溯错误、工单归属错误、父子级联 hover 正确性。

🔴 **测试-分析**： Bug #75639(悬停外层父级圆圈时,内部嵌套子级圆圈未一并高亮,被当作"其他元素"变暗——与场景 12 中 Tree 图父子级联正常的表现不一致)

**场景 14 — 异常拓扑数据下的稳定性(Feature #74685)**
- Scenario Objective:验证含孤立节点或 source/target 缺失边的 Network 图不会导致动画注入报错。
- Key Steps:构造含孤立节点的 Network 图数据并加载。
- Expected Result:正常渲染,孤立节点仍有入场动画,不抛异常。
- Risk Covered:边界条件、数据一致性。

**场景 15 — 既有 Bar/Point 图表 hover 时长变化确认**
- Scenario Objective:确认 Bar/Point 图表 hover 渐变时长由 `.15s` 变为 `.2s ease` 后仍符合产品预期节奏。
- Key Steps:悬停既有 Bar 图和 Point 图的数据点。
- Expected Result:hover 渐变时长/曲线与产品确认结果一致。
- Risk Covered:既有功能回归、默认行为变化。

🔴 **测试-分析**： 符合预期

**场景 16 — 3D Bar / 3D Pie 确认无动画(回归 PR #3675)**
- Scenario Objective:验证已弃用的 3D Bar、3D Pie 图表确实不触发任何入场动画或 hover 效果。
- Key Steps:创建 3D Bar 图与 3D Pie 图并加载、悬停。
- Expected Result:图表静态呈现,无 `data-animated` 属性,hover 无高亮/变暗效果。
- Risk Covered:回归风险。

🔴 **测试-分析**： remove了不存在3d bar/pie

**场景 17 — 设计时抑制动画、运行时保留动画(来源 PR #4210,高优先级)**
- Scenario Objective:验证图表动画仅在运行时相关界面播放,设计类界面(含 Wizard 全部阶段)不重复播放,对全部 12 种类型一致生效。
- Key Steps:
  1. 在 Composer 画布中反复调整任一动画图表的绑定;
  2. 在 Chart Binding Editor 中打开同一图表;
  3. 进入 Wizard 编辑该图表,并切换到 **Wizard 自身的预览步骤**;
  4. 退出 Wizard,点击 Composer 顶层的 **"Preview"按钮**(打开运行时模拟视图,非 Wizard 内部预览);
  5. 在真实 Viewer 与 Embed 嵌入页面中查看同一图表。
- Expected Result:步骤 1、2、3(包括 Wizard 预览步骤)均不触发/不重放入场动画,hover 仍正常工作;步骤 4、5 正常播放入场动画。
- Risk Covered:跨模块交互、性能、默认行为变化、"preview"一词在两处含义相反导致的误判风险。

🔴 **测试-分析**： 符合预期

**场景 18 — Chart Binding Editor 打开不再崩溃(PR #4210 附带 NPE 修复回归)**
- Scenario Objective:验证含未绑定颜色/形状/大小美学字段的图表,打开 Binding Editor 不再抛出空指针异常。
- Key Steps:创建未绑定任何 color/shape/size aesthetic 的图表,打开其 Binding Editor。
- Expected Result:面板正常打开,不报错。
- Risk Covered:回归风险。

🔴 **测试-分析**： 符合预期

**场景 19 — Gantt Milestone 动画与 Bar 动画顺序(独立 Bug #75442)**
- Scenario Objective:验证 Gantt 图的里程碑标记与标签在主体 bar 动画完成后正确延迟淡入。
- Scenario Description:测试缺陷应挂在 Bug #75442 下归档,不与两个 Feature 混淆。
- Key Steps:创建含里程碑标记的 Gantt 图表并加载。
- Expected Result:bar 先播放生长动画,milestone marker/标签随后淡入,无重叠。
- Risk Covered:跨类型动画时序、独立 Bug 单的回归。

🔴 **测试-分析**： 符合预期

**场景 20 — 明确排除类型确认不触发动画**
- Scenario Objective:确认 Map/Map Contour 图表和 Parallel Box Plot(Parabox,若可从任何入口触达)不会意外触发动画或产生渲染异常。
- Key Steps:创建 Map 图表并加载;若 Parabox 当前无法从图表 UI 创建,则标记为 N/A。
- Expected Result:Map 图表静态渲染、无动画伪影;Parabox 标记 N/A,不作为遗漏追踪。
- Risk Covered:设计边界确认、避免误报缺陷。

🔴 **测试-分析**： 符合预期

**场景 21 — 导出/打印路径视觉回归**
- Scenario Objective:验证全部动画图表类型导出为 PDF/Excel/Image 或打印预览时,静态视觉正确,不残留动画初始态。
- Key Steps:对 boxplot/candle/marimekko/icicle/radar/treemap/network/circle-packing/gantt 各导出一次 PDF 与 Image。
- Expected Result:导出结果为动画完成后的最终稳态视觉,无异常残留。
- Risk Covered:跨模块(Export)、渲染一致性。

🔴 **测试-分析**： 符合预期

**场景 22 — 移动端/触屏 hover 行为**
- Scenario Objective:验证触屏设备触摸动画图表元素后,不会残留在"变暗/高亮"状态无法恢复。
- Key Steps:在移动端浏览器打开任一动画图表,触摸后离开该元素区域。
- Expected Result:触摸结束后视觉状态恢复正常,无残留 dim 效果。
- Risk Covered:兼容性、移动端交互。

🔴 **测试-分析**： 符合预期
