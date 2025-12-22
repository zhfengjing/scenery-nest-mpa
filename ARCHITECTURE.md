# 架构说明文档

## 概述

本项目使用 AWS Serverless 架构，将 NestJS 应用部署到 AWS Lambda，并配置了完整的 VPC 网络、RDS 读写分离数据库和 NAT 网关。

## 架构图

```
                                    Internet
                                       |
                                       |
                              +--------v--------+
                              | Internet Gateway|
                              +--------+--------+
                                       |
                                       |
        +------------------------------+---------------------------+
        |                          VPC (10.0.0.0/16)              |
        |                                                          |
        |   +--------------------------------------------------+   |
        |   |           Public Subnet (10.0.1.0/24)           |   |
        |   |                                                  |   |
        |   |          +------------------+                    |   |
        |   |          |  NAT Gateway     |                    |   |
        |   |          | (Elastic IP)     |                    |   |
        |   |          +--------+---------+                    |   |
        |   +-------------------|----------------------------------+
        |                       |
        |   +-------------------v------------------------------+   |
        |   |           Private Route Table                    |   |
        |   |   Route: 0.0.0.0/0 -> NAT Gateway               |   |
        |   +--------------------------------------------------+   |
        |                       |                                  |
        |   +-------------------+----------------------------------+
        |   |                                                      |
        |   |  +----------------+  +----------------+  +----------------+
        |   |  | Private Subnet1|  | Private Subnet2|  | Private Subnet3|
        |   |  | 10.0.10.0/24   |  | 10.0.11.0/24   |  | 10.0.12.0/24   |
        |   |  |                |  |                |  |                |
        |   |  | +-----------+  |  | +-----------+  |  |                |
        |   |  | | Lambda    |  |  | | RDS       |  |  | +-----------+  |
        |   |  | | Functions |  |  | | Master    |  |  | | RDS Read  |  |
        |   |  | | (NestJS)  |  |  | | (Write)   |  |  | | Replica   |  |
        |   |  | +-----------+  |  | +-----------+  |  | | (Read)    |  |
        |   |  |       |        |  |       |        |  | +-----------+  |
        |   |  +-------|--------+  +-------|--------+  +--------|-------+
        |   |          |                   |                    |
        |   |          +-------------------+--------------------+
        |   |                              |
        |   |                   +----------v-----------+
        |   |                   | Security Groups      |
        |   |                   | - Lambda SG          |
        |   |                   | - RDS SG             |
        |   |                   +----------------------+
        |   |
        +-----------------------------------------------------------+
                                       ^
                                       |
                                       |
                              +--------+--------+
                              | API Gateway     |
                              | (HTTP API)      |
                              +--------+--------+
                                       ^
                                       |
                                   Browser
```

## 网络流量路径

### 1. 浏览器访问 Lambda (入站流量)

```
Browser
  → Internet
  → Internet Gateway (IGW)
  → API Gateway (HTTP API)
  → Lambda (Private Subnet)
  → NestJS Application
```

### 2. Lambda 访问外网 (出站流量)

```
Lambda (Private Subnet)
  → NAT Gateway (Public Subnet)
  → Internet Gateway (IGW)
  → Internet
```

### 3. Lambda 访问数据库

```
Lambda (Private Subnet)
  → RDS Master (Write Operations, Private Subnet)
  → RDS Read Replica (Read Operations, Private Subnet)
```

## 组件详解

### VPC (Virtual Private Cloud)
- **CIDR**: 10.0.0.0/16
- **用途**: 隔离的虚拟网络环境，提供网络安全

### 子网配置

#### 公有子网 (1个)
- **CIDR**: 10.0.1.0/24
- **可用区**: us-east-1a
- **用途**: 托管 NAT 网关
- **路由**: 通过 IGW 直接访问互联网

#### 私有子网 (3个)
1. **私有子网 1** (10.0.10.0/24) - Lambda + RDS Master
2. **私有子网 2** (10.0.11.0/24) - Lambda + RDS
3. **私有子网 3** (10.0.12.0/24) - Lambda + RDS Read Replica
- **可用区**: 分布在不同的 AZ (高可用)
- **用途**: 运行 Lambda 和 RDS 实例
- **路由**: 通过 NAT 网关访问互联网

### Internet Gateway (IGW)
- **用途**: VPC 与互联网之间的网关
- **功能**:
  - 允许浏览器通过 API Gateway 访问 Lambda
  - 为公有子网提供互联网访问

### NAT Gateway
- **位置**: 公有子网 (10.0.1.0/24)
- **Elastic IP**: 自动分配
- **用途**: 允许私有子网中的资源访问互联网
- **使用场景**:
  - Lambda 下载 npm 包
  - Lambda 调用外部 API
  - 数据库更新安全补丁

### 安全组

#### Lambda 安全组
- **入站规则**: 无需配置 (通过 API Gateway 调用)
- **出站规则**: 允许所有流量 (访问数据库和外网)

#### RDS 安全组
- **入站规则**:
  - 端口 5432 (PostgreSQL)
  - 来源: Lambda 安全组
- **出站规则**: 默认拒绝

### API Gateway (HTTP API)
- **类型**: HTTP API (比 REST API 更快更便宜)
- **功能**:
  - 接收浏览器 HTTP 请求
  - 触发 Lambda 函数
  - 返回响应给浏览器
- **CORS**: 已启用，允许跨域访问

### Lambda 函数
- **运行时**: Node.js 20.x
- **内存**: 512 MB
- **超时**: 30 秒
- **VPC 配置**:
  - 运行在 3 个私有子网
  - 关联 Lambda 安全组
- **环境变量**:
  - `DATABASE_URL`: 主数据库连接 (写操作)
  - `DATABASE_READ_URL`: 读副本连接 (读操作)
  - `NODE_ENV`: 环境标识

### RDS PostgreSQL

#### 主实例 (Master)
- **引擎**: PostgreSQL 16.6
- **实例类型**: db.t4g.micro
- **存储**: 20 GB gp3
- **用途**: 处理所有写操作 (INSERT, UPDATE, DELETE)
- **备份**: 7 天保留期
- **多可用区**: 否 (可在生产环境启用)

#### 读副本 (Read Replica)
- **实例类型**: db.t4g.micro
- **用途**: 处理所有读操作 (SELECT)
- **同步**: 异步复制主实例数据
- **优势**:
  - 分担读取负载
  - 提高查询性能
  - 提供故障转移选项

## 数据流示例

### 示例 1: 用户查看列表 (读操作)

```
1. 用户浏览器发送 GET /api/users 请求
2. API Gateway 接收请求并触发 Lambda
3. Lambda 从环境变量获取 DATABASE_READ_URL
4. Lambda 连接到 RDS 读副本
5. 执行 SELECT 查询
6. 返回数据给 Lambda
7. Lambda 处理并返回 JSON 响应
8. API Gateway 返回响应给浏览器
```

### 示例 2: 用户创建数据 (写操作)

```
1. 用户浏览器发送 POST /api/users 请求
2. API Gateway 接收请求并触发 Lambda
3. Lambda 从环境变量获取 DATABASE_URL
4. Lambda 连接到 RDS 主实例
5. 执行 INSERT 查询
6. 主实例异步复制数据到读副本
7. 返回结果给 Lambda
8. Lambda 处理并返回 JSON 响应
9. API Gateway 返回响应给浏览器
```

### 示例 3: Lambda 调用外部 API

```
1. Lambda 函数需要调用外部 API (例如 GitHub API)
2. Lambda 从私有子网发起 HTTPS 请求
3. 请求通过 NAT 网关
4. NAT 网关将请求转发到 Internet Gateway
5. 请求到达外部 API
6. 响应原路返回
```

## 安全考虑

### 网络隔离
- Lambda 和 RDS 都运行在私有子网，无公网 IP
- 只能通过 API Gateway 访问 Lambda
- RDS 只接受来自 Lambda 的连接

### 最小权限原则
- Lambda 通过 IAM 角色获得必要权限
- RDS 安全组仅允许 Lambda 安全组访问
- 数据库凭证通过环境变量传递（建议使用 Secrets Manager）

### 数据加密
- RDS 支持静态加密 (可选)
- API Gateway 使用 HTTPS
- VPC 内部通信通过 AWS 私有网络

## 成本分析

### 每月预估成本 (开发环境)

1. **NAT Gateway**:
   - 小时费用: ~$0.045/小时 × 730小时 = ~$33/月
   - 数据传输: 按使用量计费

2. **RDS**:
   - Master (db.t4g.micro): ~$13/月
   - Read Replica (db.t4g.micro): ~$13/月
   - 存储 (20GB gp3): ~$2.5/月

3. **Lambda**:
   - 免费额度: 每月 100 万次请求
   - 计算时间: 前 400,000 GB-秒免费
   - 超出部分按量计费

4. **API Gateway (HTTP API)**:
   - 免费额度: 每月 100 万次
   - 超出: $1.00/百万次

**总计**: 约 $60-70/月 (主要成本在 NAT Gateway)

### 成本优化建议
- 考虑使用 VPC Endpoints 替代 NAT Gateway (某些 AWS 服务)
- 生产环境可使用 Reserved Instances 降低 RDS 成本
- 合理设置 Lambda 内存和超时时间

## 高可用性和扩展性

### 当前架构
- Lambda 自动扩展
- RDS 读副本分担读负载
- 跨多个可用区部署

### 改进建议 (生产环境)
1. 启用 RDS Multi-AZ 部署
2. 添加多个读副本
3. 使用 CloudFront CDN
4. 实施数据库连接池
5. 添加 ElastiCache Redis 缓存层

## 监控和告警

### CloudWatch 监控指标
- Lambda 调用次数、错误率、持续时间
- RDS CPU、内存、连接数、IOPS
- API Gateway 请求数、延迟
- NAT Gateway 数据传输量

### 建议告警
- Lambda 错误率 > 5%
- RDS CPU > 80%
- API Gateway 5XX 错误
- 数据库连接数接近上限

## 故障恢复

### RDS 故障
- 启用自动备份 (当前: 7天)
- 定期测试恢复流程
- 考虑启用 Multi-AZ

### Lambda 故障
- API Gateway 自动重试
- 实施死信队列 (DLQ)
- 版本控制和别名

### 网络故障
- NAT Gateway 自动高可用
- 考虑多个 NAT Gateway (跨 AZ)

## 总结

本架构提供了一个安全、可扩展的 Serverless 部署方案：
- 通过 VPC 实现网络隔离
- 使用 NAT Gateway 实现安全的出站连接
- RDS 读写分离提升性能
- API Gateway + Lambda 实现弹性伸缩
- 多层安全控制保护应用和数据

适合中小型应用的生产部署，可根据实际需求进行扩展和优化。
