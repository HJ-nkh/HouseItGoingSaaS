Python program to generate reports from simulations in the HouseItGoing application.

Moon2Mars integration (legacy simulation object decoding)
---------------------------------------------------------
The report lambda needs the `Moon2Mars` package to unpickle `encoded_s` simulation blobs produced by the run-simulation lambda. To avoid maintaining a separate Lambda Layer right now, the build script auto-copies the folder before building the Docker image:

Build steps performed by `build-and-publish.ps1`:
1. Copy `../run-simulation-lambda/src/Moon2Mars` into `generate-report-lambda/src/Moon2Mars`.
2. Compute a deterministic aggregate SHA256 hash of the copied contents and write it to `generate-report-lambda/src/.moon2mars.hash` for traceability.
3. Build and push the Docker image to ECR, then optionally update the Lambda.

Good practices implemented / recommended:
---------------------------------------
* Deterministic hash of Moon2Mars sources recorded (`.moon2mars.hash`) so we can confirm runtime vs build parity.
* Graceful fallback: if Moon2Mars is missing at runtime, the handler falls back to the modern minimal report instead of failing hard.
* Search order for Moon2Mars at runtime includes (a) env var `MOON2MARS_PATH`, (b) sibling `run-simulation-lambda/src`, (c) vendored copy (this folder), (d) Lambda layer path `/opt/python` – enabling an easy future switch to a Layer.
* To enable version checks, optionally add `__version__` inside `Moon2Mars/__init__.py` and store alongside `encoded_s` in the database; compare before unpickling to catch mismatches early.
* If/when Moon2Mars grows or is used by additional lambdas, migrate to an AWS Lambda Layer to eliminate duplication (keep fallback path for local development).

Fallback behavior:
If full legacy generation raises `ModuleNotFoundError` (Moon2Mars absent), the function logs a warning and produces a modern report, preserving API availability.

Migrating to a Layer later:
1. Create folder structure `python/Moon2Mars/...` with the package.
2. Zip (top-level must contain `python/`).
3. `aws lambda publish-layer-version --layer-name moon2mars ...`
4. Attach layer to both lambdas; remove vendor copy step if desired.

File: `.moon2mars.hash` is safe to commit if you want build reproducibility indicators; otherwise add to `.gitignore`.

Environment variables of interest:
* `API_ENV=development` – use local `./output` instead of `/tmp`.
* `REPORTS_BUCKET_NAME` – enables S3 uploads; if unset, reports remain local.
* `MOON2MARS_PATH` – optional explicit override for path resolution.
* `LEGACY_LOCAL_ROOT` – enables legacy project meta parsing (road/city/name) when present.

Minimal local test:
`python test_lambda.py --simulation-id <id> --team-id <team>` (ensure a simulation row with `encoded_s`).

Future enhancements (optional):
* Store each member doc as individual report records.
* Add version mismatch guard before unpickling.
* Convert Moon2Mars to an internal wheel + layer for clearer semantic versioning.