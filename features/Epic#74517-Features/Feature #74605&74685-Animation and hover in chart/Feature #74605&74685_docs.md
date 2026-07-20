---

doc_type: feature-test-doc
product: StyleBI
module: Chart Viewer / Rendering
Feature_id: "74605 & 74685"
Feature: Add animation support for more graph types / Add animation and hover support for network and circle packing
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3474, https://github.com/inetsoft-technology/stylebi/pull/3529
Assignee: Stephen Webster
last_updated: 2026-07-15
version: stylebi-1.2.0

---

# 1 Feature Summary

**核心目标**：两个 Feature 本质上是同一套"图表入场动画 + hover 高亮"能力的分阶段滚动上线。Feature #74605 覆盖 boxplot、candle、marimekko、icicle、radar、treemap 六种类型；Feature #74685 在此基础上继续覆盖 network(力导向)与 circle packing 两种类型。二者共同的目的都是消除"部分图表类型有动画、部分没有"的体验割裂感。
**用户价值**：hover 时相关系列/节点高亮、其余变暗，配合入场动画，提升数据探索时的可读性与产品整体视觉一致性。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

核心功能
- Feature #74605 的 6 种类型(boxplot/candle/marimekko/icicle/radar/treemap)与 Feature #74685 的 4 种类型(network/tree/circular/circle packing)加载时入场动画正确触发
- hover 时目标高亮、其余变暗
- 设计时不触发动画重放，运行时正常触发
- 系统属性 `graph.svg.inline` 必须设置为 `true` 时功能才能生效

## P1 - Functional Path

- 边界情况：Sunburst/Stock(OHLC)/Tree/Circular 隐式覆盖验证；Boxplot 填充色视觉变化确认；Radar facet 跨面板串扰；力导向布局动画顺序的已知局限
- 异常输入：Marimekko 相邻 cell 坐标碰撞时动画仍正确显示；混合类型图表动画分支优先级；异常拓扑数据下的稳定性
- 多对象交互：Icicle/Treemap/Mekko 标签正确匹配对应格子；Network 图节点/边 hover 高亮；Circle Packing 父子级联 hover 正确性；设计时抑制动画、运行时保留动画
- UI状态变化：Chart Binding Editor 打开不再崩溃（NPE修复回归）

## P2 - Extended Path （按需测试）

- 性能：设计时动画抑制避免重复播放导致的性能问题；力导向 Network 图含大量节点时的动画性能表现
- 兼容性：移动端/触屏 hover 行为；3D Bar/3D Pie 确认无动画；导出/打印路径视觉回归
- 安全：无相关安全风险

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-0 | graph.svg.inline 属性未开启时的降级表现 | 1. EM 系统属性 `graph.svg.inline` 设为 `false`；2. 打开任意含本报告涉及图表类型的 Viewsheet | 图表正常显示为静态图片，无动画、无 hover 高亮，不报错 | 符合预期 | 来源：分析MD-场景0 |
| TC-1 | Feature #74605 新增图表类型入场动画基础验证 | 1. 在 Viewer 中新建/刷新 boxplot、candle、marimekko、icicle、radar、treemap 图表类型的 Viewsheet 页面 | 元素按类型专属方式平滑呈现，无闪烁或错位 | Bug #75643 | 来源：分析MD-场景1 |
| TC-10 | Network(力导向)图表入场动画与 hover | 1. 创建 Network 图并加载；2. 悬停任意节点 | hover 高亮该节点直接相连的边与对端节点，其余变暗 | 符合预期 | 来源：分析MD-场景10 |
| TC-13 | Circle Packing 当前状态确认（历史遗留项闭环） | 1. 创建 Circle Packing 图表并加载；2. 悬停任意嵌套圆圈及标签；3. 悬停外层父级圆圈，观察内部子级圆圈是否一并高亮 | 外层大圆先淡入，内层嵌套圆随后淡入；hover 时圆圈与标签同步高亮；悬停父级圆圈时内部子级圆圈应同步保持高亮 | Bug #75639 | 来源：分析MD-场景13 |
| TC-17 | 设计时抑制动画、运行时保留动画（高优先级） | 1. 在 Composer 画布中反复调整任一动画图表的绑定；2. 在 Chart Binding Editor 中打开同一图表；3. 进入 Wizard 编辑该图表；4. 点击 Composer 顶层的"Preview"按钮；5. 在真实 Viewer 中查看同一图表 | 步骤1、2、3不触发/不重放入场动画，hover 仍正常工作；步骤4、5正常播放入场动画 | 符合预期 | 来源：分析MD-场景17 |
| **P1** |
| TC-2 | Sunburst 加载动画（需求遗漏项） | 1. 创建 Sunburst 图表并加载；2. 悬停内圈的父级 arc，观察外圈子级 arc 是否一并高亮 | 按环层(root→leaf)顺序依次淡入；悬停父级 arc 时子级 arc 应同步保持高亮 | 符合预期（动画部分；父子级联 hover 待补测） | 来源：分析MD-场景2 |
| TC-3 | Stock(OHLC)图表动画复用验证（需求遗漏项） | 1. 创建 Stock 图表并加载 | 呈现与 Candle 相同风格的按位置交错淡入动画 | 符合预期 | 来源：分析MD-场景3 |
| TC-4 | Boxplot 视觉外观回归（填充色变化） | 1. 创建含多个系列的 Boxplot 图表并渲染；2. 与变更前版本截图对比 | 填充色与产品确认结果一致（箱体内部改为系列色填充） | 符合预期 | 来源：分析MD-场景4 |
| TC-5 | Icicle/Treemap/Mekko 标签正确匹配对应格子 | 1. 构造标签中心点略微偏出格子边界的数据；2. 悬停该标签 | 标签仍关联并高亮视觉上最接近的格子 | 符合预期 | 来源：分析MD-场景5 |
| TC-6 | Radar 单面板 hover 高亮 | 1. 依次悬停多边形内部区域与顶点圆点 | 悬停多边形时其余多边形与顶点均变暗；悬停顶点时仅其余顶点变暗（非对称设计） | Bug #75642 | 来源：分析MD-场景6 |
| TC-7 | Radar Facet 跨面板 hover 串扰（已知限制） | 1. 使用分面维度创建多面板 Radar 图；2. 在其中一个面板悬停某系列 | 当前行为为跨面板同 data-row 序号的系列也会变暗（已知限制，非崩溃） | 符合预期 | 来源：分析MD-场景7 |
| TC-8 | Marimekko 相邻 cell 坐标碰撞时动画仍正确显示 | 1. 构造两个同列 cell 高度差在亚像素范围内的数据 | 两个 cell 均正常显示入场动画（已由单元测试覆盖，无需手工执行） | 符合预期 | 来源：分析MD-场景8 |
| TC-9 | 混合类型图表动画分支优先级 | 1. 创建 Candle 图表并额外绑定 Point 标记系列 | 整体呈现 Candle 专属动画 | 符合预期 | 来源：分析MD-场景9 |
| TC-11 | 力导向布局动画顺序的已知局限确认 | 1. 创建含 20+ 节点的力导向 Network 图并加载 | 整体呈现平滑交错淡入，无突兀跳动 | 符合预期 | 来源：分析MD-场景11 |
| TC-12 | Tree 与 Circular 图表显式验证（需求遗漏项） | 1. 分别创建 Tree 图与 Circular 图并加载、悬停任意节点；2. 在 Tree 图中悬停一个有子节点的父级节点，观察其下子级节点是否一并高亮 | 均按"深度带"root-first 顺序淡入，hover 高亮关联节点/边；悬停父级节点时其子级节点应同步高亮 | 符合预期（父子级联 hover 正常） | 来源：分析MD-场景12 |
| TC-14 | 异常拓扑数据下的稳定性 | 1. 构造含孤立节点的 Network 图数据并加载 | 正常渲染，孤立节点仍有入场动画，不抛异常 | 未测试 | 来源：分析MD-场景14 |
| TC-15 | 既有 Bar/Point 图表 hover 时长变化确认 | 1. 悬停既有 Bar 图和 Point 图的数据点 | hover 渐变时长/曲线与产品确认结果一致（由 .15s 变为 .2s ease） | 符合预期 | 来源：分析MD-场景15 |
| TC-16 | 3D Bar / 3D Pie 确认无动画（回归 PR #3675） | 1. 创建 3D Bar 图与 3D Pie 图并加载、悬停 | 图表静态呈现，无 `data-animated` 属性，hover 无高亮/变暗效果 | remove了不存在3d bar/pie | 来源：分析MD-场景16 |
| TC-18 | Chart Binding Editor 打开不再崩溃（NPE修复回归） | 1. 创建未绑定任何 color/shape/size aesthetic 的图表；2. 打开其 Binding Editor | 面板正常打开，不报错 | 符合预期 | 来源：分析MD-场景18 |
| TC-19 | Gantt Milestone 动画与 Bar 动画顺序（独立 Bug #75442） | 1. 创建含里程碑标记的 Gantt 图表并加载 | bar 先播放生长动画，milestone marker/标签随后淡入，无重叠 | 符合预期 | 来源：分析MD-场景19（独立Bug，纳入回归范围） |
| **P2** |
| TC-20 | 明确排除类型确认不触发动画 | 1. 创建 Map 图表并加载；2. 若 Parabox 当前无法从图表 UI 创建，则标记为 N/A | Map 图表静态渲染、无动画伪影；Parabox 标记 N/A | 符合预期 | 来源：分析MD-场景20 |
| TC-21 | 导出/打印路径视觉回归 | 1. 对 boxplot/candle/marimekko/icicle/radar/treemap/network/circle-packing/gantt 各导出一次 PDF 与 Image | 导出结果为动画完成后的最终稳态视觉，无异常残留 | 符合预期 | 来源：分析MD-场景21 |
| TC-22 | 移动端/触屏 hover 行为 | 1. 在移动端浏览器打开任一动画图表；2. 触摸后离开该元素区域 | 触摸结束后视觉状态恢复正常，无残留 dim 效果 | 符合预期 | 来源：分析MD-场景22 |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security

无相关安全风险

## Performance

- 设计时动画抑制（PR #4210）避免重复播放导致的性能问题
- 力导向 Network 图含大量节点时的动画性能表现

## Compatibility

- 移动端：hover 依赖 CSS `:hover` 与 `:has()` 选择器，触屏设备可能出现变暗残留或高亮静默失效

## 本地化

无 UI 文本新增/变更，不适用

## script

动画为纯服务端 SVG 注入 + 前端 CSS，未新增 Script 可绑定项；需验证通过 Viewsheet 脚本动态切换 chart type 后，新生成 SVG 的动画类型判定依然正确响应

## 文档/API

若 Boxplot 视觉变更确认为有意为之，建议同步更新相关文档截图

## 配置检查

强依赖已有属性 `graph.svg.inline`（默认 `false`）。测试前必须确认已设为 `true`，否则整个功能面不可测

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- Chart Viewer 渲染（SVG内联指令）
- Composer 画布
- Chart Binding Editor
- 可视化向导（Wizard）
- Viewer 运行时
- Embed 嵌入
- Export/Print（PDF/Excel/Image导出静态状态）
- Mobile/小屏浏览

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75643 | Feature #74605 新增图表类型入场动画基础验证失败 | New |
| #75642 | Radar 单面板 hover 高亮失败 | New |
| #75639 | Circle Packing 悬停外层父级圆圈时，内部嵌套子级圆圈未一并高亮，被当作"其他元素"变暗——与场景12中Tree图父子级联正常的表现不一致 | New |
| #75442 | Gantt Milestone 动画（独立Bug，纳入回归范围） | Fixed |

---