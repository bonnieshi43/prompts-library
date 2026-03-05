# StyleBI Script 知识库
> 用途：为script识别测试用例生成提供产品背景知识
> 更新日期：2026-03-05

---

## 一、三个 Script Module 及其定位

StyleBI 中有三个独立的 script 模块，对应 Pinecone 中的 `SCRIPT_MODULES = ["chartAPI", "commonscript", "viewsheetscript"]`。

### 1.1 chartAPI（图表脚本 API）

**用途**：用编程方式创建或修改 Chart（图表）。适合需要动态构建图表或定制超出 UI 能力范围的图表效果。

**核心对象**：
- `EGraph` — 图表顶层对象，管理 Element、Coordinate、Scale、Form
- `GraphElement` 子类 — `PointElement`、`LineElement`、`IntervalElement`、`AreaElement` 等，代表图表的视觉元素
- `Coordinate` 子类 — `RectCoord`、`PolarCoord`、`FacetCoord` 等，控制坐标系
- `Scale` 子类 — `LinearScale`、`LogScale`、`TimeScale`、`CategoricalScale`
- `AxisSpec` — 坐标轴外观（网格颜色、标签可见性、线条样式）
- `LegendSpec` — 图例位置、背景、字体

**Visual Frame（数据映射到视觉属性）**：
- `StaticColorFrame` — 设置静态颜色（所有数据点同一颜色）
- `CategoricalColorFrame` — 按类别自动分配颜色
- `GradientColorFrame`、`BipolarColorFrame` — 渐变颜色映射
- `StaticSizeFrame`、`LinearSizeFrame` — 点的大小
- `StaticShapeFrame`、`CategoricalShapeFrame` — 点的形状
- `DefaultTextFrame` — 数据标签

**预制特殊图表函数**：
- `createSunburstGraph()` — 旭日图
- `createTreeMap()` — 树状图
- `createBulletGraph()` — 子弹图
- `createCirclePacking()` — 圆形打包图
- `createMekkoGraph()` — Mekko 图
- `createIcicleGraph()` — 冰柱图

**典型脚本示例**：
```javascript
// 修改已有图表的元素颜色（chart 组件脚本）
var elem = graph.getElement(0);
var cframe = new StaticColorFrame();
cframe.setColor(java.awt.Color(0xff0000)); // 红色
elem.setColorFrame(cframe);

// 从零创建图表
dataset = [["State","Quantity"], ["NJ",200], ["NY",300]];
graph = new EGraph();
var elem = new PointElement("State", "Quantity");
var sframe = new StaticSizeFrame();
sframe.setSize(10);
elem.setSizeFrame(sframe);
graph.addElement(elem);
```

**脚本放置位置**：放在 **Chart 组件本身的 Script 标签**（Component Script），而非 Dashboard 全局脚本。

---

### 1.2 commonscript（通用脚本函数库）

**用途**：提供可在任何 Dashboard 脚本中调用的内置函数。包含两类截然不同的内容：

#### A. CALC 公式函数（内置计算函数，在 Formula Editor 中使用）

这些是类似 Excel 的公式函数，通过 **Formula Editor**（属性表达式）调用，**不需要编写 JavaScript**，属于 **GUI 辅助功能**，不应触发 `script=true`。

常见函数：
- 数学：`CALC.sum()`、`CALC.average()`、`CALC.max()`、`CALC.min()`、`CALC.abs()`
- 文本：`CALC.concatenate()`、`CALC.find()`、`CALC.mid()`、`CALC.len()`
- 日期：`CALC.today()`、`CALC.now()`、`CALC.year()`、`CALC.month()`、`CALC.day()`
- 逻辑：`CALC.iif()`、`CALC.and()`、`CALC.or()`、`CALC.not()`
- 财务：`CALC.pv()`、`CALC.nper()`、`CALC.irr()` 等
- 统计：`CALC.countif()`、`CALC.sumif()`、`CALC.stdev()` 等

**使用示例（属性表达式，不算脚本）**：
```javascript
CALC.sum(SalesByDate['Total'])
CALC.sumif(Sales['Total'], '>50', Sales['Quantity Purchased'])
CALC.today().getMonth()
```

#### B. runQuery()（从脚本执行查询，明确脚本能力）

**用途**：在 Dashboard 脚本中动态执行一个 Data Worksheet 查询，返回二维数组结果。

**语法**：
```javascript
var q = runQuery('ws:global:{FolderPath/}DataWorksheetName');
// 带参数：
var q = runQuery('ws:global:Examples/AllSales', [['start_time', parameter.start_time]]);
```

**结果访问**：
```javascript
q[0][0]  // 第一行（列头）第一列
q[1][0]  // 第一条数据记录第一列
Text1.value = q[1][0];
```

**注意**：`runQuery()` 不从数据模型检索数据，只支持 Data Worksheet。通常放在 `onInit` Handler 中（只执行一次）。

#### C. Freehand Table 专用函数（明确脚本能力）

- `rowList(query, 'condSpec', 'options')` — 从查询结果集按条件过滤并返回行列表
- `toList(array, 'options')` — 获取数组的去重排序列表（常用于 Freehand Table 表头行）
- `mapList(list, mapping, 'options')` — 按命名分组映射列表
- `inArray(array, value)` — 判断值是否在数组中
- `toArray(tableLens)` — 将 tableLens 对象或字符串转为 JavaScript 数组

**使用示例**：
```javascript
// onInit 中：
var q = runQuery('ws:global:Examples/Sales Explore');
// Freehand Table 单元格公式：
rowList(q, 'Date? Total > 10000');
toList(q['State']);
```

#### D. Array 对象函数

JavaScript 标准数组操作：`concat`、`join`、`pop`、`push`、`reverse`、`shift`、`slice`、`sort`、`splice`、`unshift`。

---

### 1.3 viewsheetscript（Dashboard 组件脚本）

**用途**：控制 Dashboard 中各组件的属性和行为，实现动态交互逻辑。

#### 脚本层级

| 层级 | 位置 | 触发时机 |
|------|------|----------|
| Dashboard 级：`onInit` | Dashboard Options > Script > onInit | 仅在首次加载时执行一次 |
| Dashboard 级：`onRefresh` | Dashboard Options > Script > onRefresh | 每次刷新时执行 |
| 组件级：Component Script | 组件属性 > Script 标签 | 所在组件刷新时执行 |
| 属性表达式：Property Expression | 组件属性 > 任意属性字段的 Expression 选项 | 组件刷新时对单一属性求值 |

#### 可脚本化的组件属性（常见）

**可见性（Visibility）**：
```javascript
// 在组件脚本或 onRefresh 中
Text8.visible = false;
// 属性表达式方式（GUI辅助，在Formula Editor中写条件）：
if ((RadioButton1.selectedObject=='Hide') && (CALC.today().getMonth() == 3)) { "Hide" }
else { "Show" }
```

**颜色（Color/Background）**：
```javascript
foreground = 'red';
foreground = 0xFF0000;
background = [255, 255, 0];
background = {r:255, g:0, b:0};
foreground = java.awt.Color.red;
```

**字体（Font）**：
```javascript
font = 'Verdana-BOLD-12';
font = new java.awt.Font('Verdana', java.awt.Font.BOLD, 12);
```

**文本内容（Text/Value）**：
```javascript
Text1.text = 'Data from ' + formatDate(firstDate, 'MMM d, yyyy');
Text1.value = q[1][0];
```

#### 访问组件数据

**表单组件（RadioButton、ComboBox、Slider 等）**：
```javascript
RadioButton1.selectedObject   // 当前选中值
CheckBox1.selectedObjects[0]  // 多选第一个值
TextInput1.value              // 文本输入框当前值
```

**Table/Crosstab 数据访问**：
```javascript
Table1.table[rowIx][colIx]  // 显示数据（含表头行）
Table1.data[rowIx][colIx]   // 原始数据（分组汇总前）
value                        // 当前单元格值（在 cell expression 中）
field['Price']               // 当前行中名为 Price 的列的值
table[row][col-1]            // 相对引用：当前行左一列
```

**表格颜色表达式（Script 示例，也可用 UI Conditional Formatting）**：
```javascript
// 在 Price 列的 Color 属性 Expression 中：
if (value > 1000) { [255, 0, 0]; }  // 红
else { 0x0000FF; }                   // 蓝

// 引用同行其他列：
if (field['Price'] > 1000) { [255,0,0]; }

// 跨行循环（必须用脚本，UI 无法实现）：
for (i=1; i < table.length; i++) {
    if (table[i][col] > 2000) { [255,0,0]; break; }
    else { [0,255,0]; }
}
```

**访问 Data Worksheet 数据块**：
```javascript
Sales['Price']           // Price 列数组
Sales[2]['Price']        // 第3行 Price 值
viewsheet['Top Sales']['Price']  // 名称含空格时用 viewsheet 关键字
```

**内置聚合（在 Dashboard 脚本中）**：
```javascript
Sum(Sales['Total'])
Average(Sales['Total'])
Max(Sales['Total'])
Min(Sales['Total'])
First(Sales['Date'], Sales['Date'])  // 排序后第一条
Last(Sales['Total'], Sales['State'])
```

#### 特殊事件和全局函数

```javascript
refreshData()    // 刷新 Dashboard 数据
saveWorksheet()  // 保存 Data Worksheet
alert('message') // 弹出提示框
confirm('question') // 弹出确认框
```

#### Chart 组件的 bindingInfo 属性

通过 `bindingInfo` 动态修改图表数据绑定：
```javascript
// 在 Chart 组件的 X 轴字段的 Expression 中：
SelectionTree1.drillMember  // 动态绑定到选中层级下一层字段
```

#### 动态图片加载

```javascript
// Image 组件的 Dynamic Image Selection Expression：
if(condition) { 'image1.gif'; }
else { 'image2.gif'; }
```
---

## 二、Admin Console 

Admin Console 是 InetSoft 企业版提供的一款自动化管理工具，基于 Groovy DSL 构建，封装了 InetSoft 的公共客户端 API。它允许管理员通过脚本方式自动化执行常见的系统管理和部署任务

admin Console 支持通过脚本自动化执行以下管理和部署任务：
- Repository Connection：脚本化管理元数据仓库连接
- Data Source Management：自动化创建、修改、删除数据源
- Physical View Management：维护物理数据模型
- Logical Model Management：构建面向业务的逻辑模型
- Data Worksheet Management：自动化创建和更新数据工作表
- Content Asset Management：批量导入/导出报表、仪表盘等内容
- Server Configuration & Initialization：参数配置、集群设置等
- Scheduled Tasks & Cycles Management：定时任务、邮件分发管理
- Security & Permission Management：批量配置用户、角色、权限
