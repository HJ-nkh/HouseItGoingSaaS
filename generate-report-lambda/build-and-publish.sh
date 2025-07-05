#!/bin/bash

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile root)
# Stack name must be the same as in samconfig.toml
STACK_NAME="house-it-going"

# Publish the docker image
# Authenticate Docker to your ECR registry
aws ecr get-login-password --region eu-north-1 --profile root | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com

# Build the Docker image
docker build --platform linux/amd64 -t generate-report .

# Tag the image
docker tag generate-report:latest $AWS_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com/$STACK_NAME-ecr-repository:generate-report-latest

# Push the image to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.eu-north-1.amazonaws.com/$STACK_NAME-ecr-repository:generate-report-latest
