# Scenery MPA NestJS

基于 NestJS 框架的用户管理系统，实现了用户信息的增删改查功能，使用 Prisma ORM 连接 PostgreSQL 数据库，支持读写分离，并通过 PM2 进行进程管理。

## 技术栈

- **框架**: NestJS 11.x
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL
- **ORM**: Prisma 7.1.0
- **数据库连接池**: pg (node-postgres)
- **进程管理**: PM2
- **包管理器**: npm/yarn/pnpm

## 功能特性

- ✅ 用户信息管理（昵称、邮箱）
- ✅ RESTful API 接口（增删改查）
- ✅ Prisma ORM 数据库操作
- ✅ PostgreSQL 数据库读写分离
- ✅ PM2 进程管理和监控
- ✅ TypeScript 类型安全
- ✅ 自动重启和错误日志

## 项目结构

```
scenery-mpa-nest/
├── src/
│   ├── main.ts                 # 应用入口文件
│   ├── app.module.ts           # 根模块
│   ├── app.controller.ts       # 根控制器
│   ├── app.service.ts          # 根服务
│   ├── prisma/                 # Prisma 模块
│   │   ├── prisma.module.ts    # Prisma 全局模块
│   │   └── prisma.service.ts   # Prisma 服务（读写分离）
│   └── user/                   # 用户模块
│       ├── user.module.ts      # 用户模块
│       ├── user.controller.ts  # 用户控制器
│       ├── user.service.ts     # 用户服务
│       └── dto/                # 数据传输对象
│           ├── create-user.dto.ts
│           └── update-user.dto.ts
├── prisma/
│   ├── schema.prisma           # Prisma 数据模型
│   └── migrations/             # 数据库迁移文件
├── prisma.config.ts            # Prisma 配置文件
├── ecosystem.config.js         # PM2 配置文件
├── .env                        # 环境变量配置
├── tsconfig.json               # TypeScript 配置
├── nest-cli.json               # NestJS CLI 配置
└── package.json                # 项目依赖
```

## 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 13.0
- npm >= 9.0.0 或 yarn >= 1.22.0

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd scenery-mpa-nest
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 3. 配置环境变量

编辑 `.env` 文件，配置数据库连接信息：

```env
# 应用端口
PORT=8000

# 主库连接（写操作）
DATABASE_URL="postgresql://username:password@localhost:5432/scenery_mpa_nest?schema=public"

# 从库连接（读操作）- 读写分离配置
DATABASE_READ_URL="postgresql://username:password@localhost:5432/scenery_mpa_nest?schema=public"

# 如果没有从库，可以使用相同的 URL
```

**重要说明**:
- 将 `username` 替换为您的 PostgreSQL 用户名
- 将 `password` 替换为您的 PostgreSQL 密码
- 将 `localhost:5432` 替换为您的数据库主机和端口
- 如果使用 ServerLess 数据库集群，请使用提供的连接字符串

### 4. 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE scenery_mpa_nest;

# 退出
\q
```

### 5. 运行数据库迁移

```bash
# 生成 Prisma Client 并创建数据库表
npx prisma migrate dev --name init

# 或者如果表已存在，仅生成客户端
npx prisma generate
```

### 6. 构建项目

```bash
npm run build
```

## 运行方式

### 开发模式

```bash
# 使用 NestJS 开发模式（热重载）
npm run start:dev
```

### 生产模式

#### 方式一：使用 Node.js 直接运行

```bash
# 先构建项目
npm run build

# 运行编译后的代码
npm run start:prod
```

#### 方式二：使用 PM2（推荐）

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看应用状态
pm2 status

# 查看日志
pm2 logs scenery-mpa-nest

# 停止应用
pm2 stop scenery-mpa-nest

# 重启应用
pm2 restart scenery-mpa-nest

# 删除应用
pm2 delete scenery-mpa-nest
```

### PM2 守护进程持久化

```bash
# 保存当前 PM2 进程列表
pm2 save

# 生成开机自启动脚本
pm2 startup
```

## API 接口文档

应用默认运行在 `http://localhost:8000`

### 1. 创建用户

**请求**:
```http
POST /users
Content-Type: application/json

{
  "nickname": "张三",
  "email": "zhangsan@example.com"
}
```

**响应**:
```json
{
  "id": 1,
  "nickname": "张三",
  "email": "zhangsan@example.com",
  "createdAt": "2025-12-14T14:30:00.000Z",
  "updatedAt": "2025-12-14T14:30:00.000Z"
}
```

### 2. 获取所有用户

**请求**:
```http
GET /users
```

**响应**:
```json
[
  {
    "id": 1,
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "createdAt": "2025-12-14T14:30:00.000Z",
    "updatedAt": "2025-12-14T14:30:00.000Z"
  },
  {
    "id": 2,
    "nickname": "李四",
    "email": "lisi@example.com",
    "createdAt": "2025-12-14T14:31:00.000Z",
    "updatedAt": "2025-12-14T14:31:00.000Z"
  }
]
```

### 3. 获取单个用户

**请求**:
```http
GET /users/:id
```

**示例**:
```http
GET /users/1
```

**响应**:
```json
{
  "id": 1,
  "nickname": "张三",
  "email": "zhangsan@example.com",
  "createdAt": "2025-12-14T14:30:00.000Z",
  "updatedAt": "2025-12-14T14:30:00.000Z"
}
```

### 4. 更新用户

**请求**:
```http
PATCH /users/:id
Content-Type: application/json

{
  "nickname": "张三丰",
  "email": "zhangsanfeng@example.com"
}
```

**响应**:
```json
{
  "id": 1,
  "nickname": "张三丰",
  "email": "zhangsanfeng@example.com",
  "createdAt": "2025-12-14T14:30:00.000Z",
  "updatedAt": "2025-12-14T14:35:00.000Z"
}
```

### 5. 删除用户

**请求**:
```http
DELETE /users/:id
```

**示例**:
```http
DELETE /users/1
```

**响应**:
```json
{
  "id": 1,
  "nickname": "张三丰",
  "email": "zhangsanfeng@example.com",
  "createdAt": "2025-12-14T14:30:00.000Z",
  "updatedAt": "2025-12-14T14:35:00.000Z"
}
```

## 使用 curl 测试 API

```bash
# 创建用户
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试用户","email":"test@example.com"}'

# 获取所有用户
curl http://localhost:8000/users

# 获取单个用户
curl http://localhost:8000/users/1

# 更新用户
curl -X PATCH http://localhost:8000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"nickname":"新昵称"}'

# 删除用户
curl -X DELETE http://localhost:8000/users/1
```

## 数据库设计

### User 表结构

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | INT | 用户ID | 主键、自增 |
| nickname | VARCHAR(100) | 用户昵称 | 非空 |
| email | VARCHAR(255) | 用户邮箱 | 非空、唯一 |
| created_at | TIMESTAMP | 创建时间 | 默认当前时间 |
| updated_at | TIMESTAMP | 更新时间 | 自动更新 |

### Prisma Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  nickname  String   @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

## 读写分离配置

本项目支持 PostgreSQL 读写分离，通过以下方式实现：

1. **环境变量配置**: 在 `.env` 文件中分别配置主库和从库的连接字符串
2. **连接池**: 使用 `pg` 的 `Pool` 创建独立的读写连接池
3. **Prisma 适配器**: 使用 `@prisma/adapter-pg` 为读写操作创建不同的 Prisma 客户端
4. **服务层调用**:
   - 写操作（CREATE、UPDATE、DELETE）使用 `prisma.write`
   - 读操作（SELECT）使用 `prisma.read`

**示例代码** (src/user/user.service.ts):
```typescript
// 写操作使用主库
async create(createUserDto: CreateUserDto) {
  return this.prisma.write.user.create({
    data: createUserDto,
  });
}

// 读操作使用从库
async findAll() {
  return this.prisma.read.user.findMany();
}
```

## PM2 配置说明

`ecosystem.config.js` 文件配置项：

```javascript
{
  name: 'scenery-mpa-nest',        // 应用名称
  script: './dist/src/main.js',    // 启动脚本
  instances: 1,                     // 实例数量
  autorestart: true,                // 自动重启
  watch: false,                     // 是否监听文件变化
  max_memory_restart: '1G',         // 内存超限重启
  env: {                            // 开发环境变量
    NODE_ENV: 'development',
    PORT: 8000,
  },
  env_production: {                 // 生产环境变量
    NODE_ENV: 'production',
    PORT: 8000,
  },
  error_file: './logs/err.log',     // 错误日志
  out_file: './logs/out.log',       // 输出日志
  log_file: './logs/combined.log',  // 合并日志
  time: true,                       // 日志带时间戳
}
```

## 常见问题

### 1. 数据库连接失败

**问题**: `Error: Can't reach database server`

**解决方案**:
- 检查 PostgreSQL 服务是否启动
- 确认 `.env` 文件中的数据库连接信息正确
- 检查数据库防火墙设置

### 2. Prisma Client 未生成

**问题**: `Cannot find module '@prisma/client'`

**解决方案**:
```bash
npx prisma generate
```

### 3. 端口被占用

**问题**: `Port 8000 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :8000

# 杀死进程
kill -9 <PID>

# 或修改 .env 文件中的 PORT 配置
```

### 4. PM2 日志查看

```bash
# 实时查看日志
pm2 logs scenery-mpa-nest --lines 100

# 清空日志
pm2 flush

# 查看详细信息
pm2 show scenery-mpa-nest
```

## 开发工具

### Prisma Studio

Prisma 提供了可视化数据库管理工具：

```bash
npx prisma studio
```

访问 `http://localhost:5555` 查看和编辑数据库数据。

### 代码格式化

```bash
# 格式化代码
npm run format

# 代码检查
npm run lint
```

## 测试

```bash
# 单元测试
npm run test

# e2e 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

## 生产部署建议

1. **环境变量**: 使用环境变量管理敏感信息，不要将 `.env` 文件提交到版本控制
2. **数据库备份**: 定期备份 PostgreSQL 数据库
3. **日志管理**: 使用 PM2 日志轮转，避免日志文件过大
4. **监控**: 配置 PM2 监控和告警
5. **负载均衡**: 生产环境建议使用 Nginx 进行反向代理
6. **HTTPS**: 启用 SSL/TLS 加密
7. **读写分离**: 配置独立的主从数据库服务器

## 许可证

UNLICENSED

## 作者

Scenery

## 更新日志

### v0.0.1 (2025-12-14)
- 初始版本
- 实现用户增删改查功能
- 集成 Prisma ORM
- 支持 PostgreSQL 读写分离
- PM2 进程管理
