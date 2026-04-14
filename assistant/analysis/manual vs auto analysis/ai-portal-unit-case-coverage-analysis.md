# Assistant Portal 单元测试覆盖分析

> 生成日期：2026-03-23（最后更新：2026-03-23，新增第二批组件测试）
> 测试框架：Vitest + @testing-library/react + jsdom
> 测试目录：`chat-app/assistant-portal/src/__tests__/`

---

## 一、总体覆盖概览

| 模块类别 | 源文件数 | 已测试 | 未测试 | 覆盖率 |
|----------|---------|--------|--------|--------|
| util 工具函数 | 3 | 3 | 0 | 100% |
| api 层 | 2 | 2 | 0 | 100% |
| 核心组件（逻辑复杂） | 5 | 5 | 0 | 100% |
| 复合组件（多依赖/纯 UI） | 11 | 5 | 6 | 45% |
| 入口文件 | 2 | 0 | 2 | — |
| **合计** | **23** | **15** | **8** | **~65%** |

> 入口文件（`main.tsx`、`App.tsx`）不计入覆盖率分母，属于集成/E2E 范畴。

---

## 二、已覆盖模块详情

### 2.1 util / 工具函数

#### `utils/utils.test.ts` → `util/utils.tsx`

| 函数 | 测试场景 | 覆盖要点 |
|------|----------|---------|
| `getDateString` | 0 天（当天）、1 天（昨天）、恰好 2 天、3+ 天 | **边界**：`diffDays < 2` 临界值；fake timers 隔离时间 |
| `startOfDay` | 时分秒归零、日期保留、幂等性 | 00:00:00.000 边界 |
| `endOfDay` | 时分秒设为 23:59:59.999、与 startOfDay 差值精确为 86399999ms | 毫秒精度边界 |
| `doTranslate` | `to="en"` 直接返回 undefined（无 API 调用）、`to="zh"` 调用 POST+GET 顺序、API 报错返回 undefined 而不抛出 | **边界**：英文目标语言 no-op；API 错误不向上传播 |

**测试数量**：~12 个

---

#### `utils/roles.test.ts` → `util/roles.ts`

| 函数 | 测试场景 | 覆盖要点 |
|------|----------|---------|
| `normalizeRole` | 纯小写、大小写混合、包含 `~;~` 分隔符（截断）、`~;~` 在首位（返回空串） | **边界**：分隔符位于 index 0；无分隔符时不修改 |
| `hasRole` | 精确匹配、两侧大小写不敏感、数组元素含分隔符、空数组、部分匹配不命中 | 依赖 normalizeRole 的间接测试 |

**测试数量**：~8 个

---

#### `utils/documentOptions.test.ts` → `util/documentOptions.ts`

| 常量 | 测试场景 | 覆盖要点 |
|------|----------|---------|
| `MODULE_OPTIONS` | 非空、包含预期模块名、无重复元素 | 数组去重边界 |
| `CONTEXT_TYPE_OPTIONS` | 长度与 `contextMapping` 值数一致、每项首字母大写（Title Case）、每项可在 `contextMapping` 值中找到来源 | 数据一致性 + 格式规范 |

**测试数量**：~6 个

---

### 2.2 api 层

#### `api/apiClientManager.test.ts` → `api/apiClientManager.ts`

| 场景 | 覆盖要点 |
|------|---------|
| 单例模式 | 两次 import 返回同一实例 |
| `clearToken()` → `hasToken()=false` | token 清除后状态正确 |
| `setToken("my-token")` → `hasToken()=true` | 正常 token 设置 |
| `setToken("")` → `hasToken()=true` | **边界**：空字符串 token ≠ null，hasToken 仍为 true |
| 重复 `clearToken()` | 安全幂等，不抛出 |
| `getClientId()` | 非空字符串，多次调用稳定 |
| `getCurrentBaseURL()` | 在 jsdom 环境（无 VITE_ 变量）末尾为 `/api` |
| `getClient()` | 返回含 get/post/put/delete 方法的 axios 实例，含 interceptors.request |

**测试数量**：~10 个

---

#### `api/client.test.ts` → `api/client.ts`（`createWS`）

| 场景 | 覆盖要点 |
|------|---------|
| `http://` → `ws://` 协议转换 | URL scheme 替换 |
| `https://` → `wss://` 协议转换 | 安全 WebSocket |
| `/api` 后缀去除 | 路径清理 |
| `/api/` 尾部斜杠也去除 | **边界**：斜杠变体 |
| `clientId` 和 `role` 附加为 query 参数 | URL 参数注入 |
| 相同 role 第二次调用 → 返回缓存实例 | CACHE 命中 |
| role 变更 → 关闭旧 socket + 创建新实例 | CACHE 失效 |
| `vi.resetModules()` 隔离模块级 CACHE | 测试独立性保障 |

**测试数量**：~8 个

---

### 2.3 核心组件

#### `components/StatusBadge.test.tsx` → `components/StatusBadge.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| `ReviewStatus.PENDING_REPLY` → `ReviewStatusMap` 文本 + `MuiChip-colorWarning` | 标签与颜色绑定 |
| `ReviewStatus.PENDING_REVIEW` → `MuiChip-colorSuccess` | |
| outlined + sizeSmall class 存在 | 样式规格 |
| rerender 切换 status → 旧标签消失 | 互斥标签（防误渲染） |
| `IssueStatus.NEW` → warning；`RESOLVED` → success | IssueStatusBadge 独立测试 |

**测试数量**：~10 个

---

#### `components/SubjectAreaDropdown.test.tsx` → `components/SubjectAreaDropdown.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| value 显示在 textbox 中 | 受控显示 |
| `required=true` + 空值 → `.Mui-error` | 错误状态 |
| `required=true` + 仅空白字符 → 报错 | **边界**：trim 后判空 |
| `required=true` + 非空值 → 无错误 | |
| popover 开/关 | 交互流 |
| 4 个顶级类别渲染 | 数据完整性 |
| `parseSelectedValues`（通过 checkbox 状态间接测试）：空值、单类别、类别+子项、两个类别、冒号后空字符串、value prop 变更触发 useEffect | **私有函数的间接覆盖** |
| `stringifySelectedValues`（通过 onChange 间接测试）：勾选类别、取消类别、添加子项、两个子项、多类别分隔符 `"; "` | 序列化格式验证 |

**测试数量**：~24 个

---

#### `components/ReviewQueue.test.tsx` → `components/ReviewQueue.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| 空列表 → count=0 | 空状态 |
| 过滤：PENDING_REPLY / PENDING_REVIEW / All | 状态过滤 |
| 文本搜索：title、userId、_id | 多字段搜索 |
| 搜索大小写不敏感 | **边界** |
| 无匹配 → count=0 | 搜索空结果 |
| 状态 + 搜索组合过滤 | 叠加过滤 |
| 标题渲染；删除对话时 strikethrough 样式 | 视觉条件 |
| 活跃项 border 样式 | 选中高亮 |
| 最新在前排序 | 排序规则 |
| 删除对话框：开/关/取消 | 对话框流 |
| delete 按钮 `stopPropagation` 阻止行激活 | **事件冒泡边界** |
| 删除 active 条目 → `setActiveId("")` | 级联状态清除 |
| 删除非 active 条目 → 不清空 activeId | **边界**：选中项不受影响 |
| 行点击 → `setActiveId` + `GET /messages/{conversationId}` + AbortSignal | API 调用参数验证 |

**测试数量**：~21 个

---

#### `components/ReplyAction.test.tsx` → `components/ReplyAction.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| 对话框初始隐藏 / 点击 Reply 打开 / Cancel 关闭 | 对话框生命周期 |
| Submit 在空消息时 disabled | 表单验证 |
| Submit 在纯空白时 disabled | **边界**：trim 校验 |
| Submit 在有内容时 enabled；清空后再次 disabled | 动态 disabled |
| 点击 Submit → 对话框立即关闭（乐观关闭） | UX 优先响应 |
| 乐观更新：API 未返回前已更新 records + reviewStatus | 乐观 UI 模式 |
| API 返回后 setReviews 第二次调用（用服务端数据覆盖） | 最终一致性 |
| POST `/reviews/reply` 携带正确 payload | API 调用正确性 |
| 消息发送前 trim 去除首尾空格 | 数据净化 |
| 仅更新 active 条目，其他条目保持不变 | **边界**：副作用范围 |
| `replyToUser`（导出纯函数）：服务端字段覆盖 + 保留原有字段 | 纯函数独立测试 |

**测试数量**：~14 个

---

#### `components/AuthProvider.test.tsx` → `components/AuthProvider.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| 请求进行中 → 显示 Loading... | 加载状态 |
| `/auth/me` 成功 → 渲染用户数据 + 无错误 | 正常路径 |
| 401 → 调用 `window.open`（SSO 重定向） | SSO 触发 |
| SSO URL 携带正确 styleBIUrl + chatAppServerUrl 参数 | URL 构建 |
| sessionStorage 已有 pending 标志 + 401 → "Authentication failed after SSO" | **循环检测** |
| looped 401 后从 sessionStorage 移除标志 | 状态清理 |
| 网络错误（无 response.status）→ "Unable to connect" | 错误分类 |
| 500 错误 → "Unable to connect" | |
| 错误后显示 Retry 按钮 | 错误恢复 UI |
| 点击 Retry + 成功 → 清除错误、渲染用户 | 重试流 |
| 点击 Retry → 立即显示 Loading... | 重试中间状态 |
| `styleBIUrl` 为空 → StyleBI URL 配置错误 | 配置守卫 |
| `chatAppServerUrl` 为空 → Server URL 配置错误 | 配置守卫 |
| `window.open` 返回 null → 弹窗被浏览器拦截错误 | **边界**：popup blocked |
| `sso_complete` + code → POST `/auth/exchange` + 重新认证 → 渲染用户 | SSO 完整流 |
| `sso_complete` + code=null → 认证失败错误 | 无 code 边界 |
| 来自错误 origin 的消息 → 忽略（POST 未被调用） | **安全边界**：origin 校验 |
| popup 关闭但未发消息（fake timers 500+200ms）→ "cancelled" 错误 | 超时检测 |
| logout → POST `/auth/logout` 被调用 | 登出流 |

**测试数量**：~20 个

---

### 2.4 复合组件（第二批）

#### `components/DocumentForm.test.tsx` → `components/DocumentForm.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| 全部 5 个字段填写 → `onValidationChange(true)` | isFormValid 正向路径 |
| 任意字段为空 / 仅空白 → `onValidationChange(false)` | **边界**：trim 后判空，6 个 false 用例逐一覆盖 |
| Title 字段空时显示 `.Mui-error` | 错误状态视觉 |
| title/content/subjectArea 字段 onChange → `onDocumentChange` 被调用 | 受控字段传播 |
| Tags 以逗号分割成数组 | 数据转换 |
| "Add Metadata Field" 添加行；"Remove" 删除行 | metadata 列表管理 |
| metadata key 变更后 300ms debounce → `onDocumentChange` 被调用 | **边界**：debounce 计时，fake timers |
| `document.metadata` prop 初始化 → 已有行渲染 | 受控初始化 |

**测试数量**：~16 个

---

#### `components/SummaryEditor.test.tsx` → `components/SummaryEditor.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| 默认显示 `summary.messageContent` | 展示模式 |
| `useChinese=true` + `translateText` 存在 → 显示翻译文本 | 中文切换 |
| `useChinese=true` + `translateText` 为 undefined → 回退到原文 | **边界**：翻译缺失的 fallback |
| 显示模式下有 Edit 按钮，无 Save/Cancel | 按钮互斥 |
| 点击 Edit → TextField + Save/Cancel 出现 | 编辑模式 |
| TextField 预填当前摘要 | 初始值 |
| Cancel → 恢复原文、退出编辑 | 取消回滚 |
| Save → `setReviews` 携带新 messageContent；POST `/reviews/updateReview` | 保存流 |
| 内容改变时 save → `translateText` 置 undefined | **边界**：翻译缓存失效 |
| 内容不变时 save → `translateText` 保留 | **边界**：翻译缓存保留 |
| `onToggleLang(true)` + 无 translateText → 调用 `doTranslate` | 翻译触发 |
| `onToggleLang(true)` + 已有 translateText → **不**调用 `doTranslate` | **边界**：避免重复翻译 |
| `onToggleLang(false)` → **不**调用 `doTranslate` | 关闭不触发 |
| active._id 变更 → 自动退出编辑，显示新摘要 | 切换重置 |

**测试数量**：~14 个

---

#### `components/ChatHistoryView.test.tsx` → `components/ChatHistoryView.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| `chatMessages === undefined` → 触发 `GET /messages/{conversationId}` | 自动 fetch 触发条件（严格 undefined） |
| `chatMessages = []` → **不**触发 fetch | **边界**：空数组 ≠ undefined |
| `chatMessages` 有内容 → **不**触发 fetch | fetch 只在缺失时执行 |
| `setReviews` 未传 → **不**触发 fetch | 依赖守卫 |
| fetch 成功 → `setReviews` 更新 chatMessages | 状态更新 |
| `chatMessages === undefined` → 显示 "Loading messages..." | 加载状态（undefined） |
| `chatMessages = []` → 显示 "Loading messages..." | 加载状态（空数组） |
| `chatMessages` 有内容 → **不**显示 loading | 正常渲染 |
| 消息文本内容渲染 | 基本渲染 |
| USER sender → 标签显示 "USER ·" | sender 标签 |
| ASSISTANT sender → 标签显示 "ASSISTANT ·" | sender 标签 |
| 多条消息全部渲染 | 列表完整性 |

**测试数量**：~11 个

---

#### `components/StoreReviewDialog.test.tsx` → `components/StoreReviewDialog.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| `open=true` → 显示 "Store Review" 标题 | 对话框开关 |
| `open=false` → 不渲染内容 | 关闭状态 |
| 打开时所有记录（summary + records）预选中 | 初始全选 |
| Select All checkbox 全选状态为 checked | 全选指示 |
| 取消全选 → 各记录 unchecked + 警告文字 | 空选验证 |
| 部分取消 → Select All 变 indeterminate | **边界**：中间态 |
| 再次全选 → Select All 恢复 checked | 全选恢复 |
| 有选中时 Next 按钮 enabled | Next 可用条件 |
| 无选中时 Next 按钮 disabled | **边界**：Next 禁用 |
| 点击 Next → 切换到 Add Document tab，显示 DocumentForm | 步骤导航 |
| Add Document tab 时 Next 按钮消失 | 按钮互斥 |
| DocumentForm `onValidationChange(false)` → Save Document disabled | 表单验证守卫 |
| DocumentForm `onValidationChange(true)` → Save Document enabled | 表单验证通过 |
| 保存 → POST `/documents` | API 调用 |
| `stored=false` → 额外 POST `/reviews/updateReview` + 调用 `onStored` | 首次存储 |
| `stored=true` → **不** POST `updateReview` | **边界**：避免重复标记 |
| 全选时保存后调用 `onClose` | 完成关闭 |
| 保存中显示 "Saving..." | 进行中状态 |
| Cancel → 调用 `onClose` | 取消 |

**测试数量**：~16 个

---

#### `components/DetailArea.test.tsx` → `components/DetailArea.tsx`

| 场景 | 覆盖要点 |
|------|---------|
| `active=undefined` → 显示 "Please select a review" | 空状态 |
| `active=undefined` → 不渲染标题 | 空状态完整性 |
| 显示 active.title | 标题渲染 |
| 显示 _id 和 userId | 元数据渲染 |
| `isConversationDeleted=true` → 标题 line-through 样式 | 删除视觉标记 |
| `isConversationDeleted=false` → 无 line-through | 正常样式 |
| `PENDING_REPLY` + 未删除 → 渲染 ReplyAction | 主要操作路径 |
| `PENDING_REPLY` + 已删除 → 渲染 SubmitAction（**不**渲染 ReplyAction） | **边界**：删除后禁止回复 |
| `PENDING_REVIEW` → 渲染 SubmitAction | 审阅状态路径 |
| 默认 tab = Chat History → 显示 ChatHistoryView | 默认 tab |
| 点击 Summary tab → 显示 SummaryEditor | tab 切换 |
| 点击 Q&A tab → 显示 QuestionAnswerEditor | tab 切换 |
| 从 Summary 切回 Chat History → 正确显示 | tab 往返 |

**测试数量**：~12 个

---

## 三、未覆盖模块分析

### 3.1 复合展示组件（仍无独立测试）

| 文件 | 主要功能 | 补测建议 |
|------|----------|----------|
| `components/SubmitAction.tsx` | 展示 "Store"/"Continue Store" 按钮；打开 StoreReviewDialog | 逻辑极简：补测 stored=false 显示 "Store"；stored=true 显示 "Continue Store" |
| `components/QuestionAnswerEditor.tsx` | 编辑 Q&A 记录列表；切换中英文；保存调用 API | 结构与 SummaryEditor 相同，可沿用相同测试模式 |
| `components/IssueQueueList.tsx` | Issue 队列展示，支持过滤 | 结构与 ReviewQueue 相似，可复用测试模式 |
| `components/IssueDetailArea.tsx` | Issue 详情展示 | 类似 DetailArea，补测条件渲染和 tab 切换 |
| `components/IssueReplyAction.tsx` | Issue 回复操作 | 类似 ReplyAction，可复用相同测试策略 |
| `components/AssistantPortal.tsx` | 顶层路由/布局组件 | 页面级入口，E2E 覆盖更合适，不建议单测 |

### 3.2 不适合单元测试的文件

| 文件 | 原因 |
|------|------|
| `main.tsx` | React DOM 挂载入口，无逻辑，E2E 覆盖 |
| `App.tsx` | 顶层路由，依赖 AuthProvider，集成测试更合适 |
| `util/variables.ts` | 纯常量导出，无逻辑分支，无需测试 |
| `components/MarkdownEditor.tsx` | 富文本编辑器，jsdom 中无法测试编辑器行为，E2E 覆盖 |
| `components/KnowledgeBase.tsx` | 超大复合组件（文档列表 + 分页 + 搜索 + 编辑 + 历史），集成测试更合适 |
| `components/IssuePortal.tsx` | 页面级容器，含 WebSocket + fetch 初始化，集成测试更合适 |

---

## 四、测试数量与质量汇总

### 第一批（初始建立）

| 测试文件 | describe 块 | 测试用例数 | 覆盖亮点 |
|----------|------------|-----------|---------|
| `utils/utils.test.ts` | 3 | ~12 | fake timers、doTranslate no-op for `en` |
| `utils/roles.test.ts` | 2 | ~8 | 分隔符在首位返回空串 |
| `utils/documentOptions.test.ts` | 2 | ~6 | Title Case 格式验证、数组去重 |
| `api/apiClientManager.test.ts` | 4 | ~10 | `setToken("")` 仍为 true 的边界 |
| `api/client.test.ts` | 3 | ~8 | vi.resetModules() 隔离模块级 CACHE |
| `components/StatusBadge.test.tsx` | 2 | ~10 | rerender 验证互斥标签 |
| `components/SubjectAreaDropdown.test.tsx` | 4 | ~24 | 私有函数间接测试、value prop 同步 |
| `components/ReviewQueue.test.tsx` | 4 | ~21 | stopPropagation 边界、AbortSignal |
| `components/ReplyAction.test.tsx` | 5 | ~14 | 乐观更新、服务端最终一致性 |
| `components/AuthProvider.test.tsx` | 7 | ~20 | SSO 完整流、origin 安全校验、popup cancel |
| **小计** | **36** | **~133** | |

### 第二批（补充组件测试）

| 测试文件 | describe 块 | 测试用例数 | 覆盖亮点 |
|----------|------------|-----------|---------|
| `components/DocumentForm.test.tsx` | 3 | ~16 | 6 个字段逐一 false 验证、metadata debounce 300ms fake timers |
| `components/SummaryEditor.test.tsx` | 5 | ~14 | translateText 缓存保留/失效边界、doTranslate 调用条件 |
| `components/ChatHistoryView.test.tsx` | 3 | ~11 | undefined vs `[]` 的 fetch 触发严格区分 |
| `components/StoreReviewDialog.test.tsx` | 5 | ~16 | Select All indeterminate、stored=true 跳过 updateReview、Saving 中间态 |
| `components/DetailArea.test.tsx` | 4 | ~12 | `PENDING_REPLY + isConversationDeleted → SubmitAction` 的隐藏分支 |
| **小计** | **20** | **~69** | |

### 总计

| | describe 块 | 测试用例数 |
|--|------------|-----------|
| **全部 15 个测试文件** | **56** | **~202** |

---

## 五、覆盖质量评估

### 优势

1. **逻辑复杂的核心模块全覆盖**：AuthProvider（SSO 流程）、ReviewQueue（过滤+删除）、ReplyAction（乐观更新）、SubjectAreaDropdown（私有序列化函数）、StoreReviewDialog（两步骤存储流）均有充分测试。
2. **边界条件完备**：空字符串 token、分隔符位于首位、trim 后判空、stopPropagation、wrong origin、chatMessages undefined vs `[]` 区分、translateText 缓存保留/失效、`stored=true` 跳过 updateReview 等非显而易见的边界均有专项 case。
3. **测试隔离良好**：`vi.resetModules()` 隔离模块级 CACHE，fake timers 隔离 debounce/SSO 定时器，sessionStorage 在 afterEach 清理。
4. **mock 策略分层合理**：
   - MarkdownEditor → textarea（可交互输入）
   - DocumentForm → 可触发 onValidationChange 的 div（隔离复杂子表单）
   - framer-motion → plain div（避免 jsdom 问题）
   - ReactMarkdown → span（避免渲染插件冲突）
   - 子组件（ChatHistoryView、SummaryEditor 等）→ data-testid stub（DetailArea 专注测自身逻辑）

### 仍待补充

1. **`SubmitAction` 按钮文本**：`stored=false` 显示 "Store"，`stored=true` 显示 "Continue Store"，逻辑极简但当前无测试。
2. **`QuestionAnswerEditor`**：结构与 SummaryEditor 基本相同，可直接沿用相同模式，补测 onToggleLang、onSave、active._id 变更重置。
3. **Issue 系列组件**（`IssueQueueList`、`IssueDetailArea`、`IssueReplyAction`）：与已测的 Review 系列组件结构对称，可复用测试策略。

---

## 六、补测优先级建议

| 优先级 | 目标 | 状态 | 理由 |
|--------|------|------|------|
| ~~P1~~ | ~~`StoreReviewDialog`~~ | ✅ 已完成 | 核心业务流（Q&A → 知识库存储） |
| ~~P1~~ | ~~`DocumentForm`~~ | ✅ 已完成 | isFormValid 逻辑驱动 Submit 可用性 |
| ~~P2~~ | ~~`DetailArea`~~ | ✅ 已完成 | ReplyAction vs SubmitAction 条件渲染 |
| ~~P2~~ | ~~`ChatHistoryView`~~（fetch 部分） | ✅ 已完成 | chatMessages 缺失时的回退加载路径 |
| ~~P3~~ | ~~`SummaryEditor`~~ | ✅ 已完成 | doTranslate 调用条件、edit/save 流 |
| P3 | `SubmitAction` | 待补 | 按钮文本 "Store"/"Continue Store" 切换，逻辑简单 |
| P3 | `QuestionAnswerEditor` | 待补 | 与 SummaryEditor 结构相同，可快速补齐 |
| P4 | `IssueQueueList` / `IssueDetailArea` / `IssueReplyAction` | 待补 | 与 Review 系列对称，可复用已有测试策略 |
| 不建议 | `KnowledgeBase`, `IssuePortal` | — | 页面级大组件，集成/E2E 成本更低 |
| 不建议 | `MarkdownEditor`, `App`, `main` | — | jsdom 限制或纯入口，无逻辑分支 |
