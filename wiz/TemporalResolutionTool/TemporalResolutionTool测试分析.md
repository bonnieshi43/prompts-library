# TemporalResolutionTool测试分析

---

# 一、测试目标（统一定义）

你的工具本质是：

> **Natural Language → TemporalExpression → Date/DateTime Range**

---

## 🎯 核心验证点（必须统一）

1.  **语义正确性**
    
    *   “last month” → 是否是正确月份
        
2.  **边界正确性**
    
    *   是否覆盖完整范围（不丢、不多）
        
3.  **时区一致性（Phase 2）**
    
    *   用户理解 vs 数据库执行一致
        
4.  **跨数据库一致性**
    
    *   不同引擎结果一致
        
5.  **输入合法性（补充）**
    
    *   非法日期或无法解析表达应被正确处理，而不是静默透传
        

---

# 二、分阶段测试策略（非常关键）

---

## 🟢 Phase 1：仅支持“天”（当前）

### ✔ 范围

*   YEAR / QUARTER / MONTH / WEEK / DAY
    
*   不涉及：
    
    *   时分秒
        
    *   DST
        
    *   timezone
        

---

### 🎯 测试目标

> 确保“日期范围语义绝对正确 + 可安全用于查询”

👉 补充：

*   单天表达不会导致数据丢失
    
*   非法输入不会被当作合法结果返回
    

---

## 🔵 Phase 2：支持“时分秒 + 时区 + DST”

### ✔ 新增能力

*   HOUR / MINUTE / SECOND
    
*   timezone
    
*   DST
    

---

### 🎯 测试目标

> 确保“真实时间窗口正确（跨时区 / DST / DB）”

---

# 三、Phase 1 测试计划（Day级）

---

## 🧩 测试维度

```text
表达类型 × 日历边界 × 数据覆盖验证

```
---

## 1️⃣ 表达类型覆盖（语义层）

---

### 🔹 A. Relative Calendar

| 输入 | 示例 |
| --- | --- |
| today | today |
| yesterday | yesterday |
| last N | last month |
| this N | this week |

👉 补充：

| 输入 | 示例 |
| --- | --- |
| next N（未来时间） | next week / next month |
| tomorrow | tomorrow |

**验证点：**

*   当前实现是否返回 unknown
    
*   是否返回 null
    
*   是否符合预期产品策略（支持 or 明确报错）
    

---

### 🔹 B. Relative Range

| 输入 | 示例 |
| --- | --- |
| past N days | past 7 days |
| past N months | past 3 months |

**补充验证点：**

*   `past 7 days` vs `past 1 week`
    
    *   是否返回一致范围
        
    *   是否存在日历对齐差异
        

---

### 🔹 C. To-date

| 输入 | 示例 |
| --- | --- |
| month to date | MTD |
| year to date | YTD |

---

### 🔹 D. Absolute

| 输入 | 示例 |
| --- | --- |
| 单天 | 2024-04-13 |
| 区间 | 2024-01-01 to 2024-03-31 |
| 月份 | March 2024 |
| 季度 | Q1 2024 |

👉 补充：

| 输入 | 示例 |
| --- | --- |
| 非法日期 | 2024-02-30 / 2024-13-01 |

**验证点：**

*   是否被识别为非法
    
*   是否仍返回 DateRange（当前实现会）
    
*   是否需要拦截或标记错误
    
---

## 2️⃣ 边界测试（核心）

---

### 🔥 必测场景

---

#### Case 1：单天

验证：

*   start == end
    
*   查询结果包含整天数据
    

👉 补充验证：

*   对 DATETIME / TIMESTAMP 列：
    
    *   是否会丢失非 00:00:00 数据

---

#### Case 2：月末

```text
2024-02 (闰年)

```
---

#### Case 3：跨年

```text
last week（跨12月→1月）

```
---

#### Case 4：ISO week

👉 当前实现固定周一开始

补充验证：

| 场景 | 期望 |
| --- | --- |
| 欧洲用户 | 周一开始（符合） |
| 美国用户 | 周日开始（可能不符合） |

### Case 5：单天 + unix\_ts

验证：

*   是否覆盖完整一天
    
*   是否丢数据
    
---

## 3️⃣ 数据验证测试（关键）

👉 不只测解析，要测“数据结果”

---

### 数据构造（标准数据集）

```text
每天3条数据：
00:00:00
12:00:00
23:59:59
同一数据再存一份 unix_ts（秒 / 毫秒）
```
---

### 验证点

| 查询 | 期望 |
| --- | --- |
| 单天 | 返回3条 |
| past 3 days | 返回9条 |

👉 补充：

*   单天查询在 DATETIME 字段上：
    
    *   是否只返回 1 条（错误情况）
        
*   不同表达（past 7 days / past 1 week）：
    
    *   数据量是否一致
     
---

# 四、Phase 2 测试计划（时间 + 时区）

---

## 🧩 测试维度（升级版）

```text
表达 × 时间粒度 × 时区 × DST × 数据库 × 数据类型

```
---

# 1️⃣ 时间粒度测试

---

### 新增表达

| 类型 | 示例 |
| --- | --- |
| hour | last 2 hours |
| minute | past 30 minutes |
| range | today 3pm–5pm |

---

### 验证点

*   精确到秒
    
*   边界正确（左闭右开）
    
---

# 2️⃣ 时区测试（AI BI 必测）

---

## 🌍 测试矩阵

| 用户时区 | 数据库存储 |
| --- | --- |
| UTC | UTC |
| Europe/Berlin | UTC |
| America/New\_York | UTC |

---

## 🔥 核心 case

---

### Case：today（跨时区）

验证：

*   用户看到的“今天”
    
*   实际查询窗口一致
    

---

### Case：past 24 hours

验证：

*   是否真的是 rolling window
    
*   而不是 calendar day
    

### Case：today + unix\_ts

验证：

*   是否按用户时区转换
    
---

# 3️⃣ DST 测试（高优先级）

---

## 必测时间点

*   DST start（少1小时）
    
*   DST end（多1小时）
    

---

## 🔥 Case

---

### Case：past 24 hours

验证：

*   实际跨度是否 = 24小时
    
*   不是“自然日”
    

---

### Case：yesterday

验证：

*   是否包含 23 / 25 小时
    
---

# 4️⃣ 数据库差异测试

---

## 覆盖数据库

*   BigQuery
    
*   Snowflake
    
*   MySQL / PostgreSQL
    

---

## 覆盖类型

覆盖类型：

*   DATE
    
*   DATETIME
    
*   TIMESTAMP
    
*   UNIX\_TIMESTAMP（补充）
    

---

## 🔥 Case

---

### 同一 query：

```text
today

```

验证：

*   不同 DB 结果一致
    

---

👉 补充：

*   DATE vs DATETIME：
    
    *   是否出现数据丢失
        
*   TIMESTAMP（带时区）：
    
    *   是否发生时区偏移
        
---

# 五、AI BI 场景专项测试（非常关键）

---

## 🎯 场景1：指标分析

```text
Show revenue for last 7 days

```

验证：

*   聚合是否正确
    
*   时间窗口是否正确
    

---

## 🎯 场景2：对比分析

```text
Compare this month vs last month

```

验证：

*   两个时间窗口是否对齐
    
---

## 🎯 场景3：趋势分析

```text
daily active users past 30 days

```

验证：

*   是否少一天 / 多一天

---

## 🎯 场景4：实时分析（Phase 2）

```text
orders in last 15 minutes

```

验证：

*   秒级准确性

---

## 🎯 场景5：未来时间（补充）

```text
forecast for next month

```

验证：

*   是否支持 future 表达
    
*   或是否明确返回不可解析
    
---

# 六、AI BI 场景下非常容易出错的时间问题

---

## 🟥 1. “自然语言歧义”问题（很关键）

---

### 🚨 问题

很多表达**本身就不唯一**

---

### 示例

| 表达 | 可能含义 |
| --- | --- |
| last week | 上一个自然周 vs 过去7天 |
| this month | 当前月 vs 当前月到今天 |
| recent days | 3天？7天？ |

---

### ❗风险

👉 LLM + rule engine 可能各自理解不同  
👉 同一个 query 在不同上下文结果不同

---

### Case：歧义表达

```plaintext
last week
this month
recent days
```
---

### 验证

*   是否有**固定定义**
    
*   是否在不同场景一致
    
*   是否和 BI 行业习惯一致
    

---

👉 本质测试点：

```plaintext
语义是否“稳定”
```
---

## 🟥 2. “对齐粒度”问题（非常容易被忽略）

---

### 🚨 问题

时间范围 vs 聚合粒度不一致

---

### 示例

```plaintext
past 7 days → 按 month 展示
```
---

### ❗风险

*   数据被截断
    
*   聚合错位
    

---

### Case

```plaintext
Show revenue for past 7 days by month
```
---

### 验证

*   是否补齐整月
    
*   是否只展示部分月
    
*   是否有清晰规则
    
---

## 🟥 3. “时间字段语义”问题（AI BI 特有）

---

### 🚨 问题

同一张表有多个时间字段：

```plaintext
order_date
create_time
update_time
event_time
```
---

### ❗风险

用户：

```plaintext
Show revenue last month
```

👉 系统选错字段

---

### Case

```plaintext
Show revenue last month
```

表：

*   order\_date
    
*   create\_time
    

---

### 验证

*   是否选对字段
    
*   是否一致
    

---

👉 这个是 AI BI 的核心难点之一（很多系统没测）

---

## 🟥 4. “时间 vs 当前时间”一致性问题

---

### 🚨 问题

`now()` 在不同地方不一致

---

### 示例

```plaintext
LLM解析时间：T1
SQL执行时间：T2（晚几秒/几分钟）
```
---

### ❗风险

*   边界数据错
    
*   实时查询不稳定
    

---

### Case

```plaintext
past 5 minutes
```
---

### 验证

*   多次执行是否一致
    
*   是否使用统一 reference time
    
---

## 🟥 5. “缓存 / 重复查询”问题

---

### 🚨 问题

```plaintext
today
```

如果缓存：

👉 1小时后再查 → 结果不更新

---

### ❗风险

*   实时数据错误
    
*   用户信任下降
    

---

### Case

*   连续两次执行 `today`
    

---

### 验证

*   是否刷新
    
*   是否缓存失效
    
---

## 🟥 6. “跨粒度比较”问题

---

### 🚨 问题

```plaintext
Compare last 7 days vs last month
```
---

### ❗风险

*   时间长度不同
    
*   误导分析
    

---

### 验证

*   是否归一化（daily avg）
    
*   是否提示用户
    
---

## 🟥 7. “空时间 / NULL”处理

---

### 🚨 问题

数据：

```plaintext
event_time = NULL
```
---

### ❗风险

*   被过滤掉
    
*   或错误包含
    

---

### Case

```plaintext
Show all data last month
```
---

### 验证

*   NULL 是否参与
    
*   行为是否一致
    
---

## 🟥 8. “多语言表达差异”（你提了但没测细）

---

### 🚨 问题

不同语言表达粒度不同

---

### 示例

| 语言 | 表达 |
| --- | --- |
| 中文 | 近三个月 |
| 英文 | past 3 months |
| 日文 | 直近3ヶ月 |

---

👉 有些语言：

```plaintext
“近” ≠ “past”
```
---

### Case

多语言同义表达

---

### 验证

*   是否解析一致
    
---

## 🟥 9. “业务日历”问题（高级但真实）

---

### 🚨 问题

企业 often 用：

*   财务月（不是自然月）
    
*   财年（FY2024）
    

---

### ❗风险

```plaintext
last quarter
```

👉 和自然季度不一致

---

### Case

```plaintext
last fiscal quarter
```
---

### 验证

*   是否支持自定义 calendar

---

## 🟥 10. “时间表达组合”问题

---

### 🚨 问题

复杂表达：

```plaintext
past 7 days excluding today
last month until yesterday
```
---

### ❗风险

rule engine 解析失败

---

### Case

组合表达

---

### 验证

*   是否正确拆解
    
*   是否 fallback
    

---

# 七、自动化测试策略（建议）

---

## ✅ 1. 分层测试

| 层 | 内容 |
| --- | --- |
| L1 | 解析（TemporalExpression） |
| L2 | range计算 |
| L3 | SQL生成 |
| L4 | 实际查询结果 |

---

## ✅ 2. Golden Dataset（强烈建议）

👉 固定一份数据：

*   跨月
    
*   跨年
    
*   含 DST
    

---

👉 补充：

*   包含非法日期测试数据（验证健壮性）
    
*   包含边界时间（00:00 / 23:59）
    
---

## ✅ 3. Snapshot测试

```text
query → SQL → result count

```
---

# 八、一句话总结

👉 测这个工具的核心不是：

> “解析对不对”

而是：

> ❗“用户说的时间 → 数据结果是否完全符合直觉，且不会因为边界、非法输入或表达差异产生错误结果”