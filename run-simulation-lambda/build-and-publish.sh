#!/bin/bash

set -euo pipefail

# Configurable AWS profile and region (fallback to defaults if not provided)
AWS_PROFILE=${AWS_PROFILE:-default}
AWS_REGION=${AWS_REGION:-eu-north-1}

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile "$AWS_PROFILE")

# Select architecture to match the Lambda function (x86_64 -> linux/amd64, arm64 -> linux/arm64)
# Usage: ARCH=linux/arm64 ./build-and-publish.sh
ARCH=${ARCH:-linux/amd64}

# Existing ECR repository for run-simulation images
ECR_REPOSITORY="house-it-going/run-simulation"
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"

# Publish the docker image
# Authenticate Docker to your ECR registry
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Build the Docker image for the selected architecture
echo "Building image for $ARCH"
docker build --platform "$ARCH" -t run-simulation .

# Tag the image with both a unique timestamp and latest
TIMESTAMP_TAG="run-simulation-$(date +%Y%m%d%H%M%S)"
docker tag run-simulation:latest "$ECR_URI:$TIMESTAMP_TAG"
docker tag run-simulation:latest "$ECR_URI:latest"

# Push the image to ECR
docker push "$ECR_URI:$TIMESTAMP_TAG"
docker push "$ECR_URI:latest"
