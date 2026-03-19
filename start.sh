#!/bin/sh
set -e

echo "Running Prisma database push..."
npx prisma db push

echo "Starting Next.js application..."
exec node server.js
