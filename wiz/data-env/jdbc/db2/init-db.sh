#!/usr/bin/env bash
set -euo pipefail

DBNAME="${DBNAME:-ANNTEST}"
SCHEMA="${DB2SCHEMA:-DB2INST1}"

run_db2() {
  su - db2inst1 -c "db2 $*"
}

run_connected_sql() {
  local sql="$1"
  local sql_file="/tmp/db2-check-${RANDOM}.sql"

  printf 'CONNECT TO %s;\n%s;\nCONNECT RESET;\n' "${DBNAME}" "${sql}" > "${sql_file}"
  su - db2inst1 -c "db2 -tvf ${sql_file}"
  rm -f "${sql_file}"
}

echo "[db2-init] waiting for Db2 to accept connections..."
for i in {1..60}; do
  if run_db2 "connect to ${DBNAME}" >/dev/null 2>&1; then
    break
  fi
  sleep 5
  if [ "$i" -eq 60 ]; then
    echo "[db2-init] timed out waiting for Db2."
    exit 1
  fi
done

# 保持连接，避免后续 -x 把错误文本当成 count

echo "[db2-init] checking whether already initialized..."
COUNT=$(run_connected_sql "SELECT COUNT(*) FROM ${SCHEMA}.STAFF" 2>/dev/null | awk '/^[[:space:]]*[0-9]+[[:space:]]*$/ { print $1; exit }' || true)

if [[ "$COUNT" =~ ^[0-9]+$ ]] && [ "$COUNT" -gt 0 ]; then
  echo "[db2-init] already initialized (STAFF count=$COUNT), skip."
  run_db2 "connect reset" >/dev/null 2>&1 || true
  exit 0
fi

# 如果表不存在或 count 不是数字，就认为未初始化

echo "[db2-init] running schema init..."
run_db2 "-td@ -vf /var/custom/sql/init.sql"

echo "[db2-init] loading data..."
run_db2 "-tvf /var/custom/sql/load_data.sql"

echo "[db2-init] done."
run_db2 "connect reset" >/dev/null 2>&1 || true
