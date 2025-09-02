# Local and Prod Health Checks

You can test the Lambda without deploying the app or clicking "kør" by using:

## Local handler test (no Docker)
- Runs the Python handler directly using the included test harness.

PowerShell:

```powershell
# Uses your local env vars from .env if present
& C:\Python312\python.exe .\run-simulation-lambda\test_lambda.py
```

Expected output:

```
Result: {'statusCode': 200, 'body': '{"message": "Simulation completed successfully", "simulation_id": 23}'}
```

## Prod Function URL health check
- Fast way to validate API key, cold start, and DB connection.
- Does NOT run a simulation.

PowerShell (replace URL and API key):

```powershell
$URL = "https://<your-function-id>.lambda-url.<region>.on.aws/health"
$API = "<your lambda api key>"
Invoke-RestMethod -Method GET -Uri $URL -Headers @{ 'X-API-Key' = $API }
```

Expected output on success:

```json
{"ok": true, "db": true}
```

If it fails, you'll get `{ ok:false, ... }` with a message to fix env or network.

## Prod full invocation smoke test
- Triggers the real handler path. Use a known simulation_id/team_id.

```powershell
$URL = "https://<your-function-id>.lambda-url.<region>.on.aws/"
$API = "<your lambda api key>"
$Body = @{ simulation_id = 123; team_id = 1 } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri $URL -Headers @{ 'Content-Type' = 'application/json'; 'X-API-Key' = $API } -Body $Body
```

You should see either status 200 with a message or 4xx with a clear error.
