# StyleBI k6 Testing Project - 能力映射分析

## 一、已具备的能力清单

根据仓库内容分析，当前项目已实现以下核心能力：

### 1. 压测脚本体系
- ✅ k6 + TypeScript 完整集成
- ✅ Webpack 编译配置
- ✅ 类型安全的脚本开发

### 2. StyleBI 核心交互
- ✅ 登录认证 & Session 管理
- ✅ WebSocket/STOMP 协议建连
- ✅ Viewsheet 打开与关闭
- ✅ 筛选器联动触发
- ✅ 图表区域刷新
- ✅ 等待特定命令（ClearLoadingCommand、SetChartAreasCommand等）

### 3. 并发场景支持
- ✅ 多用户并发压测
- ✅ 活跃/非活跃用户混合场景
- ✅ 不同图表复杂度场景
- ✅ 不同数据量场景
- ✅ 阶梯式负载（ramping-vus）

### 4. 测试数据准备
- ✅ PostgreSQL 基础测试库（~18,000行orders数据）
- ✅ 数据扩容脚本（100K / 1M / 10M）
- ✅ Docker 本地部署支持
- ✅ 批量创建测试用户
- ✅ 批量清理测试用户

---

## 二、测试方案模块映射分析

### ✅ **VS-01 仪表盘冷加载端到端测试** - 可做，需增强

**已有基础：**
- `test-d1.ts` 包含完整冷加载流程
- 登录 → WebSocket建连 → 打开Viewsheet → 等待ClearLoadingCommand
- 已记录 `viewsheet_open_time` 指标

```typescript
// 现有实现片段
new SendAndListenStage(sendOpenViewsheetCommand, "ClearLoadingCommand"),
new LambdaStage(() => viewsheetOpenTime.add(Date.now() - viewsheetOpenStartTime)),
差距分析：

当前测量的是后端交互时间，非浏览器真实首屏指标

缺少完整的冷加载定义（首次打开无缓存 vs 二次打开）

增强建议：

可增加清除缓存步骤模拟真实冷启动

可配合浏览器性能API（需Playwright，当前不支持）

✅ VS-02 筛选器联动响应测试 - 直接支持，最成熟
已有实现完整匹配：

typescript
// 完整联动流程已实现
new BatchStage([
   new LambdaStage(() => startTime = Date.now()),
   new SendAndListenStage(applySelectionWithCounter, "UpdateUndoStateCommand"),
   new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
   new SendAndListenStage(clearSelection.bind(null, selectionListName), "UpdateUndoStateCommand"),
   new SendAndListenStage(refreshChartAreas.bind(null, chartName), "SetChartAreasCommand"),
   new LambdaStage(() => selectionTime.add(Date.now() - startTime)),
])
已有指标：

selection_counter - 联动操作计数

selection_time - 联动响应时间（Trend类型）

结论： 完全支持VS-02，可直接用于筛选器联动性能基准测试

✅ VS-03 仪表盘并发用户压测 - 直接支持，主场景
现有场景配置：

bash
# 400用户
k6 run -e USERS=400 -e RAMPUPTIME=800 -e VSNAME=VSTest1 dist/test-d1.js

# 1000用户  
k6 run -e USERS=1000 -e RAMPUPTIME=2000 -e VSNAME=VSTest1 dist/test-d1.js
负载模型：

typescript
scenarios: {
  main: {
    executor: 'ramping-vus',
    stages: [
      { duration: `${RAMPUP_TIME}s`, target: parseInt(USERS) },
      { duration: `${RAMPUP_TIME}s`, target: parseInt(USERS) },
      { duration: '30s', target: 0 },
      { duration: `${QUIET_PERIOD}s`, target: 0 },
    ],
  }
}
结论： 完美支持VS-03并发阈值探测，阶梯式负载可探测系统瓶颈点

✅ WebSocket/STOMP实时通信 - 基础扎实
已实现的协议层：

typescript
// WebSocket URL构造（含粘性会话支持）
buildWebsocketURL() // 返回 ws(s)://host:port/context/vs-events/{rand1}/{rand2}/websocket

// STOMP协议消息
sendConnectMessage()    // CONNECT帧 + heart-beat
sendSubscribeMessage()  // SUBSCRIBE帧，destination:/user/commands
粘性会话支持：

typescript
// HAProxy SERVERID + AWS ALB cookies
cookieHeader = `SESSION=${value}`;
if (res.cookies["SERVERID"]) cookieHeader += `; SERVERID=${value}`;
for (cookieName startsWith "AWSALB") // 自动包含所有AWS ALB cookies
能力评估：

场景	支持度	说明
WS-01 大规模并发连接	✅ 可做	已有WebSocket连接管理
WS-02 消息推送延迟	⚠️ 部分	需单独拆分指标
WS-03 断线重连恢复	❌ 缺失	无自动重连逻辑
⚠️ Ignite分布式集群验证 - 间接验证，非专项
可验证的场景：

✅ CL-03 节点故障转移 - 可做半自动版（需手动触发故障）

✅ CL-05 分布式Session压力 - 部分可做

无法直接验证的场景：

❌ CL-01 Ignite off-heap配置调优验证

❌ CL-02 affinityCall路由性能

❌ CL-04 分布式锁竞争测试

❌ 无故障注入自动化

原因： 仓库是客户端视角压测，无法感知服务端Ignite集群内部状态

✅ 测试数据准备 - 基础完善
数据规模支持：

text
db/
├── init.sql          # 基础表结构 + 18K orders
├── 100.sql           # 扩容到100K
├── 1m.sql            # 扩容到1M  
└── 10m.sql           # 扩容到10M
对应方案4.1节：

方案定义	仓库对应	状态
orders_small	init.sql (~18K)	✅
orders_medium	100.sql (100K)	✅
orders_large	1m.sql (1M)	✅
orders_xl	10m.sql (10M)	✅
✅ 多用户管理 - 已实现
用户操作脚本：

createUsers.ts - 批量创建测试用户

deleteUsers.ts - 批量清理测试用户

用户命名规范：MULTI_USER_PREFIX + 序号

统一密码：MULTI_USER_PASSWORD

可支撑：

登录并发前的账户准备

多用户Viewsheet并发测试

多组织扩展（需改造，当前无org概念）

三、当前项目不支持的部分
❌ 5.1 查询引擎专项测试
缺失能力：

JDBC查询基准测试

非JDBC连接器查询（如Elasticsearch、MongoDB）

连接池耗尽场景

SQL混合资源竞争

原因： 仓库以Viewsheet/WebSocket交互为主，非直连查询API

❌ 5.2 物化视图(MV)专项测试
缺失能力：

MV build时间测量

MV incremental refresh性能

MV hit/miss对比测试

MVDispatcher队列监控

间接方案： 可对比"有MV的dashboard vs 无MV的dashboard"，但不精确

❌ 5.3 图表与报表渲染专项
缺失能力：

PDF/Excel/CSV导出压测

大数据点图表服务端渲染

导出队列堆积测试

当前能力： 仅有Viewsheet chart refresh，无报表导出功能

❌ 5.7 REST API层专项测试
虽然k6适合做API压测，但当前仓库：

无通用REST API测试框架

无StyleBI REST API接口清单

无API鉴权流程编排

❌ 5.8 多租户隔离测试
当前能力： 只有用户管理，无组织(org)概念
缺失：

org批量创建

org切换场景

host-org配置验证

exposeDefaultOrgToAll场景编排

❌ 5.9 数据连接器横向对比
无按连接器分类的脚本矩阵，无法对比：

MySQL vs PostgreSQL vs Oracle

直连 vs 抽取模式

❌ 5.10 安全认证压测
当前仅"登录获取session"基础能力，缺少：

OAuth2/SAML/LDAP多种认证方式

Token刷新机制测试

认证服务容灾测试

❌ 5.11 存储层专项测试
无以下组件的读写压测脚本：

BlobStorage（文件存储）

MongoDB（文档存储）

FileSystem（文件系统）

❌ 5.12 前端Angular应用测试
完全缺失：

Playwright/Lighthouse集成

浏览器性能采集（FCP、LCP、CLS）

FE-01 ~ FE-04 前端专项测试

当前是k6后端协议测试，无法做浏览器端指标

❌ 6. 监控体系集成
缺失：

Prometheus metrics暴露

Grafana dashboard模板

JVM指标采集编排

Ignite JMX监控配置

当前能力： 仅输出k6原生结果（JSON/CSV/Summary），需外部平台处理

四、总结与建议
可直接使用的模块（优先级高）
模块	成熟度	建议用途
VS-02筛选器联动	⭐⭐⭐⭐⭐	立即用于性能基准测试
VS-03并发压测	⭐⭐⭐⭐⭐	立即用于容量规划
WS-01 WebSocket连接	⭐⭐⭐⭐	可用于连接数压测
测试数据准备	⭐⭐⭐⭐	可用于数据规模测试
多用户管理	⭐⭐⭐⭐	可用于多租户基础测试
需要增强的模块（优先级中）
模块	当前状态	增强工作量
VS-01冷加载	基础框架存在	需增加缓存清理逻辑
WS-02消息延迟	部分实现	需单独拆分指标
集群验证	间接验证	需配合服务端工具
无法支持的模块（需新建设施）
查询引擎专项（5.1）

物化视图专项（5.2）

报表导出专项（5.3）

REST API专项（5.7）

多租户隔离（5.8）

前端应用测试（5.12）

监控体系（6）

建议路线图
短期（1-2周）： 利用现有能力完成VS-02、VS-03、数据准备测试

中期（1个月）： 增强VS-01，补充WS-02/03，实现半自动集群验证

长期（2-3个月）： 根据业务优先级，逐步建设缺失专项模块