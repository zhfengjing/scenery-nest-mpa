import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * 用户服务类
 *
 * 提供用户的 CRUD 操作，实现读写分离：
 * - 查询操作使用读库（read）
 * - 写入操作使用写库（write）
 */
@Injectable()
export class UserService {
  /**
   * 构造函数
   * @param prisma - Prisma 服务实例，提供读写分离的数据库访问
   */
  constructor(private readonly prisma: PrismaService) {}

  // 创建用户（使用写库）
  async create(createUserDto: CreateUserDto) {
    console.log('UserService-createUserDto:', createUserDto);
    const res = await this.prisma.write.user.create({
      data: createUserDto,
    });
    console.log('create-res=', res);
    return res;
  }

  // 查询所有用户（使用读库）
  async findAll() {
    console.log('findAll');
    const res = await this.prisma.read.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log('res=', res);
    return res;
  }

  // 查询单个用户（使用读库）
  async findOne(id: number) {
    const user = await this.prisma.read.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  // 更新用户（使用写库）
  async update(id: number, updateUserDto: UpdateUserDto) {
    // 先检查用户是否存在
    const isExist = await this.findOne(id);
    console.log('isExist=', isExist);
    return await this.prisma.write.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  // 删除用户（使用写库）
  async remove(id: number) {
    // 先检查用户是否存在
    await this.findOne(id);

    return this.prisma.write.user.delete({
      where: { id },
    });
  }
}
