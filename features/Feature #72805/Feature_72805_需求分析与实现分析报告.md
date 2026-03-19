#测试遗漏
AI对copy的流程分析的比较全面，对具体的conditon和action的类型和属性测试不太具体，cycle没支持Bug #74035



# Copilot Chat Conversation Export: F72805-需求分析与实现分析报告

**User:** @bonnieshi43
**Thread URL:** https://github.com/copilot/c/d372f127-91d1-4925-8848-ff02ff152aae


## Copilot

以下是对本需求及 PR 的完整结构化分析报告。

---

# 一、需求分析（Requirement Analysis）

## 1. 特定功能理解与范围界定

**核心目标总结**

允许用户在 EM（Enterprise Manager）和 User Portal（Schedule Task Editor）两个入口中，对已有的调度任务条件（Condition）和动作（Action）进行一键复制，以复制品为起点再行修改，避免重复填写相同的字段。

**业务问题说明**

调度任务中的多个 Action（如"发送邮件到相同地址、相同格式"）或多个 Condition（如"每天 09:00 和 每天 18:00 执行"）往往仅有细微差异。现有流程每次都必须从零新建、重新填写所有字段，造成重复劳动和出错风险。

**涉及模块识别**

| 层 | 模块 |
|---|---|
| 前端 UI（Angular EM） | `schedule-task-editor-page.component.ts/.html` |
| 前端 UI（Angular Portal） | `task-action-pane.component.ts/.html`、`task-condition-pane.component.ts/.html` |
| 国际化资源 | `core/src/main/resources/inetsoft/util/srinter.properties` |
| 单元测试 | 三个新增 `.spec.ts` 文件 |

**类型判断**：UI 功能增强（Feature），前端纯改动，无后端 API 变更。

---

## 2. 需求合理性（Requirement Rationality）

**是否定义清晰？**
需求描述了"复制现有 condition/action"的动机，但缺乏以下明确定义：
- **复制行为的语义边界**：复制后的条目是"草稿态（未保存）"还是"立即持久化"？需求未声明，实现依赖前端 dirty flag（`taskChanged=true`），尚需保存才落盘——此语义未在需求中明确，存在用户理解歧义。
- **命名规则的用户可见性**：自动追加 "Copy of" 前缀的规则对用户完全透明，但需求文档未声明此规则，测试人员需从 PR 实现逆推。

**是否存在隐含假设？**
- 隐含假设：Label 为主标识符，复制时通过修改 label 区分，但调度任务内部实际调度执行依赖底层 condition/action 数据结构，并非 label 唯一标识。若 label 为空（null）时逻辑回退为 `"_#(js:New Condition/Action)"`，但需求对 label 为空的情形完全未提及。    📅**测试-分析**：不通过label区分
- 隐含假设：EM 与 Portal 共用相同的数据模型，但两个实现路径（`ScheduleTaskEditorPageComponent` vs `TaskConditionPane`/`TaskActionPane`）的状态管理机制不同，复制逻辑被分别实现了两次。 📅**测试-分析**：复制逻辑只实现一次

**是否具备可验证性？**
核心路径可验证。但以下方面需补充验收标准才可验证：
- 复制后数据是否与原始完全一致（所有字段的深克隆）   🔴  **测试-需要全面覆盖**
- "Copy of" 的本地化翻译在不同语言下的呈现
- 复制后任务是否标记为"已修改（dirty）"、是否触发保存提示    📅**测试-分析**：触发保存提示

---

## 3. 需求完整性（Requirement Completeness）

**缺失的关键边界场景**    

1. **Condition 类型不止 TimeCondition**：文档显示 Condition 还包括 CompletionCondition（依赖另一任务完成后触发）。PR 实现使用泛型 `ScheduleConditionModel`，但测试用例仅覆盖 `TimeConditionModel`，CompletionCondition 的 deep clone 正确性未验证。  🔴  **测试-需要全面覆盖**
2. **Action 类型多样性**：Portal 中的 Action 包括 ViewsheetAction（Dashboard 交付）、BurstAction、SaveToDiskAction 等多种类型。测试仅使用 `GeneralActionModel/ViewsheetAction`，其他 ActionType 的 clone 完整性未覆盖。                                      🔴  **测试-需要全面覆盖**
3. **复制上限未定义**：需求和实现均未限制单任务内最大 condition/action 数量，复制后无上限提示。 📅**测试-分析**：不存在, 无需考虑
4. **用户权限与任务归属**：若任务属于其他用户或 admin 权限受限，Copy 按钮是否应被禁用？需求未声明，实现也未处理。 📅**测试-分析** 无需考虑    
5. **保存前离开（导航离开）**：��制操作触发 `taskChanged=true`，若用户复制后直接离开，现有的"未保存确认"对话框是否正常弹出？需求未验证此路径。🔴  **测试-需要覆盖支持**
6. **撤销（Undo）**：复制后能否撤销？需求未提及，实现未支持。  🔴  **测试-需要全面覆盖支持**

**UI 行为不完整**

- Portal 中 Copy 按钮的 disabled 逻辑：`selectedActions.length != 1 || model.actions.length < 1`——第二个条件冗余（若 `selectedActions.length == 1`，则 `model.actions.length` 必 >= 1），但逻辑无害。
- EM 中 Copy 按钮的 disabled 逻辑：`selectedConditionIndex < 0 || !condition`——`condition` 是 getter，需要验证 `selectedConditionIndex` 与实际 model 数组索引的同步场景下此 getter 是否在边界条件（如刚初始化）时返回正确值。
- 复制后新条目自动被选中并进入编辑视图（`listView = true`）——这是合理的 UX，但需求未明确要求，属于隐式设计决策，可能引起用户困惑（预期复制后仍停留在列表）。

**缺失的非功能性要求**

- **本地化**：`srinter.properties` 仅添加了 `Copy of=Copy of`（英文）。多语言环境下"Copy of"翻译是否存在于所有语言包？需求未声明多语言要求。
- **兼容性**：无后端或数据格式变更，向后兼容不存在风险；但需声明本功能的支持版本范围。

---

## 4. 需求扩展建议（Requirement Expansion Suggestions）

- **命名规则可配置性**：当前硬编码"Copy of" + 原始名称，建议考虑是否需要支持序号后缀（如 "Condition (2)"），以在大量复制时提升可识别性。
- **权限一致性**：需明确复制操作是否遵循与新建相同的权限控制策略，以避免越权复制高权限任务的 action/condition。
- **Portal 与 EM 入口一致性**：两个入口的 Copy 按钮样式、位置略有差异（EM 用 Material `mat-button`，Portal 用 Bootstrap `btn-default`），建议在设计规范层面对齐，避免日后维护分叉。

---

## 5. 基于需求视角的风险评估（Risk Assessment from Requirement Perspective）

| 风险类型 | 描述 |
|---|---|
| **被误解风险** | 用户可能误解"Copy"为立即保存的持久化操作，而非仅修改内存状态；"Copy of"前缀剥离逻辑（while 循环）对最终用户不可见，多次复制后命名行为不直觉 |
| **跨模块影响风险** | 本次改动为纯前端，无跨模块直接影响；但若未来调度后端引入 condition/action 的唯一 ID 机制，当前只依赖 label 的克隆方式需要重构 |
| **状态一致性风险** | EM 与 Portal 两套独立的 `copyCondition/copyAction` 实现维护两份逻辑，一旦其中一个出现 Bug 需要同步修复，容易遗漏 |
| **可扩展性风险** | `COPY_OF_PREFIX` 在 EM 和 Portal 的 TypeScript 文件中各自声明了一次，重复定义，未提取至 shared 模块，造成逻辑碎片化 |

---

# 二、实现分析（Implementation Analysis）

## 1. 改动类型识别

**Feature（新增功能）**：纯前端功能新增，含配套单元测试。

---

## 2. 实现与需求一致性分析

**对齐情况**

| 需求点 | 实现状态 |
|---|---|
| EM 条件复制 | ✅ 已实现 |
| EM 动作复制 | ✅ 已实现 |
| Portal 条件复制 | ✅ 已实现 |
| Portal 动作复制 | ✅ 已实现 |
| 复制内容包含全部字段 | ✅ Tool.clone 深克隆 |
| 复制后自动命名区分 | ✅ "Copy of" 前缀 |

**隐式行为变更**

- 复制后焦点自动切换至新条目（`selectedConditionIndex` / `selectedActionIndex` 被更新），并强制进入编辑视图（Portal：`this.listView = true`）。需求中未明确要求此行为，属于实现隐式决策，需测试验证用户体验是否符合预期。
- `COPY_OF_PREFIX` 的 while 循环剥离行为：对 "Copy of Copy of X" 剥离为 "Copy of X"，是合理的设计，但需求未明确要求，属于隐性增强，需要测试验证。

**实现不足点**

- **CompletionCondition（完成条件）类型的 clone 正确性**：测试仅覆盖 TimeConditionModel。若 CompletionCondition 含有引用类型字段（如对其他任务的引用），`Tool.clone` 需要保证深克隆不引入共享引用。
- **EM 的 `condition` getter 的 null 安全性**：EM 实现用 `!this.condition` 作为 guard，但未验证 getter 内部若依赖 `selectedConditionIndex` 与 model 数组不同步时是否可能抛出异常。

---

## 3. 技术设计与实现质量评估

**结构与模块合理性**

`COPY_OF_PREFIX` 常量在以下 4 个文件中各自独立声明：
- `schedule-task-editor-page.component.ts`（EM）
- `task-action-pane.component.ts`（Portal）
- `task-condition-pane.component.ts`（Portal）

三处重复定义，且没有提取至 `shared` 模块，违反 DRY 原则。未来若更改命名前缀语义需同步修改三处，有遗漏风险。

**状态管理正确性**

- EM 中：`conditionItems`（展示层列表）与 `model.taskConditionPaneModel.conditions`（数据层数组）是两个独立数组，`copyCondition()` 同时 push 到两者，保持了同步。但这种双数组同步模式本身是脆弱的——若后续其他修改只更新其中一个，两个列表将产生不一致。
- Portal 中：只维护 `model.conditions` 单一数组，结构更简洁，无此风险。

**事件处理**

- Portal 的 Copy 按钮：禁用条件 `selectedActions.length != 1` 而非 `selectedActions.length < 1`，这意味着多选时不可复制，与业务需求一致（复制语义要求明确单一来源）。
- EM 的 Copy 按钮：禁用条件 `selectedConditionIndex < 0 || !condition`，需要确认 `condition` getter 在 `selectedConditionIndex === 0` 但 model 为空时的返回值。

**克隆安全性**

使用 `Tool.clone()`（推测为 JSON 序列化/反序列化或类似深克隆机制），适用于纯数据对象。但若 `ScheduleConditionModel` 或 `ScheduleActionModel` 的子类型中存在循环引用、Function 属性或 Date 对象，`Tool.clone` 可能产生预期外结果。

---

## 4. 隐藏风险识别

**UI 与内部状态不一致风险**

EM 中 `conditionItems` 与 `model.taskConditionPaneModel.conditions` 双数组同步依赖手工维护，在 `copyCondition` 中实现正确，但其他操作（如 delete、reorder）若遗漏同步一方将导致 UI 显示与数据不一致，且此次改动增加了一个新的同步点，提升了未来出现不一致的概率。

**回归风险**

- `deleteConditions()` / `deleteActions()` 在 EM 中依赖 `canDeleteConditions` / `canDeleteActions`（需 `length > 1`），复制后 length 增加，现有的"不可删最后一条"逻辑不受影响，但需要回归验证复制后再删除的完整流程。
- Portal 的 `deleteCondition()` 使用对话框确认，复制后立即点击 Delete 的连续操作需要验证状态正确性。

**本地化风险**

`srinter.properties` 仅添加了英文 `Copy of=Copy of`。系统若存在其他语言资源文件（如 `srinter_zh.properties`、`srinter_ja.properties` 等），本次改动未更新这些文件。若其他语言文件回退到英文 key 展示（即显示为 `Copy of` 原文），用户体验受损但功能不中断；若语言文件完全不支持 fallback，则可能显示为 `_#(js:Copy of)` 这种未解析的 i18n 占位符。

---

## 5. Diff 级观察（Diff-Level Observations）

**关键修改文件总览**

| 文件 | ��质 | 关键变更 |
|---|---|---|
| `srinter.properties` | i18n 资源 | 新增 `Copy of=Copy of` 英文翻译 |
| EM `.html` | UI | 条件区+动作区各新增一个 Copy 按钮，disabled 绑定 |
| EM `.component.ts` | 逻辑 | 新增 `copyCondition()` / `copyAction()` 两个方法及 `COPY_OF_PREFIX` 常量 |
| EM `.spec.ts` | 测试 | 新增 293 行单元测试，覆盖 copy 的正常、边界、防重叠前缀场景 |
| Portal action `.html` | UI | action 区新增 Copy 按钮 |
| Portal action `.component.ts` | 逻辑 | 新增 `copyAction()` 及 `COPY_OF_PREFIX` 常量 |
| Portal action `.spec.ts` | 测试 | 新增 4 个 copy 场景用例 |
| Portal condition `.html` | UI | condition 区新增 Copy 按钮 |
| Portal condition `.component.ts` | 逻辑 | 新增 `copyCondition()` 及 `COPY_OF_PREFIX` 常量 |
| Portal condition `.spec.ts` | 测试 | 新增 4 个 copy 场景用例 |

**潜在脆弱逻辑**

```typescript name=task-condition-pane.component.ts
while(baseLabel.startsWith(this.COPY_OF_PREFIX)) {
   baseLabel = baseLabel.slice(this.COPY_OF_PREFIX.length);
}
```

该 while 循环在标准路径下最多执行 1-2 次（单次 copy 或 copy-of-copy），理论上不存在性能问题；但若 label 被手动编辑为 `"Copy of Copy of Copy of ... X"` 的极长前缀字符串，循环次数线性增长，需测试验证上限边界。

**EM 与 Portal 的 Copy 按钮 disabled 逻辑差异**

| 入口 | Condition Copy disabled 条件 |
|---|---|
| EM | `selectedConditionIndex < 0 \|\| !condition` |
| Portal | `selectedConditions.length != 1 \|\| model.conditions.length < 1` |

两者语义等价但表达不同，需分别测试其边界。

---

# 三、测试设计（Test Design）

## 3.1 风险驱动测试覆盖策略

| 核心风险类型 | 来源 | 影响范围 |
|---|---|---|
| **深克隆不完整** | `Tool.clone` 对不同 ActionType/ConditionType 子类型的克隆行为未完整验证 | 复制的 action/condition 字段丢失或与原始共享引用 |
| **双数组不一致（EM 特有）** | EM 维护 `conditionItems` + `model.conditions` 双数组 | 复制后 UI 列表与实际数据模型状态不同步 |
| **本地化字符串未解析** | 其他语言包缺少 `Copy of` 的翻译 | 用户界面显示未解析的 i18n 占位符 |
| **复制后 Delete 流程回归** | 复制后 length 变化影响 `canDelete` 逻辑 | 删除操作异常或无法触发 |
| **i18n 前缀剥离逻辑边界** | while 循环对手动编辑的多层前缀处理 | 极端 label 输入导致命名不符预期 |
| **保存前离开（dirty check）** | 复制操作设置 `taskChanged=true` | 用户复制后离开未弹出未保存确认 |
| **Portal 进入编辑视图的隐式跳转** | `this.listView = true` | 用户预期停留列表但强制进入编辑，体验不符 |

---

## 3.2 必要测试类别与范围

### 1️⃣ 功能验证（Functional）                              📅 **测试-结果**功能正常

#### 核心路径验证

**触发原因**：PR 新增了 copyCondition/copyAction 四个核心方法（分布于三个组件），需验证在真实 UI 下的端到端行为。

**重点覆盖范围**：
- EM 入口：复制 Condition / 复制 Action
- Portal 入口：复制 Condition / 复制 Action
- 复制后所有字段内容与原始一致性验证（特别关注邮件地址、格式、Schedule 时间、TimeZone 等完整字段）
- 复制后 label 命名规则验证（"Copy of X"）
- 复制后自动选中新条目验证

**验证目标**：复制功能在两个入口均工作正常，数据完整，命名正确，焦点跳转符合预期。

#### 状态同步验证（EM 特有双数组同步）                       📅 **测试-结果**功能正常

**触发原因**：EM 维护 `conditionItems`（UI 列表）与 `model.taskConditionPaneModel.conditions`（数据模型）双数组，复制逻辑需同时向两者 push，若不同步则 UI 与数据错位。

**重点覆盖范围**：
- 复制后 `conditionItems.length` === `model.taskConditionPaneModel.conditions.length`
- 复制后 `conditionItems[n].label` === `model.taskConditionPaneModel.conditions[n].label`
- 复制后执行 Delete 操作，两个数组同步减少

**验证目标**：双数组在 copy → edit → delete 全链路操作下始终保持一致。

#### UI 行为验证                              

**触发原因**：Copy 按钮为新增 UI 元素，其禁用逻辑、点击后的视图跳转、焦点选中行为均需验证。

**重点覆盖范围**：
- 未选中任何条目时 Copy 按钮为 disabled                      📅 **测试-结果**portal结果正确，EM总是有一条选择，copy不会变成disable
- 选中一条时 Copy 按钮可点击                                 📅 **测试-结果**portal和EM都正常
- Portal 多选时 Copy 按钮为 disabled                        📅 **测试-结果**结果正确
- 点击 Copy 后新条目出现在列表末尾并被选中                    📅 **测试-结果**结果正确
- Portal 点击 Copy 后自动切换到编辑视图（listView = true）   📅 **测试-结果**不会自动切换到编辑视图Bug #74028

**Browser（桌面浏览器）**：Chrome / Firefox / Edge 均需验证按钮渲染与点击行为。📅 **测试-结果**结果正确

**本地化（Locale）**：                                     📅 **测试-结果**本地化已经添加，暂时没翻译文件
- 英文环境：label 显示为 "Copy of [原始名称]"
- 非英文环境（如中文、日文）：验证 `Copy of` 是否正确翻译，或降级展示
- 验证 `srinter.properties` 其他语言文件是否同步添加了翻译 key

---

### 2️⃣ 回归测试范围（Regression Scope）

**触发原因**：Copy 操作后 action/condition 数量增加，影响原有 Delete 逻辑的 `canDelete` guard；新按钮插入现有 Add / Delete 按钮之间，需验证原有流程不被破坏。

**受影响模块**：
- `deleteConditions()` / `deleteActions()`（EM）：复制后 length ≥ 2，Delete 应可用                 📅 **测试-结果**Delete可用 
- `deleteCondition()` / `deleteAction()`（Portal）：复制后再 Delete 需弹出确认对话框                📅 **测试-结果**复制后再 Delete 弹出确认对话框
- **任务保存流程**：复制后 `taskChanged=true`，执行 Save 后数据是否正确持久化（包含复制的新条目）     📅 **测试-结果**Save 后数据持久化
- **任务保存前离开**：复制后直接切换页面，未保存确认对话框是否正常触发                                📅 **测试-结果**未保存对话框正常触发

---

### 3️⃣ 边界与异常测试（Boundary & Exception）

**触发原因**：存在 label 为空的回退逻辑、while 循环对多层前缀的剥离逻辑、索引越界的防御逻辑，需覆盖边界情形。

| 边界场景 | 预期行为 |
|---|---|
| label 为 `null` 或空字符串 | 回退为 `"_#(js:New Condition)"` / `"_#(js:New Action)"` |               📅 **测试-分析**label 不会为null
| label 已有单层 "Copy of" 前缀 | 复制后仍为 "Copy of X"（不叠加） |                                    📅 **测试-结果**copy lable相同不叠加
| label 已有多层 "Copy of Copy of" 前缀 | while 循环剥离后，复制结果为 "Copy of X" |                     📅 **测试-分析**：不会出现这种情况，lable前缀不会叠加
| label 手动被编辑为极长的多层 "Copy of" 嵌套字符串 | while 循环正确终止，结果为 "Copy of X" |             📅 **测试-分析**：不会出现这种情况，label不能编辑
| `selectedConditionIndex` 越界（大于 conditions.length-1） | 不触发 copy，`taskChanged` 保持 false |   📅 **测试-分析**：无需考虑
| Portal 多选（selectedConditions.length > 1） | Copy 按钮禁用，`copyCondition()` 执行无效果 |          📅 **测试-结果** 结果正确
| CompletionCondition 类型（非 TimeCondition）的复制 | 所有字段深克隆正确，特别是对其他任务的引用字段 |    📅 **测试-结果**结果正确
| BurstAction / SaveToDisk 等非 ViewsheetAction 的复制 | 所有字段深克隆正确，action-specific 字段不丢失 | 📅 **测试-分析**：BurstAction 不支持，SaveToDisk结果正确
| 任务中已有最大数量的 conditions/actions 时复制 | 若系统有上限需验证提示，无上限时需验证性能无明显劣化 |    📅 **测试-结果**测试10个，结果正确

---

### 4️⃣ 安全测试（Security）          📅 **测试-分析** 无需测试和权限没关系

**触发原因**：Copy 按钮操作修改内存中的 task model，若存在权限边界（如普通用户是否可以复制 admin 创建的 task action），需验证权限控制与复制操作一致。

**重点覆盖范围**：
- 具有只读权限的用户打开任务编辑页面时，Copy 按钮是否显示或禁用（与 Add/Delete 按钮保持一致）
- Copy 操作不引入额外的权限提升（复制的 action 不应包含超出当前用户权限的配置）

---

### 5️⃣ 兼容性测试（Compatibility）   📅 **测试-分析**:本地化已经添加，暂时没翻译，待验证  

**触发原因**：`srinter.properties` 新增了 `Copy of` key，若其他语言资源文件缺失此 key，i18n 框架的 fallback 行为决定用户界面的最终展示。

**重点覆盖范围**：
- 切换系统语言为非英文（中文/日文/其他），打开调度任务编辑页面
- 验证 Copy 按钮文本和复制后 label 中的 "Copy of" 是否正常翻译或合理降级
- 验证已有任务（升级前创建的）的 condition/action label 中若包含特殊字符，复制后不出现编码异常

---

### 7️⃣ 自动化测试建议（Automation Recommendations）

**触发原因**：本次 PR 已添加了较完整的 Jest 单元测试，但测试间存在以下可补充点：

**Unit 可覆盖点（当前 spec 的补充建议）**：
- `task-condition-pane.spec.ts` 未覆盖 `CompletionCondition` 类型的复制
- `task-action-pane.spec.ts` 未覆盖 BurstAction、SaveToDisk 等其他 actionType 的复制
- Portal spec 中缺少对 "Copy of" 前缀剥离的多层测试（EM spec 有，Portal spec 无）
- Portal action spec 中缺少 label 为 null 时的边界用例          

**E2E 关键路径**：
- 路径1：EM → 编辑调度任务 → 选择 Condition → 点击 Copy → 验证列表 → 保存 → 重新打开任务确认持久化    📅 **测试-结果** 重新打开持久化
- 路径2：Portal → 编辑调度任务 → 选择 Action（Email 类型）→ 点击 Copy → 修改复制品的收件人 → 保存 → 验证两个 Action 各自独立   📅 **测试-结果**两个 Action 各自独立

**是否需要 Mock / Stub**：已有单元测试已 mock 了 `MatDialog`、`Router`、`TimeZoneService` 等，E2E 测试需要真实 scheduler 服务或 API stub。

---

# 四、关键测试场景设计（Key Test Scenarios）

---

### 场景 TC-01：EM 入口 - 复制 TimeCondition 核心路径    📅 **测试-结果**符合预期

**测试目标**：验证 EM 中复制已有 TimeCondition 后，数据完整性、命名规则、自动选中行为均正确。

**测试场景说明**：在 Enterprise Manager 中打开一个已含有一个每日时间条件的调度任务，点击 Copy 复制该条件，验证复制行为。

**关键步骤**：
1. 以管理员身份登录 EM（http://localhost:8080/em）
2. 导航至 Schedule > Tasks，选择一个已有的调度任务，点击编辑
3. 在 Conditions 区域，确认存在一个 TimeCondition（如"每天 09:00 执行"），类型为 EVERY_DAY，时区为 America/New_York
4. 选中该 Condition（使其处于选中状态，selectedConditionIndex = 0）
5. 点击 **Copy** 按钮
6. 观察 Conditions 列表的变化
7. 点击新出现的条目，查看其编辑表单

**预期结果**：
- Conditions 列表中出现第 2 条，label 为 "Copy of [原始名称]"
- 新条目的编辑表单中，所有字段（类型 EVERY_DAY、时间 09:00、时区 America/New_York 等）与原条件完全一致
- 新条目自动处于选中状态
- 页面顶部显示未保存（脏状态）标志       📅 **测试-结果**没有标志
- 原始条件的内容未发生任何改变

**覆盖风险点**：深克隆正确性、命名规则、EM 双数组同步、dirty 状态标记

---

### 场景 TC-02：EM 入口 - 复制 Action 后保存并重新打开验证持久化   📅 **测试-结果**符合预期

**测试目标**：验证复制后的 Action 在保存后正确持久化，重新打开任务时两个独立的 Action 均存在且内容正确。

**测试场景说明**：EM 中含有一个"发送邮件到 A@test.com"的 ViewsheetAction，复制后修改复制品为"发送邮件到 B@test.com"，保存任务后重新打开验证。

**关键步骤**：
1. 以管理员身份登录 EM
2. 编辑一个已有调度任务，Actions 区域含有一个 ViewsheetAction（emailAddress=A@test.com，format=Excel）
3. 选中该 Action，点击 **Copy** 按钮
4. 新 Action 自动被选中（label = "Copy of [原始名称]"），进入编辑区
5. 将新 Action 的收件人地址修改为 B@test.com
6. 点击保存（Save Task）按钮
7. 关闭该任务编辑页面
8. 重新打开同一任务的编辑页面
9. 检查 Actions 列表

**预期结果**：
- Actions 列表中存在两条 Action
- 第一条：原始 Action，emailAddress=A@test.com
- 第二条：复制品，emailAddress=B@test.com，label 含 "Copy of"    📅 **测试-结果**save 后lable不存在Copy of，结果合理
- 两条 Action 相互独立，修改其中一条不影响另一条

**覆盖风险点**：数据持久化、深克隆独立性、dirty 状态与保存流程集成

---

### 场景 TC-03：Portal 入口 - 复制 Action（ViewsheetAction）核心路径      📅 **测试-结果**符合预期

**测试目标**：验证 User Portal 中复制 Action 后的数据完整性及视图跳转行为。

**测试场景说明**：在 User Portal 的 Schedule Task Editor 中，复制一个含有邮件发送配置的 Action。

**关键步骤**：
1. 以普通用户身份登录 User Portal
2. 导航至 Schedule > [某调度任务] > Edit
3. 切换至 Actions 选项卡，确认存在一个 ViewsheetAction，配置包含：选中的 Dashboard、收件人邮箱列表、邮件格式（如 PDF）、fromEmail
4. 确认 Actions 列表中只选中 1 条（selectedActions.length === 1）
5. 点击 **Copy** 按钮
6. 观察视图变化和 Actions 列表

**预期结果**：
- Actions 列表新增一条，label = "Copy of [原始名称]"
- 界面自动切换到新条目的编辑视图（listView 变为 true，编辑表单展开）   📅 **测试-结果** Bug #74028
- 新 Action 的所有字段（Dashboard 路径、收件人邮箱、邮���格式、fromEmail、bundledAsZip 等）与原 Action 完全一致
- 原 Action 的字段未发生变化

**覆盖风险点**：Portal listView 隐式跳转行为、深克隆完整性、多字段复制正确性

---

### 场景 TC-04：Portal 多选状态下 Copy 按钮禁用验证        📅 **测试-结果** 符合预期

**测试目标**：验证 Portal 中选中多个 Action/Condition 时 Copy 按钮处于禁用状态，点击无效果。

**测试场景说明**：Actions 列表中有 2 条记录，用户通过多选同时选中两条，验证 Copy 按钮状态。

**关键步骤**：
1. 登录 User Portal，进入含有至少 2 个 Action 的调度任务编辑界面
2. 在 Actions 列表中通过按住 Ctrl/Shift 选中两条 Action（selectedActions.length === 2）
3. 观察 Copy 按钮状态
4. 尝试点击 Copy 按钮（若按钮非 disabled 可通过 JS 调用 copyAction()）

**预期结果**：
- 多选状态下 Copy 按钮显示为 disabled，无法点击   
- `model.actions.length` 不变
- 若通过代码绕过调用 `copyAction()`，函数直接 return，不执行任何操作

**覆盖风险点**：多选禁用逻辑边界、防误触复制

---

### 场景 TC-05：复制的副本再次被复制（前缀不叠加验证）  📅 **测试-结果** 符合预期

**测试目标**：验证对 "Copy of X" 再次执行 Copy 操作后，结果仍为 "Copy of X"，不出现 "Copy of Copy of X"。

**测试场景说明**：先复制一个原始 Condition，得到 "Copy of Daily Condition"，再对这个副本执行 Copy 操作，验证命名去重逻辑。

**关键步骤**：
1. 登录 EM 或 Portal，编辑一个调度任务
2. 选中名为 "Daily Condition" 的 Condition，点击 Copy
3. 确认列表中出现 "Copy of Daily Condition"
4. 选中 "Copy of Daily Condition"，再次点击 Copy
5. 观察新条目的 label

**预期结果**：
- 新条目的 label 为 "Copy of Daily Condition"（而非 "Copy of Copy of Daily Condition"）
- 两个副本（Copy of Daily Condition × 2）均存在于列表中，各自独立
- 两个副本的数据内容均与原始 "Daily Condition" 一致

**覆盖风险点**：`COPY_OF_PREFIX` while 循环去重逻辑、用户体验可识别性

---

### 场景 TC-06：label 为空（null/空字符串）的 Condition/Action 复制    📅 **测试-分析** lable不可以更改忽略

**测试目标**：验证当 condition 或 action 的 label 为 null 或空字符串时，复制逻辑能正确回退并命名。

**测试场景说明**：通过构造或 API 直接设置一个 label 为 null 的 condition，在 UI 中复制该条目，验证命名回退行为。

**关键步骤**：
1. 通过 API 或直接修改任务配置，将某个 Condition 的 label 设置为 null 或 ""
2. 打开对应调度任务的编辑页面
3. 选中该 label 为空的 Condition，点击 Copy
4. 查看新条目的 label

**预期结果**：
- 新条目 label 显示为 "Copy of New Condition"（回退 label 为 "_#(js:New Condition)"，经 i18n 解析后为"New Condition"）
- 不出现 "Copy of undefined"、"Copy of null" 或程序错误
- 原始空 label 条目未被修改

**覆盖风险点**：null/空字符串边界、i18n 回退字符串正确解析

---

### 场景 TC-07：复制后未保存直接导航离开（Dirty Check 回归）  📅 **测试-结果** 符合预期

**测试目标**：验证复制操作触发 taskChanged=true 后，用户导航离��页面时系统正确弹出"未保存"确认提示。

**测试场景说明**：在 EM 中执行 Copy 操作后，不保存任务，直接点击浏览器左侧导航或使用返回按钮，验证 dirty check 拦截逻辑。

**关键步骤**：
1. 登录 EM，打开调度任务编辑页面
2. 选中一个 Condition，点击 **Copy**（此时 taskChanged = true）
3. 不执行任何保存操作，直接点击左侧导航菜单切换到其他页面
4. 观察系统响应

**预期结果**：
- 系统弹出"You have unsaved changes. Are you sure you want to leave?"类型的确认对话框  📅 **测试-结果**弹出The task has unsaved changes, close anyway?
- 点击"取消"后留在当前任务编辑页面，复制的条目仍存在
- 点击"确认离开"后，导航成功，复制的条目被丢弃（因未保存）

**覆盖风险点**：taskChanged dirty check 与 Copy 操作集成，防止数据意外丢失的用户保护机制回归

---

### 场景 TC-08：非英文语言环境下 "Copy of" 的展示验证   📅 **测试-分析** 没翻译先忽略

**测试目标**：验证系统在非英文 locale 下，Copy 按钮文本及复制后的 label 命名是否正确展示，不出现原始 i18n key 外泄。

**测试场景说明**：将系统语言切换为中文或其他已支持的非英文语言，执行 Copy 操作，验证 "Copy of" 的翻译呈现。

**关键步骤**：
1. 将浏览器或系统语言设置为中文（或日文、其他支持语言）
2. 登录 EM / Portal，进入调度任务编辑页面
3. 选中一个 Condition，点击 Copy 按钮
4. 查看 Copy 按钮文本
5. 查看复制后新条目的 label 显示内容

**预期结果**：
- 若对应语言资源文件包含 "Copy of" 的翻译，则按翻译显示（如中文显示"复制于"或系统定义的翻译）
- 若语言资源文件缺少此 key，则降级显示为英文 "Copy of"，而非原始占位符 `_#(js:Copy of)`
- Copy 按钮文本（"_#(Copy)"）与其他按钮（Add/Delete）在同语言下保持翻译风格一致

**覆盖风险点**：本地化资源 key 缺失、i18n 降级机制、多语言环境下用户体验一致性

