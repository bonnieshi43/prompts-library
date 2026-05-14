# 遗漏测试内容
1.printlayout,mobilelayout
2.annotate refresh
3.改变chart size刷新
4.scrollbar的刷新
5.有xy轴情况切换轴的更新Bug #74971
6.script Bug #74966
7.UI不美观Bug #74967


# Feature #74789 - Tree Chart Layout Direction 支持分析

PR: Feature #74789 - Add layout direction option for tree charts  
PR链接：[PR #3616 - Add layout direction option for tree charts](https://github.com/inetsoft-technology/stylebi/pull/3616/changes?utm_source=chatgpt.com)

---

# 一、需求分析（Requirement Analysis）

## 1. 功能理解与范围

### 功能核心目标

当前 Tree Chart 仅支持垂直布局（Top → Bottom）。

本需求新增：

- Left → Right
- Right → Left
- Bottom → Top

从 PR 实现来看，最终不仅支持“horizontal rendering”，而是扩展成完整的：

- 四方向 Tree Layout 系统

---

### 解决的业务问题

当前 Tree Chart 在以下场景存在限制：

- 组织结构图横向展示
- 产品结构图
- 多层级树结构 dashboard
- 横向空间利用

新增 layout direction 后：

- 可适配不同 dashboard 空间布局
- 可提升深层树结构可读性
- 支持更接近行业标准 org chart 展示方式

---

### 涉及模块

#### Chart Layout Engine
核心改动：

- `mxCompactTreeLayout`
- RelationElement geometry transform

---

#### PlotDescriptor / Persistence
新增：

- treeLayout 属性
- XML round-trip
- backward compatibility

---

#### UI 配置层
新增：

- ChartPlotOptionsPane 下拉选择

---

#### 国际化资源
新增：

- Layout Direction 文本
- 四方向文案

---

#### 测试层
新增：

- PlotDescriptor XML test
- Model visibility test
- round-trip test

---

### 功能类型

- UI 功能增强
- Layout Engine 扩展
- 配置持久化扩展
- 渲染逻辑扩展

---

## 2. 需求清晰度与完整性

## 已补充的隐式需求（PR中体现）

虽然原始需求只提到 horizontal rendering：

```text
support horizontal rendering as well
```

但 PR 实际扩展为：

- TOP_BOTTOM
- BOTTOM_TOP
- LEFT_RIGHT
- RIGHT_LEFT

说明开发已经将需求抽象成：

- 通用方向布局系统

这是合理的架构扩展。

---

## 仍缺失的需求定义

### 1）未定义默认行为

PR 中默认：

```java
private String treeLayout = TREE_LAYOUT_TOP_BOTTOM;
```

:contentReference[oaicite:1]{index=1}

但需求未明确：

- 老 chart 是否必须保持 vertical
- 默认值策略

当前实现通过 backward compatibility 解决。

---
🔴 **测试-分析**：合理保持旧逻辑
### 2）未定义布局适用范围

PR 中：

```java
Only honored by the COMPACT_TREE algorithm.
```

:contentReference[oaicite:2]{index=2}

说明：

- 仅 COMPACT_TREE 支持 orientation
- 其他 tree/network layout 不支持

需求中未说明。

---
🔴 **测试-分析**：network不支持合理
### 3）未定义 Export 行为

需求未说明：

- PNG/PDF export
- print rendering
- snapshot rendering

是否需要同步支持。

---
🔴 **测试-分析**：需要同步支持,测试导出没问题
### 4）未定义超大树行为

缺失：

- overflow
- auto zoom
- scroll strategy

---
🔴 **测试-分析**：性能比较慢
## 3. 测试风险识别

## 风险 1：坐标翻转逻辑错误（高风险）

PR 新增：

```java
flipMajorAxis(...)
```

:contentReference[oaicite:3]{index=3}

涉及：

- node geometry
- edge geometry
- waypoint transform

风险：

- edge path inversion 错误
- node overlap
- wrong root direction

---
🔴 **测试-分析**：
## 风险 2：edge waypoint 同步风险（高）

PR 特别处理：

```java
List<mxPoint> points = geo.getPoints();
```

:contentReference[oaicite:4]{index=4}

说明：

- edge 不只是 endpoints
- 还包含 routing waypoints

风险：

- path bend 错误
- edge crossing

---

🔴 **测试-分析**：没问题
## 风险 3：旧 XML 兼容性（高）

PR 专门增加：

```java
legacyXmlWithoutAttributeDefaultsToTopBottom
```

:contentReference[oaicite:5]{index=5}

说明：

- 存在大量历史 viewsheet
- backward compatibility 是核心风险

---
🔴 **测试-分析**： 不需要考虑
## 风险 4：Chart Type 切换状态污染（中高）

PR 中：

```java
applied for all chart types so the value survives a chart-type switch
```

:contentReference[oaicite:6]{index=6}

说明：

- treeLayout 即使切换 chart type 仍保留

风险：

- 非 tree chart 遗留隐藏状态
- 后续切回 tree 时出现 unexpected behavior

---

🔴 **测试-分析**： 切换保持
## 风险 5：UI 与内部状态不一致（中）

UI 控制：

```html
*ngIf="model.treeLayoutVisible"
```

:contentReference[oaicite:7]{index=7}

风险：

- model state 存在但 UI 不显示
- serialization 仍保存旧值

---
🔴 **测试-分析**： 切换保持

# 二、实现分析（Implementation Analysis）

---

## 1. 改动类型（Change Type Identification）

### 类型

Feature + Layout Engine Extension

---

### 影响层级

| 层级 | 影响 |
|---|---|
| UI | 新增 Layout Direction 下拉框 |
| Model | ChartPlotOptionsPaneModel |
| Persistence | PlotDescriptor XML |
| Rendering | mxCompactTreeLayout |
| Geometry | node / edge flip |
| i18n | 新增 locale 文本 |

---

## 2. 需求实现一致性

## 需求覆盖情况

### 已完整覆盖

PR 实现已覆盖：

- horizontal tree layout
- left-right / right-left
- top-bottom / bottom-top
- UI 配置入口
- persistence
- backward compatibility

---

## 实现亮点

### 1）不是 CSS rotate，而是真正 layout-level 实现

关键代码：

```java
mxCompactTreeLayout layout = new mxCompactTreeLayout(mxgraph, horizontal);
```

:contentReference[oaicite:8]{index=8}

说明：

- 使用 mxGraph 原生 horizontal layout
- 不是简单 transform rotate

这是正确实现。

---

### 2）支持 post-layout flipping

新增：

```java
setFlipped(boolean flipped)
```

:contentReference[oaicite:9]{index=9}

说明：

- layout 先生成
- 再做 major-axis flip

实现：

- Bottom → Top
- Right → Left

---

### 3）兼容性设计较完整

包括：

- default fallback
- unknown value fallback
- legacy XML support

例如：

```java
setTreeLayout_unknownValueFallsBackToTopBottom
```

:contentReference[oaicite:10]{index=10}

这是较成熟实现。

---

## 3. 关键实现风险

## 风险 1：flipMajorAxis 依赖 bound 计算

代码：

```java
.max().orElse(0);
```

:contentReference[oaicite:11]{index=11}

风险：

- bound 基于最大 geometry
- 若后续 layout 存在 negative coordinate
- flip 可能错误

影响：

- node mirrored incorrectly

---

## 风险 2：edge geometry x/y 翻转逻辑可能不完整

代码：

```java
geo.setX(bound - geo.getX());
```

:contentReference[oaicite:12]{index=12}

但 edge geometry：

- 不一定代表真实 bounding box

PR comment 已特别说明这一点。

风险：

- 某些 edge routing algorithm 不兼容

---

## 风险 3：仅 COMPACT_TREE 支持 orientation

代码：

```java
Only honored by the COMPACT_TREE algorithm.
```

:contentReference[oaicite:13]{index=13}

风险：

- UI 用户可能误认为所有 Tree 都支持
- algorithm 切换后行为不一致
🔴 **测试-分析**： network和circularnetwork不支持
---

## 风险 4：Chart Type 切换保留 treeLayout

代码：

```java
value survives a chart-type switch
```

:contentReference[oaicite:14]{index=14}

风险：

- hidden stale state
- serialization contamination

---
🔴 **测试-分析**： 保留

## 风险 5：未发现 Export 专项测试

当前测试仅覆盖：

- XML
- Model
- Visibility

未发现：

- render snapshot
- PDF export
- image export

这是明显测试缺口。
🔴 **测试-分析**： 导出正确没影响

---

# 三、测试设计（Test Design）

---

# 3.1 风险驱动测试策略

## 核心风险

| 风险 | 影响 |
|---|---|
| Layout flip 错误 | tree hierarchy 错误 |
| Edge waypoint 错误 | edge crossing |
| XML compatibility | 老 dashboard 损坏 |
| Hidden state retention | chart switch bug |
| Export mismatch | UI/export 不一致 |

---

## 默认行为变化

PR 默认：

```java
TREE_LAYOUT_TOP_BOTTOM
```

因此必须验证：

- 老 chart 无变化
- 未设置属性时行为一致

---

# 3.2 必要测试类别

---

# 功能验证（Functional）

## Why

这是 layout engine 改动。

核心风险：

- hierarchy
- edge routing
- direction correctness

---

## Scope

- Tree Chart rendering
- Layout Direction selector
- Model synchronization

---

## Validation Goal

验证：

- 四方向正确
- hierarchy 不变
- edge path 正确

---

## 回归测试（Regression）

## Why

影响：

- PlotDescriptor serialization
- chart rendering pipeline

---

## Scope

- Existing Tree Chart
- Network Chart
- Circular Network
- Export
🔴 **测试-分析**： 没有影响，只影响tree chart
---

# 边界测试（Boundary）

## Why

flipMajorAxis 对 geometry 有强依赖。

---

## Scope

- deep tree
- wide tree
- single node
- no edge
- huge node labels

---
🔴 **测试-分析**：没问题
# 性能测试（Performance）

## Why

horizontal tree width 可能指数级增长。

---

## Scope

- 1000+ node tree
- large hierarchy

---
🔴 **测试-分析**：性能慢
# 兼容性测试（Compatibility）

## Why

PR 修改：

- XML persistence
- UI model
- chart type switching

---

## Scope

- old viewsheet
- chart-type switching
- browser rendering

---
🔴 **测试-分析**：没问题
# 自动化测试建议

## Unit

覆盖：

- setTreeLayout fallback
- flipMajorAxis geometry transform
- XML round-trip

---

## Integration

覆盖：

- PlotDescriptor → GraphGenerator → RelationElement

---

## E2E

覆盖：

- UI select
- render
- save/reopen
- export

---

# 四、关键测试场景（Key Test Scenarios）

---

# Scenario 1：Left → Right Layout

## Scenario Objective

验证 horizontal layout 正确性。

---

## Key Steps

1. 创建 Tree Chart
2. 选择：
   - Left to Right
3. 渲染

---

## Expected Result

- root 在左
- child 向右展开
- edge routing 正确

---
🔴 **测试-分析**： 和期待一样
## Risk Covered

horizontal layout correctness

---

# Scenario 2：Right → Left Flip

## Scenario Objective

验证 flipped horizontal。

---

## Key Steps

1. 设置：
   - Right to Left
2. 渲染

---

## Expected Result

- root 在右
- child 向左展开
- label 不镜像

---

## Risk Covered

flipMajorAxis correctness

---
🔴 **测试-分析**：和期待一样
# Scenario 3：Bottom → Top Layout

## Scenario Objective

验证 vertical flip。

---

## Expected Result

- root 在底部
- child 向上

---

## Risk Covered

vertical flip correctness

---
🔴 **测试-分析**：和期待一样
# Scenario 4：Legacy XML Compatibility

## Scenario Objective

验证旧 dashboard 不受影响。

---

## Key Steps

1. 加载历史 viewsheet
2. 不包含 treeLayout 属性
3. render

---

## Expected Result

- 自动 fallback TOP_BOTTOM
- chart 不变化

---

## Risk Covered

backward compatibility

---
🔴 **测试-分析**：旧的不影响和期待一样
# Scenario 5：Unknown treeLayout Value

## Scenario Objective

验证非法值 fallback。

---

## Key Steps

1. 手工修改 XML：
   ```xml
   treeLayout="BOGUS"
   ```
2. reload

---

## Expected Result

自动 fallback：

```text
TOP_BOTTOM
```

---

## Risk Covered

serialization safety

---
🔴 **测试-分析**：不需要手动改，忽略
# Scenario 6：Chart Type Switching

## Scenario Objective

验证隐藏状态不会污染。

---

## Key Steps

1. Tree chart:
   - Left to Right
2. 切换 Bar chart
3. 再切回 Tree chart

---

## Expected Result

- treeLayout preserved
- 非 tree chart 不显示 layout option

---

## Risk Covered

hidden state consistency

---
🔴 **测试-分析**：不会污染
# Scenario 7：Export Rendering

## Scenario Objective

验证 export 与 UI 一致。

---

## Key Steps

1. Horizontal tree
2. Export PNG/PDF

---

## Expected Result

- 方向一致
- edge path 一致

---

## Risk Covered

export pipeline mismatch

---
🔴 **测试-分析**：导出一致
# Scenario 8：Large Tree Performance

## Scenario Objective

验证大规模树性能。

---

## Key Steps

1. 1000+ nodes
2. Left → Right layout

---

## Expected Result

- acceptable render time
- no UI freeze

---

## Risk Covered

layout scalability

---
🔴 **测试-分析**：node多性能慢