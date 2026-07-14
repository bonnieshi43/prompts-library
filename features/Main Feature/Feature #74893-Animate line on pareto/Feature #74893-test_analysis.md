# Feature #74893 - Animate Line on Pareto

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

- 核心目标：为 Pareto 图中的累计百分比线增加绘制动画（draw-on）效果，使该线在图表渲染时呈现"逐渐画出"的动态视觉效果。
- 明确排除：不需要 ghost fill（渐隐填充）效果，也不需要 hover（悬浮）交互效果——该动画仅是一次性入场效果，不涉及交互状态变化。
- 涉及模块：Chart Engine 渲染层（`LineVO`）、SVG 支持层（`SVGSupport` 属性常量）、SVG 动画注入层（`SVGAnimationDOMInjector`，位于 `utils/inetsoft-xml-formats` 模块，与 `core` 渲染层跨模块协作）。
- 功能类型：UI / 渲染动画（Rendering Animation）。

### 2. 需求清晰度与完整性

- 需求文本极简（一句话 + 一个否定说明），未定义：
  - Pareto 线动画与 Bar 动画之间的时序关系（同时开始 / Bar 结束后开始）；
  - 动画时长、缓动曲线是否需要与现有折线图动画保持一致；
  - 虚线样式的 Pareto 线是否需要特殊处理；
  - 动画效果在导出（PDF / Image / Print）场景下是否需要保留、或应直接呈现静态终态。
- 需求未约束 Pareto 线的判定方式，该识别逻辑完全由实现自行设计（基于内部 hint 标记），需求本身无法验证其正确性，因此这部分正确性依赖测试兜底。

### 3. 测试风险识别

- 行为误解风险：需求仅提及"line"，需确认 Pareto 图中只有一条累计百分比线被识别为动画对象，不会误判其它折线系列。
- 跨模块影响风险：改动涉及 `core` 与 `utils/inetsoft-xml-formats` 两个模块间共享方法签名变更（`void` → `double`），需确认所有调用点均已同步，避免遗漏导致的编译或逻辑问题。
- 状态一致性风险：Pareto 线动画时序依赖 Bar 动画返回的延迟值，Bar 数量为 0 或动画被禁用（fadeOnly）时需验证时序仍正确。
- 兼容性风险：改动复用了原折线图动画绘制逻辑（stroke-dashoffset / clip-path wipe），需验证提取后的公共逻辑未引入行为差异。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

- Feature（新增 Pareto 线动画能力）+ Refactor（提取折线动画公共逻辑）。
- 影响层级：
  - Core 渲染层（`LineVO.java`）：标记 Pareto 线。
  - SVG 支持层（`SVGSupport.java`）：新增 `data-pareto` 属性常量。
  - 动画注入层（`SVGAnimationDOMInjector.java`）：核心逻辑变更，跨越"渲染标记写入"与"SVG DOM 后处理注入动画"两个阶段。
- 主要影响路径：包含 Pareto 图的 Dashboard/Viewsheet 在开启图表动画时的首次渲染表现；同时影响导出/打印流程中生成的 SVG 初始状态（stroke-dashoffset 为满长的"未画出"状态）。

### 2. 需求实现一致性

- 已覆盖的核心功能：
  - 新增 `data-pareto` 标记（`LineVO` 写入 + `SVGSupport` 定义常量），用于在 SVG DOM 后处理阶段识别 Pareto 线。
  - 新增 `injectParetoLineAnimation()`，对 Pareto 线应用 draw-on 动画（实线走 stroke-dashoffset，虚线走 clip-path wipe），且未附加 ghost fill 与 hover 相关代码，与"不需要 ghost fill 和 hover 效果"的需求一致。
  - 时序设计：`delay = lastBarDelay + AnimationConstants.DURATION + AnimationConstants.READY_BUFFER`，即等所有 Bar 动画播放完毕后才开始画线——这是实现自行做出的设计决策，需求未明确要求，需要通过测试确认是否符合产品预期。
- 潜在未覆盖/待验证点：
  - 需求未提及虚线场景，但实现中虚线 Pareto 线会复用 `applyLineDrawAnimation` 的 clip-path wipe 分支，需验证该场景下视觉效果正确。
- 隐式行为变化：
  - `injectBarAnimationFromAnnotations()` 签名由 `void` 改为返回 `double`，属于跨模块共享方法的破坏性签名变更，PR 中仅展示一处调用点更新，需确认代码库内无其它遗漏调用点。
  - 原有 `injectLineAnimationFromAnnotations()`（普通折线图/面积图动画）被重构为调用新提取的共享方法 `applyLineDrawAnimation()`，属于对已有功能的间接修改，需要回归验证。

### 3. 关键实现风险

1. **Hint 依赖的静默失败风险**：Pareto 线识别完全依赖 `elem.getHint("_pareto_")` 是否为 `"true"`，该 hint 由图表几何计算层设置。若某些 Pareto 图变体或图表被二次编辑（如切换坐标系、合并系列）未正确设置该 hint，动画不会生效，且不会报错或提示，属于静默失败。
2. **时序耦合风险**：Pareto 线动画的 delay 强依赖 `lastBarDelay` 的正确性；未来若 Bar 动画的 stagger 延迟计算逻辑调整，会间接影响 Pareto 线的启动时间，两者存在隐式耦合。
3. **导出/静态场景风险**：`SVGAnimationDOMInjector` 生成的初始 SVG 状态是"未画出"（`stroke-dashoffset` 等于路径满长）。若导出（PDF/Image/Print）流程直接复用该 SVG 而未跳过动画注入或未重置为动画结束态，导出结果中 Pareto 线可能缺失或显示不完整。
4. **共享逻辑一致性风险**：`applyLineDrawAnimation` 被 Pareto 线与普通折线图两处复用，需要确认两个调用路径产出的实际属性（`stroke-dasharray`、`animation` 时长、缓动函数）完全一致，未因重构引入差异。
5. **端点圆点误隐藏风险**：`applyLineDrawAnimation` 对 Pareto 线与普通折线统一执行 `descendantCircles` 隐藏（`opacity:0`），若 Pareto 线本身需要展示数据点圆点（而非仅虚线锚点圆点），会被一并误隐藏。

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

- 本次改动核心风险集中在：Pareto 线识别的准确性、动画时序与 Bar 动画的联动关系、静态导出场景下的表现、以及共享逻辑重构对普通折线图动画的回归影响。
- 风险影响范围：直接影响包含 Pareto 图的渲染与导出路径；由于共享了 `applyLineDrawAnimation`，间接影响所有折线图/面积图动画路径。
- 状态一致性问题：Pareto 线动画依赖跨方法传递的 `lastBarDelay` 返回值，需验证该数据传递在各类场景下均正确。
- 默认行为变化：只要图表动画总开关开启，Pareto 线动画即默认生效，属于新增的默认行为而非可选项，需确认是否存在独立开关。

### 3.2 必要测试类别

#### 功能验证（Functional）

- **Why**：验证核心需求——Pareto 线动画是否正确触发、效果是否符合"画出"预期，且确实不含 ghost fill 与 hover 效果。
- **Scope**：Web 端 Pareto 图渲染（动画开启状态）。
- **Validation Goal**：累计百分比线以 draw-on 效果显示；无渐变填充；动画本身不引入新增的 hover 高亮/tooltip 行为。

Mobile：Pareto 图若在移动端/小屏幕下展示，需验证动画效果与桌面端一致，无布局错位或裁切。

#### 回归测试（Regression）

- **Why**：核心动画逻辑被抽取为共享方法 `applyLineDrawAnimation`，原有折线图/面积图动画路径被重构调用，属于对已有功能的间接修改。
- **Scope**：普通折线图（单系列/多系列 stagger）、面积图 ghost fill、虚线折线图。
- **Validation Goal**：原有动画效果（stroke-dashoffset 画线、clip-path 虚线 wipe、ghost fill、多系列 stagger delay、Batik 端点圆点隐藏）与改动前保持一致。

#### 边界与异常（Boundary）

- **Why**：Pareto 线动画时序依赖 Bar 动画返回值，需验证边界场景下时序仍然正确。
- **Scope**：无 Bar 数据（Pareto 图筛选后为空/仅一条线）、大量 Bar（stagger 延迟较大）、fadeOnly 动画模式。
- **Validation Goal**：无 Bar 时 Pareto 线动画仍能正确触发，不因 `lastBarDelay` 缺失而异常或不显示；大量 Bar 时 Pareto 线在最后一个 Bar 动画结束后正确启动。

#### 兼容性测试（Compatibility）

- **Why**：改动影响 SVG 生成内容（新增属性、初始 `stroke-dashoffset` 状态），需验证静态导出场景下的兼容性。
- **Scope**：PDF 导出、Image（PNG/SVG）导出、Print Layout 预览。
- **Validation Goal**：导出/打印结果中 Pareto 线完整显示（而非动画开始前的"未画出"状态），与关闭动画时的历史导出效果一致。

#### 自动化测试建议

- Unit：`LineVO` 对 `_pareto_` hint 的判断与属性写入；`applyLineDrawAnimation` 对实线/虚线两种路径生成属性的正确性。
- Integration：`injectBarAnimationFromAnnotations` 返回值在 Pareto 场景下的正确传递与 `injectParetoLineAnimation` 时序计算。
- E2E：Pareto 图动画的视觉回归（对比动画结束态快照）、导出场景下 SVG 内容快照验证。

---

## 四、关键测试场景（Key Test Scenarios）

### Scenario 1：Pareto 线绘制动画基础验证

- **Scenario Objective**：验证 Pareto 图累计百分比线在渲染时呈现画出（draw-on）动画效果。
- **Scenario Description**：用户打开包含 Pareto 图的 Dashboard，期望看到线条随动画逐渐绘制而非瞬间出现；若动画未触发则退化为静态图表，不满足需求。
- **Key Steps**：
  1. 打开一个包含 Pareto 图且已开启图表动画的 Viewsheet。
  2. 观察累计百分比线的渲染过程。
- **Expected Result**：累计百分比线以从左到右画出的动态效果呈现，最终显示完整曲线。
- **Risk Covered**：Pareto 线识别与动画触发的核心风险。
🔴 测试-分析：在preview出现动画

### Scenario 2：Bar 与 Pareto 线动画时序验证

- **Scenario Objective**：验证 Pareto 线动画在所有 Bar 动画播放完成后才开始播放。
- **Scenario Description**：若时序计算错误，Pareto 线可能与 Bar 同时开始甚至提前完成，造成线条穿过尚未长出的柱子，观感突兀。
- **Key Steps**：
  1. 打开包含多个类别（多根 Bar）的 Pareto 图。
  2. 观察 Bar 动画与线条动画的先后顺序。
- **Expected Result**：所有 Bar 完全长出后，Pareto 线才开始画出，两者之间存在明显的短暂间隔。
- **Risk Covered**：跨方法时序耦合风险。

🔴 测试-分析：在bar出现后出现动画

### Scenario 3：无 Ghost Fill 效果验证

- **Scenario Objective**：验证 Pareto 线动画不应用 ghost fill 效果。
- **Scenario Description**：需求明确排除 ghost fill，若实现遗漏排除或误复用普通折线图的填充逻辑，会产生需求之外的视觉效果。
- **Key Steps**：
  1. 打开包含 Pareto 图的 Viewsheet，触发动画。
  2. 对比 Pareto 线与图表中其它折线系列（若有）的动画表现。
- **Expected Result**：Pareto 线下方无渐变填充效果；其它折线系列（若存在）仍保留原有 ghost fill 效果。
- **Risk Covered**：需求一致性（ghost fill 排除）风险。

🔴 测试-分析：target line没有动画

### Scenario 4：无 Hover 交互效果验证

- **Scenario Objective**：验证 Pareto 线动画未引入额外的 hover 高亮/tooltip 变化行为。
- **Scenario Description**：需求明确排除 hover 效果，需确认动画改动未影响该线原有的 hover/tooltip 交互。
- **Key Steps**：
  1. 鼠标悬浮在 Pareto 线上。
  2. 观察是否出现因动画引入的新增高亮效果。
- **Expected Result**：无因动画引入的额外 hover 高亮效果；原有 tooltip（如有）行为不受动画改动影响。
- **Risk Covered**：需求一致性（hover 排除）风险。

🔴 测试-分析：不影响

### Scenario 5：虚线 Pareto 线动画验证

- **Scenario Objective**：验证 Pareto 线为虚线样式时，clip-path wipe 动画正确呈现且不破坏虚线样式。
- **Scenario Description**：实现中虚线与实线走不同动画分支，若 Pareto 线支持虚线线型配置，需验证该分支同样生效。
- **Key Steps**：
  1. 将 Pareto 线样式配置为虚线。
  2. 触发图表动画，观察绘制效果。
- **Expected Result**：虚线 Pareto 线以从左到右擦除方式显示，最终虚线样式与静态状态一致，无锚点圆点残留。
- **Risk Covered**：虚线动画分支风险、Batik 端点圆点隐藏风险。

🔴 测试-分析：没有虚线配置，忽略

### Scenario 6：无 Bar 数据时的 Pareto 线动画验证

- **Scenario Objective**：验证 Pareto 图不含 Bar（如筛选后无数据）时，Pareto 线动画仍能正确触发。
- **Scenario Description**：时序计算依赖 `lastBarDelay`，Bar 数量为 0 时该值可能为默认值，需验证不会导致动画丢失或异常。
- **Key Steps**：
  1. 构造/筛选出仅有 Pareto 线、无 Bar 数据的场景。
  2. 触发动画。
- **Expected Result**：Pareto 线动画正常触发，无异常或空白显示。
- **Risk Covered**：边界场景下时序计算风险。

🔴 测试-分析：应用正确

### Scenario 7：导出/打印场景下 Pareto 线完整性验证

- **Scenario Objective**：验证导出为 PDF/Image 或打印预览时，Pareto 线以完整（非动画中间态）形式呈现。
- **Scenario Description**：SVG 动画注入的初始状态为"未画出"，若导出流程未跳过或重置该状态，导出结果可能缺失或残缺显示 Pareto 线。
- **Key Steps**：
  1. 打开包含 Pareto 图的 Viewsheet。
  2. 分别执行 PDF 导出、Image 导出与 Print Layout 预览。
- **Expected Result**：导出/打印结果中 Pareto 线完整显示，与关闭动画时的历史导出效果一致。
- **Risk Covered**：静态导出场景兼容性风险。

🔴 测试-分析：导出不影响

### Scenario 8：普通折线图/面积图动画回归验证

- **Scenario Objective**：验证提取共享方法 `applyLineDrawAnimation` 后，普通折线图与面积图的原有动画效果未被破坏。
- **Scenario Description**：本次改动复用了原折线动画绘制逻辑，属于间接修改，需确保历史功能不回归。
- **Key Steps**：
  1. 打开不含 Pareto 的普通折线图（含多系列）与面积图。
  2. 触发动画，观察绘制效果、ghost fill、多系列先后顺序。
- **Expected Result**：各系列按原有 stagger 延迟依次画出；面积图 ghost fill 效果保留；虚线折线仍走 clip-path wipe；Batik 端点圆点仍被隐藏。
- **Risk Covered**：共享逻辑重构导致的回归风险。

🔴 测试-分析：不影响