#!/bin/bash
# Initialize the RDS PostgreSQL database with test data
#
# Usage: ./init-rds-database.sh <db-endpoint> <db-password>
#
# Prerequisites:
#   - psql client installed
#   - Network access to the RDS instance (e.g., via bastion host or VPN)

set -e

DB_ENDPOINT="${1:?Usage: $0 <db-endpoint> <db-password>}"
DB_PASSWORD="${2:?Usage: $0 <db-endpoint> <db-password>}"
DB_NAME="orders"
DB_USER="testuser"
DB_PORT="5432"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INIT_SQL="${SCRIPT_DIR}/../init.sql"

if [ ! -f "$INIT_SQL" ]; then
    echo "Error: init.sql not found at $INIT_SQL"
    exit 1
fi

echo "Initializing database at ${DB_ENDPOINT}..."
echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"

# Run the init script
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_ENDPOINT" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$INIT_SQL"

echo ""
echo "Database initialization complete!"
echo ""
echo "Verifying row counts..."

PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_ENDPOINT" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT 'CATEGORIES' as table_name, COUNT(*) as row_count FROM \"CATEGORIES\"
        UNION ALL SELECT 'REGIONS', COUNT(*) FROM \"REGIONS\"
        UNION ALL SELECT 'SUPPLIERS', COUNT(*) FROM \"SUPPLIERS\"
        UNION ALL SELECT 'CUSTOMERS', COUNT(*) FROM \"CUSTOMERS\"
        UNION ALL SELECT 'PRODUCTS', COUNT(*) FROM \"PRODUCTS\"
        UNION ALL SELECT 'SALES_EMPLOYEES', COUNT(*) FROM \"SALES_EMPLOYEES\"
        UNION ALL SELECT 'CONTACTS', COUNT(*) FROM \"CONTACTS\"
        UNION ALL SELECT 'ORDERS', COUNT(*) FROM \"ORDERS\"
        UNION ALL SELECT 'ORDER_DETAILS', COUNT(*) FROM \"ORDER_DETAILS\"
        ORDER BY table_name;"

echo ""
echo "JDBC Connection String:"
echo "jdbc:postgresql://${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"
