---
doc_type: feature-test-doc
product: StyleBI
module: Chart / Legend
Feature_id: "74804"
Feature: Rounded Legend Symbol
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3622
Assignee: Franky Pan
last_updated: 2026-05-20
version: stylebi-1.2.0
---

# Feature #74804 — Rounded Legend Symbol

---

## 1 Feature Summary

**核心目标**：为图表图例的色块符号（swatch）新增圆角样式支持，用户可通过 Legend Format 对话框中的"Round Symbol Corner"复选框按需开关；圆角适用于 Color / Size / Texture 三类图例，Shape / Line 图例不适用。

**用户价值**：解决图例符号固定为直角矩形的局限，满足现代扁平化/圆角设计风格需求，提升图表视觉一致性。

---

## 2 Test Focus

### P0 — Core Path

- Color Legend 圆角开关：开启/关闭后符号形状正确切换
- Size Legend 圆角渲染（含极窄 bar 边界处理）
- Texture Legend 圆角渲染（纹理区域正确裁剪）
- 新图表默认开启圆角（`symbolRoundCorners = true`）
- 配置保存与重载后状态一致（XML round-trip）

### P1 — Functional Path

- Shape / Line Legend Format 面板不显示圆角选项（UI 可见性逻辑）
- 组合 Legend（Color + Size）两侧均正确显示复选框
- 多 Legend 圆角设置相互独立，修改一个不影响其他（关联 Bug #75041）
- 旧 Viewsheet 升级后向后兼容（缺失属性强制为 `false`）
- DC 图表中切换 display 类型后圆角设置保持
- PDF / PNG 导出圆角效果正确渲染

### P2 — Extended Path（按需测试）

- 本地化：各语言环境下"Round Symbol Corner"文本正确显示
- Script 兼容性（待 Bug #75039 修复后执行）
- Help 文档是否同步更新
- 移动端 / 小屏幕下复选框布局正常

---

## 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** | | | | | |
| TC-1 | Color Legend 圆角开关基础功能 | 1. 创建含 Color Legend 的柱状图（颜色维度绑定）<br>2. 打开 Legend Format 对话框 → General Pane<br>3. 确认"Round Symbol Corner"复选框可见<br>4. 勾选 → OK，观察色块形状<br>5. 再次打开，取消勾选 → OK，观察色块形状 | 勾选后色块呈圆角矩形（弧度约为符号尺寸 30%）；取消后恢复直角；两次切换均即时生效 | ✅ 结果正确 | 分析 Scenario 1 |
| TC-2 | Size Legend 圆角渲染（含极窄 bar 边界） | 1. 创建含 Size Legend 的图表，数据尺寸范围差异明显<br>2. 开启 Round Symbol Corner<br>3. 观察较宽 bar 与极窄 bar 的形状<br>4. 调整 Symbol Size 至最小值，观察外框形状 | 宽 bar（≥ symbolSz×0.6）呈圆角；极窄 bar 强制直角；外框随设置同步；无渲染错位 | ✅ size 设置到最小，显示合理 | 分析 Scenario 2 |
| TC-3 | Texture Legend 圆角渲染 | 1. 创建含 Texture Legend 的图表<br>2. 开启 Round Symbol Corner<br>3. 观察纹理符号形状及纹理填充区域<br>4. 关闭圆角，确认恢复直角 | 纹理符号正确切换圆角/直角，纹理无溢出或裁切错误 | ✅ 圆角显示合理 | 分析 Scenario 3 |
| TC-4 | 新图表默认开启圆角 | 1. 新建图表，绑定颜色维度生成 Color Legend<br>2. 不做任何 Format 设置，观察图例符号形状<br>3. 打开 Format 对话框，查看复选框状态 | 图例符号默认为圆角；复选框默认勾选 | ✅ 默认值为 true | 分析 Scenario 8 |
| TC-5 | 配置保存与重载后状态一致 | 1. 关闭圆角（false），保存 Viewsheet，重新打开，验证符号直角 & 复选框未勾选<br>2. 开启圆角（true），保存并重新打开，验证符号圆角 & 复选框勾选 | 两种状态均正确持久化，重载后与保存时完全一致 | ✅ reload 正确 | 分析 Scenario 9 |
| **P1** | | | | | |
| TC-6 | Shape / Line Legend 不显示圆角选项 | 1. 创建含 Shape Legend 的图表，打开其 Format 对话框 → General Pane<br>2. 创建含 Line Legend 的图表，同上操作 | 两类图例的 General Pane 均不出现"Round Symbol Corner"复选框 | ✅ Shape 和 Line 类型图表"Round Symbol Corner"不可见 | 分析 Scenario 4 |
| TC-7 | 组合 Legend（Color + Size）visible 逻辑 | 1. 创建 Color + Size 组合 Legend 的图表<br>2. 分别点击 Color 和 Size 图例项，打开各自 Format 对话框<br>3. 确认两个对话框均显示复选框 | Color 和 Size 对话框均可见复选框，且各自设置独立 | ✅ 应用正确 | 分析 Scenario 5 |
| TC-8 | 多 Legend 圆角设置相互独立 | 1. 图表含 Color Legend + Size Legend<br>2. 仅对 Color Legend 开启圆角，检查 Size Legend 状态<br>3. 反之，仅对 Size Legend 修改，检查 Color Legend | 各 Legend 圆角设置独立，修改一个不影响其他 | 🔴 Bug #75041 | 分析 Scenario 6；Bug #75041（New）待修复 |
| TC-9 | 旧 Viewsheet 升级后向后兼容 | 1. 使用旧版本保存含 Legend 的 Viewsheet（或手工构造不含 symbolRoundCorners 属性的 XML）<br>2. 在新版本加载，观察图例符号形状<br>3. 打开 Format 对话框确认复选框状态 | 符号为直角矩形，复选框未勾选（symbolRoundCorners=false） | ✅ 旧 Viewsheet 加载后为 false | 分析 Scenario 7 |
| TC-10 | DC 图表切换 display 类型后圆角保持 | 1. 在 DC 中创建含 Color Legend 的图表，开启圆角<br>2. 切换 display 类型（Bar → Line → Bar）<br>3. 观察圆角设置是否保持<br>4. 保存 Dashboard，重新打开验证 | display 切换后圆角设置不变；保存重载后状态一致 | 🔴 Bug #75029 | 分析 Scenario 10；Bug #75029（New）待修复 |
| TC-11 | PDF / Image 导出圆角效果 | 1. 创建含 Color Legend（开启圆角）的图表<br>2. 导出为 PDF，查看图例符号形状<br>3. 导出为 PNG，查看图例符号形状<br>4. 对比两种格式与页面显示是否一致 | PDF 和 PNG 中图例符号均显示圆角，无锯齿或变形，与页面渲染一致 | ✅ 导出结果正确 | 分析 Scenario 11 |
| **P2** | | | | | |
| TC-12 | 本地化：非英文环境下文本正确显示 | 1. 切换系统语言为非英文（如中/日/法）<br>2. 打开 Color Legend Format 对话框<br>3. 观察"Round Symbol Corner"区域文本 | 显示对应语言翻译文本，不显示原始 key | ✅ 已添加本地化 | 分析 Scenario 12 |
| TC-13 | Script 兼容性 | 1. 通过 Script 设置 `chart.legends.symbolRoundCorners = true`<br>2. 打开 Format 对话框确认 UI 同步<br>3. 验证 Auto-complete 是否提示属性名 | Script 与 UI 双向同步；Auto-complete 正确提示 | 🔴 Bug #75039 | 待 Bug #75039 修复后执行 |
| TC-14 | Mobile 端复选框布局 | 1. 在移动端/小屏幕下打开 Color Legend Format 对话框<br>2. 观察"Round Symbol Corner"复选框布局 | 复选框正常显示，无溢出或遮挡 | ✅ 结果正确 | 分析 Mobile 影响检查 |

---

## 4 Special Testing

### Security
不涉及。

### Performance
不涉及（圆角渲染使用 `RoundRectangle2D`，开启时增加抗锯齿，对性能影响极小，无需专项测试）。

### Compatibility
旧 Viewsheet 兼容性已在 TC-9 覆盖。

### 本地化
TC-12：验证新增 i18n key `Round Symbol Corner` 在各支持语言下翻译完整，不显示原始 key。

### Script
TC-13（依赖 Bug #75039 修复）：验证 `symbolRoundCorners` 可通过 Script 读写，与 UI 同步，Auto-complete 正常工作。

### 文档 / API
🔴 新增 Legend 格式选项，需确认 Help 文档同步更新。**（当前标记：后续处理）**

### 配置检查
不涉及（无新增 `SreeEnv.getProperty` / `defaults.properties` 配置项）。

---

## 5 Regression Impact（回归影响）

| 模块 | 影响说明 |
|---|---|
| Chart — Color Legend | 核心变更模块，圆角渲染路径变更 |
| Chart — Size Legend | `paintSymbol` + `draw` 逻辑均已修改，极窄 bar 边界处理需回归 |
| Chart — Texture Legend | `paintSymbol` 替换为 `createSymbolRect`，需验证纹理填充不越界 |
| Chart — Shape / Line Legend | 无渲染变更，仅 UI visible 逻辑，需确认复选框不出现 |
| Dashboard Composer (DC) | `GraphUtil` 同步路径，切换 display 后配置需保持 |
| Export — PDF / Image | 圆角图形在矢量/非矢量路径下渲染需回归（TC-11） |
| Viewsheet 保存 / 加载 | XML 序列化/反序列化新增字段，新旧格式均需回归（TC-5、TC-9） |

---

## 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| Bug #75028 | The legend has exceeded the boundary | New |
| Bug #75029 | When change display on DC, the symbol size value changed | New |
| Bug #75033 | When select area of legend, this area does not match the legend border | New |
| Bug #75039 | Add script for Round Symbol Corner | New |
| Bug #75041 | When changing the rounded corner of one legend symbol, the others also change | New
| Bug #75068 | the categoricalColor didn't need round symbol corner | New |

