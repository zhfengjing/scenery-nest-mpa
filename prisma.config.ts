/**
 * Prisma 配置文件
 *
 * 此文件由 Prisma 生成，用于配置 Prisma 的基本设置
 * 需要安装以下依赖：npm install --save-dev prisma dotenv
 */

// 加载环境变量配置
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * 导出 Prisma 配置
 *
 * @property {string} schema - Prisma schema 文件的路径
 * @property {object} migrations - 数据库迁移配置
 * @property {string} migrations.path - 迁移文件存储路径
 * @property {object} datasource - 数据源配置
 * @property {string} datasource.url - 数据库连接 URL，从环境变量 DATABASE_URL 中读取
 */
export default defineConfig({
  // Prisma schema 文件路径，定义数据模型和数据库关系
  schema: 'prisma/schema.prisma',

  // 数据库迁移配置
  migrations: {
    // 迁移文件的存储目录
    path: 'prisma/migrations',
  },

  // 数据源配置
  datasource: {
    // 数据库连接 URL，从 .env 文件中的 DATABASE_URL 环境变量读取
    url: env('DATABASE_URL'),
  },
});
