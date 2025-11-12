# Use official Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /altdemoapi

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose port (adjust if needed)
EXPOSE 8000

# Start the app
CMD ["python", "run.py"]
