# Feature #74804 测试分析报告：Rounded Legend Symbol

---

## 输入完整性说明

- **Feature 描述**：可访问，信息充分。
- **PR diff**：可访问（PR #3622），内容完整，涵盖 13 个文件变更。
- **知识库文档**：已提供 Legend 模块说明（Color/Size/Texture/Shape 分类及组合规则）。

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：为图表图例的色块符号（swatch）支持圆角样式，与参考设计（portal-dark3.html）对齐。
- **用户价值**：提升图表视觉美观度，满足现代扁平化/圆角设计风格需求；用户可按需开启圆角，而非强制使用直角矩形符号。
- **Feature 类型**：UI / Rendering / Data（配置持久化）

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

| 文件 | 变更内容 |
|------|----------|
| `LegendSpec.java` | 新增 `symbolRoundCorners` 字段（boolean，默认 false）；更新 equals/hashCode |
| `LegendsDescriptor.java` | 新增 `symbolRoundCorners` 字段，**默认值为 true（新图表）**；XML 序列化/反序列化时，旧 XML 缺失该属性则强制置为 false（向后兼容） |
| `LegendItem.java` | 新增 `createSymbolRect(x,y,w,h)` / `createSymbolRect(x,y,w,h,allowRound)`；圆角半径比例常量 `SYMBOL_CORNER_RADIUS_RATIO = 0.3`；通过 `allowRound` 参数控制是否允许圆角 |
| `ColorLegendItem.java` | `paintSymbol` 改用 `createSymbolRect`；启用圆角时开启抗锯齿 |
| `SizeLegendItem.java` | 内部 bar 填充改用 `createSymbolRect(..., allowRound)`；当 bar 宽度小于圆角弧度时强制直角；外框绘制 `draw()` 改用 `createSymbolRect` |
| `TextureLegendItem.java` | `paintSymbol` 改用 `createSymbolRect`；启用圆角时开启抗锯齿 |
| `GraphUtil.java` | `LegendSpec` 同步来自 `LegendsDescriptor` 的 `symbolRoundCorners` 值 |
| `LegendFormatGeneralPaneController.java` | 读写 `symbolRoundCorners`；UI toggle 仅对 Color/Size/Texture 类型可见，Shape/Line 类型隐藏 |
| `LegendFormatGeneralPaneModel.java` | 新增 `symbolRoundCorners` / `symbolRoundCornersVisible` 字段 |
| `legend-format-general-pane.component.html` | 新增"Round Symbol Corner"复选框（条件渲染：仅 `symbolRoundCornersVisible=true` 时显示） |
| `srinter.properties` | 新增 i18n key：`Round Symbol Corner` |
| `legend-format-general-pane.spec.ts` | 新增两个单元测试：visible/hidden 状态下复选框是否正确渲染 |

### 目标覆盖度

| Feature 需求 | PR 实现 | 覆盖状态 |
|-------------|---------|--------|
| 图例符号支持圆角 | Color / Size / Texture 图例均已实现圆角渲染 | ✅ 覆盖 |
| UI 可配置开关 | Legend Format 面板新增复选框 | ✅ 覆盖 |
| Shape / Line 图例不适用 | Controller 层按 aestheticType 控制 visible | ✅ 覆盖 |
| 配置持久化 | XML 序列化/反序列化均已处理 | ✅ 覆盖 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|----------------|----------------|------|
| 图例 swatch 固定为直角矩形 | Color/Size/Texture 图例 swatch 可渲染为圆角矩形 | 渲染变化影响导出/打印 |
| `LegendsDescriptor.symbolRoundCorners` 不存在 | 新图表默认 `true`；旧图表（XML 中无此属性）强制为 `false` | 新旧图表行为不一致，需验证向后兼容性 |
| `SizeLegendItem` 始终关闭抗锯齿（非矢量图时） | 圆角开启时，抗锯齿保持开启（包括非矢量图场景） | 可能影响渲染性能或像素精度 |
| `SizeLegendItem` 内部 bar 宽度极窄时仍绘制圆角 | 极窄 bar 强制使用直角，避免渲染异常 | 边界条件处理逻辑正确性 |
| Shape / Line 图例 Format 面板无 Symbol Round Corner 选项 | Shape / Line 图例隐藏该选项；Color/Size/Texture 显示 | UI 可见性逻辑是否完整 |

---

## 第三部分：Risk Identification（风险识别）

**R1 \[Rendering\]** — Size Legend 圆角渲染边界问题：bar 宽度接近 `minRoundWidth` 临界值时，渲染切换（圆角↔直角）可能出现视觉抖动或不一致。

**R2 \[Compatibility\]** — 新图表默认 `symbolRoundCorners=true`，旧图表强制为 `false`。已保存的 Viewsheet（含 `LegendsDescriptor` XML）在升级后若缺少该属性，是否能正确反序列化为 `false` 需回归验证；若 XML 中已有 `symbolRoundCorners="true"` 则不受影响。

**R3 \[Cross-Module\]** — `GraphUtil.java` 负责将 `LegendsDescriptor` 同步到 `LegendSpec`，若该同步路径在特定场景（DC 图表、组合 Legend）下未触发，将导致配置丢失。

**R4 \[Rendering / Export\]** — 圆角使用 `RoundRectangle2D` + 抗锯齿，在 PDF/Image 导出（矢量与非矢量路径）和打印预览中，圆角效果是否正确渲染。

**R5 \[UI Functional\]** — `symbolRoundCornersVisible` 仅由 `aestheticType` 控制（Color/Size/Texture 可见，其余隐藏）；组合 Legend（如 color+size、shape+color）打开 Format 对话框时，visible 逻辑是否正确。

**R6 \[Data Consistency\]** — 修改一个图例的圆角设置是否会影响同一图表中其他图例（已知 Bug #75041）。

**R7 \[Localization\]** — 新增 UI 文本 `Round Symbol Corner` 仅有英文 key，其他语言本地化是否完整。

**R8 \[Script\]** — Bug #75039 指出需要为 Round Symbol Corner 新增脚本支持，当前 PR 未包含，可能导致 Script 与 UI 不同步。

---

## 第四部分：Test Design（测试策略设计）

### 核心验证点

- `symbolRoundCorners` 开关在 Color / Size / Texture 三类图例上的渲染效果正确性。
- 新图表默认开启圆角（`true`）；旧图表升级后保持直角（`false`）。
- Format 对话框中复选框的可见性逻辑（按 aestheticType 控制）。
- 配置保存与重新加载后状态一致。

### 高风险路径

- Size Legend 中 bar 极窄时的圆角/直角切换临界行为。
- 组合 Legend（color+size、shape+color）的 Format 面板 visible 判断。
- 已有 Viewsheet（旧 XML）在升级后加载时，`symbolRoundCorners` 的默认值行为。
- 圆角开启时的 PDF / Image / 打印导出效果。

### 涉及模块

- 图表图例（Color / Size / Texture / Shape / Line）
- Legend Format 对话框（General Pane）
- DC（Dashboard Composer）图表
- 图表导出（PDF / Excel / Image）
- 打印预览
- Viewsheet 保存 / 加载（XML 序列化）

### 专项检查

**本地化**：`Round Symbol Corner` 为新增 UI 文本，需验证各支持语言的翻译完整性。

**脚本兼容**（⚠️ 当前 PR 未实现，Bug #75039 跟踪）：
- `symbolRoundCorners` 是否已暴露为可通过 Script 访问的属性。
- Script 设置与 UI 复选框是否同步。
- Script Auto-complete 是否包含该属性。
`🔴 **测试-分析** Bug #75039

**文档一致性**：新增 Legend 格式选项，需确认 Help 文档是否同步更新。

`🔴 **测试-分析** 后面处理

### Mobile 影响检查

Legend Format 对话框新增 UI 控件（复选框），需在移动端/小屏幕下验证复选框布局是否正常显示，不出现溢出或遮挡。
`🔴 **测试-分析** 结果正确

### Print Layout / Export 影响检查

涉及图例 swatch 的绘制逻辑（`paintSymbol` 方法、`RoundRectangle2D` 图形绘制），需验证：
- PDF 导出：圆角符号渲染正确（矢量路径）。
- Image 导出（PNG/JPEG）：圆角符号渲染正确，抗锯齿效果正常。
- 打印预览：图例圆角效果与预览一致。
- Excel 导出：图例若以图片方式嵌入，需验证圆角效果。

---
`🔴 **测试-分析** 结果正确

## 第五部分：Key Test Scenarios（核心测试场景）

---

### Scenario 1：Color Legend 圆角开关基础功能

**Scenario Objective**：验证 Color Legend 的 Round Symbol Corner 复选框可正确开启/关闭圆角渲染。

**Scenario Description**：这是本次 Feature 的核心路径，需确认 UI 开关与渲染结果一致。

**Pre-condition**：创建一个包含 Color Legend 的图表（如柱状图 + 颜色维度绑定）。

**Key Steps**：
1. 打开图表 Legend  对话框 → General Pane。
2. 确认"Round Symbol Corner"复选框可见。
3. 勾选复选框 → 点击 OK。
4. 观察 Color Legend 中每个色块符号的形状。
5. 再次打开对话框，取消勾选 → 点击 OK。
6. 观察 Color Legend 符号是否恢复为直角。

**Expected Result**：
- 勾选后，色块符号呈圆角矩形，圆角弧度约为符号尺寸的 30%。
- 取消勾选后，色块恢复为直角矩形。
- 两次状态切换均正确反映在图表上。

**Risk Covered**：R1（渲染正确性）、核心 UI 功能。

---

`🔴 **测试-分析** 结果正确

### Scenario 2：Size Legend 圆角渲染（含极窄 bar 边界）

**Scenario Objective**：验证 Size Legend 在不同 bar 宽度下，圆角/直角切换逻辑正确。

**Scenario Description**：Size Legend 的内部 bar 在极小尺寸时应强制使用直角，避免圆角弧度超过宽度导致渲染异常（PR 中使用 `allowRound` 参数控制）。

**Pre-condition**：创建包含 Size Legend 的图表，尺寸范围覆盖大小差异明显的数据。

**Key Steps**：
1. 开启 Round Symbol Corner。
2. 观察 Size Legend 中各 bar 的渲染形状：较宽的 bar 应显示圆角，极窄的 bar 应显示直角。
3. 调整 Symbol Size 至最小值，观察外框（`draw`）是否也正确使用圆角。

**Expected Result**：
- bar 宽度 ≥ `symbolSz * 0.3 * 2` 时，bar 呈圆角；小于该值时，bar 为直角。
- Size Legend 外框随圆角设置同步变化。
- 无渲染错位或视觉异常。

**Risk Covered**：R1（Size Legend 边界渲染）。

---
`🔴 **测试-分析**：size设置到最小，显示合理

### Scenario 3：Texture Legend 圆角渲染

**Scenario Objective**：验证 Texture Legend 的纹理符号支持圆角裁剪。

**Scenario Description**：Texture Legend 使用 `GTexture.paint()` 填充，需确认 `RectangularShape` 替换后纹理区域正确裁剪为圆角。

**Pre-condition**：创建包含 Texture Legend 的图表（纹理 Frame 绑定）。

**Key Steps**：
1. 开启 Round Symbol Corner。
2. 观察 Texture Legend 各符号是否呈圆角且纹理完整填充圆角区域内。
3. 关闭圆角，确认恢复直角。

**Expected Result**：纹理符号随设置正确切换圆角/直角，纹理无溢出或裁切错误。

**Risk Covered**：R1（Texture Legend 渲染）。

---
`🔴 **测试-分析**：圆角显示合理

### Scenario 4：Shape / Line Legend 不显示 Round Symbol Corner 选项

**Scenario Objective**：验证 Shape Legend 和 Line Legend 的 Format 对话框中不出现圆角选项。

**Scenario Description**：PR 中明确仅 Color/Size/Texture 显示该 toggle，Shape 和 Line 图例绘制的是符号/线条而非矩形 swatch，故应隐藏。

**Pre-condition**：分别创建包含 Shape Legend 和 Line Legend 的图表。

**Key Steps**：
1. 打开 Shape Legend 的 Format 对话框 → General Pane。
2. 确认无"Round Symbol Corner"复选框。
3. 对 Line Legend 执行相同操作。

**Expected Result**：Shape Legend 和 Line Legend 的中"Round Symbol Corner"不可见。

**Risk Covered**：R5（UI 可见性逻辑）。

---
`🔴 **测试-分析**：测试shape和line相关的chart类型，"Round Symbol Corner"不可见。

### Scenario 5：组合 Legend（Color + Size）Format 面板 visible 逻辑

**Scenario Objective**：验证 color+size 组合 Legend 

**Scenario Description**：组合 Legend 
**Pre-condition**：创建 color+size 组合 Legend 的图表。

**Key Steps**：
1. 分别点击 Color 和 Size 图例项，打开对话框。
2. 确认对话框均显示"Round Symbol Corner"复选框。

**Expected Result**：Color 和 Size 类型对话框均显示复选框；不出现错误显示或隐藏。

**Risk Covered**：R5（组合 Legend visible 逻辑）。

---

`🔴 **测试-分析**：应用正确

### Scenario 6：修改一个图例的圆角设置不影响其他图例

**Scenario Objective**：验证同一图表中多个 Legend 的 `symbolRoundCorners` 设置相互独立。

**Scenario Description**：Bug #75041 已记录该问题：修改一个图例圆角时，其他图例也被修改。此场景为明确回归验证。

**Pre-condition**：图表包含多个 Legend（如 Color Legend + Size Legend）。

**Key Steps**：
1. 仅对 Color Legend 开启 Round Symbol Corner，保存。
2. 检查 Size Legend 的 symbolRoundCorners 状态。
3. 反之，仅对 Size Legend 修改，检查 Color Legend 是否受影响。

**Expected Result**：各 Legend 的圆角设置相互独立，修改一个不影响其他。

**Risk Covered**：R6（数据一致性，跨 Legend 隔离）。

---

`🔴 **测试-分析**：Bug #75041

### Scenario 7：旧 Viewsheet 升级后向后兼容性

**Scenario Objective**：验证升级前保存的 Viewsheet（XML 中无 `symbolRoundCorners` 属性）在新版本加载后，图例符号保持直角（`false`）。

**Scenario Description**：`LegendsDescriptor.parseAttributes` 中明确：旧 XML 缺失该属性时强制为 `false`；但 `LegendsDescriptor` 默认字段值为 `true`，需确认 parse 路径优先级正确。

**Pre-condition**：使用旧版本保存含 Legend 的 Viewsheet，或手工构造不含 `symbolRoundCorners` 属性的 XML。

**Key Steps**：
1. 在新版本中加载旧 Viewsheet。
2. 观察所有 Color/Size/Texture Legend 符号形状。
3. 打开 Format 对话框，确认复选框状态为未勾选。

**Expected Result**：旧 Viewsheet 加载后，图例符号为直角矩形，复选框未勾选。

**Risk Covered**：R2（向后兼容性）。

---
`🔴 **测试-分析**：旧 Viewsheet 加载后是false

### Scenario 8：新图表默认开启圆角

**Scenario Objective**：验证新建图表的 Color/Size/Texture Legend 默认显示圆角符号。

**Scenario Description**：`LegendsDescriptor.symbolRoundCorners` 字段默认值为 `true`（新图表路径），需确认新图表无需手动配置即显示圆角。

**Pre-condition**：无。

**Key Steps**：
1. 新建图表并添加颜色维度绑定，生成 Color Legend。
2. 不做任何 Format 设置，直接观察图例符号形状。
3. 打开 Format 对话框，确认复选框默认勾选。

**Expected Result**：新图表 Color/Size/Texture Legend 符号默认为圆角；复选框默认勾选。

**Risk Covered**：R2（新旧图表默认行为差异）。

---
`🔴 **测试-分析**：默认值是true

### Scenario 9：配置保存与重载后状态一致

**Scenario Objective**：验证 `symbolRoundCorners` 配置在 Viewsheet 保存/重新打开后状态正确持久化。

**Scenario Description**：新增字段涉及 XML 序列化与反序列化，需确认 round-trip 数据一致。

**Pre-condition**：创建含 Color Legend 的图表。

**Key Steps**：
1. 关闭 Round Symbol Corner（`false`），保存 Viewsheet。
2. 重新打开 Viewsheet，检查图例符号为直角，复选框未勾选。
3. 开启 Round Symbol Corner（`true`），保存并重新打开，检查符号为圆角，复选框勾选。

**Expected Result**：两种状态均正确持久化，重载后与保存时一致。

**Risk Covered**：R3（配置持久化 / 数据一致性）。

---

`🔴 **测试-分析**：reload正确

### Scenario 10：DC 图表圆角设置同步

**Scenario Objective**：验证在 Dashboard Composer（DC）图表中，`symbolRoundCorners` 配置通过 `GraphUtil` 正确同步到 `LegendSpec`。

**Scenario Description**：`GraphUtil.java` 负责同步 `LegendsDescriptor` → `LegendSpec`，DC 图表走此路径，需确认同步不丢失。已知 Bug #75029 指出 DC 中 display 切换时 symbol size 值会变，圆角设置可能有类似问题。

**Pre-condition**：在 DC 中创建包含 Color Legend 的图表。

**Key Steps**：
1. 在 DC 图表中开启 Round Symbol Corner。
2. 切换图表 display 类型（如从 Bar 切换到 Line 再切回）。
3. 观察 Color Legend 圆角设置是否保持。
4. 保存 Dashboard，重新打开，验证圆角状态。

**Expected Result**：display 切换后圆角设置保持不变；保存后重载状态一致。

**Risk Covered**：R3（Cross-Module，DC 同步路径）、R6。

---
`🔴 **测试-分析**：Bug #75029

### Scenario 11：PDF / Image 导出圆角效果

**Scenario Objective**：验证开启圆角的图例在 PDF 和 Image 导出格式中正确渲染。

**Scenario Description**：`RoundRectangle2D` + 抗锯齿渲染路径在矢量（PDF）和非矢量（PNG/JPEG）场景下行为不同，需分别验证。

**Pre-condition**：创建含 Color Legend（开启圆角）的图表。

**Key Steps**：
1. 导出为 PDF，打开查看 Color Legend 符号形状。
2. 导出为 PNG 图片，查看 Color Legend 符号形状。
3. 对比两种格式中圆角效果与页面显示是否一致。

**Expected Result**：PDF 和 PNG 导出中，Color Legend 符号均显示圆角，与页面渲染效果一致，无锯齿或变形。

**Risk Covered**：R4（Export / Print 渲染）。

---

`🔴 **测试-分析**：导出结果正确

### Scenario 12：本地化验证

**Scenario Objective**：验证"Round Symbol Corner"文本在各支持语言环境下正确显示。

**Scenario Description**：`srinter.properties` 中新增英文 key，其他语言资源文件需同步，否则显示 key 名称而非翻译文本。

**Pre-condition**：系统切换为非英文语言（如中文/日文/法文等）。

**Key Steps**：
1. 在非英文语言环境下打开 Color Legend 的 Format 对话框。
2. 观察"Round Symbol Corner"区域的显示文本。

**Expected Result**：显示对应语言的翻译文本，而非原始 key `Round Symbol Corner`。

**Risk Covered**：R7（本地化）。

---
`🔴 **测试-分析**：已经添加本地化

### Scenario 13：Script 兼容性（待 Bug #75039 修复后回归）

**Scenario Objective**：验证 `symbolRoundCorners` 属性可通过 Script 读写，且与 UI 状态同步。

**Scenario Description**：Bug #75039 指出需为 Round Symbol Corner 添加 Script 支持，当前 PR 未实现，本场景为修复后回归验证。

**Pre-condition**：Bug #75039 已修复；图表含 Color Legend。

**Key Steps**：
1. 通过 Script 设置 `chart.legends.symbolRoundCorners = true`，观察图例符号是否变为圆角。
2. 打开 Format 对话框，确认 UI 复选框同步勾选。
3. 验证 Script 编辑器中 `symbolRoundCorners` 属性是否出现在 Auto-complete 候选列表。

**Expected Result**：Script 与 UI 双向同步；Auto-complete 正确提示属性名称。

**Risk Covered**：R8（Script 兼容性）。
`🔴 **测试-分析**：Bug #75039