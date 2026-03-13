---
doc_type: feature-test-doc
product: StyleBI
module: dashboard-chart
feature_id: 72760
feature: Feature #72760 Enable setting hyperlink on chart titles and empty plot area
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2489
Assignee: FigurePaper
last_updated: 2026-03-13
version: 14.0
---

# 1 Feature Summary

**核心目标**：为图表新增两类“非数据绑定区域”的超链接能力：**Chart Title（标题）** 与 **Empty Plot Area（空白绘图区）**，支持在 Viewer/Preview 中直接点击跳转，并在 Composer 中可配置与持久化。  
**用户价值**：替代通过透明 TextBox 覆盖图表来模拟超链接的方案，避免遮挡导致 tooltip / brushing / drilling 等交互失效，同时提供更自然的导航入口（标题/空白区）。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

1. **Composer 设置 Title Hyperlink**
   - 入口：选中标题 → `Hyperlink Title` → 保存
   - 验证：对话框不出现 fields（非数据绑定）；保存后能回显

2. **Composer 设置 Empty Plot Hyperlink**
   - 入口：未选中标题且��� region 选区 → `Hyperlink Empty Plot Area` → 保存
   - 验证：对话框不出现 fields；保存后能回显

3. **Viewer（桌面端）点击 Title 触发跳转**
   - 验证：标题 cursor-pointer、tooltip 正确、左键跳转符合 target/self

4. **Viewer（桌面端）点击 Empty Plot Area 触发跳转**
   - 验证：空白绘图区 cursor-pointer（无 region 时）、tooltip 拼接正常、左键跳转

5. **不抢占原有图表交互/超链接**
   - 当点击数据点/region（存在区域 hyperlink 或交���）时：应优先原行为；empty plot 仅在“无选区”时触发

## P1 - Functional Path

1. **设计态/绑定态标题点击不误跳（预期确认点）**
   - 风险：当前实现中非 preview 也可能左键触发标题链接
   - 必测：单击（选中）/双击（编辑）/拖拽 resize 等交互不应被跳转破坏（或按产品预期执行）

2. **Action 可见性与图表类型限制**
   - empty plot hyperlink：对 `Mekko/Treemap/Icicle` 不可见（需验证确实隐藏）
   - title hyperlink：仅在 titleSelected 时可见（Composer）

3. **导入导出 / 复制粘贴 / 刷新重开后的持久化一致性**
   - 新增 XML 节点：`titleLinkValue` / `emptyPlotLinkValue` 必须可持久化

4. **Tooltip 文案拼接与本地化**
   - `Hyperlink Title` / `Hyperlink Empty Plot Area` 菜单文本 key 正常翻译
   - emptyPlotLinkTooltip 与原 tooltipString 组合后可读、不乱码

## P2 - Extended Path （按需测试）

1. **兼容性**
   - 不同浏览器（Chrome/Edge/Firefox）点击与 tooltip/cursor 行为一致
   - 不同 chart 类型（轴类、partition 类、map 类）对“空白绘图区”的判定是否一致（按需扩展）

2. **安全**
   - URL 跳转策略（外链、mailto、javascript scheme 等）与系统���有 hyperlink 安全策略一致（若系统有限制需验证）

3. **性能**
   - 大型 viewsheet 多图表情况下 hover/cursor/tooltip 拼接无明显卡顿（按需）

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| TC72760-1 | Composer 设置 Title Hyperlink 并持久化 | 选中标题 → Hyperlink Title → 配置URL/tooltip/target → 保存 → 刷新/重开 → 再次打开对话框 | 配置回显；fields 不显示；保存不丢失 | TBD | 关注 dialog 参数 `titleLink=true` |
| TC72760-2 | Viewer（桌面）标题 hover/点击跳转 | Viewer 打开 → 悬停标题 → 左键单击标题 | cursor-pointer；tooltip 为 titleLinkModel.tooltip；点击跳转成功 | TBD | 需覆盖 self/new tab 策略 |
| TC72760-3 | Composer 设置 Empty Plot Hyperlink 并持久化 | 清空选区且未选中标题 → Hyperlink Empty Plot Area → 配置URL → 保存 → 重开验证回显 | 配置回显；fields 不显示；保存不丢失 | TBD | 参数 `emptyPlotLink=true` |
| TC72760-4 | Viewer（桌面）空白绘图区 hover/点击跳转 | Viewer 打开 → 将鼠标移至无数据点空白区 → 左键点击 | cursor-pointer（regions=0 且 hasEmptyPlotLinkModel）；点击触发 emptyPlot 跳转 | TBD | 验证 tooltipString 追加 emptyPlotLinkTooltip |
| TC72760-5 | Empty Plot 不抢占数据点/region hyperlink | 同图表：数据点有 hyperlink + empty plot 有 hyperlink → 点击数据点 → 点击空白区 | 数据点点击走原 hyperlink；空白区点击走 empty plot hyperlink | TBD | 核心优先级回归 |
| TC72760-6 | Empty Plot action 可见性：Treemap/Icicle/Mekko | Composer 中切换到 Treemap/Icicle/Mekko → 清空选区 | `Hyperlink Empty Plot Area` 不出现 | TBD | 确认产品预期是否允许这些类型 |
| TC72760-7 | 设计态标题点击行为（预期确认） | Composer 非 preview → 单击标题（选中）→ 双击编辑 → resize ��题 | 不应因跳转导致无法选中/编辑/resize（或按产品预期允许跳转） | TBD | 高风险：当前实现可能左键即跳 |
| TC72760-8 | 导出导入/复制粘贴后 hyperlink 保留 | 配置 title+emptyPlot hyperlink → 导出导入或复制到新 viewsheet → Viewer 验证点击 | 两类 hyperlink 均保留且可点击 | TBD | 覆盖 XML 新节点 |
| TC72760-9 | 本地化：新增菜单项文本 | 切换语言（若支持）→ 查看 chart actions 菜单项 | `Hyperlink Title/Empty Plot Area` 不显示 raw key；翻译正确 | TBD | 资源文件仅看到 srinter.properties（需核对其他语言包） |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
- 验证 title/emptyPlot hyperlink 对外链策略与原有 hyperlink 一致（禁止/允许的 scheme、一致的跳转确认策略、URL 编码处理等）

## Performance
- 多图表页面 hover/cursor/tooltip 频繁移动无明显性能下降（按需抽样）

## Compatibility
- 浏览器兼容：Chrome/Edge/Firefox（至少 2 个）
- 设备兼容：桌面 + 移动端（若产品支持 mobile viewer）

## 本地化
- 新增 key：`Hyperlink Title`��`Hyperlink Empty Plot Area` 在各语言包显示正确，不回退 key

## script
- 前端 VSChartModel 新增字段为可选：`titleLinkModel?`、`emptyPlotLinkModel?`
- 若系统有脚本引用 VSChartModel：确保不因字段变化导致脚本报错（兼容性 smoke）

## 文档/API
- 若产品 Help/文档中有 Hyperlink 设置说明：需补充 title/emptyPlot 两个入口（PR 未包含文档改动，需跟踪）

## 配置检查
- 无（本 PR 未涉及 defaults.properties / SreeEnv property）

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- **Chart（核心）**：selection / hover cursor / tooltip / hyperlink click 优先级
- **Dashboard / Viewsheet Viewer**：交互与跳转、移动端 show hyperlinks 行为
- **Composer**：chart actions 菜单、Hyperlink Dialog 入参分支（titleLink/emptyPlotLink）
- **Import/Export / Copy-Paste**：VSAssemblyInfo XML 新字段持久化
- **国际化**：新增资源 key 的翻译覆盖

---

# 6 Bug List

| Bug ID               | Description                                                                                                                    | Status   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Bug #73282           | <Feature #72760> when select **'Hyperlink Empty Plot Area'** in Treemap, console popup 500                                     | Closed   |
| Bug #73284           | <Feature #72760> when chart style is **Marimekko, Icicle, Treemap**, the **'Hyperlink Empty Plot Area'** should be invisible   | Closed   |
| Documentation #73294 | <Feature #72760> add right menu of **hyperlink on chart title and empty plot area**                                            | Resolved |
| Documentation #74059 | <Feature #72760> Hyperlink on **empty plot area / chart title**                                                                | New      |
| Bug #74143           | <stateless-sessions-Feature #72760> the **hyperlink tooltip shows but mouse can't trigger hyperlink**                          | New      |
| Bug #74144           | <stateless-sessions-Feature #72760> in **viewsheet edit mode**, the **tooltip should be hidden**                               | New      |
| Bug #74148           | <stateless-sessions-Feature #72760> when select **hyperlink title or hyperlink empty plot area**, **field should be disabled** | New      |
