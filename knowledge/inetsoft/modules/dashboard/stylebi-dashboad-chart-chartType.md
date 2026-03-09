---
product: StyleBI
domain: dashboard
module: chart
components:
type: dashboard-design-chart
tags:
  - chart
source: https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/ChartTypes.html
---

# Knowledge Extraction - StyleBI Chart Classification

This document provides a **high-level classification framework for StyleBI chart types**.  
The goal is to organize charts based on shared structural or functional characteristics.

## StyleBI Chart Axis Capability Classification

| Axis Type | Axis Characteristics | Typical Charts | Typical Axis Features / Functions |
|-----------|----------------------|----------------|------------------------------------|
| axis-based | X / Y coordinate axes | Bar, Column, Line, Area, Scatter, Bubble, Step Line, Waterfall, Pareto | axis label position, axis scale, axis formatting, axis title, axis binding |
| multi-axis | Supports multiple value axes, possible left/right axes | Bar, Line, Combo, Area | secondary axis, axis alignment, axis label grouping |
| polar | Uses polar coordinate system | Radar | angle axis, radius axis |
| partition | No X/Y axes, partition layout | Pie, Donut, Treemap, Sunburst | none |
| network | Graph structure (node + edge), no axis | Network, Hierarchy | none |
| geographic | Uses geographic coordinates | Map, Density Map | latitude, longitude |
| financial | Financial data structure axes | Candle, Stock | time axis, price axis |
| none | Charts without meaningful axes | Gauge, Speedometer, Thermometer, Bullet, Gantt | none |

## Chart Style

Auto, Bar, 3D Bar, Line, Area, Point, Pie, 3D Pie, Donut, Radar, Filled Radar, Stock, Candle, Box Plot, Waterfall, Pareto, Map, Treemap, Sunburst, Circle Packing, Icicle, Marimekko, Gantt, Funnel, Step Line, Jump Line, Step Area, Tree, Network, Circular Network, Interval, Scatter Contour, Contour Map

---

## Chart Style 与 Coordinate 映射说明

### 坐标类型说明

- **RectCoord**：二维直角坐标，适合大多数 X-Y 图表  
- **Rect25Coord**：二维直角坐标 + 2.5D 深度感，适合 3D 效果图  
- **Polar Coordinate**：极坐标，角度 + 半径布局，环形或雷达图表  
- **TreemapCoord**：空间填充布局，用于 Treemap、Icicle、Circle Packing 等  
- **MekkoCoord**：Marimekko 专用坐标，内部计算比例轴  
- **GeoCoord**：地理坐标，用于地图可视化  
- **Network / Custom Layout**：力导向或层次布局图，节点 + 边  
- **TriCoord**：三角坐标，用于三变量比例图  
- **Parallel / OneVarParallelCoord**：平行坐标，用于多维数据分析  

---

## Chart Style → Coordinate 映射表

| Chart Style        | 推荐 Coordinate                |
|-------------------|-------------------------------|
| Auto              | RectCoord（默认）             |
| Bar               | RectCoord                     |
| 3D Bar            | Rect25Coord                   |
| Line              | RectCoord                     |
| Area              | RectCoord                     |
| Point             | RectCoord                     |
| Pie               | Polar Coordinate              |
| 3D Pie            | Rect25Coord                   |
| Donut             | Polar Coordinate              |
| Radar             | Polar Coordinate              |
| Filled Radar      | Polar Coordinate              |
| Stock             | RectCoord                     |
| Candle            | RectCoord                     |
| Box Plot          | RectCoord                     |
| Waterfall         | RectCoord                     |
| Pareto            | RectCoord                     |
| Map               | GeoCoord                      |
| Treemap           | TreemapCoord                  |
| Sunburst          | Polar Coordinate / TreemapCoord |
| Circle Packing    | TreemapCoord                  |
| Icicle            | TreemapCoord                  |
| Marimekko         | MekkoCoord                    |
| Gantt             | RectCoord                     |
| Funnel            | RectCoord                     |
| Step Line         | RectCoord                     |
| Jump Line         | RectCoord                     |
| Step Area         | RectCoord                     |
| Tree              | Network / Custom Layout       |
| Network           | Network / Custom Layout       |
| Circular Network  | Network / Polar Layout        |
| Interval          | RectCoord                     |
| Scatter Contour   | RectCoord                     |
| Contour Map       | RectCoord                     |
