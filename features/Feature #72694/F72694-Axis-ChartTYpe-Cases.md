# 功能验证（Functional）— 按图表轴类型分类

**核心验证目标**：勾选 "Labels on Opposite Side" checkbox → 标签出现在对侧；取消勾选 → 恢复原侧；多绑定轴场景下标签不分离。

---

## ✅ Category 1：axis-based（X/Y 坐标轴图表）

**适用图表**：Bar、Column、Line、Area、Scatter、Bubble、Step Line、Waterfall、Pareto

**适用性说明**：此类图表是本功能的主要目标场景，具备明确的 X 轴（bottom）与 Y 轴（left），且支持多绑定，是标签位置混乱问题的高发区。

| 测试子类 | 轴数量 / 绑定情况 | 验证目标 |
|---|---|---|
| X 轴单绑定 | 1 条 X 轴，1 个维度字段 | 勾选后标签从 bottom → top |  🔴 **测试-分析**： ok
| X 轴多绑定 | 1 条 X 轴，2+ 个维度字段 | 勾选后标签合并至顶部，分离问题消失 |   🔴 **测试-分析**： see below
| Y 轴单绑定 | 1 条 Y 轴，1 个度量字段 | 勾选后标签从 left → right |  🔴 **测试-分析**： ok
| Y 轴多绑定 | 1 条 Y 轴，2+ 个度量字段 | 勾选后标签统一至右侧 |  🔴 **测试-分析**： see below
| X 轴 + Y 轴分别配置 | 同一图表，X 和 Y 各自打开 Properties | 每条轴独立控制，互不影响 | 🔴 **测试-分析**： ok

**代表性图表建议**：优先使用 Bar（多绑定 X 轴） 和 Column（多绑定 Y 轴） 覆盖需求核心路径。

> ⚠️ **Script 涉及**：axis-based 图表支持 `chart.getAxis("Bottom")` / `chart.getAxis("Left")` 等 API。若用户已通过 Script 设置 `setAxisStyle(AxisSpec.AXIS_SINGLE2)`，需追加验证 UI checkbox 与 Script 状态不发生双重叠加（详见 Script 联动验证节）。

🔴 **测试-分析**：
1. X 轴多绑定
   - 多X轴, X轴:1D+2M, Y轴:1M;  
      - separate chart不会有问题.
      - single chart时, 没有第二axis, 多次设置之后,轴乱了(Issue #74046 ); 存在第二axis, 设置second x axis之后, axis丢失().
   - 多X轴, X轴:1D+2M, Y轴:1D;  
      - separate chart不会有问题.
      - single chart时, 没有第二axis, ok, 设置第二axis, 设置属性无效(Issue #74047 ). 设置第二axis之后, 应该不支持改属性.
2. Y 轴多绑定(应该与X轴多绑定类似)
   - 多Y轴: X轴:1M, Y轴:2M  
      - separate chart不会有问题. single chart时, 多Y轴在同一侧, ok. 但是第二Y轴不支持该属性. 第1Y轴支持,设置之后丢失(Bug #74033). 应该全部禁止掉.
   - 多Y轴: X轴:1D, Y轴:2M+ 1D  -> TODO 验证

3. 不同的Chart Type分析
   - Bar, Line, Area, Bubble, Step Line, Waterfall 同类, 无区别
   - Pareto 本身是双Y轴, 不应该支持. 存在Bug #74009

---

## ✅ Category 2：multi-axis（多值轴图表）

**适用图表**：Bar（双轴）、Line（双轴）、Combo、Area（双轴）

**适用性说明**：此类图表存在左右两条 Y 轴（primary left + secondary right），是本功能最复杂的场景。左轴标签移至右侧时，与原生右轴（secondary axis）位置可能产生空间冲突或视觉混叠。

| 测试子类 | 轴数量 / 绑定情况 | 验证目标 |
|---|---|---|
| 左侧 Y 轴（primary）勾选 | primary Y 轴勾选 checkbox | 左轴标签移至右侧，不与右轴标签重叠 |
| 右侧 Y 轴（secondary）勾选 | secondary Y 轴勾选 checkbox | 右轴标签移至左侧，不与左轴标签重叠 |
| 两轴同时勾选 | primary + secondary 都勾选 | 标签各自移至对侧后渲染不混乱 |
| Combo 图中混合轴 | 折线 + 柱状共用双 Y 轴 | 功能在 Combo 场景下正常生效 |

> ⚠️ **Script 涉及**：multi-axis 图表可通过 `chart.getAxis("Left")` 与 `chart.getAxis("Right")` 分别操作，Script 中若已配置 `AXIS_SINGLE2` 或 `AXIS_DOUBLE2`，与新 checkbox 的交互需重点验证。 🔴 **测试-分析**： script优先ui,不会有问题

🔴 **测试-分析**： Category 1已经覆盖
---

## ⚠️ Category 3：polar（极坐标图表）

**适用图表**：Radar

**适用性说明**：Radar 使用角度轴（angle axis）与半径轴（radius axis），不使用 X/Y 坐标轴。`AXIS_LABEL_OPPOSITE_SIDE` 的方向定义（bottom→top / left→right）在极坐标下无明确对应，属于边界场景。

| 测试子类 | 验证目标 |
|---|---|
| 打开 Radar 轴属性，检查 checkbox 是否显示 | 若显示，勾选后渲染应无异常（不崩溃、不乱码） |
| 勾选后标签位置变化是否有意义 | 记录实际行为，评估是否需要对 Radar 禁用该选项 |

📌 **测试结论性质**：此类测试属于探索性测试，目的是发现实现是否对 polar 类型做了防护（若无防护，需提 bug）。 

> ⚠️ **Script 不适用**：Radar 的轴 API 操作方式与普通图表不同，本功能 Script 联动测试不在 polar 范围内。

🔴 **测试-分析**： 极坐标不支持
---

## ❌ Category 4：partition（无轴图表）

**适用图表**：Pie、Donut、Treemap、Sunburst

**适用性说明**：此类图表没有 X/Y 轴，轴属性对话框通常不可访问或不存在轴配置入口。

| 测试子类 | 验证目标 |
|---|---|
| 右键 Pie/Donut/Treemap 检查是否有轴属性入口 | 应不显示轴属性对话框，或对话框中不包含 Label 标签页 |

📌 **测试结论性质**：负向测试，验证功能边界——partition 类图表不应暴露该 checkbox。

> ✅ **Script 不涉及**：此类图表无 axis API，无 Script 联动测试。

🔴 **测试-分析**： 不支持
---

## ❌ Category 5：network（图结构，无轴）

**适用图表**：Network、Hierarchy

**适用性说明**：Network/Hierarchy 使用节点+边结构，无坐标轴概念，同 partition 类处理。

| 测试子类 | 验证目标 |
|---|---|
| 检查是否有轴属性入口 | 应不显示轴属性对话框 |

> ✅ **Script 不涉及**。

🔴 **测试-分析**： 不支持
---

## ⚠️ Category 6：geographic（地理坐标图表）

**适用图表**：Map、Density Map

**适用性说明**：Map 类图表使用经纬度坐标而非 X/Y 坐标轴。轴属性对话框是否存在、`labelOnSecondaryAxis` 是否对地图有效，属于边界验证。

| 测试子类 | 验证目标 |
|---|---|
| 检查 Map 是否有轴属性入口 | 若有，勾选后地图渲染不崩溃、无异常 |
| 勾选后观察地图标签位置变化 | 记录实际行为，评估语义是否有意义 |

> ✅ **Script 不适用**：地图类 axis API 与矩形坐标系不同，本功能 Script 联动测试不覆盖 geographic 类型。

🔴 **测试-分析**： 不支持
---

## ⚠️ Category 7：financial（金融数据图表）

**适用图表**：Candle（蜡烛图）、Stock

**适用性说明**：金融图表具有时间轴（X）和价格轴（Y），结构上属于 axis-based 的特殊子类，但轴绑定固定（Open/Close/High/Low），不存在用户自由的多绑定场景。

| 测试子类 | 轴数量 / 绑定情况 | 验证目标 |
|---|---|---|
| Candle/Stock X 轴（时间轴）勾选 | 固定时间轴，单绑定 | 勾选后时间轴标签从底部移至顶部，图形渲染正常 |
| Candle/Stock Y 轴（价格轴）勾选 | 固定价格轴，单绑定 | 勾选后价格标签从左移至右，图形渲染正常 |

> ⚠️ **Script 涉及**：Candle/Stock 支持 `chart.getAxis()` API，Script 中若已配置轴 style，与 checkbox 的交互需验证（同 axis-based 的 Script 联动逻辑）。

🔴 **测试-分析**： 与正常的X,Y轴一样, ignore
---

## ❌ Category 8：none（无意义轴图表）

**适用图表**：Tree, Network, Cirsular Network,Scatter Contour, Contour Map

**适用性说明**：此类图表无标准坐标轴，不应有轴属性对话框入口（或 Label 标签页）。

| 测试子类 | 验证目标 |
|---|---|
| 检查是否有轴属性入口 | 应不显示，或不包含 Label 标签页 |

📌 **注意**：Gantt 图有时间轴但属特殊实现，需单独确认是否会暴露该 checkbox。若暴露，勾选后行为需专项评估。

> ✅ **Script 不适用**。

🔴 **测试-分析**： 没有严格意义的axis, 不会弹出Axisproperties,也就不支持该功能
---

🔴 **测试-分析**：其他特殊图
1. 特殊意义的图: Funnel、Gantt

## 汇总：各轴类型测试优先级与 Script 涉及

| Axis Type | 适用图表示例 | 功能测试必要性 | Script 联动测试 |
|---|---|---|---|
| axis-based | Bar、Column、Line、Scatter | ⭐⭐⭐ 高 — 核心场景 | ✅ 必须覆盖 |
| multi-axis | Bar/Line 双轴、Combo | ⭐⭐⭐ 高 — 复杂边界 | ✅ 必须覆盖 |
| financial | Candle、Stock | ⭐⭐ 中 — 固定绑定轴 | ✅ 建议覆盖 |
| polar | Radar | ⭐ 低 — 探索性 | ❌ 不适用 |
| geographic | Map | ⭐ 低 — 探索性 | ❌ 不适用 |
| partition | Pie、Treemap | ⭐ 低 — 负向测试 | ❌ 不适用 |
| network | Network、Hierarchy | ⭐ 低 — 负向测试 | ❌ 不适用 |
| none | Gauge、Gantt | ⭐ 低 — 负向测试（Gantt 需单独确认） | ❌ 不适用 |

**Script 联动测试总结**：Script 测试仅在 axis-based、multi-axis、financial 三类图表中需要覆盖，这三类均使用标准矩形坐标轴，支持 `chart.getAxis()` API，存在与新 checkbox 状态双重叠加的风险。
