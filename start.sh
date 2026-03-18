#!/bin/sh
set -e

echo "Running Prisma database push..."
npx prisma db push --skip-generate

echo "Starting Next.js application..."
exec node server.js
