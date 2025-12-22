# SAM 本地开发和调试指南

## 概述

在部署到 AWS 之前，可以在本地完全模拟 Lambda 和 API Gateway 环境进行开发和调试。

## 前置准备

### 1. 安装 Docker

SAM CLI 使用 Docker 来模拟 Lambda 运行环境。

```bash
# macOS
brew install docker

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

启动 Docker Desktop。

### 2. 确认工具已安装

```bash
# 检查 SAM CLI
sam --version

# 检查 Docker
docker --version

# 检查 AWS CLI
aws --version
```

## 本地开发流程

### 方式 1: 原生 NestJS 开发（推荐用于开发阶段）

这是最快的开发方式，不涉及 Lambda。

#### 步骤 1: 配置本地数据库

```bash
# 使用 Docker 启动本地 PostgreSQL
docker run -d \
  --name postgres-local \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16
```

#### 步骤 2: 配置环境变量

创建 `.env` 文件：

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
DATABASE_READ_URL=postgresql://postgres:postgres@localhost:5432/mydb
```

#### 步骤 3: 安装依赖和运行迁移

```bash
# 安装依赖
pnpm install

# 运行 Prisma 迁移
npx prisma migrate dev

# 生成 Prisma Client
npx prisma generate
```

#### 步骤 4: 启动开发服务器

```bash
# 启动 NestJS 开发服务器（热重载）
npm run start:dev
```

访问 http://localhost:3000

#### 优点
- ✅ 最快的开发体验
- ✅ 热重载（代码改动自动刷新）
- ✅ 完整的调试支持
- ✅ 不需要每次构建

#### 缺点
- ⚠️ 不是 Lambda 环境（可能有细微差异）

---

### 方式 2: SAM Local API（模拟 Lambda + API Gateway）

这种方式完全模拟 AWS 环境。

#### 步骤 1: 创建本地环境变量文件

```bash
# env.json
cat > env.json << 'EOF'
{
  "NestJSFunction": {
    "DATABASE_URL": "postgresql://postgres:postgres@host.docker.internal:5432/mydb",
    "DATABASE_READ_URL": "postgresql://postgres:postgres@host.docker.internal:5432/mydb",
    "NODE_ENV": "development"
  }
}
EOF
```

**注意**: 使用 `host.docker.internal` 而不是 `localhost`，因为 Lambda 运行在 Docker 容器内。

#### 步骤 2: 构建应用

```bash
# 构建 TypeScript 代码
npm run build

# 使用 SAM 构建
sam build
```

#### 步骤 3: 启动本地 API

```bash
# 启动本地 API Gateway + Lambda
sam local start-api --env-vars env.json
```

访问 http://localhost:3000

#### 步骤 4: 测试 API

```bash
# 测试根路径
curl http://localhost:3000/

# 测试 API 端点
curl http://localhost:3000/api/users
```

#### 优点
- ✅ 完全模拟 AWS Lambda 环境
- ✅ 测试 API Gateway 集成
- ✅ 发现部署前的问题

#### 缺点
- ⚠️ 启动较慢（每次请求都启动容器）
- ⚠️ 代码改动需要重新构建

---

### 方式 3: SAM Local Invoke（直接调用 Lambda）

测试单个 Lambda 函数，不通过 API Gateway。

#### 创建测试事件

```bash
# event.json
cat > event.json << 'EOF'
{
  "httpMethod": "GET",
  "path": "/",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": null
}
EOF
```

#### 调用函数

```bash
sam local invoke NestJSFunction \
  --event event.json \
  --env-vars env.json
```

---

## 开发工作流推荐

### 阶段 1: 快速开发（使用原生 NestJS）

```bash
# 1. 启动本地数据库
docker start postgres-local

# 2. 启动开发服务器
npm run start:dev

# 3. 开发和测试功能
# 访问 http://localhost:3000
```

### 阶段 2: Lambda 环境测试（使用 SAM Local）

```bash
# 1. 构建
npm run build
sam build

# 2. 本地测试
sam local start-api --env-vars env.json

# 3. 验证功能在 Lambda 环境正常
```

### 阶段 3: 部署到 AWS

```bash
# 1. 最终构建
sam build

# 2. 部署
sam deploy

# 3. 测试生产环境
curl https://your-api-gateway-url/
```

## 调试技巧

### 1. VS Code 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach SAM Local",
      "port": 5858,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/var/task",
      "protocol": "inspector",
      "stopOnEntry": false
    }
  ]
}
```

#### 使用方式

**调试原生 NestJS**:
1. 在 VS Code 中按 F5
2. 选择 "Debug NestJS"
3. 设置断点
4. 发送请求

**调试 SAM Local**:
```bash
# 以调试模式启动
sam local start-api \
  --env-vars env.json \
  --debug-port 5858

# 然后在 VS Code 中选择 "Attach SAM Local"
```

### 2. 查看日志

#### 原生 NestJS
日志直接输出到控制台。

#### SAM Local
```bash
# 启动时会显示详细日志
sam local start-api --env-vars env.json --log-file sam-local.log

# 查看日志
tail -f sam-local.log
```

### 3. 热重载配置

对于 SAM Local，使用 `sam sync` 实现快速更新：

```bash
# 监视文件变化并自动部署到本地
sam sync --watch --stack-name local
```

---

## 常见问题

### 问题 1: SAM Local 连接数据库失败

**错误**: `ECONNREFUSED 127.0.0.1:5432`

**原因**: Lambda 运行在 Docker 容器内，无法访问 `localhost`

**解决**:
```bash
# 使用 host.docker.internal
DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/mydb
```

### 问题 2: 代码修改不生效

**解决**:
```bash
# 重新构建
npm run build
sam build

# 重启 SAM Local
sam local start-api --env-vars env.json
```

### 问题 3: Docker 容器启动慢

**优化**:
```bash
# 使用温容器（保持容器运行）
sam local start-api --warm-containers EAGER
```

### 问题 4: 静态资源或视图找不到

**检查**:
```bash
# 确保 nest-cli.json 配置了 assets
# 确保 dist 目录包含 public 和 views

# 检查构建输出
ls -la dist/
```

---

## 数据库管理

### 本地数据库操作

```bash
# 启动本地数据库
docker start postgres-local

# 连接数据库
docker exec -it postgres-local psql -U postgres -d mydb

# 运行迁移
npx prisma migrate dev --name init

# 查看数据
npx prisma studio
```

### 连接远程 RDS（通过堡垒机）

如果需要测试生产数据库（谨慎！）：

```bash
# 1. 创建堡垒机（临时）
# 2. SSH 隧道
ssh -i key.pem -L 5432:rds-endpoint:5432 ec2-user@bastion-ip

# 3. 在另一个终端连接
export DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
npx prisma migrate deploy
```

---

## 性能对比

| 方式 | 启动时间 | 请求响应 | 热重载 | AWS 兼容性 |
|------|----------|----------|--------|------------|
| 原生 NestJS | 2-3秒 | < 50ms | ✅ | ⚠️ |
| SAM Local API | 10-15秒 | 1-2秒 | ❌ | ✅ |
| SAM Local Invoke | 5-10秒 | 1-2秒 | ❌ | ✅ |

---

## 完整开发流程示例

### 新功能开发

```bash
# 1. 启动本地环境
docker start postgres-local
npm run start:dev

# 2. 开发功能
# 编辑代码，自动热重载

# 3. 测试功能
curl http://localhost:3000/api/new-feature

# 4. 运行数据库迁移（如果需要）
npx prisma migrate dev --name add_new_feature

# 5. 提交代码
git add .
git commit -m "Add new feature"

# 6. Lambda 环境测试
npm run build
sam build
sam local start-api --env-vars env.json

# 7. 验证通过后部署
sam deploy

# 8. 验证生产环境
curl https://your-api-url/api/new-feature
```

---

## 自动化脚本

创建 `scripts/dev.sh`:

```bash
#!/bin/bash

# 本地开发脚本

echo "🚀 Starting local development environment..."

# 1. 启动数据库
echo "📦 Starting PostgreSQL..."
docker start postgres-local || docker run -d \
  --name postgres-local \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16

# 2. 等待数据库就绪
echo "⏳ Waiting for database..."
sleep 3

# 3. 运行迁移
echo "🔄 Running migrations..."
npx prisma migrate dev

# 4. 启动开发服务器
echo "✨ Starting NestJS dev server..."
npm run start:dev
```

使用：
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

创建 `scripts/sam-local.sh`:

```bash
#!/bin/bash

# SAM 本地测试脚本

echo "🔨 Building application..."
npm run build
sam build

echo "🚀 Starting SAM Local API..."
sam local start-api --env-vars env.json --warm-containers EAGER
```

---

## 环境变量管理

### 开发环境 (.env)
```bash
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
DATABASE_READ_URL=postgresql://postgres:postgres@localhost:5432/mydb
PORT=3000
```

### SAM Local (env.json)
```json
{
  "NestJSFunction": {
    "DATABASE_URL": "postgresql://postgres:postgres@host.docker.internal:5432/mydb",
    "DATABASE_READ_URL": "postgresql://postgres:postgres@host.docker.internal:5432/mydb",
    "NODE_ENV": "development"
  }
}
```

### AWS 生产环境 (template.yaml)
通过 CloudFormation 参数和 Outputs 自动注入。

---

## 总结

**推荐工作流**:

1. **日常开发**: 使用原生 NestJS (`npm run start:dev`)
   - 快速、热重载、易调试

2. **Lambda 测试**: 使用 SAM Local (`sam local start-api`)
   - 部署前验证
   - 确保 Lambda 兼容性

3. **部署**: 使用 SAM Deploy (`sam deploy`)
   - 测试通过后部署到 AWS
   - 使用 CloudFormation 管理基础设施

这样既能保持开发效率，又能确保部署的可靠性！
