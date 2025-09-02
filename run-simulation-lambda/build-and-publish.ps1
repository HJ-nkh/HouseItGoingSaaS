param(
  [string]$Region = $env:AWS_REGION,
  [string]$DockerPlatform = 'linux/amd64'
)

$ErrorActionPreference = 'Stop'

if (-not $Region) { $Region = 'eu-north-1' }
if (-not $DockerPlatform -or ($DockerPlatform -ne 'linux/amd64' -and $DockerPlatform -ne 'linux/arm64')) {
  $DockerPlatform = 'linux/amd64'
}

Write-Host "Region: $Region"
Write-Host "Platform:   $DockerPlatform"

$Account = aws sts get-caller-identity --query Account --output text
Write-Host "Account: $Account"

$EcrRepo = 'house-it-going/run-simulation'
$EcrUri  = "$Account.dkr.ecr.$Region.amazonaws.com/$EcrRepo"
Write-Host "ECR: $EcrUri"

# Ensure repository exists
try {
  aws ecr describe-repositories --repository-names $EcrRepo --region $Region | Out-Null
} catch {
  Write-Host "ECR repo not found. Creating $EcrRepo..."
  aws ecr create-repository --repository-name $EcrRepo --region $Region | Out-Null
}

aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "$Account.dkr.ecr.$Region.amazonaws.com"

Write-Host "Building image ($DockerPlatform)..."
docker build --platform $DockerPlatform -t run-simulation .

$Tag = "run-simulation-" + (Get-Date -Format 'yyyyMMddHHmmss')
docker tag run-simulation:latest "$($EcrUri):$Tag"
docker tag run-simulation:latest "$($EcrUri):latest"

Write-Host "Pushing $($EcrUri):$Tag"
docker push "$($EcrUri):$Tag"

Write-Host "Pushing $($EcrUri):latest"
docker push "$($EcrUri):latest"

Write-Host 'Done.'
