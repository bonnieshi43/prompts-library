## 补充测试：
1.正常的格式
eg:yy-MM-dd，yyyy/M/d,MM-DD-YYYY，yyyy-MMM-dd（Bug #74091）
2.不同的分隔符,./-:空格等
eg:dd.MM.yyyy，yyyy, MM ,d,yy:MM:dd
3.不接受格式
eg:yyyy-MM,MM-dd,yyyy-dd,yyyy-MM-dd HH:mm,EEE, MMM d yyyy,yyyy_MM_dd，yyyy|MM|dd
4.输出需要补齐的格式
y-MM-dd，yyy-MM-dd，yyyy-MM-ddd

## 一、需求分析（Requirement Analysis）

### 1. 功能理解与范围

**功能核心目标**  
- 对 **Date 类型的 Combobox**，允许用户在 *属性 > Data tab* 指定“**发送到 query param 的日期字符串格式**”，而不是固定以 `YYYY-MM-DD`（更准确说是 `yyyy-MM-dd`）发送。

**解决的业务问题**  
- 当前用户若需要 `MM-dd-yyyy` 等非默认格式，只能在 Script 中获取 selectedObject 再手工格式化；当参数多时脚本重复、维护成本高、易出错。  
- 在某些客户环境中，API/JSON Query 对日期格式更严格，错误格式会导致请求失败或数据为空。

**涉及模块（从需求与 PR 文件路径综合判断）**  
- **UI/Composer**：Combobox 属性面板（Data tab）新增开关与输入框。  
- **Backend/Model 持久化**：Combobox 组件信息（XML attributes）需要保存/读取格式配置。  
- **查询参数生成/变量替换**：query 构造时把变量值（Date）按指定 pattern 序列化。  
- **运行时输入处理**：选中值写入 VariableTable 时要同步该变量的“格式策略”。

**功能类型**  
- Feature（UI + 数据模型 + 查询参数序列化链路的跨层改动）

---

### 2. 需求清晰度与完整性（存在的关键不确定点）

**(1) “Combobox 显示格式” vs “Query Param 格式” 的优先级/关系未定义**  
- 需求提到 combobox 已设置显示格式 `MM/dd/yyyy`，但 query 仍是 `YYYY-MM-DD`。  
- 新功能是新增一个“query param format”，但未说明：  
  - 若用户不填，是否应自动沿用显示格式？还是继续默认 `yyyy-MM-dd`？         🔴 **测试-分析**：默认yyyy-MM-dd
  - 是否允许两者不同（PR 看起来允许不同，这是合理的，但需求没明确边界）。

**(2) Date/Datetime/TimeZone 语义未定义**  
- 需求示例是 “year=2022-01-04” 这种 **日期**。但系统内 Date 值可能是：  
  - `java.util.Date`（含时分秒/时区影响）  
  - `java.sql.Date`（纯日期）  
  - Timestamp/Instant（更复杂）  
- 需求未定义：当值带时间时，query 参数应只取日期部分还是包含时间？             🔴 **测试-分析**：不支持时间格式，输入显示warning

**(3) 对非法 pattern 的期望行为未定义**  
- 应该：禁止保存？保存但回退默认？提示并阻止关闭弹窗？  
- 需求只说“允许指定格式”，没定义异常策略，这会直接影响测试判定标准。           🔴 **测试-分析**：弹提示 Bug #74085

---

### 3. 测试风险识别（需求侧）

**跨模块影响风险（高）**  
- 改动链路贯穿：Composer UI → 后端 AssemblyInfo 持久化 → 运行时 VariableTable → 查询变量替换（XUtil.replaceVariable）。任一环节断链都会出现“UI 设了但 query 仍旧默认”的静默失败。

**状态一致性风险（高）**    🔴 **测试-分析**： 用户勾选/取消勾选后，旧格式不会残留
- 用户勾选/取消勾选后，旧格式是否会残留影响后续请求（PR 中已出现“取消后需要清理 stale entry”的修复提交，说明这是现实风险）。

**兼容性风险（中-高）**     🔴 **测试-分析**： 老case用默认值yyyy-MM-dd
- 老报表/老 viewsheet 在升级后：  
  - 新属性缺省值如何处理？  
  - XML 中没有 dateFormatPattern 时是否稳定落到 `yyyy-MM-dd`？  
  - 是否会影响非 combobox 或非 date 变量的替换逻辑？

**时区/日期边界风险（中）**  🔴 **测试-分析**：和之前逻辑一样，选择timezone日期是浏览器日期，不选是服务器日期，无影响
- 如果内部 Date 值接近 00:00，按 systemDefault 转 LocalDate 可能跨日，导致 query 参数日期偏差（尤其服务器时区与数据源时区不一致时）。

---

## 二、实现分析（Implementation Analysis）

### 1. 改动类型（Change Type Identification）

**性质**：Feature + 少量防回归修复（从 commit message 可见对 review 反馈进行了 bugfix）  
**影响层级**：跨层（UI + 后端模型 + 查询变量替换 + 运行时服务）

**可能受影响的系统行为/用户路径（重点）**     🔴 **测试-分析**：必须测试
1) Composer 中编辑 Combobox 属性（Data tab）并保存到 viewsheet  
2) 运行时选择 Combobox 日期值 → 触发 query/刷新 → URL query param 生成  
3) 取消该功能后再次刷新（确保恢复默认格式并不残留）  
4) Combobox 绑定 variable 的不同来源路径（VariableAssembly / merged variable list 等分支；PR 特别修过一处“else 分支遗漏 apply”的 bug）

---

### 2. 需求实现一致性（基于可见 patch 的端到端链路核对）

**(A) UI：提供可配置入口**  
- `data-input-pane.component.html`：新增 checkbox “Format Date Values Sent to Query”，勾选后显示输入框，输入框 placeholder 为 “Query Date Format”。  
- `combobox-property-dialog.component.html`：向 `<data-input-pane>` 传入 `[comboBox]="true"`，说明该 UI 只对 combobox 场景出现。  
- `data-input-pane.component.ts`：前端做 pattern 校验并显示 “Invalid Date Format”。

**一致性结论**：满足“无需脚本即可设置 query param 格式”的入口要求。

**(B) 后端模型 & 持久化：能保存/读取配置**  
- `ComboBoxVSAssemblyInfo`：新增 `queryDateFormat`、`dateFormatPattern`，并在 `writeAttributes/parseAttributes/copyViewInfo` 中处理；pattern 写 XML attribute 时做了 `Tool.encodeHTMLAttribute`。  
- `ComboboxPropertyDialogController`：get model 时把 AssemblyInfo 的值回填到 DataInputPaneModel；set 时会用 `DateTimeFormatter.ofPattern()` 在服务端校验，非法则回退 `yyyy-MM-dd`。  
- `DataInputPaneModel`（Java）与 `data-input-pane-model.ts`（TS）同步新增字段。

**一致性结论**：具备配置的保存、回显与服务端兜底校验；避免“只靠前端 flag”被信任。

**(C) 运行时：把“变量名→格式”关联到 query 构造**  
- `VariableTable`：新增 `formats` map + put/get/removeFormat；clone/addAll 复制 formats，避免共享/丢失。  
- `ViewsheetSandbox` 与 `VSInputService`：在把变量值 `vt.put(varName, value)` 后调用 `applyComboBoxDateFormat()`：  
  - `isQueryDateFormat()` true → `vt.putFormat(varName, pattern)`  
  - false → `vt.removeFormat(varName)`（清 stale）  

**一致性结论**：实现了“针对某个变量名配置 query date format”的运行时状态传播。

**(D) Query param 生成：真正按 pattern 输出**  
- `XUtil.replaceVariable`：当 `vars.getFormat(varName) != null` 且 `obj instanceof Date`：  
  - 用 `DateTimeFormatter.ofPattern(pattern)`  
  - `java.sql.Date` → `toLocalDate().format(formatter)`  
  - `java.util.Date` → `Instant -> ZoneId.systemDefault() -> LocalDate -> format`  
  - 异常 catch → 回退 `obj.toString()`  

**一致性结论**：确实改变了“Date 变量替换成字符串”的逻辑，从而影响最终 query param。

---

### 3. 关键实现风险（只列可能导致回归/系统问题的点）

#### 风险 1：`java.util.Date` 被强制截断为 **LocalDate**（可能改变既有语义）
- **风险来源**：`XUtil.replaceVariable` 中对 `java.util.Date` 走 `toLocalDate()`，丢弃时间部分。  
- **影响模块/路径**：任何使用 replaceVariable 生成 query 的场景，只要变量值是 `java.util.Date`（可能包含时间）。  
- **潜在后果**：  
  - 原先 `obj.toString()`（或其它格式化链路）可能包含时间或不同日期（受时区影响），现在变为纯日期字符串；  
  - 若某些 query param 需要 datetime（即使 combobox 是 date type，也可能绑定 timestamp），将产生不兼容。

#### 风险 2：时区选择 `ZoneId.systemDefault()`（服务器时区依赖）
- **风险来源**：对 `java.util.Date` 的 LocalDate 转换使用 systemDefault。  
- **影响模块/路径**：服务器部署在非预期时区、或容器时区变更时；跨日边界（UTC 与本地）会导致日期偏移。  
- **潜在后果**：同一份报表在不同环境输出不同 query 日期，属于隐蔽且高成本问题。

#### 风险 3：前端校验规则与后端 `DateTimeFormatter` 规则不一致（“UI 判错/判漏”）
- **风险来源**：前端用正则 `allowed/required` + DatePipe transform 做启发式校验；后端用 `DateTimeFormatter.ofPattern()`。  
- **影响模块/路径**：用户输入某些 pattern：  
  - 前端拦截但后端其实可接受（用户体验问题）  
  - 前端放行但后端回退默认（配置保存后与期望不一致，属于功能失败）  
- **潜在后果**：客户以为设置成功，实际 query 仍用默认，回归到原痛点。

#### 风险 4：格式应用时机依赖“值写入 VariableTable 的路径完整覆盖”
- **风险来源**：applyComboBoxDateFormat 只在 `ViewsheetSandbox`/`VSInputService` 某些分支调用；commit message 已出现过一次遗漏 else-branch 的 bug。  
- **影响模块/路径**：combobox 绑定 worksheet variable / viewsheet variable / merged variable list 等不同来源。  
- **潜在后果**：部分数据源/绑定方式下功能失效，且可能无明显错误提示（silent drop）。

#### 风险 5：异常处理吞掉错误导致“失败不易发现”
- **风险来源**：`XUtil.replaceVariable` catch(Exception) 后回退 `obj.toString()`，无日志/无告警。  
- **影响模块/路径**：pattern 实际非法（或在某些 locale/字符下失败）时。  
- **潜在后果**：生产环境悄悄变回旧格式或不可控格式，定位困难。

---

## 三、测试设计（Test Design）

### 3.1 风险驱动测试策略

**核心风险**  
1) 配置链路断裂：UI 设置了但 query param 未按配置输出       🔴 **测试-分析**：UI 设置了 query param 按配置输出
2) 取消勾选后 stale format 未清理，导致后续仍按旧格式输出   🔴 **测试-分析**：取消勾选后 stale format 清理
3) 不同变量来源路径导致格式不生效（已出现过修复历史）        🔴 **测试-分析**：只有对query的变量生效，其它变量不生效
4) pattern 校验前后端不一致导致保存值与运行时输出不一致      🔴 **测试-分析**：保存值与运行时输出不一致 
5) Date 与 timezone/时间截断导致日期偏移或语义变化          🔴 **测试-分析**：和之前逻辑一样，选择timezone日期是浏览器日期，不选是服务器日期，无影响

**策略**  
- 以“**最终 query URL/请求参数**”作为最强验收点（而不是仅看 UI 或模型字段）。  
- 对每条变量绑定路径做最小覆盖（至少覆盖 VariableAssembly 与 merged variable list 这两条）。  
- 对 toggle（启用/禁用）做状态机测试，确保 removeFormat 生效。  
- pattern 校验做“双端一致性”用例：前端提示、保存后回显、运行时输出一致。

---

### 3.2 必要测试类别

#### 功能验证（Functional）          🔴 **测试-分析**：功能按照预期工作
- **Why**：该需求的价值完全体现在 query param 字符串是否按 pattern 输出。  
- **Scope**：Composer 属性编辑 + 运行时选择日期 + 触发 query。  
- **Validation Goal**：  
  - 启用后：URL 参数严格等于指定格式  
  - 禁用后：恢复默认 `yyyy-MM-dd`  
  - 保存/回显一致

#### 回归测试（Regression）         🔴 **测试-分析** 不启用该功能时，原有 date param 行为保持；非 Date 变量不受影响。 
- **Why**：XUtil.replaceVariable 改动可能影响所有变量替换逻辑。  
- **Scope**：不启用该功能时，原有 date param 行为保持；非 Date 变量不受影响。  
- **Validation Goal**：确保新增 formats map 不影响原变量替换、不会对其它参数产生意外格式化。

#### 边界与异常（Boundary）        🔴 **测试-分析** UI 错误提示符合预期，后端保存后回显值与实际输出一致
- **Why**：pattern 校验与异常吞掉会造成“静默回退”。  
- **Scope**：非法 pattern、空 pattern、包含引号/字面量、单字符 token（M/d）等。  
- **Validation Goal**：  
  - UI 错误提示出现与否符合预期  
  - 后端保存后回显值与实际输出一致（尤其是回退默认场景）

#### 兼容性测试（Compatibility）   🔴 **测试-分析** 旧资产加载后不出现异常 UI/保存异常；默认行为稳定
- **Why**：老 viewsheet 升级后 parseAttributes 的缺省逻辑与 UI 默认值可能影响行为。  
- **Scope**：不含新属性的旧文件加载；不同浏览器。  
- **Validation Goal**：旧资产加载后不出现异常 UI/保存异常；默认行为稳定。

#### 自动化测试建议
- **Unit（后端）**：对 `XUtil.replaceVariable` 增加用例：  
  - vars.getFormat(varName)=pattern 且 obj 为 java.sql.Date/java.util.Date  
  - pattern 非法时回退行为（至少断言不抛异常，且输出可预期）  
- **Integration（后端服务）**：对 `ComboboxPropertyDialogController.set...`：非法 pattern 保存后 AssemblyInfo pattern 是否回退 `yyyy-MM-dd`。  
- **E2E**：最少 2 条：启用自定义格式、取消启用恢复默认（验证最终请求 URL）。

---

## 四、关键测试场景（Key Test Scenarios）

### 场景 1：启用自定义 query 日期格式后，URL 参数按 pattern 输出（核心验收） 🔴 **测试-分析** 结果和预期匹配
- **Scenario Objective**：验证端到端链路（UI→保存→运行时→query param）真正生效  
- **Scenario Description**：Combobox 为 Date 类型，设置 queryDateFormat=true，pattern=`MM-dd-yyyy`，选择 `2022-01-04`  
- **Key Steps**：  
  1. Composer 打开某 viewsheet，放置 Date 类型 Combobox，并绑定到 query 参数（例如 `year`）。  
  2. Combobox 属性 > Data tab：勾选 “Format Date Values Sent to Query”，输入 `MM-dd-yyyy`，保存。  
  3. 运行时选择日期 **2022-01-04**，触发 query（刷新/执行）。  
  4. 抓取实际 HTTP 请求（Network/服务器日志），检查 URL query string。  
- **Expected Result**：请求参数为 `year=01-04-2022`（或等价编码结果），而不是 `2022-01-04`  
- **Risk Covered**：配置链路断裂；applyComboBoxDateFormat 未调用；XUtil 未按 format 替换

---

### 场景 2：取消勾选后必须恢复默认格式且不残留（stale format 清理）     🔴 **测试-分析** 结果和预期匹配
- **Scenario Objective**：验证 `removeFormat(varName)` 能清除旧状态  
- **Scenario Description**：先启用并成功格式化，再取消启用并再次触发 query  
- **Key Steps**：  
  1. 按“场景1”设置并验证 `MM-dd-yyyy` 生效。  
  2. 回到属性面板，取消勾选“Format Date Values Sent to Query”，保存。  
  3. 运行时重新选择同一日期或触发刷新。  
  4. 抓包/日志查看 URL 参数。  
- **Expected Result**：参数恢复为默认 `yyyy-MM-dd`���即 `2022-01-04`），且不再输出 `01-04-2022`  
- **Risk Covered**：状态一致性；stale entry 持久存在导致“关了仍生效”的隐蔽 bug

---

### 场景 3：非法 pattern 的“提示 + 保存后回退 + 运行时输出一致性”       🔴 **测试-分析** 输入非法pattern应该不能保存，不会走到后端。Bug #74085
- **Scenario Objective**：验证前端校验与后端兜底一致，不出现“UI 看似通过但实际回退”的静默失败  
- **Scenario Description**：输入非法 pattern（例如 `yyyy-MM-QQ` 或包含不被允许的字母），观察 UI 与保存后的实际行为  
- **Key Steps**：  
  1. 勾选功能，输入一个**后端 DateTimeFormatter 明确会抛 IllegalArgumentException** 的 pattern（如 `yyyy-MM-QQ`）。  
  2. 观察 UI 是否出现 “Invalid Date Format”。  
  3. 保存并重新打开属性面板，检查 pattern 字段回显值。  
  4. 运行时触发 query，抓包观察参数格式。  
- **Expected Result**：  
  - UI 出现错误提示（或至少保存后回显应变为 `yyyy-MM-dd`）  
  - 运行时输出与回显一致（应为默认 `yyyy-MM-dd`）  
- **Risk Covered**：前后端校验不一致；异常吞掉导致 silent fallback

---

### 场景 4：包含字面量/引号的 pattern（客户常见：固定前缀/分隔符）    🔴 **测试-分析**格式无效，ui处理了不会走到后端
- **Scenario Objective**：覆盖前端允许 `'` 且后端 DateTimeFormatter 同样支持的情况  
- **Scenario Description**：pattern=`yyyyMMdd'Z'` 或 `MM'/'dd'/'yyyy`（根据产品支持范围选择）  
- **Key Steps**：  
  1. 启用功能，输入带引号字面量的 pattern。  
  2. 保存、回显。  
  3. 运行时选择日期，抓包校验。  
- **Expected Result**：输出包含字面量且日期部分正确（例如 `20220104Z`）。  
- **Risk Covered**：前端 allowed 正则/DatePipe transform 与后端 formatter 对引号处理差异

---

### 场景 5：Combobox 变量解析路径差异（VariableAssembly vs merged variable list）🔴 **测试-分析** 结果和预期匹配
- **Scenario Objective**：验证 applyComboBoxDateFormat 在所有变量查找分支都执行（PR 历史修过遗漏）  
- **Scenario Description**：构造两种绑定方式：  
  - A：直接 VariableAssembly 命中  
  - B：通过 worksheet/viewsheet variable 的 merged list 命中  
- **Key Steps**：  
  1. 在两种绑定方式下分别启用相同 pattern。  
  2. 运行时选择日期触发 query，抓包。  
- **Expected Result**：两种方式都按 pattern 输出。  
- **Risk Covered**：分支覆盖不全导致部分场景功能失效（silent drop）