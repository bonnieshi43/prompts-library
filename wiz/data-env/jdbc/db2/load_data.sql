-- Db2 LUW data loading.
CONNECT TO ANNTEST;
SET SCHEMA DB2INST1;

DELETE FROM staff_schedule;
DELETE FROM staff;
DELETE FROM services_weekly;
DELETE FROM patients;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM products;
DELETE FROM product_categories;
DELETE FROM member_points_log;
DELETE FROM members;
DELETE FROM reserved_words_test;
DELETE FROM multi_lang_i18n;

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/members.csv OF DEL '
  || 'INSERT INTO members (member_id, member_name, gender, birth_date, phone, email, city, registration_date, total_points, last_login)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/member_points_log.csv OF DEL '
  || 'INSERT INTO member_points_log (member_id, points_change, points_after, reason, log_date)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/product_categories.csv OF DEL '
  || 'INSERT INTO product_categories (category_id, category_name, parent_category, category_level, description)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/products.csv OF DEL '
  || 'INSERT INTO products (product_id, product_name, category_id, price, cost_price, stock_quantity, unit, status, created_date)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/orders.csv OF DEL '
  || 'INSERT INTO orders (order_id, member_id, order_date, total_amount, discount_amount, actual_amount, order_status, payment_method, shipping_city, remark)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/order_items.csv OF DEL '
  || 'INSERT INTO order_items (order_id, product_id, quantity, unit_price)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/patients.csv OF DEL '
  || 'INSERT INTO patients (patient_id, name, age, arrival_date, departure_date, service, satisfaction)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/services_weekly.csv OF DEL '
  || 'INSERT INTO services_weekly (week, month, service, available_beds, patients_request, patients_admitted, patients_refused, patient_satisfaction, staff_morale, event)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/staff.csv OF DEL '
  || 'INSERT INTO staff (staff_id, staff_name, role, service)'
);

CALL SYSPROC.ADMIN_CMD(
  'IMPORT FROM /var/custom/data/staff_schedule.csv OF DEL '
  || 'INSERT INTO staff_schedule (week, staff_id, staff_name, role, service, present)'
);

INSERT INTO reserved_words_test ("select", "from", "where", "group", "order", "user", "type", "default", "values", "table", "index") VALUES
  ('select1', 'from1', 'where1', 'group1', 10, 'user1', 'type1', 'default1', 'values1', 'table1', 'index1');

INSERT INTO multi_lang_i18n (entity_type, entity_key, lang_code, content, remark) VALUES
  ('product_name', 'PRD001', 'zh', 'Smartphone X10 - 2025 flagship', 'Chinese product name'),
  ('product_name', 'PRD001', 'en', 'Smartphone X10 - 2025 Flagship', 'English product name');

SELECT 'members' AS table_name, COUNT(*) AS row_count FROM members
UNION ALL SELECT 'member_points_log', COUNT(*) FROM member_points_log
UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'patients', COUNT(*) FROM patients
UNION ALL SELECT 'services_weekly', COUNT(*) FROM services_weekly
UNION ALL SELECT 'staff', COUNT(*) FROM staff
UNION ALL SELECT 'staff_schedule', COUNT(*) FROM staff_schedule;

SELECT 'DB2 LUW load_data.sql ready' AS status FROM SYSIBM.SYSDUMMY1;

CONNECT RESET;
TERMINATE;
