# AWS Lambda 部署文档

本文档描述如何使用 AWS SAM 将 NestJS 应用部署到 AWS Lambda，包括 VPC、RDS 读写分离数据库、NAT 网关等完整基础设施。

## 架构概览

本部署方案包含以下 AWS 资源：

### 网络架构
- **1个 VPC** (CIDR: 10.0.0.0/16)
- **1个公有子网** (10.0.1.0/24) - 用于 NAT 网关
- **3个私有子网** (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24) - 用于 Lambda 和 RDS
- **1个 Internet Gateway (IGW)** - 公网访问入口
- **1个 NAT Gateway** - Lambda 访问外网

### 计算资源
- **Lambda 函数** - 运行在私有子网，通过 NAT 网关访问外网
- **API Gateway (HTTP API)** - 浏览器通过 IGW 访问 Lambda

### 数据库
- **RDS PostgreSQL 主实例** (写操作) - 运行在私有子网
- **RDS 读副本** (读操作) - 实现读写分离

### 安全组
- **Lambda 安全组** - 允许 Lambda 访问外网
- **RDS 安全组** - 仅允许 Lambda 安全组访问数据库端口 5432

## 先决条件

### 1. 安装 AWS SAM CLI

macOS:
```bash
brew install aws-sam-cli
```

其他系统请参考: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

### 2. 安装 AWS CLI 并配置凭证

```bash
# 安装 AWS CLI
brew install awscli

# 配置 AWS 凭证
aws configure
```

输入以下信息：
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (例如: us-east-1)
- Default output format (json)

### 3. 安装项目依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 4. 构建 TypeScript 项目

```bash
npm run build
```

## 部署步骤

### 方式一：使用 SAM CLI 交互式部署

#### 1. 验证模板

```bash
sam validate
```

#### 2. 构建应用

```bash
sam build
```

SAM 会使用 esbuild 自动打包 NestJS 应用及其依赖。

#### 3. 部署到 AWS

首次部署（引导部署）：

```bash
sam deploy --guided
```

系统会提示输入以下参数：
- **Stack Name**: 输入堆栈名称 (例如: nestjs-app-stack)
- **AWS Region**: 选择部署区域 (例如: us-east-1)
- **Parameter Environment**: 选择环境 (dev/staging/prod)
- **Parameter DBUsername**: 数据库用户名 (默认: postgres)
- **Parameter DBPassword**: 数据库密码 (至少8位，请使用强密码)
- **Parameter VpcCIDR**: VPC CIDR 块 (默认: 10.0.0.0/16)
- **Confirm changes before deploy**: 建议选择 Y
- **Allow SAM CLI IAM role creation**: 选择 Y
- **Save arguments to configuration file**: 选择 Y

后续部署（使用已保存的配置）：

```bash
sam deploy
```

### 方式二：使用配置文件部署

#### 1. 修改 samconfig.toml

编辑 `samconfig.toml` 文件，设置您的参数：

```toml
[default.deploy.parameters]
parameter_overrides = [
  "Environment=dev",
  "DBUsername=postgres",
  "DBPassword=YourSecurePassword123!"  # 请修改为强密码
]
```

#### 2. 部署

```bash
sam build && sam deploy
```

#### 3. 部署到不同环境

```bash
# 部署到开发环境
sam deploy --config-env default

# 部署到生产环境
sam deploy --config-env prod

# 部署到预发布环境
sam deploy --config-env staging
```

## 部署后配置

### 1. 获取部署信息

部署完成后，查看输出信息：

```bash
aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs' \
  --output table
```

主要输出包括：
- **ApiUrl**: API Gateway 访问地址
- **RDSMasterEndpoint**: 主数据库（写）地址
- **RDSReadReplicaEndpoint**: 读副本（读）地址
- **VPCId**: VPC ID
- **LambdaFunctionArn**: Lambda 函数 ARN

### 2. 运行数据库迁移

连接到主数据库运行 Prisma 迁移：

```bash
# 方式1: 使用 RDS 代理或堡垒机连接
# 首先需要设置 DATABASE_URL 环境变量为主数据库地址
export DATABASE_URL="postgresql://postgres:YourPassword@<RDSMasterEndpoint>:5432/postgres"

# 运行迁移
npx prisma migrate deploy

# 生成 Prisma Client
npx prisma generate
```

**注意**: 由于 RDS 在私有子网，您可能需要：
- 创建一个 EC2 堡垒机（Bastion Host）在公有子网
- 使用 AWS Systems Manager Session Manager
- 或者临时修改 RDS 安全组允许您的 IP 访问（不推荐生产环境）

### 3. 测试 API

```bash
# 获取 API URL
API_URL=$(aws cloudformation describe-stacks \
  --stack-name nestjs-app-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# 测试根路径
curl $API_URL

# 测试 API 端点
curl $API_URL/api/users
```

## 数据库读写分离配置

在您的应用代码中，可以使用不同的数据库连接：

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // 写操作使用主数据库
  private writeClient: PrismaClient;

  // 读操作使用读副本
  private readClient: PrismaClient;

  constructor() {
    super();

    // 主数据库（写）
    this.writeClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // 读副本（读）
    this.readClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_READ_URL || process.env.DATABASE_URL
        }
      }
    });
  }

  async onModuleInit() {
    await this.writeClient.$connect();
    await this.readClient.$connect();
  }

  // 提供读写客户端
  get write() {
    return this.writeClient;
  }

  get read() {
    return this.readClient;
  }
}
```

使用示例：
```typescript
// 读操作使用读副本
const users = await this.prisma.read.user.findMany();

// 写操作使用主数据库
const newUser = await this.prisma.write.user.create({
  data: { email: 'test@example.com' }
});
```

## 监控和日志

### 查看 Lambda 日志

```bash
# 实时查看日志
sam logs --stack-name nestjs-app-stack --tail

# 查看特定时间范围的日志
sam logs --stack-name nestjs-app-stack \
  --start-time '10min ago' \
  --end-time '5min ago'
```

### 在 AWS Console 查看

1. 访问 CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/
2. 查找日志组: `/aws/lambda/nestjs-app-stack-nestjs-app`

### 监控数据库

1. 访问 RDS Console: https://console.aws.amazon.com/rds/
2. 查看数据库监控指标（CPU、连接数、IOPS 等）

## 更新部署

### 1. 更新代码

```bash
# 修改代码后重新构建
npm run build

# 重新部署
sam build && sam deploy
```

### 2. 更新基础设施

修改 `template.yaml` 后：

```bash
sam build && sam deploy
```

### 3. 仅更新 Lambda 函数（快速部署）

```bash
sam sync --watch
```

这会监视文件变化并自动部署。

## 成本优化建议

### RDS 实例
- 开发环境使用 `db.t4g.micro` (当前配置)
- 生产环境可升级到 `db.t4g.small` 或更高

### Lambda
- 当前配置：512MB 内存，30秒超时
- 根据实际使用情况调整

### NAT 网关
- NAT 网关按小时计费 + 数据传输费用
- 考虑使用 VPC Endpoints 减少 NAT 流量

## 清理资源

删除整个堆栈（包括所有资源）：

```bash
sam delete --stack-name nestjs-app-stack
```

**警告**: 这将删除所有资源，包括数据库数据！

如果启用了删除保护，先禁用：

```bash
aws rds modify-db-instance \
  --db-instance-identifier nestjs-app-stack-master \
  --no-deletion-protection
```

## 故障排查

### Lambda 超时
- 检查 VPC 配置是否正确
- 确保 NAT 网关正常工作
- 增加 Lambda 超时时间

### 数据库连接失败
- 检查安全组配置
- 确认数据库在正确的子网
- 验证连接字符串格式

### 构建失败
- 清理并重新构建: `rm -rf .aws-sam && sam build`
- 检查 node_modules 是否正确安装

### API Gateway 502 错误
- 查看 Lambda 日志排查错误
- 检查 Lambda handler 路径是否正确

## 安全建议

1. **不要在代码中硬编码密码**
   - 使用 AWS Secrets Manager 或 Parameter Store
   - 通过环境变量传递敏感信息

2. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

3. **启用 VPC Flow Logs** 监控网络流量

4. **启用 RDS 备份**
   - 当前配置：7天备份保留期
   - 生产环境建议增加到 30 天

5. **使用 IAM 角色最小权限原则**

## 参考资料

- [AWS SAM 官方文档](https://docs.aws.amazon.com/serverless-application-model/)
- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [AWS Lambda VPC 配置](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
- [RDS 读副本](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)

## 技术支持

如有问题，请提交 Issue 或联系开发团队。
