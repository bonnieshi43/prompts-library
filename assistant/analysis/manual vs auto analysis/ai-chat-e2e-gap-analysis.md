# E2E / 回归测试空白分析

> 基于 `__tests__`（28 个单元测试）、`__integration__`（17 个集成测试）和
> `test/promptfoo-test/`（Promptfoo prompt 测试）的覆盖范围，
> 梳理所有潜在测试场景，并标注各场景是否需要专项 E2E 测试。

### 图例

| 标记 | 含义 |
|------|------|
| ✅ | 已被自动化测试覆盖（单元 / 集成 / Promptfoo） |
| ⏳ | 测试配置存在，用例仍在扩充 |
| 🟢 | 常规使用天然覆盖，**无需专项测试** |
| 🔴 | **回归风险**：代码变更后可能静默失败，需专项测试 |
| 🟡 | **边界条件**：正常使用流程无法触达，需专项测试 |
| ❌ | 一次性手动验证（环境搭建/部署级别，无回归价值） |

---

## 一、LLM 调用质量

| 场景 | 建议 | 说明 |
|------|------|------|
| 真实问题 → LLM 生成回答的通用质量 | 🟢 | 每次对话均可观察；常规使用覆盖 |
| Intent 分类准确性 | ✅ | `intentDetection.test.ts` + `test/src/` YAML 用例框架，含多语言 |
| Subject Area 模块识别准确性 | ✅ | `getSubjectArea.test.ts` 测过滤逻辑；LLM 分类用例已完成 |
| Short-code 完整性（截断/伪造/格式违规） | ✅ | `shortCodeRule/promptfooconfig.yaml`：8 层断言，14 个用例 |
| Multi-turn 查询改写质量（completeQueryByHistory） | ✅ | `completeQuery/promptfooconfig.yaml`：3 层断言，6 类多轮场景 |
| Query Rewrite / Expansion | ✅ | `retrieval-strategies/rewrite-expansion/promptfooconfig.yaml` |
| Query Rewrite / Decomposition（default-strategies） | ⏳ | 配置存在，用例仍在扩充 |
| Answer 通用回答质量（各 context：chart/worksheet/crosstab/script） | 🔴 | Promptfoo 配置尚未创建；prompt 改动后无任何质量回归保护 |
| Think 模式（thinkMode）的输出与标签过滤 | 🟢 | 每次启用 think 模式均可观察；常规使用覆盖 |
| Markdown / 表格 / 代码块在浏览器中的渲染效果 | 🟢 | 每次对话均可观察；常规使用覆盖 |

---

## 二、LangGraph 工作流

| 场景 | 建议 | 说明 |
|------|------|------|
| **节点间 state 传递正确性** | 🔴 | 各节点单独测试，chatApi 集成测试 mock 了整个 `runChatAgent`；字段改名后下游静默收到 `undefined`，无报错 |
| `agenticDecimer` 分支触发（script context） | 🟢 | 在 script context 下正常使用即可观察；手动验证一次即可 |
| `simpleRAGEvaluatorRouter` 路由阈值 | ✅ | `routers.test.ts` 覆盖得分判断逻辑 |
| EvaluatorAgent 充分性判断（isSufficient） | ✅ | `multi-agent/evaluator/promptfooconfig.yaml` |
| **Multi-Agent 三 Agent 协作迭代流程** | 🔴 | EvaluatorAgent 单独有测试；AnswerGeneratorAgent、RetrievalExecutorAgent 及协作循环无测试；迭代结果传递静默失败时全程无报错 |
| `buildRetrieveWorkflow` 独立检索工作流 | 🟢 | AgenticRAG tool 触发时可观察；手动验证一次即可 |

---

## 三、WebSocket 实时推送

| 场景 | 建议 | 说明 |
|------|------|------|
| 客户端收到 step 进度消息（Thinking / Searching…） | 🟢 | 每次对话均可观察 |
| 流式回答逐字符推送 | 🟢 | 每次对话均可观察 |
| **多用户并发时消息不串流（wsMap 隔离）** | 🟡 | 单用户测试永远无法触达；若 wsMap key 变更会导致消息推送到错误用户，静默数据泄露 |
| Admin Portal 实时收到 broadcastToAdmin 消息 | 🟢 | Admin 正常使用 Portal 时可观察 |
| 连接断开重连后消息是否丢失 | 🟢 | 偶发场景；手动断网验证一次即可，无回归价值 |

---

## 四、SSO / 鉴权

| 场景 | 建议 | 说明 |
|------|------|------|
| 真实 IdP 重定向 → 回调 → 颁发 session cookie | ❌ | 部署时一次性验证；无回归价值 |
| JWKS 缓存过期后自动刷新 | ❌ | key rotation 时运维验证；不需要自动化 |
| WS Token 一次性消费（HTTP→WS 升级序列） | 🟢 | 每次打开页面均触发；常规使用覆盖 |
| **JWT 过期后 WS 重新握手** | 🟡 | 只在长时间留在页面 + token 过期时触发；WS 静默断开后无实时进度但无报错 |
| Session / JWT 过期后前端跳转登录页 | 🟢 | 正常使用长时间后可观察；手动验证一次 |

---

## 五、文件上传

| 场景 | 建议 | 说明 |
|------|------|------|
| 真实文件上传到 GCS | ❌ | 部署时一次性验证；GCS 配置级别 |
| 大文件上传（超出 multer 限制）的 413 提示 | 🟢 | 手动拖放大文件一次即可验证；无回归价值 |
| 上传图片后在对话框中预览 | 🟢 | 上传一次图片即可观察 |
| **文档上传 → Pinecone 向量化 → 出现在 RAG 检索结果中** | 🔴 | Pinecone upsert 全程 mock；文档"上传成功"但实际未进入向量库，答案质量静默下降 |

---

## 六、Pinecone / Cohere / 检索链路

| 场景 | 建议 | 说明 |
|------|------|------|
| 向量相似度检索 top-k 召回质量 | 🟢 | 每次对话中可通过回答质量间接观察 |
| Cohere Rerank 重排效果 | 🟢 | 可通过对比 rerank on/off 时的答案质量手动验证 |
| **Answer Cache 命中路径** | 🔴 | `answerCacheService.ts` 零测试；cache 静默失效（始终 miss 或始终 hit 旧答案）在常规使用中无法感知 |
| Pinecone API key 失效时的降级行为 | ❌ | 注入错误凭证一次性验证；无回归价值 |

---

## 七、Admin Portal 工作流

| 场景 | 建议 | 说明 |
|------|------|------|
| 用户点击"不满意" → 提交 Review → Admin Portal 看到通知 | 🟢 | Admin 正常使用 Portal 时可观察 |
| Admin 回复 Review → 邮件发送给用户 | ❌ | 部署时一次性验证 SMTP 配置；无自动化回归价值 |
| **Admin 将 Review 答案加入知识库（submit to Pinecone）** | 🔴 | 同 A-2；文档写入 Pinecone 被 mock，实际未入库但 UI 显示"已提交" |
| Admin Portal 登录、权限校验（role=admin）、页面路由 | 🟢 | Admin 正常登录使用 Portal 时可观察 |

---

## 八、取消请求

| 场景 | 建议 | 说明 |
|------|------|------|
| 用户点击"停止"，浏览器停止显示内容 | 🟢 | 每次点击停止按钮均可观察 |
| **取消后立即发送新问题（generating flag 竞态）** | 🟡 | cancel 异步清理与新请求检查之间存在时序窗口；手动快速操作难以稳定复现；`generating` flag 卡住后用户无法继续使用 |
| 服务端超时自动取消 | 🟢 | LLM 超时时可观察；手动验证一次；无回归价值 |

---

## 九、Prompt 热更新

| 场景 | 建议 | 说明 |
|------|------|------|
| **Admin 修改 prompt → 下一次对话立即使用新 prompt** | 🔴 | `promptApi.test.ts` 仅测文件读写；configService 热重载机制（`Config` getter 是否真的重读文件）从未被测试；旧 prompt 静默服务无报错 |
| Prompt 文件写入后并发请求读到最新内容 | 🟢 | 概率极低的竞态；常规使用中无法稳定触达；无独立测试价值 |

---

## 十、前端 UI 交互

| 场景 | 建议 | 说明 |
|------|------|------|
| 对话历史分页加载（滚动加载更多消息） | 🟢 | 对话数量多时自然触达 |
| 用户点击"复制"、"feedback 按钮（👍/👎）" | 🟢 | 常规使用覆盖；手动点击即可验证 |
| 代码块复制按钮、表格渲染 | 🟢 | 对话中出现代码时可观察 |
| 键盘快捷键（Enter 发送 vs Shift+Enter 换行） | 🟢 | 常规使用覆盖 |
| 错误状态显示（网络断开、服务器 500 的 toast） | 🟢 | 断网或制造服务端错误一次即可验证；无回归价值 |
| 移动端响应式布局、主题切换、i18n | 🟢 | 视觉验收，无回归自动化价值 |

---

## 十一、部署与配置

| 场景 | 建议 | 说明 |
|------|------|------|
| Docker Compose 启动健康检查 | ❌ | 部署时一次性 smoke test |
| 环境变量缺失时启动失败和错误信息 | ❌ | 一次性验证 |
| HTTPS / TLS 证书配置 | ❌ | 部署时一次性验证 |
| **Azure Cosmos DB 路径（DBFactory 分支）** | 🔴 | 所有集成测试固定 `type: 'mongodb'`；CosmosDB 分支任何变更无法被测试发现；Azure 部署时首次暴露 |
| 多实例部署时 wsMap 不共享（无 Redis） | ❌ | 架构设计决策；一次性验证，部署文档说明即可 |

---

## 十二、速率限制

| 场景 | 建议 | 说明 |
|------|------|------|
| 用户达到每日上限后，前端显示提示和禁用输入框 | 🟢 | 手动触发限额一次即可验证 |
| **每日 UTC 午夜配额重置边界** | 🟡 | 依赖日期字符串 `YYYY-MM-DD`；时区配置错误会导致某些用户配额永不重置或提前重置；只在时间边界触发，常规测试无法覆盖 |

---

## 总结：需要专项测试的场景（🔴🟡）

按成本从低到高排序，优先覆盖低成本高价值的场景。

| 优先级 | 场景 | 类型 | 建议测试方式 | 成本 |
|--------|------|------|------------|------|
| **P0** | LangGraph 节点间 state 传递 | 🔴 回归 | Vitest 集成测试（mock LLM，真实 workflow 图，验证各节点输出字段） | 低（无需真实 LLM） |
| **P0** | 取消后立即发新问题（generating flag 竞态） | 🟡 边界 | Vitest 集成测试（POST chat → DELETE cancel → POST chat，验证第二个请求成功） | 低 |
| **P0** | UTC 午夜配额重置边界 | 🟡 边界 | Vitest 集成测试（`vi.useFakeTimers` 推进到 UTC 00:01，验证 `hasExceededDailyLimit` 返回 false） | 低（纯代码逻辑） |
| **P1** | Prompt 热更新（configService 热重载） | 🔴 回归 | Vitest 集成测试（写入新 prompt 文件 → 发请求 → 验证新 prompt 被使用） | 低-中 |
| **P1** | 多用户 WS 消息隔离（wsMap 并发） | 🟡 边界 | Vitest 集成测试（建立两个 WS 连接，验证消息只到达目标连接） | 中 |
| **P1** | Answer Cache 命中/miss 路径 | 🔴 回归 | 单元测试（`normalizedKey`、`createCacheId` 纯函数）+ Pinecone 沙箱集成测试 | 低（单元）/ 中（集成） |
| **P1** | Answer 通用回答质量（各 context） | 🔴 回归 | Promptfoo 配置（冻结文档固件，各 context 分配置） | 中（需补充配置和固件） |
| **P2** | 文档上传 → Pinecone → RAG 检索链路 | 🔴 回归 | Pinecone 沙箱集成测试（上传 → 等待向量化 → 检索验证） | 中 |
| **P2** | Admin submit to Pinecone → 影响 RAG | 🔴 回归 | 同上，复用 Pinecone 沙箱 | 中 |
| **P2** | JWT 过期后 WS 重新握手 | 🟡 边界 | Playwright（短 TTL JWT → 等待过期 → 发消息 → 验证进度条正常） | 中-高 |
| **P2** | Multi-Agent 三 Agent 协作迭代 | 🔴 回归 | 真实 LLM + Pinecone 沙箱（验证 retrievalCount > 1 且最终答案综合多轮内容） | 高 |
| **P3** | Azure Cosmos DB 分支 | 🔴 回归 | CI 中加 CosmosDB Emulator 集成测试 | 高 |
| **P3** | Server 崩溃后 generating flag 清理 | 🟡 边界 | 先实现 startup cleanup job，再补集成测试 | 中（需先实现功能） |
