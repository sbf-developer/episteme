#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing dependencies"
npm install

echo "==> Generating Prisma client"
npm run db:generate

echo "==> Building client + server"
npm run build

echo "==> Running database migrations"
npm run db:migrate:deploy

echo "==> Starting server"
export NODE_ENV=production
npm start
