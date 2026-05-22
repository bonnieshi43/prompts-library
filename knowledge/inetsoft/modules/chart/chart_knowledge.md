# InetSoft Chart 知识库（精简测试版）
//本文档用于提供 Chart 模块全局测试地图。若 PR 涉及 Tooltip、Stack、Drill Down、Date Comparison、Export 等专项功能，
  应同时补充对应专题知识库或者产品对应的doc文档。

## 目录
1. [图表类型](#图表类型)
2. [核心属性配置](#核心属性配置)
3. [数据绑定](#数据绑定)
4. [高级功能](#高级功能)
5. [交互功能](#交互功能)
6. [测试要点](#测试要点)

---

## 图表类型

### 基础图表（必测）
| 图表类型 | 用途 | 关键属性 |
|---------|------|---------|
| Bar Chart | 分类数据比较 | Stack, Corner Radius(0-0.5), Round All Corners |
| Stacked Bar Chart | 堆叠条形图 | Stack 模式, Stack Measures |
| Line Chart | 时间趋势 | Smooth Lines, Show Points, Dashed Line for Gaps |
| Stacked Line Chart | 堆叠折线图 | Stack 模式 |
| Area Chart | 累积趋势 | Stack, Smooth Lines |
| Stacked Area Chart | 堆叠面积图 | Stack 模式 |
| Pie Chart | 部分与整体 | Explode Pie, Pie Ratio(0.1-1), Show Values |
| Donut Chart | KPI 展示 | Hole Size, Center Text/KPI |

### 堆叠功能说明
- **适用图表**: Bar、Line、Area、Point、Dot Plot、Multiple Measure
- **启用方式**: Chart Style 面板底部勾选 'Stack' 选项
- **Stack Measures**: 多度量堆叠（需启用 Stack 并切换到单图模式）
- **应用场景**: 展示部分与整体的关系，比较各组成部分的贡献

### 高级图表（重点测）
| 图表类型 | 用途 | 关键属性 |
|---------|------|---------|
| Scatter Chart | 双度量关系 | Show Lines, Trend Line, Aggregation=None |
| Bubble Chart | 三度量关系 | Size 绑定度量 |
| Heat Map | 矩阵数据 | Color Spectrum, X/Y 为维度 |
| Treemap | 层级数据 | T 区域(层级维度), Size/Color 度量 |
| Map Chart | 地理数据 | Geographic 区域, Web Map 背景 |

### 特殊图表（按需测）
| 图表类型 | 用途 | 关键属性 |
|---------|------|---------|
| Word Cloud | 文本频率展示 | Font Scale, Text/Size 绑定 |
| Network Chart | 节点关系 | Circular Network, Smooth Lines, Apply Aesthetics to Source Nodes |
| Tree Chart | 层级结构 | - |
| Sunburst Chart | 环形层级图 | - |
| Icicle Chart | 层级结构 | - |
| Circle Packing | 嵌套圆圈层级 | Include Parent Labels, Border Color |
| Radar Chart | 多变量比较 | Smooth Lines, Show Points |
| Funnel Chart | 流程各阶段 | - |
| Waterfall Chart | 累积效应 | - |
| Gantt Chart | 项目时间线 | - |
| Box Chart | 数据分布统计 | - |
| Candle Chart | 股票价格 | - |
| Stock Chart | 金融数据分析 | - |
| Pareto Chart | 主要因素分析 | Pareto Line Color |
| Dual Axis Chart | 不同量级数据 | - |
| Trellis Chart Grid | 图表矩阵 | - |
| Point Chart | 点图 | - |
| Dot Plot Chart | 点阵图 | - |
| Step Line/Area Chart | 阶梯折线/面积 | - |
| Interval Chart | 区间图 | - |
| Running Total Chart | 累计图 | - |
| Multiple Measure Chart | 多度量图 | - |
| Multiple Style Chart | 多样式图 | - |
| Hybrid Table Chart | 混合表图 | - |
| Contour Map Chart | 等高线图 | Levels, Bandwidth, Cell Size |
| Scatter Matrix Chart | 散点矩阵 | - |
| Marimekko Chart | 马赛克图 | - |

---

## 核心属性配置

### General 标签
- **Title**: Visible, Text, Format
- **Tooltip**: 
  - **Default**: 默认模式，显示绑定数据值
  - **Card**: 卡片模式
  - **Combined Tooltip**: 合并模式（Line/Area图表），显示所有线的详情
  - **Custom**: 自定义 HTML (`{0}`, `{Sum(Total)}`, HTML标签)
  - **Snap to Nearest Data Point**: 吸附到最近数据点
- **Data Tip View**: Component selection, Alpha, On Click Only
- **Flyover Views**: Dynamic filtering on hover/click

### Advanced 标签（测试重点）
| 选项 | 作用 | 适用范围 |
|------|------|---------|
| Glossy Effect | 3D 效果 | 部分图表 |
| Sparkline | 简洁模式 | 折线/条形 |
| Enable Drilling | 钻取功能 | 日期/维度 |
| Enable Date Comparison | 日期比较 | 时间序列 |
| Enable Ad Hoc Editing | 用户编辑 | 所有图表 |
| Sort Others Last | Others 排序 | Top-N 场景 |

**Plot Options**:
- **General**: Show Values, Show Reference Line, Stack Value, Keep Element in Plot, Fill Time-Series Gaps
- **Pie Chart**: Explode Pie, Pie Ratio(0.1-1)
- **Bar Chart**: Bar Corner Radius(0-0.5), Round All Corners, Stack
- **Line/Area/Radar Chart**: Show Points, Smooth Lines, Fill Missing Data with Dashed Line
- **Network/Tree Chart**: Apply Aesthetics to Source Nodes, Smooth Lines (Bezier)
- **Circle Packing/Tree Chart**: Include Parent Labels
- **Word Cloud**: Font Scale
- **Point Chart**: Show Lines, As One Line, Fill Missing Data with Dashed Line
- **Map Chart**: Map Default Color, Always Show Color in Map
- **Contour Map Chart**: Levels, Bandwidth, Edge Alpha, Cell Size

### Axis Properties
- **Label**: Show Axis Labels, Rotation, Labels on Opposite Side
- **Line**: Logarithmic Scale, Reverse, Shared Range, Minimum/Maximum, Increment
- **Alias**: 自定义轴标签别名

### Legend Properties
- **General**: Title, Visible, Position, Symbol Size(6-50)，Ignore Null, Legend Border
- **Scale**: Logarithmic Scale, Reverse, Include Zero
- **Alias**: 自定义图例标签

### Line 标签
- **Grid Lines**: X/Y Grid, Quadrant Grid, Diagonal Line
- **Trend Line**: 拟合方法(linear/quadratic), One Per Color, Project Forward
- **Project Forward**: 趋势预测，不适用于 Pie/Radar/Map/Waterfall

---

## 数据绑定

### 编辑器绑定区域
| 区域 | 作用 | 说明 |
|------|------|------|
| X / Y | 主轴维度或度量 | 核心绑定区 |
| Color | 颜色分组 | Palette, Share Colors, Fixed Mapping |
| Shape | 形状分组 | 支持自定义图片(png/gif/jpg/svg) |
| Size | 大小分组 | 范围滑块，环形图控制孔径 |
| Text | 文本标签 | 格式化设置 |
| Break By / Tooltip | 分组不视觉呈现，仅 Tooltip 显示 | - |
| T | 树图/旭日图层级维度 | 多级拖拽 |
| Geographic | 地图地理字段 | 需 Set Geographic 设置地图类型和层级 |

### 度量绑定
- **聚合方法**：Sum / Count / Average / Min / Max / None

### Trend & Comparison 计算
| 计算类型 | 说明 | 关键参数 |
|---------|------|---------|
| Percent | 百分比 | Dimension / Grand Total / Subtotal |
| Change | 差值/变化率 | First/Previous/Next/Last, As percent |
| Running | 累计聚合 | Aggregate(Sum/Avg 等), Reset at(Year/Quarter/Month 等) |
| Sliding | 滑动窗口 | Previous N, Next N, Include current value, Null if not enough values |
| Value Of | 取特定位置值 | First / Previous / Next / Last |
| Compound Growth | 复利增长率 | Aggregate(Min/Max/Average)，仅适用于百分比值 |

### 日期分组级别
- **时间粒度**：Year, Quarter, Month, Week, Day, Hour, Minute, Second
- **周期性**：Month of Year(1-12), Quarter of Year(1-4), Week of Year(1-52), Day of Month(1-31), Day of Week(1-7), Hour of Day(0-23)

### 命名组
- Ctrl 选择多个轴/图例标签 → 右键 Group Items → 输入组名
- 不支持日期字段

---

## 高级功能

### 钻取 (Drill Down)
- **触发方式**: 悬停轴标签 → Drill Down 按钮
- **钻取类型**:
  - 离散分组 → 创建 facet 图表
  - 连续分组 → 更改维度级别
- **自定义层级**: Hierarchy 标签 → 拖拽字段创建钻取路径

### 刷选 (Brush)
- **选择方式**: 单击/Ctrl+单击/Shift+单击
- **联动效果**: 相关图表高亮显示
- **清除**: Clear Brushing

### 缩放 (Zoom)
- **包含模式**: Zoom → 仅显示选中数据
- **排除模式**: Exclude → 隐藏选中数据
- **恢复**: Clear Zoom

### 明细钻取
- **操作**: Show Details → Data 面板显示明细
- **功能**: 格式化、样式、导出

### 趋势和比较计算
| 计算类型 | 说明 | 参数 |
|---------|------|------|
| Percent | 百分比 | Dimension/Grand Total/Subtotal |
| Change | 差值 | First/Previous/Next/Last, As percent |
| Running | 累计 | Aggregate, Reset at(Year/Quarter/Month) |
| Sliding | 滑动窗口 | Previous/Next, Include current value |
| Value Of | 取值 | First/Previous/Next/Last |
| Compound Growth | 复利增长 | Aggregate(Min/Max/Average) |

### 目标线和趋势线
- **Target Lines**: 标记线/带状区域/统计区域
- **Trend Line**: 拟合方法, One Per Color, Project Forward

---

## 交互功能

### 工具栏工具
- Drill Down Filter, Chart Brush, Zoom, Exclude
- Show Summary/Details, Chart Show Enlarged
- More → Properties/Format/Save As Image/Resize Plot/Date Comparison

### 右键选项
- 轴标题: Title Properties, Format, Hide Title
- 轴: Axis Properties, Format, Hide Axis
- 数据点: Annotate Point
- 图例: Legend Properties, Format, Hide Legend

### 自定义 Tooltip
- **语法**: `{0}`, `{Sum(Total)}`, HTML 标签(`<b>`, `<br>`)
- **格式化**: `{0, date, MMMM yyyy}`, `{1, number, $#,###.00}`
- **多度量**: `|Quantity: {1}|` 条件显示

---

## 测试要点

### 图表类型测试矩阵
| 测试维度 | 测试点 |
|---------|------|
| 数据绑定 | 维度/度量正确绑定到各区域 |
| 显示效果 | 图表渲染正确，无布局异常 |
| 交互功能 | 钻取、刷选、缩放正常工作 |
| 属性配置 | 各属性修改后生效 |
| 边界条件 | 空数据、极端值、大数据量 |

### 属性值范围测试
- **数值范围**: Corner Radius(0-0.5), Pie Ratio(0.1-1), Symbol Size(6-50), Alpha(0-100%)
- **布尔选项**: Enable Drilling, Show Points, Smooth Lines
- **枚举选项**: Aggregation(Sum/Count/Avg/Min/Max/None), Date Level(Year/Quarter/Month/...)

### 兼容性测试
- **跨图表类型**: 相同配置在不同图表中的表现
- **浏览器兼容性**: 主流浏览器渲染一致性
- **数据类型兼容性**: 不同数据源(Excel/DB/API)

### 性能测试
- **大数据量**: 1000+ 数据点的渲染速度
- **复杂图表**: 多度量/多层级的响应时间
- **刷新策略**: Manual/Auto Refresh 的资源消耗

### 异常场景测试
- **空数据**: 无数据时的提示信息
- **无效配置**: 错误绑定的提示和处理
- **权限控制**: 无权限用户的行为限制
