doc_type: feature-test-doc
product: StyleBI
module: vsobjects/dialog (Selection Container -> Add Filter Dialog) / widget/tree (Tree Component)
feature_id: 58617
feature: Enables search box in Selection Container “Add Filter” dialog
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2779
Assignee: milotalon
last_updated: 2026-03-10
version: stylebi-1.1.0
---

# 1 Feature Summary

本 Feature 使用户在 **Selection Container 元素**中执行“Add Filter（添加过滤器）”操作时，能够在字段树（Tree）顶部使用 **搜索框**快速定位可添加的过滤字段，体验对齐类似“表编辑数据源列搜索（Table datasource columns search）”的交互。

该能力通过对 Add Filter Dialog 内的 `<tree>` 组件启用 `searchEnabled=true` 实现，同时对 Tree 搜索框区域的样式进行了调整以修复搜索框渲染问题（移除固定高度）。

---

# 2 Test Focus

只列 **必须测试的路径**（本次 PR 改动直接相关）

## P0 - Core Path

1. **Add Filter Dialog 显示搜索框 + 搜索过滤生效**
   - 打开 Selection Container 的 Add Filter Dialog
   - 搜索框可见、可输入
   - 输入关键字后树节点过滤/排序/展开行为符合预期（至少能定位目标字段）
   - 选择字段并提交（OK）成功

2. **清除搜索恢复可选字段范围**
   - 点击清除按钮（X/删除图标）或按 `ESC`
   - 搜索内容清空，树恢复为未搜索态（至少恢复可见节点集合）

## P1 - Functional Path

- **搜索无结果反馈**
  - 输入不存在关键字，出现“searchFailed”提示（或等价的“无结果”反馈），且不影响后续清除/再次搜索

- **多选过滤器字段 + 搜索结合**
  - 多选模式下，搜索前/后选择状态保持一致（已选字段不因搜索而丢失或错误追加）
  - 提交后仅 `type == "columnNode"` 的节点会被提交（符合 AddFilterDialog.selectNodes 逻辑）

- **输入边界**
  - 仅空格、前后空格、大小写混合
  - 特殊字符输入（确保不崩溃、不出现 UI 破版）

- **UI 行为一致性（对话框布局）**
  - 搜索框高度变化后：对话框内树区域不应出现异常留白/遮挡/滚动条异常（与 SCSS 改动直接相关）

## P2 - Extended Path

- **兼容性（样式/布局）**
  - Chrome / Firefox / Edge / Safari（如有）下搜索框与树列表的布局一致性
  - 不同缩放比例（100%/125%/150%）下搜索框不应出现文本截断、图标错位

- **性能（大树节点）**
  - 字段数较多（例如上千节点）时，输入搜索关键字响应时间可接受、无明显卡顿（重点关注搜索触发的 expandAll + datasource refresh 行为风险）

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| TC58617-1 | Add Filter Dialog shows search | 打开 Selection Container → Add Filter Dialog | Tree 顶部显示搜索框，可输入 |  | 覆盖 `add-filter-dialog.component.html` 中 `[searchEnabled]=true` |
| TC58617-2 | Search filters nodes | 在搜索框输入存在的字段关键字（如 “Sales”） | 树节点被过滤/排序；能快速定位目标字段 |  | 验证核心可用性（需求主目标） |
| TC58617-3 | Clear search by icon | 输入关键字后点击清除图标 | 搜索文本清空；树恢复未搜索态可见节点 |  | 覆盖 `clearSearchContent()` 路径（Tree 组件 UI） |
| TC58617-4 | Clear search by ESC | 输入关键字后按 ESC | 搜索文本清空（或退出搜索态）；无异常 |  | 覆盖 `(keydown.escape)` 行为 |
| TC58617-5 | No result feedback | 输入不存在关键字 | 显示“searchFailed/无结果”提示；不崩溃 |  | 对应 `tree.component.html` 中 searchFailed 区域 |
| TC58617-6 | Multi-select with search | 多选若干 columnNode → 再搜索 → 再勾选/取消 → OK | 提交的节点集合正确且仅包含 `type=columnNode` |  | 与 `AddFilterDialog.selectNodes()` 过滤逻辑强相关 |
| TC58617-7 | UI layout after SCSS change | 在 Add Filter Dialog 中观察搜索框高度/对齐/是否遮挡树列表 | 搜索框不截断；图标不漂移；无异常留白/溢出 |  | 覆盖 `.search-box { height:30px }` 移除后的回归风险 |
| TC58617-8 | Cross-module smoke: other trees with searchEnabled | 打开系统内其他启用 tree 搜索的页面（如 binding-tree / wizard binding tree 等） | 搜索框布局正常，未引入明显回归 |  | SCSS 全局影响验证（必须做最小冒烟） |
| TC58617-9 | Compatibility: browser + zoom | Chrome/Firefox/Edge（+ Safari 若适用）分别在 100%/125%/150% 打开对话框并搜索 | 搜索框与树列表布局一致，无截断/错位 |  | 样式改动的高风险点 |
| TC58617-10 | Performance: large node set | 在节点量大的模型中执行搜索（连续输入 5~10 次） | 响应可接受；无明显卡顿/冻结；结果正确 |  | 关注 expandAll 与 datasource refresh 的放大效应 |

---

# 4 Special Testing

> 仅当 Feature 涉及时执行（本次以“与改动直接相关”为原则）

## Performance

- **Why**：Tree 搜索实现中存在 `expandAll(this.root)` + datasource refresh 的潜在放大成本；节点量大时可能卡顿
- **How**
  - 构造/选取包含大量字段节点的 Selection Container 数据源
  - 连续输入触发搜索（模拟真实用户逐字输入）
  - 记录输入到 UI 稳定渲染的时间；观察是否出现长任务/明显掉帧

## Compatibility

- **Why**：本次 SCSS 移除了搜索框固定高度，可能在不同浏览器/字体/缩放下引发布局差异
- **How**
  - 浏览器：Chrome / Firefox / Edge / Safari（如适用）
  - Zoom：100% / 125% / 150%
  - 检查：placeholder 是否截断、清除图标是否对齐、树容器是否出现多余滚动条或遮挡

## 本地化

- **Why**：搜索框 placeholder 使用 `_#(Search)`，需确保资源存在且显示为目标语言
- **How**
  - 切换至少两种语言环境（英文 + 中文）
  - 验证 placeholder、无结果提示（`common.searchFailed`）、清除按钮 title 文案正确显示

---

# 5 Regression Impact（回归影响）

本次 PR 虽然功能点在 Add Filter Dialog，但 **样式改动位于 Tree 组件全局 SCSS**，因此回归影响面主要在：

- **VSObjects / Dialog**
  - 任何使用 `<tree [searchEnabled]="true">` 的对话框（例如向导类、字段选择类弹窗）

- **Widget / Tree（全局）**
  - 其他启用 tree 搜索的组件：binding-tree、asset-tree、wizard-binding-tree 等（需做最小冒烟验证）
  - 风险类型：搜索框高度变化导致布局、容器高度 calc 逻辑与实际高度不一致（留白/遮挡/滚动异常）

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| Bug #74053|（<stateless-sessions-Feature #58617>when drag scroolbar,the search should be keep | Resolved |
---