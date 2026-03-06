# Viewsheet & Worksheet API 压力测试指南

本文档旨在梳理适合进行压力测试的 Viewsheet 与 Worksheet API，并提供基于不同测试目标的压测场景设计方案。

## 核心原则：选择合适的压测目标

-   **首选读操作与幂等接口**：如果主要目标是进行性能和并发压测，而非验证复杂的业务写入逻辑，应优先选择读取数据、导出、获取状态等操作。这类接口通常对系统资源（CPU、内存、IO）的消耗更具代表性，且无副作用，适合大规模并发。
-   **慎重选择写/删除操作**：对于修改或删除数据的接口（如 `delete`、`remove`、`rename`），建议仅在完全独立的测试环境中，且测试目标为并发一致性或事务处理时使用，避免对共享环境造成数据污染或不可逆影响。
-   **避免压测非核心链路**：部分API（如邮件发送、获取所有列表）依赖外部服务或压测意义不大，不适合作为核心压测目标，可在稳定性测试中酌情使用。

---

## API 压测适用性分析

### Viewsheet API

| Function | API | 适合压测 | 说明与建议 |
| :--- | :--- | :---: | :--- |
| Rename Viewsheet | `post /api/public/viewsheets/rename` | 🔴 不建议 | 写操作，有副作用。 |
| List Open Viewsheets | `get /api/public/viewsheets/open` | ⚪ 必要时 | 压测意义不大，可在稳定性测试或场景中作为辅助检查。 |
| **Open Viewsheet** | `post /api/public/viewsheets/open` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。模拟用户打开仪表盘，是后续所有操作的前提。 |
| Email Viewsheet | `post /api/public/viewsheets/open/{id}/mail` | 🔴 不建议 | 涉及异步队列和外部邮件服务，不能代表BI引擎的核心性能。 |
| Remove Favorite Viewsheet | `post /api/public/viewsheets/favorites/remove` | 🔴 不建议 | 写操作，有副作用。 |
| Add Favorite Viewsheet | `post /api/public/viewsheets/favorites/add` | 🔴 不建议 | 写操作，有副作用。 |
| Delete Viewsheet | `post /api/public/viewsheets/delete` | 🔴 不建议 | 写操作，有副作用。 |
| List All Viewsheets | `get /api/public/viewsheets` | ⚪ 必要时 | 压测意义不大，可在稳定性测试中使用。 |
| Get Open Viewsheet | `get /api/public/viewsheets/open/{id}` | ⚪ 必要时 | 轻量级查询，压测意义不大，可在稳定性测试中使用。 |
| **Close Viewsheet** | `delete /api/public/viewsheets/open/{id}` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。与Open操作成对出现，用于资源清理和模拟会话结束。 |
| **Export Viewsheet** | `get /api/public/viewsheets/open/{id}/export/{format}` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。同步导出，对IO和渲染能力要求高。 |
| **Export Viewsheet Asynchronously** | `get /api/public/viewsheets/open/{id}/async-export/{format}` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。异步导出流程的核心起点。 |
| Get Viewsheet Export Status | `get /api/public/viewsheets/exports/{id}` | ✅ 可尝试 | 用于轮询异步导出状态，在异步导出场景中必须使用。 |
| Remove Viewsheet Export | `delete /api/public/viewsheets/exports/{id}` | 🔴 不建议 | 清理操作，非压测重点。 |
| Get Viewsheet Export Content | `get /api/public/viewsheets/exports/{id}/content` | ✅ 可尝试 | 用于下载异步导出的文件，在异步导出场景中必须使用。 |
| **Get Bookmarks** | `get /api/public/viewsheets/bookmarks/{id}` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。模拟用户在Viewsheet上查看书签的常用操作。 |

### Worksheet API

| Function | API | 适合压测 | 说明与建议 |
| :--- | :--- | :---: | :--- |
| List Open Worksheets | `get /api/public/worksheets/open` | ⚪ 必要时 | 压测意义不大，可在稳定性测试或场景中作为辅助检查。 |
| **Open Worksheet** | `post /api/public/worksheets/open` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。模拟用户打开数据源表，是后续数据操作的前提。 |
| List All Worksheet | `get /api/public/worksheets` | ⚪ 必要时 | 压测意义不大，可在稳定性测试中使用。 |
| Touch Open Worksheet | `get /api/public/worksheets/touch/{id}` | ⚪ OK (⭐) | 轻量操作，用于保活，压测价值一般。 |
| Get Worksheet Parameters | `get /api/public/worksheets/parameters/{id}` | ⚪ 必要时 | 压测意义不大，可在稳定性测试中使用。 |
| Get Open Worksheet | `get /api/public/worksheets/open/{id}` | ⚪ 必要时 | 轻量级查询，压测意义不大。 |
| Close Worksheet | `delete /api/public/worksheets/open/{id}` | ✅ OK | **核心压测接口**。与Open操作成对出现，用于资源清理。 |
| **Get Worksheet Data** | `get /api/public/worksheets/open/{id}/data` | ✅ **OK (⭐⭐⭐)** | **核心压测接口**。高频数据读取，对数据查询引擎压力极大，是发现缓存、并发问题的关键。 |
| Gets Worksheet Metadata | `get /api/public/worksheets/metadata/{id}` | ⚪ 必要时 | 压测意义不大，可在稳定性测试中使用。 |

---

## 压测场景设计

以下场景旨在从不同角度模拟用户行为，对系统进行全面的压力测试。

| 测试场景 | 测试思路 | 并发特点 | Viewsheet API | Worksheet API |
| :--- | :--- | :--- | :--- | :--- |
| **场景1：混合操作 (Scenario1.py)** | 任务集并行，独立测试Viewsheet和Worksheet的核心操作。强调“一个仪表板+其数据源”的联动压测。 | 两种任务类型独立运行，用户行为多样化，适合混合负载测试。 | • 打开Viewsheet<br>• 导出Viewsheet<br>• 获取书签 | • 打开Worksheet<br>• 获取Worksheet数据 |
| **场景2：任务链 (Scenario2.py)** | 任务链串行，模拟用户在**同一个会话**中连续操作。两条链路（VS和WS）并行独立。 | 单个任务集中顺序执行多个步骤，强调操作依赖性和会话保持。 | • 打开Viewsheet<br>• 获取书签 | • 打开Worksheet<br>• 获取Worksheet数据 |
| **场景3：高频数据读取 (Scenario3.py)** | 模拟用户持续刷新Worksheet数据，发现缓存和并发读取的问题。 | 单一任务集中高频执行GET data，低频执行OPEN和DELETE，强调读写比例不均衡。 | 无 | • 打开Worksheet (低频)<br>• **获取Worksheet数据 (高频)** <br>• 获取Open Worksheet (轻量)<br>• 关闭Worksheet (可选) |
| **场景4：异步导出全流程 (Scenario4.py)** | 模拟用户打开仪表盘后执行异步导出并等待结果，覆盖异步任务完整生命周期。 | 单个任务集中执行完整的异步导出链路。 | • 打开Viewsheet<br>• **发起异步导出**<br>• **轮询导出状态**<br>• **下载导出文件**<br>• 清理导出和打开实例<br>• 获取书签/打开列表(轻量) | 无 |
| **场景5：会话/实例抖动 (Scenario5.py)** | 模拟用户高频打开和关闭报表，强调实例生命周期的频繁变化和资源回收。 | 每个用户维护本地实例ID列表，通过任务控制实例数量波动，模拟用户随意打开/关闭标签页的行为。 | • 打开Viewsheet (开)<br>• 关闭Viewsheet (关)<br>• 查看打开列表 (查) | • 打开Worksheet (开)<br>• 关闭Worksheet (关)<br>• 查看打开列表 (查) |
| **多组织场景 (Scenario_multi_org.py)** | 模拟不同组织的用户混合操作，强调多租户隔离下的资源竞争。 | 用户随机选择组织登录。任务集中，高频拉取数据/书签，低频关闭，模拟真实持续交互。 | • 打开Viewsheet<br>• 关闭Viewsheet<br>• 获取书签 | • 打开Worksheet<br>• 关闭Worksheet<br>• 获取Worksheet数据 |

---

## 压测发现的问题记录

通过上述场景的压测，目前已发现并跟踪以下问题：

1.  **Bug #73959**: 缓存数据大量溢出到磁盘，影响IO性能。
2.  **Bug #73948**: 高并发时，磁盘和缓存中的数据存在不一致现象。
3.  **Bug #73971**: 多线程死锁/阻塞问题。
4.  **Bug #73983, #73987**: 内存不足时，`RuntimeSheet` 尝试将数据交换到磁盘过程中产生空指针等异常。
5.  **Bug #73990**: 高并发下，Ignite内部线程池因不当同步操作耗尽，导致功能瘫痪。
6.  **Bug #74001**: 读写锁导致的优先级反转死锁。
7.  **Bug #74010**: 多组织操作时出现死锁警告（代码层面引起）。
8.  **Bug #74032**: 云上多组织操作存在IdentifierGenerator & cache issues存在问题。
