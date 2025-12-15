import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  // 创建用户（使用写库）
  async create(createUserDto: CreateUserDto) {
    return this.prisma.write.user.create({
      data: createUserDto,
    });
  }

  // 查询所有用户（使用读库）
  async findAll() {
    return this.prisma.read.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
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
    await this.findOne(id);

    return this.prisma.write.user.update({
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
