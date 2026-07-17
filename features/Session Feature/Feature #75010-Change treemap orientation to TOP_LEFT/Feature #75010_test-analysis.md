# StyleBI Feature #75010 测试分析报告

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：将 Treemap（矩形树图）的默认渲染朝向调整为标准视图习惯 —— 最大值方块位于左上角，依次向右下角递减（Z字形/阅读顺序），并提供 API 支持自定义四个角(TOP_LEFT/TOP_RIGHT/BOTTOM_LEFT/BOTTOM_RIGHT)的朝向。
- **用户价值**：解决用户对 Treemap 默认渲染顺序不符合"重要数据优先呈现在左上角"这一通用可视化认知习惯的问题，提升数据可读性和视觉一致性；同时通过脚本 API 满足特殊排布需求。
- **Feature 类型**：Rendering（图表渲染，仅限脚本层面暴露自定义能力，无新增 UI 控件）。

---

## 第二部分：Implementation Change（变更分析）

**核心变更**：
- `TreemapElement` 新增 `Orientation` 枚举（`TOP_LEFT`、`BOTTOM_LEFT`、`TOP_RIGHT`、`BOTTOM_RIGHT`）及对应 `getOrientation()`/`setOrientation()`。
- 新增字段默认值 `orientation = Orientation.TOP_LEFT`。
- `createGeometry()` 中，仅 `TREEMAP` 类型（`CIRCLE` 类型不受影响）在 `root.layout(...)` 布局完成后调用新增的 `applyOrientation(root)`。
- `applyOrientation`/`applyFlip` 递归遍历树节点，依据 orientation 对每个节点 `Mappable` 的 `Rect` 做 Y 翻转（`flipY`）和/或 X 翻转（`flipX`）：
  - `TOP_LEFT`：flipY=true，flipX=false（因 VGraph 最终会对 y 做全局翻转，此处需预翻转抵消，使最大项呈现在左上）
  - `BOTTOM_LEFT`：不翻转（等价于 PR 之前的原始渲染效果）
  - `TOP_RIGHT`：flipY=true，flipX=true
  - `BOTTOM_RIGHT`：flipX=true，flipY=false

**目标覆盖度**：

| Feature 需求点 | 是否覆盖 | 说明 |
|---|---|---|
| 默认最大值在左上角，依次递减到右下角 | ✅ 覆盖 | 默认值 `TOP_LEFT` 且仅对 flipY 生效，符合描述 |
| 提供 `setOrientation` 方法自定义朝向 | ✅ 覆盖 | 新增 getter/setter，且 Redmine 验收记录中的脚本示例 `elem.setOrientation(TreemapElement.Orientation.TOP_RIGHT)` 印证可通过脚本调用 |
| 仅适用于 TREEMAP 类型 | ✅ 覆盖 | switch-case 中仅 `TREEMAP` 分支调用 `applyOrientation` |
| Feature 描述中提及的算法差异（Slice-and-dice / Squarified / Binary Treemap）细节适配 | ⚠️ 未明确覆盖 | PR 未见针对不同 `Algorithm`（SLICE/BINARY/SQUARIFIED）分别处理翻转逻辑的代码，是否所有算法下都能正确呈现"最大值左上"需要测试验证，而非假定。**已确认**：`Algorithm` 属性面板同样无 UI 入口，`GraphGenerator` 也从未调用 `setAlgorithm()`，与本次新增的 `Orientation` 一样是纯脚本属性（默认 `SQUARIFIED`），此为既有设计、非本 PR 引入的缺口 |
| UI 层面可视化配置入口（图表属性面板） | ❌ 未覆盖 | PR 仅涉及后端 `TreemapElement`，未见前端/属性面板改动，说明该能力目前仅可通过脚本使用 |

**行为变化对比表**：

| Before Behavior | After Behavior | Risk |
|---|---|---|
| Treemap 直接使用布局算法原始输出坐标（不做翻转），实际视觉效果等价于新版的 `BOTTOM_LEFT`（最大项在左下） | 默认改为 `TOP_LEFT`：对 Y 坐标做预翻转，最大项呈现在左上角 | 所有既有 Treemap 报表/仪表板在升级后视觉呈现将发生变化，且无 UI 开关可恢复旧效果（仅可通过脚本显式设置 `BOTTOM_LEFT`） |
| 无 Orientation 概念，无脚本控制入口 | 新增 `Orientation` 枚举及 `getOrientation`/`setOrientation`，可在脚本中调用 | 需验证脚本引擎能否正确识别/暴露该新枚举及方法（PR 未见脚本绑定层改动） |
| CIRCLE（旭日图/环形树图）类型渲染逻辑不变 | CIRCLE 类型依旧不受 orientation 影响 | 用户在同一 Treemap 元素上切换 mapType 时可能误以为 orientation 对 CIRCLE 也生效 |

---

## 第三部分：Risk Identification（风险识别）

- **Rendering / 默认行为变化（高）**：默认朝向从"未定义/等价 BOTTOM_LEFT"变为 `TOP_LEFT`，属于**无感知的默认视觉变更**，会影响所有历史 Treemap 图表、仪表板截图基线、定时任务导出的报表外观，且没有 UI 层的一键恢复方式。
- **Cross-Module / 交互一致性（中高）**：翻转发生在 `createGeometry()`（几何生成阶段），早于 `createVisual`/hit-test 区域生成，理论上点击、Tooltip、超链接、Highlight 应基于翻转后坐标定位；但需要实测验证跨模块（选择态、下钻、超链接跳转）坐标是否与视觉呈现完全一致。
- **Compatibility / 向后兼容性（高）**：由于该属性未见持久化到 `VSChartInfo`/资产 XML（仅存在于运行时 `TreemapElement`，需脚本每次渲染时重新设置），"自定义朝向"无法作为设计态属性保存，依赖脚本的用户如果误删脚本将静默回退为默认 `TOP_LEFT`。
- **Rendering / 算法差异覆盖（中）**：Feature 描述中提到 Slice-and-dice、Squarified、Binary 三种算法的最大项定位逻辑略有不同，PR 的翻转实现是否对三种 `Algorithm` 均正确尚未验证。
- **Cross-Module / Export & Print（中）**：涉及坐标计算变更，需要验证 PDF/Excel/Image 导出及打印预览与 Portal 显示一致。
- **边界情况（低）**：单节点（无子节点）Treemap、深层级钻取（多个 `treeDims`）的树节点递归翻转是否全部正确应用。
- **非法输入（低）**：`setOrientation(null)` **实测会抛出校验异常**（`orientation must not be null`），脚本执行失败并提示 "Script failed: ..."（并非此前推测的静默降级为不翻转）。需确认该报错仅导致当前图表脚本执行失败、不影响页面其他组件；同时需检查该报错信息对普通用户是否足够友好（暴露的是内部字段名 `orientation` 而非 UI 术语）。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**：
  1. 默认（无脚本干预）情况下 Treemap 最大值是否渲染在左上角，且依次向右下角递减；
  2. 通过脚本设置四种 `Orientation` 枚举值后，最大项是否分别落在对应角落；
  3. 该变更是否仅影响 `TREEMAP` 类型，不影响 `CIRCLE` 类型。

- **高风险路径**：
  - 打开/刷新已有（升级前保存的）Treemap 仪表板，观察默认外观变化；
  - 通过脚本动态切换 orientation 后再次刷新/导出；
  - 多层级下钻（多个 `treeDims`）的 Treemap 节点交互（点击、Tooltip、超链接、Highlight）；
  - Treemap 与 CIRCLE 类型互相切换 mapType 的场景。

- **涉及模块**：Chart 核心渲染引擎（TreemapElement/TreemapCoord/TreemapVO）、Viewsheet 脚本引擎、导出模块（PDF/Excel/Image）、打印预览、Highlight/Hyperlink/下钻交互、移动端 Viewer。

- **专项检查**：
  - **本地化**：不涉及 UI 文本变更，跳过。
  - **配置检查**：不涉及 `SreeEnv`/`defaults.properties`，跳过。
  - **脚本兼容**：需重点验证 —— 新增的 `Orientation` 枚举与 `getOrientation`/`setOrientation` 方法是否可在图表脚本中正常调用；脚本编辑器 Auto-complete 是否能识别新枚举值及方法签名；由于该能力目前无 UI 入口，需确认"UI 与 Script 是否同步"这一检查项在此不适用（纯脚本功能）。
  - **文档一致性**：需检查脚本 API 帮助文档是否已补充 `TreemapElement.Orientation` 说明及使用示例（PR 未包含文档改动）。

- **Mobile 影响检查**：需验证移动端/小屏幕下 Treemap 默认朝向渲染及点击/Tooltip 交互定位是否正确。

- **Print Layout / Export 影响检查**：涉及图形绘制坐标翻转，需验证 PDF、Excel、Image 导出及打印预览效果与 Portal 展示保持一致。

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景 1：默认渲染朝向验证

- **Scenario Objective**：验证新建 Treemap 图表在不做任何自定义配置的情况下，默认按照"最大值左上、依次递减到右下"的标准顺序渲染。
- **Scenario Description**：这是本次需求的核心用户价值，若默认效果不符合预期，将直接影响所有新建 Treemap 报表的可读性。
- **Key Steps**：
  1. 新建 Viewsheet，添加 Treemap 图表并绑定一个维度和一个度量；
  2. 不设置任何脚本，直接查看图表渲染结果。
- **Expected Result**：数值最大的矩形块出现在图表左上角，数值依次递减，最小值出现在右下角。
- **Risk Covered**：默认行为变化。

🔴 **测试-分析**： 符合预期

---

### 场景 2：四种朝向枚举值切换验证

- **Scenario Objective**：验证通过脚本自定义 Treemap 朝向（左上/左下/右上/右下）后，最大值方块的位置能正确切换到对应角落。
- **Scenario Description**：该功能是本次需求新增的自定义能力，若某一朝向值未生效或方向计算错误，将导致用户自定义排布与预期不符。
- **Key Steps**：
  1. 在**该图表自身的 Script**（图表属性对话框 Script 标签页，而非 Viewsheet 的 onLoad）中依次写入以下脚本并刷新图表，每次切换 `Orientation` 枚举值：
     ```javascript
     var TreemapElement = Java.type("inetsoft.graph.element.TreemapElement");
     var elem = graph.getElement(0);
     elem.setOrientation(TreemapElement.Orientation.TOP_RIGHT); // 依次替换为 TOP_LEFT / BOTTOM_LEFT / BOTTOM_RIGHT
     ```
  2. 每设置一次朝向，观察并记录最大值方块所在角落。
- **Expected Result**：最大值方块分别正确落在 左上/左下/右上/右下 四个角落，且其余方块按大小依次向对角递减排布。
- **Risk Covered**：状态切换、默认行为变化。

🔴 **测试-分析**： 符合预期

---

### 场景 3：历史（升级前）Treemap 报表的兼容性验证

- **Scenario Objective**：验证升级前已保存的、未使用脚本自定义朝向的 Treemap 仪表板，升级后打开时的视觉变化是否可被用户理解和接受（无控件可一键恢复旧效果）。
- **Scenario Description**：默认朝向的改变会导致所有历史报表外观自动变化，这是一种"无操作触发的视觉回归"，容易被用户误判为缺陷，需要重点验证呈现是否稳健、不出现错乱或空白。
- **Pre-condition**：使用升级前版本创建并保存一个包含 Treemap 图表的仪表板。
- **Key Steps**：
  1. 将该仪表板导入/迁移至当前版本环境；
  2. 直接打开，不做任何修改；
  3. 与升级前的截图进行对比。
- **Expected Result**：图表正常渲染，无布局错乱、空白或数据缺失，仅呈现方向发生预期内的变化（最大值从左下变为左上）。
- **Risk Covered**：向后兼容性、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 4：多层级下钻 Treemap 的朝向一致性验证

- **Scenario Objective**：验证在包含多层嵌套维度（下钻）的 Treemap 中，朝向设置对所有层级的节点均一致生效。
- **Scenario Description**：Treemap 支持多维度嵌套展示，若翻转逻辑仅对顶层节点生效、子层级未正确翻转，会导致父子矩形位置不匹配、视觉错位。
- **Pre-condition**：Treemap 绑定两个及以上嵌套维度。
- **Key Steps**：
  1. 设置 Treemap 朝向为左上；
  2. 展开/查看多层嵌套的子矩形块。
- **Expected Result**：所有层级（父层和子层）的矩形块均按同一朝向规则排布，子矩形完全包含在对应父矩形范围内，无重叠或超出。
- **Risk Covered**：跨模块交互、边界条件。

🔴 **测试-分析**： Bug #75660(reject)
Note: 左上角放置的是最大总值组中的最大图块，而不一定是全局最大的图块

---

### 场景 5：Treemap 交互定位一致性验证（点击/Tooltip/超链接/下钻）

- **Scenario Objective**：验证朝向变更后，用户在图表上的点击选中、悬停提示、超链接跳转、下钻等交互操作，其触发位置与视觉呈现的矩形块保持一致。
- **Scenario Description**：坐标翻转发生在渲染管线较早阶段，若后续交互相关模块使用了未同步翻转的坐标缓存，会导致"点击某个矩形块却选中了另一个数据项"的隐蔽性缺陷。
- **Key Steps**：
  1. 设置 Treemap 为非默认朝向（如右下）；
  2. 鼠标悬停在左上角矩形块上，查看 Tooltip 显示的数据；
  3. 点击该矩形块触发下钻或超链接。
- **Expected Result**：Tooltip 显示与鼠标悬停矩形块对应的正确数据；点击/下钻/超链接跳转的目标与该矩形块所代表的数据项一致，不发生错位。
- **Risk Covered**：数据一致性、跨模块交互。

🔴 **测试-分析**： 符合预期

---

### 场景 6：导出与打印预览一致性验证

- **Scenario Objective**：验证 Treemap 图表在 PDF、Excel、Image 导出及打印预览中的朝向渲染与 Portal 在线展示保持一致。
- **Scenario Description**：坐标翻转属于绘制层面的改动，导出/打印走独立的渲染路径，存在与 Portal 展示不一致的风险。
- **Key Steps**：
  1. 在 Portal 中查看设置了某一朝向的 Treemap 图表；
  2. 分别导出为 PDF、Excel、Image，并打开打印预览。
- **Expected Result**：三种导出格式及打印预览中，最大值矩形块所在角落与 Portal 在线展示完全一致。
- **Risk Covered**：跨模块交互、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 7：TREEMAP 与 CIRCLE 类型切换的隔离性验证

- **Scenario Objective**：验证朝向设置仅对 TREEMAP（矩形树图）类型生效，切换为 CIRCLE（环形/旭日图）类型时不受影响。
- **Scenario Description**：Feature 明确说明该能力仅适用于 TREEMAP 类型，若 CIRCLE 类型意外受到影响，会造成非预期的渲染变化。
- **Key Steps**：
  1. 对同一图表设置朝向为左上；
  2. 将图表类型由矩形树图切换为环形树图（CIRCLE）。
- **Expected Result**：环形树图的渲染方式与朝向设置无关，切换前后表现与该功能上线前一致。
- **Risk Covered**：跨模块交互、回归风险。

🔴 **测试-分析**： 符合预期

---

### 场景 8：非法/边界输入的健壮性验证

- **Scenario Objective**：验证脚本中将朝向显式设置为空值时，系统能否给出明确的校验反馈，且不影响页面其他组件/图表的正常运行。
- **Scenario Description**：`setOrientation` 对空值做了主动校验（非此前推测的静默降级），需要确认该校验失败的影响范围是否被限制在当前图表脚本，不会波及整个 Viewsheet 或引发不可控的连锁错误。
- **Key Steps**：
  1. 在图表 Script 中显式设置朝向为空值：
     ```javascript
     var TreemapElement = Java.type("inetsoft.graph.element.TreemapElement");
     var elem = graph.getElement(0);
     elem.setOrientation(null);
     ```
  2. 刷新图表查看渲染结果及报错提示。
- **Expected Result**：脚本执行失败并明确提示 `orientation must not be null`（"Script failed: ..."）；仅该图表脚本执行受影响，Viewsheet 内其他组件/图表照常渲染，不发生级联崩溃。
- **Risk Covered**：非法输入、边界条件。

🔴 **测试-分析**： 符合预期

---

### 场景 9：脚本自动完成与算法类型组合验证

- **Scenario Objective**：验证脚本编辑器中新增的 `Orientation` 枚举及 `setOrientation`/`getOrientation` 方法具备自动完成提示，且在 Slice-and-dice、Squarified、Binary 三种布局算法下均能正确呈现"最大值左上"效果。
- **Scenario Description**：Feature 描述特别指出三种算法在最大项定位上的实现细节略有差异，需要确认本次改动对所有算法一视同仁地生效；同时脚本可用性是当前唯一的用户交互入口，须保证易用性。**已确认 Algorithm 与 Orientation 一样，属性面板上没有任何 UI 入口（下拉框等）**，只能通过脚本调用 `setAlgorithm()`，因此下方步骤全部走脚本。
- **Key Steps**：
  1. 在图表 Script 中输入 `var TreemapElement = Java.type("inetsoft.graph.element.TreemapElement");` 后换行输入 `TreemapElement.Orientation.` 及 `elem.`，观察脚本编辑器是否弹出自动完成候选（`TOP_LEFT` 等枚举值 / `setOrientation`、`getOrientation` 方法）；
  2. 固定朝向为左上，依次切换三种算法并刷新观察：
     ```javascript
     var TreemapElement = Java.type("inetsoft.graph.element.TreemapElement");
     var elem = graph.getElement(0);
     elem.setOrientation(TreemapElement.Orientation.TOP_LEFT);
     elem.setAlgorithm(TreemapElement.Algorithm.SLICE); // 依次替换为 BINARY、SQUARIFIED（默认值）
     ```
- **Expected Result**：编辑器正确提示 `Orientation` 枚举值与相关方法（若实际不提示，记录为体验性缺口而非功能缺陷）；三种算法下最大值矩形块均正确落在左上角。
- **Risk Covered**：脚本兼容性、边界条件。

🔴 **测试-分析**： Bug #75681， Bug #75683

---

## 附录：脚本设置参考（Script Reference）

**编写位置**：该图表自身的 **Script**（图表属性对话框 → Script 标签页 / Composer 中右键图表 → Edit Script）。**不要**写在 Viewsheet 的 `onLoad` 里 —— `graph`（`EGraph`）变量只绑定在图表自身的 per-assembly 脚本作用域，`onLoad` 是 Viewsheet 级作用域，访问不到 `graph`。

**可用脚本（在当前 GraalJS 引擎下验证可行）**：
```javascript
var TreemapElement = Java.type("inetsoft.graph.element.TreemapElement");
var elem = graph.getElement(0);
elem.setOrientation(TreemapElement.Orientation.TOP_RIGHT); // TOP_LEFT / BOTTOM_LEFT / BOTTOM_RIGHT
```
