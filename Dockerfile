FROM python:3.10

# Install ffmpeg and system deps
RUN apt-get update && apt-get install -y ffmpeg git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install build tools first
RUN pip install --upgrade pip setuptools wheel

# Install openai-whisper separately with no build isolation (fixes pkg_resources error)
RUN pip install --no-build-isolation openai-whisper

# Copy and install remaining requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port
EXPOSE 8000

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
