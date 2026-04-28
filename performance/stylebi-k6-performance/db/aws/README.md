# AWS Deployment for k6 Test Database

Deploy a PostgreSQL database to AWS RDS for StyleBI load testing. The database is automatically initialized with test data using an ECS task.

## Prerequisites

- Existing StyleBI CloudFormation stack deployed
- ECS cluster ARN from your StyleBI stack (for running the initialization task)

---

## Option A: Deploy via AWS Console (Portal)

### 1. Open CloudFormation

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to **CloudFormation** (search in the top bar)
3. Click **Create stack** → **With new resources (standard)**

### 2. Upload Template

1. Select **Upload a template file**
2. Click **Choose file** and select `postgres-test-db.yaml`
3. Click **Next**

### 3. Configure Stack

1. **Stack name**: `k6-test-db`

2. Fill in the parameters:

   | Parameter | Where to Find It |
   |-----------|------------------|
   | **ResourceNamePrefix** | Use same prefix as your StyleBI stack (e.g., `jkecs9`) |
   | **VpcId** | Go to **VPC** → **Your VPCs** → copy the VPC ID used by StyleBI |
   | **VpcCidr** | Usually `172.31.0.0/16` (check VPC details) |
   | **SubnetIds** | Go to **VPC** → **Subnets** → copy 2 subnet IDs (comma-separated) |
   | **StyleBISecurityGroupId** | Go to **EC2** → **Security Groups** → find one with your prefix + "service" |
   | **EcsClusterArn** | Go to **ECS** → **Clusters** → click your cluster → copy the ARN |
   | **AssignPublicIp** | `ENABLED` for public subnets, `DISABLED` for private subnets |
   | **DatabaseInstanceClass** | `db.t3.medium` (recommended for testing) |
   | **DatabasePassword** | Create a secure password (min 8 chars) |
   | **MaxConnections** | `600` |
   | **DeleteData** | `true` (for testing) |

3. Click **Next**

### 4. Configure Stack Options

1. Leave defaults or add tags if desired
2. Check "I acknowledge that AWS CloudFormation might create IAM resources with custom names"
3. Click **Next**

### 5. Review and Create

1. Review all settings
2. Click **Submit**
3. Wait for status to show **CREATE_COMPLETE** (10-15 minutes)
   - RDS creation takes ~5-10 minutes
   - Database initialization runs automatically after RDS is ready

### 6. Get Connection Details

1. Go to your stack → **Outputs** tab
2. Copy the values:
   - **DatabaseEndpoint**: hostname for connections
   - **JDBCConnectionString**: full JDBC URL for StyleBI
   - **InitializationStatus**: confirms database was initialized

---

## Finding Required Values in AWS Console

### VpcId
1. Go to **VPC** → **Your VPCs**
2. Find the VPC used by your StyleBI stack
3. Copy the **VPC ID** (e.g., `vpc-0abc123def456`)

### SubnetIds
1. Go to **VPC** → **Subnets**
2. Filter by your VPC
3. Select 2 subnets in different Availability Zones
4. Copy their IDs comma-separated (e.g., `subnet-aaa,subnet-bbb`)

### StyleBISecurityGroupId
1. Go to **EC2** → **Security Groups**
2. Search for your StyleBI prefix (e.g., `jkecs9`)
3. Find the one with "service" or "application servers" in description
4. Copy the **Security group ID** (e.g., `sg-0abc123`)

### EcsClusterArn
1. Go to **ECS** → **Clusters**
2. Click on your StyleBI cluster
3. Copy the **Cluster ARN** from the cluster details (e.g., `arn:aws:ecs:us-east-1:123456789:cluster/jkecs9-cluster`)

---

## Option B: Deploy via AWS CLI

### 1. Get Values from Your StyleBI Stack

```bash
# Set your StyleBI stack name
STYLEBI_STACK=your-stylebi-stack-name
PREFIX=your-prefix

# Get the VPC ID
VPC_ID=$(aws cloudformation describe-stacks \
  --stack-name $STYLEBI_STACK \
  --query 'Stacks[0].Parameters[?ParameterKey==`VpcId`].ParameterValue' \
  --output text)

# Get the ECS cluster ARN
CLUSTER_ARN=$(aws ecs list-clusters \
  --query "clusterArns[?contains(@, '$PREFIX')]" \
  --output text)

# Get the StyleBI service security group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*${PREFIX}*service*" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "VPC ID: $VPC_ID"
echo "Cluster ARN: $CLUSTER_ARN"
echo "Security Group: $SG_ID"
```

### 2. Deploy the Database Stack

```bash
cd k6-testing-master/db/aws

aws cloudformation create-stack \
  --stack-name k6-test-db \
  --template-body file://postgres-test-db.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=ResourceNamePrefix,ParameterValue=$PREFIX \
    ParameterKey=VpcId,ParameterValue=$VPC_ID \
    ParameterKey=VpcCidr,ParameterValue=172.31.0.0/16 \
    ParameterKey=SubnetIds,ParameterValue="subnet-1,subnet-2" \
    ParameterKey=StyleBISecurityGroupId,ParameterValue=$SG_ID \
    ParameterKey=EcsClusterArn,ParameterValue=$CLUSTER_ARN \
    ParameterKey=AssignPublicIp,ParameterValue=ENABLED \
    ParameterKey=DatabaseInstanceClass,ParameterValue=db.t3.medium \
    ParameterKey=DatabasePassword,ParameterValue=YourSecurePassword123

# Wait for completion (10-15 minutes)
aws cloudformation wait stack-create-complete --stack-name k6-test-db
```

### 3. Get the Database Endpoint

```bash
aws cloudformation describe-stacks \
  --stack-name k6-test-db \
  --query 'Stacks[0].Outputs[?OutputKey==`JDBCConnectionString`].OutputValue' \
  --output text
```

### 4. Configure StyleBI Data Source

In StyleBI Enterprise Manager:

1. Go to **Data** → **Data Source** → **New**
2. Select **PostgreSQL**
3. Configure:
   - **Name**: `K6TestDB`
   - **Host**: `<db-endpoint>` (from CloudFormation output)
   - **Port**: `5432`
   - **Database**: `orders`
   - **User**: `testuser`
   - **Password**: `<your-password>`
4. In **Pool Properties**, add:
   ```
   maximumPoolSize=100
   minimumIdle=10
   connectionTimeout=60000
   ```
5. Test connection and save

---

## What Gets Created

The CloudFormation template creates:

| Resource | Description |
|----------|-------------|
| RDS PostgreSQL Instance | The test database |
| DB Security Group | Allows StyleBI and VPC access |
| DB Subnet Group | Places database in your VPC |
| DB Parameter Group | Custom max_connections setting |
| ECS Task Definition | Runs database initialization |
| Lambda Function | Orchestrates initialization task |
| IAM Roles | Permissions for Lambda and ECS |
| CloudWatch Log Group | Logs from initialization |

## Database Schema

The database is automatically initialized with ~18,000 rows:

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

---

## Instance Size Recommendations

| Users | Instance Class | Max Connections | Monthly Cost (est.) |
|-------|----------------|-----------------|---------------------|
| 1-50 | db.t3.micro | 100 | ~$15 |
| 50-100 | db.t3.small | 200 | ~$30 |
| 100-300 | db.t3.medium | 400 | ~$60 |
| 300-500 | db.t3.large | 600 | ~$120 |
| 500+ | db.r6g.large | 1000 | ~$200 |

---

## Monitoring Initialization

To check the initialization task status:

1. Go to **CloudWatch** → **Log groups**
2. Find `/ecs/<prefix>/db-init`
3. View the latest log stream for SQL execution output

Or via CLI:
```bash
aws logs tail /ecs/$PREFIX/db-init --follow
```

---

## Cleanup

```bash
# Delete the database stack
aws cloudformation delete-stack --stack-name k6-test-db

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name k6-test-db
```

---

## Troubleshooting

### Stack creation fails at DatabaseInitialization

1. Check Lambda logs:
   ```bash
   aws logs tail /aws/lambda/$PREFIX-db-init --since 30m
   ```

2. Check ECS task logs:
   ```bash
   aws logs tail /ecs/$PREFIX/db-init --since 30m
   ```

3. Common issues:
   - **Task can't reach database**: Ensure subnets have route to RDS
   - **Task can't pull image**: For private subnets, ensure NAT gateway exists
   - **Lambda timeout**: Increase Lambda timeout if RDS takes long to become available

### Cannot connect to database

1. Check security group allows traffic from StyleBI:
   ```bash
   aws ec2 describe-security-groups --group-ids <db-security-group-id>
   ```

2. Verify StyleBI containers are in the correct VPC/subnets

3. Check RDS instance status:
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier <prefix>-test-db \
     --query 'DBInstances[0].DBInstanceStatus'
   ```

### Connection pool exhausted

Increase `maximumPoolSize` in StyleBI data source pool properties.

### Re-running initialization

If you need to re-initialize the database (e.g., after schema changes):

1. Update the stack with a minor change to force re-creation:
   ```bash
   aws cloudformation update-stack \
     --stack-name k6-test-db \
     --use-previous-template \
     --parameters ParameterKey=MaxConnections,ParameterValue=601 \
     --capabilities CAPABILITY_NAMED_IAM
   ```

2. Or manually run the init task:
   ```bash
   aws ecs run-task \
     --cluster $CLUSTER_ARN \
     --task-definition $PREFIX-db-init \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-1,subnet-2],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

3. Or use the manual initialization script (requires network access to RDS, e.g., via bastion host or VPN):
   ```bash
   # From a machine with access to the RDS instance
   ./init-rds-database.sh <db-endpoint> <db-password>
   ```
   This runs the `init.sql` script directly using `psql`.
