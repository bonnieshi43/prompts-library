# Feature #75007 - Add Bridge Line for Waterfall

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

- 核心目标：为 Interval 图（Waterfall 瀑布图）新增可通过脚本访问的"桥接线（Bridge Line）"功能，即在相邻柱子之间绘制连接线，帮助用户直观看到累计值的延续关系。
- 涉及模块：Chart Engine 元素层（`IntervalElement`），几何生成逻辑（`createGeometry`）、`LineForm` 绘制。
- 功能类型：Script API 扩展 + 渲染能力增强（UI / Rendering）。

### 2. 需求清晰度与完整性

- 需求文本极简，仅说明"在 Interval 图（Waterfall）中新增可访问的桥接线函数"，未定义：
  - 桥接线的默认开启/关闭状态、颜色、样式；
  - 是否所有坐标系类型（1D/2D/3D）都需要支持；
  - 是否需要支持翻转（reversed）坐标轴场景；
  - 分组/分面（多类别）瀑布图场景下桥接线的连接范围（是否跨组连接）；
  - 与已有的柱子圆角（cornerRadius）功能的视觉交互方式。
- 上述细节均由实现自行决定并在代码注释中说明（如"仅 2D 生效""翻转轴不绘制"），需求本身未对这些限制做出规定，需通过测试验证这些实现决策是否符合产品预期。

### 3. 测试风险识别

- 行为误解风险：需求仅提及"添加桥接线的可访问函数"，未强调该功能对总计（Sum/Total）柱子、分组柱子等特殊场景的处理，这些是本次实现中最复杂的部分，风险集中于此。
- 跨模块影响风险：改动直接修改 `createGeometry()`（瀑布图几何生成核心逻辑），需要验证不影响未使用桥接线功能（未调用 `setBridgeLine`）的既有瀑布图渲染。
- 状态一致性问题：桥接线的连接位置依赖跨行/跨分组的状态追踪数组（`prevBridgeX`），需要验证在分组切换、总计行、null 值等场景下状态重置逻辑正确。
- 兼容性风险：新增字段对旧版本序列化对象的默认行为需要验证（是否安全禁用而非报错或异常绘制）。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

- Feature（新增脚本可控的桥接线能力）。
- 影响层级：
  - 数据模型层（`IntervalElement.java`）：新增 `bridgeLineColor`/`bridgeLineStyle` 字段、`getBridgeLineColor()`/`getBridgeLineStyle()`/`setBridgeLine()`（均标注 `@TernMethod`）、`equalsContent()` 更新。
  - 渲染/几何生成层：`createGeometry()` 中新增跨迭代的桥接线追踪与绘制逻辑（`prevBridgeX` 数组、`addBridgeForm()` 辅助方法）。
- 主要影响路径：所有使用 Waterfall（Interval）图且通过脚本调用 `setBridgeLine` 的场景；由于改动直接嵌入 `createGeometry()` 主循环，理论上也需要验证对未启用该功能的既有瀑布图无副作用。

### 2. 需求实现一致性

- 已覆盖的核心功能：
  - `setBridgeLine(Color lineColor, GLine lineStyle)` 标注 `@TernMethod`，满足"脚本可访问"的需求；`lineStyle == null` 时禁用桥接线（默认关闭，opt-in 设计），`lineColor == null` 时使用默认线色。
  - 每处理完一个柱子后记录其顶部 X 坐标（`prevBridgeX[v]`），下一个柱子处理时若存在有效的前值即绘制桥接线（`addBridgeForm`），实现"相邻柱子间连接线"的核心诉求。
  - 针对 Waterfall 特有的"总计（Sum/Total）行"（该行的常规度量值为 `null`，导致 `scale()` 返回 `null` 提前 `continue`）单独处理：在 `continue` 之前，使用 X 轴 Scale 直接映射总计行的 X 坐标，绘出"最后一个常规柱子 → 总计柱子"的桥接线，并在之后将追踪值重置为 `NaN`，防止桥接线从总计柱子继续延伸到后续柱子。
  - 在分组边界变化（`groupIdx` 变化）以及每次批量 `addGeometries` 之后，显式重置 `prevBridgeX` 为 `NaN`，避免桥接线跨越不相关的分组/批次错误连接。
- 明确的功能边界（实现文档/注释中已注明，需要测试验证）：
  - **仅对 2D 坐标系生效，1D 与 3D 坐标系下该功能为 no-op**（不报错，也不绘制）。
  - **翻转（reversed）X 轴的图表上不绘制桥接线**：实现通过 `step > 0` 判断静默跳过（`step <= 0` 时不调用 `addBridgeForm`），未做任何提示或报错，属已知且被作者确认为"deferred / 非 UI 支持配置"的限制。
  - 桥接线端点位置公式 `halfWidth = max(0, step * (0.40 - 0.5 * cornerRadius))` 将桥接线与柱子圆角（`cornerRadius`）联动：圆角越大，桥接线端点越靠近柱子中心（更长），以视觉上覆盖圆角造成的空隙。
- 隐式行为变化：
  - `equalsContent()` 新增 `bridgeLineColor`/`bridgeLineStyle` 比较，影响依赖该方法判断"内容是否相同"的下游逻辑（增量渲染、撤销/重做等）。
  - `serialVersionUID` **未改动**（保持不变），意味着旧版本序列化的 `IntervalElement` 反序列化后 `bridgeLineStyle` 默认为 `null`（桥接线默认禁用），是一个经过author确认的、安全的向后兼容设计（区别于"默认值全局改变导致历史数据受影响"的风险类型），仍建议通过测试确认这一结论。

### 3. 关键实现风险

（以下风险中，部分已在 PR 自动化 Review 中被指出但**未在最终代码中修复/关闭**，需要作为测试重点覆盖）

1. **高圆角边界值风险（Review 已指出，未修复）**：当 `cornerRadius > 0.8` 时，`halfWidth` 会被 `Math.max(0, ...)` 钳制为 0，导致桥接线退化为"柱子中心到中心"的连线，可能与柱子本身重叠，视觉效果不佳。该问题在代码评审中已被提出，作者未在本 PR 中修复，需要作为已知缺陷/边界通过测试明确复现并决定是否需要跟进修复。
2. **翻转坐标轴静默无桥接线（Review 已指出，明确不支持）**：`step > 0` 的判断在翻转 X 轴场景下恒为假（或异常），导致桥接线完全不显示且无任何提示。虽然作者确认这是"非 UI 支持配置"的已知限制，仍需要通过测试验证该场景下不会产生渲染异常或错误的桥接线位置（如反向绘制、位置错乱），并确认该限制对当前 UI 是否确实不可达（即用户是否真的无法通过现有 UI 配置出翻转 X 轴的瀑布图）。
3. **总计（Total）行桥接逻辑复杂度风险**：该分支是本次实现中最复杂的部分（在 `tuple == null` 分支内单独使用 `xscale.map()` 而非常规坐标映射），且 PR 明确未补充单元测试（作者回复"deferred pending test harness setup; feature validated visually"），需要重点通过手工/自动化测试覆盖，验证总计行前后桥接线的绘制起止点与后续重置行为均正确。
4. **分组/分面瀑布图桥接边界风险**：`prevBridgeX` 在 `groupIdx` 变化时被重置为 `NaN`，需要验证多分组/多分面瀑布图场景下，桥接线仅在同组内的相邻柱子间绘制，不会跨组产生错误连接。
5. **缺失单元测试的整体风险**：本次改动未附带任何回归测试（PR 讨论中明确提及），核心几何生成逻辑的正确性目前仅通过"视觉验证"确认，测试阶段需要弥补这一覆盖缺口，尤其是总计行分支与 null 值处理路径。
6. **Z-Index 层级风险**：桥接线的 `Z-Index` 设置为 `GRIDLINE_Z_INDEX + 1`，需要验证其在网格线之上、柱子/数据标签之下（或合理的层级关系）正确显示，不会遮挡柱子标签或被柱子完全遮挡而不可见。

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

- 本次改动核心风险集中在：总计行的特殊桥接逻辑（最复杂、无单测覆盖）、高圆角边界值（已知未修复问题）、翻转轴静默不绘制（已知限制）、分组场景下的连接边界，以及默认关闭状态下对既有瀑布图的零副作用验证。
- 风险影响范围：仅在调用 `setBridgeLine` 启用该功能的瀑布图场景生效，理论上不影响未使用该功能的既有图表，但由于改动嵌入核心几何生成循环，仍需验证无副作用。
- 状态一致性问题：`prevBridgeX` 跨行状态追踪在总计行、分组切换等场景下的重置时机需要重点验证。
- 默认行为变化：默认关闭（`bridgeLineStyle == null`），本身是一个需要验证的基线——确认不调用 `setBridgeLine` 时行为与改动前完全一致。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：验证核心需求——脚本可通过 `setBridgeLine` 启用桥接线，且效果正确。
- **Scope**：Waterfall（Interval）图 2D 坐标系场景，脚本调用与 UI 展示。
- **Validation Goal**：调用 `setBridgeLine(color, lineStyle)` 后，相邻柱子之间出现水平连接线，颜色/线型符合设置；不设置颜色时使用默认线色；`lineStyle` 传 `null` 时桥接线不显示（或可关闭已启用的桥接线）。

**Script**：验证 `setBridgeLine`/`getBridgeLineColor`/`getBridgeLineStyle` 在脚本编辑器中的 Auto-complete 支持；脚本设置后 UI 渲染结果与预期一致。

#### 回归测试（Regression）

- **Why**：改动直接修改瀑布图几何生成的核心循环（`createGeometry`），需确认未启用该功能的既有瀑布图不受影响。
- **Scope**：未调用 `setBridgeLine`（或显式传入 `null` lineStyle）的既有瀑布图。
- **Validation Goal**：柱子渲染、堆叠逻辑、总计行显示等原有行为与改动前完全一致，无额外的桥接线或性能/渲染异常。

#### 边界与异常（Boundary）

- **Why**：本次改动包含多个已知或潜在的边界风险点（高圆角、翻转轴、总计行、null 度量值、分组切换），需要逐一覆盖。
- **Scope**：
  - `cornerRadius` 接近/超过 0.8 的高圆角瀑布图；
  - 翻转（reversed）X 轴的瀑布图（若 UI 可配置到该状态）；
  - 含总计（Sum/Total）行的瀑布图，验证总计行前后桥接线绘制与重置；
  - 含 null 度量值（非总计行本身的普通空值）的数据行；
  - 多分组/分面瀑布图，验证桥接线不跨组连接；
  - 1D 与 3D 坐标系下调用 `setBridgeLine`，验证 no-op（不报错、不绘制）。
- **Validation Goal**：
  - 高圆角场景下明确观察并记录桥接线是否退化为中心到中心连线（已知问题），评估是否需要作为缺陷跟进；
  - 翻转轴场景下无桥接线显示且无渲染异常；
  - 总计行前的桥接线正确连接到总计柱子，且不会继续延伸到总计行之后的柱子；
  - 多分组场景下桥接线仅出现在同组相邻柱子之间；
  - 1D/3D 坐标系下功能安全无效，不抛出异常。

#### 兼容性测试（Compatibility）

- **Why**：新增字段影响序列化对象的默认行为，需验证旧版本保存的瀑布图加载后不受影响。
- **Scope**：加载改动前保存的、包含 Waterfall 图的 Viewsheet。
- **Validation Goal**：旧数据反序列化后 `bridgeLineStyle` 为 `null`，桥接线默认禁用，渲染效果与改动前一致。

#### 自动化测试建议

- Unit：`createGeometry()` 中总计行分支的桥接绘制与重置逻辑（当前缺失，属于本次测试需要重点补充的部分）；`addBridgeForm()` 在不同 `cornerRadius` 取值下 `halfWidth` 计算的正确性（含高圆角边界）。
- Integration：脚本调用 `setBridgeLine` 后端到端渲染结果验证；分组/分面瀑布图的桥接线连接范围验证。
- E2E：瀑布图桥接线的可视回归（含总计行、分组、高圆角等场景截图对比）。

---

## 四、关键测试场景（Key Test Scenarios）

### Scenario 1：基础桥接线绘制验证

- **Scenario Objective**：验证脚本调用 `setBridgeLine` 后，Waterfall 图相邻柱子之间正确显示连接线。
- **Scenario Description**：这是本次需求的核心诉求，若桥接线未正确显示或位置错误，用户无法通过连接线直观看到累计值的延续关系。
- **Key Steps**：
  1. 创建一个包含多个类别的 Waterfall 图。
  2. 在脚本中调用 `element.setBridgeLine(color, lineStyle)`。
  3. 观察图表渲染效果。
- **Expected Result**：相邻柱子之间出现水平连接线，颜色与线型符合设置，连接位置准确对应前一柱子顶部到后一柱子底部。
- **Risk Covered**：核心脚本 API 与几何绘制功能风险。

🔴 测试-分析：Bug #75624

### Scenario 2：总计（Total）行桥接与截断验证

- **Scenario Objective**：验证瀑布图中总计柱子前的桥接线正确绘制，且不会从总计柱子继续延伸到之后的柱子。
- **Scenario Description**：总计行的度量值为 `null`，实现通过特殊分支单独处理该行的桥接，是本次改动中最复杂、且未被单元测试覆盖的部分，风险最高。
- **Key Steps**：
  1. 创建一个包含总计（Sum/Total）行的 Waterfall 图并启用桥接线。
  2. 观察总计柱子与其前一柱子之间的连接线。
  3. 若总计行之后仍有其它柱子，观察总计柱子与后续柱子之间是否错误产生桥接线。
- **Expected Result**：总计柱子与前一柱子之间正确显示桥接线；总计柱子与其后续柱子之间**不**产生桥接线。
- **Risk Covered**：总计行特殊桥接逻辑风险（PR 中明确未覆盖单元测试）。

🔴 测试-分析：总计后不会出现桥连线，总计前会出现结果正确

### Scenario 3：高圆角边界值验证

- **Scenario Objective**：验证 `cornerRadius` 取较大值（如 > 0.8）时桥接线的实际表现。
- **Scenario Description**：代码评审已指出该边界下 `halfWidth` 会被钳制为 0，桥接线退化为中心到中心的连线，可能与柱子本身重叠，该问题在合并时未被修复，需要通过测试明确复现效果并评估是否需跟进处理。
- **Key Steps**：
  1. 设置 Waterfall 图柱子的 `cornerRadius` 为较大值（接近或超过 0.8，若 UI/脚本允许）。
  2. 启用桥接线。
  3. 观察桥接线与柱子的视觉重叠情况。
- **Expected Result**：需明确记录实际视觉效果（是否退化为中心到中心连线并与柱子重叠），作为已知问题结果反馈，而非默认视为通过。
- **Risk Covered**：高圆角边界值风险（Review 已指出、未修复）。

🔴 测试-分析：Bug #75626


### Scenario 4：翻转 X 轴场景验证

- **Scenario Objective**：验证翻转 X 轴的 Waterfall 图上桥接线的实际表现（预期为不显示，且无渲染异常）。
- **Scenario Description**：实现通过 `step > 0` 静默跳过翻转轴场景下的桥接线绘制，未做任何提示，需验证该场景下不产生错误/反向的桥接线，也不抛出异常。
- **Key Steps**：
  1. 若产品 UI 支持配置翻转 X 轴的 Waterfall 图，创建该场景并启用桥接线。
  2. 观察是否有桥接线显示、是否有渲染异常。
- **Expected Result**：桥接线不显示，图表其余部分（柱子、总计等）渲染正常，无异常报错。
- **Risk Covered**：翻转轴静默不绘制风险（已知限制，需确认可接受）。

🔴 测试-分析：翻转 X 轴结果正确

### Scenario 5：多分组/分面瀑布图桥接边界验证

- **Scenario Objective**：验证多分组或分面的 Waterfall 图中，桥接线仅在同一组内的相邻柱子间绘制，不跨组连接。
- **Scenario Description**：`prevBridgeX` 在分组切换时被重置，需要验证该重置逻辑在实际多分组数据下正确生效，避免产生跨组的错误连接线。
- **Key Steps**：
  1. 创建一个包含多个分组/分面的 Waterfall 图并启用桥接线。
  2. 观察各组内部的桥接线连接情况，以及组与组交界处是否存在桥接线。
- **Expected Result**：桥接线仅出现在同组内相邻柱子之间，不同组的边界柱子之间不产生桥接线。
- **Risk Covered**：分组/分面场景下状态重置边界风险。

### Scenario 6：默认关闭状态回归验证

- **Scenario Objective**：验证未调用 `setBridgeLine`（默认状态）的 Waterfall 图渲染效果与改动前完全一致。
- **Scenario Description**：桥接线功能为 opt-in 设计，默认关闭，需确保未使用该功能的既有瀑布图不受任何影响。
- **Key Steps**：
  1. 打开一个未调用 `setBridgeLine` 的既有 Waterfall 图。
  2. 观察柱子渲染、堆叠、总计行等效果。
- **Expected Result**：渲染效果与改动前完全一致，无桥接线出现，无性能/视觉异常。
- **Risk Covered**：默认行为回归风险。

🔴 测试-分析：未调用不显示

### Scenario 7：1D/3D 坐标系下 No-op 验证

- **Scenario Objective**：验证在 1D 或 3D 坐标系的图表上调用 `setBridgeLine` 不会导致异常，且不绘制桥接线。
- **Scenario Description**：文档明确该功能仅对 2D 坐标系生效，需验证 1D/3D 场景下确实安全降级为无效果，而非报错或产生异常渲染。
- **Key Steps**：
  1. 在 1D 或 3D 坐标系的 Interval 图上调用 `setBridgeLine`。
  2. 观察渲染结果。
- **Expected Result**：图表正常渲染，无桥接线显示，无异常报错。
- **Risk Covered**：坐标系类型边界风险。

🔴 测试-分析：忽略没1d或3d，检查其它inverval,bar支持interver不支持，bar报了一个Bug #75628

### Scenario 8：旧版本序列化对象兼容性验证

- **Scenario Objective**：验证改动前保存的、包含 Waterfall 图的 Viewsheet 加载后默认不显示桥接线。
- **Scenario Description**：`serialVersionUID` 未变更，新增字段在旧对象反序列化后应为 `null`（默认禁用桥接线），需要验证这一设计确实生效。
- **Key Steps**：
  1. 加载一个在本功能上线前保存的、包含 Waterfall 图的 Viewsheet。
  2. 观察渲染效果。
- **Expected Result**：桥接线不显示，其余渲染效果与本功能上线前一致。
- **Risk Covered**：序列化兼容性风险。

🔴 测试-分析：旧版本不影响
