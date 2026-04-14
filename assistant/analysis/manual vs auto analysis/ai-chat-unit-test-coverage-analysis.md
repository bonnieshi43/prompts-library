# 测试覆盖分析：`__tests__` 与 `__integration__`

> 路径：`chat-app/server/src/__tests__/` 和 `chat-app/server/src/__integration__/`
> 框架：Vitest；数据库 mock：mongodb-memory-server（集成测试）

---

## 一、`__tests__`（单元测试）

所有依赖均 mock，不启动真实数据库，测试粒度细到函数/方法级别。

### 1. agents/（LangGraph workflow 节点）

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `agentic.test.ts` | `nodes/agentic` | 取消信号中断；`useMultiAgentRag` 开关分别路由到 `AgenticRAGService` 或 `MultiAgentRAGService`；错误透传 |
| `answerGen.test.ts` | `nodes/answerGen.generateResponse` | 向 `generateAnswer` 正确传递所有参数；agentic 参数固定为 `false`；返回 answer 字段 |
| `initialization.test.ts` | `nodes/initialization.initializeState` / `initializeStateForRetrieve` | 历史加载策略（summarizedMessages → fallback getMessages）；触发 `updateConversation(generating:true)`；问题重复去除；context/contextType 解析与 contextMapping；steps/stepTimes/retrievalCache 初始化；WS 获取；错误透传；取消信号检测 |
| `intentDetection.test.ts` | `nodes/intentDetection` | 识别 Report Issue / Help Request / General Question 三种意图；取消信号在 LLM 返回后触发 |
| `processQuestionWithWorkflow.test.ts` | `chatAgent/index` | workflow 返回值透传；helpMessage 追加逻辑（reportIssue=true 时追加，已含关键词时不追加，空 helpMessage 不追加）；错误透传 |
| `retrieval.test.ts` | `nodes/retrieval` | `generateRetrievalKey` 纯函数（空问题、大小写、排序稳定性、不同 retriever 集合生成不同 key）；缓存命中/未命中路径；`completedQuery` 优先级；logs 防御性处理（retriever 不返回 logs 时保留原有） |
| `routers.test.ts` | `nodes/routers` | `simpleRAGEvaluatorRouter`：score > 3 → end，≤ 3 → agentic；`agenticDecimer`：boolean/string 类型的 true/false 均正确路由 |
| `subjectAreas.test.ts` | `nodes/subjectAreas.determineSubjectAreas` | subjectAreas/completedQuery 从 LLM 结果传递；过滤为 canCombinModules 中的项；最多保留 3 个；script 标志逻辑；preferRewriteWithContext 推导（直接或单区域匹配 context）；step 标签格式；取消信号；错误透传 |

### 2. controllers/（Express 控制器）

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `cancelController.test.ts` | `cancelChatRequest` | 缺少 conversationId → 400；成功取消 → 200；`requestManager.cancelRequest` 返回 false → 500；先调 `updateConversation(generating:false)` 再取消；DB 异常 → 500 含 details |
| `chatController.test.ts` | `handleChat` | 输入校验（question/context/conversationId/newChatId）；检索策略选择（default_strategies、enabled 列表、agentic 开关）；thinkMode/clientId 转发；成功路径（answer+logs 返回、持久化消息、generating:false）；regenerate 路径（更新/创建消息）；取消路径（不发响应、仍清理 generating）；错误路径（500、completeRequest 始终调用） |
| `messageController.test.ts` | `createMessage / getMessages / deleteMessages / summarizeMessages / addFeedbackToMessage / updateMessageApproved` | 每日限制（429 含 limit 和 reset time）；新会话 vs 存在会话响应结构；getMessages generating 默认值；feedback 缺失/未找到/成功/500；approved 值校验（仅 true/false/null 合法）；404/500 处理 |

### 3. llms/

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `modelFactory.test.ts` | `isAdvancedModel` / `mapThinkModeToEffort` | gpt-5 系列识别为 advanced；大小写不敏感；deepthink → deep_think_effort；normal/undefined → think_effort |

### 4. middleware/

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `auth.test.ts` | `parseIdentityKey` / `extractIssuerFromToken` / `getJWKS` / `authMiddleware` | 用户名/组织解析（含分隔符边界）；iss 提取/异常处理；JWKS 缓存（命中、不同 URL 独立缓存、resetJWKS 按 URL 或全量清除）；styleBIInternalUrl 覆盖；authMiddleware 跳过路径（health、portal 路径）；ignoreAuth；无 token → 401；无 iss → 401；JWT 验证成功 → 注入 req.user；验证失败 → 401 + 清 JWKS 缓存 |

### 5. services/

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `answerService.test.ts` | `generateAnswer` | retrieval/answer score 提取与透传；agentic 模式下不返回 score；jsonResponse=false 跳过 JSON 解析；abort 信号立即中断；invokeRag 错误透传并记录 logs |
| `requestManager.test.ts` | `RequestManager` | registerRequest 返回 AbortController；同一会话重注册时取消旧请求；cancelRequest 中止信号/返回 true、已取消返回 false；completeRequest 后 isRequestCancelled 返回 true；跨会话隔离 |
| `userDailyLimitService.test.ts`（单元） | `getDailyLimit` / `getResetTime` / `hasExceededDailyLimit` / `getRemainingConversations` / `incrementUserDailyConversationCount` | 配置动态读取；reset time 为未来 UTC 零点；limit 边界（<、=、> limit）；无记录时返回 0；findOneAndUpdate upsert 参数验证 |

### 6. tools/

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `extractJsonFromResponse.test.ts` | `extractJsonFromResponse` | 裸 JSON 对象/数组；从散文中提取；嵌套对象；markdown code fence；object vs array 优先级（按首字符位置）；无 JSON 时返回原字符串 |
| `getSubjectArea.test.ts` | `isScriptModule` / `isModuleMatchingContext` / `getSubmoduleNames` / `getParentModuleNames` / `getEnhancedSubjectAreas` / `getCompletedQuery` | 各纯函数边界；context 过滤（chart/crosstab/freehand/table/worksheet）；explicitly_mentioned 优先级；Dashboard 优先于 Data Worksheet；"others" fallback；trend 区域保留；preferRewriteWithContext 推导；getCompletedQuery 空历史跳过 LLM；取消信号（调用前/LLM 返回后）；replaced_query 解析 |

### 7. utils/（纯函数工具）

| 文件 | 被测模块 | 核心测试点 |
|------|----------|-----------|
| `escapeMarkdownInAnswer.test.ts` | `escapeMarkdownInAnswer` | 空/null/undefined 透传；普通文本和 markdown 不变；`*` 列表项内容转义；comment 标签（`/*<idx>*/`、`/*</idx>*/`、`/\*<where>*/`）转换；多行独立处理 |
| `fillPromptVariables.test.ts` | `fillPromptVariables` | 排除 question/documents/history 变量；其余变量返回函数；函数返回 context 对应值或空字符串 |
| `parseContextJson.test.ts` | `parseContextJson` | 合法 JSON 解析；noBinding 默认值 "true"；保留显式 noBinding；非 JSON 时返回 `{contextType: input}`；空字符串/畸形 JSON |
| `parseYaml.test.ts` | `parseYaml` | 基础 key-value/嵌套/列表；非字符串抛错；```yaml code fence 剥离；无效 YAML 抛错；空文档返回 undefined |
| `promisePoolWithRetry.test.ts` | `PromisePoolWithRetry` | 单任务成功；重试耗尽后拒绝（1+2=3次调用）；首次失败后重试成功；并发限制（maxRunning ≤ limit）；abort 立即抛出；abort 在重试等待期间取消 |
| `replaceUrlPlaceholders.test.ts` | `replaceUrlPlaceholders` | 无占位符透传；未知 key 保留原文；URL/IMG/BTN/VIDEO 类型替换；有无 label 两种格式；多个占位符 |
| `stepTimeTracker.test.ts` | `withStepTime` | 包装函数执行并返回结果；追加 COMPLETED step（含 executionTime）；显式 stepName 优先于函数名；camelCase 函数名转可读文本；剥除 _stepContent；substep 合并；错误透传；WebSocket 发送（in-progress + completed 共 2 次）；保留已有 steps；stepTimes 记录 |
| `tokenUsageUtils.test.ts` | `calculateTokenCost` / `formatTokenUsageLog` | gpt-4o-mini / deepseek-chat / 未知模型 pricing；缓存 token breakdown 计算；单个缓存字段时使用标准价；零 token；日志格式（含 model/数量/cost/cache 字段） |
| `ttlCache.test.ts` | `TtlCache` | set/get/invalidate；TTL 过期后返回 undefined；size 计数；最大容量驱逐最老条目；覆盖写不触发驱逐；destroy 清空 |
| `wsTokenStore.test.ts` | `storeWsToken` / `consumeWsToken` | 未知 token 返回 null；有效 token 返回用户；一次性消费；TTL 精确边界（过期/未过期）；自定义 TTL；默认 30s TTL |

---

## 二、`__integration__`（集成测试）

使用真实 Express + mongodb-memory-server，mock 范围仅限于外部服务（LLM、Pinecone、GCS 等）。测试完整的 HTTP 请求 → 路由 → 控制器 → service → MongoDB 链路。

### 1. api/（HTTP 端点集成测试）

| 文件 | 路由范围 | 核心测试点 |
|------|---------|-----------|
| `authApi.test.ts` | `/api/auth/*` | `POST /callback`：缺 token/无 issuer/JWT 验证失败 → 400/401；成功 → 302 含 64 位 hex code；safe redirect 验证（localhost 允许，外部域名阻断）。`POST /exchange`：缺/未知 code → 400；首次兑换成功；第二次返回 success 但无 token（React StrictMode 兼容）；jwtVerify 失败 → 401。`GET /me`：ignoreAuth=true 返回 dev-user；无用户 → 401；有用户返回字段。`GET /ws-token`：ignoreAuth=true 返回 dev-token；无用户 → 401；有用户返回 64 位 hex 并调用 storeWsToken。`POST /logout` → 204 |
| `cancelApi.test.ts` | `POST /api/chat/cancel/:conversationId` | 无活跃请求 → 500；取消前先将 generating 设为 false（DB 写入验证）；有注册请求 → 200；取消后 isRequestCancelled 为 true |
| `chatApi.test.ts` | `POST /api/chat` | 缺 question/context/conversationId/newChatId → 400；成功路径（answer 持久化为消息、generating 设为 false、requestManager 清理、summarizedMessages 更新）；regenerate=true 更新已有消息 / 无 messageId 时创建新消息；reportIssue 标志透传 |
| `conversationApi.test.ts` | `/api/conversations` | GET 空结果/按用户过滤；POST 创建；GET/:id 存在/404；PUT/:id 更新/404；DELETE/:id 删除/404/再 fetch 404；DELETE deleteAll/:userId 删除计数/无记录返回 0；GET getConversationsByIds 多 id/空 ids → 400/混合 id 过滤 null |
| `documentApi.test.ts` | `/api/documents` | GET（空、有文档、软删隐藏、includeDeleted 管理员可见、非管理员 → 403）；POST（201 含 NOT_UPLOADED、strip 禁止字段、审计写入）；GET/:id（找到/400 无效 id/404）；PUT（更新、UPLOADED → NEEDS_REUPLOAD 降级、审计字段名）；DELETE 软删（200、隐藏、403 非管理员、404、Pinecone cleanup）；batch-delete（计数/空 → 400/全未匹配 → 422/403）；restore（NEEDS_REUPLOAD、409 未在回收站/404）；permanent delete（先软删再永久删/409 未软删/404）；audit-log（分页/action 过滤/403）；history；search（mocked/缺 query → 400/空白 query → 400）；submit（成功 successfulIds/空 ids → 400/失败 failedIds） |
| `issueApi.test.ts` | `/api/issue` | POST 创建（201、broadcastToAdmin 含 x-client-id header）；GET getAllIssues；POST /reply（缺 issueId/message/空白 → 400，未知 id → 404，成功 → RESOLVED + email 调用）；DELETE（成功/未找到 → success:false） |
| `messageApi.test.ts` | `/api/messages` | GET/:convId（含消息/空）；POST createMessage 已有会话（不返回 conversation）；POST createMessage 新会话（sessionId=newChatId/缺 sessionId → 创建并返回 conversation）；日每限制 429（limit=3 耗尽后触发）；DELETE 删除所有；POST feedback（追加/缺 feedback → 400/404）；POST approved（true/null/无效值 → 400/404） |
| `promptApi.test.ts` | `/api/prompt-files`, `/api/prompt-file/*` | GET /prompt-files 仅返回 `.prompt` 文件（排除 .txt、目录）；递归列出子目录；GET /prompt-file/* 读内容（有效/.txt → 400/路径穿越 → 400/不存在 → 404）；PUT /prompt-file/* 写入（存在/新建/非 .prompt → 400/路径穿越 → 400/content 非字符串 → 400） |
| `reviewApi.test.ts` | `/api/reviews/*` | createReview（会话不存在 → 404；成功 → 201 含 title/summary/records/PENDING_REPLY；reviewId 回写到原消息）；getReview（存在/404）；getUserReviews（按 userId/空数组）；checkPendingReply（hasPending true/false）；updateReview（更新/404）；addRecord（追加 record/404）；translateReviewRecords（summary 翻译/未找到 → 200+null）；reply（缺参数 → 400；未找到 review/message → 404；成功 → PENDING_REVIEW + ANSWER record + chatMessages）；deleteReview（删除/404；级联删除软删除的 conversation） |
| `uploadApi.test.ts` | `/api/upload/image`, `/api/upload/files` | image：本地写入（url 验证/文件存在于 uploads 目录）；无文件 → 400；非图片 → 500。files：多文件上传返回 GCS signed url 数组；单文件；无文件 → 400；不支持类型 → 500 |

### 2. services/（Service 层集成测试，直连 mongodb-memory-server）

| 文件 | 被测服务 | 核心测试点 |
|------|---------|-----------|
| `conversationService.test.ts` | `conversationService` | create（_id/默认 sessionName/context 存储）；getById（存在/null）；getByUser（按 userId 过滤/空）；update（字段更新/持久化/null）；delete（无 review → 硬删除；有 pending review → 软删除 + isConversationDeleted=true）；deleteAll（计数/硬删+软删混合/已 removed 的跳过） |
| `issueService.test.ts` | `issueService` | insert（_id/broadcastToAdmin）；getIssues 按 createdAt 降序；getById（存在/null）；getByUserId/ByConversationId；update（更新/null）；delete（true/false）；replyToIssue（push replyMessages + status=RESOLVED + sendEmail 参数验证；email 失败 → 抛出 EMAIL SEND FAILED；null；多次累积） |
| `messageService.test.ts` | `messageService` | create（字段/仅 COMPLETED steps/customDate）；getByConversation（升序/空）；getById（存在/null）；updateById（更新/reviewId/null）；updateApproved（true/false/null/null for unknown）；addFeedback（追加/累积/undefined→null）；deleteByConversation（清空）；deleteByConversations（多个/空数组）；doSummarizeMessages（返回解析结果/空会话 fallback） |
| `mongoDbService.test.ts` | `MongoDbService`（文档知识库） | addItem（NOT_UPLOADED/timestamps）；getItems（降序/空）；getItemById（存在/null）；updateItem（更新/strip _id/lastUpdated 更新/不存在 → 抛错）；softDeleteItem（隐藏/includeDeleted 可见/false）；softDeleteItemsByIds（批量/空数组/全未匹配）；restoreItem（NEEDS_REUPLOAD/未软删 → null/不存在）；hardDeleteItem（永久删/false）；writeAuditEntry/getAuditEntries（写入查询/分页/无匹配） |
| `reviewService.test.ts` | `reviewService` | insert；getById（存在/null）；getReviews 降序；getByUserId（过滤 isConversationDeleted/deletedByUser/空）；getByConversationId；updateById（状态更新/null）；deleteById（有其他 review 时不返回 conversationId；最后一条时返回 conversationId；false；从 DB 移除）；addRecord（QUESTION → PENDING_REPLY，其他 → PENDING_REVIEW，null）；translateRecords（summary 翻译/已有 translateText 跳过/null）；updateReviewsAsDeleted（批量标记/空数组） |
| `tokenUsageService.test.ts` | `TokenUsageService` | logTokenUsage 首次插入（totals/cache 字段 undefined 默认为 0/有 cache token）；后续调用 $push/$inc 累加（tokens/cache tokens/undefined cache 视为 0 不产生 NaN）；getConversationTokenUsage null；deleteConversationTokenUsage（true/false）；deleteTokenUsageByConversations（批量删除计数/空/全未匹配） |
| `userDailyLimitService.test.ts`（集成） | `userDailyLimitService` | getUserDailyConversationCount 新用户=0；incrementUserDailyConversationCount 首次=1/累积/持久化验证；hasExceededDailyLimit（<limit=false；=limit=true；>limit=true；新用户=false）；getRemainingConversations（full/递减/不为负）；getDailyLimit 返回配置值；getResetTime 未来 UTC 零点；cleanupOldRecords（删除过期/保留当日） |

---

## 三、测试分层对比总结

### 框架与工具

| 类别 | 工具 | 说明 |
|------|------|------|
| **测试框架** | [Vitest](https://vitest.dev/) | 统一用于单元测试和集成测试；提供 `describe / it / expect / vi`；支持 `vi.mock / vi.hoisted / vi.fn` |
| **HTTP 测试** | [Supertest](https://github.com/ladjs/supertest) | 集成测试中对真实 Express 应用发起 HTTP 请求，无需启动监听端口 |
| **内存数据库** | [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) | 集成测试中启动进程内 MongoDB 实例，测试结束后销毁，无需真实 MongoDB 连接 |
| **Mock 管理** | Vitest 内置（`vi.mock / vi.hoisted`） | `vi.hoisted` 确保 mock 工厂在模块加载前执行；`vi.clearAllMocks` 在 `beforeEach` 重置状态 |
| **时间控制** | Vitest 内置（`vi.useFakeTimers`） | 用于 TTL 缓存、WS token 过期、promisePool retry delay 等时间相关测试 |
| **外部服务 Mock** | `vi.mock(...)` | LLM（LangChain/OpenAI）、Pinecone、Cohere、Google Cloud Storage、Mailer 均 mock，测试完全离线运行 |

### 分层对比

| 维度 | `__tests__`（单元） | `__integration__`（集成） |
|------|-------------------|--------------------------|
| **数据库** | 全 mock（mongodbClient mock） | 真实 mongodb-memory-server |
| **HTTP 层** | mock req/res 对象 | Supertest 发送真实 HTTP 请求 |
| **LLM/外部服务** | mock | mock（Pinecone/GCS/LLM 均 mock） |
| **测试粒度** | 函数/方法级，分支全覆盖 | 端对端链路，状态持久化验证 |
| **优势** | 快速、精确覆盖分支逻辑 | 验证 DB 操作、HTTP 状态码、跨模块协作 |
| **两者互补点** | 单元测试 `userDailyLimitService` 验证纯函数和 DB mock 行为；集成测试验证真实 upsert/increment 语义 |
