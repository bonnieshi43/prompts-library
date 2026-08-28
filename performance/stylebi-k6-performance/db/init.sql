-- K6 Load Testing Database
-- Generated schema based on StyleBI orders.sql with 10k+ rows

-- Categories
CREATE TABLE "CATEGORIES"
(
  "CATEGORY_ID"   INTEGER NOT NULL,
  "CATEGORY_NAME" VARCHAR(50),
  CONSTRAINT "PK_CATEGORY_ID" PRIMARY KEY ("CATEGORY_ID")
);

INSERT INTO "CATEGORIES" ("CATEGORY_ID", "CATEGORY_NAME")
VALUES (1, 'Games'),
       (2, 'Educational'),
       (3, 'Business'),
       (4, 'Personal'),
       (5, 'Graphics'),
       (6, 'Office Tools'),
       (7, 'Hardware');

-- Regions
CREATE TABLE "REGIONS"
(
  "REGION_ID" INTEGER NOT NULL,
  "REGION"    VARCHAR(25),
  CONSTRAINT "PK_REGION_ID" PRIMARY KEY ("REGION_ID")
);

INSERT INTO "REGIONS" ("REGION_ID", "REGION")
VALUES (1, 'USA East'),
       (2, 'USA West'),
       (3, 'USA Central'),
       (4, 'USA South');

-- Suppliers
CREATE TABLE "SUPPLIERS"
(
  "SUPPLIER_ID" INTEGER NOT NULL,
  "CONTACT"     VARCHAR(50),
  "COMPANY"     VARCHAR(50),
  "ADDRESS"     VARCHAR(50),
  "CITY"        VARCHAR(25),
  "STATE"       CHAR(2),
  "ZIP"         CHAR(5),
  CONSTRAINT "PK_SUPPLIER_ID" PRIMARY KEY ("SUPPLIER_ID")
);

INSERT INTO "SUPPLIERS" ("SUPPLIER_ID", "CONTACT", "COMPANY", "ADDRESS", "CITY", "STATE", "ZIP")
VALUES (1, 'Matthew Prasad', 'Cyber Opportunities', '1035 Riverview Rd.', 'Seattle', 'WA', '98104'),
       (2, 'Avis Pons', 'Continental Innovations Corp.', '111 Biltmore Dr.', 'New York', 'NY', '10004'),
       (3, 'Allan Haefner', 'Global Networks Ltd.', '17 Archwood Place', 'San Diego', 'CA', '92118'),
       (4, 'Cody Chynoweth', 'Micro Production LLC', '3 Euclid Circle', 'Edison', 'NJ', '08837'),
       (5, 'Edwina Defreitas', 'American Computer Vision', '24 Deerfield Dr.', 'Burlington', 'VT', '05401'),
       (6, 'Jessie Fehrenbach', 'Unified Interworks Resources', '516 Bunts St.', 'Pittsburgh', 'PA', '15215'),
       (7, 'Clinton Orsi', 'Enigma Productions', '308 Magnolia St.', 'Rye', 'NY', '10580'),
       (8, 'Jerri Govea', 'Advanced Integrity', '59 Sherbrook Rd.', 'Morristown', 'NJ', '07960'),
       (9, 'Steve Ploom', 'Lockbox Servers', '12 Moorhouse Ave.', 'Oakland', 'CA', '90287'),
       (10, 'Karen Mitchell', 'TechFlow Systems', '445 Innovation Way', 'Austin', 'TX', '78701'),
       (11, 'David Chen', 'Pacific Data Corp', '890 Harbor Blvd.', 'Portland', 'OR', '97201'),
       (12, 'Lisa Thompson', 'CloudFirst Inc', '234 Summit Ave.', 'Denver', 'CO', '80202'),
       (13, 'Robert Garcia', 'DataStream Solutions', '567 River Rd.', 'Phoenix', 'AZ', '85001'),
       (14, 'Jennifer Walsh', 'InfoTech Partners', '123 Tech Park Dr.', 'Atlanta', 'GA', '30301'),
       (15, 'Michael Brown', 'Digital Dynamics', '789 Circuit Way', 'Dallas', 'TX', '75201');

-- Customers (100 customers)
CREATE TABLE "CUSTOMERS"
(
  "CUSTOMER_ID"  INTEGER            NOT NULL,
  "COMPANY_NAME" VARCHAR(50),
  "ADDRESS"      VARCHAR(50),
  "CITY"         VARCHAR(25),
  "STATE"        CHAR(2),
  "ZIP"          CHAR(5),
  "REGION_ID"    INTEGER            NOT NULL,
  "RESELLER"     SMALLINT DEFAULT 0 NOT NULL,
  CONSTRAINT "PK_CUSTOMER_ID" PRIMARY KEY ("CUSTOMER_ID"),
  CONSTRAINT "FK_CUSTOMER_REGION" FOREIGN KEY ("REGION_ID") REFERENCES "REGIONS" ("REGION_ID")
);

INSERT INTO "CUSTOMERS" ("CUSTOMER_ID", "COMPANY_NAME", "ADDRESS", "CITY", "STATE", "ZIP", "REGION_ID", "RESELLER")
VALUES
(1, 'Interstate Shop', '384 Broad St.', 'Wayne', 'NJ', '18322', 1, 0),
(2, 'Daycare One', '123 Summer Rd.', 'Middletown', 'NJ', '09882', 1, 0),
(3, 'Eastern Data', '7262 18th St.', 'New York', 'NY', '03887', 1, 0),
(4, 'Ernst Handel', '88 Rio Grand Ave.', 'Boulder', 'CO', '38923', 2, 1),
(5, 'George Services', '389 Jardim Rd.', 'Baltimore', 'MD', '82938', 1, 0),
(6, 'Loctite Corp.', '5 Bakers Lane', 'Hartford', 'CT', '39283', 1, 0),
(7, 'Old World Insurance', '1230 Hoes Lane', 'New York', 'NY', '08854', 1, 0),
(8, 'Quick Stop', '71 Mulberry St.', 'Denver', 'CO', '98839', 2, 0),
(9, 'Direct Sales', '4500 River Rd.', 'San Francisco', 'CA', '08854', 2, 1),
(10, 'Specialty Retail', '88 Specialty Dr.', 'Chicago', 'IL', '88938', 3, 1),
(11, 'The Big Cat', '12 Woodpark Ave.', 'Austin', 'TX', '32343', 4, 0),
(12, 'Fast Transportation', '77 Druguz Blvd.', 'Orlando', 'FL', '12343', 4, 0),
(13, 'Computer Tech', '90 First Ave.', 'Los Angeles', 'CA', '11223', 2, 1),
(14, 'InterLand Services', '822 Technology Dr.', 'Rockville', 'MD', '83923', 1, 0),
(15, 'Scheggie Services', '839 Via Gaty Dr.', 'Camden', 'NJ', '12334', 1, 0),
(16, 'Whittaker & Co, Inc', '44 Islander Lane', 'Albany', 'CA', '83923', 2, 0),
(17, 'FISGA Corp', '21 Doger Sound Blvd.', 'New York', 'NY', '28122', 1, 0),
(18, 'Ubermeyer', '8300 Cleveland St.', 'Boston', 'MA', '29183', 1, 0),
(19, 'Software Specialists', '300 Great Swamp Rd.', 'Newark', 'NJ', '23445', 1, 1),
(20, 'Folk Mining', '345 Sewgen Dr.', 'Tucson', 'AZ', '11234', 2, 0),
(21, 'West Coast Customs', '460 Newcomb Dr.', 'Los Angeles', 'CA', '73646', 2, 0),
(22, 'Big Eds BBQ', '23 Tasaga Ave.', 'Houston', 'TX', '23421', 4, 0),
(23, 'World Software Resellers', '563 Uptown Dr.', 'Boston', 'MA', '28275', 1, 1),
(24, 'High Society Investments', '1248 Broadway', 'New York', 'NY', '27834', 1, 0),
(25, 'Rutgers Bank', '283 Davidson Dr.', 'New Brunswick', 'NJ', '08854', 1, 0),
(26, 'Nova Tera', '987 First Ave.', 'Dallas', 'TX', '23123', 4, 0),
(27, 'Infinity Software', '32 West Boyd Ave.', 'Seattle', 'WA', '93847', 2, 1),
(28, 'Tricounty Auto', '389 York St.', 'York', 'PA', '48873', 1, 0),
(29, 'Northwest Outfitters', '17 Main St.', 'Olympia', 'WA', '93717', 2, 0),
(30, 'AMG Logistics', '283 Handley Rd.', 'Springfield', 'MA', '01923', 1, 0),
(31, 'BigMart Foodstores', '8874 Shiphouse Rd.', 'Dallas', 'TX', '48374', 4, 0),
(32, 'Tumbleweed Gaming', '487 City St.', 'Las Vegas', 'NV', '93847', 2, 0),
(33, 'FMG Consulting', '9381 Mayor Brown Hwy.', 'Baltimore', 'MD', '53747', 1, 0),
(34, 'XO Resellers', '77 Huntington Ave.', 'Cambridge', 'MA', '02938', 1, 1),
(35, 'Pharma Research', '38 Commercial Ave.', 'Plainfield', 'NJ', '08273', 1, 0),
(36, 'Tech Innovations LLC', '500 Innovation Blvd.', 'San Jose', 'CA', '95112', 2, 1),
(37, 'Midwest Manufacturing', '200 Industrial Way', 'Detroit', 'MI', '48201', 3, 0),
(38, 'Southern Comfort Foods', '150 Peach St.', 'Atlanta', 'GA', '30301', 4, 0),
(39, 'Pacific Trading Co', '888 Harbor View', 'Seattle', 'WA', '98101', 2, 1),
(40, 'Mountain Electronics', '321 Peak Rd.', 'Denver', 'CO', '80201', 2, 0),
(41, 'Coastal Ventures', '45 Beach Blvd.', 'Miami', 'FL', '33101', 4, 0),
(42, 'Prairie Systems', '678 Plains Ave.', 'Omaha', 'NE', '68101', 3, 0),
(43, 'Desert Tech', '234 Cactus Way', 'Phoenix', 'AZ', '85001', 2, 0),
(44, 'Great Lakes Supply', '567 Lakefront Dr.', 'Chicago', 'IL', '60601', 3, 1),
(45, 'New England Consulting', '890 Harbor Rd.', 'Providence', 'RI', '02901', 1, 0),
(46, 'Lone Star Industries', '123 Ranger Rd.', 'Houston', 'TX', '77001', 4, 0),
(47, 'Golden Gate Partners', '456 Bay St.', 'San Francisco', 'CA', '94101', 2, 1),
(48, 'Evergreen Solutions', '789 Forest Lane', 'Portland', 'OR', '97201', 2, 0),
(49, 'Capital Investments', '100 Penn Ave.', 'Washington', 'DC', '20001', 1, 0),
(50, 'Heartland Services', '234 Main St.', 'Kansas City', 'MO', '64101', 3, 0),
(51, 'Sunbelt Distribution', '567 Sunny Way', 'Phoenix', 'AZ', '85002', 2, 0),
(52, 'Metro Systems', '890 Urban Ave.', 'Philadelphia', 'PA', '19101', 1, 1),
(53, 'Valley Tech', '123 Silicon Dr.', 'San Jose', 'CA', '95113', 2, 1),
(54, 'Harbor Industries', '456 Dock St.', 'Baltimore', 'MD', '21201', 1, 0),
(55, 'Summit Enterprises', '789 Mountain Rd.', 'Salt Lake City', 'UT', '84101', 2, 0),
(56, 'River City Trading', '100 Waterfront', 'Memphis', 'TN', '38101', 4, 0),
(57, 'Northern Lights Co', '234 Aurora Ave.', 'Minneapolis', 'MN', '55401', 3, 0),
(58, 'Bayou Systems', '567 Marsh Rd.', 'New Orleans', 'LA', '70112', 4, 0),
(59, 'Rocky Mountain Data', '890 Alpine Way', 'Denver', 'CO', '80202', 2, 0),
(60, 'Atlantic Commerce', '123 Shore Dr.', 'Virginia Beach', 'VA', '23451', 1, 1),
(61, 'Pacific Rim Imports', '456 Ocean Blvd.', 'Long Beach', 'CA', '90801', 2, 0),
(62, 'Midwest Distributors', '789 Central Ave.', 'St. Louis', 'MO', '63101', 3, 1),
(63, 'Gulf Coast Industries', '100 Marina Way', 'Tampa', 'FL', '33601', 4, 0),
(64, 'Appalachian Resources', '234 Mountain View', 'Charlotte', 'NC', '28201', 4, 0),
(65, 'Southwest Solutions', '567 Desert Rose', 'Albuquerque', 'NM', '87101', 2, 0),
(66, 'Great Plains Trading', '890 Prairie Rd.', 'Oklahoma City', 'OK', '73101', 3, 0),
(67, 'Eastern Seaboard Corp', '123 Coastal Hwy.', 'Boston', 'MA', '02101', 1, 0),
(68, 'Western Frontier LLC', '456 Pioneer Way', 'Las Vegas', 'NV', '89101', 2, 1),
(69, 'Central Valley Supply', '789 Farm Rd.', 'Fresno', 'CA', '93701', 2, 0),
(70, 'Southern Hospitality', '100 Magnolia St.', 'Nashville', 'TN', '37201', 4, 0),
(71, 'Northern Exposure Inc', '234 Tundra Ave.', 'Anchorage', 'AK', '99501', 2, 0),
(72, 'Island Trading Co', '567 Tropical Way', 'Honolulu', 'HI', '96801', 2, 0),
(73, 'Tri-State Logistics', '890 Border Rd.', 'Newark', 'NJ', '07101', 1, 1),
(74, 'Four Corners Tech', '123 Mesa Dr.', 'Flagstaff', 'AZ', '86001', 2, 0),
(75, 'Twin Cities Partners', '456 Lake St.', 'Minneapolis', 'MN', '55402', 3, 0),
(76, 'Emerald City Systems', '789 Rain St.', 'Seattle', 'WA', '98102', 2, 0),
(77, 'Crescent City Trading', '100 French Quarter', 'New Orleans', 'LA', '70113', 4, 0),
(78, 'Motor City Industries', '234 Assembly Line', 'Detroit', 'MI', '48202', 3, 0),
(79, 'Gateway West Corp', '567 Arch Way', 'St. Louis', 'MO', '63102', 3, 1),
(80, 'Sunshine State Tech', '890 Palm Dr.', 'Orlando', 'FL', '32801', 4, 0),
(81, 'Empire State Solutions', '123 Broadway', 'New York', 'NY', '10001', 1, 1),
(82, 'Keystone Industries', '456 Liberty Ave.', 'Pittsburgh', 'PA', '15201', 1, 0),
(83, 'Lone Pine Trading', '789 Desert Way', 'Reno', 'NV', '89501', 2, 0),
(84, 'Magnolia Enterprises', '100 Southern Blvd.', 'Jackson', 'MS', '39201', 4, 0),
(85, 'Cedar Rapids Corp', '234 Corn Field Rd.', 'Des Moines', 'IA', '50301', 3, 0),
(86, 'Palmetto Partners', '567 Beach Access', 'Charleston', 'SC', '29401', 4, 0),
(87, 'Bluegrass Industries', '890 Horse Farm Ln.', 'Louisville', 'KY', '40201', 3, 0),
(88, 'Hoosier Tech', '123 Speedway Dr.', 'Indianapolis', 'IN', '46201', 3, 0),
(89, 'Buckeye Systems', '456 Stadium Way', 'Columbus', 'OH', '43201', 3, 1),
(90, 'Badger State Supply', '789 Cheese Factory', 'Milwaukee', 'WI', '53201', 3, 0),
(91, 'Volunteer Trading', '100 Country Music', 'Nashville', 'TN', '37202', 4, 0),
(92, 'Razorback Industries', '234 Hog Farm Rd.', 'Little Rock', 'AR', '72201', 4, 0),
(93, 'Sooner Solutions', '567 Oil Field Dr.', 'Tulsa', 'OK', '74101', 3, 0),
(94, 'Husker Tech', '890 Cornhusker Hwy.', 'Lincoln', 'NE', '68501', 3, 0),
(95, 'Mountaineer Corp', '123 Coal Mine Rd.', 'Charleston', 'WV', '25301', 1, 0),
(96, 'Tar Heel Trading', '456 Tobacco Row', 'Raleigh', 'NC', '27601', 4, 1),
(97, 'Pelican Partners', '789 Bayou Rd.', 'Baton Rouge', 'LA', '70801', 4, 0),
(98, 'Granite State Tech', '100 Live Free Dr.', 'Manchester', 'NH', '03101', 1, 0),
(99, 'Green Mountain Co', '234 Maple Syrup Ln.', 'Burlington', 'VT', '05401', 1, 0),
(100, 'Pine Tree Industries', '567 Lobster Way', 'Portland', 'ME', '04101', 1, 0);

-- Products (50 products)
CREATE TABLE "PRODUCTS"
(
  "PRODUCT_ID"     INTEGER NOT NULL,
  "PRODUCT_NAME"   VARCHAR(50),
  "DESCRIPTION"    VARCHAR(255),
  "PRICE"          NUMERIC(8, 2),
  "SUPPLIER_ID"    INTEGER NOT NULL,
  "CATEGORY_ID"    INTEGER NOT NULL,
  "NUMBER_INSTOCK" INTEGER,
  "REORDER_LEVEL"  INTEGER,
  CONSTRAINT "PK_PRODUCT_ID" PRIMARY KEY ("PRODUCT_ID"),
  CONSTRAINT "FK_PRODUCT_SUPPLIER" FOREIGN KEY ("SUPPLIER_ID") REFERENCES "SUPPLIERS" ("SUPPLIER_ID"),
  CONSTRAINT "FK_PRODUCT_CATEGORY" FOREIGN KEY ("CATEGORY_ID") REFERENCES "CATEGORIES" ("CATEGORY_ID")
);

INSERT INTO "PRODUCTS" ("PRODUCT_ID", "PRODUCT_NAME", "DESCRIPTION", "PRICE", "SUPPLIER_ID", "CATEGORY_ID", "NUMBER_INSTOCK", "REORDER_LEVEL")
VALUES
(1, 'Xconnect Server', 'XML connectivity tool', 2250.00, 5, 3, 7, 10),
(2, 'InsideView', 'Database browser', 125.00, 5, 3, 56, 50),
(3, 'Info Folder', 'Document management tool', 399.00, 1, 6, 55, 50),
(4, 'Green Planet', 'Personal health monitor', 75.00, 8, 4, 32, 25),
(5, 'House Hunter', 'House hunting assistant', 129.00, 8, 4, 104, 50),
(6, 'Fast Mail', 'Lightweight email agent', 39.00, 3, 6, 78, 50),
(7, 'Sync Me', 'Palm power sync', 145.00, 3, 4, 30, 25),
(8, 'WebCalendar', 'Web enabled calendar/org', 248.00, 2, 6, 18, 25),
(9, 'True Action', 'Java game toolkit', 398.00, 7, 4, 33, 25),
(10, 'Fancy Menus', 'Collection of menus', 49.00, 4, 5, 113, 50),
(11, 'Mega Icons', 'Over 10000 icons', 550.00, 4, 5, 34, 25),
(12, 'MeToo AppServer', 'Application server', 3000.00, 2, 3, 8, 10),
(13, 'Easy Chess', 'Chess game', 35.00, 7, 1, 72, 50),
(14, 'Fast Go Game', 'Chinese Go game', 200.00, 7, 1, 42, 25),
(15, 'Web Bridge', 'Bridge game', 105.00, 7, 1, 50, 50),
(16, 'Combat Hero', 'Action game', 29.00, 7, 1, 63, 50),
(17, 'Animal World', 'Educational software', 59.00, 6, 2, 59, 50),
(18, 'Learn ABC', 'Learn ABC', 75.00, 6, 2, 96, 50),
(19, 'Math for Me', 'Math tutor', 235.00, 6, 2, 67, 25),
(20, 'Barbies Fashion', 'Girls game', 79.00, 6, 1, 98, 50),
(21, 'Wireless Mouse', 'Wireless optical USB mouse', 40.00, 9, 7, 42, 25),
(22, 'Wireless Keyboard', 'Wireless USB keyboard', 40.00, 9, 7, 45, 25),
(23, '17 Inch LCD', '17 inch LCD monitor', 210.00, 9, 7, 0, 10),
(24, '19 inch LCD', '19 inch LCD monitor', 310.00, 9, 7, 20, 15),
(25, 'NetStorage', '500 GB network storage', 2850.00, 9, 7, 6, 5),
(26, 'CloudSync Pro', 'Cloud synchronization tool', 199.00, 10, 3, 45, 30),
(27, 'DataVault', 'Secure data storage', 599.00, 10, 3, 22, 15),
(28, 'QuickReport', 'Report generator', 349.00, 11, 6, 38, 25),
(29, 'FormBuilder', 'Form design tool', 249.00, 11, 6, 52, 40),
(30, 'PhotoEdit Pro', 'Professional photo editor', 449.00, 12, 5, 28, 20),
(31, 'VectorDraw', 'Vector graphics editor', 379.00, 12, 5, 35, 25),
(32, 'CodeMaster', 'IDE for developers', 599.00, 13, 3, 18, 15),
(33, 'TestRunner', 'Automated testing tool', 299.00, 13, 3, 42, 30),
(34, 'DBOptimizer', 'Database optimization', 799.00, 14, 3, 12, 10),
(35, 'NetMonitor', 'Network monitoring', 449.00, 14, 3, 25, 20),
(36, 'SpaceQuest', 'Space exploration game', 49.00, 7, 1, 85, 50),
(37, 'Racing Thunder', 'Racing simulation', 59.00, 7, 1, 92, 50),
(38, 'Puzzle Master', 'Brain training puzzles', 29.00, 7, 1, 120, 75),
(39, 'History Explorer', 'Interactive history', 89.00, 6, 2, 45, 30),
(40, 'Science Lab', 'Virtual science experiments', 149.00, 6, 2, 38, 25),
(41, '24 inch Monitor', '24 inch 4K monitor', 450.00, 9, 7, 15, 10),
(42, 'Gaming Headset', 'Surround sound headset', 129.00, 9, 7, 55, 35),
(43, 'Webcam HD', 'HD webcam with mic', 89.00, 9, 7, 68, 40),
(44, 'USB Hub 7-Port', '7-port USB 3.0 hub', 45.00, 9, 7, 95, 60),
(45, 'External SSD 1TB', '1TB portable SSD', 159.00, 15, 7, 32, 20),
(46, 'Backup Suite', 'Automated backup solution', 179.00, 15, 6, 48, 30),
(47, 'Password Manager', 'Secure password vault', 49.00, 15, 4, 150, 100),
(48, 'VPN Pro', 'Virtual private network', 79.00, 15, 4, 200, 150),
(49, 'Antivirus Plus', 'Complete security suite', 99.00, 15, 4, 175, 125),
(50, 'System Cleaner', 'PC optimization tool', 39.00, 15, 6, 220, 150);

-- Sales Employees (10 employees)
CREATE TABLE "SALES_EMPLOYEES"
(
  "EMPLOYEE_ID" INTEGER NOT NULL,
  "FIRST_NAME"  VARCHAR(25),
  "LAST_NAME"   VARCHAR(25),
  "QUOTA"       NUMERIC(10, 2),
  "REGION_ID"   INTEGER NOT NULL,
  CONSTRAINT "PK_EMPLOYEE" PRIMARY KEY ("EMPLOYEE_ID"),
  CONSTRAINT "FK_EMPLOYEE_REGION" FOREIGN KEY ("REGION_ID") REFERENCES "REGIONS" ("REGION_ID")
);

INSERT INTO "SALES_EMPLOYEES" ("EMPLOYEE_ID", "FIRST_NAME", "LAST_NAME", "QUOTA", "REGION_ID")
VALUES
(1, 'Sue', 'Marston', 150000.00, 1),
(2, 'Eric', 'Heggenbart', 250000.00, 1),
(3, 'Robert', 'Miller', 150000.00, 2),
(4, 'Annie', 'Duke', 250000.00, 2),
(5, 'James', 'Wilson', 200000.00, 3),
(6, 'Maria', 'Garcia', 175000.00, 3),
(7, 'David', 'Lee', 225000.00, 4),
(8, 'Sarah', 'Johnson', 180000.00, 4),
(9, 'Michael', 'Brown', 200000.00, 1),
(10, 'Jennifer', 'Davis', 190000.00, 2);

-- Contacts (one per customer)
CREATE TABLE "CONTACTS"
(
  "CONTACT_ID"  INTEGER NOT NULL,
  "CUSTOMER_ID" INTEGER NOT NULL,
  "FIRST_NAME"  VARCHAR(25),
  "LAST_NAME"   VARCHAR(25),
  CONSTRAINT "PK_CONTACT" PRIMARY KEY ("CONTACT_ID"),
  CONSTRAINT "FK_CONTACT_CUSTOMER" FOREIGN KEY ("CUSTOMER_ID") REFERENCES "CUSTOMERS" ("CUSTOMER_ID")
);

INSERT INTO "CONTACTS" ("CONTACT_ID", "CUSTOMER_ID", "FIRST_NAME", "LAST_NAME")
SELECT
  c."CUSTOMER_ID",
  c."CUSTOMER_ID",
  (ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Lisa', 'Robert', 'Maria',
         'William', 'Jennifer', 'Richard', 'Patricia', 'Joseph', 'Linda', 'Thomas', 'Barbara', 'Charles', 'Susan',
         'Christopher', 'Jessica', 'Daniel', 'Margaret', 'Matthew', 'Nancy', 'Anthony', 'Karen', 'Mark', 'Betty'])[1 + (c."CUSTOMER_ID" % 30)],
  (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
         'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
         'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'])[1 + ((c."CUSTOMER_ID" * 7) % 30)]
FROM "CUSTOMERS" c;

-- Orders table
CREATE TABLE "ORDERS"
(
  "ORDER_ID"    INTEGER            NOT NULL,
  "CUSTOMER_ID" INTEGER            NOT NULL,
  "EMPLOYEE_ID" INTEGER            NOT NULL,
  "ORDER_DATE"  TIMESTAMP,
  "DISCOUNT"    NUMERIC(3, 2),
  "PAID"        SMALLINT DEFAULT 0 NOT NULL,
  CONSTRAINT "PK_ORDERS" PRIMARY KEY ("ORDER_ID"),
  CONSTRAINT "FK_ORDER_CUSTOMER" FOREIGN KEY ("CUSTOMER_ID") REFERENCES "CUSTOMERS" ("CUSTOMER_ID"),
  CONSTRAINT "FK_ORDER_EMPLOYEE" FOREIGN KEY ("EMPLOYEE_ID") REFERENCES "SALES_EMPLOYEES" ("EMPLOYEE_ID")
);

-- Order Details table
CREATE TABLE "ORDER_DETAILS"
(
  "ORDER_ID"   INTEGER NOT NULL,
  "PRODUCT_ID" INTEGER NOT NULL,
  "QUANTITY"   INTEGER,
  CONSTRAINT "PK_ORDER_DETAILS" PRIMARY KEY ("ORDER_ID", "PRODUCT_ID"),
  CONSTRAINT "FK_DETAIL_ORDER" FOREIGN KEY ("ORDER_ID") REFERENCES "ORDERS" ("ORDER_ID"),
  CONSTRAINT "FK_DETAIL_PRODUCT" FOREIGN KEY ("PRODUCT_ID") REFERENCES "PRODUCTS" ("PRODUCT_ID")
);

-- Generate 3000 orders spanning 2 years (2023-2024)
-- This uses a deterministic approach based on order_id to generate consistent data
INSERT INTO "ORDERS" ("ORDER_ID", "CUSTOMER_ID", "EMPLOYEE_ID", "ORDER_DATE", "DISCOUNT", "PAID")
SELECT
  12000 + s.id AS "ORDER_ID",
  1 + (s.id % 100) AS "CUSTOMER_ID",
  1 + (s.id % 10) AS "EMPLOYEE_ID",
  TIMESTAMP '2023-01-01' + (s.id % 730) * INTERVAL '1 day' + (s.id % 24) * INTERVAL '1 hour' AS "ORDER_DATE",
  CASE WHEN s.id % 10 = 0 THEN 0.10 WHEN s.id % 20 = 0 THEN 0.15 WHEN s.id % 50 = 0 THEN 0.20 ELSE 0.00 END AS "DISCOUNT",
  CASE WHEN s.id % 15 = 0 THEN 0 ELSE 1 END AS "PAID"
FROM generate_series(1, 3000) AS s(id);

-- Generate order details (4-6 items per order = ~15000 rows)
-- Each order gets multiple products with varying quantities
INSERT INTO "ORDER_DETAILS" ("ORDER_ID", "PRODUCT_ID", "QUANTITY")
SELECT
  o."ORDER_ID",
  p.product_id,
  1 + ((o."ORDER_ID" + p.product_id) % 20) AS "QUANTITY"
FROM "ORDERS" o
CROSS JOIN LATERAL (
  SELECT DISTINCT 1 + ((o."ORDER_ID" * idx + o."CUSTOMER_ID") % 50) AS product_id
  FROM generate_series(1, 5) AS idx
) p
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX "IDX_ORDERS_CUSTOMER" ON "ORDERS" ("CUSTOMER_ID");
CREATE INDEX "IDX_ORDERS_EMPLOYEE" ON "ORDERS" ("EMPLOYEE_ID");
CREATE INDEX "IDX_ORDERS_DATE" ON "ORDERS" ("ORDER_DATE");
CREATE INDEX "IDX_ORDER_DETAILS_PRODUCT" ON "ORDER_DETAILS" ("PRODUCT_ID");
CREATE INDEX "IDX_CUSTOMERS_REGION" ON "CUSTOMERS" ("REGION_ID");
CREATE INDEX "IDX_PRODUCTS_CATEGORY" ON "PRODUCTS" ("CATEGORY_ID");
CREATE INDEX "IDX_PRODUCTS_SUPPLIER" ON "PRODUCTS" ("SUPPLIER_ID");

-- Summary view for easy verification
CREATE VIEW "ORDER_SUMMARY" AS
SELECT
  o."ORDER_ID",
  c."COMPANY_NAME" AS "CUSTOMER",
  e."FIRST_NAME" || ' ' || e."LAST_NAME" AS "SALES_REP",
  r."REGION",
  o."ORDER_DATE",
  COUNT(od."PRODUCT_ID") AS "ITEM_COUNT",
  SUM(od."QUANTITY" * p."PRICE" * (1 - o."DISCOUNT")) AS "ORDER_TOTAL",
  CASE WHEN o."PAID" = 1 THEN 'Paid' ELSE 'Pending' END AS "STATUS"
FROM "ORDERS" o
JOIN "CUSTOMERS" c ON o."CUSTOMER_ID" = c."CUSTOMER_ID"
JOIN "SALES_EMPLOYEES" e ON o."EMPLOYEE_ID" = e."EMPLOYEE_ID"
JOIN "REGIONS" r ON c."REGION_ID" = r."REGION_ID"
JOIN "ORDER_DETAILS" od ON o."ORDER_ID" = od."ORDER_ID"
JOIN "PRODUCTS" p ON od."PRODUCT_ID" = p."PRODUCT_ID"
GROUP BY o."ORDER_ID", c."COMPANY_NAME", e."FIRST_NAME", e."LAST_NAME", r."REGION", o."ORDER_DATE", o."DISCOUNT", o."PAID";

-- Row count verification
DO $$
DECLARE
  total_rows INTEGER := 0;
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM "CATEGORIES"; total_rows := total_rows + table_count;
  RAISE NOTICE 'CATEGORIES: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "REGIONS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'REGIONS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "SUPPLIERS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'SUPPLIERS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "CUSTOMERS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'CUSTOMERS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "PRODUCTS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'PRODUCTS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "SALES_EMPLOYEES"; total_rows := total_rows + table_count;
  RAISE NOTICE 'SALES_EMPLOYEES: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "CONTACTS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'CONTACTS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "ORDERS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'ORDERS: % rows', table_count;

  SELECT COUNT(*) INTO table_count FROM "ORDER_DETAILS"; total_rows := total_rows + table_count;
  RAISE NOTICE 'ORDER_DETAILS: % rows', table_count;

  RAISE NOTICE '==================';
  RAISE NOTICE 'TOTAL ROWS: %', total_rows;
END $$;
