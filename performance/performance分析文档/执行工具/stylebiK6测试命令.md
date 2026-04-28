```
# StyleBI k6 性能测试命令手册

## 一、基础测试命令

### 1.1 单用户验证测试
**用途**：验证基本功能和连接是否正常

```bash
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e RAMPUP_TIME=5s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest" dist/test-d1.js

```


| **关注指标**              | **正常范围** | **说明**    |
| --------------------- | -------- | --------- |
| `viewsheet_open_time` | < 2秒     | 视图加载时间    |
| `selection_time`      | < 1秒     | 选择操作响应时间  |
| `http_req_failed`     | 0%       | HTTP请求成功率 |

🔴 **测试-分析**：第一次启动(冷启动）下的时间是1.4 秒，selection_time（选择操作耗时)是2.1s


k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e RAMPUP_TIME=0s -e VSNAME="Examples/Call Center Monitoring" -e CHART_NAME="Chart" dist/test-d1.js

# 运行3次，取平均值
for /l %i in (1,1,3) do k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e RAMPUP_TIME=0s -e VSNAME="Examples/Call Center Monitoring" -e CHART_NAME="Chart" dist/test-d1.js

测试次数	打开时间	HTTP耗时	结果
第1次	6173ms	68.36ms	✅ 正常
第2次	6242ms	69.05ms	✅ 正常
第3次	6256ms	72.24ms	✅ 正常



---

### **1.2 单用户完整测试**

**用途**：测试所有选择值轮换

bash

```
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e RAMPUP_TIME=5s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" dist/test-d1.js
```


| **关注指标**            | **正常范围** | **说明**  |
| ------------------- | -------- | ------- |
| `selection_counter` | >= 4     | 完成的选择次数 |
| `selection_time`    | < 1秒     | 平均响应时间  |

🔴 **测试-分析**：热启动下的viewsheet open时间458 ms（约 0.46 秒），selection_time: 677.20 ms（约 0.68 秒）

k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e VSNAME=Examples/Census -e CHART_NAME=Chart -e USERS=1 -e RAMPUP_TIME=5s -e ACTION_TYPE=brush -e BRUSH_INDEX=12 dist/test-d1.js

🔴 **测试-分析**： 这个brsuh_index的值是StyleBI 图表 brush 事件里那一个被选中数据点的位置编号(也就是这个点在table length上的值)


---

## **二、并发压力测试**

### **2.1 5用户并发测试**

**用途**：验证中等并发场景

bash

```
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=5 -e RAMPUP_TIME=30s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" dist/test-d1.js
```


| **用户数** | **爬坡时间** | **预计时长** | **预期成功率** |
| ------- | -------- | -------- | --------- |
| 5       | 30秒      | 约2分钟     | 100%      |

🔴 **测试-分析**：热启动下的viewsheet open时间455.80 ms（约 0.46 秒），selection_time: 672.08 ms（约 0.68 秒）


---

### **2.2 10用户并发测试**

**用途**：验证较高并发场景

bash

```
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=10 -e RAMPUP_TIME=60s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" dist/test-d1.js
```


| **用户数** | **爬坡时间** | **预计时长** | **关注点**      |
| ------- | -------- | -------- | ------------ |
| 10      | 60秒      | 约3分钟     | CPU使用率 < 80% |

🔴 **测试-分析**： 10并发现在有问题:Bug #74257


---

### **2.3 20用户压力测试**

**用途**：找到系统瓶颈点

bash

```
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=20 -e RAMPUP_TIME=120s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" dist/test-d1.js
```

---

## **三、慢打开问题诊断**

### **3.1 单视图慢打开诊断**

**用途**：检测视图加载慢的具体原因

bash

```
k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e RAMPUP_TIME=5s -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest" --summary-export slow_view_result.json dist/test-d1.js
```


| **指标**                | **本次值** | **基准值**  | **状态** |
| --------------------- | ------- | -------- | ------ |
| `viewsheet_open_time` | 4863ms  | < 2000ms | ⚠️ 偏慢  |


---

### **3.2 多次测试取平均值**

**用途**：消除偶然性影响

bash

```
# Windows CMD
for /l %i in (1,1,5) do k6 run -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e USERS=1 -e VSNAME=Examples/Census dist/test-d1.js | findstr viewsheet_open_time
```


| **次数** | **打开时间(ms)** | **状态** |
| ------ | ------------ | ------ |
| 1      | -            | -      |
| 2      | -            | -      |
| 3      | -            | -      |
| 4      | -            | -      |
| 5      | -            | -      |
| **平均** | -            | -      |



twoChart 测试场景（多表刷新的业务场景，命令）
k6 run -e TEST_FUNCTION=twoChart -e SERVER_IP=localhost -e CONTEXT_PATH=/sree -e VSNAME_2CHART=TestVS -e CHART_NAME=Chart2 -e SELECTION_NAME=SelectionList2 -e SELECTION_VALUES="Games,Educational,Business" dist/test-d2.js


Create users命令：
k6 run -e CONTEXT_PATH=/sree -e USER_COUNT=10 dist/setup-users.js


多用户登录的时候：admin或者User1能成功，但是user1-user5就失败了
k6 run -e TEST_FUNCTION=twoChart -e CONTEXT_PATH=/sree -e USE_MULTI_USER=true -e MULTI_USER_PREFIX=testuser -e MULTI_USER_PASSWORD=Admin@123456 -e VSNAME_2CHART=TestVS -e CHART_NAME=Chart2 -e SELECTION_NAME=SelectionList2 -e SELECTION_VALUES="Games,Educational,Business" -e USERS=5 dist/test-d2.js（失败）

k6 run -e CONTEXT_PATH=/sree -e USE_MULTI_USER=true -e MULTI_USER_PREFIX=user -e MULTI_USER_PASSWORD=Admin@123456 -e TEST_FUNCTION=twoChart -e VSNAME_2CHART=TestVS -e CHART_NAME=Chart2 -e SELECTION_NAME=SelectionList2 -e SELECTION_VALUES="Games,Educational,Business" -e USERS=1 dist/test-d2.js（成功）


