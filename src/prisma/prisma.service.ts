import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private writeClient: PrismaClient;
  // private readClient: PrismaClient;
  // 定义一个公共属性来专门访问读库
  public readonly readClient: PrismaClient;
  private writePool: Pool;
  private readPool: Pool;
  constructor() {
    // 创建写库连接池
    console.log('env:', process.env.NODE_ENV);
    const isProd = process.env.NODE_ENV === 'production';
    console.log(`prisma-service-DATABASE_URL= ${process.env.DATABASE_URL}`);
    console.log(
      `prisma-service-DATABASE_READ_URL= ${process.env.DATABASE_READ_URL}`,
    );
    const writePool = new Pool(
      isProd
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false, // 生产环境添加此行不验证书
            },
          }
        : {
            connectionString: process.env.DATABASE_URL,
          },
    );
    // 使用适配器创建Prisma客户端此行此行
    const writeAdapter = new PrismaPg(writePool);
    // 【关键点】：super() 必须接收写库适配器
    // 这样整个 PrismaService (this) 就变成了主库客户端
    super({ adapter: writeAdapter });
    // this.writeClient = new PrismaClient({ adapter: writeAdapter });
    // 创建读库连接池
    const readUrl = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
    this.readPool = new Pool(
      isProd
        ? {
            connectionString: readUrl,
            ssl: {
              rejectUnauthorized: false, // 不验证书
            },
          }
        : {
            connectionString: readUrl,
          },
    );
    // console.log('this.readPool=', this.readPool);
    const readAdapter = new PrismaPg(this.readPool);
    this.readClient = new PrismaClient({ adapter: readAdapter });
    // console.log('this.writeClient', this.writeClient.user);
    // console.log('this.readClient', this.readClient.user);
  }

  async onModuleInit() {
    await this.$connect();
    await this.readClient.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.readClient.$disconnect();
    await this.writePool.end();
    await this.readPool.end();
  }

  // 获取写客户端（用于增删改）
  get write(): PrismaClient {
    return this.writeClient;
  }

  // 获取读客户端（用于查询）
  get read(): PrismaClient {
    return this.readClient;
  }

  // 默认使用写客户端以保证一致性
  get client(): PrismaClient {
    return this.writeClient;
  }
}
