# Test Database

PostgreSQL database for StyleBI k6 load testing with ~18,000 rows of orders data.

## Structure

```
db/
├── init.sql              # Database schema and test data
├── docker/
│   └── docker-compose.yml  # Local Docker deployment
└── aws/
    ├── postgres-test-db.yaml  # CloudFormation template for RDS
    ├── init-rds-database.sh   # Script to initialize RDS
    └── README.md              # AWS deployment instructions
```

## Database Schema

| Table | Rows | Description |
|-------|------|-------------|
| CATEGORIES | 7 | Product categories |
| REGIONS | 4 | Sales regions |
| SUPPLIERS | 15 | Product suppliers |
| CUSTOMERS | 100 | Customer companies |
| PRODUCTS | 50 | Product catalog |
| SALES_EMPLOYEES | 10 | Sales representatives |
| CONTACTS | 100 | Customer contacts |
| ORDERS | 3,000 | Order headers |
| ORDER_DETAILS | ~15,000 | Order line items |

**Total: ~18,000 rows**

## Quick Start

### Local (Docker)

```bash
cd db/docker
docker-compose up -d

# Connection
Host: localhost
Port: 5432
Database: orders
User: testuser
Password: testpass
```

### AWS (RDS)

See [aws/README.md](aws/README.md) for CloudFormation deployment.

## Connection String

**JDBC:**
```
jdbc:postgresql://localhost:5432/orders
```

**StyleBI Data Source Pool Properties:**
```
maximumPoolSize=100
minimumIdle=10
connectionTimeout=60000
```
