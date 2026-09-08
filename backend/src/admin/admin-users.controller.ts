import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { AdminUsersService, AdminUserSummary } from './admin-users.service';
import { UpdateUserActiveDto } from './dto/update-user-active.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../../generated/prisma/client';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';

/** Admin-only account moderation: list, activate/deactivate, delete. */
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  list(): Promise<AdminUserSummary[]> {
    return this.adminUsersService.list();
  }

  @Patch(':id')
  setActive(
    @Param('id') id: string,
    @Body() dto: UpdateUserActiveDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AdminUserSummary> {
    return this.adminUsersService.setActive(id, dto.active, req.user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.adminUsersService.remove(id, req.user.id);
  }
}
