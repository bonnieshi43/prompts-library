##没覆盖内容
1.和一些属性一起应用，比如 submit on change结合使用 Bug #74159，single selection
## 第一部分：Requirement Summary（需求概要）

- **核心目标**  
为 Selection List 增加“一步单选能力”，通过引入 quick-switch（单选/多选快速切换），避免用户需要“先清空再选择”的两步操作。

- **用户价值**  
  - 提升操作效率（从两次交互 → 一次交互）  
  - 减少 Dashboard 刷新次数（避免双触发）  
  - 提升交互体验（更直观的单选/多选切换）

- **Feature 类型**  
UI + 交互行为 + 性能优化

---

## 第二部分：Implementation Change（变更分析）

### **核心变更**

1. **新增配置属性**
   - `quickSwitchAllowed`（DynamicValue）
   - 支持：
     - XML 序列化 / 反序列化
     - Runtime / Design-time 双值（DValue / RValue）

2. **Property UI 扩展**
   - Selection List Property Dialog 新增 checkbox：
     - `Allow toggle between single and multi-selection`
   - Tree 不支持（UI隐藏 + 强制false）

3. **前端交互增强**
   - 每个 cell hover 时显示按钮：
     - `(Single Select)` / `(Multi Select)`
   - 点击按钮：
     - 触发 mode toggle + 选中当前项（anchor）

4. **交互行为重构**
   - `click(event, switching)`
     - switching=true → 走 quick-switch 路径
     - 不调用 `selectRegion`（避免焦点变化）

5. **移动端支持（核心复杂点）**
   - Long-press（500ms）触发 quick-switch
   - 引入状态机：
     - `touchTimeout`
     - `longPressFired`
     - `suppressNextClick`

6. **事件抑制机制（关键改动）**
   - 防止 long-press 后浏览器合成 click 造成重复触发
   - 在多个入口做防护：
     - `click()`
     - `toggleFolder()`
     - `selectRegion()`

7. **上下文控制**
   - quickSwitchAllowed 生效条件：
     - SelectionList（非 Tree）
     - viewer / preview 模式
     - 非 mobile（按钮）
     - mobile 仅支持 long-press

---

### **目标覆盖度**

| Feature需求 | PR实现情况 |
|------------|-----------|
| 一步单选 | ✅ 已实现（quick-switch） |
| UI支持（radio/切换） | ✅ 按钮替代 radio |
| 性能优化（减少刷新） | ✅ 单次事件 |
| 易用性提升 | ✅ hover + long-press |
| Tree 支持 | ❌ 明确不支持 |

---

### **行为变化对比表**

| Before Behavior | After Behavior | Risk |
|----------------|----------------|------|
| 单选需要 clear + select | 可直接 quick-switch + select | 交互逻辑变化 |
| alt-click 切换模式 | 新增按钮 / long-press | 行为冲突 |
| 点击 always selectRegion | switching 时不触发 | 焦点/键盘行为变化 |
| 无 long-press | 引入复杂状态机 | 移动端 bug 风险 |
| Tree 支持单选逻辑 | 禁止 quick-switch | 不一致行为 |

---

## 第三部分：Risk Identification（风险识别）

1. **Functional**                                               🔴 **测试-分析**：需要测试
   - quick-switch 后 selection 状态是否正确（anchor / clear）
   - toggle 与 toggleAll 逻辑分支错误

2. **UI / Rendering**                                          🔴 **测试-分析**：需要测试
   - hover 按钮显示异常（尤其 virtualization / overflow）
   - tooltip / label 冲突

3. **Interaction / Event**                       🔴 **测试-分析**：需要测试
   - click / long-press / alt-click 冲突
   - 事件冒泡导致重复 selection

4. **Mobile 专项风险**                           🔴 **测试-分析**：需要测试
   - long-press 误触发 / 未触发
   - suppressNextClick 状态残留

5. **Data Consistency**                          🔴 **测试-分析**：需要测试
   - 单选/多选模式切换后 selection list 状态不一致
   - selectFirstItem / submitOnChange 交互

6. **Cross-Module**                      🔴 **测试-分析**：不需要考虑
   - Dashboard 刷新逻辑（是否仍 double trigger）
   - Scheduler / parameter 传递

7. **Compatibility**                     🔴 **测试-分析**：不需要考虑
   - 老 report 未配置 quickSwitchAllowed
   - script / API 未同步支持

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**
  - quick-switch 是否实现“单次操作完成单选”            🔴 **测试-分析**：实现单次操作完成单选
  - selection mode 切换 + 数据状态是否一致             🔴 **测试-分析**：状态一致
  - long-press 与 click 的冲突是否完全被抑制           🔴 **测试-分析**：long-press工作正常

- **高风险路径**
  - mobile long-press → click 合成事件路径              🔴 **测试-分析**：long-press工作正常
  - switching=true vs alt-click 分支                   🔴 **测试-分析**：切换异常Bug #74176
  - Tree vs List 行为差异                              🔴 **测试-分析**：selection tree没实现Bug #74176
  - toggleFolder 与 selection 冲突

- **涉及模块**
  - Selection List
  - Selection Tree（回归）
  - Dashboard refresh / parameter
  - Mobile interaction layer

- **专项检查**
  - **本地化**                                      🔴 **测试-分析**：已加
    - single.switch / multi.switch / tooltip 文本
  - **脚本兼容**                                    🔴 **测试-分析**：Bug #74181
    - quickSwitchAllowed 是否可被 script 读取/设置
  - **文档一致性**                                  🔴 **测试-分析**：Documentation #74055
    - Selection List 行为说明是否更新
  - **配置检查**                                    🔴 **测试-分析**：默认值是false
    - 默认值 false 是否正确（老报表）

---

## 第五部分：Key Test Scenarios (核心测试场景)

---

### **Scenario 1：基础 quick-switch 单选能力**        🔴 **测试-分析**：和预期相同

- **Scenario Objective**                          
验证 quick-switch 是否实现“一步单选”

- **Scenario Description**                        
核心功能验证，替代原两步操作

- **Pre-condition**  
Selection List，启用 quickSwitchAllowed

- **Key Steps**
  1. 选中多个值（multi-select）
  2. 点击某一项的 quick-switch 按钮

- **Expected Result**
  - 模式切换为 single
  - 仅当前项被选中
  - Dashboard 仅刷新一次

- **Risk Covered**
  Functional / Performance

---

### **Scenario 2：multi ↔ single 模式切换正确性**    🔴 **测试-分析**：和预期相同

- **Scenario Objective**  
验证 toggle 行为正确

- **Key Steps**
  1. single → quick-switch → multi
  2. multi → quick-switch → single

- **Expected Result**
  - 模式正确切换
  - anchor item 正确

- **Risk Covered**
  Functional / Data Consistency

---

### **Scenario 3：switching vs normal click 行为差异**   🔴 **测试-分析**：和预期相同

- **Scenario Objective**  
验证 switching=true 不触发 selectRegion

- **Key Steps**
  1. 点击 label（普通点击）
  2. 点击 quick-switch 按钮

- **Expected Result**
  - 普通点击：触发 region select
  - switching：不改变 focus

- **Risk Covered**
  Interaction / Keyboard navigation

---

### **Scenario 4：alt-click 与 quick-switch 冲突**     🔴 **测试-分析**：Bug #74176

- **Scenario Objective**  
验证两种切换方式一致性

- **Key Steps**
  1. 使用 alt-click
  2. 使用 quick-switch

- **Expected Result**
  - 行为一致（toggle / toggleAll）

- **Risk Covered**
  Functional

---

### **Scenario 5：Tree 不支持 quick-switch**      🔴 **测试-分析**：tree也应该支持Bug #74178

- **Scenario Objective**  
验证 Tree 行为隔离

- **Key Steps**
  1. 打开 Selection Tree 属性
  2. 查看 UI + 执行交互

- **Expected Result**
  - 无 quick-switch UI
  - quickSwitchAllowed 始终 false

- **Risk Covered**
  Compatibility / Cross-module

---

### **Scenario 6：hover 按钮显示逻辑**       🔴 **测试-分析**：有些情况重叠 Bug #74106，Bug #74107

- **Scenario Objective**  
验证 UI 渲染

- **Key Steps**
  1. hover cell
  2. 滚动列表 / resize

- **Expected Result**
  - 按钮仅 hover 时显示
  - 不影响布局

- **Risk Covered**
  Rendering

---

### **Scenario 7：mobile long-press 触发 quick-switch** 🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证移动端核心能力

- **Key Steps**
  1. 长按 cell（>500ms）

- **Expected Result**
  - 触发 toggle + selection
  - 行为等同 quick-switch

- **Risk Covered**
  Mobile / Functional

---

### **Scenario 8：long-press 后 click 抑制**       🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证 suppressNextClick

- **Key Steps**
  1. long-press
  2. 释放触发 click

- **Expected Result**
  - 不发生二次 selection

- **Risk Covered**
  Event / Mobile

---

### **Scenario 9：touchcancel / touchmove 边界**     🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证状态清理

- **Key Steps**
  1. touchstart → move / cancel
  2. 再点击

- **Expected Result**
  - 不触发 long-press
  - 无残留 suppression

- **Risk Covered**
  Edge case / Mobile

---

### **Scenario 10：toggleFolder 与 long-press 冲突**    🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证 Tree icon 行为不受影响

- **Key Steps**
  1. long-press
  2. 点击 folder icon

- **Expected Result**
  - 不触发展开/收起（首次）
  - 后续点击恢复正常

- **Risk Covered**
  Cross-module / Event

---

### **Scenario 11：Dashboard 刷新次数验证**          🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证性能目标达成

- **Key Steps**
  1. 原始两步操作
  2. quick-switch 操作

- **Expected Result**
  - quick-switch 仅一次刷新

- **Risk Covered**
  Performance

---

### **Scenario 12：配置持久化与默认值**          🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证 quickSwitchAllowed 配置

- **Key Steps**
  1. 设置 true → 保存 → reload
  2. 老报表打开

- **Expected Result**
  - 配置正确持久化
  - 默认 false

- **Risk Covered**
  Data Consistency / Compatibility

---

### **Scenario 13：viewer / preview / composer 行为**      🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证上下文控制

- **Key Steps**
  1. viewer 模式
  2. preview 模式
  3. composer 模式

- **Expected Result**
  - 仅 viewer/preview 生效

- **Risk Covered**
  Context logic

---

### **Scenario 14：移动端 max-mode 限制**     🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证 mobile guard

- **Key Steps**
  1. mobile 非 max-mode 点击
  2. 进入 max-mode 再操作

- **Expected Result**
  - 非 max-mode 不触发 long-press
  - max-mode 正常

- **Risk Covered**
  Mobile UX

---

### **Scenario 15：多选状态 + quick-switch 边界**    🔴 **测试-分析**：和预期结果相同

- **Scenario Objective**  
验证已有 selection 状态清理

- **Key Steps**
  1. 多选多个值
  2. quick-switch 单选

- **Expected Result**
  - 仅保留一个值
  - 无残留

- **Risk Covered**
  Data Consistency