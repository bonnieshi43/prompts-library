## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为 Chart 新增两类“非数据绑定区域”的超链接能力：**Chart Title（标题）** 与 **Empty Plot Area（空白绘图区）**，使用户可直接在这些区域点击跳转，而无需用透明文本框覆盖来“模拟链接”。
- **用户价值**：
  - 替代“透明 TextBox 覆盖”的绕行方案，避免遮挡导致 **tooltip / brushing / drilling** 等交互失效。
  - 提升看板可用性：标题可作为明确入口；绘图区无数据点/无选区时也能作为“空白点击跳转区”。
- **Feature 类型**：UI 交互 + Viewer 行为（Hyperlink click/tooltip/cursor）+ 持久化（VSAssemblyInfo XML）+ 兼容性/回归风险。

---

## 第二部分：Implementation Change（变更分析）

### Input Validation（输入完整性检查）
- PR 可访问：✅ 已读取 PR `inetsoft-technology/stylebi#2489` 的基本信息与 files diff（patch 形式）。
- PR 描述信息：⚠️ PR body 为空（`body: null`），Feature 细节只能依赖 Title + diff 推断，可能存在“未写明的约束/预期”导致分析不完整。
- PR diff 完整性：⚠️ 工具返回的是每个文件的 patch 摘要（非完整文件上下文），但已覆盖核心改动文件；若存在未展示的逻辑（例如服务端保存入口/前端点击分发更深层逻辑）可能遗漏边界行为。
- Knowledge：✅ 已提供知识库文档（chart type 分类）；但本需求与 chart type 的关系主要体现在“哪些 chart 类型允许 empty plot hyperlink”。

### 核心变更
1. **后端：ChartVSAssemblyInfo 增加两类 Hyperlink 持久化字段**
   - 新增字段：`titleLinkValue`, `emptyPlotLinkValue`（类型 `inetsoft.report.Hyperlink`）。
   - 支持：
     - clone 深拷贝（避免复制/撤销/模板复用时丢失或引用共享）
     - XML 序列化/反序列化：写入 `<titleLinkValue><Hyperlink.../></titleLinkValue>` 与 `<emptyPlotLinkValue>...`
     - copyViewInfo 时比较并同步（影响“属性复制/粘贴/应用格式”等流程）

2. **后端：HyperlinkDialogController 扩展支持两种特殊区域**
   - 新增 request 参数：`titleLink`, `emptyPlotLink`
   - 当 title/emptyPlot 场景：
     - **不返回 Fields**（因为“非数据绑定区域”不应出现列字段选择）
     - 初始化 hyperlink 数据来源改为 `ChartVSAssemblyInfo.getTitleLinkValue()` / `getEmptyPlotLinkValue()`
   - 保存逻辑：
     - 若 `model.isTitleLink()`：写回 `info.setTitleLinkValue(hyperlink)`
     - 若 `model.isEmptyPlotLink()`：写回 `info.setEmptyPlotLinkValue(hyperlink)`
     - 否则走原有 axis/plot/region 的 hyperlink 逻辑（Treemap 特殊、MergedVSChartInfo 等仍保留）

3. **后端 -> 前端模型：VSChartModel 增加 title/emptyPlot 的 HyperlinkModel**
   - `VSChartModel`（Java）从 `ChartVSAssemblyInfo` 读出 `titleLinkValue/emptyPlotLinkValue`
   - 转换为前端可用的 `HyperlinkModel`：`titleLinkModel`, `emptyPlotLinkModel`
   - `@JsonIgnore` 隐藏原始 Hyperlink，仅暴露 model（减少前端处理复杂度）

4. **前端（Composer）：新增两个菜单动作入口**           
   - 新增 action：
     - `chart title-hyperlink`（仅当 `composer && model.titleSelected`）
     - `chart emptyPlot-hyperlink`（仅当 `composer && regions.length==0 && !titleSelected`，且排除 `Mekko/Treemap/Icicle`）
   - `ChartActionHandlerDirective` 调起 HyperlinkDialog 时追加参数：
     - title：`titleLink=true`，并且不会强制 `isAxis=true`
     - emptyPlot：`emptyPlotLink=true`，并且不会强制 `isAxis=true`
   - 同时兼容“title 已被选中”的路径：即使不是从 action 点击进入，也可通过 `model.titleSelected` 触发 titleLink 参数。

5. **前端（Viewer/Preview）：点击与指针/tooltip 行为增强**
   - Title：
     - viewer 时 title 显示 `cursor-pointer`（`cursorPointer` input）
     - title tooltip 使用 `model.titleLinkModel?.tooltip`
     - title 点击：在 preview 模式与非 preview 模式均加入“若存在 titleLinkModel 且左键”则执行 clickLink（注意：非 preview 模式仍会选中 title，并且左键会触发点击链接）
   - Empty Plot：
     - plot-area hover：当没有 link point 且 `hasEmptyPlotLinkModel==true` 且当前 `regions.length==0` 时 cursor 变成 pointer（暗示可点击）
     - chart-area tooltip：非移动端、无 tipInfo 时，将 `emptyPlotLinkTooltip` 追加到 tooltipString
     - clickHyperlink(event)：当“当前选中 regions 为空 且 emptyPlotLinkModel != null”时，点击触发 emptyPlot hyperlink，而不是原 clickAction

6. **i18n**            
   - 新增资源 key：
     - `Hyperlink Title`
     - `Hyperlink Empty Plot Area`

### 目标覆盖度（Feature vs PR）
- “At a minimum allow chart title hyperlink”：✅ 覆盖（持久化、编辑入口、viewer 点击、tooltip/cursor）
- “Allow hyperlink on empty chart plot area”：✅ 覆盖（持久化、编辑入口、viewer 点击、hover cursor、tooltip）
- “避免透明文本框遮挡导致 tooltip/brush/drill 失效”：✅ 部分覆盖（emptyPlot hyperlink 仅在 `selectedRegions.length==0` 时触发；意味着**当用户点到数据点/已选区时仍优先原交互**，符合“尽量不干扰”目标）
- “所有 chart 类型均支持？”：⚠️ 未完全覆盖/存在显式排除（Mekko/Treemap/Icicle 不显示 empty plot hyperlink 动作），需确认产品预期是否一致。

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|---|---|---|
| Chart Title 不支持设置/点击超链接（通常需覆盖组件模拟） | Title 可在 Composer 设置 Hyperlink；Viewer/Preview 左键点击标题可触发跳转；Title 显示 pointer + tooltip | 标题点击与“选择标题/编辑标题/拖拽调整”等交互冲突；误触导致跳转 |
| Plot Area 空白区域无法设置 Hyperlink | 可为 empty plot area 设置 Hyperlink；无选区/无 region 时 hover 显示 pointer；点击触发跳转 | 与 brushing/拖拽框选/缩放/平移等手势冲突；不同 chart 类型 region 判定差异导致误触/无法触发 |
| Hyperlink Dialog 针对图表多为数据绑定区域（fields 可选） | title/emptyPlot 场景 fields 被禁用，不再出现字段选择 | Dialog 逻辑分支增加，可能影响原 axis/plot hyperlink 场景（参数组合错误时 fields 缺失） |
| 超链接信息不在 ChartVSAssemblyInfo 中持久化（title/emptyPlot 维度） | 新增 XML 节点持久化与 clone/copy | 兼容旧文件/导入导出：旧版本解析、新版本写出、回滚等兼容性风险 |

---

## 第三部分： Risk Identification（风险识别）

- **Functional**      🔴 **测试-分析**：功能正常
  - Title 左键点击在非 preview（设计态/绑定态）下也会触发 clickLink（代码中在设置 titleSelected 后仍执行），可能与“仅选中不跳转”的用户预期冲突。
  - emptyPlot hyperlink 触发条件依赖 `getSelectedRegions().length === 0` 与 `regions.length == 0`；若 selection 状态残留/region 计算异常，会导致“应跳不跳/不应跳却跳”。

- **Rendering / UI** 🔴 **测试-分析**：功能正常
  - cursor-pointer + tooltip 增加后，Title 样式与布局（wrap/float/padding）可能出现 CSS 叠加问题。
  - tooltipString 追加 emptyPlotLinkTooltip 可能与原 tooltip 文案拼接（无分隔符/多语言）产生可读性问题。

- **Compatibility / Cross-Module**   🔴 **测试-分析**  plot区域被填充满的不应该支持 Bug #73284
  - Chart Actions 菜单结构新增项导致原有 action index 变化（已有 spec 里出现大量 snapshot 更新）；可能影响其他依赖固定序号的逻辑（若存在）。
  - PR 显式排除 Mekko/Treemap/Icicle 的 empty plot hyperlink；结合知识库 chart 分类（partition/network 等），不同图表“绘图区/空白”的定义差异大，存在支持范围不一致风险。

- **Data Consistency**    🔴 **测试-分析** 功能正常
  - ChartVSAssemblyInfo XML 新节点：导入导出、复制粘贴、模板、版本兼容（旧版本忽略/新版本读取）需要验证。
  - clone/copyViewInfo 引入 hyperlink 对象 clone/equals，若 Hyperlink 内部含动态表达式/参数，可能出现浅拷贝残留或 equals 判定不一致。

- **Security**     🔴 **测试-分析** 不需要考虑
  - 超链接可能支持 URL / javascript / 参数拼接（取决于 Hyperlink 类型）；title/emptyPlot 属于“非数据绑定区域”，更容易被用户用作外链入口，需关注 XSS/开放重定向策略是否一致。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**    🔴 **测试-分析** 其它符合预期，在一些区域显示tooltip但是不能点击报Bug #74143
  1. Composer 能分别对 **Title** 与 **Empty Plot Area** 打开 Hyperlink Dialog，并正确保存到 chart（刷新/保存 viewsheet 后不丢失）。
  2. Viewer/Preview 中：
     - Title：显示 pointer、tooltip 正确、左键触发跳转（并符合移动端/单击策略）。
     - Empty plot：在“无数据点区域/无选区”时 pointer、tooltip 正确，点击触发跳转；在有数据点/有选区时不应抢占原本数据点 hyperlink/交互。
  3. 不破坏原有 axis/plot/region 的 hyperlink 行为（回归）。

- **高风险路径**    🔴 **测试-分析**  交互不存在冲突，这个feature在空区域，其它的在数据区域
  - 标题点击 vs 标题编辑（双击编辑）/标题选择/标题拖拽 resize 的交互冲突。
  - empty plot click vs brushing（框选）、drill、pan/zoom、右键菜单/mini toolbar 等交互优先级冲突。
  - 选择状态残留（selectedRegions）导致 emptyPlot hyperlink 误触发/不触发。
  - 特殊图表类型（Mekko/Treemap/Icicle）以及“无传统坐标轴”的图（pie/treemap/map等）对“plot/region”判定差异。

- **涉及模块（回归范围）**
  - Dashboard / Viewsheet Viewer（交互与渲染）            🔴 **测试-分析**  功能正常
  - Composer（Chart actions、Hyperlink dialog）          🔴 **测试-分析**  功能正常
  - Chart（selection/tooltip/hyperlink service）         🔴 **测试-分析**  功能正常
  - Export（若导出包含 hyperlink/交互提示，需确认不影响）   🔴 **测试-分析**  功能正常
  - Import/Export / Copy-Paste（VSAssemblyInfo XML）    🔴 **测试-分析**  功能正常
  - Session/权限（链接跳转策略、target/self、viewer 权限）🔴 **测试-分析**  不影响

- **专项检查（基于本次 diff 实际相关）**
  - **本地化**：新增 `Hyperlink Title` / `Hyperlink Empty Plot Area`，需验证多语言包（至少英文+系统默认语言）是否齐全、界面是否回退到 key。 🔴 **测试-分析**  功能正常
  - **脚本兼容**：前端 `VSChartModel` interface 新增 `titleLinkModel/emptyPlotLinkModel`（readonly），需验证：
    - 旧脚本/自定义扩展读取 VSChartModel 不报错（类型/字段可选）
    - 若系统支持脚本访问 hyperlink（show/click），这些字段是否需要暴露/文档化（目前看是 viewer UI 用，不一定脚本用）                        🔴 **测试-分析**  不支持脚本
  - **文档一致性**：Hyperlink Dialog 对 chart 新增两个入口（title/empty plot），需要确认 Help/用户文档是否更新（PR 未见文档改动）。        🔴 **测试-分析**  Documentation #74059

---

## 第五部分：Key Test Scenarios (核心测试场景)

### 1) Title Hyperlink - Composer 设置与持久化       🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证标题超链接可配置、保存、重新打开保持一致。
- **Scenario Description**：titleLinkValue 新增到 ChartVSAssemblyInfo 并走 XML 持久化，需验证不丢失。
- **Pre-condition**：有可编辑的 Viewsheet，包含一个带标题的图表。
- **Key Steps**
  1. 进入 Composer，点击选中 Chart Title（使 `titleSelected=true`）。
  2. 打开菜单动作 **Hyperlink Title**，配置一个 URL（含 tooltip/target/self 等常用选项）。
  3. 保存 Viewsheet，刷新浏览器或重新打开 Viewsheet。
  4. 再次进入 Hyperlink Title 对话框查看配置。
- **Expected Result**
  - 对话框字段正确回显；保存后配置不丢失。
  - 对话框中不出现“Fields（字段绑定）”相关选项（或为灰态/不可用）。
- **Risk Covered**：Data Consistency、Functional（dialog 分支）、Compatibility（序列化/反序列化）

### 2) Empty Plot Hyperlink - Composer 设置入口可见性（类型/状态）    🔴 **测试-分析**   Bug #73284
- **Scenario Objective**：验证 empty plot hyperlink action 的可见性规则正确。
- **Scenario Description**：PR 中对 emptyPlot action 做了 chart type 限制（排除 Mekko/Treemap/Icicle）且要求 regions 为空、title 未选中。
- **Pre-condition**：准备多个图表类型：普通轴类（Bar/Line）、Treemap、Icicle、Mekko（或等价）。
- **Key Steps**
  1. 对每个图表：确保未选中 title、且当前无选中 region（点击空白处清空选择）。
  2. 打开 chart actions 菜单，观察 **Hyperlink Empty Plot Area** 是否出现。
  3. 选中 title 后再观察该 action 是否消失（或不可用）。
- **Expected Result**
  - 普通轴类图：action 可见。
  - Treemap/Icicle/Mekko：action 不可见。
  - titleSelected 时：empty plot action 不可见。
- **Risk Covered**：Compatibility（不同 chart 类型）、Functional（可见性分支）

### 3) Viewer - Title 点击跳转（桌面端）   🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证 Viewer 中标题可点击跳转且 tooltip/cursor 正确。
- **Scenario Description**：前端为 vs-title 增加 cursor-pointer 与 tooltip，并在 selectTitle 中触发 clickLink。
- **Pre-condition**：已为图表标题设置 title hyperlink；以 Viewer 模式打开。
- **Key Steps**
  1. 鼠标悬停标题，观察鼠标样式与 tooltip。
  2. 左键单击标题。
- **Expected Result**
  - 标题区域鼠标为 pointer，tooltip 显示 hyperlink tooltip（若配置）。
  - 左键点击触发 hyperlink 跳转（符合 self/new tab 策略）。
- **Risk Covered**：Rendering/UI（cursor/tooltip）、Functional（点击触发）

### 4) Designer/Binding 非 Preview - 标题点击行为不误跳（预期确认型）   🔴 **测试-分析**  功能正常
- **Scenario Objective**：澄清并验证“非 preview 状态下点击标题”的预期（是否应跳转）。
- **Scenario Description**：代码在非 preview 时也会在 selectTitle(event.button==0) 执行 clickTitleHyperlink，存在误跳风险。
- **Pre-condition**：Composer 设计态（非 preview），标题已配置 hyperlink。
- **Key Steps**
  1. 在 Composer 中单击标题（用于选中/编辑前的常规操作）。
  2. 尝试双击标题进入编辑。
- **Expected Result**
  - （产品预期待确认）若设计态应“只选中不跳转”，则不应触发跳转；双击可进入编辑且不被跳转打断。
  - 若设计态允许跳转，则需保证仍可稳定进入编辑（双击）与 resize，不出现频繁误触。
- **Risk Covered**：Functional（默认交互变化）、Cross-Module（设计态 vs viewer）

### 5) Viewer - Empty Plot hover/click（无选区、无数据点）   🔴 **测试-分析**  功能正常，鼠标是小手状态
- **Scenario Objective**：验证空白绘图区在“无 region”时可点击触发 hyperlink。
- **Scenario Description**：plot-area 中当 `regions.length==0 && hasEmptyPlotLinkModel` 时 cursor 变 pointer；clickHyperlink 中当 selectedRegions 为空则触发 emptyPlotLink。
- **Pre-condition**：图表配置 empty plot hyperlink；Viewer 桌面端；图表存在绘图区但当前鼠标位置无数据点。
- **Key Steps**
  1. 移动鼠标到明显空白绘图区（不在数据点/柱子上）。
  2. 观察 cursor 是否变为 pointer。
  3. 单击空白区域。
- **Expected Result**
  - cursor 显示 pointer。
  - 点击触发 empty plot hyperlink 跳转。
- **Risk Covered**：Functional、Rendering/UI

### 6) Viewer - Empty Plot 不应抢占数据点/区域原交互     🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证当点击数据点/已存在 region hyperlink 时，仍以原 region 行为为主。
- **Scenario Description**：clickHyperlink 仅在 `getSelectedRegions().length==0` 时走 emptyPlot；否则走原 clickAction。
- **Pre-condition**：同一图表同时配置：某数据点/系列 hyperlink（或 drill/tooltip 可触发区域），并配置 empty plot hyperlink。
- **Key Steps**
  1. 点击带 hyperlink 的数据点/柱子。
  2. 点击空白绘图区。
- **Expected Result**
  - 点击数据点：触发数据点/区域 hyperlink（或原交互），不触发 empty plot hyperlink。
  - 点击空白：触发 empty plot hyperlink。
- **Risk Covered**：Functional（优先级）、Cross-Module（hyperlink 与 brushing/drill）

### 7) Tooltip 拼接 - emptyPlotLinkTooltip 与原 tooltip 共存       🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证 empty plot tooltip 加入后不破坏原 tooltip 展示与本地化。
- **Scenario Description**：ChartArea 里将 `emptyPlotLinkTooltip` 追加到 tooltipString（非移动端且无 tipInfo）。
- **Pre-condition**：桌面端 Viewer；配置 empty plot hyperlink，且图表原本存在 tooltip（例如 ctrlSelect 提示）。
- **Key Steps**
  1. 悬停绘图区，触发 tooltip。
  2. 观察 tooltip 内容是否可读（是否有必要分隔）、是否出现 key 未翻译。
- **Expected Result**
  - tooltip 不乱码、不重复叠加；文案本地化正确。
- **Risk Covered**：Rendering/UI、本地化

### 8) 导入导出/复制 - XML 持久化兼容       🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证新 XML 节点在导出导入、复制粘贴后仍有效。
- **Scenario Description**：ChartVSAssemblyInfo 新增 `<titleLinkValue>`/`<emptyPlotLinkValue>`，需覆盖常用流转。
- **Pre-condition**：有权限执行导出/导入或复制组件。
- **Key Steps**
  1. 在 A Viewsheet 配置 title 与 empty plot hyperlink。
  2. 通过（任选其一或组合）：
     - 导出再导入到同环境
     - 复制该 chart 到另一个 viewsheet
  3. 在 Viewer 验证点击行为。
- **Expected Result**
  - 两类 hyperlink 均保留且可点击。
- **Risk Covered**：Data Consistency、Compatibility

### 9) 移动端 Viewer - Show Hyperlinks 动作验证（Title / Empty Plot）  🔴 **测试-分析**  功能正常
- **Scenario Objective**：验证移动端通过 “Show Hyperlinks” 列出可点链接的行为与可见性逻辑。
- **Scenario Description**：PR 新增 `chart show-titleHyperlink` 与 `chart show-emptyPlotHyperlink`，仅 mobileDevice 且 viewer 下可见。
- **Pre-condition**：移动端（或模拟 mobileDevice）；Viewer 打开；分别配置 titleLinkModel/emptyPlotLinkModel。
- **Key Steps**
  1. 选中标题，观察是否出现 “Show Hyperlinks”（title）。
  2. 在无 region 且未选中 title 时，观察是否出现 “Show Hyperlinks”（empty plot）。
  3. 点击后验证弹出列表与链接点击跳转。
- **Expected Result**
  - titleSelected 时仅显示 title 对应 show action；空白区域场景显示 empty plot 对应 show action。
  - 列表包含正确 tooltip/label，点击可跳转。
- **Risk Covered**：Compatibility（移动端策略）、Functional（showHyperlinks 数据源）

### 10) 回归：原有 Axis/Plot/Region Hyperlink 不受影响        🔴 **测试-分析**  功能正常
- **Scenario Objective**：确保新增 title/emptyPlot 分支不破坏原 hyperlink 逻辑（尤其 Treemap、Merged chart）。
- **Scenario Description**：HyperlinkDialogController 保存逻辑重构，存在分支覆盖风险。
- **Pre-condition**：准备至少两种图：
  - 普通轴类图：给 Axis 或数据点设置 hyperlink
  - Treemap 或 MergedVSChartInfo 场景：给区域设置 hyperlink
- **Key Steps**
  1. 分别打开原有 hyperlink 对话框（axis/plot/region），配置并保存。
  2. Viewer 中验证点击是否仍正常。
- **Expected Result**
  - 原有 hyperlink 设置、保存、点击行为与此前一致。
- **Risk Covered**：Functional 回归、Cross-Module（特殊图表逻辑）