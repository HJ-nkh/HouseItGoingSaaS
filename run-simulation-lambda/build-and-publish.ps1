# Build and publish the run-simulation Docker image to AWS ECR (PowerShell)
# Ported from build-and-publish.sh

[CmdletBinding()]
param(
	[string]$Profile = "default",
	[string]$Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

try {
	# Ensure we're running from the script directory so Docker builds the correct context
	if ($PSScriptRoot) { Set-Location -Path $PSScriptRoot }

	Write-Host "Checking prerequisites..." -ForegroundColor Cyan
	if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { throw "AWS CLI (aws) not found in PATH." }
	if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker not found in PATH." }

	Write-Host "Retrieving AWS Account ID for profile '$Profile'..." -ForegroundColor Cyan
	$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text --profile $Profile).Trim()
	if (-not $AWS_ACCOUNT_ID) { throw "Failed to retrieve AWS Account ID." }

	$Registry = "$AWS_ACCOUNT_ID.dkr.ecr.$Region.amazonaws.com"
	$LocalImage = "run-simulation:latest"
	$Repository = "house-it-going/run-simulation"
	$RemoteTag = "run-simulation-latest"
	$RemoteImage = "$Registry/$($Repository):$($RemoteTag)"

	Write-Host "Authenticating Docker to ECR registry '$Registry'..." -ForegroundColor Cyan
	aws ecr get-login-password --region $Region --profile $Profile |
		docker login --username AWS --password-stdin $Registry | Out-Null
	if ($LASTEXITCODE -ne 0) { throw "Docker login to ECR failed." }

	Write-Host "Building Docker image for linux/amd64: $LocalImage" -ForegroundColor Cyan
	docker build --platform linux/amd64 -t run-simulation .
	if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }

	Write-Host "Tagging image: $LocalImage -> $RemoteImage" -ForegroundColor Cyan
	docker tag $LocalImage $RemoteImage
	if ($LASTEXITCODE -ne 0) { throw "Docker tag failed." }

	Write-Host "Pushing image: $RemoteImage" -ForegroundColor Cyan
	docker push $RemoteImage
	if ($LASTEXITCODE -ne 0) { throw "Docker push failed." }

	Write-Host "Done. Pushed $RemoteImage" -ForegroundColor Green
}
catch {
	Write-Error $_
	exit 1
}

