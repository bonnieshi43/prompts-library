# Tab Bottom Position 功能 PR 分析与测试设计文档

---

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

#### 功能核心目标
为 Tab 组件新增“Tab 位于底部（bottom tabs）”的配置能力，使 Tab 不再仅限于顶部展示。

#### 解决的业务问题
现有 Tab 布局能力不足，无法满足复杂页面布局与嵌入式设计需求。本需求本质是扩展 Tab 容器的布局模式，而不仅是样式调整。

#### 涉及模块
- UI：Tab 属性面板、Tab 渲染、格式面板
- 业务逻辑：Tab 与子组件布局关系、拖拽/缩放重排
- Script：Tab 属性需支持脚本控制
- 持久化：assembly attribute 存储 bottomTabs
- 导出：print / HTML / PNG / device layout

#### 功能类型
跨层级 UI + 布局引擎 + 脚本 + 导出链路的复杂功能扩展。

---

### 2. 需求清晰度与完整性

#### 行为定义不清
需求仅描述“tabs on the bottom”，未明确是否仅视觉变化或整体几何重排。实际实现采用完整布局重算。

#### 默认行为未明确
未说明默认值是否必须保持 top，PR 中采用默认 false。

#### 编辑态与运行态边界缺失
未定义设计器、运行时、脚本切换的一致性要求。

#### 组合规则缺失
未定义与圆角、format、dropdown、embedded viewsheet 等属性组合规则。

#### 导出与多终端未定义
未明确是否所有导出与 device layout 必须一致支持。

---

### 3. 测试风险识别

- UI误解风险（仅样式 vs 几何重排）
- 跨模块影响（布局/导出/脚本）
- 状态不一致（design/runtime/script）
- 历史兼容风险
- child 越界/重叠风险

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型
Mixed Feature + Layout Fix + Test Enhancement

---

### 2. 影响模块

#### UI层
- Tab General Pane Model
- Tab Component (HTML/SCSS/TS)

#### 后端/逻辑层
- TabVSAssembly
- TabVSAssemblyInfo
- TabVSAScriptable
- TabPropertyDialogController

#### 格式系统
- VSObjectFormatInfoModel
- FormatPainterController

#### 测试
- TabPropertyDialogControllerTest
- ComposerObjectControllerTest

---

### 3. 实现一致性分析

#### 核心功能覆盖
✔ bottomTabs 已贯穿：
- 模型
- 持久化
- 脚本
- 布局重排
- 前端渲染

#### 超范围实现
- roundBottomCornersOnly 同步引入（扩展功能）

#### 默认兼容性
- bottomTabs 默认 false（向后兼容）

---

### 4. 关键实现风险

#### 风险1：maxChildHeight 驱动重排偏移
可能导致 tab bar 整体偏移异常

#### 风险2：设计值 / 运行值分裂
DynamicValue 可能导致 UI 与 runtime 不一致

#### 风险3：重复布局修正
child 可能被多次偏移

#### 风险4：resize 联动 tab bar
child resize 可能影响 tab bar

#### 风险5：前端渲染不一致
TS/SCSS/HTML 未完全可见

#### 风险6：格式系统扩展风险
圆角逻辑引入额外复杂度

#### 风险7：导出与 device layout 回归风险

---

## 三、测试设计（Test Design）

### 1. 测试策略
核心目标：验证 tab bottom 模式下的
- 几何一致性
- 状态一致性
- 跨端一致性

---

### 2. 测试类别

#### 功能测试
- bottomTabs 开关
- 保存 / 重开一致性
- script 控制
🔴 **测试-分析**：保存打开保持，script报Bug #73295，Bug #74593，Bug #74447，Bug #74494，Bug #74555

#### 回归测试
- top-tabs 默认行为
- tab 内组件布局
- format reset / painter
- 导出行为

🔴 **测试-分析**：top-tabs 默认行为无改变，导出Bug #74593，Bug #74427

#### 边界测试
- child 高度极端情况
- tab 边界位置
- 多 child 不等高

🔴 **测试-分析**：tab 边界位置 Bug #74130，Bug #74301，Bug #74299


#### 兼容性测试
- 旧版本对象打开
- 无 bottomTabs 属性对象
- 导入导出一致性
🔴 **测试-分析**：旧版本对象，无 bottomTabs 属性对象打开默认是false


## 四、关键测试场景（Key Test Scenarios）

### 场景1：Bottom Tabs 基础行为
验证 tab 位于底部且 child 正确贴合

🔴 **测试-分析**：tab位于顶部，组件展开不正确 Bug #74130

### 场景2：模式切换 + 位置调整
验证 bottomTabs 与 tab position 同时修改

🔴 **测试-分析**：结果正确

### 场景3：高度变化联动
验证 tab height 修改不影响 child 二次偏移
🔴 **测试-分析**：结果正确

### 场景4：bottom → top 切换
验证可逆性与无残留偏移

🔴 **测试-分析**：结果正确

### 场景5：脚本动态控制
验证 runtime 与 UI 同步
🔴 **测试-分析**：部分不同步bug在script里面记录


### 场景6：复杂组件组合
- selection list
- calendar
- slider
🔴 **测试-分析**：selection list,calendar 的drilldown有Bug #74306，Bug #74308， Bug #74459，Bug #74485，Bug #74494，slider主要是和结合feature72762 Bug #74554，Bug #74304，Bug #74554，#74489，Bug #74504


### 场景7：embedded viewsheet / search / table
验证复杂组件布局稳定
🔴 **测试-分析**：embedded viewsheet 应用Bug #74408，Bug #74463，selection search 有 Bug #74594，table shrink to fit有问题Bug #74621

### 场景8：导出验证+device layout
- HTML
- PNG
- print layout  
🔴 **测试-分析**print layout，device 有Bug #74406，Bug #74523，Bug #74593，Bug #74598

---

## 五、总结

本 PR 是一个跨 UI + 布局引擎 + 脚本 + 导出系统的全链路布局扩展功能。

核心风险集中在：
- layout 重排一致性
- 多状态同步（design/runtime/script）
- 导出与 device layout 一致性
- tab-child 几何关系稳定性