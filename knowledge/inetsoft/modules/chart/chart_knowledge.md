# InetSoft Chart Knowledge Base (Lite Test Version)
<!-- This document provides a global test map for the Chart module. If PR involves specific functions such as Tooltip, Stack, Drill Down, Export, etc., corresponding special knowledge base or product documentation should be supplemented. -->

## Table of Contents
1. [Chart Types](#chart-types)
2. [Core Property Configuration](#core-property-configuration)
3. [Data Binding](#data-binding)
4. [Advanced Features](#advanced-features)
5. [Date Comparison](#date-comparison)
6. [Interactive Features](#interactive-features)
7. [Testing Guidelines](#testing-guidelines)

---

## Chart Types

### Basic Charts (Mandatory Testing)
| Chart Type | Usage | Key Properties |
|------------|-------|----------------|
| Bar Chart | Categorical data comparison | Stack, Corner Radius(0-0.5), Round All Corners |
| Stacked Bar Chart | Stacked bar chart | Stack mode, Stack Measures |
| Line Chart | Time trend | Smooth Lines, Show Points, Dashed Line for Gaps |
| Stacked Line Chart | Stacked line chart | Stack mode |
| Area Chart | Cumulative trend | Stack, Smooth Lines |
| Stacked Area Chart | Stacked area chart | Stack mode |
| Pie Chart | Part-to-whole relationship | Explode Pie, Pie Ratio(0.1-1), Show Values |
| Donut Chart | KPI display | Hole Size, Center Text/KPI |

### Stack Functionality Notes
- **Applicable Charts**: Bar, Line, Area, Point, Dot Plot, Multiple Measure
- **Enable Method**: Check 'Stack' option at the bottom of Chart Style panel
- **Stack Measures**: Multi-measure stacking (requires Stack enabled and single chart mode)
- **Use Case**: Show part-to-whole relationships and compare contributions of each component

### Advanced Charts (Key Testing)
| Chart Type | Usage | Key Properties |
|------------|-------|----------------|
| Scatter Chart | Dual-measure relationship | Show Lines, Trend Line, Aggregation=None |
| Bubble Chart | Triple-measure relationship | Size binding measure |
| Heat Map | Matrix data | Color Spectrum, X/Y as dimensions |
| Treemap | Hierarchical data | T zone(hierarchy dimension), Size/Color measures |
| Map Chart | Geographic data | Geographic zone, Web Map background |

### Special Charts (As Needed)
| Chart Type | Usage | Key Properties |
|------------|-------|----------------|
| Word Cloud | Text frequency display | Font Scale, Text/Size binding |
| Network Chart | Node relationships | Circular Network, Smooth Lines, Apply Aesthetics to Source Nodes |
| Tree Chart | Hierarchical structure | - |
| Sunburst Chart | Radial hierarchy | - |
| Icicle Chart | Hierarchical structure | - |
| Circle Packing | Nested circle hierarchy | Include Parent Labels, Border Color |
| Radar Chart | Multi-variable comparison | Smooth Lines, Show Points |
| Funnel Chart | Process stages | - |
| Waterfall Chart | Cumulative effect | - |
| Gantt Chart | Project timeline | - |
| Box Chart | Data distribution statistics | - |
| Candle Chart | Stock prices | - |
| Stock Chart | Financial data analysis | - |
| Pareto Chart | Key factor analysis | Pareto Line Color |
| Dual Axis Chart | Different magnitude data | - |
| Trellis Chart Grid | Chart matrix | - |
| Point Chart | Point chart | - |
| Dot Plot Chart | Dot plot | - |
| Step Line/Area Chart | Step line/area | - |
| Interval Chart | Interval chart | - |
| Running Total Chart | Cumulative chart | - |
| Multiple Measure Chart | Multi-measure chart | - |
| Multiple Style Chart | Multi-style chart | - |
| Hybrid Table Chart | Hybrid table chart | - |
| Contour Map Chart | Contour map | Levels, Bandwidth, Cell Size |
| Scatter Matrix Chart | Scatter matrix | - |
| Marimekko Chart | Marimekko chart | - |

---

## Core Property Configuration

### General Tab
- **Title**: Visible, Text, Format
- **Tooltip**: 
  - **Default**: Default mode, shows bound data values
  - **Card**: Card mode
  - **Combined Tooltip**: Combined mode (Line/Area charts), shows details of all lines
  - **Custom**: Custom HTML (`{0}`, `{Sum(Total)}`, HTML tags)
  - **Snap to Nearest Data Point**: Snap to nearest data point
- **Data Tip View**: Component selection, Alpha, On Click Only
- **Flyover Views**: Dynamic filtering on hover/click

### Advanced Tab (Testing Focus)
| Option | Function | Applicable Scope |
|--------|----------|------------------|
| Glossy Effect | 3D effect | Some charts |
| Sparkline | Compact mode | Line/Bar |
| Enable Drilling | Drill down function | Date/Dimension |
| Enable Date Comparison | Date comparison | Time series |
| Enable Ad Hoc Editing | User editing | All charts |
| Sort Others Last | Others sorting | Top-N scenarios |

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
- **Alias**: Custom axis label alias

### Legend Properties
- **General**: Title, Visible, Position, Symbol Size(6-50), Ignore Null, Legend Border
- **Scale**: Logarithmic Scale, Reverse, Include Zero
- **Alias**: Custom legend label

### Line Tab
- **Grid Lines**: X/Y Grid, Quadrant Grid, Diagonal Line
- **Trend Line**: Fitting method(linear/quadratic), One Per Color, Project Forward
- **Project Forward**: Trend prediction, not applicable to Pie/Radar/Map/Waterfall

---

## Data Binding

### Editor Binding Zones
| Zone | Function | Description |
|------|----------|-------------|
| X / Y | Primary axis dimension or measure | Multiple fields can be bound (multi-measure/multi-level dimension); dimensions and measures can swap axes |
| Color | Color grouping | Dimension→Palette classification; Measure→Spectrum gradient; supports Fixed Mapping |
| Shape | Shape grouping | Built-in shapes + custom images(png/gif/jpg/svg) |
| Size | Size grouping | Range slider controls mapping interval; Bubble→bubble size; Donut→hole size |
| Text | Text label | Format settings, display data labels |
| Break By | Split without encoding | Split visual elements by field (multi-line/multi-group), no color legend generated |
| Tooltip | Tooltip only | Field values only appear in hover Tooltip, not involved in visual encoding |
| T | Hierarchy dimension | Treemap/Sunburst/Icicle/Circle Packing only; supports multi-field multi-level hierarchy |
| Geographic | Geographic field | Map only; requires Set Geographic to configure map type and level |
| Path | Path field | Mekko/some Network charts only |
| Open/Close/High/Low | Price fields | Candle/Stock Chart only |
| Start/End | Time range | Gantt Chart only |
| Milestone | Milestone | Gantt Chart only, mark key nodes |
| Source/Target | Network edges | Network Chart only, define edge start and end points |

### Measure Binding
- **Aggregation Methods**: Sum / Count / Average / Min / Max / None

### Trend and Comparison Calculations
| Calculation Type | Description | Parameters |
|------------------|-------------|------------|
| Percent | Percentage | Dimension/Grand Total/Subtotal |
| Change | Difference | First/Previous/Next/Last, As percent |
| Running | Cumulative | Aggregate, Reset at(Year/Quarter/Month) |
| Sliding | Sliding window | Previous/Next, Include current value |
| Value Of | Value extraction | First/Previous/Next/Last |
| Compound Growth | Compound growth | Aggregate(Min/Max/Average) |

### Date Grouping Levels
- **Time Granularity**: Year, Quarter, Month, Week, Day, Hour, Minute, Second
- **Periodicity**: Month of Year(1-12), Quarter of Year(1-4), Week of Year(1-52), Day of Month(1-31), Day of Week(1-7), Hour of Day(0-23)

### Named Groups
- Ctrl select multiple axis/legend labels → Right-click Group Items → Enter group name
- Not supported for date fields

---

## Advanced Features

### Drill Down
- **Trigger**: Hover axis label → Drill Down button
- **Drill Types**:
  - Discrete grouping → Create facet chart
  - Continuous grouping → Change dimension level
- **Custom Hierarchy**: Hierarchy tab → Drag fields to create drill path

### Brush
- **Selection Methods**: Click/Ctrl+Click/Shift+Click
- **Linked Effect**: Related charts highlight
- **Clear**: Clear Brushing

### Zoom
- **Include Mode**: Zoom → Show selected data only
- **Exclude Mode**: Exclude → Hide selected data
- **Restore**: Clear Zoom

### Detail Drill Down
- **Operation**: Show Details → Data panel displays details
- **Features**: Formatting, styling, export

### Target Lines and Trend Lines
- **Target Lines**: Marker lines/band areas/statistical areas
- **Trend Line**: Fitting methods, One Per Color, Project Forward

---

## Date Comparison

**Entry**: Chart right-click / Toolbar More → Date Comparison (requires Enable Date Comparison checked first)

**Supported Chart Types**: Bar, Line, Area, Point, Interval, Step Line/Area
**Not Supported**: Pie, Bubble, Map, Word Cloud, Network, Treemap, etc.

**Period Types**:
- Standard Periods: Set comparison period by Year/Quarter/Month/Week/Day, supports To Date
- Custom Periods: Custom date intervals + labels, supports multiple intervals

**Granularity**: Data subdivision granularity within each comparison period (Year/Quarter/Month/Week/Day)

**Comparison Option**: Value / Change / Change+Value / Percent Change / Percent Change+Value

**Display Modes**:
- Default Overlay: Each period as independent series, X-axis grouped by granularity, legend shows period names
- Facet Mode: Each period generates independent sub-chart

**Key Behaviors**:
- When DC is enabled, colors automatically override original Color binding by period
- To Date automatically disabled when Period Level = Interval Level
- DC may trigger automatic chart type conversion

---

## Interactive Features

### Toolbar Tools
- Show Summary/Details, Chart Show Enlarged
- More → Properties/Format/Save As Image/Resize Plot/Date Comparison

### Right-click Options
- Axis Title: Title Properties, Format, Hide Title
- Axis: Axis Properties, Format, Hide Axis
- Data Point: Annotate Point
- Legend: Legend Properties, Format, Hide Legend

### Custom Tooltip
- **Syntax**: `{0}`, `{Sum(Total)}`, HTML tags(`<b>`, `<br>`)
- **Formatting**: `{0, date, MMMM yyyy}`, `{1, number, $#,###.00}`
- **Multi-measure**: Conditional display `|Quantity: {1}|`

---

## Testing Guidelines

### Chart Type Test Matrix
| Test Dimension | Test Points |
|----------------|-------------|
| Data Binding | Dimension/measure correctly bound to each zone |
| Display Effect | Chart renders correctly, no layout anomalies |
| Interactive Features | Drill down, brush, zoom work properly |
| Property Configuration | Changes take effect after modification |
| Boundary Conditions | Empty data, extreme values, large data volume |

### Property Value Range Testing
- **Numeric Range**: Corner Radius(0-0.5), Pie Ratio(0.1-1), Symbol Size(6-50), Alpha(0-100%)
- **Boolean Options**: Enable Drilling, Show Points, Smooth Lines
- **Enumeration Options**: Aggregation(Sum/Count/Avg/Min/Max/None), Date Level(Year/Quarter/Month/...)

### Compatibility Testing
- **Cross-chart Type**: Same configuration behavior across different charts
- **Browser Compatibility**: Rendering consistency across major browsers
- **Data Type Compatibility**: Different data sources(Excel/DB/API)

### Performance Testing
- **Large Data Volume**: Rendering speed with 1000+ data points
- **Complex Charts**: Response time for multi-measure/multi-level charts
- **Refresh Strategy**: Resource consumption for Manual/Auto Refresh

### Exception Scenario Testing
- **Empty Data**: Prompt message when no data
- **Invalid Configuration**: Prompt and handling for incorrect binding
- **Permission Control**: Behavior restrictions for users without permissions