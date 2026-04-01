# viewsheet/pages 文档切割分析与优化清单（基于现有规则）

> 规则来源：`my-docs/切割规则-简化版本.md`（3KB 阈值 + H2 切割 + 满足条件再按 H3 切割 + 大块阈值 1200）。
> 分析范围：`node/docs/modules/viewsheet/pages` 下全部 125 个 `.md`。

---

## 一、整体统计结论

- **总文件数**：125
- **达到切割阈值（viewsheet 视为普通模块，≥ 3KB）**：84
- **未达到阈值（< 3KB，不切割）**：41
- **未形成 H2 切割（noH2=true）**：82
- **存在 chunk ≥ 1000 token 的文件**：62
- **存在 chunk > 1200 token 的文件**：55

结论：在当前切割规则下，`viewsheet/pages` 中有较多文档会产生**过大的 chunk**，或者缺乏有效的 H2/H3 结构，这不利于模型对内容进行细粒度学习与检索。

---

## 二、高风险文档清单（优先优化）

说明：

- 按 **maxToken（单个 chunk 的最大估算 token 数）** 从高到低排序。
- **maxToken 越高，越不利于模型学习与回答**。
- `noH2=true` 表示在当前实现中，没有形成有效的 H2 切割（基本是整篇落在一个 chunk）。

> 注：以下仅列出最靠前的一批高风险文档，后续可以按需要扩展完整列表。

- **CreateNewDashboard.md**
  - `size` ≈ 20.7 KB
  - `h2Count=3`, `finalCount=5`, `h3SplitApplied=1`
  - `maxToken ≈ 4170`
  - `over1000=1`, `over1200=1`
- **RunningTotalChart.md**
  - `size` ≈ 12.9 KB
  - `h2Count=1`, `finalCount=1`, `h3SplitApplied=0`
  - `maxToken ≈ 3141`
  - `over1000=1`, `over1200=1`
  - `noH2=true`（当前视角下相当于“整篇一个 chunk”）
- **BasicChartingSteps.md**
  - `size` ≈ 19.2 KB
  - `h2Count=6`, `finalCount=6`, `h3SplitApplied=0`
  - `maxToken ≈ 3027`
  - `over1000=1`, `over1200=1`
- **AddFreehandTable.md**
  - `size` ≈ 14.9 KB
  - `h2Count=3`, `finalCount=3`, `h3SplitApplied=0`
  - `maxToken ≈ 3015`
  - `over1000=1`, `over1200=1`
- **SlidingWindowChart.md**
  - `size` ≈ 11.9 KB
  - `h2Count=1`, `finalCount=1`, `h3SplitApplied=0`
  - `maxToken ≈ 2903`
  - `over1000=1`, `over1200=1`
  - `noH2=true`
- **AddConditions.md**
  - `size` ≈ 12.3 KB
  - `h2Count=2`, `finalCount=2`
  - `maxToken ≈ 2604`
  - `over1000=1`, `over1200=1`
- **ChartProperties.md**
  - `size` ≈ 19.6 KB
  - `h2Count=5`, `finalCount=5`
  - `maxToken ≈ 2430`
  - `over1000=3`, `over1200=2`
- **AddTargetLineTrendLine.md**
  - `size` ≈ 23.5 KB
  - `h2Count=4`, `finalCount=4`
  - `maxToken ≈ 2353`
  - `over1000=4`, `over1200=3`
- **WordcloudChart.md**
  - `size` ≈ 9.2 KB
  - `h2Count=1`, `finalCount=1`
  - `maxToken ≈ 2228`
  - `over1000=1`, `over1200=1`
  - `noH2=true`
- **AddCrosstab.md**
  - `size` ≈ 8.8 KB
  - `h2Count=1`, `finalCount=1`
  - `maxToken ≈ 2142`
  - `over1000=1`, `over1200=1`
  - `noH2=true`

（其余类似高风险文件包括：`CreateDeviceLayout.md`, `ContourMapChart.md`, `TrendCompareData.md`, `AddTipsToChart.md`, `MapChart.md`, `ScatterContourChart.md`, `RadarChart.md`, `DonutChart.md`, `PercentChangeChart.md`, `ConditionalFormat.md`, `DrillDownIntoData.md`, `StockChart.md`, `HybridTableChart.md`, `HeatMapChart.md`, `WaterfallChart.md` 等。）

---

## 三、主要结构问题归类

### 3.1 问题一：无 H2 结构，整篇或大段落落在单 chunk

特征：

- `noH2=true`，`finalCount=1`，且 `size >= 3KB`。
- 代表该文档在当前规则下**没有被任何 H2 标题切分**，导致整篇落在一个 chunk 中。

典型例子：

- `RunningTotalChart.md`
- `SlidingWindowChart.md`
- `WordcloudChart.md`
- `AddCrosstab.md`
- 以及大量 chart 类文档（如 `BarChart.md`, `LineChart.md`, `PieChart.md`, `ScatterChart.md` 等），它们在统计中都有 `maxToken ≈ 1300~1700` 且 `noH2=true`。

风险：

- 模型一次需要“读懂整篇”，难以在子主题之间建立清晰的语义边界。
- 问答时容易出现“回答很泛、但针对性差”的情况。

### 3.2 问题二：有 H2 但单个 H2 段过长

特征：

- `h2Count > 1`，但某些 chunk 的 `maxToken` 仍超过 `1500~2000`。
- 说明 H2 粒度仍然不够细，一些 H2 下包含太多信息（步骤、属性、示例等）。

典型例子：

- `BasicChartingSteps.md`
- `AddFreehandTable.md`
- `AddConditions.md`
- `ChartProperties.md`
- `AddTargetLineTrendLine.md`
- `TrendCompareData.md`
- `CreateNewDashboard.md`

风险：

- 单个 H2 chunk 内部主题较多，模型难以对“步骤”、“选项”、“注意事项”分别聚焦。
- 检索时，可能因为某个小点触发搜索，却拉出整个大段 H2 内容。

### 3.3 问题三：H3 切割触发不足

特征：

- `h3SplitApplied` 在多数文件中为 0。
- 即使文档有 H3，很多 H2 chunk 的 token 数也没到触发 H3 切割的阈值（1000）；或者少量 H3 主要是 `Parameters` / `Examples` 这类特殊标题，被设计为“合并到前一个 chunk”。

结果：

- 实际生效的 H3 级细分不多，chunk 粒度仍过粗。
- 某些逻辑步骤、属性分组并没有形成清晰的子 chunk。

---

## 四、优化建议（按投入/收益排序）

### 4.1 P0：先改 noH2 且 chunk > 1200 的文档

目标：**先解决“整篇一个大块”的问题**。

建议做法：

- 对每篇 `noH2=true` 且 `maxToken > 1200` 的文档，至少补充 3~5 个 H2 标题。
- 推荐统一的 H2 模板（可按实际内容调整）：
  - `## Overview`
  - `## Steps`
  - `## Options / Properties`
  - `## Examples`
  - `## Tips / Troubleshooting`
- 将现有内容按这几个 H2 分段重组：
  - 概览、概念放到 `Overview`
  - 操作步骤放到 `Steps`
  - 属性/参数说明放到 `Options / Properties`
  - 示例单独拆到 `Examples`
  - 常见问题、注意事项放到 `Tips / Troubleshooting`

期望效果：

- 单个 chunk 的 token 数降低到 **600~1000** 区间，利于模型聚焦和检索。

### 4.2 P1：对超长 H2 再细分为多个 H3

目标：**在已经有 H2 的大文档中进一步细化结构**。

范围示例：

- `BasicChartingSteps.md`
- `AddFreehandTable.md`
- `AddConditions.md`
- `ChartProperties.md`
- `AddTargetLineTrendLine.md`
- `TrendCompareData.md`
- `CreateNewDashboard.md`

建议做法：

- 对每个 `maxToken` 明显 > 1500 的 H2 区段，增加有语义的 H3 标题：
  - `### Prerequisites`
  - `### Procedure`
  - `### Result`
  - `### Options`
  - `### Examples`
  - `### Tips`
- 确保 H3 内容块大小适中（建议控制在 ≈ 400~700 token）。

注意：

- `Parameters` / `Examples` 这两个 H3 标题在现有规则下**不会成为单独 chunk**，而是合并到前一个 chunk 的尾部。
- 如果希望参数/示例成为独立 chunk，需要换更有语义的标题（例如 `Field Parameters`, `Usage Examples`）。

### 4.3 P2：模板化重构 chart 系列文档

观察：

- 大量 chart 文档的结构非常类似（介绍 + 步骤 + 选项 + 示例）。
- 完全可以用一个统一模板来重构，批量提升结构质量。

建议统一模板（示例）：

- `# <Chart Name> Chart`
- `## Overview`
- `## Data Requirements`
- `## Create the Chart`
- `## Configure Properties`
- `## Examples`
- `## Tips`

收益：

- 一次性改善几十篇文档的切割效果。
- 后续新增 chart 文档也可复用相同模板，避免回归。

---

## 五、总结与后续动作建议

- 当前 `viewsheet/pages` 在现有切割规则下，**至少有 50+ 文档存在“大 chunk / 粒度过粗”的问题**。
- 优先应该针对：
  - `noH2=true` 且 `maxToken > 1200` 的文档（整篇大块）；
  - `maxToken > 2000` 的文档（单块极大）。
- 建议后续步骤：
  1. 先锁定 P0/P1 清单（可以从本文件高风险列表开始，扩展完整清单）。
  2. 为这批文档设计统一的 H2/H3 模板。
  3. 文档团队或开发按模板批量改写原始 md。
  4. 重跑 `loadDocs.ts` + `large-chunks-analysis.json` 进行复查，验证大 chunk 数量显著下降。

---

