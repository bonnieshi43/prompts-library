# StyleBI k6 Load Testing

This project provides k6 load tests for StyleBI viewsheet (dashboard) performance testing using TypeScript.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation) - Load testing tool
- [Node.js](https://nodejs.org/) 18+ - For TypeScript compilation
- [Yarn](https://yarnpkg.com/) or npm - Package manager

## Installation

```bash
cd k6-testing-master
yarn install
# or: npm install
```

## Building

Compile TypeScript to JavaScript before running tests:

```bash
yarn webpack
# or: npm run webpack
```

This creates bundled test files in the `dist/` folder.

## Running Tests

### Basic Usage

```bash
# Run with default settings (localhost:8080, admin/admin)
k6 run dist/test-d1.js

# Run against a specific server
k6 run -e SERVER_IP=192.168.1.100 -e SERVER_PORT=8080 dist/test-d1.js

# Run with custom viewsheet
k6 run -e SERVER_IP=localhost -e VSNAME=MyDashboard dist/test-d1.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_IP` | `localhost` | StyleBI server IP/hostname |
| `SERVER_PORT` | `8080` | Server port |
| `SERVER_PROTOCOL` | `http` | Protocol (`http` or `https`) |
| `CONTEXT_PATH` | `` (empty) | Context path (use `/sree` for legacy deployments) |
| `AUTH_USER` | `admin` | Username for single-user mode |
| `AUTH_PASSWORD` | `admin` | Password for single-user mode |
| `USE_MULTI_USER` | `false` | Set to `true` to use multiple test users |
| `MULTI_USER_PREFIX` | `user` | Prefix for multi-user mode (creates user1, user2, etc.) |
| `MULTI_USER_PASSWORD` | `success123` | Password for multi-user accounts |
| `VSNAME` | `VSTest1` | Name of the viewsheet to test |
| `ENTRY_ID` | auto-generated | Full entry ID (overrides VSNAME) |
| `CHART_NAME` | `Chart1` | Name of the chart component |
| `SELECTION_NAME` | `SelectionList1` | Name of the selection list component |
| `SELECTION_VALUE` | (fake value) | Single selection value to apply |
| `SELECTION_VALUES` | (empty) | Comma-separated list of values to rotate through |
| `USERS` | `400` | Target number of virtual users |
| `RAMPUP_TIME` | `800` | Ramp-up duration (supports: `30s`, `2m`, `1h`, `1m30s`) |
| `QUIET_PERIOD` | `0` | Quiet period after test (supports same format as RAMPUP_TIME) |

## Test Scenarios

### D1 - User Scaling Test
Tests viewsheet performance with varying user loads.

```bash
# 400 users
k6 run -e USERS=400 -e RAMPUPTIME=800 -e VSNAME=VSTest1 dist/test-d1.js

# 1000 users
k6 run -e USERS=1000 -e RAMPUPTIME=2000 -e VSNAME=VSTest1 dist/test-d1.js
```

### D2 - Chart Complexity Test
Tests viewsheets with different numbers of charts.

```bash
# 2 charts
k6 run -e TEST_FUNCTION=twoChart -e VSNAME_2CHART=MyVS2Charts dist/test-d2.js

# 4 charts with 4 selections
k6 run -e TEST_FUNCTION=fourChart4Sel dist/test-d2.js
```

### D3 - Active/Inactive User Ratio Test
Tests with a mix of active and inactive users.

```bash
# 600 inactive users (out of 1200)
k6 run -e INACTIVECOUNT=600 -e VSNAME=VSTest1 dist/test-d3.js
```

### E1 - Data Volume Test
Tests with different data volumes (fixed 20 users).

```bash
# 1M rows
k6 run -e VSNAME=VSTest1_1M dist/test-e1.js

# 40M rows
k6 run -e VSNAME=VSTest1_40M dist/test-e1.js
```

### E2 - Combined User + Data Volume Test
Tests user scaling with large datasets.

```bash
k6 run -e USERS=100 -e RAMPUPTIME=200 -e VSNAME=VSTest1_12M dist/test-e2.js
```

## Example Test Runs

### Testing with Examples/Census

The built-in Census example viewsheet has:
- **Chart**: `Chart`
- **SelectionList**: `Region`
- **Valid values**: `Midwest`, `Northeast`, `South`, `West`

```bash
# Quick test with 5 users (30 second ramp-up)
k6 run -e SERVER_IP=localhost -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" -e USERS=5 -e RAMPUP_TIME=30s dist/test-d1.js

# Load test with 50 users (2 minute ramp-up)
k6 run -e SERVER_IP=localhost -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" -e USERS=50 -e RAMPUP_TIME=2m dist/test-d1.js

# With web dashboard
$env:K6_WEB_DASHBOARD="true"
k6 run -e SERVER_IP=localhost -e VSNAME=Examples/Census -e CHART_NAME=Chart -e SELECTION_NAME=Region -e SELECTION_VALUES="Midwest,Northeast,South,West" -e USERS=25 -e RAMPUP_TIME=1m dist/test-d1.js
```

### Local Development Testing

```bash
# Simple test against local StyleBI
k6 run -e SERVER_IP=localhost -e SERVER_PORT=8080 -e AUTH_USER=admin -e AUTH_PASSWORD=admin -e VSNAME=MyDashboard dist/test-d1.js
```

### Production Load Test

```bash
# Full load test with 500 users, results export
k6 run \
  -e SERVER_IP=stylebi.example.com \
  -e SERVER_PORT=443 \
  -e SERVER_PROTOCOL=https \
  -e USE_MULTI_USER=true \
  -e USERS=500 \
  -e RAMPUPTIME=1000 \
  -e VSNAME=ProductionDashboard \
  --summary-export results.json \
  dist/test-d1.js
```

## Viewsheet Requirements

For the tests to work, your viewsheet must have:

1. **Chart component** named `Chart1` (or specify via `CHART_NAME`)
2. **SelectionList component** named `SelectionList1` (or specify via `SELECTION_NAME`)
3. The selection list should filter the chart data

For multi-chart tests (D2), viewsheets should have `Chart1`, `Chart2`, `Chart3`, `Chart4` as needed.

## Test Assets

The `K6-Test-Assets.zip` file contains a sample worksheet and viewsheet configured to work with the test database:

- **TestWS** - Worksheet connecting to the test database
- **TestVS** - Viewsheet with `Chart2` and `SelectionList2` components

To use these assets:

1. Deploy the test database (see [db/README.md](db/README.md))
2. Import `K6-Test-Assets.zip` into StyleBI via Enterprise Manager
3. Configure the data source connection to point to your database
4. Run tests with:
   ```bash
   k6 run -e VSNAME=TestVS -e CHART_NAME=Chart2 -e SELECTION_NAME=SelectionList2 -e SELECTION_VALUES="Games,Educational,Business,Personal,Graphics,Office Tools,Hardware" dist/test-d1.js
   ```

## Metrics

The tests track:

- `selection_counter` - Number of selection operations completed
- `selection_time` - Time for each selection cycle (apply + refresh + clear + refresh)
- Standard k6 HTTP and WebSocket metrics

## Output

```bash
# Export results to JSON
k6 run --summary-export results.json dist/test-d1.js

# Export to InfluxDB for Grafana dashboards
k6 run --out influxdb=http://localhost:8086/k6 dist/test-d1.js
```

## Troubleshooting

### "Failed to get session" errors
- Check server IP/port are correct
- Verify credentials (AUTH_USER/AUTH_PASSWORD)
- Ensure the viewsheet exists and user has access

### WebSocket connection failures
- Check firewall allows WebSocket connections
- For HTTPS, ensure `SERVER_PROTOCOL=https`
- Check CONTEXT_PATH if using a legacy deployment

### "status is 101" check failures
- WebSocket upgrade failed
- May indicate server overload or connection limits
