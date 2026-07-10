---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Interval (Waterfall)
Feature_id: 75007
Feature: Add bridge line for waterfall
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3695
Assignee: milotalon
last_updated: 2026-07-10
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：为 Interval 图（Waterfall 瀑布图）新增可通过脚本访问的"桥接线（Bridge Line）"能力（`setBridgeLine(Color, GLine)`），在相邻柱子之间绘制水平连接线，帮助用户直观看到累计值的延续关系。

**用户价值**：使用 Waterfall Chart 展示财务、库存等累计增减场景时，用户可以通过脚本一键开启桥接线，直观看到上一柱子顶部到下一柱子的延续关系，无需自行用 Annotation 或其它手段模拟连接效果。

**实现方式**：`IntervalElement` 新增 `bridgeLineColor`/`bridgeLineStyle` 字段及 `@TernMethod` 标注的 `setBridgeLine()`/`getBridgeLineColor()`/`getBridgeLineStyle()`；`createGeometry()` 中新增跨迭代状态追踪数组 `prevBridgeX`，配合 `addBridgeForm()` 辅助方法绘制桥接线，默认关闭（opt-in）。

---

# 2 Test Focus

## P0 - Core Path

- 脚本调用 `setBridgeLine(color, lineStyle)` 后，Waterfall 相邻柱子间正确显示水平连接线，颜色/线型符合设置
- `lineStyle` 为 `null` 时禁用桥接线（默认关闭状态回归，不影响既有瀑布图）
- 总计（Sum/Total）行前后桥接线绘制与截断：总计柱子前正确连接，总计柱子之后不产生桥接线
- 分组/分面瀑布图下 `prevBridgeX` 正确按 `groupIdx` 重置，桥接线不跨组连接
- 高圆角（`cornerRadius` 接近/超过 0.8）边界下桥接线的实际表现（已知退化为中心到中心连线，需记录而非默认判 Pass）
- 旧版本序列化 Viewsheet（未含 `bridgeLineStyle` 字段）加载后桥接线默认不显示，其余渲染与改动前一致

## P1 - Functional Path

- 翻转（reversed）X 轴场景下桥接线静默不显示，且无渲染异常（`step > 0` 判断已知限制）
- 1D / 3D 坐标系下调用 `setBridgeLine` 为 no-op，不报错、不绘制
- 含 null 度量值（非总计行本身）的数据行桥接线处理
- 脚本编辑器中 `setBridgeLine`/`getBridgeLineColor`/`getBridgeLineStyle` 的 Auto-complete 支持
- 桥接线与 Bar Corner Radius 联动的视觉效果（`halfWidth = max(0, step * (0.40 - 0.5 * cornerRadius))`）
- 桥接线 Z-Index（`GRIDLINE_Z_INDEX + 1`）与网格线、柱子、Show Values 数据标签的层级关系
- 普通 Bar、Stack Bar 等共用 `createGeometry`/几何生成路径的图表无回归

## P2 - Extended Path （按需测试）

- 大数据量 Waterfall（多阶段、多分组）下桥接线渲染性能
- PNG / SVG / PDF 导出中桥接线与页面预览一致性
- 浏览器、移动端、小容器下桥接线显示兼容性
- 本地化（数值/日期格式化）不影响桥接线绘制逻辑

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 基础桥接线绘制 | 1. 创建包含多个类别的 Waterfall Chart<br>2. 脚本中调用 `element.setBridgeLine(color, lineStyle)`<br>3. 预览图表 | 相邻柱子之间出现水平连接线；颜色/线型符合设置；连接位置对应前一柱子顶部到后一柱子对应高度 | Bug #75624 | 来源：分析 MD Scenario 1；核心脚本 API 与几何绘制功能 |
| TC-2 | 不传颜色时使用默认线色 | 1. 调用 `setBridgeLine(null, lineStyle)`（颜色为 null，线型非 null）<br>2. 预览图表 | 桥接线显示，颜色使用产品默认线色，不报错 | | 来源：分析 MD 功能验证 Validation Goal |
| TC-3 | `lineStyle` 为 null 时禁用/关闭桥接线 | 1. 对已启用桥接线的图表调用 `setBridgeLine(color, null)`<br>2. 预览图表 | 桥接线不显示；柱子渲染与未启用桥接线时一致 | | 来源：分析 MD 功能验证；实现中 `bridgeLineStyle == null` 判定禁用 |
| TC-4 | 总计行桥接与截断 | 1. 创建含总计（Sum/Total）行的 Waterfall 并启用桥接线<br>2. 观察总计柱子与前一柱子之间的连接线<br>3. 若总计行后仍有其它柱子，观察是否产生额外桥接线 | 总计柱子与前一柱子间正确显示桥接线；总计柱子与其后续柱子间**不**产生桥接线 | | 🔴 测试-分析：总计后不会出现桥连线，总计前会出现，结果正确；来源：分析 MD Scenario 2，PR 中明确未覆盖单元测试的最高风险分支 |
| TC-5 | 高圆角边界值表现 | 1. 设置柱子 `cornerRadius` 为较大值（接近或超过 0.8，若 UI/脚本可配置）<br>2. 启用桥接线<br>3. 观察桥接线与柱子的视觉重叠情况 | 需明确记录实际视觉效果：`halfWidth` 被钳制为 0 时桥接线退化为中心到中心连线，可能与柱子重叠；作为已知问题结果记录，而非默认判 Pass | Bug #75626 | 来源：分析 MD Scenario 3；Code Review 已指出、PR 未修复 |
| TC-6 | 分组/分面瀑布图桥接边界 | 1. 创建包含多个分组/分面的 Waterfall 并启用桥接线<br>2. 观察各组内部桥接线连接情况<br>3. 观察组与组交界处是否存在桥接线 | 桥接线仅出现在同组内相邻柱子之间；不同组边界柱子间不产生桥接线 | | 来源：分析 MD Scenario 5；风险点：`prevBridgeX` 在 `groupIdx` 变化及每次 `addGeometries` 后重置为 NaN |
| TC-7 | 默认关闭状态回归 | 1. 打开未调用 `setBridgeLine` 的既有 Waterfall 图<br>2. 观察柱子渲染、堆叠、总计行等效果 | 渲染效果与改动前完全一致；无桥接线出现；无性能/视觉异常 | | 🔴 测试-分析：未调用不显示；来源：分析 MD Scenario 6，默认行为回归风险 |
| TC-8 | 旧版本序列化对象兼容性 | 1. 加载一个在本功能上线前保存的、包含 Waterfall 图的 Viewsheet<br>2. 观察渲染效果 | 桥接线不显示（`bridgeLineStyle` 反序列化为 null）；其余渲染效果与本功能上线前一致 | | 🔴 测试-分析：旧版本不影响；来源：分析 MD Scenario 8；`serialVersionUID` 未变更 |
| **P1** | | | | | |
| TC-9 | 翻转 X 轴场景 | 1. 若产品 UI 支持配置翻转 X 轴的 Waterfall（或通过旧存档/API 构造）<br>2. 启用桥接线<br>3. 观察是否有桥接线显示、是否有渲染异常 | 桥接线不显示；图表其余部分（柱子、总计等）渲染正常；无异常报错 | | 🔴 测试-分析：翻转 X 轴结果正确；来源：分析 MD Scenario 4；`step > 0` 静默跳过，作者确认为已知限制，需确认 UI 确实不可达该配置 |
| TC-10 | 1D / 3D 坐标系 No-op | 1. 在 1D 或 3D 坐标系的 Interval 图上调用 `setBridgeLine`<br>2. 观察渲染结果<br>3. 对比其它 chart style（Bar 等）在同坐标系下的表现 | 图表正常渲染，无桥接线显示，无异常报错；仅 2D 生效的边界符合 Javadoc 说明 | Bug #75628 | 🔴 测试-分析：忽略没 1d 或 3d，检查其它 interval/bar，interval 不支持，bar 报了一个 Bug #75628；来源：分析 MD Scenario 7 |
| TC-11 | 含 null 度量值的普通数据行 | 1. 构造数据中包含非总计行的 null 度量值<br>2. 启用桥接线<br>3. 观察该行前后桥接线绘制情况 | null 值行不产生非法/错位桥接线；`prevBridgeX` 状态在该行前后处理符合预期，不残留错误连接 | | 来源：分析 MD 关键测试风险第 3/5 点，边界与异常 Scope |
| TC-12 | 脚本 Auto-complete 支持 | 1. 打开脚本编辑器<br>2. 输入 `element.` 后查找 `setBridgeLine`/`getBridgeLineColor`/`getBridgeLineStyle`<br>3. 检查参数提示 | 三个方法均出现在 Auto-complete 列表中（`@TernMethod` 标注生效）；参数类型提示正确（Color, GLine） | | 来源：分析 MD 功能验证 Script 部分 |
| TC-13 | 桥接线与 Corner Radius 联动 | 1. 分别设置 `cornerRadius` 为 0、0.2、0.5<br>2. 启用桥接线，颜色/线型固定<br>3. 对比桥接线端点位置与柱子圆角的视觉衔接 | 圆角越大，桥接线端点越靠近柱子中心（更长），视觉上覆盖圆角造成的空隙；数值符合 `halfWidth = max(0, step * (0.40 - 0.5 * cornerRadius))` | | 来源：实现分析 2.2 隐式行为变化 |
| TC-14 | 桥接线 Z-Index 层级 | 1. 启用桥接线并开启 Show Values（数据标签）<br>2. 开启网格线（Grid Lines）<br>3. 检查桥接线与网格线、柱子、数据标签的遮挡关系 | 桥接线显示在网格线之上；柱子与数据标签遮挡关系合理，桥接线不完全遮挡标签，也不被柱子完全遮挡而不可见 | | 风险点：`Z-Index = GRIDLINE_Z_INDEX + 1` |
| TC-15 | 非 Waterfall 图表回归 | 1. 分别创建普通 Bar、Stack Bar 等使用 `IntervalElement`/共用 geometry 路径的图表<br>2. 不调用 `setBridgeLine`<br>3. 对比改动前后渲染 | 非 Waterfall 或未启用该功能的图表渲染、堆叠、性能均无回归 | | 改动嵌入 `createGeometry()` 主循环，需确认无副作用 |
| **P2** | | | | | |
| TC-16 | 大数据量瀑布图桥接线性能 | 1. 分别使用多阶段（如 50/100+ 类别）、多分组数据<br>2. 启用桥接线，记录首次渲染、resize、filter 后刷新耗时 | 渲染和交互耗时在可接受范围内；无明显卡顿或内存持续增长 | | 无已知单测覆盖，建议记录数据规模与耗时 |
| TC-17 | 导出一致性 | 1. 创建启用桥接线的 Waterfall 图<br>2. 分别导出 PNG、SVG、PDF<br>3. 对比页面预览与导出结果 | 导出结果中桥接线位置、颜色、线型与页面预览一致 | | Export 兼容性回归 |
| TC-18 | 浏览器/移动端/小容器兼容 | 1. 在主流浏览器中验证桥接线显示<br>2. 使用小容器/移动端模拟<br>3. 检查桥接线是否超出 plot area 或错位 | 桥接线不超出 plot area；小容器下无明显重叠或不可读状态 | | 兼容性扩展 |

---

# 4 Special Testing

## Security

不涉及权限、认证、数据隔离或外部输入解析变更，无需专项安全测试。

## Performance

执行 TC-16，覆盖多阶段/多分组 Waterfall 数据，记录首次渲染、resize、filter 后重新渲染耗时，关注 `prevBridgeX` 状态数组与几何生成循环是否引入明显性能退化。

## Compatibility

- 序列化兼容：`serialVersionUID` 未变更，旧版本 Viewsheet 反序列化后 `bridgeLineStyle` 应为 `null`（默认禁用），需专项验证（TC-8）。
- 坐标系兼容：仅 2D 生效，1D/3D 需安全 no-op（TC-10）；翻转 X 轴场景需确认 UI 是否可达（TC-9）。
- Chart 类型兼容：与普通 Bar、Stack Bar 等共用 `createGeometry` 路径的图表需无回归（TC-15）。
- Export 兼容：PNG / SVG / PDF 需与页面预览一致（TC-17）。

## 本地化

本 Feature 未发现新增 UI 文本或 i18n key（当前为纯脚本 API，暂无 UI 入口）。若后续暴露 UI 配置项，需补充本地化测试。

## script

新增 `@TernMethod` 标注的 `setBridgeLine(Color, GLine)`、`getBridgeLineColor()`、`getBridgeLineStyle()`，需验证：
- 脚本编辑器 Auto-complete 支持（TC-12）；
- 参数类型校验（Color/GLine 非法值时的行为）；
- 与现有 `IntervalElement` 脚本 API（如 cornerRadius 相关方法）共存不冲突。

## 自动化补充建议

- 新增 `createGeometry()` 总计行分支的桥接绘制与重置单元测试（PR 中明确缺失，风险最高）。
- 新增 `addBridgeForm()` 在不同 `cornerRadius` 取值（含 > 0.8 边界）下 `halfWidth` 计算的单元测试。
- 新增分组切换（`groupIdx` 变化）场景下 `prevBridgeX` 重置的单元测试。
- 新增翻转 X 轴（`step <= 0`）场景下桥接线不绘制的单元测试。
- 补充旧版本序列化对象反序列化后 `bridgeLineStyle` 默认为 null 的兼容性测试。

## 文档/API

若产品/API 文档描述 Waterfall（Interval）图脚本能力，应补充 `setBridgeLine`/`getBridgeLineColor`/`getBridgeLineStyle` 的说明，包括：仅 2D 坐标系生效、翻转 X 轴不绘制、颜色/线型为 null 时的默认行为。

## 配置检查

未发现新增 `SreeEnv`、`defaults.properties` 或部署配置项，不需要专项配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 | 优先级 |
|---|---|---|
| Chart - IntervalElement.createGeometry() | 新增跨迭代 `prevBridgeX` 状态追踪与桥接线绘制逻辑，直接嵌入核心几何生成主循环 | P0 |
| Chart - Waterfall Total Row 处理 | 总计行分支单独使用 xscale 映射桥接坐标，是本次改动中最复杂且无单元测试覆盖的部分 | P0 |
| Chart - Bar Corner Radius 联动 | 桥接线端点公式与 `cornerRadius` 联动，高圆角下已知退化为中心连线（未修复） | P1 |
| Chart - 分组/分面渲染 | `prevBridgeX` 依赖 `groupIdx` 变化与 `addGeometries` 批次重置，避免跨组连接 | P1 |
| Coordinate Transform | 翻转 X 轴（`step <= 0`）场景静默不绘制桥接线，依赖坐标变换判断 | P1 |
| Serialization / 兼容性 | `serialVersionUID` 未变更，新增字段旧对象反序列化默认值需验证 | P1 |
| 其它共用 createGeometry 路径的图表（Bar/Stack Bar 等） | 理论上不受影响，但因改动嵌入共用几何生成循环，需回归确认无副作用 | P1 |
| 脚本 API / Auto-complete | 新增 `@TernMethod` 方法需在脚本编辑器中正确暴露 | P2 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75624 | 基础桥接线绘制相关问题 | open |
| #75626 | 高圆角边界下桥接线退化为中心到中心连线，与柱子重叠 | open |
| #75628 | Bar 图表在 1D/3D 场景下调用桥接线相关能力异常（Interval 本身不支持） | open |
