# Oracle系统账户

根据 Oracle 官方文档，数据库会创建大量的系统账户来支持不同的功能和组件。下面将这些账户分为几类，详细列出其主要功能及普通用户是否可见。

### 🔐 核心管理与数据库管理账户

这些是数据库运行和日常管理所必需的核心账户。

| 用户名 | 主要功能 | 普通用户是否可见 |
| --- | --- | --- |
| `**SYS**` | 数据库的根账户，拥有最高权限，存储了数据库的数据字典。 | **是**（`ALL_USERS`） |
| `**SYSTEM**` | 另一个用于数据库管理任务的账户，权限仅次于 `SYS`。 | **是**（`ALL_USERS`） |
| `**DBSNMP**` | Oracle Enterprise Manager（企业管理器）的监控代理账户，用于收集和管理数据库性能指标。 | **是**（`ALL_USERS`） |
| `**SYSMAN**` | Oracle Enterprise Manager（企业管理器）的管理员账户，用于执行数据库管理任务。 | **是**（`ALL_USERS`） |
| `**MGMT_VIEW**` | 与 Oracle Enterprise Manager 相关的视图账户。 | **是**（`ALL_USERS`） |

### 🛠️ 功能组件专用账户

这些账户用于支持Oracle数据库的特定高级功能。

| 用户名 | 主要功能 | 普通用户是否可见 |
| --- | --- | --- |
| `**CTXSYS**` | Oracle Text（全文检索）组件的核心账户。 | **是**（`ALL_USERS`） |
| `**MDSYS**` | Oracle Spatial and Graph（空间和图形）组件的管理员账户。 | **是**（`ALL_USERS`） |
| `**XDB**` | Oracle XML DB（XML数据库）的账户，用于存储和管理XML数据。 | **是**（`ALL_USERS`） |
| `**WMSYS**` | Oracle Workspace Manager（工作区管理器）的元数据存储账户。 | **是**（`ALL_USERS`） |
| `**LBACSYS**` | Oracle Label Security（标签安全组件）的管理员账户。 | **是**（`ALL_USERS`） |
| `**DVSYS**` | Oracle Database Vault（数据库保险箱）组件的主要账户。 | **是**（`ALL_USERS`） |
| `**DVF**` | Database Vault 账户，包含用于检索数据库Vault因子值的公共函数。 | **是**（`ALL_USERS`） |
| `**AUDSYS**` | 统一审计数据踪迹（unified audit data trail）的存储账户。 | **是**（`ALL_USERS`） |
| `**OUTLN**` | 支持存储大纲（Plan Stability）功能，用于稳定SQL语句的执行计划。 | **是**（`ALL_USERS`） |
| `**APPQOSSYS**` | 用于存储和管理Oracle QoS Management（服务质量管理系统）所需的所有数据和元数据。 | **是**（`ALL_USERS`） |
| `**DBSFWUSER**` | 用于运行 `DBMS_SFW_ACL_ADMIN` 包的账户。 | **是**（`ALL_USERS`） |
| `**GGSYS**` | Oracle GoldenGate 使用的内部账户。 | **是**（`ALL_USERS`） |
| `**GSMADMIN_INTERNAL**` | 拥有 Global Data Services (GDS) 模式的内部账户。 | **是**（`ALL_USERS`） |
| `**GSMCATUSER**` | Global Service Manager 用于连接 Global Data Services 目录的账户。 | **是**（`ALL_USERS`） |
| `**GSMUSER**` | Global Service Manager 用于连接数据库的账户。 | **是**（`ALL_USERS`） |
| `**REMOTE_SCHEDULER_AGENT**` | 用于禁用数据库远程作业的账户。 | **是**（`ALL_USERS`） |
| `**SYS$UMF**` | 用于管理远程管理框架（包括远程AWR）的账户。 | **是**（`ALL_USERS`） |
| `**SYSBACKUP**` | 用于执行备份和恢复任务的账户。 | **是**（`ALL_USERS`） |
| `**SYSDG**` | 用于管理和监控 Oracle Data Guard 的账户。 | **是**（`ALL_USERS`） |
| `**SYSKM**` | 用于执行加密密钥管理的账户。 | **是**（`ALL_USERS`） |
| `**SYSRAC**` | 用于管理 Oracle Real Application Clusters (RAC) 的账户。 | **是**（`ALL_USERS`） |
| `**XS$NULL**` | 代表会话中不存在数据库模式用户的内部账户，表示正在使用应用用户会话。它无法认证登录，也不能拥有任何数据库对象或权限。 | **是**（`ALL_USERS`） |
| `**ANONYMOUS**` | 允许通过 HTTP 匿名访问 Oracle XML DB 的账户。 | **是**（`ALL_USERS`） |
| `**APEX_050100**` | 拥有 Oracle Application Express (APEX) 模式和元数据的账户（版本号可能随安装版本不同而变化）。 | **是**（`ALL_USERS`） |
| `**APEX_PUBLIC_USER**` | 用于在 Oracle Application Express Listener 或 HTTP Server 配置中，进行 Oracle APEX 配置的最低权限账户。 | **是**（`ALL_USERS`） |
| `**FLOWS_FILES**` | 拥有 Oracle Application Express 上传文件的账户。 | **是**（`ALL_USERS`） |
| `**MDDATA**` | Oracle Spatial 和 Graph 用于存储地理编码器和路由器数据的模式。 | **是**（`ALL_USERS`） |
| `**ORACLE_OCM**` | 包含用于 Oracle Configuration Manager 配置收集的检测工具。 | **是**（`ALL_USERS`） |
| `**DIP**` | 目录集成平台（Directory Integration Platform）的账户，用于同步 Oracle Internet Directory 与数据库应用的更改。 | **是**（`ALL_USERS`） |
| `**OLAPSYS**` | 用于创建 OLAP 元数据的用户。 | **是**（`ALL_USERS`） |
| `**ORDSYS**` | Oracle interMedia 图像管理员账户。 | **是**（`ALL_USERS`） |
| `**ORDPLUGINS**` | Oracle interMedia 插件账户，用于支持第三方媒体格式。 | **是**（`ALL_USERS`） |
| `**SI_INFORMN_SCHEMA**` | 静止图像标准浏览账户。 | **是**（`ALL_USERS`） |
| `**WKSYS**` **/** `**WK_TEST**` | 管理 Oracle Ultra Search 的账户。 | **是**（`ALL_USERS`） |
| `**WKPROXY**` | Oracle Ultra Search 代理账户。 | **是**（`ALL_USERS`） |
| `**EXFSYS**` | 表达式过滤器（Expression Filter）组件的账户。 | **是**（`ALL_USERS`） |

### 📚 示例模式账户 (Sample Schemas)

这些账户主要用于学习和演示，包含示例数据。需要特别说明的是，`**HR**` **示例模式在 Oracle 12c 及更高版本中默认随数据库安装**，其他示例模式（如 `OE`、`PM` 等）则需要从 GitHub 仓库下载并手动安装。

| 用户名 | 主要功能 | 普通用户是否可见 |
| --- | --- | --- |
| `**HR**` | Human Resources（人力资源）示例模式，用于基础SQL教学和演示。 | **是**（`ALL_USERS`） |
| `**OE**` | Order Entry（订单录入）示例模式，演示复杂的订单业务场景。 | **是**（`ALL_USERS`） |
| `**PM**` | Product Media（产品媒体）示例模式，用于演示多媒体数据类型的处理。 | **是**（`ALL_USERS`） |
| `**IX**` | Information Exchange（信息交换）示例模式，演示Oracle高级队列（AQ）功能。 | **是**（`ALL_USERS`） |
| `**SH**` | Sales History（销售历史）示例模式，用于演示大数据量下的分析功能。 | **是**（`ALL_USERS`） |
| `**BI**` | Business Intelligence（商业智能）示例模式，主要包含指向 `SH` 模式数据的同义词。 | **是**（`ALL_USERS`） |
| `**CO**` | Customer Orders（客户订单）示例模式，用于演示JSON支持等现代功能。 | **是**（`ALL_USERS`） |
| `**SCOTT**` | 经典的遗留示例模式，包含 `EMP` 和 `DEPT` 两张表。 | **是**（`ALL_USERS`） |

### 💡 核心要点总结

1.  **“可见”不等于“可访问”**：所有列举的账户，普通用户都能在数据字典视图 `ALL_USERS` 中“看见”，但**无法访问**这些账户下的任何数据，除非被明确授予了相应的权限。官方文档明确指出，对于 `ORACLE_MAINTAINED` 列为 `Y` 的账户，不应修改。
    
2.  **默认锁定状态**：出于安全考虑，除了 `SYS`、`SYSTEM` 等少数核心账户，绝大多数系统账户在数据库创建后都是**锁定**状态，并且是“仅模式”账户（没有密码），这可以防止恶意用户利用默认密码登录。
    
3.  **如何查看完整列表**：如需查看当前数据库中所有系统维护的账户，DBA 可以查询 `ALL_USERS` 视图并检查 `ORACLE_MAINTAINED` 列。官方也建议使用 Oracle Enterprise Manager 来获取完整列表。