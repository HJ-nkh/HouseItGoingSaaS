# Run Simulation Lambda

This Lambda processes simulations and writes results back to the same Postgres database as the Next.js app.

Environment variables (AWS Lambda)
- API_KEY: Shared secret; must match Vercel LAMBDA_API_KEY. Header name is X-API-Key.
- DATABASE_URL: Postgres URL, preferably identical to the app's DATABASE_URL.
  - Alternatively set: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB
- API_ENV: Set to development to allow re-running non-pending simulations locally.

Notes
- Ensure Lambda can reach the database (VPC/subnet/SG or public access with allowlist).
- Use the Lambda Function URL as RUN_SIMULATION_LAMBDA_URL on Vercel.
- The Next.js POST /api/simulations will mark the simulation failed if Lambda invocation fails.