# Copy 功能测试矩阵

## 0. 范围与规则（可测试化总结）

### 0.1 Copy 按钮启用/禁用规则（可验证语句）

#### EM

**期望（从防御/守卫角度）：**

-   当没有有效选中项 / 选中索引无效 / 选中对象为空时，Copy
    操作应不可执行或无效果。
-   即使按钮表面可点，也不能修改模型或产生新条目。

**现象提示：**

-   EM 常见情况是默认总有一条被选中，因此 Copy 按钮可能看起来一直是
    enabled。
-   不要把"总是
    enabled"当成硬性需求，测试重点应是：**无效状态下不应产生副作用**。

#### Portal

**Condition 面板**

-   当 `selectedConditions.length != 1` 时 → Copy 按钮 **disabled**
-   当 `selectedConditions.length == 1` 时 → Copy 按钮 **enabled**

**Action 面板**

-   当 `selectedActions.length != 1` 时 → Copy 按钮 **disabled**
-   当 `selectedActions.length == 1` 时 → Copy 按钮 **enabled**

------------------------------------------------------------------------

# 1. 通用验证维度（每个用例尽量覆盖）

## A) UI 状态

-   Copy 按钮 enabled/disabled 是否符合规则
-   Portal 多选时 Copy 必须禁用（Condition / Action 都要验证）

## B) 列表 / 选中行为

-   复制后新增条目是否出现在列表中（默认追加到末尾）
-   复制后新条目是否自动选中或焦点切换到新条目

## C) 数据正确性（深拷贝）

-   复制条目的关键字段应与原条目一致
-   修改复制品不会影响原件

## D) Dirty / 保存 / 离开页

-   Copy 后任务进入 dirty 状态
-   未保存离开应弹确认框
-   Confirm 离开应丢弃复制结果
-   Save 后复制条目应持久化

## E) Label / 命名规则（保存前 vs 保存后）

**保存前：**

-   复制品 label 应有可见区分（例如 `Copy of <原label>`）

**Copy of copy：**

-   不应出现 `Copy of Copy of X`

**保存后：**

-   系统可能会归一化 label
-   需要记录实际行为并确保稳定

## F) i18n / 多语言

-   `Copy of` 不应显示未解析占位符（例如 `_#(js:Copy of)`）
-   若无翻译允许 fallback 为英文

------------------------------------------------------------------------

# 2. 测试用例矩阵（核心）

## TC-UI-PORTAL-01

**Portal：未选中时 Copy 禁用（Condition）**

**前置条件**

-   至少存在 1 条 Condition
-   `selectedConditions.length == 0`

**步骤**

1.  打开 Portal 任务编辑页
2.  进入 Conditions 面板
3.  确认没有选中行

**预期结果**

-   Copy 按钮 disabled
-   无法创建新条目

------------------------------------------------------------------------

## TC-UI-PORTAL-02

**Portal：多选时 Copy 禁用（Condition）**

**前置条件**

-   至少 2 条 Condition

**步骤**

-   Ctrl / Shift 多选两条

**预期**

-   Copy disabled
-   条目数量不变

------------------------------------------------------------------------

## TC-UI-PORTAL-03

**Portal：单选时 Copy 启用（Condition）**

**前置条件**

-   `selectedConditions.length == 1`

**预期**

-   Copy enabled

------------------------------------------------------------------------

## TC-UI-PORTAL-04

**Portal：未选中时 Copy 禁用（Action）**

**预期**

-   Copy disabled

------------------------------------------------------------------------

## TC-UI-PORTAL-05

**Portal：多选时 Copy 禁用（Action）**

**预期**

-   Copy disabled
-   不新增条目

------------------------------------------------------------------------

## TC-UI-PORTAL-06

**Portal：单选时 Copy 启用（Action）**

**预期**

-   Copy enabled

------------------------------------------------------------------------

## TC-FUNC-GENERAL-01

**Copy → 不保存离开**

**步骤**

1.  选中条目
2.  点击 Copy
3.  尝试离开页面
4.  先点击 Cancel
5.  再点击 Confirm

**预期**

-   出现未保存确认框
-   Cancel 保留复制
-   Confirm 离开并丢弃复制

------------------------------------------------------------------------

## TC-FUNC-GENERAL-02

**Copy → Save → Reopen**

**预期**

-   条目数量 +1
-   重进页面仍存在

------------------------------------------------------------------------

## TC-FUNC-GENERAL-03

**Copy → 编辑复制品 → Save**

**预期**

-   修改只影响复制品
-   原件保持不变

------------------------------------------------------------------------

# 3. 类型覆盖

## Conditions

### TimeCondition

字段检查

-   trigger rule
-   time window
-   timezone
-   interval / repeat

### CompletionCondition

字段检查

-   dependency task
-   completion state
-   timeout / wait

------------------------------------------------------------------------

## Actions

### Dashboard

字段

-   dashboard path
-   recipients
-   format
-   zip option

### Backup (SaveToDisk)

字段

-   output path
-   overwrite strategy
-   compression

### Batch

字段

-   command / script
-   parameters
-   runtime options

------------------------------------------------------------------------

# 4. Label / 命名规则

## TC-LABEL-01

保存前应出现 `Copy of X`

## TC-LABEL-02

Copy-of-copy 不应叠加

## TC-LABEL-03

保存后验证 label 规则

------------------------------------------------------------------------

# 5. 视图 / 选中行为

## TC-VIEW-01

Copy 后新条目是否自动选中

## TC-VIEW-02

Portal 复制后进入编辑视图

已知问题：Bug #74028

------------------------------------------------------------------------

# 6. i18n

## TC-I18N-01

切换非英文 locale

预期

-   不出现未解析占位符
-   英文 fallback 可接受

------------------------------------------------------------------------

# 7. 非目标

-   权限 / RBAC
-   性能 / 最大条目数
-   Cycle 场景（等待 Bug #74035）

------------------------------------------------------------------------

# 8. 快速覆盖清单（回归 Checklist）

-   [ ] Portal：Condition 0 选中 → Copy disabled
-   [ ] Portal：Condition \>1 选中 → Copy disabled
-   [ ] Portal：Condition 1 选中 → Copy enabled
-   [ ] Portal：Action 0 选中 → Copy disabled
-   [ ] Portal：Action \>1 选中 → Copy disabled
-   [ ] Portal：Action 1 选中 → Copy enabled
-   [ ] EM：默认选中可 Copy
-   [ ] EM：无效状态不产生副作用
-   [ ] Copy → 不保存离开：弹框提示
-   [ ] Copy → 不保存离开：Cancel 保留修改
-   [ ] Copy → 不保存离开：Confirm 丢弃修改
-   [ ] Copy → Save → Reopen：持久化 +1
-   [ ] Copy → Edit(copy) → Save：原对象与复制对象互不影响
-   [ ] TimeCondition
-   [ ] CompletionCondition（若可用）
-   [ ] Dashboard
-   [ ] Backup（SaveToDisk）
-   [ ] Batch（若可用）
-   [ ] 保存前 label 可区分
-   [ ] copy-of-copy 不叠加
-   [ ] 保存后 label 行为记录且稳定
-   [ ] Portal 复制后进入编辑视图用例跟踪（Bug #74028）
-   [ ] 不出现未解析占位符


# Related Bugs

- **Bug #74028**  
  **Title:** `<stateless-sessions-Feature #72805> when copy a condition or action, can't switch to edit model`  
  **Status:** Resolved  
  **Resolved Date:** 2026-03-06  

- **Bug #74030**  
  **Title:** `<stateless-sessions-schedule> when exist multiple condition or action, scrollbar can't trigger`  
  **Status:** Resolved  
  **Resolved Date:** 2026-03-06  

- **Bug #74035**  
  **Title:** `<stateless-sessions-Feature #72805> the cycle can't copy condition, it also should support`  
  **Status:** Resolved  
  **Resolved Date:** 2026-03-06  
