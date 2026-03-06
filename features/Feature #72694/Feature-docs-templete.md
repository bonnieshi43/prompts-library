---

product: <product-name>
module: <module-name>
feature: <feature-name>
type: feature-test-spec
owner: <owner/team>
last_updated: <YYYY-MM-DD>
--------------------------

# 1. Feature Overview

> 仅在本功能存在对应内容时保留本节；如不适用，可整体省略本节。

## Feature Description

简要说明功能的目的、解决的问题以及核心行为。

## Scope

说明功能适用范围，例如：

* 适用模块
* 适用组件
* 适用对象（Chart / Axis / Dashboard / Dataset 等）

---

# 2. Functional Rules

> 仅在本功能存在明确规则时保留本节；如无专门规则，可省略本节。

描述该功能的核心行为规则，而不是具体测试步骤。需要高度概括和总结

可包括：

* 默认行为
* 属性变化规则
* UI 状态规则
* 数据 / 绑定变化规则
* 多对象交互规则

---

# 3. Compatibility Matrix

> 仅在需要区分兼容性/适用范围时保留本节；不涉及兼容性分析可省略。

用于说明该功能在不同对象或类型下的适用情况。

常见维度包括：

* Chart Type
* Axis Type
* Data Binding
* Visualization Layer

示例结构：

| Object Type | Behavior          | Support       |
| ----------- | ----------------- | ------------- |
| Type A      | Expected behavior | Supported     |
| Type B      | Expected behavior | Limited       |
| Type C      | Not applicable    | Not supported |

---

# 4. Rendering & Layout Impact

> 仅在功能会影响可视化布局或渲染时保留本节；否则可省略。

说明该功能对可视化布局与渲染的影响，例如：

* 元素位置变化
* 组件对齐规则
* 容器尺寸变化时的行为
* 多元素共存时的布局策略

---

# 5. Integration Impact

> 仅在功能对其他模块/能力有影响时保留本节；无集成影响可省略。

说明该功能对系统其他能力的影响。

常见关注点：

* Export / Print
* Dashboard 运行态
* Embedded 场景
* 版本兼容性（Backward Compatibility）

---

# 6. Script / Programmatic Support

> 仅在功能支持脚本/编程控制时保留本节；纯 UI 功能可省略。

若功能涉及 UI 属性或配置项，需要说明：

* 是否支持脚本控制
* UI 与脚本的优先级
* 脚本设置后的行为

---

# 7. Localization

> 仅在功能包含对外展示的 UI 文案或本地化内容时保留本节；否则可省略。

若涉及 UI，需要验证:

* UI 文本翻译
* Tooltip / Description

---

# 8. Regression Risk Areas

> 仅在功能可能带来回归风险时保留本节；低风险改动可简要合并到其他部分。

列出可能受影响的系统区域，尽可能的高度概括,例如：

* 渲染引擎
* 数据绑定逻辑
* 图表布局
* 导出模块

---

# 9. Verification Strategy

> 仅在需要单独强调验证策略时保留本节；简单功能可在前文简要说明。

说明推荐的测试方式，尽可能的高度概括, 例如：

* 功能验证
* 可视化验证
* 兼容性验证
* 回归验证

无需列出详细 test cases，仅说明验证策略。
