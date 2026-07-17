---

doc_type: feature-test-doc
product: StyleBI
module: Chart
Feature_id: ”75010”
Feature: Treemap 默认渲染朝向调整
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3699
Assignee: Stephen Webster
last_updated: 2026-07-15
version: stylebi-1.2.0

---

# 输入与生成规则

请基于以下材料生成测试文档：
- 【Feature PDF】需求描述及相关Issue
- 【分析MD】含 🔴 标注 / 写未覆盖 / Test Result的测试分析
- 【知识库】相关文档（如有）

生成规则:
1. **从PDF提取**：核心目标、用户价值、所有Bug列表（标注New/Request Feedback状态）
2. **从分析MD提取**：所有 🔴 标注（测试分析/Test Result/未覆盖）、场景、风险识别
3. **从知识库提取**：扩展场景、模块影响
4. **合并覆盖**：同一场景多个来源时取并集，用Notes列注明来源
5. **Bugs**：自动将New/Request Feedback的Bug添加到第3节并生成对应TC-notes

---

# 1 Feature Summary

**核心目标**：将 Treemap（矩形树图）的默认渲染朝向调整为标准视图习惯 —— 最大值方块位于左上角，依次向右下角递减（Z字形/阅读顺序），并提供 API 支持自定义四个角(TOP_LEFT/TOP_RIGHT/BOTTOM_LEFT/BOTTOM_RIGHT)的朝向。
**用户价值**：解决用户对 Treemap 默认渲染顺序不符合"重要数据优先呈现在左上角"这一通用可视化认知习惯的问题，提升数据可读性和视觉一致性；同时通过脚本 API 满足特殊排布需求。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 默认（无脚本干预）情况下 Treemap 最大值渲染在左上角，且依次向右下角递减
- 通过脚本设置四种 `Orientation` 枚举值后，最大项分别落在对应角落
- 该变更仅影响 `TREEMAP` 类型，不影响 `CIRCLE` 类型

## P1 - Functional Path

- 边界情况：单节点（无子节点）Treemap、深层级钻取（多个 `treeDims`）的树节点递归翻转
- 异常输入：`setOrientation(null)` 非法输入的健壮性验证
- 多对象交互：点击、Tooltip、超链接、Highlight、下钻交互定位一致性
- UI状态变化：TREEMAP 与 CIRCLE 类型互相切换 mapType 的场景
- 历史兼容性：升级前已保存的 Treemap 仪表板在升级后的视觉变化验证
- 导出一致性：PDF/Excel/Image 导出及打印预览与 Portal 显示一致

## P2 - Extended Path （按需测试）

- 性能：多层级下钻 Treemap 的渲染性能
- 兼容性：移动端/小屏幕下 Treemap 默认朝向渲染及交互定位
- 安全：不涉及

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 默认渲染朝向验证 | 1. 新建 Viewsheet，添加 Treemap 图表并绑定一个维度和一个度量；2. 不设置任何脚本，直接查看图表渲染结果。 | 数值最大的矩形块出现在图表左上角，数值依次递减，最小值出现在右下角。 | 符合预期 | 分析MD |
| TC-2 | 四种朝向枚举值切换验证 | 1. 在图表自身的 Script 中依次写入脚本并刷新图表，每次切换 `Orientation` 枚举值（TOP_LEFT / TOP_RIGHT / BOTTOM_LEFT / BOTTOM_RIGHT）；2. 每设置一次朝向，观察并记录最大值方块所在角落。 | 最大值方块分别正确落在 左上/左下/右上/右下 四个角落，且其余方块按大小依次向对角递减排布。 | 符合预期 | 分析MD |
| TC-3 | TREEMAP 与 CIRCLE 类型切换的隔离性验证 | 1. 对同一图表设置朝向为左上；2. 将图表类型由矩形树图切换为环形树图（CIRCLE）。 | 环形树图的渲染方式与朝向设置无关，切换前后表现与该功能上线前一致。 | 符合预期 | 分析MD |
| **P1** | | | | | |
| TC-4 | 历史（升级前）Treemap 报表的兼容性验证 | 1. 使用升级前版本创建并保存一个包含 Treemap 图表的仪表板；2. 将该仪表板导入/迁移至当前版本环境；3. 直接打开，不做任何修改；4. 与升级前的截图进行对比。 | 图表正常渲染，无布局错乱、空白或数据缺失，仅呈现方向发生预期内的变化（最大值从左下变为左上）。 | 符合预期 | 分析MD |
| TC-5 | 多层级下钻 Treemap 的朝向一致性验证 | 1. Treemap 绑定两个及以上嵌套维度；2. 设置 Treemap 朝向为左上；3. 展开/查看多层嵌套的子矩形块。 | 所有层级（父层和子层）的矩形块均按同一朝向规则排布，子矩形完全包含在对应父矩形范围内，无重叠或超出。 | Bug #75660(reject) | 分析MD |
| TC-6 | Treemap 交互定位一致性验证（点击/Tooltip/超链接/下钻） | 1. 设置 Treemap 为非默认朝向（如右下）；2. 鼠标悬停在左上角矩形块上，查看 Tooltip 显示的数据；3. 点击该矩形块触发下钻或超链接。 | Tooltip 显示与鼠标悬停矩形块对应的正确数据；点击/下钻/超链接跳转的目标与该矩形块所代表的数据项一致，不发生错位。 | 符合预期 | 分析MD |
| TC-7 | 导出与打印预览一致性验证 | 1. 在 Portal 中查看设置了某一朝向的 Treemap 图表；2. 分别导出为 PDF、Excel、Image，并打开打印预览。 | 三种导出格式及打印预览中，最大值矩形块所在角落与 Portal 在线展示完全一致。 | 符合预期 | 分析MD |
| TC-8 | 非法/边界输入的健壮性验证 | 1. 在图表 Script 中显式设置朝向为空值 `elem.setOrientation(null)`；2. 刷新图表查看渲染结果及报错提示。 | 脚本执行失败并明确提示 `orientation must not be null`；仅该图表脚本执行受影响，Viewsheet 内其他组件/图表照常渲染，不发生级联崩溃。 | 符合预期 | 分析MD |
| TC-9 | 脚本自动完成与算法类型组合验证 | 1. 在图表 Script 中输入代码后观察脚本编辑器是否弹出自动完成候选；2. 固定朝向为左上，依次切换三种算法（SLICE/BINARY/SQUARIFIED）并刷新观察。 | 编辑器正确提示 `Orientation` 枚举值与相关方法；三种算法下最大值矩形块均正确落在左上角。 | Bug #75681(待确认), Bug #75683(待确认) | 分析MD |
| **P2** | | | | | |
| TC-10 | 移动端/小屏幕渲染与交互验证 | 1. 在移动端/小屏幕下查看设置了默认朝向的 Treemap 图表；2. 测试点击选中和 Tooltip 交互。 | Treemap 默认朝向渲染正确，点击/Tooltip 交互定位准确。 | 待测试 | 分析MD |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security

不涉及

## Performance

不涉及

## Compatibility

- 需验证移动端/小屏幕下 Treemap 默认朝向渲染及点击/Tooltip 交互定位是否正确。

## 本地化

不涉及 UI 文本变更，跳过。

## script

需重点验证：
- 新增的 `Orientation` 枚举与 `getOrientation`/`setOrientation` 方法是否可在图表脚本中正常调用
- 脚本编辑器 Auto-complete 是否能识别新枚举值及方法签名
- 脚本编写位置：该图表自身的 Script（图表属性对话框 Script 标签页），不要写在 Viewsheet 的 `onLoad` 里

## 文档/API

需检查脚本 API 帮助文档是否已补充 `TreemapElement.Orientation` 说明及使用示例。

## 配置检查

不涉及 `SreeEnv`/`defaults.properties`，跳过。

---

# 5 Regression Impact（回归影响）

可能受影响模块：Chart 核心渲染引擎（TreemapElement/TreemapCoord/TreemapVO）、Viewsheet 脚本引擎、导出模块（PDF/Excel/Image）、打印预览、Highlight/Hyperlink/下钻交互、移动端 Viewer、Dashboard。

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75660 | 左上角放置的是最大总值组中的最大图块，而不一定是全局最大的图块 | reject |
| #75681 | 脚本编辑器自动完成提示异常 | New |
| #75683 | 算法类型组合验证失败 | New |

---