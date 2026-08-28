StyleBI k6 Test Plan
1. Plan Structure
本计划按两类组织：

Performance 测试

单个 Dashboard

关注数据加载、打开、筛选联动、渲染

并发测试

多用户访问一个或多个 Dashboard，关注稳定性、容量、错误率、性能拐点

优先级   测试项
P0 Dashboard 打开性能基线、Dashboard 筛选联动性能基线
P1 大数据量 Performance 测试、Dashboard 复杂度 Performance 测试、基础并发容量测试
P2 Active/Inactive 用户混合并发测试、多 Dashboard 并发测试、大数据量+并发组合测试
P3 WebSocket 稳定性增强测试、多操作组合并发测试


测试目前的想法以及AI：推荐执行顺序（我们目前主要可以先做1-4，因为1在测试过并发，第二，保证单个性能的前提下做5-8更有意义）

Dashboard 打开性能基线

Dashboard 筛选联动性能基线

大数据量 Performance 测试

Dashboard 复杂度 Performance 测试

基础并发容量测试

Active / Inactive 并发测试

多 Dashboard 并发测试

大数据量 + 并发组合测试

2. Performance 测试（Phase 1）
2.1 P0 - Dashboard 打开性能基线
目标
建立不同复杂度 Dashboard 的打开性能基线。

要验证的问题
Simple / Medium / Large Dashboard 的打开时间分别是多少？

Large Dashboard 在小用户量下是否已经明显偏慢？

打开性能是否随数据量显著增加？

推荐测试资产
Dashboard   复杂度   数据量
Dashboard_Simple  1 图 + 1 选择器 100K
Dashboard_Medium  2~4 图 + 1 选择器  100K / 1M
Dashboard_Large   4 图以上 + 联动  1M / 10M
测试场景
| 场景编号 | Dashboard | 用户量 | 说明 |
|---|---|---|
| PF-OPEN-01 | Dashboard_Simple | 1 | 单用户基线 |
| PF-OPEN-02 | Dashboard_Simple | 1 | 重复打开5次，取平均值 |
| PF-OPEN-03 | Dashboard_Medium | 1 | 单用户基线 |
| PF-OPEN-04 | Dashboard_Large | 1 | 单用户基线 |
| PF-OPEN-05 | Dashboard_Large | 1 | 带缓存 vs 无缓存对比 |

注：本阶段为单用户性能基线测试，不涉及并发。并发测试将在 Phase 2 进行。

输出结论
不同复杂度 Dashboard 性能差异

Large Dashboard 是否为当前首要性能风险

2.2 P0 - Dashboard 筛选联动性能基线
目标
建立单个 Dashboard 在用户执行筛选操作时的响应时间基线。

要验证的问题
Large Dashboard 上做一次筛选要多久？

清除筛选再刷新是否明显变慢？

连续多次筛选是否有性能衰减？

测试场景
场景编号  Dashboard   数据量   筛选操作  用户量
PF-SEL-01   Dashboard_Simple  100K  单次筛选  1
PF-SEL-02   Dashboard_Medium  1M 单次筛选  1
PF-SEL-03   Dashboard_Large   1M 单次筛选  1
PF-SEL-04   Dashboard_Large   10M   单次筛选  1
PF-SEL-05   Dashboard_Large   10M   连续5次不同筛选 1
PF-SEL-06   Dashboard_Large   10M   筛选 → 清除 → 再筛选  1
注：本阶段为单用户联动性能基线测试，不涉及并发。

输出结论
单体联动响应时间基线

Large Dashboard 联动成本 vs 打开成本对比

是否存在筛选性能衰减问题

2.3 P1 - 大数据量 Performance 测试
目标
验证 Dashboard 在不同数据量级下的性能表现，找出数据量拐点。

测试场景
场景编号  Dashboard   数据量   用户量
PF-DATA-01  Dashboard_Medium  100K  1
PF-DATA-02  Dashboard_Medium  500K  1
PF-DATA-03  Dashboard_Medium  1M 1
PF-DATA-04  Dashboard_Large   1M 1
PF-DATA-05  Dashboard_Large   5M 1
PF-DATA-06  Dashboard_Large   10M   1
PF-DATA-07  Dashboard_Large   20M   1（探索拐点）
输出结论
数据量-响应时间曲线

性能拐点数据量阈值

2.4 P1 - Dashboard 复杂度 Performance 测试
目标
验证 Dashboard 在不同图表数量、联动复杂度下的性能表现。

测试场景
场景编号  图表数   联动关系  数据量   用户量
PF-COMP-01  1图 无联动   1M 1
PF-COMP-02  2图 1对1联动 1M 1
PF-COMP-03  4图 全联动   1M 1
PF-COMP-04  6图 全联动   1M 1
PF-COMP-05  8图 全联动 + 交叉筛选  1M 1
输出结论
复杂度-响应时间关系

推荐的最大图表数量

2.5 测试优先级说明
优先级   测试项   执行顺序
P0 2.1 Dashboard 打开性能基线 第1批
P0 2.2 Dashboard 筛选联动性能基线  第2批
P1 2.3 大数据量 Performance 测试 第3批
P1 2.4 Dashboard 复杂度 Performance 测试 第4批
P2 并发测试（Phase 2）  第5批
P3 组合测试（大数据量+并发）  第6批
2.6 术语说明
术语 说明
单用户测试 1个虚拟用户顺序执行操作，测单用户体验
并发测试  多用户同时操作，测系统容量
基线 单用户场景下的性能基准值，用于对比
3. 并发测试（Phase 2）
3.1 P1 - 基础并发容量测试
目标
确认标准 Dashboard 在不同用户量下的性能变化和容量边界。

要验证的问题
单个标准 Dashboard 最多能支持多少并发用户？

在 50 / 100 / 200 / 300 / 500 用户时，错误率和响应时间如何变化？

性能拐点从哪个用户量开始出现？

执行脚本
dist/test-d1.js

建议场景
场景编号  Dashboard   用户量   RAMPUP
CC-BASE-01  Dashboard_Medium  50 2m
CC-BASE-02  Dashboard_Medium  100   3m
CC-BASE-03  Dashboard_Medium  200   5m
CC-BASE-04  Dashboard_Medium  300   6m
CC-BASE-05  Dashboard_Medium  500   10m
记录指标
viewsheet_open_time

selection_time

WebSocket 101 成功率

错误率

输出结论
单 Dashboard 容量曲线

当前环境下可接受并发范围

3.2 P2 - Active / Inactive 用户混合并发测试
目标
模拟真实在线场景，评估活跃和挂起用户混合时的系统表现。

要验证的问题
只保持 Dashboard 打开但不频繁操作的用户，会带来多大资源占用？

活跃用户响应是否会被 inactive 用户拖慢？

执行脚本
dist/test-d3.js

建议场景
场景编号  总用户量  inactive 数  active 数
CC-MIX-01   100   50 50
CC-MIX-02   200   100   100
CC-MIX-03   300   200   100
CC-MIX-04   500   400   100
示例命令
bash
k6 run -e SERVER_IP=localhost -e SERVER_PORT=8080 -e USE_MULTI_USER=true -e USERS=300 -e INACTIVECOUNT=200 -e VSNAME=Dashboard_Medium -e CHART_NAME=Chart1 -e SELECTION_NAME=SelectionList1 dist/test-d3.js
输出结论
在线真实场景下的资源占用趋势

active 用户体验是否下降

3.3 P2 - 多 Dashboard 并发测试
目标
评估多个用户访问多个 Dashboard 时的整体表现。

要验证的问题
多个 Dashboard 混合访问时，系统是否出现明显抖动？

是否有某类复杂 Dashboard 明显拖慢整体系统？

当前仓库支持方式
当前仓库没有统一的"多 Dashboard 随机路由脚本"，所以 v1 采用以下方式：

分多组执行不同 Dashboard 压测

同时间段并行运行多个压测进程

汇总不同 Dashboard 的结果

建议测试组合
组别 Dashboard   占比
A  Dashboard_Simple  50%
B  Dashboard_Medium  30%
C  Dashboard_Large   20%
输出结论
多 Dashboard 混合访问下的整体稳定性

哪类 Dashboard 对系统影响最大

3.4 P2 - 大数据量 + 并发组合测试
目标
验证大数据量与高用户量叠加时的容量边界。

要验证的问题
1M / 10M 数据下，系统还能稳定支撑多少用户？

数据量和并发叠加时，性能拐点是否提前？

执行脚本
dist/test-e2.js

建议场景
场景编号  Dashboard   用户量
CC-DATA-01  Dashboard_1M   50
CC-DATA-02  Dashboard_1M   100
CC-DATA-03  Dashboard_10M  50
CC-DATA-04  Dashboard_10M  100
示例命令
bash
k6 run -e SERVER_IP=localhost -e SERVER_PORT=8080 -e USERS=100 -e RAMPUP_TIME=3m -e VSNAME=Dashboard_10M -e CHART_NAME=Chart1 -e SELECTION_NAME=SelectionList1 dist/test-e2.js
输出结论
数据量与用户量叠加后的拐点

是否需要先优化 large VS，再推进更高并发

4. 增强测试（Phase 3）
4.1 P3 - WebSocket 稳定性增强测试
说明
后续建议新增专门脚本，只做：

登录

建立 WS / STOMP

保持连接

统计连接成功率和断连率

当前不作为 v1 主执行项，但建议纳入下一轮。

4.2 P3 - 多操作组合并发测试
说明
后续建议扩展：

一部分用户只打开 Dashboard

一部分用户频繁筛选

一部分用户切换不同 Dashboard

当前不作为 v1 主执行项，但建议在 P2 完成后再开始。

5. 执行顺序
Step 1：准备阶段
构建项目

初始化数据库

准备 100K / 1M / 10M 数据

导入测试 Dashboard

创建测试用户

Step 2：先做 Performance
P0 Dashboard 打开性能基线

P0 Dashboard 筛选联动性能基线

P1 大数据量 Performance 测试

P1 Dashboard 复杂度 Performance 测试

Step 3：再做并发
P1 基础并发容量测试

P2 Active / Inactive 用户混合测试

P2 多 Dashboard 并发测试

P2 大数据量 + 并发组合测试

6. 结论性建议
当前仓库 v1 最正确的推进方式是：

先用 Performance 测试把 large VS 的问题测清楚

再用并发测试确认容量边界

最后再进入混合场景和增强场景




