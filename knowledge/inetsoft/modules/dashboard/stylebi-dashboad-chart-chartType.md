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
