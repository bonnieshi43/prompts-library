---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Axis Spec
Feature_id: 74762
Feature: Make axis spec default value single instead of double
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3576
Assignee: Stephen Webster
last_updated: 2026-07-14
version: stylebi-1.2.0
---

# 1 Feature Summary

**核心目标**：将 `AxisSpec` 坐标轴样式（`style`）的默认值由 `AXIS_DOUBLE`（主轴 + 对侧轴，双轴线）改为 `AXIS_SINGLE`（单轴线），避免简单图表默认呈现“四边封闭的盒子”效果。

**用户价值**：用户创建简单图表（Line/Bar 等）且未显式设置轴样式时，默认即可获得更简洁的单轴视觉效果，无需额外配置即可满足“Look and Feel”优化诉求（Epic #74519）。

---

# 2 Test Focus

## P0 - Core Path

- 新建简单图表（Line/Bar/Point/Area）不显式设置轴样式时，默认仅显示单侧轴线
- 历史图表（改动前保存、未显式设置轴样式）升级后坐标轴外观兼容性验证（最高优先级风险，PR 未包含迁移代码）
- 已显式调用 `setAxisStyle(AXIS_DOUBLE)` 的图表不受默认值改动影响

## P1 - Functional Path

- `labelOnSecondaryAxis = true` 与新默认值组合后的渲染效果（`AXIS_SINGLE | AXIS_LABEL_OPPOSITE_SIDE`）
- Facet 分面图（依赖顶部对侧轴标签）、双 Y 轴组合图、Polar/雷达图等跨图表类型回归
- 双 measure + Secondary Axis 组合场景

## P2 - Extended Path （按需测试）

- PDF/Image 导出、Print Layout 预览与页面显示一致性
- 脚本/API 创建图表场景下默认值生效情况

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | 新建简单图表默认单轴效果验证 | 1. 新建一个简单 Line 或 Bar 图表，不对坐标轴做任何脚本/样式设置<br>2. 查看图表渲染效果 | X 轴、Y 轴均只在主轴一侧显示轴线（如左、下两侧），对侧（右、上）无轴线，图表不再是四边封闭的盒子形态 | Pass（默认显示无问题） | 来源：分析 MD Scenario 1；设置 Labels on Opposite Side 在 Y 轴上有 Bug #75649，X 轴正常 |
| TC-2 | 历史图表升级后坐标轴外观兼容性验证 | 1. 使用改动前版本创建一个未显式设置轴样式的图表并保存为报表/模板<br>2. 升级到包含本次改动的版本<br>3. 重新打开/刷新该报表，观察坐标轴显示效果是否与升级前一致 | 需明确得出结论并与产品对齐——历史图表是否保持原有双轴外观；若外观发生无预期的静默变化，应作为兼容性问题上报 | Pass（符合预期） | 来源：分析 MD Scenario 2（最高优先级）；PR 未包含任何迁移/兼容处理代码，需确认字段是否总是被显式持久化 |
| TC-3 | 显式设置双轴样式的图表不受影响验证 | 1. 创建一个图表，通过脚本显式调用设置为双轴样式（`setAxisStyle(AXIS_DOUBLE)`）<br>2. 查看渲染效果 | 该图表仍按双轴样式渲染（主轴 + 对侧轴均显示），不受默认值变化影响 | Bug #75646 | 来源：分析 MD Scenario 3；两个 dimension 场景不受影响，两个 measure 且设置 Secondary Axis 场景下有问题 |
| **P1** | | | | | |
| TC-4 | labelOnSecondaryAxis 与新默认值组合验证 | 1. 创建一个图表并将其 `labelOnSecondaryAxis` 设置为 true，不显式设置 `axisStyle`<br>2. 观察坐标轴线与标签的显示位置 | 轴标签正确显示在对侧（次轴）位置，轴线数量与位置符合单轴 + 对侧标签的预期组合效果，无标签错位或轴线缺失/多余 | Bug #75646 | 来源：分析 MD Scenario 5；`getAxisStyle()` 由 `style` 默认值与 `labelOnSecondaryAxis` 共同决定，需确认组合值渲染正确 |
| TC-5 | 依赖对侧轴的复杂图表类型回归验证 | 1. 创建一个 Facet 分面图表（多个子图并排/上下排列），不显式设置轴样式<br>2. 创建一个包含双 Y 轴（主/次值轴）的组合图，不显式设置轴样式<br>3. 分别观察坐标轴与标签的显示效果 | Facet 图各分面所需的轴线/标签正常显示，不因默认值改为单轴而缺失关键信息；双 Y 轴组合图若业务上需要保留两侧轴线，应确认是否有专门的显式设置来保障，现有此类图表模板未出现轴线缺失回归 | | 来源：分析 MD Scenario 4；`AxisSpec` 被所有坐标系统复用，需逐类型验证 |
| **P2** | | | | | |
| TC-6 | 导出/打印场景下坐标轴效果一致性验证 | 1. 创建一个使用默认轴样式的简单图表<br>2. 分别执行 PDF 导出、Image 导出与 Print Layout 预览 | 导出/打印结果中坐标轴均为单轴效果，与页面显示一致 | Pass（导出和预览一致） | 来源：分析 MD Scenario 6 |
| TC-7 | 脚本/API 创建图表默认值生效验证 | 1. 使用已有脚本/API 创建图表，不设置 `axisStyle`<br>2. 预览图表并检查轴线效果 | 脚本/API 路径创建的图表与 UI 创建一致，默认呈现单轴效果 | | 未发现新增脚本 API，回归现有脚本创建路径 |

---

# 4 Special Testing

## Security

不涉及权限、认证、数据隔离或外部输入解析变更，无需专项安全测试。

## Performance

改动为字段默认值调整，不涉及渲染性能路径变化，无需专项性能测试。

## Compatibility

- **Old config**：核心风险点。本次改动未包含任何版本迁移、序列化升级或 XML 默认值迁移逻辑，需通过实际新旧版本加载对比确认历史图表定义中 `style` 字段是否总是被显式持久化。
- **Round-trip**：验证改动前保存的图表在改动后版本中打开/刷新/导出，坐标轴外观与预期结论一致（见 TC-2）。

## script

未发现新增坐标轴样式相关脚本 API，需回归现有脚本/API 创建图表时的默认轴样式表现（见 TC-7）。

## 文档/API

若产品文档中描述坐标轴默认样式（双轴/单轴），需同步更新为 `AXIS_SINGLE`。

## 配置检查

未发现新增 `SreeEnv`、`defaults.properties` 或部署配置项，不需要专项配置检查。

---

# 5 Regression Impact（回归影响）

| 模块 | 影响点 | 优先级 |
|---|---|---|
| Chart - AxisSpec | `style` 字段默认值变更，影响所有未显式设置 `axisStyle` 的坐标轴渲染 | P0 |
| Chart - 历史数据兼容性 | 无迁移代码，历史图表/模板加载后坐标轴外观可能被动改变 | P0 |
| Chart - Secondary Axis | 双 measure + Secondary Axis 场景下显式双轴设置未生效（Bug #75646） | P0 |
| Chart - Facet / 双 Y 轴组合图 | 依赖对侧轴标签的图表类型需验证轴线/标签未因默认值改动丢失 | P1 |
| Chart - Labels on Opposite Side | Y 轴场景下存在 Bug #75649，X 轴正常 | P1 |
| Export / Print | PDF/Image 导出与 Print Layout 预览需与页面显示保持一致 | P2 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75649 | 设置 Labels on Opposite Side 在 Y 轴上有问题，X 轴正常 | open |
| #75646 | 双 measure 场景下设置 Secondary Axis，显式双轴样式/labelOnSecondaryAxis 组合未按预期渲染 | open |

---
