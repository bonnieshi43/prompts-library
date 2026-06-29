# Feature #74763 - Enhance Funnel Graph Look and Feel

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

- 当前 Funnel 图实际表现为堆叠 Bar，缺少真正漏斗视觉效果。
- 本 Feature 目标是将 Funnel 渲染为连续梯形结构，使其更符合漏斗图视觉。
- 涉及 Chart Engine（BarVO、Geometry、Layout）、SVG Annotation、Chart UI Hover 等模块。

### 2. 需求清晰度

- 未定义 Funnel 梯形计算规则。
- 未说明 Corner Radius 与 Funnel 的兼容行为。
- 未定义 Label 布局及 Hover 行为。

### 3. 测试风险识别

- Geometry 重构风险
- Layout 风险
- Coordinate Transform 风险
- Hover/Tooltip 风险
- Collision/Dodge 回归风险

---

# 二、实现分析（Implementation Analysis）

## 改动类型

- Feature
- Geometry Rendering
- Layout
- Interaction

## 需求实现一致性

- 跳过 Funnel Gap，形成连续漏斗。
- Funnel 下禁用 Corner Radius。
- 新增 Funnel 专用 Label Layout。
- 新增 SVG Annotation 支持 Hover。
- 重构 dodge() 生成梯形。

## 关键实现风险

1. cachedShape 生命周期。
2. `_funnel_shaped_` Hint 状态管理。
3. X 排序在横向 Funnel 下兼容性。
4. Layout Pass 对其它 Coordinate 的影响。
5. SVG Annotation 对导出一致性的影响。

---

# 三、测试设计（Test Design）

## 风险驱动测试策略

- Funnel Geometry
- Shape Cache
- Label Layout
- Hover Mapping
- Export SVG
- Coordinate Compatibility

## 必要测试

### Functional

验证 Funnel Rendering、Label、Hover、Tooltip。

### Regression

验证普通 Bar、Stack Bar、Interval、Waterfall 无回归。

### Boundary

- 单层 Funnel
- 双层 Funnel
- 空数据
- Null 数据
- 超长 Label
- 极端宽高比

### Compatibility

- Vertical Funnel
- Horizontal Funnel
- PNG/SVG Export
- Browser
- Mobile

### Performance

100+/500+/1000 层 Funnel 渲染。

### 自动化建议

- Unit：Geometry、Trapezoid Build
- Integration：Layout、Transform、Collision
- E2E：Render、Hover、Export

---

# 四、关键测试场景（Key Test Scenarios）

## Scenario 1：基础 Funnel 渲染

**Objective**

验证 Funnel 呈现连续梯形。
🔴 测试-分析：Bug #75528,Bug #75533

**Expected**

无 Gap，符合漏斗效果。
🔴 测试-分析：符合漏斗效果。
---

## Scenario 2：连续性验证

验证上下层无缝连接。
🔴 测试-分析：上下层无缝连接。

---

## Scenario 3：Corner Radius

验证 Funnel 不应用 Corner Radius。
🔴 测试-分析：Funnel 不应用 Corner Radius。
---

## Scenario 4：Label Layout

验证 Label 居中、无重复。
🔴 测试-分析：Label 居中、无重复。
---

## Scenario 5：Hover Highlight

验证 Hover 与 Label 正确关联。
🔴 测试-分析：Highlight区域显示正确，选择时候和区域不匹配Bug #75530

---

## Scenario 6：Export

验证 PNG/SVG 与页面一致。

🔴 测试-分析：Bug #75529导出有锯齿
---

## Scenario 7：大数据

验证大量 Funnel 渲染性能。
🔴 测试-分析：渲染正常

---

## Scenario 8：Regression

验证普通 Bar、Stack Bar、Interval 不受影响。
🔴 测试-分析：不影响其它chart style