# `getCompletedQuery()` 多轮对话问题处理分析

> 源文件：`chat-app/server/src/tools/retrieval/getSubjectArea.ts`
> Prompt：`chat-app/server/prompts/subjectAreas/completeQueryByHistory.prompt`

---

## 1. 整体调用位置

在 `getSubjectArea()` 中，`getCompletedQuery` 与 `getSimpleSubjectArea` **并行执行**（`Promise.all`），目的是节省延迟：

```
getSubjectArea()
  ├── [并行] getSimpleSubjectArea()   → 判断问题属于哪个模块
  └── [并行] getCompletedQuery()      → 将模糊问题补全为独立完整的问句
```

---

## 2. `getCompletedQuery()` 本身的逻辑（`getSubjectArea.ts:303`）

```
输入: question + history + parsedContext
   ↓
无历史? → 直接返回 question（原问题）
   ↓
有历史 → 调用 LLM (completeQueryByHistory prompt)
   ↓
从 LLM 返回 JSON → 取 parsed.query_processing.replaced_query
```

使用的 LLM 由环境变量 `COMPLETE_QUERY_MODEL_NAME` 配置，默认为 `gpt-4.1-mini`。

---

## 3. Prompt 的两阶段算法（`completeQueryByHistory.prompt`）

### Phase 1 — 历史主题提取

- 从聊天历史中提取最近 **3条** SubjectArea（模块 + 子模块 + 是否脚本类问题）
- 严格不看当前问题，独立分析历史
- 每条 SubjectArea 包含字段：`module`、`subModule`、`script`

### Phase 2 — 补全算法（后向搜索 Stack）

| 场景 | 处理方式 |
|------|---------|
| 历史为空 | `replaced_query = original_query`，直接停止 |
| 用户回答确认/选择（"Yes"、"Option A"）| 从上下文重建完整意图，再结合确认内容构造完整问句 |
| 问题已经完整（含动作 + 对象）| 直接停止，不修改 |
| 问题模糊（如"怎么做"）| 从历史栈从后往前找匹配模块，补全为 `[Action] in [Module] [SubModule]` |
| 否定反馈（"我不喜欢X"）| 拉取最近 Active Goal 重组问句 |

#### 模块约束规则

- **Visual 类**动作（高亮/颜色/样式/TopN）→ 只匹配 Dashboard
- **Data 类**动作（加列/分组/聚合）→ 匹配 Dashboard 或 Worksheet
- **禁止**将 Enterprise Manager / Portal 用于 Visual/Data 动作

#### 允许的模块与子模块

| 模块 | 子模块 |
|------|--------|
| Dashboard | chart, table, crosstab, freehand table, trend&comparison, others |
| Data Worksheet | （无子模块） |
| Portal | data source connection, data model, VPM, data security, scheduled task, bookmark |
| Enterprise Manager | administration, scheduled task |

---

## 4. `completedQuery` 的下游使用

```
subjectAreas.ts  → 保存到 LangGraph state: state.completedQuery
      ↓
retrieval.ts     → question: completedQuery || question
                   如果有补全的问句，用它替代原始问题做向量检索
```

**检索缓存说明**：缓存 key 基于原始 `question`，而非 `completedQuery`。同一原始问题在不同对话轮次中，即使补全文本不同，也不会触发重复的向量检索。

---

## 5. 举例说明完整流程

**历史**：
- Q: "如何在图表中添加绑定？" → A: "..."

**当前问题**：`"怎么改颜色？"`（模糊，无上下文）

```
Phase 1:
  history_subject_areas = [{module: "Dashboard", subModule: "chart", script: false}]

Phase 2:
  - "改颜色" = Visual 类动作 → 只匹配 Dashboard
  - 历史栈倒序找到 Dashboard/chart
  - replaced_query = "change color in Dashboard chart"
```

最终检索用的是 `"change color in Dashboard chart"`，而不是原始的 `"怎么改颜色？"`，大幅提高 RAG 检索精度。

---

## 6. 与 `getEnhancedSubjectAreas()` 的关系

`completedQuery` 也被传入 `getEnhancedSubjectAreas()`，在没有明确指定模块的情况下，用补全后的问句重新调用 `getSimpleSubjectArea()` 做二次模块识别，进一步提高 SubjectArea 判断的准确性。

```
getSubjectArea()
  ├── [并行] getSimpleSubjectArea(originalQuestion)
  └── [并行] getCompletedQuery() → completedQuery
        ↓
  若无明确模块 → getEnhancedSubjectAreas(completedQuery)
                   └── getSimpleSubjectArea(completedQuery)  ← 用补全问句重新判断
```
