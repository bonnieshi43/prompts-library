---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Legend
Feature_id: "74804"
Feature: Rounded Legend Symbol
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3622
Assignee: Franky Pan
last_updated: 2026-05-19
version: stylebi-1.2.0
---

# Feature #74804 — Rounded Legend Symbol

---

# 1 Feature Summary

**核心目标**：为图表图例（Legend）的符号色块（swatch）新增"圆角"渲染选项（Round Symbol Corner checkbox），使 Color、Texture、Size 三类图例符号支持圆角矩形显示。圆角半径硬编码为符号尺寸的 30%（`SYMBOL_CORNER_RADIUS_RATIO = 0.3`）。

**用户价值**：用户在图表中启用圆角样式后，图例符号仍为直角矩形，造成视觉不一致。本功能补全该 UI 一致性缺口，使图例符号与图表整体圆角风格保持统一，提升视觉一致性体验。

---

# 2 Test Focus

## P0 - Core Path

- Color Legend 勾选/取消 Round Symbol Corner → 符号正确渲染为圆角/直角矩形
- Texture Legend 勾选/取消 Round Symbol Corner → 符号正确渲染为圆角/直角矩形
- Size Legend 勾选/取消 Round Symbol Corner → 符号正确渲染为圆角/直角矩形
- 新建图表默认状态：UI checkbox 勾选状态与图例符号实际渲染一致

## P1 - Functional Path

- Shape Legend / Line Legend 的 Legend Format 对话框中不显示 Round Symbol Corner checkbox（point、line、step line、jump line、Area、Radar、filled radar 类型 size legend 也不显示）
- 旧版 XML 图表（无 `symbolRoundCorners` 属性）加载后，图例符号渲染为直角且 checkbox 为未勾选状态
- Size Legend 小尺寸条形（条宽 < `minRoundWidth`）下，fill 与 draw 形状视觉一致
- Color Legend、Texture Legend、Size Legend 同时存在时，各自独立控制圆角（不互相影响）
- 多个 Legend 设置不同圆角值时，各 Legend 独立渲染，不相互干扰（对应 Bug #75041）
- Dashboard Chart (DC) 场景下修改 display，symbol size 值不发生变化（对应 Bug #75029）
- 选取图例区域时，选取框与图例边框匹配（对应 Bug #75033）
- 图例未超出边界（对应 Bug #75028）
- Script 控制 `symbolRoundCorners` 属性后，图表即时重渲染且与 UI checkbox 状态同步（对应 Bug #75039）
- 本地化：非英文环境（中文/日文等）下，checkbox 标签显示翻译文本而非原始 key

## P2 - Extended Path（按需测试）

- 导出 PDF / PNG / Excel：开启圆角后导出文件中图例符号正确渲染为圆角
- 性能：图表含 50+ 图例项时，开启圆角前后渲染响应时间对比
- 浏览器兼容性：Chrome、Firefox、Safari 下 checkbox UI 与图表渲染结果一致

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | Color Legend 圆角符号正向验证 | 1. 创建含 Color Legend 的图表<br>2. 右键图例 → Format Legend → General 面板<br>3. 确认"Round Symbol Corner" checkbox 存在<br>4. 勾选 checkbox → OK<br>5. 观察图例色块形状 | 图例色块四角呈圆角（弧度约为符号尺寸的 30%），界面无报错 | ✅ | 🔴 测试结果：和期待一样 |
| TC-2 | Texture Legend 圆角符号正向验证 | 1. 创建含 Texture Aesthetic 的图表（Texture Legend）<br>2. 右键 Texture Legend → Format Legend → General<br>3. 勾选"Round Symbol Corner"→ OK<br>4. 观察 Texture 符号形状 | Texture 图例符号渲染为圆角矩形 | | |
| TC-3 | Size Legend 圆角符号正向验证 | 1. 创建含 Size Legend 的图表<br>2. 右键 Size Legend → Format Legend → General<br>3. 勾选"Round Symbol Corner"→ OK<br>4. 观察 Size 图例条形符号 | Size 图例符号（条形）显示为圆角矩形 | | |
| TC-4 | 新建图表默认圆角状态与 UI 一致性 | 1. 新建图表，添加 Color Aesthetic → 生成 Color Legend<br>2. 不做额外配置，观察图例符号形状<br>3. 打开 Legend Format → General，记录 checkbox 默认状态<br>4. 对比图例符号实际形状与 checkbox 状态 | checkbox 勾选状态与符号渲染形状完全一致（不出现 UI 勾选但渲染为直角的情况） | ✅ | 🔴 风险：LegendsDescriptor（默认 true）与 LegendSpec（默认 false）不一致；测试结果符合期待 |
| **P1** | | | | | |
| TC-5 | Shape / Line Legend 不显示圆角选项 | 1. 创建含 Shape Aesthetic 的图表 → 生成 Shape Legend<br>2. 右键 → Format Legend → General<br>3. 确认无"Round Symbol Corner"<br>4. 对 Line Legend 重复以上步骤 | Shape Legend 和 Line Legend 的 General 面板中均不存在"Round Symbol Corner" checkbox | ✅ | 🔴 测试结果：line 和 point 类型不显示；line/step line/jump line/point/Area/Radar/filled radar 类型 size legend 不支持；tree/network/circular network/map shape 不支持 |
| TC-6 | 旧版 XML 图表加载兼容性 | 1. 准备旧版图表文件（XML 中无 `symbolRoundCorners` 属性）<br>2. 在当前版本加载该文件<br>3. 观察图例符号渲染形状<br>4. 打开 Legend Format，确认 checkbox 状态 | 图例符号渲染为直角矩形；checkbox 显示未勾选；无异常报错 | ✅ | 🔴 测试结果：旧版本导入默认 false，和期待一样 |
| TC-7 | 取消勾选圆角后恢复直角 | 1. 开启 Round Symbol Corner<br>2. 确认符号为圆角<br>3. 再次打开 Legend Format → 取消勾选 → OK<br>4. 观察符号形状 | 符号恢复为直角矩形，与改动前渲染一致 | ✅ | 回归：未勾选圆角时渲染不受影响 |
| TC-8 | Size Legend 小尺寸符号圆角一致性 | 1. 创建含 Size Legend 的图表，将 Symbol Size 调至最小值<br>2. 开启 Round Symbol Corner<br>3. 放大观察最细条形的填充与外边框形状 | 填充矩形与外边框形状一致（均直角或均圆角），不出现填充直角但边框圆角的错位 | ✅ | 🔴 风险：SizeLegendItem 内外矩形圆角不一致；测试结果和期待一样 |
| TC-9 | 多个 Legend 独立圆角设置 | 1. 创建同时包含 Color Legend 和 Size Legend 的图表<br>2. 对 Color Legend 开启圆角，对 Size Legend 不开启<br>3. 观察两个 Legend 的符号形状 | 各 Legend 独立渲染，不互相干扰 | | 🔴 未覆盖；对应 Bug #75041（When changing the rounded corner of one legend symbol, the others also change） |
| TC-10 | DC 场景下修改 display 时 symbol size 不变 | 1. 在 Dashboard Chart 中创建含 Legend 的图表<br>2. 开启 Round Symbol Corner<br>3. 修改 DC 的 display 设置<br>4. 检查 symbol size 值 | Symbol size 值不因 display 变化而改变 | | 🔴 未覆盖；对应 Bug #75029 |
| TC-11 | 图例选取区域与边框匹配 | 1. 创建含 Color Legend 的图表，开启 Round Symbol Corner<br>2. 拖拽选取图例区域<br>3. 观察选取框是否与图例边框吻合 | 选取框与图例边框完全匹配，不出现错位 | | 🔴 未覆盖；对应 Bug #75033 |
| TC-12 | 图例未超出边界 | 1. 创建图表，设置圆角图例<br>2. 调整图例位置至边缘区域<br>3. 检查图例是否超出图表边界 | 图例不超出图表边界 | | 🔴 未覆盖；对应 Bug #75028 |
| TC-13 | Script 控制 symbolRoundCorners | 1. 创建含 Color Legend 的图表<br>2. 通过 Script 设置 `chart.legendSpec.setSymbolRoundCorners(true)`<br>3. 检查图表是否即时重渲染<br>4. 确认 UI checkbox 状态与 Script 值同步 | 图表即时重渲染，符号显示圆角；UI checkbox 状态与 Script 值一致 | | 🔴 对应 Bug #75039（add script for Round Symbol Corner） |
| TC-14 | 本地化：非英文 Locale checkbox 标签 | 1. 将应用切换至中文 locale<br>2. 创建含 Color Legend 的图表<br>3. 打开 Legend Format → General<br>4. 观察"Round Symbol Corner"标签文本 | 标签显示对应语言的翻译文本，不显示英文原文或原始 key | ✅ | 🔴 测试结果：已经添加本地化 |
| TC-15 | color 和 shape 或 size merge，shape 和 size merge | 1. 创建 color+shape merge 的图表<br>2. 开启 Round Symbol Corner<br>3. 对 shape+size merge 重复 | Merge 后 Legend 符号圆角渲染正确，不出现异常 | | 🔴 未覆盖 |
| **P2** | | | | | |
| TC-16 | 导出 PDF / PNG 场景圆角渲染 | 1. 创建含 Color Legend 的图表，开启 Round Symbol Corner<br>2. 导出为 PDF<br>3. 导出为 PNG<br>4. 检查导出文件中图例符号形状 | PDF 和 PNG 中图例符号均显示圆角矩形；导出无错误 | ✅ | 🔴 测试结果：导出没问题；注意向量图形导出路径抗锯齿行为 |
| TC-17 | 性能：50+ 图例项渲染 | 1. 创建含 50+ 图例项的图表<br>2. 分别在开启/关闭圆角状态下加载图表<br>3. 记录渲染响应时间 | 开启圆角后渲染性能无明显下降（参考基准可接受） | ✅ | 🔴 测试结果：速度可以 |

---

# 4 Special Testing

## Security
不适用。

## Performance
开启圆角时强制设置 `RenderingHints.VALUE_ANTIALIAS_ON`，对大量图例项可能影响渲染性能。  
→ **TC-17** 已覆盖：含 50+ 图例项场景验证，结果：速度可以。

## Compatibility
旧版 XML 图表（无 `symbolRoundCorners` 属性）加载兼容性。  
→ **TC-6** 已覆盖：旧版本导入默认 false，测试通过。

## 本地化
仅 `srinter.properties`（英文）新增 `Round Symbol Corner` key，需确认其他语言资源文件已同步更新。  
→ **TC-14** 已覆盖：本地化已添加，测试通过。

## Script
Script 控制 `symbolRoundCorners` 属性。  
→ **TC-13** 覆盖：对应 Bug #75039，待验证。

## 文档/API
无额外文档/API 变更需验证。

## 配置检查
- 新建图表：`LegendsDescriptor.symbolRoundCorners` 默认 `true`（开启）
- 旧版 XML 加载：`parseAttributes` 中无属性时强制赋值 `false`（兼容旧行为，非默认字段值）
- 确认 `LegendSpec` 传播路径（`GraphUtil`）正确同步属性，避免 UI 与渲染不一致

---

# 5 Regression Impact（回归影响）

| 模块 | 风险描述 |
|---|---|
| **Chart - Legend 渲染** | `LegendItem.paintSymbol` 渲染基类逻辑改动，可能影响未启用圆角时的现有渲染行为；需验证未勾选状态下符号渲染与改动前一致 |
| **Chart - SizeLegend** | 抗锯齿逻辑变更（从"非向量图形时关闭"变为"非向量图形且非圆角时关闭"），非圆角模式下抗锯齿行为可能受影响 |
| **Export（PDF/PNG/Excel）** | `ColorLegendItem` 和 `TextureLegendItem` 在导出路径的抗锯齿处理未与 `SizeLegendItem` 对齐，导出场景抗锯齿行为可能不统一 |
| **Dashboard Chart (DC)** | DC 场景下 display 变更可能影响 symbol size，已关联 Bug #75029 |
| **Legend 区域选取** | 选取框与图例边框匹配问题，已关联 Bug #75033 |
| **Legend 边界** | 图例超出边界问题，已关联 Bug #75028 |

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| #75028 | The legend has exceeded the boundary | New |
| #75029 | When change display on DC, the symbol size value changed | New |
| #75033 | When select area of legend, this area does not match the legend border | New |
| #75039 | Add script for Round Symbol Corner | New |
| #75041 | When changing the rounded corner of one legend symbol, the others also change | New |