#!/bin/bash

# AWS 部署脚本

set -e

# 加载环境变量
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "🚀 Deploying to AWS..."

# 1. 构建
echo "🔨 Building application..."
npm run build
sam build

# 2. 验证模板
echo "✅ Validating template..."
sam validate

# 3. 询问是否继续
read -p "Deploy to AWS? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# 4. 部署
echo "📦 Deploying to AWS..."
sam deploy --parameter-overrides \
  Environment=dev \
  DBUsername=postgres \
  DBPassword=postgres \
  GithubToken=${GITHUB_TOKEN}

# 5. 获取 API URL
echo ""
echo "✅ Deployment complete!"
echo "📍 Getting API URL..."
aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

echo ""
echo "🎉 Done!"
