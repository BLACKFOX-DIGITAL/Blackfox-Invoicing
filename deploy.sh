#!/bin/bash
set -e

echo "Starting Invofox deployment process..."

# 1. Pull latest code (if using Git to deploy)
echo "Pulling latest changes..."
git pull origin main || echo "Git pull failed or not a git repository. Continuing anyway..."

# 2. Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one from .env.example"
  echo "You must set AUTH_SECRET, NEXTAUTH_URL, and CRON_SECRET before continuing."
  exit 1
fi

# 3. Create required directories
echo "Creating required directories..."
mkdir -p data uploads
chown -R 1001:1001 uploads

# 4. Build and initialize the database first
echo "Building and initializing the database..."
docker compose build
docker compose --profile init run --rm db-init

# 5. Start the application
echo "Starting the application..."
docker compose up -d

echo "Deployment complete! Application should be accessible on your configured port."
echo "- For cron jobs, set up a curl to POST /api/reminders/process with your CRON_SECRET."
