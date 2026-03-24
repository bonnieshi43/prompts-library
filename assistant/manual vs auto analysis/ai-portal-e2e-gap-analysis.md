# Assistant Portal — E2E / Manual 验证缺口分析

> 生成日期：2026-03-23
> 参考：`ai-portal-unit-case-coverage-analysis.md`（单元测试覆盖分析）
> 范围：`chat-app/assistant-portal/`

## 标记说明

| 标记 | 含义 |
|------|------|
| 🔴 | **回归重点**：功能改动后必须验证；常规使用路径不一定每次经过 |
| 🟢 | **常规工作覆盖**：每次正常使用即经过，无需额外专项测试 |
| 🟡 | **边界/低频场景**：正常使用不触发，但属于有效场景，周期性验证 |
| ❌ | **一次性手动验证**：部署/配置变更后验证一次即可 |

## 无法用 Unit Case 覆盖的通用原因

| 原因类型 | 说明 |
|----------|------|
| **真实集成依赖** | 需要真实后端（MongoDB、Pinecone、Cohere）才能验证端到端数据流 |
| **浏览器 API 限制** | `clipboard API`、`scrollIntoView`、`window.open` popup 实际行为在 jsdom 中不可用 |
| **WebSocket 实时通信** | jsdom 中 `createWS` 被 mock，无法测试真实 WS 消息推送和重连 |
| **渲染质量** | Markdown 表格、数学公式、代码高亮的视觉正确性无法在 jsdom 中断言 |
| **认证生命周期** | JWT 过期、SSO redirect 循环等涉及真实 token 和真实 StyleBI 服务器 |
| **页面级集成** | 多组件协同（ReviewQueue 选中 → DetailArea 联动）在真实浏览器中验证 |

---

## 一、认证（SSO / AuthProvider）

> 源文件：`AuthProvider.tsx`、`apiClientManager.ts`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 通过真实 StyleBI 完成 SSO 登录，portal 正常加载 | 🟢 | 真实集成依赖：需要运行中的 StyleBI 服务器 |
| SSO popup 打开，登录后 popup 自动关闭、portal 获取到 token | 🔴 | 真实集成依赖 + 浏览器 popup 行为；auth code exchange 是否成功不可 mock 验证 |
| 浏览器拦截 popup（用户需手动允许）时显示被拦截错误提示 | 🟡 | 浏览器安全策略，不同浏览器行为不同 |
| JWT token 在会话期间过期 → portal 自动重定向 SSO 重新登录 | 🔴 | token 生命周期需真实时间流逝；apiClientManager 拦截器行为需集成验证 |
| 刷新页面后 token 仍有效，不重新触发 SSO | 🟢 | 常规使用即验证 |
| Logout 后重新访问 portal → 跳转 SSO | 🟢 | 常规使用即验证 |
| 多个浏览器 tab 同时登录，token 共享 / 失效同步 | 🟡 | 跨 tab 状态同步，依赖 sessionStorage / cookie 在真实浏览器中的行为 |
| SSO 后 portal URL 中的 `?code=` 参数被正确消费，不残留 | ❌ | 一次性部署验证 |

---

## 二、Review Queue + 实时推送（AssistantPortal）

> 源文件：`AssistantPortal.tsx`、`ReviewQueue.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 页面加载时 GET /reviews/getAllReviews 成功，队列正常渲染 | 🟢 | 常规使用即覆盖 |
| 页面加载时第一条 review 自动选中，chat messages 自动 fetch | 🔴 | AssistantPortal 集成逻辑；需真实 API 验证 "auto-select first + fetch messages" 的联动 |
| 用户提交 disapprove 后，WebSocket 推送新 review 进入队列 | 🔴 | WebSocket 实时通信；jsdom 中 createWS 被 mock |
| WS 推送已有 review 的更新（如 reviewStatus 变更）→ 队列原地更新 | 🔴 | 同上；且需验证 `chatMessages` 字段被保留（不被覆盖） |
| 当前选中的 review 收到 WS 更新时，DetailArea 内容同步刷新 | 🔴 | 跨组件联动（Queue → DetailArea），需真实浏览器集成 |
| 队列很长时滚动性能正常，不卡顿 | 🟡 | 性能，jsdom 无渲染 |
| 筛选 + 搜索后队列为空时，无内容提示正常 | 🟢 | 功能简单，常规测试覆盖 |
| 删除当前选中的 review，右侧 DetailArea 清空 | 🟢 | 常规操作路径 |

---

## 三、Chat History 查看（ChatHistoryView）

> 源文件：`ChatHistoryView.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 消息列表正常渲染，用户/助手消息左右区分 | 🟢 | 常规使用即覆盖 |
| Markdown 表格、有序/无序列表在界面中正确渲染 | 🔴 | 渲染质量；jsdom 不执行 CSS，ReactMarkdown 输出的视觉效果需真实浏览器 |
| 代码块显示语言标签、代码高亮正常 | 🔴 | 同上 |
| 代码块右上角 "Copy" 按钮调用 `clipboard.writeText`，复制成功 | 🟡 | 浏览器 Clipboard API；jsdom 中 `navigator.clipboard` 不可用 |
| 图片消息加载失败时自动隐藏（`onError → display:none`） | 🟡 | 需真实图片 URL 失效环境 |
| 打开含 `messageId` 的 review 时，自动滚动到目标消息并高亮 2 秒 | 🔴 | `scrollIntoView` 在 jsdom 中是 no-op；动画和高亮视觉效果需真实浏览器 |
| 消息数量很多时（100+）滚动流畅 | 🟡 | 性能 |

---

## 四、摘要编辑与翻译（SummaryEditor / QuestionAnswerEditor）

> 源文件：`SummaryEditor.tsx`、`QuestionAnswerEditor.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 编辑摘要，MarkdownEditor 富文本格式（加粗、代码块）被正确保存 | 🔴 | MarkdownEditor 在单测中被替换为 `textarea`，富文本格式不可测 |
| 摘要保存后，页面显示的文本与编辑内容一致（无转义错误） | 🔴 | 渲染质量，需真实 ReactMarkdown 处理 |
| 切换「中文翻译」后，翻译结果准确呈现中文内容 | 🟡 | 翻译质量依赖真实 LLM API；unit test 只测调用路径 |
| 翻译后再切换回英文，恢复显示原文 | 🟢 | 功能路径，常规操作覆盖 |
| Q&A Editor 编辑后保存，ReviewQueue 侧该 review 数据同步更新 | 🔴 | 跨组件状态同步；setReviews 的 prop drilling 需集成验证 |
| 翻译缓存跨 review 切换不串数据（translateText 属于各自 review） | 🔴 | 跨 review 隔离；unit test 仅测单个 review 上下文 |

---

## 五、知识库存储（StoreReviewDialog / SubmitAction）

> 源文件：`StoreReviewDialog.tsx`、`SubmitAction.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 完整存储流程：选 Q&A → 填写文档信息 → Save → 文档进入 KnowledgeBase 列表 | 🔴 | 真实集成依赖：需要后端写入 MongoDB |
| 文档存储后 Pinecone 向量化成功，status 变为 "Uploaded" | 🔴 | 真实集成依赖：需要 Pinecone + Voyage AI |
| 存储后，该 review 的 "Store" 按钮变为 "Continue Store" | 🟢 | 常规操作路径 |
| "Continue Store" 打开对话框时文档表单预填正确 | 🟡 | 需要真实已存储数据 |
| DocumentForm 中 MarkdownEditor 富文本格式（code/bold）正确写入 content | 🔴 | MarkdownEditor 被 mock，单测无法验证富文本写入质量 |
| 选择部分 Q&A 存储，文档 content 只包含所选条目（不含未选项） | 🔴 | 需验证后端实际存入的内容 |
| 存储失败时（Pinecone 不可用）界面有 error 提示 | 🟡 | 错误 UI，依赖真实 API 失败场景 |

---

## 六、Knowledge Base 管理（KnowledgeBase）

> 源文件：`KnowledgeBase.tsx`（页面级，未做单测）

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 页面加载，文档列表正常展示（分页 10 条/页） | 🟢 | 常规操作路径 |
| 新建文档，填写完整表单 → 保存 → 列表新增 | 🔴 | 真实集成依赖；且 DocumentForm + MarkdownEditor 联动 |
| 编辑文档，修改 content → 保存 → 列表更新，status 变为 "Needs Re-upload" | 🔴 | 真实集成依赖 + status 状态机逻辑 |
| 删除文档（软删除）→ 默认视图不显示，打开「显示已删除」后可见 | 🔴 | 软删除逻辑；需后端配合 |
| 恢复软删除文档 → 回到正常列表 | 🟡 | 低频操作 |
| 永久删除文档 → 从 Pinecone 和 MongoDB 彻底移除 | 🔴 | 真实集成依赖；需验证 Pinecone 向量也被清理 |
| 上传文档到 Pinecone（Upload 按钮）→ status 从 "Not Uploaded" 变为 "Uploaded" | 🔴 | 真实集成依赖（Pinecone + Voyage embedding） |
| 批量选择多文档 → 批量删除 | 🟡 | 低频操作，需验证批量 API 调用 |
| 搜索框输入关键词（debounce 300ms 后触发），结果正确过滤 | 🔴 | debounce + 搜索逻辑；unit 测试仅覆盖 debounce 计时，不验证搜索结果准确性 |
| 字段过滤（module / contextType / status）+ 搜索组合使用 | 🟡 | 组合过滤；单测未覆盖 KnowledgeBase 本身 |
| 列排序（升序/降序切换）结果正确 | 🟢 | 常规操作 |
| 语义搜索（KB Search）输入问题，返回相关文档 | 🔴 | 真实集成依赖（Pinecone 语义检索 + Cohere rerank） |
| 查看文档历史（History 弹窗）显示正确操作记录 | 🟡 | 审计日志，依赖真实数据 |
| Audit Log tab 搜索 + 过滤操作类型，结果分页正确 | 🟡 | 低频使用；依赖真实 audit 数据 |
| 非 admin 用户登录，编辑/删除按钮不可用（权限控制） | 🔴 | 权限控制：依赖真实用户 role；unit 测试用 mock user |
| admin 用户登录，所有操作按钮可用 | 🟢 | 常规管理员路径 |

---

## 七、Issue Portal（IssuePortal）

> 源文件：`IssuePortal.tsx`、`IssueQueueList.tsx`、`IssueDetailArea.tsx`、`IssueReplyAction.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 页面加载时 GET /issue/getAllIssues 成功，Issue 列表渲染 | 🟢 | 常规操作路径 |
| 页面加载时第一个 issue 自动选中并展示详情 | 🟡 | AssistantPortal 和 IssuePortal 同样的 "auto-select" 逻辑；IssuePortal 未单测 |
| 用户报告 issue，WebSocket 推送新 issue → 即时出现在队列 | 🔴 | WebSocket 实时通信；jsdom 中 createWS 被 mock |
| WS 推送已有 issue 的更新 → 队列原地更新（不新增重复行） | 🔴 | 同上；需验证 `exists` 判断分支 |
| Issue 无 activeId 时，新推送的 issue 自动被选中 | 🟡 | 边界：activeId 为空时的 auto-select 逻辑 |
| 回复 issue → status 变为 RESOLVED，replyMessages 追加 | 🔴 | 真实集成依赖；`handleReplied` 回调的端到端验证 |
| 已解决的 issue 在队列中视觉上有区分（如不同样式/标签） | 🟢 | 常规操作路径 |

---

## 八、页面级集成 & 布局

> 源文件：`App.tsx`、`main.tsx`

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 登录后默认进入 Review Queue tab，布局正常 | 🟢 | 常规使用即覆盖 |
| 顶部导航在 Review Queue / Knowledge Base / Issue Portal 之间切换 | 🟢 | 常规操作 |
| 从 Review Queue 切换到 Knowledge Base，再切回，Review Queue 状态保留 | 🔴 | 跨 tab 状态保持；涉及 React 组件卸载/挂载生命周期 |
| 不同屏幕宽度（1280px / 1920px）下 ReviewQueue + DetailArea 两栏布局不溢出 | 🟡 | 响应式布局；jsdom 无 layout engine |
| 网络请求失败（断网/后端不可用）时，页面有适当的错误提示而非白屏 | 🔴 | 真实网络环境；各组件 catch 块的 UX 行为 |
| 页面初始加载性能（Time to Interactive）在可接受范围内 | 🟡 | 性能测量，需真实浏览器 |
| 浏览器刷新后认证状态恢复，无需重新 SSO | 🟢 | 常规使用即验证 |

---

## 九、MarkdownEditor（富文本编辑器）

> 源文件：`MarkdownEditor.tsx`（jsdom 无法测试，全部需要手动/E2E）

| 场景 | 标记 | Unit Case 无法覆盖原因 |
|------|------|----------------------|
| 在 SummaryEditor / DocumentForm 中打开编辑器，可正常输入文字 | 🟢 | 常规操作 |
| 加粗、斜体、代码块等工具栏按钮功能正常 | 🔴 | 富文本编辑器内部行为；jsdom 中被 mock 为 textarea |
| 编辑器内容（含 Markdown 语法）在 Preview 模式下正确渲染 | 🔴 | 渲染质量 |
| 输入大段文本时编辑器不卡顿，滚动流畅 | 🟡 | 性能 |
| 粘贴带格式的文本（从 Word / 网页）处理正确 | 🟡 | 剪贴板输入，依赖浏览器行为 |

---

## 十、回归测试优先级汇总

> 以下为改动影响范围最广、常规使用路径不稳定覆盖的场景，**每次大版本发布前必须验证**。

| 优先级 | 场景 | 关联组件 |
|--------|------|---------|
| P1 🔴 | SSO popup 完整流程（open → login → token exchange → portal loaded） | `AuthProvider` |
| P1 🔴 | JWT token 过期后自动触发重新 SSO | `AuthProvider`、`apiClientManager` |
| P1 🔴 | WebSocket 推送新 review → 队列实时更新 | `AssistantPortal`、`ReviewQueue` |
| P1 🔴 | WS 推送 review 更新时，当前选中 review 的 `chatMessages` 不丢失 | `AssistantPortal` |
| P1 🔴 | 非 admin 角色无法访问编辑/删除操作 | `KnowledgeBase`、`hasRole` |
| P1 🔴 | 文档存储完整链路：StoreReview → MongoDB 写入 → Pinecone 向量化 | `StoreReviewDialog`、后端 |
| P1 🔴 | 文档 Upload：Pinecone 向量化后 status 正确变为 "Uploaded" | `KnowledgeBase` |
| P1 🔴 | 文档永久删除后 Pinecone 向量同步清理 | `KnowledgeBase`、后端 |
| P2 🔴 | Chat history 中代码块、表格 Markdown 渲染正确 | `ChatHistoryView` |
| P2 🔴 | Review 切换后 translateText 缓存不串数据 | `SummaryEditor`、`QuestionAnswerEditor` |
| P2 🔴 | Knowledge Base 语义搜索返回相关结果 | `KnowledgeBase`、Pinecone |
| P2 🔴 | Tab 切换后 Review Queue 状态保留（不重置 activeId） | `App`、`AssistantPortal` |
| P2 🔴 | Issue WebSocket 实时推送，队列更新不产生重复条目 | `IssuePortal` |
| P3 🟡 | 浏览器 popup 被拦截时错误提示正确 | `AuthProvider` |
| P3 🟡 | 文档搜索 debounce 300ms 触发（不提前/延迟触发） | `KnowledgeBase` |
| P3 🟡 | 大量文档（100+）分页性能正常 | `KnowledgeBase` |
| P3 🟡 | auto-scroll 滚动到高亮消息且 2 秒后高亮消失 | `ChatHistoryView` |
| P3 🟡 | 多 tab 登录状态同步 | `AuthProvider` |

---

## 十一、常规工作即覆盖的场景（无需专项测试）

以下场景在日常使用 portal 时每次均会经过，不需要额外 E2E 脚本：

- 🟢 通过 SSO 正常登录
- 🟢 在 Review Queue 中查看 review 列表并点击选中
- 🟢 查看 chat history（消息正常显示）
- 🟢 点击 Reply 回复用户（填写消息 → Submit）
- 🟢 点击 Store / Continue Store 按钮，对话框打开
- 🟢 Knowledge Base 页面加载，文档列表显示
- 🟢 Knowledge Base 列排序（点击列头）
- 🟢 Issue Portal 加载 issue 列表
- 🟢 顶部导航 tab 切换（Review Queue / KB / Issue Portal）
- 🟢 Logout 成功
- 🟢 刷新页面后认证状态保持（不再触发 SSO）
