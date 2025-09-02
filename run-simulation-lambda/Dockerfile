FROM public.ecr.aws/lambda/python:3.12

# Workdir for Lambda code
WORKDIR /var/task

# Install Python dependencies (manylinux wheels compatible with AWS Lambda x86_64)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY src/ ./src/

# Set the handler for AWS Lambda
CMD ["src.main.handler"]