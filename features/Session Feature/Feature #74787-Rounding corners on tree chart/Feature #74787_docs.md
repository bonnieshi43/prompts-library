---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Viewer
Feature_id: "74787"
Feature: Rounding corners on tree chart nodes
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3615
Assignee: Franky Pan
last_updated: 2026-05-15
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：为树形图（Tree Chart）的节点形状增加圆角支持。用户可通过 Plot Options 面板中的 Node Corner Radius 输入控件调整圆角半径（范围 `[0, 0.5]`），使节点从直角矩形变为圆角矩形乃至近似药丸形；同时支持通过 Script（`chart.nodeCornerRadius`）程序化控制。

**用户价值**：提升树形图的视觉美观性与可定制性，与已有 Bar Chart 圆角功能保持产品能力对齐，满足客户对节点样式个性化的需求。

---

# 2 Test Focus

## P0 - Core Path

- 新建 Tree Chart 默认圆角值（0.3）正确渲染
- UI 调整 Node Corner Radius 值后节点形状实时变化
- 保存后重新打开，圆角值与渲染一致（序列化往返）
- 旧版已保存 Tree Chart（XML 无 `nodeCornerRadius` 属性）加载后节点保持直角（兼容性）

## P1 - Functional Path

- 边界值输入：0、0.5、负值、超 0.5 值、非数字字符的拦截与提示
- Script 设置 `nodeCornerRadius` 与 UI 设置效果一致
- 图表类型切换（Tree → 其他 → Tree）时控件可见性与值隔离
- Bar Chart 的 `barCornerRadius` 功能不受 CSS 类名变更影响（回归）
- 导出为 PDF / PNG 时节点圆角与界面一致
- Node Corner Radius 控件仅在 Tree Chart 类型下可见

## P2 - Extended Path （按需测试）

- 大型树形图（100+ 节点）启用圆角时的渲染性能
- Print Layout / Mobile 下的圆角显示
- 圆角后节点文本（text）显示是否正常（Bug #74991 关注点）
- 圆角后节点 highlight / 选中状态样式
- 多语言环境下"Node Corner Radius"标签的翻译完整性

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 新建 Tree Chart 默认圆角验证 | 1. 新建 Viewsheet，拖入数据源创建 Tree Chart<br>2. 不修改任何 Plot Options<br>3. 观察节点形状<br>4. 打开 Plot Options → 查看 Node Corner Radius 值 | 节点显示为圆角矩形；Plot Options 中 Node Corner Radius 值为 0.3 | | 来源：分析MD Scenario 1 🔴 结果匹配；风险：DEFAULT_NODE_CORNER_RADIUS = 0.3 默认值是否生效 |
| TC-2 | 旧版 Tree Chart 加载兼容性 | 1. 准备一份旧版 Tree Chart（XML 中无 `nodeCornerRadius` 属性）<br>2. 在升级后环境中加载<br>3. 观察节点形状<br>4. 打开 Plot Options → 查看 Node Corner Radius 值 | 节点保持直角；Plot Options 中 Node Corner Radius 输入框为空（null/0）| | 来源：分析MD Scenario 2 🔴 结果匹配；风险：parseXML 缺失属性时强制赋 0 的兼容逻辑；双默认值机制 |
| TC-3 | UI 调整圆角值 → 保存 → 重新打开 | 1. 打开 Tree Chart，进入 Plot Options<br>2. 将 Node Corner Radius 设为 0.4，确认<br>3. 观察节点形状<br>4. 保存 Viewsheet，关闭后重新打开<br>5. 查看节点形状与 Plot Options 值 | 两次打开节点圆角一致，Plot Options 值为 0.4；节点视觉形状与值匹配 | | 来源：分析MD Scenario 3 🔴 结果匹配；风险：XML writeXML/parseXML 往返正确性 |
| **P1** | | | | | |
| TC-4 | 边界值与错误提示验证 | 1. 打开 Tree Chart Plot Options<br>2. 输入 -0.1 → 观察提示<br>3. 输入 0.6 → 观察提示<br>4. 输入 "abc" → 观察提示<br>5. 输入 0 → 观察节点形状<br>6. 输入 0.5 → 观察节点形状 | -0.1 和 0.6 显示 `nodeCornerRadius.rangeWarning`；"abc" 被浮点验证拦截；0 时节点为直角（UI 显示空）；0.5 时节点接近药丸形 | | 来源：分析MD Scenario 4 🔴 结果匹配；风险：前端 Validator + 后端 clamp 逻辑一致性 |
| TC-5 | Script 控制节点圆角（⚠️ 存在 Bug #74988）| 1. 打开 Tree Chart，进入 Script 编辑器<br>2. 执行 `chart.nodeCornerRadius = 0.4`<br>3. 观察节点形状<br>4. 打开 Plot Options，确认显示值<br>5. Script 改为 0，再次观察 | Script 设置 0.4 后节点显示圆角，Plot Options 同步 0.4；设置 0 后节点恢复直角 | | 来源：分析MD Scenario 5 🔴 发现 Bug #74988（barCornerRadius script 未在 tree chart 生效）；需关联 Bug 修复后回归 |
| TC-6 | 图表类型切换时控件可见性与值隔离 | 1. 创建 Tree Chart，设置 Node Corner Radius = 0.4<br>2. 切换图表类型为 Bar Chart<br>3. 打开 Plot Options → 确认 Node Corner Radius 控件不可见<br>4. 切换回 Tree Chart<br>5. 打开 Plot Options → 确认 Node Corner Radius 值 | Bar Chart 下控件不可见；切换回 Tree Chart 后值仍为 0.4（或合理默认值）；Bar Chart 节点不受 `nodeCornerRadius` 影响 | | 来源：分析MD Scenario 6 🔴 结果正确；风险：nodeCornerRadiusVisible 条件判断；属性隔离 |
| TC-7 | Bar Chart 圆角回归（CSS 类名变更影响）| 1. 创建 Bar Chart<br>2. 打开 Plot Options<br>3. 确认 Bar Corner Radius 输入框正常显示<br>4. 调整值后确认节点样式变化<br>5. 检查 `.corner-radius` CSS 样式在两个输入框上均正确应用 | Bar Chart 的 Bar Corner Radius 输入框显示及交互无异常；CSS 样式渲染正确 | | 来源：分析MD 回归测试；风险：`.bar-corner-radius` → `.corner-radius` 类名变更影响已有功能 |
| TC-8 | 导出场景圆角一致性 | 1. 创建 Tree Chart，设置 Node Corner Radius = 0.3<br>2. 导出为 PDF，检查节点形状<br>3. 导出为 PNG，检查节点形状<br>4. 与界面预览对比 | PDF 和 PNG 中节点圆角形状与界面一致，不出现直角退化 | | 来源：分析MD Scenario 7 🔴 导出一致；风险：Java 端 RelationVO.paint() 与前端渲染路径一致性 |
| **P2** | | | | | |
| TC-9 | 大型树形图渲染性能 | 1. 创建含 100+ 节点的 Tree Chart<br>2. 启用圆角（0.3），观察渲染帧率<br>3. 与关闭圆角（0）对比 | 圆角开启时渲染性能无明显降级，帧率可接受 | | 来源：分析MD 性能测试；风险：RelationVO.paint() 中每帧重建 RoundRectangle2D |
| TC-10 | Print Layout / Mobile 圆角显示 | 1. 创建设置了圆角的 Tree Chart<br>2. 切换至 Print Layout 预览<br>3. 在 Mobile 模式下查看 | Print Layout 和 Mobile 模式下节点圆角正常显示 | | 来源：分析MD 未覆盖内容第 4 条 |
| TC-11 | 圆角后节点文本显示 | 1. 创建含文本标签的 Tree Chart<br>2. 设置圆角值（0.3、0.5）<br>3. 检查节点内文本截断、位置、溢出情况 | 节点文本显示完整，无异常截断或溢出 | | 来源：分析MD 未覆盖内容第 1 条；关联 Bug #74991 |
| TC-12 | 圆角后节点 highlight / 选中状态 | 1. 创建 Tree Chart，设置圆角<br>2. 点击/悬停节点，触发 highlight 和选中状态<br>3. 观察高亮和选中样式 | Highlight 和选中状态样式与圆角形状适配，无直角残留 | | 来源：分析MD 未覆盖内容第 2、3 条 |

---

# 4 Special Testing

## Security
不涉及。

## Performance
见 TC-9：100+ 节点树形图启用圆角时的渲染帧率对比测试。
关注点：`RelationVO.paint()` 中每次绘制均重新创建 `RoundRectangle2D` 实例，大量节点场景下需确认无性能瓶颈。

## Compatibility
- **旧数据兼容**（TC-2）：升级前保存的 Tree Chart（XML 无 `nodeCornerRadius` 属性）加载后节点保持直角。
- **双默认值策略**：新建图表默认 0.3，旧 XML 解析默认 0，需分别验证。

## 本地化
- "Node Corner Radius" 标签已在 `srinter.properties` 添加英文，需验证其他支持语言（中文、日文等）Locale 文件是否有对应翻译资源，避免 fallback 显示英文 key。

## Script
见 TC-5：通过 `chart.nodeCornerRadius` Script 属性控制节点圆角，验证与 UI 设置效果一致。
⚠️ 当前关联 Bug #74988（barCornerRadius script 在 Tree Chart 中未生效），TC-5 需在 Bug 修复后回归验证。

## 文档/API
- `nodeCornerRadius` 属于超出原始需求的 Script 能力扩展，需确认是否纳入产品文档/API 文档说明。

## 配置检查
- 确认 `PlotDescriptor` 的 XML 属性名 `nodeCornerRadius` 与 Script 暴露属性名一致。
- 确认 `fieldset` 在 Angular 模板中的 DOM 结构正确，`nodeCornerRadius` 输入框被正确包裹（风险：diff 中存在缩进异常，可能导致在非 Tree Chart 类型时显示/隐藏行为异常）。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响描述 | 优先级 |
|---|---|---|
| Chart - Bar Chart | CSS 类名 `.bar-corner-radius` 重命名为 `.corner-radius`，需回归 Bar Corner Radius 输入框样式与交互（TC-7）| P1 |
| Chart - Plot Options UI | `fieldset` 的 `*ngIf` 条件变更（新增 `nodeCornerRadiusVisible`），需验证 Bar/Tree 以外图表类型的 Plot Options 面板显示无异常 | P1 |
| Chart - Script | `ChartProcessor` 中新增 Script 属性注册，需确认非 Tree Chart 类型下 `nodeCornerRadius` 属性不被暴露或设置无效 | P1 |
| Export（PDF/Image）| `RelationVO.paint()` 渲染路径改动，需验证导出结果与界面一致（TC-8）| P1 |
| Dashboard / Viewer | Tree Chart 嵌入 Dashboard 时圆角渲染正常 | P2 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #74988 | `<Epic #74519-Feature #74787>` barCornerRadius script 在 Tree Chart 中未生效（nodeCornerRadius script 属性未正确应用到渲染层） | New（2026-05-15）|
| #74991 | 圆角后 Tree Chart 节点文本（text）显示异常 | 待确认（来源：分析MD 未覆盖内容，需进一步复现）|