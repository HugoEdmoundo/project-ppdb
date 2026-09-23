FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple
RUN pip install --no-cache-dir --retries 10 --timeout 60 -r requirements.txt

COPY . .

EXPOSE 8000

# Run migrations before starting the server
CMD sh -c "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"
