#!/bin/bash

# SAM 本地测试脚本

set -e

echo "🔨 Building application..."

# 1. 构建 TypeScript
echo "📦 Building TypeScript..."
npm run build

# 2. 使用 SAM 构建
echo "🏗️  Building with SAM..."
sam build

# 3. 启动本地数据库（如果未运行）
echo "📦 Checking PostgreSQL..."
if ! docker ps | grep -q postgres-local; then
    echo "Starting PostgreSQL..."
    docker start postgres-local || docker run -d \
      --name postgres-local \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=mydb \
      -p 5432:5432 \
      postgres:16
    sleep 3
fi

# 4. 启动 SAM Local API
echo "🚀 Starting SAM Local API..."
echo "📍 API will be available at http://localhost:3000"
echo "💡 Use Ctrl+C to stop"
sam local start-api --env-vars env.json --warm-containers EAGER
