# Copilot Chat Conversation Export: PR改动分析与测试方向总结

**User:** @bonnieshi43
**Thread URL:** https://github.com/copilot/c/46911c8e-019e-4557-85ab-6b1a1599605c

## 一、PR 改动分析（4 个文件，共 +40/-1 行）

### 改动 1 — `AxisScriptable.java`（核心修复，+31 行）

修复了 **两个相互独立的 Bug**：

#### Bug 1：新增构造函数，暴露 `isY2Axis` 标识

```java name=AxisScriptable.java url=https://github.com/inetsoft-technology/stylebi/blob/bug-73978/core/src/main/java/inetsoft/report/script/AxisScriptable.java
// 新增 4 参数构造函数，用于区分 y2Axis
public AxisScriptable(ChartInfo cinfo, AxisDescriptor axis, boolean isXAxis, boolean isY2Axis) {
    this.info = cinfo;
    this.axis = axis;
    this.isXAxis = isXAxis;
    this.isY2Axis = isY2Axis;  // 新增字段，标识是否为 secondary Y 轴
}
```

#### Bug 2（根因修复）：`init()` 中的懒加载逻辑

```java name=AxisScriptable.java
// Global axis scriptables (xAxis/yAxis/y2Axis) 在 Viewsheet 初始化时就被构造
// 而 RT 描述符（createRTAxisDescriptor）还没有执行
// → axis == null → propmap 为空 → put() 静默失效

if(field == null && axis == null) {
    if(info instanceof VSChartInfo) {
        VSChartInfo vsInfo = (VSChartInfo) info;
        // 关键：isY2Axis 决定取哪个 RT 描述符
        axis = isY2Axis ? vsInfo.getRTAxisDescriptor2() : vsInfo.getRTAxisDescriptor();
    }
    if(axis == null) {
        axis = info.getAxisDescriptor(); // fallback
    }
}
```

**影响范围**：此 Bug 不只是 `labelOnSecondaryAxis`，而是**所有全局轴属性**（`labelVisible`、`lineColor`、`lineVisible` 等）在 `Chart1.xAxis.xxx = value` 写法下都曾静默失效。

#### 新增属性注册（`labelOnSecondaryAxis`）

```java name=AxisScriptable.java
addProperty("labelOnSecondaryAxis", "isLabelOnSecondaryAxis",
            "setLabelOnSecondaryAxis", boolean.class,
            AxisDescriptor.class);
```

注意：此属性注册在 `else if(ref.isMeasure())` 分支内，与 `labelVisible` 并列 —— **仅对 Measure 轴有效**。

---

### 改动 2 — `ChartVSAScriptable.java`（+1/-1 行）

```java name=ChartVSAScriptable.java url=https://github.com/inetsoft-technology/stylebi/blob/bug-73978/core/src/main/java/inetsoft/report/script/viewsheet/ChartVSAScriptable.java
// 修复前
addProperty("y2Axis", new AxisScriptable(vinfo, vinfo.getRTAxisDescriptor2()));

// 修复后：传入 isY2Axis=true，确保懒加载时能取到正确的 RT 描述符
addProperty("y2Axis", new AxisScriptable(vinfo, vinfo.getRTAxisDescriptor2(), false, true));
```

---

### 改动 3 — `assembly.properties`（+4 行）

将 `labelOnSecondaryAxis` 注册到 4 个轴的命令映射：

| 轴对象 | 命令 Key |
|---|---|
| `Chart.axis.labelOnSecondaryAxis` | `ChartAxisLabelOnSecondaryAxis` |
| `Chart.xAxis.labelOnSecondaryAxis` | `ChartXAxis` |
| `Chart.yAxis.labelOnSecondaryAxis` | `ChartYAxis` |
| `Chart.y2Axis.labelOnSecondaryAxis` | `ChartY2Axis` |

---

### 改动 4 — `property-type.properties`（+4 行）

声明 `labelOnSecondaryAxis` 的类型为 `bool`，与 `labelVisible` 一致。

---

## 二、测试方向 × Script 用法

### Script 语法汇总

```javascript
// 全局轴写法（此次 Bug 2 修复的核心）
Chart1.xAxis.labelOnSecondaryAxis = true;   // X 轴标签移到 top
Chart1.yAxis.labelOnSecondaryAxis = true;   // Y 轴标签移到 right
Chart1.y2Axis.labelOnSecondaryAxis = true;  // 第二 Y 轴标签移到对侧

// 恢复默认
Chart1.xAxis.labelOnSecondaryAxis = false;
Chart1.yAxis.labelOnSecondaryAxis = false;

// 按字段名写法（此前已正常工作）
Chart1.axis['SalesField'].labelOnSecondaryAxis = true;
Chart1.axis['ProfitField'].labelOnSecondaryAxis = true;

// 读取当前值
var flag = Chart1.yAxis.labelOnSecondaryAxis;  // 返回 true/false
```

---

### 测试方向 × 用例矩阵

#### 📌 方向一：全局写法 vs 字段写法 —— Bug 2 核心验证

| # | Script | 期望结果 | 关注点 |
|---|---|---|---|
| S-1 | `Chart1.yAxis.labelOnSecondaryAxis = true` | Y 轴标签移至 right | **全局写法修复验证**，修复前此写法静默失效 |
| S-2 | `Chart1.xAxis.labelOnSecondaryAxis = true` | X 轴标签移至 top | 同上，X 方向 |
| S-3 | `Chart1.y2Axis.labelOnSecondaryAxis = true` | 第二 Y 轴标签移至 left（对侧） | isY2Axis 路径专项，修复前取的是错误 RT 描述符 |
| S-4 | `Chart1.axis['Measure1'].labelOnSecondaryAxis = true` | 字段级生效 | 对照组，修复前后均应正常 |
| S-5 | S-1 后再 `= false` | 标签恢复至 left | 可逆性验证 |

---

#### 📌 方向二：图表类型覆盖（In Scope 图表）

> 重点验证：script 与 UI checkbox 行为一致

| 图表类型 | 轴对象 | Script 示例 |
|---|---|---|
| Column/Bar（单轴） | `yAxis` | `Chart1.yAxis.labelOnSecondaryAxis = true` → 标签到 right |
| Line（单轴） | `xAxis` | `Chart1.xAxis.labelOnSecondaryAxis = true` → 标签到 top |
| Area（双 Y 轴） | `yAxis` + `y2Axis` | 分别设置，互不干扰 |
| Combo（双 Y 轴） | `y2Axis` | `Chart1.y2Axis.labelOnSecondaryAxis = true` → 特别验证 y2Axis 路径 |
| Candle/Stock | `xAxis` | 回归验证，不应影响金融图表 |
| Funnel（Y 绑 D） | `yAxis` | `Chart1.yAxis.labelOnSecondaryAxis = true` |
| Gantt | 时间轴 | `Chart1.xAxis.labelOnSecondaryAxis = true` |

---

#### 📌 方向三：多 Measure 轴场景（多 M 绑定）

```javascript
// 场景：Y 轴绑定多个 Measure（如 Sales、Profit），无 secondary axis 启用
Chart1.yAxis.labelOnSecondaryAxis = true;
// 期望：所有相关 Y 轴标签整体移到 right
```

| # | 场景 | Script | 期望 |
|---|---|---|---|
| M-1 | 多 M 绑定，无 secondary | `yAxis.labelOnSecondaryAxis = true` | 所有 M 的标签整体移到对侧 |
| M-2 | 多 M 绑定，启用了 secondary（有 y2Axis） | 不应生效或属性不出现 | Bug #74047/#74098 相关，不应导致 left+right 双侧同时显示 |
| M-3 | 对字段单独设置 | `Chart1.axis['Sales'].labelOnSecondaryAxis = true` | 仅 Sales 字段标签移侧，Profit 不变 |

---

#### 📌 方向四：属性持久化与状态回显

| # | 操作序列 | 验证点 |
|---|---|---|
| P-1 | Script 设 true → 保存 → 重新打开 Viewsheet | 标签位置持久化；UI checkbox 同步显示勾选状态 |
| P-2 | UI 勾选 → 用 Script 读取 `Chart1.yAxis.labelOnSecondaryAxis` | 返回 `true`，UI 与 Script 状态同步 |
| P-3 | Script 设 true → UI 取消勾选 | 渲染恢复默认侧，Script 读取返回 `false` |
| P-4 | 刷新（F5）或重新渲染 | 状态不丢失 |

---

#### 📌 方向五：全局轴属性协同（Bug 2 影响面扩大验证）

由于 Bug 2 根因是 `init()` 时 `axis == null` 导致 `propmap` 为空，**所有全局轴属性**都受影响。需验证修复后这些属性的全局写法是否也正常：

```javascript
// 验证 bug 2 修复不引入回归
Chart1.yAxis.labelVisible = false;      // 隐藏 Y 轴标签
Chart1.xAxis.lineColor = '#FF0000';     // X 轴线颜色
Chart1.y2Axis.lineVisible = false;      // 隐藏第二 Y 轴线
```

---

#### 📌 方向六：Out of Scope 验证（不应支持）

| 图表类型 | 验证点 |
|---|---|
| Radar | `Chart1.xAxis.labelOnSecondaryAxis = true` 应无效果或报错 |
| Pie/Donut | 无轴，属性不存在，不应崩溃 |
| Map | 无轴，同上 |

---

### 总结：Script 测试优先级排序

| 优先级 | 测试点 | 原因 |
|---|---|---|
| 🔴 P0 | 全局写法 `yAxis/xAxis/y2Axis.labelOnSecondaryAxis` 生效 | Bug 2 核心修复，修复前 100% 静默失效 |
| 🔴 P0 | `y2Axis` 写法通过正确 RT 描述符生效 | `isY2Axis` 路径专项，新构造函数 + 懒加载共同保证 |
| 🔴 P0 | 全局轴其他属性（`labelVisible`、`lineColor`）不回归 | Bug 2 影响面广 |
| 🟠 P1 | 字段写法 `axis['Field'].labelOnSecondaryAxis` 继续正常 | 修复前已工作，需确认没有被引入回归 |
| 🟠 P1 | 双 Y 轴图表（Combo/Area）两轴独立控制 | 核心业务场景 |
| 🟡 P2 | UI ↔ Script 双向同步 | 状态一致性 |
| 🟡 P2 | 保存/刷新持久化 | 回归场景 |
| 🟢 P3 | Out of scope 图表不崩溃 | 防御性验证 |
