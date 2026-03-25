# AnnotationBrowser 测试场景分析报告（Full-v2 简化输出模式）

> 组件：`wiz-portal/src/components/AnnotationBrowser.tsx`  
> 现有单测（对照）：`wiz-portal/src/test/AnnotationBrowser.test.tsx`  
> 方法论：`my-docs/前端组件测试场景生成流程-Full-v2.md`（简化输出 + 表格版检查点）

---

## 一、Step 0 摘要（UI Promise / 多入口一致性 / 漏洞扫描）

| 标签 | 发现点 | 风险 |
| --- | --- | --- |
| **[SB/T4f] render 内副作用** | `isMatch()` 在渲染路径 `expanded.add(row.path)`，导致“搜索命中自动展开”不可回收，清空搜索后仍保持展开 | **P0**（状态无法恢复，回归易炸） | 🔴 **测试-分析**: Issue #74319
| **[SB/T4b] async 时序/竞态** | `loadChildren` 在 `await` 后读取 `showDatabase/showWorksheet` 决定写回 DB/WS 树；加载中切换 checkbox 可能导致 children 写回错误树/丢失 | **P0**（竞态/数据错乱） |   🔴 **测试-分析**: 存在bug, pending 验证
| **[SB/持久化契约缺失]** | UI 有 Save，但 `handleSave` 只改内存对象 `row.annotation`，没有持久化请求；刷新可能丢数据 | **P0**（若产品期望持久化） | 🔴 **测试-分析**: edit->save-> refresh page丢失. Issue #74321
| **[SB/disabled 契约]** | Expand 按钮在 `loadingPaths.has(path)` 时 disabled；需验证失败路径也能清理 `loadingPaths`（否则永久不可点） | **P0**（功能阻断） | 
| **[SA/useTransition]** | filterMode 切换使用 `useTransition`，`filterPending` 时 table body 显示 spinner（DB/WS） | P1（中间态一致性/体验） |

---

## 二、规则与风险表（SA/SB → P0/P1/P2）

| 规则ID | 来源 | 规则/风险点（1 句话） | 优先级 |
| --- | --- | --- | --- |
| AB-R1 | SA | 保存后应退出编辑态并显示新注释（UI 更新） | P0 |
| AB-R2 | SA | 清空注释应立即反映到 UI（非编辑态） | P0 |
| AB-R3 | SA | 展开懒加载：加载中禁用按钮 + 成功后出现子节点 + 二次展开走缓存 | P0 |
| AB-R4 | SA | DB 初始加载失败不崩溃（loading 结束，区块仍渲染） | P0 |
| AB-R5 | SA | WS 初始加载：loading/失败表现与 DB 对称 | P0（缺口） |
| AB-R6 | SB/T4b | 展开加载中切换 checkbox 不应导致 children 写回错误树/丢失/卡死 | P0（缺口） |
| AB-R7 | SB/T4f | 清空搜索后应回收由搜索导致的自动展开 | P0（已知缺陷） |
| AB-R8 | SA | 搜索匹配大小写不敏感 | P1 |
| AB-R9 | SA | Filter：Only Annotated/Unannotated 逻辑递归到子节点 | P1 |
| AB-R10 | SA | filterPending 中间态 spinner（DB/WS 均受影响） | P2/P1（视体验重要性） |

---

## 三、现有 Unit 覆盖对账（只标结论）

### 已覆盖（现有 `AnnotationBrowser.test.tsx`）

- **AB-R1**：保存退出编辑态并显示更新值（`[P0-1]`）
- **AB-R2**：Clear 清空注释（`[P0-2]`）
- **AB-R3（缓存）**：二次展开不重复请求（`[P0-3]`）
- **AB-R4**：DB fetch failure 不崩溃（`[P0-4]`）
- **AB-R8**：搜索大小写不敏感（`[P1-4]`）
- **Filter 基本切换**：Only Annotated → All 恢复（`[P2-2]`）；Only Unannotated 命中空注释（`[P1-2]`）

### 已知缺陷哨兵（it.fails）

- **AB-R7**：清空搜索后应收起（当前实现失败）  🔴 **测试-分析**: Issue #74319
- **AB-BUG-01（潜在）**：Save 应持久化（当前实现无 API；是否算 bug 取决于产品期望） 🔴 **测试-分析**:  Issue #74321

### 缺口（建议补充或至少 manual 覆盖）

- **AB-R5**：WS 侧 loading/失败对称性（目前只覆盖 DB）
- **AB-R6**：展开加载中切换 checkbox（竞态/落点/丢失/卡死）
- **Expand 失败路径恢复**：loadChildren reject 后 `loadingPaths` 清理与按钮恢复（当前未覆盖）
- **AB-R10**：filterPending 中间态 spinner 与最终一致性（当前未专门覆盖）

---

## 四、已知缺陷（it.fails）小表

| Bug/哨兵 | Should（期望） | As-is（现状） | 现有覆盖 |
| --- | --- | --- | --- |
| AB-BUG-01：Save 持久化 | Save 应调用后端持久化，刷新后仍保留 | 仅改内存对象属性，无 API | ✅ `it.fails [BUG/T4e] ...`（需确认产品期望） | 🔴 **测试-分析**: Issue #74319
| AB-BUG-02：清空搜索收起 | 清空搜索后应回收自动展开 | render 内 `expanded.add` 不可逆 | ✅ `it.fails [BUG/T4f] ...` | 🔴 **测试-分析**:  Issue #74321

---

## 五、Unit / Manual 对比矩阵（对账缺口用）

| 场景ID | 中文动作名 | 优先级 | Unit是否覆盖 | Manual是否需要 | 备注 |
| --- | --- | --- | --- | --- | --- |
| AB-U-01 | 点击保存注释 | P0 | ✅（含 it.fails） | ✅ | “刷新后仍保留”需 manual/E2E；是否 bug 取决于产品期望 |
| AB-U-02 | 点击清空注释 | P0 | ✅ | 否 | unit 足够 |
| AB-U-03 | 点击展开（懒加载） | P0 | ✅（部分） | ✅ | UI 禁用/子节点出现可 unit；竞态/视觉建议 manual |
| AB-U-04 | DB 初始加载失败 | P0 | ✅ | 否 | unit 足够 |
| AB-G-01 | WS 初始加载 spinner/失败 | P0 | ❌ | ✅ | 对称性缺口（建议补 unit） |
| AB-G-02 | 展开加载中切换 checkbox | P0 | ❌ | ✅ | 竞态/时序，manual 必做 |
| AB-BUG-02 | 清空搜索关键字 | P0 | ✅（it.fails） | ✅ | 缺陷哨兵 + 人工证据链 |

---

## 六、Manual 表格版检查点（可勾选）

> 说明：每行 = 一个可核对的检查点；若需要更细，拆成多行（例如 `AB-M-02a/02b/02c`）。

| 场景ID | 中文动作名 | 优先级(P0/P1/P2) | 入口对象 | 前置条件(P)摘要 | 操作(A)摘要 | 期望结果(E)检查点摘要 | 证据口径（Unit/Manual） | 备注 |
| ------ | ---------- | ----------------- | -------- | --------------- | ----------- | ---------------------- | ------------------------ | ---- |
| AB-M-01 | 清空搜索关键字 | P0 | Search 输入框 | 存在可展开父节点且子节点可命中 | 输入命中关键字→清空 | 清空后应收起自动展开；子节点不可见 | Manual | AB-BUG-02 |
| AB-M-02a | 展开节点（懒加载） | P0 | Expand 按钮 | 节点可展开、children 未加载 | 点击展开 | 加载中 expand disabled | Unit+Manual | |
| AB-M-02b | 展开节点（懒加载） | P0 | Expand 按钮 | 同上 | 点击展开 | loading 小 spinner 出现且结束后消失 | Manual | 视觉检查点 |
| AB-M-02c | 展开节点（懒加载） | P0 | Expand 按钮 | 同上 | 点击展开 | 子节点出现且可继续交互 | Unit+Manual | |
| AB-M-03 | 展开加载中切换区块开关 | P0 | DB/WS checkbox | 已触发 children 请求（加载中） | 加载中关闭再打开 | children 写回正确区块；不丢失；不“永久禁用/卡死” | Manual | SB/T4b 竞态 |
| AB-M-04 | 编辑并保存注释 | P0 | Edit/Save | 目标行存在 | Edit→改值→Save→刷新 | 刷新后仍保留（若产品要求持久化） | Manual | 需确认产品期望 |
| AB-M-05 | WS 初始加载失败/加载中 | P0 | WS 区块 | 断网/注入错误响应 | 打开页面 | WS spinner/失败不崩溃；区块仍可见 | Manual | 对称性缺口 |

---

## 七、缺失信息 / 待确认项（影响 Should 口径）

- **保存注释是否必须持久化到后端？**（决定 AB-BUG-01 是否为真实缺陷）
- **若需持久化：对应 API 的 URL/参数/失败提示/并发策略是什么？**
- **键盘/可访问性期望**：是否要求 ESC/Enter 保存/取消、Tab 顺序等（当前实现未显式支持，测试口径需产品确认）

