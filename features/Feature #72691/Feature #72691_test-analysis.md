# 遗漏测试内容
1.设置了属性后组织copy Bug #74075
2.不同组织设置不同的值的应用
3.properties 的auto-complete

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

**核心目标**  
用户在组件脚本较长（需要滚动）时，关闭并重新打开 Properties → Script tab，脚本编辑器应默认定位到**脚本顶部**，而不是当前的“打开即在底部”。

**解决的业务问题**  
- “重新打开脚本面板时停留底部”会导致用户每次都要手工滚回顶部，影响编辑效率，尤其是脚本头部包含 import/全局变量/函数定义等关键内容时。

**涉及模块/层次**
- **UI**：Script pane（Angular + CodeMirror）打开时的光标/滚动定位策略。
- **Backend / Config**：新增配置项 `script.cursor.top` 及读取接口（控制默认定位到顶部还是底部）。
- **Script 编辑体验**：属于交互行为/默认行为调整（不是脚本执行引擎逻辑变更）。

**功能类型**
- UI 行为修正 + 可配置化（Feature/Behavior change）

---

### 2. 需求清晰度与完整性（存在关键不清晰点）

**(1) “顶端”的定义不完整**  
需求描述为“open at the top of the script”，但 CodeMirror 有至少 3 个相关概念：      🔴 **测试-分析**：顶部是光标位置
- 光标位置（cursor）
- 视口滚动位置（scroll/viewport）
- 选区/焦点（selection/focus）

若仅设置 cursor=0,0，不一定保证视口回到顶部（取决于 CodeMirror 是否自动滚动到光标、以及调用时机）。

**(2) 与“记住上次位置”潜在冲突未说明**  
很多编辑器会在 reopen 时恢复上次编辑位置；需求希望“始终顶端”还是“仅首次打开顶端、再次打开恢复上次位置”？未说明。 🔴 **测试-分析**：暂时不需要考虑

**(3) 触发条件边界不清**                     🔴 **测试-分析**：触发条件打开script tab
“关闭并打开 Properties > Script tab”——这里的“关闭”可能是：
- 关闭属性对话框（destroy component）
- 仅切换 tab（组件仍在内存）
- 关闭 script pane（折叠/隐藏）

不同生命周期会影响 CodeMirror 初始化时机与滚动行为。

**(4) 是否对所有脚本编辑器生效不明确**  
仅提“component script pane”，但系统中可能存在多个脚本入口（如全局脚本、事件脚本、计算字段脚本等）。需求未声明作用范围。 🔴 **测试-分析**：目前只影响了component script pane，Calculated Field，vs Formula Editor dialog，model expression；option script pane，worksheet没有鼠标Bug #74077,Bug #74084

---

### 3. 测试风险识别（与需求直接相关的风险）

**(1) 行为误解风险：cursor ≠ scroll**  🔴 **测试-分析**：scrollbar也到了top
实现若只移动 cursor，但不控制 scroll，用户仍可能看到底部（尤其在异步渲染、虚拟滚动、lint 标记渲染后视口跳动）。

**(2) 跨模块影响：新增后端 API + 配置项**     🔴 **测试-分析**：scrollbar也到了top
- 配置读取失败/权限拦截/相对路径错误会导致前端拿不到值，从而回落到旧逻辑（底部）。
- 多环境（默认配置、客户自定义配置）差异会导致行为不一致。

**(3) 状态一致性/生命周期竞态**             🔴 **测试-分析**：不会造成“先到顶再跳到底”/“闪动
Script pane 可能在 CodeMirror 实例创建前/后多次触发 `setCursor`，或在渲染 lint/analysis 结果后再次滚动定位，造成“先到顶再跳到底”/“闪动”。

**(4) 兼容性风险：默认值改变预期**   🔴 **测试-分析**：Bug #74071需要重启
PR 引入 `script.cursor.top=false`（默认仍是底部）。如果产品层面期望“统一改为顶端”，那么默认值会导致需求未真正解决（需明确是否要客户显式开启）。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

**改动性质：Feature（可配置的行为变更）**  
- 新增系统属性 `script.cursor.top`
- 新增后端 REST 接口读取该属性
- 前端 ScriptPane 根据该配置决定打开后将光标置顶或置底

**影响层级**
- **UI 层**：ScriptPane（光标定位策略）
- **Backend**：Controller 新增 endpoint
- **配置层**：defaults.properties 新增默认项  
- 属于“跨层”变更（前端依赖后端配置）

**可能受影响的用户路径**
- 打开/关闭 Properties 对话框后进入 Script tab
- 任何复用该 ScriptPane 组件的入口（若同组件用于其他脚本场景，也会一并改变）

---

### 2. 需求实现一致性（是否支撑需求目标）

结合可见 patch，PR 的关键逻辑是：

- 后端新增：  
  - `GET /api/composer/viewsheet/script-cursor-top` → 返回 `Boolean.parseBoolean(SreeEnv.getProperty("script.cursor.top"))`
- 默认配置：  
  - `script.cursor.top=false`
- 前端：  
  - `ScriptSettingsService.isCursorTop()` 调用 `../api/composer/viewsheet/script-cursor-top` 并缓存  
  - ScriptPane 初始化时读取该值赋给 `cursorTop`  
  - 在某处（疑似 CodeMirror 初始化完成后）：  
    - `if cursorTop` → `setCursor({line:0, ch:0})`  
    - `else` → `setCursor({line: lineCount(), ch: getLine(lastLine).length})`

**一致性判断**   🔴 **测试-分析**不需要考虑
- 它提供了“打开时定位到顶部”的能力，但前提是 **script.cursor.top 被设置为 true**。
- 需求原文是“User would like it to open at the top”，并未提“通过属性开关控制”。因此存在两种偏差可能：  
  1) **实现是“可选特性”**（默认仍旧到底部），在未开启开关时不满足需求；  
  2) 如果产品策略就是“通过属性让客户选择”，则实现与需求的“最终用户期望”存在沟通缺口，需要在需求中明确“默认值/配置方式”。

**额外需要关注：实现是否真的让‘视口’到顶部** 🔴 **测试-分析**scrollbar也到了顶部
- 只看到 `setCursor`，未看到显式 `scrollTo` 或 `setScrollTop(0)`。
- CodeMirror 通常会滚动光标进可视区，但在复杂渲染/虚拟滚动场景下不保证稳定，属于潜在不完整实现点。

---

### 3. 关键实现风险（可能导致系统问题或回归）

#### 风险 1：前端读取配置的时序导致“打开后仍在底部”   🔴 **测试-分析** Bug #74071
- **来源**：`cursorTop` 初始为 `false`，`ngOnInit()` 中异步 subscribe 后才更新；而 `setCursor` 发生在另一个生命周期钩子/初始化流程中（patch 片段显示在较后位置，但无法确认其触发时机）。
- **影响路径**：首次打开 Script pane（缓存未命中）时，可能先按 `false` 走到底部，待接口返回后不会重新触发置顶。
- **后果**：配置为 true 但用户仍看到底部；“偶现/只在首次打开失败”这类问题很难定位。

#### 风险 2：cursor 设置到底部可能存在 off-by-one / API 使用不一致     🔴 **测试-分析** 无异常
- **来源**：旧逻辑使用 `lineCount()` + `lastLine().length`；新逻辑使用 `lineCount()` + `getLine(lastLine()).length`。  
  - CodeMirror `lineCount()` 返回行数，行号是 0-based，最大行号通常是 `lineCount()-1`。
- **影响路径**：当 `cursorTop=false` 时的旧行为（置底）可能被破坏（报错/光标到不存在行/定位异常）。
- **后果**：影响所有未开启 `script.cursor.top` 的默认用户（因为默认值是 false）。

#### 风险 3：新增后端 endpoint 的安全/会话约束不明确   🔴 **测试-分析** 无异常
- **来源**：`/api/composer/viewsheet/script-cursor-top` 暴露配置读取；未看到权限注解/认证要求（可能由全局拦截器统一处理，但此处不可见）。
- **影响路径**：未登录/权限不足访问 composer API 时，前端请求失败，可能导致脚本面板异常或 fallback 行为不可预期。
- **后果**：前端报错、阻断脚本面板初始化、或出现控制台异常噪声。

#### 风险 4：配置默认值与需求期望不一致引起“交付落差”          🔴 **测试-分析**无需考虑
- **来源**：`defaults.properties` 设置 `script.cursor.top=false`。
- **影响路径**：客户升级后仍旧体验到底部，认为需求未实现。
- **后果**：验收失败/回归缺陷（实际是“默认值策略”问题）。

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

**核心风险**  
1) **异步配置加载 vs 光标设置时机**（首次次打开是否能正确置顶）  🔴 **测试-分析** Bug #74071
2) **置底逻辑回归**（默认 false 情况下是否还稳定地置底，且不报错）  🔴 **测试-分析**默认情况正确
3) **cursor 与 scroll 一致性**（是否真正展示顶部，而不仅仅是 cursor=0,0）  🔴 **测试-分析**cursor 与 scroll 一致
4) **接口失败的降级行为**（网络失败/权限失败时是否导致脚本面板不可用或行为异常）🔴 **测试-分析**无需考虑权限

**影响范围**  
- 所有打开 Script pane 的入口，尤其是“关闭/重开 Properties”这条路径（需求复现路径）。🔴  **测试-需要全面覆盖**

**是否改变默认行为**  
- 从配置文件看默认仍旧走“置底”；但代码逻辑有变更，仍需验证旧默认行为未被破坏。🔴 **测试-分析**默认行为保持旧逻辑

**是否影响历史配置**  
- 引入新属性，客户若已有同名属性（或配置系统对未知 key 的处理）需验证兼容；至少要验证“未配置该 key 时”的行为。🔴 **测试-分析**不影响历史配置

---

### 3.2 必要测试类别

#### 功能验证（Functional）   🔴 **测试-分析** Bug #74071
- **Why**：验证需求核心：重新打开脚本面板时视图应在顶部（在开关开启时）。  
- **Scope**：ScriptPane + 配置读取链路（前端 service → 后端 endpoint → defaults/custom props）。  
- **Validation Goal**：顶部定位对用户可见，且稳定不闪动/不回跳。

#### 回归测试（Regression）   🔴 **测试-分析**正确
- **Why**：默认值 false 的情况下，系统仍应维持原本“置底”体验；且新实现可能引入 off-by-one。  
- **Scope**：cursorTop=false 分支下 setCursor 行列计算；长脚本、多行、空行等。  
- **Validation Goal**：无异常、定位到最后一行末尾、滚动位置与光标一致。

#### 边界与异常（Boundary）  🔴 **测试-分析**正确
- **Why**：定位逻辑对脚本内容形态敏感（空脚本、单行、超长行、末尾换行）。  
- **Scope**：不同脚本长度/行数/结尾字符；首次打开 vs 再次打开（缓存命中）。  
- **Validation Goal**：不报错；定位正确；首次打开也生效（避免异步时序问题）。

#### 兼容性测试（Compatibility）🔴 **测试-分析**正确
- **Why**：脚本编辑器是强交互组件，浏览器滚动与焦点行为差异明显。  
- **Scope**：至少覆盖 Chrome/Edge（如产品支持 Firefox/Safari 也应纳入）。  
- **Validation Goal**：顶部定位在不同浏览器一致；无“聚焦后跳动”。

#### 自动化测试建议（仅与本改动强相关）
- **Unit（Angular）**：对 `ScriptSettingsService.isCursorTop()`：
  - 缓存逻辑：首次调用走 `modelService.getModel`，再次调用直接返回 cached `of(value)`
  - 接口失败时（Observable error）ScriptPane 如何处理（需要看现有代码是否 catch；若没有，建议补测并推动实现加兜底）
- **Integration/E2E**：模拟打开 Properties → Script tab：
  - 配置 true 时，断言 CodeMirror 首行可见/scrollTop 接近 0
  - 配置 false 时，断言最后行可见/scrollTop 接近底部

---

## 四、关键测试场景（Key Test Scenarios）

### 场景 1：开启 script.cursor.top 后，重开脚本面板应展示顶部（核心验收）🔴 **测试-分析**正确
- **Scenario Objective**：验证需求主路径在配置开启时可见地生效。  
- **Scenario Description**：长脚本（足够滚动），关闭并重新打开 Properties → Script tab。  
- **Key Steps**
  1. 将 `script.cursor.top=true`（通过产品支持的方式：环境配置/系统属性/配置文件覆盖 defaults）。
  2. 打开某组件 Properties → Script，粘贴/生成 200+ 行脚本，滚动到中部或底部。
  3. 关闭 Properties（或切换到其他面板再返回，按产品实际“reopen”定义）。
  4. 再次��开 Properties → Script tab。
- **Expected Result**
  - 编辑器视口顶部显示脚本第 1 行附近（首行可见）。
  - 光标在 (0,0) 或至少在首行区域；页面无明显“先到顶再跳到底”的闪动。
- **Risk Covered**：需求实现一致性、cursor/scroll 一致性、生命周期竞态。

### 场景 2：首次打开（缓存未命中）也必须置顶（异步时序风险）🔴 **测试-分析**正确
- **Scenario Objective**：捕获“cursorTop 默认 false，接口返回 true 但已完成 setCursor”的问题。  
- **Scenario Description**：清空前端缓存/刷新页面后直接进入 Script tab。  
- **Key Steps**
  1. 配置 `script.cursor.top=true`。
  2. 刷新浏览器（确保 Angular 服务缓存重置）。
  3. 直接打开 Properties → Script tab（不经过其他会触发该 service 的入口）。
- **Expected Result**
  - 第一次进入就位于顶部；不是第二次才生效。
- **Risk Covered**：配置加载异步导致首次失败。

### 场景 3：默认行为回归（script.cursor.top=false 时仍可稳定置底）🔴 **测试-分析**正确
- **Scenario Objective**：确保默认用户不受破坏（因为 defaults.properties 设为 false）。  
- **Scenario Description**：长脚本 reopen 后仍定位底部，且不出现异常。  
- **Key Steps**
  1. 保持 `script.cursor.top=false`（或不配置该项，走默认）。
  2. 创建长脚本并 reopen Script tab。
- **Expected Result**
  - 视口在底部（最后几行可见）。
  - 光标在最后一行末尾；控制台无异常（重点关注 setCursor 行号是否越界）。
- **Risk Covered**：off-by-one、默认路径回归。

### 场景 4：边界脚本内��（空脚本/单行/末尾换行）  🔴 **测试-分析**正确
- **Scenario Objective**：验证 setCursor 在边界内容下不报错且定位合理。  
- **Scenario Description**：脚本内容为：空、仅 1 行、最后带换行导致“最后一行为空行”。  
- **Key Steps**
  1. 分别准备三种脚本内容。
  2. 在 `cursorTop=true` 与 `false` 两种配置下分别 reopen。
- **Expected Result**
  - 不出现 setCursor 异常；
  - `cursorTop=true` 总是落在首行；
  - `cursorTop=false` 落在“最后可编辑位置”（如果最后行为空行，也应能接受，但不能越界）。
- **Risk Covered**：边界条件、最后行长度计算差异。

### 场景 5：后端接口不可用/返回异常时的降级体验     🔴 **测试-分析**忽略场景
- **Scenario Objective**：验证新增 API 对脚本面板可用性的影响。  
- **Scenario Description**：模拟请求 `/api/composer/viewsheet/script-cursor-top` 失败（401/403/500/网络断开）。  
- **Key Steps**
  1. 使用代理/Mock/断网/权限账户，使该请求失败。
  2. 打开 Properties → Script tab。
- **Expected Result**
  - Script pane 仍可打开并可编辑；
  - 行为应可预测（通常应回落到默认置底或保持现状），且不应导致页面崩溃/阻塞渲染。
- **Risk Covered**：跨层依赖导致 UI 不可用、异常未处理导致回归。




