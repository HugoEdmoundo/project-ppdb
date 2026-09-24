FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple
# cache-mount /root/.cache/pip agar download yang terputus lanjut dari cache pip.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --retries 10 --timeout 60 -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations before starting the server
CMD sh -c "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"
