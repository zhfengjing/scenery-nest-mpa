# PM2 部署 NestJS 应用到 AWS EC2 完整指南

## 📋 目录

- [前置准备](#前置准备)
- [AWS EC2 配置](#aws-ec2-配置)
- [本地项目配置](#本地项目配置)
- [服务器环境准备](#服务器环境准备)
- [PM2 部署配置](#pm2-部署配置)
- [执行部署](#执行部署)
- [部署后验证](#部署后验证)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 前置准备

### 1. 本地环境要求

- [x] Node.js 18+ 已安装
- [x] Git 已安装并配置
- [x] PM2 已全局安装 (`npm install -g pm2`)
- [x] SSH 客户端（macOS/Linux 自带）
- [x] 代码已推送到 Git 远程仓库（GitHub/GitLab/Gitee）

### 2. AWS 账号准备

- [x] AWS 账号已创建
- [x] 可以访问 EC2 控制台
- [x] 了解基本的 AWS 操作

### 3. 数据库准备（可选）

- PostgreSQL（推荐使用 AWS RDS）
- MySQL
- SQLite（仅开发/测试）

---

## AWS EC2 配置

### 步骤 1：创建 EC2 实例

#### 1.1 启动实例

1. 登录 [AWS 控制台](https://console.aws.amazon.com/)
2. 进入 **EC2 Dashboard**
3. 点击 **启动实例（Launch Instance）**

#### 1.2 配置实例

**名称和标签**
```
名称: my-nestjs-app-server
```

**应用程序和操作系统映像 (AMI)**
```
推荐选择: Amazon Linux 2023
- 用户名: ec2-user
- 稳定性好
- 包管理器: dnf/yum
```

**实例类型**
```
开发/测试: t2.micro (免费套餐)
生产环境: t3.small 或更高
```

**密钥对（重要！）**
```
1. 点击"创建新密钥对"
2. 密钥对名称: my-ec2-key
3. 密钥对类型: RSA
4. 私钥文件格式: .pem
5. 点击"创建密钥对"
6. 浏览器会自动下载 my-ec2-key.pem
```

⚠️ **注意事项**：
- 密钥文件只能下载一次，妥善保管
- 将 .pem 文件移动到 `~/.ssh/` 目录
- 设置正确的权限：`chmod 400 ~/.ssh/my-ec2-key.pem`

**网络设置**
```
✅ 允许来自互联网的 SSH 流量
✅ 允许来自互联网的 HTTP 流量
✅ 允许来自互联网的 HTTPS 流量
```

**配置存储**
```
默认 8 GB 即可（可根据需求调整）
```

#### 1.3 配置安全组

**入站规则（Inbound Rules）**

| 类型 | 协议 | 端口范围 | 源 | 说明 |
|-----|------|---------|-----|------|
| SSH | TCP | 22 | 0.0.0.0/0 | SSH 访问 |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP 访问 |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS 访问 |
| 自定义TCP | TCP | 8000 | 0.0.0.0/0 | 应用端口 |

⚠️ **安全建议**：
- 生产环境应限制 SSH 源为特定 IP
- 使用 ALB/NLB 时，应用端口可限制为内部访问

#### 1.4 获取 EC2 信息

启动实例后，记录以下信息：

```
✅ 公网 IPv4 地址: 98.80.11.17
✅ 实例 ID: i-0123456789abcdef0
✅ 密钥对名称: my-ec2-key
✅ AMI 类型: Amazon Linux 2023
✅ 默认用户名: ec2-user
```

---

## 本地项目配置

### 步骤 2：配置 SSH 密钥

#### 2.1 移动密钥文件

```bash
# 创建 .ssh 目录（如果不存在）
mkdir -p ~/.ssh

# 移动下载的 .pem 文件
mv ~/Downloads/my-ec2-key.pem ~/.ssh/

# 设置正确的权限（必须！）
chmod 400 ~/.ssh/my-ec2-key.pem
```

⚠️ **权限说明**：
- `400`: 只有所有者可读
- 如果权限不对，SSH 会拒绝使用该密钥

#### 2.2 测试 SSH 连接

```bash
# 连接命令格式
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17

# 首次连接会提示
Are you sure you want to continue connecting (yes/no)?
# 输入 yes

# 成功连接后会看到
[ec2-user@ip-172-31-19-52 ~]$

# 测试完成后退出
exit
```

✅ **验证成功标志**：
- 能够成功连接到服务器
- 看到 `[ec2-user@...]` 提示符

### 步骤 3：配置项目文件

#### 3.1 创建 PM2 配置模板

创建 `ecosystem.config.example.js`:

```javascript
/**
 * PM2 进程管理器配置文件模板
 *
 * 📝 首次使用：
 * 1. 复制此文件: cp ecosystem.config.example.js ecosystem.config.js
 * 2. 编辑 ecosystem.config.js，将占位符替换为真实信息
 */
module.exports = {
  apps: [{
    // 应用名称
    name: 'scenery-nestjs',

    // 应用入口文件（编译后的）
    script: './dist/src/main.js',

    // 实例数量（1 或 'max'）
    instances: 1,

    // 自动重启
    autorestart: true,

    // 不监听文件变化（生产环境）
    watch: false,

    // 内存超过 1GB 自动重启
    max_memory_restart: '1G',

    // 开发环境变量
    env: {
      NODE_ENV: 'development',
      PORT: 8000,
    },

    // 生产环境变量
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000,
      instances: 'max',
      // ⚠️ 数据库连接字符串（需要替换）
      DATABASE_URL: 'postgresql://user:password@host:5432/database'
    },

    // 日志配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
  }],

  // 部署配置
  deploy: {
    production: {
      // ⚠️ SSH 用户名（Amazon Linux: ec2-user, Ubuntu: ubuntu）
      user: 'ec2-user',

      // ⚠️ EC2 公网 IP 地址
      host: '98.80.11.17',

      // ⚠️ SSH 密钥路径
      key: '~/.ssh/my-ec2-key.pem',

      // SSH 选项（首次自动接受，之后验证）
      'ssh_options': 'StrictHostKeyChecking=accept-new',

      // Git 分支
      ref: 'origin/master',

      // ⚠️ Git 仓库地址
      repo: 'git@github.com:username/repository.git',

      // ⚠️ 服务器部署路径
      path: '/home/ec2-user/apps/scenery-nestjs',

      // 本地部署前执行
      'pre-deploy-local': '',

      // 服务器部署后执行（关键！）
      'post-deploy': 'npm install && npx prisma generate && npm run build && pm2 startOrReload ecosystem.config.example.js --name scenery-nestjs --env production --update-env',

      // 首次设置时执行
      'pre-setup': ''
    }
  }
};
```

#### 3.2 配置 `.gitignore`

确保以下内容在 `.gitignore` 中：

```gitignore
# 编译产物
/dist
/build
/node_modules

# 环境变量
.env
.env.local
.env.production

# PM2 配置（包含敏感信息）
ecosystem.config.js

# SSH 密钥
*.pem
*.key

# 日志
logs/
*.log
```

⚠️ **重要**：
- `ecosystem.config.js` 包含真实配置，不应提交
- `ecosystem.config.example.js` 作为模板提交
- `.pem` 文件绝对不能提交

#### 3.3 创建实际配置文件

```bash
# 复制模板
cp ecosystem.config.example.js ecosystem.config.js

# 编辑配置文件，替换占位符
# - user: ec2-user 或 ubuntu
# - host: 你的 EC2 公网 IP
# - key: 你的密钥路径
# - repo: 你的 Git 仓库地址
# - DATABASE_URL: 你的数据库连接字符串
```

#### 3.4 提交代码到 Git

```bash
# 查看状态
git status

# 添加模板文件
git add ecosystem.config.example.js .gitignore

# 提交
git commit -m "feat: 添加 PM2 部署配置"

# 推送到远程
git push origin master
```

✅ **验证**：
- `ecosystem.config.example.js` 已提交
- `ecosystem.config.js` 没有被提交（被 gitignore）

---

## 服务器环境准备

### 步骤 4：配置 EC2 服务器

#### 4.1 连接到服务器

```bash
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17
```

#### 4.2 更新系统

```bash
# 更新包管理器
sudo dnf update -y

# 或者使用 yum（较老版本）
sudo yum update -y
```

#### 4.3 安装 Git

```bash
# 安装 Git
sudo dnf install git -y

# 验证安装
git --version
# 输出: git version 2.40.1

# 配置 Git 用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### 4.4 安装 Node.js（使用 NVM）

```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载配置
source ~/.bashrc

# 验证 NVM 安装
nvm --version
# 输出: 0.39.0

# 安装 Node.js LTS 版本
nvm install --lts

# 验证 Node.js
node -v
# 输出: v20.11.0

npm -v
# 输出: 10.2.4
```

⚠️ **注意**：
- 推荐使用 NVM，方便版本管理
- 也可以用 `sudo dnf install nodejs` 直接安装

#### 4.5 安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 -v
# 输出: 5.3.0

# 设置 PM2 开机自启
pm2 startup
# 根据提示执行输出的命令，例如：
# sudo env PATH=$PATH:/home/ec2-user/.nvm/versions/node/v20.11.0/bin /home/ec2-user/.nvm/versions/node/v20.11.0/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

#### 4.6 配置 Git SSH 密钥（访问私有仓库）

⚠️ **如果使用私有 Git 仓库（GitHub/GitLab），必须配置！**

```bash
# 生成 SSH 密钥
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"
# 按 Enter 使用默认路径
# 按 Enter 跳过密码（或设置密码）

# 查看公钥
cat ~/.ssh/id_rsa.pub
# 复制输出的公钥
```

**添加到 Git 平台**：

**GitHub**:
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. Title: `EC2 Server`
4. Key: 粘贴刚才复制的公钥
5. 点击 "Add SSH key"

**GitLab**:
1. 访问 https://gitlab.com/-/profile/keys
2. 粘贴公钥
3. 点击 "Add key"

**测试连接**：

```bash
# 测试 GitHub
ssh -T git@github.com
# 输出: Hi username! You've successfully authenticated...

# 测试 GitLab
ssh -T git@gitlab.com
# 输出: Welcome to GitLab, @username!
```

✅ **验证成功**：显示欢迎信息

#### 4.7 创建应用目录

```bash
# 创建应用根目录
mkdir -p ~/apps

# 创建日志目录（可选）
mkdir -p ~/logs

# 查看
ls -la ~/apps
```

#### 4.8 配置数据库（如需要）

**方案 A：使用 AWS RDS（推荐）**

1. 在 AWS 控制台创建 RDS 实例
2. 配置安全组允许 EC2 访问
3. 获取数据库连接端点
4. 更新 `ecosystem.config.js` 中的 `DATABASE_URL`

**方案 B：在 EC2 上安装 PostgreSQL**

```bash
# 安装 PostgreSQL
sudo dnf install postgresql15-server -y

# 初始化数据库
sudo postgresql-setup --initdb

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE mydb;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
\q

# 配置允许本地连接
sudo vi /var/lib/pgsql/data/pg_hba.conf
# 添加: host all all 127.0.0.1/32 md5

# 重启服务
sudo systemctl restart postgresql
```

**数据库连接字符串示例**：

```javascript
// AWS RDS
DATABASE_URL: 'postgresql://admin:password@mydb.abc123.us-east-1.rds.amazonaws.com:5432/productiondb'

// 本地 PostgreSQL
DATABASE_URL: 'postgresql://myuser:mypassword@localhost:5432/mydb'
```

#### 4.9 退出服务器

```bash
exit
```

---

## PM2 部署配置

### 步骤 5：配置本地 PM2 部署

#### 5.1 检查清单

在执行部署前，确保：

- [x] `ecosystem.config.js` 已配置好真实信息
- [x] `ecosystem.config.example.js` 已提交到 Git
- [x] 代码已推送到 Git 远程仓库
- [x] 本地可以 SSH 连接到 EC2
- [x] EC2 服务器已安装 Git、Node.js、PM2
- [x] EC2 服务器已配置 Git SSH 密钥（私有仓库）
- [x] 数据库已准备好（如需要）

#### 5.2 验证配置

```bash
# 在项目根目录
cd ~/Desktop/project/web3_housework/my_web3_assignment/scenery-mpa-nest

# 验证本地 Git 状态
git status
# 应该显示 working tree clean

# 验证远程仓库
git remote -v
# 应该显示正确的远程仓库地址

# 验证 SSH 连接
ssh -i ~/.ssh/my-aws-ec2-key.pem ec2-user@98.80.11.17 "echo 'Connection OK'"
# 应该输出: Connection OK
```

---

## 执行部署

### 步骤 6：首次部署

#### 6.1 PM2 部署设置（只需一次）

```bash
# 在本地项目目录执行
pm2 deploy ecosystem.config.js production setup
```

**这个命令会做什么？**
1. SSH 连接到 EC2 服务器
2. 在服务器上创建部署目录 `/home/ec2-user/apps/scenery-nestjs`
3. 从 Git 克隆代码到服务器
4. 创建必要的目录结构

**目录结构**：
```
/home/ec2-user/apps/scenery-nestjs/
├── current/          # 当前运行的代码（符号链接）
├── source/           # 实际的代码目录
└── shared/           # 共享文件夹
```

**可能的输出**：
```
--> Deploying to production environment
--> on host 98.80.11.17
--> Creating directory structure
--> Cloning repository
--> Setup complete
```

⚠️ **常见问题**：

**问题 1**: `Permission denied (publickey)`
```
原因: SSH 密钥权限不对或路径错误
解决: chmod 400 ~/.ssh/my-ec2-key.pem
```

**问题 2**: `Could not resolve host`
```
原因: EC2 IP 地址错误
解决: 检查 ecosystem.config.js 中的 host 配置
```

**问题 3**: `Repository not found`
```
原因: Git 仓库地址错误或没有权限
解决: 检查 repo 配置，确保服务器已配置 Git SSH 密钥
```

#### 6.2 执行部署

```bash
# 部署到生产环境
pm2 deploy ecosystem.config.js production
```

**部署流程**：
```
1. 连接到 EC2 服务器
2. 从 Git 拉取最新代码
3. 执行 post-deploy 钩子:
   ├── npm install           # 安装依赖
   ├── npx prisma generate   # 生成 Prisma Client
   ├── npm run build         # 编译 TypeScript
   └── pm2 startOrReload     # 启动/重载应用
4. 部署完成
```

**成功输出示例**：
```
--> Deploying to production environment
--> on host 98.80.11.17
--> Pulling latest code
--> Running post-deploy script
    npm install... ✓
    npx prisma generate... ✓
    npm run build... ✓
    pm2 startOrReload... ✓
--> Successfully deployed
```

⚠️ **部署可能遇到的错误**：

**错误 1**: `git: command not found`
```bash
# 解决：在服务器上安装 Git
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17
sudo dnf install git -y
exit
```

**错误 2**: `Module '@prisma/client' has no exported member 'PrismaClient'`
```
原因: 缺少 npx prisma generate 步骤
解决: 已在 post-deploy 中添加，重新部署
```

**错误 3**: `Missing required environment variable: DATABASE_URL`
```
原因: 未配置数据库连接字符串
解决: 在 ecosystem.config.example.js 的 env_production 中添加 DATABASE_URL
```

**错误 4**: `commit or stash your changes before deploying`
```bash
# 原因: 本地有未提交的修改
# 解决: 提交修改
git add .
git commit -m "update"
git push origin master
```

**错误 5**: `File ecosystem.config.js not found`
```
原因: 配置文件在 gitignore 中，服务器上不存在
解决: 使用 ecosystem.config.example.js（已修复）
```

---

## 部署后验证

### 步骤 7：验证部署

#### 7.1 检查 PM2 进程

```bash
# 方式 1：通过 SSH 查看
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 list"

# 方式 2：登录服务器查看
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17
pm2 list
```

**正常输出**：
```
┌─────┬──────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ mode    │ ↺       │ status  │ cpu      │
├─────┼──────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ scenery-nestjs   │ fork    │ 0       │ online  │ 0%       │
└─────┴──────────────────┴─────────┴─────────┴─────────┴──────────┘
```

✅ **成功标志**：status 显示 `online`

#### 7.2 查看应用日志

```bash
# 查看实时日志
pm2 logs scenery-nestjs

# 查看最近 100 行
pm2 logs scenery-nestjs --lines 100

# 只看错误日志
pm2 logs scenery-nestjs --err

# Ctrl+C 退出日志查看
```

#### 7.3 测试应用访问

```bash
# 在服务器上测试
curl http://localhost:8000

# 或者在本地浏览器访问
# http://98.80.11.17:8000
```

✅ **成功标志**：返回应用响应

#### 7.4 查看进程详情

```bash
# 查看进程详情
pm2 show scenery-nestjs

# 查看监控面板
pm2 monit

# 查看进程资源占用
pm2 status
```

---

## 常见问题

### 问题排查清单

#### 1. 部署失败：Permission denied (publickey)

**原因**：SSH 密钥权限或路径问题

**解决**：
```bash
# 检查密钥权限
ls -l ~/.ssh/my-ec2-key.pem
# 应该显示: -r-------- (400)

# 设置正确权限
chmod 400 ~/.ssh/my-ec2-key.pem

# 测试连接
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17
```

#### 2. 部署失败：git: command not found

**原因**：服务器未安装 Git

**解决**：
```bash
# 登录服务器
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17

# 安装 Git
sudo dnf install git -y

# 验证
git --version
```

#### 3. 部署失败：Repository not found

**原因**：Git 仓库访问权限问题

**解决**：
```bash
# 登录服务器
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17

# 生成 SSH 密钥
ssh-keygen -t rsa -b 4096

# 查看公钥
cat ~/.ssh/id_rsa.pub

# 将公钥添加到 GitHub/GitLab

# 测试连接
ssh -T git@github.com
```

#### 4. 应用启动失败：DATABASE_URL not found

**原因**：缺少数据库连接配置

**解决**：

在 `ecosystem.config.example.js` 中添加：
```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 8000,
  DATABASE_URL: 'postgresql://user:pass@host:5432/db'
}
```

提交并重新部署：
```bash
git add ecosystem.config.example.js
git commit -m "fix: 添加数据库配置"
git push origin master
pm2 deploy ecosystem.config.js production
```

#### 5. 应用无法访问：Connection refused

**原因**：端口未开放或应用未启动

**解决**：
```bash
# 1. 检查应用状态
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17
pm2 list

# 2. 检查端口监听
netstat -tlnp | grep 8000

# 3. 检查 EC2 安全组
# 确保端口 8000 已添加到入站规则

# 4. 查看应用日志
pm2 logs scenery-nestjs --err
```

#### 6. 部署后代码未更新

**原因**：代码未推送或缓存问题

**解决**：
```bash
# 1. 确认本地代码已推送
git push origin master

# 2. 重新部署
pm2 deploy ecosystem.config.js production

# 3. 强制更新
pm2 deploy ecosystem.config.js production --force
```

#### 7. 内存不足

**原因**：t2.micro 实例内存太小

**解决**：
```bash
# 1. 升级 EC2 实例类型
# AWS 控制台 → 停止实例 → 更改实例类型 → t3.small

# 2. 或者添加交换空间
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 最佳实践

### 1. 安全性

#### 1.1 限制 SSH 访问

```bash
# 修改 EC2 安全组
# SSH (22) 源改为: 你的 IP/32
# 而不是 0.0.0.0/0
```

#### 1.2 使用环境变量

```javascript
// ❌ 不要在代码中硬编码敏感信息
const password = 'mypassword123';

// ✅ 使用环境变量
env_production: {
  DATABASE_URL: process.env.DATABASE_URL,
  API_KEY: process.env.API_KEY
}
```

#### 1.3 定期更新

```bash
# 定期更新服务器
sudo dnf update -y

# 定期更新依赖
npm audit
npm audit fix
```

### 2. 性能优化

#### 2.1 使用集群模式

```javascript
// ecosystem.config.js
apps: [{
  instances: 'max',  // 使用所有 CPU 核心
  exec_mode: 'cluster'
}]
```

#### 2.2 配置日志轮转

```bash
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

#### 2.3 启用 HTTPS

```bash
# 使用 Nginx 反向代理
sudo dnf install nginx -y

# 配置 SSL 证书（Let's Encrypt）
sudo dnf install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### 3. 监控和日志

#### 3.1 配置 PM2 Plus（可选）

```bash
# 注册 PM2 Plus
pm2 link <secret> <public>

# Web 界面监控
# https://app.pm2.io
```

#### 3.2 配置 CloudWatch（AWS）

```bash
# 安装 CloudWatch Agent
sudo dnf install amazon-cloudwatch-agent -y

# 配置监控指标
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 4. 备份和恢复

#### 4.1 数据库备份

```bash
# PostgreSQL 自动备份
crontab -e

# 添加定时任务（每天凌晨 2 点）
0 2 * * * pg_dump mydb > ~/backups/db_$(date +\%Y\%m\%d).sql
```

#### 4.2 创建 EC2 快照

```
1. EC2 控制台 → 选择实例
2. Actions → Image and templates → Create image
3. 设置镜像名称和描述
4. 定期创建快照
```

### 5. CI/CD 集成

#### 5.1 GitHub Actions 示例

创建 `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install PM2
        run: npm install -g pm2

      - name: Deploy to EC2
        env:
          SSH_PRIVATE_KEY: ${{ secrets.EC2_SSH_KEY }}
        run: |
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 400 ~/.ssh/id_rsa
          pm2 deploy ecosystem.config.js production
```

---

## 日常操作

### 更新部署

```bash
# 1. 本地修改代码
# 2. 提交并推送
git add .
git commit -m "update feature"
git push origin master

# 3. 部署
pm2 deploy ecosystem.config.js production
```

### 查看日志

```bash
# 实时日志
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 logs"

# 错误日志
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 logs --err"
```

### 重启应用

```bash
# 优雅重启（0 宕机时间）
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 reload scenery-nestjs"

# 强制重启
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 restart scenery-nestjs"
```

### 回滚版本

```bash
# 回滚到上一个版本
pm2 deploy ecosystem.config.js production revert 1

# 回滚到指定版本
pm2 deploy ecosystem.config.js production revert 2
```

### 停止应用

```bash
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@98.80.11.17 "pm2 stop scenery-nestjs"
```

---

## 总结

### 完整部署流程

```bash
# 1. 准备 EC2 和配置
✅ 创建 EC2 实例
✅ 配置安全组
✅ 下载并配置 SSH 密钥

# 2. 配置项目
✅ 创建 ecosystem.config.example.js
✅ 配置 .gitignore
✅ 创建 ecosystem.config.js（本地）
✅ 提交代码到 Git

# 3. 配置服务器
✅ 安装 Git
✅ 安装 Node.js (NVM)
✅ 安装 PM2
✅ 配置 Git SSH 密钥
✅ 准备数据库

# 4. 执行部署
✅ pm2 deploy ecosystem.config.js production setup
✅ pm2 deploy ecosystem.config.js production

# 5. 验证和监控
✅ 检查 PM2 进程状态
✅ 查看应用日志
✅ 测试应用访问
```

### 快速参考

| 操作 | 命令 |
|-----|------|
| 首次部署设置 | `pm2 deploy ecosystem.config.js production setup` |
| 正常部署 | `pm2 deploy ecosystem.config.js production` |
| 查看进程 | `ssh ... "pm2 list"` |
| 查看日志 | `ssh ... "pm2 logs"` |
| 重启应用 | `ssh ... "pm2 reload app-name"` |
| 回滚版本 | `pm2 deploy ecosystem.config.js production revert 1` |

---

## 附录

### A. 常用端口

| 服务 | 默认端口 |
|-----|---------|
| SSH | 22 |
| HTTP | 80 |
| HTTPS | 443 |
| NestJS (默认) | 3000 |
| PostgreSQL | 5432 |
| MySQL | 3306 |
| MongoDB | 27017 |

### B. 有用的链接

- [PM2 官方文档](https://pm2.keymetrics.io/)
- [AWS EC2 文档](https://docs.aws.amazon.com/ec2/)
- [NestJS 文档](https://docs.nestjs.com/)
- [Prisma 文档](https://www.prisma.io/docs/)

### C. 支持的 AMI 用户名

| AMI 类型 | 默认用户名 |
|---------|----------|
| Amazon Linux 2023 | ec2-user |
| Amazon Linux 2 | ec2-user |
| Ubuntu | ubuntu |
| CentOS | centos |
| Debian | admin |
| RHEL | ec2-user |

---

**文档版本**: 1.0
**最后更新**: 2025-12-16
**作者**: Claude Code Assistant
