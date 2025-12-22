# 快速开始指南

## 目录
1. [本地开发](#本地开发)
2. [SAM 本地测试](#sam-本地测试)
3. [部署到 AWS](#部署到-aws)

---

## 本地开发

最快速的开发方式，带热重载。

### 一键启动

```bash
./scripts/dev.sh
```

这个脚本会自动：
1. 启动 PostgreSQL Docker 容器
2. 运行数据库迁移
3. 启动 NestJS 开发服务器

### 手动启动

```bash
# 1. 启动数据库
docker run -d --name postgres-local \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16

# 2. 创建 .env 文件
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb
DATABASE_READ_URL=postgresql://postgres:postgres@localhost:5432/mydb
EOF

# 3. 安装依赖
pnpm install

# 4. 运行迁移
npx prisma migrate dev

# 5. 启动开发服务器
npm run start:dev
```

### 访问应用

打开浏览器访问: http://localhost:3000

---

## SAM 本地测试

在 Lambda 环境中测试应用。

### 一键启动

```bash
./scripts/sam-local.sh
```

### 手动启动

```bash
# 1. 确保 Docker 正在运行
docker ps

# 2. 构建应用
npm run build
sam build

# 3. 启动 SAM Local
sam local start-api --env-vars env.json
```

### 测试 API

```bash
# 测试根路径
curl http://localhost:3000/

# 测试其他端点
curl http://localhost:3000/api/users
```

---

## 部署到 AWS

### 前置条件

1. **安装 AWS CLI**
```bash
brew install awscli
```

2. **配置 AWS 凭证**
```bash
aws configure
# 输入 Access Key ID
# 输入 Secret Access Key
# 输入 region (例如: us-east-1)
```

3. **安装 SAM CLI**
```bash
brew install aws-sam-cli
```

### 一键部署

```bash
./scripts/deploy.sh
```

### 手动部署

#### 首次部署（引导模式）

```bash
# 1. 构建
npm run build
sam build

# 2. 验证模板
sam validate

# 3. 部署（交互式）
sam deploy --guided
```

**交互式问题**:
- Stack Name: `nestjs-app-stack` (或自定义)
- AWS Region: `us-east-1` (或其他区域)
- Parameter Environment: `dev`
- Parameter DBUsername: `postgres`
- Parameter DBPassword: 输入强密码（至少8位）
- Confirm changes: `Y`
- Allow SAM IAM role creation: `Y`
- Save arguments to config: `Y`

#### 后续部署

```bash
sam build && sam deploy
```

### 查看部署结果

```bash
# 获取 API URL
aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

# 获取 RDS 端点
aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`RDSMasterEndpoint`].OutputValue' \
  --output text
```

### 测试生产环境

```bash
# 保存 API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# 测试
curl $API_URL
```

---

## 数据库管理

### 查看数据（Prisma Studio）

```bash
# 本地数据库
npx prisma studio
```

### 运行迁移

```bash
# 开发环境（本地）
npx prisma migrate dev --name your_migration_name

# 生产环境（部署前）
npx prisma migrate deploy
```

---

## 常用命令速查

### 本地开发
```bash
# 启动开发服务器
npm run start:dev

# 启动数据库
docker start postgres-local

# 停止数据库
docker stop postgres-local

# 查看日志
docker logs postgres-local
```

### SAM Local
```bash
# 启动本地 API
sam local start-api --env-vars env.json

# 调用单个函数
sam local invoke NestJSFunction --event event.json

# 查看日志
sam logs --stack-name nestjs-app-stack --tail
```

### AWS 部署
```bash
# 构建
sam build

# 部署
sam deploy

# 删除 Stack
sam delete

# 查看日志（实时）
sam logs --stack-name nestjs-app-stack --tail
```

---

## 故障排查

### 问题: Docker 无法启动

```bash
# 检查 Docker 是否运行
docker ps

# 如果没运行，启动 Docker Desktop
```

### 问题: 数据库连接失败

```bash
# 检查数据库是否运行
docker ps | grep postgres

# 检查 .env 配置
cat .env

# 测试连接
docker exec -it postgres-local psql -U postgres -d mydb
```

### 问题: SAM Local 访问数据库失败

确保使用 `host.docker.internal` 而不是 `localhost`：

```json
{
  "NestJSFunction": {
    "DATABASE_URL": "postgresql://postgres:postgres@host.docker.internal:5432/mydb"
  }
}
```

### 问题: 部署失败

```bash
# 查看详细错误
sam deploy --debug

# 检查 CloudFormation 事件
aws cloudformation describe-stack-events --stack-name nestjs-app-stack
```

---

## 开发工作流建议

### 日常开发
```
1. ./scripts/dev.sh
2. 修改代码（自动热重载）
3. 测试功能
4. git commit
```

### 部署前测试
```
1. ./scripts/sam-local.sh
2. 测试所有功能
3. 确认无误
```

### 部署
```
1. ./scripts/deploy.sh
2. 测试生产环境
3. 监控日志
```

---

## 更多信息

- 详细文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 本地开发: [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)
- 架构说明: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 获得帮助

如果遇到问题：
1. 查看相关文档
2. 检查 [故障排查](#故障排查) 部分
3. 查看 AWS CloudWatch 日志
4. 提交 Issue

祝开发顺利！🚀
