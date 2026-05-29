# InetSoft Chart Module Knowledge Base
<!-- Chart module background knowledge (Lite). Supplement dedicated docs for specific features (Tooltip, Stack, Drill Down, Export, etc.) as needed. -->

## Table of Contents
1. [Chart Types](#chart-types)
2. [Core Property Configuration](#core-property-configuration)
3. [Data Binding](#data-binding)
4. [Advanced Features](#advanced-features)
5. [Date Comparison](#date-comparison)
6. [Interactive Features](#interactive-features)

---

## Chart Types

### Basic Charts (Mandatory Testing)
| Chart Type | Usage | Key Points |
|------------|-------|----------------|
| Bar / Stacked Bar Chart | Categorical comparison, supports stacking | Stack, Stack Measures, Bar Corner Radius(0-0.5), Round All Corners |
| Line / Stacked Line Chart | Time trend, supports stacking | Smooth Lines, Show Points, Dashed Line for Gaps, Stack |
| Area / Stacked Area Chart | Cumulative trend, supports stacking | Stack, Smooth Lines |
| Pie Chart | Part-to-whole relationship | Explode Pie, Pie Ratio(0.1-1), Show Values |
| Donut Chart | KPI display | Hole Size, Center Text/KPI |

### Stack Functionality Notes
- **Applicable Charts**: Bar, Line, Area, Point, Dot Plot, Multiple Measure
- **Enable Method**: Check 'Stack' option at the bottom of Chart Style panel
- **Stack Measures**: Multi-measure stacking (requires Stack enabled and single chart mode)
- **Use Case**: Show part-to-whole relationships and compare contributions of each component

### Advanced Charts (Key Testing)
| Chart Type | Usage | Key Points |
|------------|-------|----------------|
| Scatter Chart | Dual-measure relationship | Show Lines, Trend Line, Aggregation=None |
| Bubble Chart | Triple-measure relationship | Size binding measure |
| Heat Map | Matrix data | Color Spectrum, X/Y as dimensions |
| Treemap | Hierarchical data | T zone(hierarchy dimension), Size/Color measures |
| Map Chart | Geographic data | Geographic zone, Web Map background |

### Special Charts (As Needed)
| Chart Type | Usage | Key Points |
|------------|-------|----------------|
| Word Cloud | Text frequency display | Font Scale, Text/Size binding |
| Network Chart | Node relationship graph | Source/Target binding, Circular Network |
| Tree Chart | Directional hierarchy from edges | Source/Target binding |
| Sunburst Chart | Radial multi-level hierarchy | T zone (multi-level dimensions), Color measure for segment color |
| Icicle Chart | Rectangular multi-level hierarchy | T zone (multi-level dimensions), Color measure, top-down layout |
| Circle Packing | Nested circle hierarchy | T zone (multi-level dimensions), Include Parent Labels, Border Color |
| Radar Chart | Multi-variable comparison | Show Points, multiple measures on polar axes |
| Funnel Chart | Sequential stage drop-off | Ordered stages, decreasing area per stage |
| Waterfall Chart | Cumulative incremental effect | Positive/Negative/Total segment colors, running total display |
| Gantt Chart | Project timeline scheduling | Start/End/Milestone binding zones, task duration bars |
| Box Chart | Statistical distribution | Show Mean, Show Outliers, Whisker Range (1.5× IQR default) |
| Candle Chart | Stock OHLC price display | Open/Close/High/Low binding zones, candlestick color (up/down) |
| Stock Chart | Stock price trend (line-based OHLC) | Open/Close/High/Low binding zones |
| Pareto Chart | Key factor analysis (80/20 rule) | Pareto Line Color, cumulative percentage line overlay |
| Dual Axis Chart | Compare measures of different scales | Secondary Y-axis, independent scale per measure group |
| Trellis Chart Grid | Small multiples (chart matrix) | Outer Row/Column facet dimensions, inner chart type |
| Point Chart | Categorical scatter display | X/Y as dimensions, Color/Shape for grouping, Show Lines |
| Dot Plot Chart | Distribution across categories | Jitter display, Show Mean/Median reference |
| Step Line/Area Chart | Discrete step-change trend | Step direction (before/after/center), Stack |
| Interval Chart | Range/error bar visualization | High/Low measure binding for interval bars |
| Running Total Chart | Cumulative aggregation over time | Configured via Running calculation in Data Binding |
| Multiple Measure Chart | Multiple measures in unified view | Multiple Y measures, Stack Measures, independent axes option |
| Multiple Style Chart | Mixed chart types in one view | Per-measure chart type assignment (bar+line+area mix) |
| Hybrid Table Chart | Table with embedded chart cells | Chart cells within table rows, dual data+visual view |
| Contour Map Chart | Density/heat contour on map | Levels, Bandwidth, Edge Alpha, Cell Size |
| Scatter Matrix Chart | Pairwise scatter for dimension set | Diagonal labels, pairwise dimension combinations |
| Marimekko Chart | Two-dimensional proportional bars | Proportional column width + stacked height, two categorical dimensions |

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
- **Line/Area Chart**: Show Points, Smooth Lines, Fill Missing Data with Dashed Line
- **Radar Chart**: Show Points, Fill Missing Data with Dashed Line
- **Network/Tree Chart**: Apply Aesthetics to Source Nodes
- **Circular Network**: Smooth Lines (Bezier)
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
| Path | Geographic path | Map Chart only; defines route/path lines on map (e.g., flight routes) |
| Open/Close/High/Low | Price fields | Candle/Stock Chart only |
| Start/End/Milestone | Time range and milestones | Gantt Chart only; Start/End defines task duration, Milestone marks key nodes |
| Source/Target | Network edges | Network Chart, Tree Chart, define edge start and end points |

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
