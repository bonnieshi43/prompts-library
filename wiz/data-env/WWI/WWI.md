# WWI

# 强烈推荐：WideWorldImporters

👉 这是微软用来**替代 Northwind / AdventureWorks 的现代版本**

👉 WideWorldImporters（简称 WWI）=

一个现代化电商 + 仓储 + 采购系统 + 自带 OLTP + Data Warehouse（DW）

---

## ✅ 为什么更适合 AI BI

### ✔ 数据更“现代”

*   包含：
    
    *   JSON 字段
        
    *   审计字段
        
    *   更真实的订单流程
        
*   时间数据更合理（虽然也不是最新，但比 AW 好）
    

---

### ✔ 模型更复杂（适合 AI）

*   Sales / Purchasing / Warehouse 多 schema
    
*   有：
    
    *   OLTP 表
        
    *   Data Warehouse（WideWorldImportersDW）
        

---

### ✔ 有 BI 语义

*   已经接近：
    
    *   星型模型
        
    *   fact / dimension
        

---

## Docker 方式启动

### Step 1：下载

👉 GitHub：  
[https://github.com/microsoft/sql-server-samples](https://github.com/microsoft/sql-server-samples)

路径：

[https://github.com/Microsoft/sql-server-samples/releases/tag/wide-world-importers-v1.0](https://github.com/Microsoft/sql-server-samples/releases/tag/wide-world-importers-v1.0)

你需要两个：

*   `WideWorldImporters-Full.bak`（主库）
    
*   `WideWorldImportersDW-Full.bak`（数据仓库）
    

### Step 2：启动 SQL Server

```plaintext
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=StrongPassw0rd!123" -p 1433:1433 --name sqlserver -d mcr.microsoft.com/mssql/server:2022-latest
```
---

### Step 3：拷贝 .bak 进去

```plaintext
docker cp WideWorldImporters-Full.bak sqlserver:/var/opt/mssql/
```
---

### Step 4：进入容器恢复

```plaintext
docker exec -it sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "StrongPassw0rd!123" -C
```

然后执行：

```plaintext
RESTORE DATABASE WideWorldImporters
FROM DISK = '/var/opt/mssql/WideWorldImporters-Full.bak'
WITH REPLACE,
MOVE 'WWI_Primary' TO '/var/opt/mssql/data/WWI_Primary.mdf',
MOVE 'WWI_UserData' TO '/var/opt/mssql/data/WWI_UserData.ndf',
MOVE 'WWI_Log' TO '/var/opt/mssql/data/WWI_Log.ldf',
MOVE 'WWI_InMemory_Data_1' TO '/var/opt/mssql/data/WWI_InMemory_Data_1';
GO
```

## 数据库结构（你需要知道的核心）

WWI 比 AdventureWorks 更复杂，但更“真实”。

---

### 🧩 核心 schema

| Schema | 含义 |
| --- | --- |
| Sales | 销售 |
| Purchasing | 采购 |
| Warehouse | 库存 |
| Application | 通用（人员、城市等） |

---

### 🔗 核心关系链

```plaintext
Customer
  ↓
Orders
  ↓
OrderLines
  ↓
StockItems
```

## 和Sakila库有什么不同（重点）

| 对比 | Sakila | WWI |
| --- | --- | --- |
| 数据复杂度 | 中 | 高 |
| schema 数量 | 1 | 多 schema |
| BI 语义 | 弱 | 强 |
| 时间字段 | 简单 | 丰富 |
| JSON | ❌ | ✔ |