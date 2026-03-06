# 没覆盖内容：
1.Bug #73968：measure as secondary axis，应该不支持
2.Bug #74007：3dbar没应用
3.Bug #74009：parato应该不支持 
4.Bug #74012：binding同样的measure应用错
5.Bug #72694:从single切换到separated的时候状态是否保持
总结：应该结合chart type,coordinate，轴类型和bininding的结构测试，AI描述有些笼统，比如多轴应该分情况。缺少导出，printlayout的check


# 一、需求分析（Requirement Analysis）

## 1. 特定功能理解与范围界定

### 核心目标

在 **一个轴存在多个 bindings（多字段绑定）** 的情况下，允许用户通过 UI
属性配置 **控制轴标签（axis labels）显示在图表的哪一侧**。

目标是提供：

**Axis Labels → Properties → Position**

用户可以选择：

  Axis     可配置位置
  -------- --------------
  X-axis   bottom / top
  Y-axis   left / right

本质是 **Axis Label Position Configuration Feature**。

### 业务问题说明

当前问题：

当一个 axis 有 **multiple bindings** 时：

不同 binding 的 label 可能被渲染在 **不同侧**

例如：

-   X Axis Label A → bottom\
-   X Axis Label B → top

结果：

-   label 被分离
-   视觉上难以理解 axis 含义

当前解决方案：

需要 script 修改 **AxisSpec**

用户必须手动调整 axis style，例如：

-   AxisSpec.AXIS_SINGLE
-   AxisSpec.AXIS_DOUBLE
-   AxisSpec.AXIS_DOUBLE2

这些 style 会控制 axis / label 在 **top/bottom 或 left/right** 的布局。

因此用户需要：

1.  下载 axis style
2.  修改 script
3.  重新配置

复杂且不可发现。

### 涉及模块识别

  模块                      影响
  ------------------------- -----------------------------------
  Chart UI Property Panel   新增 axis label position property
  Chart Axis Layout         label rendering position
  AxisSpec / AxisStyle      现有 axis style 逻辑
  Chart Binding Engine      multiple bindings axis
  Graph Rendering Engine    label layout

### 类型判断

属于 **UI + 渲染逻辑混合型 Feature**

涉及：

-   Chart configuration UI
-   Graph layout engine
-   Axis label rendering

------------------------------------------------------------------------

## 1. 需求合理性（Requirement Rationality）

### 定义清晰度

需求总体目标清晰：

> Allow user to control axis label position

但仍存在模糊点：

#### 1️⃣ 作用对象

需求未明确 **axis labels** 是否包括：

-   tick labels（对方轴应用同样 tick）     //对方轴应用同样tick
-   axis title（不包括）                  //不包括
-   binding labels（不包括）              //不包括

这些在 **StyleBI** 中是不同对象。

#### 2️⃣ multiple bindings 行为

未说明：

-   是否所有 binding label 同时移动
-   是否可以分别配置

例如：

-   binding1 label → bottom
-   binding2 label → top

是否允许？

#### 3️⃣ 默认行为

未说明：

-   default position
-   是否保持原逻辑：bottom / left
-   还是 Auto

#### 4️⃣ 适用图表类型

StyleBI 有多种 coordinate：

-   RectCoord
-   Polar
-   Network
-   Treemap

需求未说明：

是否 **仅 RectCoord 支持**

否则：

-   Polar chart
-   Radar chart             //Bug #73972

axis label positioning **没有意义**。

### 可验证性

需求是 **可测试的**

验证维度：

-   axis label layout
-   UI property behavior
-   rendering consistency

------------------------------------------------------------------------

## 2. 需求完整性（Requirement Completeness）

### 缺失边界场景

#### 1️⃣ 多 axis

例如：

Dual Axis Chart

情况：

-   x axis: 2 bindings
-   y axis: 2 bindings

未说明：

每个 axis 是否独立配置

#### 2️⃣ axis style 冲突

AxisSpec 已经支持 axis style：

-   AXIS_SINGLE
-   AXIS_DOUBLE
-   AXIS_DOUBLE2

需求未说明：

**property vs axis style precedence**

#### 3️⃣ label overlap

改变位置后可能出现：

-   top axis labels overlap title

需求未说明处理策略。

### UI 行为缺失

未定义 Property Panel UI，例如：

    Axis Label Position:
    [ Auto | Bottom | Top ]

或

    [ Left | Right ]

### 非功能要求缺失

缺少：

-   chart rendering performance
-   mobile layout behavior

------------------------------------------------------------------------

## 3. 需求扩展建议（Requirement Expansion Suggestions）

### 建议增加 Auto 模式     //无auto模式

推荐：

    Position:
    - Auto (default)
    - Top
    - Bottom

避免强制 layout。

### 建议支持 script API   //Bug #73978

当前用户使用 script：

AxisSpec

新功能建议提供 API：

    axis.setLabelPosition("top")

否则：

UI-only feature，破坏 script automation。

### 建议限制适用 chart 类型

建议仅支持：

**RectCoord charts**

例如：

-   Bar
-   Line
-   Area
-   Scatter
-   Interval

避免：

-   Polar
-   Treemap
-   Network

逻辑混乱。

------------------------------------------------------------------------

## 4. 基于需求视角的风险评估（Risk Assessment）

### 被误解风险

需求未明确：

axis label vs axis title

开发可能只移动：

axis title，而非 tick labels。

### 跨模块影响风险

涉及：

-   AxisSpec
-   Axis layout
-   Chart renderer

风险：

可能破坏 **existing dashboards**。

### 状态一致性风险

当用户：

change binding

可能导致：

axis label position reset

### 可扩展性风险

未来 chart engine 若支持：

multiple axes

position property 可能不足。

------------------------------------------------------------------------

# 二、实现分析（Implementation Analysis）

## 1. 改动类型识别（Change Type Identification）

该 PR 属于：

**Feature Enhancement**

同时包含：

-   UI Feature
-   Rendering Behavior Change

------------------------------------------------------------------------

## 2. 实现与需求一致性分析（Implementation-Requirement Alignment）

### 方案 A（推荐）

Axis 增加 property：

    axis.labelPosition

可选：

-   top
-   bottom
-   left
-   right

优点：

-   清晰
-   不依赖 AxisSpec

### 方案 B（风险）

通过修改：

AxisSpec axis style，例如：

    AXIS_DOUBLE2

问题：

Axis style 是 axis + grid + label 的组合，不适合单独控制 label。

若 PR 修改 AxisSpec，则属于 **设计不合理实现**。

------------------------------------------------------------------------

## 3. 技术设计与实现质量评估

### 潜在风险

#### 1️⃣ Axis Layout 耦合            

axis label layout 通常由：

-   AxisRenderer
-   AxisLayout

共同决定。

如果只是简单 **flip position** 可能导致：

-   tick / label misalignment

#### 2️⃣ 多 binding label

多 binding label 布局通常是：

stacked，例如：

    bottom
      label1
      label2

移动到 top 可能出现：

-   order reversed

#### 3️⃣ 图表 margin 计算

axis label 改变位置后需要调整：

-   chart padding

否则：

-   label clipped

------------------------------------------------------------------------

## 4. 隐藏风险识别（Hidden Risk Identification）

### 回归风险

影响所有 **RectCoord charts**：        //多measure轴有问题

-   Bar
-   Line
-   Scatter
-   Interval

### UI 与内部状态不一致风险

UI property 修改后：

-   script reload                      //script bug改好后验证
-   dashboard refresh                  //正常

可能恢复旧状态。

### 性能风险

Axis layout 需要重新计算：

-   chart bounds
-   label layout

大数据 chart 时可能触发：

-   re-render cascade

------------------------------------------------------------------------

# 三、测试设计（Test Design）

## 3.1 风险驱动测试覆盖策略

核心风险：

  风险                     来源
  ------------------------ --------------------------
  axis label layout 错乱   多 binding
  chart padding 计算错误   label position 改变
  dual axis 冲突           axis layout engine
  UI property 状态丢失     chart config persistence

高风险路径：

    Chart Designer
    → Axis Binding
    → Axis Label Property
    → Chart Rendering

------------------------------------------------------------------------

## 3.2 必要测试类别与范围                         //根据测试范围分情况测试

### 1️⃣ 功能验证（Functional）

新增 **axis label position property**

测试范围：

-   X axis position
-   Y axis position
-   multiple bindings

验证目标：

-   label 出现在正确 axis side

Browser：

-   Chrome
-   Firefox
-   Edge

Mobile：

-   responsive chart layout

------------------------------------------------------------------------

### 2️⃣ 回归测试范围（Regression Scope）

受影响模块：

-   Chart Axis Rendering
-   AxisSpec
-   Chart Layout Engine

需要验证：

-   Line Chart（结果正确）            //结果正确
-   Bar Chart（结果正确）             //结果正确
-   Dual Axis Chart                  //Bug #74011

------------------------------------------------------------------------

### 3️⃣ 边界与异常测试（Boundary & Exception）

测试：

-   multiple bindings ≥ 3           //结果正确
-   axis label very long            //结果正确

验证：

-   overlap                         //结果正确
-   clipping                        //结果正确

------------------------------------------------------------------------

### 4️⃣ 兼容性测试（Compatibility）  //根据测试范围分情况测试

验证 AxisSpec style 组合：

-   AXIS_SINGLE                    
-   AXIS_DOUBLE                    
-   AXIS_DOUBLE2                   

------------------------------------------------------------------------

# 四、关键测试场景设计（Key Test Scenarios）

## Scenario 1 --- Multiple Binding X Axis Label Position    //Bug #73973

### 测试目标

验证 **多 binding axis label 可以统一移动**。   

### 测试场景说明

X-axis 有两个 bindings。           

### Key Steps

1.  创建 Line Chart
2.  X-axis 绑定两个字段

-   Month
-   Region

3.  打开 Axis Label Properties
4.  设置 

```{=html}
<!-- -->
```
    Position = Bottom

5.  保存 chart

### Expected Result

-   两个 label 均显示在 bottom
-   label 不分离

### Risk Covered

multiple binding layout risk

------------------------------------------------------------------------

## Scenario 2 --- Move X Axis Label To Top          //结果正确    

### 测试目标

验证 label 可移动至 top。

### Key Steps

1.  创建 Bar Chart
2.  设置

```{=html}
<!-- -->
```
    Axis Label Position = Top

3.  刷新 chart

### Expected Result

-   label 在 chart top
-   bottom 无 label

### Risk Covered

axis layout flip risk

------------------------------------------------------------------------

## Scenario 3 --- Y Axis Label Position Right      //结果正确

### 测试目标

验证 Y-axis label 右侧显示。

### Key Steps

1.  创建 Line Chart
2.  设置：

```{=html}
<!-- -->
```
    Y-axis label position = right

3.  渲染 chart

### Expected Result

-   label 在右侧
-   left 无 label

### Risk Covered

axis side conflict risk

------------------------------------------------------------------------

## Scenario 4 --- Dual Axis Conflict               //Bug #74011

### 测试目标

验证双轴情况下 label 不冲突。

### Key Steps

1.  创建 Dual Axis Chart

Y1: Sales\
Y2: Profit

2.  设置：

-   Y1 label → left
-   Y2 label → right

3.  渲染 chart

### Expected Result

两个 axis label 正常显示。

### Risk Covered

dual axis layout risk

------------------------------------------------------------------------

## Scenario 5 --- Chart Resize Layout              //结果正确

### 测试目标

验证 label 在 resize 后位置正确。

### Key Steps

1.  创建 chart
2.  设置 label top
3.  调整 dashboard size

### Expected Result

-   label 不被裁剪
-   axis layout 正确

### Risk Covered

layout recompute risk
