---
product: StyleBI
domain: dashboard
module: filter
components:
  - selection-list
  - selection-tree
  - selection-container
type: dashboard-design-filter
tags:
  - selection
  - filter
source: https://www.inetsoft.com/docs/stylebi/InetSoftUserDocumentation/1.0.0/viewsheet/UseFilterComponents.html
---

# Knowledge Extraction - StyleBI Selection Components

## Overview

The **Selection component family** in StyleBI provides interactive controls for filtering and refining data displayed in views.

When used in a view, these components can trigger **linked filtering** on other `DataView` components and can **persist or export the current selection state**.

---

# Component Definitions

## Selection List

- **Definition**: A list-based selection control.
- **Characteristics**: Well-suited for one-dimensional, flat filtering scenarios.

---

## Selection Tree

- **Definition**: A tree-structured selection control.
- **Characteristics**: Supports multi-level hierarchies and is suitable for data with parent-child or categorized structures.

---

## Selection Container

- **Definition**: A container component used to organize multiple selection controls.
- **Structure**:
  - May contain multiple:
    - `Selection List`
    - `Selection Tree`
- **Purpose**: Allows multiple filter components to be grouped into a unified filtering area.

---

## Selection Modes

Selection components support the following selection modes:

- **Single Selection**
- **Multiple Selection**

### Interaction Shortcut

In the browser environment:

- **Alt + Click** can be used as a shortcut to quickly switch between single-select and multi-select behavior.

---

## Display Modes

Selection components support different display sizes:

- **Normal Mode**
  - Standard-sized display used in common dashboard layouts.

- **Enlarge Mode**
  - Enlarged display mode that provides more screen space for user interaction.

---

# Interaction Model

## Direct Interaction

Users interact with `Selection List` or `Selection Tree` components to select filtering values.

The selected values represent filtering conditions that affect related views.

---

## Popup Interaction

`Selection List` and `Selection Tree` can also be used as **popup selection components**.

Usage pattern:

- A Selection component can be attached to a **Text** or **Image** element in a view.
- When the user clicks the element, the Selection component appears as a **popup panel**.
- The user performs selection inside the popup.

After the selection is confirmed:

- Linked filtering is triggered
- The current selection state becomes part of the view state

---

# System Behaviors

## Linked Filtering

Selections made in `Selection List` or `Selection Tree` drive **linked filtering** on other `DataView` components.

When the selection state changes:

- Filtering conditions are generated from the selection.
- Filtering conditions propagate to related `DataView` components.
- Dependent `DataView` components refresh automatically.

As a result, users control:

- The dataset
- The displayed content in related views

---

# State Persistence

## Bookmark State

The **Bookmark** feature must persist the current Selection state.

When a user restores a view using a bookmark, the system should restore:

- Previously selected items in the Selection components
- The corresponding linked filtering conditions

This ensures that the view state matches the state when the bookmark was created.

---

## Export State

When exporting a view (e.g., **PDF / Excel / HTML export**):

- The current Selection state must be preserved.

The exported content should:

- Reflect the same filtering conditions
- Match the data currently visible in the dashboard.

---

# Usage Context

Selection components can be used in the following environments:

- **Web Browsers (Desktop Web)**
- **Mobile Devices (Mobile browsers or mobile dashboards)**

---