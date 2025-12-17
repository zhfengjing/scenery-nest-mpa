/**
 * PM2 进程管理器配置文件模板
 * PM2 是一个 Node.js 应用的生产级进程管理器
 *
 * 📝 首次使用：
 * 1. 复制此文件: cp ecosystem.config.example.js ecosystem.config.js
 * 2. 编辑 ecosystem.config.js，将占位符替换为真实信息：
 *    - SSH_USERNAME: 替换为 EC2 用户名（ubuntu 或 ec2-user）
 *    - SSH_HOSTMACHINE: 替换为 EC2 公网 IP
 *    - GIT_REPOSITORY: 替换为 Git 仓库地址
 *    - DESTINATION_PATH: 替换为服务器部署路径
 *
 * 使用方法：
 * - 启动应用: pm2 start ecosystem.config.js
 * - 生产环境: pm2 start ecosystem.config.js --env production
 * - 重启应用: pm2 reload ecosystem.config.js
 */
module.exports = {
  // 应用配置数组，可以配置多个应用
  apps: [{
    // 应用名称，在 PM2 进程列表中显示
    name: 'scenery-nestjs',

    // 应用入口文件路径（编译后的 JS 文件）
    script: './dist/src/main.js',

    // 启动的实例数量（1 表示单实例，'max' 表示根据 CPU 核心数启动）
    instances: 1,

    // 应用崩溃或异常退出时自动重启
    autorestart: true,

    // 是否监听文件变化并自动重启（开发环境可设为 true，生产环境建议 false）
    watch: false,

    // 内存使用超过 1GB 时自动重启应用，防止内存泄漏
    max_memory_restart: '1G',

    // 开发环境的环境变量配置
    env: {
      NODE_ENV: 'development',
      PORT: 8000,
    },

    // 生产环境的环境变量配置（使用 --env production 时生效）
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 8000,
      instances: 'max',
      // 数据库连接字符串从环境变量读取（敏感信息不写在配置文件中）
      // 在服务器上设置：export DATABASE_URL="postgresql://user:password@host:port/database"
      DATABASE_URL: process.env.DATABASE_URL
    },

    // 错误日志文件路径
    error_file: './logs/err.log',

    // 标准输出日志文件路径
    out_file: './logs/out.log',

    // 合并所有日志的文件路径
    log_file: './logs/combined.log',

    // 日志中是否添加时间戳前缀
    time: true,
  }],

  // 部署配置（用于自动化部署到远程服务器）
  deploy: {
    // 生产环境部署配置
    production: {
      // SSH 登录的用户名（需要替换为实际的用户名）
      user: 'SSH_USERNAME',

      // 远程服务器的主机地址（需要替换为实际的服务器地址）
      host: 'SSH_HOSTMACHINE',

      // 要部署的 Git 分支
      ref: 'origin/master',

      // Git 仓库地址（需要替换为实际的仓库地址）
      repo: 'GIT_REPOSITORY',

      // 远程服务器上的部署目标路径（需要替换为实际路径）
      path: 'DESTINATION_PATH',

      // 本地部署前执行的命令
      'pre-deploy-local': '',

      // 远程服务器部署后执行的命令：安装依赖 -> 生成 Prisma Client -> 构建项目 -> 启动/重载应用
      'post-deploy': 'npm install && npx prisma generate && npm run build && pm2 startOrReload ecosystem.config.js  --env production',

      // 首次设置时执行的命令
      'pre-setup': ''
    }
  }
};
