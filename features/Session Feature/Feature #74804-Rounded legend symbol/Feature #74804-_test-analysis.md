# Feature #74804 — Legend Symbol 圆角选项：结构化测试分析

---
## 未覆盖内容
1.和symbol一起使用 Bug #75028
2.color和shape或者size merge，shape和size merge
3.多个legend设置不同的值 Bug #75041
4.dc
5.select 区域Bug #75033
## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

**功能核心目标**：为图表图例（Legend）的符号色块（swatch）新增"圆角"渲染选项，使图例符号视觉上与图表其他圆角元素保持一致。

**解决的业务问题**：用户在图表中启用圆角样式时，图例符号仍为直角矩形，造成视觉不一致；本需求补全该 UI 一致性缺口。

**涉及模块**：
- **UI 层**：Legend Format 对话框（General 面板新增 checkbox）
- **业务逻辑层**：LegendSpec / LegendsDescriptor 属性读写、序列化/反序列化
- **渲染层**：ColorLegendItem、TextureLegendItem、SizeLegendItem 绘制逻辑
- **前端模型层**：Angular 组件模型与模板

**功能类型**：UI 样式 + 数据持久化（配置序列化）

---

### 2. 需求清晰度与完整性

**隐含假设未明确**：
- 原始需求仅提及"rounded corners"，未说明圆角半径应为固定值还是可配置值。实现中硬编码为 `SYMBOL_CORNER_RADIUS_RATIO = 0.3`（即符号尺寸的 30%）。若产品侧有不同预期，此处存在歧义。
- 需求未说明该选项是否应随"Round Corner"（图例边框圆角）联动，或完全独立控制。实现为独立控制，但需确认是否为预期。
`🔴 **测试-分析**：硬编码满足需求

**覆盖范围不明确**：
- 原始需求未说明 Shape Legend、Line Legend 是否需要支持。实现中明确排除（toggle 隐藏）。此决策合理，但需在测试中验证这两类图例确实不显示该选项。
- 未提及 Export（PDF/Excel/Image）场景下圆角是否应正确渲染。

`🔴 **测试-分析**：line,step line,jump line,point，Area，Radar，filled radar 类型chart size legend不支持，tree,network,circular network,map shape不支持

**非功能要求缺失**：
- 无性能基准要求（抗锯齿 hint 对大批量图例项的渲染性能影响未量化）。
- 无无障碍要求（checkbox 标签国际化已覆盖英文，其他语种未验证）。

---

### 3. 测试风险识别

| 风险 | 描述 |
|------|------|
| **旧配置兼容性** | `symbolRoundCorners` 在新图表中默认为 `true`，旧 XML 无此属性时强制解析为 `false`。若旧图表保存后重新打开，行为是否改变取决于解析路径，存在静默回归风险。 |
| **默认值不一致** | `LegendsDescriptor` 中 `symbolRoundCorners` 默认为 `true`（新图表），但 `LegendSpec` 中默认为 `false`。两者在不同代码路径下可能产生不一致的渲染结果。 |
| **SizeLegend 边界逻辑** | `SizeLegendItem` 中当条宽 `r < minRoundWidth` 时强制使用直角矩形，此逻辑仅对内部条形生效，外边框仍调用 `createSymbolRect(x, y, symbolSz, symbolSz)`（无 allowRound=false），存在内外渲染不一致风险。 |
| **Export 渲染** | 向量图形导出路径（`GTool.isVectorGraphics`）中，`SizeLegendItem` 的抗锯齿关闭条件新增了 `!isSymbolRoundCorners()` 判断，但 `ColorLegendItem` 和 `TextureLegendItem` 未见对应处理，Export 场景下抗锯齿行为可能不统一。 |

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型

**类型**：Feature（新功能）

**影响层级**：跨层

| 层级 | 改动文件 |
|------|----------|
| 渲染层 | `ColorLegendItem.java`、`TextureLegendItem.java`、`SizeLegendItem.java`、`LegendItem.java` |
| 数据/配置层 | `LegendSpec.java`、`LegendsDescriptor.java` |
| 业务逻辑层 | `GraphUtil.java`（LegendSpec 传播）、`LegendFormatDialogModel`（服务端 DTO） |
| UI 层 | `LegendFormatGeneralPaneModel`、`legend-format-general-pane.component.html`、对应 model.ts |
| 国际化 | `srinter.properties`（新增 `Round Symbol Corner` key） |

---

### 2. 需求实现一致性

**实现完整性**：
- Color / Texture / Size 三类图例符号已覆盖圆角渲染，符合需求核心目标。
- UI checkbox 通过 `symbolRoundCornersVisible` 正确隐藏 Shape / Line 图例的该选项。
- 序列化（XML 写出）和反序列化（XML 读入）均已实现，等号比较（`equals`/`hashCode`）已同步更新。
- `GraphUtil.java` 中 `LegendSpec` 传播路径已同步新属性。

**潜在实现不足**：
- **默认值不一致**（见风险识别）：`LegendsDescriptor.symbolRoundCorners = true`（新建图表默认开启），`LegendSpec.symbolRoundCorners = false`（渲染对象默认关闭）。`GraphUtil` 中仅在特定路径（`if legends != null`）传播，其他渲染路径若未经过 GraphUtil，将使用 `LegendSpec` 的 `false` 默认值，导致新建图表第一次渲染时符号不显示圆角。
- **国际化覆盖不完整**：仅更新了 `srinter.properties`（英文），其他语言资源文件（如中文、日文等）未在 diff 中可见，可能导致非英文环境显示 key 名而非翻译文本。

**隐式行为变化**：
- `SizeLegendItem` 中抗锯齿关闭逻辑从"非向量图形时关闭"变更为"非向量图形 **且** 非圆角时关闭"。这意味着即使在非向量图形模式下，开启圆角后抗锯齿始终保持开启，可能改变非圆角模式的渲染细节（取决于之前抗锯齿是否影响边框绘制）。

---

### 3. 关键实现风险

**风险 1：LegendsDescriptor 与 LegendSpec 默认值不对称**
- **来源**：`LegendsDescriptor.symbolRoundCorners = true`（新建时默认开启），`LegendSpec.symbolRoundCorners = false`
- **影响路径**：新建图表首次打开时，若 `GraphUtil` 传播路径未触发，渲染层读取 `LegendSpec` 默认值 `false`，符号不显示圆角，与 UI 勾选状态不符
- **潜在后果**：新建图表 UI 显示已勾选，但图表符号实际为直角，用户困惑

**风险 2：旧版 XML 加载后默认强制为 false**
- **来源**：`parseAttributes` 中：若 XML 无 `symbolRoundCorners` 属性，强制赋值 `false`（而非沿用字段默认 `true`）
- **影响路径**：旧版存档图表加载后，`symbolRoundCorners = false`，符号显示直角（与旧版一致，属于兼容性设计），但若用户期望升级后自动享有圆角效果，需明确产品决策
- **潜在后果**：旧图表加载后与新图表默认行为不一致，用户需手动勾选
`🔴 **测试-分析**：导入是false
**风险 3：SizeLegendItem 内外矩形圆角不一致**
- **来源**：内部条形 `fill` 使用 `createSymbolRect(x0, y, r, symbolSz, r >= minRoundWidth)`，外边框 `draw` 使用 `createSymbolRect(x, y, symbolSz, symbolSz)`（无 `allowRound` 参数，默认 `true`）
- **影响路径**：当条形较窄时，填充矩形为直角，但边框矩形为圆角，两者视觉不一致
- **潜在后果**：Size Legend 在小尺寸条形时出现填充/边框形状错位的视觉 Bug
`🔴 **测试-分析**：导出没有问题
**风险 4：多语言资源缺失**
- **来源**：仅 `srinter.properties`（英文）新增 `Round Symbol Corner` key
- **影响路径**：使用非英文 locale 的用户打开 Legend Format 对话框
- **潜在后果**：checkbox 标签显示原始 key 字符串而非翻译文本
`🔴 **测试-分析**：本地化以及添加
---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

**核心风险**：
1. 默认值不一致导致新建图表圆角状态与 UI 不同步
2. 旧版 XML 加载兼容性（强制 false）
3. Size Legend 小尺寸条形下填充与边框形状不一致
4. 多语言资源缺失导致 UI 显示异常

**是否改变默认行为**：是。新建图表 `symbolRoundCorners` 默认为 `true`（`LegendsDescriptor`），旧行为无此属性。

**是否影响历史配置**：是。旧版 XML 加载后强制 `false`，需验证旧图表打开不出现异常渲染。

---

### 3.2 必要测试类别

#### 功能验证（Functional）

**Why**：验证核心路径——勾选/取消勾选 checkbox 与图例符号渲染结果一致。

**Scope**：Color Legend、Texture Legend、Size Legend 三类图例；Shape Legend、Line Legend 隐藏 checkbox。

**Validation Goal**：
- 勾选"Round Symbol Corner"后，符号渲染为圆角矩形
- 取消勾选后，符号渲染为直角矩形
- Shape / Line 图例的 Legend Format 对话框中不显示该 checkbox

**Browser**：需在 Chrome、Firefox、Safari（若支持）分别验证 checkbox UI 及图表渲染结果。

**Script**：
- 验证是否可通过 Script 控制 `symbolRoundCorners` 属性（如 `chart.legendSpec.setSymbolRoundCorners(true)`）
- Script 修改后图表是否即时重渲染
- Script 设置值与 UI checkbox 状态是否同步
`🔴 **测试-分析**：Bug #75039

**Locale**：
- 切换至中文/日文等非英文 locale，验证 Legend Format 对话框中 checkbox 标签是否正常显示（不应显示原始 key `Round Symbol Corner`）

---
`🔴 **测试-分析**：已经添加

#### 回归测试（Regression）

**Why**：改动涉及 `LegendItem.paintSymbol` 渲染基类逻辑，以及 `SizeLegendItem` 抗锯齿判断条件变更，可能影响未启用圆角时的现有渲染行为。

**受影响模块**：Color Legend、Size Legend、Texture Legend 渲染路径

**可能被破坏的行为**：
- 未勾选圆角时，符号渲染与改动前一致（直角矩形、无多余抗锯齿）
- `SizeLegendItem` 中抗锯齿逻辑变更不影响非圆角状态下的边框渲染质量
- 已有图表打开后，图例符号样式无变化

---
🔴 **测试-分析**：导出好的

#### 边界与异常（Boundary）

**Why**：`SizeLegendItem` 存在基于宽度阈值的条件圆角逻辑，需验证边界条件。

**测试点**：
- Size Legend 中极小尺寸符号（条宽 < `minRoundWidth`）：验证 fill 为直角、draw 的形状是否一致
- Size Legend 中符号尺寸恰好等于 `minRoundWidth`（临界值）
- 符号尺寸设置为最小值 / 最大值时的圆角渲染

---
🔴 **测试-分析**：没有影响

#### 兼容性测试（Compatibility）

**Why**：旧版 XML 加载时 `symbolRoundCorners` 被强制设为 `false`，需验证旧图表不出现回归。

**测试点**：
- 加载不含 `symbolRoundCorners` 属性的旧版 XML 图表，图例符号应渲染为直角矩形
- 保存含有 `symbolRoundCorners="true"` 的图表后重新加载，值应正确还原
- 在旧版本创建的图表模板中验证兼容性

---
🔴 **测试-分析**：旧版本导入默认false

#### 性能测试（Performance）

**Why**：圆角开启时强制设置 `RenderingHints.VALUE_ANTIALIAS_ON`，对包含大量图例项的图表可能造成渲染性能下降。

**场景**：图表含 50+ 图例项时，开启圆角前后页面渲染帧率/响应时间对比。

---
🔴 **测试-分析**：速度可以

#### 自动化测试建议

| 类型 | 覆盖内容 |
|------|----------|
| **Unit** | `LegendItem.createSymbolRect` 在 `allowRound=true/false` 及 `symbolRoundCorners=true/false` 下返回正确形状类型；`LegendsDescriptor.parseAttributes` 旧 XML 强制 false 逻辑 |
| **Integration** | 完整 LegendSpec 传播路径（`LegendsDescriptor → GraphUtil → LegendSpec → LegendItem`）验证属性一致性 |
| **E2E** | 打开 Legend Format 对话框 → 勾选 Round Symbol Corner → 确认 → 验证图表重渲染后符号为圆角 |
| **Mock** | Unit 测试中 Mock `LegendSpec.isSymbolRoundCorners()` 返回值，隔离渲染逻辑测试 |

---

## 四、关键测试场景（Key Test Scenarios）

---

### Scenario 1：Color Legend 圆角符号正向验证

**Scenario Objective**：验证勾选 Round Symbol Corner 后 Color Legend 符号正确渲染为圆角

**Scenario Description**：在包含 Color Legend 的图表中，打开图例格式对话框，勾选 Round Symbol Corner，确认图例色块渲染为圆角矩形。

**Key Steps**：
1. 创建含 Color Legend 的图表
2. 右键图例 → Format Legend → General 面板
3. 确认"Round Symbol Corner" checkbox 存在且可见
4. 勾选该 checkbox → 点击 OK
5. 观察图例中每个颜色符号色块形状

**Expected Result**：图例色块四角均呈圆角，圆角弧度约为符号尺寸的 30%；界面无报错。

**Risk Covered**：核心功能路径验证；Color Legend 渲染正确性

---

🔴 **测试-分析**：和期待一样

### Scenario 2：新建图表默认圆角状态与 UI 一致性验证

**Scenario Objective**：验证新建图表时，UI checkbox 勾选状态与实际图例符号渲染一致

**Scenario Description**：新建图表后，不做任何配置，直接检查图例符号形状与 UI 默认状态。

**Key Steps**：
1. 新建图表，添加 Color Aesthetic → 生成 Color Legend
2. 不打开任何对话框，观察图例符号形状
3. 打开 Legend Format → General 面板，记录"Round Symbol Corner"的默认勾选状态
4. 比较图例符号实际形状与 checkbox 状态是否一致

**Expected Result**：若 checkbox 默认勾选，图例符号应为圆角；若默认不勾选，应为直角。两者状态一致，不出现 UI 显示勾选但渲染为直角的情况。

**Risk Covered**：`LegendsDescriptor`（默认 true）与 `LegendSpec`（默认 false）默认值不一致风险

---
🔴 **测试-分析**：和期待一样

### Scenario 3：旧版 XML 图表加载兼容性

**Scenario Objective**：验证不含 symbolRoundCorners 属性的旧版图表加载后图例符号渲染不回归

**Scenario Description**：使用不含 `symbolRoundCorners` 属性的旧版保存文件加载图表，验证图例符号渲染为直角（兼容旧行为），且不报错。

**Key Steps**：
1. 准备一个旧版本创建的图表文件（XML 中无 `symbolRoundCorners` 属性）
2. 在当前版本中加载该文件
3. 观察图例符号渲染形状
4. 打开 Legend Format 对话框，确认 Round Symbol Corner checkbox 状态为未勾选

**Expected Result**：图例符号渲染为直角矩形（`symbolRoundCorners=false`）；checkbox 显示未勾选；无异常报错或控制台错误。

**Risk Covered**：旧版 XML 反序列化兼容性；`parseAttributes` 强制 false 逻辑

🔴 **测试-分析**：和期待一样
---

### Scenario 4：Size Legend 小尺寸符号圆角一致性

**Scenario Objective**：验证 Size Legend 在小尺寸条形下填充与边框形状一致

**Scenario Description**：设置 Size Legend 符号尺寸较小，使内部条宽 `r < minRoundWidth`，开启圆角后验证 fill 和 draw 形状是否视觉一致。

**Key Steps**：
1. 创建含 Size Legend 的图表，将 Symbol Size 调至最小值
2. 开启 Round Symbol Corner
3. 放大观察 Size Legend 最细条形的填充形状与外边框形状

**Expected Result**：最细条形的填充矩形与外边框形状保持一致（均为直角或均为圆角），不出现填充直角但边框圆角的错位现象。

**Risk Covered**：`SizeLegendItem` 中内外矩形圆角不一致风险

---
🔴 **测试-分析**：和期待一样

### Scenario 5：Shape / Line Legend 不显示 Round Symbol Corner 选项

**Scenario Objective**：验证 Shape Legend 和 Line Legend 的格式对话框中不显示 Round Symbol Corner checkbox

**Scenario Description**：分别对 Shape Legend 和 Line Legend 打开 Legend Format 对话框，确认 General 面板中不存在 Round Symbol Corner 选项。

**Key Steps**：
1. 创建含 Shape Aesthetic 的图表，生成 Shape Legend
2. 右键 Shape Legend → Format Legend → General 面板
3. 确认无"Round Symbol Corner" checkbox
4. 重复步骤 1-3，改为 Line Legend

**Expected Result**：Shape Legend 和 Line Legend 的 General 面板中均不存在"Round Symbol Corner" checkbox；其他选项正常显示。

**Risk Covered**：`symbolRoundCornersVisible` 控制逻辑；非矩形图例不应显示此选项

---
🔴 **测试-分析**：line和point类型不显示

### Scenario 6：非英文 Locale 下 checkbox 标签显示验证

**Scenario Objective**：验证非英文环境下"Round Symbol Corner"标签正常本地化，不显示原始 key

**Scenario Description**：将系统 locale 切换至中文（或其他已有本地化资源的语言），打开 Legend Format 对话框，检查 Round Symbol Corner 标签显示。

**Key Steps**：
1. 将应用切换至中文 locale
2. 创建含 Color Legend 的图表
3. 打开 Legend Format → General 面板
4. 观察 Round Symbol Corner checkbox 的标签文本

**Expected Result**：标签应显示对应语言的翻译文本，而非英文原文或 key 字符串 `Round Symbol Corner`。

**Risk Covered**：多语言资源文件未更新导致的 i18n 显示异常

---
🔴 **测试-分析**：加了本地化

### Scenario 7：Export 场景下圆角渲染验证

**Scenario Objective**：验证 PDF / 图片导出时，图例符号圆角样式正确渲染

**Scenario Description**：开启 Round Symbol Corner 后，将图表导出为 PDF 和 PNG，验证导出文件中图例符号为圆角。

**Key Steps**：
1. 创建含 Color Legend 的图表，开启 Round Symbol Corner
2. 将图表导出为 PDF
3. 将图表导出为 PNG
4. 检查导出文件中图例符号形状

**Expected Result**：PDF 和 PNG 中图例符号均显示为圆角矩形；导出过程无错误。

**Risk Covered**：向量图形导出路径（`GTool.isVectorGraphics`）下抗锯齿与圆角渲染一致性

🔴 **测试-分析**：导出没问题