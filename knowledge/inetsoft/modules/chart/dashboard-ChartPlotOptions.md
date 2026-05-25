# Chart Plot Options

## Overview

Chart Plot Options is a configuration panel in the chart property dialog (Plot tab). It controls visual rendering behaviors of the chart plot area — transparency, value labels, banding, trendlines, shape styling, and chart-type-specific options. The panel is dynamic: each control's visibility and enabled state depends on the current chart type and binding state. The backend model is `ChartPlotOptionsPaneModel`; the persistent store is `PlotDescriptor` (serialized as XML attributes on the chart assembly).

---

## Bar Corner Radius & Round All Corners

### Description
**Bar Corner Radius**:Controls the roundness of bar corners. 
**Round All Corners**:A checkbox that switches bar rounding between "open-end only" and "all four corners". 

### Supported Chart Types

`Bar Corner Radius` input is visible for:

| Chart Type | Bar Corner Radius | Round All Corners checkbox |
|---|---|---|
| Bar | ✅ | ✅ |
| Bar (Stacked) | ✅ | ✅ |
| Pareto | ✅ | ✅ |
| Waterfall | ✅ | ❌ (always rounds all corners, no user choice) |
| Interval | ✅ | ❌ (always rounds all corners, no user choice) |
| Gantt | ✅ | ❌ (always rounds all corners, no user choice) |
| 3D Bar | ❌ | ❌ |
| Funnel | ❌ | ❌ |
| Line / Area / Pie / Map / Treemap / others | ❌ | ❌ |


**Date Comparison special case:** When a chart has Date Comparison enabled (non-value-only mode), `Bar Corner Radius` becomes visible even if the base chart type would normally hide it, because DC converts the chart to bars at runtime.

### Default Values and UI State of Bar Corner Radius

| Scenario | Default Value |
|---|---|
| New chart| `0.3` |
| valid value | `[0, 0.5]` |
|old VS | `0` |

- Out-of-range input shows validation error: `viewer.viewsheet.chart.barCornerRadius.rangeWarning`
- Submitting `null` saves as `0` (no rounding)

### Default Values and UI State of Round All Corners
- only appears when `barCornerRadius` has a non-zero or non-null value.
- default value is false
- Unchecking (false): only the two corners at the open end of each bar are rounded
- Checking (true): all four corners rounded 
- For Waterfall / Interval / Gantt: hidden in UI but internally forced to `true` 

## Node Corner Radius

### Description
Controls the roundness of tree node corners in a **Tree chart** (`CHART_TREE`). Uses the same fraction scale as Bar Corner Radius: `0` = sharp, `0.5` = maximum.

### Supported Chart Types

| Chart Type | Visible |
|---|---|
| Tree (`CHART_TREE`) | ✅ |
| All other types | ❌ |

### Default Values and UI State

| Scenario | Default Value |
|---|---|
| New chart| `0.3` |
| valid value | `[0, 0.5]` |
|old VS | `0` |

- Out-of-range input shows validation error: `viewer.viewsheet.chart.nodeCornerRadius.rangeWarning`
- No "Round All Corners" companion checkbox — tree nodes always round all four corners when radius > 0



