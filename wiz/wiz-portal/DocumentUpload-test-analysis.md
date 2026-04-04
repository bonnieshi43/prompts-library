# DocumentUpload 测试分析报告

> 基于 `Front end testing scenario-v5.md` 与 `unit-test-techniques-supplement.md` 的方法论生成
> 组件路径：`wiz-portal/src/components/DocumentUpload.tsx`
> 测试文件：`wiz-portal/src/test/DocumentUpload-v2.test.tsx`

---

## 一、方法论演进背景

### 原始 v3 的局限

原始方法论（Step 1–7）从**组件代码本身**提取规则，属于自我验证循环：

```
组件代码有 Bug
    ↓
从代码读规则 → 规则也是 Buggy 的
    ↓
按 Buggy 规则写测试
    ↓
测试通过 ✅（但 Bug 依然存在）
```

**结论**：原始方法论是优秀的**回归测试设计工具**，但不是**Bug 发现工具**。

### 引入 Step 0 后的升级

加入 Step 0（Source B — UI Contract Analysis）后，规则来源扩展为双轨：

| 来源 | 内容 | 目的 |
|------|------|------|
| Source A（代码） | 组件实际做了什么 | 防止回归 |
| Source B（UI 契约 + 实现扫描） | 组件承诺了什么 / 实现内部有什么隐患 | 发现偏差与未知 Bug |

**SA ≠ SB 的部分 = Bug 候选，自动标记 Risk = 3**

---

## 二、Step 0 分析结果

### Technique 1：UI Promise Extraction

| 信号 | 代码位置 | 承诺 | 代码是否兑现 |
|------|---------|------|------------|
| `accept=".txt,.pdf,.docx,.doc,.md,.html,.yaml,.yml,.json"` | line 251 | 仅接受这些格式，所有路径均需执行 | ❌ `applyFile` 无格式检查 |
| `// Reset form` 注释 | line 124 | 所有状态被重置 | ❌ `<input>.value` DOM 状态未清空 |
| `disabled={!isFormValid()}` | line 317 | file + title.trim() 同时满足才启用 | ✅ 逻辑正确，需测边界 |
| `{file ? 'Already selected:...' : 'Or drag and drop...'}` | line 264 | 所有选文件路径均更新文字 | ✅ 两路径均调用 applyFile |

### Technique 2：Cross-Path Symmetry Check

```
Goal: 选文件
  Path A → <input type="file"> onChange  →  浏览器按 accept 过滤 ✅
  Path B → onDrop                        →  直接进 applyFile，无任何格式检查 ❌

Gap: Path B 完全绕过 accept 声明的格式约束 → Bug #74288 确认
```

### Technique 3：Full-Stack State Audit

```
upload() 成功后 "Reset form"：
  React state : setFile(null)       ✅
  React state : setFormData({...})  ✅
  DOM state   : <input type="file">.value  ❌ 未清空（无 ref 操作）

结果：再次选同一文件，onChange 不触发 → Bug #74289 确认
```

### Technique 4：Implementation Vulnerability Scan

#### 4a — 错误路径 null 引用

```tsx
// handleDelete (line 145–149)
if (response.data?.success) {          // ?. 说明 data 可能为 null
   setDocuments(documents.filter(...))
}
else {
   alert('Delete failed: ' + response.data.message)  // ← 无 ?. → TypeError
}
// TypeError 被外层 catch 捕获，alert 泄露 "Cannot read properties of null"
```

**风险**：服务端返回空 body 时，用户看到内部报错信息而非友好提示。

#### 4b — Stale Closure（并发删除）

```tsx
const handleDelete = async (id: string) => {
   await apiClient.delete(`/document/${id}`)   // ← await 后 state 可能已变
   setDocuments(documents.filter(d => d.id !== id))  // ← 闭包快照，非最新 state
   // 修复：setDocuments(prev => prev.filter(d => d.id !== id))
}
```

**复现场景**：快速连续点击两个删除按钮（两个 handler 共享同一 `documents` 快照），第二个 `setDocuments` 用旧快照覆盖第一个，已删的文档复活。

#### 4c — 守卫逻辑不一致

```tsx
isFormValid(): formData.title.trim() !== ''  // 有 trim
upload():      !formData.title               // 无 trim，语义不同
```

**当前可达性**：UI 路径下按钮 disabled 已由 `isFormValid()` 拦截，upload() 内部守卫不可达。Risk 2，暂跳过。

#### 4d — 工具函数边界输入

| 输入 | `replace(/\.[^/.]+$/, "")` 结果 | 可接受？ |
|------|-------------------------------|---------|
| `"report.pdf"` | `"report"` | ✅ |
| `"report"` | `"report"` | ✅ |
| `".hidden"` | `".hidden"` | ✅（无扩展名，不剥） |
| `"a.b.c.pdf"` | `"a.b.c"` | ✅（只剥最后一段） |

无新 Bug，Risk 1，跳过。

---

## 三、规则汇总与风险评分

| 规则 | 来源 | Risk | 说明 |
|------|------|------|------|
| R1 isFormValid 守卫 | SA | **3** | 绕过 → 脏数据提交 |
| R3 上传成功：reset + re-fetch | SA | **3** | 任一步骤缺失 → UI 状态不一致 |
| R4 上传失败：alert，表单不重置 | SA | **3** | 错误重置 → 用户数据丢失 |
| R7 删除失败：alert，row 保留 | SA | **3** | 移除 row → UI/服务端不同步 |
| R13 [T4a] null response → TypeError 泄露 | **SB** | **3** | 自动 Risk 3（UI 契约未兑现） |
| R14 [T4b] stale closure 并发删除 | **SB** | **3** | 并发操作导致数据复活 |
| R11 [T1+T2] drag-drop 无格式校验 | **SB** | **3** | Bug #74288（it.fails） |
| R12 [T3] input.value 未清空 | **SB** | **3** | Bug #74289（it.fails） |
| R2 title 自动填充 | SA | 2 | 扩展名未正确剥离 |
| R5 domain prop | SA | 3→P1 | 文档归属错误（预算压缩至 P1） |
| R6 delete confirm 拦截 | SA | 2 | 误删 |
| R8 drag-drop 完整路径 | SA | 2 | 功能路径独立验证 |
| R10 type + description | SA | 2 | 元数据写入正确性 |
| R9 loading 状态 | SA | 1 | 纯 UX |

---

## 四、测试用例表（12 条主预算 + 3 条 it.fails）

| Priority | 规则 | 类型 | 场景描述 | 高价值原因 |
|----------|------|------|---------|-----------|
| **P0** | R1 [SA] | Boundary | 有文件但 title 仅含空白 → Upload 禁用，POST 不调用 | `trim()` 校验失效会静默提交脏标题 |
| **P0** | R3 [SA] | Happy | 上传成功 → React 表单重置 + GET 再调 + 新文档出现 | 同一 case 验证有序双副作用 |
| **P0** | R4 [SA] | Error | POST 失败 → alert，title/file 状态保持 | 错误重置导致用户数据丢失 |
| **P0** | R7 [SA] | Error | delete 返回 `{success:false}` → alert，row 不消失 | row 被错误移除 → UI/服务端不同步 |
| **P0** | R13 [T4a] | Error | mock `data:null` → alert 被调用 且 不含 "Cannot read properties" | ?. 保护了条件判断但未保护 else 分支属性访问 |
| **P1** | R2 [SA] | Happy | 选文件 → title 自动填充，扩展名剥去 | 正则对多段名称有边界风险 |
| **P1** | R5 [SA] | Happy | `domain="sales"` → FormData 含 `domain=sales` | 域归属错误是静默数据错误 |
| **P1** | R8 [SA] | Happy | dragEnter + drop → 文件选中，title 填充，Upload 可点 | drag-drop 路径独立于 input，需单独验证 |
| **P1** | R6 [SA] | Error | confirm 返回 false → DELETE 不调用，row 保留 | confirm 判断反转会造成误删 |
| **P2** | R9 [SA] | Happy | GET pending → "Loading..."，resolve → 文档列表 | 验证 loading flag 生命周期 |
| **P2** | R10 [SA] | Happy | 选 type=Schema，输入 description → FormData 字段正确 | type/description 是文档分类的关键元数据 |
| **P2/Stress** | R14 [T4b] | Stress | `fireEvent` 连续点两个删除，两个 promise 并发 resolve → 两行均消失 | 有 stale closure bug 时，第二个 setDocuments 用旧快照覆盖，doc-1 复活 |

### it.fails 回归哨兵（不计入预算）

| Bug | 来源 | 描述 |
|-----|------|------|
| #74288-A | SB / T1+T2 | input 路径：PNG 应被 JS 拒绝，title 不填充 |
| #74288-B | SB / T1+T2 | drag-drop 路径：PNG 完全绕过 accept，应被拒绝 |
| #74289 | SB / T3 | 上传成功后 `<input>.value` 未清空，重选同一文件 onChange 不触发 |

> **it.fails 生命周期**：Bug 修复后测试自动转为 passing → 删除 `it.fails` 包装器

---

## 五、单元测试 vs Manual 验证对比

### 覆盖能力总览

```
Unit Tests 能保证的：          Manual 必须验证的：
┌─────────────────────────┐   ┌──────────────────────────────┐
│ 逻辑正确性              │   │ 浏览器原生行为（OS 文件选择器）│
│ API 调用参数与顺序       │   │ CSS / 视觉渲染与动画          │
│ React State 一致性       │   │ 真实网络行为与错误响应        │
│ 已知 Bug 回归哨兵        │   │ 移动端响应式布局              │
│ 边界条件                │   │ 键盘 / 屏幕阅读器可访问性     │
│ 并发逻辑（近似模拟）     │   │ Bug 修复后的真实浏览器验证    │
└─────────────────────────┘   └──────────────────────────────┘
```

### 详细对比

| # | 场景 | 单元测试 | Manual | 原因 |
|---|------|:-------:|:------:|------|
| **文件选择** | | | | |
| 1 | 点击 "Select File" 打开系统文件选择器 | ❌ | ✅ | jsdom 无 OS 文件选择器；测试直接注入 File 对象 |
| 2 | `accept` 属性在系统文件选择器中过滤格式 | ❌ | ✅ | 浏览器 OS 层行为，jsdom 不执行；Bug #74288 修复后需 manual 确认 |
| 3 | 拖拽文件时的边框色 / 背景色变化（isDragging） | ❌ | ✅ | jsdom 不渲染 CSS；测试只验证 state，不验证视觉 |
| 4 | 拖拽文件图标跟随鼠标移动的动效 | ❌ | ✅ | 无 CSS 渲染引擎 |
| 5 | 拖入不支持格式 → 拒绝，UI 无变化（Bug #74288） | ⚠️ it.fails | ✅ | 哨兵；修复后需 manual 在真实浏览器验证 |
| **表单交互** | | | | |
| 6 | MUI Select 下拉动画 / 键盘 ↑↓ 选项 | ❌ | ✅ | MUI Popover 定位依赖真实 viewport |
| 7 | 上传成功后 MUI Select 视觉重置回 "Glossary" | ⚠️ 部分 | ✅ | 测试验证 state，不验证 Select 显示文字 |
| 8 | `window.confirm` 弹出真实阻塞对话框 | ❌ | ✅ | 测试 mock 同步返回；真实浏览器阻塞 JS 线程 |
| 9 | Title `required` 的浏览器原生红色边框 | ❌ | ✅ | 原生表单校验样式不在 jsdom 渲染 |
| **响应式布局** | | | | |
| 10 | 移动端（< sm）隐藏 File Name / Description / Last Modified 列 | ❌ | ✅ | `useMediaQuery` 在 jsdom 中始终返回默认断点 |
| 11 | 移动端 Upload 按钮宽度拉满（`xs: "100%"`） | ❌ | ✅ | 同上，CSS 布局不在 jsdom 执行 |
| **上传行为** | | | | |
| 12 | 大文件上传期间无进度指示的用户体验 | ❌ | ✅ | 测试 mock POST，不经历真实上传耗时 |
| 13 | HTTP 413（文件过大）/ 401（未授权）时 alert 文案 | ⚠️ 部分 | ✅ | 测试只覆盖 `error.message`；真实 Axios 填充 `error.response.data.message` 需 manual 确认 |
| 14 | 真实 multipart/form-data 请求体被服务端正确解析 | ❌ | ✅ | 测试断言 `FormData.get(key)`，不验证真实 HTTP 编码和 boundary |
| 15 | 上传成功后删除再重传同一文件（Bug #74289） | ⚠️ it.fails | ✅ | 哨兵；修复后需 manual 在真实浏览器确认 onChange 正常触发 |
| **删除行为** | | | | |
| 16 | 快速连续点两次删除（stale closure，T4b） | ⚠️ P2/Stress | ✅ | 单测用 fireEvent 近似模拟；真实网络延迟下复现概率更高 |
| 17 | 服务端返回空 body → alert 显示友好消息（T4a） | ✅ P0 | ✅ | 单测断言不含内部错误字符串；修复后需 manual 确认文案对用户友好 |
| **可访问性** | | | | |
| 18 | Tab 键焦点顺序（Select File → Title → Type → Description → Upload） | ❌ | ✅ | jsdom 不追踪真实 Tab 序列 |
| 19 | Enter 触发上传、Escape 关闭 confirm | ❌ | ✅ | 键盘事件在 jsdom 不完整；MUI Button Enter 依赖真实事件冒泡 |
| 20 | 屏幕阅读器（VoiceOver / NVDA）朗读表格内容 | ❌ | ✅ | 无法在 jsdom 运行辅助技术 |
| **性能** | | | | |
| 21 | 文档列表 100+ 行时渲染性能 | ❌ | ✅ | 测试不测量渲染耗时；需 Lighthouse / Performance panel |

---

## 六、Manual 验证优先级

### P0 — Bug 修复后必须验证（直接关系 Bug 是否真正修复）

| ID | 验证步骤 | 预期结果 | 对应 Bug |
|----|---------|---------|---------|
| M1 | 真实浏览器中拖拽 PNG 文件到上传区 | title 不填充，Upload 不启用 | #74288 |
| M2 | 点击 Select File，系统选择器中确认只显示支持的格式 | 仅显示 txt/pdf/docx/doc/md/html/yaml/yml/json | #74288 |
| M3 | 上传成功后，再次选择**完全相同**的文件 | onChange 触发，title 填充，Upload 可点 | #74289 |
| M4 | 快速连续点击列表中两个不同文档的删除按钮（网络正常时） | 两行均消失，无文档复活 | T4b |
| M5 | 模拟服务端返回空 body 的删除响应（DevTools throttle） | alert 显示友好提示，非 "Cannot read properties..." | T4a |

### P1 — 功能验证，影响用户体验

| ID | 验证步骤 | 预期结果 |
|----|---------|---------|
| M6 | DevTools 切换至移动端视图（< 768px） | 仅显示 Title / Type / Action 列，Upload 按钮宽度 100% |
| M7 | 上传成功后检查 Type 下拉框 | 视觉重置回 "Glossary" |
| M8 | 点击删除 → confirm 弹出 → 点取消 | 文档保留，DELETE 不发送 |
| M9 | 上传 20MB+ 文件，观察 Upload 按钮状态 | 按钮点击后应有明确的 loading 指示（当前无，确认是否需要加） |

### P2 — 体验优化，可延后验证

| ID | 验证步骤 | 预期结果 |
|----|---------|---------|
| M10 | 拖拽文件进入上传区 | 边框变为 brand 色，背景色变化，视觉反馈明确 |
| M11 | 使用 Tab 键遍历表单 | 焦点按 Select File → Title → Type → Description → Upload 顺序移动 |
| M12 | 上传超大文件触发服务端 413 | alert 显示 "Upload failed: xxx"（具体文案视服务端返回） |
| M13 | 渲染 100 条文档记录 | 无明显卡顿，滚动流畅 |

---

## 七、已识别 Bug 汇总

| Bug ID | 来源 | 类型 | 描述 | 状态 |
|--------|------|------|------|------|
| #74288-A | T1 + T2 | 格式校验缺失 | `<input>` 路径无 JS 格式校验（依赖 accept 属性，浏览器可绕过） | it.fails |
| #74288-B | T1 + T2 | 格式校验缺失 | drag-drop 路径完全绕过 accept，任意格式均被接受 | it.fails |
| #74289 | T3 | DOM 状态未重置 | upload 成功后 `<input type="file">.value` 未清空，重传同一文件 onChange 不触发 | it.fails |
| — | T4a | null 引用 | `handleDelete` else 分支 `response.data.message` 无 `?.` 保护，`data:null` 时 TypeError 被 catch 捕获并泄露内部错误信息 | P0 测试覆盖 |
| — | T4b | Stale Closure | `handleDelete` 在 await 后直接用 `documents` 闭包快照，并发删除时第二个 `setDocuments` 覆盖第一个，已删文档复活 | P2/Stress 测试覆盖 |

---

## 八、方法论演进总结

| 版本 | 新增能力 | 解决的问题 |
|------|---------|-----------|
| **原始 v3** | Risk 评分 + 用例预算控制 | 防止测试用例膨胀 |
| **+ Step 0 T1–T3** | UI 契约分析（由外向内） | 发现 规格-实现 偏差（Bug #74288、#74289） |
| **+ Step 0 T4** | 实现漏洞扫描（由内向外） | 发现 实现内部隐患（T4a null ref、T4b stale closure） |
| **+ it.fails 规则** | 已知 Bug 不计入预算，独立追踪 | Bug 修复后自动转为 passing，无需手动管理 |
