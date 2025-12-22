#!/bin/bash

# 本地开发脚本

set -e

echo "🚀 Starting local development environment..."

# 1. 启动数据库
echo "📦 Starting PostgreSQL..."
if docker ps -a | grep -q postgres-local; then
    docker start postgres-local
else
    docker run -d \
      --name postgres-local \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=mydb \
      -p 5432:5432 \
      postgres:16
fi

# 2. 等待数据库就绪
echo "⏳ Waiting for database..."
sleep 3

# 3. 检查是否需要运行迁移
if [ ! -d "prisma/migrations" ]; then
    echo "🔄 Running initial migration..."
    npx prisma migrate dev --name init
else
    echo "🔄 Running migrations..."
    npx prisma migrate deploy
fi

# 4. 生成 Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# 5. 启动开发服务器
echo "✨ Starting NestJS dev server..."
echo "📍 Server will be available at http://localhost:3000"
npm run start:dev
