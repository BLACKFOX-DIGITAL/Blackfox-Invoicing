#!/bin/bash
set -e

echo "Starting Invofox deployment process..."

# 1. Pull latest code
echo "Pulling latest changes..."
git pull origin main || echo "Git pull failed. Continuing anyway..."

# 2. Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one from .env.example"
  exit 1
fi

# 3. Create required directories and set permissions
echo "Creating required directories..."
mkdir -p data uploads
chmod 777 data uploads

# 4. Build and start the application
# Database is initialized automatically on first boot via start.sh
echo "Building and starting the application..."
docker compose build --no-cache
docker compose up -d

echo ""
echo "Deployment complete!"
echo "App is running at: http://127.0.0.1:3001"
echo "View logs: docker compose logs -f"
