# Knowledge Extraction - StyleBI Chart Components
## Overview
## Chart Style
Auto, Bar, 3D Bar, Line, Area, Point, Pie, 3D Pie, Donut, Radar, Filled Radar, Stock, Candle, Box Plot, Waterfall, Pareto, Map, Treemap, Sunburst, Circle Packing, Icicle, Marimekko, Gantt, Funnel, Step Line, Jump Line, Step Area, Tree, Network, Circular Network, Interval, Scatter Contour, Contour Map

## Chart Style 与 Coordinate 映射表
坐标类型说明
- **RectCoord**：二维直角坐标，适合大多数 X-Y 图表。  
- **Rect25Coord**：二维直角坐标 + 2.5D 深度感，适合 3D 效果图。  
- **Polar Coordinate**：极坐标，角度 + 半径布局，环形或雷达图表。  
- **TreemapCoord**：空间填充布局，用于 Treemap、Icicle、Circle Packing 等。  
- **MekkoCoord**：Marimekko 专用坐标，内部计算比例轴。  
- **GeoCoord**：地理坐标，用于地图可视化。  
- **Network / Custom Layout**：力导向或层次布局图，节点+边。  
- **TriCoord**：三角坐标，用于三变量比例图。  
- **Parallel / OneVarParallelCoord**：平行坐标，用于多维数据分析。

---

## Chart Style → Coordinate 映射

| Chart Style | 推荐 Coordinate |
|-------------|----------------|
| Auto | RectCoord（默认） |
| Bar | RectCoord |
| 3D Bar | Rect25Coord |
| Line | RectCoord |
| Area | RectCoord |
| Point | RectCoord |
| Pie | Polar Coordinate |
| 3D Pie | Rect25Coord |
| Donut | Polar Coordinate |
| Radar | Polar Coordinate |
| Filled Radar | Polar Coordinate |
| Stock | RectCoord |
| Candle | RectCoord |
| Box Plot | RectCoord |
| Waterfall | RectCoord |
| Pareto | RectCoord |
| Map | GeoCoord |
| Treemap | TreemapCoord |
| Sunburst | Polar Coordinate / TreemapCoord |
| Circle Packing | TreemapCoord |
| Icicle | TreemapCoord |
| Marimekko | MekkoCoord |
| Gantt | RectCoord |
| Funnel | RectCoord |
| Step Line | RectCoord |
| Jump Line | RectCoord |
| Step Area | RectCoord |
| Tree | Network / Custom Layout |
| Network | Network / Custom Layout |
| Circular Network | Network / Polar Layout |
| Interval | RectCoord |
| Scatter Contour | RectCoord |
| Contour Map | RectCoord |

## Axis
Dim Axis
X,Y,Polar
Measure Axis
X,Y,Polar











