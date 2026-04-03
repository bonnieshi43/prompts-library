# chartAPI pages >5KB 切割语义风险分析

> 分析路径：`E:\inetsoft\assistant\node\docs\modules\chartAPI\pages`  
> 切割规则参考：`e:\inetsoft\test-garden\assistant\document\切割规则-简化版本.md`  
> 分析日期：2026-04-01

---

## 涉及文件（>5KB）

| 文件 | 大小 | 估算 tokens |
|------|------|------------|
| ChangeChartCoordinates.md | 27,564 bytes | ~6,900 |
| ChangeChartScaling.md | 7,980 bytes | ~2,000 |
| ChangeAxisProperties.md | 5,266 bytes | ~1,317 |

---

## 切割规则要点（chartAPI 模块）

- ≥5KB → 按 H2 切割
- H2 块内有 H3 且正文 >~1000 tokens → 进一步按 H3 切
- `Parameters` / `Examples` 标题的 H3 不独立成块，自动合并到前一块
- 无 H2 → 整篇不切割，作为单块
- 每块都带：H1 + 引言 + 对应 H2 + 对应 H3（若触发 H3 切割）

---

## 一、ChangeChartCoordinates.md（27KB）—— 问题最多

### 文档结构

```
H1: Change Chart Coordinates（+ 引言）
  H2: Rectangular Coordinates
    H3: Assign Rectangular Coordinates Automatically
    H3: Assign Rectangular Coordinates Explicitly
  H2: Polar Coordinates
    H3: Convert Rectangular to Polar Coordinates
    H3: Tailor Polar Coordinate Mapping
  H2: Polar Coordinates Example: Pie Chart   ← 无 H3
  H2: Parallel Coordinates                    ← 无 H3
  H2: Facet Coordinates                       ← 无 H3
  H2: Set Coordinate Background
    H3: Set Background Color
    H3: Set Background Image
```

---

### 问题 1 🚨 严重：`<dl>` HTML 标签横跨整篇文档，切割后各块 HTML 结构损坏

**位置**：

| 行 | 内容 |
|----|------|
| 47 | `<dl><dt><strong>💡 TIP</strong></dt><dd>` ← 开标签，位于 H3 "Assign Rectangular Coordinates Automatically" 内部 |
| 549 | `</dd></dl>` ← 关标签，位于 H3 "Set Background Image" 末尾 |

该 `<dl>` 块横跨 **所有后续 H2/H3**，包括 Polar Coordinates、Pie Chart、Parallel、Facet、Set Background Color/Image 整整 5 个 H2。

**切割后后果**：

- H3 "Assign Rect Auto" 块：含 `<dl>` 开标签，但无对应关闭 → 渲染时 HTML 结构不完整，后续内容可能被意外缩进/隐藏。
- 中间所有 H2/H3 块（Polar Coordinates 起）：都在未闭合的 `<dd>` 内，Markdown 渲染可能产生意料外布局。
- "Set Background Image" 块：含孤立 `</dd></dl>` → 渲染器可能报错或忽略。

**建议修改**：

将 `</dd></dl>` 关闭标签从第 549 行移到 TIP 内容正下方（第 54 行附近），让 `<dl>` 块只包裹 TIP 提示内容，不跨越任何 H2/H3 边界：

```markdown
### Assign Rectangular Coordinates Automatically
...（正文）...

<dl><dt><strong>💡 TIP</strong></dt><dd>

If needed, you can obtain a handle to the existing RectCoord object by using EGraph.getCoordinate():
```javascript
var coord = graph.getCoordinate();
```
</dd></dl>          ← 在这里关闭，不再跨越到后面

<a name="AssignRectangularCoordinatesExplicitly"></a>
### Assign Rectangular Coordinates Explicitly
...
```

---

### 问题 2 ⚠️ 中等："Polar Coordinates Example: Pie Chart" H2 无 H3，单块偏大

该 H2 包含完整的饼图教程（约 6 个步骤 + 多段代码 + 多张图），估算 ~1,050 tokens，接近大块记录阈值（1,200 tokens），且无 H3，无法进一步切割。

**建议**：在该 H2 下增加 H3 分段：

```markdown
## Polar Coordinates Example: Pie Chart

A pie chart is essentially a **stacked bar chart** ...

### Create the Base Bar Chart

### Distinguish States by Color (No X-Axis)

### Convert to Stacked Bar

### Apply Polar Coordinates (THETA Mapping)

### Remove Axis Lines and Add Labels

### Complete Script
```

---

### 问题 3 ⚠️ 中等：Polar Coordinates ↔ Pie Chart 跨块语义依赖

- `H2: Polar Coordinates` 介绍 `PolarCoord` 的基本构造方式
- `H2: Polar Coordinates Example: Pie Chart` 依赖 Polar Coordinates 的概念，且文中显式引用 "the script from the previous section"

切割后两块独立。用户问"如何用极坐标做饼图"时，命中 Pie Chart 块，但 PolarCoord 的构造背景在另一块，回答时缺少关键上下文。

**建议**：在 "Pie Chart" H2 引言中补充 PolarCoord 的简短说明（不依赖读者已读前一块），使该块独立可理解。

---

### 问题 4 ℹ️ 轻微："Set Background Image" H3 体积偏大

包含 ~70 行地图示例代码，单独成块后估算 ~800 tokens，有触发大块记录的风险。可接受，无需强制拆分，但文档中应确保有清晰的注释边界。

---

## 二、ChangeAxisProperties.md（5.2KB）—— 最严重的结构性问题

### 文档结构

```
H1: Change Axis Properties（+ 引言）
  （正文：步骤 1–7 + Complete Script）
  =====
  （替代写法：getter method，用于已有图表）
  =====
```

**全文无任何 H2 标题。**

---

### 问题 1 🚨 严重：无 H2 → 整篇作为单块输出，~1,317 tokens 超过大块阈值

切割规则明确：
> 文档里没有 H2 标题 → 整篇文档不拆分。

5,266 bytes ÷ 4 ≈ **1,317 tokens**，超过大块记录阈值（1,200 tokens），会被记入 `large-chunks-analysis.json`。

**后果**：
- 7 步骤教程 + Complete Script + getter 替代写法全部压入一个向量，嵌入语义被稀释
- 用户只问"如何改 Y 轴颜色"或"如何修改已有图表的坐标轴"时，都命中同一块，无法区分粒度

---

### 问题 2 ⚠️ 中等：getter 替代写法无标题，被埋在大块末尾

第 101–121 行（`=====` 分隔后）介绍用 `EGraph.getCoordinate()` 等 getter 方法修改**已有图表**的坐标轴属性——这是一个与"从头创建"完全不同的高频场景，但没有任何标题，无法被单独检索到。

---

### 修改建议（关键，最小改动）

只需增加两个 H2 标题，移除 `=====` 分隔符：

```markdown
# Change Axis Properties

（引言段保持不变）

## Set Axis Scale and Appearance

（现有 7 步教程 + Complete Script 移入此 H2 下）

## Modify Axis Properties on an Existing Chart

To change properties on a Chart that was **previously created** with the Chart Editor,
use "getter" methods such as EGraph.getCoordinate() ...
（现有 getter 方法内容移入此 H2 下）
```

改动后：两个 H2 块，每块约 600–700 tokens，大小合理，语义独立，不再触发大块警告。

---

## 三、ChangeChartScaling.md（7.9KB）—— 问题相对轻微

### 文档结构

```
H1: Change Chart Scaling（+ 引言）
  H2: Change Chart Axis Scaling   ← 无 H3，~875 tokens
  H2: Change VisualFrame Scaling  ← 无 H3，~500 tokens
```

两个 H2 均无 H3，不触发 H3 二次切割，切成 2 块，大小合理，**主要切割逻辑无严重问题**。

---

### 问题 1 ⚠️ 中等：getter 替代写法无 H3 标题，被埋在 H2 末尾

第 151–165 行（`=====` 分隔后）展示了对**已有图表**修改 VisualFrame 缩放的方式（用 `graph.getElement(0)` getter），与"从头创建"场景不同，但无独立标题，和"从头创建"的内容混在同一 H2 块内。

**建议**：增加 H3：

```markdown
### Modify VisualFrame Scaling on an Existing Chart

To change the property on a Chart that was **previously created** with the Chart Editor...
```

并移除 `=====` 分隔符。

---

### 问题 2 ℹ️ 轻微：`****` 标记残留在代码块内（第 48 行）

```javascript
graph.setScale('Quantity',scale);
****      ← 格式残留，会被渲染为代码内容
```

建议删除该行。

---

### 问题 3 ℹ️ 轻微：`+` 标记散布在正文中（多处）

```markdown
   +
   [ScalingChartAxesFinal](https://...)
```

`+` 可能是文档工具的占位符残留，会在渲染时显示为普通字符。建议清理或替换为标准 Markdown 格式。

---

## 四、问题优先级汇总

| 优先级 | 文件 | 问题 | 影响 |
|--------|------|------|------|
| 🚨 P0 | ChangeChartCoordinates.md | `<dl>` 标签从第47行横跨至第549行，切割后各块 HTML 结构损坏 | 渲染错误 |
| 🚨 P0 | ChangeAxisProperties.md | 无 H2，整篇作为 ~1,317 token 单块，超大块阈值 | 检索精度差 + 大块警告 |
| ⚠️ P1 | ChangeAxisProperties.md | getter 方法无标题，高频场景无法单独检索 | 回答质量下降 |
| ⚠️ P1 | ChangeChartCoordinates.md | Pie Chart H2 无 H3，~1,050 tokens 接近阈值，无法进一步切割 | 大块风险 |
| ⚠️ P1 | ChangeChartScaling.md | getter 方法无 H3，被埋于 VisualFrame H2 末尾 | 场景命中率低 |
| ⚠️ P2 | ChangeChartCoordinates.md | Polar↔Pie Chart 跨块语义依赖 | 回答缺少上下文 |
| ℹ️ P3 | ChangeChartScaling.md | `****` 和 `+` 格式残留标记 | 代码/正文渲染污染 |
| ℹ️ P3 | ChangeChartCoordinates.md | Set Background Image H3 体积偏大 | 大块风险（轻微） |

---

## 五、最小修改路径（按影响排序）

1. **修复 ChangeChartCoordinates.md 的 `<dl>` 关闭位置**（P0，不改内容，只移标签）
2. **给 ChangeAxisProperties.md 增加 H2 标题骨架**（P0，只加标题，内容不动）
3. **给 ChangeChartScaling.md 的 getter 方法增加 H3 标题**（P1，只加标题 + 删 `=====`）
4. **给 ChangeChartCoordinates.md 的 Pie Chart 节增加 H3**（P1，拆分步骤为子节）
5. **清理 `+` 和 `****` 格式残留**（P3，清理）
