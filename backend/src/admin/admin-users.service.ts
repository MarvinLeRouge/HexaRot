import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../../generated/prisma/client';

/** Public-safe user summary, never includes passwordHash. */
export interface AdminUserSummary {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

const SAFE_SELECT = {
  id: true,
  email: true,
  role: true,
  active: true,
  emailVerified: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminUserSummary[]> {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async setActive(
    targetId: string,
    active: boolean,
    requesterId: string,
  ): Promise<AdminUserSummary> {
    if (targetId === requesterId) {
      throw new BadRequestException('You cannot modify your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { active },
      select: SAFE_SELECT,
    });
  }

  async remove(targetId: string, requesterId: string): Promise<void> {
    if (targetId === requesterId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: targetId } });
  }
}
