CREATE DATABASE IF NOT EXISTS annotation_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE annotation_test;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+08:00';

DROP TABLE IF EXISTS multi_lang_i18n;
DROP TABLE IF EXISTS sales_facts;
DROP TABLE IF EXISTS json_test;
DROP TABLE IF EXISTS reserved_words_test;
DROP TABLE IF EXISTS product_inventory;
DROP TABLE IF EXISTS user_profile;

CREATE TABLE user_profile (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NULL,
  email VARCHAR(255) NULL,
  age INT NULL,
  salary DECIMAL(12, 2) NULL,
  is_active BOOLEAN NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_profile (id, name, email, age, salary, is_active, created_at) VALUES
  (1, 'Alice Zhang', 'alice@example.com', 28, 12500.50, TRUE, '2026-01-01 09:00:00'),
  (2, 'Bob Li', 'bob.li@example.com', 35, 22000.00, TRUE, '2026-01-02 10:30:00'),
  (3, 'Charlie Wang', NULL, NULL, NULL, FALSE, '2026-01-03 11:45:00'),
  (4, '', 'empty.name@example.com', 22, 0.00, TRUE, '2026-01-04 12:00:00'),
  (5, 'Special!@#$%', 'special+test@example.com', 41, 99999.99, FALSE, '2026-01-05 13:15:00'),
  (6, 'O''Connor', 'oconnor@example.com', 30, 15888.88, NULL, '2026-01-06 14:20:00'),
  (7, '李雷', 'lilei@example.cn', 26, 18765.43, TRUE, '2026-01-07 15:25:00'),
  (8, 'Grace Chen', 'grace.chen@example.com', 29, -120.50, FALSE, NULL);

CREATE TABLE product_inventory (
  `产品ID` VARCHAR(50) NOT NULL,
  `产品名称` VARCHAR(120) NULL,
  `单价` DECIMAL(10, 2) NULL,
  `库存数量` INT NULL,
  `生产日期` DATE NULL,
  PRIMARY KEY (`产品ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO product_inventory (`产品ID`, `产品名称`, `单价`, `库存数量`, `生产日期`) VALUES
  ('P001', '无线鼠标', 99.90, 150, '2025-11-01'),
  ('P002', '机械键盘', 399.00, 80, '2025-11-15'),
  ('P003', '显示器 27寸', 1299.99, 35, '2025-12-01'),
  ('P004', '', 0.00, 0, '2025-12-10'),
  ('P005', '特殊字符!@#$%', 88.88, 12, '2025-12-20'),
  ('P006', NULL, NULL, NULL, NULL),
  ('P007', '咖啡杯', 29.50, 500, '2026-01-05'),
  ('P008', '数据线 USB-C', 19.90, -5, '2026-01-10');

CREATE TABLE reserved_words_test (
  id INT NOT NULL AUTO_INCREMENT,
  `select` VARCHAR(100) NULL,
  `from` VARCHAR(100) NULL,
  `where` VARCHAR(100) NULL,
  `group` VARCHAR(100) NULL,
  `order` INT NULL,
  sales_fact_id INT NULL,
  user_id INT NULL,
  PRIMARY KEY (id),
  KEY idx_sales_fact_id (sales_fact_id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO reserved_words_test (id, `select`, `from`, `where`, `group`, `order`, sales_fact_id, user_id) VALUES
  (1, 'select-value-1', 'from-value-1', 'where-value-1', 'group-a', 10, 1, 1),
  (2, 'select-value-2', 'from-value-2', 'where-value-2', 'group-b', 20, 2, 2),
  (3, NULL, 'from-null-select', 'where-null-select', 'group-c', 30, 3, 3),
  (4, '', '', '', '', 0, 4, 4),
  (5, 'Special!@#$%', 'from!@#$%', 'where!@#$%', 'group!@#$%', 50, 5, 5),
  (6, '中文保留字测试', '来源表', '条件列', '分组列', NULL, 6, 6),
  (7, 'with spaces', 'source table', 'status = active', 'analytics', -1, 7, 7),
  (8, 'quote''test', 'back`tick', 'percent%test', 'under_score', 80, 8, 8);

CREATE TABLE sales_facts (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  product_id VARCHAR(50) NULL,
  order_date DATE NOT NULL,
  region VARCHAR(20) NOT NULL,
  product_category VARCHAR(50) NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  sales_amount DECIMAL(12,2) NOT NULL,
  quantity INT NOT NULL,
  customer_type VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  discount_rate DECIMAL(5,2) DEFAULT 0.00,
  profit DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_date (order_date),
  KEY idx_region (region),
  KEY idx_category (product_category),
  KEY idx_user_id (user_id),
  KEY idx_product_id (product_id),
  CONSTRAINT fk_sales_user FOREIGN KEY (user_id) REFERENCES user_profile(id),
  CONSTRAINT fk_sales_product FOREIGN KEY (product_id) REFERENCES product_inventory(`产品ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sales_facts (id, user_id, product_id, order_date, region, product_category, product_name, sales_amount, quantity, customer_type, channel, discount_rate, profit) VALUES
  (1, 1, 'P002', '2026-01-15', '华东', '电子产品', '机械键盘', 1599.00, 1, '个人', '线上', 0.00, 480.00),
  (2, 2, 'P001', '2026-01-20', '华南', '电子产品', '无线鼠标', 298.00, 2, '企业', '线下', 5.00, 89.00),
  (3, 2, 'P007', '2026-02-05', '华东', '家居用品', '咖啡杯', 1475.00, 50, '企业', '线上', 10.00, 590.00),
  (4, 7, 'P003', '2026-02-18', '华北', '电子产品', '显示器', 2599.98, 2, '个人', '直播', 0.00, 780.00),
  (5, 1, 'P006', '2026-03-01', '服装', '服装', '运动鞋', 598.00, 2, '个人', '线上', 0.00, 179.00),
  (6, 4, 'P008', '2026-03-10', '西部', '电子产品', '数据线', 119.40, 6, '个人', '线下', 0.00, 35.00),
  (7, 3, 'P005', '2026-03-15', '华东', '食品', '咖啡豆!@#$%', 450.00, 30, '政府', '线上', 15.00, 135.00),
  (8, 6, 'P004', '2026-03-20', '华北', '家居用品', '保温杯', 680.00, 20, '企业', '直播', 20.00, 204.00);

UPDATE reserved_words_test SET sales_fact_id = id, user_id = id WHERE id BETWEEN 1 AND 8;

CREATE TABLE multi_lang_i18n (
  id INT NOT NULL AUTO_INCREMENT,
  entity_type VARCHAR(50) NOT NULL,
  entity_value VARCHAR(100) NOT NULL,
  lang_code VARCHAR(10) NOT NULL,
  description TEXT NOT NULL,
  business_note VARCHAR(500) NULL,
  emoji_test VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_entity_lang (entity_type, entity_value, lang_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO multi_lang_i18n (entity_type, entity_value, lang_code, description, business_note, emoji_test) VALUES
  ('product_category', '电子产品', 'zh', '涵盖电脑配件、智能设备等高科技产品', '高利润品类，建议重点关注', '测试😀'),
  ('product_category', '电子产品', 'en', 'High-tech products including computer accessories and smart devices', 'High margin category, focus recommended', NULL),
  ('product_category', '电子产品', 'ja', 'コンピュータ周辺機器やスマートデバイスを含むハイテク製品', '高利益率カテゴリー、重点的に対応推奨', NULL),
  ('product_category', '家居用品', 'zh', '日用百货、厨房用品、装饰品等', '销量稳定，适合做捆绑销售', NULL),
  ('product_category', '家居用品', 'en', 'Daily necessities, kitchenware, decorations', 'Stable sales volume, suitable for bundle sales', NULL),
  ('product_category', '服装', 'zh', '运动服饰、休闲装等', '季节性明显，春夏款销量更好', NULL),
  ('product_category', '食品', 'zh', '零食、饮料、生鲜等', '复购率高，适合会员营销', NULL),
  ('product_name', '机械键盘', 'zh', '高端机械键盘，适合办公和游戏', '客单价高，目标用户为白领和玩家', NULL),
  ('product_name', '机械键盘', 'en', 'High-end mechanical keyboard for office and gaming', 'High unit price, target users: professionals and gamers', NULL),
  ('product_name', '无线鼠标', 'zh', '人体工学设计，静音按键', '企业采购主力产品', NULL),
  ('product_name', '运动鞋', 'zh', '轻便透气，适合跑步健身', '年轻人偏好，社交媒体推广效果好', NULL),
  ('product_name', '咖啡杯', 'zh', '陶瓷材质，保温效果好', '企业定制礼品首选', NULL),
  ('product_name', '显示器', 'zh', '27寸4K高清显示器', '设计行业标配', NULL),
  ('product_name', '数据线', 'zh', '快充数据线，耐用材质', '低客单价但销量大', NULL);

DROP TABLE IF EXISTS json_test;

CREATE TABLE json_test (
  id INT NOT NULL,
  json_data JSON NULL,
  enum_field ENUM('small', 'medium', 'large', 'special') NULL,
  set_field SET('vip', 'premium', 'order', 'completed', 'high_value', 'pending', 'review', 'positive', 'neutral', 'search', 'click', 'share', 'stock', 'shipped') NULL,
  text_blob TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO json_test (id, json_data, enum_field, set_field, text_blob) VALUES
  (1, JSON_OBJECT('type','order','order_id','ORD-001','user_id',101,'amount',299.00,'status','completed','created_at','2026-01-15 10:30:00','items',JSON_ARRAY(JSON_OBJECT('sku','P001','product_name','无线鼠标','quantity',2,'unit_price',149.50))), 'large', 'order,completed', '订单示例1'),
  (2, JSON_OBJECT('type','order','order_id','ORD-015','user_id',101,'amount',1599.00,'status','completed','created_at','2026-02-20 14:15:00','items',JSON_ARRAY(JSON_OBJECT('sku','P002','product_name','机械键盘','quantity',1,'unit_price',1599.00))), 'large', 'order,high_value', '订单示例2'),
  (3, JSON_OBJECT('type','order','order_id','ORD-008','user_id',102,'amount',598.00,'status','completed','created_at','2026-03-01 09:45:00','items',JSON_ARRAY(JSON_OBJECT('sku','P006','product_name','运动鞋','quantity',2,'unit_price',299.00))), 'medium', 'order', '订单示例3'),
  (4, JSON_OBJECT('type','review','review_id','REV-001','user_id',101,'product_sku','P002','rating',5,'comment','机械键盘手感很好!@#$%','created_at','2026-02-25'), 'small', 'review,positive', '评价示例'),
  (5, JSON_OBJECT('type','behavior','user_id',101,'action','search','keyword','机械键盘','timestamp','2026-02-18 14:00:00'), 'small', 'search', '行为示例'),
  (6, JSON_OBJECT('type','inventory','product_sku','P002','warehouse','北京仓','stock',150,'reserved',23,'available',127,'last_restock','2026-03-15'), 'large', 'stock', '库存示例'),
  (7, JSON_OBJECT('type','user','user_id',103,'name','Carol','city','深圳','vip_level','platinum','register_date','2025-03-20','preferences',JSON_OBJECT('category','美妆','price_range','medium')), 'small', 'vip,premium', '用户示例'),
  (8, JSON_OBJECT('type','misc','nullable',NULL,'emptyString','','special','!@#$%','nested',JSON_OBJECT('list',JSON_ARRAY('a','', '!@#$%'))), 'special', '', 'JSON空值/空字符串/特殊字符');
