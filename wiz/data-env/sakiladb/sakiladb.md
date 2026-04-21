# sakiladb

## sakiladb  --数据关系比较全，但是数据比较老

👉 PostgreSQL 版的经典示例库（Sakila 的增强版）

### 特点

*   ✔ 完整业务模型：电影租赁系统
    
*   ✔ 主外键关系非常规范（高度结构化）
    
*   ✔ 表数量适中（20+）
    
*   ✔ 有 **views、functions、triggers**
    
*   ✔ 数据量适中（适合 AI 测试，不会太小也不会太爆）
    

### 覆盖测试场景

*   join（多表路径）
    
*   group by（客户 / 店铺 / 类别）
    
*   时间分析（rental\_date / payment\_date）
    
*   复杂语义（customer → rental → inventory → film）
    
*   view 查询（已封装逻辑）
    

### Docker 使用

```plaintext
docker run -d --name sakiladb -p 5430:5432 sakiladb/postgres
```

jdbc:postgresql://192.168.2.106:5430/sakila

POSTGRES\_USER=sakila

POSTGRES\_PASSWORD="p\_ssW0rd"

### Github地址

[https://github.com/sakiladb/postgres](https://github.com/sakiladb/postgres)
github上还有其他db的例子

### 其他

PostgreSQL 15.4，需要42.x 系列的driver

### 数据可以进行处理（106上已处理）

#### 🥇 STEP 1：时间现代化 + 扰动

```sql
-- 时间整体平移到最近（+20年）并增加随机扰动
UPDATE rental
SET rental_date = rental_date 
    + INTERVAL '20 years'
    + (random() * INTERVAL '30 days'),
    return_date = return_date 
    + INTERVAL '20 years'
    + (random() * INTERVAL '30 days');

UPDATE payment
SET payment_date = payment_date 
    + INTERVAL '20 years'
    + (random() * INTERVAL '30 days');

```
---

#### 🥈 STEP 2：增加数据量（放大 5 倍）

```sql
-- payment 扩容
INSERT INTO payment (customer_id, staff_id, rental_id, amount, payment_date)
SELECT 
  customer_id,
  staff_id,
  rental_id,
  amount * (0.8 + random() * 0.4),
  payment_date + (random() * INTERVAL '365 days')
FROM payment;

-- 可以重复执行 2~3 次

```