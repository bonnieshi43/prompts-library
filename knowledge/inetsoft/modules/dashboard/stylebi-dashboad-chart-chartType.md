---

product: StyleBI

domain: dashboard
module: chart
components:
type: dashboard-design-chart
tags:

- chart
source: https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/ChartTypes.html

# Knowledge Extraction - StyleBI Chart Classification

This document provides a **high-level classification framework for StyleBI chart types**.  
The goal is to organize charts based on shared structural or functional characteristics.

## StyleBI Chart Axis Capability Classification


| Axis Type  | Axis Characteristics                                   | Typical Charts                                                                                                                                                                             | Typ知识库关联分析ical Axis Features / Functions                                   |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| axis-based | X / Y coordinate axes                                  | Bar, Line, Area, Point, Scatter, Bubble, Step Line, Jump Line, Step Area, Waterfall, Pareto, Scatter Matrix, Trellis Chart (Grid), Dot Plot, Interval, Box Plot, Histogram, 3D Bar | axis label position, axis scale, axis formatting, axis title, axis binding |
| multi-axis | Supports multiple value axes, possible left/right axes | Dual Axis Chart, Multiple Measure Chart, Multiple Style Chart                                                                                                                              | secondary axis, axis alignment, axis label grouping                        |
| polar      | Uses polar coordinate system                           | Radar, Filled Radar                                                                                                                                                                        | angle axis, radius axis                                                    |
| partition  | No X/Y axes, partition layout                          | Pie, Donut, Treemap, Sunburst, Circle Packing, Icicle, Marimekko                                                                                                                           | none                                                                       |
| network    | Graph structure (node + edge), no axis                 | Network, Circular Network, Tree                                                                                                                                                            | none                                                                       |
| geographic | Uses geographic coordinates                            | Map, Contour Map                                                                                                                                                                           | latitude, longitude                                                        |
| financial  | Financial data structure axes                          | Candle, Stock                                                                                                                                                                              | time axis, price axis                                                      |
| none       | Charts without meaningful axes                         | Funnel, Heat map, Word Cloud, Gantt                                                                                                                                                        | none                                                                       |


