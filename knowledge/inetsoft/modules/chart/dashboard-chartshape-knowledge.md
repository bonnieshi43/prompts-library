---
product: StyleBI
domain: dashboard
module: chart
type: dashboard-design-chart
tags:
 - chart
source:[https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/GroupDataByDimension.html#_group_by_shape, https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/administration/Presentation.html#LookandFeel ]

---

# Knowledge Extraction - Chart Shape

## 1. Overview

The Custom Shape feature is part of the Chart visualization system in StyleBI.

It allows users to customize the visual representation of chart data points by applying custom graphical markers.

Custom shapes provide richer visual expression for chart data points.

This feature is primarily used in Point-based Charts, where each data item is represented by an individual visual marker.Other chart types do not support custom shapes.

---

## 2. Supported Shape Formats

Currently supported formats:

- JPG
- PNG
- gif
- Extract archive files

Users can upload custom shape images in these formats.

---


## 3. Upload Entry Points

Custom shapes can be uploaded from two different system entry points.

### Dashboard-Level Upload

Location:

Dashboard Designer  
Chart Editor -> Edit Shape -> Add Shape

Designers can upload shapes when configuring a chart.

### System-Level Upload

Location:

Enterprise Manager -> Settings -> Presentation -> Custom Shapes

Administrators can upload and manage shapes in the global shape library.

---

## 4. Shape Library Scope

Shapes can exist at different system scopes:

- Global
- Organization

---

## 5. Storage Location

All uploaded shapes are stored in the **system content repository**.

Location:

Enterprise Manager -> Settings -> Content -> Storage

Shape files are stored inside the **Portal Folder**.

---


## 6. Stability and Consistency Requirements

The system must ensure consistent behavior after shape operations.

Requirements include:

Shapes must persist after system restart
Shape display must remain correct after color/size changes
Shape display must be applied accurately after size adjustments
Shape display must remain correct after filter operations
Shape display must remain correct after drill operations
Shape display must remain correct after export operations

---

## 7. Reference Documentation
The following documentation provides additional details about chart shapes and related features in StyleBI.
- Group Data By Dimension  
  https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/GroupDataByDimension.html#_group_by_shape
- Custom Shape
  https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/administration/Presentation.html#LookandFeel
