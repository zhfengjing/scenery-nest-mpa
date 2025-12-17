import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private writeClient: PrismaClient;
  private readClient: PrismaClient;
  private writePool: Pool;
  private readPool: Pool;

  constructor() {
    // 创建写库连接池
    this.writePool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // 创建读库连接池
    const readUrl = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
    this.readPool = new Pool({
      connectionString: readUrl,
    });
    console.log('this.readPool=', this.readPool);
    // 使用适配器创建Prisma客户端
    const writeAdapter = new PrismaPg(this.writePool);
    this.writeClient = new PrismaClient({ adapter: writeAdapter });

    const readAdapter = new PrismaPg(this.readPool);
    this.readClient = new PrismaClient({ adapter: readAdapter });
  }

  async onModuleInit() {
    await this.writeClient.$connect();
    await this.readClient.$connect();
  }

  async onModuleDestroy() {
    await this.writeClient.$disconnect();
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
