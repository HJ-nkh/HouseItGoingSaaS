<#
.SYNOPSIS
Build and publish the generate-report Lambda Docker image to AWS ECR (Windows PowerShell).

.DESCRIPTION
PowerShell conversion of build-and-publish.sh. Uses AWS CLI and Docker to authenticate to ECR,
build a linux/amd64 image, tag it, and push it to the target ECR repository.

.PARAMETER Profile
AWS CLI profile to use. Defaults to 'root'.

.PARAMETER Region
AWS region for ECR. Defaults to 'eu-north-1'.

.PARAMETER StackName
Stack name (must match the one in samconfig.toml). Defaults to 'house-it-going'.

.PARAMETER FunctionName
Optional. If provided, the script will update this Lambda function to use the newly pushed ECR image and wait until the update completes.
#>

[CmdletBinding()]
param(
	[string]$Profile = 'default',
	[string]$Region = 'eu-north-1',
	[string]$StackName = 'house-it-going/generate-report',  # ECR repository path
	[string]$FunctionName = 'generate-report-lambda'  # Optional Lambda function name to update after push (leave empty to skip update
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Tool {
	param([Parameter(Mandatory)][string]$Name)
	if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
		throw "$Name is not installed or not on PATH."
	}
}

Assert-Tool 'aws'
Assert-Tool 'docker'

Write-Host "Resolving AWS account ID using profile '$Profile'..."
$AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text --profile $Profile).Trim()
if (-not $AWS_ACCOUNT_ID) { throw 'Failed to resolve AWS Account ID.' }

$Registry = "$AWS_ACCOUNT_ID.dkr.ecr.$Region.amazonaws.com"
$LocalImage = 'generate-report:latest'
$RepoAndTag = "$StackName"+":generate-report-latest"
$ImageUri = "$Registry/$RepoAndTag"

# Build context is the folder where this script (and the Dockerfile) reside
$ScriptDir = $PSScriptRoot
$DockerfilePath = Join-Path $ScriptDir 'Dockerfile'
if (-not (Test-Path $DockerfilePath)) {
	throw "Dockerfile not found at $DockerfilePath. Ensure you run this script from the repo and do not move the Dockerfile."
}

Write-Host "Logging into ECR registry $Registry..."
aws ecr get-login-password --region $Region --profile $Profile |
	docker login --username AWS --password-stdin $Registry | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Docker login to $Registry failed with exit code $LASTEXITCODE" }

Write-Host 'Building Docker image (linux/amd64)...'
docker build --platform linux/amd64 -t generate-report -f $DockerfilePath $ScriptDir
if ($LASTEXITCODE -ne 0) { throw "Docker build failed with exit code $LASTEXITCODE" }

Write-Host "Tagging image $LocalImage as $Registry/$RepoAndTag ..."
docker tag $LocalImage "$Registry/$RepoAndTag"
if ($LASTEXITCODE -ne 0) { throw "Docker tag failed with exit code $LASTEXITCODE" }

Write-Host "Pushing image to ECR: $Registry/$RepoAndTag ..."
docker push "$Registry/$RepoAndTag"
if ($LASTEXITCODE -ne 0) { throw "Docker push failed with exit code $LASTEXITCODE" }

if ($FunctionName) {
	Write-Host "Updating Lambda function '$FunctionName' to image '$ImageUri' ..."
	aws lambda update-function-code --function-name $FunctionName --image-uri $ImageUri --region $Region --profile $Profile | Out-Null
	if ($LASTEXITCODE -ne 0) { throw "Lambda update-function-code failed with exit code $LASTEXITCODE" }

	Write-Host "Waiting for Lambda function '$FunctionName' to finish updating ..."
	aws lambda wait function-updated --function-name $FunctionName --region $Region --profile $Profile
	if ($LASTEXITCODE -ne 0) { throw "Lambda wait function-updated failed with exit code $LASTEXITCODE" }

	Write-Host "Lambda '$FunctionName' updated to $ImageUri"
}

Write-Host 'Done.'
