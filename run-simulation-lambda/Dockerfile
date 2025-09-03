FROM --platform=linux/amd64 ghcr.io/astral-sh/uv:python3.12-bookworm-slim

ENV LAMBDA_TASK_ROOT=/var/task
ENV LAMBDA_RUNTIME_DIR=/var/runtime

RUN mkdir -p ${LAMBDA_TASK_ROOT}

WORKDIR ${LAMBDA_TASK_ROOT}

ENV UV_COMPILE_BYTECODE=1

ENV UV_LINK_MODE=copy

ENV PYTHONUNBUFFERED=1
ENV PYTHONFAULTHANDLER=1

RUN --mount=type=cache,target=/root/.cache/uv \
	--mount=type=bind,source=uv.lock,target=uv.lock \
	--mount=type=bind,source=pyproject.toml,target=pyproject.toml \
	uv sync --frozen --no-install-project --no-dev

ADD . ${LAMBDA_TASK_ROOT}
RUN --mount=type=cache,target=/root/.cache/uv \
	uv sync --frozen --no-dev

# Install AWS Lambda Runtime Interface Client
RUN pip install awslambdaric

# Place executables in the environment at the front of the path
ENV PATH="${LAMBDA_TASK_ROOT}/.venv/bin:$PATH"

# Add the Lambda Runtime Interface Emulator and set permissions
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/bin/aws-lambda-rie
RUN chmod 755 /usr/bin/aws-lambda-rie

COPY bootstrap /var/runtime/bootstrap
# Normalize potential Windows CRLF line endings and UTF-8 BOM, then ensure executable
RUN set -e; f=/var/runtime/bootstrap; \
	# Strip UTF-8 BOM if present
	if [ "$(head -c 3 "$f" | od -An -t x1 | tr -d ' \n')" = "efbbbf" ]; then \
		tail -c +4 "$f" > "$f.tmp" && mv "$f.tmp" "$f"; \
	fi; \
	# Remove CRs from EOLs
	sed -i 's/\r$//' "$f"; \
	chmod 755 "$f"

# Enable Python to find packages in the virtual environment
ENV PYTHONPATH="${LAMBDA_TASK_ROOT}/.venv/lib/python3.12/site-packages:${LAMBDA_TASK_ROOT}:${LAMBDA_TASK_ROOT}/src:${PYTHONPATH}"

ENV PYTHONDONTWRITEBYTECODE=1

ENTRYPOINT ["/var/runtime/bootstrap"]
CMD ["src.main.handler"]