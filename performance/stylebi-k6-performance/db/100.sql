-- 1) 建新表（结构+约束复制）
DROP TABLE IF EXISTS "ORDER_DETAILS_100K";
DROP TABLE IF EXISTS "ORDERS_100K";

CREATE TABLE "ORDERS_100K" (LIKE "ORDERS" INCLUDING ALL);
CREATE TABLE "ORDER_DETAILS_100K" (LIKE "ORDER_DETAILS" INCLUDING ALL);

-- 2) 生成 100K orders（从原始 3000 orders 扩出来）
WITH expanded AS (
  SELECT
    o."ORDER_ID" AS old_order_id,
    o."CUSTOMER_ID",
    o."EMPLOYEE_ID",
    o."ORDER_DATE",
    o."DISCOUNT",
    o."PAID",
    row_number() OVER (ORDER BY g.n, o."ORDER_ID") AS rn
  FROM "ORDERS" o
  CROSS JOIN generate_series(1, 40) g(n)  -- 3000*40=120000，够取100K
),
picked AS (
  SELECT *
  FROM expanded
  WHERE rn <= 100000
)
INSERT INTO "ORDERS_100K" ("ORDER_ID","CUSTOMER_ID","EMPLOYEE_ID","ORDER_DATE","DISCOUNT","PAID")
SELECT
  1000000 + rn AS "ORDER_ID",
  "CUSTOMER_ID",
  "EMPLOYEE_ID",
  "ORDER_DATE" + ((rn % 365) || ' days')::interval,
  "DISCOUNT",
  "PAID"
FROM picked;

-- 3) 生成对应 details（保持每单明细结构）
WITH expanded AS (
  SELECT
    o."ORDER_ID" AS old_order_id,
    row_number() OVER (ORDER BY g.n, o."ORDER_ID") AS rn
  FROM "ORDERS" o
  CROSS JOIN generate_series(1, 40) g(n)
),
picked AS (
  SELECT *
  FROM expanded
  WHERE rn <= 100000
)
INSERT INTO "ORDER_DETAILS_100K" ("ORDER_ID","PRODUCT_ID","QUANTITY")
SELECT
  1000000 + p.rn AS "ORDER_ID",
  od."PRODUCT_ID",
  od."QUANTITY"
FROM picked p
JOIN "ORDER_DETAILS" od
  ON od."ORDER_ID" = p.old_order_id;

ANALYZE "ORDERS_100K";
ANALYZE "ORDER_DETAILS_100K";