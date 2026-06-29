USE annotation_test;

-- 删除旧表（如果有）
DROP TABLE IF EXISTS hr_analytics;

-- 创建 HR 分析表
CREATE TABLE hr_analytics (
  EmpID VARCHAR(20) NOT NULL PRIMARY KEY,
  Age INT,
  AgeGroup VARCHAR(20),
  Attrition VARCHAR(5),
  BusinessTravel VARCHAR(30),
  DailyRate INT,
  Department VARCHAR(50),
  DistanceFromHome INT,
  Education INT,
  EducationField VARCHAR(50),
  EmployeeCount INT,
  EmployeeNumber INT,
  EnvironmentSatisfaction INT,
  Gender VARCHAR(10),
  HourlyRate INT,
  JobInvolvement INT,
  JobLevel INT,
  JobRole VARCHAR(50),
  JobSatisfaction INT,
  MaritalStatus VARCHAR(20),
  MonthlyIncome INT,
  SalarySlab VARCHAR(20),
  MonthlyRate INT,
  NumCompaniesWorked INT,
  Over18 VARCHAR(5),
  OverTime VARCHAR(5),
  PercentSalaryHike INT,
  PerformanceRating INT,
  RelationshipSatisfaction INT,
  StandardHours INT,
  StockOptionLevel INT,
  TotalWorkingYears INT,
  TrainingTimesLastYear INT,
  WorkLifeBalance INT,
  YearsAtCompany INT,
  YearsInCurrentRole INT,
  YearsSinceLastPromotion INT,
  YearsWithCurrManager INT,
  
  INDEX idx_department (Department),
  INDEX idx_attrition (Attrition),
  INDEX idx_age_group (AgeGroup),
  INDEX idx_job_role (JobRole),
  INDEX idx_marital_status (MaritalStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 导入 CSV 数据，将空字符串转换为 NULL
LOAD DATA INFILE '/tmp/HR_Analytics.csv'
IGNORE
INTO TABLE hr_analytics
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS
(EmpID, Age, AgeGroup, Attrition, BusinessTravel, DailyRate, Department, 
 DistanceFromHome, Education, EducationField, EmployeeCount, EmployeeNumber,
 EnvironmentSatisfaction, Gender, HourlyRate, JobInvolvement, JobLevel, JobRole,
 JobSatisfaction, MaritalStatus, MonthlyIncome, SalarySlab, MonthlyRate,
 NumCompaniesWorked, Over18, OverTime, PercentSalaryHike, PerformanceRating,
 RelationshipSatisfaction, StandardHours, StockOptionLevel, TotalWorkingYears,
 TrainingTimesLastYear, WorkLifeBalance, YearsAtCompany, YearsInCurrentRole,
 YearsSinceLastPromotion, @YearsWithCurrManager)
SET YearsWithCurrManager = CASE
  WHEN TRIM(REPLACE(REPLACE(@YearsWithCurrManager, '\r', ''), '\n', '')) = '' THEN NULL
  WHEN TRIM(REPLACE(REPLACE(@YearsWithCurrManager, '\r', ''), '\n', '')) REGEXP '^-?[0-9]+$' THEN CAST(TRIM(REPLACE(REPLACE(@YearsWithCurrManager, '\r', ''), '\n', '')) AS SIGNED)
  ELSE NULL
END;

-- 验证导入结果
SELECT CONCAT('Imported ', COUNT(*), ' HR records') AS Status FROM hr_analytics;