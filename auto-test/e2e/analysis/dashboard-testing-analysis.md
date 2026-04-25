# Dashboard E2E 测试三方向分析

## 概览

| 方向 | 核心挑战 | 自动化难度 |
|------|---------|-----------|
| 1. 编辑操作（拖拽/右键/节点） | Angular CDK DND 兼容性 | 高 |
| 2. 交互控件（Brush/Zoom/悬浮/选择器） | Canvas 坐标、异步渲染 | 高 |
| 3. 导出对比（PNG/PDF/HTML/CSV） | 二进制比对、像素差异容忍 | 中 |

---

## 方向1：编辑操作（拖拽 / 右键 / 节点展开 / 增删改）

### 需要分析的内容

**① 拖拽（Drag and Drop）**

Dashboard 中的拖拽分两种场景，处理方式不同：

| 场景 | 拖拽类型 | 需要验证的内容 |
|------|---------|--------------|
| Composer 中拖拽字段到绑定区 | Angular CDK `cdkDrag` | `dragTo()` 是否可用，还是需要 `mouse.move/down/move/up` 序列 |
| Composer 中拖拽组件到画布定位 | Angular CDK `cdkDrag` | 拖拽后坐标是否精确，组件是否渲染在正确位置 |
| 仪表盘查看器中拖动时间滑块 | 原生 input range 或 CDK | `dragTo()` 还是 `fill()` |

**需要验证**：
- 用 `playwright codegen` 录制一次完整的字段拖拽到绑定区操作，观察生成代码的类型（是 `dragTo` 还是 `mouse` 序列）
- Angular CDK 拖拽在 Playwright 中是否需要 `force: true` 才能触发 `pointerdown`
- 拖拽成功的断言点：绑定区显示字段名 or 网络请求 `/api/vs/binding/` 返回 200

**② 右键上下文菜单**

- `click({ button: 'right' })` 可触发右键，但需要确认菜单定位：`getByRole('menu')` 还是 CSS class
- 验证点：菜单出现、点击菜单项、操作生效（如删除后组件消失）

**③ 树节点展开（Repository Tree / Data Tree）**

- 展开箭头的 locator：`[data-testid="expand-icon"]` 还是 `getByRole('treeitem').getByRole('button')`
- 需要验证懒加载树（展开后触发网络请求）的等待策略：`waitForResponse` vs `waitForSelector`

**④ 组件创建 / 编辑 / 删除**

- 组件工具栏按钮（Edit/Delete/Move）的 locator 格式需要录制确认
- 删除确认对话框：是否有确认步骤，locator 是否稳定

### 需要验证的结论

- [ ] `dragTo()` 对 Angular CDK 是否可用（如不可用，写入 `_RECIPES.md` 的 `mouse` 序列）
- [ ] 右键菜单的 CSS 选择器或 role 定位
- [ ] 树节点展开的等待策略（同步/异步）
- [ ] 拖拽后的网络请求断言点（避免用 `sleep`）

---

## 方向2：仪表盘交互控件

### 需要分析的内容

**① Brush（刷选）和 Zoom（缩放）**

这两个操作本质是在图表区域内按住鼠标拖出矩形：

```
mouse.move(x1, y1) → mouse.down() → mouse.move(x2, y2) → mouse.up()
```

**关键问题**：
- 图表是 Canvas 还是 SVG？需要确认渲染技术
  - SVG：可以用 `locator('path.data-point').boundingBox()` 获取元素坐标
  - Canvas：只能用容器的 `boundingBox()` 加偏移量计算坐标，坐标依赖分辨率
- Brush 后的断言：图表数据变化如何验证？截图对比 or 数据 API 返回值变化
- Zoom 后的断言：坐标轴范围变化（读取轴标签文字）

**需要验证**：
- 图表容器的 DOM 结构：`<canvas>` 还是 `<svg>`
- Brush/Zoom 操作后是否触发可等待的网络请求或 DOM 变化
- 坐标计算是否依赖视口尺寸（`page.setViewportSize()` 是否影响结果）

**② 鼠标悬浮 Tooltip**

- `locator.hover()` 后 tooltip 出现，需确认 tooltip 的 DOM 定位
- 验证点：tooltip 文字内容（`toHaveText`）还是截图对比
- 异步出现延迟：`waitForSelector('[role=tooltip]')` 或固定 `waitForTimeout(300)`（后者脆弱，应避免）

**③ Checkbox / RadioButton / ComboBox**

| 控件 | Playwright 方法 | 需要验证的内容 |
|------|----------------|--------------|
| Checkbox | `locator.check()` / `locator.uncheck()` | Angular Material checkbox 是否响应，还是需要点击 label |
| RadioButton | `locator.check()` | 同上 |
| ComboBox（下拉） | `locator.selectOption()` 或 `locator.click()` + 选项 click | 是原生 `<select>` 还是 Angular Material `mat-select`（区别很大） |

**关键区分**：Angular Material 的 `mat-select` 不是原生 `<select>`，`selectOption()` 无效，必须：
1. `click()` 打开下拉面板
2. `getByRole('option', { name: 'xxx' }).click()` 选择选项

需要验证仪表盘中的选择器是原生还是 Material 组件。

**④ Calendar（日历点击）**

- 日期选择器类型：Material Datepicker（需要打开 calendar popup）还是内嵌日历
- 操作流程：点击输入框 → 日历弹出 → 点击目标日期单元格
- 月份/年份导航：前后翻页按钮的 locator
- 验证点：选择后输入框显示正确日期格式（`toHaveValue`）

### 需要验证的结论

- [ ] 图表渲染技术（Canvas vs SVG）及坐标获取策略
- [ ] Brush/Zoom 操作后的可等待断言信号
- [ ] Tooltip 的 DOM 路径和出现时机
- [ ] ComboBox 类型（原生 `<select>` vs `mat-select`）
- [ ] Calendar 控件类型及日期单元格的 locator 格式

---

## 方向3：导出对比（PNG / PDF / HTML / CSV）

### 需要分析的内容

**① PNG 导出对比**

PNG 是视觉验证最严格的场景，有两种对比方案：

| 方案 | 方式 | 适用场景 |
|------|------|---------|
| **截图对比**（推荐） | `toHaveScreenshot()` 对浏览器中的图表区域截图 | 验证渲染外观，不依赖下载文件 |
| **文件内容对比** | 下载导出的 PNG 文件，与基线做像素 diff | 验证导出功能本身正确性 |

**截图对比的问题**：
- 字体渲染、抗锯齿在不同 OS/分辨率下有差异，需要设置像素容差 `maxDiffPixelRatio`
- 首次运行自动生成基线，之后比对 → 基线文件需要提交到 Git
- Playwright 内置 `--update-snapshots` 用于更新基线

**文件下载对比**：
- `page.waitForDownload()` 拦截下载
- PNG 像素对比需要引入 `pixelmatch` 或 `sharp` 库
- 问题：服务端生成的 PNG 受字体/渲染环境影响，CI 环境和本地可能不一致

**需要验证**：
- 导出按钮触发的是浏览器下载还是在新标签打开
- `waitForDownload()` 是否能稳定拦截
- 确定基线管理策略（只用截图对比 or 同时做文件比对）

**② PDF 导出对比**

PDF 是二进制格式，无法直接比对文件内容，可选方案：

| 方案 | 可行性 | 说明 |
|------|--------|------|
| 截图对比 PDF 预览 | 低 | 浏览器内嵌 PDF 渲染不稳定 |
| 下载后用 `pdf-parse` 提取文字 | 中 | 验证关键文字内容存在，不验证布局 |
| 验证下载成功 + 文件大小范围 | 高（建议） | 断言文件存在、大小 > 阈值（排除空文件） |
| 标记 `_REQUIRES_HUMAN_:` | 适用布局验证 | 布局正确性无法自动化 |

**建议**：PDF 测试只验证"导出成功且文件不为空"，布局视觉验证用截图对比 Portal 内的预览。

**③ HTML 导出对比**

- 下载 HTML 文件，解析 DOM（用 `cheerio` 或正则）
- 验证关键元素存在：图表容器、表格行数、标题文字
- 不验证样式细节（受 CSS 影响不稳定）

**④ CSV 导出对比**

最容易自动化：
- `waitForDownload()` 拦截 CSV 文件
- 读取文件内容，按行解析
- 验证：列名（第一行）、数据行数、特定单元格值

**需要验证**：
- 各导出格式的触发方式（按钮路径/键盘快捷键）
- 下载文件的 Content-Type 和文件名格式
- CSV 的字符集（是否有 BOM，影响解析）
- PNG 导出是否支持服务端渲染（和浏览器截图不同路径）

### 需要验证的结论

- [ ] PNG：确定用截图对比还是文件比对，以及基线管理方案
- [ ] PDF：确认只验证导出成功还是内容提取
- [ ] HTML：确定关键断言元素（不做全量 DOM 对比）
- [ ] CSV：确认字符集和列名格式

---

## 跨方向通用问题

| 问题 | 影响方向 | 需要验证的内容 |
|------|---------|--------------|
| **Angular CDK DND** | 方向1 | `dragTo()` 是否可用 |
| **图表渲染技术** | 方向2、3 | Canvas vs SVG，影响坐标和截图策略 |
| **异步等待信号** | 方向1、2 | 操作后用 `waitForResponse` 还是 `waitForSelector` |
| **截图基线管理** | 方向3 | 基线提交策略，CI 环境一致性 |
| **视口尺寸固定** | 方向2、3 | 坐标和截图依赖 viewport，需要固定 `1280×720` |

---

## 行动项汇总

### 必须用 `playwright codegen` 录制验证的操作

1. 拖拽字段到 Composer 绑定区（确认 DND 方式）
2. 触发 Brush 刷选（确认 `mouse` 序列坐标计算）
3. 打开 ComboBox 并选择选项（确认是否 `mat-select`）
4. 触发 PNG/PDF/CSV 导出（确认下载拦截方式）

### 需要写入 `_RECIPES.md` 的新 Recipe

| Recipe 名称 | 对应方向 |
|------------|---------|
| Drag field to chart binding drop zone | 方向1 |
| Right-click component and select menu item | 方向1 |
| Expand tree node (with lazy load wait) | 方向1 |
| Brush select region on chart | 方向2 |
| Hover chart data point and read tooltip | 方向2 |
| Open mat-select and choose option | 方向2 |
| Pick date from Material Datepicker | 方向2 |
| Export viewsheet and intercept download | 方向3 |
| Compare exported PNG with baseline screenshot | 方向3 |
| Parse and assert CSV download content | 方向3 |

---

## 自动化可行性评估

### 方向1：编辑操作

**可能性：中（60%）**

右键、展开节点、点击这些可以稳定自动化。但拖拽是致命弱点：

- Angular CDK DND 在 headless CI 环境下比本地更容易失败，timing 差异大
- 一旦 UI 重构（组件移位、class 变化），所有依赖坐标或 DOM 结构的拖拽测试全挂
- 失败信息通常是"元素未移动"，原因难以 debug

**拖拽部分会是持续的 flaky 来源**，后期维护很可能变成"这个测试又挂了，skip 掉吧"。

---

### 方向2：交互控件

**可能性：低（30%）**

Brush / Zoom 是最大问题：

- 依赖像素坐标，来自图表容器的 `boundingBox()`
- 图表大小受数据量、窗口尺寸、字体渲染影响，**任何一次数据变化都可能让坐标失效**
- Canvas 渲染无法读取内部元素，验证 Brush 效果只能截图或解析 API 响应，两者都脆弱

Tooltip 出现时机不稳定，`waitForSelector` 超时是常见原因。Angular Material 组件的 DOM 结构在版本升级时会变。

**这一方向的测试写出来很可能是"在 CI 里三次有一次失败"的状态**，人员少的情况下没有精力持续维护。

---

### 方向3：导出对比

**可能性：分化明显**

| 格式 | 可能性 | 原因 |
|------|--------|------|
| CSV | 高（90%） | 纯文本，稳定，易维护 |
| HTML | 中（65%） | 只验证文字内容和结构，不比对样式 |
| PDF | 中（60%） | 限于"文件存在且不为空"，不做布局验证 |
| PNG 截图对比 | 低（30%） | 字体渲染、抗锯齿在不同 OS/GPU/Chrome 版本下不同，基线频繁失效 |

PNG 对比是维护成本最高的：每次 Chrome 升级、每次服务器字体变化都需要更新基线，而更新基线需要人工 review，否则等于掩盖了 bug。

---

### 综合判断

**投入产出比不高，特别是人员少的情况下。**

真正能稳定 run 且值得维护的部分：

- 创建 / 删除 / 重命名（不含拖拽绑定）
- Checkbox / Radio / ComboBox 标准交互
- CSV 导出验证
- Tooltip 文字断言（非截图）

**建议降级处理的部分**：

| 场景 | 原策略 | 降级策略 |
|------|--------|---------|
| 拖拽绑定 | 模拟拖拽操作 | 标记 `_REQUIRES_HUMAN_:`，或只通过 API 验证绑定结果 |
| Brush / Zoom | 鼠标坐标操作 + 截图断言 | 只验证操作后的 API 请求参数变化 |
| PNG 导出 | 像素对比 | 降级为"下载成功 + 文件大小 > 阈值" |
| PDF 导出 | 布局验证 | 同上，放弃布局验证 |

**更务实的策略**：把 dashboard 类测试的目标从"验证视觉效果"降为"验证功能流程正确"，这样 80% 的场景可以稳定自动化，剩下 20% 视觉类的留给截图 review 或手工验证。
